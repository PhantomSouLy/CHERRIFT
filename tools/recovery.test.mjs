import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {IDBFactory} from 'fake-indexeddb';
import {applyGameAction, prepareSave} from '../supabase/functions/_shared/gameplay.mjs';

const recoverySource = readFileSync('src/cherrift_recovery.js', 'utf8');
const authSource = readFileSync('src/cherrift_auth.js', 'utf8');
const key = owner => `cherrift-discord-backup-v2:${owner}:recovery`;
const save = (owner='a',coins=500) => ({coins,security:{accountOwnerId:owner}});
const record = (owner='a',coins=500) => ({ownerUserId:owner,savedAt:'2026-10-24',cloudUpdatedAt:'old',saveData:save(owner,coins)});

function fixture({factory=new IDBFactory(),quota=Infinity}={}) {
 const dom=new JSDOM('<body></body>',{url:'https://fixture.invalid/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,data=new Map();let budget=quota;
 const storage={get length(){return data.size},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,removeItem:k=>data.delete(k),setItem(k,v){
  const next=new Map(data);next.set(k,String(v));
  if([...next].reduce((n,[k,v])=>n+2*(k.length+v.length),0)>budget)throw new w.DOMException('quota exceeded','QuotaExceededError');
  data.set(k,String(v));
 }};
 Object.defineProperty(w,'localStorage',{value:storage});Object.defineProperty(w,'indexedDB',{value:factory});
 w.structuredClone=structuredClone;w.eval(recoverySource);
 return {w,data,storage,factory,api:w.CHERRIFT_RECOVERY,quota:v=>budget=v,close:()=>w.close()};
}

test('a full localStorage archive migrates intact and releases space only after IDB commits',async()=>{
 const f=fixture({quota:1000});try{
  const records=Array.from({length:20},(_,i)=>({...record('a',i),notes:'x'.repeat(1000)}));
  f.data.set(key('a'),JSON.stringify(records));f.data.set('unrelated','keep');
  assert.equal(await f.api.migrate('a'),true);
  assert.equal(f.data.has(key('a')),false);assert.equal(f.data.get('unrelated'),'keep');
  assert.deepEqual(JSON.parse(JSON.stringify(await f.api.list('a'))),records);
  f.storage.setItem('new-backup','fits');assert(f.api.has('a'));
 }finally{f.close()}
});

test('failed IDB transactions and full localStorage retain every original recovery record',async()=>{
 const factory=new IDBFactory(),open=factory.open.bind(factory);
 factory.open=(...args)=>{
  const request=open(...args);request.addEventListener('success',()=>{
   const db=request.result,transaction=db.transaction.bind(db);
   db.transaction=(...args)=>{const tx=transaction(...args);queueMicrotask(()=>tx.abort());return tx;};
  });return request;
 };
 const f=fixture({factory,quota:1});try{
  const original=JSON.stringify([record('a',700)]);f.data.set(key('a'),original);
  assert.equal(await f.api.preserve(save('a',900),'a','r2'),false);
  assert.equal(f.data.get(key('a')),original);
 }finally{f.close()}
});

test('concurrent recoveries preserve all versions and isolate accounts across reloads',async()=>{
 const f=fixture();try{
  assert.deepEqual(await Promise.all([f.api.preserve(save('a',600),'a','r1'),f.api.preserve(save('a',700),'a','r2'),f.api.preserve(save('b',800),'b','r1')]),[true,true,true]);
  await f.api.preserve(save('a',700),'a','r3');
  assert.equal((await f.api.list('a')).length,2);assert.equal((await f.api.list('b')).length,1);
  const reload=fixture({factory:f.factory});try{
   await reload.api.migrate('a');assert(reload.api.has('a'));
   assert.deepEqual((await reload.api.list('a')).map(r=>r.saveData.coins),[600,700]);
  }finally{reload.close()}
  assert.equal(await f.api.preserve(save('b'),'a','r1'),false);
 }finally{f.close()}
});

test('an unavailable IndexedDB falls back durably without reporting success for a failed write',async()=>{
 const f=fixture({factory:null});try{
  assert.equal(await f.api.preserve(save('a',600),'a','r1'),true);
  assert.equal(JSON.parse(f.data.get(key('a')))[0].saveData.coins,600);
  const before=f.data.get(key('a'));f.quota(1);
  assert.equal(await f.api.preserve(save('a',700),'a','r2'),false);
  assert.equal(f.data.get(key('a')),before);
 }finally{f.close()}
});

async function signedInFixture({legacy=false}={}) {
 const f=fixture({quota:20000}),w=f.w;
 let server=prepareSave({coins:500,energy:50,settings:{language:'hu',volume:60},account:{level:1,xp:0,totalXp:0},profile:{name:'Fixture',activeTitle:'gm'},ownedTitles:['gm'],security:{accountOwnerId:'a'},unlockedSkins:['cherry_default'],unlockedStages:['world_1_1']});
 let revision=2;
 if(legacy){
  f.data.set(key('a'),JSON.stringify([{...record('a',800),notes:'x'.repeat(40000)}]));
  f.data.set('cherrift-discord-backup-v2:a',JSON.stringify({ownerUserId:'a',cloudUpdatedAt:'r1',dirty:true,saveData:{...structuredClone(server),coins:900}}));
 }
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'a',user_metadata:{full_name:'Fixture'}}}},error:null}),onAuthStateChange:()=>({data:{subscription:{}}}),signOut:async()=>({error:null})},functions:{invoke:async(_name,{body})=>{
  if(body.action==='save_progress')server.settings=structuredClone(body.save_data.settings);
  if(body.action==='game_action')server=applyGameAction(server,body.operation,body.params).save;
  return {data:{ok:true,gameplay_policy:'online-v1',save_data:structuredClone(server),updated_at:'r'+(++revision)},error:null};
 }}};
 w.CHERRIFT_SUPABASE_CONFIG={url:'https://fixture.supabase.co',publishableKey:'fixture'};
 w.supabase={createClient:()=>{if(legacy)assert.equal(f.data.has(key("a")),false,"recovery storage is migrated before Auth can persist a token");return client;}};
 w.CherriftStorage={defaults:()=>structuredClone(server),save:()=>true};
 w.UI={save:structuredClone(server),refreshMenu(){},open(){},toast(){},game:{}};
 w.eval(authSource);w.CHERRIFT_AUTH.bootstrapSave(()=>structuredClone(server));w.CHERRIFT_AUTH.start();
 const start=Date.now();while(w.CHERRIFT_AUTH.getState().mode!=='discord'){
  if(Date.now()-start>3000){f.close();throw new Error('fixture auth did not finish')}
  await new Promise(r=>setTimeout(r,5));
 }
 return {...f,auth:w.CHERRIFT_AUTH,server:()=>server};
}

