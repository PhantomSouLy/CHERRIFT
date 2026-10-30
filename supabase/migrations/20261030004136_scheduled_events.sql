begin;
create table public.game_events (
 id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 manifest jsonb not null check (jsonb_typeof(manifest)='object'),
 position integer not null default 0,
 enabled boolean not null default false,
 repo_present boolean not null default true,
 starts_at timestamptz,
 ends_at timestamptz,
 updated_at timestamptz not null default now(),
 check (ends_at is null or starts_at is null or ends_at>starts_at),
 check (not enabled or manifest->>'category'='permanent' or ends_at is not null)
);
create table public.event_control (singleton boolean primary key default true check(singleton),revision bigint not null default 0);
insert into public.event_control(singleton) values(true);
alter table public.game_events enable row level security;
alter table public.event_control enable row level security;
revoke all on public.game_events,public.event_control from public,anon,authenticated;
grant all on public.game_events,public.event_control to service_role;

create function public.admin_events_snapshot() returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('revision',c.revision,'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.position,e.id) from public.game_events e),'[]'::jsonb)) from public.event_control c where singleton;
$$;
revoke all on function public.admin_events_snapshot() from public,anon,authenticated;
grant execute on function public.admin_events_snapshot() to service_role;

create function public.admin_events_mutate(p_actor uuid,p_revision bigint,p_operation text,p_payload jsonb)
returns bigint language plpgsql security invoker set search_path='' as $$
declare rev bigint; entry jsonb; target public.game_events; other public.game_events; old_position integer; direction integer;
begin
 if not exists(select 1 from public.gm_admins where user_id=p_actor and active and (role='owner' or 'events.manage'=any(permissions))) then raise exception 'permission_denied';end if;
 select revision into rev from public.event_control where singleton for update;
 if p_revision is null or rev<>p_revision then raise exception 'event_revision_conflict';end if;
 if p_operation='sync' then
  if jsonb_typeof(p_payload->'events')<>'array' or jsonb_array_length(p_payload->'events')>200 then raise exception 'invalid_catalog';end if;
  update public.game_events set repo_present=false;
  for entry in select value from jsonb_array_elements(p_payload->'events') loop
   insert into public.game_events(id,manifest,position) values(entry->>'id',entry,(select coalesce(max(position),0)+1 from public.game_events))
   on conflict(id) do update set manifest=excluded.manifest,repo_present=true,updated_at=now(),
    enabled=case when excluded.manifest->>'category'='limited' and game_events.ends_at is null then false else game_events.enabled end;
  end loop;
  update public.game_events set enabled=false where not repo_present;
 elsif p_operation in ('save','disable','move') then
  select * into target from public.game_events where id=p_payload->>'id' for update;
  if not found then raise exception 'event_not_found';end if;
  if p_operation='save' then
   if not target.repo_present then raise exception 'event_missing_from_repository';end if;
   update public.game_events set enabled=coalesce((p_payload->>'enabled')::boolean,false),starts_at=(p_payload->>'starts_at')::timestamptz,ends_at=(p_payload->>'ends_at')::timestamptz,updated_at=now() where id=target.id;
  elsif p_operation='disable' then update public.game_events set enabled=false,updated_at=now() where id=target.id;
  else
   direction=(p_payload->>'direction')::integer;
   if direction not in (-1,1) or direction is null then raise exception 'invalid_direction';end if;
   if direction=-1 then select * into other from public.game_events where (position,id)<(target.position,target.id) order by position desc,id desc limit 1;
   else select * into other from public.game_events where (position,id)>(target.position,target.id) order by position,id limit 1;end if;
   if other.id is not null then
    old_position=target.position;
    update public.game_events set position=other.position,updated_at=now() where id=target.id;
    update public.game_events set position=old_position,updated_at=now() where id=other.id;
   end if;
  end if;
 else raise exception 'invalid_operation';end if;
 update public.event_control set revision=revision+1 where singleton returning revision into rev;
 insert into public.gm_audit_logs(admin_user_id,action,request_id,status,metadata) values(p_actor,'admin.events.'||p_operation,gen_random_uuid(),'success',jsonb_build_object('event_id',p_payload->>'id','revision',rev));
 return rev;
end;
$$;
revoke all on function public.admin_events_mutate(uuid,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_events_mutate(uuid,bigint,text,jsonb) to service_role;
update public.admin_role_presets set permissions=permissions||array['events.view','events.manage','game.view','game.settings','notifications.view','notifications.settings'] where name='Administrator' and builtin;
commit;
