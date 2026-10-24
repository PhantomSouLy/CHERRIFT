import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const root=new URL('../',import.meta.url);
const source=readFileSync(new URL('src/cherrift_skin_ui.js',root),'utf8');
const manifest=JSON.parse(readFileSync(new URL('assets/ui/skins/cherry_ui_skins/optimized/manifest.json',root),'utf8'));
const ids=['cherry_default','archer_cherry','beastclaw_cherry','fairy_cherry','gunner_cherry','mage_cherry','ninja_cherry','wuxia_sakura_cherry','succubus_cherry','warrior_cherry'];

test('all new UI art resolves to actual budgeted WebP files, including Mage and Sakura Dance',()=>{
 const dom=new JSDOM('<body></body>',{runScripts:'outside-only'});
 try{
  dom.window.eval(source);
  for(const id of ids){
   const assets=dom.window.CHERRIFT_SKIN_UI.assetsForSkin(id);
   for(const key of ['icon','splash','splashAlt','cutout','cutoutAlt','thumbnail']){
    assert(assets[key].endsWith('.webp'),`${id}.${key}`);
    const file=assets[key].split('/').at(-1),entry=manifest.assets.find(a=>a.file===file);
    assert(entry,`${id}.${key} is included in manifest`);
    const bytes=statSync(new URL(assets[key],root)).size;
    assert.equal(bytes,entry.bytes);
    assert(bytes<=({icon:30000,thumbnail:45000,splash:320000,cutout:240000}[entry.role]));
   }
  }
  for(const id of ['cake_deliver_cherry','kimono_cherry','pajama_cherry','school_uniform_cherry','sport_cherry']){
   const assets=dom.window.CHERRIFT_SKIN_UI.assetsForSkin(id);
   assert(assets.splash.startsWith('assets/player/skins/'));
   assert(statSync(new URL(assets.splash,root)).size>0);
   assert(!assets.cutout);
  }
  assert.equal(dom.window.CHERRIFT_SKIN_UI.assetsForSkin('unknown_skin'),null);
 }finally{dom.window.close();}
});

test('the complete source set has two splashes and two transparent variants per Cherry',()=>{
 assert.equal(manifest.assets.length,60);
 for(const name of ['base','archer','beastclaw','fairy','gunner','mage','ninja','sakura_dancer','succubus','warrior']){
  const assets=manifest.assets.filter(a=>a.file.startsWith(name+'_cherry_'));
  assert.equal(assets.length,6,name);
  assert.equal(assets.filter(a=>a.role==='cutout').length,2);
  assert.equal(assets.filter(a=>a.role==='splash').length,2);
 }
});

test('Sakura Dance display name keeps the owned skin and animation identifiers compatible',()=>{
 const app=readFileSync(new URL('src/cherrift_app.js',root),'utf8');
 const catalog=JSON.parse(readFileSync(new URL('supabase/functions/_shared/game_catalog.json',root),'utf8'));
 assert(!app.includes('Wuxia Sakura Cherry'));
 assert.equal(catalog.skins.find(s=>s.id==='wuxia_sakura_cherry').name,'Sakura Dance Cherry');
 assert(app.includes('wuxia_sakura_cherry'));
});
