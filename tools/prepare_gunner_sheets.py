"""Export the supplied Gunner atlases as canonical game strips (Pillow required).

Original artwork and alpha are preserved. Rows are explicitly mapped because
the idle/standing attack atlases swap left/right relative to the other sheets.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "assets/player/skins/gunner_cherry"
SPECS = {
    "idle": ("idle.png", 4, ("down", "up", "right", "left")),
    "walk": ("walk.png", 6, ("down", "up", "left", "right")),
    "attack": ("attack_idle.png", 6, ("down", "up", "right", "left")),
    "attackMove": ("attack_walk.png", 6, ("down", "up", "left", "right")),
    "skill": ("skill.png", 8, ("down", "up", "left", "right")),
}


def main():
    output = ROOT / "strips"
    output.mkdir(exist_ok=True)
    manifest = {"id": "gunner_cherry", "frame": {"width": 192, "height": 192},
                "pivot": {"x": 96, "ground_y": 184}, "states": {}}
    for state, (filename, frames, rows) in SPECS.items():
        source = Image.open(ROOT / filename).convert("RGBA")
        assert source.getchannel("A").getextrema()[0] == 0, filename
        paths = {}
        for row, direction in enumerate(rows):
            strip = Image.new("RGBA", (192 * frames, 192))
            for column in range(frames):
                box = (round(column * source.width / frames), round(row * source.height / 4),
                       round((column + 1) * source.width / frames), round((row + 1) * source.height / 4))
                cell = source.crop(box).resize((176, 176), Image.Resampling.LANCZOS)
                assert cell.getchannel("A").getbbox(), (state, direction, column)
                # Compositing removes hidden RGB in fully transparent pixels.
                strip.alpha_composite(cell, (column * 192 + 8, 8))
            path = output / f"gunner_cherry_{state}_{direction}.png"
            strip.save(path, optimize=True)
            paths[direction] = str(path.relative_to(ROOT)).replace("\\", "/")
        manifest["states"][state] = {"source": filename, "frames": frames,
                                      "sourceRows": list(rows), "dirs": paths}
    # Existing-art thumbnails: first idle cell and a middle spin cell.
    for state, frame, name in [("idle", 0, "gunner_cherry_icon.png"),
                               ("skill", 3, "gunner_cherry_skill_icon.png")]:
        strip = Image.open(output / f"gunner_cherry_{state}_down.png")
        strip.crop((192 * frame, 0, 192 * (frame + 1), 192)).save(ROOT / name)
    (ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("Exported 20 RGBA strips, 2 artwork thumbnails and manifest.")


if __name__ == "__main__":
    main()
