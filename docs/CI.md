# CHERRIFT változásalapú CI

## Működés

A `CHERRIFT validation` minden push és PR esetén elindul; nincs workflow-szintű
`paths` szűrő, amely függőben hagyná a kötelező checkeket. A `Select checks` job
Git-alapú, konzervatív tervet készít. A `Validate source` és mind a tíz
`Smoke · <case>` név megmarad. A nem kiválasztott Smoke job egy rövid, egyértelműen
jelzett kihagyással zárul: nem tölt le repositoryt és nem telepít függőségeket.
Hibás kiválasztás vagy source-validáció esetén ezek a jobok is hibáznak.
A `CI summary` minden befejeződő futás végén mutatja a tervet és az eredményeket.

| Módosítás | Statikus/izolált regressziók a kötelező alapellenőrzéseken felül | Smoke |
|---|---|---|
| Csak PNG/WebP/JPEG/GIF az `assets/` alatt | Minden skin-, animáció-, UI-art-, world-, desktop- és mobil gameplay tartalomteszt; módosult képek bináris épsége | 0/10 |
| Auditált skin/animáció JS modul | Minden skin/animáció/art/world tartalomteszt és boot-input teszt | desktop, phone-portrait: 2/10 |
| Auditált menü/UI modul, gyökér CSS, menühangok, UI manifest | Desktop menük, audio, boot-input, art/cosmetic és mobil gameplay tesztek | Mind az 5 viewport |
| World1/2, foliage, rework maps, map JSON | World1/2, mobil gameplay és boot-input | desktop, phone-portrait, gm-returning-session, gm-phone: 4/10 |
| Auth, online, recovery, Supabase, GM, profil/mail/social/login integráció | Minden statikus suite, migráció és integritás | 10/10 |
| Központi HTML/app/runtime/config/manifest, tooling, dependencies, ismeretlen útvonal, törlés/átnevezés vagy több runtime-rendszer | Minden suite | 10/10 |
| Dokumentáció | Alapellenőrzések és CI-szabálytesztek | 0/10 |
| Kézi futtatás, release/beta ág vagy tag, verzióváltozás, bizonytalan diff | Minden suite | 10/10 |

A skin/UI listák explicit engedélylisták. Egy új `src/cherrift_desktop_*.js` vagy
más új modul önmagában nem jogosít csökkentett tesztelésre. A megosztott
`index.html`, build manifest vagy központi app egyidejű módosítása teljes futás.
Képfájl és egy auditált modul együttes módosítása a modulhoz szükséges Smoke-okat
és az összes képi tartalomtesztet kapja.

Az alapellenőrzés mindig `npm run validate`, `npm run audit`, a módosult képek
szigorúbb integritásellenőrzése és `npm run test:ci`. Így az optimalizálás nem
hagyja ki a teljes forrás syntax-, JSON-, CSS-, YAML-, TypeScript-, manifest-,
függőség- és meglévő runtime-hivatkozásellenőrzést.
PNG esetén a módosult fájlokra chunk-határ, CRC és IDAT-kicsomagolás is történik;
WebP/JPEG/GIF esetén alap konténer/végjel-ellenőrzés. Ez nem vizuális minőségteszt.

## Biztonságos változástartomány

- Push: a teljes `before..after` tartomány, továbbá az utolsó sikeres, azonos ági
  push-CI óta történt összes eltérés uniója. Emiatt egy megszakított vagy hibás
  előző push auth-változása nem vész el a következő PNG-commit mögött.
- PR: a base és a head merge-base-e és a head közötti teljes diff. Nem csak az
  utolsó commit vagy a webhook csonkolható fájllistája számít. A tesztelt checkout
  továbbra is a GitHub szokásos PR merge-refje.
- NUL-határolt útvonalak és `--no-renames`: az átnevezés mindkét oldala látható,
  szóköz/újsor nem csonkolja a listát. Szokatlan, nem besorolható név teljes futás.
- A detector csak tree- és szükséges ancestry-adatokat kér; a történeti képeket
  `blob:none` filterrel kerüli el. PR ancestry maximum 512 mélységig kereshető,
  utána teljes futás következik.
- Hiányzó SHA, első push, API-jogosultság/rate-limit/network hiba, hiányzó sikeres
  baseline, üres vagy értelmezhetetlen diff: teljes regressziós futás. Az ismert
  push-diff képfájljain ekkor is lefut a szigorú integritásellenőrzés.
