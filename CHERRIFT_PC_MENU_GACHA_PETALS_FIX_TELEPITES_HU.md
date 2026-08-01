# CHERRIFT v0.9.5-prebeta.1 – PC menü, Gacha és szirom javítás

## Telepítés

1. Csomagold ki a ZIP-et a CHERRIFT projekt gyökérmappájába.
2. Engedélyezd az öt meglévő fájl felülírását.
3. Törölni vagy áthelyezni semmit sem kell.
4. Feltöltés után végezz teljes böngészőfrissítést (`Ctrl+F5`).

## Cserélendő fájlok

- `index.html`
- `assets/cherrift_prebeta.css`
- `src/cherrift_app.js`
- `src/cherrift_gacha.js`
- `src/cherrift_stability.js`

## Javítások

- A PC felső navigáció most csak nagy szöveges menüpontokat használ; nincs ikon vagy emoji.
- A sorrend: `Cherry | Gear | Upgrade | PLAY | LOBBY | Bag | Shop | Gacha | Achievements`.
- A PLAY és LOBBY állandó, jól látható kiemelést kapott; az aktív állapotuk még erősebb.
- A Gacha valódi Chrome pointer-capture hibája javítva lett: a carousel többé nem veszi el a kattintást a Nyitás gomboktól.
- A ládanyitás ténylegesen levonja a Common/Rare/Epic ládát, eltárolja a jutalmat és elindítja a nyitási animációt.
- A kattintási szirmok lassabban hullanak, finoman oldalra sodródnak, enyhén blurösek, majd elhalványulnak.
- Az alap téma sötét és világos pink szirmokat használ; a további témák automatikusan a saját téma-színeikből építik fel a palettát.
- A módosított CSS- és JavaScript-fájlok új cache-verziót kaptak.

## Ellenőrzés

Sikeresen lefutott a forrásvalidáció, valamint a normál PC, rövid PC, álló telefon, fekvő telefon és visszatérő munkamenet tesztje. A Gacha teszt valós pointer-lenyomást is szimulál, majd ellenőrzi a láda levonását, a jutalomelőzményt és az animációt.
