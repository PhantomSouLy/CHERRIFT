/* World 3–6 and the GM spider-lily training field. Canonical asset dimensions. */
(() => {
  "use strict";
  if (window.CHERRIFT_REWORK_MAPS) return;
  const DEFINITIONS = {"0":{"root":"assets/map/training/spider-lilies/","objects":{"lilySingle1":{"w":52,"h":57,"anchor":0.86478,"solid":false,"rx":0,"ry":0,"count":0},"lilySingle2":{"w":45,"h":54,"anchor":0.86518,"solid":false,"rx":0,"ry":0,"count":0},"lilyDouble":{"w":60,"h":60,"anchor":0.86523,"solid":false,"rx":0,"ry":0,"count":0},"lilyBuds":{"w":47,"h":54,"anchor":0.86694,"solid":false,"rx":0,"ry":0,"count":0},"lilyClump1":{"w":65,"h":62,"anchor":0.86223,"solid":false,"rx":0,"ry":0,"count":0},"lilyClump2":{"w":70,"h":62,"anchor":0.85392,"solid":false,"rx":0,"ry":0,"count":0},"lilyClump3":{"w":77,"h":67,"anchor":0.85144,"solid":false,"rx":0,"ry":0,"count":0},"lilyClump4":{"w":71,"h":65,"anchor":0.85606,"solid":false,"rx":0,"ry":0,"count":0},"lilyLow":{"w":67,"h":49,"anchor":0.82668,"solid":false,"rx":0,"ry":0,"count":0},"lilyTall":{"w":73,"h":70,"anchor":0.86176,"solid":false,"rx":0,"ry":0,"count":0},"rock1":{"w":127,"h":103,"anchor":0.73962,"solid":true,"rx":28,"ry":16,"count":8},"rock2":{"w":104,"h":75,"anchor":0.72846,"solid":true,"rx":25,"ry":13,"count":8},"rockSmall":{"w":37,"h":26,"anchor":0.72618,"solid":false,"rx":0,"ry":0,"count":28},"pebbles":{"w":38,"h":23,"anchor":0.71166,"solid":false,"rx":0,"ry":0,"count":36},"moss":{"w":37,"h":26,"anchor":0.72623,"solid":false,"rx":0,"ry":0,"count":55},"grass":{"w":30,"h":31,"anchor":0.75767,"solid":false,"rx":0,"ry":0,"count":70}}},"3":{"root":"assets/map/world3/savanna/","objects":{"tree1":{"w":286,"h":247,"anchor":0.79095,"solid":true,"rx":20,"ry":12,"count":16},"tree2":{"w":227,"h":214,"anchor":0.79853,"solid":true,"rx":18,"ry":11,"count":16},"tree3":{"w":263,"h":263,"anchor":0.80356,"solid":true,"rx":28,"ry":16,"count":10},"bush1":{"w":114,"h":94,"anchor":0.7411,"solid":false,"rx":0,"ry":0,"count":26},"bush2":{"w":111,"h":85,"anchor":0.7341,"solid":false,"rx":0,"ry":0,"count":26},"deadBush":{"w":90,"h":75,"anchor":0.74253,"solid":false,"rx":0,"ry":0,"count":18},"rock1":{"w":120,"h":97,"anchor":0.73925,"solid":true,"rx":29,"ry":15,"count":17},"rock2":{"w":123,"h":84,"anchor":0.72333,"solid":true,"rx":24,"ry":13,"count":17},"rockSmall":{"w":66,"h":38,"anchor":0.70122,"solid":false,"rx":0,"ry":0,"count":35},"log":{"w":128,"h":84,"anchor":0.71959,"solid":true,"rx":28,"ry":12,"count":12},"stump":{"w":116,"h":79,"anchor":0.72206,"solid":true,"rx":21,"ry":12,"count":12},"bones":{"w":74,"h":46,"anchor":0.71353,"solid":false,"rx":0,"ry":0,"count":12},"grass1":{"w":47,"h":44,"anchor":0.75348,"solid":false,"rx":0,"ry":0,"count":65},"grass2":{"w":50,"h":41,"anchor":0.74134,"solid":false,"rx":0,"ry":0,"count":65},"grass3":{"w":55,"h":39,"anchor":0.72759,"solid":false,"rx":0,"ry":0,"count":65},"pebbles":{"w":51,"h":32,"anchor":0.71429,"solid":false,"rx":0,"ry":0,"count":36}}},"4":{"root":"assets/map/world4/red-desert/","objects":{"butte":{"w":239,"h":203,"anchor":0.74426,"solid":true,"rx":47,"ry":24,"count":8},"spire":{"w":189,"h":244,"anchor":0.80333,"solid":true,"rx":25,"ry":15,"count":8},"arch":{"w":298,"h":200,"anchor":0.72234,"solid":true,"rx":0,"ry":0,"count":4,"collisionParts":[{"x":-0.34,"y":0,"rx":17,"ry":12},{"x":0.34,"y":0,"rx":17,"ry":12}]},"tree":{"w":229,"h":236,"anchor":0.80431,"solid":true,"rx":24,"ry":14,"count":12},"cactus1":{"w":121,"h":182,"anchor":0.80418,"solid":true,"rx":20,"ry":12,"count":22},"cactus2":{"w":111,"h":152,"anchor":0.80359,"solid":true,"rx":18,"ry":11,"count":22},"pricklyPear":{"w":92,"h":90,"anchor":0.75606,"solid":true,"rx":20,"ry":12,"count":18},"barrelCactus":{"w":87,"h":79,"anchor":0.74959,"solid":true,"rx":19,"ry":12,"count":18},"rock1":{"w":128,"h":107,"anchor":0.74167,"solid":true,"rx":30,"ry":17,"count":20},"rock2":{"w":172,"h":102,"anchor":0.70625,"solid":true,"rx":32,"ry":14,"count":20},"rockSmall":{"w":74,"h":42,"anchor":0.70325,"solid":false,"rx":0,"ry":0,"count":30},"bush":{"w":105,"h":83,"anchor":0.73833,"solid":false,"rx":0,"ry":0,"count":28},"grass":{"w":64,"h":52,"anchor":0.74055,"solid":false,"rx":0,"ry":0,"count":50},"bones":{"w":92,"h":63,"anchor":0.72506,"solid":false,"rx":0,"ry":0,"count":15},"log":{"w":110,"h":76,"anchor":0.72537,"solid":true,"rx":29,"ry":11,"count":10},"pebbles":{"w":58,"h":38,"anchor":0.71807,"solid":false,"rx":0,"ry":0,"count":40}}},"5":{"root":"assets/map/world5/sand-desert/","objects":{"mushroomRock":{"w":198,"h":186,"anchor":0.75224,"solid":true,"rx":34,"ry":20,"count":9},"pillar":{"w":190,"h":221,"anchor":0.80333,"solid":true,"rx":23,"ry":14,"count":7},"leaningRock":{"w":184,"h":168,"anchor":0.75071,"solid":true,"rx":33,"ry":16,"count":7},"bigRock":{"w":188,"h":136,"anchor":0.72883,"solid":true,"rx":42,"ry":21,"count":10},"rock1":{"w":139,"h":99,"anchor":0.72721,"solid":true,"rx":27,"ry":15,"count":20},"rockSmall":{"w":62,"h":41,"anchor":0.71776,"solid":false,"rx":0,"ry":0,"count":30},"dune1":{"w":179,"h":115,"anchor":0.71744,"solid":false,"rx":0,"ry":0,"count":16},"dune2":{"w":138,"h":83,"anchor":0.71035,"solid":false,"rx":0,"ry":0,"count":16},"cactus1":{"w":96,"h":100,"anchor":0.80368,"solid":true,"rx":15,"ry":10,"count":12},"cactus2":{"w":106,"h":82,"anchor":0.77753,"solid":true,"rx":18,"ry":11,"count":12},"deadBush":{"w":95,"h":80,"anchor":0.74309,"solid":false,"rx":0,"ry":0,"count":28},"bush":{"w":90,"h":76,"anchor":0.74344,"solid":false,"rx":0,"ry":0,"count":18},"grass":{"w":55,"h":47,"anchor":0.74523,"solid":false,"rx":0,"ry":0,"count":30},"bones":{"w":79,"h":55,"anchor":0.72365,"solid":false,"rx":0,"ry":0,"count":14},"flower":{"w":55,"h":50,"anchor":0.74992,"solid":false,"rx":0,"ry":0,"count":28},"pebbles":{"w":47,"h":33,"anchor":0.7279,"solid":false,"rx":0,"ry":0,"count":40}}},"6":{"root":"assets/map/world6/ruins/","objects":{"pillar1":{"w":147,"h":205,"anchor":0.80447,"solid":true,"rx":24,"ry":15,"count":12},"pillar2":{"w":134,"h":148,"anchor":0.80391,"solid":true,"rx":23,"ry":14,"count":14},"statue1":{"w":207,"h":231,"anchor":0.80353,"solid":true,"rx":34,"ry":22,"count":6},"statue2":{"w":181,"h":223,"anchor":0.80415,"solid":true,"rx":31,"ry":20,"count":6},"runestone":{"w":129,"h":141,"anchor":0.75747,"solid":true,"rx":24,"ry":16,"count":12},"crystal":{"w":100,"h":97,"anchor":0.75435,"solid":true,"rx":18,"ry":12,"count":3},"crystalSmall":{"w":78,"h":62,"anchor":0.73774,"solid":false,"rx":0,"ry":0,"count":5},"tree":{"w":194,"h":238,"anchor":0.80333,"solid":true,"rx":24,"ry":14,"count":14},"rock1":{"w":110,"h":103,"anchor":0.75089,"solid":true,"rx":28,"ry":17,"count":20},"rock2":{"w":113,"h":85,"anchor":0.73382,"solid":true,"rx":25,"ry":13,"count":20},"wall":{"w":172,"h":138,"anchor":0.73897,"solid":true,"rx":40,"ry":17,"count":6},"fallenPillar":{"w":103,"h":81,"anchor":0.73732,"solid":true,"rx":36,"ry":15,"count":10},"bones":{"w":94,"h":57,"anchor":0.71,"solid":false,"rx":0,"ry":0,"count":18},"deadBush":{"w":77,"h":67,"anchor":0.74634,"solid":false,"rx":0,"ry":0,"count":28},"rubble":{"w":67,"h":43,"anchor":0.71537,"solid":false,"rx":0,"ry":0,"count":45},"crystalTiny":{"w":42,"h":34,"anchor":0.73931,"solid":false,"rx":0,"ry":0,"count":8}}}};
  // The training dummy has a fixed footpoint at (150, 0), see createTrainingDummy.
  // A full-width, 900-unit tall testing lane through the dummy's footpoint.
  const DUMMY_CLEARING = Object.freeze({x:150,y:0,laneHalfHeight:450});
  const PROFILES = Object.freeze({low:{dpr:1},medium:{dpr:1.25},high:{dpr:1.5}});
  const randomFor = seed => {
    let s=2166136261;
    for(const ch of String(seed))s=Math.imul(s^ch.charCodeAt(0),16777619);
    return ()=>{s+=0x6D2B79F5;let n=s;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return ((n^n>>>14)>>>0)/4294967296;};
  };
  function makeMap(world,def) {
    const training=world===0,cache=new Map();let revision=0;
    const profile=g=>Object.hasOwn(PROFILES,g?.save?.settings?.effectQuality)?g.save.settings.effectQuality:'medium';
    const isWorld=g=>training?!!(g?.stage||g?.getSelectedStage?.())?.training:Number((g?.stage||g?.getSelectedStage?.())?.world)===world;
    const boundary=()=>Math.max(1200,Number(window.CHERRIFT_CONFIG?.worldSize||4200)/2)-200;
    const spec=Object.freeze({ground:def.root+'high/ground.webp',objects:Object.freeze(Object.fromEntries(Object.entries(def.objects).map(([k,v])=>[k,Object.freeze({...v,src:def.root+'high/'+k+'.webp'})])))});
    function image(src) {
      return new Promise((resolve,reject)=>{
        const im=new Image();let done=false;
        const timer=setTimeout(()=>finish(new Error('Map image timed out: '+src)),12000);
        function finish(error){if(done)return;done=true;clearTimeout(timer);im.onload=null;im.onerror=null;error?reject(error):resolve(im);}
        im.decoding='async';im.onload=()=>Promise.resolve(im.decode?.()).then(()=>finish(),finish);
        im.onerror=()=>finish(new Error('Map image unavailable: '+src));im.src=src;
      });
    }
    function load(tier) {
      if(!Object.hasOwn(PROFILES,tier))tier='medium';
      if(!cache.has(tier))cache.set(tier,Promise.all(['ground',...Object.keys(def.objects)].map(async key=>[key,await image(def.root+tier+'/'+key+'.webp')]))
        .then(entries=>({world,tier,images:new Map(entries),patterns:new WeakMap()})).catch(error=>{cache.delete(tier);throw error;}));
      return cache.get(tier);
    }
    async function selectArt(g) {
      const token=++revision,tier=profile(g),art=await load(tier);
      if(token!==revision||!isWorld(g)||profile(g)!==tier)return false;
      g.__reworkArt=art;g.__cherriftNeedsRender=true;
      for(const key of cache.keys())if(key!==tier)cache.delete(key);
      applyResolution(g);return true;
    }
    const parts=o=>o.collisionParts?.map(p=>({x:o.x+p.x*o.drawW,y:o.y+(p.y||0)*o.drawH,rx:p.rx,ry:p.ry}))||[{x:o.x,y:o.y,rx:o.rx,ry:o.ry}];
    function collides(g,x=g.player?.x,y=g.player?.y) {
      const r=Number(g.player?.r)||18;
      return (g.__cherriftCleanSolidObjects||[]).some(o=>parts(o).some(p=>((x-p.x)/(p.rx+r))**2+((y-p.y)/(p.ry+r))**2<1));
    }
    function object(key,x,y,random) {
      const v=def.objects[key];return {__cherriftCleanWorld:true,cherriftMapObject:true,reworkMap:true,worldId:world,
        kind:'rework_'+key,objectKey:key,assetKey:'rework_'+world+'_'+key,x,y,drawW:v.w,drawH:v.h,boxW:v.w,boxH:v.h,
        anchor:v.anchor,solid:v.solid,rx:v.rx,ry:v.ry,r:Math.max(v.rx,v.ry),collisionRadius:Math.max(v.rx,v.ry),
        collisionParts:v.collisionParts,flip:random()<.5,alpha:1};
    }
    function build(g,seed=g.__reworkMap?.world===world?g.__reworkMap.seed:window.crypto?.randomUUID?.()||Date.now()+'-'+Math.random()) {
      const random=randomFor(seed+':'+g.stage?.id),half=boundary(),props=[],solids=[];
      for(const [key,v] of Object.entries(def.objects))for(let i=0;i<v.count;i++) {
        for(let attempt=0;attempt<100;attempt++) {
          const x=(random()*2-1)*(half-80),y=(random()*2-1)*(half-80);
          if(Math.hypot(x,y)<(v.solid?340:100))continue;
          if(v.solid&&solids.some(o=>Math.hypot(x-o.x,y-o.y)<Math.max(v.rx,v.ry,45)+o.r+70))continue;
          const o=object(key,x,y,random);props.push(o);if(o.solid)solids.push(o);break;
        }
      }
      const chunks=new Map();let flowerCount=0;
      if(training) {
        const keys=['lilySingle1','lilySingle2','lilyDouble','lilyBuds','lilyClump1','lilyClump2','lilyClump3','lilyClump4','lilyLow','lilyTall'];
        const weights=[8,8,12,4,16,14,12,8,10,8],total=weights.reduce((a,b)=>a+b,0);
        for(let y=-half;y<=half;y+=28)for(let x=-half;x<=half;x+=28) {
          if(random()>.94)continue;
          const px=x+(random()-.5)*28*.84,py=y+(random()-.5)*28*.84;
          if(solids.some(o=>((px-o.x)/(o.rx+20))**2+((py-o.y)/(o.ry+16))**2<1))continue;
          let n=random()*total,index=0;while(index<weights.length-1&&n>=weights[index])n-=weights[index++];
          const o=object(keys[index],px,py,random),scale=.85+random()*.30;
          o.drawW*=scale;o.drawH*=scale;o.flower=true;
          // Remove complete lily sprites, including overhanging petals, from
          // the horizontal testing lane. Other worlds retain their placement.
          const top=o.y-o.drawH*o.anchor,bottom=o.y+o.drawH*(1-o.anchor);
          if(top<=DUMMY_CLEARING.y+DUMMY_CLEARING.laneHalfHeight&&bottom>=DUMMY_CLEARING.y-DUMMY_CLEARING.laneHalfHeight)continue;
          const chunk=Math.floor(px/256)+','+Math.floor(py/256);
          if(!chunks.has(chunk))chunks.set(chunk,[]);chunks.get(chunk).push(o);flowerCount++;
        }
      }
      g.obstacles=props;g.__cherriftCleanSolidObjects=solids;g.__cherriftCleanWorld=world;
      g.__reworkMap={world,seed,chunks,flowerCount};
      window.CHERRIFT_REACTIVE_FOLIAGE?.refresh?.(g);return props;
    }
    function visible(g,o,margin=260) {
      const z=g.zoom||1,cam=g.camera||{x:0,y:0};
      return Math.abs(o.x-cam.x)<g.w/z/2+margin&&Math.abs(o.y-cam.y)<g.h/z/2+margin;
    }
    function visibleFlowers(g) {
      const chunks=g.__reworkMap?.chunks;if(!chunks?.size)return [];
      const z=g.zoom||1,cam=g.camera||{x:0,y:0},wx=g.w/z/2+120,hy=g.h/z/2+120,out=[];
      for(let cy=Math.floor((cam.y-hy)/256);cy<=Math.floor((cam.y+hy)/256);cy++)
        for(let cx=Math.floor((cam.x-wx)/256);cx<=Math.floor((cam.x+wx)/256);cx++)
          for(const o of chunks.get(cx+','+cy)||[])if(visible(g,o,120))out.push(o);
      return out;
    }
    function drawGround(g,c,zoom=1) {
      const art=g.__reworkArt?.world===world?g.__reworkArt:null,im=art?.images.get('ground');
      c.save();c.fillStyle=training?'#24272a':world===4?'#a35b42':world===5?'#c7ab73':world===6?'#343139':'#9e914f';
      if(im) {
        let pattern=art.patterns.get(c);
        if(!pattern) {
          const tile=document.createElement('canvas');tile.width=im.width*2;tile.height=im.height*2;const t=tile.getContext('2d');
          for(let row=0;row<2;row++)for(let col=0;col<2;col++){t.save();t.translate(col?im.width*2:0,row?im.height*2:0);t.scale(col?-1:1,row?-1:1);t.drawImage(im,0,0);t.restore();}
          pattern=c.createPattern(tile,'repeat');pattern?.setTransform?.({a:384/im.width,b:0,c:0,d:384/im.height,e:0,f:0});if(pattern)art.patterns.set(c,pattern);
        }
        if(pattern)c.fillStyle=pattern;
      }
      c.fillRect(g.camera.x-g.w/zoom/2-8,g.camera.y-g.h/zoom/2-8,g.w/zoom+16,g.h/zoom+16);c.restore();
    }
    function drawObject(g,c,o) {
      if(!o?.reworkMap||o.worldId!==world||!visible(g,o))return;
      const im=g.__reworkArt?.world===world?g.__reworkArt.images.get(o.objectKey):null;if(!im)return;
      const top=o.y-o.drawH*o.anchor;
      const actors=[g.player,...(g.enemies||[]),...(g.trainingDummiesV094||[])].filter(Boolean);
      const overlap=(o.flower||o.drawH>90)&&actors.some(p=>p.y<o.y&&p.y>top&&Math.abs(p.x-o.x)<o.drawW*.42);
      c.save();c.globalAlpha=overlap ? .4 : 1;c.translate(o.x,o.y);if(o.flip)c.scale(-1,1);
      c.drawImage(im,-o.drawW/2,-o.drawH*o.anchor,o.drawW,o.drawH);c.restore();
    }
    function drawWorld(g,c) {
      g.zoom=Math.max(1.05,Math.min(1.72,Number(g.__cameraZoomV085)||Number(g.zoom)||1.14));
      c.save();c.translate(g.w/2,g.h/2);c.scale(g.zoom,g.zoom);c.translate(-g.camera.x,-g.camera.y);drawGround(g,c,g.zoom);
      const all=[...(g.obstacles||[]),...visibleFlowers(g),...(g.pickups||[]),...(g.enemies||[]),...(g.bullets||[]),...(g.effects||[])];if(g.player)all.push(g.player);
      const floor=o=>o.reworkMap&&!o.flower&&!o.solid&&/grass|bones|pebbles|rubble|moss/.test(o.objectKey);
      const view=all.filter(o=>visible(g,o));for(const o of view)if(floor(o))drawObject(g,c,o);
      for(const o of view.filter(o=>!floor(o)).sort((a,b)=>(a.y||0)-(b.y||0))) {
        if(o.reworkMap)drawObject(g,c,o);else g.drawObj(c,o);
      }
      c.restore();
    }
    function applyResolution(g) {
      if(!g.canvas||!isWorld(g))return;
      const dpr=Math.min(Number(window.devicePixelRatio)||1,PROFILES[profile(g)].dpr);
      if(g.dpr!==dpr){g.dpr=dpr;g.resize?.();}
    }
    document.addEventListener('change',event=>{
      if(event.target?.id!=='effectQualityV085')return;
      setTimeout(()=>{const g=window.UI?.game;if(isWorld(g))selectArt(g).catch(e=>{console.error(e);window.UI?.toast?.('A pálya grafikája nem tölthető be. Próbáld újra.');});},0);
    });
    async function prepare(g) {
      ++revision;
      g.__reworkArt=await load(profile(g));
      g.__reworkMap=null; // One new placement seed per run; tier switches retain geometry.
    }
    return Object.freeze({spec,splash:def.root+'medium/splash.webp',profiles:PROFILES,profile,isWorld,boundary,load,selectArt,prepare,build,collides,drawGround,drawObject,drawWorld,applyResolution,visibleFlowers});
  }
  window.CHERRIFT_REWORK_MAPS=Object.freeze(Object.fromEntries(Object.entries(DEFINITIONS).map(([w,def])=>[w,makeMap(Number(w),def)])));
})();

