import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {applyGameAction,prepareSave,serverPower,catalog} from '../supabase/functions/_shared/gameplay.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
function server() {
  const c=vm.createContext({console,Date,crypto,TextEncoder,structuredClone,applyGameAction,prepareSave,serverPower,catalog,
    createClient:()=>({}),Deno:{env:{get:()=>''},serve(){}},Request,Response,Headers});
  const source=stripTypeScriptTypes(read('supabase/functions/player-api/index.ts'),{mode:'transform'}).replace(/^import .*;\s*$/gm,'');
  vm.runInContext(source+'\nglobalThis.testApi={sanitizeProgressSave,starterSave};',c);
  const user={id:'11111111-1111-4111-8111-111111111111',user_metadata:{}};
  return {api:c.testApi,user,base:()=>prepareSave(c.testApi.starterSave(user))};
}
test('Head GM equips Ninja through the actual server sanitizer; acknowledgements and reload preserve selection without granting ownership',()=>{
  const f=server(),current=f.base();current.ownedTitles=['head_gm'];current.profile.activeTitle='head_gm';
  const value=clone(current);value.selectedSkin='ninja_cherry';value.selectedStageId='world_6_5';
  // Simulate client-only GM preview additions. They must never become owned progress.
  value.unlockedSkins=catalog.skins.map(s=>s.id);value.unlockedStages=catalog.stages.map(s=>s.id);
  value.prebeta.gmAccessActive=true;
  let next=f.api.sanitizeProgressSave(value,current,f.user);
  for(let i=0;i<3;i++) {
    assert.equal(next.selectedSkin,'ninja_cherry');assert.equal(next.selectedStageId,'world_6_5');
    assert.deepEqual(Array.from(next.unlockedSkins),['cherry_default']);
    assert.deepEqual(Array.from(next.unlockedStages),['world_1_1']);
    next=f.api.sanitizeProgressSave(clone(next),clone(next),f.user);
  }
  const revoked={...clone(next),profile:{...next.profile,activeTitle:''}};
  const final=f.api.sanitizeProgressSave(revoked,next,f.user);
  assert.equal(final.selectedSkin,'cherry_default');assert.equal(final.selectedStageId,'world_1_1');
});
test('ordinary owners retain Ninja; forged GM rights and unknown IDs cannot equip locked content',()=>{
  const f=server(),current=f.base(),forged=clone(current);
  forged.profile.activeTitle='head_gm';forged.ownedTitles=['head_gm'];forged.prebeta.gmAccessActive=true;
  forged.unlockedSkins.push('ninja_cherry');forged.selectedSkin='ninja_cherry';forged.selectedStageId='world_6_5';
  const denied=f.api.sanitizeProgressSave(forged,current,f.user);
  assert.equal(denied.selectedSkin,'cherry_default');assert.equal(denied.selectedStageId,'world_1_1');
  current.unlockedSkins.push('ninja_cherry');
  assert.equal(f.api.sanitizeProgressSave(forged,current,f.user).selectedSkin,'ninja_cherry');
  current.ownedTitles=['gm'];current.profile.activeTitle='gm';forged.selectedSkin='unknown_skin';
  assert.equal(f.api.sanitizeProgressSave(forged,current,f.user).selectedSkin,'cherry_default');
});
test('only active server-owned GM titles bypass world gates; GM training remains free and rewardless',()=>{
  const f=server(),base=f.base();
  const run=(s,id)=>applyGameAction(s,'start_run',{stage_id:id},{now:Date.now(),id:()=>crypto.randomUUID()});
  assert.throws(()=>run(base,'world_6_5'),/stage_locked/);
  base.ownedTitles=['head_gm'];assert.throws(()=>run(base,'world_6_5'),/stage_locked/);
  base.profile.activeTitle='head_gm';
  const started=run(base,'world_6_5');assert.equal(started.save.security.online.run.stageId,'world_6_5');
  const training=run(base,'training_test');assert.equal(training.save.energy,base.energy);assert.deepEqual(training.rewards,[]);
});
function mapFixture() {
  const dom=new JSDOM('<body></body>',{runScripts:'outside-only'}),w=dom.window,requests=[],calls=[];
  w.CHERRIFT_CONFIG={worldSize:4200};
  w.Image=class{width=384;height=384;set src(v){this._src=v;requests.push(v);queueMicrotask(()=>this.onload?.());}get src(){return this._src;}decode(){return Promise.resolve();}};
  const c=new Proxy({createPattern:()=>({setTransform:m=>calls.push(['pattern',m.a])})},{get:(o,k)=>k in o?o[k]:(...a)=>calls.push([k,...a])});
  w.HTMLCanvasElement.prototype.getContext=()=>c;w.eval(read('src/cherrift_rework_maps.js'));
  const g={stage:{id:'world_3_1',world:3},save:{settings:{effectQuality:'medium'}},camera:{x:0,y:0},zoom:1.14,w:390,h:844,
    player:{x:0,y:0,r:18},enemies:[],pickups:[],bullets:[],effects:[],drawObj(_c,o){calls.push(['actor',o]);},resize(){}};
  return {dom,w,g,c,requests,calls};
}
test('World 3–6 and training use existing tier assets and exact catalogue geometry',async()=>{
  const f=mapFixture();try {
    for(const [world,map] of Object.entries(f.w.CHERRIFT_REWORK_MAPS)) {
      for(const tier of ['low','medium','high'])for(const [key,s] of Object.entries(map.spec.objects)) {
        assert(existsSync(new URL('../'+s.src.replace('/high/','/'+tier+'/'),import.meta.url)),world+' '+key);
      }
      assert(existsSync(new URL('../'+map.splash,import.meta.url)));
      const root=map.spec.ground.split('/high/')[0],cat=JSON.parse(read(root+'/catalog.json'));
      for(const [key,v] of Object.entries(cat.objects)) {
        const actual=map.spec.objects[key];assert.equal(actual.w,v.logicalWidth);assert.equal(actual.h,v.logicalHeight);
        assert.equal(actual.anchor,v.anchor);assert.equal(actual.solid,v.solid);assert.equal(actual.rx,v.rx);assert.equal(actual.ry,v.ry);
      }
      f.g.stage={id:Number(world)?'world_'+world+'_1':'training_test',world:Number(world),training:Number(world)===0};
      map.build(f.g,'stable');const snapshot=JSON.stringify(f.g.obstacles);
      for(const tier of ['low','medium','high']) {
        f.g.save.settings.effectQuality=tier;await map.selectArt(f.g);
        assert.equal(f.g.__reworkArt.tier,tier);assert.equal(JSON.stringify(f.g.obstacles),snapshot);
        assert(f.requests.at(-1).includes('/'+tier+'/'));map.drawWorld(f.g,f.c);
      }
      assert(f.g.obstacles.length>100);assert(f.calls.some(c=>c[0]==='drawImage'));
    }
  }finally{f.dom.window.close();}
});
test('training has a flower-free dummy clearing and dense flowers elsewhere; chunk culling excludes distant cells',()=>{
  const f=mapFixture();try {
    const map=f.w.CHERRIFT_REWORK_MAPS[0];f.g.stage={id:'training_test',world:0,training:true};map.build(f.g,'lilies');
    assert(f.g.__reworkMap.flowerCount>16000);assert(f.g.obstacles.length<300);
    const visible=map.visibleFlowers(f.g);assert(visible.length>300);assert(visible.length<f.g.__reworkMap.flowerCount/8);
    assert(visible.some(o=>Math.hypot(o.x-150,o.y)>300));
    for(const flowers of f.g.__reworkMap.chunks.values())for(const o of flowers) {
      const left=o.x-o.drawW/2,right=o.x+o.drawW/2,top=o.y-o.drawH*o.anchor,bottom=top+o.drawH;
      const nearestX=Math.max(left,Math.min(150,right)),nearestY=Math.max(top,Math.min(0,bottom));
      assert(Math.hypot(nearestX-150,nearestY)>=220,'even the sprite edges stay outside the dummy clearing');
    }assert(visible.every(o=>o.flower&&!o.solid));
    f.g.camera={x:1700,y:1700};assert(map.visibleFlowers(f.g).length>100);
    const snap=JSON.stringify([...f.g.__reworkMap.chunks]);map.build(f.g,'lilies');assert.equal(JSON.stringify([...f.g.__reworkMap.chunks]),snap);
  }finally{f.dom.window.close();}
});
test('preparing a new world after another run loads target art before stage changes; red arch opening stays walkable',async()=>{
  const f=mapFixture();try {
    const map=f.w.CHERRIFT_REWORK_MAPS[4];await map.prepare(f.g);assert.equal(f.g.__reworkArt.world,4);
    f.g.stage={id:'world_4_1',world:4};map.build(f.g,'arch');
    const arch=f.g.obstacles.find(o=>o.objectKey==='arch');assert(arch);
    f.g.__cherriftCleanSolidObjects=[arch];
    assert.equal(map.collides(f.g,arch.x,arch.y),false);
    assert.equal(map.collides(f.g,arch.x+arch.drawW*.34,arch.y),true);
  }finally{f.dom.window.close();}
});
