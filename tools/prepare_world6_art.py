"""Export image_gen Dark Ruins art; preserve proportions, alpha and logical scale.

Requires Pillow. Run from repository root: python tools/prepare_world6_art.py
Only sprite extraction, detached alpha-noise removal, padding and resizing.
"""
import argparse
import json
import math
import io
import os
from collections import deque
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops


def save_atomic(image, path, **options):
    """Encode fully in memory, validate, then publish one complete file."""
    encoded = io.BytesIO()
    image.save(encoded, format='WEBP', **options)
    payload = encoded.getvalue()
    assert len(payload) > 12 and payload[:4] == b'RIFF'
    Image.open(io.BytesIO(payload)).load()
    temporary = path.with_name(path.name+'.tmp')
    temporary.write_bytes(payload)
    os.replace(temporary, path)


def isolate(cell):
    """Keep the main connected silhouette and its adjacent antialiased fringe."""
    alpha = cell.getchannel('A')
    w, h = cell.size
    pixels = bytearray(1 if a >= 48 else 0 for a in alpha.tobytes())
    largest = []
    for start in range(w*h):
        if not pixels[start]:
            continue
        pixels[start] = 0
        queue = deque([start])
        component = []
        while queue:
            p = queue.popleft()
            component.append(p)
            x, y = p % w, p // w
            for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0 <= nx < w and 0 <= ny < h:
                    n = ny*w+nx
                    if pixels[n]:
                        pixels[n] = 0
                        queue.append(n)
        if len(component) > len(largest):
            largest = component
    assert largest, 'Empty sprite'
    mask = bytearray(w*h)
    for p in largest:
        mask[p] = 255
    mask = Image.frombytes('L', (w,h), bytes(mask)).filter(ImageFilter.MaxFilter(5))
    cell.putalpha(ImageChops.multiply(alpha, mask))
    bounds = cell.getchannel('A').getbbox()
    visible = cell.getchannel('A').point(lambda a: 255 if a >= 48 else 0).getbbox()
    assert visible[0] > 1 and visible[1] > 1 and visible[2] < w-1 and visible[3] < h-1, visible
    return cell.crop(bounds), bounds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sources', type=Path, default=Path('docs/world6-sources'))
    parser.add_argument('--target', type=Path, default=Path('assets/map/world6/ruins'))
    args = parser.parse_args()
    atlas = Image.open(args.sources/'objects.png').convert('RGBA')
    assert atlas.getchannel('A').getextrema()[0] == 0
    names = ['pillar1','pillar2','statue1','statue2','runestone','crystal','crystalSmall','tree',
             'rock1','rock2','wall','fallenPillar','bones','deadBush','rubble','crystalTiny']
    heights = [160,115,180,174,110,75,45,185,78,60,100,58,36,50,28,25]
    footprints = {'pillar1':(24,15),'pillar2':(23,14),'statue1':(34,22),'statue2':(31,20),
                  'runestone':(24,16),'crystal':(18,12),'tree':(24,14),'rock1':(28,17),
                  'rock2':(25,13),'wall':(40,17),'fallenPillar':(36,15)}
    # Measured cuts around complete separated source silhouettes.
    rows = [0,420,775,1035,1254]
    columns = [[0,330,620,955,1254]]*4
    metadata = {}
    args.target.mkdir(parents=True, exist_ok=True)
    for i, name in enumerate(names):
        x,y = i%4,i//4
        box = (round(columns[y][x]*atlas.width/1254),round(rows[y]*atlas.height/1254),
               round(columns[y][x+1]*atlas.width/1254),round(rows[y+1]*atlas.height/1254))
        sprite, bounds = isolate(atlas.crop(box))
        padding = max(4, math.ceil(max(sprite.size)*.14))
        padded = Image.new('RGBA',(sprite.width+padding*2,sprite.height+padding*2))
        padded.paste(sprite,(padding,padding))
        h = heights[i]
        anchor = .89 if name in ('pillar1','pillar2','statue1','statue2','tree') else .83
        rx,ry = footprints.get(name,(0,0))
        entry = {'width':padded.width,'height':padded.height,
                 'logicalWidth':round(h*padded.width/sprite.height),
                 'logicalHeight':round(h*padded.height/sprite.height),
                 'artHeight':h,'anchor':round((padding+sprite.height*anchor)/padded.height,5),
                 'solid':name in footprints,'rx':rx,'ry':ry,
                 'sourceCell':list(box),'alphaBounds':list(bounds),'padding':padding}
        metadata[name] = entry
        limits = [128,192,320] if name in ('pillar1','pillar2','statue1','statue2','tree') else [32,64,128] if name in ('bones','rubble','crystalTiny') else [64,128,256]
        for tier,limit in zip(('low','medium','high'),limits):
            folder = args.target/tier
            folder.mkdir(exist_ok=True)
            out = padded.copy()
            out.thumbnail((limit,limit),Image.Resampling.LANCZOS)
            save_atomic(out,folder/f'{name}.webp',lossless=True,method=6)
    ground = Image.open(args.sources/'ground.png').convert('RGB')
    splash = Image.open(args.sources/'splash.png').convert('RGB')
    for tier,edge,size in [('low',192,(640,360)),('medium',384,(1280,720)),('high',768,(1920,1080))]:
        save_atomic(ground.resize((edge,edge),Image.Resampling.LANCZOS),args.target/tier/'ground.webp',quality=90,method=6)
        out = splash.copy()
        out.thumbnail(size,Image.Resampling.LANCZOS)
        save_atomic(out,args.target/tier/'splash.webp',quality=88,method=6)
    save_atomic(splash,args.target/'splash.webp',quality=90,method=6)
    (args.target/'dimensions.json').write_text(json.dumps(metadata,indent=2)+'\n')
    catalog = {'version':'world6-ruins-20261026','theme':'layered cursed stone courtyard with restrained amethyst accents',
               'runtimeIntegrated':False,'tiers':['low','medium','high'],'logicalGroundTileSize':384,'spriteCount':16,
               'ground':{'src':'assets/map/world6/ruins/{tier}/ground.webp','tiling':'mirrored 2x2, as World1/2'},
               'splash':{'src':'assets/map/world6/ruins/{tier}/splash.webp'},
               'objects':{n:{'src':f'assets/map/world6/ruins/{{tier}}/{n}.webp',**m} for n,m in metadata.items()}}
    (args.target/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
    print('Exported 16 RGBA props + ground + splash in low/medium/high, metadata and splash alias.')


if __name__ == '__main__':
    main()
