-- CHERRIFT pre-beta: safe Mail audiences and server-only GM titles.
-- Existing data is preserved. Legacy global mail becomes "existing" mail so
-- accounts registered after that mail was created cannot receive it.

begin;

alter table public.mail_messages
  drop constraint if exists mail_messages_audience_type_check,
  drop constraint if exists mail_target_matches_audience,
  drop constraint if exists mail_existing_has_cutoff;

alter table public.mail_messages
  add column if not exists audience_cutoff_at timestamptz;

update public.mail_messages
set audience_type = 'existing',
    audience_cutoff_at = coalesce(audience_cutoff_at, created_at)
where audience_type = 'all';

alter table public.mail_messages
  add constraint mail_messages_audience_type_check
    check (audience_type in ('user', 'existing', 'all_future')),
  add constraint mail_target_matches_audience check (
    (audience_type in ('existing', 'all_future') and target_user_id is null)
    or (audience_type = 'user' and target_user_id is not null)
  ),
  add constraint mail_existing_has_cutoff check (
    audience_type <> 'existing' or audience_cutoff_at is not null
  );

create index if not exists mail_messages_audience_cutoff_idx
  on public.mail_messages (audience_type, audience_cutoff_at);

create or replace function public.gm_create_mail(
  p_admin_user_id uuid,
  p_audience_type text,
  p_target_user_id uuid,
  p_title_hu text,
  p_title_en text,
  p_body_hu text,
  p_body_en text,
  p_attachments jsonb,
  p_starts_at timestamptz,
  p_expires_at timestamptz,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.gm_admins%rowtype;
  v_mail_id uuid;
  v_attachments jsonb := coalesce(p_attachments, '{}'::jsonb);
  v_cutoff timestamptz := case when p_audience_type = 'existing' then now() else null end;
begin
  select * into v_admin
  from public.gm_admins
  where user_id = p_admin_user_id and active = true;

  if not found or not (
    v_admin.role = 'owner' or 'mail.send' = any(v_admin.permissions)
  ) then
    raise exception 'gm_permission_denied' using errcode = '42501';
  end if;

  if p_audience_type in ('existing', 'all_future')
     and not (v_admin.role = 'owner' or 'mail.broadcast' = any(v_admin.permissions)) then
    raise exception 'gm_broadcast_permission_denied' using errcode = '42501';
  end if;

  if p_audience_type not in ('user', 'existing', 'all_future')
     or (p_audience_type = 'user' and p_target_user_id is null)
     or (p_audience_type <> 'user' and p_target_user_id is not null)
     or length(trim(coalesce(p_title_hu, ''))) not between 1 and 120
     or length(trim(coalesce(p_body_hu, ''))) not between 1 and 4000
     or jsonb_typeof(v_attachments) <> 'object'
     or (p_expires_at is not null and p_expires_at <= coalesce(p_starts_at, now())) then
    raise exception 'invalid_mail_request' using errcode = '22023';
  end if;

  insert into public.mail_messages (
    audience_type, target_user_id, audience_cutoff_at,
    title_hu, title_en, body_hu, body_en,
    attachments, starts_at, expires_at, created_by
  ) values (
    p_audience_type, p_target_user_id, v_cutoff,
    trim(p_title_hu), coalesce(nullif(trim(p_title_en), ''), trim(p_title_hu)),
    trim(p_body_hu), coalesce(nullif(trim(p_body_en), ''), trim(p_body_hu)),
    v_attachments, coalesce(p_starts_at, now()), p_expires_at, p_admin_user_id
  ) returning id into v_mail_id;

  if p_audience_type = 'user' then
    insert into public.mail_recipients (mail_id, user_id)
    values (v_mail_id, p_target_user_id)
    on conflict do nothing;
  elsif p_audience_type = 'existing' then
    -- Snapshot the current account set as well as storing the cutoff. The
    -- cutoff remains the security boundary used by list/claim operations.
    insert into public.mail_recipients (mail_id, user_id)
    select v_mail_id, users.id
    from auth.users as users
    where users.created_at <= v_cutoff
    on conflict do nothing;
  end if;

  insert into public.gm_audit_logs (
    admin_user_id, action, target_user_id, request_id, status, after_data, metadata
  ) values (
    p_admin_user_id,
    case when p_audience_type = 'user' then 'mail.send' else 'mail.broadcast' end,
    p_target_user_id, p_request_id, 'success',
    jsonb_build_object('mail_id', v_mail_id, 'attachments', v_attachments),
    jsonb_build_object('audience_type', p_audience_type, 'audience_cutoff_at', v_cutoff, 'title_hu', trim(p_title_hu))
  );

  return jsonb_build_object('mail_id', v_mail_id, 'audience_type', p_audience_type, 'audience_cutoff_at', v_cutoff, 'created_at', now());
end;
$$;

create or replace function public.gm_set_gm_titles(
  p_admin_user_id uuid,
  p_target_user_id uuid,
  p_titles text[],
  p_reason text,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.gm_admins%rowtype;
  v_old public.game_saves%rowtype;
  v_new_save jsonb;
  v_titles jsonb;
  v_snapshot_id uuid;
  v_active_title text;
  v_allowed constant text[] := array['gm','senior_gm','head_gm'];
begin
  select * into v_admin
  from public.gm_admins
  where user_id = p_admin_user_id and active = true;

  if not found or not (
    v_admin.role = 'owner' or 'profile.edit' = any(v_admin.permissions)
  ) then
    raise exception 'gm_permission_denied' using errcode = '42501';
  end if;

  if p_target_user_id is null
     or length(trim(coalesce(p_reason, ''))) < 3
     or length(p_reason) > 500
     or cardinality(coalesce(p_titles, '{}'::text[])) > 3
     or not (coalesce(p_titles, '{}'::text[]) <@ v_allowed) then
    raise exception 'invalid_gm_title_request' using errcode = '22023';
  end if;

  insert into public.game_saves (user_id, save_data)
  values (p_target_user_id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  select * into v_old
  from public.game_saves
  where user_id = p_target_user_id
  for update;

  select coalesce(jsonb_agg(title order by title), '[]'::jsonb)
  into v_titles
  from (
    select distinct title
    from (
      select value as title
      from jsonb_array_elements_text(
        case when jsonb_typeof(v_old.save_data->'ownedTitles') = 'array'
          then v_old.save_data->'ownedTitles' else '[]'::jsonb end
      )
      where value <> all(v_allowed)
      union all
      select unnest(coalesce(p_titles, '{}'::text[]))
    ) merged_titles
    where length(trim(title)) between 1 and 80
  ) unique_titles;

  v_new_save := jsonb_set(v_old.save_data, '{ownedTitles}', v_titles, true);
  v_active_title := v_new_save #>> '{profile,activeTitle}';
  if v_active_title = any(v_allowed) and not (v_active_title = any(coalesce(p_titles, '{}'::text[]))) then
    v_new_save := jsonb_set(v_new_save, '{profile,activeTitle}', '""'::jsonb, true);
  end if;

  insert into public.profile_snapshots (
    target_user_id, save_data, save_version, created_by, reason, request_id
  ) values (
    p_target_user_id, v_old.save_data, v_old.save_version,
    p_admin_user_id, trim(p_reason), p_request_id
  ) returning id into v_snapshot_id;

  update public.game_saves
  set save_data = v_new_save, updated_at = now()
  where user_id = p_target_user_id;

  insert into public.gm_audit_logs (
    admin_user_id, action, target_user_id, request_id,
    status, before_data, after_data, metadata
  ) values (
    p_admin_user_id, 'profile.gm_titles', p_target_user_id, p_request_id,
    'success', v_old.save_data, v_new_save,
    jsonb_build_object('reason', trim(p_reason), 'titles', coalesce(p_titles, '{}'::text[]), 'snapshot_id', v_snapshot_id)
  );

  return jsonb_build_object('save_data', v_new_save, 'snapshot_id', v_snapshot_id, 'updated_at', now());
end;
$$;

create or replace function public.player_claim_mail(
  p_user_id uuid,
  p_mail_id uuid,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mail public.mail_messages%rowtype;
  v_recipient public.mail_recipients%rowtype;
  v_save public.game_saves%rowtype;
  v_new_save jsonb;
  v_snapshot_id uuid;
  v_account_created_at timestamptz;
  v_state_key text := 'gm:' || p_mail_id::text;
begin
  select created_at into v_account_created_at
  from auth.users
  where id = p_user_id;

  select * into v_mail
  from public.mail_messages
  where id = p_mail_id
  for share;

  if not found
     or v_account_created_at is null
     or not v_mail.active
     or v_mail.starts_at > now()
     or (v_mail.expires_at is not null and v_mail.expires_at <= now())
     or not (
       v_mail.audience_type = 'all_future'
       or (v_mail.audience_type = 'existing' and v_account_created_at <= v_mail.audience_cutoff_at)
       or (v_mail.audience_type = 'user' and v_mail.target_user_id = p_user_id)
     ) then
    raise exception 'mail_not_available' using errcode = 'P0002';
  end if;

  insert into public.mail_recipients (mail_id, user_id)
  values (p_mail_id, p_user_id)
  on conflict do nothing;

  select * into v_recipient
  from public.mail_recipients
  where mail_id = p_mail_id and user_id = p_user_id
  for update;

  if v_recipient.claimed_at is not null then
    raise exception 'mail_already_claimed' using errcode = '23505';
  end if;

  insert into public.game_saves (user_id, save_data)
  values (p_user_id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  select * into v_save
  from public.game_saves
  where user_id = p_user_id
  for update;

  insert into public.profile_snapshots (
    target_user_id, save_data, save_version, created_by, reason, request_id
  ) values (
    p_user_id, v_save.save_data, v_save.save_version,
    null, 'Mail reward claim ' || p_mail_id::text, p_request_id
  ) returning id into v_snapshot_id;

  v_new_save := public.cherrift_apply_reward(v_save.save_data, v_mail.attachments);
  v_new_save := jsonb_set(v_new_save, '{mailbox}',
    case when jsonb_typeof(v_new_save->'mailbox') = 'object' then v_new_save->'mailbox' else '{}'::jsonb end, true);
  v_new_save := jsonb_set(v_new_save, '{mailbox,states}',
    case when jsonb_typeof(v_new_save#>'{mailbox,states}') = 'object' then v_new_save#>'{mailbox,states}' else '{}'::jsonb end, true);
  v_new_save := jsonb_set(v_new_save, array['mailbox', 'states', v_state_key],
    jsonb_build_object('read', true, 'claimed', true), true);

  update public.game_saves
  set save_data = v_new_save, updated_at = now()
  where user_id = p_user_id;

  update public.mail_recipients
  set read_at = coalesce(read_at, now()), claimed_at = now()
  where mail_id = p_mail_id and user_id = p_user_id;

  insert into public.gm_audit_logs (
    action, target_user_id, request_id, status, before_data, after_data, metadata
  ) values (
    'player.mail.claim', p_user_id, p_request_id, 'success',
    v_save.save_data, v_new_save,
    jsonb_build_object('mail_id', p_mail_id, 'snapshot_id', v_snapshot_id)
  );

  return jsonb_build_object(
    'save_data', v_new_save, 'reward', v_mail.attachments,
    'snapshot_id', v_snapshot_id, 'claimed_at', now()
  );
end;
$$;

revoke execute on function public.gm_create_mail(uuid, text, uuid, text, text, text, text, jsonb, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke execute on function public.gm_set_gm_titles(uuid, uuid, text[], text, uuid) from public, anon, authenticated;
revoke execute on function public.player_claim_mail(uuid, uuid, uuid) from public, anon, authenticated;

grant execute on function public.gm_create_mail(uuid, text, uuid, text, text, text, text, jsonb, timestamptz, timestamptz, uuid) to service_role;
grant execute on function public.gm_set_gm_titles(uuid, uuid, text[], text, uuid) to service_role;
grant execute on function public.player_claim_mail(uuid, uuid, uuid) to service_role;

commit;
