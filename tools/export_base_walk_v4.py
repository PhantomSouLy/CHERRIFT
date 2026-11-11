"""Pack complete corrected Walk poses only; no limb composition or recoloring.
Run after the v2 export if rebuilding all Base assets. Pillow/numpy/scipy needed.
"""
from pathlib import Path
from PIL import Image,ImageFilter,ImageChops,ImageOps,ImageDraw
from scipy import ndimage
import numpy as np,json
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'assets/player/cherry_skins/base_cherry'
SOURCE=ART/'sources/whole-walk-v4'
TARGET_EARS={'down_right':110.5}
MIRRORS={'right':'left','down_right':'down_left'}
geo_file=ROOT/'src/cherrift_cherry_geometry.js';text=geo_file.read_text();geo=json.loads(text.split('window.CHERRIFT_CHERRY_GEOMETRY = ',1)[1].rstrip().rstrip(';'))
report={'source':'complete imagegen figures','bodyPartComposition':False,'recoloredPixels':False,'states':['walk'],'directions':{},'frames':12}
board=Image.new('RGB',(1152,448),'#242236');draw=ImageDraw.Draw(board)
def complete_poses(atlas):
 a=np.array(atlas.getchannel('A'));labels,_=ndimage.label(a>=160);sizes=np.bincount(labels.ravel());ids=[int(i) for i in np.flatnonzero(sizes>=3000) if i];assert len(ids)==6
 parts=[]
 for label in ids:
  yy,xx=np.where(labels==label);assert min(xx.min(),yy.min())>0 and xx.max()<atlas.width-1 and yy.max()<atlas.height-1,'clipped complete source'
  box=(max(0,int(xx.min())-4),max(0,int(yy.min())-4),min(atlas.width,int(xx.max())+5),min(atlas.height,int(yy.max())+5));im=atlas.crop(box);mask=Image.fromarray(np.uint8(labels[box[1]:box[3],box[0]:box[2]]==label)*255).filter(ImageFilter.MaxFilter(9));im.putalpha(ImageChops.multiply(im.getchannel('A'),mask));parts.append((float(yy.mean()),float(xx.mean()),im))
 parts.sort(key=lambda p:p[0]);ordered=[]
 for r in range(2):ordered+=sorted(parts[r*3:r*3+3],key=lambda p:p[1])
 return ordered
for row,d in enumerate(TARGET_EARS):
 atlas=Image.open(SOURCE/f'{d}.png').convert('RGBA');a=np.array(atlas.getchannel('A'));labels,_=ndimage.label(a>=160);sizes=np.bincount(labels.ravel());ids=[int(i) for i in np.flatnonzero(sizes>=3000) if i];assert len(ids)==6,(d,len(ids))
 ordered=complete_poses(atlas)
 if d=='right':
  passing=complete_poses(Image.open(SOURCE/'right-passing.png').convert('RGBA'))
  for i in [1,4]:ordered[i]=passing[i]
  report['rightPassingFrames']={'frames':[1,4],'source':'right-passing.png','selection':'complete original figure; no leg compositing'}
 heights=[]
 for _,_,im in ordered:
  yy,xx=np.where(np.array(im.getchannel('A'))>=160);heights.append(int(yy.max()-yy.min()+1))
 scale=min(156/float(np.median(heights)),160/max(heights));frames=[];coords=[]
 for f,(_,_,im) in enumerate(ordered):
  a=np.array(im.getchannel('A'));yy,xx=np.where(a>=160);top=int(yy.min());bottom=int(yy.max()+1);y,x=np.where(a[top:round(top+(bottom-top)*.22)]>=160);ear=(x.min()+x.max()+1)/2
  q=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS);qx=round(96-ear*scale);qy=round(28-top*scale);b=q.getchannel('A').point(lambda a:255 if a>=8 else 0).getbbox()
  dx=max(0,2-(qx+b[0]));dx-=max(0,qx+dx+b[2]-190);dy=max(0,2-(qy+b[1]));dy-=max(0,qy+dy+b[3]-190)
  out=Image.new('RGBA',(192,192));out.paste(q,(qx+dx,qy+dy));bb=out.getchannel('A').point(lambda a:255 if a>=8 else 0).getbbox();assert bb and min(bb[:2])>=2 and max(bb[2:])<=190,(d,f,bb)
  frames.append(out);coords.append([28+dy,184+dy,round(192-TARGET_EARS[d]+dx,3)])
 for direction,poses,registration in [(d,frames,coords),(MIRRORS[d],[ImageChops.offset(ImageOps.mirror(im),1,0) for im in frames],[[a,b,192-c] for a,b,c in coords])]:
  strip=Image.new('RGBA',(1152,192))
  for f,im in enumerate(poses):strip.paste(im,(f*192,0))
  strip.save(ART/'sheets192'/f'base_cherry_walk_{direction}.png');geo['cherry_default']['walk'][direction]=registration
  report['directions'][direction]={'uniformScale':scale,'registration':registration,'frames':6}
 y=row*224;draw.text((6,y+4),d+' / walk',fill='white');im=Image.open(ART/'sheets192'/f'base_cherry_walk_{d}.png');board.paste(im,(0,y+24),im)
geo_file.write_text('/* Whole-pose Base walk corrections; fixed Idle-matched ear registration. */\nwindow.CHERRIFT_CHERRY_GEOMETRY = '+json.dumps(geo,separators=(',',':'))+';\n')
(SOURCE/'export-report.json').write_text(json.dumps(report,indent=2)+'\n');board.save(SOURCE/'contact.png');print('Packed 2 Walk strips / 12 complete frames; other states untouched.')
