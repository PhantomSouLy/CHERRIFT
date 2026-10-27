# Ninja Cherry Chibi 03 – aktiválás

A csomag a `d8775e8` (index fix) repoállapotra készült. Másold a ZIP tartalmát
a CHERRIFT gyökerébe felülírással, commit + push, majd frissíts Ctrl+F5-tel.

Az alap Cherry bekötése után töltődik be az új `src/cherrift_ninja_chibi.js`.
A Ninja id-je továbbra is `ninja_cherry`, így a meglévő tulajdonjog, kiválasztás
és mentés változatlanul működik. A játékbeli alak lesz chibi; a splash art marad.

## Játékmenet

Az új modul meghívja a meglévő Ninja támadás- és skillkódot, majd annak
sikeres lefutásához választ új animációt. Nem hoz létre második támadást.

- Távolra két shuriken: az eredeti szórás, 610-es lövedéksebesség, 0,82× sebzés,
  5%-os méreg és tűzgyorsaság megmarad.
- Közelre katana: 132 + célpont sugara kapcsolási küszöb, eredeti találati
  távolság és kúp, 1,25× sebzés, eredeti méreg.
- Álló és mozgó ranged/melee támadásokhoz külön sprite sheet tartozik.
- Skill: az eredeti 12 shuriken ténylegesen 360°-ban kifelé repül, 650-es
  sebességgel, 1,05× sebzéssel és eredeti méreggel. A karakter 8 megrajzolt
  nézetből fordul körbe az eredeti 0,42 másodperces cast alatt.
- +35% mozgássebesség 3 másodpercig, eredeti skill cooldown és skillBuff.
- Az eredeti mozgás közbeni támadás és annak meglévő sebességszorzója megmarad.

Az animáció külön órát használ a régi egymásra épülő attack timer javításoktól.
Az álló/mozgó képsor váltásakor nem ismétli meg a támadást. A karakterképet nem
forgatja el síkban, és nem használja a régi Ninja alpha-újraközpontosítást vagy
balra tükröző renderjavítást. A sheetek már tartalmazzák a bal oldali nézeteket.

## Csomagtartalom

- `index.html`: új modul, a projekt közös build query-jével.
- `src/cherrift_ninja_chibi.js`: bekötés.
- `assets/player/cherry_skins/ninja_cherry/sheets192/`: 64 szükséges sprite sheet.
- Ugyanott `manifest.json`: integrációs jelölés, irányok és rajzi metaadatok.
- `package.json`, `tools/ninja_chibi.test.mjs`: tesztparancs és regressziós tesztek.
- Ez a leírás.

A 400 külön PNG-t, generálási forrásokat és a nagy előnézetet nem ismétli meg.
A régi, más helyen lévő skinfájlokat nem törli. Az új aktív konfiguráció és
renderer az új sheetekre mutat. Az effektek a meglévő Ninja effektfájlokat használják.

## Ellenőrzés

`npm run test:ninja-chibi`

A teszt a repo tényleges régi Ninja ranged-, melee- és skillfüggvényeit futtatja
a bekötéssel és anélkül, majd összehasonlítja a lövedékeket, sebzést, mérget,
cooldown-t és buffot. Ellenőrzi a 64 PNG-t, az állapotválasztást, a nyolc skill
képkockát, a modul sorrendjét és a validátor közös build query-szabályát is.

A teszt automatizált kód- és assetellenőrzés. Az éles böngészős játékmenetet
itt nem játszottuk végig; a generált képek kisebb rajzi eltérései megmaradhatnak.
