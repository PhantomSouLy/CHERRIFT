-- CHERRIFT auth/runtime guard
-- Safe and idempotent. This migration does not delete or rewrite save data.
-- It guarantees that browsers may read only their own save, while every save
-- mutation remains behind the JWT-validating player-api Edge Function.

create table if not exists public.game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save_data jsonb not null default '{}'::jsonb,
  save_version text not null default '0.9.5-prebeta.2',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_saves_save_data_is_object
    check (jsonb_typeof(save_data) = 'object')
);

alter table public.game_saves
  add column if not exists save_data jsonb not null default '{}'::jsonb,
  add column if not exists save_version text not null default '0.9.5-prebeta.2',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.game_saves enable row level security;

revoke all on table public.game_saves from anon, authenticated;
grant select on table public.game_saves to authenticated;
grant all on table public.game_saves to service_role;

-- Remove legacy cleanup-era write policies regardless of their names.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'game_saves'
  loop
    execute format('drop policy if exists %I on public.game_saves', policy_row.policyname);
  end loop;
end
$$;

create policy "Players can read their own CHERRIFT save"
on public.game_saves
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function public.set_cherrift_save_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_cherrift_save_updated_at() from public, anon, authenticated;
grant execute on function public.set_cherrift_save_updated_at() to service_role;

drop trigger if exists set_cherrift_save_updated_at on public.game_saves;
drop trigger if exists set_cherrift_updated_at on public.game_saves;
create trigger set_cherrift_save_updated_at
before update on public.game_saves
for each row execute function public.set_cherrift_save_updated_at();


