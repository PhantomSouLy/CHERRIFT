"""Extract the generated meadow sprites and export three resolution tiers.

Usage: python tools/prepare_world1_art.py --sources docs/world1-sources
Only crops, alpha padding and proportional resizing are applied; artwork is
generated with image_gen. Sources and generation prompts are kept for provenance.
"""
import argparse
import json
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--sources', type=Path, default=Path('docs/world1-sources'))
args = parser.parse_args()
target = Path('assets/map/world1/meadow')
target.mkdir(parents=True, exist_ok=True)
atlas = Image.open(args.sources / 'objects.png').convert('RGBA')
ground = Image.open(args.sources / 'grass.png').convert('RGB')
# Generated sheet has equal columns but optical, rather than equal, row spacing.
# These measured boundaries isolate the complete silhouettes without redesigning.
xs = [0, 320, 640, 960, 1254]
ys = [0, 420, 700, 960, 1254]
names = ['tree1','tree2','tree3','bush1','bush2','bush3','rock1','rock2',
         'rockSmall','log','stump','mushroom','flower1','flower2','flower3','grass']
metadata = {}
for i, name in enumerate(names):
    x, y = i % 4, i // 4
    box = (round(xs[x]*atlas.width/1254), round(ys[y]*atlas.height/1254),
           round(xs[x+1]*atlas.width/1254), round(ys[y+1]*atlas.height/1254))
    sprite = atlas.crop(box)
    # Ignore faint disconnected generation speckles when measuring the crop.
    bounds = sprite.getchannel('A').point(lambda a: 255 if a >= 48 else 0).getbbox()
    if not bounds:
        raise ValueError(f'Empty sprite: {name}')
    sprite = sprite.crop(bounds)
    padded = Image.new('RGBA', (sprite.width+8, sprite.height+8))
    padded.paste(sprite, (4,4))
    metadata[name] = {'width':padded.width, 'height':padded.height}
    limits = [128,192,320] if name.startswith('tree') else [32,64,128] if name.startswith('flower') or name in ('grass','mushroom') else [64,128,256]
    for tier, limit in zip(('low','medium','high'), limits):
        folder = target / tier
        folder.mkdir(exist_ok=True)
        exported = padded.copy()
        exported.thumbnail((limit,limit), Image.Resampling.LANCZOS)
        exported.save(folder/f'{name}.webp', lossless=True, method=6)
for tier, edge in [('low',192),('medium',384),('high',768)]:
    ground.resize((edge,edge),Image.Resampling.LANCZOS).save(target/tier/'ground.webp',quality=90,method=6)
Image.open(args.sources/'concept.png').convert('RGB').save(target/'splash.webp',quality=90,method=6)
(target/'dimensions.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
print(f'Exported {len(names)} sprites and ground in low / medium / high.')
