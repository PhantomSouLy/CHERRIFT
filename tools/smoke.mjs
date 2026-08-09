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
  ".webp":"image/webp",
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

function installBrowserStubs(window, width, height, name) {
  const browserSetTimeout=window.setTimeout.bind(window);
  window.__CHERRIFT_GACHA_OPENING_MS__=137;
  window.setTimeout=(callback,delay=0,...args)=>{
    const milliseconds=Number(delay)||0;
    const testDelay=milliseconds===window.__CHERRIFT_GACHA_OPENING_MS__?milliseconds:Math.min(milliseconds,20);
    return browserSetTimeout(callback,testDelay,...args);
  };
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
  const touchDevice=name.startsWith("phone");
  Object.defineProperty(window.navigator,"maxTouchPoints",{configurable:true,value:touchDevice?5:0});
  window.matchMedia = query => {
    const max=query.match(/max-width\s*:\s*(\d+)px/i),min=query.match(/min-width\s*:\s*(\d+)px/i);
    const portrait=query.includes("orientation:portrait"),landscape=query.includes("orientation:landscape");
    const coarse=query.includes("pointer:coarse"),fine=query.includes("pointer:fine");
    const matches=(!max||width<=Number(max[1]))&&(!min||width>=Number(min[1]))&&(!portrait||height>=width)&&(!landscape||width>height)&&(!coarse||touchDevice)&&(!fine||!touchDevice)&&!query.includes("prefers-reduced-motion");
    return {matches,media:query,onchange:null,addListener() {},removeListener() {},addEventListener() {},removeEventListener() {},dispatchEvent:()=>true};
  };

  class FakeImage extends window.EventTarget {
    constructor(){super();this.width=192;this.height=192;this.naturalWidth=192;this.naturalHeight=192;this.complete=false;this.onload=null;this.onerror=null;this.decoding="async";this._src="";}
    set src(value){
      this._src=String(value);
      const strip=this._src.match(/_(idle2|walk_attack_ranged|attack_ranged|attack_melee|idle|walk|ranged|skill|attack|melee|dash)_(?:down|up|left|right)\.png/i);
      if(strip){const frames=strip[1]==="idle"?4:strip[1]==="skill"&&this._src.includes("succubus_cherry")?8:6;this.width=this.naturalWidth=192*frames;this.height=this.naturalHeight=192;}
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
  window.scrollTo=()=>{};
  window.confirm=()=>true;
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
    beforeParse(window){installBrowserStubs(window,width,height,name);}
  });
  await waitFor(()=>dom.window.CHERRIFT_STABILITY
    &&dom.window.CHERRIFT_WORLD_UI
    &&dom.window.CHERRIFT_ECONOMY_V11
    &&dom.window.__CHERRIFT_PREBETA_READY__
    &&dom.window.__CHERRIFT_FIXPACK_095_READY__
    &&dom.window.__CHERRIFT_FIXPACK_0952_READY__
    &&dom.window.__CHERRIFT_FIXPACK_095_R5_READY__
    &&dom.window.UI?.save
    &&dom.window.UI?.game,`${name} complete runtime startup`);
  return {dom,window:dom.window,errors};
}

function click(window,element,label){
  assert.ok(element,`${label}: control exists`);
  element.dispatchEvent(new window.MouseEvent("click",{bubbles:true,cancelable:true}));
}

