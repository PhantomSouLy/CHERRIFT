# CHERRIFT v0.8.3 – Item Icons & Obtained Overlay

## Telepítés

1. Készíts biztonsági mentést a jelenlegi repóról.
2. A ZIP tartalmát másold a CHERRIFT gyökerébe.
3. Engedélyezd a `src/main.js` felülírását.
4. Ellenőrizd, hogy létrejött:
   - `src/cherrift_v083.js`
   - `v083.css`
5. Commit + push után GitHub Pagesen használj `Ctrl + F5` frissítést.

## Mit tartalmaz

- A `assets/items` ikoncsomag központi asset registryje.
- Coin, Blossom Gem, Sakura Essence és Gear Scrap képek a resource sávban.
- Enhancement Stone és Slot Core ikonok a BAG/Arsenal felületeken.
- Chest ikonok a Gacha, BAG és Shop oldalakon.
- Az elérhető Skill Tree ikonok bekötése; a még nem elkészített node-ok megtartják az emoji fallbacket.
- Buffkaják új `assets/items/buffs` útvonalainak bekötése.
- Dismantle, Merge és Upgrade gombikonok.
- Középre helyezett `Megszerezve / Obtained` reward overlay ritkasági kártyákkal.
- Több jutalom egyszerre jelenhet meg, például Coin + Gem + Chest.
- A rendszer automatikusan figyeli a mentés pozitív itemváltozásait.
- In-game, `body.is-playing` állapotban a popup szándékosan nem jelenik meg, így a pályán felvett dropok nem zavarják a játékot.
- PC és mobil reszponzív megjelenés, billentyűzetes bezárás (`Enter`, `Space`, `Esc`).

## Asset audit – fontos eltérések a jelenlegi scripthez képest

A v0.8.2 aktív scriptjeiben nem minden feltöltött kép rendelkezik közvetlenül használt item-ID-val:

- `legendary_chest.png`: a jelenlegi `CHEST_DEFS` és mentési séma csak Common, Rare és Epic chestet kezel. Az asset bekerült a registrybe, de a patch nem talál ki hozzá új droprate-et.
- `Golden_Lucky_Chance.png`, `bag_buff.png`, `bag_buff_2.png`, `support_drink.png`: a meglévő permanent/supporter buffok vizuális ikonjaként kerülnek használatba.
- `bag_buff_3.png`, `dumplin.png`, `magic_macaron_purple.png`: bekerültek a registrybe és preloadba, de jelenleg nincs hozzájuk külön aktív catalog item-ID.
- `Damage_Reduction_icon_2.png`: alternatív változatként regisztrált; az aktív Damage Reduction node az első változatot használja.
- `magical_enhancement_stone.png`: a material-adatmodellben létezik, de a jelenlegi Lv.25 tesztlimit miatt normál Arsenal UI-ban még nem aktív költség.

A régi `FOOD_CATALOG` `assets/items/food/...` útvonalakat használt, miközben az új fájlok az `assets/items/buffs/...` mappában vannak. A patch ezt javítja.

## Megjegyzés

A `warrior_steak` belső save-ID megmarad kompatibilitás miatt, de a megjelenített neve és ikonja `Support Drink` lesz. A `treasure_bento` belső ID szintén megmarad, a kijelzett név `Fancy Bento`.
