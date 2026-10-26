-- CHERRIFT auth/runtime guard
-- Safe and idempotent. This migration does not delete or rewrite save data.
-- It guarantees that browsers may read only their own save, while every save
-- mutation remains behind the JWT-validating player-api Edge Function.

begin;

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

commit;
