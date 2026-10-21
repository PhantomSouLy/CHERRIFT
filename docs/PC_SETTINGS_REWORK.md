# CHERRIFT – PC Settings / Crystal Sidebar

Az 1-es Settings koncepció működő megvalósítása, kizárólag PC-re.
Alap: main 1c4fb033eefcc691a28be393ed3c5bccb41889d8 / ReworkUpgrade.
Ág: feat/pc-crystal-settings. Build: 1008-crystal-settings.

## Telepítőcsomag

A CHERRIFT-PC-Settings-World.zip egyesíti az új Settings menüt és az előző, még fel nem töltött World → Chapter reworköt. A jelenlegi GitHub-verzióra közvetlenül telepíthető, a World-csomag külön előzetes telepítése nélkül. Ez az egy ZIP kiváltja a korábbi World ZIP-et. Kicsomagolás után a repository gyökerébe kell másolni/feltölteni a fájlokat, a mappákat egyesítve és az azonos nevű fájlokat felülírva. Nincs köztes files/ mappa, és a csomag nem tartalmaz teljes repositoryt vagy node_modules könyvtárat.

## Új Settings megjelenítés

- Egyedi, átlátszó kristálykeret, íves rózsaszín szalag és szöveg nélküli kristályos kategóriagomb-grafika.
- A meglévő hat kategória: Általános, Hang, Megjelenítés, Irányítás, Menütéma, Fiók.
- Az eredeti input/select/button elemek és eseménykezelőik maradnak; nincs klónozott vagy párhuzamos beállításrendszer.
- A valódi harci hangkapcsoló PC-n a Hang oldalra kerül. Mobilra váltáskor pontosan visszakerül az eredeti helyére.
- Hangerő- és UI-skála értékkijelzés, kristályos csúszkák és kapcsolók, animált kategóriaváltás, hover, látható fókusz és billentyűzetes fülnavigáció.
- Hosszú oldalak belső görgetése; a később érkező téma- és fióktartalom továbbra is az eredeti oldalán jelenik meg.
- A szünetből megnyitott Settings a natív szünetmenübe lép vissza; a Folytatás az eredeti folytatásgombot aktiválja.
- A natív kamera-közelítés számszerű mentése és formázott optionértékei miatt üresen maradó mezőhöz PC-s felirat jelenik meg. Ez nem változtatja meg a select értékét vagy a mentést.

A meglévő menü azonnal, automatikusan ment. Emiatt a koncepció APPLY/CANCEL/RESET gombjai helyett az automatikus mentés jelzése és KÉSZ gomb szerepel. A zene- és effekthangerő továbbra is zárolt, Hamarosan jelzéssel; a terv példakapcsolóiból nem készültek hamis funkciók. A feliratok külön HTML-elemek, nem a grafikába égetett szövegek.

## Mobil és adatkezelés

Az új CSS csak desktop media query és crystal-settings osztály mögött érvényes. A JS a meglévő desktop-felismerést követi, beleértve az érintéses rövid fekvő nézet kizárását. Kilépéskor vagy mobilra váltáskor az összes hozzáadott elem, ideiglenes attribútum, áthelyezett sor és animáció visszaáll/eltűnik. A natív fülkijelölés és görgetés visszaáll.

A közös mobilos stílusok, játéklogika, auth, mentési és szerveroldali kódok változatlanok. Az új modul nem hív mentési vagy hálózati API-t: a felhasználó módosításait az eredeti vezérlők eredeti kezelői mentik. A beállításértékek természetesen a felhasználó választása szerint továbbra is érvényesek maradnak más nézetekben is.

## Ellenőrzés

- 90 automatizált teszt sikeres: 5 főmenü, 5 skins, 5 gear, 7 gacha, 9 upgrade, 9 world, 10 settings, 34 integritás, 1 online API, 5 gunner.
- Teljes npm test sikeres a 9 eredeti Settings teszttel; a végleges, 10 tesztes Settings-csomag külön ismét sikeres. Mind a 9 boot smoke eset és az auth lock/timeout smoke sikeres.
- validate: 51 JavaScript, 20 CSS és 73 forrásfájl érvényes.
- Repo audit: 0 szintaxis-/fájlszignatúra-hiba. A repository korábbi placeholder és hiányzó hivatkozás találatai nem részei ennek a menücserének.
- Böngésző: mind a hat kategória 1366×768, 1920×1080, 2560×1440, 3440×1440 és 1128×584 felbontáson elérhető; a fő vezérlők képernyőn belül maradnak.
- Hangerő, harci hang, FPS-limit, kamera-közelítés, effektminőség, magas kontraszt, csökkentett mozgás, nyelv és UI-skála valódi natív kezelői böngészőben ellenőrizve.
- A bemeneti mezők objektumazonossága, natív eseménykezelőik, a zárolt mezők és a fiók/téma gombok regressziós tesztben ellenőrizve.
- Desktop → mobil → desktop: nincs hozzáadott elem mobilon; a harci hang sor visszakerül a Megjelenítés kategóriába.
- Szünet/vissza és folytatás helyi UI-fixture-rel tesztelve. Élő szerveres futamot nem indítottam; Discord bejelentkezést és fiókmódosítást nem végeztem.
- Mobil 390×844: Általános és Hang előtte/utána képpárok pixelre azonosak.
- Érintéses 844×390: az eredeti álló módra figyelmeztető réteg változatlan. A natív alatta lévő Általános/Hang nézet külön képi fixture-ben összehasonlítva szintén pixelre azonos. A figyelmeztető réteg csak a tesztharnessben volt elrejtve, a projektben változatlan.
- Összesen 5 mobil képpár, 0 eltérő pixel. A DOM és a mentés változatlanságára külön célzott teszt is van.
- Böngészős Settings-próba: 0 JavaScript hiba.

## Settings fájlok

- src/cherrift_desktop_settings.js
- assets/cherrift_desktop_settings.css
- assets/ui/settings/crystal-settings-frame-pc.webp
- assets/ui/settings/crystal-tab-pc.webp
- tools/desktop_settings.test.mjs
- docs/PC_SETTINGS_REWORK.md és docs/pc-settings/*

Közös bekötés: index.html, src/cherrift_manifest.json, package.json és .github/workflows/ci.yml.
A mellékelt korábbi World-fájlok részletes listája: docs/PC_WORLD_CHAPTER_REWORK.md.

Ellenőrzés: npm ci, npm run test:desktop-settings, npm run validate. Teljes ellenőrzés: npm test.
Automatikus élesítés és merge nem történt.

GitHub-átadás: a helyi ág és commit elkészült. A távoli ág létrehozását a GitHub-integráció 403 / Resource not accessible by integration hibával elutasította; távoli ág és Pull Request nem jött létre. A ZIP a kézi feltöltésre kész teljes változtatást tartalmazza.
