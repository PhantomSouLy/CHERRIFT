# CHERRIFT Discord Supabase cloud save patch

## Included behavior

- Guest mode continues to use the existing browser `localStorage` save.
- Discord mode loads and saves `save_data` from the Supabase `public.game_saves` table.
- On the first Discord login only, the existing Guest save is uploaded when the account has no cloud row yet.
- The Guest save remains separate and is restored after Discord sign-out.
- Discord writes are debounced and coalesced; they do not call the previous local-storage save chain.
- RLS allows authenticated users to access only their own row.

## Required deployment order

1. In Supabase Dashboard -> SQL Editor, run the complete `supabase/game_saves.sql` file.
2. Copy the files in this ZIP into the CHERRIFT repository, preserving their paths and replacing existing files when asked.
3. Run:

   ```bash
   npm install
   npm test
   ```

4. Commit and push the changes.
5. Wait for GitHub Pages deployment, then hard refresh the game.
6. Sign in with Discord and confirm a row appears under Table Editor -> `game_saves`.

## Files replaced

- `src/cherrift_v064_auth.js`
- `src/main.js`
- `src/supabase_config.js`
- `README.md`
- `SUPABASE_DISCORD_SETUP_HU_EN.md`

## Files added

- `supabase/game_saves.sql`
- `SUPABASE_CLOUD_SAVE_SETUP_HU_EN.md`

## Local validation completed

- JavaScript syntax checks passed for all three changed runtime JavaScript files.
- The bootstrap still declares and loads exactly 25 patch scripts.
- Cloud save markers (`maybeSingle`, `upsert`, `bootstrapSave`) are present.
- The SQL contains RLS plus separate SELECT, INSERT, UPDATE and DELETE ownership policies.
- No service-role or secret key was added.
