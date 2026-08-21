# CHERRIFT Supabase cloud save setup / felhőmentés beállítása

## Magyar

A Discord-login és a játékmentés két külön Supabase-rész. Az Auth már azonosítja a játékost; a mentéshez a `public.game_saves` tábla és a felhasználónkénti RLS-szabályok is szükségesek.

### Bekapcsolás

1. Nyisd meg a Supabase Dashboardot.
2. Válaszd ki a CHERRIFT projektet.
3. Menj a **SQL Editor** oldalra.
4. Nyisd meg a repositoryban található `supabase/game_saves.sql` fájlt.
5. Másold be a teljes tartalmát, majd nyomd meg a **Run** gombot.
6. A Table Editorban ellenőrizd, hogy megjelent-e a `game_saves` tábla.
7. A játékban jelentkezz be Discorddal.

Az első Discord-belépéskor:

- ha ehhez a Discord-fiókhoz már tartozik mentés, a játék azt tölti be;
- ha még nincs felhőmentés, a `player-api` külön, tiszta kezdőmentést hoz létre ehhez a Discord-fiókhoz;
- a Guest-mentés ettől nem törlődik, külön helyi mentésként megmarad;
- Discord módban a további változások a Supabase `game_saves` táblájába kerülnek, és ugyanahhoz a hitelesített UUID-hez kötött helyi biztonsági másolat is készül;
- kijelentkezéskor a játék visszatölti a különálló Guest-mentést.

### Biztonság

- A böngésző csak a nyilvános publishable kulcsot használja.
- A Discord Client Secret és a Supabase service-role kulcs továbbra sem kerülhet a repositoryba.
- A Row Level Security miatt egy bejelentkezett játékos csak a saját sorát olvashatja közvetlenül. Minden módosítás a JWT-t újra ellenőrző `player-api` Edge Functionön keresztül történik.
- Az `anon` szerepkör nem kap hozzáférést a mentéstáblához.

### Ellenőrzés

Discord-belépés után a Table Editor → `game_saves` alatt egy sornak kell megjelennie. A `user_id` a Supabase Authentication → Users oldalon látható felhasználói UUID-vel egyezik meg. A teljes játékállás a `save_data` JSONB mezőben található.

## English

Discord authentication and game saving are separate Supabase features. Auth identifies the player; cloud saving also requires the `public.game_saves` table and per-user Row Level Security policies.

1. Open the Supabase Dashboard and select the CHERRIFT project.
2. Open **SQL Editor**.
3. Copy and run the complete `supabase/game_saves.sql` file from this repository.
4. Confirm that `game_saves` appears in Table Editor.
5. Sign in to the game with Discord.

On the first Discord sign-in, an existing cloud save is loaded. If no cloud row exists yet, `player-api` creates a clean starter save dedicated to that Discord account; Guest progress is never silently imported into another identity. Guest progress remains separate in the browser. Discord progress is written to Supabase and to an account-bound local safety backup. Signing out restores the separate Guest save.

RLS allows authenticated players to read only the row whose `user_id` matches their Supabase Auth UUID. Browser writes are disabled; all mutations go through `player-api`, which verifies the JWT again and binds the payload to that UUID. The anonymous role has no table access.
