CHERRIFT — auth/bootstrap freeze patch
======================================
Cél: a 43%-on, "DIAG · auth.bootstrapSave FUT" állapotban beragadó indulás
megszüntetése úgy, hogy a mentéseket NEM töröljük és a DB/RLS sémához NEM nyúlunk.

MIT MÓDOSÍT?
------------
1) src/cherrift_supabase_timeout_fix.js
   - megtartja a meglévő Supabase singleton védelmet;
   - getSession timeout: 8 s;
   - ÚJ: signOut timeout: 2 s;
   - ÚJ: refreshSession / setSession / getUser timeout: 8 s;
   - Edge Function timeout: 15 s;
   - ha a Supabase Auth belső lockja beragad, a recovery signOut nem tudja
     végtelen ideig blokkolni a bootstrapot.

2) tools/smoke_supabase_auth_timeout_fix.mjs
   - direkt olyan fake Supabase klienst tesztel, amelynek getSession/signOut
     Promise-ai SOHA nem térnek vissza;
   - ellenőrzi, hogy a recovery ennek ellenére eléri a guest/local fallbackot;
   - külön ellenőrzi a normál, egészséges Auth hívásokat is.

TELEPÍTÉS
---------
A ZIP tartalmát másold a CHERRIFT repo GYÖKERÉBE, és engedélyezd a felülírást.
A fontos felülírandó fájl:

  src/cherrift_supabase_timeout_fix.js

A tools/smoke_supabase_auth_timeout_fix.mjs új tesztfájl, azt is nyugodtan tedd be.

TESZT
-----
A repo gyökeréből:

  node tools/smoke_supabase_auth_timeout_fix.mjs

Elvárt eredmény:

  [PASS] Supabase Auth timeout/deadlock guard smoke test

CACHE FONTOS
------------
A jelenlegi index.html ezt tölti:

  src/cherrift_supabase_timeout_fix.js?v=097singleton1

Mivel a query string jelenleg nem változik, deploy után csinálj egy hard reloadot
(Ctrl+F5), vagy nyisd meg privát ablakban.

Még biztosabb cache-bust: az index.html-ben CSAK ezt az egy sort módosítsd:

  src/cherrift_supabase_timeout_fix.js?v=097singleton1

ERRE:

  src/cherrift_supabase_timeout_fix.js?v=097singleton2

Ez nem kötelező a kód működéséhez, csak biztosítja, hogy a böngésző az új JS-t kérje le.

BIZTONSÁG / MENTÉS
------------------
- NEM töröl localStorage-t.
- NEM töröl Supabase sessiont kényszerből.
- NEM módosít game_saves SQL-t.
- NEM módosít RLS policy-t.
- NEM írja át a játékmentést.
- Sikeres Supabase hívások viselkedését nem változtatja meg; csak a soha le nem
  záruló Auth műveletekre tesz felső időkorlátot.
