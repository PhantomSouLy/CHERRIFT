# CHERRIFT v0.6.3 — Test Build Systems Update

CHERRIFT egy böngészős survivor/action RPG prototípus, Cherry-kinézetekkel, felszerelésekkel, pályaprogresszióval, Gachával és mobilos érintéses irányítással.

**Játék / Play:** [phantomsouly.github.io/CHERRIFT](https://phantomsouly.github.io/CHERRIFT/)

## Magyar

### Mi van ebben a buildben?

- Teljes, azonnal váltható magyar és angol felület a Settings → General → Language menüben.
- Helyi, mentett Mail rendszer olvasatlan jelzéssel és egyszer átvehető mellékletekkel.
- Betöltés utáni Guest / Discord belépőképernyő, Supabase Authtal, tartós Discord-munkamenettel és Beállítások → Fiók kijelentkezéssel.
- Beépített magyar/angol Feedback és Bug Report felület, vágólap- és GitHub Issue-kimenettel.
- Jól látható `TESZTVERZIÓ · v0.6.3` jelzés, valamint nagy Erő / HP / ATK kártyák a főmenüben és a loadoutban.
- Az új felszerelésgrafikák ritkaság és slot szerint logikusan bekötve; a régi emoji-ikonok helyett valódi item art jelenik meg.
- Common/Rare melee vágáseffekt, továbbá a Warrior 3×2 slash és 4×2 Whirlwind sprite sheetjének helyes animációja.
- Stabil Play → World Select → run indítás desktopon és mobilon.
- Javított Library, benne Profile, Stats, Gear, Enemies, Skins és Worlds fülekkel.
- Elérhető Daily Quests, Achievements, Login Rewards és Shop a Library szolgáltatássorából.
- Vizuális Bloom Chest Gacha, jutalomkártyával és ritkaság-/statkijelzéssel.
- Korrekt, közelebbi és valóban működő kamerabeállítás.
- Automatikus helyi mentés, mentésséma-migráció és sérült mentés esetén backup-visszaállítás.
- `click.wav` hang az aktív, kattintható vezérlőkön; letiltott elemek nem adnak kattintáshangot.
- Mobilon hatcélpontos alsó navigáció, kompakt Gear és Player Upgrade fülek.

### Indítás helyben

Az ES module helyett hagyományos böngészős scripteket használó játékot is érdemes HTTP-szerverről indítani:

```bash
python -m http.server 8000
```

Ezután nyisd meg: `http://localhost:8000`

### Irányítás

- Desktop: `WASD` vagy nyilak; aktív képesség: `E`, `Shift` vagy `Space`.
- Mobil: húzás/érintés a játékterület bal oldalán; külön képességgomb jobb alul.
- A Pause gombbal megállítható a run; a Settingsből csak futó, szüneteltetett run esetén jelenik meg a Resume run.

### Fejlesztői ellenőrzés

Node.js 22 vagy újabb ajánlott.

```bash
npm install
npm test
```

Az `npm test` ellenőrzi a JavaScript-szintaxist, a közvetlen assethivatkozásokat, a betöltési patch-számot, majd 1440×900 desktop és 390×844 mobil DOM-környezetben végigpróbálja az indulást, a PLAY-t, a Library/Skins oldalt, a nyelvváltást, a kamerát, az input-resetet, a mentés-visszaállítást, a Mailt, a report-formokat és az új asset-kiosztást.

### Mentés és jelenlegi korlátok

- A mentés jelenleg a böngésző `localStorage` tárhelyén marad; nincs még felhőszinkron.
- A Discord-login működik Supabase Authon keresztül. A felhőmentéshez még külön adatbázistábla és RLS-szabályok szükségesek; a játékmentés ebben a buildben továbbra is helyi.
- World 3 jelenleg előzetes/placeholder tartalom, teljesítése a 0.7 célja.
- A régi verziók egymásra épülő patch-fájljai működnek, de a 0.9 előtt moduláris buildbe kell őket összevonni.

## English

### Included in this build

- Complete runtime-switchable Hungarian and English UI under Settings → General → Language.
- Local, persisted Mail with unread badges and one-time claimable attachments.
- A post-loader Guest / Discord gate powered by Supabase Auth, persistent Discord sessions and sign-out under Settings → Account.
- Built-in Hungarian/English Feedback and Bug Report screen with clipboard and GitHub Issue output.
- A prominent `TEST BUILD · v0.6.3` label and large Power / HP / ATK cards on the home and loadout screens.
- New equipment artwork mapped logically by rarity and slot instead of the previous emoji icons.
- Common/Rare melee slash art plus correctly sliced 3×2 Warrior slash and 4×2 Whirlwind sheets.
- Stable Play → World Select → run launch on desktop and mobile.
- Fixed Library with Profile, Stats, Gear, Enemies, Skins and Worlds tabs.
- Daily Quests, Achievements, Login Rewards and Shop are reachable from the Library service bar.
- Visual Bloom Chest Gacha with reward art, rarity and stat cards.
- A fair, closer camera whose View zoom setting now affects the final renderer.
- Automatic local saving, schema migration and backup recovery for malformed saves.
- `click.wav` on enabled interactive controls; disabled/decorative controls stay silent.
- Six-destination mobile navigation plus compact Gear and Player Upgrade tabs.

### Local start

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

### Controls

- Desktop: `WASD` or arrow keys; active skill: `E`, `Shift` or `Space`.
- Mobile: drag/touch on the left play area; dedicated skill button in the lower-right corner.

### Current limits

- Saves are device-local until the account/cloud-save milestone.
- Discord login is active through Supabase Auth. Cloud saves still require a dedicated database table and RLS policies; this build continues to use the local game save.
- World 3 is preview/placeholder content scheduled for completion in 0.7.
- The legacy sequential patch stack should be consolidated before the 1.0 BETA.

## Dokumentáció / Documentation

- [0.6 → 1.0 BETA roadmap](ROADMAP_0.6_TO_1.0_HU_EN.md)
- [v0.6.2 audit report](AUDIT_V062_HU_EN.md)
- [v0.6.2 changelog](CHANGELOG_V062_HU_EN.md)
- [v0.6.3 changelog](CHANGELOG_V063_HU_EN.md)
- [v0.6.3 Installation / Telepítés](INSTALL_V063_HU_EN.md)
- [Supabase Discord setup / beállítás](SUPABASE_DISCORD_SETUP_HU_EN.md)

The project runs entirely in the browser and does not require a production npm build step.
