# Gunner Cherry

Rare, ranged, Cute affinity. Fires while moving at full speed. Normal attacks
alternate pistols, target the nearest enemy, and respect projectile-count and
attack-speed upgrades. Bullets have a small pink glow.

**Bullet Ballet:** 0.8-second spin, 8-second base cooldown. From 0.10 to 0.65
seconds, 24 opposing pairs sweep through a full turn (48 bullets, 35% ATK each).
The cast uses simulation time, pauses with gameplay, and belongs to the current
player/run. There is no automatic unlock; the skin joins the Rare chest/shop pool.

Original supplied sheets remain unchanged. `tools/prepare_gunner_sheets.py`
exports `strips/` using their existing alpha channels. Every exported cell is
192 × 192, with an 8-pixel margin, pivot x=96 and ground y=184.

| Source | Frames per row | Row order |
| --- | --- | --- |
| idle.png | 4 | down, up, right, left |
| walk.png | 6 | down, up, left, right |
| attack_idle.png | 6 | down, up, right, left |
| attack_walk.png | 6 | down, up, left, right |
| skill.png | 8 | down, up, left, right |

The idle and middle skill frames supply temporary skin/skill thumbnails. The
supplied splashart is used in the selector. No generated replacement artwork is
used. Runtime integration lives in `src/cherrift_gunner.js`.
