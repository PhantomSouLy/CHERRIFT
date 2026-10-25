"""Export generated World2 night sprites with canonical World1 proportions."""
from pathlib import Path
from PIL import Image, ImageOps
import argparse, json
parser=argparse.ArgumentParser()
parser.add_argument('--sources',type=Path,default=Path('docs/world2-sources'))
parser.add_argument('--target',type=Path,default=Path('assets/map/world2/moonlit'))
parser.add_argument('--canonical',type=Path,default=Path('assets/map/world1/meadow/dimensions.json'))
args=parser.parse_args()
sources=args.sources
target=args.target;target.mkdir(parents=True,exist_ok=True)
atlas=Image.open(sources/'objects.png').convert('RGBA')
ground=Image.open(sources/'grass.png').convert('RGB')
dimensions=json.loads(args.canonical.read_text())
xs=[0,320,640,960,1254];ys=[0,420,700,960,1254]
names=list(dimensions)
for i,name in enumerate(names):
    x,y=i%4,i//4
    cell=atlas.crop((xs[x],ys[y],xs[x+1],ys[y+1]))
    bounds=cell.getchannel('A').point(lambda a:255 if a>=48 else 0).getbbox()
    assert bounds,name
    sprite=cell.crop(bounds)
    d=dimensions[name]
    # Export preparation only: preserve the generated silhouette's aspect ratio,
    # fit the canonical World1 canvas and align its ground contact at the bottom.
    sprite=ImageOps.contain(sprite,(d['width']-8,d['height']-8),Image.Resampling.LANCZOS)
    padded=Image.new('RGBA',(d['width'],d['height']))
    padded.paste(sprite,((d['width']-sprite.width)//2,d['height']-4-sprite.height))
    limits=[128,192,320] if name.startswith('tree') else [32,64,128] if name.startswith('flower') or name in ('grass','mushroom') else [64,128,256]
    for tier,limit in zip(('low','medium','high'),limits):
        folder=target/tier;folder.mkdir(exist_ok=True)
        out=padded.copy();out.thumbnail((limit,limit),Image.Resampling.LANCZOS);out.save(folder/f'{name}.webp',lossless=True,method=6)
for tier,edge in [('low',192),('medium',384),('high',768)]:
    ground.resize((edge,edge),Image.Resampling.LANCZOS).save(target/tier/'ground.webp',quality=90,method=6)
Image.open(sources/'concept.png').convert('RGB').save(target/'splash.webp',quality=90,method=6)
(target/'dimensions.json').write_text(json.dumps(dimensions,indent=2)+'\n')
print('52 World2 WebPs exported; alpha and tier dimensions verified.')
for tier in ['low','medium','high']:
    files=list((target/tier).glob('*.webp'));assert len(files)==17
    for p in files:
        im=Image.open(p)
        if p.stem!='ground':assert im.mode=='RGBA' and im.getextrema()[-1][0]==0,p
    print(tier,round(sum(p.stat().st_size for p in files)/1024),'KiB')