async function assertActiveNav(window,name,selector,label){
  const nav=window.document.getElementById("globalMobileNavV052");
  await waitFor(()=>{
    const active=Array.from(nav?.querySelectorAll(":scope > button.active")||[]);
    const themed=Array.from(nav?.querySelectorAll(":scope > button.theme-nav-active")||[]);
    return active.length===1&&themed.length===1&&active[0]===themed[0]&&active[0].matches(selector);
  },`${name}: ${label} navigation state`);
  assert.equal(nav.querySelectorAll(":scope > button.active").length,1,`${name}: exactly one active navigation item on ${label}`);
  assert.equal(nav.querySelectorAll(":scope > button.theme-nav-active").length,1,`${name}: no legacy theme double-highlight on ${label}`);
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
    const computed=window.getComputedStyle(slot);
    const width=parseFloat(computed.width),height=parseFloat(computed.height);
    const squareBySize=Number.isFinite(width)&&Number.isFinite(height)&&Math.abs(width-height)<1;
    const squareByRule=computed.aspectRatio==="1 / 1"||computed.aspectRatio==="1/1"||computed.width===computed.height;
    assert.ok(squareBySize||squareByRule,`${name}: ${slot.dataset.v0560Slot} is square (${computed.width}×${computed.height})`);
    assert.match(slot.textContent,/LVL\d+/,`${name}: ${slot.dataset.v0560Slot} shows the slot level`);
    assert.doesNotMatch(slot.textContent,/\bA\d+\b/,`${name}: legacy A-level label is removed`);
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
    assert.ok(window.__CHERRIFT_CLEAN_RUNTIME__,`${name}: consolidated Clean Runtime is active`);
    assert.equal(document.querySelectorAll('script[src*="cherrift_app.js"]').length,1,`${name}: one application runtime script`);
    await waitFor(()=>/0\.9\.5/.test(document.title),`${name} current title`);
    assert.match(document.title,/0\.9\.5/,`${name}: current title`);
    assert.deepEqual(window.__cherriftTitleWrites.filter(title=>/\bv0\.[0-8](?:\.\d+)?\b/.test(title)),[],`${name}: title never shows a legacy version`);
    assert.doesNotMatch(document.body.textContent,/\bv0\.[0-8](?:\.\d+)?\b/,`${name}: no legacy version is visible anywhere`);
    for(const version of ["085","086","087","088","089","090","091","092","093"])assert.ok(window[`CHERRIFT_V${version}`],`${name}: v0.${version.slice(1)} patch`);
    assert.equal(window.CHERRIFT_BUILD.version,"0.9.5-prebeta.1",`${name}: canonical build version`);
    assert.equal(window.CHERRIFT_LOCALIZATION.t("world.recommendedLevel",{level:7}),window.CHERRIFT_LOCALIZATION.language()==="hu"?"Ajánlott szint: 7":"Recommended level: 7",`${name}: localization parameters`);
    assert.deepEqual(window.CHERRIFT_LOCALIZATION.validateKeys(["common.play","skin.title","world.title"]),[],`${name}: localization keys`);
    assert.equal(window.CHERRIFT_DATA.skins.length,14,`${name}: all fourteen Cherry skins`);
    assertSkin(window,"mage_cherry");
    assertSkin(window,"archer_cherry");
    const commonSkins=["cake_deliver_cherry","kimono_cherry","pajama_cherry","school_uniform_cherry","sport_cherry"];
    for(const skinId of commonSkins){
      assertSkin(window,skinId);
      assert.equal(UI.save.unlockedSkins.includes(skinId),false,`${name}: ${skinId} starts locked`);
    }
    assert.equal(UI.save.unlockedSkins.includes("mage_cherry")||UI.save.unlockedSkins.includes("archer_cherry"),false,`${name}: Rare skins start locked`);
    assert.deepEqual([...UI.save.unlockedSkins],["cherry_default"],`${name}: starter owns only Base Cherry`);
    assert.equal(UI.save.coins,500,`${name}: starter Coin balance`);
    assert.equal(UI.save.energy,50,`${name}: starter Energy balance`);
    assert.equal(UI.save.chests.common,3,`${name}: starter Common Chests`);
    assert.equal(UI.save.account.skillPoints,1,`${name}: level-1 starter receives exactly one Skill Point`);
    assert.ok(window.CHERRIFT_BALANCE&&window.CHERRIFT_PREBETA,`${name}: central pre-beta balance and progression modules`);
    assert.ok(window.CHERRIFT_BALANCE.gear.rarities.Uncommon,`${name}: Uncommon Gear tier remains available`);
    assert.equal(window.CHERRIFT_BALANCE.arsenal.maxLevel,30,`${name}: beta Arsenal cap`);
    for(const world of [1,2,3,4,5,6]){
      const config=window.CHERRIFT_BALANCE.worlds[world];
      const chapters=window.CHERRIFT_V040.stages.filter(stage=>stage.world===world&&!stage.training).sort((a,b)=>a.index-b.index);
      const expected=Array.from({length:config.completionLevel-config.unlockLevel},(_,offset)=>window.CHERRIFT_BALANCE.xpToNext(config.unlockLevel+offset)).reduce((sum,value)=>sum+value,0);
      const actual=chapters.reduce((sum,stage)=>sum+Number(stage.accountXp||0),0);
      assert.equal(chapters.length,5,`${name}: World ${world} has five pre-beta chapters`);
      assert.ok(Math.abs(actual-expected)<=2,`${name}: World ${world} first-clear XP reaches its completion level (actual ${actual}, expected ${expected})`);
    }
    assert.equal(window.CHERRIFT_PREBETA.isWorldUnlocked(2,UI.save),false,`${name}: World 2 starts locked`);
    assert.equal(window.CHERRIFT_PREBETA.isStageUnlocked(window.CHERRIFT_V040.stages.find(stage=>stage.id==="world_1_2"),UI.save),false,`${name}: Chapter 1-2 requires a star on Chapter 1-1`);
    assert.deepEqual([...window.CHERRIFT_PREBETA.ownedFrames(UI.save)],["frame0lvl"],`${name}: starter owns only the default profile frame`);
    const stackedTitleSave={ownedTitles:["meadow_explorer","night_hunter","banker"]};
    assert.deepEqual(JSON.parse(JSON.stringify(window.CHERRIFT_PREBETA.titleStats(stackedTitleSave))),{maxHp:50,damage:10,allStats:0,coinGain:.01,chestLuck:0},`${name}: all owned title stats stack`);
    const gmTitles=window.CHERRIFT_BALANCE.titles.filter(title=>title.gmOnly);
    assert.equal(gmTitles.map(title=>title.id).join(","),"gm,senior_gm,head_gm",`${name}: three server-granted GM titles are registered`);
    assert.ok(gmTitles.every(title=>!UI.save.ownedTitles.includes(title.id)),`${name}: GM titles are never granted to a starter account`);
    const energySave={energy:50,energyState:{lastTick:Date.now()}},energyGame={save:energySave,__prebetaEnergy:{stageId:"world_1_1",cost:5,committed:false}};
    assert.equal(window.CHERRIFT_PREBETA.commitStageEnergy(energyGame),true,`${name}: first star commits Energy`);
    assert.equal(window.CHERRIFT_PREBETA.commitStageEnergy(energyGame),false,`${name}: Energy cannot be charged twice in one run`);
    assert.equal(energySave.energy,45,`${name}: normal stage costs five Energy`);
    const ownerSave=structuredClone(UI.save);ownerSave.prebeta.entitlements={allContent:true};ownerSave.unlockedSkins.push("mage_cherry");window.CHERRIFT_PREBETA.normalizeSave(ownerSave);
    assert.ok(ownerSave.unlockedSkins.includes("mage_cherry")&&window.CHERRIFT_PREBETA.isWorldUnlocked(6,ownerSave),`${name}: owner content is preserved`);
    assert.equal(window.CherriftGame.prototype.drawWorld.__v091BoundaryFog,true,`${name}: map boundary fog active`);
    assert.equal(window.CherriftGame.prototype.drawWorld.__v095CullWorlds,6,`${name}: viewport culling covers every beta World, including World 6`);
    assert.equal(document.querySelectorAll("#globalMobileNavV052 > button").length,5,`${name}: five mobile destinations`);
    if(window.CHERRIFT_WORLD_UI.isMobile()){
      assert.equal(document.querySelectorAll('#globalMobileNavV052 [data-v082-open="worlds"]').length,0,`${name}: bottom Play route is completely replaced`);
      assert.equal(document.querySelectorAll('#globalMobileNavV052 [data-v082-open="skins"]').length,1,`${name}: exactly one bottom Cherry selector route`);
    }else{
      assert.equal(document.querySelectorAll('#globalMobileNavV052 [data-v082-open="worlds"]').length,1,`${name}: desktop keeps the hidden Play route intact`);
    }

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
    await waitFor(()=>!document.getElementById("mailBugfixV0941")?.classList.contains("hidden"),`${name} mail panel`);
    const smokeMail={id:`smoke-delete-${name}`,title_en:"Delete me",title_hu:"Törölj",body_en:"No reward",body_hu:"Nincs jutalom",created_at:"2026-08-01",attachments:null,read:true,claimed:false};
    const protectedMail={id:`smoke-protected-${name}`,title_en:"Claim first",title_hu:"Előbb vedd át",body_en:"Reward",body_hu:"Jutalom",created_at:"2026-08-01",attachments:{resources:{"currency.coins":1}},read:true,claimed:false};
    window.CHERRIFT_LIVE_SERVICES.messages.push(smokeMail,protectedMail);
    window.CHERRIFT_ACCOUNT_MAIL.showMailList();
    click(window,document.querySelector(`[data-mail-id="${protectedMail.id}"]`),`${name} open protected reward mail`);
    assert.equal(document.querySelector("[data-mail-delete]")?.disabled,true,`${name}: unclaimed reward Mail cannot be deleted`);
    click(window,document.querySelector("[data-mail-detail-back]"),`${name} back from protected mail`);
    click(window,document.querySelector(`[data-mail-id="${smokeMail.id}"]`),`${name} open deletable mail`);
    const deleteMail=document.querySelector("[data-mail-delete]");
    assert.ok(deleteMail&&!deleteMail.disabled,`${name}: reward-free Mail can be deleted`);
    click(window,deleteMail,`${name} delete single mail`);
    assert.equal(document.querySelector(`[data-mail-id="${smokeMail.id}"]`),null,`${name}: deleted Mail stays hidden`);
    assert.ok(document.querySelector("[data-mail-delete-all]"),`${name}: Mail list has Delete All`);
    const homeNav=document.querySelector('#globalMobileNavV052 [data-v082-open="menu"]');
    click(window,homeNav,`${name} global Home from Mail`);
    await waitFor(()=>!document.getElementById("menu")?.classList.contains("hidden"),`${name} Home leaves Mail`);
    assert.equal(document.getElementById("mailBugfixV0941").classList.contains("hidden"),true,`${name}: Mail panel closes behind global navigation`);
    if(window.CHERRIFT_WORLD_UI.isMobile())await assertActiveNav(window,name,'[data-v082-open="menu"]',"Home");
    UI.open("profileV082");
    await waitFor(()=>!document.getElementById("profileBugfixV0941")?.classList.contains("hidden"),`${name} profile panel`);
    assert.equal(document.querySelector(".profile-title-collection-bf"),null,`${name}: obsolete Title Collection block removed`);
    const titleStatsButton=document.querySelector("[data-profile-title-stats]");
    assert.equal(titleStatsButton?.textContent?.trim(),"Title Stats",`${name}: Title Stats is a readable text button`);
    assert.ok(titleStatsButton?.closest(".profile-avatar-column-bf"),`${name}: Title Stats button is below the avatar in the marked column`);
    assert.equal(document.querySelector(".profile-title-row-bf [data-profile-title-stats]"),null,`${name}: old square info button is removed from the title row`);
    if(window.CHERRIFT_WORLD_UI.isMobile())await assertActiveNav(window,name,"[data-v082-toggle-mobile]","Profile / More");
    click(window,titleStatsButton,`${name} Title Stats info`);
    assert.equal(document.getElementById("profileTitleStatsModalV0945")?.classList.contains("hidden"),false,`${name}: Title Stats opens as a separate panel`);
    assert.match(document.getElementById("profileTitleStatsBody")?.textContent||"",/not available|nem érhetők el/i,`${name}: future Title Stats has an honest empty state`);
    click(window,document.querySelector("[data-title-stats-close]"),`${name} close Title Stats`);
    if(name==="desktop"){
      UI.save.account.level=5;
      assert.ok(window.CHERRIFT_PREBETA.ownedFrames(UI.save).includes("frame5lvl"),`${name}: Level 5 frame entitlement`);
      await waitFor(()=>document.querySelector(".profile-avatar-bf")?.dataset.prebeta,`${name}: decorated profile avatar`);
      click(window,document.querySelector(".profile-avatar-bf"),`${name} open profile frames`);
      await waitFor(()=>{const modal=document.getElementById("prebetaFrameModal");return modal&&!modal.classList.contains("hidden");},`${name}: profile frame modal`);
      click(window,document.querySelector('[data-prebeta-frame="frame5lvl"]'),`${name} select Level 5 frame`);
      assert.ok(document.querySelector('[data-prebeta-frame="frame5lvl"].active'),`${name}: frame selection remains active before Equip`);
      click(window,document.querySelector("#prebetaFrameModal [data-prebeta-close]"),`${name} close profile frames`);
      UI.save.account.level=1;
      UI.save.ownedTitles=UI.save.ownedTitles.filter(title=>title!=="rookie_bunny");
    }
    if(window.CHERRIFT_WORLD_UI.isMobile()){
      const cherryNav=document.querySelector('#globalMobileNavV052 [data-v082-open="skins"]');
      click(window,cherryNav,`${name} global Cherry from Profile`);
      await waitFor(()=>!document.getElementById("skins")?.classList.contains("hidden"),`${name} Cherry leaves Profile`);
      assert.equal(document.getElementById("profileBugfixV0941").classList.contains("hidden"),true,`${name}: Profile closes behind global Cherry navigation`);
      await assertActiveNav(window,name,'[data-v082-open="skins"]',"Cherry");
      UI.open("profileV082");
      await waitFor(()=>!document.getElementById("profileBugfixV0941")?.classList.contains("hidden"),`${name} reopen Profile`);
      const gachaNav=document.querySelector('#globalMobileNavV052 [data-v082-open="gachaV082"]');
      click(window,gachaNav,`${name} global Gacha from Profile`);
      await waitFor(()=>!document.getElementById("gachaChestOnlyV12")?.classList.contains("hidden"),`${name} Gacha leaves Profile`);
      assert.equal(document.getElementById("profileBugfixV0941").classList.contains("hidden"),true,`${name}: Profile closes behind global Gacha navigation`);
      await assertActiveNav(window,name,'[data-v082-open="gachaV082"]',"Gacha");
      UI.open("profileV082");
      await waitFor(()=>!document.getElementById("profileBugfixV0941")?.classList.contains("hidden"),`${name} reopen Profile after Gacha`);
    }
    const gearNav=document.querySelector('#globalMobileNavV052 [data-v082-open="gear"]');
    click(window,gearNav,`${name} global Gear from Profile`);
    await waitFor(()=>!document.getElementById("gear")?.classList.contains("hidden"),`${name} Gear leaves Profile`);
    assert.equal(document.getElementById("profileBugfixV0941").classList.contains("hidden"),true,`${name}: Profile panel closes behind global navigation`);
    if(window.CHERRIFT_WORLD_UI.isMobile())await assertActiveNav(window,name,'[data-v082-open="gear"]',"Gear");
    UI.open("menu");
    if(!window.CHERRIFT_WORLD_UI.isMobile()){
      const shortcutLabels=Array.from(document.querySelectorAll("#menuDashboardV060 .dashboard-shortcuts-v060 button b"),node=>node.textContent.trim());
      assert.deepEqual(shortcutLabels,["Login","Quest","Social","Ranking","Buff List"],`${name}: desktop Lobby shortcut order`);
      assert.equal(document.querySelector("#menu .news-card"),null,`${name}: temporary legacy Lobby News card is removed`);
      assert.deepEqual(Array.from(document.querySelectorAll("#menu .social-row.r5-support-links button"),button=>button.title),["Twitch","Website","Feedback","Bug Report"],`${name}: Lobby support links`);
      const stableWallet=document.getElementById("desktopCurrencyV0943");
      assert.ok(stableWallet&&stableWallet.parentElement?.classList.contains("rail-bottom-v060"),`${name}: desktop wallet space exists before route changes`);
      const stableRail=document.querySelector("#globalRailV060 .rail-text-nav-v095");
      const stableProfileIcon=document.getElementById("railProfileIconV082");
      const stableLobby=document.getElementById("menuDashboardV060");
      UI.open("gacha");
      await waitFor(()=>!document.getElementById("gachaChestOnlyV12")?.classList.contains("hidden"),`${name}: canonical Gacha opens synchronously`);
      assert.equal(document.querySelector("#globalRailV060 .rail-text-nav-v095"),stableRail,`${name}: Gacha does not replace the header with a legacy rail`);
      assert.equal(document.getElementById("railProfileIconV082"),stableProfileIcon,`${name}: Gacha preserves the decorated profile icon node`);
      assert.equal(document.querySelector("#desktopCurrencyV0943 [title='Coin'] b")?.textContent,String(UI.save.coins),`${name}: Gacha never exposes a zero-value placeholder wallet`);
      UI.open("menu");
      await waitFor(()=>!document.getElementById("menu")?.classList.contains("hidden"),`${name}: Lobby returns after flash regression check`);
      assert.equal(document.querySelector("#globalRailV060 .rail-text-nav-v095"),stableRail,`${name}: Lobby does not replace the header with a legacy rail`);
      assert.equal(document.getElementById("menuDashboardV060"),stableLobby,`${name}: Lobby keeps the canonical dashboard node`);
      assert.doesNotMatch(document.querySelector("#menu .patch-card")?.textContent||"",/v0\.9\.0\b/,`${name}: Lobby never restores the legacy v0.9.0 patch card`);
    }
    click(window,document.querySelector('#menuToolsV082 [data-v082-menu-tool="settings"]'),`${name} settings tool`);
    await waitFor(()=>!document.getElementById("settings")?.classList.contains("hidden"),`${name} settings panel`);
    if(window.CHERRIFT_WORLD_UI.isMobile())await assertActiveNav(window,name,"[data-v082-toggle-mobile]","Settings / More");
    UI.open("menu");
    click(window,document.getElementById("playBtn"),`${name} main Play`);
    await waitFor(()=>!document.getElementById("worldSelectorV0942")?.classList.contains("hidden"),`${name} Play opens responsive World Select`);
    assert.equal(document.querySelectorAll("#worldDotsV0942 i").length,6,`${name}: six beta Worlds`);
    assert.match(document.getElementById("worldTotalStarsV0942")?.textContent||"",/★\s*\d+\s*\/\s*90/,`${name}: World Select total star counter`);

    UI.open("gear");
    await waitFor(()=>Array.from(document.querySelectorAll("#gear [data-v0560-slot]")).every(slot=>/LVL\d+/.test(slot.textContent)),`${name} Gear decoration`);
    assertCompleteGearLayout(window,name);
    await waitFor(()=>document.querySelector("#gear .gear-equipment-tools-v0942"),`${name} Gear Level and Select toolbar`);
    const gearTools=document.querySelector("#gear .gear-equipment-tools-v0942");
    assert.ok(gearTools.contains(document.getElementById("gearSortV0560")),`${name}: Level sort is in the requested toolbar`);
    assert.ok(gearTools.querySelector("[data-v082-select-mode]"),`${name}: Select button is restored beside sorting`);
    assert.equal(document.querySelector("#gear .gear-character-floor-v0560"),null,`${name}: decorative character floor removed`);

    UI.open("settings");
    for(const setting of ["effectQualityV085","cameraMotionV085","screenShakeV085","combatSoundsV085"])assert.ok(document.getElementById(setting),`${name}: ${setting} setting`);

    UI.open("skins");
    await waitFor(()=>document.querySelectorAll("[data-v093-skin]").length===14,`${name} v0.9.4 skin selector`);
    assert.equal(document.querySelectorAll("[data-v093-skin]").length,14,`${name}: all skin icons`);
    assert.ok(document.querySelector(".skin-icon-v093 img")?.src.includes("assets/ui/skin_thumbs"),`${name}: optimized selector thumbnails`);
    assert.ok(window.CHERRIFT_DATA.skins.find(skin=>skin.id==="warrior_cherry")?.icon?.match(/warrior_cherry_icon\.(?:png|jpe?g)/),`${name}: Warrior thumbnail`);
    assert.ok(window.CHERRIFT_DATA.skins.find(skin=>skin.id==="wuxia_sakura_cherry")?.icon?.match(/wuxia_sakura_cherry_icon\.(?:png|jpe?g)/),`${name}: Wuxia thumbnail`);
    assert.ok(document.querySelector("[data-v093-skin-view='splash'].active"),`${name}: splash is default`);
    click(window,document.querySelector("[data-v093-skin-view='game']"),`${name} game view`);
    await waitFor(()=>document.getElementById("skinPreviewCanvasV093"),`${name} sprite preview`);
    assert.ok(document.querySelectorAll("[data-v093-preview-direction]").length===4,`${name}: four preview directions`);
    assert.ok(document.querySelectorAll("[data-v093-preview-animation]").length===4,`${name}: four preview animations`);
    const beforeSelected=UI.save.selectedSkin;
    click(window,document.querySelector('[data-v093-skin="fairy_cherry"]'),`${name} inspect locked Fairy Cherry`);
    assert.equal(document.querySelector('[data-v093-skin-view="game"]'),null,`${name}: locked skin has no Game View tab`);
    assert.equal(document.getElementById("skinPreviewCanvasV093"),null,`${name}: locked skin exposes no sprite preview`);
    assert.ok(document.querySelector('[data-v093-skin-view="splash"].active'),`${name}: locked skin remains on Splash Art`);
    UI.save.unlockedSkins.push("cake_deliver_cherry");
    const cakeButton=document.querySelector('[data-v093-skin="cake_deliver_cherry"]');
    click(window,cakeButton,`${name} select Cake Deliver`);
    assert.equal(UI.save.selectedSkin,beforeSelected,`${name}: selecting does not auto-equip`);
    click(window,document.querySelector("[data-v093-equip]"),`${name} equip selected skin`);
    assert.equal(UI.save.selectedSkin,"cake_deliver_cherry",`${name}: separate Equip action`);
    click(window,document.querySelector("[data-v093-skill-info]"),`${name} skill details`);
    assert.equal(document.getElementById("skinSkillDialogV093").classList.contains("hidden"),false,`${name}: tap skill dialog`);
    click(window,document.querySelector("[data-v093-skill-close]"),`${name} close skill details`);

    UI.save.account.level=5;
    UI.save.stageStars=UI.save.stageStars||{};
    for(let index=1;index<=5;index++)UI.save.stageStars[`world_1_${index}`]=1;
    UI.open("worlds");
    await waitFor(()=>!document.getElementById("worldSelectorV0942")?.classList.contains("hidden"),`${name} consolidated World selector`);
    assert.equal(document.querySelectorAll("#worldDotsV0942 i").length,6,`${name}: exact World count`);
    assert.ok(document.querySelector("#worldCardV0942 > .selector-card-v0942"),`${name}: World card is rendered inside a sized host`);
    const firstWorldName=document.querySelector("#worldCardV0942 h3")?.textContent;
    click(window,document.querySelector('[data-world-step="1"]'),`${name} next World`);
    assert.notEqual(document.querySelector("#worldCardV0942 h3")?.textContent,firstWorldName,`${name}: World right arrow advances the carousel`);
    assert.equal(window.getComputedStyle(document.querySelector("[data-selector-drag]")).userSelect,"none",`${name}: dragging the World carousel cannot select its text`);
    click(window,document.querySelector("[data-world-start]"),`${name} select World`);
    await waitFor(()=>!document.getElementById("chapterSelectorV0942")?.classList.contains("hidden"),`${name} Chapter selector`);
    assert.equal(document.querySelectorAll("#chapterDotsV0942 i").length,5,`${name}: five chapters in selected World`);
    assert.ok(document.querySelector("#chapterCardV0942 > .selector-card-v0942"),`${name}: Chapter card is rendered inside a sized host`);
    assert.equal(document.querySelectorAll("#chapterSummaryV0942 > div").length,6,`${name}: Chapter details include stage, objective, rewards, Energy and recommendation`);
    const firstChapterName=document.querySelector("#chapterCardV0942 h3")?.textContent;
    click(window,document.querySelector('[data-chapter-step="1"]'),`${name} next Chapter`);
    assert.notEqual(document.querySelector("#chapterCardV0942 h3")?.textContent,firstChapterName,`${name}: Chapter right arrow advances the carousel`);
    assert.equal(window.getComputedStyle(document.querySelector("[data-chapter-drag]")).userSelect,"none",`${name}: dragging the Chapter carousel cannot select its text`);
    click(window,document.querySelector("[data-chapter-back]"),`${name} back to Worlds`);
    assert.ok((window.CHERRIFT_V040?.stages||[]).filter(stage=>stage.world===4).length===5,`${name}: World 4 has five real stages`);
    assert.equal((window.CHERRIFT_V040?.stages||[]).filter(stage=>stage.world===5).length,5,`${name}: World 5 has five placeholder stages`);
    assert.equal((window.CHERRIFT_V040?.stages||[]).filter(stage=>stage.world===6).length,5,`${name}: World 6 has five placeholder stages`);

    for(let index=1;index<=5;index++)UI.save.stageStars[`world_1_${index}`]=3;
    const achievementCoins=UI.save.coins;
    const achievementRare=UI.save.chests.rare;
    const achievementGems=UI.save.bloomGems;
    UI.open("achievements");
    await waitFor(()=>document.querySelector('[data-fix-ach-claim="perfect_meadow"]'),`${name} Cozy World achievement`);
    const cozyClaim=document.querySelector('[data-fix-ach-claim="perfect_meadow"]');
    assert.equal(cozyClaim.disabled,false,`${name}: Cozy World achievement unlocks retrospectively at 15/15`);
    assert.match(cozyClaim.closest("article")?.textContent||"",/My First Cozy World/,`${name}: Cozy achievement name`);
    click(window,cozyClaim,`${name} claim Cozy Cherry theme achievement`);
    assert.equal(UI.save.coins,achievementCoins+100,`${name}: Cozy achievement Coin reward`);
    assert.equal(UI.save.chests.rare,achievementRare+1,`${name}: Cozy achievement Rare Chest reward`);
    assert.equal(UI.save.bloomGems,achievementGems+10,`${name}: Cozy achievement Bloom Gem reward`);
    assert.ok(UI.save.unlockedThemes.includes("cozy_cherry"),`${name}: Cozy Cherry theme is persistently unlocked`);
    const claimedCoins=UI.save.coins;
    document.querySelector('[data-fix-ach-claim="perfect_meadow"]')?.click();
    assert.equal(UI.save.coins,claimedCoins,`${name}: Cozy achievement cannot be claimed twice`);

    UI.save.keys=2;
    UI.save.resourceWallet={keys:{common:1,rare:1,epic:1}};
    UI.save.chests={common:1,rare:1,epic:1};
    window.CHERRIFT_ECONOMY_V11.normalize(UI.save);
    assert.equal(UI.save.keys,0,`${name}: legacy generic keys are removed`);
    assert.deepEqual({...UI.save.chests},{common:4,rare:2,epic:2},`${name}: all legacy keys migrate to usable chests`);
    UI.open("gacha");
    await waitFor(()=>!document.getElementById("gachaChestOnlyV12")?.classList.contains("hidden"),`${name} Gacha panel`);
    if(!window.CHERRIFT_WORLD_UI.isMobile())assert.equal(document.querySelectorAll("#desktopCurrencyV0943 > span").length,4,`${name}: desktop wallet remains present on Gacha without a header reflow`);
    assert.equal(document.querySelectorAll("[data-gco-tier]").length,3,`${name}: exactly three Gacha tiers`);
    assert.equal(document.querySelectorAll("#gcoWallet > b").length,4,`${name}: Gacha currency wallet is fully visible`);
    const commonBefore=UI.save.chests.common;
    window.CHERRIFT_ECONOMY_V11.openMany(1);
    await waitFor(()=>!document.getElementById("gcoModal")?.classList.contains("hidden"),`${name} Gacha opening animation`);
    await waitFor(()=>UI.save.chests.common===commonBefore-1,`${name} Gacha consumes one chest`);
    assert.ok(UI.save.gacha.history.length>=1,`${name}: Gacha history records the reward`);
    await new Promise(resolve=>setTimeout(resolve,8));
    assert.ok(document.querySelector("#gcoModal .gco-opening"),`${name}: opening animation remains visible before rewards`);
    assert.equal(document.querySelector("#gcoModal .gco-skin-reveal"),null,`${name}: skin reward waits for chest animation`);
    await waitFor(()=>!document.querySelector("#gcoModal .gco-opening"),`${name}: opening animation completes`);
    const gachaNext=document.querySelector("#gcoModal .gco-next");
    if(gachaNext) click(window,gachaNext,`${name} finish Gacha reveal`);
    window.CHERRIFT_REWARDS?.close?.();
    document.getElementById("gcoModal")?.classList.add("hidden");
    if(name==="desktop"){
      UI.save.chests.common=10;
      UI.save.gacha.pity.common=9;
      window.CHERRIFT_ECONOMY_V11.open("common");
      window.CHERRIFT_ECONOMY_V11.openMany(10);
      await waitFor(()=>UI.save.chests.common===0,"desktop 10× Gacha consumes all chests");
      await waitFor(()=>document.querySelector("#gcoModal .gco-skin-reveal"),"desktop 10× Gacha reveals guaranteed skin first");
      assert.equal(document.getElementById("rewardOverlayV083")?.classList.contains("open"),false,"desktop: non-skin Gacha summary waits until skin reveals finish");
      for(let index=0;index<12;index++){
        const next=document.querySelector("#gcoModal .gco-next");
        if(!next) break;
        click(window,next,"desktop continue 10× Gacha reveal");
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      window.CHERRIFT_REWARDS?.close?.();
      document.getElementById("gcoModal")?.classList.add("hidden");
    }
    UI.open("menu");

    UI.save.bag=UI.save.bag||{};
    UI.save.bag.items={};
    UI.save.bag.materials={gearScrap:0,stones:{},slotCores:{}};
    UI.save.sakuraEssence=0;
    UI.save.chests={common:0,rare:0,epic:0,legendary:0};
    UI.open("bagV082");
    await waitFor(()=>document.querySelector(".bag-inventory-v084"),`${name} Bag inventory`);
    window.CHERRIFT_V084.renderBag();
    assert.equal(document.querySelectorAll("[data-v084-bag-item]").length,0,`${name}: BAG hides zero-count and unknown items`);
    assert.equal(document.querySelectorAll(".bag-empty-slot-v092").length,9,`${name}: BAG shows empty inventory slots`);

    if(name==="desktop"){
      UI.save.inventory=[];
      UI.save.equipped={};
      const oldGear={id:"smoke_old_gear",slot:"Weapon",type:"Crimson",rarity:"Common",itemLevel:1,stats:{damage:1}};
      const newGear={id:"smoke_new_gear",slot:"Weapon",type:"Crimson",rarity:"Rare",itemLevel:2,stats:{damage:3}};
      UI.save.equipped.Weapon=oldGear;
      UI.save.inventory.push(newGear);
      window.CHERRIFT_REWARDS.withSuppressed(()=>window.CherriftStorage.save(UI.save));
      UI.equipGear(newGear.id);
      assert.equal(UI.save.equipped.Weapon.id,newGear.id,"desktop: Gear swap equips selected item");
      assert.ok(UI.save.inventory.some(item=>item.id===oldGear.id),"desktop: previous Gear returns to inventory");
      assert.equal(document.getElementById("rewardOverlayV083")?.classList.contains("open"),false,"desktop: Gear swap does not open Reward popup");
      window.CHERRIFT_REWARDS.show([{key:"test",name:"Test Reward",amount:1,rarity:"Common",kind:"currency"}]);
      assert.equal(document.getElementById("rewardOverlayV083")?.classList.contains("open"),true,"desktop: explicit reward event opens Reward popup");
      window.CHERRIFT_REWARDS.close();
    }

    UI.open("eventV093");
    await waitFor(()=>document.querySelector("[data-v093-event-claim]"),`${name} beta Event`);
    const coinsBeforeEvent=Number(UI.save.coins)||0;
    click(window,document.querySelector("[data-v093-event-claim]"),`${name} claim Event reward`);
    assert.equal(UI.save.coins,coinsBeforeEvent+250,`${name}: Event grants Coin once`);
    assert.equal(UI.save.chests.common,1,`${name}: Event grants one Common Chest`);
    window.CHERRIFT_REWARDS.close();
    window.CHERRIFT_V093.claimWelcomeEvent();
    assert.equal(UI.save.coins,coinsBeforeEvent+250,`${name}: Event reward is idempotent`);
    assert.equal(UI.save.chests.common,1,`${name}: Event chest cannot be claimed twice`);
    UI.open("libraryV0551");
    click(window,document.querySelector('[data-library-tab="skins"]'),`${name} collection skins`);
    window.CHERRIFT_V084.renderCollection();
    await waitFor(()=>document.querySelectorAll("#libraryBodyV0551 .collection-card-v084").length>0,`${name} collection cards`);
    assert.equal(document.querySelectorAll("#libraryBodyV0551 .collection-card-v084").length,14,`${name}: all skin collection cards`);
    assert.ok(document.querySelectorAll("#libraryBodyV0551 .collection-card-v084.locked").length>0,`${name}: non-starter skins remain locked`);

    UI.save.unlockedSkins=[...new Set([...(UI.save.unlockedSkins||[]),"archer_cherry","mage_cherry"])];
    window.CHERRIFT_V084.renderCollection();
    assert.ok(document.querySelector('[data-v084-skin="mage_cherry"] img'),`${name}: unlocked Mage collection icon`);
    assert.ok(document.querySelector('[data-v084-skin="archer_cherry"] img'),`${name}: unlocked Archer collection icon`);

    UI.save.selectedSkin="archer_cherry";
    UI.save.selectedStageId="world_1_1";
    window.CherriftStorage.save(UI.save);
    await UI.game.start();
    assert.equal(UI.game.player.skin,"archer_cherry",`${name}: Archer starts`);
    assert.ok(UI.game.player.crit>=.13,`${name}: Archer passive crit`);
    const archerEnemy={x:UI.game.player.x+130,y:UI.game.player.y,r:20,hp:500,maxHp:500,speed:0,xp:1,dead:false};
    UI.game.enemies=[archerEnemy];
    UI.game.player.skillTimer=0;
    UI.game.skill();
    assert.equal(UI.game.bullets.filter(bullet=>bullet.customV087&&bullet.style==="archer_arrow_skill").length,4,`${name}: Four Arrow Shot`);
    UI.game.drawWorld(UI.game.ctx);
    UI.game.updateBullets(.016);

    UI.quit();
    await new Promise(resolve=>setTimeout(resolve,30));
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
    assert.ok(UI.game.obstacles.some(obstacle=>obstacle.__fixStrictWorldV0952&&obstacle.fixWorld===1),`${name}: strict World 1 map objects`);
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
        await new Promise(resolve=>setTimeout(resolve,30));
        UI.save.unlockedSkins=[...new Set([...(UI.save.unlockedSkins||[]),skinId])];
        UI.save.selectedSkin=skinId;
        window.CherriftStorage.save(UI.save);
        await UI.game.start();
        return UI.game.player;
      }

      const stationary=await startSkin("cake_deliver_cherry");
      const attackTarget={x:stationary.x+420,y:stationary.y,r:20,hp:800,maxHp:800,speed:0,xp:1,dead:false};
      UI.game.enemies=[attackTarget];
      UI.game.bullets=[];
      stationary.fireTimer=0;
      const originalMoveVector=UI.game.input.getMoveVector.bind(UI.game.input);
      UI.game.input.getMoveVector=()=>({x:0,y:0});
      UI.game.autoFire();
      assert.ok(stationary.__attackV092,"desktop: Common attack starts a pending fire-frame state");
      assert.equal(UI.game.bullets.length,0,"desktop: Common projectile is not created before fire frame");
      UI.game.input.getMoveVector=()=>({x:1,y:0});
      UI.game.update(.02);
      assert.equal(stationary.__attackV092,null,"desktop: movement before fire frame cancels attack");
      assert.equal(UI.game.bullets.length,0,"desktop: pre-fire cancel creates no projectile");
      assert.ok(stationary.fireTimer>0,"desktop: pre-fire cancel keeps cooldown");

      stationary.fireTimer=0;
      UI.game.input.getMoveVector=()=>({x:0,y:0});
      UI.game.autoFire();
      for(let index=0;index<4;index++)UI.game.update(.05);
      assert.ok(UI.game.bullets.some(bullet=>bullet.firedByV092),"desktop: projectile spawns at fire frame");
      const firedCount=UI.game.bullets.length;
      UI.game.input.getMoveVector=()=>({x:1,y:0});
      UI.game.update(.016);
      assert.equal(stationary.__attackV092,null,"desktop: movement after fire cancels recovery animation");
      assert.ok(UI.game.bullets.length>=firedCount,"desktop: fired projectile continues after animation cancel");
      assert.ok(stationary.fireTimer>0,"desktop: post-fire cancel keeps cooldown");
      UI.game.input.getMoveVector=originalMoveVector;

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
      UI.game.mode="paused";
      const succubusConfig=window.CHERRIFT_CONFIG.player.skins.succubus_cherry;
      assert.equal(
        Array.from(window.CHERRIFT_SUCCUBUS_V095.states).join("|"),
        "idle|idle2|walk|walk_attack_ranged|attack_ranged|attack_melee|skill",
        "desktop: all Legendary Succubus animation states are registered"
      );
      assert.equal(succubusConfig.states.skill.frames,8,"desktop: Soul Drain uses the eight-frame skill strip");
      assert.equal(succubusConfig.states.skill.pivot.y,184,"desktop: Succubus ground pivot is exact");
      assert.deepEqual(
        {...window.CHERRIFT_SUCCUBUS_V095.burstLayout},
        {cell:256,columns:3,frames:7},
        "desktop: Soul Drain reads the real 3x3 / seven-frame effect atlas"
      );
      assert.equal(succubusConfig.meleeTriggerRange,158,"desktop: Succubus switches to melee before visual overlap");
      assert.equal(succubusConfig.meleeRange,184,"desktop: Succubus claws reach the expanded melee distance");
      assert.equal(window.CHERRIFT_SUCCUBUS_V095.walkAttackRenderSource,"walk","desktop: moving ranged attacks use the continuous walk body");
      assert.equal(window.CHERRIFT_SUCCUBUS_V095.meleeEffectRotation.claw,Math.PI/4,"desktop: claw slash cutting edge targets the enemy");
      assert.equal(window.CHERRIFT_SUCCUBUS_V095.meleeEffectRotation.front,-Math.PI/4,"desktop: front slash cutting edge targets the enemy");
      assert.equal(window.CHERRIFT_SUCCUBUS_V095.skillReveal,"center-out-radial-fade","desktop: Soul Drain uses a center-out reveal");
      for(const state of window.CHERRIFT_SUCCUBUS_V095.states){
        assert.ok(UI.game.assets.get(`player_succubus_cherry_${state}_down`),`desktop: ${state} sprite loaded`);
      }
      assert.match(
        UI.game.assets.get("player_succubus_cherry_walk_attack_ranged_down").src,
        /succubus_cherry_walk_down\.png/,
        "desktop: broken split-body walk-attack strips are not rendered"
      );
      for(const key of ["succubus_claw_wave","succubus_claw_mark","succubus_claw_slash","succubus_front_slash","succubus_burst","succubus_wisp","succubus_hit","succubus_shield"]){
        assert.ok(UI.game.assets.get(key),`desktop: ${key} loaded from the skin bundle`);
      }

      UI.game.input.getMoveVector=()=>({x:0,y:0});
      const rangedEnemy={x:succubus.x+360,y:succubus.y,r:20,hp:900,maxHp:900,speed:0,xp:1,dead:false};
      UI.game.enemies=[rangedEnemy];
      UI.game.bullets=[];
      UI.game.effects=[];
      succubus.fireTimer=0;
      UI.game.autoFire();
      assert.equal(succubus.__succubusAttackV095?.animation,"attack_ranged","desktop: stationary ranged animation starts");
      assert.equal(UI.game.bullets.filter(bullet=>bullet.succubusV095).length,0,"desktop: claw wave waits for its event frame");
      for(let index=0;index<5;index++)UI.game.update(.05);
      assert.ok(UI.game.bullets.some(bullet=>bullet.style==="succubus_ranged_v095"),"desktop: claw wave spawns on the ranged event frame");

      succubus.__succubusAttackV095=null;
      succubus.attackCastTimer=0;
      succubus.fireTimer=0;
      succubus.moving=true;
      UI.game.autoFire();
      assert.equal(succubus.__succubusAttackV095?.animation,"walk_attack_ranged","desktop: moving attack keeps the alternating-leg ranged walk strip");
      succubus.moving=false;
      UI.game.update(.01);
      assert.equal(succubus.__succubusAttackV095?.animation,"attack_ranged","desktop: releasing movement immediately stops the in-place walk animation");

      succubus.__succubusAttackV095=null;
      succubus.attackCastTimer=0;
      succubus.fireTimer=0;
      succubus.moving=false;
      const meleeEnemy={x:succubus.x+170,y:succubus.y,r:20,hp:900,maxHp:900,speed:0,xp:1,dead:false};
      UI.game.enemies=[meleeEnemy];
      UI.game.bullets=[];
      UI.game.effects=[];
      UI.game.autoFire();
      assert.equal(succubus.__succubusAttackV095?.animation,"attack_melee","desktop: close target selects the melee strip");
      for(let index=0;index<6;index++)UI.game.update(.05);
      assert.ok(meleeEnemy.hp<900,"desktop: two-stage melee damages the target");
      assert.ok(UI.game.effects.some(effect=>effect.type==="succubus_claw_mark_v095"),"desktop: melee leaves the claw mark on the enemy");
      assert.ok(UI.game.effects.filter(effect=>effect.type==="succubus_melee_slash_v095").every(effect=>[0,1].includes(effect.variant)),"desktop: melee randomly selects only the two calibrated slash effects");

      succubus.__succubusAttackV095=null;
      succubus.attackCastTimer=0;
      succubus.fireTimer=999;
      succubus.hp=succubus.maxHp;
      succubus.soulShield=0;
      const drainEnemy={x:succubus.x+42,y:succubus.y,r:24,hp:5000,maxHp:5000,speed:0,xp:1,dead:false};
      UI.game.enemies=[drainEnemy];
      UI.game.bullets=[];
      UI.game.effects=[];
      succubus.skillTimer=0;
      UI.game.skill();
      assert.ok(succubus.__succubusSkillV095,"desktop: Soul Drain cast state starts");
      assert.equal(UI.game.effects.some(effect=>effect.type==="succubus_skill_burst_v095"),false,"desktop: Soul Drain burst waits for frame four");
      for(let index=0;index<9;index++)UI.game.update(.05);
      assert.ok(UI.game.effects.some(effect=>effect.type==="succubus_skill_burst_v095"),"desktop: burst sheet starts on skill frame four");
      assert.ok(UI.game.bullets.some(bullet=>bullet.style==="succubus_soul_v095"),"desktop: multiple soul wisps launch with the burst");
      const burstDraw=[];
      const burstContext=canvasContext();
      burstContext.drawImage=(...args)=>burstDraw.push(args);
      UI.game.drawEffect(burstContext,{type:"succubus_skill_burst_v095",x:100,y:100,t:.2,life:.64});
      assert.equal(burstDraw.length,1,"desktop: Soul Drain draws one atlas cell per effect frame");
      assert.equal(burstDraw[0][3],256,"desktop: Soul Drain source cell width is 256px");
      assert.equal(burstDraw[0][4],256,"desktop: Soul Drain source cell height is 256px");
      assert.ok(burstDraw[0][7]<=232,"desktop: Soul Drain burst stays compact on the playfield");
      assert.equal(burstContext.imageSmoothingEnabled,true,"desktop: Soul Drain scales with smoothing instead of pixelating");
      assert.ok(typeof burstContext.clip==="function","desktop: Soul Drain supports the radial center-out reveal clip");
      for(let index=0;index<16;index++)UI.game.update(.05);
      assert.ok(succubus.soulShield>0,"desktop: full-HP Soul Drain converts overheal into shield");
      assert.ok(UI.game.effects.some(effect=>effect.type==="succubus_overheal_v095"),"desktop: overheal uses the faint blood-shield effect");
      assert.ok(UI.game.assets.get("wuxia_skill_sheet"),"desktop: Wuxia animated skill VFX loaded");
      UI.game.drawWorld(UI.game.ctx);
    }

    if(window.CHERRIFT_WORLD_UI.isMobile()){
      UI.open("menu");
      await waitFor(()=>!document.getElementById("menu")?.classList.contains("hidden"),`${name}: mobile Home final layout`);
      assert.equal(document.body.classList.contains("v090-mobile"),true,`${name}: mobile mode`);
      assert.ok(document.getElementById("mobileMenuV082"),`${name}: mobile drawer`);
      assert.ok(document.querySelectorAll(".mobile-menu-grid-v082 > button").length>=12,`${name}: More includes Ranking`);
      assert.equal(document.querySelectorAll(".mobile-nav-v090 > button").length,5,`${name}: stable bottom nav`);
      assert.equal(document.querySelector(".mobile-nav-v090 > button b")?.textContent,"Cherry",`${name}: Cherry replaces bottom Play`);
      assert.equal(window.getComputedStyle(document.querySelector("#menu .mobile-side-actions-v0932.left")).display,"none",`${name}: left Home rail is removed`);
      assert.equal(document.querySelectorAll("#menu .mobile-side-actions-v0932.right > button").length,3,`${name}: Daily, Weekly and Login stay in one right rail`);
      assert.notEqual(window.getComputedStyle(document.getElementById("mobilePlayBtn")).display,"none",`${name}: stage Play remains visible`);
      await assertActiveNav(window,name,'[data-v082-open="menu"]',"final Home");

      const cherryNav=document.querySelector('#globalMobileNavV052 [data-v082-open="skins"]');
      const cherryImageBefore=cherryNav?.querySelector(":scope > span > img");
      assert.ok(cherryImageBefore,`${name}: Cherry nav thumbnail exists before returning Home`);
      UI.save.selectedStageId="world_2_1";
      UI.save.stageStars=UI.save.stageStars||{};
      UI.save.stageStars.world_2_1=2;
      UI.open("gear");
      await waitFor(()=>!document.getElementById("gear")?.classList.contains("hidden"),`${name}: leave Home before flash regression check`);
      click(window,document.querySelector('#globalMobileNavV052 [data-v082-open="menu"]'),`${name} return Home without fallback frame`);
      const stableArt=document.getElementById("mobileStageArt");
      const stableStars=document.getElementById("mobileChapterStarsV0932");
      assert.match(stableArt?.style.backgroundImage||"",/world2\/world2_splashart_1\.png/,`${name}: selected map is correct in the same Home click task`);
      assert.equal(stableStars?.textContent?.replace(/\s+/g,""),"★★☆2/3",`${name}: selected stars are present in the same Home click task`);
      await new Promise(resolve=>window.setTimeout(resolve,35));
      assert.equal(cherryNav.querySelector(":scope > span > img"),cherryImageBefore,`${name}: Home does not rebuild the Cherry thumbnail node`);
      assert.match(stableArt?.style.backgroundImage||"",/world2\/world2_splashart_1\.png/,`${name}: legacy refresh cannot flash the World 1 fallback`);
      assert.equal(stableStars?.dataset.stableStageId,"world_2_1",`${name}: stars stay synchronized after deferred refreshes`);
      stableArt.style.backgroundImage='url("assets/map/world1/world1_splashart_1.png")';
      window.CHERRIFT_STABILITY.refresh();
      assert.match(stableArt.style.backgroundImage,/world2\/world2_splashart_1\.png/,`${name}: an obsolete World 1 write is corrected synchronously`);

      if(name==="phone-portrait"){
        const themeCss=document.getElementById("cherriftBugfixV0943Css")?.textContent||"";
        for(const selector of [".gco-card",".bf-card",".v0551-stat-grid article",".skill-node-v082",".gear-item-v0560"]){
          assert.ok(themeCss.includes(selector),`theme bridge covers ${selector}`);
        }
        const themeColours=[];
        UI.save.unlockedThemes.push("cozy_cherry","summer_splash");
        for(const themeId of ["cozy_cherry","summer_splash"]){
          assert.equal(window.CHERRIFT_THEMES.select(themeId,UI.save,{silent:true}),true,`${themeId}: theme can be selected`);
          assert.equal(document.documentElement.dataset.cherriftTheme,themeId,`${themeId}: root theme state`);
          assert.equal(document.body.dataset.cherriftTheme,themeId,`${themeId}: body theme state`);
          themeColours.push(window.getComputedStyle(document.documentElement).getPropertyValue("--theme-primary").trim());
          UI.open("gacha");
          await waitFor(()=>document.querySelector("#gachaChestOnlyV12 .gco-card"),`${themeId}: themed Gacha renders`);
          UI.open("profileV082");
          await waitFor(()=>document.querySelector("#profileBugfixV0941 .bf-card"),`${themeId}: themed Profile renders`);
          UI.open("collectionV082");
          await waitFor(()=>!document.getElementById("libraryV0551")?.classList.contains("hidden"),`${themeId}: themed Collection renders`);
          UI.open("playerUpgrade");
          await waitFor(()=>document.querySelector("#playerUpgrade .skill-node-v082"),`${themeId}: themed Skill Tree renders`);
          UI.open("mailV063");
          await waitFor(()=>document.querySelector("#mailBugfixV0941 .bf-card"),`${themeId}: themed Mail renders`);
        }
        assert.ok(themeColours.every(Boolean)&&themeColours[0]!==themeColours[1],"Cozy Cherry and Summer Splash keep distinct shared theme variables");
        window.CHERRIFT_THEMES.select("default",UI.save,{silent:true});
        UI.open("menu");
      }

      const moreButton=document.querySelector("#globalMobileNavV052 > button[data-v082-toggle-mobile]");
      const drawer=document.getElementById("mobileMenuV082");
      click(window,moreButton,`${name} open More drawer from Home`);
      await waitFor(()=>!drawer.classList.contains("hidden")&&window.getComputedStyle(drawer).display!=="none",`${name}: More drawer opens visibly`);
      assert.equal(drawer.getAttribute("aria-hidden"),"false",`${name}: open More drawer is accessible`);
      await assertActiveNav(window,name,"[data-v082-toggle-mobile]","open More drawer");

      click(window,drawer.querySelector('[data-v082-open="settings"]'),`${name} open Settings from More drawer`);
      await waitFor(()=>!document.getElementById("settings")?.classList.contains("hidden")&&drawer.classList.contains("hidden"),`${name}: More destination opens and drawer closes`);
      await assertActiveNav(window,name,"[data-v082-toggle-mobile]","Settings opened from More");

      click(window,moreButton,`${name} reopen More drawer from Settings`);
      await waitFor(()=>!drawer.classList.contains("hidden")&&window.getComputedStyle(drawer).display!=="none",`${name}: More drawer reopens from a subpage`);
      click(window,drawer.querySelector("[data-v082-toggle-mobile]"),`${name} close More drawer`);
      await waitFor(()=>drawer.classList.contains("hidden"),`${name}: More close button works`);
      await assertActiveNav(window,name,"[data-v082-toggle-mobile]","Settings after closing More");

      UI.open("dailyQuests");
      await waitFor(()=>!document.getElementById("dailyQuests")?.classList.contains("hidden"),`${name}: Daily Quests route`);
      await assertActiveNav(window,name,"[data-v082-toggle-mobile]","Daily Quests / More");
      UI.open("loginRewards");
      await waitFor(()=>!document.getElementById("loginRewards")?.classList.contains("hidden"),`${name}: Login Rewards route`);
      await assertActiveNav(window,name,"[data-v082-toggle-mobile]","Login Rewards / More");
      UI.open("menu");
      await waitFor(()=>!document.getElementById("menu")?.classList.contains("hidden"),`${name}: return Home after More checks`);
      await assertActiveNav(window,name,'[data-v082-open="menu"]',"Home after More checks");
      const fullscreenHeight=height+37;
      window.visualViewport.height=fullscreenHeight;
      document.dispatchEvent(new window.Event("fullscreenchange"));
      await waitFor(()=>document.documentElement.style.getPropertyValue("--cherrift-viewport-height")===`${fullscreenHeight}px`,`${name}: fullscreen viewport is recalculated`);
    }

    const meaningful=errors.filter(error=>!/Not implemented: HTMLCanvasElement/i.test(error));
    assert.deepEqual(meaningful,[],`${name}: no runtime errors`);
    return {name,viewport:`${width}x${height}`,skins:window.CHERRIFT_DATA.skins.length};
  } finally {
    await new Promise(resolve=>setTimeout(resolve,100));
    dom.window.close();
  }
}