- Új ágnál a default branch-hez viszonyítás kizárólag a módosult képek vizsgálatát
  segíti; ettől a regressziós terv továbbra is teljes marad.
- A fájllista tömörítve jut át jobok között, így egy nagyobb push nem ütközik a
  processzenkénti környezeti változó méretkorlátjába.

A sikeres baseline Actions metadata olvasásához `actions: read` szükséges.
Sem írási Actions-/check-jog, sem Supabase-secret nem kell.

## Concurrency, cache, deployment

A source és az egyes Smoke-jobok saját concurrency csoportot kapnak event,
ág/PR és case alapján. Egy új normál commit az előző azonos jobját megszakíthatja.
A kiválasztás előbb fut le, ezért felismerhető a `package.json` vagy a manifest
játékverzió-változása is. Release/beta, kézi és bizonytalan futások egyedi run-ID
csoportot kapnak: sem futó, sem várakozó ilyen ellenőrzést nem szorít ki új commit.
A kiválasztás és az összegzés rövid jobjai nem kapnak megszakítási csoportot.

A meglévő npm letöltési cache megmarad, `npm ci` továbbra is a lockfile alapján
telepít. A kihagyott Smoke-oknál sem checkout, sem cache-letöltés, sem install
nincs. A Python parser telepítése pip-cache-t kapott. Nem osztunk meg módosítható
`node_modules` könyvtárat jobok között. A tényleges Smoke-ok izoláltak és párhuzamosak;
a `fail-fast: false` és a külön 120 másodperces watchdog megmaradt.

A repositoryban egyetlen YAML workflow volt. A Pages külön, GitHub által kezelt
`dynamic/pages/pages-build-deployment` workflow; ehhez nem nyúltunk. Nincs új
Pages-, deployment-, adatbázis- vagy production-módosítás.
Az olvasható ruleset-lista üres volt; a klasszikus branch protection lekérése
403-at adott a GitHub integration jogosultsága miatt. Emiatt minden régi check-név
változatlan, a branch protection beállítását nem módosítottuk.

## Tesztaudit: mit ellenőriznek valójában?

