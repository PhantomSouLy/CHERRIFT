"""Pack complete imagegen poses; no limb extraction, composition, warp or recolor.
Run from repository root. Requires Pillow, numpy and scipy.
"""
from pathlib import Path
from PIL import Image,ImageFilter,ImageChops,ImageOps,ImageDraw
from scipy import ndimage
import numpy as np
import json
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'assets/player/cherry_skins/base_cherry'
SOURCES=ART/'sources/whole-gait-v2'
# Registration is measured against the untouched Idle image rendered in game.
TARGET_EARS={'right':100.5,'down_right':110.5,'up_right':97.0}
MIRRORS={'right':'left','down_right':'down_left','up_right':'up_left'}
report={'method':'complete authored poses, uniform directional scale, ear/root registration','limbComposition':False,'recoloredPixels':False,'sheets':{},'sourceSubstitutions':[]}
geo_file=ROOT/'src/cherrift_cherry_geometry.js';text=geo_file.read_text();geometry=json.loads(text.split('window.CHERRIFT_CHERRY_GEOMETRY = ',1)[1].rstrip().rstrip(';'))
board=Image.new('RGB',(1152,1344),'#242236');draw=ImageDraw.Draw(board)
for direction in TARGET_EARS:
 atlas=Image.open(SOURCES/f'{direction}.png').convert('RGBA');aa=np.array(atlas.getchannel('A'));labs,_=ndimage.label(aa>=160);counts=np.bincount(labs.ravel());ids=[int(i) for i in np.flatnonzero(counts>=3000) if i];assert len(ids)==12,(direction,len(ids))
 items=[]
 for label in ids:
  yy,xx=np.where(labs==label);core=(int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1));clipped=min(core[:2])==0 or core[2]==atlas.width or core[3]==atlas.height
  box=(max(0,core[0]-4),max(0,core[1]-4),min(atlas.width,core[2]+4),min(atlas.height,core[3]+4));im=atlas.crop(box);mask=Image.fromarray(np.uint8(labs[box[1]:box[3],box[0]:box[2]]==label)*255).filter(ImageFilter.MaxFilter(9));im.putalpha(ImageChops.multiply(im.getchannel('A'),mask));items.append((float(yy.mean()),float(xx.mean()),im,clipped))
 items.sort(key=lambda p:p[0]);ordered=[]
 for row in range(4):ordered+=sorted(items[row*3:row*3+3],key=lambda p:p[1])
 for i,p in enumerate(ordered):
  if p[3]:
   # A complete contact pose from the same half-cycle replaces an edge-clipped
   # rejected candidate. Never reconstruct hair or attach a different limb.
   row=i//3;valid=[j for j in range(row*3,row*3+3) if not ordered[j][3]];assert valid,(direction,row)
   replacement=valid[-1];ordered[i]=ordered[replacement];report['sourceSubstitutions'].append({'direction':direction,'cell':i,'completeCellUsed':replacement})
 heights=[]
 for _,_,im,_ in ordered:
  yy,xx=np.where(np.array(im.getchannel('A'))>=160);heights.append(int(yy.max()-yy.min()+1))
 scale=min(156/float(np.median(heights[:6])),160/max(heights))
 complete=[]; registrations=[]
 for i,(_,_,im,_) in enumerate(ordered):
  original=np.array(im.getchannel('A'));yy,xx=np.where(original>=160);top=int(yy.min());bottom=int(yy.max()+1);band=original[top:round(top+(bottom-top)*.22)]>=160;ey,ex=np.where(band);ear=(ex.min()+ex.max()+1)/2
  q=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS);qx=round(96-ear*scale);qy=round(28-top*scale)
  alpha=np.array(q.getchannel('A'));yy,xx=np.where(alpha>=160);assert qx+xx.min()>1 and qx+xx.max()<190 and qy+yy.min()>1 and qy+yy.max()<190,(direction,i,'unsafe full figure',qx,qy)
  full=q.getchannel('A').point(lambda a:255 if a>=8 else 0).getbbox();dx=max(0,2-(qx+full[0]));dx-=max(0,qx+dx+full[2]-190);dy=max(0,2-(qy+full[1]));dy-=max(0,qy+dy+full[3]-190);out=Image.new('RGBA',(192,192));out.paste(q,(qx+dx,qy+dy));complete.append(out);registrations.append([28+dy,184+dy,round(192-TARGET_EARS[direction]+dx,3)])
 for state,row in [('walk',0),('walk_attack',2)]:
  series=complete[row*3:row*3+6];reg=registrations[row*3:row*3+6];anchor=round(192-TARGET_EARS[direction],3)
  for d,poses,ax,coords in [(direction,series,anchor,reg),(MIRRORS[direction],[ImageChops.offset(ImageOps.mirror(p),1,0) for p in series],192-anchor,[[a,b,192-c] for a,b,c in reg])]:
   strip=Image.new('RGBA',(1152,192))
   for f,im in enumerate(poses):strip.paste(im,(f*192,0))
   filename=f'base_cherry_{state}_{d}.png';strip.save(ART/'sheets192'/filename);geometry['cherry_default'][state][d]=coords
   report['sheets'][state+'/'+d]={'frames':6,'directionalScale':scale,'anchor':[ax,184],'earTargetX':192-TARGET_EARS[direction] if d!=direction else TARGET_EARS[direction]}
  y=(list(TARGET_EARS).index(direction)*2+(state=='walk_attack'))*224;draw.text((6,y+4),direction+' / '+state,fill='white');strip=Image.open(ART/'sheets192'/f'base_cherry_{state}_{direction}.png');board.paste(strip,(0,y+24),strip)
geo_file.write_text('/* Whole-pose Base gait: fixed Idle-matched ear/root registration; other skins preserved. */\nwindow.CHERRIFT_CHERRY_GEOMETRY = '+json.dumps(geometry,separators=(',',':'))+';\n')
(SOURCES/'export-report.json').write_text(json.dumps(report,indent=2)+'\n')
if __name__=='__main__':
 board.save(SOURCES/'contact.png');print(json.dumps({'sheets':len(report['sheets']),'completePoses':72,'substitutions':report['sourceSubstitutions']}))
