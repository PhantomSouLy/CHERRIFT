"""Export complete Sport poses and matching full-pose motion vectors. No limb masks or copied legs.
Requires Pillow, numpy, scipy and opencv-python-headless.
Run from any directory: python tools/export_sport_cherry.py
The source PNGs are preserved. Left views mirror the matching right view.
"""
from pathlib import Path
import json
import hashlib
import cv2
import numpy as np
from PIL import Image, ImageOps, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/player/cherry_skins/sport_cherry'
STATES = ['idle', 'idle2', 'walk', 'attack', 'walk_attack', 'skill']
ORIGINAL = ['down', 'down_right', 'right', 'up_right', 'up']
MIRRORS = {'left':'right', 'down_left':'down_right', 'up_left':'up_right'}
DIRS = ['down', 'down_right', 'right', 'up_right', 'up', 'up_left', 'left', 'down_left']
FPS = dict(idle=3, idle2=3, walk=8, attack=18, walk_attack=8, skill=16)

def clean(cell):
    """Retain the complete character and its soft edge; discard isolated debris."""
    a = np.asarray(cell.getchannel('A'))
    labels, n = ndimage.label(a >= 64)
    counts = np.bincount(labels.ravel()); counts[0] = 0
    assert n and counts.max() > 1000, 'Empty or malformed atlas cell'
    core = labels == counts.argmax()
    # Ears/hands remain connected to the character. This is an export mask,
    # not replacement art or a colour-key background removal.
    mask = ndimage.binary_dilation(core, iterations=2)
    rgba = np.array(cell); rgba[~mask] = 0
    result = Image.fromarray(rgba)
    return result.crop(result.getchannel('A').getbbox())

def place(cell):
    h = 156
    scale = min(h / cell.height, 176 / cell.width)
    small = cell.resize((round(cell.width*scale),round(cell.height*scale)), Image.Resampling.LANCZOS)
    a = np.asarray(small.getchannel('A'))
    ys, xs = np.where(a[-12:] >= 96)
    foot = float(np.median(xs)) if len(xs) else small.width/2
    x = max(6,min(186-small.width,round(96-foot))); y = 184-small.height
    assert x >= 4 and x+small.width <= 188, (x,small.size)
    out = Image.new('RGBA',(192,192));out.paste(small,(x,y))
    return out

def figures(atlas):
    """Locate all 36 full figures; imagegen gutters are not pixel-exact grids."""
    pixels=np.array(atlas);labels,n=ndimage.label(pixels[:,:,3]>=100)
    counts=np.bincount(labels.ravel());indices=np.flatnonzero(counts>=1200);indices=indices[indices!=0]
    assert len(indices)==36, ('Expected 36 connected characters',len(indices))
    result=[]
    for label in indices:
        ys,xs=np.where(labels==label)
        x0,y0,x1,y1=max(0,int(xs.min())-3),max(0,int(ys.min())-3),min(atlas.width,int(xs.max())+4),min(atlas.height,int(ys.max())+4)
        assert xs.min()>0 and ys.min()>0 and xs.max()<atlas.width-1 and ys.max()<atlas.height-1, 'Source figure touches atlas boundary'
        rgba=pixels[y0:y1,x0:x1].copy()
        keep=ndimage.binary_dilation(labels[y0:y1,x0:x1]==label,iterations=2)
        rgba[~keep]=0
        im=Image.fromarray(rgba);im=im.crop(im.getchannel('A').getbbox())
        result.append((float(xs.mean()),float(ys.mean()),im))
    result.sort(key=lambda v:v[1]);ordered=[]
    for row in range(6):ordered.extend(sorted(result[row*6:row*6+6],key=lambda v:v[0]))
    return [v[2] for v in ordered]

def padded(frame):
    # Matches CHERRIFT_ANIMATION_SMOOTHING's makeFrame atlas transform.
    out = Image.new('RGBA',(256,256))
    out.paste(frame.resize((128,128),Image.Resampling.LANCZOS),(64,64))
    return np.array(out)

def intensity(rgba):
    rgb = rgba[:,:,:3].astype(np.float32)
    alpha = rgba[:,:,3].astype(np.float32)/255
    gray = cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY)*alpha
    return np.uint8(np.clip(gray,0,255))

def flow_texture(series, loop):
    tiles=[]
    for i in range(6):
        j=(i+1)%6 if loop else min(5,i+1)
        a,b=intensity(padded(series[i])),intensity(padded(series[j]))
        halves=[]
        for first,second in [(a,b),(b,a)]:
            vector=cv2.calcOpticalFlowFarneback(first,second,None,.5,4,25,5,7,1.5,0)
            vector=cv2.resize(vector,(32,32),interpolation=cv2.INTER_AREA)
            texture=np.zeros((32,32,4),np.uint8);texture[:,:,:2]=np.clip(np.rint(vector*2+128),0,255)
            texture[:,:,2]=128;texture[:,:,3]=255;halves.append(texture)
        tiles.append(np.concatenate(halves,axis=1))
    return Image.fromarray(np.concatenate(tiles,axis=0))

