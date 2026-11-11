# Base Cherry – előre irányuló ellenlépések, v6

A v6 a down_right és down_left SIMA WALK 4., 5. és 6. képkockáját cseréli teljes, újrarajzolt pózokra. Az első három képkocka mindkét irányban pixelre azonos a v5-tel, a másik 46 Base animációs strip byte-ra változatlan. Az összes Attack, Walk Attack, Idle és Skill az eddigi változat marad.

## Javítás

Az ellenlépésnél a teljes comb–térd–boka lánc iránya változott, nem csupán a cipő orra. Az előrelépő láb a szoknya bal oldala alól átlósan jobbra-lefelé halad; a másik láb hátul marad. A ciklus utolsó képkockája előrehaladó, váltást előkészítő póz. A down_left a teljes jobbos pózok pontos tükörképe.

A beépített imagegen az eredeti Base figurákra és külön pózábrára hivatkozva készítette a teljes rajzokat. A csomagoló kizárólag TELJES figurákat vesz át és egységesen méretez: nincs kivágott láb/cipő összeillesztése vagy scriptes testrésztorzítás. A két forráscsoport mérete külön, teljes alakban illeszkedik, hogy a test ne zsugorodjon a váltásnál. A fejpozíció regisztrációja az eddigi Idle alaphoz igazodik.

A v5 színillesztése megmaradt; az új források három teljes képkockája apró, rögzített megjelenítési korrekciót is kap a megtartott félciklushoz. Ez a teljes atlasz külön vásznán, eredeti képméretben történik, PNG-ként visszadekódolva; a játék rajzolási útja és a karakter átlátszósága megmarad. Más állapotot nem színez át. Ha a böngésző nem támogatja a Canvas szűrőt, az eredeti rajz látszik.

## Előnézet

- `CHERRIFT-Base-Cherry-Walk-Compare-v6.gif`: v5 balra, v6 jobbra; a két alsó átló teljes hatképkockás ciklusa azonos ütemben.
- `CHERRIFT-Base-Cherry-Full-Preview-v6.html`: mind a 8 irány × 6 állapot; nagyítás, lassítás, szünet és képkockaléptetés. A `Korábbi v5` kapcsoló a valódi v5 képeket és regisztrációt mutatja.
- A teljes animált GIF és PNG áttekintés is a ZIP `preview` mappájában van.

Az animáció helyben fut; a játékbeli haladást a játékmotor végzi.

## Telepítés

Ez teljes, önálló Base csomag; korábbi ZIP-ek előtelepítése nem kell. A `changed_files` mappa TARTALMÁT másold a CHERRIFT repository gyökerébe, azonos fájlok felülírásával. Ne magát a `changed_files` mappát másold be. Az `index.html` és a `src/cherrift_manifest.json` együtt menjen be. A preview mappát nem kell feltölteni.

Egységes build: `1111-base6-forward-step`. GitHub kiindulás: `670a39be8ae0021114158e7fc3cda6e34d358688`. A csomag nincs automatikusan feltöltve a GitHubra.

## Ellenőrzés és újraépítés

22 célzott Base/Petal Trace/megosztott mozgás teszt, forrásvalidálás és Pages hivatkozásellenőrzés. A hat cserélt teljes figura margói, tükörpárjai és a nem érintett cellák változatlansága ellenőrizve. Az exportáló újrafuttatása byte-ra azonos runtime stripet ad. A lépés irányát teljes pózokon és szinkronizált előnézetben néztük át; az anatómiai helyességet az automatikus tesztek önmagukban nem bizonyítják. Ez nem új telefonos játékteszt.

Források, pontos promptok, eredeti összehasonlító adatok és választott képkockák: `assets/player/cherry_skins/base_cherry/sources/whole-steps-v6/`. Újraépítés: `tools/export_base_steps_v6.py`; teljes Base export esetén a sorrend v2 → v3 → v4 → v6. A Python exportáló játék közben nem szükséges. A források és előnézetek nem részei a Pages runtime csomagnak.
