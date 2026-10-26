begin;

create or replace function public.gm_apply_profile_bundle(
  p_admin_user_id uuid,
  p_target_user_id uuid,
  p_patch jsonb default '{}'::jsonb,
  p_values jsonb default '{}'::jsonb,
  p_titles text[] default null,
  p_reason text default '',
  p_request_id uuid default gen_random_uuid()
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
    'save_data', v_save
  );
end;
$$;

revoke all on function public.gm_apply_profile_bundle(uuid,uuid,jsonb,jsonb,text[],text,uuid) from public, anon, authenticated;
grant execute on function public.gm_apply_profile_bundle(uuid,uuid,jsonb,jsonb,text[],text,uuid) to service_role;

commit;
