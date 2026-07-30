CHERRIFT v0.5.1 PHONE-ONLY ARCHERO MENU
========================================

PURPOSE
-------
Replaces only the phone home menu with a larger Archero-inspired layout.
Desktop (821px and wider) remains unchanged.

INSTALL
-------
1. Extract the ZIP.
2. Copy its contents into the CHERRIFT project root.
3. Merge the src folder.
4. Replace src/main.js when asked.
5. Keep every other existing file.
6. Hard refresh / clear the browser cache.

NEW FILES
---------
src/cherrift_mobile_v051.js
mobile_v051.css

REPLACED FILE
-------------
src/main.js

PHONE MENU CONTENT
------------------
- Player profile and persistent account level
- XP progress
- Energy / Coins / Keys top bar
- Current Cherry and calculated equipment power
- Current world and stage
- Large Play button
- Stage selector shortcut
- Chest, Gear and Skins shortcuts
- Reserved Quest, Achievement and Shop buttons
- Five-button bottom navigation
- Small-screen fallback for short phones
- Safe-area support for notches and Android navigation bars

DESKTOP SAFETY
--------------
All visual rules are inside max-width: 820px.
The desktop main menu markup and layout are not replaced.
