# Succubus Cherry – Legendary chibi

A játékbeli változat a meglévő négy PNG-referenciából készült:

- `assets/ui/skins/cherry_ui_skins/succubus_cherry_1.png` – splash art
- `assets/ui/skins/cherry_ui_skins/succubus_cherry_2.png` – splash art
- `assets/ui/skins/cherry_ui_skins/succubus_cherry_transp_1.png` – teljes alakos, átlátszó PNG
- `assets/ui/skins/cherry_ui_skins/succubus_cherry_transp_2.png` – teljes alakos, átlátszó PNG

8 irány, 8 animációs állapot, 6 képkocka állapotonként: 64 RGBA PNG-csík,
összesen 384 képkocka. A három bal oldali nézet a megfelelő jobb oldali nézet
igazított tükörképe, ahogyan a korábbi chibi skineknél is.

Állapotok: alap idle, intéses idle2, szárnynyújtásos idle3, járás, távoli
támadás, kétmozdulatos közeli támadás, járás közbeni távoli támadás, Soul Drain.
Az alap idle a visszatérő állapot. A két extra idle 4–8 másodperces véletlen
szünetekkel játszódik le, és mozgás/támadás/skill megszakítja. A kozmetikai
véletlenszám-generátor különálló, nem fogyasztja a harci rendszer véletlenszámait.

A méretezés és a fejhez igazítás az export során történik. Játék közben
rögzített a `(96,184)` igazítási pont; a lábak, szárnyak és a farok változó
sziluettje nem számítja újra a karakter középpontját. A járás és a járás
közbeni támadás a tényleges mozgási távolságon alapuló, folyamatos lépésórát használ.

A meglévő Legendary tulajdonságok, sebzés, élelszívás, pajzs, lövedékek és
skill effektjei változatlanok. A Soul Drain új, hatrajzos karakteranimációja
az eredeti 2/3 másodperces castot és az 1/3 másodperces kitörési eseményt tartja.
A skill effektek későbbi reworkjéhez a karakter és a VFX továbbra is különálló.

## Telepítés

A csomag tartalmát a CHERRIFT gyökerébe kell másolni, a mappák egyesítésével
és a mellékelt fájlok felülírásával. Az alap a `9914077` main verzió,
amely már tartalmazza a Base/Archer/Ninja javításokat.

Az új grafika az `assets/player/cherry_skins/succubus_cherry` alatt van.
A régi `assets/player/skins/succubus_cherry/effects` állományok továbbra is
szükségesek a megtartott effektekhez. A régi menüreferenciákat és splash artokat
nem írja felül a csomag. A meglévő skinhez nem ad új feloldást vagy jogosultságot.

Az ellenőrzéshez megnyitható az itteni `preview.html` kicsomagolás után.
Ez helyi PNG-kkel is működik. A tényleges játékot a megszokott helyi szerveren
vagy a GitHub Pages-verzióban kell elindítani. Feltöltés után teljes frissítés ajánlott.

## Ellenőrzés és források

A `validation.json` az export geometriai ellenőrzését tartalmazza.
A `tools/succubus_chibi.test.mjs` a meglévő harci modulhoz képest vizsgálja az
eseményeket, a három idle kezelését, a nyolc irányt, a lépésórát és a tartalékrajzot.
Teljes élő PC/mobil játékpróba még szükséges.

A PNG-atlaszok a beépített ImageGen eszközzel készültek. A `sources` mappa az
eredeti generált atlaszokat és az alapnézeti referenciát tartalmazza.
Újraexportálás: `python assets/player/cherry_skins/succubus_cherry/export.py`.
Az exporterhez Pillow, NumPy, SciPy és scikit-image szükséges; a játékhoz nem.
A promptspecifikáció a `PROMPTS.md` fájlban van.
