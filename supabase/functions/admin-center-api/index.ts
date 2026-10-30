import { validateCatalog } from '../_shared/events.mjs';
import { createClient } from 'npm:@supabase/supabase-js@2.57.0';

const URL = Deno.env.get('SUPABASE_URL') || '';
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const ORIGINS = new Set(['https://phantomsouly.github.io','http://localhost:8000','http://127.0.0.1:8000','http://localhost:5500','http://127.0.0.1:5500']);
const OWNER_ONLY = new Set(['staff.save','staff.revoke','presets.save','presets.delete']);
const PERMISSIONS = [
 'dashboard.view','beta.view','beta.registration','beta.draw','beta.whitelist','beta.waves','beta.settings',
 'discord.view','discord.settings','staff.view','profile.view','profile.edit','mail.send','mail.broadcast',
 'redeem.create','audit.view','settings.view','settings.edit','analytics.view','game.view','game.settings',
 'notifications.view','notifications.settings','events.view','events.manage'
];
const DISCORD_ID = /^[0-9]{15,25}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validPermissions = (v: unknown) => [...new Set(Array.isArray(v) ? v.filter(x => typeof x === 'string' && PERMISSIONS.includes(x)) : [])];
const str = (v: unknown, n = 100) => typeof v === 'string' ? v.trim().slice(0,n) : '';
const bool = (v: unknown) => v === true;
const snow = (v:unknown) => { const id=str(v,25);if(id&&!DISCORD_ID.test(id))throw err('invalid_discord_setting_id');return id; };
const int = (v: unknown, min:number, max:number) => Number.isSafeInteger(Number(v)) ? Math.max(min,Math.min(max,Number(v))) : min;
const err = (message:string, status=400) => Object.assign(new Error(message), {status});
const cors = (req: Request) => {
 const origin=req.headers.get('origin')||'';
 return { 'Access-Control-Allow-Origin': ORIGINS.has(origin) ? origin : 'https://phantomsouly.github.io', 'Vary':'Origin', 'Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type', 'Access-Control-Allow-Methods':'POST,OPTIONS', 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store' };
};
const send = (req:Request,value:unknown,status=200) => new Response(JSON.stringify(value),{status,headers:cors(req)});
function check(error:any) { if(error){console.error('database_error',error.message);throw err('database_error',500);} }
async function verifiedUser(req:Request) {
 const token = (req.headers.get('authorization') || '').match(/^Bearer (.+)$/i)?.[1];
 if(!token) throw err('authentication_required',401);
 const {data,error} = await db.auth.getUser(token); if(error||!data.user) throw err('authentication_required',401);
 const user=data.user;
 // Never authorize with raw_user_meta_data or display names.
 const discord = user.identities?.find((i:any)=>i.provider==='discord');
 const discordId = discord?.identity_data?.provider_id || discord?.identity_data?.sub || discord?.id;
 if(typeof discordId!=='string' || !DISCORD_ID.test(discordId)) throw err('verified_discord_identity_required',403);
 return { user, discordId };
}
async function authorization(user:any,discordId:string){
 const {data:owner,error:oe}=await db.from('admin_owner_lock').select('user_id,discord_id').eq('singleton',true).single(); check(oe);
 if(owner?.user_id===user.id && owner.discord_id===discordId){
  const {data:g,error:ge}=await db.from('gm_admins').select('role,active').eq('user_id',user.id).maybeSingle();check(ge);
  if(!g?.active || g.role!=='owner') throw err('owner_inactive',403);
  return {owner:true,role:'owner',permissions:PERMISSIONS,discordId,userId:user.id};
 }
 const {data:staff,error}=await db.rpc('admin_sync_staff',{p_user_id:user.id,p_discord_id:discordId});
 if(error){if(['not_an_active_admin','owner_inactive','verified_discord_identity_required'].includes(error.message))throw err(error.message,403);check(error);}
 return {owner:false,role:staff.role,permissions:validPermissions(staff.permissions),discordId,userId:user.id};
}
function requirePermission(admin:any,permission:string){if(!admin.owner && !admin.permissions.includes(permission))throw err('permission_denied:'+permission,403);}
function requireOwner(admin:any){if(!admin.owner)throw err('owner_only',403);}
async function log(admin:any,action:string,metadata:Record<string,unknown>={}){
 const {error}=await db.from('gm_audit_logs').insert({admin_user_id:admin.userId,action:'admin.'+action,request_id:crypto.randomUUID(),status:'success',metadata});if(error)console.error('admin audit write failure',error.message);
}
async function one(section:string){const {data,error}=await db.from('admin_settings').select('section,value,updated_at').eq('section',section).single();check(error);return data;}
function sanitizeSettings(section:string,v:any){
 const d=v && typeof v==='object' && !Array.isArray(v) ? v : {};
 if(section==='beta')return {
  registration_open:bool(d.registration_open),max_registrations:int(d.max_registrations,0,1000000),requires_guild:bool(d.requires_guild),
  allow_unregister:bool(d.allow_unregister),draw_exclude_previous:true,notify_winners:false,
  default_wave_size:int(d.default_wave_size,1,10000),reserve_count:int(d.reserve_count,0,10000),min_account_age_days:int(d.min_account_age_days,0,3650)
 };
 if(section==='discord')return {
  guild_id:snow(d.guild_id),application_id:snow(d.application_id),registration_channel_id:snow(d.registration_channel_id),
  announcements_channel_id:snow(d.announcements_channel_id),registered_role_id:snow(d.registered_role_id),tester_role_id:snow(d.tester_role_id),
  registration_message:str(d.registration_message,1000),success_message:str(d.success_message,500),enable_role_sync:bool(d.enable_role_sync),enable_dms:false
 };
 if(section==='game')return {
  access_mode:['open','beta_preparation'].includes(d.access_mode)?d.access_mode:'open',
  welcome_message:str(d.welcome_message,500),allow_guest:bool(d.allow_guest),beta_gate_ready:false
 };
 if(section==='notifications')return {
  notify_registration:bool(d.notify_registration),notify_lottery:bool(d.notify_lottery),notify_activation:bool(d.notify_activation),
  announcement_template:str(d.announcement_template,1000)
 };
 throw err('invalid_settings_section');
}
async function stats(){
 const counts=await Promise.all([
  ['total','selected','reserve','activated','pending','rejected','revoked'].map(async(s)=>{const q=db.from('beta_registrations').select('*',{count:'exact',head:true});const {count,error}=s==='total'?await q:await q.eq('status',s);check(error);return [s,count||0] as const;}),
  db.from('player_profiles').select('*',{count:'exact',head:true}),
  db.from('beta_waves').select('id,name,capacity,status').order('created_at',{ascending:true}).limit(25)
 ]);
 const statusPairs=await Promise.all(counts[0] as any);const {count:players,error:pe}=counts[1] as any;check(pe);
 const {data:waves,error:we}=counts[2] as any;check(we);
 return {statuses:Object.fromEntries(statusPairs),players:players||0,waves:waves||[]};
}
async function listRegistrations(body:any){
 let q=db.from('beta_registrations').select('discord_id,discord_name,source,status,wave_id,registered_at,selected_at,activated_at,notes',{count:'exact'}).order('registered_at',{ascending:false});
 if(['pending','selected','reserve','activated','rejected','revoked'].includes(body.status))q=q.eq('status',body.status);
 if(str(body.query,50)){const search=str(body.query,50).replace(/[%_,()]/g,'');q=q.or(`discord_id.ilike.%${search}%,discord_name.ilike.%${search}%`);}
 const page=int(body.page,0,99999);const {data,count,error}=await q.range(page*50,page*50+49);check(error);return {registrations:data||[],total:count||0,page};
}
async function listStaff(){
 const {data:owner,error:oe}=await db.from('admin_owner_lock').select('user_id,discord_id').single();check(oe);
 const {data:staff,error:se}=await db.from('admin_staff_invites').select('discord_id,role,permissions,preset_id,linked_user_id,active,updated_at').order('created_at',{ascending:false}).limit(200);check(se);
 return {owner,staff:staff||[]};
}
async function applyStaff(admin:any,body:any){
 requireOwner(admin);const discordId=str(body.discord_id,25);if(!DISCORD_ID.test(discordId))throw err('invalid_discord_id');
 const {data:owner,error:oe}=await db.from('admin_owner_lock').select('discord_id').single();check(oe);if(owner?.discord_id===discordId)throw err('cannot_modify_owner');
 const role=body.role==='admin'?'admin':'support';const permissions=validPermissions(body.permissions);
 if(permissions.length > PERMISSIONS.length)throw err('invalid_permissions');
 const preset=UUID.test(body.preset_id||'')?body.preset_id:null;
 const {error}=await db.rpc('admin_save_staff',{p_actor:admin.userId,p_discord_id:discordId,p_role:role,p_permissions:permissions,p_preset:preset,p_active:body.active!==false});check(error);return {ok:true};
}
function randIndex(max:number){const upper=0x100000000;const limit=upper-(upper%max);const buf=new Uint32Array(1);do{crypto.getRandomValues(buf);}while(buf[0]>=limit);return buf[0]%max;}
function secureShuffle<T>(items:T[]):T[]{const a=items.slice();for(let i=a.length-1;i>0;i--){const j=randIndex(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
async function draw(admin:any,body:any){
 requirePermission(admin,'beta.draw');const waveId=str(body.wave_id,36);if(!UUID.test(waveId))throw err('wave_required');
 const {data:wave,error:we}=await db.from('beta_waves').select('id,name,capacity,status').eq('id',waveId).single();check(we);
 if(!['planned','active'].includes(wave.status))throw err('wave_closed');
 const n=int(body.winners,1,Math.min(10000,wave.capacity));const reserve=int(body.reserves,0,5000);
 const {data:current,count:currentCount,error:ce}=await db.from('beta_registrations').select('discord_id',{count:'exact'}).in('status',['selected','activated']).eq('wave_id',waveId).limit(10000);check(ce);
 if((currentCount||0)+n>wave.capacity)throw err('wave_capacity_exceeded');
 const {data:eligible,count,error:ee}=await db.from('beta_registrations').select('discord_id',{count:'exact'}).eq('status','pending').order('registered_at').limit(10001);check(ee);
 if((count||0)>10000)throw err('draw_pool_over_10000_use_batched_lottery');
 if((eligible?.length||0)<n+reserve)throw err('not_enough_pending_registrations');
 const ids=secureShuffle((eligible||[]).map((x:any)=>x.discord_id));const winners=ids.slice(0,n),reserves=ids.slice(n,n+reserve);
 if(body.preview!==false)return {preview:true,candidate_count:count,winner_count:n,reserve_count:reserve,wave:wave.name};
 const {data:drawId,error:de}=await db.rpc('admin_finalize_beta_draw',{p_actor:admin.userId,p_wave_id:waveId,p_winners:winners,p_reserves:reserves,p_notes:str(body.notes,500)});check(de);
 await log(admin,'beta.draw',{draw_id:drawId,wave_id:waveId,winners:n,reserves:reserve});return {preview:false,draw_id:drawId,winner_count:n,reserve_count:reserve};
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors(req)});
 if(req.method!=='POST')return send(req,{error:'method_not_allowed'},405);
 let admin:any=null;
 try{
  const origin=req.headers.get('origin');if(origin&&!ORIGINS.has(origin))throw err('invalid_origin',403);
  const {user,discordId}=await verifiedUser(req);admin=await authorization(user,discordId);
  const body=await req.json().catch(()=>({}));if(!body||typeof body!=='object'||Array.isArray(body))throw err('invalid_json');
  const action=str(body.action,50);
  if(OWNER_ONLY.has(action))requireOwner(admin);
  if(action==='events.list'){
   requirePermission(admin,'events.view');
   const {data,error}=await db.rpc('admin_events_snapshot');check(error);return send(req,data);
  }
  if(action==='events.sync'){
   requirePermission(admin,'events.manage');
   const response=await fetch('https://raw.githubusercontent.com/PhantomSouLy/CHERRIFT/main/event/catalog.json',{signal:AbortSignal.timeout(10000),headers:{'Accept':'application/json'}});
   if(!response.ok)throw err('repository_catalog_unavailable',503);
   const raw=await response.text();if(raw.length>1000000)throw err('catalog_too_large');
   const catalog=validateCatalog(JSON.parse(raw));
   const {data,error}=await db.rpc('admin_events_mutate',{p_actor:admin.userId,p_revision:body.revision,p_operation:'sync',p_payload:catalog});check(error);
   return send(req,{ok:true,revision:data});
  }
  if(action==='events.mutate'){
   requirePermission(admin,'events.manage');
   if(!['save','move','disable'].includes(body.operation))throw err('invalid_event_operation');
   const {data,error}=await db.rpc('admin_events_mutate',{p_actor:admin.userId,p_revision:body.revision,p_operation:body.operation,p_payload:{id:body.id,enabled:body.enabled,starts_at:body.starts_at,ends_at:body.ends_at,direction:body.direction}});
   if(error?.message==='event_revision_conflict')throw err('Events changed in another session. Refresh and try again.',409);
   check(error);return send(req,{ok:true,revision:data});
  }

  if(action==='me')return send(req,{ok:true,admin:{owner:admin.owner,role:admin.role,discord_id:discordId,permissions:admin.permissions},name:str(user.user_metadata?.full_name||user.user_metadata?.name||'Admin'),avatar:str(user.user_metadata?.avatar_url||'',500)});
  if(action==='overview'){if(!admin.owner&&!['dashboard.view','beta.view','analytics.view'].some(p=>admin.permissions.includes(p)))throw err('permission_denied',403);return send(req,{ok:true,...await stats()});}
  if(action==='staff.list'){requirePermission(admin,'staff.view');return send(req,{ok:true,...await listStaff()});}
  if(action==='staff.save'){const result=await applyStaff(admin,body);return send(req,result);}
  if(action==='presets.list'){requirePermission(admin,'staff.view');const {data,error}=await db.from('admin_role_presets').select('*').order('builtin',{ascending:false}).order('name');check(error);return send(req,{presets:data,permissions:PERMISSIONS});}
  if(action==='presets.save'){
   const id=UUID.test(body.id||'')?body.id:null;const row={name:str(body.name,60),description:str(body.description,240),permissions:validPermissions(body.permissions),builtin:false,created_by:admin.userId,updated_at:new Date().toISOString()};
   if(row.name.length<2)throw err('preset_name_required');
   if(id){const {data:p,error:e}=await db.from('admin_role_presets').select('builtin').eq('id',id).single();check(e);if(p?.builtin)throw err('builtin_preset_immutable');const {error}=await db.from('admin_role_presets').update(row).eq('id',id);check(error);}else{const {error}=await db.from('admin_role_presets').insert(row);check(error);}
   await log(admin,'presets.save',{name:row.name});return send(req,{ok:true});
  }
  if(action==='presets.delete'){const id=str(body.id,36);if(!UUID.test(id))throw err('invalid_preset');const {data:p,error:pe}=await db.from('admin_role_presets').select('builtin').eq('id',id).single();check(pe);if(p.builtin)throw err('builtin_preset_immutable');const {error}=await db.from('admin_role_presets').delete().eq('id',id);check(error);await log(admin,'presets.delete',{id});return send(req,{ok:true});}
  if(action==='settings.list'){if(!admin.owner && !['settings.view','beta.view','discord.view','game.view','notifications.view'].some(k=>admin.permissions.includes(k)))throw err('permission_denied:settings.list',403);const {data,error}=await db.from('admin_settings').select('section,value,updated_at').order('section');check(error);return send(req,{settings:(data||[]).filter((x:any)=>admin.owner||admin.permissions.includes('settings.view')||admin.permissions.includes(x.section==='beta'?'beta.view':x.section==='discord'?'discord.view':x.section==='game'?'game.view':'notifications.view'))});}
  if(action==='settings.save'){
   const section=str(body.section,30);requirePermission(admin,section==='discord'?'discord.settings':section==='beta'?'beta.settings':section==='game'?'game.settings':'notifications.settings');
   if(!['beta','discord','game','notifications'].includes(section))throw err('invalid_section');
   const updated=sanitizeSettings(section,body.value);const old=await one(section);
   const {error}=await db.from('admin_settings').update({value:updated,updated_by:admin.userId,updated_at:new Date().toISOString()}).eq('section',section);check(error);
   await log(admin,'settings.save',{section,changed_keys:Object.keys(updated).filter(k=>JSON.stringify(old.value[k])!==JSON.stringify((updated as any)[k]))});return send(req,{ok:true,settings:updated});
  }
  if(action==='beta.list'){requirePermission(admin,'beta.view');return send(req,{ok:true,...await listRegistrations(body)});}
  if(action==='beta.add'){
   requirePermission(admin,'beta.registration');const discordId=str(body.discord_id,25);if(!DISCORD_ID.test(discordId))throw err('invalid_discord_id');
   const {error}=await db.from('beta_registrations').insert({discord_id:discordId,discord_name:str(body.discord_name,100),source:'admin'});check(error);
   await log(admin,'beta.add',{discord_id:discordId});return send(req,{ok:true});
  }
  if(action==='beta.status'){
   requirePermission(admin,'beta.whitelist');const id=str(body.discord_id,25);const status=str(body.status,20);
   if(!DISCORD_ID.test(id)||!['pending','selected','reserve','activated','revoked','rejected'].includes(status))throw err('invalid_status');
   const {data:old,error:oe}=await db.from('beta_registrations').select('status').eq('discord_id',id).single();check(oe);
   const patch:any={status,updated_at:new Date().toISOString(),notes:str(body.notes,600)};
   if(['selected','reserve'].includes(status))patch.selected_at=new Date().toISOString();
   if(status==='activated')patch.activated_at=new Date().toISOString();
   if(status==='pending'){patch.wave_id=null;patch.selected_at=null;patch.activated_at=null;}
   const {error}=await db.from('beta_registrations').update(patch).eq('discord_id',id);check(error);
   await log(admin,'beta.status',{discord_id:id,before:old.status,after:status});return send(req,{ok:true});
  }
  if(action==='beta.waves'){requirePermission(admin,'beta.view');const {data,error}=await db.from('beta_waves').select('*').order('created_at');check(error);return send(req,{waves:data||[]});}
  if(action==='beta.wave.save'){
   requirePermission(admin,'beta.waves');const row:any={name:str(body.name,70),description:str(body.description,300),capacity:int(body.capacity,1,100000),status:['planned','active','closed'].includes(body.status)?body.status:'planned'};
   if(row.name.length<2)throw err('wave_name_required');
   if(UUID.test(body.id||'')){const {error}=await db.from('beta_waves').update(row).eq('id',body.id);check(error);}else{const {error}=await db.from('beta_waves').insert(row);check(error);}
   await log(admin,'beta.wave.save',{name:row.name});return send(req,{ok:true});
  }
  if(action==='beta.draw')return send(req,{ok:true,...await draw(admin,body)});
  if(action==='audit.list'){requirePermission(admin,'audit.view');const {data,error}=await db.from('gm_audit_logs').select('action,admin_user_id,status,created_at,metadata').order('created_at',{ascending:false}).limit(100);check(error);return send(req,{logs:data||[]});}
  if(action==='beta.draw.history'){requirePermission(admin,'beta.view');const {data,error}=await db.from('beta_draws').select('id,wave_id,winner_count,reserve_count,created_at,notes').order('created_at',{ascending:false}).limit(40);check(error);return send(req,{draws:data||[]});}
  return send(req,{error:'unknown_action'},404);
 }catch(e:any){console.error('admin-center-api',e?.message);return send(req,{error:e?.message||'internal_error'},e?.status||500);}
});
