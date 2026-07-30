CHERRIFT v0.6.0 — BLOOM UI

TELEPÍTÉS
1. A ZIP teljes tartalmát másold a CHERRIFT repository gyökerébe.
2. Engedélyezd a meglévő fájlok felülírását és az új fájlok hozzáadását.
3. Töröld a böngésző CHERRIFT gyorsítótárát, vagy végezz hard refresh-t.
4. GitHub Pages esetén várd meg a friss deploy befejezését.

FONTOS ÚJ FÁJLOK
- src/cherrift_v060.js
- v060.css
- assets/player/skins/warrior_cherry/warrior_cherry_splashart.png
- VALIDATION_V060.json

MÓDOSÍTOTT BELÉPÉSI PONTOK
- index.html: v0.6.0 cím és azonnal látható boot loader.
- src/main.js: patch-progress, artwork preload és v0.6 inicializálás.
- src/cherrift_v0557.js: Beastclaw icon elírás és Warrior splash-hozzárendelés javítása.

FŐ VÁLTOZÁSOK
- Egységes asztali menüsín és rövidebb navigáció.
- Színesebb dashboard és mobil alsó navigáció.
- Füles, később bővíthető Settings + Account hely.
- Kulcsalapú, animált Gacha.
- Aktív-skin idle preview a Gear és Player Upgrade oldalakon.
- Stabil sprite-közép/talajpont, ezért nincs jobbra-balra ugrálás.
- Valódi skin ikonok és helyes splash artok.
- Piros újdonságjelzés gear, skin és patch esetén.
- Valódi induláskori asset preload és háttér-cache.

ELLENŐRZÉS
- A JavaScript fájlok szintaktikailag érvényesek.
- A v0.6 CSS csstree-validáción átment.
- Asztali (1440×900 logikai viewport) DOM/runtime teszt sikeres.
- Mobil (390×844 logikai viewport) DOM/runtime teszt sikeres.
- Settings fülek, Gacha reward, értesítési pont, Warrior splash és ikonok interakciós tesztje sikeres.
- Nem történt commit, push vagy más GitHub-módosítás.

AJÁNLOTT KÉZI PRÓBA
- Nyisd meg a játékot egyszer asztali és egyszer telefonos böngészőben.
- Ellenőrizd a saját mentéseddel a Gear drag-and-dropot és egy teljes run indítását.
- Nyiss egy Gachát, majd nézd meg a piros Gear jelzést.
- Válts Warrior Cherryre, és ellenőrizd a splash artot, valamint az idle stabilitását.
