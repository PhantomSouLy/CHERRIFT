-- Snapshot-backed save/GM repair. No player credentials or auth records are changed.
create or replace function public.set_cherrift_save_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $repair$
begin
  if new.save_data is not distinct from old.save_data
     and new.save_version is not distinct from old.save_version then
    new.updated_at := old.updated_at;
  else
    new.updated_at := now();
  end if;
  return new;
end;
$repair$;

CREATE OR REPLACE FUNCTION public.gm_reset_player_save(p_admin_user_id uuid, p_target_user_id uuid, p_reason text, p_request_id uuid DEFAULT gen_random_uuid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_admin public.gm_admins%rowtype;
  v_old public.game_saves%rowtype;
  v_player public.player_profiles%rowtype;
  v_profile jsonb;
  v_new jsonb;
  v_snapshot_id uuid;
  v_is_gm boolean;
  v_rights jsonb;
  v_titles jsonb;
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

  -- GM authority is a server-side role; a progression reset must preserve it.
  select exists(select 1 from public.gm_admins where user_id=p_target_user_id and active)
  into v_is_gm;
  select coalesce(entitlements,'{}'::jsonb) into v_rights
  from public.account_entitlements where user_id=p_target_user_id;
  v_rights := case when v_is_gm then coalesce(v_rights,'{}'::jsonb) else '{}'::jsonb end;
  select coalesce(jsonb_agg(value),'[]'::jsonb) into v_titles
  from jsonb_array_elements_text(coalesce(v_old.save_data->'ownedTitles','[]'::jsonb))
  where v_is_gm and value in ('gm','senior_gm','head_gm');

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
    'activeTitle',case when v_is_gm and v_titles ? (v_old.save_data#>>'{profile,activeTitle}') then v_old.save_data#>>'{profile,activeTitle}' else '' end,
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
    'ownedTitles',v_titles,'titleRewardsClaimed','[]'::jsonb,
    'profile',v_profile,
    'settings',jsonb_build_object('volume',60,'touchMode',true,'fpsLimit',60,'language','hu'),
    'energy',50,'energyState',jsonb_build_object('max',50,'lastTick',extract(epoch from now())*1000,'refills','{}'::jsonb,'drinks',jsonb_build_object('small',0,'standard',0,'large',0)),
    'bag',jsonb_build_object('materials',jsonb_build_object('gearScrap',0,'stones',jsonb_build_object('copper',0,'iron',0,'steel',0,'silver',0,'royal',0,'magical',0),'slotCores','{}'::jsonb)),
    'prebeta',jsonb_build_object('schema','prebeta-1','version','0.9.5-prebeta.2','starterCreated',true,'isStarter',true,'entitlements',v_rights,
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
  values(p_target_user_id,v_rights,now())
  on conflict(user_id) do update
  set entitlements=excluded.entitlements,updated_at=excluded.updated_at;

  insert into public.gm_audit_logs(admin_user_id,action,target_user_id,request_id,status,before_data,after_data,metadata)
  values(p_admin_user_id,'profile.full_reset',p_target_user_id,p_request_id,'success',v_old.save_data,v_new,
    jsonb_build_object('reason',trim(p_reason),'snapshot_id',v_snapshot_id));

  return jsonb_build_object('ok',true,'snapshot_id',v_snapshot_id,'save_data',v_new,'updated_at',now());
end;
$function$
;

CREATE OR REPLACE FUNCTION public.player_claim_mail(p_user_id uuid, p_mail_id uuid, p_request_id uuid DEFAULT gen_random_uuid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_mail public.mail_messages%rowtype;
  v_recipient public.mail_recipients%rowtype;
  v_save public.game_saves%rowtype;
  v_new_save jsonb;
  v_snapshot_id uuid;
  v_account_created_at timestamptz;
  v_state_key text := 'gm:' || p_mail_id::text;
begin
  select created_at into v_account_created_at
  from auth.users
  where id = p_user_id;

  select * into v_mail
  from public.mail_messages
  where id = p_mail_id
  for share;

  if not found
     or v_account_created_at is null
     or not v_mail.active
     or v_mail.starts_at > now()
     or (v_mail.expires_at is not null and v_mail.expires_at <= now())
     or not (
       v_mail.audience_type = 'all_future'
       or (v_mail.audience_type = 'existing' and v_account_created_at <= v_mail.audience_cutoff_at)
       or (v_mail.audience_type = 'user' and v_mail.target_user_id = p_user_id)
     ) then
    raise exception 'mail_not_available' using errcode = 'P0002';
  end if;

  insert into public.mail_recipients (mail_id, user_id)
  values (p_mail_id, p_user_id)
  on conflict do nothing;

  select * into v_recipient
  from public.mail_recipients
  where mail_id = p_mail_id and user_id = p_user_id
  for update;

  if v_recipient.claimed_at is not null then
    raise exception 'mail_already_claimed' using errcode = '23505';
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
    null, 'Mail reward claim ' || p_mail_id::text, p_request_id
  ) returning id into v_snapshot_id;

  v_new_save := public.cherrift_apply_reward(v_save.save_data, v_mail.attachments);
  v_new_save := jsonb_set(v_new_save, '{mailbox}',
    case when jsonb_typeof(v_new_save->'mailbox') = 'object' then v_new_save->'mailbox' else '{}'::jsonb end, true);
  v_new_save := jsonb_set(v_new_save, '{mailbox,states}',
    case when jsonb_typeof(v_new_save#>'{mailbox,states}') = 'object' then v_new_save#>'{mailbox,states}' else '{}'::jsonb end, true);
  v_new_save := jsonb_set(v_new_save, array['mailbox', 'states', v_state_key],
    jsonb_build_object('read', true, 'claimed', true), true);

  update public.game_saves
  set save_data = v_new_save, updated_at = now()
  where user_id = p_user_id;

  update public.mail_recipients
  set read_at = coalesce(read_at, now()), claimed_at = now()
  where mail_id = p_mail_id and user_id = p_user_id;

  insert into public.gm_audit_logs (
    action, target_user_id, request_id, status, before_data, after_data, metadata
  ) values (
    'player.mail.claim', p_user_id, p_request_id, 'success',
    v_save.save_data, v_new_save,
    jsonb_build_object('mail_id', p_mail_id, 'snapshot_id', v_snapshot_id)
  );

  return jsonb_build_object(
    'save_data', v_new_save, 'reward', v_mail.attachments,
    'snapshot_id', v_snapshot_id, 'claimed_at', now(), 'updated_at', now()
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.player_redeem_code(p_user_id uuid, p_code_hash text, p_request_id uuid DEFAULT gen_random_uuid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    'claimed_at', now(), 'updated_at', now()
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.gm_apply_profile_bundle(p_admin_user_id uuid, p_target_user_id uuid, p_patch jsonb DEFAULT '{}'::jsonb, p_values jsonb DEFAULT '{}'::jsonb, p_titles text[] DEFAULT NULL::text[], p_reason text DEFAULT ''::text, p_request_id uuid DEFAULT gen_random_uuid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_result jsonb;
  v_snapshots jsonb := '[]'::jsonb;
  v_save jsonb;
  v_prebeta jsonb;
begin
  if coalesce(p_values, '{}'::jsonb) <> '{}'::jsonb then
    v_result := public.gm_apply_profile_resources(p_admin_user_id, p_target_user_id, p_values, p_reason, p_request_id);
    if v_result ? 'snapshot_id' then v_snapshots := v_snapshots || jsonb_build_array(v_result->'snapshot_id'); end if;
  end if;

  if coalesce(p_patch, '{}'::jsonb) <> '{}'::jsonb then
    v_result := public.gm_apply_profile_patch(p_admin_user_id, p_target_user_id, p_patch, p_reason, p_request_id);
    if v_result ? 'snapshot_id' then v_snapshots := v_snapshots || jsonb_build_array(v_result->'snapshot_id'); end if;
  end if;

  if p_titles is not null then
    v_result := public.gm_set_gm_titles(p_admin_user_id, p_target_user_id, p_titles, p_reason, p_request_id);
    if v_result ? 'snapshot_id' then v_snapshots := v_snapshots || jsonb_build_array(v_result->'snapshot_id'); end if;
  end if;

  select save_data into v_save from public.game_saves where user_id = p_target_user_id for update;
  if v_save is null then v_save := '{}'::jsonb; end if;
  v_prebeta := coalesce(v_save->'prebeta', '{}'::jsonb) || jsonb_build_object(
    'serverEdit', jsonb_build_object(
      'at', clock_timestamp(),
      'requestId', p_request_id,
      'source', 'gm-profile-editor'
    )
  );
  v_save := jsonb_set(v_save, '{prebeta}', v_prebeta, true);
  insert into public.game_saves(user_id, save_data, save_version, updated_at)
  values(p_target_user_id, v_save, '0.9.5-prebeta.1', now())
  on conflict(user_id) do update set save_data = excluded.save_data, updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'snapshot_ids', v_snapshots,
    'server_edit', v_prebeta->'serverEdit',
    'updated_at', now(),
    'save_data', v_save
  );
end;
$function$
;

-- Retired browser-write path: current clients write only via validated player-api.
revoke insert,update,delete,truncate,references,trigger on public.player_saves from anon,authenticated;
alter function public.update_player_save_timestamp() set search_path = '';
revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
