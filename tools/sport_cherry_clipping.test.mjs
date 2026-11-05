import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function setup(){
const context=vm.createContext({window:{}});vm.runInContext(readFileSync('src/cherrift_walk_cycle.js','utf8'),context);const old=context.window.CHERRIFT_WALK_CYCLE;
vm.runInContext(readFileSync('src/cherrift_sport_data.js','utf8'),context);vm.runInContext(readFileSync('src/cherrift_sport_gait.js','utf8'),context);return{context,api:context.window.CHERRIFT_SPORT_GAIT,old};
}
const dirs=['down','down_right','right','up_right','up','up_left','left','down_left'];
test('contact foot travels opposite to actual movement in all eight directions; returning foot lifts',()=>{
 const {api}=setup(),s=.8*3/Math.PI,eps=.00001;
 for(const d of dirs){const a=api.pose('walk',d,1,s-eps),b=api.pose('walk',d,1,s+eps);const dot=(b.stride[0]-a.stride[0])*a.travel[0]+(b.stride[1]-a.stride[1])*a.travel[1];assert.ok(dot<0,d);assert.ok(b.stride[3]-b.travel[1]*(-2.8*Math.cos((s+eps)*Math.PI/3))*.65<0,d+' swing lifts');}
});
test('attack facing and travel direction remain independent without resetting foot phase',()=>{
 const {api}=setup();for(const d of dirs){const a=api.pose('walk_attack',d,0,1.25,'left'),b=api.pose('walk_attack',d,4.9,1.25,'left');assert.deepEqual(Array.from(a.stride),Array.from(b.stride));assert.equal(a.travel[0],-1);assert.equal(a.travel[1],0);}
});
test('continuous pose warp leaves face, ears, hair above the hips and clothing untouched',()=>{
 const {context,api}=setup(),out=[];for(const d of dirs)for(const st of ['walk','walk_attack'])for(let phase=0;phase<6;phase+=.5){const p=api.pose(st,d,phase,phase);for(const xy of [[128,90],[105,135],[145,148]]){context.window.CHERRIFT_WALK_CYCLE.displacement(...xy,p,out);assert.ok(out.every(v=>v===0));}}
});
test('walk closes its cycle; mirrored directions mirror the same whole-pose motion',()=>{
 const {api}=setup();for(const d of dirs){const a=api.pose('walk',d,0,0),b=api.pose('walk',d,6,6);for(let i=0;i<4;i++)assert.ok(Math.abs(a.stride[i]-b.stride[i])<1e-12);}
 for(const [l,r]of [['left','right'],['down_left','down_right'],['up_left','up_right']]){const a=api.pose('walk',l,2.2,2.2),b=api.pose('walk',r,2.2,2.2);assert.ok(Math.abs(a.a[0]+b.a[0]-256)<1e-9);assert.equal(a.stride[0],-b.stride[0]);assert.equal(a.stride[1],b.stride[1]);}
});
test('rendering consumes one COMPLETE original pose, without rig assets or layer composition',()=>{
 const {context,api}=setup();const requested=[],image={},draws=[];context.window.CHERRIFT_ANIMATION_SMOOTHING={draw(...args){draws.push(args);return true;}};
 const game={assets:{get(k){requested.push(k);return image;}}};
 for(const d of dirs)for(const st of ['walk','walk_attack']){assert.equal(api.draw(game,{},st,d,2.2,3.1,{sportFacing:'down'},116,116),true);const a=draws.at(-1);assert.equal(a[1],image);assert.equal(a[5],2,'Do not crossfade different body/limb poses');const commands=[];a[9].makeFrame({drawImage(...v){commands.push(v);}},2);assert.deepEqual(commands,[[image,384,0,192,192,0,0,192,192]]);}
 assert.ok(requested.every(k=>/^player_sport_cherry_(idle|attack)_/.test(k)));
});
test('Sport override preserves the existing motion implementation for other skins',()=>{
 const {context,old}=setup();for(const d of dirs){const a=old.pose('succubus_cherry','walk',d,0,1,.5,2);const b=context.window.CHERRIFT_WALK_CYCLE.pose('succubus_cherry','walk',d,0,1,.5,2);assert.equal(JSON.stringify(a),JSON.stringify(b));}
});
test('moving flow maps match complete original idle/attack source pixels',()=>{
 const {context}=setup(),mirror={left:'right',down_left:'down_right',up_left:'up_right'};
 for(const st of ['walk','walk_attack'])for(const d of dirs){const can=mirror[d]||d,meta=context.window.CHERRIFT_ANIMATION_FLOW[`sport_cherry/${st}/${can}`];assert.match(meta.file,/__whole4\.png$/);assert.deepEqual(readFileSync('assets/player/animation_flow/'+meta.file),readFileSync(`assets/player/animation_flow/sport_cherry__${st==='walk'?'idle':'attack'}__${can}.png`));}
});
test('flow warmup draws one complete source frame immediately and does not leak attack travel',()=>{
 const {context,api}=setup(),image={},calls=[];context.window.CHERRIFT_ANIMATION_SMOOTHING={draw(){return false;}};
 assert.equal(api.draw({assets:{get(){return image;}}},{drawImage(...a){calls.push(a);}},'walk_attack','up_left',2.9,1.25,{x:100,y:200,sportFacing:'down'},192,192),true);
 assert.deepEqual(calls,[[image,384,0,192,192,4,46,192,192]]);
 const p=context.window.CHERRIFT_WALK_CYCLE.pose('sport_cherry','walk','right',0,1,.5,1);
 assert.equal(p.travel[0],1);assert.equal(p.travel[1],0);
});
