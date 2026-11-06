import test from'node:test';import assert from'node:assert/strict';import{fixture}from'./helpers/sport_gpu_order_fixture.mjs';
test('game script order compiles the Sport shader installed AFTER shared smoothing loaded',()=>{
 const f=fixture();assert.equal(f.programs.length,0);f.loadSport();f.sample('right',0);
 assert.equal(f.context.window.CHERRIFT_ANIMATION_SMOOTHING.stats().backend,'webgl');
 assert.match(f.fragment(),/sportSideDisplacement/);assert.match(f.fragment(),/stepRadius < -100\.0/);
 assert.ok(f.draws.at(-1).uniforms.stepRadius<-100);
});
test('an early menu/preload GPU draw is rebuilt when the Sport modifier arrives',()=>{
 const f=fixture();f.sample('right',0);assert.equal(f.programs.length,1);assert.doesNotMatch(f.fragment(),/sportSideDisplacement/);
 f.loadSport();f.sample('right',0);assert.equal(f.programs.length,2);assert.match(f.fragment(),/sportSideDisplacement/);assert.equal(f.deleted.length,2);
 f.sample('right',3);assert.equal(f.programs.length,2,'No recompilation every frame');
 const a=f.draws.at(-2).uniforms.stride,b=f.draws.at(-1).uniforms.stride;assert.ok(a.some((v,i)=>Math.abs(v-b[i])>1));
});
test('an old GPU canvas context-loss event cannot replace the newly compiled backend',()=>{
 const f=fixture();f.sample();const old=f.canvases.find(c=>c.handlers.webglcontextlost);f.loadSport();f.sample();old.handlers.webglcontextlost({preventDefault(){}});
 assert.equal(f.context.window.CHERRIFT_ANIMATION_SMOOTHING.stats().backend,'webgl');f.sample('left',1);assert.equal(f.programs.length,2);
});
