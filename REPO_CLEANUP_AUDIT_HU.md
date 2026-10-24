# CHERRIFT – PC cleanup, 2026-10-23

Kiinduló main commit: `ce761da3170f2dd97fb597c365bc126bd999dd86`.
Új cache build: `1019-pc-cleanup`. A játék verziója változatlan:
`0.9.5-prebeta.1`.

A módosítások a helyi forrásban elkészültek. A GitHub-bővítmény az ág létrehozását
403 `Resource not accessible by integration` hibával elutasította; távoli ág,
PR és élesítés nem készült. A frissítőcsomag módosított fájlokat, alkalmazható
Git-patch-et és külön törlési listát tartalmaz.

## Elvégzett tisztítás és hibajavítás

### Gear

- Kikerült az eredeti papírbábu/inventory/details HTML és kirajzolás.
- Kikerült a v040b külön pointer-drag rendszere; az aktuális v0560 drag/drop és
  tárgyrészletező maradt az egyetlen natív Gear-tulajdonos.
- Kikerült a v050 leváltott inventory filter/sort/detail UI-ja, a v053 mobil Gear
  és a teljes, szintén leváltott v0552 Gear-generáció.
- A v0560 renderer már nem futtatja előbb a régi rendererláncot.
- A `showGearDetails`/`showEmptySlot` API a jelenlegi modalhoz kapcsolódik.
- A régi layout-író PC-n korán visszatér. A későbbi refresh/observer nem írhatja
  vissza a régi gridet vagy a régi abszolút slotkoordinátákat.
- A PC Gear observer csak a Gear-panelt és saját modalját figyeli.
- Az üres inline stílusok ismételt törlése megszűnt.

### Achievements

- Kikerült a v052/v053 régi eredménylista és annak helyi reward-claim kezelője.
- Az egyetlen aktív lista a clean runtime katalógusából épül.
- A PC-felület a natív kirajzolással egy időben készül el; nem egy későbbi
  képkockában cserélődik rá a régi listára.
- A PC-fejléc és a státuszszűrő natív újrarajzoláskor is megmarad.
- Változatlan tartalomnál a kártyák, fókusz, szűrés és görgetés sem épül újra.
- A kategóriafrissítés ugyanazt az online, szerver által ellenőrzött claim
  útvonalat használja. A régi mentésmezőket megőriztem a kompatibilitáshoz.

### Más leváltott menük

- Kikerültek a külön v055 Profile, Statistics, Collection és Bestiary panelek,
  létrehozóik és régi navigációs gombjaik. A profilalapértékek és az ellenfelek
  felfedezésének könyvelése megmaradt.
- Kikerült a külön v055 Shop és helyi vásárlási kezelője. A meglévő gombok az
  aktuális Shop-útvonalra mutatnak.
- Kikerült a v0933 PC World/Chapter renderer és a v094 párhuzamos World-grid,
  azok kattintáskezelőivel és késleltetett kirajzolásaival együtt.
- Az aktív World/Chapter-választó a `cherrift_world_ui.js` maradt.
- A world/stage adatok, Training-adatok, mapgenerálás és combat nem kerültek
  törlésre a korábbi világmodulból.

### Optimalizálás és ellenőrzések

- 452 leváltott CSS-szelektor kikerült a közös shell/app stílusból. Vegyes
  szabálynál csak a megszűnt szelektor törlődött, a használt szabály megmaradt.
- A két CSS-fájl összesen **45 557 byte-tal** kisebb lett.
- A központi JS körülbelül **68,5 KB-tal** kisebb lett. Ez nyers forrásméret,
  nem FPS- vagy tömörített hálózati mérés.
- A PC-s menük változatlan állapotú frissítései nem írják újra fölöslegesen a
  body aktív osztályait. A régi desktop navigáció és az eszközosztályozás is
  csak változáskor ír; a mobil game-resize nem indul újra minden DOM-változásra.
- A runtime az egy képkockába eső shell-frissítéseket összevonja.
- `test:desktop` gyűjtőparancs készült; a CI ezt is futtatja. Korábban a
  workflow-ból a PC-s rework-tesztek kimaradtak.
