/* Base Cherry / Petal Trace v2: imagegen RGBA artwork animated by Canvas.
   No procedural replacement artwork; combat remains owned by the game. */
(() => {
  'use strict';
  if (!window.CherriftGame || window.CHERRIFT_BASE_PETAL_VFX) return;
  const ID = 'cherry_default', STYLE = 'base_petal_trace';
  const proto = window.CherriftGame.prototype;
  const states = new WeakMap();
  const low = game => game.save?.settings?.effectQuality === 'low';
  const KEY='basePetalTraceAtlas';
  const SOURCE='assets/effects/base_petal_trace/petal_trace_atlas.png?v=1028-base-petal-image2';
  if(typeof ImageAssets!=='undefined') {
    const previous=ImageAssets.prototype.loadAll;
    ImageAssets.prototype.loadAll=async function loadPetalTraceArtwork(...args) {
      const result=await previous.apply(this,args);
      await this.loadImage(KEY,SOURCE);return result;
    };
  }
  function atlas(game){return game.assets?.get?.(KEY);}
  function stamp(c,img,cell,x,y,w,h,px=.5,py=.5) {
    const iw=img?.naturalWidth||img?.width,ih=img?.naturalHeight||img?.height;
    if(!iw || !ih)return;
    const sw=iw/3,sh=ih/2;
    c.drawImage(img,cell%3*sw,Math.floor(cell/3)*sh,sw,sh,x-w*px,y-h*py,w,h);
  }
  function petal(c,img,x,y,size,angle,alpha=1) {
    c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=alpha;
    stamp(c,img,3,0,0,size*5,size*5,.48,.52);c.restore();
  }

  function state(game) {
    let s = states.get(game);
    if (!s || s.player !== game.player) {
      s = {player:game.player, ghosts:[], dash:false, ghostClock:0, stepDistance:0, foot:1};
      states.set(game,s);
    }
    return s;
  }
  function emit(game,type,x,y,life,extra={}) {
    // Use the engine's clock, expiry, pause handling and global effect cap.
    (game.effects ||= []).push({type,x,y,t:0,life,...extra});
  }
  function shot(game,b) {
    emit(game,'basePetalCast',b.x,b.y,.13,{angle:Math.atan2(b.vy,b.vx)});
  }

  const skill = proto.skill;
  proto.skill = function skillPetalTrace(...args) {
    const p=this.player, ready=p?.skin===ID && p.skillTimer<=0 && !(p.skillCastTimer>0);
    const result=skill.apply(this,args);
    if (ready && p===this.player && p.dashTimer>0) {
      const s=state(this); s.dash=true; s.ghosts=[]; s.ghostClock=0; s.stepDistance=0;
      const v=p.dashDir || {x:0,y:1};
      emit(this,'basePetalDashMark',p.x,p.y+26,.23,{angle:Math.atan2(v.y,v.x),end:false});
    }
    return result;
  };

  const update = proto.update;
  proto.update = function updatePetalTrace(dt) {
    const p=this.player, playing=this.mode==='playing';
    const x=p?.x,y=p?.y,wasDash=p?.dashTimer>0;
    const result=update.call(this,dt);
    if (!playing || this.mode!=='playing' || p!==this.player || p?.skin!==ID || !(dt>0)) return result;
    const s=state(this), distance=Math.hypot(p.x-x,p.y-y), dashing=p.dashTimer>0;
    s.ghosts=s.ghosts.filter(g=>(g.age+=dt)<.19);
    if (wasDash || dashing) {
      s.stepDistance=0; s.ghostClock+=dt;
      if (distance>2 && s.ghostClock>=.065) {
        s.ghostClock=0;
        s.ghosts.push({age:0,player:{...p,x,y,baseAttack:null,dashTimer:.01,
          skillCastTimer:Math.max(.001,p.skillCastTimer||0)}});
        s.ghosts=s.ghosts.slice(low(this)?-1:-2);
      }
    } else if (p.moving && distance>.01) {
      // Distance-based footfalls: standing still or pushing a wall emits nothing.
      s.stepDistance+=distance;
      if (s.stepDistance>=38) {
        s.stepDistance%=38; s.foot*=-1;
        emit(this,'basePetalDust',p.x+s.foot*7,p.y+27,.24,{foot:s.foot});
      }
    } else s.stepDistance=0;
    if (s.dash && !dashing) {
      const v=p.dashDir || {x:0,y:1};
      emit(this,'basePetalDashMark',p.x,p.y+26,.22,{angle:Math.atan2(v.y,v.x),end:true});
    }
    s.dash=dashing;
    return result;
  };

  const drawPlayer=proto.drawPlayer;
  proto.drawPlayer=function drawPlayerPetalTrace(c,p) {
    if(p?.skin!==ID)return drawPlayer.call(this,c,p);
    const s=state(this),img=atlas(this);
    for(const g of s.ghosts){c.save();c.globalAlpha*=(1-g.age/.19)*.22;drawPlayer.call(this,c,g.player);c.restore();}
    if(p.dashTimer>0 && img) {
      const v=p.dashDir||{x:0,y:1};
      c.save();c.translate(p.x,p.y-8);c.rotate(Math.atan2(v.y,v.x));
      c.globalAlpha*=.8;stamp(c,img,2,-12,0,88,88,.92,.69);
      if(!low(this))petal(c,img,-48,10,2.6,Math.sin((this.t||0)*7),.8);
      c.restore();
    }
    return drawPlayer.call(this,c,p);
  };
  const drawBullet=proto.drawBullet;
  proto.drawBullet=function drawBulletPetalTrace(c,b) {
    if(b?.style!==STYLE)return drawBullet.call(this,c,b);
    const img=atlas(this);if(!img)return;
    c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy||0,b.vx||0));
    c.globalAlpha*=Math.min(1,Math.max(0,b.life)/.12);
    // The generated ribbon trails behind the generated round orb, in all facings.
    stamp(c,img,2,-3,0,47,47,.92,.69);
    const age=1.45-b.life,pulse=1+Math.sin(age*18)*.035;
    stamp(c,img,0,0,0,49*pulse,49*pulse,.5,.65);
    if(!low(this))petal(c,img,-20,Math.sin(age*10)*4,2.5,age*2,.8);
    c.restore();
  };
  const drawEffect=proto.drawEffect;
  proto.drawEffect=function drawEffectPetalTrace(c,e) {
    if(!['basePetalHit','basePetalCast','basePetalDashMark','basePetalDust'].includes(e?.type))return drawEffect.call(this,c,e);
    const img=atlas(this);if(!img)return;
    const t=Math.min(1,Math.max(0,e.t/Math.max(.001,e.life))),a=1-t;
    c.save();c.translate(e.x,e.y);c.globalAlpha*=a;
    if(e.type==='basePetalHit') {
      c.rotate((e.angle||0));const size=42+t*22;
      stamp(c,img,1,0,0,size,size,.37,.82);
      if(!low(this))petal(c,img,8+t*15,-5-t*6,2.6,t*3);
    } else if(e.type==='basePetalCast') {
      c.rotate(e.angle||0);const size=30*(1-t*.4);stamp(c,img,4,0,0,size,size);
    } else if(e.type==='basePetalDust') {
      c.globalAlpha*=.55;const size=28+t*10;
      stamp(c,img,5,-e.foot*t*4,-t*4,size,size,.5,.6);
    } else {
      c.rotate(e.angle||0);c.globalAlpha*=.65;
      stamp(c,img,5,-t*6,0,25+t*12,22+t*9,.5,.6);
      if(!e.end)petal(c,img,-6-t*12,-4,3,t*2);
    }
    c.restore();
  };
  window.CHERRIFT_BASE_PETAL_VFX=Object.freeze({version:'1028-base-petal-image2',style:STYLE,shot});
})();
