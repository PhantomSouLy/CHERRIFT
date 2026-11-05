/* Imagegen Sport VFX; visual hooks only. */
(() => {
  'use strict';
  if(!window.CherriftGame||window.CHERRIFT_SPORT_VFX)return;
  const KEY='sportCherryAtlas',SOURCE='assets/effects/sport_cherry/sport_atlas.png?v=1030-sport-chibi1';
  if(typeof ImageAssets!=='undefined'){
    const load=ImageAssets.prototype.loadAll;
    ImageAssets.prototype.loadAll=async function(...args){const r=await load.apply(this,args);await this.loadImage(KEY,SOURCE);return r;};
  }
  const proto=CherriftGame.prototype;
  function stamp(c,img,cell,x,y,w,h=w){
    if(!img)return;const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    c.drawImage(img,cell%3*iw/3,Math.floor(cell/3)*ih/2,iw/3,ih/2,x-w/2,y-h/2,w,h);
  }
  function shot(game,b){(game.effects||=[]).push({type:'sportCast',x:b.x,y:b.y,t:0,life:.13});}
  function shield(game,c,p){
    const time=Math.max(0,p.commonShieldTimer||0);if(!time)return;
    c.save();c.globalAlpha*=Math.min(1,time/.15)*.8;
    const pulse=1+Math.sin((game.t||0)*8)*.015;
    stamp(c,game.assets.get(KEY),2,p.x,p.y-14,136*pulse);c.restore();
  }
  const drawBullet=proto.drawBullet;
  proto.drawBullet=function(c,b){
    if(b?.style!=='sport_bloom_v1')return drawBullet.call(this,c,b);
    const img=this.assets.get(KEY);if(!img)return drawBullet.call(this,c,b);
    c.save();c.globalAlpha*=Math.min(1,Math.max(0,b.life)/.12);
    c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy||0,b.vx||1));
    stamp(c,img,0,0,0,48*(1+Math.sin((1.45-b.life)*18)*.035));
    if(this.save?.settings?.effectQuality!=='low')stamp(c,img,3,-18,Math.sin((1.45-b.life)*10)*3,10);
    c.restore();
  };
  const drawEffect=proto.drawEffect;
  proto.drawEffect=function(c,e){
    const hit=e?.type==='hit'&&e.style==='sport_bloom_v1';
    if(!hit&&e?.type!=='sportCast'&&e?.type!=='sportDust'&&!e?.sportShield)return drawEffect.call(this,c,e);
    const img=this.assets.get(KEY);if(!img)return drawEffect.call(this,c,e);
    const t=Math.min(1,Math.max(0,e.t/Math.max(.001,e.life)));
    c.save();c.globalAlpha*=1-t;
    stamp(c,img,hit?1:e.type==='sportDust'?5:e.sportShield?2:4,e.x,e.y,hit?42+t*22:e.type==='sportDust'?28+t*10:e.sportShield?85+t*35:30);
    c.restore();
  };
  const update=proto.update;
  proto.update=function(dt){
    const p=this.player,x=p?.x,y=p?.y,playing=this.mode==='playing';
    const r=update.call(this,dt);
    if(!playing||this.mode!=='playing'||p!==this.player||p?.skin!=='sport_cherry'||!(dt>0))return r;
    const distance=Math.hypot(p.x-x,p.y-y);
    if(p.moving&&distance>.01){
      p.sportStepDistance=(p.sportStepDistance||0)+distance;
      if(p.sportStepDistance>=38){p.sportStepDistance%=38;p.sportFoot=-(p.sportFoot||1);
        (this.effects||=[]).push({type:'sportDust',x:p.x+p.sportFoot*7,y:p.y+27,t:0,life:.24});}
    }else p.sportStepDistance=0;
    return r;
  };
  window.CHERRIFT_SPORT_VFX=Object.freeze({version:'1030-sport-chibi1',shot,shield});
})();
