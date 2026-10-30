import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const html=await readFile(new URL('../admin/index.html',import.meta.url),'utf8');const source=await readFile(new URL('../admin/admin.js',import.meta.url),'utf8');
const pause=()=>new Promise(r=>setTimeout(r,20));
for(const width of [390,1440]){
 const dom=new JSDOM(html,{url:'http://localhost:8000/admin/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;const calls=[];
 try{
 w.CHERRIFT_SUPABASE_CONFIG={url:'https://example.test',publishableKey:'test'};w.innerWidth=width;
 w.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{}}}),onAuthStateChange(){},signInWithOAuth:async()=>({})},functions:{invoke:async(_, {body})=>{calls.push(body.action);return {data:body.action==='me'?{admin:{owner:true,role:'owner',permissions:[]},name:'Test Owner'}:body.action==='overview'?{statuses:{total:12,selected:7,activated:3,pending:2,reserve:1,rejected:1},players:3,waves:[]}:body.action==='settings.list'?{settings:[]}:body.action==='beta.list'?{registrations:[],total:0}:body.action==='audit.list'?{logs:[]}:body.action==='events.list'?{events:[{id:'closed-beta',manifest:{name:'Closed Beta',category:'limited',description:'Welcome'},enabled:false,repo_present:true}],revision:0}:body.action==='presets.list'?{presets:[{id:'builtin',name:'Administrator',builtin:true,description:'Beépített sablon',permissions:['events.manage']}],permissions:['events.manage']}:body.action==='staff.list'?{staff:[],owner:{discord_id:'123456789012345678'}}:body.action==='beta.waves'?{waves:[]}:body.action==='beta.draw.history'?{draws:[]}:{} };}}})};
 w.eval(source);await pause();await pause();
 assert(!w.document.getElementById('app').classList.contains('hidden'));
 assert.match(w.document.getElementById('pageContent').textContent,/Béta előrehaladása/);
 for(const page of ['events','maintenance','users','beta','discord','settings','game','mail','analytics','logs','notifications','backups','dashboard']){
 w.document.querySelector(`[data-page="${page}"]`).click();await pause();assert.equal(w.document.getElementById('breadcrumb').textContent,page==='events'?'Eseménykezelés':page==='users'?'Felhasználók és jogosultságok':page==='beta'?'Bétakezelés':page==='discord'?'Discord-kapcsolat':page==='settings'?'Rendszerbeállítások':page==='game'?'Játékkezelés':page==='maintenance'?'Karbantartás':page==='mail'?'Levelek és jutalmak':page==='analytics'?'Statisztikák':page==='logs'?'Naplók és biztonság':page==='notifications'?'Értesítések':page==='backups'?'Adatok és mentések':'Vezérlőpult');
 if(page==='events'){assert(w.document.getElementById('eventForm'));assert.match(w.document.getElementById('pageContent').textContent,/Esemény közzététele/);assert.match(w.document.getElementById('pageContent').textContent,/Időszakos/);}
 if(page==='beta')assert.equal(w.document.querySelectorAll('.metric strong')[2].textContent,'7');
 if(page==='users'){assert.match(w.document.getElementById('pageContent').textContent,/Események kezelése/);assert.equal(w.document.querySelector('[name=perm]').value,'events.manage');assert.equal(w.document.querySelector('[name=preset_id] option[value=builtin]').textContent,'Adminisztrátor');assert.match(w.document.getElementById('pageContent').textContent,/Munkatársak kezelése/);assert.equal(w.document.querySelector('[name=role] option').value,'support');}
 if(page==='maintenance')assert.match(w.document.getElementById('pageContent').textContent,/Hamarosan/);
 }
 assert(!w.document.getElementById('toast').classList.contains('error'));
 assert(calls.includes('events.list'));assert(calls.includes('staff.list'));
 console.log(`PASS Admin UI navigation and forms at ${width}px (DOM simulation; visual layout not verified)`);
 }finally{w.close();}
}
