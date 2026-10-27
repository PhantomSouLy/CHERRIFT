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

test('walk attacks retain the cast frame while their legs follow the independent stride',()=>{
  const {window,motion}=fixture();let gaitArgs,drawArgs;
  window.CHERRIFT_CHERRY_GAIT={get(...args){gaitArgs=args;return {corrected:true};}};
  motion.draw({drawImage(...a){drawArgs=a;}},{original:true},'ninja_cherry','walk_attack_ranged','right',4,
    {x:0,y:0,cherryStrideTime:.14},116,116);
  assert.equal(gaitArgs[3],1,'leg phase');assert.equal(gaitArgs[5],4,'attack pose');assert.equal(drawArgs[0].corrected,true);assert.equal(drawArgs[1],0);
});

test('missing geometry falls back safely, and browser modules load before skin renderers',()=>{
  const {motion}=fixture();let args;
  motion.draw({drawImage(...a){args=a;}},{},'unknown','idle','down',2,{x:0,y:0},116,116);
  assert.equal(args[1],384);assert.equal(args[7],116);
  const html=readFileSync('index.html','utf8');
  for(const name of ['geometry','gait','motion'])assert.ok(html.indexOf(`src/cherrift_cherry_${name}.js`)<html.indexOf('src/cherrift_base_cherry.js'));
});