- `audit -- --source-only` célzott audit készült, így nem kell a teljes
  kép-/hangállományt hash-elni egy forrástisztításhoz.
- Minden first-party betöltési query és a manifest egységes buildazonosítót kapott.

## Tételesen törölt fájlok

Ezek nem aktív játékfájlok; a megszűnt részcsomagok telepítési jegyzetei,
korábbi tesztpillanatképei, üres leírói vagy elavult tartalomlistái.
A verziótörténetből visszaállíthatók.

1. `TELEPITES.txt`
2. `TELEPITES-MAIL.txt`
3. `TEST_RESULTS_MAIL.txt`
4. `UPDATE_VERSION_BEFORE_RELEASE.txt`
5. `NEXT_CONTENT_HOOKS.md`
6. `docs/Readme.md`
7. `docs/pc-mainmenu/Readme.md`
8. `docs/pc-skins/readme.md`
9. `docs/pc-profile/TEST_RESULTS.txt`
10. `docs/pc-mail/browser-results.json`
11. `docs/pc-collection/browser-results.json`

A hasznos kiadási/indítási tudnivalók a README-be kerültek. A PC rework-leírások
hiányzó ZIP-telepítési jegyzetekre mutató hivatkozásait javítottam.

## Megtartott fájlok és közös natív elemek

| Terület | Aktív PC-modul / közös alap |
|---|---|
| Loading, login-kezdőképernyő | `cherrift_desktop_loading.js`, boot és auth |
| Főmenü | `cherrift_desktop_menu.js` |
| Cherry / skinek | `cherrift_desktop_skins.js`, skin UI |
| Gear | `cherrift_desktop_gear.js`, v0560 inventory és modal |
| Gacha | `cherrift_desktop_gacha.js`, gacha/online modul |
| Upgrade | `cherrift_desktop_upgrade.js`, közös skill tree |
| World / Chapter | `cherrift_desktop_world.js`, world UI |
| Settings | `cherrift_desktop_settings.js`, közös beállításmezők |
| Profile / Mail | desktop profile/mail és account-mail |
| Collection | desktop collection és natív library katalógus |
| Shop | desktop shop és közös online gazdaság |
| Missions / Weekly | desktop missions és közös küldetésadatok |
| Achievements | desktop achievements és clean runtime katalógus |
| Social / Login Rewards | desktop social/login és közös online állapot |

A régi nevű natív `libraryV0551`, `gearV0560`, `dailyQuests`, `loginRewards`,
`chests` stb. több helyen az új PC-megjelenítés adat- és eseményforrása.
Ezek nem bizonyítottan felesleges menük. Az új UI gombjai és a mobil közös
működés ezekre épülnek, ezért nem töröltem őket.

A megmaradt régi főmenürészek egy része a mobil felületet, pénztárcaadatokat,
profilképet és hírek forrását adja az új PC-főmenühöz. Eltávolításuk külön
adatforrás-kiváltást igényel; tömeges törlésük hibát okozna.

Megtartottam a Supabase-migrációkat, auth/GM-telepítési leírásokat, roadmapet,
balansz- és korábbi fejlesztési követelményeket, teszteszközöket, grafikai
promptokat és a rework referencia-képeit. Nem a fájlkiterjesztés vagy régi
verziószám alapján döntöttem a törlésről.

Az assets mappából **kép, hang, sprite, skin, manifest és egyéb tartalmi asset
nem lett törölve vagy lecserélve**. Csak a működési takarításhoz szükséges két
közös CSS módosult. Külön grafikai/asset-audit nem történt.

## Tesztek

- Forrás-, CSS-, JSON- és hivatkozásvalidáció: sikeres.
- Célzott forrásaudit: 162 szöveges fájl; 0 szintaxis-/parse hiba;
  0 hiányzó aktív runtime-hivatkozás. 927 grafikai/hang/tartalmi fájl kihagyva.
  A 6 fennmaradó nem futási literális találat tervezett assetútvonal vagy a
  validátor tiltólistája. A két azonos Deno-config szükséges, nem törlendő.
