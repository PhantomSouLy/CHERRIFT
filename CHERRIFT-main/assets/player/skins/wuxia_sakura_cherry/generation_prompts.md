# Attack generation prompt set

Built-in image generation was used with the supplied Wuxia sprite sheets as
visual references. Each generated strip used a uniform `#00ff00` chroma-key
background, which was removed locally before 192×192 cell normalization.

## Shared prompt

Create one horizontal production sprite sheet containing exactly six equal
square panels in a single row for Wuxia Sakura Cherry's normal dual-sword
attack. Keep the same full-body adult chibi bunny-woman, scale, costume, hair,
rabbit ears, anatomy, and matching pink jian swords in every panel.

Sequence:

1. ready guard with both swords low;
2. dual-sword wind-up;
3. first diagonal slash with one sword while the second stays visibly held;
4. counter-slash with the other sword while the first stays visibly held;
5. crossed dual-sword X finishing slash with both blades clearly visible;
6. recovery guard.

Character lock: long chestnut/rose-brown hair, narrow pink front accent strand,
one upright and one softly drooping rabbit ear, ornate white and sakura-pink
wuxia battle dress with gold trim, layered skirt, white fitted boots/stockings,
detached pink-white sleeves, and warm golden-brown eyes. Exactly two arms, two
hands, two legs, and one matching short glowing pink jian sword in each hand.

Use crisp polished chibi anime game-sprite rendering with fine pixel-art-like
edges. Add only narrow blade-local pink motion streaks. Do not add the Skill's
large circular ring or petal cloud. Keep six separated poses with generous
padding, a consistent baseline, and no cropped or cross-panel content.

Use a perfectly flat solid `#00ff00` chroma-key background with no shadow,
gradient, texture, floor, reflection, text, border, or watermark. Avoid extra
limbs, missing swords, fused hands, costume drift, anatomy drift, or camera
rotation.

## Direction overrides

- **Down:** face directly toward the viewer in all six panels.
- **Up:** face directly away from the viewer; keep the back of the head, hair,
  costume, legs, and both sword grips/blades visible.
- **Right:** remain in a screen-right profile throughout; keep both swords
  distinguishable despite overlap.
- **Left:** exact per-cell mirror of the approved Right strip.
