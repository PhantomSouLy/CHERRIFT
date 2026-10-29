import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const dirs=['left','right','down_left','down_right','up_left','up_right'];
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
 for(const dir of ['up','down'])assert.equal(api.pose('walk',dir,0,0),null);
 for(const state of ['idle','idle2','attack','skill'])for(const dir of dirs)assert.equal(api.pose(state,dir,0,0),null);
});
test('the two feet exchange front/back positions at half a cycle in every requested direction',()=>{
 const {api}=fixture();for(const dir of dirs){const a=api.pose('walk',dir,0,0),b=api.pose('walk',dir,0,3);
  const first=a.legs[0].sole[0]-a.legs[1].sole[0],second=b.legs[0].sole[0]-b.legs[1].sole[0];
  assert.ok(first*second<0,`${dir}: the same leg cannot remain in front`);
  for(let i=0;i<2;i++)assert.ok(Math.abs(a.legs[i].sole[0]-b.legs[i].sole[0])>12);
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
test('side-view soles keep a fixed registration while the painted cast poses change',()=>{
 const {api}=fixture();for(const dir of ['left','right'])for(const state of ['walk','walk_attack']){
  const first=api.pose(state,dir,0,1.17);
  for(let f=0;f<=5;f+=.125){const p=api.pose(state,dir,f,1.17);for(let i=0;i<2;i++)assert.ok(Math.abs(first.legs[i].sole[0]-p.legs[i].sole[0])<1e-8,'painted pose changes must not shake the foot support');}
 }
});
test('horizontal subpixel registration is continuous and leaves diagonals untouched',()=>{
 const {api}=fixture();for(const dir of ['left','right']){
  for(let f=1;f<6;f++){const a=api.pose('walk',dir,f-.00001,1),b=api.pose('walk',dir,f+.00001,1);assert.ok(Math.abs(a.bodyShiftX-b.bodyShiftX)<.001);}
  const a=api.pose('walk',dir,5.99999,1),b=api.pose('walk',dir,.00001,1);assert.ok(Math.abs(a.bodyShiftX-b.bodyShiftX)<.001);
 }
 for(const dir of ['up_left','up_right','down_left','down_right'])assert.equal(api.pose('walk',dir,2.3,1).bodyShiftX,0);
});
test('feet lift alternately while both hip attachments stay on the same painted pose',()=>{
 const {api}=fixture();for(const dir of dirs){const a=api.pose('walk',dir,0,1.5),b=api.pose('walk',dir,0,4.5);
  assert.ok(b.legs[0].sole[1]<a.legs[0].sole[1]-5);assert.ok(a.legs[1].sole[1]<b.legs[1].sole[1]-5);
  for(let i=0;i<2;i++)assert.deepEqual(Array.from(a.legs[i].hip),Array.from(b.legs[i].hip));
 }
});
test('the continuous cycle closes, and moving attack art cannot restart the leg cycle',()=>{
 const {api}=fixture();for(const dir of dirs){const a=api.pose('walk',dir,0,0),b=api.pose('walk',dir,0,6);
  for(let i=0;i<2;i++)for(let k=0;k<2;k++)assert.ok(Math.abs(a.legs[i].sole[k]-b.legs[i].sole[k])<1e-8);
  const p=api.pose('walk_attack',dir,1.2,2.4),q=api.pose('walk_attack',dir,4.7,2.4);
  for(let i=0;i<2;i++){if(dir==='left'||dir==='right')assert.ok(Math.abs(p.legs[i].sole[0]-q.legs[i].sole[0])<1e-8);else assert.ok(Math.abs((p.legs[i].sole[0]-p.legs[i].hip[0])-(q.legs[i].sole[0]-q.legs[i].hip[0]))<1e-8);assert.equal(p.legs[i].sole[1],q.legs[i].sole[1]);}
 }
});
test('the complete output contains exactly two articulated legs and the intact body is drawn last',()=>{
 const {window,api,canvases}=fixture(true),body={name:'interpolated painted body'};
 window.CHERRIFT_ANIMATION_SMOOTHING={sample:()=>body};let output;
 const main={drawImage(image,...args){output=image;assert.equal(args[0],290);},clip(){throw Error('no horizontal world-space cut');}};
 assert.equal(api.draw(main,{width:1152},{},'x'),false,'unsupported states delegate');
 const image={width:1152},walk={width:1152};
 assert.equal(api.draw(main,image,'walk','left',.6,1.7,{x:400,y:300},110,110,()=>{},walk),true);
 const draws=output.ops.filter(op=>op[0]==='drawImage');assert.equal(draws.length,5);assert.equal(draws.at(-1)[1],body);
 const shift=api.pose('walk','left',.6,1.7).bodyShiftX;assert.ok(output.ops.some(op=>op[0]==='translate'&&op[1]===shift&&op[2]===0),'the complete painted body receives the same registration as its hip attachments');
 const created=canvases.length;for(let n=0;n<30;n++)api.draw(main,image,'walk','left',n*.1,n*.1,{x:400,y:300},110,110,()=>{},walk);
 assert.equal(canvases.length,created,'warm rendering allocates no canvases');
});
test('the shared renderer only routes Base Cherry into this rig and keeps actual-travel timing',()=>{
 const {window}=fixture();let request;window.CHERRIFT_BASE_WALK={draw(...args){request=args;return true;}};
 const image={},walk={};window.CHERRIFT_CHERRY_MOTION.draw({},image,'cherry_default','walk_attack','right',4,{x:0,y:0,cherryStrideTime:.4},110,110,4.2,{walkImage:walk});
 assert.equal(request[2],'walk_attack');assert.equal(request[5],3.2);assert.equal(request[10],walk);
 request=null;window.CHERRIFT_CHERRY_MOTION.draw({drawImage(){}},image,'archer_cherry','walk','right',0,{x:0,y:0},110,110,0);assert.equal(request,null);
});
test('new Base module loads after the shared renderer, before Base Cherry, with one cache build',()=>{
 const html=read('index.html'),build=JSON.parse(read('src/cherrift_manifest.json')).buildId;
 assert.ok(html.indexOf('src/cherrift_cherry_motion.js')<html.indexOf('src/cherrift_base_walk.js'));
 assert.ok(html.indexOf('src/cherrift_base_walk.js')<html.indexOf('src/cherrift_base_cherry.js'));
 const values=[...html.matchAll(/(?:src|href)=["'](?:src|assets)\/[^"']+\?v=([^"']+)/gi)].map(m=>m[1]);assert.deepEqual([...new Set(values)],[build]);
});
