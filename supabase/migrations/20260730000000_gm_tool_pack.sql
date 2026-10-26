-- CHERRIFT GM Tool Pack v1
-- Safe to run more than once. Existing game_saves data is preserved.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Existing cloud-save table hardening
-- ---------------------------------------------------------------------------

create table if not exists public.game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save_data jsonb not null default '{}'::jsonb,
  save_version text not null default '0.6.3-cloud.1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_saves_save_data_is_object
    check (jsonb_typeof(save_data) = 'object')
);

alter table public.game_saves enable row level security;

revoke all on table public.game_saves from anon;
grant select, insert, update, delete on table public.game_saves to authenticated;
grant all on table public.game_saves to service_role;

drop policy if exists "Players can read their own CHERRIFT save" on public.game_saves;
create policy "Players can read their own CHERRIFT save"
on public.game_saves
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Players can create their own CHERRIFT save" on public.game_saves;
create policy "Players can create their own CHERRIFT save"
on public.game_saves
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Players can update their own CHERRIFT save" on public.game_saves;
create policy "Players can update their own CHERRIFT save"
on public.game_saves
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Players can delete their own CHERRIFT save" on public.game_saves;
create policy "Players can delete their own CHERRIFT save"
on public.game_saves
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

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

drop trigger if exists set_cherrift_save_updated_at on public.game_saves;
create trigger set_cherrift_save_updated_at
before update on public.game_saves
for each row execute function public.set_cherrift_updated_at();

-- ---------------------------------------------------------------------------
-- GM authorization and immutable audit trail
-- ---------------------------------------------------------------------------

create table if not exists public.gm_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'support'
    check (role in ('owner', 'admin', 'support')),
  permissions text[] not null default '{}'::text[],
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gm_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  request_id uuid not null default gen_random_uuid(),
  status text not null default 'success'
    check (status in ('success', 'denied', 'failed')),
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists gm_audit_logs_created_at_idx
  on public.gm_audit_logs (created_at desc);
create index if not exists gm_audit_logs_admin_idx
  on public.gm_audit_logs (admin_user_id, created_at desc);
create index if not exists gm_audit_logs_target_idx
  on public.gm_audit_logs (target_user_id, created_at desc);

create table if not exists public.profile_snapshots (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  save_data jsonb not null,
  save_version text not null,
  created_by uuid references auth.users(id) on delete set null,
  reason text not null,
  request_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  constraint profile_snapshots_save_data_is_object
    check (jsonb_typeof(save_data) = 'object')
);

create index if not exists profile_snapshots_target_idx
  on public.profile_snapshots (target_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Server-backed Mail
-- ---------------------------------------------------------------------------

create table if not exists public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  audience_type text not null check (audience_type in ('user', 'all')),
  target_user_id uuid references auth.users(id) on delete cascade,
  title_hu text not null,
  title_en text not null,
  body_hu text not null,
  body_en text not null,
  attachments jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint mail_target_matches_audience check (
    (audience_type = 'all' and target_user_id is null)
    or
    (audience_type = 'user' and target_user_id is not null)
  ),
  constraint mail_attachments_is_object check (jsonb_typeof(attachments) = 'object'),
  constraint mail_expiry_after_start check (expires_at is null or expires_at > starts_at)
);

create index if not exists mail_messages_active_idx
  on public.mail_messages (active, starts_at desc);
create index if not exists mail_messages_target_idx
  on public.mail_messages (target_user_id, created_at desc);

create table if not exists public.mail_recipients (
  mail_id uuid not null references public.mail_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  read_at timestamptz,
  claimed_at timestamptz,
  primary key (mail_id, user_id)
);

create index if not exists mail_recipients_user_idx
  on public.mail_recipients (user_id, delivered_at desc);

-- ---------------------------------------------------------------------------
-- Redeem codes
-- ---------------------------------------------------------------------------

create table if not exists public.redeem_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_prefix text not null,
  rewards jsonb not null default '{}'::jsonb,
  max_redemptions integer not null default 1 check (max_redemptions > 0),
  total_redemptions integer not null default 0 check (total_redemptions >= 0),
  per_user_limit integer not null default 1 check (per_user_limit > 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint redeem_rewards_is_object check (jsonb_typeof(rewards) = 'object'),
  constraint redeem_expiry_after_start check (expires_at is null or expires_at > starts_at),
  constraint redeem_total_within_limit check (total_redemptions <= max_redemptions)
);

