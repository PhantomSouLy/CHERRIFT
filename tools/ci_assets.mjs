// Basic binary integrity beyond header-only auditing; no image dependencies needed.
import {readFileSync,existsSync} from 'node:fs';
import {crc32,inflateSync,gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const plan=JSON.parse(process.env.CI_PLAN||'null');
if(!plan)throw new Error('Missing CI plan');
const paths=JSON.parse(gunzipSync(Buffer.from(plan.paths,'base64')).toString('utf8'));
let count=0;
for(const path of paths.filter(p=>/^assets\/.*\.(png|webp|jpe?g|gif)$/i.test(p))) {
  // Deleted images are checked through the full reference/content/smoke suites.
  if(!existsSync(path))continue;
  const data=readFileSync(path); count++;
  try {
    if(/\.png$/i.test(path)) {
      assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
      let offset=8,ended=false;const compressed=[];
      while(offset+12<=data.length) {
        const size=data.readUInt32BE(offset),end=offset+12+size;
        assert(end<=data.length,'truncated PNG chunk');
        const type=data.toString('ascii',offset+4,offset+8);
        assert.equal(crc32(data.subarray(offset+4,end-4)),data.readUInt32BE(end-4),`PNG ${type} checksum`);
        if(type==='IDAT')compressed.push(data.subarray(offset+8,end-4));
        offset=end;
        if(type==='IEND'){ended=true;break;}
      }
      assert(ended && compressed.length,'missing PNG image/end chunk');
      assert(inflateSync(Buffer.concat(compressed),{maxOutputLength:512*1024*1024}).length>0,'empty PNG pixels');
    } else if(/\.webp$/i.test(path)) {
      assert.equal(data.toString('ascii',0,4),'RIFF');
      assert.equal(data.toString('ascii',8,12),'WEBP');
      assert.equal(data.readUInt32LE(4)+8,data.length,'truncated WebP container');
    } else if(/\.jpe?g$/i.test(path)) {
      assert.equal(data.readUInt16BE(0),0xffd8);
      assert(data.lastIndexOf(Buffer.from([0xff,0xd9]))>=2,'missing JPEG end marker');
    } else {
      assert(['GIF87a','GIF89a'].includes(data.toString('ascii',0,6)));
      assert.equal(data[data.length-1],0x3b,'missing GIF trailer');
    }
  } catch(error) {throw new Error(`${path}: ${error.message}`);}
}
console.log(`[ci] Basic integrity checked for ${count} images (PNG checksums and compressed pixels included).`);
