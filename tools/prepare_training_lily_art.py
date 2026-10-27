"""Export image_gen Spider Lily Field art; preserve proportions, alpha and logical scale.

Requires Pillow. Run from repository root: python tools/prepare_training_art.py
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
    pixels = bytearray(1 if a >= 32 else 0 for a in alpha.tobytes())
    components = []
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
        components.append(component)
        if len(component) > len(largest):
            largest = component
    assert largest, 'Empty sprite'
    mask = bytearray(w*h)
    for component in components:
        if len(component) >= max(16, len(largest)*.003):
            for p in component:
                mask[p] = 255
    mask = Image.frombytes('L', (w,h), bytes(mask)).filter(ImageFilter.MaxFilter(5))
    cell.putalpha(ImageChops.multiply(alpha, mask))
    bounds = cell.getchannel('A').getbbox()
    visible = cell.getchannel('A').point(lambda a: 255 if a >= 48 else 0).getbbox()
    assert visible[0] > 1 and visible[1] > 1 and visible[2] < w-1 and visible[3] < h-1, visible
    return cell.crop(bounds), bounds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sources', type=Path, default=Path('docs/training-lily-sources'))
    parser.add_argument('--target', type=Path, default=Path('assets/map/training/spider-lilies'))
    args = parser.parse_args()
    atlas = Image.open(args.sources/'objects.png').convert('RGBA')
    assert atlas.getchannel('A').getextrema()[0] == 0
    names = ['lilySingle1','lilySingle2','lilyDouble','lilyBuds','lilyClump1','lilyClump2',
             'lilyClump3','lilyClump4','lilyLow','lilyTall','rock1','rock2','rockSmall','pebbles','moss','grass']
    heights = [44,42,47,42,48,47,50,49,34,54,75,52,18,15,18,24]
    footprints = {'rock1':(28,16),'rock2':(25,13)}
    rows = [0,330,655,975,1254]
    columns = [[0,330,625,950,1254],[0,320,630,945,1254],
               [0,320,625,955,1254],[0,330,625,950,1254]]
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
        anchor = .97 if name.startswith('lily') else .83
        rx,ry = footprints.get(name,(0,0))
        entry = {'width':padded.width,'height':padded.height,
                 'logicalWidth':round(h*padded.width/sprite.height),
                 'logicalHeight':round(h*padded.height/sprite.height),
                 'artHeight':h,'anchor':round((padding+sprite.height*anchor)/padded.height,5),
                 'solid':name in footprints,'rx':rx,'ry':ry,'layer':'flowers' if name.startswith('lily') else 'props',
                 'sourceCell':list(box),'alphaBounds':list(bounds),'padding':padding}
        metadata[name] = entry
        limits = [64,96,192] if name.startswith('lily') else [64,128,256] if name in ('rock1','rock2') else [32,64,128]
        for tier,limit in zip(('low','medium','high'),limits):
            folder = args.target/tier
            folder.mkdir(exist_ok=True)
            out = padded.copy()
            out.thumbnail((limit,limit),Image.Resampling.LANCZOS)
            save_atomic(out,folder/f'{name}.webp',lossless=True,method=6)
    ground = Image.open(args.sources/'ground.png').convert('RGB')
    splash = Image.open(args.sources/'splash.png').convert('RGB')
    fog = Image.open(args.sources/'fog.png').convert('RGBA')
    assert fog.getchannel('A').getextrema()[0] == 0
    for tier,edge,size in [('low',192,(640,360)),('medium',384,(1280,720)),('high',768,(1920,1080))]:
        save_atomic(ground.resize((edge,edge),Image.Resampling.LANCZOS),args.target/tier/'ground.webp',quality=90,method=6)
        fogOut = fog.copy()
        fogOut.thumbnail(({'low':256,'medium':512,'high':1024}[tier],512),Image.Resampling.LANCZOS)
        save_atomic(fogOut,args.target/tier/'fog.webp',lossless=True,method=6)
        out = splash.copy()
        out.thumbnail(size,Image.Resampling.LANCZOS)
        save_atomic(out,args.target/tier/'splash.webp',quality=88,method=6)
    save_atomic(splash,args.target/'splash.webp',quality=90,method=6)
    (args.target/'dimensions.json').write_text(json.dumps(metadata,indent=2)+'\n')
    catalog = {'version':'training-spider-lilies-20261026','theme':'layered pale ash-gray soil and dense separate crimson spider lilies',
               'runtimeIntegrated':False,'tiers':['low','medium','high'],'logicalGroundTileSize':384,'spriteCount':16,
               'ground':{'src':'assets/map/training/spider-lilies/{tier}/ground.webp','tiling':'mirrored 2x2, as World1/2'},
               'splash':{'src':'assets/map/training/spider-lilies/{tier}/splash.webp'},
               'fog':{'src':'assets/map/training/spider-lilies/{tier}/fog.webp','logicalWidth':650,'opacity':.12,'maxOpacity':.18,'solid':False},
               'objects':{n:{'src':f'assets/map/training/spider-lilies/{{tier}}/{n}.webp',**m} for n,m in metadata.items()}}
    (args.target/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
    print('Exported 16 RGBA props + RGBA fog + ground + splash in low/medium/high, metadata and splash alias.')


if __name__ == '__main__':
    main()
