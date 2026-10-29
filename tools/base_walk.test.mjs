import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const dirs=['left','right','down_left','down_right'];
function fixture(render=false){
 class Game{movePlayer(){}}
 const window={CherriftGame:Game},canvases=[];
 const document={createElement(){const c={width:256,height:256,ops:[]};const ctx={};for(const name of ['save','restore','beginPath','closePath','clip','rect','moveTo','lineTo','translate','rotate','scale','drawImage','clearRect'])ctx[name]=(...args)=>c.ops.push([name,...args]);c.getContext=()=>ctx;canvases.push(c);return c;}};
 const context=vm.createContext({window,CherriftGame:Game,...(render?{document}:{})});
 for(const name of ['cherry_geometry','cherry_shot_alignment','animation_flow','base_walk','cherry_motion'])vm.runInContext(read(`src/cherrift_${name}.js`),context);
 return {window,api:window.CHERRIFT_BASE_WALK,canvases};
}
test('only the six requested side and diagonal walking directions use the new Base rig',()=>{
 const {api}=fixture();for(const state of ['walk','walk_attack'])for(const dir of dirs)assert.ok(api.pose(state,dir,0,0));
 for(const dir of ['up','down','up_left','up_right'])assert.equal(api.pose('walk',dir,0,0),null);
 for(const state of ['idle','idle2','attack','skill'])for(const dir of dirs)assert.equal(api.pose(state,dir,0,0),null);
});
test('the two feet exchange front/back positions at half a cycle in every requested direction',()=>{
 const {api}=fixture();for(const dir of dirs){const a=api.pose('walk',dir,0,0),b=api.pose('walk',dir,0,3);
  const travel=a.legs.map((leg,i)=>b.legs[i].sole[0]-leg.sole[0]);
  assert.ok(travel[0]*travel[1]<0,`${dir}: the feet must travel in opposite phases`);
  for(const distance of travel)assert.ok(Math.abs(distance)>7&&Math.abs(distance)<=11,'short readable steps without the previous wide sweep');
 }
});
test('grounded feet move backwards and raised feet return forwards in all six directions',()=>{
 const {api}=fixture();for(const dir of dirs){const facing=dir.includes('left')?-1:1,base=api.pose('walk',dir,0,0);
  for(const phase of [.5,1,2,2.5,3.5,4,5,5.5]){
   const a=api.pose('walk',dir,0,phase),b=api.pose('walk',dir,0,phase+.01);
   for(let i=0;i<2;i++){const velocity=(b.legs[i].sole[0]-a.legs[i].sole[0])*facing;
    const grounded=Math.abs(a.legs[i].sole[1]-base.legs[i].sole[1])<1e-8;
    assert.ok(grounded?velocity<0:velocity>0,`${dir}: incorrect ${grounded?'stance':'swing'} direction at ${phase}`);
   }
  }
 }
});
test('soles keep a fixed registration while the painted cast poses change',()=>{
 const {api}=fixture();for(const dir of dirs)for(const state of ['walk','walk_attack']){
  const first=api.pose(state,dir,0,1.17);
  for(let f=0;f<=5;f+=.125){const p=api.pose(state,dir,f,1.17);for(let i=0;i<2;i++)assert.ok(Math.abs(first.legs[i].sole[0]-p.legs[i].sole[0])<1e-8,'painted pose changes must not shake the foot support');}
 }
});
test('both axes of body registration stay continuous across frame and loop edges',()=>{
 const {api}=fixture();for(const dir of dirs){
  for(let f=1;f<6;f++){const a=api.pose('walk',dir,f-.00001,1),b=api.pose('walk',dir,f+.00001,1);for(const axis of ['bodyShiftX','bodyShiftY'])assert.ok(Math.abs(a[axis]-b[axis])<.001);}
  const a=api.pose('walk',dir,5.99999,1),b=api.pose('walk',dir,.00001,1);for(const axis of ['bodyShiftX','bodyShiftY'])assert.ok(Math.abs(a[axis]-b[axis])<.001);
 }
});
test('feet lift alternately while both hip attachments stay on the same painted pose',()=>{
 const {api}=fixture();for(const dir of dirs){const a=api.pose('walk',dir,0,1.5),b=api.pose('walk',dir,0,4.5);
  assert.ok(b.legs[0].sole[1]<a.legs[0].sole[1]-2);assert.ok(a.legs[1].sole[1]<b.legs[1].sole[1]-2);
  for(let i=0;i<2;i++)assert.deepEqual(Array.from(a.legs[i].hip),Array.from(b.legs[i].hip));
 }
});
test('the continuous cycle closes, and moving attack art cannot restart the leg cycle',()=>{
 const {api}=fixture();for(const dir of dirs){const a=api.pose('walk',dir,0,0),b=api.pose('walk',dir,0,6);
  for(let i=0;i<2;i++)for(let k=0;k<2;k++)assert.ok(Math.abs(a.legs[i].sole[k]-b.legs[i].sole[k])<1e-8);
  const p=api.pose('walk_attack',dir,1.2,2.4),q=api.pose('walk_attack',dir,4.7,2.4);
  for(let i=0;i<2;i++){assert.ok(Math.abs(p.legs[i].sole[0]-q.legs[i].sole[0])<1e-8);assert.equal(p.legs[i].sole[1],q.legs[i].sole[1]);}
 }
});
test('the complete output contains exactly two articulated legs and the intact body is drawn last',()=>{
 const {window,api,canvases}=fixture(true),body={name:'interpolated painted body'};
 window.CHERRIFT_ANIMATION_SMOOTHING={sample:()=>body};let output;
 const main={drawImage(image,...args){output=image;assert.equal(args[0],290);},clip(){throw Error('no horizontal world-space cut');}};
 assert.equal(api.draw(main,{width:1152},{},'x'),false,'unsupported states delegate');
 const image={width:1152},walk={width:1152};
 assert.equal(api.draw(main,image,'walk','left',.6,1.7,{x:400,y:300},110,110,()=>{},walk),true);
 const draws=output.ops.filter(op=>op[0]==='drawImage');assert.equal(draws.length,7);assert.equal(draws.at(-1)[1],body);
 const plan=api.pose('walk','left',.6,1.7);assert.ok(output.ops.some(op=>op[0]==='translate'&&op[1]===plan.bodyShiftX&&op[2]===plan.bodyShiftY),'the complete painted body receives the same registration as its hip attachments');
 const created=canvases.length;for(let n=0;n<30;n++)api.draw(main,image,'walk','left',n*.1,n*.1,{x:400,y:300},110,110,()=>{},walk);
 assert.equal(canvases.length,created,'warm rendering allocates no canvases');
});
test('the shared renderer only routes Base Cherry into this rig and keeps actual-travel timing',()=>{
 const {window}=fixture();let request;window.CHERRIFT_BASE_WALK={draw(...args){request=args;return true;}};
 const image={},walk={};window.CHERRIFT_CHERRY_MOTION.draw({},image,'cherry_default','walk_attack','right',4,{x:0,y:0,cherryStrideTime:.4},110,110,4.2,{walkImage:walk});
 assert.equal(request[2],'walk_attack');assert.equal(request[5],3.2);assert.equal(request[10],walk);
 request=null;window.CHERRIFT_CHERRY_MOTION.draw({drawImage(){}},image,'archer_cherry','walk','right',0,{x:0,y:0},110,110,0);assert.equal(request,null);
});
test('leg width stays small and constant as the knee bends and the leg extends',()=>{
 const {window,api}=fixture(true);window.CHERRIFT_ANIMATION_SMOOTHING={sample:()=>({})};let output;
 const ctx={drawImage:image=>output=image};
 for(const dir of dirs){const image={width:1152};for(let stride=0;stride<6;stride+=.25){
  api.draw(ctx,image,'walk',dir,0,stride,{x:0,y:0},110,110,()=>{},image);
  const scales=output.ops.filter(op=>op[0]==='scale');
  assert.ok(scales.length>=4);for(const scale of scales){assert.equal(scale[2],.76,'transverse width never follows changing bone length');assert.ok(Number.isFinite(scale[1])&&scale[1]>0);}
  output.ops.length=0;
 }}
});
test('hip height and diagonal pelvis stay steady without freezing the painted animation',()=>{
 const {api}=fixture();for(const dir of dirs)for(const state of ['walk','walk_attack']){
  const reference=api.pose(state,dir,0,0);const center=p=>p.legs.reduce((sum,leg)=>sum+leg.hip[1],0)/2;
  for(let phase=0;phase<6;phase+=.125){const p=api.pose(state,dir,phase,phase);
   assert.ok(Math.abs(center(p)-center(reference))<1e-8,'no changing leg length from a bobbing pelvis');
   assert.ok(p.legs.every(leg=>leg.sole[1]<=64+184*2/3+.5));
  }
 }
});
test('new Base module loads after the shared renderer, before Base Cherry, with one cache build',()=>{
 const html=read('index.html'),build=JSON.parse(read('src/cherrift_manifest.json')).buildId;
 assert.ok(html.indexOf('src/cherrift_cherry_motion.js')<html.indexOf('src/cherrift_base_walk.js'));
 assert.ok(html.indexOf('src/cherrift_base_walk.js')<html.indexOf('src/cherrift_base_cherry.js'));
 const values=[...html.matchAll(/(?:src|href)=["'](?:src|assets)\/[^"']+\?v=([^"']+)/gi)].map(m=>m[1]);assert.deepEqual([...new Set(values)],[build]);
});


test('boot orientation remains independent of the moving shin',()=>{
 const {api}=fixture();for(const dir of dirs)for(const state of ['walk','walk_attack']){
  const ref=api.pose(state,dir,0,0).legs[0],offset=ref.ankle.map((v,i)=>v-ref.sole[i]);
  for(let stride=0;stride<6;stride+=.125)for(const leg of api.pose(state,dir,2.3,stride).legs)for(let i=0;i<2;i++)assert.ok(Math.abs(leg.ankle[i]-leg.sole[i]-offset[i])<1e-8);
 }
});
