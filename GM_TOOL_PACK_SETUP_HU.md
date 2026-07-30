# CHERRIFT GM Tool Pack v1 – telefonos telepítés

Kiindulási GitHub `main` commit: `4a8c7ec17232e20b3f00dd89ad63ea1b47416c1a`

A csomag csak új vagy módosított fájlokat tartalmaz. A meglévő asseteket és a teljes projektet nem kell újra feltölteni.

## Mit kapsz?

- `/gm/` mobilbarát webes GM felület
- Mail Sender
- Redeem Code Creator
- Profile Editor
- automatikus profil-snapshot minden módosítás és jutalomátvétel előtt
- admin jogosultság-ellenőrzés
- GM és jutalom műveleti napló
- két Supabase Edge Function: `gm-api` és `player-api`
- szerveres Mail és Redeem bekötés a játék meglévő Mail paneljébe

## Biztonsági alapelv

A böngészőben csak a jelenlegi publikus Supabase publishable key marad. A service-role kulcsot egyik frontendfájl sem tartalmazza.

A service-role kulcsot **ne másold GitHubra, a `/gm/` fájlokba vagy üzenetbe**. A Supabase hosted Edge Functions a kulcsot környezeti változóként kapja meg.

---

# 1. Adatbázis telepítése

1. Supabase Dashboard → CHERRIFT projekt.
2. Nyisd meg az **SQL Editor** részt.
3. Nyomd meg a **New query** gombot.
4. A ZIP-ből nyisd meg ezt a fájlt:

   ```text
   supabase/migrations/20260730_gm_tool_pack.sql
   ```

5. Másold be a fájl teljes tartalmát.
6. Nyomd meg a **Run** gombot.
7. A sikeres futás után a Table Editorban ezeknek kell megjelenniük:

   ```text
   game_saves
   gm_admins
   gm_audit_logs
   profile_snapshots
   mail_messages
   mail_recipients
   redeem_codes
   redeem_claims
   ```

A migration nem törli a meglévő `game_saves` mentést, és többször is biztonságosan lefuttatható.

## Saját GM-jog ellenőrzése

Mivel jelenleg egyetlen Supabase Auth-felhasználó van a projektben, a migration automatikusan `owner` rangot ad neki.

Ellenőrző SQL:

```sql
select user_id, role, permissions, active, created_at
from public.gm_admins;
```

Ha egy `owner` sor látszik, kész vagy.

Ha nincs sor, előbb lépj be Discorddal a játékba vagy később a `/gm/` oldalra. A jogosulatlan képernyő kiírja a saját UUID-det. Utána futtasd ezt, a helyőrzőt a saját UUID-dre cserélve:

```sql
insert into public.gm_admins (
  user_id,
  role,
  permissions,
  active,
  created_by
)
values (
  'SAJAT-USER-UUID-IDE',
  'owner',
  array[
    'mail.send', 'mail.broadcast',
    'redeem.create',
    'profile.view', 'profile.edit',
    'audit.view'
  ],
  true,
  'SAJAT-USER-UUID-IDE'
)
on conflict (user_id) do update
set role = excluded.role,
    permissions = excluded.permissions,
    active = true;
```

---

# 2. `gm-api` Edge Function

1. Supabase Dashboard → **Edge Functions**.
2. **Deploy a new function** → **Via Editor**.
3. A funkció neve pontosan:

   ```text
   gm-api
   ```

4. Töröld a minta kódot.
5. Másold be ennek a fájlnak a teljes tartalmát:

   ```text
   supabase/functions/gm-api/index.ts
   ```

6. Hagyd bekapcsolva a JWT-ellenőrzést, ha a Dashboard külön kapcsolót mutat.
7. Nyomd meg a **Deploy function** gombot.

Nem kell service-role kulcsot kézzel a kódba írnod.

---

# 3. `player-api` Edge Function

Ugyanez még egyszer:

1. **Deploy a new function** → **Via Editor**.
2. Név:

   ```text
   player-api
   ```

3. A bemásolandó fájl:

   ```text
   supabase/functions/player-api/index.ts
   ```

4. JWT-ellenőrzés maradjon bekapcsolva.
5. **Deploy function**.

---

# 4. Discord redirect URL hozzáadása

Supabase Dashboard → **Authentication** → **URL Configuration** → Redirect URLs.

Add hozzá:

```text
https://phantomsouly.github.io/CHERRIFT/gm/
```

Helyi teszthez ezt is:

```text
http://localhost:8000/gm/
```

A már meglévő játékos redirect URL-eket ne töröld.

---

# 5. Fájlok feltöltése GitHubra

A ZIP tartalmát a mappaszerkezet megtartásával másold a CHERRIFT repo gyökerébe.

Felülírandó meglévő fájlok:

```text
src/supabase_config.js
src/cherrift_manifest.json
```

Új fájlok:

```text
src/cherrift_live_services.js

gm/index.html
gm/gm.css
gm/gm.js

supabase/config.toml
supabase/migrations/20260730_gm_tool_pack.sql
supabase/functions/gm-api/index.ts
supabase/functions/gm-api/deno.json
supabase/functions/player-api/index.ts
supabase/functions/player-api/deno.json

GM_TOOL_PACK_SETUP_HU.md
```

A `supabase/functions/.../deno.json` és `supabase/config.toml` főleg későbbi CLI-s fejlesztéshez kell. Dashboardos telepítésnél az `index.ts` fájlokat kell bemásolni.

---

# 6. Tesztelés

## GM oldal

Nyisd meg:

```text
https://phantomsouly.github.io/CHERRIFT/gm/
```

1. Lépj be Discorddal.
2. A fejlécben az `OWNER` szerepkörnek kell látszania.
3. Mail Senderben keress rá a saját Discord-nevedre.
4. Küldj magadnak például `10` érmét tartalmazó tesztlevelet.
5. Redeem Creatorban hozz létre egy `5` érmés kódot, majd azonnal másold ki.

## Játék

1. Nyisd meg a CHERRIFT játékot ugyanazzal a Discord-fiókkal.
2. Menj a Mail panelre.
3. A GM-levélnek meg kell jelennie.
4. Vedd át a jutalmat.
5. Ugyanott megjelenik a Redeem mező; váltsd be a létrehozott kódot.
6. Frissítés után is meg kell maradnia a jutalomnak.

## Profile Editor

1. Keresd meg a saját profilodat.
2. Módosíts egy kis értéket, például az érmét.
3. Adj meg kötelező indokot.
4. Mentés után megjelenik a snapshot azonosító.
5. Table Editorban ellenőrizheted:

   ```text
   profile_snapshots
   gm_audit_logs
   ```

---

# Gyors hibakeresés

## `not_an_active_gm`

A Discord user UUID nincs aktív sorként a `gm_admins` táblában. Használd az 1. fejezet manuális `insert` SQL-jét.

## `Failed to send a request to the Edge Function`

Ellenőrizd, hogy mindkét funkció pontos neve és deploy állapota jó:

```text
gm-api
player-api
```

## Discord után visszadob a főoldalra

Ellenőrizd, hogy a `/gm/` redirect URL pontosan szerepel az Authentication URL Configuration listában.

## A GM-levél nem jelenik meg

- ugyanazzal a Discord-fiókkal legyél belépve;
- frissítsd a játékot;
- ellenőrizd, hogy a `player-api` deployolva van;
- nézd meg a `mail_messages` és `mail_recipients` táblát.

## A teljes Redeem kód eltűnt

Ez szándékos. Az adatbázis csak SHA-256 hash-t és rövid prefixet tárol. A teljes kód csak létrehozáskor jelenik meg, ezért azonnal másold ki.
