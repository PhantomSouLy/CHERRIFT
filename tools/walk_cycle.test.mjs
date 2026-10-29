import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const window={};vm.runInNewContext(readFileSync('src/cherrift_walk_cycle.js','utf8'),{window});
const walk=window.CHERRIFT_WALK_CYCLE;
test('idle, standing attacks and skills do not receive a walking deformation',()=>{
 for(const id of ['succubus_cherry','wuxia_sakura_cherry'])for(const state of ['idle','idle2','idle3','attack','attack_ranged','skill'])assert.equal(walk.pose(id,state,'right',0,1,.5,1),null);
});
test('all legendary moving poses have continuous, finite hip and sole anchors in all eight directions',()=>{
 for(const id of ['succubus_cherry','wuxia_sakura_cherry'])for(const state of ['walk',id==='succubus_cherry'?'walk_attack_ranged':'walk_attack'])for(const dir of ['down','down_right','right','up_right','up','up_left','left','down_left'])for(let f=0;f<6;f++){
  const p=walk.pose(id,state,dir,f,(f+1)%6,.4,2.37);assert.ok(p);for(const value of [...p.a,...p.b,...p.stride,...p.body,p.radius])assert.ok(Number.isFinite(value));
  assert.ok(p.a[3]>p.a[1]&&p.b[3]>p.b[1]);
 }
});
test('alternate feet lift while the supporting foot remains grounded, with a continuous loop',()=>{
 const pose=phase=>walk.pose('succubus_cherry','walk','right',0,1,0,phase);
 const a=pose(1.5),b=pose(4.5);assert.ok(Math.abs(a.stride[3])<1e-10);assert.ok(a.stride[1]<-5);assert.ok(Math.abs(b.stride[1])<1e-10);assert.ok(b.stride[3]<-5);
 const start=pose(0),end=pose(6);for(let i=0;i<4;i++)assert.ok(Math.abs(start.stride[i]-end.stride[i])<1e-10);
});
test('hip attachment moves with the same torso translation; no independent body cut exists',()=>{
 const p=walk.pose('succubus_cherry','walk','right',0,1,0,1.5),out=[];
 walk.displacement(p.a[0],p.a[1],p,out);assert.ok(Math.abs(out[0]-p.body[0])<1e-8);assert.ok(Math.abs(out[1]-p.body[1])<1e-8);
 const before=[],after=[];walk.displacement(p.a[0],p.a[1]-.001,p,before);walk.displacement(p.a[0],p.a[1]+.001,p,after);
 assert.ok(Math.hypot(before[0]-after[0],before[1]-after[1])<.001);
});
test('left and upper-left steps mirror their original right-side poses without new limb copies',()=>{
 for(const [right,left] of [['right','left'],['up_right','up_left']]){
  const a=walk.pose('succubus_cherry','walk',right,0,1,.5,1.1),b=walk.pose('succubus_cherry','walk',left,0,1,.5,1.1);
  assert.ok(Math.abs(a.a[0]+b.a[0]-256.6666667)<1e-8);assert.ok(Math.abs(a.stride[0]+b.stride[0])<1e-8);assert.equal(a.stride[1],b.stride[1]);
 }
});
test('advancing the attack artwork cannot reset the independent travel phase',()=>{
 const a=walk.pose('succubus_cherry','walk_attack_ranged','right',0,1,0,1.5),b=walk.pose('succubus_cherry','walk_attack_ranged','right',5,0,.8,1.5);
 assert.equal(a.stride[1],b.stride[1]);assert.equal(a.stride[3],b.stride[3]);
 assert.equal(walk.pose('succubus_cherry','walk','right',0,1,0,NaN),null);
});
