# Warrior Cherry sprite pack

Teljes, négyirányú Warrior Cherry animációs készlet a Ninja Cherry technikai sablonja szerint.

## Technikai adatok

- Formátum: PNG, valódi RGBA
- Háttér: teljesen átlátszó (`alpha = 0`)
- Frame: 192 × 192 px
- Pivot: `x = 96`, talpvonal `y = 184`
- Idle: 4 frame, 768 × 192 px, ajánlott 3 FPS
- Walk: 6 frame, 1152 × 192 px, ajánlott 8 FPS
- Melee: 6 frame, 1152 × 192 px, ajánlott 18 FPS
- Ranged: 6 frame, 1152 × 192 px, ajánlott 16 FPS
- Irányok: Down, Up, Left, Right

## Animációs szabályok

- A kard Idle és Walk közben testhez közeli, átlósan felfelé tartott készenléti pózban marad.
- A Melee egy kompakt, váll–derék magasságú kardvágás, külön effekt nélkül.
- A Ranged csak a célzó/kibocsátó karaktermozdulatot tartalmazza; a kardhullám vagy lövedék külön asset.
- Minden karakter, haj, fül és kard a saját 192 × 192-es celláján belül marad.
- Nincs talajárnyék, beégetett háttér, checkerboard vagy zöld chroma-perem.

## Fájlelnevezés

`warrior_cherry_<idle|walk|melee|ranged>_<down|up|left|right>.png`

A `manifest.json` tartalmazza a fájlok SHA-256 ellenőrzőösszegét és a javasolt lejátszási adatokat. A `validation.json` a technikai ellenőrzés részletes eredménye.
