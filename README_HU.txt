CHERRIFT LOCAL PREVIEW - Telepítés Windowsra
=========================================

1) Csomagold ki a ZIP-et. A "local-preview" mappát másold be ide:
   C:\Users\phant\Documents\GitHub\CHERRIFT\local-preview

   Mellette maradjon a szokásos index.html, src/, assets/, supabase/ mappa.
   Az eredeti CHERRIFT fájlok változatlanok maradnak.

2) Kell Node.js 24+ (az npm ci NEM szükséges a Preview indításához).

3) Dupla kattintás:
   local-preview\CHERRIFT Preview indítása.cmd

   A böngésző Windows alatt automatikusan megnyílik:
   http://127.0.0.1:5178/

4) Most már megnyithatod a projekt fájljait VS Code-ban, és menthetsz.
   Ha változik egy HTML/JS/CSS/PNG/WebP fájl, a játék újratölt a böngészőben.
   Ez teljes oldalfrissítés (nem futás közbeni hot module replacement).

5) PREVIEW TOOLBAR:
   - "Frissítés": kézi böngészőfrissítés
   - "Új tesztmentés": visszaállítja KIZÁRÓLAG a helyi preview profilt

6) Leállítás: a fekete terminálban Ctrl+C.

BIZTONSÁG
- A normál index.html, az eredeti auth/online JS és a Supabase változatlan.
- A szerver kizárólag 127.0.0.1:5178 címen hallgat.
- A preview oldal a futás során egy LOCAL Supabase konfigot kap, URL/kulcs nélkül.
- A böngésző CSP-je blokkolja a külső adatkapcsolatokat.
- A helyi játékmegoldás a repo meglévő gameplay.mjs szabályait használja.
- A helyi tesztmentés a böngésződben marad, külön origin alatt.
- NEM módosít GitHubot, és NEM ír a production adatbázisba.

MEGJEGYZÉS
- A tesztprofil induláskor feloldott skineket/pályákat, elegendő
  tesztpénzt és teszt-ládákat kap, így nem kell éles mentéssel belépned.
- A valódi Discord/Supabase funkciók (felhő, mail, ranglista, redeem) nem
  tesztelhetők valós online állapotként ebben a módban.
- A local-preview fájlok a GitHub Desktopban új, untracked fájlként
  látszódhatnak. Nem szükséges commitolni őket.
- Később a teljes képernyő és a gépen lévő fájlok vizsgálatára a ChatGPT
  Work / Desktop számítógép-hozzáférése használható, ha engedélyezed.

HIBAKERESÉS
- Ha foglalt a port: bezárás Ctrl+C, vagy más port választása:
    set CHERRIFT_PREVIEW_PORT=5180
    node local-preview/preview-server.mjs
- Ha nem nyílik meg a böngésző: nyisd meg kézzel a fenti címet.
- F12 / Console: futásidejű hibák.
- Ellenőrzés: http://127.0.0.1:5178/__preview__/health
- Az eredeti index.html file:// megnyitása továbbra sem támogatott.
