# ImageGen prompt set

Mode: built-in ImageGen, transparent-background generation. No CLI/API fallback.

## Character turnaround

Generate a production turnaround for CHERRIFT's adult Legendary Succubus Cherry.
Use the four existing Succubus PNGs for character design and the Base Cherry
sprite strip for the polished painted chibi style. Preserve loose long peach-rose
hair, brown eyes with tiny heart highlights, long slim bunny ears, one ahoge,
black/wine-magenta rose-and-heart gothic dress, gold heart ornaments, dark opaque
stockings, heart-jewel boots, medium folded bat wings, and a black tail with a
jeweled heart tip. Nonsexual game presentation, modest closed opaque bodice.
No horns, cat ears, ponytail, weapons or redesigned costume.
Six full-body figures, three columns by two rows: front/down, front-right,
right profile, back-right, back/up, front/down again. Fixed slightly overhead
RPG camera, identical proportions and head-to-sole height. True transparent RGBA,
no background, VFX, text, grid or ground shadows. Reference for all animation atlases.

## Idle atlases – one per original direction

Same character and costume as the turnaround. Six columns by three rows.
Fixed head size, pelvis position, soles baseline and camera. Every complete
figure fits inside its cell including ears, hair, wings, tail and boots.
Row 1: six-frame default idle, calm breathing and hair/ribbon settling, feet planted.
Row 2: neutral, elegant small wave, soft wink, finish wave, lower hand, neutral.
Row 3: neutral, wings begin stretching, medium wing stretch and curling heart-tail,
wings relax, tail returns, neutral. No detached particles or painted VFX.

## Action atlases – one per original direction

Same identity, costume and rendering. Six columns by five rows. Real successive
poses, not six copies. Both boots remain readable, no whole-body hopping.
Row 1: grounded walk, left contact, left support/right passing, right swinging,
right contact/left back, right support/left passing, left swinging into frame one.
Row 2: planted ranged attack, ready, draw arm in, prepare hand/claw sweep,
release outward, follow through, recover. Empty hands; no projectile painted in.
Row 3: planted melee, ready, raise hand, first diagonal claw gesture, cross guard,
second claw gesture, recover. No effect painted in.
Row 4: same alternating walk cycle and a ranged upper-body gesture together.
Row 5: Soul Drain character cast, ready, hands toward heart gem, arms open,
modest wing opening, lower/soften hands, ready. Grounded boots, no effects.

## Direction constraints

- down: front view, directly toward the bottom of the screen.
- down_right: front-right three-quarter view, heading bottom-right.
- right: right profile, nose toward the right edge, one near eye.
- up_right: back-right, heading away toward top-right; no looking over shoulder.
- up: back view, heading away toward the top; no visible face or eyes.

The prompt also requested one soft pastel-pink front forelock on the character's
right side, matching Cherry's identity constraints. Generated source atlases are
retained for inspection and later targeted refinements. Final export performs
segmentation, uniform scaling, fixed-body registration and mirrored directions;
it does not paint or synthesize additional character pixels.
