-- CHERRIFT GM Tool Pack v1.1 – dynamic economy, tiered keys/chests and custom redeem codes
-- Safe to run more than once. Existing saves, GM rows, mail and redeem history are preserved.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Dynamic reward catalog. New currencies/items can be added here without
-- rewriting the GM frontend.
-- ---------------------------------------------------------------------------

create table if not exists public.reward_catalog (
  resource_id text primary key,
  category text not null check (category in ('currency','key','chest','material','bag_item')),
  label_hu text not null,
  label_en text not null,
  save_path text[] not null,
  max_amount bigint not null default 1000000 check (max_amount > 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_catalog_path_not_empty check (cardinality(save_path) between 1 and 8),
  constraint reward_catalog_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists reward_catalog_active_order_idx
  on public.reward_catalog (active, category, sort_order, resource_id);

alter table public.reward_catalog enable row level security;
revoke all on table public.reward_catalog from anon, authenticated;
revoke all on table public.reward_catalog from service_role;
grant select on table public.reward_catalog to service_role;

insert into public.reward_catalog (
  resource_id, category, label_hu, label_en, save_path, max_amount, active, sort_order, metadata
) values
  ('currency.coins',          'currency', 'Coin',                    'Coins',                   array['coins'],                              1000000000, true, 10, '{"icon":"🪙"}'),
  ('currency.blossom_gems',   'currency', 'Blossom Gem',             'Blossom Gems',            array['blossomGems'],                        1000000000, true, 20, '{"icon":"💎"}'),
  ('currency.sakura_essence', 'currency', 'Sakura Essence',          'Sakura Essence',           array['sakuraEssence'],                      1000000000, true, 30, '{"icon":"🌸"}'),

  ('key.common',              'key',      'Common Chest Key',        'Common Chest Key',         array['keys'],                               1000000,    true, 100, '{"icon":"🗝️","tier":"common"}'),
  ('key.rare',                'key',      'Rare Chest Key',          'Rare Chest Key',           array['resourceWallet','keys','rare'],       1000000,    true, 110, '{"icon":"🔷","tier":"rare"}'),
  ('key.epic',                'key',      'Epic Chest Key',          'Epic Chest Key',           array['resourceWallet','keys','epic'],       1000000,    true, 120, '{"icon":"🔮","tier":"epic"}'),
  ('key.legendary',           'key',      'Legendary Chest Key',     'Legendary Chest Key',      array['resourceWallet','keys','legendary'],  1000000,    true, 130, '{"icon":"🌟","tier":"legendary"}'),

  ('chest.common',            'chest',    'Common Chest',            'Common Chest',             array['chests','common'],                    1000000,    true, 200, '{"icon":"📦","tier":"common"}'),
  ('chest.rare',              'chest',    'Rare Chest',              'Rare Chest',               array['chests','rare'],                      1000000,    true, 210, '{"icon":"🧰","tier":"rare"}'),
  ('chest.epic',              'chest',    'Epic Chest',              'Epic Chest',               array['chests','epic'],                      1000000,    true, 220, '{"icon":"🎁","tier":"epic"}'),
  ('chest.legendary',         'chest',    'Legendary Chest',         'Legendary Chest',          array['chests','legendary'],                 1000000,    true, 230, '{"icon":"🏆","tier":"legendary"}'),

  ('material.copper',         'material', 'Copper',                  'Copper',                   array['arsenal','materials','copper'],       1000000,    true, 300, '{"icon":"🟤"}'),
  ('material.iron',           'material', 'Iron',                    'Iron',                     array['arsenal','materials','iron'],         1000000,    true, 310, '{"icon":"⚙️"}'),
  ('material.steel',          'material', 'Steel',                   'Steel',                    array['arsenal','materials','steel'],        1000000,    true, 320, '{"icon":"🔩"}'),
  ('material.silver',         'material', 'Silver',                  'Silver',                   array['arsenal','materials','silver'],       1000000,    true, 330, '{"icon":"⚪"}'),
  ('material.royal',          'material', 'Royal Material',          'Royal Material',           array['arsenal','materials','royal'],        1000000,    true, 340, '{"icon":"👑"}'),
  ('material.magical',        'material', 'Magical Material',        'Magical Material',         array['arsenal','materials','magical'],      1000000,    true, 350, '{"icon":"✨"}'),

  ('bag.coin_cookie',         'bag_item', 'Coin Cookie',             'Coin Cookie',              array['bag','items','coin_cookie'],          1000000,    true, 400, '{"icon":"🍪"}'),
  ('bag.lucky_sakura_tea',    'bag_item', 'Lucky Sakura Tea',        'Lucky Sakura Tea',         array['bag','items','lucky_sakura_tea'],     1000000,    true, 410, '{"icon":"🍵"}'),
  ('bag.treasure_bento',      'bag_item', 'Treasure Bento',          'Treasure Bento',           array['bag','items','treasure_bento'],       1000000,    true, 420, '{"icon":"🍱"}'),
  ('bag.warrior_steak',       'bag_item', 'Warrior Steak',           'Warrior Steak',            array['bag','items','warrior_steak'],        1000000,    true, 430, '{"icon":"🥩"}'),
  ('bag.spicy_noodles',       'bag_item', 'Spicy Noodles',           'Spicy Noodles',            array['bag','items','spicy_noodles'],        1000000,    true, 440, '{"icon":"🍜"}'),
  ('bag.cherry_cake',         'bag_item', 'Cherry Cake',             'Cherry Cake',              array['bag','items','cherry_cake'],          1000000,    true, 450, '{"icon":"🍰"}'),
  ('bag.carrot_soup',         'bag_item', 'Bunny Carrot Soup',       'Bunny Carrot Soup',        array['bag','items','carrot_soup'],          1000000,    true, 460, '{"icon":"🥕"}'),
  ('bag.healing_mochi',       'bag_item', 'Healing Mochi',           'Healing Mochi',            array['bag','items','healing_mochi'],        1000000,    true, 470, '{"icon":"🍡"}'),
  ('bag.magic_macaron',       'bag_item', 'Magic Macaron',           'Magic Macaron',            array['bag','items','magic_macaron'],        1000000,    true, 480, '{"icon":"🧁"}'),
  ('bag.golden_dumpling',     'bag_item', 'Golden Dumpling',         'Golden Dumpling',          array['bag','items','golden_dumpling'],      1000000,    true, 490, '{"icon":"🥟"}')
on conflict (resource_id) do update
set category = excluded.category,
    label_hu = excluded.label_hu,
    label_en = excluded.label_en,
    save_path = excluded.save_path,
    max_amount = excluded.max_amount,
    active = excluded.active,
    sort_order = excluded.sort_order,
    metadata = excluded.metadata,
    updated_at = now();

-- ---------------------------------------------------------------------------
-- 0 means unlimited for global and per-player redeem limits.
-- ---------------------------------------------------------------------------

alter table public.redeem_codes drop constraint if exists redeem_codes_max_redemptions_check;
alter table public.redeem_codes drop constraint if exists redeem_codes_per_user_limit_check;
alter table public.redeem_codes drop constraint if exists redeem_total_within_limit;

alter table public.redeem_codes
  add constraint redeem_codes_max_redemptions_check check (max_redemptions >= 0),
  add constraint redeem_codes_per_user_limit_check check (per_user_limit >= 0),
  add constraint redeem_total_within_limit check (max_redemptions = 0 or total_redemptions <= max_redemptions);

-- ---------------------------------------------------------------------------
-- JSON helpers. These create missing parent objects safely.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Dynamic reward application with v1 backward compatibility.
-- Canonical shape: {"resources":{"currency.coins":10},"skins":["id"]}
-- ---------------------------------------------------------------------------

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
  v_save jsonb := coalesce(p_save, '{}'::jsonb);
  v_reward jsonb := coalesce(p_reward, '{}'::jsonb);
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

  -- v1 compatibility
  if v_reward ? 'coins' then
    v_resources := v_resources || jsonb_build_object('currency.coins', v_reward->'coins');
  end if;
  if v_reward ? 'keys' then
    v_resources := v_resources || jsonb_build_object('key.common', v_reward->'keys');
  end if;

  for v_resource in select key, value from jsonb_each(v_resources) loop
    select * into v_catalog
    from public.reward_catalog
    where resource_id = v_resource.key and active = true;

    if not found
       or jsonb_typeof(v_resource.value) <> 'number'
       or v_resource.value::text !~ '^[0-9]+$' then
      raise exception 'invalid_reward_resource:%', v_resource.key using errcode = '22023';
    end if;

    v_amount := v_resource.value::text::bigint;
    if v_amount < 1 or v_amount > v_catalog.max_amount then
      raise exception 'invalid_reward_amount:%', v_resource.key using errcode = '22023';
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

-- ---------------------------------------------------------------------------
-- Exact resource editor: permission -> snapshot -> set values -> audit.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Custom redeem creation. The raw code is never stored, only its SHA-256 hash.
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
    'claimed_at', now()
  );
end;
$$;

-- Existing Mail claim already calls cherrift_apply_reward, so it automatically
-- gains all new resource types after this replacement.

revoke execute on function public.cherrift_jsonb_set_integer(jsonb, text[], bigint, bigint) from public, anon, authenticated;
revoke execute on function public.cherrift_jsonb_add_integer(jsonb, text[], bigint, bigint) from public, anon, authenticated;
revoke execute on function public.cherrift_apply_reward(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.gm_apply_profile_resources(uuid, uuid, jsonb, text, uuid) from public, anon, authenticated;
revoke execute on function public.gm_create_redeem_code(uuid, text, text, jsonb, integer, integer, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke execute on function public.player_redeem_code(uuid, text, uuid) from public, anon, authenticated;

grant execute on function public.cherrift_jsonb_set_integer(jsonb, text[], bigint, bigint) to service_role;
grant execute on function public.cherrift_jsonb_add_integer(jsonb, text[], bigint, bigint) to service_role;
grant execute on function public.cherrift_apply_reward(jsonb, jsonb) to service_role;
grant execute on function public.gm_apply_profile_resources(uuid, uuid, jsonb, text, uuid) to service_role;
grant execute on function public.gm_create_redeem_code(uuid, text, text, jsonb, integer, integer, timestamptz, timestamptz, uuid) to service_role;
grant execute on function public.player_redeem_code(uuid, text, uuid) to service_role;

commit;
