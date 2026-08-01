# CHERRIFT v0.9.5 pre-beta telepítés

1. A Supabase SQL Editorben futtasd le teljes egészében:
   `supabase/migrations/20260801_prebeta_v095.sql`
2. Deployold újra a `player-api` Edge Functiont a mellékelt
   `supabase/functions/player-api/index.ts` fájlból.
3. Cseréld fel a ZIP-ben található webes fájlokat, majd frissítsd a GitHub Pages deployt.
4. Első belépéskor a meglévő account automatikusan owner jogosultságot kap, ezért
   megtartja a tartalmát, a Traininget és a kereteket. Az ezután létrejövő fiókok
   a valódi kezdő mentést kapják.

## Fontos

- A migráció a változtatás előtt egyszeri, szerveroldali mentéspillanatot készít a
  `prebeta_save_snapshots` táblába.
- A Social és Ranking táblákat a kliens közvetlenül nem írhatja; minden művelet a
  hitelesített `player-api` Edge Functionön megy át.
- A keretválasztást az Edge Function is ellenőrzi; lezárt frame ID kliensből sem
  állítható be.
- A pontos induló értékek és progression táblák a
  `PREBETA_V095_BALANCE_HU.md` fájlban vannak.
- World 5 és World 6 ideiglenesen World 4, illetve World 3 képeket használ. A
  stage rekordok `placeholder:true` jelölést kaptak, így a végleges assetek később
  egy helyen cserélhetők.
