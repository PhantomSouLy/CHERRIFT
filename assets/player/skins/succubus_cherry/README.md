# Succubus Cherry sprite pack

Game-ready RGBA sprite sheets based on `succubus_cherry_splashart(1).png`.

## Canonical set

- Cell size: 192×192 px
- Pivot: x=96, ground y=184
- Idle: 4 frames, 768×192 px, 3 fps
- Walk: 6 frames, 1152×192 px, 8 fps
- Melee: 6 frames, 1152×192 px, suggested 18 fps
- Ranged: 6 frames, 1152×192 px, suggested 15–16 fps
- Directions: down, up, left, right
- Format: true RGBA PNG with fully transparent background
- VFX: not baked into character sheets

The Left sheets are exact per-cell mirrors of the Right sheets. Frame order is
preserved, so the character design and animation timing cannot drift between
horizontal directions.

## CHERRIFT compatibility

The `compatibility_cherrift` folder contains filename aliases:

- `melee` → `attack`
- `ranged` → `skill`

The current CHERRIFT Succubus implementation already uses separate code-drawn
crimson claw and Soul Drain effects. Keep those effects separate from these
character sheets.

## Validation

`succubus_cherry_validation.json` records the checks for all 16 canonical files.
Every frame is non-empty, centered on x=96, grounded at y=184, and stays inside
its 192×192 cell.
