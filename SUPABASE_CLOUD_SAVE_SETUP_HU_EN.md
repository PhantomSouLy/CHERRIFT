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
- ha még nincs felhőmentés, a jelenlegi Guest-mentés egyszer felmásolódik a Discord-fiókhoz;
- a Guest-mentés ettől nem törlődik, külön helyi mentésként megmarad;
- Discord módban a további változások kizárólag a Supabase `game_saves` táblájába kerülnek;
- kijelentkezéskor a játék visszatölti a különálló Guest-mentést.

### Biztonság

- A böngésző csak a nyilvános publishable kulcsot használja.
- A Discord Client Secret és a Supabase service-role kulcs továbbra sem kerülhet a repositoryba.
- A Row Level Security miatt egy bejelentkezett játékos csak azt a sort olvashatja és írhatja, amelynek `user_id` értéke a saját Supabase Auth azonosítója.
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

On the first Discord sign-in, an existing cloud save is loaded. If no cloud row exists yet, the current Guest save is copied to the Discord account once. Guest progress remains as a separate browser-local save. While Discord mode is active, subsequent progress is written only to Supabase. Signing out restores the separate Guest save.

RLS restricts every authenticated player to the row whose `user_id` matches their own Supabase Auth UUID. The anonymous role has no table access.
