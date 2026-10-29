/* Crimson Hunger: visual-only Legendary Succubus layer. Gameplay, hit clocks,
   damage, homing, healing and shield calculations remain in v095. */
(() => {
  'use strict';
  if(!window.CherriftGame || window.CHERRIFT_SUCCUBUS_CRIMSON_HUNGER)return;
  const ID='succubus_cherry', VERSION='1028-succubus-crimson1';
  const ROOT='assets/effects/succubus_crimson_hunger/';
  const sources={crimsonAtlas:ROOT+'atlas.png',crimsonWave:ROOT+'claw_wave.png',
    crimsonMelee:ROOT+'melee_slash.png',crimsonSoul:ROOT+'soul_wisp.png'};
  const proto=window.CherriftGame.prototype, states=new WeakMap(), seen=new WeakSet();
  if(typeof ImageAssets!=='undefined'){
    const prior=ImageAssets.prototype.loadAll;
    ImageAssets.prototype.loadAll=async function loadCrimsonHunger(...args){
      const result=await prior.apply(this,args);
      await Promise.all(Object.entries(sources).map(([key,path])=>this.loadImage(key,path+'?v='+VERSION)));
      return result;
    };
  }
  function state(game){let s=states.get(game);if(!s || s.player!==game.player){s={player:game.player,distance:0,foot:1,prints:[]};states.set(game,s);}return s;}
  const low=game=>game.save?.settings?.effectQuality==='low';
  // Bounds are selected per separated motif in the original 1254x1254 atlas.
  const regions={vortex:[.025,.345,.34,.305],hit:[.40,.385,.21,.21],
    siphon:[.625,.405,.36,.17],shield:[.01,.67,.37,.30],
    footprint:[.40,.765,.30,.13],heal:[.745,.72,.20,.18]};
  function atlas(ctx,game,region,x,y,w,h,angle=0,alpha=1){
    const img=game.assets?.get?.('crimsonAtlas');if(!img)return false;
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    if(!(iw>0&&ih>0))return false;
    const [sx,sy,sw,sh]=regions[region];ctx.save();ctx.globalAlpha*=alpha;
    ctx.translate(x,y);ctx.rotate(angle);ctx.imageSmoothingEnabled=true;
    ctx.drawImage(img,sx*iw,sy*ih,sw*iw,sh*ih,-w/2,-h/2,w,h);ctx.restore();return true;
  }
  function image(ctx,game,key,x,y,w,h,angle,alpha=1,pivot=.5){
    const img=game.assets?.get?.(key);if(!img)return false;
    ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.rotate(angle);
    ctx.imageSmoothingEnabled=true;ctx.drawImage(img,-w*pivot,-h/2,w,h);ctx.restore();return true;
  }
  function siphons(game,before,hp,shield){
    const p=game.player;if(!p || p.skin!==ID || !(p.hp>hp || (p.soulShield||0)>shield))return;
    const hits=(game.effects||[]).filter(e=>!before.has(e)&&!seen.has(e)&&
      (e.type==='succubus_claw_mark_v095'||e.type==='succubus_ranged_hit_v095'));
    for(const e of hits.slice(0,low(game)?3:6)){
      seen.add(e);game.effects.push({type:'crimsonSiphon',x:e.x,y:e.y,
        targetX:p.x,targetY:p.y-18,t:0,life:.32});
    }
  }
  const updateBullets=proto.updateBullets;
  proto.updateBullets=function updateCrimsonBullets(...args){
    const p=this.player;if(p?.skin!==ID)return updateBullets.apply(this,args);
    const old=new Set(this.effects||[]),hp=p.hp,shield=p.soulShield||0;
    const result=updateBullets.apply(this,args);if(this.player===p)siphons(this,old,hp,shield);return result;
  };
  const update=proto.update;
  proto.update=function updateCrimsonHunger(dt){
    const p=this.player,playing=this.mode==='playing',x=p?.x,y=p?.y;
    if(p?.skin!==ID)return update.call(this,dt);
    const old=new Set(this.effects||[]),hp=p.hp,shield=p.soulShield||0;
    const result=update.call(this,dt);
    if(!playing || this.mode!=='playing' || this.player!==p || !(dt>0))return result;
    siphons(this,old,hp,shield);
    const s=state(this),distance=Math.hypot(p.x-x,p.y-y);
    s.prints=s.prints.filter(f=>(f.age+=dt)<f.life);
    if(p.moving && distance>.01){s.distance+=distance;
      if(s.distance>=34){s.distance%=34;s.foot*=-1;
        const a=Math.atan2(p.y-y,p.x-x);
        s.prints.push({x:p.x-Math.sin(a)*s.foot*6,y:p.y+27+Math.cos(a)*s.foot*5,angle:a,age:0,life:.48});
        s.prints=s.prints.slice(low(this)?-3:-6);
      }
    }else s.distance=0;
    return result;
  };
  const drawPlayer=proto.drawPlayer;
  proto.drawPlayer=function drawCrimsonPlayer(ctx,p){
    if(p?.skin!==ID)return drawPlayer.call(this,ctx,p);
    const s=state(this);
    for(const f of s.prints)atlas(ctx,this,'footprint',f.x,f.y,33,12,f.angle,(1-f.age/f.life)*.68);
    // Cast vortex and shield are drawn behind the existing real character sprite.
    for(const e of this.effects||[]){if(e.type!=='succubus_skill_burst_v095')continue;
      const t=Math.max(0,Math.min(1,(e.t||0)/Math.max(.001,e.life||.64)));
      const fade=Math.min(1,t/.15,(1-t)/.28);
      atlas(ctx,this,'vortex',e.x,e.y,185+18*Math.sin(t*Math.PI),185+18*Math.sin(t*Math.PI),t*.35,fade*.8);
    }
    const remaining=(p.__succubusShieldFxUntilV095||0)-(this.t||0);
    if(remaining>0){const age=Math.max(0,(this.t||0)-(p.__succubusShieldFxStartV095||0));
      const fade=Math.max(0,Math.min(1,age/.16,remaining/.28));
      atlas(ctx,this,'shield',p.x,p.y-24,135,145,0,fade*.65);
    }
    return drawPlayer.call(this,ctx,p);
  };
  const drawBullet=proto.drawBullet;
  proto.drawBullet=function drawCrimsonBullet(ctx,b){
    if(!b?.succubusV095)return drawBullet.call(this,ctx,b);
    if(b.launchDelay>0)return;
    const angle=Math.atan2(Number(b.vy)||0,Number(b.vx)||0);
    const ratio=Math.max(0,Math.min(1,(Number(b.life)||0)/Math.max(.001,Number(b.maxLife)||1)));
    const fade=Math.min(1,(1-ratio)/.10,ratio/.16);
    if(b.style==='succubus_ranged_v095')return image(ctx,this,'crimsonWave',b.x,b.y,105,53,angle,.18+fade*.82,.82);
    if(b.style==='succubus_soul_v095')return image(ctx,this,'crimsonSoul',b.x,b.y,57,38,angle,.25+fade*.75,.72);
    return drawBullet.call(this,ctx,b);
  };
  const drawEffect=proto.drawEffect;
  proto.drawEffect=function drawCrimsonEffect(ctx,e){
    const type=e?.type;
    if(type==='succubusSiphonV091' && this.player?.skin===ID)return;
    if(type==='succubus_skill_burst_v095')return; // renderer above draws it behind Cherry
    const own=['succubus_melee_slash_v095','succubus_claw_mark_v095','succubus_ranged_hit_v095',
      'succubus_overheal_v095','succubus_heal_v095','crimsonSiphon'];
    if(!own.includes(type))return drawEffect.call(this,ctx,e);
    const t=Math.max(0,Math.min(1,(e.t||0)/Math.max(.001,e.life||.4))),a=1-t;
    if(type==='succubus_melee_slash_v095'){
      // Offset into the attacked half-plane, never centered over the face.
      const ang=e.angle||0,offset=48;
      return image(ctx,this,'crimsonMelee',e.x+Math.cos(ang)*offset,e.y+Math.sin(ang)*offset,115,77,ang,a,.5);
    }
    if(type==='succubus_claw_mark_v095'||type==='succubus_ranged_hit_v095')
      return atlas(ctx,this,'hit',e.x,e.y,38+t*18,38+t*18,e.angle||0,a);
    if(type==='succubus_overheal_v095')return; // the timed shield lives behind the sprite
    if(type==='succubus_heal_v095')return atlas(ctx,this,'heal',e.x,e.y-t*16,33,30,0,a*.8);
    if(type==='crimsonSiphon'){
      const dx=e.x-e.targetX,dy=e.y-e.targetY,d=Math.hypot(dx,dy);
      if(d<1)return;
      // Generated heart is at the left edge; the left edge is the player.
      return atlas(ctx,this,'siphon',(e.x+e.targetX)/2,(e.y+e.targetY)/2,
        Math.min(400,d),22,Math.atan2(dy,dx),Math.sin(t*Math.PI)*.85);
    }
  };
  window.CHERRIFT_SUCCUBUS_CRIMSON_HUNGER=Object.freeze({version:VERSION,sources:{...sources}});
})();
