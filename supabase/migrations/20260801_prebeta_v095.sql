-- CHERRIFT v0.9.5 pre-beta: owner snapshot, public profiles, friends and weekly Power ranking.
-- Safe to run more than once in Supabase SQL Editor.
begin;

create table if not exists public.prebeta_save_snapshots (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  save_data jsonb not null,
  save_version text,
  reason text not null default 'v0.9.5-prebeta.1',
  created_at timestamptz not null default now()
);

insert into public.prebeta_save_snapshots (user_id,save_data,save_version)
select user_id,save_data,save_version from public.game_saves gs
where not exists (
  select 1 from public.prebeta_save_snapshots snapshot
  where snapshot.user_id=gs.user_id and snapshot.reason='v0.9.5-prebeta.1'
);

create table if not exists public.account_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  entitlements jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_entitlements_object check (jsonb_typeof(entitlements)='object')
);

-- At migration time the project has one tester account. Preserve every existing
-- save as the owner account; accounts registered later receive normal progression.
insert into public.account_entitlements (user_id,entitlements)
select user_id,'{"owner":true,"allContent":true,"training":true,"allFrames":true,"beta":true,"preRegistration":true}'::jsonb
from public.game_saves
on conflict (user_id) do nothing;

create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_code text not null unique,
  display_name text not null default 'Cherry Player',
  discord_name text,
  avatar_url text,
  frame_id text not null default 'frame0lvl',
  level integer not null default 1 check (level between 1 and 1000),
  power integer not null default 0 check (power between 0 and 100000000),
  friend_slot_bonus integer not null default 0 check (friend_slot_bonus between 0 and 100),
  best_weekly_rank integer,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (sender_id,receiver_id),
  constraint friend_request_not_self check (sender_id<>receiver_id)
);

create table if not exists public.friendships (
  user_low uuid not null references auth.users(id) on delete cascade,
  user_high uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low,user_high),
  constraint friendship_order check (user_low<user_high)
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id,blocked_id),
  constraint block_not_self check (blocker_id<>blocked_id)
);

create table if not exists public.weekly_power_ranking (
  week_start date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  power integer not null check (power between 0 and 100000000),
  level integer not null check (level between 1 and 1000),
  submitted_at timestamptz not null default now(),
  primary key (week_start,user_id)
);

create index if not exists player_profiles_name_idx on public.player_profiles using gin (to_tsvector('simple',display_name));
create index if not exists friend_requests_receiver_idx on public.friend_requests(receiver_id,status);
create index if not exists friendships_high_idx on public.friendships(user_high);
create index if not exists weekly_power_rank_idx on public.weekly_power_ranking(week_start,power desc,submitted_at asc);

alter table public.prebeta_save_snapshots enable row level security;
alter table public.account_entitlements enable row level security;
alter table public.player_profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.user_blocks enable row level security;
alter table public.weekly_power_ranking enable row level security;

revoke all on public.prebeta_save_snapshots,public.account_entitlements,public.player_profiles,public.friend_requests,public.friendships,public.user_blocks,public.weekly_power_ranking from anon,authenticated;
grant all on public.prebeta_save_snapshots,public.account_entitlements,public.player_profiles,public.friend_requests,public.friendships,public.user_blocks,public.weekly_power_ranking to service_role;

commit;
