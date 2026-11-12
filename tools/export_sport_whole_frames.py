"""Pack complete authored Sport gait figures; no limb extraction or deformation.
Run: python tools/export_sport_whole_frames.py (Pillow, numpy, scipy).
v2 replaces the wrong rear-diagonal costume and refines the forward-diagonal gait.
Only whole characters are extracted; all other stationary strips stay unchanged.
"""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image,ImageOps,ImageDraw
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'assets/player/cherry_skins/sport_cherry'
STATES=['idle','idle2','walk','attack','walk_attack','skill']
UNIQUE=['down','down_right','right','up_right','up']
DIRS=['down','down_right','right','up_right','up','up_left','left','down_left']
MIRRORS={'left':'right','down_left':'down_right','up_left':'up_right'}
def extract(path,cols=6):
 im=Image.open(path).convert('RGBA'); a=np.array(im); labels,n=ndimage.label(a[:,:,3]>=100)
 counts=np.bincount(labels.ravel()); ids=np.flatnonzero(counts>1500);ids=ids[ids!=0]
 assert len(ids)==cols*2,(path,len(ids))
 figs=[]
 for label in ids:
  yy,xx=np.where(labels==label);box=(max(0,xx.min()-3),max(0,yy.min()-3),min(im.width,xx.max()+4),min(im.height,yy.max()+4))
  x0,y0,x1,y1=map(int,box);cell=a[y0:y1,x0:x1].copy()
  keep=ndimage.binary_dilation(labels[y0:y1,x0:x1]==label,iterations=3);cell[~keep]=0
  f=Image.fromarray(cell);f=f.crop(f.getchannel('A').getbbox());figs.append((float(xx.mean()),float(yy.mean()),f))
 figs.sort(key=lambda v:v[1]);return [v[2] for r in range(2) for v in sorted(figs[r*cols:r*cols+cols],key=lambda v:v[0])]
def ear(frame):
 a=np.array(frame.getchannel('A')); yy,xx=np.where(a>=160);top=int(yy.min());height=int(yy.max()+1-top)
 y,x=np.where(a[top:top+max(1,round(height*.18))]>=160)
 return top,float((np.quantile(x,.03)+np.quantile(x,.97))/2)
def palette(series):
 # Measure original pink material only; no image pixels are modified here.
 values=[]
 for frame in series:
  a=np.array(frame);rgb=a[:,:,:3].astype(float)
  m=(a[:,:,3]>220)&(rgb[:,:,0]-rgb[:,:,1]>40)&(rgb[:,:,1]-rgb[:,:,2]<18)
  m[145:]=False;values.append(rgb[m])
 return np.concatenate(values)
def curves(source,target):
 result=[]
 for c in range(3):
  x=np.quantile(source[:,c],[.02,.1,.25,.5,.75,.9,.98]);y=np.quantile(target[:,c],[.02,.1,.25,.5,.75,.9,.98])
  pts={0:0,255:255}
  for a,b in zip(x,y):pts[round(float(a))]=round(float(b))
  result.append([[a,b] for a,b in sorted(pts.items())])
 return result

def ear_span(f):
 a=np.array(f.getchannel('A'));yy,xx=np.where(a>=160);top=int(yy.min());height=int(yy.max()+1-top)
 y,x=np.where(a[top:top+max(1,round(height*.18))]>=160)
 return float(np.quantile(x,.97)-np.quantile(x,.03))
def pack(figs,target_x,target_top,target_span=None):
 scale=(target_span/float(np.median([ear_span(f) for f in figs]))) if target_span else 156/float(np.median([f.height for f in figs]))
 scale=min(scale,174/max(f.width for f in figs),174/max(f.height for f in figs));result=[]
 for f in figs:
  f=f.resize((round(f.width*scale),round(f.height*scale)),Image.Resampling.LANCZOS)
  top,x=ear(f);px=max(4,min(188-f.width,round(target_x-x)));py=max(4,min(188-f.height,round(target_top-top)))
  out=Image.new('RGBA',(192,192));out.paste(f,(px,py));result.append(out)
 return result

def corrected(d,s):
 return (d in ['up_right','up_left'] and s in ['idle','idle2','attack','skill']) or (d=='up' and s in ['attack','skill'])

