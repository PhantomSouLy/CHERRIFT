"""Measure the transparent portrait aperture without changing source artwork."""
from pathlib import Path
from collections import deque
import json
from PIL import Image, ImageDraw
import numpy as np

root = Path(__file__).resolve().parents[1]
geometry = {}
for path in sorted((root / 'assets/player/frames').glob('*.png')):
    image = Image.open(path).convert('RGBA').resize((160, 160))
    alpha = np.array(image)[:, :, 3]
    yy, xx = np.where(alpha > 60)
    best = (0, 80, 80)
    for y in range(55, 101):
        for x in range(65, 96):
            radius = float(np.sqrt(((xx-x)**2+(yy-y)**2).min()))
            if radius > best[0]:
                best = (radius, x, y)
    # Flood the enclosed aperture: many rings are elliptical, so an inscribed
    # circle alone leaves a visible crescent of empty background at one side.
    radius, x, y = best
    todo, seen, aperture = deque([(x,y)]), set(), []
    while todo:
        px, py = todo.popleft()
        if (px,py) in seen or not (0 <= px < 160 and 0 <= py < 160): continue
        seen.add((px,py))
        if alpha[py,px] >= 80: continue
        aperture.append((px,py))
        todo.extend([(px+1,py),(px-1,py),(px,py+1),(px,py-1)])
    left, right = min(p[0] for p in aperture), max(p[0] for p in aperture)
    top, bottom = min(p[1] for p in aperture), max(p[1] for p in aperture)
    assert left > 0 and top > 0 and right < 159 and bottom < 159, path
    x, y = (left+right)/2, (top+bottom)/2
    scale = .58 / ((right-left+1)/160)
    photo_height = 60 * (bottom-top+1)/(right-left+1)
    geometry[path.stem] = dict(width=round(scale*100, 3), left=round(50-x/160*scale*100, 3), top=round(50-y/160*scale*100, 3), **{'portrait-height':round(photo_height,3),'portrait-top':round(50-photo_height/2,3)})

css = ['/* Measured portrait apertures; generated with tools/inspect_frame_geometry.py. */']
for name, values in geometry.items():
    css.append(f'.prebeta-avatar[data-frame-id="{name}"]' + '{' + ';'.join(f'--frame-{key}:{value}%' for key, value in values.items()) + '}')
(root/'assets/cherrift_frame_geometry.css').write_text('\n'.join(css)+'\n', encoding='utf-8')
(root/'audit-output/frame-geometry.json').write_text(json.dumps(geometry, indent=2), encoding='utf-8')
# A contact sheet makes aperture alignment reviewable without a live account.
sheet = Image.new('RGB', (1200, 4*250), '#21132b')
draw = ImageDraw.Draw(sheet)
portrait = Image.open(root/'assets/ui/skins/cherry_ui_skins/optimized/base_cherry_icon_1.webp').convert('RGBA').resize((90,90))
mask = Image.new('L', (90,90)); ImageDraw.Draw(mask).ellipse((0,0,89,89),fill=255)
for index, (name, values) in enumerate(geometry.items()):
    x, y = index%5*240+45, index//5*250+40
    photo_height=round(values['portrait-height']/100*150)
    photo=portrait.resize((90,photo_height))
    photo_mask=mask.resize((90,photo_height))
    sheet.paste(photo,(x+30,y+round(values['portrait-top']/100*150)),photo_mask)
    width = round(values['width']/100*150)
    frame = Image.open(root/f'assets/player/frames/{name}.png').convert('RGBA').resize((width,width))
    sheet.paste(frame,(x+round(values['left']/100*150),y+round(values['top']/100*150)),frame)
    draw.text((index%5*240+30,index//5*250+224),name,fill='white')
sheet.save(root/'audit-output/frame-alignment-after.jpg',quality=92)
print(f'Measured {len(geometry)} frame apertures.')
