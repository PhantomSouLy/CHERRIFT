# CHERRIFT v0.3.1 Play → World Select Clean Fix

## Fixed
- Main Play opens World Select only.
- Mobile Play opens World Select only.
- Removed separate World Select buttons from the visible menu flow.
- World Select Play launches the selected stage.
- Removed the double-start problem caused by older mobilePlayBtn listeners.
- Reworked fullscreen/mobile viewport fitting without wrapping launchSelectedWorld twice.
- Added strict in-game CSS so menu/panel layers cannot cover the canvas while playing.

## Kept
- PC main menu layout style.
- World Select carousel screen.
- Progression, raids, rewards and Beastclaw systems.
