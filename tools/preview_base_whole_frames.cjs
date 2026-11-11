/* Offline preview: the actual shipped Base controller and registration renderer. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage,Image}=require('@napi-rs/canvas');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(process.argv[2]||'../deliverables');fs.mkdirSync(OUT,{recursive:true});
const MODULES=['cherry_geometry','cherry_shot_alignment','cherry_motion','base_cherry'];
const states=['idle','idle2','walk','attack','walk_attack','skill'];
const dirs=['down','down_right','right','up_right','up','up_left','left','down_left'];
const init=`class CherriftGame {movePlayer(v,dt){this.player.x+=v.x*235*dt;this.player.y+=v.y*235*dt;}autoFire(){}skill(){}update(){}drawPlayer(){}}\nconst CHERRIFT_CONFIG={player:{displayWidth:192,displayHeight:192,skins:{cherry_default:{}}}};window.CherriftGame=CherriftGame;window.CHERRIFT_CONFIG=CHERRIFT_CONFIG;`;
const setup=`const states=${JSON.stringify(states)},dirs=${JSON.stringify(dirs)};
let showOriginal=false;
const game=new CherriftGame();
const BaselineGame=class extends CherriftGame {};
const baselineWindow={...window,CherriftGame:BaselineGame,CHERRIFT_BASE_CHERRY:undefined};
const baselineConfig=JSON.parse(JSON.stringify(CHERRIFT_CONFIG));
new Function('window','CherriftGame','CHERRIFT_CONFIG',BASELINE_CONTROLLER)(baselineWindow,BaselineGame,baselineConfig);
const baselineGame=new BaselineGame();
game.assets=baselineGame.assets={get:key=>images[key]};
function paint(ctx,state,dir,t,x,y){
 const duration=state==='skill'?6/14:6/18;
 const p={skin:'cherry_default',x,y,moving:state==='walk'||state==='walk_attack',baseFacing:dir,attackDir:dir,skillDir:dir,baseStride:t,baseIdleTime:state==='idle2'?6+t%2:0,skillCastDuration:duration,skillCastTimer:state==='skill'?duration-(t%duration):0,baseAttack:state.includes('attack')?{elapsed:t%(6/18),duration:6/18}:null};
 const active=showOriginal?baselineGame:game;active.player=p;active.t=t;active.drawPlayer(ctx,p);
}`;
(async()=>{
 const images={},data={};
 for(const state of states)for(const dir of dirs){const key='player_cherry_default_'+state+'_'+dir;const file=path.join(ROOT,'assets/player/cherry_skins/base_cherry/sheets192/base_cherry_'+state+'_'+dir+'.png');images[key]=await loadImage(file);data[key]='data:image/png;base64,'+fs.readFileSync(file).toString('base64');}
 const baseline=fs.readFileSync(path.join(ROOT,'assets/player/cherry_skins/base_cherry/sources/whole-color-v7/baseline-controller.txt'),'utf8');
 const baselineDef='const BASELINE_CONTROLLER='+JSON.stringify(baseline)+';';
 const sources=MODULES.map(n=>fs.readFileSync(path.join(ROOT,'src/cherrift_'+n+'.js'),'utf8')).join('\n');
 const decodes=[];const context=vm.createContext({window:{},images,Image:class extends Image{constructor(){super();decodes.push(this);}},OffscreenCanvas:function(w,h){return createCanvas(w,h);}});vm.runInContext(init+'\n'+sources+'\n'+baselineDef+'\n'+setup,context);
 const paint=vm.runInContext('paint',context);const canvas=createCanvas(960,1456),c=canvas.getContext('2d');
 paint(c,'idle','down',0,96,150);vm.runInContext('showOriginal=true',context);paint(c,'idle','down',0,96,150);vm.runInContext('showOriginal=false',context);await Promise.all(decodes.map(image=>image.decode()));
 const frameDir=path.join(OUT,'frames');fs.mkdirSync(frameDir,{recursive:true});
 for(let tick=0;tick<60;tick++){
  c.fillStyle='#242236';c.fillRect(0,0,960,1456);c.fillStyle='#fff';c.font='bold 20px sans-serif';c.fillText('BASE CHERRY · WHOLE FRAMES v7',16,27);
  c.font='12px sans-serif';c.fillStyle='#c6c2dc';c.fillText('8 directions / 6 states · steady left/right Walk colors, same complete poses · full poses',16,48);
  for(let row=0;row<8;row++)for(let col=0;col<6;col++){
   const x=col*160,y=64+row*174;c.fillStyle='#eeeaf6';c.font='11px sans-serif';c.fillText(dirs[row]+' / '+states[col],x+6,y+13);
   c.save();c.beginPath();c.rect(x,y+16,160,156);c.clip();c.translate(x,y+18);c.scale(.8,.8);paint(c,states[col],dirs[row],tick/12,100,147);c.restore();
  }
  fs.writeFileSync(path.join(frameDir,String(tick).padStart(3,'0')+'.png'),canvas.toBuffer('image/png'));
 }
 const detailDir=path.join(OUT,'walk_compare_frames');fs.mkdirSync(detailDir,{recursive:true});
 const detail=createCanvas(640,720),dc=detail.getContext('2d');
 for(let tick=0;tick<6;tick++){
  dc.fillStyle='#242236';dc.fillRect(0,0,640,720);dc.fillStyle='#fff';dc.font='bold 18px sans-serif';dc.fillText('BASE CHERRY · WALK v6 / WALK v7 · '+(tick+1)+'/6',12,28);
  for(const [row,dir] of ['right','left'].entries())for(let col=0;col<2;col++){
   dc.fillStyle='#eeeaf6';dc.font='14px sans-serif';dc.fillText(dir+' / '+(col===0?'Walk v6':'Walk v7'),col*320+10,row*336+62);
   vm.runInContext('showOriginal='+String(col===0),context);
   dc.save();dc.translate(col*320,row*336+72);dc.scale(1.5,1.5);paint(dc,'walk',dir,tick/8,106.6666667,154);dc.restore();
  }
  fs.writeFileSync(path.join(detailDir,String(tick).padStart(3,'0')+'.png'),detail.toBuffer('image/png'));
 }
 vm.runInContext('showOriginal=false',context);
 fs.copyFileSync(path.join(frameDir,'000.png'),path.join(OUT,'CHERRIFT-Base-Cherry-Full-Preview-v7.png'));
 const html=`<!doctype html><html lang="hu"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Base Cherry · teljes előnézet v7</title><style>body{margin:0;background:#171622;color:#eeeaf6;font:16px system-ui}header{position:static;background:#171622;padding:12px;z-index:1}h1{font-size:21px;margin:0 0 8px}button,select,input{font:inherit}button,select{padding:6px}#grid{display:grid;grid-template-columns:repeat(6,192px);gap:8px;padding:8px;width:max-content}article{background:#242236;text-align:center;border-radius:8px}h2{font-size:12px;margin:10px 0 0}canvas{display:block}p{margin:6px 0;font-size:13px;color:#c6c2dc}#wrap{overflow:auto}label{margin-left:10px}#focus{display:block;background:#242236;margin:10px auto}summary{cursor:pointer}</style><header><h1>Base Cherry — teljes előnézet v7</h1><button id="pause">Szünet</button><label>Tempó <input id="speed" type="range" min="0.25" max="1.5" step="0.25" value="1"></label><span id="rate">1×</span><label><input type="checkbox" id="original"> Korábbi v6 összehasonlítás</label><button id="step">+1 walk frame</button><p>8 irány × 6 animáció. Teljes alakos képkockák. Az animáció helyben fut; a játékbeli elmozdulást a játék vezérli.</p><details open><summary>Nagyított nézet</summary><select id="direction">${dirs.map(d=>'<option>'+d+'</option>').join('')}</select><select id="state">${states.map(d=>'<option>'+d+'</option>').join('')}</select><canvas id="focus" width="384" height="384"></canvas></details></header><div id="wrap"><div id="grid"></div></div><script>const images={};const DATA=${JSON.stringify(data)};${init}\n${sources}\n${baselineDef}\n${setup}\nlet clock=0,paused=false,last=0;const tiles=[];for(const dir of dirs)for(const state of states){const a=document.createElement('article'),h=document.createElement('h2'),c=document.createElement('canvas');h.textContent=dir+' / '+state;c.width=c.height=192;a.append(h,c);document.querySelector('#grid').append(a);tiles.push({ctx:c.getContext('2d'),state,dir});}document.querySelector('#original').onchange=e=>{showOriginal=e.target.checked;render();};const focus=document.querySelector('#focus').getContext('2d');function render(){for(const q of tiles){q.ctx.clearRect(0,0,192,192);paint(q.ctx,q.state,q.dir,clock,96,150);}focus.clearRect(0,0,384,384);focus.save();focus.scale(2,2);paint(focus,document.querySelector('#state').value,document.querySelector('#direction').value,clock,96,150);focus.restore();}document.querySelector('#state').value='walk';document.querySelector('#direction').value='right';document.querySelector('#pause').onclick=()=>{paused=!paused;document.querySelector('#pause').textContent=paused?'Folytatás':'Szünet';};document.querySelector('#step').onclick=()=>{paused=true;clock+=1/8;document.querySelector('#pause').textContent='Folytatás';render();};document.querySelector('#speed').oninput=e=>document.querySelector('#rate').textContent=e.target.value+'×';Promise.all(Object.entries(DATA).map(([key,src])=>new Promise(resolve=>{const im=new Image();im.onload=()=>{images[key]=im;resolve();};im.src=src;}))).then(()=>{const warm=document.createElement('canvas');warm.width=warm.height=192;showOriginal=true;paint(warm.getContext('2d'),'idle','down',0,96,150);showOriginal=false;paint(warm.getContext('2d'),'idle','down',0,96,150);requestAnimationFrame(function tick(now){if(last&&!paused)clock+=Math.min(.05,(now-last)/1000)*Number(document.querySelector('#speed').value);last=now;render();requestAnimationFrame(tick);});});</script></html>`;
 fs.writeFileSync(path.join(OUT,'CHERRIFT-Base-Cherry-Full-Preview-v7.html'),html);
 console.log(JSON.stringify({frames:60,states:6,directions:8,htmlBytes:Buffer.byteLength(html)}));
})();
