"""Reproducible extraction of imagegen full-character drawings; no bone animation.
Requires Pillow, numpy, scipy. Run after placing the documented source atlases.
"""
from pathlib import Path
import json, io, os
import numpy as np
from PIL import Image, ImageFilter, ImageChops, ImageOps, ImageDraw
from scipy import ndimage

ROOT=Path(__file__).resolve().parent
DIRS=['down','down_right','right','up_right','up','up_left','left','down_left']
ORIGINAL=['down','right','up','down_right','up_right']
STATES_A=['idle','idle2','walk']
STATES_B=['attack','walk_attack','skill']
STATES=STATES_A+STATES_B
FPS={'idle':3,'idle2':3,'walk':8,'attack':18,'walk_attack':8,'skill':14}
MIRRORS={'left':'right','up_left':'up_right','down_left':'down_right'}
def save(im,p):
    p.parent.mkdir(parents=True,exist_ok=True)
    buf=io.BytesIO();im.save(buf,format='PNG')
    tmp=p.with_suffix('.tmp');tmp.write_bytes(buf.getvalue());os.replace(tmp,p)

def extract(path,cols,rows):
    atlas=Image.open(path).convert('RGBA');alpha=np.array(atlas.getchannel('A'))
    threshold=160
    labels,n=ndimage.label(alpha>=threshold)
    counts=np.bincount(labels.ravel());indices=np.flatnonzero(counts>=700);indices=indices[indices!=0]
    assert len(indices)==cols*rows,(str(path),'figure count',len(indices),cols*rows)
    parts=[]
    for i in indices:
        yy,xx=np.nonzero(labels==i);box=[int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)]
        assert box[0]>0 and box[1]>0 and box[2]<atlas.width and box[3]<atlas.height,(str(path),'core touches source edge',box)
        pad=[max(0,box[0]-4),max(0,box[1]-4),min(atlas.width,box[2]+4),min(atlas.height,box[3]+4)]
        mask=Image.fromarray(np.uint8(labels[pad[1]:pad[3],pad[0]:pad[2]]==i)*255).filter(ImageFilter.MaxFilter(7))
        im=atlas.crop(pad);im.putalpha(ImageChops.multiply(im.getchannel('A'),mask))
        im=im.crop(im.getchannel('A').getbbox())
        parts.append({'image':im,'cx':float(xx.mean()),'cy':float(yy.mean()),'box':box})
    parts.sort(key=lambda p:p['cy']);ordered=[]
    for r in range(rows):ordered.extend(sorted(parts[r*cols:(r+1)*cols],key=lambda p:p['cx']))
    return ordered

def place(im,scale):
    im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.LANCZOS)
    # Approximate horizontal alignment from the feet, preserving safe margins.
    alpha=np.array(im.getchannel('A'));foot=alpha[round(im.height*.85):]>=160
    weights=foot.sum(axis=0);total=int(weights.sum())
    anchor=int(np.searchsorted(np.cumsum(weights),total/2)) if total else im.width/2
    x=max(8,min(248-im.width,round(128-anchor)))
    c=Image.new('RGBA',(256,256));c.paste(im,(x,244-im.height));return c

def main():
    frames={};alignment={}
    for direction in ORIGINAL:
        groups=[extract(ROOT/'sources'/f'{direction}-{block}.png',6,3) for block in ['A','B']]
        scales=[]
        for group in groups:
            median=float(np.median([p['image'].height for p in group[:6]]))
            scales.append(min(210/median,232/max(p['image'].height for p in group),232/max(p['image'].width for p in group)))
        alignment[direction]={'scales':scales,'mode':'estimated foot center / common soles baseline'}
        for group,states,scale in zip(groups,[STATES_A,STATES_B],scales):
            for row,state in enumerate(states):
                frames[direction,state]=[place(p['image'],scale) for p in group[row*6:(row+1)*6]]
    for left,right in MIRRORS.items():
        for state in STATES:frames[left,state]=[ImageChops.offset(ImageOps.mirror(f),1,0) for f in frames[right,state]]
    manifest={'id':'cherry_default','folder':'base_cherry','style':'chibi-matching-ninja-03',
      'frameSize':192,'anchor':[96,184],'individualFrameSize':256,'individualAnchor':[128,244],
      'directions':DIRS,'mirroredDirections':MIRRORS,'sourceAlignment':alignment,'states':{},
      'integration':'Drop-in artwork for the previously supplied cherrift_base_cherry.js six-frame/eight-direction integration. No gameplay code changed.'}
    for state in STATES:
        manifest['states'][state]={'frames':6,'fps':FPS[state],'duration':6/FPS[state],
          'loop':state in ['idle','walk'],'sheets':{d:f'sheets192/base_cherry_{state}_{d}.png' for d in DIRS}}
        for direction in DIRS:
            strip=Image.new('RGBA',(1152,192))
            for i,im in enumerate(frames[direction,state]):
                save(im,ROOT/'frames256'/direction/state/f'{i:03}.png')
                small=ImageChops.offset(im.resize((192,192),Image.Resampling.LANCZOS),0,1)
                strip.paste(small,(i*192,0))
            save(strip,ROOT/'sheets192'/f'base_cherry_{state}_{direction}.png')
    (ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    board=Image.new('RGB',(1536,1272),'#cbbdc6');dr=ImageDraw.Draw(board)
    for y,state in enumerate(STATES):
        for x,direction in enumerate(DIRS):
            im=frames[direction,state][2].resize((192,192),Image.Resampling.LANCZOS)
            board.paste(im,(x*192,y*212+20),im);dr.text((x*192+4,y*212+4),direction+' / '+state,fill='#42333d')
    board.save(ROOT/'overview.jpg',quality=92)
    gif=[]
    for tick in range(48):
        direction=['down','right','up_right'][tick//16];elapsed=tick/8
        image=Image.new('RGB',(576,424),'#cbbdc6');dr=ImageDraw.Draw(image)
        for j,state in enumerate(STATES):
            x=j%3*192;y=j//3*212;im=frames[direction,state][int(elapsed*FPS[state])%6].resize((192,192),Image.Resampling.LANCZOS)
            image.paste(im,(x,y+20),im);dr.text((x+4,y+4),direction+' / '+state,fill='#42333d')
        gif.append(image)
    palette=gif[0].quantize(colors=255);quant=[im.quantize(palette=palette,dither=Image.Dither.NONE) for im in gif]
    quant[0].save(ROOT/'preview.gif',save_all=True,append_images=quant[1:],duration=125,loop=0,disposal=2)
    report={'directions':8,'states':6,'framesPerState':6,'pngFrames':0,'sheets':0,'empty':[],'clipped':[]}
    for p in (ROOT/'frames256').rglob('*.png'):
        im=Image.open(p);im.load();assert im.mode=='RGBA' and im.size==(256,256)
        box=im.getchannel('A').getbbox();assert box,(p,'empty')
        assert box[0]>0 and box[1]>0 and box[2]<256 and box[3]<256,(p,'clipped',box)
        report['pngFrames']+=1
    for p in (ROOT/'sheets192').glob('*.png'):
        im=Image.open(p);im.load();assert im.mode=='RGBA' and im.size==(1152,192)
        report['sheets']+=1
    assert report['pngFrames']==288 and report['sheets']==48
    (ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(report)

if __name__=='__main__':main()

