# CHERRIFT v0.9.0 — Night Bloom Test Build

CHERRIFT egy böngészős survivor/action RPG prototípus, Cherry-kinézetekkel, felszerelésekkel, pályaprogresszióval, Gachával és mobilos érintéses irányítással.

**Játék / Play:** [phantomsouly.github.io/CHERRIFT](https://phantomsouly.github.io/CHERRIFT/)

## Magyar

### Mi van ebben a buildben?

- Teljes, azonnal váltható magyar és angol felület a Settings → General → Language menüben.
- Helyi, mentett Mail rendszer olvasatlan jelzéssel és egyszer átvehető mellékletekkel.
- Betöltés utáni Guest / Discord belépőképernyő, Supabase Authtal, tartós Discord-munkamenettel és Beállítások → Fiók kijelentkezéssel.
- Discord-fiókhoz kötött Supabase felhőmentés, külön Guest `localStorage` mentéssel és első belépéskori automatikus migrációval.
- Beépített magyar/angol Feedback és Bug Report felület, vágólap- és GitHub Issue-kimenettel.
- Jól látható `TESZTVERZIÓ · v0.9.0` jelzés, valamint nagy Erő / HP / ATK kártyák a főmenüben és a loadoutban.
- Az új felszerelésgrafikák ritkaság és slot szerint logikusan bekötve; a régi emoji-ikonok helyett valódi item art jelenik meg.
- Common/Rare melee vágáseffekt, továbbá a Warrior 3×2 slash és 4×2 Whirlwind sprite sheetjének helyes animációja.
- Stabil Play → World Select → run indítás desktopon és mobilon.
- Javított Library, benne Profile, Stats, Gear, Enemies, Skins és Worlds fülekkel.
- Elérhető Daily Quests, Achievements, Login Rewards és Shop a Library szolgáltatássorából.
- Vizuális Bloom Chest Gacha, jutalomkártyával és ritkaság-/statkijelzéssel.
- Sebesség-, dash- és mozgásfüggő kamera, render-only karaktermozgás, hit-stop, screenshake és típusos sebzésszámok.
- Mage Cherry és Archer Cherry teljes 16 fájlos, négyirányú RGBA készlettel, saját passzívval, ranged attackkal és aktív skillel.
- World 1 vizuális remaster, World 2 Night Bloom atmoszféra, elite ellenfelek és boss-telegráf.
- Kibővített run/loot összegző, valódi kulcs-pickup és mobilon szabályozható effekt-/kameraminőség.
- Automatikus mentés, mentésséma-migráció és sérült Guest-mentés esetén backup-visszaállítás.
- `click.wav` hang az aktív, kattintható vezérlőkön; letiltott elemek nem adnak kattintáshangot.
- Mobilon ötcélpontos alsó navigáció, kompakt Gear és Player Upgrade fülek, külön álló és fekvő telefonos elrendezéssel.

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

Az `npm test` ellenőrzi a JavaScript- és CSS-szintaxist, a közvetlen assethivatkozásokat és a betöltési patch-számot. Ezután 1440×900 desktop, 390×844 álló telefon és 844×390 fekvő telefon DOM-környezetben ellenőrzi a 9 skint, a navigációt, Mage/Archer harcát, a passzívokat, a kamerát, World 1 dekorációját, a boss-rendszert és a visszatérő Discord-munkamenetet.

### Mentés és jelenlegi korlátok

- Guest módban a mentés a böngésző `localStorage` tárhelyén marad.
- Discord módban a mentés a Supabase `game_saves` táblájába kerül, és másik eszközön ugyanazzal a Discord-fiókkal automatikusan betöltődik.
- Az első Discord-belépés a meglévő Guest-mentést csak akkor másolja fel, ha a fiókhoz még nincs felhőmentés; a Guest-mentés külön megmarad.
- A felhőmentés használata előtt egyszer futtatni kell a `supabase/game_saves.sql` fájlt a Supabase SQL Editorban.
- A szinkronizálás jelenleg utolsó írás nyer elven működik, ezért ugyanazzal a fiókkal két eszközön egyszerre játszani nem ajánlott.
- World 3 továbbra is előzetes tartalom; a 0.9.0 fókusza World 1–2, a harc és a Cherry skinek.
- A régi verziók továbbra is egymásra épülő patch-fájlokként futnak; a validátor ellenőrzi a sorrendet és a darabszámot.

## English

### Included in this build

- Complete runtime-switchable Hungarian and English UI under Settings → General → Language.
- Local, persisted Mail with unread badges and one-time claimable attachments.
- A post-loader Guest / Discord gate powered by Supabase Auth, persistent Discord sessions and sign-out under Settings → Account.
- Discord-account Supabase cloud saves, a separate Guest `localStorage` save and automatic first-sign-in migration.
- Built-in Hungarian/English Feedback and Bug Report screen with clipboard and GitHub Issue output.
- A prominent `TEST BUILD · v0.9.0` label and large Power / HP / ATK cards on the home and loadout screens.
- New equipment artwork mapped logically by rarity and slot instead of the previous emoji icons.
- Common/Rare melee slash art plus correctly sliced 3×2 Warrior slash and 4×2 Whirlwind sheets.
- Stable Play → World Select → run launch on desktop and mobile.
- Fixed Library with Profile, Stats, Gear, Enemies, Skins and Worlds tabs.
- Daily Quests, Achievements, Login Rewards and Shop are reachable from the Library service bar.
- Visual Bloom Chest Gacha with reward art, rarity and stat cards.
- A speed- and dash-reactive camera, render-only character motion, hit-stop, screen shake and typed damage numbers.
- Complete four-direction RGBA sets for Mage Cherry and Archer Cherry, including their passives, ranged attacks and active skills.
- A World 1 visual remaster, World 2 Night Bloom atmosphere, elite enemies and telegraphed boss attacks.
- Expanded run/loot summaries, a real key pickup and mobile effect/camera quality settings.
- Automatic saving, schema migration and backup recovery for malformed Guest saves.
- `click.wav` on enabled interactive controls; disabled/decorative controls stay silent.
- Five-destination mobile navigation plus compact Gear and Player Upgrade tabs, verified in portrait and landscape.

### Local start

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

### Controls

- Desktop: `WASD` or arrow keys; active skill: `E`, `Shift` or `Space`.
- Mobile: drag/touch on the left play area; dedicated skill button in the lower-right corner.

### Current limits

- Guest mode keeps a browser-local `localStorage` save.
- Discord mode stores progress in the Supabase `game_saves` table and restores it on other devices signed into the same Discord account.
- On first Discord sign-in, the existing Guest save is copied only when no cloud save exists yet; the Guest save remains separate.
- Run `supabase/game_saves.sql` once in the Supabase SQL Editor before enabling the deployed cloud-save build.
- Synchronization currently uses last-write-wins, so playing the same account on two devices at the same time is not recommended.
- World 3 remains preview content; v0.9.0 focuses on Worlds 1–2, combat and Cherry skins.
- The legacy sequential patch stack remains in place; validation checks its order and count.

## Dokumentáció / Documentation

- [0.6 → 1.0 BETA roadmap](ROADMAP_0.6_TO_1.0_HU_EN.md)
- [v0.6.2 audit report](AUDIT_V062_HU_EN.md)
- [v0.6.2 changelog](CHANGELOG_V062_HU_EN.md)
- [v0.6.3 changelog](CHANGELOG_V063_HU_EN.md)
- [v0.6.3 Installation / Telepítés](INSTALL_V063_HU_EN.md)
- [v0.9.0 patch notes / javítási jegyzet](PATCH_NOTES_V090_HU.md)
- [Supabase Discord setup / beállítás](SUPABASE_DISCORD_SETUP_HU_EN.md)
- [Supabase cloud save setup / felhőmentés](SUPABASE_CLOUD_SAVE_SETUP_HU_EN.md)

The project runs entirely in the browser and does not require a production npm build step.