def main():
 frames={};geo={s:{} for s in STATES};colors={s:{} for s in STATES};second={s:{} for s in STATES};report=[];sources=[]
 refine=ART/'sources/whole-refine-v2'
 for d in UNIQUE:
  for s in STATES:
   strip=Image.open(ART/'sheets192'/f'sport_cherry_{s}_{d}.png').convert('RGBA')
   frames[d,s]=[strip.crop((i*192,0,(i+1)*192,192)) for i in range(6)]
  strip=Image.open(refine/f'palette_idle_{d}.png').convert('RGBA')
  idle=[strip.crop((i*192,0,(i+1)*192,192)) for i in range(6)]
  target_x=float(np.median([ear(f)[1] for f in idle]));target_top=float(np.median([ear(f)[0] for f in idle]))
  path=ART/'sources/whole-gait-v1'/f'{d}.png'
  figures=pack(extract(path),target_x,target_top)
  for row,s in enumerate(['walk','walk_attack']):frames[d,s]=figures[row*6:row*6+6]
  if d=='down_right':
   target_span=float(np.median([ear_span(f) for f in figures]))
   passing=pack(extract(refine/'down_right_passing.png',2),target_x,target_top,target_span)
   for row,state in enumerate(['walk','walk_attack']):
    contact=frames[d,state];a,b=passing[row*2:row*2+2]
    selected=[contact[0],a,contact[3],contact[3],b,contact[0]]
    grounded=[]
    for f in selected:
     alpha=np.array(f.getchannel('A'));yy,xx=np.where(alpha>=160);dy=184-int(yy.max()+1)
     whole=Image.new('RGBA',(192,192));whole.paste(f,(0,dy));grounded.append(whole)
    frames[d,state]=grounded
  if d=='up_right':
   for filename,names in [('up_right_idle.png',['idle','idle2']),('up_right_cast.png',['attack','skill'])]:
    figures=pack(extract(refine/filename),target_x,target_top)
    for row,s in enumerate(names):frames[d,s]=figures[row*6:row*6+6]
   # Reject one old lifted-foot gesture; select another complete planted pose.
   frames[d,'idle2']=[frames[d,'idle2'][i] for i in [0,1,2,4,5,0]]
  if d=='up':
   figures=pack(extract(refine/'up_cast.png'),target_x,target_top)
   for row,s in enumerate(['attack','skill']):frames[d,s]=figures[row*6:row*6+6]
  for s in STATES:
   if s in ['walk','walk_attack'] or corrected(d,s):colors[s][d]=curves(palette(frames[d,s]),palette(idle))
   if d=='down_right' and s in ['walk','walk_attack']:
    colors[s][d]=curves(palette([frames[d,s][i] for i in [0,2,3,5]]),palette(idle));second[s][d]=curves(palette([frames[d,s][i] for i in [1,4]]),palette(idle))
   geo[s][d]=[]
   for f in frames[d,s]:
    top,x=ear(f);dy=top-target_top;dx=x-target_x
    geo[s][d].append([28,184,96+dx] if d=='down_right' and s in ['walk','walk_attack'] else [28+dy,184+dy,96+dx])
  sources.append({'file':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 # Reject a sliding gait: the opposite half must change the leading contact.
 gait_contacts={}
 for state in ['walk','walk_attack']:
  contacts=[]
  for f in frames['down_right',state]:
   a=np.array(f.getchannel('A'));yy,xx=np.where(a>=160);bottom=int(yy.max())
   y,x=np.where(a[max(0,bottom-7):bottom+1]>=160);contacts.append(float(np.median(x)))
  assert contacts[0]-contacts[2]>4,('No opposite leading foot',state,contacts)
  gait_contacts[state]=contacts
 for d,origin in MIRRORS.items():
  for s in colors:
   if origin in colors[s]:colors[s][d]=colors[s][origin]
   if origin in second[s]:second[s][d]=second[s][origin]
  for s in STATES:
   frames[d,s]=[ImageOps.mirror(f) for f in frames[origin,s]]
   geo[s][d]=[[a,b,192-x] for a,b,x in geo[s][origin]]
 for d in DIRS:
  for s in STATES:
   if s in ['walk','walk_attack'] or corrected(d,s):
    strip=Image.new('RGBA',(1152,192))
    for i,f in enumerate(frames[d,s]):strip.paste(f,(192*i,0))
    strip.save(ART/'sheets192'/f'sport_cherry_{s}_{d}.png',optimize=True)
   for i,f in enumerate(frames[d,s]):
    box=f.getchannel('A').getbbox();assert box and min(box[:2])>0 and max(box[2:])<192,(d,s,i,box)
    report.append({'state':s,'direction':d,'frame':i,'bounds':list(box)})
 (ROOT/'src/cherrift_sport_data.js').write_text('/* Sport v2: registration of complete authored cells only. No flow/leg landmarks. */\nObject.assign(window.CHERRIFT_CHERRY_GEOMETRY ||= {},'+json.dumps({'sport_cherry':geo},separators=(',',':'))+');\nwindow.CHERRIFT_SPORT_PALETTE='+json.dumps(colors,separators=(',',':'))+';\nwindow.CHERRIFT_SPORT_PALETTE_PASSING='+json.dumps(second,separators=(',',':'))+';\n')
 m=json.loads((ART/'manifest.json').read_text());m.update(referenceCommit='831da88dac3eec14eec0da7cf8be40e0b0b0e1b7',wholeGaitSources=sources,wholeRefinements=[{'file':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(refine.glob('*.png'))],renderer='complete-pose-distance-clock-v1')
 for s,v in m['states'].items():
  v['runtimeDuration']=6/8 if s in ['walk','walk_attack'] else v['duration'];v['loop']=s in ['idle','walk','walk_attack']
 m['notes']=['v2 corrects Sport crop top/shorts and sleeveless arms in up-left/up-right Idle/Idle2/Attack/Skill and up Attack/Skill; other standing strips retained.','Complete authored Walk/WalkAttack poses replace old idle/attack aliases and inverse-warp gait.','Down-diagonal loops use original complete alternating contacts and new complete low passing poses, with whole-character sole alignment; no limb edits or warping. Walking follows actual travel independently of projectile timing.','Left directions mirror complete right figures. Registration only translates/scales the full cell.','Existing defensive passive, Common Shield and Sport VFX retained.']
 (ART/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
 (ART/'validation.json').write_text(json.dumps({'states':6,'directions':8,'frames':288,'sheets':48,'forwardDiagonalContacts':gait_contacts,'flowTexturesRequired':0,'empty':[],'clipped':[],'framesChecked':report},indent=2)+'\n')
 print(json.dumps({'frames':len(report),'sheets':48,'gaitFigures':60,'correctedCostumeFigures':36,'clipped':0}))
if __name__=='__main__':main()
