"""Crop the generated savanna atlas and export proportional WebP tiers.

Artwork comes from image_gen. This script only crops alpha bounds, pads and
resizes. Run from the CHERRIFT project root after placing the source images.
"""
import argparse
import json
import math
from pathlib import Path
from PIL import Image

parser=argparse.ArgumentParser()
parser.add_argument('--sources',type=Path,default=Path('docs/world3-sources'))
parser.add_argument('--target',type=Path,default=Path('assets/map/world3/savanna'))
args=parser.parse_args()
atlas=Image.open(args.sources/'objects.png').convert('RGBA')
ground=Image.open(args.sources/'ground.png').convert('RGB')
assert atlas.getchannel('A').getextrema()[0]==0,'Atlas needs true alpha'
names=['tree1','tree2','tree3','bush1','bush2','deadBush','rock1','rock2',
       'rockSmall','log','stump','bones','grass1','grass2','grass3','pebbles']
heights=[184,164,205,69,60,55,70,57,23,56,53,30,34,30,27,21]
footprints={'tree1':(20,12),'tree2':(18,11),'tree3':(28,16),
            'rock1':(29,15),'rock2':(24,13),'log':(28,12),'stump':(21,12)}
args.target.mkdir(parents=True,exist_ok=True)
metadata={}
# Optical spacing in the generated atlas is not an equal-cell grid. These
# measured cuts isolate whole silhouettes without modifying the artwork.
row_edges=[0,415,720,965,1254]
column_edges=[[0,375,645,975,1254],[0,330,640,975,1254],
              [0,320,665,970,1254],[0,330,665,975,1254]]
for i,name in enumerate(names):
    x,y=i%4,i//4
    edges=column_edges[y]
    box=(round(edges[x]*atlas.width/1254),round(row_edges[y]*atlas.height/1254),
         round(edges[x+1]*atlas.width/1254),round(row_edges[y+1]*atlas.height/1254))
    cell=atlas.crop(box)
    bounds=cell.getchannel('A').point(lambda a:255 if a>=48 else 0).getbbox()
    if not bounds:raise ValueError(f'Empty sprite: {name}')
    # Every generated silhouette must remain separated from adjacent cells.
    assert bounds[0]>1 and bounds[1]>1 and bounds[2]<cell.width-1 and bounds[3]<cell.height-1,(name,bounds)
    sprite=cell.crop(bounds)
    # Proportional padding remains at least 3 pixels even for 32px Low exports;
    # Lanczos filtering must not put a grass tip against an image boundary.
    padding=max(4,math.ceil(max(sprite.size)*.14))
    padded=Image.new('RGBA',(sprite.width+padding*2,sprite.height+padding*2));padded.paste(sprite,(padding,padding))
    h=heights[i];rx,ry=footprints.get(name,(0,0))
    content_anchor=.89 if name.startswith('tree') else .83
    metadata[name]={'width':padded.width,'height':padded.height,
       'logicalWidth':round(h*padded.width/sprite.height),
       'logicalHeight':round(h*padded.height/sprite.height),'artHeight':h,
       'anchor':round((padding+sprite.height*content_anchor)/padded.height,5),
       'solid':name in footprints,'rx':rx,'ry':ry,
       'sourceCell':list(box),'alphaBounds':list(bounds),'padding':padding}
    limits=[128,192,320] if name.startswith('tree') else [32,64,128] if name.startswith('grass') or name in ('bones','pebbles') else [64,128,256]
    for tier,limit in zip(('low','medium','high'),limits):
        folder=args.target/tier;folder.mkdir(exist_ok=True)
        out=padded.copy();out.thumbnail((limit,limit),Image.Resampling.LANCZOS)
        out.save(folder/f'{name}.webp',lossless=True,method=6)
for tier,edge in [('low',192),('medium',384),('high',768)]:
    ground.resize((edge,edge),Image.Resampling.LANCZOS).save(args.target/tier/'ground.webp',quality=90,method=6)
    splash=Image.open(args.sources/'splash.png').convert('RGB')
    splash.thumbnail({'low':(640,360),'medium':(1280,720),'high':(1920,1080)}[tier],Image.Resampling.LANCZOS)
    splash.save(args.target/tier/'splash.webp',quality=88,method=6)
Image.open(args.sources/'splash.png').convert('RGB').save(args.target/'splash.webp',quality=90,method=6)
(args.target/'dimensions.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
manifest={'version':'world3-golden-savanna-20261026','theme':'golden acacia and baobab savanna',
          'tiers':['low','medium','high'],'logicalGroundTileSize':384,'spriteCount':16,
          'objects':{n:{'src':f'assets/map/world3/savanna/{{tier}}/{n}.webp',**m} for n,m in metadata.items()}}
(args.target/'catalog.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('Exported 16 transparent props, ground and splash in all three tiers.')
