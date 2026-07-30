#!/usr/bin/env python3
"""Normalize CHERRIFT skin strips to the canonical 192 px cell and y=184 pivot."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SKIN_ROOT = ROOT / "assets" / "player" / "skins"
CELL = 192
PIVOT_X = 96
GROUND_Y = 184
STATES = ("idle", "walk", "attack", "ranged", "skill")
DIRECTIONS = ("down", "up", "left", "right")


def sprite_files(folder: Path) -> list[Path]:
    return sorted(
        path
        for state in STATES
        for direction in DIRECTIONS
        for path in folder.glob(f"*_{state}_{direction}.png")
    )


def alpha_box(frame: Image.Image) -> tuple[int, int, int, int] | None:
    return frame.getchannel("A").point(lambda value: 255 if value >= 8 else 0).getbbox()


def shift_archer(frame: Image.Image) -> Image.Image:
    """Move the old y=192 ground line to the canonical y=184 line."""
    box = alpha_box(frame)
    if not box or box[3] <= GROUND_Y:
        return frame
    result = Image.new("RGBA", (CELL, CELL))
    result.alpha_composite(frame, (0, GROUND_Y - box[3]))
    return result


def inset_wuxia(frame: Image.Image) -> Image.Image:
    """Add a safe action margin without changing the cell or its ground pivot."""
    target = 184
    resized = frame.resize((target, target), Image.Resampling.LANCZOS)
    result = Image.new("RGBA", (CELL, CELL))
    result.alpha_composite(
        resized,
        (
            PIVOT_X - round(PIVOT_X * target / CELL),
            GROUND_Y - round(GROUND_Y * target / CELL),
        ),
    )
    # Lanczos can create a one-pixel translucent halo below the pivot.
    result.paste((0, 0, 0, 0), (0, GROUND_Y, CELL, CELL))
    return result


def normalize_strip(path: Path, transform) -> bool:
    image = Image.open(path).convert("RGBA")
    if image.height != CELL or image.width % CELL:
        raise ValueError(f"{path}: expected N×192 by 192, got {image.size}")
    frames = image.width // CELL
    output = Image.new("RGBA", image.size)
    changed = False
    for index in range(frames):
        source = image.crop((index * CELL, 0, (index + 1) * CELL, CELL))
        target = transform(source)
        changed |= target.tobytes() != source.tobytes()
        output.alpha_composite(target, (index * CELL, 0))
    if changed:
        output.save(path, optimize=True)
    return changed


def validate(folder: Path) -> dict:
    files = []
    valid = True
    for path in sprite_files(folder):
        image = Image.open(path).convert("RGBA")
        frames = image.width // CELL
        details = []
        errors = []
        if image.height != CELL or image.width % CELL:
            errors.append(f"invalid sheet size {image.size}")
        for index in range(frames):
            frame = image.crop((index * CELL, 0, (index + 1) * CELL, CELL))
            box = alpha_box(frame)
            if not box:
                errors.append(f"frame {index + 1} is empty")
                continue
            details.append(
                {
                    "frame": index + 1,
                    "alpha_bbox": list(box),
                    "center_x": round((box[0] + box[2]) / 2, 2),
                    "ground_y": box[3],
                    "edge_contact": any(
                        (box[0] == 0, box[1] == 0, box[2] == CELL, box[3] == CELL)
                    ),
                }
            )
            if box[3] > GROUND_Y:
                errors.append(f"frame {index + 1} extends below y={GROUND_Y}")
            if box[0] < 4 or box[2] > CELL - 4:
                errors.append(f"frame {index + 1} has unsafe horizontal margin")
        valid &= not errors
        files.append(
            {
                "file": path.name,
                "frames": frames,
                "size": list(image.size),
                "mode": image.mode,
                "errors": errors,
                "frame_details": details,
            }
        )
    return {
        "skin": folder.name,
        "cell_size": [CELL, CELL],
        "pivot": [PIVOT_X, GROUND_Y],
        "canonical_files": len(files),
        "valid": valid,
        "files": files,
    }


def main() -> None:
    jobs = (("archer_cherry", shift_archer), ("wuxia_sakura_cherry", inset_wuxia))
    for skin, transform in jobs:
        folder = SKIN_ROOT / skin
        files = sprite_files(folder)
        force = False
        if skin == "wuxia_sakura_cherry":
            # One shared decision for the whole skin prevents frame-to-frame
            # scale changes. Once every frame has an 8 px inset, reruns are no-ops.
            force = any(
                (box := alpha_box(frame)) is not None
                and (box[0] < 8 or box[2] > CELL - 8)
                for path in files
                for image in [Image.open(path).convert("RGBA")]
                for index in range(image.width // CELL)
                for frame in [
                    image.crop((index * CELL, 0, (index + 1) * CELL, CELL))
                ]
            )
        changed = sum(
            normalize_strip(path, transform if force or skin != "wuxia_sakura_cherry" else lambda frame: frame)
            for path in files
        )
        report = validate(folder)
        report_path = folder / f"{skin}_validation.json"
        report_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        if not report["valid"]:
            raise SystemExit(f"{skin}: validation failed; see {report_path}")
        print(f"{skin}: {changed} strips normalized, {len(report['files'])} validated")


if __name__ == "__main__":
    main()
