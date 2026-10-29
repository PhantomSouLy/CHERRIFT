import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import vm from 'node:vm';
const code=readFileSync('src/cherrift_animation_smoothing.js','utf8');
function fixture(walking=false){
 class Canvas{constructor(){this._width=192;this._height=192;this.pixels=new Uint8ClampedArray(192*192*4);}set width(v){this._width=v;this.pixels=new Uint8ClampedArray(v*this._height*4);}get width(){return this._width;}set height(v){this._height=v;this.pixels=new Uint8ClampedArray(v*this._width*4);}get height(){return this._height;}
  getContext(type){if(type!=='2d')return null;const self=this;let tr=[1,1,0,0],stack=[];return {save(){stack.push([...tr]);},restore(){tr=stack.pop();},translate(x,y){tr[2]+=x;tr[3]+=y;},scale(x,y){tr[0]*=x;tr[1]*=y;},beginPath(){},rect(){},clip(){},
   fillRect(x,y,w,h){x=Math.round(tr[2]+x*tr[0]);y=Math.round(tr[3]+y*tr[1]);w=Math.round(w*tr[0]);h=Math.round(h*tr[1]);for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++){const n=(j*self.width+i)*4;self.pixels[n]=self.pixels[n+1]=self.pixels[n+2]=self.pixels[n+3]=255;}},
   drawImage(src,dx=0,dy=0){for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=self.width||yy<0||yy>=self.height)continue;const a=(y*src.width+x)*4,b=(yy*self.width+xx)*4;self.pixels.set(src.pixels.subarray(a,a+4),b);}},
   getImageData(){return {data:self.pixels.slice(),width:self.width,height:self.height};},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4),width:w,height:h};},putImageData(d){self.pixels.set(d.data);}
  };}}
 class Flow{constructor(){this.width=64;this.height=192;this.pixels=new Uint8ClampedArray(64*192*4);for(let y=0;y<192;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4;this.pixels.set([x<32?132:124,128,255,255],i);}}set src(v){queueMicrotask(()=>this.onload());}}
 const window={CHERRIFT_ANIMATION_FLOW:{},__CHERRIFT_SMOOTH_REFERENCE_CPU__:true},meta={frames:6,offsets:Array.from({length:6},()=>[0,0]),file:'fixture.png'};
 for(let i=0;i<10;i++)window.CHERRIFT_ANIMATION_FLOW[`test${i}/idle/right`]=meta;
 if(walking)window.CHERRIFT_ANIMATION_FLOW['succubus_cherry/walk/right']=meta;
 const context=vm.createContext({window,document:{createElement:()=>new Canvas()},Image:Flow,Uint8ClampedArray,Float32Array,queueMicrotask});if(walking)vm.runInContext(readFileSync('src/cherrift_walk_cycle.js','utf8'),context);vm.runInContext(code,context);
 const make=(c,f)=>c.fillRect(42+f*3,81,12,24);return {api:window.CHERRIFT_ANIMATION_SMOOTHING,make,walk:window.CHERRIFT_WALK_CYCLE};
}
test('motion vectors move a synthetic pose to its exact midpoint instead of ghosting two rectangles',async()=>{
 const {api,make}=fixture(),image={};assert.equal(api.sample(image,'test0','idle','right',.5,make,{loop:true}),null);await Promise.resolve();
 const canvas=api.sample(image,'test0','idle','right',.5,make,{loop:true}),p=canvas.pixels;
 assert.equal(p[(122*256+92)*4+3],0);assert.equal(p[(122*256+93)*4+3],255);assert.equal(p[(122*256+100)*4+3],255);assert.equal(p[(122*256+101)*4+3],0);
 assert.equal(api.stats().backend,'cpu-reference');
});
test('idle loops continuously; attacks clamp at the final pose and do not wrap to the first',async()=>{
 const {api,make}=fixture(),image={};api.sample(image,'test0','idle','right',0,make);await Promise.resolve();
 const a=api.sample(image,'test0','idle','right',5,make).pixels.slice(),b=api.sample(image,'test0','idle','right',50,make).pixels.slice();assert.deepEqual(a,b);
 const c=api.sample(image,'test0','idle','right',6,make,{loop:true}).pixels.slice(),d=api.sample(image,'test0','idle','right',0,make,{loop:true}).pixels.slice();assert.deepEqual(c,d);
});
test('the shared cache is bounded across skins and directions',async()=>{
 const {api,make}=fixture();for(let i=0;i<10;i++){api.sample({},`test${i}`,'idle','right',0,make);await Promise.resolve();}assert.equal(api.stats().cached,api.stats().maxCached);assert.equal(api.stats().maxCached,6);
});
test('the interpolation gutter keeps the existing world pivot and visible character scale',async()=>{
 const {api,make}=fixture(),image={};api.sample(image,'test0','idle','right',0,make);await Promise.resolve();let args;
 api.draw({drawImage(...a){args=a;}},image,'test0','idle','right',.5,{x:400,y:300},110,110,{makeFrame:make,loop:true});
 assert.equal(args[1]+128*args[3]/256,400);assert.ok(Math.abs(args[2]+(64+184*2/3)*args[4]/256-330)<1e-8);
 assert.equal(104*args[4]/256,156*110/192);
});
test('a complete interpolated pose is drawn once; stale lower-body callbacks cannot split it',async()=>{
 const {api,make}=fixture(),image={};api.sample(image,'test0','idle','right',0,make);await Promise.resolve();
 const draws=[];const ctx={drawImage(...args){draws.push(args);},clip(){throw Error('horizontal body cut');}};
 const ok=api.draw(ctx,image,'test0','idle','right',.5,{x:400,y:300},110,110,{
  makeFrame:make,makeLower(){throw Error('stale independent lower body');},cut:150,loop:true
 });
 assert.equal(ok,true);assert.equal(draws.length,1);assert.equal(draws[0][0].width,256);
});
test('the shipped entrypoint loads flow data and smoothing before every renderer and preserves both VFX modules',()=>{
 const html=readFileSync('index.html','utf8'),build=JSON.parse(readFileSync('src/cherrift_manifest.json','utf8')).buildId;
 const scripts=[...html.matchAll(/<script\b[^>]*src=["']([^"']+)["']/g)].map(m=>m[1]);
 const at=name=>scripts.indexOf(`src/cherrift_${name}.js?v=${build}`);
 assert.ok(at('animation_flow')>=0);assert.ok(at('animation_smoothing')>at('animation_flow'));
 assert.ok(at('walk_cycle')>=0&&at('walk_cycle')<at('animation_smoothing'));
 for(const name of ['cherry_motion','base_cherry','archer_chibi','ninja_chibi','succubus_chibi','sakura_dance_chibi'])assert.ok(at(name)>at('animation_smoothing'),name);
 assert.ok(at('base_petal_vfx')>at('base_cherry'));assert.ok(at('succubus_crimson_hunger')>at('succubus_chibi'));
 const versions=[...html.matchAll(/(?:src|href)=["'](?:src|assets)\/[^"']+\?v=([^"']+)/gi)].map(m=>m[1]);assert.deepEqual([...new Set(versions)],[build]);
});
test('all five refreshed skins and all their registered states have motion data; every map exists',()=>{
 const context={window:{}};vm.runInNewContext(readFileSync('src/cherrift_animation_flow.js','utf8'),context);const maps=context.window.CHERRIFT_ANIMATION_FLOW;
 assert.equal(Object.keys(maps).length,175);let pairs=0;
 for(const id of ['cherry_default','archer_cherry','ninja_cherry','succubus_cherry','wuxia_sakura_cherry'])for(const state of ['idle','walk','skill'])for(const dir of ['down','down_right','right','up_right','up'])assert.ok(maps[`${id}/${state}/${dir}`]);
 for(const meta of Object.values(maps)){assert.equal(meta.offsets.length,meta.frames);assert.ok(existsSync('assets/player/animation_flow/'+meta.file));pairs+=meta.frames;}assert.equal(pairs,1060);
});
test('render adapters use the shared fractional sampler and leave gameplay outside the interpolation engine',()=>{
 for(const file of ['base_cherry','archer_chibi','ninja_chibi'])assert.match(readFileSync(`src/cherrift_${file}.js`,'utf8'),/width,height,phase/);
 for(const file of ['sakura_dance_chibi','succubus_chibi'])assert.match(readFileSync(`src/cherrift_${file}.js`,'utf8'),/CHERRIFT_ANIMATION_SMOOTHING/);
 assert.doesNotMatch(code,/damageEnemy|Math\.random|fireTimer\s*=|skillTimer\s*=/);
});

