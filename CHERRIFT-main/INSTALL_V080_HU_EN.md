# CHERRIFT v0.8.0 telepítés / Installation

## Magyar

Ez egy **kumulatív csomag**: tartalmazza a v0.7.0 Arsenal rendszert és a v0.8.0 Economy/Buff rendszert is.

1. Készíts biztonsági mentést a repositoryról.
2. A ZIP **tartalmát** másold közvetlenül a repository gyökerébe.
3. Engedélyezd a `src/main.js` felülírását.
4. Új fájlok:
   - `src/cherrift_v070.js`
   - `src/cherrift_v080.js`
   - `v070.css`
   - `v080.css`
5. Futtasd:

```bash
npm install
npm test
```

6. Commit és push után várd meg a GitHub Pages deployt, majd hard refresh.

Ajánlott commitüzenet:

```text
CHERRIFT v0.8.0 Arsenal gacha BAG and account buffs
```

## English

This is cumulative and includes v0.7.0. Extract into the repository root, replace `src/main.js`, run the tests, commit and push.
