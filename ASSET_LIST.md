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
