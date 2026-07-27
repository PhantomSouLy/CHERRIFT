import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentTypes = {
  ".css":"text/css; charset=utf-8",
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".wav":"audio/wav"
};

function safeFile(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  const requested = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
  return requested === root || requested.startsWith(`${root}${path.sep}`) ? requested : null;
}

const server = createServer(async (request, response) => {
  const file = safeFile(request.url || "/");
  if (!file) return response.writeHead(403).end("Forbidden");
  try {
    const info = await stat(file);
    const target = info.isDirectory() ? path.join(file, "index.html") : file;
    response.writeHead(200, {
      "content-type":contentTypes[path.extname(target).toLowerCase()] || "application/octet-stream",
      "cache-control":"no-store"
    });
    response.end(await readFile(target));
  } catch (_) {
    response.writeHead(404).end("Not found");
  }
});

await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/`;

function canvasContext() {
  const gradient = {addColorStop() {}};
  const values = {
    createLinearGradient:() => gradient,
    createRadialGradient:() => gradient,
    createPattern:() => ({setTransform() {}}),
    getImageData:(_x,_y,width=1,height=1) => ({data:new Uint8ClampedArray(Math.max(4,width*height*4)),width,height}),
    createImageData:(width=1,height=1) => ({data:new Uint8ClampedArray(Math.max(4,width*height*4)),width,height}),
    measureText:text => ({width:String(text).length*8}),
    isPointInPath:() => false,
    isPointInStroke:() => false
  };
  return new Proxy(values, {
    get(target, property) { return property in target ? target[property] : () => {}; },
    set(target, property, value) { target[property] = value; return true; }
  });
}

function installBrowserStubs(window, width, height) {
  window.__cherriftTitleWrites=[];
  const titleDescriptor=Object.getOwnPropertyDescriptor(window.Document.prototype,"title");
  if(titleDescriptor?.get&&titleDescriptor?.set){
    Object.defineProperty(window.Document.prototype,"title",{
      configurable:true,
      get(){return titleDescriptor.get.call(this);},
      set(value){
        window.__cherriftTitleWrites.push(String(value));
        titleDescriptor.set.call(this,value);
      }
    });
  }
  Object.defineProperties(window, {
    innerWidth:{configurable:true,value:width},
    innerHeight:{configurable:true,value:height},
    devicePixelRatio:{configurable:true,value:1},
    visualViewport:{configurable:true,value:{width,height,addEventListener() {},removeEventListener() {}}}
  });
  window.matchMedia = query => {
    const max=query.match(/max-width\s*:\s*(\d+)px/i),min=query.match(/min-width\s*:\s*(\d+)px/i);
    const portrait=query.includes("orientation:portrait"),landscape=query.includes("orientation:landscape");
    const matches=(!max||width<=Number(max[1]))&&(!min||width>=Number(min[1]))&&(!portrait||height>=width)&&(!landscape||width>height)&&!query.includes("prefers-reduced-motion");
    return {matches,media:query,onchange:null,addListener() {},removeListener() {},addEventListener() {},removeEventListener() {},dispatchEvent:()=>true};
  };

  class FakeImage extends window.EventTarget {
    constructor(){super();this.width=192;this.height=192;this.naturalWidth=192;this.naturalHeight=192;this.complete=false;this.onload=null;this.onerror=null;this.decoding="async";this._src="";}
    set src(value){
      this._src=String(value);
      const strip=this._src.match(/_(idle|walk|ranged|skill|attack|melee|dash)_(?:down|up|left|right)\\.png/i);
      if(strip){const frames=strip[1]==="idle"?4:6;this.width=this.naturalWidth=192*frames;this.height=this.naturalHeight=192;}
      if(this._src.includes("assets/effects/warrior_cherry/")){this.width=this.naturalWidth=1448;this.height=this.naturalHeight=1086;}
      window.setTimeout(()=>{this.complete=true;this.onload?.(new window.Event("load"));this.dispatchEvent(new window.Event("load"));},0);
    }
    get src(){return this._src;}
    decode(){return Promise.resolve();}
  }
  window.Image=FakeImage;
  window.Audio=class {constructor(source=""){this.src=source;this.volume=1;this.currentTime=0;}load(){}play(){return Promise.resolve();}pause(){}cloneNode(){return new window.Audio(this.src);}};
  window.HTMLCanvasElement.prototype.getContext=function(){const context=canvasContext();context.canvas=this;return context;};
  window.HTMLCanvasElement.prototype.toDataURL=()=> "data:image/png;base64,";
  window.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:width,bottom:height,width,height,toJSON(){return this;}});
  window.Element.prototype.scrollIntoView ||= () => {};
  window.Element.prototype.scrollBy ||= () => {};
  window.Element.prototype.animate ||= () => ({cancel(){},finished:Promise.resolve()});
  window.HTMLElement.prototype.requestFullscreen ||= () => Promise.resolve();
  window.document.exitFullscreen ||= () => Promise.resolve();
  window.navigator.vibrate ||= () => true;
  window.requestIdleCallback ||= callback => window.setTimeout(()=>callback({didTimeout:false,timeRemaining:()=>20}),0);
  window.cancelIdleCallback ||= handle => window.clearTimeout(handle);
  window.ResizeObserver ||= class {observe(){}unobserve(){}disconnect(){}};
  Object.defineProperty(window.navigator,"clipboard",{configurable:true,value:{writeText:async()=>{}}});

  const returning = new URL(window.location.href).searchParams.get("smoke") === "returning-session";
  window.__authSession = returning ? {
    user:{id:"returning-user",user_metadata:{full_name:"Returning Cherry"},identities:[{provider:"discord",identity_data:{provider_id:"987654321"}}]}
  } : null;
  window.__authStateCallback=null;
  window.__CHERRIFT_SUPABASE_FACTORY__=(url,publishableKey,options)=>({
    auth:{
      async getSession(){return {data:{session:window.__authSession},error:null};},
      async signInWithOAuth(request){return {data:{provider:request.provider,url:"https://discord.test/oauth"},error:null};},
      onAuthStateChange(callback){window.__authStateCallback=callback;window.setTimeout(()=>callback("INITIAL_SESSION",window.__authSession),0);return {data:{subscription:{unsubscribe(){}}}};},
      async signOut(){window.__authSession=null;window.__authStateCallback?.("SIGNED_OUT",null);return {error:null};}
    }
  });
}

async function waitFor(check, message, timeout=18000) {
  const start=Date.now();
  while(Date.now()-start<timeout){
    const value=check();
    if(value)return value;
    await new Promise(resolve=>setTimeout(resolve,25));
  }
  throw new Error(`Timed out: ${message}`);
}

async function loadApp(name,width,height){
  const errors=[];
  const virtualConsole=new VirtualConsole();
  virtualConsole.on("jsdomError",error=>errors.push(`jsdom: ${error.message}`));
  virtualConsole.on("error",(...values)=>errors.push(values.map(String).join(" ")));
  const dom=await JSDOM.fromURL(`${baseUrl}?smoke=${name}`,{
    runScripts:"dangerously",resources:"usable",pretendToBeVisual:true,virtualConsole,
    beforeParse(window){installBrowserStubs(window,width,height);}
  });
  await waitFor(()=>dom.window.CHERRIFT_V091&&dom.window.UI?.save&&dom.window.UI?.game,`${name} startup`);
  return {dom,window:dom.window,errors};
}

function click(window,element,label){
  assert.ok(element,`${label}: control exists`);
  element.dispatchEvent(new window.MouseEvent("click",{bubbles:true,cancelable:true}));
}

function assertSkin(window,skinId){
  const config=window.CHERRIFT_CONFIG.player.skins[skinId];
  const data=window.CHERRIFT_DATA.skins.find(skin=>skin.id===skinId);
  assert.ok(config,`${skinId}: runtime config`);
  assert.ok(data?.icon&&data?.splash,`${skinId}: icon and splash`);
  for(const stateName of ["idle","walk","attack","skill"]){
    const state=config.states[stateName];
    assert.ok(state,`${skinId}: ${stateName} state`);
    assert.equal(Object.keys(state.dirs).length,4,`${skinId}: ${stateName} has four directions`);
  }
}

function assertCompleteGearLayout(window,name){
  const stage=window.document.getElementById("gearStageV0560");
  assert.ok(stage?.classList.contains("gear-mmorp-layout-v090"),`${name}: MMORPG Gear layout is active`);
  const slots=Array.from(stage.querySelectorAll("[data-v0560-slot]"));
  const expected=["Helmet","Necklace","Armor","Gloves","Weapon","Ring","Boots"];
  const areas={Helmet:"helmet",Armor:"armor",Weapon:"weapon",Ring:"ring",Necklace:"necklace",Gloves:"gloves",Boots:"boots"};
  assert.equal(slots.length,expected.length,`${name}: all seven Gear slots exist`);
  assert.deepEqual(slots.map(slot=>slot.dataset.v0560Slot).sort(),expected.slice().sort(),`${name}: canonical Gear slot set`);
  assert.equal(new Set(slots.map(slot=>slot.dataset.v0560Slot)).size,expected.length,`${name}: Gear slots are unique`);
  for(const slot of slots){
    const name=slot.dataset.v0560Slot;
    assert.equal(slot.dataset.v090GearArea,areas[name],`${name}: fixed MMORPG area`);
    assert.equal(slot.style.getPropertyPriority("grid-area"),"important",`${name}: area cannot be overridden`);
    assert.equal(slot.style.getPropertyValue("position"),"relative",`${name}: slot participates in the Gear grid`);
  }
}

async function exercise(name,width,height){
  const {dom,window,errors}=await loadApp(name,width,height);
  const {document,UI}=window;
  try{
    await waitFor(()=>window.CHERRIFT_AUTH.getState().gateVisible,`${name} auth gate`);
    click(window,document.getElementById("authGuestV064"),`${name} guest login`);
    await waitFor(()=>window.CHERRIFT_AUTH.getState().mode==="guest",`${name} guest mode`);

    assert.equal(document.body.classList.contains("v062-startup-failed"),false,`${name}: no startup failure`);
    await waitFor(()=>/0\.9\.1/.test(document.title),`${name} current title`);
    assert.match(document.title,/0\.9\.1/,`${name}: current title`);
    assert.deepEqual(window.__cherriftTitleWrites.filter(title=>/\bv0\.[0-8](?:\.\d+)?\b/.test(title)),[],`${name}: title never shows a legacy version`);
    assert.doesNotMatch(document.body.textContent,/\bv0\.[0-8](?:\.\d+)?\b/,`${name}: no legacy version is visible anywhere`);
    for(const version of ["085","086","087","088","089","090","091"])assert.ok(window[`CHERRIFT_V${version}`],`${name}: v0.${version.slice(1)} patch`);
    assert.equal(window.CHERRIFT_DATA.skins.length,14,`${name}: all fourteen Cherry skins`);
    assertSkin(window,"mage_cherry");
    assertSkin(window,"archer_cherry");
    const commonSkins=["cake_deliver_cherry","kimono_cherry","pajama_cherry","school_uniform_cherry","sport_cherry"];
    for(const skinId of commonSkins){
      assertSkin(window,skinId);
      assert.ok(UI.save.unlockedSkins.includes(skinId),`${name}: ${skinId} unlocked`);
    }
    assert.ok(UI.save.unlockedSkins.includes("mage_cherry")&&UI.save.unlockedSkins.includes("archer_cherry"),`${name}: Rare skins available`);
    assert.equal(window.CherriftGame.prototype.drawWorld.__v091BoundaryFog,true,`${name}: map boundary fog active`);
    assert.equal(document.querySelectorAll("#globalMobileNavV052 > button").length,5,`${name}: five mobile destinations`);
    assert.equal(document.querySelectorAll('#globalMobileNavV052 [data-v082-open="worlds"]').length,1,`${name}: no duplicate Play`);

    UI.open("menu");
    await waitFor(()=>document.querySelectorAll("#menuToolsV082 [data-v082-menu-tool]").length===4,`${name} menu tools`);
    click(window,document.querySelector('#menuToolsV082 [data-v082-menu-tool="feedback"]'),`${name} feedback tool`);
    await waitFor(()=>!document.getElementById("supportV063")?.classList.contains("hidden"),`${name} feedback panel`);
    assert.ok(document.querySelector('#supportV063 [data-v063-support-type="feedback"]')?.classList.contains("active"),`${name}: feedback tab active`);
    UI.open("menu");
    click(window,document.querySelector('#menuToolsV082 [data-v082-menu-tool="bug"]'),`${name} bug tool`);
    await waitFor(()=>!document.getElementById("supportV063")?.classList.contains("hidden"),`${name} bug panel`);
    await waitFor(()=>document.querySelector('#supportV063 [data-v063-support-type="bug"]')?.classList.contains("active"),`${name} bug tab`);
    UI.open("menu");
    click(window,document.querySelector('#menuToolsV082 [data-v082-menu-tool="mail"]'),`${name} mail tool`);
    await waitFor(()=>!document.getElementById("mailV063")?.classList.contains("hidden"),`${name} mail panel`);
    UI.open("menu");
    click(window,document.querySelector('#menuToolsV082 [data-v082-menu-tool="settings"]'),`${name} settings tool`);
    await waitFor(()=>!document.getElementById("settings")?.classList.contains("hidden"),`${name} settings panel`);

    UI.open("gear");
    assertCompleteGearLayout(window,name);

    UI.open("settings");
    for(const setting of ["effectQualityV085","cameraMotionV085","screenShakeV085","combatSoundsV085"])assert.ok(document.getElementById(setting),`${name}: ${setting} setting`);

    UI.open("skins");
    await waitFor(()=>document.getElementById("skinSplash")?.style.backgroundImage.includes("assets/player/skins"),`${name} skin artwork`);
    UI.skinIndex=window.CHERRIFT_DATA.skins.findIndex(skin=>skin.id==="archer_cherry");
    UI.renderSkinCarousel();
    assert.equal(document.getElementById("skinSplash")?.dataset.skinId,"archer_cherry",`${name}: Archer splash framing`);
    assert.match(document.getElementById("skinSplash")?.style.backgroundImage,/090-hf1/,`${name}: refreshed Archer splash`);
    UI.skinIndex=window.CHERRIFT_DATA.skins.findIndex(skin=>skin.id==="cake_deliver_cherry");
    UI.renderSkinCarousel();
    assert.equal(document.getElementById("skinSplash")?.dataset.skinId,"cake_deliver_cherry",`${name}: Cake Deliver splash framing`);
    assert.match(document.getElementById("skinSplash")?.style.backgroundImage,/091/,`${name}: Cake Deliver splash cache`);
    assert.ok(document.querySelector("#skinBonusV055 .role-hybrid"),`${name}: Hybrid role card`);
    UI.open("libraryV0551");
    click(window,document.querySelector('[data-library-tab="skins"]'),`${name} collection skins`);
    window.CHERRIFT_V084.renderCollection();
    await waitFor(()=>document.querySelectorAll("#libraryBodyV0551 .collection-card-v084").length>0,`${name} collection cards`);
    assert.equal(document.querySelectorAll("#libraryBodyV0551 .collection-card-v084").length,14,`${name}: all skin collection cards`);
    assert.ok(document.querySelector('[data-v084-skin="mage_cherry"] img'),`${name}: Mage collection icon`);
    assert.ok(document.querySelector('[data-v084-skin="archer_cherry"] img'),`${name}: Archer collection icon`);
    assert.ok(document.querySelector('[data-v084-skin="sport_cherry"] img'),`${name}: Sport collection splash icon`);

    UI.save.selectedSkin="archer_cherry";
    UI.save.selectedStageId="world_1_1";
    window.CherriftStorage.save(UI.save);
    await UI.game.start();
    assert.equal(UI.game.player.skin,"archer_cherry",`${name}: Archer starts`);
    assert.ok(UI.game.player.crit>=.15,`${name}: Archer passive crit`);
    const archerEnemy={x:UI.game.player.x+130,y:UI.game.player.y,r:20,hp:500,maxHp:500,speed:0,xp:1,dead:false};
    UI.game.enemies=[archerEnemy];
    UI.game.player.skillTimer=0;
    UI.game.skill();
    assert.equal(UI.game.bullets.filter(bullet=>bullet.customV087&&bullet.style==="archer_arrow_skill").length,4,`${name}: Four Arrow Shot`);
    UI.game.drawWorld(UI.game.ctx);
    UI.game.updateBullets(.016);

    UI.quit();
    await new Promise(resolve=>setTimeout(resolve,700));
    UI.save.selectedSkin="mage_cherry";
    window.CherriftStorage.save(UI.save);
    await UI.game.start();
    assert.equal(UI.game.player.skin,"mage_cherry",`${name}: Mage starts`);
    assert.ok(UI.game.player.regen>=UI.game.player.maxHp*.005,`${name}: Mage recovery passive`);
    const mageEnemy={x:UI.game.player.x+130,y:UI.game.player.y,r:20,hp:1000,maxHp:1000,speed:0,xp:1,dead:false};
    UI.game.enemies=[mageEnemy];
    UI.game.player.skillTimer=0;
    UI.game.skill();
    const mageOrbs=UI.game.bullets.filter(bullet=>bullet.customV087&&bullet.style==="mage_orb_skill");
    assert.equal(mageOrbs.length,5,`${name}: Magical Shot has five orbs`);
    assert.ok(mageOrbs.every(bullet=>bullet.target===mageEnemy),`${name}: one enemy receives all five orbs`);
    assert.ok(UI.game.obstacles.some(obstacle=>obstacle.v086Decor),`${name}: World 1 remaster decor`);
    UI.game.player.moving=true;
    UI.game.update(.016);
    assert.ok(Number.isFinite(UI.game.__cameraZoomV085),`${name}: dynamic camera zoom`);
    UI.game.drawWorld(UI.game.ctx);
    assert.match(window.CHERRIFT_V089.summaryMarkup(UI.game),/Damage/,`${name}: run summary`);

    const bossType=UI.game.stage?.boss;
    if(bossType){
      const before=UI.game.enemies.length;
      UI.game.spawnEnemy(bossType,true);
      const boss=UI.game.enemies.at(-1);
      assert.ok(UI.game.enemies.length>before&&boss.isBoss,`${name}: boss spawn`);
      assert.ok(Number.isFinite(boss.__bossAbilityV088),`${name}: boss ability timer`);
    }

    if(name==="desktop"){
      async function startSkin(skinId){
        UI.quit();
        await new Promise(resolve=>setTimeout(resolve,700));
        UI.save.selectedSkin=skinId;
        window.CherriftStorage.save(UI.save);
        await UI.game.start();
        return UI.game.player;
      }

      const hybrid=await startSkin("cake_deliver_cherry");
      assert.equal(hybrid.commonArchetype,"hybrid","desktop: Cake Deliver is Hybrid");
      const hybridEnemy={x:hybrid.x+90,y:hybrid.y,r:20,hp:500,maxHp:500,speed:0,xp:1,dead:false};
      UI.game.enemies=[hybridEnemy];
      const hybridStartX=hybridEnemy.x;
      UI.game.skill();
      assert.ok(hybridEnemy.hp<500&&hybridEnemy.x>hybridStartX,"desktop: Pink Burst damages and knocks back");
      assert.ok(hybrid.commonSpeedBuffTimer>.9,"desktop: Hybrid movement buff");

      const support=await startSkin("kimono_cherry");
      support.hp=support.maxHp*.20;
      UI.game.skill();
      assert.ok(support.hp>=support.maxHp*.59,"desktop: Support restores 40% max HP");
      assert.ok(support.commonSpeedBuffTimer>1.9,"desktop: Support movement buff");

      const defensive=await startSkin("pajama_cherry");
      defensive.hp=defensive.maxHp*.50;
      UI.game.skill();
      assert.ok(defensive.hp>=defensive.maxHp*.59,"desktop: Defensive restores 10% max HP");
      assert.ok(defensive.commonShieldTimer>1.9&&defensive.invuln>=1.9,"desktop: Defensive shield blocks damage");

      const succubus=await startSkin("succubus_cherry");
      UI.game.player.skillTimer=0;
      UI.game.skill();
      assert.ok(UI.game.effects.some(effect=>effect.type==="succubusReleaseV091"),"desktop: Succubus release VFX");
      for(const key of ["succubus_claw","succubus_core","succubus_burst","succubus_wisp","succubus_hit","succubus_siphon","succubus_shield"]){
        assert.ok(UI.game.assets.get(key),`desktop: ${key} loaded`);
      }
      assert.ok(UI.game.assets.get("wuxia_skill_sheet"),"desktop: Wuxia animated skill VFX loaded");
      UI.game.drawWorld(UI.game.ctx);
    }

    if(width<=820){
      assert.equal(document.body.classList.contains("v090-mobile"),true,`${name}: mobile mode`);
      assert.ok(document.getElementById("mobileMenuV082"),`${name}: mobile drawer`);
      assert.equal(document.querySelectorAll(".mobile-menu-grid-v082 > button").length,10,`${name}: compact More destinations`);
      assert.equal(document.querySelectorAll(".mobile-nav-v090 > button").length,5,`${name}: stable bottom nav`);
    }

    const meaningful=errors.filter(error=>!/Not implemented: HTMLCanvasElement|Could not load link/i.test(error));
    assert.deepEqual(meaningful,[],`${name}: no runtime errors`);
    return {name,viewport:`${width}x${height}`,skins:window.CHERRIFT_DATA.skins.length};
  } finally {
    dom.window.close();
  }
}

async function exerciseReturningSession(){
  const {dom,window,errors}=await loadApp("returning-session",1280,760);
  try{
    await waitFor(()=>window.CHERRIFT_AUTH.getState().mode==="discord","returning session");
    assert.equal(window.CHERRIFT_AUTH.getState().gateVisible,false,"returning session: gate skipped");
    assert.equal(window.CHERRIFT_AUTH.getState().account?.discordId,"987654321","returning session: identity restored");
    await waitFor(()=>/0\.9\.1/.test(window.document.title),"returning session current version");
    assert.match(window.document.title,/0\.9\.1/,"returning session: current version");
    const meaningful=errors.filter(error=>!/Not implemented: HTMLCanvasElement|Could not load link/i.test(error));
    assert.deepEqual(meaningful,[],"returning session: no runtime errors");
    return {name:"returning session",viewport:"1280x760"};
  } finally {
    dom.window.close();
  }
}

try{
  const results=[
    await exercise("desktop",1440,900),
    await exercise("short-desktop",1128,584),
    await exercise("phone-portrait",390,844),
    await exercise("phone-landscape",844,390),
    await exerciseReturningSession()
  ];
  for(const result of results)console.log(`PASS ${result.name} ${result.viewport}${result.skins?` · ${result.skins} skins`:""}`);
  console.log("CHERRIFT v0.9.1 smoke tests passed.");
} finally {
  await new Promise(resolve=>server.close(resolve));
}
