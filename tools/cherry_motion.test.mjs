import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function fixture(){
  class Game {
    movePlayer(v,dt){if(this.blocked)return;this.player.x+=v.x*this.player.speed*dt;this.player.y+=v.y*this.player.speed*dt;}
  }
  const window={CherriftGame:Game};
  const context=vm.createContext({window,CherriftGame:Game,Math});
  for(const name of ['geometry','motion']) vm.runInContext(readFileSync(`src/cherrift_cherry_${name}.js`,'utf8'),context);
  const game=new Game();game.player={skin:'cherry_default',x:10,y:20,speed:235};
  return {window,context,game,motion:window.CHERRIFT_CHERRY_MOTION};
}

test('all shipped poses align soles and visible height across eight directions',()=>{
  const {window,motion}=fixture();let checked=0;
  const p={x:400,y:300};
  for(const [id,states] of Object.entries(window.CHERRIFT_CHERRY_GEOMETRY)){
    for(const [state,dirs] of Object.entries(states))for(const [dir,frames] of Object.entries(dirs))for(let f=0;f<frames.length;f++){
      let args;motion.draw({drawImage(...a){args=a;}},{},id,state,dir,f,p,110.2,110.2);
      const [top,bottom,anchor]=frames[f];
      const dx=args[5],dy=args[6],width=args[7],height=args[8];
      assert.ok(Math.abs(dx+anchor*width/192-p.x)<1e-8,`${id}/${state}/${dir} horizontal anchor`);
      assert.ok(Math.abs(dy+bottom*height/192-(p.y+30))<1e-8,'soles baseline');
      if(state!=='skill')assert.ok(Math.abs((bottom-top)*height/192-156*110.2/192)<1e-8,'same visible height');
      assert.equal(args[1],f*192);assert.equal(width,height,'uniform, undistorted scaling');checked++;
    }
  }
  assert.equal(checked,976);
});

test('stride follows real movement, keeps phase on turns, and stops against walls',()=>{
  const {game,motion}=fixture(),p=game.player;
  game.movePlayer({x:1,y:0},.2);assert.equal(motion.walkFrame(p),1);
  game.movePlayer({x:0,y:1},.2);assert.equal(motion.walkFrame(p),3);
  const time=p.cherryStrideTime;game.movePlayer({x:0,y:0},1);assert.equal(p.cherryStrideTime,time);
  game.blocked=true;game.movePlayer({x:1,y:0},1);assert.equal(p.cherryStrideTime,time);
  game.blocked=false;p.dashTimer=1;game.movePlayer({x:1,y:0},1);assert.equal(p.cherryStrideTime,time);
  p.skin='mage_cherry';delete p.cherryStrideTime;game.movePlayer({x:1,y:0},1);assert.equal(p.cherryStrideTime,undefined);
});

test('walk attacks keep the original complete cast pose while flow data is unavailable',()=>{
  const {window,motion}=fixture();let args;
  window.CHERRIFT_CHERRY_GAIT={get(){throw Error('separate legs must not be drawn');}};
  const image={original:true};motion.draw({drawImage(...a){args=a;}},image,'ninja_cherry','walk_attack_ranged','right',4,
    {x:0,y:0,cherryStrideTime:.14},116,116);
  assert.equal(args[0],image);assert.equal(args[1],4*192);
});
test('shared interpolation receives a complete fractional pose without a second lower body',()=>{
 const {window,motion}=fixture();let request,paint;
 window.CHERRIFT_CHERRY_GAIT={get(){throw Error('separate legs must not be drawn');}};
 const ctx={drawImage(...a){paint=a;}};window.CHERRIFT_ANIMATION_SMOOTHING={draw(...args){request=args;args[9].makeFrame(ctx,2);return true;}};
 const image={};motion.draw(ctx,image,'ninja_cherry','walk_attack_ranged','right',4,{x:0,y:0,cherryStrideTime:.14},116,116,4.45);
 assert.equal(request[5],4.45);assert.equal(paint[0],image);assert.equal(paint[1],2*192);assert.equal(request[9].makeLower,undefined);assert.equal(request[9].loop,false);
});

test('missing geometry falls back safely, and browser modules load before skin renderers',()=>{
  const {motion}=fixture();let args;
  motion.draw({drawImage(...a){args=a;}},{},'unknown','idle','down',2,{x:0,y:0},116,116);
  assert.equal(args[1],384);assert.equal(args[7],116);
  const html=readFileSync('index.html','utf8');
  for(const name of ['geometry','gait','motion'])assert.ok(html.indexOf(`src/cherrift_cherry_${name}.js`)<html.indexOf('src/cherrift_base_cherry.js'));
});


test('forward diagonal firing keeps the original face stationary through the entire cast',()=>{
  const {window,context,motion}=fixture();
  vm.runInContext(readFileSync('src/cherrift_cherry_shot_alignment.js','utf8'),context);
  // Independently measured midpoints of the two original eyes, source pixels.
  const eyes=[97.05,120.45,100.8,99.35,119.35,114.85];
  for(const dir of ['down_right','down_left']){
    const positions=[];const oldPositions=[];
    const data=window.CHERRIFT_CHERRY_GEOMETRY.cherry_default.attack[dir];
    for(let frame=0;frame<6;frame++){
      let args;motion.draw({drawImage(...a){args=a;}},{},'cherry_default','attack',dir,frame,{x:400,y:300},110.2,110.2);
      const x=dir==='down_right'?eyes[frame]:193-eyes[frame];
      positions.push(args[5]+x*args[7]/192);
      oldPositions.push(400+(x-data[frame][2])*args[7]/192);
    }
    assert.ok(Math.max(...oldPositions)-Math.min(...oldPositions)>15,'original regression reproduces');
    assert.ok(Math.max(...positions)-Math.min(...positions)<1,'eyes stay within one display pixel');
  }
  for(const [id,states] of Object.entries(window.CHERRIFT_CHERRY_SHOT_ALIGNMENT))for(const [state,dirs] of Object.entries(states)){
    assert.ok(['idle','attack','attack_ranged'].includes(state));
    assert.deepEqual(Object.keys(dirs).sort(),['down_left','down_right']);
    for(const [dir,frames] of Object.entries(dirs)){
      assert.equal(frames.length,window.CHERRIFT_CHERRY_GEOMETRY[id][state][dir].length);
      assert.ok(frames.every(Number.isFinite));
    }
  }
});

