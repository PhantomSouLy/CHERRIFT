"""Pack three complete replacement gait poses and their whole-image mirrors.
Run after v4. Original frames 0..2 and all other strips are retained.
Requires Pillow, numpy and scipy. No body-part composition or pixel recoloring.
"""
from pathlib import Path
from PIL import Image,ImageFilter,ImageChops,ImageOps
from scipy import ndimage
import numpy as np,json
r=Path(__file__).resolve().parents[1]
src=r/'assets/player/cherry_skins/base_cherry/sources/whole-steps-v6'
art=r/'assets/player/cherry_skins/base_cherry/sheets192'
def figures(p):
 im=Image.open(p).convert('RGBA');a=np.array(im.getchannel('A'));lab,_=ndimage.label(a>=160);counts=np.bincount(lab.ravel());parts=[]
 for n in [int(i) for i in np.flatnonzero(counts>=10000) if i]:
  y,x=np.where(lab==n);box=(int(x.min())-4,int(y.min())-4,int(x.max())+5,int(y.max())+5);assert min(box[:2])>0 and box[2]<im.width and box[3]<im.height;cut=im.crop(box);mask=Image.fromarray(np.uint8(lab[box[1]:box[3],box[0]:box[2]]==n)*255).filter(ImageFilter.MaxFilter(9));cut.putalpha(ImageChops.multiply(cut.getchannel('A'),mask));parts.append((x.mean(),cut))
 parts.sort(key=lambda p:p[0]);assert len(parts)==3;return [p[1] for p in parts]
a=figures(src/'opposite.png');b=figures(src/'passing.png');poses=[a[0],a[1],b[2]];heights=[]
for im in poses:
 y,x=np.where(np.array(im.getchannel('A'))>=160);heights.append(int(y.max()-y.min()+1))
scale=min(156/float(np.median(heights[:2])),160/max(heights[:2]));p=r/'src/cherrift_cherry_geometry.js';g=json.loads((src/'baseline-geometry.txt').read_text().split('window.CHERRIFT_CHERRY_GEOMETRY = ',1)[1].rstrip().rstrip(';'));coords=[];frames=[]
for idx,im in enumerate(poses):
 frame_scale=scale if idx<2 else 156/heights[2]
 ar=np.array(im.getchannel('A'));y,x=np.where(ar>=160);top=int(y.min());bottom=int(y.max()+1);yy,xx=np.where(ar[top:round(top+(bottom-top)*.22)]>=160);ear=(xx.min()+xx.max()+1)/2
 q=im.resize((round(im.width*frame_scale),round(im.height*frame_scale)),Image.Resampling.LANCZOS);qx=round(96-ear*frame_scale);qy=round(28-top*frame_scale);bb=q.getchannel('A').point(lambda x:255 if x>=8 else 0).getbbox();dx=max(0,2-(qx+bb[0]));dx-=max(0,qx+dx+bb[2]-190);dy=max(0,2-(qy+bb[1]));dy-=max(0,qy+dy+bb[3]-190);out=Image.new('RGBA',(192,192));out.paste(q,(qx+dx,qy+dy));frames.append(out);coords.append([28+dy,184+dy,81.5+dx])
for d in ['down_right','down_left']:
 strip=Image.open(src/f'baseline-{d}.png').convert('RGBA')
 for j,frame in enumerate(frames):
  f=j+3;pose=frame if d=='down_right' else ImageChops.offset(ImageOps.mirror(frame),1,0);strip.paste(pose,(f*192,0));g['cherry_default']['walk'][d][f]=coords[j] if d=='down_right' else [coords[j][0],coords[j][1],192-coords[j][2]]
 strip.save(art/f'base_cherry_walk_{d}.png')
p.write_text('/* Whole-pose Base walk corrections; fixed Idle-matched ear registration. */\nwindow.CHERRIFT_CHERRY_GEOMETRY = '+json.dumps(g,separators=(',',':'))+';\n')
print('Packed only Walk frames 3,4,5 in down_right/down_left.')
