# CHERRIFT Admin Center (Sakura Crystal) | telepítés és biztonság

## Röviden

A kiválasztott koncepció alapján új **`/admin/`** kezelőfelület készült. A meglévő **`/gm/`** Mail Sender, Redeem Creator és Profile Editor **változatlanul megmarad**. A csomag az Admin Center mellett a játék Events menüjét is összeköti az új event-katalógussal. Nem ír játékmentést, nem állítja át a CHERRIFT jelenlegi játékbelépését és nem érinti a játékmenetet.

A kezelőben: Dashboard, Beta Management (Overview, Registrations, Lottery, Waves, Whitelist, Settings), Users & Permissions (Adminok, Role Presetek, Permissions), Game Management, Discord Integration, Mail & Rewards, Analytics, Notifications, Logs & Security, System Settings, Data & Backups (config JSON export), Maintenance placeholder.

**Tulajdonosi jogosultság:** a migráció a meglévő `gm_admins` tábla egyetlen aktív, Discord OAuth-identitással rendelkező `owner` rekordját rögzíti a `admin_owner_lock` táblában. A fejlesztéskori ellenőrzésen pontosan egy ilyen tulajdonos létezett. A rendszer soha nem tesz Owner-ré más felhasználót, sem az e-mail/Discord felhasználónév, sem a belépési sorrend alapján. A tulajdonos nem módosítható a panelen. További staff Discord ID-ként meghívható, és egyedi jogokkal, mentett presetekkel aktiválható. A tulajdonos személye a backendben kettős ellenőrzést kap: Supabase user ID + az Auth által igazolt Discord provider ID.

## Telepítési sorrend

1. Készíts mentést a Supabase adatbázisról, és győződj meg róla, hogy csak **egy** aktív `owner` van. Másold a csomag fájljait a `PhantomSouLy/CHERRIFT` repository gyökerébe az azonos relatív útvonalakra. A módosított meglévő fájlokat is át kell másolni; előbb ellenőrizd a diffet.
2. A `supabase/migrations/20261030004054_admin_center.sql` SQL-t futtasd **egyszer**, sorrendben, Supabase migrationként (CLI `supabase db push` a megfelelően linkelt projekttel, vagy a Dashboard SQL Editor). A migration additív, megőrzi a régi adatokat.
3. Telepítsd a `supabase/functions/admin-center-api` Edge Functiont, **JWT ellenőrzéssel (`verify_jwt=true`)**. A function a már meglévő, szerveroldali `SUPABASE_SERVICE_ROLE_KEY`-t használja, soha nem a böngészőből.
4. Supabase Authentication → URL Configuration → Redirect URLs: add hozzá **`https://phantomsouly.github.io/CHERRIFT/admin/`** és a kívánt helyi URL-t, például `http://localhost:8000/admin/`. A régi `/gm/` és játék redirecteket hagyd meg.
5. A GitHub Pages frissülése után nyisd meg `https://phantomsouly.github.io/CHERRIFT/admin/`, és lépj be a meglévő Owner Discord-fiókkal. Egyéb fiókok ekkor még nem jogosultak.
6. Owner-ként a Users & Permissions / Roles & Presets résznél készíts preseteket, majd az Admins lapon add meg a staff valódi Discord ID-ját, és jelöld ki, mihez férhet hozzá. A meghívás a panel adatbázisába kerül; a jogosultság csak az azonos Discord-fiókkal történő OAuth-bejelentkezés után aktiválódik.

## Discord bot és regisztráció

A Beta felület adatbázisba menti a jelentkezési beállításokat, a hullámokat és a whitelist-státuszokat. A Discord gombos jelentkezés külön, aláírásellenőrzött webhookon működik. **Nem működik önmagától a bot konfigurálása nélkül.**

