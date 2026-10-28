"""Export the generated atlases into registered 192px RGBA game strips.
No painted pixels are synthesized: segmentation, uniform resampling, pivot
registration and mirrored directions only. Requires Pillow, numpy, scipy, scikit-image.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw,ImageOps,ImageChops
from scipy import ndimage,signal
from skimage.segmentation import watershed

ROOT=Path(__file__).resolve().parent
ORIGINAL=['down','down_right','right','up_right','up']
MIRRORS={'left':'right','down_left':'down_right','up_left':'up_right'}
GROUPS={'idle':['idle','idle2','idle3'],'action':['walk','attack','walk_attack','skill']}
FPS={'idle':3,'idle2':3,'idle3':3,'walk':8,'attack':18,'walk_attack':18,'skill':16}

def extract(path,rows):
    im=Image.open(path).convert('RGBA');a=np.array(im.getchannel('A'));h=im.height/rows;w=im.width/6
    core=a>=160;distance=ndimage.distance_transform_edt(core)
    markers=np.zeros(a.shape,dtype=np.int32);groups=[];index=0
    for row in range(rows):
        band=core[round(row*h+h*.26):round(row*h+h*.50)].sum(axis=0).astype(float)
        band=ndimage.gaussian_filter1d(band,4)
        peaks,_=signal.find_peaks(band,distance=w*.65,prominence=band.max()*.18)
        assert len(peaks) in [5,6],(path,row,'head count',peaks)
        group=[]
        for x in peaks:
            y=round(row*h+h*.40);x=int(x)
            y0=max(0,y-9);x0=max(0,x-9)
            patch=distance[y0:min(im.height,y+10),x0:min(im.width,x+10)]
            yy,xx=np.unravel_index(np.argmax(patch),patch.shape)
            index+=1;markers[y0+yy,x0+xx]=index
            group.append((index,x,row))
        groups.append(group)
    owners=watershed(-distance,markers,mask=a>=24)
    edge=ndimage.binary_dilation(core,iterations=3)
    output=[]
    for group in groups:
        parts=[]
        for index,x,row in group:
            mask=(owners==index)&edge
            # Exclude diffuse background and disconnected single-pixel flecks.
            alpha=np.where(mask,a,0).astype(np.uint8)
            labels,n=ndimage.label(alpha>=24);counts=np.bincount(labels.ravel())
            keep=counts>=24;keep[0]=False
            support=ndimage.binary_dilation(keep[labels],iterations=2)
            alpha=np.where(support,alpha,0).astype(np.uint8)
            yy,xx=np.where(alpha>=160)
            assert len(xx)>5000,(path,index,'empty/split figure')
            yy,xx=np.where(alpha>=24)
            box=(max(0,int(xx.min())-2),max(0,int(yy.min())-2),min(im.width,int(xx.max())+3),min(im.height,int(yy.max())+3))
            assert box[3]-box[1]>h*.65 and box[3]-box[1]<h*1.3,(path,index,'invalid height',box)
            part=im.copy();part.putalpha(Image.fromarray(alpha));part=part.crop(box)
            parts.append(part)
        # One optional idle row contains five drawn poses; repeat its neutral
        # closing pose for the final hold, retaining a two-second six-slot cycle.
        parts=[parts[i] for i in ([0,1,2,3,4,4] if len(parts)==5 else range(6))]
        output.append(parts)
    return output

def place(im):
    core=np.array(im.getchannel('A'))>=160;y,x=np.where(core)
    top,bottom=int(y.min()),int(y.max())+1
    scale=min(117/(bottom-top),186/(int(x.max())-int(x.min())+1))
    size=(max(1,round(im.width*scale)),max(1,round(im.height*scale)))
    im=im.resize(size,Image.Resampling.LANCZOS)
    a=np.array(im.getchannel('A'));yy,xx=np.where(a>=160)
    bottom=int(yy.max())+1;foot=np.where((a>=160)&(np.indices(a.shape)[0]>=bottom-8))[1]
    anchor=float(np.median(foot))+.5
    out=Image.new('RGBA',(192,192));out.alpha_composite(im,(round(96-anchor),184-bottom))
    return out

def register(images,direction):
    # Template covers the eyes/upper head, never the changing boots, hands,
    # wings or heart-tail silhouette which caused the previous shot jitter.
    ref=images['idle'][0]
    cx={'down':96,'down_right':100,'right':108,'up_right':108,'up':96}[direction]
    left,right=cx-18,cx+18;top,bottom=104,130
    def gray(im):
        a=np.array(im,dtype=float)/255
        return (a[:,:,:3]*a[:,:,3:4]+.6*(1-a[:,:,3:4])).mean(axis=2)
    template=gray(ref)[top:bottom,left:right];h,w=template.shape
    centered=template-template.mean();energy=np.sum(centered**2);shifts={}
    for state,frames in images.items():
        aligned=[];shifts[state]=[]
        for im in frames:
            a=gray(im);lx=max(0,left-25);ly=max(0,top-16)
            region=a[ly:bottom+16,lx:right+25]
            sums=signal.correlate2d(region,np.ones((h,w)),mode='valid')
            squares=signal.correlate2d(region**2,np.ones((h,w)),mode='valid')
            var=np.maximum(1e-12,squares-sums**2/(h*w))
            score=signal.correlate2d(region,centered,mode='valid')/np.sqrt(var*energy)
            yy,xx=np.unravel_index(np.argmax(score),score.shape)
            dx=left-(lx+int(xx))
            # Keep every wing/hair tip safe even during optional wing stretches.
            alpha=np.array(im.getchannel('A'));sy,sx=np.where(alpha>=24)
            dx=int(np.clip(dx,5-int(sx.min()),186-int(sx.max())))
            out=Image.new('RGBA',(192,192));out.alpha_composite(im,(dx,0))
            aligned.append(out);shifts[state].append({'x':dx,'score':round(float(score[yy,xx]),3)})
        images[state]=aligned
    return shifts

def main():
    frames={};alignment={};sources={}
    for direction in ORIGINAL:
        images={}
        for group,states in GROUPS.items():
            rows=extract(ROOT/'sources'/f'{group}-{direction}.png',len(states))
            for state,parts in zip(states,rows):images[state]=[place(p) for p in parts]
        alignment[direction]=register(images,direction)
        for state,parts in images.items():frames[state,direction]=parts
    for left,right in MIRRORS.items():
        for state in FPS:
            frames[state,left]=[ImageChops.offset(ImageOps.mirror(im),1,0) for im in frames[state,right]]
    (ROOT/'sheets192').mkdir(exist_ok=True)
    report={'directions':8,'states':7,'framesPerState':6,'frames':336,'sheets':56,'empty':[],'clipped':[],'heightRange':[192,0]}
    directions=ORIGINAL+list(MIRRORS)
    for (state,direction),parts in frames.items():
        strip=Image.new('RGBA',(1152,192))
        for i,im in enumerate(parts):
            a=np.array(im.getchannel('A'));yy,xx=np.where(a>=160)
            if not len(xx):report['empty'].append([state,direction,i]);continue
            if xx.min()<=0 or xx.max()>=191 or yy.min()<=0 or yy.max()>=191:report['clipped'].append([state,direction,i])
            height=int(yy.max()-yy.min()+1);report['heightRange'][0]=min(report['heightRange'][0],height);report['heightRange'][1]=max(report['heightRange'][1],height)
            strip.alpha_composite(im,(i*192,0))
        strip.save(ROOT/'sheets192'/f'sakura_dance_cherry_{state}_{direction}.png')
    assert not report['empty'] and not report['clipped'],report
    manifest={'id':'sakura_dance_cherry','rarity':'Legendary','frameSize':192,'pivot':[96,184],
      'directions':directions,'mirroredDirections':MIRRORS,'states':{s:{'frames':6,'fps':f} for s,f in FPS.items()},
      'alignment':'uniform scale, soles baseline, offline upper-head template registration; fixed runtime pivot',
      'sourceAlignment':alignment,'references':['approved-concept-2.png']}
    (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
    board=Image.new('RGB',(1536,1456),'#b9b4be');draw=ImageDraw.Draw(board)
    for row,state in enumerate(FPS):
        for col,direction in enumerate(directions):
            im=frames[state,direction][3];board.paste(im,(col*192,row*208+16),im);draw.text((col*192+4,row*208+3),state+' / '+direction,fill='#17141c')
    board.save(ROOT/'overview.jpg',quality=94)
    gif=[]
    for tick in range(48):
        direction=['down','right','up_right','up'][tick//12]
        image=Image.new('RGB',(768,416),'#b9b4be');d=ImageDraw.Draw(image)
        for j,state in enumerate(FPS):
            im=frames[state,direction][tick%6];x=j%4*192;y=j//4*208
            image.paste(im,(x,y+16),im);d.text((x+4,y+3),state+' / '+direction,fill='#17141c')
        gif.append(image.resize((512,277),Image.Resampling.LANCZOS))
    palette=gif[0].quantize(colors=255)
    quant=[im.quantize(palette=palette,dither=Image.Dither.NONE) for im in gif]
    quant[0].save(ROOT/'preview.gif',save_all=True,append_images=quant[1:],duration=125,loop=0,disposal=2)
    print(json.dumps(report))

if __name__=='__main__':main()
