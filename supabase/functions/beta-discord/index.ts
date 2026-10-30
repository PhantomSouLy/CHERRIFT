import { createClient } from 'npm:@supabase/supabase-js@2.57.0';

// Discord Interactions Endpoint. MUST deploy with verify_jwt=false: Discord
// cannot send a Supabase JWT; cryptographic Ed25519 signature is mandatory.
const URL=Deno.env.get('SUPABASE_URL')||'';
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const PUBLIC_KEY=Deno.env.get('DISCORD_PUBLIC_KEY')||'';
const TOKEN=Deno.env.get('DISCORD_BOT_TOKEN')||'';
const db=createClient(URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
const EPOCH=1420070400000n;
const hex=(v:string)=>new Uint8Array((v.match(/.{1,2}/g)||[]).map(x=>parseInt(x,16)));
const reply=(content:string)=>new Response(JSON.stringify({type:4,data:{content,flags:64,allowed_mentions:{parse:[]}}}),{headers:{'content-type':'application/json'}});
const errorReply=()=>reply('The registration service is temporarily unavailable. Please try again later.');
async function verified(req:Request,body:string){
 const ts=req.headers.get('x-signature-timestamp')||'';const sig=req.headers.get('x-signature-ed25519')||'';
 if(!PUBLIC_KEY||!/^\d{10}$/.test(ts)||!/^([a-f\d]{128})$/i.test(sig)||!/^[a-f\d]{64}$/i.test(PUBLIC_KEY))return false;
 if(Math.abs(Date.now()/1000-Number(ts))>300)return false;
 const key=await crypto.subtle.importKey('raw',hex(PUBLIC_KEY),{name:'Ed25519'},false,['verify']);
 return crypto.subtle.verify('Ed25519',key,hex(sig),new TextEncoder().encode(ts+body));
}
async function config(section:string){const {data,error}=await db.from('admin_settings').select('value').eq('section',section).single();if(error)throw error;return data.value||{};}
async function role(guild:string,id:string,role:string){if(!TOKEN||!guild||!role)return;const response=await fetch(`https://discord.com/api/v10/guilds/${guild}/members/${id}/roles/${role}`,{method:'PUT',headers:{Authorization:`Bot ${TOKEN}`}});if(!response.ok)console.error('Discord role synchronization failed',response.status);}
async function handle(req:Request){
 const body=await req.text();if(body.length>100000)return new Response('payload_too_large',{status:413});
 if(!await verified(req,body))return new Response('invalid_request_signature',{status:401});
 const event=JSON.parse(body);if(event.type===1)return new Response(JSON.stringify({type:1}),{headers:{'content-type':'application/json'}});
 if(event.type!==3)return reply('Unsupported interaction.');
 const action=event.data?.custom_id;
 if(!['cherrift_beta_register','cherrift_beta_unregister','cherrift_beta_status'].includes(action))return reply('Unknown CHERRIFT action.');
 const id=String(event.member?.user?.id||event.user?.id||'');
 if(!/^\d{15,25}$/.test(id))return reply('Could not verify your Discord account.');
 const guildConfig=await config('discord');const beta=await config('beta');
 if(beta.requires_guild && (!event.guild_id || String(event.guild_id)!==String(guildConfig.guild_id)))return reply('Please use the registration button in the official CHERRIFT Discord server.');
 const {data:existing,error:ee}=await db.from('beta_registrations').select('discord_id,status').eq('discord_id',id).maybeSingle();if(ee)throw ee;
 if(action==='cherrift_beta_status')return reply(existing?`CHERRIFT Beta status: **${existing.status}**`:'You have not registered for the CHERRIFT Closed Beta.');
 if(action==='cherrift_beta_unregister'){
  if(!beta.allow_unregister)return reply('Unregistration is currently disabled. Contact the staff for data removal.');
  if(!existing)return reply('You are not registered.');
  // Never revoke an activated beta tester silently using the registration button.
  if(existing.status!=='pending')return reply('Contact CHERRIFT staff to request removal of an activated beta account.');
  const {error}=await db.from('beta_registrations').delete().eq('discord_id',id).eq('status','pending');if(error)throw error;
  return reply('Your pre-beta registration has been removed.');
 }
 if(!beta.registration_open)return reply('CHERRIFT Closed Beta registration is currently closed.');
 if(existing)return reply(`You are already registered. Current status: **${existing.status}**.`);
 const ageDays=Number(beta.min_account_age_days)||0;
 const created=Number((BigInt(id)>>22n)+EPOCH);
 if(Date.now()-created<ageDays*86400000)return reply(`Your Discord account must be at least ${ageDays} days old to register.`);
 const name=String(event.member?.user?.global_name||event.member?.user?.username||event.user?.global_name||event.user?.username||'').slice(0,100);
 const {data:result,error:re}=await db.rpc('admin_discord_register',{p_discord_id:id,p_discord_name:name,p_limit:Number(beta.max_registrations)||0});
 if(re)throw re;
 if(result==='already')return reply('You are already registered.');
 if(result==='full')return reply('The registration list is currently full.');
 if(result!=='registered')throw Error('Unexpected registration result');
 if(guildConfig.enable_role_sync&&event.guild_id===guildConfig.guild_id&&guildConfig.registered_role_id){EdgeRuntime.waitUntil(role(guildConfig.guild_id,id,guildConfig.registered_role_id));}
 return reply(String(guildConfig.success_message||'Your CHERRIFT Closed Beta registration was successful.').slice(0,500));
}
Deno.serve(async(req:Request)=>{if(req.method!=='POST')return new Response('method_not_allowed',{status:405});try{return await handle(req);}catch(e){console.error('beta-discord handler error',String(e));return errorReply();}});
