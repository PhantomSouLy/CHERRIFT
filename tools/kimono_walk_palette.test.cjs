const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');const root=path.resolve(__dirname,'..');
function fixture(){let created=0;const w={CHERRIFT_WALK_CYCLE:{shader:'vec2 unstep(vec2 p){return p;}',pose(){},displacement(){},inverse(){}},CHERRIFT_SPORT_GAIT:{}};
const c=vm.createContext({window:w,document:{createElement(){created++;return createCanvas(1,1);}}});for(const n of ['data','gait'])vm.runInContext(fs.readFileSync(path.join(root,`src/cherrift_kimono_${n}.js`),'utf8'),c);
const calls=[];w.CHERRIFT_ANIMATION_SMOOTHING={draw(...args){calls.push(args);return true;}};return {w,calls,api:w.CHERRIFT_KIMONO_GAIT,created:()=>created};}
const sheet=(s,d)=>loadImage(path.join(root,`assets/player/cherry_skins/kimono_cherry/sheets192/kimono_cherry_${s}_${d}.png`));
function bytes(im){const c=createCanvas(im.width,im.height),x=c.getContext('2d');x.drawImage(im,0,0);return x.getImageData(0,0,c.width,c.height).data;}
function medians(im){const p=bytes(im),v=[[],[],[]];for(let y=28;y<155;y++)for(let x=0;x<im.width;x++){const i=(y*im.width+x)*4;if(p[i+3]<245)continue;for(let k=0;k<3;k++)v[k].push(p[i+k]);}return v.map(a=>{a.sort((x,y)=>x-y);return a[Math.floor((a.length-1)/2)];});}
test('Walk palette matches Idle while alpha, source pixels and accepted stride order are preserved',async()=>{
const f=fixture(),original=await sheet('walk','right'),before=bytes(original),idle=await sheet('idle','right');for(let i=0;i<600;i++)f.api.draw({assets:{get:()=>original}},{},'walk','right',0,i/100,{x:0,y:0},116,116);
const corrected=f.calls[0][1],after=bytes(corrected);assert.notEqual(corrected,original);assert.equal(f.created(),1);assert.equal(corrected.width,original.width);assert.equal(corrected.height,original.height);
for(let i=3;i<before.length;i+=4)assert.equal(after[i],before[i]);assert.deepEqual(bytes(original),before);assert.deepEqual([...new Set(f.calls.map(c=>c[5]))],[0,1,2,3,5]);for(const call of f.calls)assert.equal(call[1],corrected);
const target=medians(idle),raw=medians(original),fixed=medians(corrected);assert.ok(fixed.every((v,k)=>Math.abs(v-target[k])<=2));assert.ok(fixed.reduce((s,v,k)=>s+Math.abs(v-target[k]),0)<raw.reduce((s,v,k)=>s+Math.abs(v-target[k]),0));
});
test('both directions receive identical palette correction and remain exact mirrors',async()=>{
const f=fixture(),corrected={};for(const d of ['left','right']){const image=await sheet('walk',d);f.api.draw({assets:{get:()=>image}},{},'walk',d,0,0,{x:0,y:0},116,116);corrected[d]=bytes(f.calls.at(-1)[1]);}
for(let frame=0;frame<6;frame++)for(let y=0;y<192;y++)for(let x=0;x<192;x++)for(let k=0;k<4;k++)assert.equal(corrected.left[(y*1152+frame*192+x)*4+k],corrected.right[(y*1152+frame*192+191-x)*4+k]);assert.equal(f.created(),2);
});
test('other states keep raw images and fallback also draws the corrected Walk strip',async()=>{
const f=fixture(),image=await sheet('attack','right');for(const [s,d] of [['walk_attack','right'],['walk_attack','left'],['walk','up_right'],['walk','down']]){f.api.draw({assets:{get:()=>image}},{},s,d,0,0,{x:0,y:0},116,116);assert.equal(f.calls.at(-1)[1],image);}assert.equal(f.created(),0);
let fallback;f.w.CHERRIFT_ANIMATION_SMOOTHING.draw=()=>false;const walk=await sheet('walk','right');f.api.draw({assets:{get:()=>walk}},{drawImage(im){fallback=im;}},'walk','right',0,4.9,{x:0,y:0},116,116);assert.ok(fallback);assert.notEqual(fallback,walk);assert.equal(f.created(),1);
});
