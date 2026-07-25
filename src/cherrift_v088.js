(() => {
"use strict";

const VERSION = "0.8.8-enemy-boss-update";
const DISPLAY_VERSION = "v0.8.8";
if (!window.CherriftGame) return;

function ensureCss() {
  if (document.getElementById("v088css")) return;
  const link=document.createElement("link");
  link.id="v088css";link.rel="stylesheet";link.href="v088.css?v=090";
  document.head.appendChild(link);
}

const proto=CherriftGame.prototype;
const previousSpawnEnemy=proto.spawnEnemy;
proto.spawnEnemy=function spawnEnemyV088(forcedType=null,boss=false,...rest) {
  const before=this.enemies?.length||0;
  const result=previousSpawnEnemy.call(this,forcedType,boss,...rest);
  const enemy=this.enemies?.length>before?this.enemies[this.enemies.length-1]:null;
  if (!enemy) return result;
  if (enemy.isBoss) {
    enemy.__bossAbilityV088=3.8;
    enemy.__bossPhaseV088=enemy.maxHp>0?enemy.hp/enemy.maxHp:1;
  } else if (!forcedType && Math.random()<.075) {
    enemy.eliteV088=true;
    enemy.maxHp*=1.65;enemy.hp=enemy.maxHp;enemy.speed*=1.08;enemy.xp=Math.ceil((enemy.xp||1)*1.75);
    enemy.name=`Elite ${enemy.name||"Enemy"}`;
  }
  return result;
};

const previousUpdateEnemies=proto.updateEnemies;
proto.updateEnemies=function updateEnemiesV088(dt) {
  const player=this.player;
  if (player) {
    for (const enemy of this.enemies||[]) {
      if (!enemy?.isBoss||enemy.dead) continue;
      enemy.__bossAbilityV088=(enemy.__bossAbilityV088??4)-dt;
      const ratio=enemy.maxHp?enemy.hp/enemy.maxHp:1;
      if (ratio<.5&&enemy.__bossPhaseV088>=.5) {
        enemy.__bossPhaseV088=ratio;
        enemy.speed*=1.14;
        this.effects.push({type:"bossPhaseV088",x:enemy.x,y:enemy.y,t:0,life:.7});
        this.__shakeV085=Math.max(this.__shakeV085||0,.7);
      }
      if (enemy.__bossAbilityV088<=0&&!enemy.__bossTelegraphV088) {
        enemy.__bossTelegraphV088=1.05;
        enemy.__bossAbilityV088=6.5;
        this.effects.push({type:"bossTelegraphV088",x:enemy.x,y:enemy.y,r:165,t:0,life:1.05,enemy});
      }
      if (enemy.__bossTelegraphV088>0) {
        const before=enemy.__bossTelegraphV088;
        enemy.__bossTelegraphV088=Math.max(0,before-dt);
        if (before>0&&enemy.__bossTelegraphV088===0) {
          const distance=Math.hypot(player.x-enemy.x,player.y-enemy.y);
          if (distance<165+(player.r||18)&&!(player.invuln>0)) {
            const raw=20+(this.stage?.world||1)*4;
            player.hp-=Math.max(4,raw*(100/(100+(player.armor||0)*4)));
            this.effects.push({type:"playerHitV088",x:player.x,y:player.y,t:0,life:.36});
            this.__shakeV085=Math.max(this.__shakeV085||0,1);
          }
        }
      }
    }
  }
  return previousUpdateEnemies.call(this,dt);
};

const previousDamageEnemy=proto.damageEnemy;
proto.damageEnemy=function damageEnemyV088(enemy,damage) {
  const wasDead=!!enemy?.dead;
  const elite=!!enemy?.eliteV088;
  const result=previousDamageEnemy.call(this,enemy,damage);
  if (!wasDead&&enemy?.dead&&elite) this.effects.push({type:"eliteBreakV088",x:enemy.x,y:enemy.y,t:0,life:.58});
  return result;
};

const previousDrawEnemy=proto.drawEnemy;
proto.drawEnemy=function drawEnemyV088(context,enemy) {
  if (enemy?.eliteV088||enemy?.isBoss) {
    const pulse=1+Math.sin(this.t*4+(enemy.phase||0))*.08;
    context.save();
    context.globalAlpha=enemy.isBoss ? .32 : .24;
    context.fillStyle=enemy.isBoss?"#ff4f9e":"#ffd76d";
    context.shadowColor=context.fillStyle;context.shadowBlur=18;
    context.beginPath();context.ellipse(enemy.x,enemy.y+8,(enemy.r||22)*1.5*pulse,(enemy.r||22)*.72*pulse,0,0,Math.PI*2);context.fill();
    context.restore();
  }
  return previousDrawEnemy.call(this,context,enemy);
};

const previousDrawEffect=proto.drawEffect;
proto.drawEffect=function drawEffectV088(context,effect) {
  if (!["bossTelegraphV088","bossPhaseV088","playerHitV088","eliteBreakV088"].includes(effect?.type)) {
    return previousDrawEffect.call(this,context,effect);
  }
  const alpha=Math.max(0,1-effect.t/effect.life);
  context.save();context.globalAlpha=alpha;context.translate(effect.x,effect.y);
  if (effect.type==="bossTelegraphV088") {
    const progress=Math.min(1,effect.t/effect.life);
    context.strokeStyle=progress>.72?"#fff0f7":"#ff4f93";context.lineWidth=5;
    context.setLineDash([10,8]);context.lineDashOffset=-this.t*55;
    context.beginPath();context.arc(0,0,(effect.r||165)*(1-progress*.05),0,Math.PI*2);context.stroke();
    context.setLineDash([]);context.fillStyle=`rgba(255,56,131,${.06+progress*.12})`;
    context.beginPath();context.arc(0,0,effect.r||165,0,Math.PI*2);context.fill();
  } else if (effect.type==="bossPhaseV088") {
    context.strokeStyle="#ff78b8";context.lineWidth=8;context.shadowColor="#ff4b9f";context.shadowBlur=18;
    context.beginPath();context.arc(0,0,28+(1-alpha)*115,0,Math.PI*2);context.stroke();
  } else if (effect.type==="playerHitV088") {
    context.strokeStyle="#ff436e";context.lineWidth=6;
    context.beginPath();context.arc(0,0,18+(1-alpha)*45,0,Math.PI*2);context.stroke();
  } else {
    context.fillStyle="#ffe07b";context.shadowColor="#ffc74f";context.shadowBlur=14;
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;context.beginPath();context.arc(Math.cos(a)*(16+(1-alpha)*42),Math.sin(a)*(12+(1-alpha)*34),4,0,Math.PI*2);context.fill();}
  }
  context.restore();
};

ensureCss();
window.CHERRIFT_V088={version:VERSION,displayVersion:DISPLAY_VERSION};
console.info("[CHERRIFT] v0.8.8 Enemy and Boss update loaded.");
})();
