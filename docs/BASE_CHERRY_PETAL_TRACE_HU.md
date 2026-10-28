# Base Cherry — Petal Trace v2 / Imagegen

Ez a csomag teljesen kiváltja a korábbi, kizárólag eljárásos Canvas-változatot.
A korábbi Base ZIP telepítése nem szükséges. Ez önálló, teljes módosításcsomag.
Build: `1028-base-petal-image2`. Elfogadott vizuális irány: 02 / Petal Trace.

## Valódi játékassetek

Az imagegen skill beépített képgenerálója készítette az átlátszó RGBA effektlapot:
`assets/effects/base_petal_trace/petal_trace_atlas.png` (1536 × 1024).
A mellékelt generálási prompt a jóváhagyott koncepcióra hivatkozik.

Az atlasz 3 × 2 cellája:
1. Rózsaszín-fehér gömb.
2. Nyitott találatív, fehér kontaktvillanás és három szirom.
3. Keskeny szirmos dash-csóva.
4. Külön szirom.
5. Kilövési villanás.
6. Semleges, egyszerű járáspor.

Mind a hat képi elem ténylegesen szerepel a játékbeli rajzolásban. A Canvas
csak a generált képek elhelyezését, forgatását, méretét és halványítását kezeli;
a korábbi, alakzatokból felépített effektgrafika kikerült az aktív rajzolóból.
A dash két utóképe a változatlan karakter-sprite-ból készül, az effekt mögött.

## Bekötés

A `src/cherrift_base_petal_vfx.js` a játék normál ImageAssets betöltőjéhez
adja hozzá az effektlapot, így az asset a betöltési folyamat része.
A script az indexben aktív, a cache-azonosító a manifesttel egyezik.
A csomag az eredeti Base harckódhoz szükséges váltásokat is tartalmazza.
Más skinek által használt közös régi effektfájlok megmaradnak.

A sebzés, ütközési sugár, lövedéksebesség, támadási ritmus, dash mozgása,
sérthetetlensége és cooldownja változatlan. A járáspor tényleges elmozduláshoz
kötött, falnál/állva nem keletkezik. Low beállítás kevesebb utóképet és szirmot
rajzol. Nincs blur és nincs futás közbeni pixelolvasás.

Ellenőrzés: `npm run test:base-cherry`, `npm run test:cherry-motion`,
`npm run validate`. A renderelt előnézet a generált effektlapot és az eredeti
sprite-okat használja.

GitHub-feltöltés nem történt. Supabase-módosítás nem szükséges.
