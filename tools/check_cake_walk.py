"""Asset contracts: shared walking legs, exact Idle color reuse and complete figures."""
from pathlib import Path
from PIL import Image,ImageOps
from scipy import ndimage
import numpy as np,json
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'assets/player/cherry_skins/cake_deliver_cherry'
DIRS=['down','down_right','right','up_right','up','up_left','left','down_left'];STATES=['idle','idle2','walk','attack','walk_attack','skill'];MIRRORS={'left':'right','down_left':'down_right','up_left':'up_right'}
def frame(d,s,i):return Image.open(ART/'sheets192'/f'cake_deliver_cherry_{s}_{d}.png').convert('RGBA').crop((i*192,0,(i+1)*192,192))
report=dict(frames=0,sheets=48,empty=[],clipped=[],exactIdleWalkUpperBodies=0,exactWalkAttackLegPairs=0,mirrorPairs=0,calfChangedPixels={},sideGroundContactErrors={},interiorMedianAlpha={})
for d in DIRS:
 for s in STATES:
  for i in range(6):
   im=frame(d,s,i);box=im.getchannel('A').getbbox();assert box and min(box[:2])>0 and box[2]<192 and box[3]<192,(d,s,i,box);report['frames']+=1
   if d in MIRRORS:assert im.tobytes()==ImageOps.mirror(frame(MIRRORS[d],s,i)).tobytes();report['mirrorPairs']+=1
 for i in range(6):
  a=np.array(frame(d,'idle',i));b=np.array(frame(d,'walk',i));c=np.array(frame(d,'walk_attack',i))
  assert np.array_equal(a[:148],b[:148]),(d,i,'Idle color/outline changed');report['exactIdleWalkUpperBodies']+=1
  assert np.array_equal(b[148:],c[148:]),(d,i,'WalkAttack changed legs');report['exactWalkAttackLegPairs']+=1
  assert np.array_equal(a[148:152],b[148:152]),(d,i,'hip seam')
  if i in [1,4]:
   n=int(np.count_nonzero(np.any(a[155:170]!=b[155:170],axis=2)));assert n>5,(d,i,'only the sole moves');report['calfChangedPixels'][f'{d}/{i}']=n
 a=np.array(frame(d,'idle',0));core=ndimage.binary_erosion(a[:,:,3]>160,iterations=2);median=float(np.median(a[:,:,3][core]));assert median>=240,(d,median);report['interiorMedianAlpha'][d]=median
for d in ['right','left']:
 errors=[]
 for i in range(6):
  a=np.array(frame(d,'idle',0));b=np.array(frame(d,'walk',i));ya,xa=np.where(a[170:190,:,3]>160);yb,xb=np.where(b[170:190,:,3]>160);error=int(yb.max()-ya.max());assert abs(error)<=1,(d,i,error);errors.append(error)
 report['sideGroundContactErrors'][d]=errors
rigs=json.loads((ART/'walk-appearance.json').read_text())
report['forwardWorldContactDrift']={}
for d,rig in rigs.items():
 assert rig['source']=='original-idle-frame-0' and not rig['sourceRGBModified']
 assert rig['footRotationDegrees']==0 and rig['stridePixels']<=2.5 and rig['liftPixels']<=2
 phases=rig['phases'];near=[p['near'] for p in phases];far=[p['far'] for p in phases]
 assert near[0]['advance']<near[1]['advance']<near[2]['advance']<near[3]['advance']
 assert far[3]['advance']<far[4]['advance']<far[5]['advance']<far[0]['advance']
 assert all(abs(a['lift'])<1e-6 or abs(b['lift'])<1e-6 for a,b in zip(near,far))
 drift=[]
 for name,indices in [('near',[3,4,5]),('far',[0,1,2])]:
  world=[i/6*4*rig['stridePixels']+phases[i][name]['advance'] for i in indices]
  drift.append(max(world)-min(world))
 assert max(drift)<1e-8,(d,drift);report['forwardWorldContactDrift'][d]=max(drift)
report['sideHeelToForefootHeightDifference']={}
for i in range(6):
 p=rigs['right']['phases'][i];which='near' if not p['near']['swing'] else 'far';offset=(0 if which=='near' else 2)+p[which]['advance'];a=np.array(frame('right','walk',i));heights=[]
 for lo,hi in [(90,94),(100,104)]:
  y,x=np.where(a[172:185,int(round(lo+offset)):int(round(hi+offset)),3]>160);assert len(y);heights.append(int(y.max()+172))
 assert abs(heights[0]-heights[1])<=1,(i,heights)
 report['sideHeelToForefootHeightDifference'][str(i)]=heights[1]-heights[0]
report['detachedWalkComponents']=[]
for d in DIRS:
 for state in ['walk','walk_attack']:
  for i in range(6):
   a=np.array(frame(d,state,i));labels,n=ndimage.label(a[:,:,3]>100);counts=np.bincount(labels.ravel());main=int(np.argmax(counts[1:])+1)
   for label in range(1,n+1):
    if label==main or counts[label]<4:continue
    ys,xs=np.where(labels==label)
    if ys.min()>=148:report['detachedWalkComponents'].append([d,state,i,int(counts[label])])
assert not report['detachedWalkComponents'],report['detachedWalkComponents']
report['forwardSwingAndGroundedStance']=True
print(json.dumps(report,indent=2))
