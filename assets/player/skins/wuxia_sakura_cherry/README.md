# Wuxia Sakura Cherry sprite pack

Game-ready RGBA sprite sheets for the new `wuxia_sakura_cherry` skin, based on
the supplied Wuxia sheets and Sakura dual-sword splash art.

## Canonical set

- Cell size: 192×192 px
- Pivot: x=96, ground y=184
- Idle: 4 frames, 768×192 px, suggested 3 fps
- Walk: 6 frames, 1152×192 px, suggested 8 fps
- Attack: 6 frames, 1152×192 px, suggested 18 fps
- Skill: 6 frames, 1152×192 px, suggested 16 fps
- Directions: down, up, left, right
- Format: true RGBA PNG with a fully transparent background

The supplied Idle, Walk and Skill art was repacked frame by frame. Detached
generation scraps and content crossing nominal cell boundaries were removed,
then every pose was recentered and grounded without changing the design. A
uniform safe inset keeps the wide swords, hair and baked-in slash effects away
from browser/canvas sampling edges in every direction.

## Combat animation

### Attack — dual-sword combination

The normal Attack uses both matching pink jian swords:

1. ready guard;
2. dual-sword wind-up;
3. first diagonal slash;
4. counter-slash with the second sword;
5. crossed dual-sword X finisher;
6. recovery guard.

Only narrow blade-local motion streaks are included. The Left Attack sheet is
an exact per-cell mirror of Right, preserving sword length and animation timing.

### Skill — Sakura spin slash

Cherry performs a full spinning cut around herself. The wide pink circular
sword arc, glow, and sakura petals are intentionally baked into the Skill
frames because they define the ability's silhouette and hit timing.

## Character lock

- Long chestnut/rose-brown hair with a narrow pink front accent strand
- One upright rabbit ear and one softly drooping rabbit ear
- White and sakura-pink wuxia battle dress with gold trim
- Matching short pink-glowing jian sword in each hand
- Warm golden-brown eyes

## Validation

`wuxia_sakura_cherry_validation.json` records checks for all 16 canonical
files. Every frame is non-empty, centered on x=96, grounded at y=184, and stays
inside its 192×192 cell.
