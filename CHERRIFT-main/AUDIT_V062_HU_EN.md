# CHERRIFT v0.6.2 audit / Átvizsgálás

Átvizsgált tartomány: 396 eredeti követett fájl, 33 runtime JavaScript-forrás, 2 teszt/validátor modul, 16 CSS-fájl, 328 assetfájl és 23 sorrendben betöltött verziópatch. Az assetmappa mérete körülbelül 100 MB.

Scope reviewed: 396 originally tracked files, 33 runtime JavaScript sources, 2 test/validator modules, 16 CSS files, 328 asset files and 23 sequential runtime patches. The asset directory is approximately 100 MB.

## Javított kritikus és jelentős hibák / Fixed critical and major issues

| Terület / Area | Talált probléma / Finding | Javítás / Resolution |
|---|---|---|
| Library → Skins | Játékból kilépés után a láthatatlan `RAID INCOMING` réteg a menü fölött maradt és elnyelte a kattintásokat PC-n és telefonon. | A combat overlay kilépéskor és menünyitáskor törlődik; menüállapotban rejtett és `pointer-events: none !important`. |
| Boot | Egy patch betöltési hibája után félkész UI indulhatott el. | A boot számon tartja a sikertelen kötelező fájlokat, megáll, és kétnyelvű Reload Game hibaoldalt mutat. |
| PLAY | Gyors dupla kattintás két egymásra futó startot és hibás statot okozhatott. | Start-lock ugyanazt a Promise-t adja vissza, amíg az indulás tart. |
| Kamera | A Settings View zoom nem a végső renderer értékét változtatta; a Closer is túl távoli volt. | A végső `drawWorld` pipeline kap korrekt desktop/mobil alapzoomot és 1.72-es felső korlátot. |
| Mentés | Sérült elsődleges JSON esetén az alap loader csendben defaultot adott, így a backup nem állt helyre. | Külön korrupciódetektálás, backup-recovery, normalizálás és 5-ös mentésséma. |
| Napi rendszer | UTC dátum és lifetime statok miatt a napi reset helyi időben elcsúszhatott, az új quest pedig azonnal kész lehetett. | Helyi naptári nap, biztonságos napkülönbség és induló stat-snapshot minden napi questhez. |
| Háttér/Pause | Lapváltáskor nem létező/rossz pause útvonal fagyott vagy rejtett állapotot hagyhatott. | A háttérpause a tényleges `UI.pause()` útvonalat használja. |
| Input | Menüből is queue-olható skill, illetve alt-tab után beragadt billentyű/touch állapot maradhatott. | Input csak aktív run alatt indul; blur/visibility change minden ideiglenes inputot töröl. |
| Assetek | 29 közvetlen útvonal nem létező vagy régi fájlnevet használt. | A Base Cherry skillek, map tile-ok, splash artok és Succubus sprite-hivatkozások a tényleges assetekre mutatnak. |
| Click audio | A 0–100 hangerőérték 0–1 értékként lett clampelve, ezért szinte mindig maximális volt. | A click hangerő százalékból 0–1 tartományba konvertálódik. |
| Nyelv | A Language selector csak mentette az értéket; a felület nem váltott nyelvet. | Központi HU/EN szótár, dinamikus DOM-fordítás, attribútumfordítás és azonnali váltás reload nélkül. |
| Navigáció | Kész Daily/Achievements/Login/Shop panelek több nézetből nem voltak elérhetők; nem működő elemek még kattinthatónak látszottak. | Library service bar és dashboard shortcut; a ténylegesen nem működő Discord/dekoratív vezérlők letiltva és némák. |
| Dokumentáció | A fő README v0.2.2-t írt, miközben a runtime 0.6 volt. | Aktuális kétnyelvű README, roadmap, changelog és futtatható tesztleírás. |

## Ellenőrzött, már meglévő 0.6 funkciók / Verified existing 0.6 work

- kompakt mobil főmenü és World Select;
- mobil Gear és Player Upgrade fülek;
- hat elemű mobil alsó navigáció, benne Library;
- Gacha ládahely és vizuális reward card;
- Settingsben a Resume run csak szüneteltetett játékból érkezve jelenik meg;
- skin ikonok/splash artok és stabil idle previewk;
- gombkattintási hang csak engedélyezett, interaktív elemekre.

## Nyitott technikai adósság / Remaining technical debt

1. A 23 egymás után betöltött patch működő, de törékeny öröklési lánc. Ezt 0.9 előtt modulokra kell bontani.
2. World 3 több rendszere és ellenfele placeholder/preview; 0.7-ben tartalmilag be kell fejezni.
3. A körülbelül 100 MB assetkészlet mobil betöltési költsége magas; 0.9-ben optimalizálni kell.
4. `src/cherrift_v0562.js` szándékosan nincs betöltve, mert a v0.5.6.3 váltja; a moduláris átépítéskor törölhető/archiválható.
5. A Discord/account felülethez nincs backend. Client secretet statikus GitHub Pages oldalba tenni tilos; a biztonságos megoldás a 0.8 mérföldkő.
6. A régi verzióspecifikus README/TXT fájlok történeti anyagként bent maradtak; release előtt Docs/Archive alá rendezhetők.

## Teszteredmény / Test result

```text
Validated 35 JavaScript files, 16 CSS files and 53 source files.
PASS desktop 1440x900 · camera 1.34–1.61 · 7 Library skin cards
PASS mobile 390x844 · camera 1.42–1.70 · 7 Library skin cards
CHERRIFT smoke tests passed.
```

További ellenőrzések: 16 CSS-fájl parse, hiányzó közvetlen assethivatkozások, duplikált runtime ID-k, 23/23 patch-szám, sérült mentés backupja, HU/EN dinamikus szöveg, input reset és combat-overlay lifecycle.