| Script/fájl | Valódi függőség és lefedettség |
|---|---|
| `validate` / `validate.mjs` | Minden JS syntax, CSS parser, központi HTML azonosítók és betöltési sorrend, közvetlen asset-hivatkozások, build query/manifest, auth/network safety markerek, migrációnevek, artméretek |
| `audit` / `audit_repo.mjs` | Minden Git által követett fájl; syntax/parsing, kép/hang signature, belépési és hivatkozási gráf, hiányzó runtime-fájlok. A jelentés külön kezeli a dokumentáció/teszt-fixture referenciákat |
| `test:migrations` | Valós `supabase/migrations/*.sql` replay PGlite-on, javító migrációk és SQL szerződések; helyi, nem production-adatbázis |
| `test:menu-audio` | `cherrift_menu_audio.js`, menühang-manifest és WAV-adatok; clipping, throttling, pointer/keyboard/touch, auth/online click-sorrend |
| `test:boot-start` | `cherrift_boot.js` valódi JSDOM eseményekkel; readiness/auth gate, egyszeri start, reduced motion, overlay cleanup |
| `test:desktop` | Mind a 16 `desktop_*.test.mjs`: menu, skins, gear, gacha, upgrade, world, settings, profile, mail, collection, shop, missions, achievements, loading, social, login. Natív műveletek delegálása, mobil-visszaállás, stabil DOM és observerek. A login teszt az online modult, a loading teszt a tényleges artot/CSS-t is olvassa |
| `test:cherry-art` | `cherrift_skin_ui.js`, optimalizált UI-art manifest és valódi WebP fájlok; app skin ID-k és szerver-catalog összhangja |
| `test:cosmetics` | Kivágott tényleges app-kód, loading modul, skin UI, balance/prebeta/frame CSS; achievement/toast, frame-geometria és mini-panelek |
| `test:world1` | `world1.test` és `world1_assets.test`: world1/2/rework/foliage/runtime, map JSON és tier képek; determinisztikus layout, ütközés, async minőségváltás, betöltési sorrend, World3–6 megtartása |
| `test:world2` | World1 alap és World2 modul, moonlit dimensions/tier assetek, foliage/runtime; önálló cache, éjszakai render és firefly, változatlan ütközés |
| `test:gunner` | Gunner modul, app és szerver-catalog, valódi strips; lövedékek, multishot, spin, swept collision, delegálás |
| `test:base-cherry` | Base Cherry modul és mind a 48 sprite strip; méretek, attack/dash/cast megszakítás, renderer |
| `test:ninja-chibi`, `test:archer-chibi` | Appból vett valódi alap és skinmodul, PNG méret/frame-szerződés, manifest/HTML sorrend, támadás és más skinek delegálása |
| `test:cherry-motion` | Geometry + motion + shot alignment modulok VM-ben, HTML-sorrend, irányok, animáció/shot-koordináták |
| `test:succubus-chibi`, `test:sakura-dance` | Chibi és gait külön fájlok; tényleges sprite-ok, frame cache/compositor, álló/mozgó irányok, manifest és standalone preview egyezése |
| `test:recovery` | Valódi recovery és auth modul + fake IndexedDB; kvóta/transaction hibák, archiválás, account izoláció, GM preview autosave |
| `test:integrity` | Megosztott szerver-gameplay/catalog, valódi player-api sanitizer, auth és online modul; autoritatív progresszió, ár/receipt/run ticket, GM entitlement, accountváltás, stale válasz, dirty save/recovery |
| `test:online-api` | Valós player-api kód helyi tesztszerverrel; auth, concurrent write, idempotens receipt, megváltoztathatatlan progression |
| `test:mobile-gameplay` | Megosztott szerver-gameplay, tényleges player-api és rework maps + catalog/tier assetek; GM skin ownership, Training, World3–6 betöltés/geometry |
| `smoke:supabase-lock` | Valódi network guard VM-ben; bounded auth lock, session/signOut/function timeout és singleton |
| `smoke` / `smoke_09551.mjs` | Case-enként külön child process, heartbeat, 120 s watchdog; a `smoke_boot_096.mjs` tölti a tényleges HTML-t és lokális scriptjeit HTTP-n JSDOM-ba |
| `verify:supabase-public` | Külön, hálózatot használó deployment-verifikáció. Korábban sem volt a CI része; automatikusan nem indítunk production API-ellenőrzést |
| `catalog:build`, `build_*`, `prepare_*`, `normalize_*`, `generate_*` | Generátorok, nem regressziós tesztek. A CI nem generál újra játékadatot vagy assetet |

A `test:desktop-*` scriptek egyedi aliasek, a `test:desktop` glob már tartalmazza
őket, ezért nem futnak kétszer. A teljes terv most az `npm test` összes eddigi
statikus suite-ját lefedi, az eredeti CI-ből kimaradt skin/world tesztekkel együtt.

A tíz Smoke eset közös, valós teljes bootot használ. A viewportok:
`desktop` 1440×900, `wide-desktop` 1920×1080, `short-desktop` 1128×584,
`phone-portrait` 390×844, `phone-landscape` 844×390. Guest-belépést,
menü/gameplay indulást és UI-regressziókat ellenőriznek; desktop esetén külön
PC route cleanup is van. A `returning-session` szinkron Discord session-esemény
és getSession deduplikálás; `gm-returning-session` és `gm-phone` autoritatív GM
bootstrap, autosave, Ninja-equip, World6 és Training-run; `auth-timeout` és
`cloud-timeout` külön session/cloud elakadás és hibakezelés.
A Supabase-kliens mockolt, a szerver gameplay/sanitizer kód tényleges.
Ez nem élő Discord/Supabase E2E és nem Chromium pixel/layout screenshot teszt.

## 2026-10-28 GM observer-hiba

Forrás: Actions run `40723702538`, job `122944052151`, commit `c1ae7a8`.
A session/cloud boot sikerült; a 5000 callback-határ a második, Training run
megjelenítése közben lépett életbe. A napló önmagában nem azonosította a mutáló
modult. Helyben az eredeti kód több futásban sikeres volt, körülbelül 4200–4260
callbackkel, tehát a probléma időzítésfüggő, és a hosszú GM-eset közel volt a limithez.

