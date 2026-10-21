# CHERRIFT – PC Upgrade / Celestial Constellation

A kiválasztott 2-es koncepció működő, kizárólag PC-s megvalósítása.
Alap: PhantomSouLy/CHERRIFT main, 239f235. Ág: feat/pc-celestial-upgrade.
Build: 1006-celestial-upgrade. Automatikus élesítés és merge nem történt.

## Elkészült

- Egyedi, átlátszó kristályos csillagképkeret; meglévő logó, háttér, képességikonok és gombgrafika.
- A három eredeti fejlesztési ág összesen 18 csomópontja, valódi rangokkal, feltételekkel és aktuális/következő értékekkel.
- Cherry portré a középső kristálymedálban; kattintással az eredeti skinválasztó nyílik.
- Ágszűrők, hover/fókusz fények, animált részletváltás és visszalépés. Csökkentett mozgás támogatása.
- Billentyűzetes csomópontváltás, Escape; folyamatban lévő fejlesztés alatt ismételt beküldés tiltva.
- Eredeti statisztika, fa-visszaállítás és Elemental Resonance nézet továbbra is elérhető.
- A felső sáv a meglévő fiók-, erőforrás- és menüfunkciókat használja.

A modul a natív menü renderelt adatait olvassa; az eredeti ágkiválasztást visszaállítja. A fejlesztést a meglévő CHERRIFT_ONLINE.perform('upgrade_skill', {node_id}) hajtja végre. A grafikai réteg nem ír mentést, nem változtat egyensúlyt, szerveroldali szabályt vagy autentikációt. A natív rangváltozásokat akkor is követi, ha a fiókadat nem változott.

## Mobil elkülönítés

Minden új stílus desktop media query és saját celestial-upgrade osztály mögött fut. A JS a főmenü meglévő desktop felismerését követi, az érintéses, alacsony fekvő nézetet is kizárva. Mobilra váltáskor minden hozzáadott elem eltűnik, a natív felület visszaáll. A közös játéklogika és mobilos stílusfájlok változatlanok. Az index.html közös verzióparaméterei csak a cache frissítését szolgálják.

## Ellenőrzés

- 71 automatizált teszt sikeres: főmenü 5, skins 5, gear 5, gacha 7, upgrade 9, integritás 34, online API 1, gunner 5.
- 9/9 boot smoke eset sikeres; Supabase auth lock/timeout smoke is sikeres.
- validate: 47 JavaScript, 18 CSS és 67 forrásfájl érvényes.
- Repo audit: 0 szintaxis-/fájlszignatúra-hiba. A teljes repo auditja meglévő placeholder és hiányzó hivatkozás találatokat is jelez; ezek javítása nem része ennek a menücserének.
- Chromium böngészőpróba: 1366×768, 1920×1080, 2560×1440, 3440×1440 és 1128×584. Mind a 18 csomópont látható, a fő vezérlők képernyőn belül maradnak; a rövid nézet szükség esetén belül görgethető.
- Mind a 18 csomópont kiválasztása; zárolás, szűrés, billentyűzet, visszalépés, statisztika, Elemental Resonance, desktop→mobil→desktop váltás ellenőrizve.
- Fejlesztés siker/hiba, pontlevonás, ismételt beküldés tiltása, maximális rang és következő csomópont feloldása helyi böngészős szolgáltatás-fixture-rel ellenőrizve. Élő felhasználói mentést nem módosítottam; bejelentkezett éles szerveres pontköltés nem volt a próba része.
- Mobil 390×844 és érintéses 844×390: az alapverzió és az új verzió Upgrade képernyőképe pixelre azonos (0 eltérő pixel). A JS teszt a natív DOM és a mentés változatlanságát is ellenőrzi.
- Böngészős Upgrade próba: 0 JavaScript hiba.

A referencia gazdagon kitöltött fantáziafája helyett az implementáció a tényleges 18 képességet mutatja. A kezdő fiók ezért több zárolt csomópontot lát. A központi kép a meglévő Cherry splash; új skinpóz nem készült.

## Fájlok

- index.html – új desktop erőforrások és egységes buildazonosító.
- src/cherrift_manifest.json – modulregisztráció.
- src/cherrift_desktop_upgrade.js – külön PC-s megjelenítés és integráció.
- assets/cherrift_desktop_upgrade.css – külön PC-s stílus és animáció.
- assets/ui/upgrade/constellation-frame-pc.webp – új, szöveg nélküli, átlátszó grafika.
- tools/desktop_upgrade.test.mjs – 9 célzott regressziós teszt.
- package.json, .github/workflows/ci.yml – tesztbekötés.
- docs/PC_UPGRADE_REWORK.md, docs/pc-upgrade/* – jegyzőkönyv, assetleírás és képernyőképek.

## Telepítés

A CHERRIFT-PC-Upgrade.zip tartalmát a repository gyökerébe kell másolni, az azonos nevű fájlokat felülírva. A ZIP-ben nincs köztes files/ mappa. A korábbi PC-s főmenü/skins/gear/gacha rework a 239f235 alapverzióban már szerepel; a csomag ezekre épül. A ZIP nem teljes repository, és nem tartalmaz node_modules könyvtárat.

Helyi ellenőrzés: npm ci, npm run test:desktop-upgrade, npm run validate. A teljes ellenőrzés: npm test.
