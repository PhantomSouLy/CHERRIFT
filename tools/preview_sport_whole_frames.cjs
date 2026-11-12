/* Standalone/offline Sport preview: actual shipped controller and full-pose renderer.
   Optional native PNG export requires @napi-rs/canvas (development only). */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage,Image}=require('@napi-rs/canvas');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(process.argv[2]||'../deliverables');fs.mkdirSync(OUT,{recursive:true});
const states=['idle','idle2','walk','attack','walk_attack','skill'];
const dirs=['down','down_right','right','up_right','up','up_left','left','down_left'];
const modules=['cherry_geometry','cherry_shot_alignment','cherry_motion','base_cherry','cake_cherry','sport_data','sport_cherry','sport_vfx'];
const init=`class CherriftGame {movePlayer(v,dt){this.player.x+=v.x*235*dt;this.player.y+=v.y*235*dt;}autoFire(){}skill(){}update(){}drawPlayer(){}drawBullet(){}drawEffect(){}}\nconst CHERRIFT_CONFIG={player:{displayWidth:192,displayHeight:192,skins:{cherry_default:{},cake_deliver_cherry:{},sport_cherry:{}}}};window.CherriftGame=CherriftGame;window.CHERRIFT_CONFIG=CHERRIFT_CONFIG;`;
const setup=`const states=${JSON.stringify(states)},dirs=${JSON.stringify(dirs)};
const game=new CherriftGame();game.assets={get:key=>images[key]};
function paint(ctx,state,dir,t,x,y,skin='sport_cherry'){
 const duration=state==='skill'?6/16:6/18;
 const p={skin,x,y,moving:state==='walk'||state==='walk_attack',sportFacing:dir,baseFacing:dir,cakeFacing:dir,attackDir:dir,skillDir:dir,sportStride:t,baseStride:t,cakeStride:t,sportIdleTime:state==='idle2'?6+t%2:0,baseIdleTime:0,cakeIdleTime:0,skillCastDuration:duration,skillCastTimer:state==='skill'?duration-(t%duration):0,commonShieldTimer:state==='skill'?2:0,sportAttack:state.includes('attack')?{elapsed:t%(6/18),duration:6/18}:null};
 game.player=p;game.t=t;game.drawPlayer(ctx,p);
}`;
(async()=>{
 const images={},data={};
 async function add(key,rel){const f=path.join(ROOT,rel);images[key]=await loadImage(f);data[key]='data:image/png;base64,'+fs.readFileSync(f).toString('base64');}
 for(const state of states)for(const dir of dirs)await add('player_sport_cherry_'+state+'_'+dir,'assets/player/cherry_skins/sport_cherry/sheets192/sport_cherry_'+state+'_'+dir+'.png');
 for(const [id,folder,prefix]of [['cherry_default','base_cherry','base_cherry'],['cake_deliver_cherry','cake_deliver_cherry_rebuilt','cake_deliver_cherry']])for(const dir of dirs)await add('player_'+id+'_walk_'+dir,'assets/player/cherry_skins/'+folder+'/sheets192/'+prefix+'_walk_'+dir+'.png');
 await add('sportCherryAtlas','assets/effects/sport_cherry/sport_atlas.png');
 const sources=modules.map(n=>fs.readFileSync(path.join(ROOT,'src/cherrift_'+n+'.js'),'utf8')).join('\n');
 const decodes=[];const context=vm.createContext({window:{},images,Image:class extends Image{constructor(){super();decodes.push(this);}},OffscreenCanvas:function(w,h){return createCanvas(w,h);}});vm.runInContext(init+'\n'+sources+'\n'+setup,context);
 const paint=vm.runInContext('paint',context),canvas=createCanvas(960,1456),c=canvas.getContext('2d');
 paint(c,'idle','down',0,96,150);for(const dir of dirs)paint(c,'walk',dir,0,96,150,'cherry_default');await Promise.all(decodes.map(im=>im.decode()));
 const frames=path.join(OUT,'frames');fs.mkdirSync(frames,{recursive:true});
 for(let tick=0;tick<48;tick++){
  c.fillStyle='#242236';c.fillRect(0,0,960,1456);c.fillStyle='#fff';c.font='bold 20px sans-serif';c.fillText('SPORT CHERRY · COMPLETE POSES v2',16,27);
  c.font='12px sans-serif';c.fillStyle='#c6c2dc';c.fillText('8 directions / 6 states · distance-driven gait · independent shot event · Common Shield',16,48);
  for(let row=0;row<8;row++)for(let col=0;col<6;col++){
   const x=col*160,y=64+row*174;c.fillStyle='#eeeaf6';c.font='11px sans-serif';c.fillText(dirs[row]+' / '+states[col],x+6,y+13);
   c.save();c.beginPath();c.rect(x,y+16,160,156);c.clip();c.translate(x,y+18);c.scale(.8,.8);paint(c,states[col],dirs[row],tick/12,100,147);c.restore();
  }
  fs.writeFileSync(path.join(frames,String(tick).padStart(3,'0')+'.png'),canvas.toBuffer('image/png'));
 }
 for(const state of ['walk','walk_attack']){
  const fd=path.join(OUT,state+'_frames');fs.mkdirSync(fd,{recursive:true});const cv=createCanvas(1024,576),cx=cv.getContext('2d');
  for(let frame=0;frame<6;frame++){
   cx.fillStyle='#242236';cx.fillRect(0,0,1024,576);cx.fillStyle='#fff';cx.font='bold 19px sans-serif';cx.fillText('SPORT CHERRY · '+state.toUpperCase()+' · '+(frame+1)+'/6',12,26);
   for(let i=0;i<8;i++){
    const x=i%4*256,y=Math.floor(i/4)*272+32;cx.fillStyle='#eeeaf6';cx.font='14px sans-serif';cx.fillText(dirs[i],x+8,y+20);
    cx.save();cx.translate(x,y+24);cx.scale(1.25,1.25);paint(cx,state,dirs[i],(frame+.01)/8,102.4,156);cx.restore();
   }
   fs.writeFileSync(path.join(fd,String(frame).padStart(3,'0')+'.png'),cv.toBuffer('image/png'));
  }
 }
 const costumeDir=path.join(OUT,'costume_frames');fs.mkdirSync(costumeDir,{recursive:true});const costume=createCanvas(1024,576),cc=costume.getContext('2d');
 for(let frame=0;frame<6;frame++){
  cc.fillStyle='#242236';cc.fillRect(0,0,1024,576);cc.fillStyle='#fff';cc.font='bold 19px sans-serif';cc.fillText('SPORT CHERRY v2 · COSTUME CHECK · '+(frame+1)+'/6',12,26);
  for(const [row,dir]of ['up_right','up_left'].entries())for(const [col,state]of ['idle','idle2','attack','skill'].entries()){
   const x=col*256,y=row*272+32;cc.fillStyle='#eeeaf6';cc.font='14px sans-serif';cc.fillText(dir+' / '+state,x+8,y+20);
   const t=(frame+.01)/(state==='skill'?16:state==='attack'?18:3);
   cc.save();cc.translate(x,y+24);cc.scale(1.25,1.25);paint(cc,state,dir,t,102.4,156);cc.restore();
  }
  fs.writeFileSync(path.join(costumeDir,String(frame).padStart(3,'0')+'.png'),costume.toBuffer('image/png'));
 }
 fs.copyFileSync(path.join(frames,'000.png'),path.join(OUT,'CHERRIFT-Sport-Cherry-Full-Preview-v2.png'));
 const qa=createCanvas(1152,816),qc=qa.getContext('2d');
 for(const state of ['walk','walk_attack']){
  qc.fillStyle='#242236';qc.fillRect(0,0,qa.width,qa.height);
  for(const [row,dir]of ['down_right','down_left','up_right','up_left'].entries())for(let frame=0;frame<6;frame++){
   const x=frame*192,y=row*204;qc.fillStyle='#fff';qc.font='12px sans-serif';qc.fillText(dir+' / '+state+' / '+(frame+1),x+5,y+14);
   paint(qc,state,dir,(frame+.01)/8,x+96,y+164);
  }
  fs.writeFileSync(path.join(OUT,state+'-contact-qa.png'),qa.toBuffer('image/png'));
 }
 const sample=createCanvas(192,192),sc=sample.getContext('2d'),paletteReport={};
 for(const dir of dirs.slice(0,5)){
  paletteReport[dir]={};
  for(const state of ['idle','walk','walk_attack']){
   const frames=[];
   for(let f=0;f<6;f++){
    sc.clearRect(0,0,192,192);paint(sc,state,dir,state==='idle'?(f+.01)/3:(f+.01)/8,96,150);
    const a=sc.getImageData(0,0,192,145).data,v=[[],[],[]];
    for(let i=0;i<a.length;i+=4)if(a[i+3]>220&&a[i]-a[i+1]>32&&a[i+1]-a[i+2]<18)for(let c=0;c<3;c++)v[c].push(a[i+c]);
    frames.push(v.map(values=>{values.sort((a,b)=>a-b);return values[Math.floor(values.length/2)];}));
   }
   paletteReport[dir][state]=frames;
  }
 }
 fs.writeFileSync(path.join(OUT,'palette-check.json'),JSON.stringify(paletteReport,null,2));
 const html=`<!doctype html><html lang="hu"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sport Cherry — teljes előnézet v2</title><style>body{margin:0;background:#171622;color:#eeeaf6;font:16px system-ui}header{padding:12px}h1{font-size:21px;margin:0 0 8px}button,select,input{font:inherit}button,select{padding:6px;margin:3px}#grid{display:grid;grid-template-columns:repeat(6,192px);gap:8px;padding:8px;width:max-content}article{background:#242236;text-align:center;border-radius:8px}h2{font-size:12px;margin:10px 0 0}canvas{display:block}p{margin:8px 0;font-size:13px;color:#c6c2dc}#wrap{overflow:auto}label{margin-left:8px}#focus{background:#242236;margin:10px auto;width:min(100%,480px);height:auto}summary{cursor:pointer}.refs{display:flex;justify-content:center;flex-wrap:wrap;gap:10px}.refs canvas{background:#242236;width:192px;height:192px}.refs figure{margin:8px;text-align:center}</style><header><h1>Sport Cherry — teljes előnézet v2</h1><button id="pause">Szünet</button><label>Tempó <input id="speed" type="range" min="0.25" max="1.5" step="0.25" value="1"></label><span id="rate">1×</span><button id="step">+1 walk frame</button><span id="number"></span><p>8 irány × 6 animáció. Teljes alakos képkockák, helyben futó előnézet. A játék vezérli a tényleges elmozdulást. A Walk Attack lépéseit a megtett út, a lövést külön támadási óra vezérli. A Skill nézetben a meglévő Sport pajzs is látható.</p><details open><summary>Nagyított nézet</summary><select id="direction">${dirs.map(d=>'<option>'+d+'</option>').join('')}</select><select id="state">${states.map(d=>'<option>'+d+'</option>').join('')}</select><canvas id="focus" width="480" height="480"></canvas></details><details><summary>Etalon Walk összehasonlítás — azonos irány és ütem</summary><div class="refs"><figure><figcaption>Base Cherry v7</figcaption><canvas id="base" width="192" height="192"></canvas></figure><figure><figcaption>Cake Delivery v23</figcaption><canvas id="cake" width="192" height="192"></canvas></figure></div></details><p id="status">Képek betöltése…</p></header><div id="wrap"><div id="grid"></div></div><script>const images={};const DATA=${JSON.stringify(data)};${init}\n${sources}\n${setup}\nlet clock=0,paused=false,last=0;const tiles=[];for(const dir of dirs)for(const state of states){const a=document.createElement('article'),h=document.createElement('h2'),c=document.createElement('canvas');h.textContent=dir+' / '+state;c.width=c.height=192;a.append(h,c);document.querySelector('#grid').append(a);tiles.push({ctx:c.getContext('2d'),state,dir});}const focus=document.querySelector('#focus').getContext('2d');function render(){for(const q of tiles){q.ctx.clearRect(0,0,192,192);paint(q.ctx,q.state,q.dir,clock,96,150);}const dir=document.querySelector('#direction').value;focus.clearRect(0,0,480,480);focus.save();focus.scale(2.5,2.5);paint(focus,document.querySelector('#state').value,dir,clock,96,150);focus.restore();for(const [key,skin]of [['base','cherry_default'],['cake','cake_deliver_cherry']]){const c=document.querySelector('#'+key).getContext('2d');c.clearRect(0,0,192,192);paint(c,'walk',dir,clock,96,150,skin);}document.querySelector('#number').textContent='Walk '+(Math.floor(clock*8+1e-7)%6+1)+'/6';}document.querySelector('#state').value='walk';document.querySelector('#direction').value='right';document.querySelector('#pause').onclick=()=>{paused=!paused;document.querySelector('#pause').textContent=paused?'Folytatás':'Szünet';};document.querySelector('#step').onclick=()=>{paused=true;clock=(Math.floor(clock*8+1e-7)+1)/8;document.querySelector('#pause').textContent='Folytatás';render();};document.querySelector('#speed').oninput=e=>document.querySelector('#rate').textContent=e.target.value+'×';document.querySelector('#direction').onchange=render;document.querySelector('#state').onchange=render;Promise.all(Object.entries(DATA).map(([key,src])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[key]=im;resolve();};im.onerror=()=>reject(Error(key));im.src=src;}))).then(()=>{document.querySelector('#status').textContent='Minden kép betöltve • hálózat nélkül is működik.';render();requestAnimationFrame(function tick(now){if(last&&!paused)clock+=Math.min(.05,(now-last)/1000)*Number(document.querySelector('#speed').value);last=now;render();requestAnimationFrame(tick);});}).catch(e=>document.querySelector('#status').textContent='Képhiba: '+e.message);</script></html>`;
 fs.writeFileSync(path.join(OUT,'CHERRIFT-Sport-Cherry-Full-Preview-v2.html'),html);
 console.log(JSON.stringify({frames:48,states:6,directions:8,htmlBytes:Buffer.byteLength(html),referenceWalks:16,offlineImages:Object.keys(data).length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
