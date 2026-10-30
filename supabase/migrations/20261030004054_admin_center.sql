-- CHERRIFT Admin Center | additive, no existing gameplay data is rewritten.
-- Initial owner is obtained ONLY from the existing single active gm_admins owner
-- and their verified Discord OAuth identity. Never infer ownership from username.
begin;

create table if not exists public.admin_owner_lock (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  discord_id text not null unique check (discord_id ~ '^[0-9]{15,25}$'),
  created_at timestamptz not null default now()
);

do $$
declare n integer;
begin
  select count(*) into n from public.gm_admins g
  join auth.identities i on i.user_id=g.user_id and i.provider='discord'
  where g.role='owner' and g.active and i.provider_id ~ '^[0-9]{15,25}$';
  if n > 1 then
    raise exception 'Admin Center bootstrap requires EXACTLY one verified active GM owner, found %', n;
  end if;
end $$;

insert into public.admin_owner_lock (singleton,user_id,discord_id)
select true,g.user_id,i.provider_id from public.gm_admins g
join auth.identities i on i.user_id=g.user_id and i.provider='discord'
where g.role='owner' and g.active
on conflict (singleton) do nothing;

create unique index if not exists gm_single_active_owner on public.gm_admins (role)
  where role='owner' and active=true;

create table if not exists public.admin_role_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 60),
  description text not null default '' check (char_length(description)<=240),
  permissions text[] not null default '{}',
  builtin boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.admin_role_presets(name,description,permissions,builtin) values
 ('Administrator','Beállítások és kezelés, tulajdonosi biztonsági jogok nélkül',array['dashboard.view','beta.view','beta.registration','beta.draw','beta.whitelist','beta.waves','beta.settings','discord.view','discord.settings','staff.view','profile.view','profile.edit','mail.send','mail.broadcast','redeem.create','audit.view','settings.view','settings.edit','analytics.view'],true),
 ('Beta Manager','Beta jelentkezés, sorsolás, hullámok és whitelist',array['dashboard.view','beta.view','beta.registration','beta.draw','beta.whitelist','beta.waves','beta.settings','analytics.view'],true),
 ('Moderator','Játékoskezelés és beta moderáció',array['dashboard.view','beta.view','beta.registration','beta.whitelist','profile.view','audit.view'],true),
 ('Support','Csak alap információk, profilmegtekintés, támogatás',array['dashboard.view','beta.view','profile.view','mail.send'],true)
on conflict (name) do nothing;

