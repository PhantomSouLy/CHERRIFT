import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function setup(){const c=vm.createContext({window:{}});for(const p of ['cherrift_walk_cycle.js','cherrift_sport_data.js'])vm.runInContext(readFileSync('src/'+p,'utf8'),c);const original=c.window.CHERRIFT_WALK_CYCLE;vm.runInContext(readFileSync('src/cherrift_sport_gait.js','utf8'),c);return{api:c.window.CHERRIFT_SPORT_GAIT,cycle:c.window.CHERRIFT_WALK_CYCLE,original};}
test('sideways lower leg follows the stride before the shoe/sole in both moving states',()=>{
 const {api,cycle,original}=setup();for(const d of ['left','right'])for(const st of ['walk','walk_attack']){
  const p=api.pose(st,d,0,0),at=r=>[p.a[0]+(p.a[2]-p.a[0])*r,p.a[1]+(p.a[3]-p.a[1])*r];
  const v4Profile={...p,radius:Math.abs(p.radius<-100?p.radius+100:p.radius),body:[0,0]},x=at(.45),improved=[],previous=[];
  cycle.displacement(...x,p,improved);original.displacement(...x,v4Profile,previous);
  assert.ok(Math.abs(improved[0])>Math.abs(previous[0])*1.6,st+'/'+d+' thigh/shin needs visible motion');
  const hip=[];cycle.displacement(p.a[0],Math.min(p.a[1],p.b[1]),p,hip);assert.deepEqual(hip,[0,0]);
 }
});
test('returning side knee bends along the direction of travel and mirrors exactly',()=>{
 const {api,cycle}=setup();const stride=4.5;
 const left=api.pose('walk','left',0,stride),right=api.pose('walk','right',0,stride);
 assert.ok(left.body[0]<0);assert.ok(right.body[0]>0);
 for(const [x,y] of [[124,170],[126,175],[130,180]]){const a=[],b=[];cycle.displacement(x,y,right,a);cycle.displacement(256-x,y,left,b);assert.ok(Math.abs(a[0]+b[0])<1e-8);assert.ok(Math.abs(a[1]-b[1])<1e-8);}
});
test('front, rear, diagonals and other skins keep their original displacement equations',()=>{
 const {api,cycle,original}=setup();for(const d of ['down','up','down_left','down_right','up_left','up_right']){
  const p=api.pose('walk',d,1.5,2.25);assert.ok(p.radius>0);for(const [x,y]of [[128,150],[125,174],[132,182]]){const a=[],b=[];cycle.displacement(x,y,p,a);original.displacement(x,y,p,b);assert.deepEqual(a,b);}
 }
 const p=original.pose('succubus_cherry','walk','right',0,1,.5,2);const a=[],b=[];cycle.inverse(128,174,p,a);original.inverse(128,174,p,b);assert.deepEqual(a,b);
});
test('WebGL contains the same side profile and leaves ordinary walking on its legacy branch',()=>{
 const {cycle}=setup();assert.match(cycle.shader,/if\(stepRadius>=0\.0\)return legacyUnstep/);assert.match(cycle.shader,/ra\/0\.62/);assert.match(cycle.shader,/bodyStep.x\*4\.0\*ra\*\(1\.0-ra\)/);assert.equal((cycle.shader.match(/vec2 unstep\(/g)||[]).length,1);
});