test('real auth boot recovers from a quota-full legacy archive and permits server-authorized gameplay',async()=>{
 const f=await signedInFixture({legacy:true});try{
  assert.equal(f.auth.getState().cloudReady,true);assert.equal(f.auth.getState().signedIn,true);
  assert.equal(f.w.UI.save.coins,500);assert.equal((await f.api.list('a')).length,2);
  assert.equal(f.data.has(key('a')),false);
  const response=await f.auth.gameAction('start_run',{stage_id:'world_1_1'});
  assert.equal(response.save_data.security.online.run.stageId,'world_1_1');
 }finally{f.close()}
});

test('GM preview and setting autosaves do not create recovery snapshots for virtual unlocks',async()=>{
 const f=await signedInFixture();try{
  for(let i=0;i<25;i++){
   const next=structuredClone(f.w.UI.save);
   next.prebeta={...next.prebeta,gmAccessActive:true,gmAccessBackup:{unlockedSkins:['cherry_default'],unlockedStages:['world_1_1']}};
   next.account.skillTreeV082={...next.account.skillTreeV082,resetCount:0,ranks:{damage:0,maxHp:0}};
   next.unlockedSkins.push('gunner_cherry','mage_cherry');next.unlockedStages.push('world_6_5');next.settings.volume=i;
   f.w.CherriftStorage.save(next);assert.equal(await f.auth.flushCloudSave(),true);
  }
  assert.equal((await f.api.list('a')).length,0);assert.equal(f.auth.getState().cloudReady,true);
  const next=structuredClone(f.w.UI.save);next.coins=900;
  f.w.CherriftStorage.save(next);await f.auth.flushCloudSave();
  assert.equal((await f.api.list('a')).length,1,'real progression divergence is still preserved');
 }finally{f.close()}
});

test('signing out clears the previous recovery error from the account gate',async()=>{
 const f=await signedInFixture();try{
  f.auth.openGate({errorKey:'recoveryStorageUnavailable',errorDetail:'recovery_storage_unavailable'});
  assert.equal(f.w.document.getElementById('authErrorV064').hidden,false);
  await f.auth.signOut();
  assert.equal(f.w.document.getElementById('authErrorV064').hidden,true);
  assert.equal(f.w.document.getElementById('authStatusV064').textContent,'Kijelentkeztél a Discord-fiókból.');
 }finally{f.close()}
});
