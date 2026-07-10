CHERRIFT v0.2.5 POLISH - NO ASSETS PACKAGE

Ebben a ZIP-ben nincs assets mappa, csak a cserélendő kód:
- index.html
- style.css
- src/config.js
- src/data.js
- src/storage.js
- src/input.js
- src/game.js
- src/ui.js
- src/main.js

Javítások:
1. Cherry model villódzás javítva:
   - Base Cherry idle frames 6-ról 4-re javítva.
   - drawPlayer most a PNG tényleges szélességéből is limitálja a frame-et, így nem tud üres frame-be rajzolni.

2. Karakter / map zoom:
   - player display 88-ról 116-ra nőtt.
   - cameraZoom: 1.14, így a map is közelebbinek érződik.

3. Új hit effect támogatás:
   - assets/effects/base_hit_effect_01.png
   - assets/effects/base_hit_effect_02.png
   - assets/effects/base_hit_effect_03.png
   Ha ezek nincsenek fent, fallback kör effekt marad.

4. FPS limiter Settingsben:
   - 30 FPS
   - 60 FPS
   Mentés localStorage-be.

5. Gear drag & drop:
   - Inventory itemet rá lehet húzni a megfelelő body slotra.
   - Rossz slotnál figyelmeztet.
   - Equipped itemet vissza lehet húzni inventoryba.
   - Kattintós régi működés is megmaradt.

6. Main menu background:
   - assets/ui/mainmenu.png?v=025 háttérként bekötve.
   - Ha nincs fent a kép, a régi sötét-pink fallback háttér marad.

Használat:
Másold fel / cseréld a ZIP tartalmát a repo gyökerébe.
Az assets mappát ne töröld és ne cseréld.
