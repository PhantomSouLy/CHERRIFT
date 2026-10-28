import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('src/cherrift_sakura_dance_gait.js','utf8');
function fixture(){let created=0;const operations=[];const document={createElement(){created++;return {width:192,height:192,getContext(){return new Proxy({},{get:(_,k)=>(...args)=>operations.push([k,...args])});}};}};
 const window={};vm.runInNewContext(source,{document,window});return {gait:window.CHERRIFT_SAKURA_DANCE_GAIT,created:()=>created};}
test('gait runs in all directions and standing/cast states need no articulation',()=>{
 const {gait,created}=fixture(),idle={},image={};for(const s of ['idle','idle2','idle3','attack','skill'])assert.equal(gait.get(image,idle,s,'down',0,0),null);
 assert.equal(created(),0);assert.equal(gait.get(image,null,'walk','down',0,0),null);
 for(const dir of ['right','down_right','down','down_left','left','up_left','up','up_right'])for(const state of ['walk','walk_attack'])for(let frame=0;frame<6;frame++)assert.ok(gait.get({},idle,state,dir,frame,frame));
});
test('upper attack pose and leg phase are independent and warm mobile cache stops allocating',()=>{
 const {gait,created}=fixture(),idle={},image={};
 const a=gait.get(image,idle,'walk_attack','right',0,0),b=gait.get(image,idle,'walk_attack','right',0,3);
 assert.notEqual(a,b);assert.equal(gait.get(image,idle,'walk_attack','right',0,0),a);
 for(let i=0;i<6;i++)gait.get(image,idle,'walk_attack','right',i,i);
 const before=created();for(let i=0;i<100;i++)gait.get(image,idle,'walk_attack','right',i%6,i%6);assert.equal(created(),before);
});
test('entrypoints and preview load the gait before the character renderer',()=>{
 const html=readFileSync('index.html','utf8');assert.ok(html.indexOf('src/cherrift_sakura_dance_gait.js')<html.indexOf('src/cherrift_sakura_dance_chibi.js'));
 const preview=readFileSync('assets/player/cherry_skins/sakura_dance_cherry/preview.html','utf8');assert.match(preview,/CHERRIFT_SAKURA_DANCE_GAIT.get/);
 assert.match(preview,/Math.floor\(clock\*8\)%6/);
});
