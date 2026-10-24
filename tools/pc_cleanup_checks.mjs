import assert from 'node:assert/strict';

// Runs against the complete application and real MutationObservers in the boot
// harness, rather than a presentation-only DOM fixture.
export async function checkPcMenuCleanup(window,fullTour=false,beginPhase=()=>{}) {
  const document=window.document, q=selector=>document.querySelector(selector);
  const frame=()=>new Promise(resolve=>window.requestAnimationFrame(resolve));
  for(const selector of ['#inventory','#gearDetails','#mobileGearV053','#mobileGearV0552','#v052Achievements','#profileV055','#statisticsV055','#collectionV055','#bestiaryV055','#shopV055','#worldsV094','.chapter-select-v0933']) {
    assert.equal(q(selector),null,`retired menu never exists: ${selector}`);
  }
  beginPhase('gear');
  window.UI.open('gear');
  window.UI.renderGear();
  assert(q('#gear .cg-chrome'),'PC Gear is decorated synchronously');
  const stage=q('#gearStageV0560'),before=stage.getAttribute('style');
  for(let i=0;i<3;i++)window.CHERRIFT_V060.ensureGearLayout();
  assert.equal(stage.getAttribute('style'),before,'legacy layout cannot write PC coordinates');
  for(let i=0;i<2;i++){window.UI.refreshMenu();await frame();}
  assert.equal(q('#gear .cg-chrome'),q('#gear').querySelectorAll('.cg-chrome')[0]);
  assert.equal(q('#gear').querySelectorAll('.cg-chrome').length,1);
  assert.equal(stage.style.getPropertyValue('min-height'),'','deferred refresh cannot resurrect old layout');

  beginPhase('achievements');
  window.UI.open('achievements');
  assert(q('#achievements .tg-chrome'),'PC Achievements is decorated before UI.open returns');
  const shell=q('#achievements .cr-ach-shell'),grid=q('#achievements .cr-ach-grid'),card=grid.firstElementChild;
  const filter=q('[data-tg-status]');
  filter.value='ready';filter.dispatchEvent(new window.Event('change',{bubbles:true}));
  grid.scrollTop=90;
  const rewards=()=>JSON.stringify(Object.fromEntries(['coins','bloomGems','chests','inventory','equipped','fixAchievementsClaimed','unlockedThemes'].map(key=>[key,window.UI.save[key]])));
  const saveBefore=rewards();
  for(let i=0;i<3;i++){window.UI.refreshMenu();await frame();}
  assert.equal(q('#achievements .cr-ach-shell'),shell,'unchanged refresh retains shell');
  assert.equal(q('#achievements .cr-ach-grid'),grid,'unchanged refresh retains grid and scroll');
  assert.equal(grid.firstElementChild,card,'unchanged refresh retains achievement cards');
  assert.equal(q('[data-tg-status]'),filter,'unchanged refresh retains filter focus and value');
  assert.equal(filter.value,'ready');
  assert.equal(grid.scrollTop,90);
  assert.equal(rewards(),saveBefore,'achievement refresh does not grant rewards');
  assert.equal(q('#achievements').querySelectorAll('.tg-chrome').length,1);
  if(fullTour){
    for(const [route,bodyClass] of [
      ['settings','crystal-settings'],['profileV082','crystal-profile'],
      ['mailV063','crystal-mail'],['collectionV082','rift-gallery'],
      ['shopV082','blossom-shop'],['dailyQuests','blossom-missions'],
      ['weeklyV082','blossom-missions'],['loginRewards','crystal-login'],
      ['socialV082','crystal-social'],['gachaV082','blossom-gacha'],
      ['skins','sakura-skins'],['playerUpgrade','celestial-upgrade']
    ]){
      beginPhase(route);
      window.UI.open(route);
      for(let i=0;i<4&&!document.body.classList.contains(bodyClass);i++)await frame();
      assert(document.body.classList.contains(bodyClass),`native route activates PC rework: ${route}`);
    }
  }
  window.UI.open('menu');await frame();
}
