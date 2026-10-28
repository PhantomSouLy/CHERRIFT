import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
for(const [file,api] of [['sakura_dance_gait','CHERRIFT_SAKURA_DANCE_GAIT'],['succubus_gait','CHERRIFT_SUCCUBUS_GAIT']])test(`${file}: mirrored artwork restores its transform before leg masking`,()=>{
 const masks=[];const document={createElement(){const canvas={width:192,height:192};let matrix=[1,1,0,0],stack=[];const ctx={globalCompositeOperation:'source-over',
  save(){stack.push({matrix:[...matrix],composite:this.globalCompositeOperation});},restore(){const s=stack.pop();matrix=s.matrix;this.globalCompositeOperation=s.composite;},translate(x,y){matrix[2]+=x;matrix[3]+=y;},scale(x,y){matrix[0]*=x;matrix[1]*=y;},rotate(){},
  beginPath(){},rect(){},clip(){},moveTo(){},lineTo(){},closePath(){},stroke(){},clearRect(){},drawImage(){},getImageData(){return {data:new Uint8ClampedArray(192*192*4)};},putImageData(){},fill(){if(this.globalCompositeOperation==='destination-out')masks.push([...matrix]);}};canvas.getContext=()=>ctx;return canvas;}};
 const window={};vm.runInNewContext(readFileSync(`src/cherrift_${file}.js`,'utf8'),{window,document});
 for(const dir of ['left','up_left','down_left'])window[api].get({}, {},'walk',dir,0,2.35);
 assert.ok(masks.length>=3);for(const matrix of masks)assert.deepEqual(matrix,[1,1,0,0]);
});
