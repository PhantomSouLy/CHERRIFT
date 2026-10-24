# CHERRIFT – PC Profile / Account rework

A kiválasztott 1. koncepció (Crystal Identity Card) működő PC-s megvalósítása. Alap: `8d945f4786a4a8eb99b0d0c4d8117e3c1e1e37ce` (Rework Settings). A World/Chapter és Settings rework már része ennek az alapnak.

## Megjelenés

Új, átlátszó WebP kristálykeret és középső rózsaszín szalag, a meglévő fantasy háttérrel és CHERRIFT logóval. Bal oldalon a tényleges avatar, keret, név, aktív cím, szint, skin és XP; jobb oldalon az összes eredeti statisztika, részletes statisztikák, cím- és keretválasztó, névváltás, kódbeváltás és a Settings eredeti Fiók lapja. Nem kerültek be fiktív számlálók vagy jutalmak. A koncepció négy statisztikakártyája helyett mind a nyolc meglévő adat megmaradt.

Belépési és kilépési animáció, lebegő szirmok, gombkiemelés, meglévő hangbeállítást követő hoverhang. A csökkentett mozgás rendszer- és játékbeállítása támogatott. A feliratok külön HTML-elemek, magyar/angol változattal.

## Integráció és mobil

Kizárólag az új desktop modul és desktop media query alakítja át a natív `profileBugfixV0941` panel megjelenését. A natív avatar-, cím-, keret-, név-, statisztika- és kódbeváltó kezelők megmaradtak. A főmenübe a publikus `UI.open('menu')` útvonal vezet vissza. A fiókgomb az eredeti Settings/Fiók lapot nyitja meg.

821 px alatt, illetve alacsony érintős képernyőn a modul nem épít fel PC-s felületet. Átméretezéskor eltávolítja a saját elemeit, és visszaállítja az ideiglenes ARIA/fókusz attribútumokat. A megnyitott natív ablak mobilra váltáskor megmarad. A közös mobilos CSS, auth, mentés, adatbázis és játékmenet forrása változatlan.

A cím/keret zárolása és felszerelése továbbra is a natív modulok feladata. A PC-s ablakok Tab/Shift+Tab fókuszkezelést, Escape bezárást és visszatérő fókuszt kaptak. Az új prezentációs modul nem ír mentést és nem hív szerver API-t.

## Módosított fájlok

- `src/cherrift_desktop_profile.js` – elkülönített PC-s prezentáció és natív navigáció.
- `assets/cherrift_desktop_profile.css` – kizárólag opt-in desktop stílusok.
- `assets/ui/profile/crystal-identity-pc.webp` – generált, átlátszó kristálydíszítés.
- `index.html` – új modul és stílus betöltése, build 1009 gyorsítótár-verzió.
- `src/cherrift_manifest.json` – desktopProfile belépési pont és tulajdonosi bejegyzés.
- `tools/desktop_profile.test.mjs` – tíz regressziós teszt.
- `package.json`, `.github/workflows/ci.yml` – profiltesztek bekötése.
- `docs/PC_PROFILE_REWORK.md`, `docs/pc-profile/*` – dokumentáció, assetprompt és képernyőképek.

## Ellenőrzés

A rework a repository része. Az aktuális indítási és ellenőrzési lépések a [README-ben](../README.md), a tisztítás és a teszteredmények a [cleanup-jelentésben](../REPO_CLEANUP_AUDIT_HU.md) találhatók.

## Telepítés és GitHub

A rework a repository része. Az aktuális indítási és ellenőrzési lépések a [README-ben](../README.md), a tisztítás és a teszteredmények a [cleanup-jelentésben](../REPO_CLEANUP_AUDIT_HU.md) találhatók.

Helyi ág: `feat/pc-crystal-profile`. A GitHub-integráció az ág létrehozását 403 `Resource not accessible by integration` hibával elutasította, így távoli ág és Pull Request nem készült. Nincs automatikus élesítés vagy merge.
