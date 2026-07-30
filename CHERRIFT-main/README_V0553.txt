CHERRIFT v0.5.5.3 — NINJA + SUCCUBUS CHERRY

INSTALL
1. Copy all ZIP contents into the CHERRIFT project root.
2. Merge the src folder.
3. Replace src/main.js.
4. Keep every previous patch file.
5. Hard refresh / clear browser cache.

NINJA CHERRY — EPIC
- Automatically unlocked.
- Ranged attack throws two shurikens.
- Shuriken hits apply poison equal to 5% of the hit over two seconds.
- Skill: Shuriken Shots.
- Fires 12 shurikens in 360 degrees.
- Gains +35% movement speed for three seconds.
- Uses code-drawn shuriken and poison effects.

SUCCUBUS CHERRY — LEGENDARY
- Automatically unlocked.
- Ranged attack creates three short-range crimson claw slashes.
- Normal attack damage restores 5% HP.
- Skill: Soul Drain.
- Releases 20 small homing red souls.
- Soul damage restores 10% HP.
- At full HP, Soul Drain creates a shield equal to 15% of current HP.
- Uses code-drawn claw, soul, healing and shield effects.

ASSET CHECK
- Ninja idle: 768x192, four 192x192 frames.
- Ninja walk/skill: 1152x192, six 192x192 frames.
- Succubus walk/skill: 1152x192, six 192x192 frames.
- Succubus idle files are not standard:
  down is 740x191; up/left/right are 757x192.
- The patch dynamically divides those idle sheets into four frames so they work.
- Recommended future fix: re-export every Succubus idle sheet as 768x192 RGBA.

FILES
- src/cherrift_v0553.js
- v0553.css
- src/main.js
