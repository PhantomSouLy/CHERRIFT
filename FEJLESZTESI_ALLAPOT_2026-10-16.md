# CHERRIFT – fejlesztés előtti állapotfelmérés

Ez a javítás előtti állapot. A következő munkamenet változásait és a telepítési korlátokat a `JAVITASOK_ONLINE_PC_2026-10-17.md` foglalja össze.

Dátum: 2026. október 16. · Vizsgált commit: `240c01c77f8e60f70b72f4b452bc542ab987bdb7`

A játék helyben elindul, az alap játékmenet használható. A folytatás előtt a mentésbiztonságot és az online gazdaság ellenőrzését érdemes rendezni. Az indulási tesztek sikeressége önmagában még nem igazolja az összes világ, jutalom és online funkció helyességét.

## Mit ellenőriztem?

- Mind a 887 Gitben nyilvántartott fájl automatikus leltára: összesen 278 766 985 byte, 771 kép, 2 hangfájl. Ez fájlszintű vizsgálat; nem minden kép kézi megtekintése.
- JavaScript-szintaxis, CSS-parszolás, assethivatkozások és a meglévő validátorok.
- Indulás, vendégállapot, mobil/asztali nézetek, szimulált visszatérő Discord-session és hálózati időtúllépések.
- Kiemelt forrásellenőrzés: Auth, mentés, hálózati guard, runtime, progresszió, Energy, címek, gacha, Social/ranglista, mail/redeem, GM API és SQL-jogosultságok.
- Valódi böngésző: vendégbelépés; kezdő 500 Coin / 50 Energy / 3 Common láda; világ- és fejezetválasztás; World 1-1 harc, két szintlépési választás, halál, visszatérés; 1× ládanyitás; mobilos gacha és Cherry-választó. A megfigyelt böngészőnaplóban nem volt error/warn.

Nem történt éles adatbázis-módosítás, Discord-bejelentkezés, levélküldés vagy kódbeváltás. A játékkódon nem változtattam.

## Ellenőrzések eredménye

| Ellenőrzés | Eredmény / korlát |
|---|---|
| `npm ci --ignore-scripts --no-audit --no-fund` | Sikeres, 53 csomag települt. |
| `npm run validate` | Sikeres, telepített CSS-parserrel: 28 JS, 11 CSS, 41 forrásfájl. |
| `npm run audit` | Lefutott, de hibával tért vissza: 6 Python/YAML/TOML ellenőrzést a hiányzó `python3` miatt szintaxishibának minősített. |
| Python és TOML külön parszolása a beépített Pythonnal | Sikeres. YAML külön ellenőrzése nem igazolt: a használt Pythonból hiányzik a `yaml` modul. |
| `npm run smoke:supabase-lock` | Sikeres. |
| Desktop 1440×900 | Sikeres. |
| Wide desktop 1920×1080 | Elsőre 15 s boot-controller timeout, önálló ismétlésre sikeres. |
| Short desktop 1128×584 | Sikeres. |
| Phone portrait 390×844 | Sikeres. |
| Phone landscape 844×390 | Sikeres. |
| Returning session | Sikeres, szimulált session/API. |
| Auth timeout | Sikeres, szimulált hibával. |
| Cloud timeout | Sikeres, szimulált hibával. |
| `npm run verify:supabase-public` | Nem igazolt: `ENOTFOUND qkukvltevryegjbnwcgg.supabase.co`. |
| Három célzott helyi mentés-/szerverpróba | Mindhárom reprodukálta az alábbi P1 hibákat. |

Az egyben indított `npm test` nem volt sikeres. A táblázat a külön végrehajtott vizsgálatok tényleges eredménye; a nyolc smoke-eset külön végül mind átment. A DNS-hibából nem állapítható meg, hogy a Supabase-projekt megszűnt, szünetel vagy az elérési környezet hibás.

## Javítandó hibák, fontossági sorrendben

### 1. P1 – Az offline haladás újraindításkor felülíródhat

Hely: `src/cherrift_auth.js:739–763`, továbbá `891–909`.

A `resolveDiscordSave()` sikeres felhős betöltéskor feltétel nélkül lenullázza a `pendingSave` értékét és a felhős állapottal felülírja a helyi backupot. A backupot csak hibás bootstrap esetén használja. Így a hálózati hiba közben gyűjtött, még fel nem töltött haladás elveszhet, ha a játékos újratölti az oldalt és az új bootstrap már sikeres.

Helyi reprodukció: a tényleges függvény 900 Coin függő haladás mellett 500 Coin távoli állapotot kapott; az eredmény és az új backup 500 Coin lett, a függő mentés eltűnt. A teszt izolált függvénypróba, nem éles fiókon futott.

Javaslat: a backupban legyen külön dirty állapot és alapul szolgáló szerverrevízió. Sikeres bootstrap előtt is vizsgálni kell a helyi függő mentést. Ütközéskor mindkét példány maradjon helyreállítható; valutákat nem szabad egyszerű összeadással összeolvasztani.

