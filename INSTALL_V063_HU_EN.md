# CHERRIFT v0.6.3 TEST BUILD telepítés / Installation

## Magyar

1. Készíts biztonsági mentést a CHERRIFT repositoryról.
2. A ZIP **tartalmát** csomagold közvetlenül a repository gyökerébe, ugyanoda, ahol az `index.html` található.
3. Engedélyezd a meglévő fájlok felülírását. Ne maradjon egy plusz, egymásba ágyazott `CHERRIFT_v0.6.3...` mappa a repón belül.
4. Ellenőrzéshez futtasd:

   ```bash
   npm install
   npm test
   ```

5. Nézd át a `git status` kimenetét, majd commitold és pushold a változásokat.
6. Állítsd be a Discord callbacket és a Supabase Redirect URL-eket a `SUPABASE_DISCORD_SETUP_HU_EN.md` szerint.
7. Várd meg a GitHub Pages telepítését, majd végezz hard refresh-t. Ez nem törli a böngészőben tárolt játékmentést.

Ajánlott commitüzenet:

```text
CHERRIFT v0.6.3 test build systems and effects update
```

## English

1. Back up the CHERRIFT repository.
2. Extract the ZIP **contents** directly into the repository root, next to `index.html`.
3. Allow existing files to be replaced. Do not leave the files inside an extra nested `CHERRIFT_v0.6.3...` folder.
4. Run `npm install` and `npm test` to verify the package.
5. Review `git status`, then commit and push the changes.
6. Configure the Discord callback and Supabase Redirect URLs described in `SUPABASE_DISCORD_SETUP_HU_EN.md`.
7. Wait for GitHub Pages to deploy and perform a hard refresh. This does not delete the browser-local game save.
