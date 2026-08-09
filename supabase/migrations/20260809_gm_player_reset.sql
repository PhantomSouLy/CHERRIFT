-- Snapshot-backed, audited reset for contaminated/test player saves.
begin;

create or replace function public.gm_reset_player_save(
  p_admin_user_id uuid,
  p_target_user_id uuid,
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
  v_player public.player_profiles%rowtype;
  v_profile jsonb;
  v_new jsonb;
  v_snapshot_id uuid;
begin
  select * into v_admin from public.gm_admins
  where user_id = p_admin_user_id and active = true;
  if not found or not (v_admin.role = 'owner' or 'profile.edit' = any(v_admin.permissions)) then
    raise exception 'gm_permission_denied' using errcode = '42501';
  end if;
  if p_target_user_id is null or length(trim(coalesce(p_reason,''))) < 3 or length(p_reason) > 500 then
    raise exception 'invalid_reset_request' using errcode = '22023';
  end if;

  select * into v_old from public.game_saves
  where user_id = p_target_user_id for update;
  if not found then
    raise exception 'player_save_not_found' using errcode = 'P0002';
  end if;

  select * into v_player from public.player_profiles
  where user_id = p_target_user_id;
  if not found then
    raise exception 'player_profile_not_found' using errcode = 'P0002';
  end if;

  insert into public.profile_snapshots(target_user_id,save_data,save_version,created_by,reason,request_id)
  values(p_target_user_id,v_old.save_data,v_old.save_version,p_admin_user_id,'RESET: '||trim(p_reason),p_request_id)
  returning id into v_snapshot_id;

  -- Identity is rebuilt from the server profile instead of trusting the old
  -- save. This matters specifically when the reset is repairing a save that
  -- was previously contaminated with another account's local data.
  v_profile := jsonb_build_object(
    'name',v_player.display_name,
    'authProvider','discord',
    'discordUserId',p_target_user_id::text,
    'discordUsername',coalesce(v_player.discord_name,''),
    'avatarUrl',coalesce(v_player.avatar_url,''),
    'activeTitle','',
    'frameId','frame0lvl',
    'createdAt',coalesce(v_old.save_data#>'{profile,createdAt}',to_jsonb(extract(epoch from now())*1000))
  );
  v_new := jsonb_build_object(
    'coins',500,'keys',0,'bloomGems',0,'blossomGems',0,'sakuraEssence',0,'heartTokens',0,
    'chests',jsonb_build_object('common',3,'rare',0,'epic',0),
    'selectedSkin','cherry_default','unlockedSkins',jsonb_build_array('cherry_default'),
    'selectedStageId','world_1_1','unlockedStages',jsonb_build_array('world_1_1'),
    'clearedStages','{}'::jsonb,'stageStars','{}'::jsonb,'stageStats','{}'::jsonb,'firstClearClaimed','{}'::jsonb,
    'inventory','[]'::jsonb,'equipped','{}'::jsonb,
    'account',jsonb_build_object(
      'level',1,'xp',0,'totalXp',0,'skillPoints',1,'manualV052',true,
      'tree',jsonb_build_object('power',0,'vitality',0,'haste',0,'fortune',0),
      'skillTreeV082',jsonb_build_object('ranks','{}'::jsonb),'skillTreeV082Migrated',true
    ),
    'stats',jsonb_build_object('kills',0,'clears',0,'runs',0,'coinsEarned',0,'loginDays',0),
    'economy',jsonb_build_object('lifetimeCoinsEarned',0,'bestWeeklyRank',0,'activePlayers',0),
    'ownedTitles','[]'::jsonb,'titleRewardsClaimed','[]'::jsonb,
    'profile',v_profile,
    'settings',jsonb_build_object('volume',60,'touchMode',true,'fpsLimit',60,'language','hu'),
    'energy',50,'energyState',jsonb_build_object('max',50,'lastTick',extract(epoch from now())*1000,'refills','{}'::jsonb,'drinks',jsonb_build_object('small',0,'standard',0,'large',0)),
    'bag',jsonb_build_object('materials',jsonb_build_object('gearScrap',0,'stones',jsonb_build_object('copper',0,'iron',0,'steel',0,'silver',0,'royal',0,'magical',0),'slotCores','{}'::jsonb)),
    'prebeta',jsonb_build_object('schema','prebeta-1','version','0.9.5-prebeta.2','starterCreated',true,'isStarter',true,
      'serverEdit',jsonb_build_object('at',clock_timestamp(),'requestId',p_request_id,'source','gm-player-reset')),
    'security',jsonb_build_object('accountOwnerId',p_target_user_id::text,'schema',2,'initializedBy','gm-player-reset')
  );

  update public.game_saves set save_data=v_new,save_version='0.9.5-prebeta.2',updated_at=now()
  where user_id=p_target_user_id;
  update public.player_profiles
  set level=1,power=0,frame_id='frame0lvl',friend_slot_bonus=0,best_weekly_rank=null,
      last_active_at=now(),updated_at=now()
  where user_id=p_target_user_id;

  -- A full reset must also remove server-side progression that is not stored
  -- inside game_saves. Social identity/friend relationships and mail remain;
  -- ranks and progression entitlements do not.
  delete from public.weekly_power_ranking where user_id=p_target_user_id;
  insert into public.account_entitlements(user_id,entitlements,updated_at)
  values(p_target_user_id,'{}'::jsonb,now())
  on conflict(user_id) do update
  set entitlements='{}'::jsonb,updated_at=excluded.updated_at;

  insert into public.gm_audit_logs(admin_user_id,action,target_user_id,request_id,status,before_data,after_data,metadata)
  values(p_admin_user_id,'profile.full_reset',p_target_user_id,p_request_id,'success',v_old.save_data,v_new,
    jsonb_build_object('reason',trim(p_reason),'snapshot_id',v_snapshot_id));

  return jsonb_build_object('ok',true,'snapshot_id',v_snapshot_id,'save_data',v_new,'updated_at',now());
end;
$$;

revoke all on function public.gm_reset_player_save(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.gm_reset_player_save(uuid,uuid,text,uuid) to service_role;

commit;
