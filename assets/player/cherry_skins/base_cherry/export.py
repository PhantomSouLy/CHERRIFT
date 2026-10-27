"""Extract fully drawn image_gen characters, align and export. Pillow only.

No skeletons, part rotation, artificial poses, crossfades or frame interpolation.
"""
from pathlib import Path
from collections import deque
import io,json,math,os
from PIL import Image,ImageFilter,ImageChops,ImageOps,ImageDraw

ROOT=Path(__file__).resolve().parent
STATES=['idle','idle2','walk','attack','walk_attack','skill']
DIRECTIONS=['down','down_right','right','up_right','up','up_left','left','down_left']
FPS={'idle':3,'idle2':3,'walk':8,'attack':12,'walk_attack':8,'skill':14}

def save(image,path):
    path.parent.mkdir(parents=True,exist_ok=True)
    encoded=io.BytesIO();image.save(encoded,format='PNG');payload=encoded.getvalue()
    Image.open(io.BytesIO(payload)).load()
    temp=path.with_name(path.name+'.tmp');temp.write_bytes(payload);os.replace(temp,path)

def extract(atlas,columns=6,rows=6,topRows=None):
    alpha=atlas.getchannel('A');w,h=atlas.size
    pixels=bytearray(1 if a>=160 else 0 for a in alpha.tobytes());components=[]
    for start in range(w*h):
        if not pixels[start]:continue
        pixels[start]=0;q=deque([start]);points=[]
        while q:
            p=q.popleft();points.append(p);x,y=p%w,p//w
            for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0<=nx<w and 0<=ny<h:
                    n=ny*w+nx
                    if pixels[n]:pixels[n]=0;q.append(n)
        if len(points)>1200:
            xs=[p%w for p in points];ys=[p//w for p in points]
            box=[min(xs),min(ys),max(xs)+1,max(ys)+1]
            components.append({'points':points,'coreBox':box,'cx':sum(xs)/len(xs),'cy':sum(ys)/len(ys)})
    if topRows is not None:components=[c for c in components if c['cy']<h*.53]
    expected=columns*(topRows if topRows is not None else rows)
    assert len(components)==expected,('Unexpected separate figure count',len(components),expected)
    for c in components:
        b=c['coreBox'];assert b[0]>0 and b[1]>0 and b[2]<w and b[3]<h,('Clipped character',b)
    components.sort(key=lambda c:c['cy']);ordered=[]
    for row in range(topRows if topRows is not None else rows):ordered.extend(sorted(components[row*columns:row*columns+columns],key=lambda c:c['cx']))
    sprites=[]
    for c in ordered:
        b=c['coreBox'];box=[max(0,b[0]-5),max(0,b[1]-5),min(w,b[2]+5),min(h,b[3]+5)]
        bw,bh=box[2]-box[0],box[3]-box[1];mask=bytearray(bw*bh)
        for p in c['points']:
            x,y=p%w-box[0],p//w-box[1];mask[y*bw+x]=255
        mask=Image.frombytes('L',(bw,bh),bytes(mask)).filter(ImageFilter.MaxFilter(7))
        crop=atlas.crop(box);crop.putalpha(ImageChops.multiply(crop.getchannel('A'),mask))
        bounds=crop.getchannel('A').getbbox();crop=crop.crop(bounds)
        visible=crop.getchannel('A').point(lambda a:255 if a>=96 else 0)
        vb=visible.getbbox();footYs=range(round(vb[1]+(vb[3]-vb[1])*.82),vb[3]);hist=[0]*crop.width;data=visible.tobytes()
        for y in footYs:
            for x in range(crop.width):hist[x]+=int(data[y*crop.width+x]>0)
        total=sum(hist);half=total/2;acc=0;anchor=crop.width/2
        for x,n in enumerate(hist):
            acc+=n
            if acc>=half:anchor=x;break
        sprites.append({'image':crop,'anchorX':crop.width/2,'sourceBox':box,'coreBox':b})
    return sprites

def main():
    frames={};metadata={'version':'base-cherry-full-sprites-1','runtimeIntegrated':False,
      'rendering':'full-character frame animation; no bones','directions':DIRECTIONS,
      'states':{s:{'frames':6,'fps':FPS[s],'loop':s!='skill'} for s in STATES},
      'canvas256':256,'anchor256':[128,244],'canvas192':192,'anchor192':[96,184],
      'mirroredDirections':{'left':'right','down_left':'down_right','up_left':'up_right'},
      'sourceAlignment':{},'quality':{'technical':'validated','motion':'requires visual review; no claim of pixel-identical anatomy between generated frames'}}
    for direction in ['down','right','up','down_right','up_right']:
        sprites=extract(Image.open(ROOT/'sources'/f'{direction}.png').convert('RGBA'))
        idleHeights=sorted(s['image'].height for s in sprites[:6]);baseHeight=(idleHeights[2]+idleHeights[3])/2
        maxH=max(s['image'].height for s in sprites);maxLeft=max(s['anchorX'] for s in sprites);maxRight=max(s['image'].width-s['anchorX'] for s in sprites)
        scale=min(214/baseHeight,232/maxH,116/maxLeft,116/maxRight)
        metadata['sourceAlignment'][direction]={'uniformScale':scale,'idleHeightSource':baseHeight,'frames':[]}
        for i,s in enumerate(sprites):
            state=STATES[i//6];im=s['image'];newSize=(round(im.width*scale),round(im.height*scale));im=im.resize(newSize,Image.Resampling.LANCZOS)
            x=128-round(s['anchorX']*scale);y=244-im.height
            assert x>=8 and x+im.width<=248 and y>=8,(direction,i,x,y,im.size)
            canvas=Image.new('RGBA',(256,256));canvas.paste(im,(x,y));frames.setdefault((direction,state),[]).append(canvas)
            metadata['sourceAlignment'][direction]['frames'].append({'state':state,'index':i%6,'sourceBox':s['sourceBox'],'coreBox':s['coreBox'],'translation':[x,y],'sourceAnchorX':s['anchorX']})
    for direction in ['down','right','up','down_right','up_right']:
        topOnly=False
        replacement=extract(Image.open(ROOT/'sources'/f'locomotion-{direction}.png').convert('RGBA'),columns=3,rows=4,topRows=2 if topOnly else None)
        sample=sorted(s['image'].height for s in replacement[:6]);median=(sample[2]+sample[3])/2
        old=metadata['sourceAlignment'][direction]
        targetHeight=old['idleHeightSource']*old['uniformScale']
        scale=min(targetHeight/median,232/max(s['image'].width for s in replacement),232/max(s['image'].height for s in replacement))
        replacedStates=['walk'] if topOnly else ['walk','walk_attack']
        for row,state in enumerate(replacedStates):
            sequence=[]
            for s in replacement[row*6:row*6+6]:
                im=s['image'];im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
                canvas=Image.new('RGBA',(256,256));canvas.paste(im,((256-im.width)//2,244-im.height));sequence.append(canvas)
            frames[direction,state]=sequence
        old['locomotionReplacement']={'states':replacedStates,'scale':scale,'source':'sources/locomotion-'+direction+'.png'}
    for left,right in metadata['mirroredDirections'].items():
        for state in STATES:
            # Mirror around the fixed x=128 root, not around the half-pixel canvas center.
            frames[left,state]=[ImageChops.offset(ImageOps.mirror(f),1,0) for f in frames[right,state]]
    for (direction,state),sequence in frames.items():
        strip=Image.new('RGBA',(1152,192))
        for i,im in enumerate(sequence):
            save(im,ROOT/'frames256'/direction/state/f'{i:03}.png')
            small=ImageChops.offset(im.resize((192,192),Image.Resampling.LANCZOS),0,1)
            save(small,ROOT/'frames192'/direction/state/f'{i:03}.png');strip.paste(small,(i*192,0))
        save(strip,ROOT/'sheets192'/f'base_cherry_{state}_{direction}.png')
    (ROOT/'manifest.json').write_text(json.dumps(metadata,indent=2)+chr(10))
    # State comparison and actual-frame animated preview, no synthesized poses.
    board=Image.new('RGB',(8*192,6*212),'#b6b0bb');draw=ImageDraw.Draw(board)
    for col,d in enumerate(DIRECTIONS):
        for row,state in enumerate(STATES):
            im=frames[d,state][2].resize((192,192),Image.Resampling.LANCZOS);board.paste(im,(col*192,row*212+20),im)
            draw.text((col*192+5,row*212+4),d+' / '+state,fill='#42384a')
    board.save(ROOT/'all-directions-preview.jpg',quality=94)
    gifFrames=[]
    # 3 seconds: each source pose remains unchanged; state uses its own FPS.
    previewDirs=['down','right','up_right','up'];previewStates=['idle','walk','attack','skill']
    for tick in range(48):
        image=Image.new('RGB',(768,848),'#b6b0bb');d=ImageDraw.Draw(image)
        for row,state in enumerate(previewStates):
            n=min(5,int((tick/16)*FPS[state])%8) if state=='skill' else int((tick/16)*FPS[state])%6
            for col,direction in enumerate(previewDirs):
                frame=frames[direction,state][n].resize((192,192),Image.Resampling.LANCZOS)
                image.paste(frame,(col*192,row*212+20),frame)
                d.text((col*192+5,row*212+4),direction+' / '+state,fill='#42384a')
        gifFrames.append(image)
    palette=gifFrames[0].quantize(colors=255)
    quant=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in gifFrames]
    quant[0].save(ROOT/'animation-preview.gif',save_all=True,append_images=quant[1:],duration=[60,60,60,70]*12,loop=0,disposal=2)
    report={'directions':8,'states':6,'framesPerState':6,'png256':0,'png192':0,'sheets192':0,'empty':[],'clipped':[]}
    for size in [192,256]:
        for p in (ROOT/f'frames{size}').rglob('*.png'):
            im=Image.open(p);im.load();assert im.mode=='RGBA' and im.size==(size,size)
            b=im.getchannel('A').getbbox();assert b
            assert b[0]>0 and b[1]>0 and b[2]<size and b[3]<size,(p,b)
            report[f'png{size}']+=1
    for p in (ROOT/'sheets192').glob('*.png'):
        im=Image.open(p);im.load();assert im.size==(1152,192);report['sheets192']+=1
    assert report['png256']==288 and report['png192']==288 and report['sheets192']==48
    (ROOT/'validation.json').write_text(json.dumps(report,indent=2)+chr(10));print(report)

if __name__=='__main__':main()
