import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync('src/cherrift_succubus_gait.js','utf8');
function fixture(){
 let created=0;const operations=[];
 const document={createElement(){created++;return {width:192,height:192,getContext(){return new Proxy({},{get:(_,key)=> (...args)=>operations.push([key,...args])});}};}};
 const window={};vm.runInNewContext(code,{document,window});return {gait:window.CHERRIFT_SUCCUBUS_GAIT,operations,created:()=>created};
}
test('all moving directions compose, standing states bypass, six frame cache stays bounded',()=>{
 const {gait,created}=fixture(),image={},idle={};
 for(const state of ['idle','idle2','idle3','skill','attack_melee','attack_ranged'])assert.equal(gait.get(image,idle,state,'down',0),null);
 assert.equal(created(),0);assert.equal(gait.get(image,null,'walk','down',0),null);
 for(const dir of ['down','down_right','right','up_right','up','up_left','left','down_left']){
  const im={};for(let i=0;i<6;i++)assert.ok(gait.get(im,idle,'walk',dir,i));
  const before=created();for(let n=0;n<100;n++)gait.get(im,idle,'walk',dir,n%6);
  assert.equal(created(),before,'replaying cached frames allocates no canvases');
 }
});
test('runtime and standalone preview use the same compositor',()=>{
 const html=readFileSync('index.html','utf8');
 assert.ok(html.indexOf('src/cherrift_succubus_gait.js')<html.indexOf('src/cherrift_succubus_chibi.js'));
 const runtime=readFileSync('src/cherrift_succubus_chibi.js','utf8');
 assert.match(runtime,/CHERRIFT_SUCCUBUS_GAIT\?\.get/);
 const preview=readFileSync('animation-preview.html','utf8');
 assert.match(preview,/CHERRIFT_SUCCUBUS_GAIT/);
});

