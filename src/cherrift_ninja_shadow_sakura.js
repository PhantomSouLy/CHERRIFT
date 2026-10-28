/* Epic Ninja Cherry / Shadow Sakura. Cosmetic only: existing combat owns
   katana hits, two thrown stars, 12-star skill, poison and the speed buff. */
(() => {
  'use strict';
  if (!window.CherriftGame || window.CHERRIFT_NINJA_SHADOW_SAKURA) return;
  const ID='ninja_cherry', VERSION='1028-ninja-shadow1';
  const proto=window.CherriftGame.prototype, states=new WeakMap();
  const low=g=>g.save?.settings?.effectQuality==='low';
  // Imagegen texture atlas; normalized source bounds keep all motifs isolated.
  // Decode is non-blocking; the procedural shapes remain a cold-load fallback.
  const atlas=typeof Image==='function'?new Image():null;
  if(atlas){atlas.decoding='async';atlas.src='assets/effects/ninja_shadow_sakura/shadow_sakura_atlas.png?v=1028-ninja-shadow1';}
  const regions={smoke:[0,.07,.57,.39],petal:[.63,.075,.32,.35],impact:[.05,.55,.45,.36],sole:[.56,.63,.41,.22]};
  function texture(c,key,x,y,w,h,angle=0,alpha=1) {
    const iw=atlas?.naturalWidth||0,ih=atlas?.naturalHeight||0;
    if(!atlas?.complete || !iw || !ih)return false;
    const [sx,sy,sw,sh]=regions[key];
    c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=alpha;
    c.drawImage(atlas,sx*iw,sy*ih,sw*iw,sh*ih,-w/2,-h/2,w,h);c.restore();return true;
  }

  function state(g) {
    let s=states.get(g);
    if(!s || s.player!==g.player) {
      s={player:g.player,ghosts:[],prints:[],distance:0,echoDistance:0,foot:1};states.set(g,s);
    }
    return s;
  }
  function petal(c,x,y,r,angle,a=1) {
    if(texture(c,'petal',x,y,r*2.6,r*2.6,angle,a))return;
    c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=a;
    c.fillStyle='#ff91c5';c.beginPath();c.moveTo(-r,0);
    c.bezierCurveTo(-r*.3,-r*.8,r*.7,-r*.8,r,0);
    c.bezierCurveTo(r*.3,r*.75,-r*.5,r*.6,-r,0);c.fill();
    c.strokeStyle='#ffd4e9';c.lineWidth=.6;c.beginPath();c.moveTo(-r*.5,0);c.lineTo(r*.6,0);c.stroke();c.restore();
  }
  function smoke(c,x,y,r,a) {
    if(texture(c,'smoke',x+r*.5,y,r*4,r*2.6,0,a))return;
    c.save();c.globalAlpha*=a;c.fillStyle='#32273f';
    for(let i=0;i<3;i++){c.beginPath();c.ellipse(x+i*r*.65,y-Math.sin(i*2)*r*.3,r*(1-i*.15),r*.5,0,0,Math.PI*2);c.fill();}
    c.restore();
  }
  function cleanLegacy(g,start,skill=false) {
    let slash=false;
    g.effects=(g.effects||[]).filter((e,i)=>{
      if(i<start)return true;
      if(e.type==='skillPulseV085' && skill)return false;
      if(e.type==='ninja_melee_arc') {
        // Legacy melee emits an arc per hit enemy. One sweep per attack is enough.
        if(slash)return false;slash=true;e.type='ninjaShadowSlash';
      }
      if(e.type==='shuriken_storm')e.type='ninjaShadowStorm';
      return true;
    });
  }
  const fire=proto.autoFire;
  proto.autoFire=function fireShadowSakura(...args) {
    if(this.player?.skin!==ID)return fire.apply(this,args);
    const n=this.effects?.length||0,result=fire.apply(this,args);cleanLegacy(this,n);return result;
  };
  const skill=proto.skill;
  proto.skill=function skillShadowSakura(...args) {
    if(this.player?.skin!==ID)return skill.apply(this,args);
    const n=this.effects?.length||0,result=skill.apply(this,args);cleanLegacy(this,n,true);return result;
  };
  const update=proto.update;
  proto.update=function updateShadowSakura(dt) {
    const p=this.player,playing=this.mode==='playing',x=p?.x,y=p?.y;
    const result=update.call(this,dt);
    if(!playing || this.mode!=='playing' || p?.skin!==ID || p!==this.player || !(dt>0))return result;
    const s=state(this),distance=Math.hypot(p.x-x,p.y-y);
    s.ghosts=s.ghosts.filter(g=>(g.age+=dt)<.22);
    s.prints=s.prints.filter(f=>(f.age+=dt)<f.life);
    // Old generic movement dots/pulse are replaced, rather than layered on top.
    this.effects=(this.effects||[]).filter(e=>e.type!=='motionTrailV085' && e.type!=='skillPulseV085');
    if(!(distance>.01) || !p.moving){s.distance=0;s.echoDistance=0;return result;}
    const buff=p.ninjaSpeedBuff>0,angle=Math.atan2(p.y-y,p.x-x);
    s.distance+=distance;s.echoDistance+=distance;
    if(s.distance>=28) {
      s.distance%=28;s.foot*=-1;
      s.prints.push({x:p.x-Math.sin(angle)*s.foot*6,y:p.y+28+Math.cos(angle)*s.foot*6,
        angle,age:0,life:buff?.8:.65,foot:s.foot,buff});
      s.prints=s.prints.slice(low(this)?-5:-10);
    }
    if(s.echoDistance>=(buff?20:27)) {
      s.echoDistance=0;
      // Freeze cast and gait clocks; echoes cannot fire or advance gameplay.
      s.ghosts.push({age:0,alpha:buff?.22:.13,player:{...p,x,y,
        ninjaChibiAttack:p.ninjaChibiAttack?{...p.ninjaChibiAttack}:null}});
      s.ghosts=s.ghosts.slice(low(this)?-1:-2);
    }
  };
  function footprint(c,f) {
    const t=f.age/f.life,a=(1-t)**1.5;
    c.save();c.translate(f.x,f.y);c.rotate(f.angle);c.globalAlpha*=a;
    if(texture(c,'sole',0,0,14,7,0,1)) {
      smoke(c,-7-t*4,0,3+t*4,.4);c.restore();return;
    }
    // Toe faces travel (+x); both sole and heel remain recognisable at game scale.
    c.fillStyle='#231d30';c.strokeStyle=f.buff?'#ff77bd':'#cb5e99';c.lineWidth=.7;
    c.beginPath();c.ellipse(1,0,4.5,2.5,f.foot*.12,0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle='#110f1d';c.fillRect(-5,-1.8,2,3.6);
    smoke(c,-6-t*4,0,3+t*4,.4);
    if(f.buff || t<.4)petal(c,-5-t*9,f.foot*(3+t*3),1.8,-f.angle+t*2,.8);
    c.restore();
  }
  const drawPlayer=proto.drawPlayer;
  proto.drawPlayer=function drawPlayerShadowSakura(c,p) {
    if(p?.skin!==ID)return drawPlayer.call(this,c,p);
    const s=state(this);
    for(const f of s.prints)footprint(c,f);
    for(const g of s.ghosts){c.save();c.globalAlpha*=g.alpha*(1-g.age/.22);drawPlayer.call(this,c,g.player);c.restore();}
    if(p.moving && s.ghosts.length) {
      const g=s.ghosts.at(-1).player,angle=Math.atan2(p.y-g.y,p.x-g.x),buff=p.ninjaSpeedBuff>0;
      c.save();c.translate(p.x,p.y+24);c.rotate(angle);
      const trail=c.createLinearGradient(-58,0,-8,0);trail.addColorStop(0,'rgba(255,80,164,0)');trail.addColorStop(1,buff?'rgba(255,100,179,.7)':'rgba(255,100,179,.35)');
      c.strokeStyle=trail;c.lineWidth=buff?2:1;c.beginPath();c.moveTo(-58,2);c.quadraticCurveTo(-29,7,-8,0);c.stroke();
      for(let i=0;i<(low(this)?1:3);i++) {
        smoke(c,-23-i*14,Math.sin((this.t||0)*9+i)*3,6+i*2,.48);
        petal(c,-18-i*15,(i%2?1:-1)*7,2.5,Math.sin((this.t||0)*7+i),.7-i*.12);
      }
      c.restore();
    }
    return drawPlayer.call(this,c,p);
  };
  const drawBullet=proto.drawBullet;
  proto.drawBullet=function drawBulletShadowSakura(c,b) {
    if(b?.style!=='ninja_shuriken')return drawBullet.call(this,c,b);
    c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy||0,b.vx||0));
    c.globalAlpha*=Math.min(1,Math.max(0,b.life)/.12);
    smoke(c,-26,0,7,.5);
    const trail=c.createLinearGradient(-42,0,-3,0);trail.addColorStop(0,'rgba(255,65,157,0)');trail.addColorStop(1,'rgba(255,119,191,.8)');
    c.strokeStyle=trail;c.lineWidth=2;c.beginPath();c.moveTo(-42,3);c.quadraticCurveTo(-23,-7,-3,-2);c.stroke();
    for(let i=0;i<(low(this)?1:2);i++)petal(c,-17-i*13,Math.sin((b.spin||0)+i*2)*5,2.5,(b.spin||0)*.3+i,.75);
    c.rotate((b.spin||0)-Math.atan2(b.vy||0,b.vx||0));
    c.fillStyle='#292438';c.strokeStyle='#ff8cc4';c.lineWidth=1.2;c.beginPath();
    for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?3.5:10;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();c.stroke();
    c.strokeStyle='#fff0f8';c.lineWidth=.8;c.beginPath();c.moveTo(-9,0);c.lineTo(-2,-1);c.lineTo(0,-9);c.stroke();
    c.fillStyle='#131120';c.beginPath();c.arc(0,0,2,0,Math.PI*2);c.fill();c.restore();
  };
  const drawEffect=proto.drawEffect;
  proto.drawEffect=function drawEffectShadowSakura(c,e) {
    const owned=['ninjaShadowSlash','ninjaShadowStorm'].includes(e?.type);
    const hit=e?.type==='poison_hit' && this.player?.skin===ID;
    if(!owned && !hit)return drawEffect.call(this,c,e);
    const t=Math.min(1,Math.max(0,e.t/Math.max(.001,e.life))),a=1-t;
    c.save();c.translate(e.x,e.y);c.globalAlpha*=a;
    if(e.type==='ninjaShadowSlash') {
      c.rotate(e.angle||0);c.translate(0,-10);
      const r=54+Math.sin(t*Math.PI)*12,sweep=-1.2+t*.45;
      const end=sweep+2.1;
      const glow=c.createLinearGradient(0,-r,0,r);
      glow.addColorStop(0,'rgba(255,70,157,.1)');glow.addColorStop(.48,'rgba(255,105,181,.95)');glow.addColorStop(1,'rgba(255,70,157,.05)');
      c.fillStyle=glow;c.beginPath();c.arc(0,0,r,sweep,end);
      c.quadraticCurveTo(Math.cos(end-.02)*(r-5),Math.sin(end-.02)*(r-5),Math.cos(end-.15)*(r-12),Math.sin(end-.15)*(r-12));
      c.arc(0,0,r-12,end-.15,sweep+.15,true);
      c.quadraticCurveTo(Math.cos(sweep+.02)*(r-5),Math.sin(sweep+.02)*(r-5),Math.cos(sweep)*r,Math.sin(sweep)*r);c.closePath();c.fill();
      c.strokeStyle='#fff0f9';c.lineWidth=1.4*a+.4;c.beginPath();c.arc(0,0,r,sweep+.08,end-.08);c.stroke();
      c.strokeStyle='rgba(255,97,174,.4)';c.lineWidth=1;c.beginPath();c.arc(0,0,r+4,sweep+.2,end-.2);c.stroke();
      smoke(c,r*.7,-r*.45,8,.5);
      for(let i=0;i<(low(this)?2:4);i++){const ang=sweep+i*.55;petal(c,Math.cos(ang)*(r+10+t*10),Math.sin(ang)*(r+10+t*10),3,ang+t*2);}
    } else if(e.type==='ninjaShadowStorm') {
      c.translate(0,18);c.scale(1,.55);
      const r=22+t*73,count=low(this)?4:8;
      for(let i=0;i<count;i++) {
        const ang=i/count*Math.PI*2+t*.6;
        smoke(c,Math.cos(ang)*r,Math.sin(ang)*r,9+t*7,.6);
        petal(c,Math.cos(ang)*(r+5),Math.sin(ang)*(r+5),4,ang+t*2);
      }
      c.strokeStyle='#ff8dc5';c.lineWidth=2*a+1;
      for(let i=0;i<3;i++){c.beginPath();c.arc(0,0,r,i*2.1+t*.3,i*2.1+1.3+t*.3);c.stroke();}
    } else {
      if(texture(c,'impact',0,0,33+t*16,29+t*14,t*.25,1)){c.restore();return;}
      smoke(c,0,0,8+t*5,.5);
      c.strokeStyle='#ffe1f1';c.lineWidth=1.5*a;c.beginPath();c.moveTo(-5-a*6,0);c.lineTo(5+a*6,0);c.moveTo(0,-4-a*6);c.lineTo(0,4+a*6);c.stroke();
      for(let i=0;i<(low(this)?2:3);i++){const ang=i*2.1;petal(c,Math.cos(ang)*(5+t*18),Math.sin(ang)*(5+t*18),3,ang+t*2);}
    }
    c.restore();
  };
  window.CHERRIFT_NINJA_SHADOW_SAKURA=Object.freeze({version:VERSION});
})();
