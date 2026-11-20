"""Pack new full-figure Pajama art in the existing 192px strip format."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage

from export_school_whole_frames import match_palette, pack
from export_sport_whole_frames import curves, palette

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/player/cherry_skins/pajama_cherry'
DIRECTIONS = ('down', 'down_right', 'right', 'up_right', 'up', 'up_left', 'left', 'down_left')
ORIGINAL = DIRECTIONS[:5]
MIRRORS = {'up_left': 'up_right', 'left': 'right', 'down_left': 'down_right'}
FPS = {'idle': 3, 'idle2': 3, 'walk': 8, 'attack': 18, 'walk_attack': 8, 'skill': 16}
ACTION_CELLS = {
    'idle': (0, 0, 1, 0, 2, 0),
    'idle2': (0, 2, 3, 3, 2, 0),
    'attack': (4, 5, 6, 6, 6, 7),
    'walk_attack': (8, 8, 9, 10, 10, 11),
    'skill': (12, 13, 13, 14, 14, 15),
}
# The profile and diagonal atlases have four main poses: contact, pass,
# opposite contact, opposite pass. Use the extra slots for stance timing.
FOUR_POSE_WALK = (0, 0, 1, 2, 2, 3)
FORWARD_DIAGONAL_STATES = ('walk', 'attack', 'walk_attack')


def extract_atlas(path, rows, columns):
    rgba = np.asarray(Image.open(path).convert('RGBA'))
    labels, _ = ndimage.label(rgba[..., 3] >= 100)
    sizes = np.bincount(labels.ravel())
    regions = ndimage.find_objects(labels)
    poses = []
    for index in np.flatnonzero(sizes[1:] >= 1500):
        y, x = regions[index]
        box = (slice(max(0, y.start - 3), y.stop + 3),
               slice(max(0, x.start - 3), x.stop + 3))
        assert min(y.start, x.start) > 0 and y.stop < rgba.shape[0] and x.stop < rgba.shape[1], path
        pixels = rgba[box].copy()
        pixels[~ndimage.binary_dilation(labels[box] == index + 1, iterations=3)] = 0
        pose = Image.fromarray(pixels)
        poses.append((y.start, x.start, pose.crop(pose.getchannel('A').getbbox())))
    assert len(poses) == rows * columns, (path, len(poses))
    poses.sort(key=lambda p: p[0])
    return [item[2] for start in range(0, len(poses), columns)
            for item in sorted(poses[start:start + columns], key=lambda p: p[1])]


def register(poses, reference_poses):
    scale = min(153 / np.median([p.height for p in reference_poses]),
                174 / max(p.height for p in poses), 174 / max(p.width for p in poses))
    result = [pack(pose, scale, 96) for pose in poses]
    return result


def palette_grade(source, target):
    return [
        [(x, round(x + np.clip(y - x, -16, 16) * .8)) for x, y in channel]
        for channel in curves(source, target)
    ]


def export(source):
    originals = {}
    sources = []

    def load(name, rows, columns):
        path = source / (name + '.png')
        sources.append({'file': 'source_sheets/' + path.name,
                        'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        return extract_atlas(path, rows, columns)

    for direction in ORIGINAL:
        action = load('act_' + direction, 4, 4)
        if direction in ('right', 'down_right', 'up_right'):
            walk = load('extra_' + direction, 2, 2)
            walk_selection = FOUR_POSE_WALK
        else:
            walk = load('walk_' + direction, 2, 3)
            walk_selection = range(6)
        registered = register(action, action[:4])
        gait = register(walk, walk)
        originals[direction] = (registered, [gait[i] for i in walk_selection])

    target = np.concatenate([palette(action[:4]) for action, _ in originals.values()])
    frames = {}
    for direction, (action, walk) in originals.items():
        action_grade = palette_grade(palette(action[:4]), target)
        walk_grade = palette_grade(palette(walk), target)
        frames['walk', direction] = [match_palette(cell, walk_grade) for cell in walk]
        for state, indexes in ACTION_CELLS.items():
            frames[state, direction] = [match_palette(action[i], action_grade) for i in indexes]
    # The forward diagonal has separate, six-pose strips for each action.
    # Grade them against the same direction's existing idle costume.
    diagonal_palette = palette(frames['idle', 'down_right'])
    for state in FORWARD_DIAGONAL_STATES:
        poses = load('diagonal_' + state, 2, 3)
        cells = register(poses, poses)
        if state == 'walk':
            # Finish the opposite step with its own landing pose.
            opposite_pass = load('diagonal_walk_pass', 1, 2)
            cells[-1] = register(opposite_pass, opposite_pass)[1]
        if state == 'walk_attack':
            # Choose the sequence that casts with the same arm while the
            # supporting foot alternates. Each source sheet has its own scale.
            casting = load('diagonal_walk_attack_alternate', 2, 2)
            ready, reach, release, recover = register(casting, casting)
            cells = [ready, cells[2], reach, release, cells[4], recover]
        grade = palette_grade(palette(cells), diagonal_palette)
        frames[state, 'down_right'] = [match_palette(cell, grade) for cell in cells]

    for direction, original in MIRRORS.items():
        for state in FPS:
            frames[state, direction] = [ImageOps.mirror(cell) for cell in frames[state, original]]

    board = Image.new('RGBA', (8 * 192, 6 * 214), '#242338')
    captions = ImageDraw.Draw(board)
    for row, state in enumerate(FPS):
        for column, direction in enumerate(DIRECTIONS):
            cells = frames[state, direction]
            strip = Image.new('RGBA', (1152, 192))
            for index, cell in enumerate(cells):
                box = cell.getchannel('A').getbbox()
                assert box and min(box[:2]) > 0 and max(box[2:]) < 192, (state, direction, index, box)
                strip.paste(cell, (index * 192, 0))
            assert len({cell.tobytes() for cell in cells}) >= (4 if state.startswith('walk') else 3)
            strip.save(ART / 'sheets192' / f'pajama_cherry_{state}_{direction}.png', optimize=True)
            x, y = column * 192, row * 214
            captions.text((x + 5, y + 4), f'{direction} / {state}', fill='white')
            board.alpha_composite(cells[3 if state == 'attack' else 2], (x, y + 22))
    board.convert('RGB').save(ART / 'source-poses.jpg', quality=91)

    manifest = ART / 'manifest.json'
    config = json.loads(manifest.read_text())
    config.update(buildId='1122-pajama-diagonals', sourceAtlasCount=len(sources),
                  redrawSources=sources, renderer='complete-pose-distance-clock',
                  notes=['All six runtime animation states use newly drawn full figures.',
                         'Left-facing directions mirror the corresponding right-facing sheets.',
                         'Both moving states follow traveled distance.',
                         'The forward diagonals use separate six-pose walk and attack atlases.',
                         'The legacy sources and 256px individual frames are archived.'])
    for state, fps in FPS.items():
        config['states'][state].update(fps=fps, duration=6/fps,
                                       loop=state in ('idle', 'walk', 'walk_attack'))
    manifest.write_text(json.dumps(config, indent=2) + '\n')
    (ART / 'validation.json').write_text(json.dumps({
        'directions': 8, 'states': 6, 'frames': 288, 'sheets': 48,
        'redrawnSheets': 48, 'empty': [], 'clipped': [],
    }, indent=2) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_sheets', type=Path, help='Directory from the redraw package')
    export(parser.parse_args().source_sheets)
