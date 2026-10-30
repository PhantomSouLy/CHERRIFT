import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
import { activeEvents } from '../_shared/events.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false,autoRefreshToken:false}});
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='GET')return new Response('{}',{status:405,headers});
 const {data,error}=await db.from('game_events').select('id,manifest,position,enabled,repo_present,starts_at,ends_at').eq('enabled',true).eq('repo_present',true).limit(200);
 if(error)return new Response(JSON.stringify({error:'events_unavailable'}),{status:503,headers});
 const now=Date.now();
 const transitions=(data||[]).flatMap((r:any)=>[r.starts_at,r.ends_at]).filter(Boolean).map(Date.parse).filter((t:number)=>t>now);
 const next=transitions.length?new Date(Math.min(...transitions)).toISOString():null;
 const counts:Record<string,number>={limited:0,permanent:0};
 const events=activeEvents(data||[],now).map((r:any)=>({...r.manifest,position:++counts[r.manifest.category],starts_at:r.starts_at,ends_at:r.ends_at}));
 return new Response(JSON.stringify({server_time:new Date(now).toISOString(),next_transition:next,events}),{headers});
});
