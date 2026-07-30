-- CHERRIFT Discord cloud saves
-- Run this entire file in Supabase Dashboard -> SQL Editor.

begin;

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

drop trigger if exists set_cherrift_save_updated_at on public.game_saves;
create trigger set_cherrift_save_updated_at
before update on public.game_saves
for each row
execute function public.set_cherrift_save_updated_at();

commit;
