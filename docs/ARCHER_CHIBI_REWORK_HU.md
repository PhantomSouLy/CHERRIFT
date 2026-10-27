# Archer Cherry – Chibi 01 rework

Az elfogadott **1-es koncepció** alapján. A csomag a GitHub `main`
`2a92a4136ac5373b0f5380b6952fad1ed70568b0` állapotára készült.

## Telepítés

1. A `CHERRIFT-Archer-Chibi-01.zip` tartalmát a CHERRIFT gyökerébe másold, a mappaszerkezetet megtartva.
2. Az `index.html` és a `package.json` felülírását engedélyezd.
3. Commit/push után frissítsd a játékot; PC-n Ctrl+F5.

Ha közben más fejlesztés módosította az indexet, a teljes fájl felülírása
helyett tedd be ezt a sort a Ninja modul mögé, ugyanazzal a közös build query-vel:

```html
<script src="src/cherrift_archer_chibi.js?v=1027-world-skin-fix"></script>
```

Az azonosító **`archer_cherry`** marad. A meglévő tulajdonjog, kiválasztás,
felhőmentés és a Rare ritkaság megmarad. Supabase-migráció nem szükséges.
A meglévő splash artok és menüképek továbbra is érvényesek.

## Tartalom

- 8 irány: le, le-jobbra, jobbra, fel-jobbra, fel, fel-balra, balra, le-balra.
- 6 állapot: idle, idle2, walk, attack, walk_attack, skill.
- Állapotonként és irányonként 6 képkocka: **288 teljes alakos, átlátszó 256×256 PNG**.
- **48 sprite sheet**, 1152×192 mérettel és 192×192 cellákkal.
- Közös talpigazítás, biztonsági szegély, aránytartó export.
- Böngészős `assets/player/cherry_skins/archer_cherry/preview.html` előnézet.
- A fő ZIP csak a játékhoz és az előnézethez szükséges új/módosított fájlokat tartalmazza.
- A külön, opcionális `CHERRIFT-Archer-Chibi-01-Sources.zip` tartalmazza a
  288 külön PNG-t, az elfogadott koncepciót, öt fő forrásatlaszt, öt külön
  locomotion atlaszt, generálási promptokat és a Pillow exportálót. Ezek
  a játék futtatásához nem szükségesek. Kibontva ugyanabba a skinmappába kerülnek.

Az öt alapnézet külön generált. A három bal oldali nézet a megfelelő jobb
oldali képsor tükre; ezzel az aszimmetrikus haj, fegyverkéz és felszerelés is
tükröződik. Nem állítjuk, hogy nyolc külön megrajzolt nézet készült.
Nincs csontváz, bábozás, generált köztes mozgás vagy áttűnés: teljes
karakterrajzok követik egymást.

## Játékmenet

- Normál támadás: a meglévő egyetlen Archer-nyíl és eredeti sebzés.
- Passzív: **+10% kritikus találati esély**.
- Four Arrow Shot: az eredeti **négy** lövedék, eredeti szórással,
  0,92× sebzéssel, 1,08× lövedéksebességgel és cooldownnal.
- A meglévő 0,40 másodperces támadó és skill cast idő megmarad.
- Mozgás közben is lőhet; az eredeti 0,68× támadás alatti mozgásszorzó megmarad.
- A nyolcirányú animáció a ténylegesen kilőtt nyíl irányát követi.
- Az álló/mozgó képsor ugyanazt az animációs órát használja; váltáskor nem
  hoz létre új lövedéket és nem kezdi újra a támadást.
- A nyilak és találati effektek a meglévő játékkód külön objektumai.

Az új modul a Ninja után töltődik be. Az alap assetbetöltő a végleges
konfigurációból olvassa a 48 új sheetet. A régi Archer karakterképek helyett
az új aktív útvonalakat használja; a régi fájlokat a csomag nem törli.

## Ellenőrzés

```bash
npm run test:archer-chibi
```

A regressziós teszt a repó tényleges v0.8.7 Archer támadás- és skillkódját,
valamint a v0.9.2 mozgásszorzóját futtatja a bekötéssel és nélküle.
Összeveti a lövedékeket, sebzést, szórást, cooldownokat, kritikus passzívot,
mozgást, animációválasztást és betöltési sorrendet. A technikai képteszt
ellenőrzi az összes PNG méretét, alfáját, nem üres tartalmát és szegélyét.

Újraexportálás: az opcionális forráscsomag kibontása után, Python 3 és Pillow mellett:

```bash
python assets/player/cherry_skins/archer_cherry/export.py
```

A generált rajzok arányai, a haj és a felszerelés részletei képkockánként
kismértékben eltérhetnek. A technikai és regressziós tesztek nem jelentenek
végigjátszott PC- és telefonos tesztet. A játékbeli vizuális próba még szükséges.
