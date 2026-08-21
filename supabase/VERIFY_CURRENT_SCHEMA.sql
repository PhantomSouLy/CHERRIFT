-- CHERRIFT Supabase runtime audit (read-only for persistent project data).
-- Run in Dashboard -> SQL Editor and inspect the final result table.
-- PASS is expected everywhere. This script only creates a session-local temp
-- table; it does not expose player data, tokens, Discord secrets or save JSON.

drop table if exists pg_temp.cherrift_runtime_audit;
create temporary table cherrift_runtime_audit (
  area text not null,
  check_name text not null,
  status text not null,
  detail text not null
);

insert into cherrift_runtime_audit(area, check_name, status, detail)
select
  'table',
  expected.name,
  case when to_regclass('public.' || expected.name) is not null then 'PASS' else 'FAIL' end,
  case when to_regclass('public.' || expected.name) is not null then 'present' else 'missing' end
from (values
  ('game_saves'),
  ('player_profiles'),
  ('account_entitlements'),
  ('friend_requests'),
  ('friendships'),
  ('user_blocks'),
  ('weekly_power_ranking'),
  ('reward_catalog'),
  ('mail_messages'),
  ('mail_recipients'),
  ('redeem_codes'),
  ('redeem_claims'),
  ('gm_admins'),
  ('gm_audit_logs'),
  ('profile_snapshots')
) as expected(name);

insert into cherrift_runtime_audit(area, check_name, status, detail)
select
  'column',
  expected.table_name || '.' || expected.column_name,
  case when columns.column_name is not null then 'PASS' else 'FAIL' end,
  case when columns.column_name is not null then columns.data_type else 'missing' end
from (values
  ('game_saves','user_id'), ('game_saves','save_data'),
  ('game_saves','save_version'), ('game_saves','updated_at'),
  ('player_profiles','discord_name'), ('player_profiles','friend_slot_bonus'),
  ('player_profiles','best_weekly_rank'),
  ('mail_messages','audience_cutoff_at')
) as expected(table_name,column_name)
left join information_schema.columns columns
  on columns.table_schema = 'public'
 and columns.table_name = expected.table_name
 and columns.column_name = expected.column_name;

insert into cherrift_runtime_audit(area, check_name, status, detail)
select
  'function',
  expected.signature,
  case when to_regprocedure('public.' || expected.signature) is not null then 'PASS' else 'FAIL' end,
  case when to_regprocedure('public.' || expected.signature) is not null then 'present' else 'missing' end
from (values
  ('player_claim_mail(uuid,uuid,uuid)'),
  ('player_redeem_code(uuid,text,uuid)'),
  ('gm_apply_profile_bundle(uuid,uuid,jsonb,jsonb,text[],text,uuid)'),
  ('gm_reset_player_save(uuid,uuid,text,uuid)'),
  ('set_cherrift_save_updated_at()')
) as expected(signature);

do $$
declare
  has_table boolean := to_regclass('public.game_saves') is not null;
  rls_enabled boolean := false;
  browser_write boolean := false;
  own_select_count integer := 0;
  write_policy_count integer := 0;
  orphan_owner_count bigint := 0;
begin
  if has_table then
    select class.relrowsecurity into rls_enabled
    from pg_class class
    join pg_namespace namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public' and class.relname = 'game_saves';

    browser_write :=
      has_table_privilege('anon', 'public.game_saves', 'INSERT,UPDATE,DELETE') or
      has_table_privilege('authenticated', 'public.game_saves', 'INSERT,UPDATE,DELETE');

    select count(*) into own_select_count
    from pg_policies
    where schemaname = 'public'
      and tablename = 'game_saves'
      and cmd = 'SELECT'
      and ('authenticated' = any(roles));

    select count(*) into write_policy_count
    from pg_policies
    where schemaname = 'public'
      and tablename = 'game_saves'
      and cmd in ('ALL','INSERT','UPDATE','DELETE');
  end if;

  insert into cherrift_runtime_audit values
    ('security','game_saves RLS',case when has_table and rls_enabled then 'PASS' else 'FAIL' end,
      case when has_table then 'enabled=' || rls_enabled::text else 'table missing' end),
    ('security','browser cannot mutate game_saves',case when has_table and not browser_write then 'PASS' else 'FAIL' end,
      case when has_table then 'unsafe privilege=' || browser_write::text else 'table missing' end),
    ('security','authenticated own-save SELECT policy',case when own_select_count = 1 then 'PASS' else 'FAIL' end,
      'matching policies=' || own_select_count::text),
    ('security','no game_saves write policy',case when write_policy_count = 0 then 'PASS' else 'FAIL' end,
      'write policies=' || write_policy_count::text);

  if to_regclass('public.account_entitlements') is not null
     and to_regclass('public.gm_admins') is not null then
    execute $query$
      select count(*)
      from public.account_entitlements entitlements
      where entitlements.entitlements ->> 'owner' = 'true'
        and not exists (
          select 1 from public.gm_admins admins
          where admins.user_id = entitlements.user_id
            and admins.role = 'owner'
            and admins.active = true
        )
    $query$ into orphan_owner_count;

    insert into cherrift_runtime_audit values (
      'security',
      'owner entitlement matches active GM owner',
      case when orphan_owner_count = 0 then 'PASS' else 'REVIEW' end,
      'owner entitlements without active GM owner=' || orphan_owner_count::text
    );
  else
    insert into cherrift_runtime_audit values (
      'security','owner entitlement matches active GM owner','FAIL','required table missing'
    );
  end if;
end
$$;

select area, check_name, status, detail
from cherrift_runtime_audit
order by
  case status when 'FAIL' then 1 when 'REVIEW' then 2 else 3 end,
  area,
  check_name;
