/* World 1: Sunlit Meadow. Owns only its art, generation and rendering.
 * Combat, enemy AI, progression and rewards remain with the shared game.
 */
(() => {
  'use strict';
  if (window.CHERRIFT_WORLD1) return;
  function createMeadow(worldId, ROOT) {
  const night=worldId===2;
  const SPLASH = `${ROOT}splash.webp`;
  const PROFILES = Object.freeze({
    low:Object.freeze({dpr:1, detail:.45, foliage:false}),
    medium:Object.freeze({dpr:1.25, detail:.75, foliage:true}),
    high:Object.freeze({dpr:1.5, detail:1, foliage:true})
  });
  // Canonical dimensions come from the master, never the selected export tier.
  const RAW = {
    tree1:[274,304,184,14,20,12], tree2:[218,261,164,12,18,11], tree3:[254,302,194,10,19,12],
    bush1:[238,214,69,17], bush2:[266,206,65,16], bush3:[263,215,68,16],
    rock1:[294,208,70,18,29,15], rock2:[246,179,57,14,24,13], rockSmall:[223,126,23,24],
    log:[301,221,56,10,28,12], stump:[260,172,53,8,21,12], mushroom:[224,171,31,22],
    flower1:[230,187,23,34], flower2:[243,179,22,30], flower3:[249,173,21,30], grass:[214,177,29,28]
  };
  const objects = Object.freeze(Object.fromEntries(Object.entries(RAW).map(([key,[sw,sh,h,count,rx=0,ry=0]]) => [key,Object.freeze({
    src:`${ROOT}high/${key}.webp`,w:Math.round(h*sw/sh),h,count,
    anchor:key.startsWith('tree')?.89:.83,solid:rx>0,rx,ry,r:Math.max(rx,ry),
    reactive:/bush|flower|grass|mushroom/.test(key)
  })])));
  const spec = Object.freeze({ground:`${ROOT}high/ground.webp`,objects,tint:null});
  const cache = new Map();
  let request = 0;
  const profile = game => Object.hasOwn(PROFILES,game?.save?.settings?.effectQuality) ? game.save.settings.effectQuality : 'medium';
  const isWorld = game => Number((game?.stage || game?.getSelectedStage?.())?.world) === worldId;
  const boundary = () => Math.max(1200,Number(window.CHERRIFT_CONFIG?.worldSize || 4200)/2)-200;
  function randomFor(seed) {
    let value=2166136261;
    for (const char of String(seed)) value=Math.imul(value^char.charCodeAt(0),16777619);
    return () => {value+=0x6D2B79F5;let n=value;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return ((n^n>>>14)>>>0)/4294967296;};
  }
  function freshSeed() {
    if (window.crypto?.getRandomValues) return window.crypto.getRandomValues(new Uint32Array(2)).join('-');
    return `${Date.now()}-${Math.random()}`;
  }
  function image(source) {
    return new Promise((resolve,reject) => {
      const img=new Image();
      const timeout=setTimeout(()=>finish(new Error(`World1 image timed out: ${source}`)),12000);
      function finish(error) {clearTimeout(timeout);img.onload=null;img.onerror=null;error?reject(error):resolve(img);}
      img.decoding='async';
      img.onload=()=>{if(img.decode)img.decode().then(()=>finish(),finish);else finish();};
      img.onerror=()=>finish(new Error(`World1 image unavailable: ${source}`));
      img.src=source;
    });
  }
  function load(tier) {
    if (!Object.hasOwn(PROFILES,tier)) tier='medium';
    if (!cache.has(tier)) {
      const work=Promise.all(['ground',...Object.keys(objects)].map(async key=>[key,await image(`${ROOT}${tier}/${key}.webp`)]))
        .then(entries=>({tier,images:new Map(entries),patterns:new WeakMap()}))
        .catch(error=>{cache.delete(tier);throw error;});
      cache.set(tier,work);
    }
    return cache.get(tier);
  }
  async function selectArt(game) {
    const revision=++request;
    const tier=profile(game);
    const art=await load(tier);
    if (revision!==request || !isWorld(game) || profile(game)!==tier) return false;
    game.__meadowArt=art;
    // Only retain the active texture set; geometry is never rebuilt on a switch.
    for (const key of cache.keys()) if(key!==tier) cache.delete(key);
    game.__cherriftNeedsRender=true;
    game.resize?.();
    return true;
  }
  async function prepare(game) {
    game.__meadowSeed=freshSeed();
    ++request;
    game.__meadowArt=await load(profile(game));
  }
  function lane(x,y) {
    return Math.abs(y-145*Math.sin(x/540))<86 || Math.abs(x-125*Math.sin(y/610))<86;
  }
  function build(game,seed=game.__meadowSeed) {
    seed ??= (game.__meadowSeed=freshSeed());
    game.__meadowSeed=seed;
    const random=randomFor(`${seed}:${game.stage?.id || 'world_1'}`),half=boundary();
    const result=[],solid=[];
    function add(key,x,y,exterior=false) {
      const s=objects[key],scale=.88+random()*.24,h=s.h*scale,w=s.w*scale;
      const o={__cherriftCleanWorld:true,cherriftMapObject:true,meadow:true,worldId,
        kind:`meadow_${key}`,objectKey:key,assetKey:`meadow_${key}`,x,y,drawW:w,drawH:h,boxW:w,boxH:h,
        anchor:s.anchor,solid:s.solid&&!exterior,rx:s.rx*scale,ry:s.ry*scale,r:s.r*scale,
        phase:random()*Math.PI*2,detail:random(),exterior,reactive:s.reactive,alpha:1};
      result.push(o);if(o.solid)solid.push(o);
      return o;
    }
    for(const [key,s] of Object.entries(objects).filter(([,s])=>s.solid)) {
      for(let i=0;i<s.count;i++) {
        for(let tries=0;tries<120;tries++) {
          const x=(random()*2-1)*(half-140),y=(random()*2-1)*(half-140);
          if(Math.hypot(x,y)<340 || lane(x,y))continue;
          // Conservative expanded circles guarantee gaps between player obstacles.
          if(solid.some(o=>Math.hypot(x-o.x,y-o.y)<s.r*1.12+o.r+76))continue;
          add(key,x,y);break;
        }
      }
    }
    for(const [key,s] of Object.entries(objects).filter(([,s])=>!s.solid)) {
      for(let i=0;i<s.count;i++) {
        const near=solid[Math.floor(random()*solid.length)],angle=random()*Math.PI*2;
        const clustered=i%3!==0 && near;
        const x=clustered?near.x+Math.cos(angle)*(65+random()*85):(random()*2-1)*(half-45);
        const y=clustered?near.y+Math.sin(angle)*(35+random()*70):(random()*2-1)*(half-45);
        if(Math.hypot(x,y)>260 && Math.abs(x)<half-35 && Math.abs(y)<half-35)add(key,x,y);
      }
    }
    // Real scenery continues beyond the collision boundary under the dark veil.
    const keys=['tree1','tree2','tree3','bush1','bush2','rock1','rock2','log','flower1'];
    for(let i=0;i<190;i++) {
      const side=i%4,along=(random()*2-1)*(half+650),depth=half+70+random()*600;
      add(keys[Math.floor(random()*keys.length)],side<2?(side===0?-depth:depth):along,side>=2?(side===2?-depth:depth):along,true);
    }
    const patches=Array.from({length:65},()=>({x:(random()*2-1)*(half+500),y:(random()*2-1)*(half+500),r:70+random()*100,phase:random()}));
    game.obstacles=result;game.__cherriftCleanSolidObjects=solid;
    game.__cherriftCleanWorld=worldId;game.__meadow={seed,patches,worldId};
    game.__meadow.fireflies=night?Array.from({length:900},()=>({
      x:(random()*2-1)*(half+450),y:(random()*2-1)*(half+450),
      phase:random()*Math.PI*2,speed:.10+random()*.13,rank:random(),radius:28+random()*32
    })):[];
    window.CHERRIFT_REACTIVE_FOLIAGE?.refresh?.(game);
    return result;
  }
  function collides(game,x=game.player?.x,y=game.player?.y) {
    if(!game.player)return false;
    const p=game.player,r=Number(p.r)||18;
    return (game.__cherriftCleanSolidObjects||[]).some(o=>((x-o.x)/(o.rx+r))**2+((y-o.y)/(o.ry+r))**2<1);
  }
  function inView(game,o,margin=240) {
    const zoom=game.zoom||1,camera=game.camera||{x:0,y:0};
    return Math.abs(o.x-camera.x)<game.w/zoom/2+margin && Math.abs(o.y-camera.y)<game.h/zoom/2+margin;
  }
  function drawGround(game,c,zoom=1) {
    const art=game.__meadowArt,im=art?.images.get('ground');
    const vw=game.w/zoom,vh=game.h/zoom,x=game.camera.x-vw/2-8,y=game.camera.y-vh/2-8;
    c.save();
    if(im) {
      let pattern=art.patterns.get(c);
      if(!pattern) {
        // Mirrored 2x2 repeat joins identical edge pixels; the world tile size
        // stays 384 units regardless of texture export resolution.
        const tile=document.createElement('canvas');tile.width=im.width*2;tile.height=im.height*2;
        const t=tile.getContext('2d');
        for(let row=0;row<2;row++)for(let col=0;col<2;col++) {
          t.save();t.translate(col?im.width*2:0,row?im.height*2:0);t.scale(col?-1:1,row?-1:1);t.drawImage(im,0,0);t.restore();
        }
        pattern=c.createPattern(tile,'repeat');
        pattern?.setTransform?.({a:384/im.width,b:0,c:0,d:384/im.height,e:0,f:0});
        art.patterns.set(c,pattern);
      }
      c.fillStyle=pattern||(night?'#24484f':'#a4b656');
    } else c.fillStyle=(night?'#24484f':'#a4b656');
    c.fillRect(x,y,vw+16,vh+16);
    // Quiet worn earth patches; no extra texture or collision layer is needed.
    for(const p of game.__meadow?.patches||[])if(inView(game,p,p.r*2)) {
      c.save();c.translate(p.x,p.y);c.scale(1.5,.62);
      const grad=c.createRadialGradient(0,0,0,0,0,p.r);
      grad.addColorStop(0,night?'rgba(108,123,155,.20)':'rgba(205,178,108,.40)');grad.addColorStop(.55,night?'rgba(108,123,155,.10)':'rgba(205,178,108,.20)');grad.addColorStop(1,night?'rgba(108,123,155,0)':'rgba(205,178,108,0)');
      c.fillStyle=grad;c.fillRect(-p.r,-p.r,p.r*2,p.r*2);c.restore();
    }
    c.restore();
  }
  function shouldDraw(game,o) {
    return o.solid || o.exterior || o.detail<=PROFILES[profile(game)].detail;
  }
  function drawObject(game,c,o) {
    if(!o?.meadow || !inView(game,o) || !shouldDraw(game,o))return;
    const im=game.__meadowArt?.images.get(o.objectKey);if(!im)return;
    const left=o.x-o.drawW/2,top=o.y-o.drawH*o.anchor;
    const hides=game.player && [game.player,...(game.enemies||[])].some(actor=>
      o.objectKey.startsWith('tree') && actor.y<o.y && actor.y>top && Math.abs(actor.x-o.x)<o.drawW*.43);
    c.save();c.globalAlpha=hides?.40:1;
    c.drawImage(im,Math.round(left),Math.round(top),o.drawW,o.drawH);c.restore();
  }
  function drawEdge(game,c) {
    const b=boundary(),zoom=game.zoom||1,vw=game.w/zoom+20,vh=game.h/zoom+20;
    const x=game.camera.x-vw/2,y=game.camera.y-vh/2;
    const depth=100;
    const reach=150;
    const sides=[[-b+depth,0,-b-reach,0,x,y,Math.max(0,-b+depth-x),vh],
      [b-depth,0,b+reach,0,b-depth,y,Math.max(0,x+vw-b+depth),vh],
      [0,-b+depth,0,-b-reach,x,y,vw,Math.max(0,-b+depth-y)],
      [0,b-depth,0,b+reach,x,b-depth,vw,Math.max(0,y+vh-b+depth)]];
    c.save();
    for(const [x0,y0,x1,y1,rx,ry,rw,rh] of sides) {
      const g=c.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,'rgba(8,18,18,0)');g.addColorStop(1,'rgba(8,18,18,.76)');
      c.fillStyle=g;c.fillRect(rx,ry,rw,rh);
    }
    c.restore();
  }
  function drawWorld(game,c) {
    const zoom=Math.max(1.05,Math.min(1.72,Number(game.__cameraZoomV085)||Number(game.zoom)||1.14));game.zoom=zoom;
    const shake=(game.__shakeV085||0)*(profile(game)==='low'?2:5);
    c.save();c.translate(game.w/2+(Math.random()-.5)*shake,game.h/2+(Math.random()-.5)*shake);
    c.scale(zoom,zoom);c.translate(-game.camera.x,-game.camera.y);
    drawGround(game,c,zoom);
    const all=[...(game.obstacles||[]),...(game.pickups||[]),...(game.enemies||[]),...(game.bullets||[]),...(game.effects||[])];
    if(game.player)all.push(game.player);
    const visible=all.filter(o=>inView(game,o,240));
    // Small flowers and stones stay on the floor, under actors.
    const groundObject=o=>o.meadow && /^(flower|grass|mushroom|rockSmall)/.test(o.objectKey);
    for(const o of visible)if(groundObject(o))game.drawObstacle(c,o);
    const sorted=visible.filter(o=>!groundObject(o)).sort((a,b)=>(a.y||0)-(b.y||0));
    for(const o of sorted)game.drawObj(c,o);
    if(night)drawFireflies(game,c);
    drawEdge(game,c);c.restore();
  }
  // World anchored particles use gameplay time, so pausing also freezes them.
  // Analytic motion is smooth and independent of frame rate and quality changes.
  const glowSprites=new Map();
  function fireflyPosition(p,time=0) {
    const t=(Number(time)||0)*p.speed;
    return {x:p.x+Math.sin(t+p.phase)*p.radius+Math.sin(t*.57+p.phase*2)*12,
      y:p.y+Math.cos(t*.81+p.phase)*p.radius*.65+Math.sin(t*.43+p.phase)*10};
  }
  function drawFireflies(game,c) {
    const tier=profile(game),amount=tier==='low'?.28:tier==='medium'?.6:1;
    let sprite=glowSprites.get(tier);
    if(!sprite) {
      sprite=document.createElement('canvas');sprite.width=sprite.height=48;
      const g=sprite.getContext('2d'),gradient=g.createRadialGradient(24,24,0,24,24,24);
      gradient.addColorStop(0,'rgba(236,255,174,.9)');gradient.addColorStop(.12,'rgba(209,245,106,.48)');
      gradient.addColorStop(.4,'rgba(181,229,79,.13)');gradient.addColorStop(1,'rgba(181,229,79,0)');
      g.fillStyle=gradient;g.fillRect(0,0,48,48);glowSprites.set(tier,sprite);
    }
    c.save();c.globalCompositeOperation='screen';
    for(const p of game.__meadow?.fireflies||[]) {
      if(p.rank>amount)continue;
      const pos=fireflyPosition(p,game.t);if(!inView(game,pos,30))continue;
      const pulse=.48+.42*(.5+.5*Math.sin((Number(game.t)||0)*1.4+p.phase));
      c.globalAlpha=pulse;const size=tier==='low'?14:tier==='medium'?22:28;
      c.drawImage(sprite,pos.x-size/2,pos.y-size/2,size,size);
      c.fillStyle='#edffb5';c.beginPath();c.arc(pos.x,pos.y,.85,0,Math.PI*2);c.fill();
    }
    c.restore();
  }
  function applyResolution(game) {
    if(!isWorld(game)||!game.canvas||!game.ctx)return;
    const dpr=Math.min(window.devicePixelRatio||1,PROFILES[profile(game)].dpr);
    game.dpr=Math.max(1,dpr);game.canvas.width=Math.floor(game.w*game.dpr);game.canvas.height=Math.floor(game.h*game.dpr);
    game.ctx.setTransform(game.dpr,0,0,game.dpr,0,0);game.ctx.imageSmoothingEnabled=true;
  }
  function settingsChanged(event) {
    if(event.target?.id!=='effectQualityV085')return;
    // The canonical setting handler owns persistence; wait for it to finish.
    queueMicrotask(()=>{
      const game=window.UI?.game;if(!isWorld(game)||game.__meadow?.worldId!==worldId)return;
      selectArt(game).catch(error=>{console.error(`[World${worldId}]`,error);window.UI?.toast?.(`World${worldId}: a grafika betöltése sikertelen.`);});
    });
  }
  document.addEventListener('change',settingsChanged);
  return Object.freeze({version:night?'1.0-moonlit-meadow':'1.0-sunlit-meadow',spec,splash:SPLASH,profiles:PROFILES,profile,isWorld,boundary,
    load,prepare,selectArt,build,collides,drawGround,drawObject,drawWorld,applyResolution,shouldDraw,lane,fireflyPosition,drawFireflies});
  }
  window.CHERRIFT_CREATE_MEADOW=createMeadow;
  window.CHERRIFT_WORLD1=createMeadow(1,'assets/map/world1/meadow/');
})();
