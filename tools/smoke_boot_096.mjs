import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requested = process.argv.find(arg => arg.startsWith("--case="))?.slice(7) || "desktop";
const cases = {
  desktop:[1440,900],
  "short-desktop":[1128,584],
  "phone-portrait":[390,844],
  "phone-landscape":[844,390],
  "returning-session":[1280,760]
};
if (!cases[requested]) throw new Error(`Unknown smoke case: ${requested}`);
const [width,height] = cases[requested];
const returning = requested === "returning-session";
const log = text => console.log(`[boot-smoke] ${requested} · ${text}`);

const contentTypes = {
  ".css":"text/css; charset=utf-8", ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8",
  ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg",
  ".webp":"image/webp", ".wav":"audio/wav"
};

function safeFile(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  const file = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
  return file === root || file.startsWith(`${root}${path.sep}`) ? file : null;
}

const server = createServer(async (request,response) => {
  const file = safeFile(request.url || "/");
  if (!file) return response.writeHead(403).end("Forbidden");
  try {
    const info = await stat(file);
    const target = info.isDirectory() ? path.join(file,"index.html") : file;
    response.writeHead(200, {
      "content-type":contentTypes[path.extname(target).toLowerCase()] || "application/octet-stream",
      "cache-control":"no-store"
    });
    response.end(await readFile(target));
  } catch (_) {
    response.writeHead(404).end("Not found");
  }
});
await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/`;

function canvasContext() {
  const gradient = {addColorStop(){}};
  const values = {
    createLinearGradient:()=>gradient,
    createRadialGradient:()=>gradient,
    createPattern:()=>({setTransform(){}}),
    getImageData:(_x,_y,w=1,h=1)=>({data:new Uint8ClampedArray(Math.max(4,w*h*4)),width:w,height:h}),
    createImageData:(w=1,h=1)=>({data:new Uint8ClampedArray(Math.max(4,w*h*4)),width:w,height:h}),
    measureText:text=>({width:String(text).length*8}),
    isPointInPath:()=>false,
    isPointInStroke:()=>false
  };
  return new Proxy(values, {
    get(target,key){ return key in target ? target[key] : ()=>{}; },
    set(target,key,value){ target[key]=value; return true; }
  });
}

function installBrowserStubs(window) {
  const browserSetTimeout = window.setTimeout.bind(window);
  window.__CHERRIFT_GACHA_OPENING_MS__ = 137;
  window.setTimeout = (callback,delay=0,...args) => {
    const ms = Number(delay) || 0;
    const testDelay = ms === 137 ? ms : Math.min(ms,20);
    return browserSetTimeout(callback,testDelay,...args);
  };

  Object.defineProperties(window, {
    innerWidth:{configurable:true,value:width},
    innerHeight:{configurable:true,value:height},
    devicePixelRatio:{configurable:true,value:1},
    visualViewport:{configurable:true,value:{width,height,addEventListener(){},removeEventListener(){}}}
  });
  const touch = requested.startsWith("phone");
  Object.defineProperty(window.navigator,"maxTouchPoints",{configurable:true,value:touch?5:0});
  window.matchMedia = query => {
    const max=query.match(/max-width\s*:\s*(\d+)px/i), min=query.match(/min-width\s*:\s*(\d+)px/i);
    const portrait=query.includes("orientation:portrait"), landscape=query.includes("orientation:landscape");
    const coarse=query.includes("pointer:coarse"), fine=query.includes("pointer:fine");
    return {
      matches:(!max||width<=Number(max[1]))&&(!min||width>=Number(min[1]))&&
        (!portrait||height>=width)&&(!landscape||width>height)&&(!coarse||touch)&&(!fine||!touch)&&
        !query.includes("prefers-reduced-motion"),
      media:query,onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent:()=>true
    };
  };

  class FakeImage extends window.EventTarget {
    constructor(){super();this.width=192;this.height=192;this.naturalWidth=192;this.naturalHeight=192;this.complete=false;this.onload=null;this.onerror=null;this._src="";}
    set src(value){this._src=String(value);window.setTimeout(()=>{this.complete=true;this.onload?.(new window.Event("load"));this.dispatchEvent(new window.Event("load"));},0);}
    get src(){return this._src;}
    decode(){return Promise.resolve();}
  }
  window.Image=FakeImage;
  window.Audio=class {constructor(src=""){this.src=src;this.volume=1;this.currentTime=0;}load(){}play(){return Promise.resolve();}pause(){}cloneNode(){return new window.Audio(this.src);}};
  window.HTMLCanvasElement.prototype.getContext=function(){const ctx=canvasContext();ctx.canvas=this;return ctx;};
  window.HTMLCanvasElement.prototype.toDataURL=()=>"data:image/png;base64,";
  window.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:width,bottom:height,width,height,toJSON(){return this;}});
  window.Element.prototype.scrollIntoView ||= ()=>{};
  window.Element.prototype.scrollBy ||= ()=>{};
  window.scrollTo=()=>{};
  window.confirm=()=>true;
  window.Element.prototype.animate ||= ()=>({cancel(){},finished:Promise.resolve()});
  window.HTMLElement.prototype.requestFullscreen ||= ()=>Promise.resolve();
  window.document.exitFullscreen ||= ()=>Promise.resolve();
  window.navigator.vibrate ||= ()=>true;
  window.requestIdleCallback ||= callback=>window.setTimeout(()=>callback({didTimeout:false,timeRemaining:()=>20}),0);
  window.cancelIdleCallback ||= handle=>window.clearTimeout(handle);
  window.ResizeObserver ||= class {observe(){}unobserve(){}disconnect(){}};
  Object.defineProperty(window.navigator,"clipboard",{configurable:true,value:{writeText:async()=>{}}});

  window.__authSession = returning ? {
    user:{id:"returning-user",user_metadata:{full_name:"Returning Cherry"},identities:[{provider:"discord",identity_data:{provider_id:"987654321"}}]}
  } : null;
  window.__authStateCallback=null;
  window.__CHERRIFT_SUPABASE_FACTORY__=()=>({
    auth:{
      async getSession(){return {data:{session:window.__authSession},error:null};},
      async signInWithOAuth(request){return {data:{provider:request.provider,url:"https://discord.test/oauth"},error:null};},
      onAuthStateChange(callback){window.__authStateCallback=callback;window.setTimeout(()=>callback("INITIAL_SESSION",window.__authSession),0);return {data:{subscription:{unsubscribe(){}}}};},
      async signOut(){window.__authSession=null;window.__authStateCallback?.("SIGNED_OUT",null);return {error:null};}
    }
  });

  // Mock CherriftStorage für Smoke Test
  if (!window.CherriftStorage) {
    window.CherriftStorage = {
      key: "cherrift-save",
      defaults: () => ({
        prebeta: { schema: "prebeta-1", version: "1.0.0", starterCreated: true },
        account: { level: 1, xp: 0, totalXp: 0, skillPoints: 0 },
        coins: 1000,
        unlockedSkins: ["cherry_default"],
        unlockedStages: ["world_1_1"],
        selectedSkin: "cherry_default"
      }),
      load: function() {
        try { return JSON.parse(localStorage.getItem(this.key) || "{}"); }
        catch { return this.defaults(); }
      },
      save: function(data) {
        localStorage.setItem(this.key, JSON.stringify(data));
      }
    };
  }
}

async function waitFor(check,message,timeout=30000) {
  const start=Date.now();
  while(Date.now()-start<timeout){
    try { const value=check(); if(value) return value; } catch (_) {}
    await new Promise(resolve=>setTimeout(resolve,25));
  }
  throw new Error(`Timed out: ${message}`);
}

function click(window,element,label){
  assert.ok(element,`${label}: control exists`);
  element.dispatchEvent(new window.MouseEvent("click",{bubbles:true,cancelable:true}));
}

const errors=[];
const virtualConsole=new VirtualConsole();
virtualConsole.on("jsdomError",error=>{
  const message=String(error?.message||error);
  if(!/Not implemented: HTMLCanvasElement/i.test(message)) errors.push(`jsdom: ${message}`);
});
virtualConsole.on("error",(...values)=>errors.push(values.map(String).join(" ")));

let dom;
try {
  log("opening app");
  dom=await JSDOM.fromURL(`${baseUrl}?smoke=${requested}`,{
    runScripts:"dangerously",resources:"usable",pretendToBeVisual:true,virtualConsole,
    beforeParse(window){installBrowserStubs(window);}
  });
  const {window}=dom;
  const {document}=window;

  log("waiting for boot controller");
  await waitFor(()=>window.CHERRIFT_BOOT?.getState,"boot controller",30000);

  if(returning){
    log("waiting for returning session");
    await waitFor(()=>{
      const s=window.CHERRIFT_BOOT?.getState?.();
      return s?.phase==="start" && s?.authMode==="discord";
    },"returning Discord session",45000);
  } else {
    log("waiting for auth choice");
    await waitFor(()=>window.CHERRIFT_BOOT?.getState?.().phase==="auth","auth phase",30000);
    log("choosing Guest");
    click(window,document.getElementById("bootGuestV096"),`${requested} Guest login`);
    log("waiting for save/runtime");
    await waitFor(()=>window.CHERRIFT_BOOT?.getState?.().phase==="start","click-to-start phase",45000);
  }

  const state=window.CHERRIFT_BOOT.getState();
  log(`ready · waitingFor=${state.waitingFor||"none"}`);
  assert.equal(state.phase,"start",`${requested}: click-to-start phase`);
  assert.equal(state.stable,true,`${requested}: startup stable`);
  assert.equal(state.saveReady,true,`${requested}: save ready`);
  assert.equal(state.prebeta,true,`${requested}: pre-beta ready`);
  assert.equal(state.runtime,true,`${requested}: runtime ready`);
  assert.ok(window.UI?.save,`${requested}: UI.save exists`);
  assert.ok(window.UI?.game,`${requested}: UI.game exists`);
  assert.ok(window.__CHERRIFT_CLEAN_RUNTIME__||window.__CHERRIFT_RUNTIME_READY__,`${requested}: Clean Runtime active`);
  assert.equal(document.body.classList.contains("v060-booting"),true,`${requested}: lobby covered before Start`);

  log("releasing lobby");
  click(window,document.getElementById("bootStartV096"),`${requested} click-to-start`);
  await waitFor(()=>!document.body.classList.contains("v060-booting"),"lobby release",10000);
  assert.equal(document.body.classList.contains("v062-startup-failed"),false,`${requested}: no startup failure`);

  // The old test waited for deleted Fixpack globals and the old auth gate.
  // This boot smoke intentionally validates the current Clean Runtime contract only.
  const meaningful=errors.filter(error=>!/Could not load link/i.test(error));
  assert.deepEqual(meaningful,[],`${requested}: no runtime errors`);
  log("PASS");
  console.log(`PASS ${requested} ${width}x${height} · Clean Runtime boot`);
} finally {
  if(dom){await new Promise(resolve=>setTimeout(resolve,50));dom.window.close();}
  server.closeAllConnections?.();
  await new Promise(resolve=>server.close(resolve));
}