### 2. P1 – Késői mentésválasz fiókváltás után a másik fiók állapotát módosíthatja

Hely: `src/cherrift_auth.js:503–523`, `739–760`.

A `sendProgress()` a hálózati várakozás után nem ellenőrzi, hogy még ugyanaz a felhasználó aktív-e. Konfliktusválasznál a kapott mentést az aktuális session profiljával látja el, majd betölti a UI-ba. A fiókváltás törli a függő értékeket, de a már futó válasz feldolgozását nem érvényteleníti.

Helyi reprodukció: A fiók mentési kérése várakozott; közben az aktív session B lett. A visszaérkező A-konfliktus 900 Coin értéke B-re kötött állapotként került a UI-ba. Ez helyi, késleltetett válaszos próba; éles fiókok közötti adatmozgást nem végeztem.

Javaslat: minden aszinkron mentéshez rögzíteni kell az induló account UUID-t és session-generációt. Eltérés esetén a válasz nem írhat UI-t, backupot, revíziót vagy függő mentést. A Live Services mail/redeem válaszkezelésére is terjedjen ki ugyanez a védelem.

### 3. P1 – A szerver elfogadja a kliens gazdasági és fejlődési adatait

Hely: `supabase/functions/player-api/index.ts:227–260`, `383–404`, `532–549`.

A `sanitizeProgressSave()` főként tulajdonost, méretet és néhány mező alakját ellenőrzi. A klienstől kapott Coin, Energy, szint, felszerelés, unlockok és több entitlement változatlanul menthető. A `ranking_submit` közvetlenül a kliens `power` és `level` értékét használja; a felső korlát nem bizonyítja, hogy az értéket a játékos megszerezte.

Helyi reprodukció a tényleges szerveroldali sanitizerrel: 1 000 000 000 000 Coin, 999-es szint, World 6-5 unlock és `prebeta.entitlements.owner=true` átment. Ez nem jelent GM API-hozzáférést: a GM API külön, szerveroldali adminellenőrzést végez.

Javaslat: az érzékeny gazdasági változásokat szerveroldali műveletekből kell levezetni. Az entitlementeket szerveroldali rekordból kell visszaállítani, a Power/ranglista értéket ellenőrzött állapotból számítani. Offline játék megtartása mellett külön döntés kell arról, milyen offline haladás kerülhet a hiteles online gazdaságba.

### 4. P2 – A 100 aktív játékosos ranglistakorlát megkerülhető korábbi helyezéssel

Hely: `supabase/functions/player-api/index.ts:543–548`; `src/cherrift_prebeta.js:278–300`.

A szerver már egyetlen résztvevőnél eltárolja az első helyet `best_weekly_rank` értékként. A kliens később az aktuális aktív létszámot és ezt a történelmi legjobb helyet vizsgálja. Így aki az egyszemélyes listán első volt, a 100-as küszöb elérésekor Top 1 címet kaphat akkor is, ha a versenyképes mezőnyben sosem volt első.

Javaslat: a jutalomra jogosító legjobb helyezést csak a megfelelő létszámú mezőnyből szabad rögzíteni; tisztázni kell a heti zárás és a jutalomosztás szabályát is. Forrás alapján azonosított logikai hiba, éles 100-fős próbát nem végeztem.

### 5. P2 – Kölcsönös tiltásnál a Social tiltásellenőrzése hibásan továbbengedhet

Hely: `supabase/functions/player-api/index.ts:475–476`, `491–492`.

A kétirányú `user_blocks` keresés `.maybeSingle()` eredményt vár. Kölcsönös tiltáskor két megfelelő sor lehet; ilyenkor a lekérdezés hibával és üres adattal térhet vissza. A kód az `error` mezőt nem kezeli, csak a `block` értéket ellenőrzi, ezért kérés/elfogadás továbbmehet.

Javaslat: létezésvizsgálat legfeljebb egy találattal, külön adatbázishiba-kezeléssel. Az ellenőrzés és a barátkapcsolat létrehozása hosszabb távon egy tranzakcióba kerüljön. Forrás alapján azonosított hiba; az élő adatbázis viselkedését nem teszteltem.

### 6. P2 – A dokumentált fejlesztői portot az API CORS-listája nem engedi

Hely: `README.md` indítási útmutató; `supabase/functions/player-api/index.ts:5–8`; `supabase/functions/gm-api/index.ts:17–20`.

A README a 8080-as portot javasolja, a két API csak a 8000-es localhost/127.0.0.1 originokat engedi. Egy 8080-ról érkező kérésre a válasz a GitHub Pages origint adja vissza, amit a böngésző CORS-hibaként kezel. Ez az aktuális DNS-hibától független eltérés.

Javaslat: egységes fejlesztői port, és ugyanennek ellenőrzése a CORS- és OAuth-beállításokban.

### 7. P2 – Az audit hibásan különíti el a játékhibát és az ellenőrzőkörnyezet hibáját

Hely: `tools/audit_repo.mjs:293–323`, referenciafelderítés `:223` körül.

