(() => {
"use strict";

const VERSION="0.9.0-night-bloom";
const DISPLAY_VERSION="v0.9.0";
const id=value=>document.getElementById(value);
const q=(selector,root=document)=>root?.querySelector?.(selector)||null;
const qa=(selector,root=document)=>Array.from(root?.querySelectorAll?.(selector)||[]);
if(!window.UI||!window.CHERRIFT_CONFIG||!window.CHERRIFT_DATA)return;

function ensureCss(){
  if(id("v090css"))return;
  const link=document.createElement("link");link.id="v090css";link.rel="stylesheet";link.href="v090.css?v=090-slotfix1";document.head.appendChild(link);
}

const ART={
  cherry_default:["assets/player/skins/base_cherry/base_cherry_icon.png","assets/player/skins/base_cherry/base_cherry_splashart.png"],
  fairy_cherry:["assets/player/skins/fairy_cherry/fairy_cherry_icon.png","assets/player/skins/fairy_cherry/fairy_cherry_splashart.jpg"],
  beastclaw_cherry:["assets/player/skins/beastclaw_cherry/beastclaw_cherry_icon.png","assets/player/skins/beastclaw_cherry/beastclaw_cherry_splashart.png"],
  ninja_cherry:["assets/player/skins/ninja_cherry/ninja_cherry_icon.png","assets/player/skins/ninja_cherry/ninja_cherry_splashart.png"],
  succubus_cherry:["assets/player/skins/succubus_cherry/succubus_cherry_icon.png","assets/player/skins/succubus_cherry/succubus_cherry_splashart.png"],
  warrior_cherry:["assets/player/skins/warrior_cherry/warrior_cherry_icon.png","assets/player/skins/warrior_cherry/warrior_cherry_splashart.png"],
  wuxia_sakura_cherry:["assets/player/skins/wuxia_sakura_cherry/wuxia_sakura_cherry_icon.png","assets/player/skins/wuxia_sakura_cherry/wuxia_sakura_cherry_splashart.jpg"],
  mage_cherry:["assets/player/skins/mage_cherry/mage_cherry_icon.png","assets/player/skins/mage_cherry/mage_cherry_splashart.png"],
  archer_cherry:["assets/player/skins/archer_cherry/archer_cherry_icon.png","assets/player/skins/archer_cherry/archer_cherry_splashart.png"]
};
for(const skin of CHERRIFT_DATA.skins||[]){
  if(ART[skin.id]){skin.icon=ART[skin.id][0];skin.splash=ART[skin.id][1];}
}

CHERRIFT_CONFIG.version=VERSION;
CHERRIFT_DATA.version=VERSION;
CHERRIFT_CONFIG.performance.renderScaleMax=Math.min(Number(CHERRIFT_CONFIG.performance.renderScaleMax)||1.5,Math.min(innerWidth||1280,innerHeight||720)<=860?1.3:1.5);

function patchVersion(){
  if(!document.title.includes(DISPLAY_VERSION))document.title=`CHERRIFT ${DISPLAY_VERSION} – TEST BUILD`;
  const labels=[
    [q(".boot-sub-v060"),`${DISPLAY_VERSION} · NIGHT BLOOM`],
    [id("menuBuildVersion"),`${DISPLAY_VERSION} · TEST BUILD`]
  ];
  for(const [element,text] of labels)if(element&&element.textContent!==text)element.textContent=text;
  qa(".version-badge-v063,[data-v063-version]").forEach(element=>{const text=`${DISPLAY_VERSION} · TEST BUILD`;if(element.textContent!==text)element.textContent=text;});
  const patch=q("#menu .patch-card");
  if(patch){
    const badge=q("header span",patch),copy=q(":scope > p",patch);
    if(badge&&badge.textContent!==DISPLAY_VERSION)badge.textContent=DISPLAY_VERSION;
    if(copy)copy.textContent="Combat feel, World 1 remaster, Mage & Archer Cherry, enemy/boss behavior, run loot and Night Bloom mobile polish.";
  }
}

function deviceClass(){
  const mobile=matchMedia("(max-width:820px)").matches;
  document.body.classList.toggle("v090-mobile",mobile);
  document.body.classList.toggle("v090-landscape",mobile&&innerWidth>innerHeight);
  if(UI.game&&mobile)requestAnimationFrame(()=>UI.game.resize?.());
}

function ensureMobileNav(){
  const nav=id("globalMobileNavV052");if(!nav)return;
  const playButtons=qa('[data-v082-open="worlds"]',nav);
  playButtons.slice(1).forEach(button=>button.remove());
  nav.classList.add("mobile-nav-v090");
  const buttons=qa(":scope > button",nav);
  if(buttons.length!==5&&window.CHERRIFT_V082?.refresh){window.CHERRIFT_V082.refresh();return;}
  const labels=["Play","Gear","Home","Gacha","More"];
  qa(":scope > button b",nav).forEach((label,index)=>{if(labels[index])label.textContent=labels[index];});
}

function selectedSkin(){
  return CHERRIFT_DATA.skins.find(skin=>skin.id===UI.save?.selectedSkin)||CHERRIFT_DATA.skins[0];
}

function decorateSkinNavigation(){
  const skin=selectedSkin();if(!skin?.icon)return;
  const buttons=qa('[data-v082-open="skins"],[data-v060-open="skins"],[data-open="skins"]');
  for(const button of buttons){
    const holder=q("i,span",button);if(!holder)continue;
    holder.classList.add("skin-nav-icon-v090");
    if(q("img",holder)?.getAttribute("src")===skin.icon)continue;
    holder.innerHTML=`<img src="${skin.icon}" alt="">`;
  }
}

function ensureSkinNotice(){
  const unseen=["mage_cherry","archer_cherry"].some(skin=>!UI.save?.noticesSeenV090?.skins?.includes(skin));
  for(const button of qa('[data-v082-open="skins"],[data-v060-open="skins"]')){
    let dot=q('[data-v090-notice="skins"]',button);
    if(!dot){dot=document.createElement("em");dot.className="notice-dot-v082";dot.dataset.v090Notice="skins";button.appendChild(dot);}
    dot.classList.toggle("show",unseen);
  }
}

function markSkinsSeen(){
  if(!UI.save)return;
  UI.save.noticesSeenV090||={};
  UI.save.noticesSeenV090.skins=["mage_cherry","archer_cherry"];
  window.CherriftStorage?.save?.(UI.save);
  ensureSkinNotice();
}

function finalRefresh(){
  patchVersion();deviceClass();ensureMobileNav();decorateSkinNavigation();ensureSkinNotice();
}

const previousInit=UI.init?.bind(UI);
if(previousInit&&!UI.__v090Init){
  UI.init=function initV090(save,game){
    const result=previousInit(save,game);
    finalRefresh();
    return result;
  };
  UI.__v090Init=true;
}
const previousRefresh=UI.refreshMenu?.bind(UI);
if(previousRefresh&&!UI.__v090Refresh){
  UI.refreshMenu=function refreshMenuV090(...args){const result=previousRefresh(...args);finalRefresh();requestAnimationFrame(finalRefresh);return result;};
  UI.__v090Refresh=true;
}
const previousOpen=UI.open?.bind(UI);
if(previousOpen&&!UI.__v090Open){
  UI.open=function openV090(...args){const result=previousOpen(...args);finalRefresh();requestAnimationFrame(finalRefresh);return result;};
  UI.__v090Open=true;
}

document.addEventListener("click",event=>{
  if(event.target.closest?.('[data-v082-open="skins"],[data-v060-open="skins"],[data-open="skins"]'))setTimeout(markSkinsSeen,0);
},true);

if(window.CHERRIFT_V060?.preload&&!window.CHERRIFT_V060.preload.__v090){
  const previousPreload=window.CHERRIFT_V060.preload;
  const preload=async function preloadV090(save,report){
    const result=await previousPreload(save,report);
    const config=CHERRIFT_CONFIG.player.skins?.[save?.selectedSkin];
    const sources=[...new Set(Object.values(config?.states||{}).flatMap(state=>Object.values(state?.dirs||{})))];
    const load=source=>new Promise(resolve=>{
      const image=new Image();const timer=setTimeout(()=>resolve(false),5000);
      image.onload=()=>{clearTimeout(timer);resolve(true);};image.onerror=()=>{clearTimeout(timer);resolve(false);};image.decoding="async";image.src=source;
    });
    const loaded=await Promise.all(sources.map(load));
    return {total:(result.total||0)+sources.length,failures:[...(result.failures||[]),...sources.filter((_,index)=>!loaded[index])]};
  };
  preload.__v090=true;
  window.CHERRIFT_V060.preload=preload;
}

if(window.CherriftGame){
  const proto=CherriftGame.prototype;
  const previousDrawGround=proto.drawGround;
  proto.drawGround=function drawGroundV090(context,zoom=1){
    const result=previousDrawGround.call(this,context,zoom);
    if(this.stage?.world!==2)return result;
    const quality=this.save?.settings?.effectQuality==="low"?7:this.save?.settings?.effectQuality==="high"?18:12;
    const viewWidth=this.w/zoom,viewHeight=this.h/zoom;
    context.save();
    for(let index=0;index<quality;index++){
      const seed=index*73.17;
      const x=this.camera.x-viewWidth/2+((Math.sin(seed)*.5+.5)*viewWidth+this.t*(8+index%3))%viewWidth;
      const y=this.camera.y-viewHeight/2+(Math.cos(seed*1.7)*.5+.5)*viewHeight;
      const pulse=.28+(Math.sin(this.t*(1.5+index%4*.2)+seed)*.5+.5)*.42;
      context.globalAlpha=pulse;
      context.fillStyle=index%4===0?"#ffc4e9":"#a8ddff";
      context.shadowColor=context.fillStyle;context.shadowBlur=8;
      context.beginPath();context.arc(x,y,index%4===0?2.4:1.6,0,Math.PI*2);context.fill();
    }
    context.restore();
    return result;
  };
}

let refreshQueued=false;
const observer=new MutationObserver(()=>{
  if(refreshQueued)return;refreshQueued=true;
  requestAnimationFrame(()=>{refreshQueued=false;finalRefresh();});
});
observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
window.addEventListener("resize",finalRefresh);
window.visualViewport?.addEventListener("resize",finalRefresh);
window.addEventListener("cherrift:languagechange",()=>setTimeout(finalRefresh,0));

ensureCss();
finalRefresh();
window.CHERRIFT_V090={version:VERSION,displayVersion:DISPLAY_VERSION,refresh:finalRefresh,art:ART};
console.info("[CHERRIFT] v0.9.0 Night Bloom and mobile compatibility loaded.");
})();
