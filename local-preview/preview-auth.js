/* Local-only adapter loaded IN PLACE OF src/cherrift_auth.js, never in production. */
(() => {
  'use strict';
  if (!window.CHERRIFT_PREVIEW) throw new Error('Preview-only script is not allowed without local config.');
  const KEY = 'CHERRIFT_LOCAL_PREVIEW_SAVE_V1';
  const ID = 'cherrift-local-preview';
  let storageBridged = false;
  let saveGeneration = 1;
  let busy = Promise.resolve();

  function copy(value) { return structuredClone(value); }
  function localLoad() {
    try {
      const raw=localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {console.warn('[PREVIEW] Nem sikerült beolvasni a mentést',e);return null;}
  }
  function localSave(save) {
    try {localStorage.setItem(KEY,JSON.stringify(save));return true;}
    catch (e) {console.warn('[PREVIEW] Nem sikerült eltárolni a tesztmentést',e);return false;}
  }
  function freshSave() {
    const s=copy(window.CherriftStorage?.defaults?.() || {});
    const skins=[...(window.CHERRIFT_PREVIEW.skins || []), ...(window.CHERRIFT_DATA?.skins?.map(x=>x.id) || [])];
    const stages=[...(window.CHERRIFT_PREVIEW.stages || []), ...(window.CHERRIFT_V040?.stages?.map(x=>x.id) || [])];
    s.unlockedSkins = [...new Set([...(s.unlockedSkins||[]),...skins,'cherry_default'])];
    s.unlockedStages = [...new Set([...(s.unlockedStages||[]),...stages,'world_1_1'])];
    s.coins = 100000;
    s.bloomGems = 10000;
    s.blossomGems = 10000;
    s.sakuraEssence = 10000;
    s.chests = {common:99,rare:99,epic:99};
    s.energy = 500;
    s.energyState = {...(s.energyState || {}),max:500,lastTick:Date.now(),refills:{},drinks:{}};
    s.account ||= {};
    s.account.level=Math.max(20,Number(s.account.level)||1);
    s.profile ||= {};
    s.profile.name='Local Preview';
    s.profile.authProvider='local-preview';
    s.profile.activeTitle='head_gm';
    s.ownedTitles = [...new Set([...(s.ownedTitles||[]),'head_gm'])];
    s.security ||= {};
    s.security.accountOwnerId=ID;
    s.security.online ||= {receipts:[]};
    s.selectedStageId='world_1_1';
    return s;
  }
  function bridgeStorage() {
    if (storageBridged) return;
    const storage=window.CherriftStorage;
    if (!storage) return;
    storageBridged=true;
    storage.load=()=>copy(localLoad() || freshSave());
    storage.save=s=>localSave(s);
  }
  function currentSave() {return copy(window.UI?.save || localLoad() || freshSave());}
  function applyServerSave(next) {
    if (!window.UI?.save) return;
    const s=window.UI.save;
    for(const key of Object.keys(s)) delete s[key];
    Object.assign(s,copy(next));
    if(window.UI.game) window.UI.game.save=s;
    localSave(s);
    window.dispatchEvent(new CustomEvent('cherrift:server-save-applied',{detail:{source:'local-preview'}}));
    window.dispatchEvent(new CustomEvent('cherrift:savechange',{detail:{source:'local-preview'}}));
  }
  const account={id:ID,name:'LOCAL PREVIEW',username:'Local Preview',avatar:'',provider:'local-preview'};
  const getState=()=>({mode:'discord',gateVisible:false,busy:false,signedIn:true,cloudReady:true,
    onlinePolicy:true,memoryOnly:false,offlineAccount:false,reconnecting:false,connectionError:'',
    savePending:false,lastCloudSavedAt:'',account:{...account}});

  async function gameAction(operation,params={}) {
    // Serialized to ensure two simultaneous clicks never overwrite a save.
    const transaction = busy.catch(()=>{}).then(async()=>{
      const response=await fetch('/__preview__/action',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({operation,params,save:currentSave()})
      });
      const result=await response.json();
      if(!response.ok || !result.ok) throw new Error(result.error || 'local_action_failed');
      applyServerSave(result.save_data);
      return result;
    });
    busy=transaction;
    return transaction;
  }
  const auth = {
    version:'local-preview-only-v1',
    get clientReady(){return true;},
    get redirectUrl(){return window.location.href;},
    getClient:()=>null,
    captureAccount:()=>({userId:ID,generation:saveGeneration}),
    isCurrentAccount:ctx=>ctx?.userId===ID && ctx?.generation===saveGeneration,
    acceptServerSave:applyServerSave,
    getState,
    bootstrapSave(){bridgeStorage();return currentSave();},
    start(){
      window.dispatchEvent(new CustomEvent('cherrift:authgate',{detail:{visible:false,mode:'discord'}}));
      window.dispatchEvent(new CustomEvent('cherrift:runtime-ready',{detail:{mode:'discord'}}));
      return true;
    },
    openGate:()=>false,
    continueAsGuest:()=>true,
    signInWithDiscord:async()=>false,
    signOut:async()=>false,
    flushCloudSave:async()=>true,
    gameAction,
    reconnectCloud:async()=>true,
    applySessionForTesting:async()=>false
  };
  window.__CHERRIFT_AUTH_V3__=true;
  window.CHERRIFT_AUTH=auth;
  window.CHERRIFT_PREVIEW_RESET=()=>{saveGeneration++;localStorage.removeItem(KEY);location.reload();};
  console.info('[CHERRIFT Preview] Isolated local save + local gameplay API. Live Supabase login disabled.');
})();
