# Sport Cherry — complete authored poses v2

Baseline: `831da88dac3eec14eec0da7cf8be40e0b0b0e1b7`.
Reference skins: accepted Base Cherry v7 and Cake Delivery Cherry v13.

## What changed

- All eight Walk directions now load their actual Walk strips, and Walk Attack loads its actual moving attack strip. Previously these paths aliased Idle/Attack and depended on an inverse-warp leg shader.
- Both moving states sample complete authored poses at eight poses per second of real travel. The stride survives turns, starting/stopping a shot, and blocked movement. The projectile still fires once at the existing cast event.
- No limb crops, substituted feet, skeleton, mesh, optical flow or temporal blending is called by the Sport renderer. Shared complete-pose registration translates/scales the whole 192px cell only.
- v2 uses original full right/left contact poses and two newly edited full passing poses. It holds each contact naturally for two ticks, with a low passing pose between contacts; the old wide final step and one-sided hold are retired. Whole-pose head-size matching and sole registration preserve shape and ground contact. Corrected costume atlases provide 36 additional whole figures. Opposite directions mirror whole figures. No body part is spliced or replaced separately.
- v2 replaces the wrong skirt/puff-sleeve costume in up-right/up-left Idle, Idle2, Attack and Skill and removes puff sleeves from up Attack/Skill. The remaining standing PNGs stay unchanged. Registration anchors the upper silhouette instead of recentering each pose on the support foot.
- Fixed material palettes match corrected art to the preserved original directional Idle pinks. Original contact poses and the two newly edited passing poses each match that same target. Passing art uses one fixed correction only in slots1 and4; repeated contact art keeps identical colors at the loop boundary. It is cached once; source alpha, neutral whites and non-pink skin/eye colors are preserved. Paired left/right strips share their palette curves.
- Sport Common Shield, +2% HP passive, healing/cooldown, projectile properties and VFX module are unchanged. Main player opacity is forced to one; caller opacity is restored and ghost renders retain it.
- The old Sport gait module is unloaded from HTML and the runtime manifest. Its file can remain as unused historical code. The old export command now forwards to the complete-pose exporter.

## Regenerate / verify

```sh
python tools/export_sport_whole_frames.py
npm run test:sport-cherry
npm run test:base-cherry
npm run test:cherry-motion
npm run validate
python tools/check_pages_payload.py
```

v2 sources and the exact generation prompt set are stored in `assets/player/cherry_skins/sport_cherry/sources/whole-refine-v2/`. The exporter needs Pillow, numpy and scipy. It only extracts, scales and packs whole connected figures; it measures palette curves but does not repaint source PNGs.

Optional development preview: install `@napi-rs/canvas` without saving it to package metadata, then run `node tools/preview_sport_whole_frames.cjs OUTPUT_DIRECTORY`. Preview generation runs the actual shipped controllers and registration renderer. HTML embeds all 65 required images, all 48 Sport tiles, two accepted Walk references, pause/speed/frame-step/direction/state controls. The preview stays in place; actual world translation belongs to the game.

## Validation

- 34/34 targeted Sport, Base and shared-alignment tests passed.
- 288 Sport cells checked for nonempty alpha and safe bounds; zero clipped cells.
- All 288 states render one complete cell without calling legacy flow/gait backends, including with those backends replaced by throwing stubs.
- Existing Base and Cake runtime modules/assets are byte-identical to baseline.
- All first-party HTML build queries equal the manifest build ID.
- `npm run validate` passed. Pages payload policy passed; source atlases are excluded from publication.
- The offline HTML controls and both reference canvases were exercised with DOM simulation and native canvas; this verifies interaction logic, not a physical phone/browser layout.
- Five-direction actual-render pink medians are near their original Idle palette; the same correction applies throughout each six-slot strip.
- Caveat: `tools/cake_cherry.test.mjs` has three existing failures from outdated flow/facing assertions. The exact same three fail on the untouched baseline. This patch does not change Cake code, assets, or those tests.
- Preview/runtime-controller verification does not substitute for SouLy's final in-game visual review on the target phone.

## Install

Copy the CONTENTS of `changed_files` from the ZIP into the repository root, keeping relative paths and replacing matching files. It is one complete patch against the stated baseline; do not combine it with earlier Sport attempts. The build query must be updated together with both manifest and controller/data/assets.

No deployment or Git push is included. Existing unrelated changes newer than the baseline should be merged rather than overwritten wholesale, especially `index.html` and `src/cherrift_manifest.json`.
