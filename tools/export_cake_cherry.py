"""Deterministic export of complete imagegen Cake Delivery poses; no limb masks or runtime recoloring."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
from scipy import ndimage
import numpy as np,json,hashlib,cv2,subprocess
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'assets/player/cherry_skins/cake_deliver_cherry'
STATES=['idle','idle2','walk','attack','walk_attack','skill'];ORIGINAL=['down','down_right','right','up_right','up']
MIRRORS={'left':'right','down_left':'down_right','up_left':'up_right'};DIRS=['down','down_right','right','up_right','up','up_left','left','down_left']
FPS=dict(idle=3,idle2=3,walk=8,attack=18,walk_attack=8,skill=16)
def figures(atlas):
 a=np.array(atlas);labels,n=ndimage.label(a[:,:,3]>=100);counts=np.bincount(labels.ravel());ids=np.flatnonzero(counts>=1200);ids=ids[ids!=0];assert len(ids)==36,('figure count',len(ids));items=[]
 for label in ids:
  yy,xx=np.where(labels==label);x0,y0=max(0,int(xx.min())-3),max(0,int(yy.min())-3);x1,y1=min(atlas.width,int(xx.max())+4),min(atlas.height,int(yy.max())+4)
  assert xx.min()>0 and yy.min()>0 and xx.max()<atlas.width-1 and yy.max()<atlas.height-1
  p=a[y0:y1,x0:x1].copy();mask=ndimage.binary_dilation(labels[y0:y1,x0:x1]==label,iterations=2);p[~mask]=0;im=Image.fromarray(p);im=im.crop(im.getchannel('A').getbbox());items.append((float(xx.mean()),float(yy.mean()),im))
 items.sort(key=lambda v:v[1]);ordered=[]
 for row in range(6):ordered.extend(sorted(items[row*6:row*6+6],key=lambda v:v[0]))
 return [v[2] for v in ordered]
def padded(im):
 p=Image.new('RGBA',(256,256));p.paste(im.resize((128,128),Image.Resampling.LANCZOS),(64,64));return np.array(p)
def gray(im):
 p=padded(im);return np.uint8(np.clip(cv2.cvtColor(p[:,:,:3],cv2.COLOR_RGB2GRAY).astype(float)*p[:,:,3]/255,0,255))
def flow_texture(series,loop):
 tiles=[]
 for i in range(6):
  a,b=gray(series[i]),gray(series[(i+1)%6 if loop else min(5,i+1)]);halves=[]
  for first,second in [(a,b),(b,a)]:
   v=cv2.calcOpticalFlowFarneback(first,second,None,.5,4,25,5,7,1.5,0);v=cv2.resize(v,(32,32),interpolation=cv2.INTER_AREA);p=np.zeros((32,32,4),np.uint8);p[:,:,:2]=np.clip(np.rint(v*2+128),0,255);p[:,:,2]=128;p[:,:,3]=255;halves.append(p)
  tiles.append(np.concatenate(halves,axis=1))
 return Image.fromarray(np.concatenate(tiles,axis=0))
def main():
 frames={};meta={};sources=[]
 for d in ORIGINAL:
  path=ART/'sources'/f'{d}.png';poses=figures(Image.open(path).convert('RGBA'));scale=min(156/max(p.height for p in poses),170/max(p.width for p in poses));sources.append(dict(file=str(path.relative_to(ROOT)),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
  for row,s in enumerate(STATES):
   frames[d,s]=[]
   for p in poses[row*6:row*6+6]:
    a=np.array(p.getchannel('A'));yy,xx=np.where(a[:max(4,int(p.height*.22))]>=160);anchor=(float(xx.min())+float(xx.max())+1)/2
    small=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.LANCZOS);x=round(96-anchor*scale);assert x>=4 and x+small.width<=188 and 28+small.height<=188
    out=Image.new('RGBA',(192,192));out.paste(small,(x,28));frames[d,s].append(out)
 # Stage canonical full poses for the deterministic walking mesh assembly.
 (ART/'sheets192').mkdir(exist_ok=True)
 for d in ORIGINAL:
  for state in STATES:
   strip=Image.new('RGBA',(1152,192))
   for i,p in enumerate(frames[d,state]):strip.paste(p,(i*192,0))
   strip.save(ART/'sheets192'/f'cake_deliver_cherry_{state}_{d}.png')
 subprocess.run(['node',str(ROOT/'tools/assemble_cake_walk.cjs')],check=True)
 for d in ORIGINAL:
  for state in ['walk','walk_attack']:
   strip=Image.open(ART/'sheets192'/f'cake_deliver_cherry_{state}_{d}.png').convert('RGBA')
   frames[d,state]=[strip.crop((i*192,0,(i+1)*192,192)) for i in range(6)]
 for d,source in MIRRORS.items():
  for s in STATES:frames[d,s]=[ImageOps.mirror(p) for p in frames[source,s]]
 (ART/'sheets192').mkdir(exist_ok=True);flowdir=ROOT/'assets/player/animation_flow';flowdir.mkdir(parents=True,exist_ok=True);geometry={}
 for s in STATES:
  geometry[s]={}
  for d in DIRS:
   strip=Image.new('RGBA',(1152,192));geometry[s][d]=[]
   for i,p in enumerate(frames[d,s]):
    strip.paste(p,(i*192,0));dest=ART/'frames256'/d/s/f'{i:03}.png';dest.parent.mkdir(parents=True,exist_ok=True);p.resize((256,256),Image.Resampling.LANCZOS).save(dest)
    a=np.array(p.getchannel('A'));yy,xx=np.where(a>=160);fy,fx=np.where(a[max(0,yy.max()-11):yy.max()+1]>=160);geometry[s][d].append([int(yy.min()),int(yy.max()+1),float(np.median(fx))+.5]);box=p.getchannel('A').getbbox();assert box and min(box[:2])>0 and box[2]<192 and box[3]<192
   strip.save(ART/'sheets192'/f'cake_deliver_cherry_{s}_{d}.png')
  for d in ORIGINAL:
   name=f'cake_deliver_cherry__{s}__{d}__cake2.png';flow=flow_texture(frames[d,s],s in ['idle','walk','walk_attack'])
   if s in ['walk','walk_attack']:
    a=np.array(flow);ref=np.array(flow_texture(frames[d,'idle' if s=='walk' else 'walk'],True))
    for i in range(6):
     if s=='walk':a[i*32:i*32+20]=ref[i*32:i*32+20]
     else:a[i*32+20:i*32+32]=ref[i*32+20:i*32+32]
    flow=Image.fromarray(a)
   flow.save(flowdir/name);meta[f'cake_deliver_cherry/{s}/{d}']=dict(frames=6,offsets=[[0,0]]*6,file=name)
 (ROOT/'src/cherrift_cake_data.js').write_text('/* Whole authored Cake Delivery poses. */\nObject.assign(window.CHERRIFT_ANIMATION_FLOW ||= {},'+json.dumps(meta,separators=(',',':'))+');\nObject.assign(window.CHERRIFT_CHERRY_GEOMETRY ||= {},'+json.dumps({'cake_deliver_cherry':geometry},separators=(',',':'))+');\n')
 manifest=dict(id='cake_deliver_cherry',buildId='1109-cake2',frameSize=192,pivot=[96,184],individualFrameSize=256,directions=DIRS,mirrors=MIRRORS,states={s:dict(frames=6,fps=FPS[s],duration=6/FPS[s],sheets={d:f'sheets192/cake_deliver_cherry_{s}_{d}.png' for d in DIRS}) for s in STATES},sources=sources,passive=dict(attackBonus=.01,hpBonus=.01),skill=dict(type='common_pink_burst',speedBonus=.05,speedSeconds=1,visual='existing shared Hybrid Pink Burst'),notes=['Imagegen source poses; natural short-step lower-body mesh; Walk upper body equals Idle exactly.','All left directions mirror right frames.','Walk and WalkAttack use the same phase and leg pixels; no runtime recoloring or gait restart.'])
 (ART/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');board=Image.new('RGB',(1536,1296),'#242338');draw=ImageDraw.Draw(board)
 for row,s in enumerate(STATES):
  for col,d in enumerate(DIRS):draw.text((col*192+6,row*216+6),f'{d} / {s}',fill='white');p=frames[d,s][2];board.paste(p,(col*192,row*216+24),p)
 board.save(ART/'source-poses.jpg',quality=94);report=dict(directions=8,states=6,frames=288,sheets=48,flowTextures=30,empty=[],clipped=[]);(ART/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
if __name__=='__main__':main()
