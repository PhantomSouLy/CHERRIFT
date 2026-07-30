# CHERRIFT v0.6.2 telepítés / Installation

## Magyar

1. Készíts biztonsági mentést a repositorydról.
2. A ZIP **tartalmát** csomagold közvetlenül a CHERRIFT repo gyökerébe, ugyanoda, ahol az `index.html` található.
3. Engedélyezd a meglévő fájlok felülírását. Ne hozz létre egy új, egymásba ágyazott `CHERRIFT_v0.6.2...` mappát a repón belül.
4. Ellenőrzéshez futtasd:

   ```bash
   npm install
   npm test
   ```

5. Nézd át a `git status` kimenetét, majd commitold és pushold a változásokat.
6. Várd meg a GitHub Pages deployt, majd végezz hard refresh-t. A hard refresh nem törli a helyi játékmentést.

Ajánlott commitüzenet:

```text
CHERRIFT v0.6.2 quality and localization update
```

## English

1. Back up the repository.
2. Extract the ZIP **contents** directly into the CHERRIFT repository root, next to `index.html`.
3. Allow existing files to be replaced. Do not leave the files inside an extra nested release folder.
4. Optionally run `npm install` and `npm test`.
5. Review `git status`, then commit and push the changes.
6. Wait for GitHub Pages to deploy and perform a hard refresh. A hard refresh does not delete the local game save.