1. A Discord Developer Portalon készíts vagy konfigurálj egy alkalmazást/botot. A **General Information → Public Key** értékét Supabase Edge Function secretként állítsd be `DISCORD_PUBLIC_KEY` néven.
2. Telepítsd a `supabase/functions/beta-discord` functiont **`verify_jwt=false`** beállítással. Ez kötelező, mert a Discord nem küld Supabase JWT-t. A function minden interakciót kötelező Ed25519 aláírás és időbélyeg ellenőrzéssel hitelesít. Minden más kérés 401 választ kap.
3. A Discord Developer Portal **Interactions Endpoint URL**: `https://qkukvltevryegjbnwcgg.supabase.co/functions/v1/beta-discord`. A Discord PING ellenőrzést a function támogatja.
4. A botot hívd meg a CHERRIFT Discord szerverre. Az Admin Center Discord Integration panelen add meg a Guild ID-t, Application ID-t, regisztrációs csatorna ID-ját, értesítési csatornát, regisztrált és Beta Tester rang ID-kat. Ezek **nem** titkosak.
5. Ha rangszinkron kell, akkor `DISCORD_BOT_TOKEN` secretként a function környezetében konfigurálandó, soha ne GitHubban vagy a kezelőfelületen. A botnak megfelelő `Manage Roles` jogosultság és ranghierarchia szükséges. Rangszinkron csak a konfigurációs kapcsoló bekapcsolása után történik.
6. Ha létre szeretnéd hozni a regisztrációs üzenetet: helyben állítsd be `DISCORD_BOT_TOKEN` és `DISCORD_CHANNEL_ID` környezeti változókat, majd futtasd: `node tools/post_registration_button.mjs`. Az üzenet 3 gombot tartalmaz: Register, Status, Unregister.
7. A Beta Management → Settings lapon nyisd meg a regisztrációt. Alapból **CLOSED**, a sorsolás nem indul magától. A nyertesek kiválasztását a GM panelen végezheted el.

### Regisztrációs státuszok

- `pending`: jelentkezett, még nincs kiválasztva.
- `selected`: sorsolt vagy manuális whitelist-nyertes.
- `reserve`: tartalék hely.
- `activated`: admin által aktivált hozzáférés. A játékba való beléptetés ettől még külön integrációt igényel.
- `revoked` / `rejected`: visszavont vagy elutasított jelentkezés.

A `beta.draw` cryptographic random selectionnel készül. A `Preview` nem módosít adatot, a végleges futás tranzakciós, adott hullámonkénti kapacitás ellenőrzéssel és auditnaplóval. Egy Discord ID egyszer szerepelhet. 10 000-nél nagyobb jelentkezési tömeghez később batch/SQL-lottery implementáció szükséges: a jelenlegi API szándékosan elutasítja a túl nagy halmazt.

### Játékhoz való belépés

A **CHERRIFT jelenlegi játékba belépése nem változik** ebben a kiadásban. Az Admin Center már tárolja a whitelistet, de a játék `player-api` belépési folyamatában a `beta_registrations` ellenőrzést külön, integrációs teszttel kell bekötni. Addig a `selected` / `activated` adminstátusz **nem jelent automatikus játékkapu-védelmet**. A korai kiadásnál éppen ezért a game `access_mode` csak *staged* beállítás. Nincs véletlen lezárás.

### Értesítések

A Notifications oldalon tárolhatók a sablonok és jelölők, de **nincs automatikus tömeges DM vagy nyertesértesítő worker** ebben a csomagban. A szerver oldali bot csak a regisztrációs gomb visszaigazolását és opcionális Registered-rang kiosztást végzi. A kiválasztottaknak szóló DM és Beta Tester rang kiosztás további bot worker/queue implementációt igényel. A UI ezt nem állítja működőnek.

### Maintenance

A Maintenance külön oldalt kapott, de **szándékosan inaktív**. Sem az online loginra, sem a mentésekre, sem a Discordra nincs hatása. Éles Maintenance a szerveroldali game-action és mentés gate-ek, offline fallback és admin recovery megoldás nélkül nem biztonságos.

## Biztonsági részletek