create table if not exists public.admin_staff_invites (
  discord_id text primary key check (discord_id ~ '^[0-9]{15,25}$'),
  role text not null default 'support' check (role in ('admin','support')),
  permissions text[] not null default '{}',
  preset_id uuid references public.admin_role_presets(id) on delete set null,
  linked_user_id uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_settings (
  section text primary key check (section in ('beta','discord','game','notifications')),
  value jsonb not null default '{}'::jsonb check (jsonb_typeof(value)='object'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.admin_settings(section,value) values
 ('beta','{"registration_open":false,"max_registrations":0,"requires_guild":true,"allow_unregister":true,"draw_exclude_previous":true,"notify_winners":false,"default_wave_size":100,"reserve_count":20,"min_account_age_days":0}'::jsonb),
 ('discord','{"guild_id":"","application_id":"","registration_channel_id":"","announcements_channel_id":"","registered_role_id":"","tester_role_id":"","registration_message":"Join the CHERRIFT Closed Beta!","success_message":"Your registration has been saved.","enable_role_sync":false,"enable_dms":false}'::jsonb),
 ('game','{"access_mode":"open","welcome_message":"Welcome to CHERRIFT!","allow_guest":true,"beta_gate_ready":false}'::jsonb),
 ('notifications','{"notify_registration":false,"notify_lottery":false,"notify_activation":false,"announcement_template":"Welcome to CHERRIFT Closed Beta!"}'::jsonb)
on conflict (section) do nothing;

create table if not exists public.beta_waves (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 70),
  description text not null default '',
  capacity integer not null default 100 check (capacity between 1 and 100000),
  status text not null default 'planned' check (status in ('planned','active','closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
insert into public.beta_waves(name,description,capacity,status)
values('Wave 1','CHERRIFT Closed Beta · First Access',100,'planned')
on conflict(name) do nothing;

create table if not exists public.beta_registrations (
  discord_id text primary key check (discord_id ~ '^[0-9]{15,25}$'),
  discord_name text not null default '' check (char_length(discord_name)<=100),
  auth_user_id uuid references auth.users(id) on delete set null,
  source text not null default 'discord' check (source in ('discord','admin','website')),
  status text not null default 'pending' check (status in ('pending','selected','reserve','activated','revoked','rejected')),
  wave_id uuid references public.beta_waves(id) on delete set null,
  registered_at timestamptz not null default now(),
  selected_at timestamptz,
  activated_at timestamptz,
  notes text not null default '' check (char_length(notes)<=600),
  updated_at timestamptz not null default now()
);
create index if not exists beta_registration_status_time on public.beta_registrations(status,registered_at desc);
create index if not exists beta_registration_wave on public.beta_registrations(wave_id,status);
create index if not exists beta_registration_user on public.beta_registrations(auth_user_id) where auth_user_id is not null;

create table if not exists public.beta_draws (
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references public.beta_waves(id) on delete restrict,
  winner_count integer not null check (winner_count>=0),
  reserve_count integer not null check (reserve_count>=0),
  winners jsonb not null default '[]'::jsonb,
  reserves jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  notes text not null default ''
);
create index if not exists beta_draws_time on public.beta_draws(created_at desc);

-- All sensitive tables are completely private. Only trusted Edge Functions use service_role.
do $$
declare n text;
begin
 foreach n in array array['admin_owner_lock','admin_role_presets','admin_staff_invites','admin_settings','beta_waves','beta_registrations','beta_draws'] loop
   execute format('alter table public.%I enable row level security',n);
   execute format('revoke all on table public.%I from anon, authenticated',n);
   execute format('grant select, insert, update, delete on table public.%I to service_role',n);
 end loop;
end $$;

-- Atomic finalization: uses a transaction-scoped lock and validates every chosen ID.
-- Grant execute ONLY to service_role. Server is also responsible for action auth.
create or replace function public.admin_finalize_beta_draw(
  p_actor uuid, p_wave_id uuid, p_winners text[], p_reserves text[], p_notes text default ''
) returns uuid language plpgsql security invoker set search_path=public as $$
declare ids text[]; n integer; eligible integer; draw_id uuid;
begin
 perform pg_advisory_xact_lock(891772193);
 if not exists (select 1 from public.gm_admins where user_id=p_actor and active and (role='owner' or 'beta.draw'=any(permissions))) then
   raise exception 'permission_denied';
 end if;
 if not exists (select 1 from public.beta_waves where id=p_wave_id and status in ('planned','active')) then
   raise exception 'wave_not_available';
 end if;
 ids:=coalesce(p_winners,'{}'::text[]) || coalesce(p_reserves,'{}'::text[]);
 n:=coalesce(array_length(ids,1),0);
 if n=0 or n>10000 or (select count(distinct x) from unnest(ids) x)<>n then
   raise exception 'invalid_or_duplicate_draw_ids';
 end if;
 if (select count(*) from public.beta_registrations where wave_id=p_wave_id and status in ('selected','activated')) + coalesce(array_length(p_winners,1),0) > (select capacity from public.beta_waves where id=p_wave_id) then
   raise exception 'wave_capacity_exceeded';
 end if;
 select count(*) into eligible from public.beta_registrations where discord_id=any(ids) and status='pending';
 if eligible<>n then raise exception 'candidates_no_longer_eligible'; end if;
 update public.beta_registrations set status='selected',wave_id=p_wave_id,selected_at=now(),updated_at=now()
 where discord_id=any(p_winners) and status='pending';
 update public.beta_registrations set status='reserve',wave_id=p_wave_id,selected_at=now(),updated_at=now()
 where discord_id=any(p_reserves) and status='pending';
 insert into public.beta_draws(wave_id,winner_count,reserve_count,winners,reserves,created_by,notes)
 values(p_wave_id,coalesce(array_length(p_winners,1),0),coalesce(array_length(p_reserves,1),0),to_jsonb(coalesce(p_winners,'{}'::text[])),to_jsonb(coalesce(p_reserves,'{}'::text[])),p_actor,left(p_notes,500)) returning id into draw_id;
 return draw_id;
end $$;
revoke all on function public.admin_finalize_beta_draw(uuid,uuid,text[],text[],text) from public,anon,authenticated;
grant execute on function public.admin_finalize_beta_draw(uuid,uuid,text[],text[],text) to service_role;

-- Strict, race-free capacity limit for verified Discord registration interactions.
create or replace function public.admin_discord_register(
 p_discord_id text, p_discord_name text, p_limit integer
) returns text language plpgsql security invoker set search_path=public as $$
begin
 perform pg_advisory_xact_lock(891772194);
 if p_discord_id !~ '^[0-9]{15,25}$' then raise exception 'invalid_discord_id'; end if;
 if exists (select 1 from public.beta_registrations where discord_id=p_discord_id) then return 'already'; end if;
 if coalesce(p_limit,0)>0 and (select count(*) from public.beta_registrations)>=p_limit then return 'full'; end if;
 insert into public.beta_registrations(discord_id,discord_name,source,status)
 values(p_discord_id,left(coalesce(p_discord_name,''),100),'discord','pending');
 return 'registered';
end $$;
revoke all on function public.admin_discord_register(text,text,integer) from public,anon,authenticated;
grant execute on function public.admin_discord_register(text,text,integer) to service_role;


-- Serialize invitation changes with legacy-GM grant synchronization. A stale
-- request cannot restore grants after the Owner revokes them.
create function public.admin_sync_staff(p_user_id uuid,p_discord_id text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare invite public.admin_staff_invites; owner_id uuid;
begin
 perform pg_advisory_xact_lock(891772195);
 select l.user_id into owner_id from public.admin_owner_lock l join public.gm_admins g on g.user_id=l.user_id where g.active and g.role='owner';
 if owner_id is null then raise exception 'owner_inactive';end if;
 -- Identity has already been verified by the Edge Function with auth.getUser().
 -- This RPC is executable only by service_role, never by browser roles.
 select * into invite from public.admin_staff_invites where discord_id=p_discord_id and active;
 if not found then raise exception 'not_an_active_admin';end if;
 if exists(select 1 from public.gm_admins where user_id=p_user_id and role='owner') then raise exception 'cannot_modify_owner';end if;
 update public.admin_staff_invites set linked_user_id=p_user_id where discord_id=p_discord_id;
 insert into public.gm_admins(user_id,role,permissions,active,created_by,updated_at)
 values(p_user_id,invite.role,invite.permissions,true,owner_id,now())
 on conflict(user_id) do update set role=excluded.role,permissions=excluded.permissions,active=true,updated_at=now();
 return jsonb_build_object('role',invite.role,'permissions',invite.permissions);
end;
$$;
create function public.admin_save_staff(p_actor uuid,p_discord_id text,p_role text,p_permissions text[],p_preset uuid,p_active boolean) returns void
language plpgsql security invoker set search_path='' as $$
declare target_id uuid;
begin
 perform pg_advisory_xact_lock(891772195);
 if not exists(select 1 from public.admin_owner_lock l join public.gm_admins g on g.user_id=l.user_id where l.user_id=p_actor and g.active and g.role='owner') then raise exception 'owner_only';end if;
 if exists(select 1 from public.admin_owner_lock where discord_id=p_discord_id) then raise exception 'cannot_modify_owner';end if;
 select linked_user_id into target_id from public.admin_staff_invites where discord_id=p_discord_id;
 insert into public.admin_staff_invites(discord_id,role,permissions,preset_id,active,created_by,updated_at)
 values(p_discord_id,p_role,p_permissions,p_preset,p_active,p_actor,now())
 on conflict(discord_id) do update set role=excluded.role,permissions=excluded.permissions,preset_id=excluded.preset_id,active=excluded.active,updated_at=now();
 if target_id is not null then update public.gm_admins set role=p_role,permissions=p_permissions,active=p_active,updated_at=now() where user_id=target_id and role<>'owner';end if;
 insert into public.gm_audit_logs(admin_user_id,action,request_id,status,metadata) values(p_actor,'admin.staff.save',gen_random_uuid(),'success',jsonb_build_object('discord_id',p_discord_id,'active',p_active));
end;
$$;
revoke all on function public.admin_sync_staff(uuid,text),public.admin_save_staff(uuid,text,text,text[],uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_sync_staff(uuid,text),public.admin_save_staff(uuid,text,text,text[],uuid,boolean) to service_role;

commit;
