CHERRIFT v0.5.6.1 — WUXIA SAKURA CHERRY

INSTALL
1. Copy the ZIP contents into the CHERRIFT root.
2. Merge the src folder.
3. Replace src/main.js.
4. Keep v0.5.6.0 and every previous patch file.
5. Hard refresh / clear browser cache.

SKIN
- Wuxia Sakura Cherry
- Legendary
- Automatically unlocked
- Icon:
  assets/player/skins/wuxia_sakura_cherry/wuxia_sakura_cherry_icon.png
- Splash:
  assets/player/skins/wuxia_sakura_cherry/wuxia_sakura_cherry_splashart.jpg

SPRITE STATES
- Idle: 768x192, four 192x192 frames, 3 FPS
- Walk: 1152x192, six 192x192 frames, 8 FPS
- Attack: 1152x192, six 192x192 frames, 18 FPS
- Skill: 1152x192, six 192x192 frames, 16 FPS
- Directions: down, up, left and right
- The selected Wuxia skin automatically animates in the v0.5.6.0 Gear screen.

PASSIVE
Every ten enemies defeated:
- If Blossom Spin is cooling down, its remaining cooldown is multiplied by 0.70.
- If Blossom Spin is ready, one 30% cooldown discount is stored for the next cast.
- The base cooldown is not permanently reduced, preventing infinite stacking.

UNIQUE PASSIVE
- +5% movement speed.
- +5% attack speed.
- Small, lightweight sakura petals appear while walking.
- Petal count is capped for phone performance.

NORMAL ATTACK
- Melee dual-sword attack.
- Uses wuxia_sakura_cherry_attack_*.png.
- Hits a forward cone in medium melee range.
- Deals 118% attack damage.
- Adds a small code-drawn pink slash and petal burst.
- The attack sheet's own narrow sword streaks remain visible.

SKILL — BLOSSOM SPIN
- Uses wuxia_sakura_cherry_skill_*.png.
- The wide circular sword arc and main sakura VFX are already baked into the sheet.
- Damages every enemy inside a medium 188 px radius.
- Deals 285% attack damage once.
- Grants +2% movement speed for one second.
- The +2% bonus decreases linearly to zero during that second.

FILES
- src/cherrift_v0561.js
- v0561.css
- src/main.js

TESTS
- JavaScript syntax checked with Node.
- Critical skin paths and method hooks statically checked.
- No GitHub files were modified.
- Full interactive browser gameplay testing was not available here.