- `admin_owner_lock`: csak a tényleges, ellenőrzött OAuth-identitású korábbi Owner lehet Owner. Nincs önregisztrációs admin jog.
- A staff bejegyzések Discord ID-hez kötöttek, és minden admin API-híváskor ellenőrződnek. Azonosított staff jogosultságai a meglévő `gm_admins` rekorddal is szinkronizálódnak.
- Új táblák RLS-sel védettek, `anon` és `authenticated` hozzáférés visszavonva, csak trusted Edge Functions/service role használhatja őket.
- Owner-only műveletek: staff jogosultságkezelés és preset módosítás. Minden más modulhoz külön permission kell.
- A `beta-discord` function Discord Ed25519 signature verificationnel védekezik a hamis webhookok ellen.
- Minden admin módosítás auditot kap. A jelenlegi teljes audit eseménylistából a UI legfeljebb az utolsó 100 sort mutatja.
- A frontend soha nem kapja meg a bot tokenjét, Supabase service role kulcsát vagy OAuth secretjét.
- A public GitHub Pages forráskódja bárki számára olvasható; a biztonsági határ **mindig a Supabase Edge Function**, nem a kezelőfelület HTML-je.

## Ellenőrzés

- `node --check admin/admin.js`
- `node tools/test_admin_center.mjs`
- Chrome/Chromium statikus smoke: Dashboard, Beta tabs, staff preset UI, settings save és navigation.
- Supabase DDL apply után ellenőrizd: `select * from public.admin_owner_lock;` (pontosan egy rekord), `select section from public.admin_settings;`, `select count(*) from public.beta_registrations;`.
- Két különböző Discord-fiókkal ellenőrizd: Owner → full access, nem meghívott fiók → 403, meghívott staff → csak saját jogosultságai.

## Elkerülendő

Ne másolj service role vagy Discord bot tokent a GitHub repóba, ne tedd be a publikus frontend kódba. Ne aktiváld a játék valós beta gate-jét, amíg a vendégfolyamat, cloud save, reconnect és GM mentéshez való hozzáférés tesztjei nem zöldek.


## Event Management – integrált kiadás

Az Admin Center most 13 főmodult tartalmaz. Az Event Management jogosultságai: `events.view` és `events.manage`. A Maintenance kizárólag **Coming soon** oldal.

Az Admin Center migrációja után futtasd a `scheduled_events` migrációt is. Az `event-feed` function publikus GET végpont (`verify_jwt=false`), kizárólag a szerveridő szerint aktív eventeket adja vissza, titkos adat nélkül. Az `admin-center-api` JWT-ellenőrzése bekapcsolva marad.

1. `event/<slug>/event.json` → `npm run events:build` → commit és publikálás.
2. Admin Center → Event Management → Sync repository. Új event alapból inaktív.
3. Állítsd be az időpontokat, és engedélyezd az eventet. Limited eventhez kötelező a lejárat. Permanenthez opcionális.
4. Fel/le gombokkal rendezhető; a játék kategóriánként folyamatosan újraszámozza a látható elemeket.

A repóból törlés a következő szinkronkor letiltja a modult. A lejárat szerveridő alapján működik, nyitva hagyott menüben is. A futó menü legfeljebb 60 másodpercenként újraellenőrzi az adminmódosításokat, időhatároknál külön frissít. Kapcsolathibánál az eventlista bezárja a hozzáférést a következő sikeres frissítésig.

A pontos modulséma és korlátok: `event/README.md`. A Closed Beta jutalmak a meglévő játékkódot használják; a publikálási rendszer nem helyettesíti a jutalmak szerveroldali ellenőrzését.

Üres fejlesztői adatbázison a migráció lefut Owner nélkül is, de a panel ilyenkor zárt marad. Éles használathoz egy már meglévő, aktív, ellenőrzött Discord GM Owner szükséges. Több Owner esetén a migráció hibával leáll; új Owner-fiókot nem hoz létre.

## Új ellenőrzések

`npm run test:admin` – katalógusellenőrzés, időhatárok, tranzakciók, verzióütközés, staff visszavonása, browser szerepkörök tiltása, szöveges tartalom biztonsága és hálózathibánál zárás.

`npm run test:migrations` – teljes és régi részleges migrációs történet visszajátszása.
