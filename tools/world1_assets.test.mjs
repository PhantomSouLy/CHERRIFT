import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
function fixture(phone=false){
  class Image {complete=true;naturalWidth=256;width=256;}
  const window={CHERRIFT_CONFIG:{worldSize:4200}};
  const c=vm.createContext({window,document:{addEventListener(){}},Image,Math,Map,WeakMap,Number,performance,
    innerWidth:1920,innerHeight:1080,mobile:()=>phone,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
    state:{worldImages:new Map(),patterns:new WeakMap(),fireflySprites:new WeakMap()}});
  vm.runInContext(read('src/cherrift_rework_maps.js'),c);vm.runInContext(read('src/cherrift_world1.js'),c);vm.runInContext(read('src/cherrift_world1_assets.js'),c);vm.runInContext(read('src/cherrift_world2.js'),c);
  const runtime=read('src/cherrift_runtime.js');
  vm.runInContext(runtime.slice(runtime.indexOf('const WORLD_MAPS ='),runtime.indexOf('const ACHIEVEMENTS =')),c);
  vm.runInContext(runtime.slice(runtime.indexOf('function preload('),runtime.indexOf('function hitObstacle(')),c);
  return c;
}
test('World1 catalogue and all chapters resolve to the new art; legacy PNGs are retired',()=>{
  const c=fixture(),pack=c.window.CHERRIFT_WORLD1_ASSETS;
  assert.equal(pack.objects,c.window.CHERRIFT_WORLD1.spec.objects);assert.equal(Object.keys(pack.objects).length,16);
  assert(pack.splashArts.every(src=>src===c.window.CHERRIFT_WORLD1.splash));
  assert.equal(readdirSync(new URL('assets/map/world1/',root)).filter(p=>p.endsWith('.png')).length,0);
  for(const tier of ['low','medium','high'])for(const key of ['ground',...Object.keys(pack.objects)])
    assert(existsSync(new URL(`assets/map/world1/meadow/${tier}/${key}.webp`,root)));
});
test('five World1 chapters use the new generator without device-dependent obstacles',()=>{
  for(const phone of [false,true])for(let chapter=1;chapter<=5;chapter++){
    const c=fixture(phone),game={stage:{id:`world_1_${chapter}`,world:1},save:{settings:{effectQuality:'high'}}};
    c.buildWorld(game,1);assert(game.obstacles.every(o=>o.meadow));assert.equal(game.__cherriftCleanSolidObjects.length,86);
    const snapshot=JSON.stringify(game.obstacles);c.buildWorld(game,1);assert.equal(JSON.stringify(game.obstacles),snapshot);
  }
});
test('new map and compatibility catalogue load before every World1 consumer',()=>{
  const html=read('index.html');assert(html.indexOf('src/cherrift_world1.js')<html.indexOf('src/cherrift_world1_assets.js'));
  for(const consumer of ['cherrift_app.js','cherrift_world_ui.js','cherrift_runtime.js'])assert(html.indexOf('src/cherrift_world1_assets.js')<html.indexOf('src/'+consumer));
});
test('World3–6 retain their own maps and asset paths',()=>{
  for(const phone of [false,true])for(let world=3;world<=6;world++){
    const c=fixture(phone),game={stage:{id:`world_${world}_1`,world}};c.buildWorld(game,world);
    assert(game.obstacles.every(o=>o.worldId===world&&!o.meadow));assert(c.window.CHERRIFT_REWORK_MAPS[world].spec.ground.startsWith(`assets/map/world${world}/`));assert(game.obstacles.length>100);
  }
});