A hiányzó `python3` ellenőrző miatt 6 fájl `*-syntax:undefined` jelzést kapott. A külön Python/TOML-próba mindkettőt sikeresen parszolta; a YAML státusza ellenőrizetlen. A „3 aktív hiányzó hivatkozás” mind a validátor tiltólistájában szereplő, szándékosan törölt fájlra mutat, nem a játék által kért assetre.

Javaslat: indulás előtti eszközellenőrzés, Windows-kompatibilis Python-kiválasztás, külön „nem ellenőrizhető” státusz; a betöltési hivatkozások elkülönítése a tiltólistáktól és dokumentációs említésektől. A 450 nem bizonyítottan használt assetet nem indokolt automatikusan törölni.

### 8. P2 – A tesztek nem fedik le a teljes játékot, az indulási időzítés ingadozik

Hely: `tools/smoke_boot_096.mjs:653`, `:903`, `:1140` után.

A smoke jsdomot és helyettesített Canvast, hangot, hálózatot használ. Az indulás és néhány menüútvonal ellenőrzése hasznos, de nem igazolja a tényleges rajzolást, érintésvezérlést, FPS-t, teljes pályavéget, jutalomelszámolást vagy valódi mentés-visszatöltést. A wide-desktop eset elsőre 15 másodperces boot-controller időkorláton elbukott, külön megismételve átment; ennek okát ez a felmérés nem határozta meg.

Javaslat: legalább egy valódi böngészős automatizált pályakezdés–kilépés–visszatöltés teszt, egy stage-clear jutalomteszt, és célzott regresszió a fenti két mentési hibára. A jelenlegi bizonyíték alapján a timeout puszta megemelése nem tekinthető javításnak.

## Karbantarthatóság és tartalmi állapot

- A `src/cherrift_app.js` 1 263 465 byte. Számos történelmi prototípus- és UI-felülírást tartalmaz; az új modulok betöltési sorrendje továbbra is számít. Érdemes rendszerenként kiszervezni a működést, stabil viselkedési tesztek mellett.
- A `src/cherrift_balance.js` központi gacha-adatai mellett a `src/cherrift_gacha.js` saját pity- és esélyértékeket tart. A pity jelenleg egyezik, de a balance fájl egyedüli módosítása nem minden esetben változtatja meg a tényleges működést.
- A manifest `0983-structure` buildet és egységes queryt állít; az index különböző `0987`, `0990`–`0995` assetverziókat használ. A validátor csak `098x` queryket gyűjt, így ezt az eltérést nem érzékeli. Egyetlen generált buildazonosító és aktuális manifest segítene.
- World 5–6 esetén a prebeta modulban továbbra is vannak placeholder-definíciók, miközben a runtime már külön World 5–6 ellenfélasseteket tartalmaz. A végleges tartalmi állapothoz világonkénti végigjátszás kell; a placeholder-dokumentáció több törölt/régi útvonalat említ.
- A kézzel vizsgált mobilos skinválasztó és gacha használható, a splash art látható. A teljes UI minden állapotára ebből nem következik hibamentesség.

## Javasolt folytatás

1. **Mentésbiztonság:** dirty backup helyreállítása, fiókhoz kötött aszinkron válaszok, több tab/offline/reload regresszió.
2. **Online alapok:** Supabase-elérés igazolása, CORS-port egységesítése, valódi két tesztfiókos belépés/mentés/mail/redeem próba.
3. **Gazdaság és ranglista:** szerveroldali ellenőrzés, entitlement-kezelés, 100-fős jogosultsági szabály, Social tiltásjavítás.
4. **Fejlesztői ellenőrzések:** audit környezethibáinak javítása, teljes zöld `npm test`, valódi böngészős játékmenettesztek.
5. **Tartalom és rendrakás:** a hat világ végigjátszása, jutalmak és Energy elszámolása, majd a régi runtime-rétegek fokozatos kiváltása.

## Helyi bizonyítékok

Az `audit-output/` Git által figyelmen kívül hagyott helyi könyvtár. A fájlok ebben a munkapéldányban elérhetők, commitba nem kerülnek automatikusan.

- `audit-output/repo-file-audit.json` és `.md`: teljes fájlleltár, a fent ismertetett téves/környezeti jelzésekkel.
- `audit-output/audit-validate-output.log`, `audit-lock-output.log`, `audit-test-output.log`: ellenőrzési naplók.
- `audit-output/audit-smoke-output.log`, `retry-wide.log`, `smoke-*.log`, `remaining-smokes.json`: az első elakadás és a külön lefutott esetek.
- `audit-output/audit-public-output.log`: az élő ellenőrzés DNS-hibája.
- `audit-output/review-probes.mjs` és `.log`: a három P1 hiba izolált helyi reprodukciója. Újrafuttatás: `node --no-warnings audit-output/review-probes.mjs` a projekt gyökeréből.

A következő kiadásra kész állapotot nem igazoltam. Ehhez a mentési hibák javítása, az élő szolgáltatás elérése és a teljes pályavégi/online ellenőrzés még szükséges.
