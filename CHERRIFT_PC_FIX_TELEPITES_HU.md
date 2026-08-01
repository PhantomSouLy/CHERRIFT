# CHERRIFT v0.9.5-prebeta.1 – PC navigáció és Gacha javítás

## Telepítés

1. Csomagold ki a ZIP-et a CHERRIFT projekt gyökérmappájába.
2. Engedélyezd a benne lévő fájlok felülírását.
3. Törölni vagy áthelyezni semmit sem kell.
4. Feltöltés után a böngészőben végezz teljes frissítést (`Ctrl+F5`).

## Cserélendő fájlok

- `index.html`
- `assets/cherrift_prebeta.css`
- `src/cherrift_app.js`
- `src/cherrift_gacha.js`
- `src/cherrift_prebeta.js`
- `src/cherrift_stability.js`

## Fő javítások

- A PC felső menü sorrendje: Cherry, Gear, Upgrade, PLAY, LOBBY, Bag, Shop, Gacha, Achievements.
- A PLAY a World Selectort, a LOBBY a főmenüt nyitja meg.
- A menüpontokhoz tartozó második menüsorok és aktív állapotok javítva lettek.
- A Lobby PC-s elrendezése átrendezve: gyorsgombok fent, statok és aktív Cherry/pályaválasztás lent.
- A Gacha most a globális navigáción belül nyílik meg, aktívnak jelöli a Gacha gombot, és a valódi nyitógombok működnek.
- A régi kulcs-jutalmak Common ládákká lettek alakítva; a Common/Rare/Epic ládaikonok a megfelelő PNG-ket használják.
- A currency-, jutalom-, láda- és fő navigációs ikonok a projekt PNG assetjeit használják.
- A profilkép és profilkeret méretezése javítva lett a felső navigációban.
- A Rank oldalról egyértelmű Lobby-visszalépés érhető el.

## Ellenőrzés

Az automatikus tesztek sikeresen lefutottak PC-n, alacsony PC-s viewporton, álló és fekvő telefonon, valamint visszatérő munkamenettel.
