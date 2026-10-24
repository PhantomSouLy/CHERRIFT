#!/usr/bin/env python3
"""Build UI-only WebP art from original Cherry PNGs; requires Pillow.
Run: python tools/prepare_cherry_ui_art.py [--root /path/to/CHERRIFT]
Originals and gameplay sprite sheets are never modified.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

FACES = {
    'archer': (.55, .22, .44), 'base': (.50, .24, .44),
    'beastclaw': (.53, .23, .44), 'fairy': (.49, .22, .44),
    'gunner': (.49, .24, .44), 'mage': (.53, .22, .44),
    'ninja': (.56, .25, .44), 'sakura_dancer': (.54, .26, .44),
    'succubus': (.49, .24, .44), 'warrior': (.56, .33, .28),
}

def build(root):
    source = root / 'assets/ui/skins/cherry_ui_skins'
    output = source / 'optimized'
    output.mkdir(parents=True, exist_ok=True)
    records = []

    def encode(image, original, stem, role, edge, budget, crop=None):
        image = ImageOps.exif_transpose(image).copy()
        if crop:
            image = image.crop(crop)
        image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
        target = output / (stem + '.webp')
        for quality in (82, 78, 74, 70, 66):
            image.save(target, 'WEBP', quality=quality, method=6, alpha_quality=95)
            if target.stat().st_size <= budget:
                break
        while target.stat().st_size > budget:
            image.thumbnail((int(image.width * .85), int(image.height * .85)), Image.Resampling.LANCZOS)
            quality = 78
            image.save(target, 'WEBP', quality=quality, method=6, alpha_quality=95)
        with Image.open(target) as decoded:
            decoded.load()
            if image.mode == 'RGBA':
                assert decoded.mode == 'RGBA' and decoded.getchannel('A').getextrema()[0] == 0, target
        records.append(dict(source=original.name, file=target.name, role=role,
                            width=image.width, height=image.height, quality=quality,
                            bytes=target.stat().st_size, sourceBytes=original.stat().st_size,
                            sourceSha256=hashlib.sha256(original.read_bytes()).hexdigest(),
                            **({'crop': list(crop)} if crop else {})))

    for path in sorted(source.glob('*.png')):
        transparent = '_transp_' in path.stem or '_trans_' in path.stem
        # Normalize Warrior's original "trans" spelling in generated assets.
        stem = path.stem.replace('_trans_', '_transp_')
        with Image.open(path) as image:
            encode(image, path, stem, 'cutout' if transparent else 'splash',
                   1024 if transparent else 1280, 240_000 if transparent else 320_000)
    for skin, (cx, cy, scale) in FACES.items():
        path = source / f'{skin}_cherry_1.png'
        with Image.open(path) as image:
            w, h = image.size
            size = round(w * scale)
            x, y = round(w * cx - size / 2), round(h * cy - size / 2)
            encode(image, path, f'{skin}_cherry_icon_1', 'icon', 256, 30_000,
                   (x, y, x + size, y + size))
            encode(image, path, f'{skin}_cherry_thumb_1', 'thumbnail', 384, 45_000)
    total_source = sum(p.stat().st_size for p in source.glob('*.png'))
    total_output = sum(r['bytes'] for r in records)
    manifest = dict(version=1, sourceBytes=total_source, outputBytes=total_output,
                    savingPercent=round(100*(1-total_output/total_source),2), assets=records)
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({k:v for k,v in manifest.items() if k!='assets'}, indent=2))
    print(f'{len(records)} images; largest: {max(r["bytes"] for r in records)} bytes')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    build(parser.parse_args().root)