create or replace function public.set_cherrift_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.cherrift_apply_reward(
  p_save jsonb,
  p_reward jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_save jsonb := public.cherrift_migrate_chest_only(coalesce(p_save, '{}'::jsonb));
  v_reward jsonb := public.cherrift_reward_chest_only(coalesce(p_reward, '{}'::jsonb));
  v_resources jsonb := '{}'::jsonb;
  v_resource record;
  v_catalog public.reward_catalog%rowtype;
  v_amount bigint;
  v_skins text[] := '{}'::text[];
begin
  if jsonb_typeof(v_save) <> 'object' or jsonb_typeof(v_reward) <> 'object' then
    raise exception 'invalid_json_object' using errcode = '22023';
  end if;

  if v_reward ? 'resources' then
    if jsonb_typeof(v_reward->'resources') <> 'object' then
      raise exception 'invalid_reward_resources' using errcode = '22023';
    end if;
    v_resources := v_reward->'resources';
  end if;

  for v_resource in select key, value from jsonb_each(v_resources) loop
    if jsonb_typeof(v_resource.value) <> 'number'
       or v_resource.value::text !~ '^[0-9]+$' then
      raise exception 'invalid_reward_resource:%', v_resource.key using errcode = '22023';
    end if;

    v_amount := v_resource.value::text::bigint;
    if v_amount < 1 then
      raise exception 'invalid_reward_amount:%', v_resource.key using errcode = '22023';
    end if;

    -- Legendary is hidden, but an old already-created reward must remain claimable.
    if v_resource.key = 'chest.legendary' then
      if v_amount > 1000000 then
        raise exception 'invalid_reward_amount:%', v_resource.key using errcode = '22023';
      end if;
      v_save := public.cherrift_jsonb_add_integer(
        v_save, array['chests','legendary'], v_amount, 1000000
      );
      continue;
    end if;

    select * into v_catalog
    from public.reward_catalog
    where resource_id = v_resource.key and active = true;

    if not found or v_amount > v_catalog.max_amount then
      raise exception 'invalid_reward_resource:%', v_resource.key using errcode = '22023';
    end if;

    v_save := public.cherrift_jsonb_add_integer(
      v_save,
      v_catalog.save_path,
      v_amount,
      v_catalog.max_amount
    );
  end loop;

  if v_reward ? 'skins' then
    if jsonb_typeof(v_reward->'skins') <> 'array'
       or jsonb_array_length(v_reward->'skins') > 100 then
      raise exception 'invalid_reward_skins' using errcode = '22023';
    end if;

    select coalesce(array_agg(distinct skin_id order by skin_id), '{}'::text[])
    into v_skins
    from (
      select value as skin_id
      from jsonb_array_elements_text(
        case when jsonb_typeof(v_save->'unlockedSkins') = 'array'
          then v_save->'unlockedSkins' else '[]'::jsonb end
      )
      union all
      select value as skin_id
      from jsonb_array_elements_text(v_reward->'skins')
    ) merged
    where length(trim(skin_id)) between 1 and 80;

    v_save := jsonb_set(v_save, '{unlockedSkins}', to_jsonb(v_skins), true);
  end if;

  return v_save;
end;
$$;

create or replace function public.gm_apply_profile_patch(
  p_admin_user_id uuid,
  p_target_user_id uuid,
  p_patch jsonb,
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
  v_snapshot_id uuid;
  v_invalid_key text;
begin
  select * into v_admin
  from public.gm_admins
  where user_id = p_admin_user_id and active = true;

  if not found
     or not (v_admin.role = 'owner'
             or 'profile.edit' = any(v_admin.permissions)) then
    raise exception 'gm_permission_denied' using errcode = '42501';
  end if;

  if p_target_user_id is null
     or jsonb_typeof(coalesce(p_patch, '{}'::jsonb)) <> 'object'
     or length(trim(coalesce(p_reason, ''))) < 3
     or length(p_reason) > 500 then
    raise exception 'invalid_profile_request' using errcode = '22023';
  end if;

  select key_name into v_invalid_key
  from jsonb_object_keys(p_patch) as keys(key_name)
  where key_name not in (
    'coins', 'keys', 'selectedSkin', 'unlockedSkins',
    'inventory', 'equipped', 'selectedStageId', 'unlockedStages'
  )
  limit 1;

  if v_invalid_key is not null then
    raise exception 'profile_field_not_allowed:%', v_invalid_key using errcode = '22023';
  end if;

  if p_patch ? 'coins' and (
    jsonb_typeof(p_patch->'coins') <> 'number'
    or (p_patch->>'coins') !~ '^[0-9]+$'
    or (p_patch->>'coins')::numeric > 1000000000
  ) then
    raise exception 'invalid_profile_coins' using errcode = '22023';
  end if;

  if p_patch ? 'keys' and (
    jsonb_typeof(p_patch->'keys') <> 'number'
    or (p_patch->>'keys') !~ '^[0-9]+$'
    or (p_patch->>'keys')::numeric > 1000000
  ) then
    raise exception 'invalid_profile_keys' using errcode = '22023';
  end if;

  if p_patch ? 'selectedSkin' and (
    jsonb_typeof(p_patch->'selectedSkin') <> 'string'
    or length(p_patch->>'selectedSkin') not between 1 and 80
  ) then
    raise exception 'invalid_selected_skin' using errcode = '22023';
  end if;

  if p_patch ? 'selectedStageId' and (
    jsonb_typeof(p_patch->'selectedStageId') <> 'string'
    or length(p_patch->>'selectedStageId') not between 1 and 80
  ) then
    raise exception 'invalid_selected_stage' using errcode = '22023';
  end if;

  if p_patch ? 'unlockedSkins' and (
    jsonb_typeof(p_patch->'unlockedSkins') <> 'array'
    or jsonb_array_length(p_patch->'unlockedSkins') > 200
  ) then
    raise exception 'invalid_unlocked_skins' using errcode = '22023';
  end if;

  if p_patch ? 'unlockedStages' and (
    jsonb_typeof(p_patch->'unlockedStages') <> 'array'
    or jsonb_array_length(p_patch->'unlockedStages') > 200
  ) then
    raise exception 'invalid_unlocked_stages' using errcode = '22023';
  end if;

  if p_patch ? 'inventory' and (
    jsonb_typeof(p_patch->'inventory') <> 'array'
    or jsonb_array_length(p_patch->'inventory') > 500
  ) then
    raise exception 'invalid_inventory' using errcode = '22023';
  end if;

  if p_patch ? 'equipped' and jsonb_typeof(p_patch->'equipped') <> 'object' then
    raise exception 'invalid_equipped' using errcode = '22023';
  end if;

  insert into public.game_saves (user_id, save_data)
  values (p_target_user_id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  select * into v_old
  from public.game_saves
  where user_id = p_target_user_id
  for update;

  v_new_save := v_old.save_data || p_patch;

  insert into public.profile_snapshots (
    target_user_id, save_data, save_version, created_by, reason, request_id
  ) values (
    p_target_user_id, v_old.save_data, v_old.save_version,
    p_admin_user_id, trim(p_reason), p_request_id
  ) returning id into v_snapshot_id;

  update public.game_saves
  set save_data = v_new_save,
      updated_at = now()
  where user_id = p_target_user_id;

  insert into public.gm_audit_logs (
    admin_user_id, action, target_user_id, request_id,
    status, before_data, after_data, metadata
  ) values (
    p_admin_user_id, 'profile.update', p_target_user_id, p_request_id,
    'success', v_old.save_data, v_new_save,
    jsonb_build_object('reason', trim(p_reason), 'snapshot_id', v_snapshot_id)
  );

  return jsonb_build_object(
    'save_data', v_new_save,
    'save_version', v_old.save_version,
    'snapshot_id', v_snapshot_id,
    'updated_at', now()
  );
end;
$$;

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

create or replace function public.gm_create_redeem_code(
  p_admin_user_id uuid,
  p_code_hash text,
  p_code_prefix text,
  p_rewards jsonb,
  p_max_redemptions integer,
  p_per_user_limit integer,
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
  v_code_id uuid;
  v_rewards jsonb := coalesce(p_rewards, '{}'::jsonb);
begin
  select * into v_admin
  from public.gm_admins
  where user_id = p_admin_user_id and active = true;

  if not found or not (v_admin.role = 'owner' or 'redeem.create' = any(v_admin.permissions)) then
    raise exception 'gm_permission_denied' using errcode = '42501';
  end if;

  if length(coalesce(p_code_hash, '')) <> 64
     or length(trim(coalesce(p_code_prefix, ''))) not between 1 and 24
     or jsonb_typeof(v_rewards) <> 'object'
     or p_max_redemptions not between 0 and 1000000
     or p_per_user_limit not between 0 and 100
     or (p_max_redemptions > 0 and p_per_user_limit > p_max_redemptions)
     or (p_expires_at is not null and p_expires_at <= coalesce(p_starts_at, now())) then
    raise exception 'invalid_redeem_request' using errcode = '22023';
  end if;

  insert into public.redeem_codes (
    code_hash, code_prefix, rewards, max_redemptions,
    per_user_limit, starts_at, expires_at, created_by
  ) values (
    lower(p_code_hash), upper(trim(p_code_prefix)), v_rewards,
    p_max_redemptions, p_per_user_limit,
    coalesce(p_starts_at, now()), p_expires_at, p_admin_user_id
  ) returning id into v_code_id;

  insert into public.gm_audit_logs (
    admin_user_id, action, request_id, status, after_data, metadata
  ) values (
    p_admin_user_id, 'redeem.create', p_request_id, 'success',
    jsonb_build_object(
      'code_id', v_code_id,
      'code_prefix', upper(trim(p_code_prefix)),
      'rewards', v_rewards,
      'max_redemptions', p_max_redemptions,
      'per_user_limit', p_per_user_limit
    ),
    '{}'::jsonb
  );

  return jsonb_build_object('code_id', v_code_id, 'created_at', now());
end;
$$;

CREATE OR REPLACE FUNCTION public.player_claim_mail(p_user_id uuid, p_mail_id uuid, p_request_id uuid DEFAULT gen_random_uuid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    'snapshot_id', v_snapshot_id, 'claimed_at', now(), 'updated_at', now()
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.player_redeem_code(p_user_id uuid, p_code_hash text, p_request_id uuid DEFAULT gen_random_uuid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_code public.redeem_codes%rowtype;
  v_user_claims integer;
  v_save public.game_saves%rowtype;
  v_new_save jsonb;
  v_snapshot_id uuid;
begin
  select * into v_code
  from public.redeem_codes
  where code_hash = lower(p_code_hash)
  for update;

  if not found
     or not v_code.active
     or v_code.starts_at > now()
     or (v_code.expires_at is not null and v_code.expires_at <= now())
     or (v_code.max_redemptions > 0 and v_code.total_redemptions >= v_code.max_redemptions) then
    raise exception 'redeem_not_available' using errcode = 'P0002';
  end if;

  select count(*)::integer into v_user_claims
  from public.redeem_claims
  where code_id = v_code.id and user_id = p_user_id;

  if v_code.per_user_limit > 0 and v_user_claims >= v_code.per_user_limit then
    raise exception 'redeem_user_limit_reached' using errcode = '23505';
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
    null, 'Redeem claim ' || v_code.code_prefix, p_request_id
  ) returning id into v_snapshot_id;

  v_new_save := public.cherrift_apply_reward(v_save.save_data, v_code.rewards);

  update public.game_saves
  set save_data = v_new_save, updated_at = now()
  where user_id = p_user_id;

  insert into public.redeem_claims (
    code_id, user_id, rewards_snapshot, request_id
  ) values (
    v_code.id, p_user_id, v_code.rewards, p_request_id
  );

  update public.redeem_codes
  set total_redemptions = total_redemptions + 1
  where id = v_code.id;

  insert into public.gm_audit_logs (
    action, target_user_id, request_id, status, before_data, after_data, metadata
  ) values (
    'player.redeem.claim', p_user_id, p_request_id, 'success',
    v_save.save_data, v_new_save,
    jsonb_build_object(
      'code_id', v_code.id,
      'code_prefix', v_code.code_prefix,
      'snapshot_id', v_snapshot_id
    )
  );

  return jsonb_build_object(
    'save_data', v_new_save,
    'reward', v_code.rewards,
    'snapshot_id', v_snapshot_id,
    'claimed_at', now(), 'updated_at', now()
  );
end;
$function$
;

create or replace function public.cherrift_jsonb_set_integer(
  p_document jsonb,
  p_path text[],
  p_value bigint,
  p_cap bigint default 1000000000
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_document jsonb := coalesce(p_document, '{}'::jsonb);
  v_prefix text[];
  v_i integer;
begin
  if jsonb_typeof(v_document) <> 'object'
     or p_path is null
     or cardinality(p_path) < 1
     or cardinality(p_path) > 8
     or p_value < 0
     or p_value > p_cap then
    raise exception 'invalid_resource_value' using errcode = '22023';
  end if;

  if cardinality(p_path) > 1 then
    for v_i in 1..cardinality(p_path)-1 loop
      v_prefix := p_path[1:v_i];
      if jsonb_typeof(v_document #> v_prefix) is distinct from 'object' then
        v_document := jsonb_set(v_document, v_prefix, '{}'::jsonb, true);
      end if;
    end loop;
  end if;

  return jsonb_set(v_document, p_path, to_jsonb(p_value), true);
end;
$$;

create or replace function public.cherrift_jsonb_add_integer(
  p_document jsonb,
  p_path text[],
  p_amount bigint,
  p_cap bigint default 1000000000
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current bigint := 0;
  v_text text;
begin
  if p_amount < 0 then
    raise exception 'invalid_resource_amount' using errcode = '22023';
  end if;
  v_text := coalesce(p_document #>> p_path, '');
  if v_text ~ '^[0-9]+$' then
    v_current := least(v_text::bigint, p_cap);
  end if;
  return public.cherrift_jsonb_set_integer(
    p_document,
    p_path,
    least(v_current + p_amount, p_cap),
    p_cap
  );
end;
$$;

create or replace function public.gm_apply_profile_resources(
  p_admin_user_id uuid,
  p_target_user_id uuid,
  p_values jsonb,
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
  v_snapshot_id uuid;
  v_entry record;
  v_catalog public.reward_catalog%rowtype;
  v_value bigint;
begin
  select * into v_admin
  from public.gm_admins
  where user_id = p_admin_user_id and active = true;

  if not found or not (v_admin.role = 'owner' or 'profile.edit' = any(v_admin.permissions)) then
    raise exception 'gm_permission_denied' using errcode = '42501';
  end if;

  if p_target_user_id is null
     or jsonb_typeof(coalesce(p_values, '{}'::jsonb)) <> 'object'
     or not exists (select 1 from jsonb_object_keys(coalesce(p_values, '{}'::jsonb)))
     or length(trim(coalesce(p_reason, ''))) < 3
     or length(p_reason) > 500 then
    raise exception 'invalid_profile_resource_request' using errcode = '22023';
  end if;

  insert into public.game_saves (user_id, save_data)
  values (p_target_user_id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  select * into v_old
  from public.game_saves
  where user_id = p_target_user_id
  for update;

  v_new_save := v_old.save_data;

  for v_entry in select key, value from jsonb_each(p_values) loop
    select * into v_catalog
    from public.reward_catalog
    where resource_id = v_entry.key and active = true;

    if not found
       or jsonb_typeof(v_entry.value) <> 'number'
       or v_entry.value::text !~ '^[0-9]+$' then
      raise exception 'invalid_profile_resource:%', v_entry.key using errcode = '22023';
    end if;

    v_value := v_entry.value::text::bigint;
    if v_value < 0 or v_value > v_catalog.max_amount then
      raise exception 'invalid_profile_resource_value:%', v_entry.key using errcode = '22023';
    end if;

    v_new_save := public.cherrift_jsonb_set_integer(
      v_new_save,
      v_catalog.save_path,
      v_value,
      v_catalog.max_amount
    );
  end loop;

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
    p_admin_user_id, 'profile.resources.update', p_target_user_id, p_request_id,
    'success', v_old.save_data, v_new_save,
    jsonb_build_object('reason', trim(p_reason), 'snapshot_id', v_snapshot_id, 'values', p_values)
  );

  return jsonb_build_object(
    'save_data', v_new_save,
    'save_version', v_old.save_version,
    'snapshot_id', v_snapshot_id,
    'updated_at', now()
  );
end;
$$;

create or replace function public.cherrift_migrate_chest_only(
  p_save jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_save jsonb := coalesce(p_save, '{}'::jsonb);
  v_common bigint := 0;
  v_rare bigint := 0;
  v_epic bigint := 0;
  v_legendary bigint := 0;
  v_done boolean := false;
begin
  if jsonb_typeof(v_save) <> 'object' then
    v_save := '{}'::jsonb;
  end if;

  v_done := coalesce((v_save #>> '{economy,chestOnlyMigrationV1}')::boolean, false);
  if v_done then
    return v_save;
  end if;

  if coalesce(v_save->>'keys', '') ~ '^[0-9]+$' then
    v_common := (v_save->>'keys')::bigint;
  end if;
  if coalesce(v_save #>> '{resourceWallet,keys,common}', '') ~ '^[0-9]+$' then
    v_common := v_common + (v_save #>> '{resourceWallet,keys,common}')::bigint;
  end if;
  if coalesce(v_save #>> '{resourceWallet,keys,rare}', '') ~ '^[0-9]+$' then
    v_rare := (v_save #>> '{resourceWallet,keys,rare}')::bigint;
  end if;
  if coalesce(v_save #>> '{resourceWallet,keys,epic}', '') ~ '^[0-9]+$' then
    v_epic := (v_save #>> '{resourceWallet,keys,epic}')::bigint;
  end if;
  if coalesce(v_save #>> '{resourceWallet,keys,legendary}', '') ~ '^[0-9]+$' then
    v_legendary := (v_save #>> '{resourceWallet,keys,legendary}')::bigint;
  end if;

  v_save := public.cherrift_jsonb_add_integer(v_save, array['chests','common'], v_common, 1000000);
  v_save := public.cherrift_jsonb_add_integer(v_save, array['chests','rare'], v_rare, 1000000);
  v_save := public.cherrift_jsonb_add_integer(v_save, array['chests','epic'], v_epic, 1000000);
  v_save := public.cherrift_jsonb_add_integer(v_save, array['chests','legendary'], v_legendary, 1000000);

  v_save := public.cherrift_jsonb_set_integer(v_save, array['keys'], 0, 1000000);
  v_save := public.cherrift_jsonb_set_integer(v_save, array['resourceWallet','keys','common'], 0, 1000000);
  v_save := public.cherrift_jsonb_set_integer(v_save, array['resourceWallet','keys','rare'], 0, 1000000);
  v_save := public.cherrift_jsonb_set_integer(v_save, array['resourceWallet','keys','epic'], 0, 1000000);
  v_save := public.cherrift_jsonb_set_integer(v_save, array['resourceWallet','keys','legendary'], 0, 1000000);
  if jsonb_typeof(v_save->'economy') is distinct from 'object' then
    v_save := jsonb_set(v_save, '{economy}', '{}'::jsonb, true);
  end if;
  v_save := jsonb_set(v_save, '{economy,chestOnlyMigrationV1}', 'true'::jsonb, true);

  return v_save;
exception
  when invalid_text_representation then
    return v_save;
end;
$$;

create or replace function public.cherrift_reward_chest_only(
  p_reward jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_reward jsonb := coalesce(p_reward, '{}'::jsonb);
  v_resources jsonb := '{}'::jsonb;
  v_entry record;
  v_key text;
  v_amount bigint;
  v_existing bigint;
begin
  if jsonb_typeof(v_reward) <> 'object' then
    return '{}'::jsonb;
  end if;

  if jsonb_typeof(v_reward->'resources') = 'object' then
    for v_entry in select key, value from jsonb_each(v_reward->'resources') loop
      if jsonb_typeof(v_entry.value) <> 'number' or v_entry.value::text !~ '^[0-9]+$' then
        continue;
      end if;
      v_key := case v_entry.key
        when 'key.common' then 'chest.common'
        when 'key.rare' then 'chest.rare'
        when 'key.epic' then 'chest.epic'
        when 'key.legendary' then 'chest.legendary'
        else v_entry.key
      end;
      v_amount := v_entry.value::text::bigint;
      v_existing := case when coalesce(v_resources->>v_key, '') ~ '^[0-9]+$'
        then (v_resources->>v_key)::bigint else 0 end;
      v_resources := jsonb_set(v_resources, array[v_key], to_jsonb(v_existing + v_amount), true);
    end loop;
  end if;

  if coalesce(v_reward->>'coins', '') ~ '^[0-9]+$' then
    v_existing := case when coalesce(v_resources->>'currency.coins', '') ~ '^[0-9]+$'
      then (v_resources->>'currency.coins')::bigint else 0 end;
    v_resources := jsonb_set(v_resources, array['currency.coins'], to_jsonb(v_existing + (v_reward->>'coins')::bigint), true);
  end if;

  if coalesce(v_reward->>'keys', '') ~ '^[0-9]+$' then
    v_existing := case when coalesce(v_resources->>'chest.common', '') ~ '^[0-9]+$'
      then (v_resources->>'chest.common')::bigint else 0 end;
    v_resources := jsonb_set(v_resources, array['chest.common'], to_jsonb(v_existing + (v_reward->>'keys')::bigint), true);
  end if;

  v_reward := v_reward - 'resources' - 'coins' - 'keys';
  if v_resources <> '{}'::jsonb then
    v_reward := v_reward || jsonb_build_object('resources', v_resources);
  end if;
  return v_reward;
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

CREATE OR REPLACE FUNCTION public.gm_reset_player_save(p_admin_user_id uuid, p_target_user_id uuid, p_reason text, p_request_id uuid DEFAULT gen_random_uuid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_admin public.gm_admins%rowtype;
  v_old public.game_saves%rowtype;
  v_player public.player_profiles%rowtype;
  v_profile jsonb;
  v_new jsonb;
  v_snapshot_id uuid;
  v_is_gm boolean;
  v_rights jsonb;
  v_titles jsonb;
begin
  select * into v_admin from public.gm_admins
  where user_id = p_admin_user_id and active = true;
  if not found or not (v_admin.role = 'owner' or 'profile.edit' = any(v_admin.permissions)) then
    raise exception 'gm_permission_denied' using errcode = '42501';
  end if;
  if p_target_user_id is null or length(trim(coalesce(p_reason,''))) < 3 or length(p_reason) > 500 then
    raise exception 'invalid_reset_request' using errcode = '22023';
  end if;

  select * into v_old from public.game_saves
  where user_id = p_target_user_id for update;
  if not found then
    raise exception 'player_save_not_found' using errcode = 'P0002';
  end if;

  select * into v_player from public.player_profiles
  where user_id = p_target_user_id;
  if not found then
    raise exception 'player_profile_not_found' using errcode = 'P0002';
  end if;

  -- GM authority is a server-side role; a progression reset must preserve it.
  select exists(select 1 from public.gm_admins where user_id=p_target_user_id and active)
  into v_is_gm;
  select coalesce(entitlements,'{}'::jsonb) into v_rights
  from public.account_entitlements where user_id=p_target_user_id;
  v_rights := case when v_is_gm then coalesce(v_rights,'{}'::jsonb) else '{}'::jsonb end;
  select coalesce(jsonb_agg(value),'[]'::jsonb) into v_titles
  from jsonb_array_elements_text(coalesce(v_old.save_data->'ownedTitles','[]'::jsonb))
  where v_is_gm and value in ('gm','senior_gm','head_gm');

  insert into public.profile_snapshots(target_user_id,save_data,save_version,created_by,reason,request_id)
  values(p_target_user_id,v_old.save_data,v_old.save_version,p_admin_user_id,'RESET: '||trim(p_reason),p_request_id)
  returning id into v_snapshot_id;

  -- Identity is rebuilt from the server profile instead of trusting the old
  -- save. This matters specifically when the reset is repairing a save that
  -- was previously contaminated with another account's local data.
  v_profile := jsonb_build_object(
    'name',v_player.display_name,
    'authProvider','discord',
    'discordUserId',p_target_user_id::text,
    'discordUsername',coalesce(v_player.discord_name,''),
    'avatarUrl',coalesce(v_player.avatar_url,''),
    'activeTitle',case when v_is_gm and v_titles ? (v_old.save_data#>>'{profile,activeTitle}') then v_old.save_data#>>'{profile,activeTitle}' else '' end,
    'frameId','frame0lvl',
    'createdAt',coalesce(v_old.save_data#>'{profile,createdAt}',to_jsonb(extract(epoch from now())*1000))
  );
  v_new := jsonb_build_object(
    'coins',500,'keys',0,'bloomGems',0,'blossomGems',0,'sakuraEssence',0,'heartTokens',0,
    'chests',jsonb_build_object('common',3,'rare',0,'epic',0),
    'selectedSkin','cherry_default','unlockedSkins',jsonb_build_array('cherry_default'),
    'selectedStageId','world_1_1','unlockedStages',jsonb_build_array('world_1_1'),
    'clearedStages','{}'::jsonb,'stageStars','{}'::jsonb,'stageStats','{}'::jsonb,'firstClearClaimed','{}'::jsonb,
    'inventory','[]'::jsonb,'equipped','{}'::jsonb,
    'account',jsonb_build_object(
      'level',1,'xp',0,'totalXp',0,'skillPoints',1,'manualV052',true,
      'tree',jsonb_build_object('power',0,'vitality',0,'haste',0,'fortune',0),
      'skillTreeV082',jsonb_build_object('ranks','{}'::jsonb),'skillTreeV082Migrated',true
    ),
    'stats',jsonb_build_object('kills',0,'clears',0,'runs',0,'coinsEarned',0,'loginDays',0),
    'economy',jsonb_build_object('lifetimeCoinsEarned',0,'bestWeeklyRank',0,'activePlayers',0),
    'ownedTitles',v_titles,'titleRewardsClaimed','[]'::jsonb,
    'profile',v_profile,
    'settings',jsonb_build_object('volume',60,'touchMode',true,'fpsLimit',60,'language','hu'),
    'energy',50,'energyState',jsonb_build_object('max',50,'lastTick',extract(epoch from now())*1000,'refills','{}'::jsonb,'drinks',jsonb_build_object('small',0,'standard',0,'large',0)),
    'bag',jsonb_build_object('materials',jsonb_build_object('gearScrap',0,'stones',jsonb_build_object('copper',0,'iron',0,'steel',0,'silver',0,'royal',0,'magical',0),'slotCores','{}'::jsonb)),
    'prebeta',jsonb_build_object('schema','prebeta-1','version','0.9.5-prebeta.2','starterCreated',true,'isStarter',true,'entitlements',v_rights,
      'serverEdit',jsonb_build_object('at',clock_timestamp(),'requestId',p_request_id,'source','gm-player-reset')),
    'security',jsonb_build_object('accountOwnerId',p_target_user_id::text,'schema',2,'initializedBy','gm-player-reset')
  );

  update public.game_saves set save_data=v_new,save_version='0.9.5-prebeta.2',updated_at=now()
  where user_id=p_target_user_id;
  update public.player_profiles
  set level=1,power=0,frame_id='frame0lvl',friend_slot_bonus=0,best_weekly_rank=null,
      last_active_at=now(),updated_at=now()
  where user_id=p_target_user_id;

  -- A full reset must also remove server-side progression that is not stored
  -- inside game_saves. Social identity/friend relationships and mail remain;
  -- ranks and progression entitlements do not.
  delete from public.weekly_power_ranking where user_id=p_target_user_id;
  insert into public.account_entitlements(user_id,entitlements,updated_at)
  values(p_target_user_id,v_rights,now())
  on conflict(user_id) do update
  set entitlements=excluded.entitlements,updated_at=excluded.updated_at;

  insert into public.gm_audit_logs(admin_user_id,action,target_user_id,request_id,status,before_data,after_data,metadata)
  values(p_admin_user_id,'profile.full_reset',p_target_user_id,p_request_id,'success',v_old.save_data,v_new,
    jsonb_build_object('reason',trim(p_reason),'snapshot_id',v_snapshot_id));

  return jsonb_build_object('ok',true,'snapshot_id',v_snapshot_id,'save_data',v_new,'updated_at',now());
end;
$function$
;

CREATE OR REPLACE FUNCTION public.gm_apply_profile_bundle(p_admin_user_id uuid, p_target_user_id uuid, p_patch jsonb DEFAULT '{}'::jsonb, p_values jsonb DEFAULT '{}'::jsonb, p_titles text[] DEFAULT NULL::text[], p_reason text DEFAULT ''::text, p_request_id uuid DEFAULT gen_random_uuid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_result jsonb;
  v_snapshots jsonb := '[]'::jsonb;
  v_save jsonb;
  v_prebeta jsonb;
begin
  if coalesce(p_values, '{}'::jsonb) <> '{}'::jsonb then
    v_result := public.gm_apply_profile_resources(p_admin_user_id, p_target_user_id, p_values, p_reason, p_request_id);
    if v_result ? 'snapshot_id' then v_snapshots := v_snapshots || jsonb_build_array(v_result->'snapshot_id'); end if;
  end if;

  if coalesce(p_patch, '{}'::jsonb) <> '{}'::jsonb then
    v_result := public.gm_apply_profile_patch(p_admin_user_id, p_target_user_id, p_patch, p_reason, p_request_id);
    if v_result ? 'snapshot_id' then v_snapshots := v_snapshots || jsonb_build_array(v_result->'snapshot_id'); end if;
  end if;

  if p_titles is not null then
    v_result := public.gm_set_gm_titles(p_admin_user_id, p_target_user_id, p_titles, p_reason, p_request_id);
    if v_result ? 'snapshot_id' then v_snapshots := v_snapshots || jsonb_build_array(v_result->'snapshot_id'); end if;
  end if;

  select save_data into v_save from public.game_saves where user_id = p_target_user_id for update;
  if v_save is null then v_save := '{}'::jsonb; end if;
  v_prebeta := coalesce(v_save->'prebeta', '{}'::jsonb) || jsonb_build_object(
    'serverEdit', jsonb_build_object(
      'at', clock_timestamp(),
      'requestId', p_request_id,
      'source', 'gm-profile-editor'
    )
  );
  v_save := jsonb_set(v_save, '{prebeta}', v_prebeta, true);
  insert into public.game_saves(user_id, save_data, save_version, updated_at)
  values(p_target_user_id, v_save, '0.9.5-prebeta.1', now())
  on conflict(user_id) do update set save_data = excluded.save_data, updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'snapshot_ids', v_snapshots,
    'server_edit', v_prebeta->'serverEdit',
    'updated_at', now(),
    'save_data', v_save
  );
end;
$function$
;

create or replace function public.set_cherrift_save_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $repair$
begin
  if new.save_data is not distinct from old.save_data
     and new.save_version is not distinct from old.save_version then
    new.updated_at := old.updated_at;
  else
    new.updated_at := now();
  end if;
  return new;
end;
$repair$;

-- Legacy objects exist on upgraded projects but not on clean previews.
do $legacy$
begin
  if to_regclass('public.player_saves') is not null then
    execute 'revoke insert,update,delete,truncate,references,trigger on public.player_saves from anon,authenticated';
  end if;
  if to_regprocedure('public.update_player_save_timestamp()') is not null then
    execute 'alter function public.update_player_save_timestamp() set search_path = ''''';
  end if;
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public,anon,authenticated';
  end if;
end;
$legacy$;

revoke all on public.game_saves from anon,authenticated;
grant select on public.game_saves to authenticated;

-- Reconcile migrations that already existed in the manually provisioned database.
-- This records their application; their historical data updates are not replayed.
delete from supabase_migrations.schema_migrations
where (version,name) in (('20260730','gm_tool_pack'),('20260731','bugfix_v0941_chest_only'));
insert into supabase_migrations.schema_migrations(version,name)
values
('20260730000000','gm_tool_pack'),
('20260731000000','gm_tool_pack_v11_economy'),
('20260731000001','bugfix_v0941_chest_only'),
('20260801000000','prebeta_v095'),
('20260809000000','prebeta_mail_and_gm_titles'),
('20260809000001','gm_player_reset'),
('20260809000002','profile_bundle_revision'),
('20260809000003','account_save_isolation'),
('20260821000000','auth_runtime_guard')
on conflict(version) do nothing;
