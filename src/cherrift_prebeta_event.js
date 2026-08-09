(() => {
  "use strict";
  if (window.__CHERRIFT_PREBETA_EVENT__) return;
  window.__CHERRIFT_PREBETA_EVENT__ = true;

  const EVENT_ID="closed_beta_2026";
  const $=id=>document.getElementById(id);
  const q=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const n=value=>Math.max(0,Math.floor(Number(value)||0));
  const esc=value=>String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const hu=()=>window.CHERRIFT_LOCALIZATION?.language?.()!=="en"&&window.UI?.save?.settings?.language!=="en";
  const copy=(a,b)=>hu()?a:b;
  const state={tab:"overview",wrapped:false};
  const dayKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;

  const LOGIN_REWARDS=[
    {coins:300},
    {chests:{common:1},energy:10},
    {coins:500,bloomGems:5},
    {chests:{common:1},energy:15},
    {coins:800,bloomGems:10},
    {chests:{rare:1},energy:20},
    {coins:1200,chests:{rare:1},bloomGems:25,drinks:{standard:1}}
  ];
  const DAILY_TASKS=[
    {id:"login",labelHu:"Napi belépés",labelEn:"Daily login",goal:1,reward:{coins:100}},
    {id:"kills",labelHu:"Győzz le 50 ellenfelet",labelEn:"Defeat 50 enemies",goal:50,reward:{coins:250,energy:5}},
    {id:"clears",labelHu:"Teljesíts 1 pályát",labelEn:"Clear 1 stage",goal:1,reward:{chests:{common:1},energy:10}}
  ];
  const SHOP=[
    {id:"small_drink",nameHu:"Kis energiaital",nameEn:"Small Energy Drink",icon:"assets/items/sakura_potion.png",price:{coins:500},limit:2,reward:{drinks:{small:1}}},
    {id:"common_chest",nameHu:"Common láda",nameEn:"Common Chest",icon:"assets/items/chests/common_chest.png",price:{coins:650},limit:2,reward:{chests:{common:1}}},
    {id:"rare_chest",nameHu:"Rare láda",nameEn:"Rare Chest",icon:"assets/items/chests/rare_chest.png",price:{bloomGems:70},limit:1,reward:{chests:{rare:1}}},
    {id:"epic_chest",nameHu:"Epic láda",nameEn:"Epic Chest",icon:"assets/items/chests/epic_chest.png",price:{bloomGems:220},limit:1,reward:{chests:{epic:1}}}
  ];

  function ensureSave(){
    const save=window.UI?.save;if(!save)return null;
    save.events ||= {};
    const event=save.events[EVENT_ID] ||= {loginDays:[],loginClaimed:[],daily:{},shop:{}};
    event.loginDays=Array.isArray(event.loginDays)?event.loginDays:[];
    event.loginClaimed=Array.isArray(event.loginClaimed)?event.loginClaimed:[];
    event.daily ||= {};event.shop ||= {};
    const today=dayKey();
    if(!event.loginDays.includes(today)) event.loginDays.push(today);
    const stats=save.stats||{};
    event.daily[today] ||= {baseKills:n(stats.kills),baseClears:n(stats.clears),claimed:[]};
    event.daily[today].claimed=Array.isArray(event.daily[today].claimed)?event.daily[today].claimed:[];
    event.shop[today] ||= {};
    return event;
  }

  function persist(){
    window.CherriftStorage?.save?.(window.UI.save);
    window.UI?.refreshMenu?.();
    window.dispatchEvent(new CustomEvent("cherrift:eventchange"));
  }

  function grant(reward={}){
    const save=window.UI.save;
    save.coins=n(save.coins)+n(reward.coins);
    const gems=n(save.bloomGems??save.blossomGems)+n(reward.bloomGems);
    save.bloomGems=gems;save.blossomGems=gems;
    save.chests={common:0,rare:0,epic:0,...(save.chests||{})};
    for(const [key,value] of Object.entries(reward.chests||{}))save.chests[key]=n(save.chests[key])+n(value);
    if(reward.energy)save.energy=n(save.energy)+n(reward.energy);
    if(reward.drinks){
      save.energyState ||= {max:50,lastTick:Date.now(),refills:{},drinks:{}};
      save.energyState.drinks ||= {};
      for(const [key,value] of Object.entries(reward.drinks))save.energyState.drinks[key]=n(save.energyState.drinks[key])+n(value);
    }
  }

  function rewardText(reward={}){
    const parts=[];
    if(reward.coins)parts.push(`${reward.coins} Coin`);
    if(reward.bloomGems)parts.push(`${reward.bloomGems} Bloom Gem`);
    if(reward.energy)parts.push(`${reward.energy} Energy`);
    for(const [key,value] of Object.entries(reward.chests||{}))parts.push(`${value} ${key[0].toUpperCase()+key.slice(1)} Chest`);
    for(const [key,value] of Object.entries(reward.drinks||{}))parts.push(`${value} ${key} Energy Drink`);
    return parts.join(" · ");
  }

  function dailyProgress(task,event){
    if(task.id==="login")return 1;
    const today=event.daily[dayKey()]||{};
    const stats=window.UI.save.stats||{};
    if(task.id==="kills")return Math.max(0,n(stats.kills)-n(today.baseKills));
    return Math.max(0,n(stats.clears)-n(today.baseClears));
  }

  function ensurePanel(){
    let panel=$("eventHubPrebeta");
    if(!panel){panel=document.createElement("section");panel.id="eventHubPrebeta";panel.className="panel hidden prebeta-event-panel";$("app")?.appendChild(panel)}
    return panel;
  }

  function ensureLobbyButton(){
    const root=q("#menuDashboardV060 .dashboard-shortcuts-v060");
    if(root&&!q("[data-prebeta-event-open]",root))root.insertAdjacentHTML("afterbegin",`<button type="button" data-prebeta-event-open><i><img src="assets/items/chests/epic_chest.png" alt=""></i><span><b>Events</b><small>Closed Beta</small></span><em class="notice-dot-v082"></em></button>`);
  }

  function overview(event){
    const daily=event.daily[dayKey()];
    const claimed=event.loginClaimed.length+(daily?.claimed?.length||0);
    return `<section class="event-hero-pb"><small>CLOSED BETA EVENT</small><h2>${copy("Üdv a Closed Bétában!","Welcome to the Closed Beta!")}</h2><p>${copy("Lépj be hét különböző napon, teljesíts napi célokat és váltsd be a limitált készletet.","Log in on seven different days, complete daily goals and use the limited shop.")}</p><div><b>${event.loginDays.length}/7</b><span>${copy("belépési nap","login days")}</span><b>${claimed}</b><span>${copy("átvett jutalom","claimed rewards")}</span></div></section>
      <div class="event-overview-grid-pb"><button data-event-tab="login"><b>7 DAY LOGIN</b><span>${event.loginDays.length}/7 ${copy("nap elérve","days reached")}</span></button><button data-event-tab="daily"><b>${copy("NAPI EVENT","DAILY EVENT")}</b><span>${daily?.claimed?.length||0}/3 ${copy("átvéve","claimed")}</span></button><button data-event-tab="shop"><b>EVENT SHOP</b><span>${copy("Napi limitált ajánlatok","Daily limited offers")}</span></button></div>`;
  }

  function loginView(event){return `<div class="event-login-grid-pb">${LOGIN_REWARDS.map((reward,index)=>{const day=index+1,available=event.loginDays.length>=day,claimed=event.loginClaimed.includes(day);return `<article class="${available?"available":"locked"} ${claimed?"claimed":""}"><small>DAY ${day}</small><h3>${rewardText(reward)}</h3><button data-event-login-claim="${day}" ${!available||claimed?"disabled":""}>${claimed?copy("Átvéve","Claimed"):available?copy("Átvétel","Claim"):copy("Zárolva","Locked")}</button></article>`}).join("")}</div>`}

  function dailyView(event){const daily=event.daily[dayKey()];return `<div class="event-daily-list-pb">${DAILY_TASKS.map(task=>{const progress=Math.min(task.goal,dailyProgress(task,event)),claimed=daily.claimed.includes(task.id),ready=progress>=task.goal;return `<article><div><small>${esc(hu()?task.labelHu:task.labelEn)}</small><b>${progress}/${task.goal}</b><i><span style="width:${Math.round(progress/task.goal*100)}%"></span></i><em>${esc(rewardText(task.reward))}</em></div><button data-event-daily-claim="${task.id}" ${!ready||claimed?"disabled":""}>${claimed?copy("Átvéve","Claimed"):copy("Átvétel","Claim")}</button></article>`}).join("")}</div>`}

  function shopView(event){const bought=event.shop[dayKey()]||{};return `<div class="event-shop-grid-pb">${SHOP.map(offer=>{const count=n(bought[offer.id]),sold=count>=offer.limit;return `<article><img src="${offer.icon}" alt=""><div><small>${esc(hu()?offer.nameHu:offer.nameEn)}</small><b>${offer.price.coins?`${offer.price.coins} Coin`:`${offer.price.bloomGems} Bloom Gem`}</b><em>${copy("Napi limit","Daily limit")}: ${count}/${offer.limit}</em></div><button data-event-buy="${offer.id}" ${sold?"disabled":""}>${sold?copy("Elfogyott","Sold out"):copy("Vétel","Buy")}</button></article>`}).join("")}</div>`}

  function render(){
    const event=ensureSave(),panel=ensurePanel();if(!event||!panel)return;
    const content=state.tab==="login"?loginView(event):state.tab==="daily"?dailyView(event):state.tab==="shop"?shopView(event):overview(event);
    panel.innerHTML=`<div class="event-shell-pb"><header><button data-event-back aria-label="Lobby" title="Lobby">←</button><div><small>CHERRIFT PRE-BETA</small><h1>Events</h1></div></header><nav>${[["overview",copy("Áttekintés","Overview")],["login","7 Day Login"],["daily",copy("Napi Event","Daily Event")],["shop","Event Shop"]].map(([key,label])=>`<button class="${state.tab===key?"active":""}" data-event-tab="${key}">${label}</button>`).join("")}</nav><main>${content}</main></div>`;
  }

  function open(tab=state.tab){state.tab=tab;ensureSave();const panel=ensurePanel();window.UI?.open?.("menu");q("#menu")?.classList.add("hidden");document.querySelectorAll("#app > .panel").forEach(node=>node.classList.add("hidden"));panel.classList.remove("hidden");panel.style.removeProperty("display");document.body.classList.remove("is-playing","is-levelup","is-loading-stage");render();persist()}

  function claimLogin(day){const event=ensureSave();if(!event||event.loginDays.length<day||event.loginClaimed.includes(day))return;grant(LOGIN_REWARDS[day-1]);event.loginClaimed.push(day);persist();render();window.UI?.toast?.(copy("Login jutalom átvéve.","Login reward claimed."))}
  function claimDaily(taskId){const event=ensureSave(),task=DAILY_TASKS.find(item=>item.id===taskId),daily=event?.daily?.[dayKey()];if(!task||!daily||daily.claimed.includes(task.id)||dailyProgress(task,event)<task.goal)return;grant(task.reward);daily.claimed.push(task.id);persist();render();window.UI?.toast?.(copy("Napi eventjutalom átvéve.","Daily event reward claimed."))}
  function buy(offerId){const event=ensureSave(),offer=SHOP.find(item=>item.id===offerId);if(!event||!offer)return;const bought=event.shop[dayKey()]||{},count=n(bought[offer.id]);if(count>=offer.limit)return;const save=window.UI.save;if(offer.price.coins&&n(save.coins)<offer.price.coins)return window.UI?.toast?.(copy("Nincs elég Coin.","Not enough Coin."));const gems=n(save.bloomGems??save.blossomGems);if(offer.price.bloomGems&&gems<offer.price.bloomGems)return window.UI?.toast?.(copy("Nincs elég Bloom Gem.","Not enough Bloom Gem."));if(offer.price.coins)save.coins=n(save.coins)-offer.price.coins;if(offer.price.bloomGems){save.bloomGems=gems-offer.price.bloomGems;save.blossomGems=save.bloomGems}grant(offer.reward);bought[offer.id]=count+1;event.shop[dayKey()]=bought;persist();render()}

  function bind(){document.addEventListener("click",event=>{const target=event.target.closest?.("[data-prebeta-event-open],[data-event-tab],[data-event-back],[data-event-login-claim],[data-event-daily-claim],[data-event-buy]");if(!target)return;event.preventDefault();event.stopPropagation();if(target.hasAttribute("data-prebeta-event-open"))return open();if(target.hasAttribute("data-event-back"))return window.UI?.open?.("menu");if(target.dataset.eventTab)return open(target.dataset.eventTab);if(target.dataset.eventLoginClaim)return claimLogin(Number(target.dataset.eventLoginClaim));if(target.dataset.eventDailyClaim)return claimDaily(target.dataset.eventDailyClaim);if(target.dataset.eventBuy)return buy(target.dataset.eventBuy)},true)}

  function start(){if(!window.UI?.save||!window.CherriftStorage)return setTimeout(start,100);ensureSave();ensurePanel();ensureLobbyButton();if(!state.wrapped){state.wrapped=true;const base=UI.open.bind(UI);UI.open=function(panel,...args){if(panel==="eventV093")panel="eventHubPrebeta";const result=base(panel,...args);if(panel==="menu")ensureLobbyButton();if(panel==="eventHubPrebeta")render();return result}}bind();persist();window.CHERRIFT_PREBETA_EVENT=Object.freeze({id:EVENT_ID,open,render,rewards:LOGIN_REWARDS,daily:DAILY_TASKS,shop:SHOP});window.dispatchEvent(new CustomEvent("cherrift:prebeta-event-ready"))}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