create index if not exists redeem_codes_created_idx
  on public.redeem_codes (created_at desc);
create index if not exists redeem_codes_active_idx
  on public.redeem_codes (active, starts_at, expires_at);

create table if not exists public.redeem_claims (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.redeem_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rewards_snapshot jsonb not null,
  claimed_at timestamptz not null default now(),
  request_id uuid not null default gen_random_uuid()
);

create index if not exists redeem_claims_code_idx
  on public.redeem_claims (code_id, claimed_at desc);
create index if not exists redeem_claims_user_idx
  on public.redeem_claims (user_id, claimed_at desc);

-- ---------------------------------------------------------------------------
-- Lock every sensitive table behind the Edge Functions' service role.
-- ---------------------------------------------------------------------------

alter table public.gm_admins enable row level security;
alter table public.gm_audit_logs enable row level security;
alter table public.profile_snapshots enable row level security;
alter table public.mail_messages enable row level security;
alter table public.mail_recipients enable row level security;
alter table public.redeem_codes enable row level security;
alter table public.redeem_claims enable row level security;

revoke all on table public.gm_admins from anon, authenticated;
revoke all on table public.gm_audit_logs from anon, authenticated;
revoke all on table public.profile_snapshots from anon, authenticated;
revoke all on table public.mail_messages from anon, authenticated;
revoke all on table public.mail_recipients from anon, authenticated;
revoke all on table public.redeem_codes from anon, authenticated;
revoke all on table public.redeem_claims from anon, authenticated;

revoke all on table public.gm_admins from service_role;
revoke all on table public.gm_audit_logs from service_role;
revoke all on table public.profile_snapshots from service_role;
revoke all on table public.mail_messages from service_role;
revoke all on table public.mail_recipients from service_role;
revoke all on table public.redeem_codes from service_role;
revoke all on table public.redeem_claims from service_role;

-- Least-privilege grants for direct Edge Function queries. Transactional writes
-- run through the SECURITY DEFINER RPC functions below.
grant select on table public.gm_admins to service_role;
grant select, insert on table public.gm_audit_logs to service_role;
grant select on table public.profile_snapshots to service_role;
grant select on table public.mail_messages to service_role;
grant select, insert, update on table public.mail_recipients to service_role;
grant select on table public.redeem_codes to service_role;
grant select on table public.redeem_claims to service_role;

-- ---------------------------------------------------------------------------
-- Shared validation / reward helper
-- ---------------------------------------------------------------------------