def main():
    frames={};metadata={};sources=[]
    for d in ORIGINAL:
        path=ART/'sources'/f'{d}.png'; atlas=Image.open(path).convert('RGBA')
        sources.append(dict(file=str(path.relative_to(ROOT)),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),size=list(atlas.size)))
        extracted=figures(atlas)
        for row,s in enumerate(STATES):
            series=[]
            for col in range(6):
                series.append(place(extracted[row*6+col]))
            frames[d,s]=series
    for d,source in MIRRORS.items():
        for s in STATES:frames[d,s]=[ImageOps.mirror(f) for f in frames[source,s]]
    whole_pose=json.loads((ROOT/'tools/sport_whole_pose_landmarks.json').read_text())
    (ART/'sheets192').mkdir(exist_ok=True)
    flow_dir=ROOT/'assets/player/animation_flow';flow_dir.mkdir(parents=True,exist_ok=True)
    geometry={}
    for s in STATES:
        geometry[s]={}
        for d in DIRS:
            strip=Image.new('RGBA',(1152,192));geometry[s][d]=[]
            for i,f in enumerate(frames[d,s]):
                strip.paste(f,(i*192,0))
                p=ART/'frames256'/d/s/f'{i:03}.png';p.parent.mkdir(parents=True,exist_ok=True)
                f.resize((256,256),Image.Resampling.LANCZOS).save(p)
                a=np.array(f.getchannel('A'));yy,xx=np.where(a>=160)
                fy,fx=np.where(a[max(0,yy.max()-11):yy.max()+1]>=160)
                geometry[s][d].append([int(yy.min()),int(yy.max()+1),float(np.median(fx))+.5])
            strip.save(ART/'sheets192'/f'sport_cherry_{s}_{d}.png')
        for d in ORIGINAL:
            name=f'sport_cherry__{s}__{d}'+('__whole4' if s in ['walk','walk_attack'] else '')+'.png'
            flow_texture(frames[d,{'walk':'idle','walk_attack':'attack'}.get(s,s)],s in ['idle','walk']).save(flow_dir/name)
            metadata[f'sport_cherry/{s}/{d}']=dict(frames=6,offsets=[[0,0]]*6,file=name)
    geometry['walk']=geometry['idle']
    geometry['walk_attack']=geometry['attack']
    (ROOT/'src/cherrift_sport_data.js').write_text('/* Generated by tools/export_sport_cherry.py. Sport data only. */\nObject.assign(window.CHERRIFT_ANIMATION_FLOW ||= {},'+json.dumps(metadata,separators=(',',':'))+');\nObject.assign(window.CHERRIFT_CHERRY_GEOMETRY ||= {},'+json.dumps({'sport_cherry':geometry},separators=(',',':'))+');\nwindow.CHERRIFT_SPORT_WHOLE_POSE='+json.dumps(whole_pose,separators=(',',':'))+';\n')
    manifest=dict(id='sport_cherry',referenceCommit='9b3d27f6603fb603d76f6764a1d80d88f885e19c',frameSize=192,pivot=[96,184],individualFrameSize=256,directions=DIRS,mirroredDirections=MIRRORS,states={s:dict(frames=6,fps=FPS[s],duration=6/FPS[s],runtimeDuration=6/18 if s=='walk_attack' else 6/FPS[s],sheets={d:f'sheets192/sport_cherry_{s}_{d}.png' for d in DIRS}) for s in STATES},sources=sources,skill=dict(type='common_shield',shieldSeconds=2,healMaxHpFraction=.10),passive=dict(hpBonus=.02),notes=['Imagegen costume edit of Base sprite references. No Base assets modified.','Left views are mirrored. Runtime optical flow interpolation is required for smooth playback.','Existing Sport splash and icon retained.','Runtime walk uses complete idle poses; walk_attack uses complete attack poses. Continuous directional inverse warp animates original legs.'])
    (ART/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    board=Image.new('RGB',(1536,1296),'#d5cad4');draw=ImageDraw.Draw(board)
    for row,s in enumerate(STATES):
        for col,d in enumerate(DIRS):
            draw.text((col*192+6,row*216+6),f'{d} / {s}',fill='#433846');f=frames[d,s][2];board.paste(f,(col*192,row*216+24),f)
    board.save(ART/'overview.jpg',quality=93)
    report=dict(directions=8,states=6,frames=288,sheets=48,flowTextures=30,empty=[],clipped=[])
    for p in (ART/'sheets192').glob('*.png'):
        with Image.open(p) as im:im.load();assert im.size==(1152,192) and im.mode=='RGBA'
    for p in (ART/'frames256').rglob('*.png'):
        with Image.open(p) as im:
            box=im.getchannel('A').getbbox();assert box and box[0]>0 and box[1]>0 and box[2]<256 and box[3]<256,(p,box)
    (ART/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report))

if __name__=='__main__':main()
