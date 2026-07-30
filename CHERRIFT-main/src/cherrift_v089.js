(() => {
"use strict";

const VERSION="0.8.9-run-loot-update";
const DISPLAY_VERSION="v0.8.9";
if(!window.CherriftGame||!window.UI)return;
const id=value=>document.getElementById(value);

function ensureCss(){
  if(id("v089css"))return;
  const link=document.createElement("link");link.id="v089css";link.rel="stylesheet";link.href="v089.css?v=090";document.head.appendChild(link);
}

const proto=CherriftGame.prototype;
const previousStart=proto.start;
proto.start=async function startV089(...args){
  const result=await previousStart.apply(this,args);
  this.runStatsV089={damage:0,criticals:0,elites:0,bosses:0,keys:0,peakLevel:1};
  return result;
};

const previousDamageEnemy=proto.damageEnemy;
proto.damageEnemy=function damageEnemyV089(enemy,damage){
  const hpBefore=Math.max(0,Number(enemy?.hp)||0),wasDead=!!enemy?.dead,beforePickups=this.pickups?.length||0;
  const result=previousDamageEnemy.call(this,enemy,damage);
  if(this.runStatsV089){
    this.runStatsV089.damage+=Math.min(hpBefore,Math.max(0,Number(damage)||0));
    if(damage>(this.player?.damage||20)*1.42)this.runStatsV089.criticals++;
    if(!wasDead&&enemy?.dead&&enemy.eliteV088)this.runStatsV089.elites++;
    if(!wasDead&&enemy?.dead&&enemy.isBoss)this.runStatsV089.bosses++;
  }
  if(!wasDead&&enemy?.dead){
    const added=(this.pickups||[]).slice(beforePickups);
    added.forEach((pickup,index)=>{pickup.bornV089=this.t;pickup.phaseV089=Math.random()*Math.PI*2+index;});
    if(enemy.isBoss&&!added.some(pickup=>pickup.type==="key")){
      this.pickups.push({type:"key",x:enemy.x,y:enemy.y,value:1,r:11,bornV089:this.t,phaseV089:0,bossDropV089:true});
    }else if(enemy.eliteV088&&Math.random()<.22&&!added.some(pickup=>pickup.type==="key")){
      this.pickups.push({type:"key",x:enemy.x,y:enemy.y,value:1,r:11,bornV089:this.t,phaseV089:0});
    }
  }
  return result;
};

const previousUpdatePickups=proto.updatePickups;
proto.updatePickups=function updatePickupsV089(dt){
  const keysBefore=(this.pickups||[]).filter(pickup=>pickup.type==="key").length;
  const result=previousUpdatePickups.call(this,dt);
  const keysAfter=(this.pickups||[]).filter(pickup=>pickup.type==="key").length;
  if(this.runStatsV089&&keysAfter<keysBefore)this.runStatsV089.keys+=keysBefore-keysAfter;
  if(this.runStatsV089&&this.player)this.runStatsV089.peakLevel=Math.max(this.runStatsV089.peakLevel,this.player.level||1);
  return result;
};

const previousDrawPickup=proto.drawPickup;
proto.drawPickup=function drawPickupV089(context,pickup){
  const bob=Math.sin(this.t*4+(pickup.phaseV089||0))*2;
  if(pickup?.type!=="key"){
    context.save();context.translate(0,bob);const result=previousDrawPickup.call(this,context,pickup);context.restore();return result;
  }
  context.save();context.translate(pickup.x,pickup.y+bob);context.rotate(Math.sin(this.t*2+(pickup.phaseV089||0))*.08);
  context.shadowColor=pickup.bossDropV089?"#fff09a":"#ff8ac8";context.shadowBlur=pickup.bossDropV089?18:12;
  context.strokeStyle=pickup.bossDropV089?"#ffe47a":"#ffc0df";context.fillStyle="#7a3b63";context.lineWidth=3;
  context.beginPath();context.arc(-4,-4,6,0,Math.PI*2);context.stroke();
  context.beginPath();context.moveTo(0,0);context.lineTo(12,12);context.lineTo(17,7);context.moveTo(10,10);context.lineTo(6,15);context.stroke();
  context.beginPath();context.arc(-4,-4,2,0,Math.PI*2);context.fill();
  context.restore();
};

function summaryMarkup(game){
  const stats=game.runStatsV089||{};
  const reward=game.__v080StageReward||{};
  const chests=["common","rare","epic"].reduce((sum,key)=>sum+(Number(reward[key])||0),0);
  return `<section class="run-summary-v089">
    <article><small>Damage</small><b>${Math.round(stats.damage||0).toLocaleString()}</b></article>
    <article><small>Critical hits</small><b>${stats.criticals||0}</b></article>
    <article><small>Elite / Boss</small><b>${stats.elites||0} / ${stats.bosses||0}</b></article>
    <article><small>Keys / Chests</small><b>${stats.keys||0} / ${chests}</b></article>
    <article><small>Peak level</small><b>${stats.peakLevel||game.player?.level||1}</b></article>
  </section>`;
}

const previousShowStageClear=UI.showStageClear?.bind(UI);
if(previousShowStageClear){
  UI.showStageClear=function showStageClearV089(game,info){
    const result=previousShowStageClear(game,info);
    let holder=id("runSummaryV089");
    if(!holder){holder=document.createElement("div");holder.id="runSummaryV089";id("v080StageRewards")?.insertAdjacentElement("afterend",holder)||document.querySelector("#stageClearModal .stage-clear-summary")?.insertAdjacentElement("afterend",holder);}
    if(holder)holder.innerHTML=summaryMarkup(game);
    return result;
  };
}

const previousShowGameOver=UI.showGameOver?.bind(UI);
if(previousShowGameOver){
  UI.showGameOver=function showGameOverV089(game){
    const result=previousShowGameOver(game);
    const holder=id("runResult");if(holder&&!id("failedRunSummaryV089"))holder.insertAdjacentHTML("beforeend",`<div id="failedRunSummaryV089">${summaryMarkup(game)}</div>`);
    return result;
  };
}

ensureCss();
window.CHERRIFT_V089={version:VERSION,displayVersion:DISPLAY_VERSION,summaryMarkup};
console.info("[CHERRIFT] v0.8.9 Run and Loot update loaded.");
})();
