CHERRIFT — auth/bootstrap freeze FIX v2
========================================

A képen a startup itt áll:
  DIAG · auth.bootstrapSave FUT · 1s

A jelenlegi main-ben a v0.9.7.6 Auth timeout guard már bent van, VISZONT az
index.html továbbra is a régi cache kulccsal tölti:

  src/cherrift_supabase_timeout_fix.js?v=097singleton1

Ezért a böngésző/deploy cache simán visszaadhatja a régi fájlt.

A v2 ezen felül egy másik valós beragadási pontot is lezár:
a Supabase Auth a böngésző Web Locks API-ján várhat korlátlan ideig.
A javítás megtartja a lockot, de a lock megszerzését 6 másodpercre korlátozza.
Ha a lock beragad, a bootstrap hibára fut és a CHERRIFT meglévő biztonságos
fallbackja folytatja az indulást ahelyett, hogy örökre a splashen maradna.

MIT TARTALMAZ?
--------------
src/cherrift_supabase_timeout_fix.js
  - v0.9.7.7-bounded-auth-lock
  - Auth Web Lock timeout: 6 s
  - getSession timeout: 8 s
  - signOut timeout: 2 s
  - refreshSession / setSession / getUser: 8 s
  - Edge Function timeout: 15 s
  - Supabase singleton továbbra is megmarad

tools/smoke_supabase_auth_timeout_fix.mjs
  - hanging Auth Promise teszt
  - hanging Web Lock teszt
  - normál/egészséges Auth teszt

APPLY_CACHE_BUST.bat
  - CSAK az index.html Supabase guard query stringjét cseréli
    ?v=097singleton1 / ?v=097singleton2 -> ?v=0977lock1
  - mást nem ír át

TELEPÍTÉS
---------
1. A ZIP-et KÖZVETLENÜL a CHERRIFT repo gyökerébe bontsd ki.
   Nincs plusz külső mappa a ZIP-ben.
2. Engedélyezd a src/cherrift_supabase_timeout_fix.js felülírását.
3. Futtasd a repo gyökeréből:
      APPLY_CACHE_BUST.bat
   Vagy kézzel az index.html-ben ezt:
      src/cherrift_supabase_timeout_fix.js?v=097singleton1
   cseréld erre:
      src/cherrift_supabase_timeout_fix.js?v=0977lock1
4. Commit / deploy.
5. Tesztnél Ctrl+F5 vagy privát ablak.

SMOKE TEST
----------
node tools/smoke_supabase_auth_timeout_fix.mjs

Elvárt:
[PASS] CHERRIFT bounded Supabase Auth lock + timeout smoke test

BIZTONSÁG
---------
- Nem töröl localStorage-t.
- Nem töröl mentést.
- Nem módosít game_saves SQL-t.
- Nem módosít RLS-t.
- Nem ír át player save adatot.
- Ha Auth lock/Session működik, a normál működés változatlan.
