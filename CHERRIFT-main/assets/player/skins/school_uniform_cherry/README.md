# School Uniform Cherry — Hybrid Common Skin

## Gameplay identity

- Rarity: `Common`
- Type: `Hybrid`
- Passive: `+1% ATK Bonus`, `+1% HP Bonus`
- Attack: standard Base Cherry ranged attack with a pink casting cue
- Skill: `Pink Burst`
  - damages and knocks enemies backward
  - grants `+5% Movement Speed` for `1 second`

## Sprite format

- Cell size: `192 × 192 px`
- Pivot: `x=96`, ground line `y=184`
- Background: true RGBA transparency (`alpha=0`)
- Idle: `4` frames per direction
- Walk, Attack, Skill: `6` frames per direction
- Directions: `down`, `up`, `left`, `right`
- Left-facing sheets are exact per-cell mirrors of the right-facing sheets.

## Master sheet row order

1. Idle Down
2. Idle Up
3. Idle Left
4. Idle Right
5. Walk Down
6. Walk Up
7. Walk Left
8. Walk Right
9. Attack Down
10. Attack Up
11. Attack Left
12. Attack Right
13. Skill Down
14. Skill Up
15. Skill Left
16. Skill Right

The master sheet is `1152 × 3072 px`; unused cells at the end of Idle rows are transparent.