async function exerciseReturningSession(){
  const {dom,window,errors}=await loadApp("returning-session",1280,760);
  try{
    await waitFor(()=>window.CHERRIFT_AUTH.getState().mode==="discord","returning session");
    assert.equal(window.CHERRIFT_AUTH.getState().gateVisible,false,"returning session: gate skipped");
    assert.equal(window.CHERRIFT_AUTH.getState().account?.discordId,"987654321","returning session: identity restored");
    assert.equal(window.CHERRIFT_AUTH.getState().memoryOnly,true,"returning session: local account backup mode when cloud API is unavailable");
    window.UI.save.coins=4321;
    window.CherriftStorage.save(window.UI.save);
    const backup=JSON.parse(window.localStorage.getItem("cherrift-discord-backup-v1:returning-user"));
    assert.equal(backup?.saveData?.coins,4321,"returning session: every Discord save is backed up synchronously");
    await waitFor(()=>/0\.9\.5/.test(window.document.title),"returning session current version");
    assert.match(window.document.title,/0\.9\.5/,"returning session: current version");
    const meaningful=errors.filter(error=>!/Not implemented: HTMLCanvasElement/i.test(error));
    assert.deepEqual(meaningful,[],"returning session: no runtime errors");
    return {name:"returning session",viewport:"1280x760"};
  } finally {
    await new Promise(resolve=>setTimeout(resolve,100));
    dom.window.close();
  }
}

const smokeCases={
  desktop:()=>exercise("desktop",1440,900),
  "short-desktop":()=>exercise("short-desktop",1128,584),
  "phone-portrait":()=>exercise("phone-portrait",390,844),
  "phone-landscape":()=>exercise("phone-landscape",844,390),
  "returning-session":()=>exerciseReturningSession()
};
const caseArgument=process.argv.find(argument=>argument.startsWith("--case="))?.slice(7);
if(caseArgument&&!smokeCases[caseArgument])throw new Error(`Unknown smoke case: ${caseArgument}`);

try{
  const selectedCases=caseArgument?[caseArgument]:Object.keys(smokeCases);
  const results=[];
  for(const selectedCase of selectedCases)results.push(await smokeCases[selectedCase]());
  for(const result of results)console.log(`PASS ${result.name} ${result.viewport}${result.skins?` · ${result.skins} skins`:""}`);
  console.log("CHERRIFT v0.9.5 pre-beta smoke tests passed.");
} finally {
  server.closeAllConnections?.();
  server.close();
}