- PC-s felülettesztek: **140 sikeres**.
- Mentési/gazdasági integritás: **34 sikeres**.
- Valódi Edge Function forrást futtató helyi API-fixture: **1 sikeres**.
- Gunner / harci regresszió: **5 sikeres**.
- Supabase Auth/Web Lock/timeout regresszió: sikeres.
- Indítási próbák: desktop 1440×900; 1920×1080; 1128×584;
  visszatérő Discord; GM Discord; Auth-timeout.
- Kiegészítő közös kód-regresszió: telefon álló/fekvő és cloud-timeout.
- A PC-próba külön ellenőrzi a megszűnt DOM hiányát, a Gear régi layout-írójának
  hatástalanságát, és az Achievements változatlan frissítésének stabilitását.
- A 1440×900 eset végigjárja a további PC-útvonalakat is. A MutationObserver
  watchdog megmaradt: 5000 callback a bootban, illetve egy-egy vizsgált
  útvonalon; az összesített callbacks-szám külön naplózott.

A smoke-próbák a teljes alkalmazást futtatják JSDOM-ban, valódi observerekkel,
helyi Auth/API-fixture-rel. A külön képernyőtesztek keresést, kategóriaváltást,
fókuszt, Escape-kezelést, online batch-claimet, hibás válaszokat és
accountváltást is vizsgálnak.

## Élő Supabase – talált külön hiányosság

A projekt `ACTIVE_HEALTHY`. A publikus ellenőrzés eredménye:

- Auth settings: HTTP 200; Discord OAuth indítás: HTTP 302.
- Mind a 15 vizsgált védett tábla elutasítja a közvetlen vendéghozzáférést.
- `player-api` és `gm-api`: elérhető, CORS működik.
- `player-api` a publishable kulcsot nem fogadja el játékos-sessionként: HTTP 401.
- **A `submit-report` nincs telepítve, HTTP 404.** Emiatt a Feedback/Bug Report
  beküldés élőben nem működik. A forrás létezik a repóban, de a funkció
  telepítése és a két Discord-webhook titkos beállítása még szükséges.
  Tesztüzenetet nem küldtem Discordra.

A `verify:supabase-public` a működő core ellenőrzése után e hiányzó deployment
miatt hibával lép ki. Ezt nem jelöltem sikeres teljes online tesztnek.

Az advisorok további karbantartási jelzései: 7 idegen kulcshoz hiányzó index;
3 régi `player_saves` RLS-policy soronkénti Auth-kiértékelése; egy mutable
function search_path; az `rls_auto_enable` függvény hívhatósági jelzései;
kikapcsolt leaked-password protection. A 15 policy nélküli RLS-táblán a két
kliensszerep közvetlen SELECT-joga is tiltott, ezért nem adtam hozzájuk
indokolatlanul publikus policykat.

Kapcsolódó Supabase-leírások:

- [Hiányzó FK-index](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)
- [RLS Auth initplan](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan)
- [Function search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Security definer hozzáférés](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Jelszóvédelem](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

Adatbázisadatot, sémát, indexet, Auth-beállítást vagy Edge Function deploymentet
nem változtattam meg ebben a menütisztításban.

## Ellenőrzési határok és folytatás

A közös runtime-ban további történeti rétegek maradtak, amelyek valódi
játéklogikát vagy mentés-kompatibilitást adnak. Ezek nem kerültek vakon törlésre.
A megmaradt aktív forrás-/CSS-belépési pontok mind betöltöttek az audit szerint.

Élő Discord-fiókon jutalomátvétel, teljes végigjátszás és GPU/FPS-benchmark
nem történt. Valódi Chromium képernyőkép-ellenőrzés sem készült: ebben a
környezetben a böngésző letöltése meghiúsult. A villanást okozó régi írót és
rendererláncot megszüntettem, a működési ellenőrzések ezt védik; telepítés után
PC-n érdemes a Gear/Achievements megnyitását vizuálisan is kipróbálni.

Következő külön feladatok: a hiányzó `submit-report` telepítése és webhookjai;
majd a kért, külön assets-rendezés. A mobil rework továbbra is külön feladat.
