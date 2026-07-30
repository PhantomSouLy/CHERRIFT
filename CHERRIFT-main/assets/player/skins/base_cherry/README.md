# Default / Basic Cherry sprite pack

Game-ready RGBA sprite sheets for CHERRIFT's `base_cherry` skin. The design
follows the supplied Default Cherry references and the previous repository
assets while using a cleaner, consistent animation set.

## Canonical set

- Cell size: 192×192 px
- Pivot: x=96, ground y=184
- Idle: 4 frames, 768×192 px, suggested 3 fps
- Walk: 6 frames, 1152×192 px, suggested 8 fps
- Ranged: 6 frames, 1152×192 px, suggested 16 fps
- Dash: 6 frames, 1152×192 px, suggested 18 fps
- Directions: down, up, left, right
- Format: true RGBA PNG with a fully transparent background
- VFX: no orb, projectile, glow, petals, or speed trail baked into the sheets

The Left sheets are exact per-cell mirrors of the Right sheets. Frame order is
preserved, preventing design and timing drift between horizontal directions.

## Character lock

- Long peach-pink hair with a narrow light-pink front accent strand
- Loop ahoge and tall upright pink bunny ears with white base tufts
- Pink cable-knit cardigan, white blouse, dark-pink ribbon, pink A-line dress
- White knee socks and dusty-pink lace-up ankle shoes
- Deep warm brown eyes with an amber lower gradient
- Tiny 3×3 px pale-pink heart catchlight centered in each visible iris

## CHERRIFT compatibility

The `compatibility_cherrift` folder contains filename aliases matching the old
repository convention:

- `ranged` → `attack`
- `dash` → `skill_dash`

The Dash strip contains only the character animation because CHERRIFT renders
the dash effect separately. This avoids VFX clipping or leaking across cells.

## Validation

`base_cherry_validation.json` records checks for all 16 canonical files. Every
frame is non-empty, centered on x=96, grounded at y=184, and stays inside its
192×192 cell. `eye_detail_preview.png` shows the brown iris and mini-heart at
nearest-neighbour pixel scale.
