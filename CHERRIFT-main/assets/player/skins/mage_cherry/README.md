# Mage Cherry sprite pack

Game-ready RGBA sprite sheets for `mage_cherry`, based on the supplied Mage
Cherry splash art and clean chibi character reference.

## Canonical set

- Cell size: 192×192 px
- Pivot: x=96, ground y=184
- Idle: 4 frames, 768×192 px, suggested 3 fps
- Walk: 6 frames, 1152×192 px, suggested 8 fps
- Ranged Attack: 6 frames, 1152×192 px, suggested 15 fps
- Skill: 6 frames, 1152×192 px, suggested 16 fps
- Directions: down, up, left, right
- Format: true RGBA PNG with a fully transparent background

All Left sheets are exact per-cell mirrors of their Right counterparts. Walk
uses a real alternating step cycle; the staff, cape, hair and spellbook have
controlled secondary motion.

## Combat animation

### Ranged Attack — single magical shot

Cherry aims the crescent staff, charges its crystal, fires one compact pink
magical projectile, then recovers. Feet and legs remain planted throughout the
attack. Trigger the gameplay projectile on frame 5. In the Up sheet the shot
leaves through the top of the cell, so its departure is represented by the
bright release state of the raised staff crystal.

### Skill — Magical Shot

Cherry gathers and releases exactly five separately readable pink magical
spheres in a fan/cone. Frame 5 is the projectile-spawn frame.

Recommended gameplay targeting:

- Multiple enemies: the five projectiles spread among valid targets.
- Exactly one enemy: all five home toward that same enemy.
- No enemy: continue along the initial visual fan directions.

The changing homing path belongs to gameplay code; the sprite sheets show the
shared five-projectile launch animation.

## Gameplay metadata

- Passive: +5% HP recovery
- Ranged projectile count: 1
- Skill projectile count: 5
- Skill spread: symmetric fan/cone
- Homing behavior: all five may converge on one target

## Character lock

- Long peach-pink wavy hair with a brighter pink front accent strand
- Tall upright pink rabbit ears with white inner-base tufts and loop ahoge
- Warm brown/golden eyes
- White high-collar blouse and short ruffled white dress with pale-gold trim
- Dusty-rose capelet and long split pink mantle with gold piping
- Dark-brown double belts and gold-emblem spellbook at the right hip
- White ruffled socks and brown lace-up boots with pink bows
- Tall dark wooden staff with a crescent top, pink crystal orb and dangling gem
- No sword and no duplicate staff

## Compatibility aliases

`compatibility_cherrift/` contains `mage_cherry_attack_<direction>.png` aliases
of the canonical Ranged sheets for loaders that call the normal attack state
`attack`.

## Validation

`mage_cherry_validation.json` records checks for all 16 canonical files. Every
frame is non-empty, stays inside its cell, follows the specified pivot/ground
contract, and uses a genuinely transparent background. Left/Right mirror
equality is also verified.