Az új, hiba esetén automatikus observer-diagnosztika megmutatja a létrehozási
stackeket, callbackszámokat és az utolsó DOM-módosításokat. A mérés szerint az
energiakijelző ugyanazon HTML-t és class-t ismételten újraírta. A
`cherrift_prebeta.js:updateEnergyUi` most csak valódi megjelenítési eltéréskor ír.
Az energia-számítás és a modal click-handler változatlan. A regressziós teszt 100
azonos frissítésnél nulla DOM-mutatást követel, de ellenőrzi a valós értékváltást,
a kattintást és a natív markup cseréje utáni helyreállítást is.
A módosított GM-futás helyben 3580 callbackkel sikerült. Ez a felesleges runtime
munkát csökkenti; a korábbi hibát nem állítjuk determinisztikusan reprodukáltnak.
Az 5000-es limit, a native observerek, a watchdog és az összes assertion megmaradt.

## Mért költség és korlátok

A 2026-10-28-i sikeres `40707730646` futásban a source job 49 s, a tíz Smoke job
összesen 600 runner-másodperc volt. Ebből 306 s repository-checkout és 215 s a
Smoke-folyamatok tényleges futása; az npm install jellemzően csak 1–3 s.
Az `assets/` könyvtár helyben 581 MB. Ezért a kihagyott teljes checkoutok jelentik
a legnagyobb megtakarítást; a meglévő npm-cache alapvetően már működött.

Képes commit: 10/10 Smoke és 10 nagy checkout elkerülhető. Skin: 8/10, UI: 5/10,
world: 6/10 Smoke elkerülhető. A rövid kompatibilitási jobok és az új detector
költsége megmarad; a 100% a Smoke-folyamatokra, nem a teljes Actions-számlára utal.
A teljes futás továbbra is teljes költségű. Konkrét falióra-gyorsulást a runner
sorbanállása és hálózata is befolyásolja.

A régi teljes audit header/signature szintű képaudit, nem teljes dekódolás.
Egy kiegészítő vizsgálat a már meglévő
`assets/ui/elemental_resonance/elements/abyssal.png` fájlnál csonkolt PNG-t talált.
Ehhez az assethez a CI-optimalizálás nem nyúl. A szigorúbb új ellenőrzés a módosult
képekre vonatkozik, így egy új képsérülés ellen véd, de nem minősíti újra az összes
örökölt assetet. A teljes vizuális art-audit külön feladat.

## Megvalósítás utáni ellenőrzés

- `npm run validate`: sikeres.
- `npm run audit`: sikeres; 0 syntax/signature hiba és 0 hiányzó runtime-hivatkozás.
- Minden teljes statikus suite: 316 Node teszteset sikeres, továbbá migráció-replay
  és Supabase-lock smoke sikeres. A tesztfutási idők helyben suite-onként 0,5–6,9 s.
- `npm run test:ci`: 18 sikeres teszt; a kért tíz kiválasztási helyzet, Git-fixture
  többcommitos push/PR, megszakított/hibás baseline, API-hiba, verzióváltás,
  legacy check-nevek/concurrency, PNG-sérülés és energy observer-regresszió.
- A tényleges detector CLI, GitHub output/summary formátum és tömörített fájllista
  is ellenőrizve; külön helyi bare Git remote-on az első push/default-branch
  integritás-fallback is sikeres.
- YAML parse, `actionlint 1.7.12`, JS syntax és `git diff --check`: sikeres.
- A kilenc nem alap-desktop Smoke a változatlan 120 s watchdoggal sikeres:
  wide/short desktop, portrait/landscape phone, returning, GM desktop/phone,
  auth-timeout, cloud-timeout. A javított GM-desktop ismételt futása 3506 callback.
- Az alap `desktop` belső assertionjei és összes PC route-ja egy külön közvetlen
  diagnosztikai futásban sikeresek. A normál wrapper helyben többször túllépte a
  120 s watchdogot. A limitet nem változtattuk; ezt nem könyveljük sikeres normál
  desktop Smoke-nak. GitHub runneren történő verifikáció szükséges.
- A release/dispatch/concurrency eseményeket policy/Git-fixture és workflow-lint
  szinten vizsgáltuk, nem állítjuk őket éles GitHub Actions eseményként lefutottnak.
- A GitHub-publikálás nem sikerült: a Git CLI-hez nincs hitelesített írási kapcsolat,
  a kapcsolt GitHub integration `create tree` kérése 403 `Resource not accessible
  by integration` választ adott. Így nincs feltöltött branch vagy PR, és az új
  workflow éles Actions-futása nem igazolt. A kész két commit patchként átadható.
