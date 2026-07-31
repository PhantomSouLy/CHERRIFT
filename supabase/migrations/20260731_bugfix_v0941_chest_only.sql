-- CHERRIFT v0.9.4.1 BUGFIX
-- Chest-only Gacha migration: removes visible keys, hides Legendary Chest,
-- preserves all existing player balances and keeps legacy Mail/Redeem rewards claimable.
-- Safe to run more than once.

begin;

-- Keys and Legendary stay in the database for backwards compatibility, but are
-- no longer selectable in Mail, Redeem or Profile Editor.
update public.reward_catalog
set active = false,
    updated_at = now()
where resource_id like 'key.%'
   or resource_id = 'chest.legendary';

update public.reward_catalog
set active = true,
    updated_at = now()
where resource_id in ('chest.common', 'chest.rare', 'chest.epic');

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

-- Migrate every existing official save exactly once.
update public.game_saves
set save_data = public.cherrift_migrate_chest_only(save_data),
    updated_at = now()
where coalesce(save_data #>> '{economy,chestOnlyMigrationV1}', 'false') <> 'true';

-- Normalize old reward payloads so GM history and future claims also use chests.
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

update public.mail_messages
set attachments = public.cherrift_reward_chest_only(attachments)
where attachments is not null;

update public.redeem_codes
set rewards = public.cherrift_reward_chest_only(rewards)
where rewards is not null;

-- Canonical reward application. Legacy key rewards are converted to chests;
-- hidden Legendary balances remain preserved but cannot be selected in GM UI.
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

revoke all on function public.cherrift_migrate_chest_only(jsonb) from public, anon, authenticated;
revoke all on function public.cherrift_reward_chest_only(jsonb) from public, anon, authenticated;
revoke all on function public.cherrift_apply_reward(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.cherrift_apply_reward(jsonb, jsonb) to service_role;

commit;
