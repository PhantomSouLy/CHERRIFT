# CHERRIFT Auth v3 – local-first recovery

## A javított hiba

A production indulás korábban ezt tette a fő `DOMContentLoaded` folyamatban:

1. `await CHERRIFT_AUTH.bootstrapSave()`;
2. Supabase `getSession()` / Web Lock;
3. Discord-session esetén `player-api/bootstrap_save`;
4. csak ezután `UI.init()` és a Guest/Discord választó.

Ez azt jelentette, hogy egy beragadt Auth lock vagy késő Supabase-válasz a Guest
módot is blokkolta. A CI ezt nem találta meg, mert sikeres fake Supabase klienst
és fake Storage-ot adott a böngészőnek.

## Az Auth v3 szerződése

- `bootstrapSave()` szándékosan **nem async** és nem adhat vissza Promise-t.
- Az induló mentés kizárólag a helyi Guest mentésből/defaultokból készül.
- A játékobjektum, `UI.init()` és a valódi login gate hálózat nélkül feláll.
- A Supabase kliens, `getSession()` és cloud bootstrap csak ezután, leválasztott
  háttérfolyamatként indul.
- A Guest gomb a session/cloud ellenőrzés alatt is használható.
- A Guest választás verziótoken segítségével érvénytelenít minden későn
  visszaérkező session/cloud eredményt, ezért az nem válthatja vissza a profilt.
- Visszatérő Discord-sessionnél a `player-api` mentése nyer. Ha a Function nem
  válaszol, csak az ugyanahhoz a Supabase UUID-hez kötött helyi account-backup
  használható; másik fiók vagy Guest mentése nem keveredhet bele.

## Automatikus regressziós tesztek

Az `npm test` hét külön boot-folyamatot futtat PC-n és telefonméreteken. A két
kritikus esetben a fake Supabase hívás szándékosan soha nem teljesül:

- `auth-timeout`: a `getSession()` 30 másodperces háttér-Promise marad, miközben
  a Guest belépés és a lobby kb. 4 másodperc alatt elkészül;
- `cloud-timeout`: a Discord identity megmarad, de a beragadt
  `bootstrap_save` után UUID-hez kötött fallback mentés indul.

A teszt külön hibát dob, ha Supabase session-felderítés a `UI.save` és `UI.game`
létrejötte előtt elindul, vagy ha valaki ismét `await bootstrapSave()` kódot tesz
a fő runtime-ba.

## Supabase telepítés

1. Futtasd a `supabase/migrations/20260821_auth_runtime_guard.sql` fájlt. Ez
   adatvesztés nélkül eltávolít minden régi böngészős save-write policyt.
2. Futtasd a `supabase/VERIFY_CURRENT_SCHEMA.sql` fájlt. Minden sor legyen
   `PASS`; a `REVIEW` sor nem automatikus törlés, hanem kézi jogosultságvizsgálat.
3. Deployold újra a `player-api` és `gm-api` Functiont.
4. A repóban lévő, de jelenleg live 404-et adó report Functionhöz:

   ```bash
   supabase functions deploy submit-report --no-verify-jwt
   ```

   A privát `DISCORD_BUG_REPORT_WEBHOOK` és `DISCORD_FEEDBACK_WEBHOOK` értékek
   kizárólag Supabase Function secretként legyenek beállítva.
5. Futtasd: `npm run verify:supabase-public`.

Service-role kulcsot, Discord Client Secretet vagy webhook URL-t soha ne tegyél
a repóba és ne küldj kliensoldali JavaScriptként.
