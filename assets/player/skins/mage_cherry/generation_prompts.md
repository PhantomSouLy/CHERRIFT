# Mage Cherry generation prompts

These are the reproducible prompt specifications used with the supplied Mage
Cherry splash art as the detailed design reference and the transparent chibi
image as the front-view sprite reference.

## Shared character lock

Create the same adult Mage Cherry in every frame: long peach-pink wavy hair,
narrow brighter pink front accent strand, loop ahoge, tall upright pink rabbit
ears with white inner-base tufts, warm brown-golden eyes, white high-collar
blouse and ruffled short white dress with pale-gold hem ornaments, dusty-rose
capelet and long split pink mantle with gold piping, dark-brown double belts,
brown spellbook with a gold magic-circle emblem at her right hip, white ruffled
socks, and brown lace-up boots with pink bows. She carries exactly one tall
dark-brown wooden staff with a crescent-shaped top, faceted glowing pink crystal
orb, gold fittings and one dangling pink crystal. No sword and no duplicate
staff. Preserve her adult identity, face, outfit, staff, book, proportions,
palette and polished 2D anime chibi/JRPG rendering in every frame.

Generate each source as one horizontal strip on a perfectly flat uniform
`#00ff00` chroma-key background. Use evenly spaced, non-touching full-body
frames with a common feet baseline and generous padding. No scenery, floor,
shadow, reflection, text, labels, numbers, grid, borders, dividers or watermark.

## Idle — 4 frames per direction

Four-frame seamless subtle loop: neutral staff stance, gentle breathing rise,
natural blink or ear/cape settle, and return. The staff remains properly gripped
and stable. Generate Down/front, Up/back and Right/profile; derive Left through
exact per-cell mirroring.

## Walk — 6 frames per direction

Six-frame real alternating walk cycle using contact, passing and opposite
contact poses. Add restrained hair, ear, mantle, spellbook and staff secondary
motion. Carry the staff slightly lifted so it does not drag. Generate Down,
Up and Right; mirror Right per cell for Left.

## Ranged Attack — 6 frames per direction

Stationary single-shot sequence: ready, aim staff, form one small pink charge in
the staff crystal, full-charge anticipation, release exactly one compact round
pink-magenta orb with a short trail, recovery. Feet, legs and lower body remain
fixed; only the staff arm, shoulders and slight upper body move. No stepping,
extra projectile, beam, lightning or explosion. Generate Down, Up and Right;
mirror Right per cell for Left.

## Skill — Magical Shot — 6 frames per direction

Stationary five-projectile sequence: ready, gather energy, exactly five small
separate pink-magenta spheres appear around the staff crystal, the same five
align and brighten, exactly five equal round spheres release in a symmetric
fan/cone, recovery. The five paths begin together and spread outward. Five and
only five projectiles: not four, six or seven. Keep all feet fixed. No beam,
lightning, explosion, large aura, floor circle or misleading extra particles.
Generate Down, Up and Right; mirror Right per cell for Left.

## Post-processing contract

Remove the chroma background to real RGBA alpha. Normalize every frame into a
192×192 cell at pivot x=96 and ground y=184. Preserve detached projectiles and
charge spheres, inset release VFX when needed so no glow is clipped, and keep
all content inside each cell. Validate mode, dimensions, alpha, cell bounds,
pivot, ground line and exact Left/Right mirror equality.
