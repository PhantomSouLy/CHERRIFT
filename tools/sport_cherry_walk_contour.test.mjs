import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync}from'node:fs';
function setup(){const c=vm.createContext({window:{}});for(const p of ['cherrift_walk_cycle.js','cherrift_sport_data.js','cherrift_sport_gait.js'])vm.runInContext(readFileSync('src/'+p,'utf8'),c);return{api:c.window.CHERRIFT_SPORT_GAIT,cycle:c.window.CHERRIFT_WALK_CYCLE};}
test('plain side Walk carries the original outer toe and heel with the complete foot',()=>{
 const{api,cycle}=setup();for(const d of ['left','right'])for(const phase of [0,.75,1.5,2.25,3,3.75,4.5,5.25]){
  const p=api.pose('walk',d,0,phase),y=Math.max(p.a[3],p.b[3])-.5;
  const centres=[p.a,p.b].map(b=>b[0]+(b[2]-b[0])*Math.min(1,(y-b[1])/(b[3]-b[1]))),outward=centres[1]>centres[0]?-1:1;
  for(const i of [0,1]){const x=centres[i]+(i===0?outward:-outward)*8,v=[];cycle.displacement(x,y,p,v);assert.ok(Math.abs(v[0]-p.stride[2*i])<1e-9,d+' horizontal shoe fringe');assert.ok(Math.abs(v[1]-p.stride[2*i+1])<1e-9,d+' vertical shoe fringe');}
 }
});
test('inverse mapping resolves visible shoe pixels without a stationary duplicate contour',()=>{
 const{api,cycle}=setup();const pixels=[[87,174],[90,178],[92,180],[98,174],[102,178],[108,174]];
 for(const d of ['left','right'])for(let phase=0;phase<6;phase+=.25){const p=api.pose('walk',d,0,phase);
  for(const[nx,ny]of pixels){const x=d==='right'?64+nx*2/3:256-(64+nx*2/3),y=64+ny*2/3,v=[],inverse=[];cycle.displacement(x,y,p,v);cycle.inverse(x+v[0],y+v[1],p,inverse);assert.ok(Math.hypot(inverse[0]-x,inverse[1]-y)<.01,`${d}/${phase}/${nx},${ny}`);}
 }
});
test('the contour correction is tagged only for plain left/right Walk',()=>{
 const{api}=setup();for(const d of ['left','right']){assert.ok(api.pose('walk',d,0,0).radius<-100);const attack=api.pose('walk_attack',d,0,0);assert.ok(attack.radius<0&&attack.radius>-100);}
 for(const d of ['down','up','down_left','down_right','up_left','up_right'])assert.ok(api.pose('walk',d,0,0).radius>0);
});
