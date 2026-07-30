# CHERRIFT v0.6.2 — Quality & Localization

## Magyar

### Javítva

- Library → Skins teljes fagyása/kattintásblokkolása PC-n és telefonon.
- PLAY dupla kattintásból eredő dupla runindítás.
- Háttérbe tett lap utáni rossz Pause állapot és beragadt input.
- Sérült mentés backupjának visszaállítása és 5-ös séma migrációja.
- Napi küldetések helyi dátuma és lifetime statból azonnal készülő questek.
- View zoom tényleges hatása és a túl távoli játéknézet.
- 29 hibás/régi assethivatkozás.
- Click hang főhangerő-skálázása.
- Kötelező patch hibája után megjelenő félkész alkalmazás.

### Hozzáadva

- Teljes runtime magyar/angol nyelvváltás, dinamikus feliratokra, toastokra és accessibility attribútumokra is.
- Library szolgáltatássor: Daily Quests, Achievements, Login Rewards, Shop.
- Kétnyelvű boot-hibaoldal újratöltés gombbal.
- Desktop/mobil regresszióteszt és statikus asset-/szintaxisvalidator.
- Kétnyelvű README, audit és 0.6–1.0 BETA roadmap.

### Módosítva

- Verzó: v0.6.2 Quality Update.
- Korrekt kameraértékek: desktop 1.34×–1.61×, mobil álló módban 1.42×–1.70×.
- Nem működő Discord/dekoratív elemek valóban letiltva; nem adnak click hangot.
- Cache-busting frissítve minden ebben a csomagban módosított runtime fájlnál.

## English

### Fixed

- Complete Library → Skins click freeze on desktop and mobile.
- Duplicate run starts caused by double-clicking PLAY.
- Incorrect background-tab Pause state and stuck keyboard/touch input.
- Recovery from malformed primary saves plus schema-5 migration.
- Local daily reset and quests incorrectly completed by lifetime statistics.
- View zoom not affecting the final renderer and an excessively distant camera.
- 29 stale or missing direct asset references.
- Master-volume scaling for click audio.
- Half-initialized application state after a mandatory patch failed.

### Added

- Full runtime Hungarian/English switching for static and dynamic UI, toasts and accessibility attributes.
- Library service bar for Daily Quests, Achievements, Login Rewards and Shop.
- Bilingual boot failure screen with a Reload Game action.
- Desktop/mobile smoke suite and static asset/syntax validator.
- Current bilingual README, audit and 0.6–1.0 BETA roadmap.

### Changed

- Version label updated to v0.6.2 Quality Update.
- Fair camera range: 1.34×–1.61× desktop and 1.42×–1.70× mobile portrait.
- Nonfunctional Discord/decorative controls are disabled and silent.
- Cache-busting updated for every runtime file changed in this package.

