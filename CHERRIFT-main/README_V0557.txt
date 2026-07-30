CHERRIFT v0.5.5.7 — WARRIOR + SUCCUBUS REMAKE + UI ASSETS

INSTALL
1. Copy the ZIP contents into the CHERRIFT root.
2. Merge the src folder.
3. Replace src/main.js.
4. Keep all previous patch files.
5. Hard refresh / clear browser cache.

WARRIOR CHERRY — RARE
- Automatically unlocked.
- Passive: +5% maximum HP.
- Basic attack: forward melee sword swing.
- Uses warrior_cherry_melee_*.png.
- Skill: Whirlwind.
- Uses warrior_cherry_ranged_*.png as the current Whirlwind character animation.
- Deals five radial damage ticks around Cherry.
- Code-drawn blue sword arcs are temporary VFX.

SUCCUBUS REMAKE
- Uses the new canonical 768x192 idle sheets.
- Uses the new 1152x192 walk sheets.
- Basic attack now displays succubus_cherry_melee_*.png.
- Soul Drain displays succubus_cherry_ranged_*.png.
- Existing lightweight homing soul logic from v0.5.5.6 remains.
- The old removed succubus_cherry_skill_*.png paths are no longer used.

SKIN IMAGES
- Skin carousel splash backgrounds use each skin's splash art.
- Compact skin previews use the new *_icon.png files.
- Mobile Library skin collection uses the new icon files.
- Warrior currently has no warrior_cherry_splashart.png in the repo, so
  warrior_cherry_icon.png is used for both portrait and icon.

UI ASSET PACK
- Panel header frame uses assets/ui/panels/cherrrift_panels_016.png.
- Standard menu buttons use assets/ui/buttons/cherrrift_buttons_005.png.
- Primary buttons use assets/ui/buttons/cherrrift_buttons_009.png.
- Gameplay HUD receives a subtle assets/ui/hud/cherrrift_hud_015.png frame.
- Numbered semantic icons were intentionally not assigned blindly.

FILES
- src/cherrift_v0557.js
- v0557.css
- src/main.js
