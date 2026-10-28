import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const code=readFileSync('src/cherrift_sakura_dance_gait.js','utf8');
function fixture(pixels=new Uint8ClampedArray(192*192*4)){let allocated=0,readbacks=0;const calls=[];const context=new Proxy({getImageData:()=>{readbacks++;return {data:pixels};}},{get:(t,k)=>k in t?t[k]:(...args)=>calls.push([k,...args])});
const document={createElement(){allocated++;return {width:192,height:192,getContext:()=>context};}},window={};vm.runInNewContext(code,{window,document});return {gait:window.CHERRIFT_SAKURA_DANCE_GAIT,calls,allocated:()=>allocated,readbacks:()=>readbacks};}
test('all eight moving directions work, idle/standing attack/skill bypass the gait',()=>{
 const {gait,allocated}=fixture(),image={},idle={};for(const state of ['idle','idle2','idle3','attack','skill'])assert.equal(gait.get(image,idle,state,'down',0,0),null);assert.equal(allocated(),0);
 for(const dir of ['right','down_right','down','down_left','left','up_left','up','up_right'])for(const state of ['walk','walk_attack'])for(let frame=0;frame<6;frame++)assert.ok(gait.get({},idle,state,dir,frame,frame+.25));
});
test('walk torso always reads pose zero; continuous phase bends two legs without allocation or readback in the warm draw path',()=>{
 const {gait,calls,allocated,readbacks}=fixture(),image={},idle={};gait.get(image,idle,'walk','up',0,0);const warm=allocated(),warmReads=readbacks();calls.length=0;
 for(let i=1;i<=240;i++)gait.get(image,idle,'walk','up',i%6,i/40);
 assert.equal(allocated(),warm);assert.equal(readbacks(),warmReads);assert.equal(calls.filter(c=>c[0]==='drawImage'&&c[1]===image).length,0,'no source pose reload while walking');
 assert.equal(calls.filter(c=>c[0]==='drawImage').length,240*5,'two thigh/shin pairs plus one stable torso per draw');
});
test('subframe gait phases produce small continuous bone rotations',()=>{
 const {gait,calls}=fixture(),image={},idle={};gait.get(image,idle,'walk','right',0,1);calls.length=0;
 function angles(phase){calls.length=0;gait.get(image,idle,'walk','right',0,phase);return calls.filter(c=>c[0]==='rotate').map(c=>c[1]);}
 const a=angles(1),b=angles(1.01);assert.equal(a.length,4);assert.ok(a.some((x,i)=>Math.abs(x-b[i])>1e-6));a.forEach((x,i)=>assert.ok(Math.abs(x-b[i])<.1));
});
test('animation entrypoints share manifest build and are loaded in dependency order',()=>{
 const html=readFileSync('index.html','utf8'),manifest=JSON.parse(readFileSync('src/cherrift_manifest.json','utf8'));
 const ids=[...html.matchAll(/(?:src|href)=["'](?:src|assets)\/[^"']+\?v=([^"']+)/gi)].map(m=>m[1]);assert.deepEqual([...new Set(ids)],[manifest.buildId]);
 assert.ok(html.indexOf('src/cherrift_sakura_dance_gait.js')<html.indexOf('src/cherrift_sakura_dance_chibi.js'));
 const preview=readFileSync('assets/player/cherry_skins/sakura_dance_cherry/preview.html','utf8');assert.match(preview,/\(clock\*8\)%6/);
});
test('detached old boot pixels are removed while pixels connected to the torso survive',()=>{
 const pixels=new Uint8ClampedArray(192*192*4);
 for(let y=150;y<164;y++)for(let x=91;x<95;x++)pixels[(y*192+x)*4+3]=255;
 for(let y=176;y<183;y++)for(let x=110;x<115;x++)pixels[(y*192+x)*4+3]=255;
 const {gait}=fixture(pixels);gait.get({}, {},'walk','down',0,0);
 assert.equal(pixels[(180*192+112)*4+3],0,'old detached shoe erased');
 assert.equal(pixels[(161*192+92)*4+3],255,'connected costume preserved');
});
