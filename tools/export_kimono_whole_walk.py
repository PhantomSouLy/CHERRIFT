"""Fit the approved full-figure walking poses into the Kimono sprite strips."""
import hashlib
import json

from pathlib import Path
from PIL import Image, ImageOps
import numpy as np

from export_school_whole_frames import match_palette, pack, unpack
from export_sport_whole_frames import curves, ear, extract, palette

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/player/cherry_skins/kimono_cherry'
SOURCES = ART / 'sources/whole-walk-v1'
POSE_ORDER = (1, 0, 0, 3, 2, 2)


def sheet(state, direction):
    return ART / 'sheets192' / f'kimono_cherry_{state}_{direction}.png'


def main():
    sources = []
    for direction, mirror in (('right', 'left'), ('up_right', 'up_left'), ('down_right', 'down_left')):
        source = SOURCES / f'{direction}.png'
        figures = extract(source, cols=2)
        idle = unpack(sheet('idle', direction))
        head_x = np.median([ear(frame)[1] for frame in idle])
        scale = 154 / max(figure.height for figure in figures)
        poses = [pack(figure, scale, head_x) for figure in figures]
        color_curves = curves(palette(poses), palette(idle))
        if direction == 'down_right':
            correction = SOURCES / 'down_right-forward.png'
            corrected_figures = extract(correction, cols=2)[2:]
            poses[2:] = [pack(figure, scale, head_x) for figure in corrected_figures]
            sources.append({
                'file': correction.relative_to(ROOT).as_posix(),
                'sha256': hashlib.sha256(correction.read_bytes()).hexdigest(),
                'size': list(Image.open(correction).size),
                'sourceCells': [2, 3],
            })
        strip = Image.new('RGBA', (1152, 192))
        for slot, pose in enumerate(POSE_ORDER):
            strip.paste(poses[pose], (slot * 192, 0))
        balanced = match_palette(strip, color_curves)
        balanced.save(sheet('walk', direction), optimize=True)
        mirrored = Image.new('RGBA', balanced.size)
        for slot in range(6):
            left = slot * 192
            cell = balanced.crop((left, 0, left + 192, 192))
            mirrored.paste(ImageOps.mirror(cell), (left, 0))
        mirrored.save(sheet('walk', mirror), optimize=True)
        sources.append({
            'file': source.relative_to(ROOT).as_posix(),
            'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'size': list(Image.open(source).size),
            'frameOrder': list(POSE_ORDER),
        })

    manifest_path = ART / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['buildId'] = '1119-kimono-whole4'
    manifest['renderer'] = 'complete-pose-distance-clock'
    manifest['wholeWalkSources'] = sources
    manifest['notes'] = [
        'Walk and Walk Attack use their own complete Kimono strips in eight directions.',
        'Side and diagonal Walk use compact full-figure steps. Left views mirror right views.',
        'Forward-diagonal contacts and passing poses use smaller sandals and share the existing walk cadence.',
        'The second half of the forward-diagonal cycle uses a narrow forward step under the obi.',
        'Both moving states share the stride clock. Attack facing follows the target until release.',
        'Existing Common Healing and Kimono passive use the existing combat rules.',
    ]
    for state in ('walk', 'walk_attack'):
        manifest['states'][state].update(runtimeDuration=.75, loop=True)
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
