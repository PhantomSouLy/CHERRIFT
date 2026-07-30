# Asset lista / csere útmutató

A fájlnevek maradjanak ezek, így a játék automatikusan beolvassa őket.

## Player

`assets/player/cherry_sprite_sheet.png`

Javasolt sheet szerkezet:

- 4 oszlop
- 4 sor
- 128×128 px frame
- true RGBA PNG / átlátszó háttér

Sorok:

```text
0 = walk/idle down
1 = walk/idle left
2 = walk/idle right
3 = walk/idle up
```

Oszlopok:

```text
0-3 = animáció frame-ek
```

Ha más frame méretet használsz, módosítsd:

`src/config.js`

```js
frameWidth: 128,
frameHeight: 128
```

## Enemy

`assets/enemies/slime_sprite_sheet.png`

Javasolt:

- 4 oszlop
- 3 sor
- 96×96 px frame
- true RGBA PNG / átlátszó háttér

Sorok:

```text
0 = idle
1 = move
2 = death
```

## Pályaelemek

```text
assets/map/grass_tile.png
assets/map/rock_small.png
assets/map/rock_big.png
assets/map/bush_01.png
assets/map/bush_02.png
assets/map/log.png
assets/map/tree_small.png
assets/map/tree_big.png
```

Ezeknek lehet átlátszó háttere. A `grass_tile.png` lehet sima 128×128 tile.

## Pickup / effect

```text
assets/pickups/xp_small.png
assets/pickups/xp_big.png
assets/effects/pink_burst.png
```

## Későbbi rendszerekhez előkészítve

```text
assets/audio/
assets/ui/
```

A Discord loginhoz később backend kell, mert a Discord Client Secret nem kerülhet frontend kódba.


## 0.1.1 sprite sheet méretek

A jelenlegi játék ezekre van optimalizálva:

- `assets/player/cherry_sprite_sheet.png` → 1152x1536 PNG, 6 oszlop x 8 sor, 192x192 frame.
  - Row 0: Idle Down
  - Row 1: Walk Down
  - Row 2: Idle Up
  - Row 3: Walk Up
  - Row 4: Idle Left
  - Row 5: Walk Left
  - Row 6: Idle Right
  - Row 7: Walk Right
- `assets/enemies/slime_sprite_sheet.png` → 1536x1152 PNG, 4 oszlop x 3 sor, 384x384 frame.
  - Row 0: Idle
  - Row 1: Move
  - Row 2: Death

A sprite sheetek valódi RGBA PNG-k, fekete háttér eltávolítva.

## 0.6.0 skin UI asset szabály

Minden skin külön `icon` és `splashart` fájlt használ. Ezeket nem szabad egymással felcserélni:

- `*_icon.png` → profil, Library, mobil navigáció, kis kártyák.
- `*_splashart.png` vagy `*_splashart.jpg` → Characters & Skins nagyméretű háttér.
- `*_idle_down.png` → Gear és Player Upgrade animált előnézet.

A Warrior Cherry kanonikus képei:

```text
assets/player/skins/warrior_cherry/warrior_cherry_icon.png
assets/player/skins/warrior_cherry/warrior_cherry_splashart.png
```

Az előnézeti idle stripe-ok képkockái azonos cellaméretűek legyenek. A v0.6 futásidőben az átlátszó képhatár alapján egységes közép- és talajpontra igazítja őket.
