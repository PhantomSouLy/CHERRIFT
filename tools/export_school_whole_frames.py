"""Pack the selected School gait art as whole figures, with no limb edits."""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image, ImageOps

from export_sport_whole_frames import extract, ear, palette, curves

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/player/cherry_skins/school_uniform_cherry'
ID = 'school_uniform_cherry'
SOURCE = ART / 'sources/whole-gait-v1'
STATES = ('idle', 'idle2', 'walk', 'attack', 'walk_attack', 'skill')
DIRS = ('down', 'down_right', 'right', 'up_right', 'up', 'up_left', 'left', 'down_left')
MIRRORS = {'left': 'right', 'up_left': 'up_right', 'down_left': 'down_right'}
MOVING = ('walk', 'walk_attack')


def sheet(state, direction):
    return ART / 'sheets192' / f'{ID}_{state}_{direction}.png'


def unpack(path):
    strip = Image.open(path).convert('RGBA')
    assert strip.size == (1152, 192), path
    return [strip.crop((192 * i, 0, 192 * (i + 1), 192)) for i in range(6)]


def pack(figure, scale, head_x):
    width, height = (round(v * scale) for v in figure.size)
    figure = figure.resize((width, height), Image.Resampling.LANCZOS)
    _, x = ear(figure)
    y = np.where(np.array(figure.getchannel('A')) >= 160)[0].max() + 1
    cell = Image.new('RGBA', (192, 192))
    left = max(4, min(188 - width, round(head_x - x)))
    top = 184 - int(y)
    assert top >= 4 and top + height < 192, (width, height, top)
    cell.paste(figure, (left, top))
    return cell


def main():
    frames = {(s, d): unpack(sheet(s, d)) for s in STATES for d in DIRS}
    changed = set()
    sources = []
    geometry = {s: {} for s in STATES}
    colors = {s: {} for s in MOVING}
    selection = json.loads((SOURCE / 'selection.json').read_text())
    for direction, options in selection.items():
        head_x = np.median([ear(f)[1] for f in frames['idle', direction]])
        packed = []
        for filename, columns in options['sources']:
            source = SOURCE / filename
            figures = extract(source, columns)
            sources.append({'file': source.relative_to(ROOT).as_posix(),
                            'sha256': hashlib.sha256(source.read_bytes()).hexdigest()})
            scale = min(154 / np.median([f.height for f in figures]),
                        174 / max(f.width for f in figures),
                        172 / max(f.height for f in figures))
            packed.extend(pack(figure, scale, head_x) for figure in figures)
        for state, indexes in options['states'].items():
            assert state in MOVING and len(indexes) == 6
            frames[state, direction] = [packed[i] for i in indexes]
            changed.add((state, direction))
    for mirror, original in MIRRORS.items():
        for state in MOVING:
            if (state, original) in changed:
                frames[state, mirror] = [ImageOps.mirror(f) for f in frames[state, original]]
                changed.add((state, mirror))
    for direction in DIRS:
        idle = frames['idle', direction]
        head_x = np.median([ear(f)[1] for f in idle])
        for state in STATES:
            series = frames[state, direction]
            if (state, direction) in changed:
                strip = Image.new('RGBA', (1152, 192))
                for i, cell in enumerate(series):
                    strip.paste(cell, (192 * i, 0))
                strip.save(sheet(state, direction), optimize=True)
                colors[state][direction] = curves(palette(series), palette(idle))
            if state in MOVING:
                offsets = []
                for cell in series:
                    _, x = ear(cell)
                    # The sole is already aligned. Use the ear center to keep
                    # the entire figure steady as the planted foot changes.
                    root = 96 + x - head_x
                    offsets.append([28, 184, round(float(root), 3)])
                geometry[state][direction] = offsets
            else:
                geometry[state][direction] = [[28, 184, 96]] * 6
            for i, cell in enumerate(series):
                box = cell.getchannel('A').getbbox()
                assert box and min(box[:2]) > 0 and max(box[2:]) < 192, (state, direction, i, box)
    data = ROOT / 'src/cherrift_school_data.js'
    data.write_text('/* School authored pose registration and fixed gait palette. */\n'
                    + 'Object.assign(window.CHERRIFT_CHERRY_GEOMETRY ||= {},'
                    + json.dumps({ID: geometry}, separators=(',', ':')) + ');\n'
                    + 'window.CHERRIFT_SCHOOL_PALETTE='
                    + json.dumps(colors, separators=(',', ':')) + ';\n')
    manifest = ART / 'manifest.json'
    config = json.loads(manifest.read_text())
    config.update(buildId='1119-school-whole1', wholeGaitSources=sources,
                  renderer='complete-pose-distance-clock')
    config['notes'] = [
        'Walk and Walk Attack use complete School poses in eight directions.',
        'Only the whole sprite is registered. No limb masks, optical flow or gait deformation.',
        'Both moving states follow travel independently of the projectile event.',
        'Standing art and Pink Burst VFX are retained.',
    ]
    for state in MOVING:
        config['states'][state].update(runtimeDuration=.75, loop=True)
    manifest.write_text(json.dumps(config, indent=2) + '\n')
    (ART / 'validation.json').write_text(json.dumps({
        'directions': 8, 'states': 6, 'sheets': 48, 'frames': 288,
        'repackedStrips': len(changed), 'empty': [], 'clipped': [],
    }, indent=2) + '\n')
    print('Checked 288 cells across 48 strips.')


if __name__ == '__main__':
    main()
