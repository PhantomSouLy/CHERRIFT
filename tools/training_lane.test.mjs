import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function fixture(){const window={CHERRIFT_CONFIG:{worldSize:4200}},document={addEventListener(){}};vm.runInNewContext(readFileSync('src/cherrift_rework_maps.js','utf8'),{window,document});return window.CHERRIFT_REWORK_MAPS;}
const flowers=g=>[...g.__reworkMap.chunks.values()].flat();
test('every complete lily sprite stays outside a full-width 900-unit testing lane',()=>{
 const maps=fixture();for(const seed of ['base-walk-check','mobile-preview','diagonal-run','flower-boundaries']){
  const g={stage:{id:'training_test',training:true}};maps[0].build(g,seed);const all=flowers(g);
  assert.ok(all.length>5000,'retain a populated lily field outside the lane');let north=0,south=0;
  for(const o of all){const top=o.y-o.drawH*o.anchor,bottom=o.y+o.drawH*(1-o.anchor);assert.ok(top>450||bottom< -450,`overhanging petals at ${o.x},${o.y}`);if(o.y<0)north++;else south++;}
  assert.ok(north>2000&&south>2000);
 }
});
test('the lane keeps deterministic placement and preserves the dummy and player',()=>{
 const maps=fixture(),dummy={x:150,y:0,hp:Infinity},player={x:0,y:0,skin:'cherry_default'},g={stage:{id:'training_test',training:true},player,trainingDummiesV094:[dummy]};
 maps[0].build(g,'same-run');const first=JSON.stringify(flowers(g).map(o=>[o.x,o.y,o.objectKey]));maps[0].build(g,'same-run');assert.equal(JSON.stringify(flowers(g).map(o=>[o.x,o.y,o.objectKey])),first);
 assert.equal(g.player,player);assert.equal(g.trainingDummiesV094[0],dummy);assert.equal(dummy.hp,Infinity);
});
test('the training-only lane does not remove objects from the other worlds',()=>{
 const maps=fixture();for(const world of [3,4,5,6]){const g={stage:{id:'world-'+world,world}};maps[world].build(g,'other-world');assert.equal(flowers(g).length,0);assert.ok(g.obstacles.some(o=>Math.abs(o.y)<450),'normal objects can still occupy that band');}
});
