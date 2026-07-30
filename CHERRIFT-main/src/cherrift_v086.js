(() => {
"use strict";

const VERSION = "0.8.6-world-one-remaster";
const DISPLAY_VERSION = "v0.8.6";
if (!window.CherriftGame || !window.UI) return;

function ensureCss() {
  if (document.getElementById("v086css")) return;
  const link = document.createElement("link");
  link.id = "v086css";
  link.rel = "stylesheet";
  link.href = "v086.css?v=090";
  document.head.appendChild(link);
}

function hash(seed) {
  const value = Math.sin(seed * 91.733 + 17.17) * 43758.5453;
  return value - Math.floor(value);
}

const proto = CherriftGame.prototype;
const previousGenerateMap = proto.generateMap;
proto.generateMap = function generateMapV086(...args) {
  const map = previousGenerateMap.apply(this, args) || [];
  const stage = this.stage || this.getSelectedStage?.();
  if (stage?.world !== 1 || map.some(item => item.v086Decor)) return map;
  const density = Math.min(innerWidth || 1280, innerHeight || 720) <= 860 ? .58 : 1;
  const stageIndex = Math.max(1, Number(stage.index || String(stage.id || "").match(/\d+$/)?.[0]) || 1);
  const types = ["petalPatch", "cloverRing", "blossomLantern", "shrineRibbon"];
  const count = Math.round((14 + stageIndex * 2) * density);
  for (let index = 0; index < count; index++) {
    const angle = hash(index + stageIndex * 29) * Math.PI * 2;
    const distance = 380 + hash(index * 3.7 + stageIndex) * 1500;
    map.push({
      kind:types[(index + stageIndex) % types.length],
      x:Math.cos(angle) * distance,
      y:Math.sin(angle) * distance,
      r:22,
      solid:false,
      phase:hash(index * 11.3) * Math.PI * 2,
      v086Decor:true
    });
  }
  return map;
};

const previousDrawObstacle = proto.drawObstacle;
proto.drawObstacle = function drawObstacleV086(context, object) {
  if (!object?.v086Decor) return previousDrawObstacle.call(this, context, object);
  const pulse = 1 + Math.sin(this.t * 1.7 + object.phase) * .05;
  context.save();
  context.translate(object.x, object.y);
  context.scale(pulse, pulse);
  if (object.kind === "petalPatch") {
    context.fillStyle = "rgba(255,183,218,.76)";
    for (let i=0;i<5;i++) {
      const angle = i / 5 * Math.PI * 2 + object.phase;
      context.beginPath();
      context.ellipse(Math.cos(angle)*15,Math.sin(angle)*8,6,3,angle,.0,Math.PI*2);
      context.fill();
    }
  } else if (object.kind === "cloverRing") {
    context.fillStyle = "rgba(145,225,139,.76)";
    for (let i=0;i<4;i++) {
      const angle = i / 4 * Math.PI * 2;
      context.beginPath();
      context.arc(Math.cos(angle)*7,Math.sin(angle)*7,7,0,Math.PI*2);
      context.fill();
    }
  } else if (object.kind === "blossomLantern") {
    context.fillStyle = "#54382b";
    context.fillRect(-2,-18,4,28);
    context.shadowColor = "#ff8fc8";
    context.shadowBlur = 13;
    context.fillStyle = "#ffd8e9";
    context.beginPath();
    context.roundRect(-10,-24,20,18,5);
    context.fill();
  } else {
    context.strokeStyle = "rgba(255,185,218,.82)";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(-15,9);
    context.quadraticCurveTo(0,-17,16,8);
    context.stroke();
    context.fillStyle = "#fff0f7";
    context.beginPath();
    context.arc(0,-7,4,0,Math.PI*2);
    context.fill();
  }
  context.restore();
};

const previousDrawGround = proto.drawGround;
proto.drawGround = function drawGroundV086(context, zoom = 1) {
  const result = previousDrawGround.call(this, context, zoom);
  const stage = this.stage || this.getSelectedStage?.();
  if (stage?.world !== 1) return result;
  const tones = ["rgba(255,210,231,.018)","rgba(255,232,190,.025)","rgba(191,231,183,.025)","rgba(214,196,255,.025)","rgba(255,185,214,.03)"];
  const viewWidth = this.w / zoom, viewHeight = this.h / zoom;
  context.save();
  context.fillStyle = tones[(Math.max(1, stage.index || 1)-1) % tones.length];
  context.fillRect(this.camera.x-viewWidth/2-32,this.camera.y-viewHeight/2-32,viewWidth+64,viewHeight+64);
  context.restore();
  return result;
};

const previousStart = proto.start;
proto.start = async function startV086(...args) {
  const result = await previousStart.apply(this, args);
  const stage = this.stage || this.getSelectedStage?.();
  document.body.dataset.cherriftWorld = String(stage?.world || "");
  document.body.dataset.cherriftStage = String(stage?.index || "");
  return result;
};

ensureCss();
window.CHERRIFT_V086 = {version:VERSION, displayVersion:DISPLAY_VERSION};
console.info("[CHERRIFT] v0.8.6 World 1 Remaster loaded.");
})();