create or replace function public.cherrift_apply_reward(
  p_save jsonb,
  p_reward jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_save jsonb := coalesce(p_save, '{}'::jsonb);
  v_reward jsonb := coalesce(p_reward, '{}'::jsonb);
  v_current_coins bigint := 0;
  v_current_keys bigint := 0;
  v_add_coins bigint := 0;
  v_add_keys bigint := 0;
  v_skins text[] := '{}'::text[];
begin
  if jsonb_typeof(v_save) <> 'object' or jsonb_typeof(v_reward) <> 'object' then
    raise exception 'invalid_json_object' using errcode = '22023';
  end if;

  if coalesce(v_save->>'coins', '') ~ '^[0-9]+$' then
    v_current_coins := least((v_save->>'coins')::bigint, 1000000000);
  end if;
  if coalesce(v_save->>'keys', '') ~ '^[0-9]+$' then
    v_current_keys := least((v_save->>'keys')::bigint, 1000000000);
  end if;

  if v_reward ? 'coins' then
    if jsonb_typeof(v_reward->'coins') <> 'number'
       or (v_reward->>'coins') !~ '^[0-9]+$' then
      raise exception 'invalid_reward_coins' using errcode = '22023';
    end if;
    v_add_coins := least((v_reward->>'coins')::bigint, 1000000000);
  end if;

  if v_reward ? 'keys' then
    if jsonb_typeof(v_reward->'keys') <> 'number'
       or (v_reward->>'keys') !~ '^[0-9]+$' then
      raise exception 'invalid_reward_keys' using errcode = '22023';
    end if;
    v_add_keys := least((v_reward->>'keys')::bigint, 1000000);
  end if;

  v_save := jsonb_set(
    v_save,
    '{coins}',
    to_jsonb(least(v_current_coins + v_add_coins, 1000000000)),
    true
  );
  v_save := jsonb_set(
    v_save,
    '{keys}',
    to_jsonb(least(v_current_keys + v_add_keys, 1000000)),
    true
  );

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
        case
          when jsonb_typeof(v_save->'unlockedSkins') = 'array'
          then v_save->'unlockedSkins'
          else '[]'::jsonb
        end
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

-- ---------------------------------------------------------------------------
-- Transactional profile editor: permission -> snapshot -> update -> audit.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Transactional Mail creation.
-- ---------------------------------------------------------------------------

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
begin
  select * into v_admin
  from public.gm_admins
  where user_id = p_admin_user_id and active = true;

  if not found or not (
    v_admin.role = 'owner' or 'mail.send' = any(v_admin.permissions)
  ) then
    raise exception 'gm_permission_denied' using errcode = '42501';
  end if;

  if p_audience_type = 'all'
     and not (v_admin.role = 'owner' or 'mail.broadcast' = any(v_admin.permissions)) then
    raise exception 'gm_broadcast_permission_denied' using errcode = '42501';
  end if;

  if p_audience_type not in ('user', 'all')
     or (p_audience_type = 'user' and p_target_user_id is null)
     or (p_audience_type = 'all' and p_target_user_id is not null)
     or length(trim(coalesce(p_title_hu, ''))) not between 1 and 120
     or length(trim(coalesce(p_body_hu, ''))) not between 1 and 4000
     or jsonb_typeof(v_attachments) <> 'object'
     or (p_expires_at is not null and p_expires_at <= coalesce(p_starts_at, now())) then
    raise exception 'invalid_mail_request' using errcode = '22023';
  end if;

  insert into public.mail_messages (
    audience_type, target_user_id,
    title_hu, title_en, body_hu, body_en,
    attachments, starts_at, expires_at, created_by
  ) values (
    p_audience_type, p_target_user_id,
    trim(p_title_hu), coalesce(nullif(trim(p_title_en), ''), trim(p_title_hu)),
    trim(p_body_hu), coalesce(nullif(trim(p_body_en), ''), trim(p_body_hu)),
    v_attachments, coalesce(p_starts_at, now()), p_expires_at, p_admin_user_id
  ) returning id into v_mail_id;

  if p_audience_type = 'user' then
    insert into public.mail_recipients (mail_id, user_id)
    values (v_mail_id, p_target_user_id)
    on conflict do nothing;
  end if;

  insert into public.gm_audit_logs (
    admin_user_id, action, target_user_id, request_id, status, after_data, metadata
  ) values (
    p_admin_user_id,
    case when p_audience_type = 'all' then 'mail.broadcast' else 'mail.send' end,
    p_target_user_id,
    p_request_id,
    'success',
    jsonb_build_object('mail_id', v_mail_id, 'attachments', v_attachments),
    jsonb_build_object('audience_type', p_audience_type, 'title_hu', trim(p_title_hu))
  );

  return jsonb_build_object('mail_id', v_mail_id, 'created_at', now());
end;
$$;

-- ---------------------------------------------------------------------------
-- Transactional Redeem creation.
-- ---------------------------------------------------------------------------

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

  if not found or not (
    v_admin.role = 'owner' or 'redeem.create' = any(v_admin.permissions)
  ) then
    raise exception 'gm_permission_denied' using errcode = '42501';
  end if;

  if length(coalesce(p_code_hash, '')) <> 64
     or length(trim(coalesce(p_code_prefix, ''))) not between 4 and 16
     or jsonb_typeof(v_rewards) <> 'object'
     or p_max_redemptions not between 1 and 1000000
     or p_per_user_limit not between 1 and 100
     or p_per_user_limit > p_max_redemptions
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

-- ---------------------------------------------------------------------------
-- Transactional player Mail claim. Snapshot is always created first.
-- ---------------------------------------------------------------------------

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
  v_state_key text := 'gm:' || p_mail_id::text;
begin
  select * into v_mail
  from public.mail_messages
  where id = p_mail_id
  for share;

  if not found
     or not v_mail.active
     or v_mail.starts_at > now()
     or (v_mail.expires_at is not null and v_mail.expires_at <= now())
     or not (
       v_mail.audience_type = 'all'
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
  v_new_save := jsonb_set(
    v_new_save,
    '{mailbox}',
    case when jsonb_typeof(v_new_save->'mailbox') = 'object'
      then v_new_save->'mailbox' else '{}'::jsonb end,
    true
  );
  v_new_save := jsonb_set(
    v_new_save,
    '{mailbox,states}',
    case when jsonb_typeof(v_new_save#>'{mailbox,states}') = 'object'
      then v_new_save#>'{mailbox,states}' else '{}'::jsonb end,
    true
  );
  v_new_save := jsonb_set(
    v_new_save,
    array['mailbox', 'states', v_state_key],
    jsonb_build_object('read', true, 'claimed', true),
    true
  );

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
    'save_data', v_new_save,
    'reward', v_mail.attachments,
    'snapshot_id', v_snapshot_id,
    'claimed_at', now()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Transactional player Redeem claim. Snapshot is always created first.
-- ---------------------------------------------------------------------------

create or replace function public.player_redeem_code(
  p_user_id uuid,
  p_code_hash text,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
     or v_code.total_redemptions >= v_code.max_redemptions then
    raise exception 'redeem_not_available' using errcode = 'P0002';
  end if;

  select count(*)::integer into v_user_claims
  from public.redeem_claims
  where code_id = v_code.id and user_id = p_user_id;

  if v_user_claims >= v_code.per_user_limit then
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
    'claimed_at', now()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges: none of these RPCs may be called from the browser.
-- ---------------------------------------------------------------------------

revoke execute on function public.set_cherrift_updated_at() from public, anon, authenticated;
revoke execute on function public.cherrift_apply_reward(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.gm_apply_profile_patch(uuid, uuid, jsonb, text, uuid) from public, anon, authenticated;
revoke execute on function public.gm_create_mail(uuid, text, uuid, text, text, text, text, jsonb, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke execute on function public.gm_create_redeem_code(uuid, text, text, jsonb, integer, integer, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke execute on function public.player_claim_mail(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.player_redeem_code(uuid, text, uuid) from public, anon, authenticated;

grant execute on function public.set_cherrift_updated_at() to service_role;
grant execute on function public.cherrift_apply_reward(jsonb, jsonb) to service_role;
grant execute on function public.gm_apply_profile_patch(uuid, uuid, jsonb, text, uuid) to service_role;
grant execute on function public.gm_create_mail(uuid, text, uuid, text, text, text, text, jsonb, timestamptz, timestamptz, uuid) to service_role;
grant execute on function public.gm_create_redeem_code(uuid, text, text, jsonb, integer, integer, timestamptz, timestamptz, uuid) to service_role;
grant execute on function public.player_claim_mail(uuid, uuid, uuid) to service_role;
grant execute on function public.player_redeem_code(uuid, text, uuid) to service_role;

-- Auto-bootstrap only when this project currently has exactly one Auth user.
-- In a multi-user project no one is promoted automatically.
insert into public.gm_admins (
  user_id, role, permissions, active, created_by
)
select
  u.id,
  'owner',
  array[
    'mail.send', 'mail.broadcast',
    'redeem.create',
    'profile.view', 'profile.edit',
    'audit.view'
  ]::text[],
  true,
  u.id
from auth.users u
where (select count(*) from auth.users) = 1
on conflict (user_id) do update
set role = 'owner',
    active = true,
    permissions = excluded.permissions,
    updated_at = now();

-- Keep GM admin timestamps current.
drop trigger if exists set_gm_admin_updated_at on public.gm_admins;
create trigger set_gm_admin_updated_at
before update on public.gm_admins
for each row execute function public.set_cherrift_updated_at();

commit;
