# Base Cherry – left/right Walk színvillogás javítás, v7

A v7 kizárólag a left/right SIMA WALK 2. és 5. képkockájának színillesztését módosítja. Ezek a két átmeneti póz világosabb forrásképéből származtak, ezért a teljes hatképkockás ciklusban világos–sötét ugrást okoztak. Most a megtartott 1., 3., 4. és 6. póz színeloszlásához illeszkednek.

## Mi változott?

A két eltérő teljes képkocka rózsaszín haj- és ruhatónusai enyhe, rögzített színgörbét kapnak. A két cipőpóz világosabb rózsaszínjét külön, lágy átmenettel illeszti a korrekció. A balos és jobbos változat ugyanazt a kalibrációt használja. A fehér részletek és a melegebb bőr/szemtónusok védelmet kapnak; az alpha csatornát a kód nem írja át.

A színillesztés egyszer, az atlasz gyorsítótárazásakor, eredeti felbontáson történik. A PNG-ként visszadekódolt kép a korábbi rajzolási útvonalon fut. Nincs időben változó szűrő, újragenerálás, lábkivágás vagy mozgásmódosítás.

Mind a 48 Base sprite PNG és a teljes geometriai regisztráció byte-ra azonos a v6-tal. A másik négy oldalsó Walk képkocka és minden más állapot megjelenése is változatlan: natív Canvas összehasonlításban csak 4 megjelenített képkocka színe változik (2 póz × 2 irány), a másik 284 képkocka RGBA-pontos. A négy érintett kép megjelenített alpha csatornája is pontosan azonos.

## Előnézet és telepítés

- `CHERRIFT-Base-Cherry-Walk-Compare-v7.gif`: balra a v6, jobbra a v7, azonos ütemben, mindkét oldalirány teljes ciklusával.
- `CHERRIFT-Base-Cherry-Full-Preview-v7.html`: 8 irány × 6 animáció, nagyítás, lassítás, szünet és léptetés; a `Korábbi v6` kapcsoló visszavált a korrekció előtti színekre.
- A teljes animált GIF és PNG áttekintés a ZIP `preview` mappájában is megtalálható.

A `CHERRIFT-Base-Cherry-Whole-Frames-v7.zip` teljes, önálló Base csomag. A külön `Side-Walk-Color-Fix-v7.zip` kis javítócsomaghoz már telepített v6 szükséges. A `changed_files` mappa TARTALMÁT másold a CHERRIFT repository gyökerébe, azonos fájlok felülírásával. Ne magát a `changed_files` mappát másold be. Az `index.html` és `src/cherrift_manifest.json` együtt menjen be. A preview mappát nem kell feltölteni.

Egységes build: `1111-base7-steady-color`. Kiinduló GitHub HEAD: `cba5b905f4950417e0a81c19e4518e7596087c3f`. A csomag nincs automatikusan feltöltve a GitHubra. Az animáció helyben fut; a világban történő elmozdulást a játékmotor vezérli.

## Ellenőrzés és korlátok

23 célzott Base/Petal Trace/megosztott mozgás teszt, forrásvalidálás és Pages hivatkozásellenőrzés. A színkorrekció külön tesztje védi a két frame-helyet, a semleges fehéret, a meleg bőr- és szemtónust, valamint az alpha értékeket. Az előnézet mind a 48 kombinációját, régi/új kapcsolóját és léptetését natív Canvas környezetben ellenőriztük. Ez nem új telefonos játékteszt.

A mért színeltérések kiválasztott, dokumentált haj- és cipőterületekre vonatkoznak; a különböző pózok árnyékolását és minden egyes képpont azonosságát nem bizonyítják. A pontos mérési adatok a `validation.json` és az `assets/player/cherry_skins/base_cherry/sources/whole-color-v7/` mappában vannak. A korábbi színillesztéshez hasonlóan Canvas 2D szűrő és PNG dekódolás szükséges; nem támogatott környezetben az eredeti artwork látható.