test('a frozen original pose still alternates its two visible boots on the independent gait clock',async()=>{
 const {api,walk}=fixture(true),image={},p=walk.pose('succubus_cherry','walk','right',0,1,0,0);
 const logical=v=>(v-64)*1.5;
 const make=c=>{for(const leg of [p.a,p.b])c.fillRect(logical(leg[2]-2),logical(leg[3]-4),6,6);};
 api.sample(image,'succubus_cherry','walk','right',0,make,{loop:true,gaitPhase:0});await Promise.resolve();
 function feet(phase){const pixels=api.sample(image,'succubus_cherry','walk','right',0,make,{loop:true,gaitPhase:phase}).pixels;const split=(p.a[2]+p.b[2])/2,stats=[[0,0,0],[0,0,0]];
  for(let y=170;y<200;y++)for(let x=85;x<155;x++){const a=pixels[(y*256+x)*4+3],side=x<split?0:1;stats[side][0]+=x*a;stats[side][1]+=y*a;stats[side][2]+=a;}
  return stats.map(s=>{assert.ok(s[2]>0,'each boot stays visible');return [s[0]/s[2],s[1]/s[2]];});
 }
 const first=feet(0),opposite=feet(3),lifted=feet(1.5);
 assert.ok(first[0][0]-opposite[0][0]>6,'first foot swings instead of sliding');
 assert.ok(opposite[1][0]-first[1][0]>6,'second foot swings in the opposite phase');
 assert.ok(lifted[0][1]<first[0][1]-2,'swinging foot lifts from the ground');
});
