import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { JSDOM } from 'jsdom';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { activeEvents, validateCatalog } from '../supabase/functions/_shared/events.mjs';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
const manifest=(id='festival',category='limited')=>({id,name:id,description:'A festival',category,renderer:'content',sections:[{title:'Title',body:'Body'}]});
test('admin API requires verified identity and checks event write permission on every action',async()=>{
 let handler;let user={id:'staff',user_metadata:{role:'owner',provider_id:'300644885810380810'},identities:[]};
 const database={auth:{getUser:async()=>({data:{user},error:null})},from(table){const query={select:()=>query,eq:()=>query,single:async()=>({data:table==='admin_owner_lock'?{user_id:'owner',discord_id:'300644885810380810'}:{role:'owner',active:true},error:null})};return query;},rpc:async(name)=>name==='admin_sync_staff'?{data:{role:'support',permissions:['events.view']},error:null}:{data:{revision:0,events:[]},error:null}};
 const source=stripTypeScriptTypes(await read('../supabase/functions/admin-center-api/index.ts'),{mode:'transform'}).replace(/^import .*;\s*$/gm,'');
 const context=vm.createContext({createClient:()=>database,validateCatalog,console,crypto,Request,Response,Headers,Date,AbortSignal,Deno:{env:{get:()=>''},serve:fn=>{handler=fn;}}});
 vm.runInContext(source,context);
 const call=(action,headers={})=>handler(new Request('https://test.invalid',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify({action})}));
 assert.equal((await call('events.list')).status,401);
 assert.equal((await call('events.list',{authorization:'Bearer token'})).status,403,'user-editable metadata never grants admin access');
 user={...user,identities:[{provider:'discord',identity_data:{provider_id:'123456789012345678'}}]};
 assert.equal((await call('events.list',{authorization:'Bearer token'})).status,200);
 assert.equal((await call('events.mutate',{authorization:'Bearer token'})).status,403);
 assert.equal((await call('events.sync',{authorization:'Bearer token'})).status,403);
 assert.equal((await call('events.list',{authorization:'Bearer token',origin:'https://evil.invalid'})).status,403);
});
test('event catalog rejects duplicate IDs, unknown renderers and excessive data',()=>{
 assert.equal(validateCatalog({events:[manifest()]}).events.length,1);
 for(const events of [[manifest(),manifest()],[{...manifest(),id:'../path'}],[{...manifest(),renderer:'https://evil.test/a.js'}],[{...manifest(),sections:Array(21).fill({title:'x',body:'y'})}]])assert.throws(()=>validateCatalog({events}));
});
test('start is inclusive, end is exclusive, disabled and missing modules are hidden',()=>{
 const base={id:'x',enabled:true,repo_present:true,position:1,starts_at:'2026-01-01T00:00:00Z',ends_at:'2026-02-01T00:00:00Z'};
 assert.equal(activeEvents([base],Date.parse(base.starts_at)).length,1);
 assert.equal(activeEvents([base],Date.parse(base.ends_at)).length,0);
 assert.equal(activeEvents([{...base,enabled:false}],Date.parse(base.starts_at)).length,0);
 assert.equal(activeEvents([{...base,repo_present:false}],Date.parse(base.starts_at)).length,0);
});
test('database publication is atomic, versioned, audited and denied to browser roles',async()=>{
 const db=new PGlite();const owner='00000000-0000-4000-8000-000000000001',viewer='00000000-0000-4000-8000-000000000002';
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create table auth.identities(user_id uuid,provider text,provider_id text);create table public.gm_admins(user_id uuid primary key,role text,active boolean,permissions text[],created_by uuid,updated_at timestamptz);create table public.gm_audit_logs(admin_user_id uuid,action text,request_id uuid,status text,metadata jsonb);insert into auth.users values('${owner}'),('${viewer}');insert into public.gm_admins(user_id,role,active,permissions) values('${owner}','owner',true,'{}'),('${viewer}','support',true,'{events.view}');insert into auth.identities values('${owner}','discord','300644885810380810');`);
 await db.exec(await read('../supabase/migrations/20261030004054_admin_center.sql'));
 const eventSql=(await readdir(new URL('../supabase/migrations/',import.meta.url))).find(f=>f.endsWith('_scheduled_events.sql'));
 await db.exec(await read('../supabase/migrations/'+eventSql));
 const mutate=async(revision,operation,payload,actor=owner)=>(await db.query('select public.admin_events_mutate($1,$2,$3,$4) as revision',[actor,revision,operation,payload])).rows[0].revision;
 let rev=await mutate(0,'sync',{events:[manifest('a'),manifest('b','permanent')]});
 assert.equal((await db.query('select count(*)::int as n from game_events where enabled')).rows[0].n,0);
 await assert.rejects(mutate(0,'disable',{id:'a'}),/event_revision_conflict/);
 await assert.rejects(mutate(rev,'save',{id:'a',enabled:true}),/check constraint/);
 await assert.rejects(mutate(rev,'disable',{id:'a'},viewer),/permission_denied/);
 rev=await mutate(rev,'save',{id:'a',enabled:true,starts_at:'2026-01-01Z',ends_at:'2026-02-01Z'});
 rev=await mutate(rev,'save',{id:'b',enabled:true});
 rev=await mutate(rev,'move',{id:'b',direction:-1});
 assert.deepEqual((await db.query('select id from game_events order by position')).rows.map(r=>r.id),['b','a']);
 rev=await mutate(rev,'sync',{events:[manifest('b','permanent')]});
 assert.equal((await db.query("select enabled from game_events where id='a'")).rows[0].enabled,false);
 rev=await mutate(rev,'sync',{events:[manifest('a'),manifest('b','permanent')]});
 assert.equal((await db.query("select enabled from game_events where id='a'")).rows[0].enabled,false);
 assert.equal((await db.query('select count(*)::int as n from gm_audit_logs')).rows[0].n,Number(rev));
 await db.query('select admin_save_staff($1,$2,$3,$4,$5,$6)',[owner,'123456789012345678','support',['events.view'],null,true]);
 await db.query('select admin_sync_staff($1,$2)',[viewer,'123456789012345678']);
 assert.equal((await db.query('select active from gm_admins where user_id=$1',[viewer])).rows[0].active,true);
 await db.query('select admin_save_staff($1,$2,$3,$4,$5,$6)',[owner,'123456789012345678','support',[],null,false]);
 await assert.rejects(db.query('select admin_sync_staff($1,$2)',[viewer,'123456789012345678']),/not_an_active_admin/);
 assert.equal((await db.query('select active from gm_admins where user_id=$1',[viewer])).rows[0].active,false);
 for(const role of ['anon','authenticated']){
 await db.exec('set role '+role);await assert.rejects(db.query('select * from game_events'),/permission denied/);await assert.rejects(db.query('select admin_events_snapshot()'),/permission denied/);await db.exec('reset role');
 }
 }finally{await db.close();}
});
test('event hub renders safe text and clears access when feed fails',async()=>{
 const dom=new JSDOM('<div id="app"><section id="menu" class="panel"></section><section id="eventHubPrebeta" class="panel hidden"></section></div>',{runScripts:'outside-only',pretendToBeVisual:true,url:'http://localhost:8000'});
 const w=dom.window;let fail=false;
 try{
 w.AbortSignal={timeout:()=>undefined};w.CHERRIFT_SUPABASE_CONFIG={url:'https://project.test'};w.UI={open(){}};
 w.fetch=async()=>{if(fail)throw Error('offline');return {ok:true,json:async()=>({server_time:new Date().toISOString(),next_transition:null,events:[{...manifest(),name:'<img src=x onerror=alert(1)>',sections:[{title:'<script>',body:'plain text'}],ends_at:'2099-01-01T00:00:00Z'}]})};};
 w.eval(await read('../src/cherrift_event_hub.js'));await new Promise(r=>setTimeout(r,10));
 w.CHERRIFT_EVENT_HUB.open();await new Promise(r=>setTimeout(r,10));assert.equal(w.document.querySelectorAll('.hub-list button').length,1);
 w.document.querySelector('[data-hub-event]').click();assert.equal(w.document.querySelectorAll('.hub-detail img,.hub-detail script').length,0);assert.match(w.document.querySelector('.hub-detail').textContent,/plain text/);
 fail=true;await w.CHERRIFT_EVENT_HUB.refresh();assert.equal(w.CHERRIFT_EVENT_HUB.isActive('festival'),false);assert.equal(w.document.querySelectorAll('.hub-list button').length,0);
 }finally{w.close();}
});
