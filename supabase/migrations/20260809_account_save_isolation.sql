-- CHERRIFT account-save isolation hardening.
-- New saves and all client progression writes now go through player-api,
-- which authenticates the JWT and binds the payload to auth.uid().
begin;

revoke all on table public.game_saves from anon, authenticated;
grant select on table public.game_saves to authenticated;
grant all on table public.game_saves to service_role;

-- Remove every pre-existing policy, including policies created by old test
-- patches under a different name. Only the own-row SELECT policy below is
-- intentionally restored. Browser clients cannot INSERT/UPDATE/DELETE saves.
do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'game_saves'
  loop
    execute format('drop policy if exists %I on public.game_saves', v_policy.policyname);
  end loop;
end
$$;

-- Keep own-row read access for diagnostics/recovery. Mutation remains
-- service-role only and is performed by the authenticated Edge Function.
create policy "Players can read their own CHERRIFT save"
on public.game_saves
for select
to authenticated
using (auth.uid() = user_id);

commit;
