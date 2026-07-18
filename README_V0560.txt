CHERRIFT v0.5.6.0 — RESPONSIVE GEAR REDESIGN

INSTALL
1. Copy every ZIP file into the CHERRIFT root folder.
2. Merge the src folder.
3. Replace src/main.js.
4. Keep all previous files.
5. Hard refresh / clear browser cache.

GEAR LAYOUT
- Replaces the old desktop paperdoll and both old mobile Gear layouts.
- Uses one responsive Gear implementation for PC and phone.
- Selected Cherry skin plays its real idle_down sprite sheet in the center.
- Equipment slots surround Cherry near their matching body locations.
- Slot labels remain visible and do not overlap the character.
- Inventory is placed underneath the character.

DRAG AND DROP
- PC: drag an inventory item directly onto its matching body slot.
- Phone: hold an item briefly, then drag it onto the highlighted slot.
- Only the matching slot glows green.
- Incorrect slots dim and display a red invalid-drop state.
- Equipped gear can be dragged back onto the Inventory area to unequip.
- Normal scrolling remains available on phone when the user does not hold.

ITEM INFORMATION
- PC mouse hover opens a temporary stat card.
- Moving the mouse away closes the stat card.
- Clicking an item opens the full action dialog.
- Phone tap opens the bottom item-detail sheet.
- Stats, item level, power, rarity stars and comparison are in this separate window.
- Equip, Unequip, Sell and Lock/Unlock remain available.

DESKTOP MENU STYLE
- Main-menu left side becomes a dark vertical rail.
- Pink glowing active item.
- Serif headings and menu labels inspired by the supplied reference.
- No assets/ui element-pack images are used.
- Existing main-menu background remains unchanged.

FILES
- src/cherrift_v0560.js
- v0560.css
- src/main.js

NOTES
- Existing save data and equipment are preserved.
- Existing gear-generation and stat calculations are reused.
- Full interactive browser gameplay testing was not available here.
