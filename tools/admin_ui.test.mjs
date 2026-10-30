import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const html=await readFile(new URL('../admin/index.html',import.meta.url),'utf8');const source=await readFile(new URL('../admin/admin.js',import.meta.url),'utf8');
const pause=()=>new Promise(r=>setTimeout(r,20));
for(const width of [390,1440]){
 const dom=new JSDOM(html,{url:'http://localhost:8000/admin/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;const calls=[];
 try{
 w.CHERRIFT_SUPABASE_CONFIG={url:'https://example.test',publishableKey:'test'};w.innerWidth=width;
 w.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{}}}),onAuthStateChange(){},signInWithOAuth:async()=>({})},functions:{invoke:async(_, {body})=>{calls.push(body.action);return {data:body.action==='me'?{admin:{owner:true,role:'owner',permissions:[]},name:'Test Owner'}:body.action==='overview'?{statuses:{total:0,selected:0,activated:0},players:3,waves:[]}:body.action==='settings.list'?{settings:[]}:body.action==='beta.list'?{registrations:[],total:0}:body.action==='audit.list'?{logs:[]}:body.action==='events.list'?{events:[{id:'closed-beta',manifest:{name:'Closed Beta',category:'limited',description:'Welcome'},enabled:false,repo_present:true}],revision:0}:body.action==='presets.list'?{presets:[],permissions:[]}:body.action==='staff.list'?{staff:[],owner:{discord_id:'123456789012345678'}}:body.action==='beta.waves'?{waves:[]}:body.action==='beta.draw.history'?{draws:[]}:{} };}}})};
 w.eval(source);await pause();await pause();
 assert(!w.document.getElementById('app').classList.contains('hidden'));
 assert.match(w.document.getElementById('pageContent').textContent,/Beta Progress/);
 for(const page of ['events','maintenance','users','beta','discord','settings','game','dashboard']){
 w.document.querySelector(`[data-page="${page}"]`).click();await pause();assert.equal(w.document.getElementById('breadcrumb').textContent,page==='events'?'Event Management':page==='users'?'Users & Permissions':page==='beta'?'Beta Management':page==='discord'?'Discord Integration':page==='settings'?'System Settings':page==='game'?'Game Management':page==='maintenance'?'Maintenance':'Dashboard');
 if(page==='events')assert(w.document.getElementById('eventForm'));
 if(page==='maintenance')assert.match(w.document.getElementById('pageContent').textContent,/Coming soon/);
 }
 console.log(`PASS Admin UI navigation and forms at ${width}px (DOM simulation; visual layout not verified)`);
 }finally{w.close();}
}
