CHERRIFT v0.5.5.9 — BASE DASH FIX + CLASSIC UI RESTORE

INSTALL
1. Copy every ZIP file into the CHERRIFT root.
2. Merge the src folder.
3. Replace src/main.js.
4. Replace v0557.css.
5. Keep all other previous patch files.
6. Hard refresh or clear the browser cache.

BASE CHERRY DASH FIX
- Directly preloads all four base_cherry_dash_*.png sheets.
- Dash rendering no longer depends on the old fallback character.
- Dash uses six 192x192 frames at 18 FPS.
- If a dash image has not decoded yet, the actual Base Cherry idle sheet is used.
- The pink fallback orb is never drawn during Base Cherry's dash.

CLASSIC UI RESTORE
- v0557.css has been replaced with a clean reset file.
- No assets/ui/buttons image is used.
- No assets/ui/panels image is used.
- No assets/ui/hud image is used.
- No assets/ui/icons image is used.
- Original CHERRIFT buttons, panels, menus, navigation and HUD styles return.
- The existing main-menu background is left untouched.
- Skin splash art and skin icons remain because they are character assets,
  not the removed generic UI element pack.

FILES
- src/cherrift_v0559.js
- src/main.js
- v0557.css
