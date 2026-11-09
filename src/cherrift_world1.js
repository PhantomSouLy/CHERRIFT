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
    // Chapter-independent candidates let the preview compare density without
    // moving the existing objects. Fresh runs still receive fresh seeds.
    const random=randomFor(`${seed}:${worldId===1?'world_1_1':game.stage?.id || 'world_1'}`),half=boundary();
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
      for(let i=0;i<(worldId===1?Math.ceil(s.count*(key.startsWith('tree')?2:1.35)):s.count);i++) {
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
      for(let i=0;i<(worldId===1?Math.ceil(s.count*2.3):s.count);i++) {
        const near=solid[Math.floor(random()*solid.length)],angle=random()*Math.PI*2;
        const clustered=i%3!==0 && near;
        const x=clustered?near.x+Math.cos(angle)*(65+random()*85):(random()*2-1)*(half-45);
        const y=clustered?near.y+Math.sin(angle)*(35+random()*70):(random()*2-1)*(half-45);
        if(Math.hypot(x,y)>260 && Math.abs(x)<half-35 && Math.abs(y)<half-35)add(key,x,y);
      }
    }
    // Real scenery continues beyond the collision boundary under the dark veil.
    const keys=['tree1','tree2','tree3','bush1','bush2','rock1','rock2','log','flower1'];
    for(let i=0;i<(worldId===1?240:190);i++) {
      const side=i%4,along=(random()*2-1)*(half+650),depth=half+70+random()*600;
      add(keys[Math.floor(random()*keys.length)],side<2?(side===0?-depth:depth):along,side>=2?(side===2?-depth:depth):along,true);
    }
    const patches=Array.from({length:65},()=>({x:(random()*2-1)*(half+500),y:(random()*2-1)*(half+500),r:70+random()*100,phase:random()}));
    const active=worldId===1?selectChapterObjects(result,densityFor(game)):result;
    game.obstacles=active;game.__cherriftCleanSolidObjects=worldId===1?active.filter(o=>o.solid):solid;
    game.__cherriftCleanWorld=worldId;game.__meadow={seed,patches,worldId,chapter:chapterFor(game),density:densityFor(game)};
    game.__meadow.fireflies=night?Array.from({length:900},()=>({
      x:(random()*2-1)*(half+450),y:(random()*2-1)*(half+450),
      phase:random()*Math.PI*2,speed:.10+random()*.13,rank:random(),radius:28+random()*32
    })):[];
    if (worldId===1) buildEnvironment(game,random,game.obstacles);
    window.CHERRIFT_REACTIVE_FOLIAGE?.refresh?.(game);
    return game.obstacles;
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
    if (environmentEnabled(game) && /^(tree|bush|flower|grass)/.test(o.objectKey)) {
      drawWindObject(game,c,o,im,left,top);
    } else c.drawImage(im,Math.round(left),Math.round(top),o.drawW,o.drawH);
    c.restore();
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
    window.CHERRIFT_LIGHTING?.ground(game,c);
    window.CHERRIFT_ENVIRONMENT?.ground(game,c);
    const all=[...(game.obstacles||[]),...(game.pickups||[]),...(game.enemies||[]),...(game.bullets||[]),...(game.effects||[])];
    if(game.player)all.push(game.player);
    const visible=all.filter(o=>inView(game,o,240));
    // Small flowers and stones stay on the floor, under actors.
    const groundObject=o=>o.meadow && /^(flower|grass|mushroom|rockSmall)/.test(o.objectKey);
    for(const o of visible)if(groundObject(o))game.drawObstacle(c,o);
    const sorted=visible.filter(o=>!groundObject(o)).sort((a,b)=>(a.y||0)-(b.y||0));
    for(const o of sorted)game.drawObj(c,o);
    if(worldId===1)drawEnvironment(game,c);
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
  // Living Meadow v3: all ambient motion follows gameplay time, never a timer.
  function chapterFor(game) {
    const stage=game?.stage || game?.getSelectedStage?.() || {};
    const raw=Number(stage.index || String(stage.id || '').match(/_(\d+)$/)?.[1]) || 1;
    return Math.max(1,Math.min(5,Math.floor(raw)));
  }
  function densityFor(game) {
    return worldId===1?[.40,.52,.70,.86,1][chapterFor(game)-1]:1;
  }
  function selectChapterObjects(objects,density) {
    const totals=new Map(),seen=new Map();
    const key=o=>`${o.exterior?'edge':'field'}:${o.objectKey}`;
    for(const o of objects)totals.set(key(o),(totals.get(key(o))||0)+1);
    return objects.filter(o=>{
      const k=key(o),ordinal=(seen.get(k)||0)+1;seen.set(k,ordinal);
      return ordinal<=Math.ceil(totals.get(k)*density);
    });
  }
  const reduceEnvironment=matchMedia('(prefers-reduced-motion: reduce)');
  function environmentEnabled(game) {
    return worldId===1 && game?.save?.settings?.environmentPerformance!=='on' &&
      !game?.save?.settings?.reducedMotion && !reduceEnvironment.matches;
  }
  function windAt(time,x=0,y=0) {
    // A broad travelling gust keeps neighbours related without synchronised bobbing.
    const t=Number(time)||0;
    const gust=(.5+.5*Math.sin(t*.31-x*.0014-y*.0007))**3;
    return (.48+.62*gust)*(Math.sin(t*1.35-x*.003+y*.001)*.72+
      Math.sin(t*2.17+x*.0017+y*.0023)*.28)+.20*gust;
  }
  function drawWindObject(game,c,o,im,left,top) {
    const wind=windAt(game.t,o.x,o.y),phase=Number(o.phase)||0;
    const ripple=Math.sin((Number(game.t)||0)*1.8+phase)*.12;
    if(o.objectKey.startsWith('tree')) {
      // Horizontal affine bands bend only the crown. The lower 36% is unchanged.
      // This reuses the original RGBA art with no generated replacement or colour filter.
      const bands=profile(game)==='low'?6:10;
      const bend=(wind+ripple)*o.drawH*.046;
      const shift=y=>bend*Math.max(0,1-y/.64)**1.65;
      for(let i=0;i<bands;i++) {
        const sy=Math.round(i*im.height/bands),ey=Math.round((i+1)*im.height/bands);
        const a=sy/im.height,b=ey/im.height,dy=a*o.drawH,dh=(b-a)*o.drawH;
        const dx=shift(a),slope=(shift(b)-dx)/dh;
        c.save();c.transform(1,0,slope,1,left+dx,top+dy);
        // Sample the whole image behind overlapping clips. Cropping the source
        // into strips produces visible horizontal seams with scaled textures.
        c.beginPath();c.rect(-8,-.65,o.drawW+16,dh+1.30);c.clip();
        c.drawImage(im,0,-dy,o.drawW,o.drawH);c.restore();
      }
      return;
    }
    const bush=o.objectKey.startsWith('bush');
    const angle=(wind+ripple)*(bush?.050:.110);
    c.translate(o.x,o.y);c.rotate(angle);c.transform(1,0,(wind+ripple)*(bush?.024:.045),1,0,0);
    c.drawImage(im,-o.drawW/2,-o.drawH*o.anchor,o.drawW,o.drawH);
  }
  function buildEnvironment(game,random,objects) {
    const trees=objects.filter(o=>o.objectKey.startsWith('tree')&&!o.exterior);
    // Fixed-size records are generated once. No per-frame spawning or allocation.
    game.__meadow.leaves=trees.flatMap((tree,index)=>Array.from({length:4},(_,i)=>({
      x:tree.x+(random()-.5)*tree.drawW*.7,
      y:tree.y-tree.drawH*(.52+random()*.20),
      delay:random()*8+i*.31,period:11+random()*10,duration:4.5+random()*2,
      drift:80+random()*105,fall:35+random()*65,phase:random()*Math.PI*2,
      size:4.5+random()*2.8,rank:random(),colour:(index+i)%3
    })));
  }
  const leafSprites=[];
  function leafSprite(index) {
    if(leafSprites[index])return leafSprites[index];
    const sprite=document.createElement('canvas');sprite.width=40;sprite.height=24;
    const c=sprite.getContext('2d');
    c.fillStyle=['#9ebc50','#d3c86b','#78a94d'][index];
    c.beginPath();c.moveTo(3,13);c.bezierCurveTo(13,-1,30,2,37,10);
    c.bezierCurveTo(28,22,13,24,3,13);c.fill();
    c.strokeStyle='rgba(68,99,40,.65)';c.lineWidth=1.2;
    c.beginPath();c.moveTo(3,13);c.quadraticCurveTo(21,12,36,10);c.stroke();
    leafSprites[index]=sprite;return sprite;
  }
  function leafPosition(p,time=0) {
    const elapsed=Number(time)-p.delay;
    if(elapsed<0)return null;
    const age=elapsed%p.period;
    if(age>p.duration)return null;
    const progress=age/p.duration;
    return {x:p.x+progress*p.drift+Math.sin(age*2+p.phase)*8,
      y:p.y+progress*p.fall+Math.sin(age*1.5+p.phase)*6,
      angle:p.phase+age*1.9,scaleY:.35+.65*Math.abs(Math.cos(age*2.1+p.phase)),
      alpha:Math.min(1,progress*7,(1-progress)*5)*.88};
  }
  function drawEnvironment(game,c) {
    if(!environmentEnabled(game))return;
    const tier=profile(game),limit=tier==='low'?8:tier==='medium'?15:22;
    const fraction=tier==='low'?.4:tier==='medium'?.72:1;
    let drawn=0;
    for(const p of game.__meadow?.leaves||[]) {
      if(p.rank>fraction || !inView(game,p,190))continue;
      const pos=leafPosition(p,game.t);if(!pos || !inView(game,pos,20))continue;
      c.save();c.translate(pos.x,pos.y);c.rotate(pos.angle);c.scale(1,pos.scaleY);
      c.globalAlpha=pos.alpha;
      c.drawImage(leafSprite(p.colour),-p.size/2,-p.size*.30,p.size,p.size*.60);
      c.restore();if(++drawn>=limit)break;
    }
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
    load,prepare,selectArt,build,collides,drawGround,drawObject,drawWorld,applyResolution,shouldDraw,lane,fireflyPosition,drawFireflies,environmentEnabled,windAt,drawEnvironment,leafPosition,chapterFor,densityFor});
  }
  window.CHERRIFT_CREATE_MEADOW=createMeadow;
  window.CHERRIFT_WORLD1=createMeadow(1,'assets/map/world1/meadow/');
})();
