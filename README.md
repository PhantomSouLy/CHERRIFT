# CHERRIFT v0.9.5 — Pre-Beta

Böngészős akció-RPG, Discord-fiókhoz kötött online fejlődéssel. A vendégmód
menüelőnézet; játékhoz és jutalmakhoz elérhető `player-api` szükséges.

A PC-s kristályos rework minden modulja be van kötve. A 2026-10-23-i PC cleanup
buildje: `1019-pc-cleanup`. A változások és a tételes törlési lista:
[REPO_CLEANUP_AUDIT_HU.md](REPO_CLEANUP_AUDIT_HU.md).

## Indítás

Node.js 24+, a teljes audithoz Python 3.11+ és PyYAML szükséges.

```bash
npm ci
python -m pip install -r tools/requirements-audit.txt
python3 -m http.server 8080
```

Nyisd meg a `http://localhost:8080` címet. A `file://` indítás nem támogatott.

## Ellenőrzés

```bash
npm run validate
npm run test:desktop
npm run test:integrity
npm run test:online-api
npm run test:gunner
npm run smoke:supabase-lock
npm run smoke -- --case=desktop
npm run audit -- --source-only
```

A `--source-only` audit a forrásokat, eszközöket, dokumentációt és futó CSS-t
ellenőrzi; nem minősíti és nem hash-eli végig a képeket/hangokat. A teljes audit:
`npm run audit`. Az összes automatikus ellenőrzés: `npm test`.

Az indítási smoke tesztek a teljes alkalmazást futtatják JSDOM-ban, valódi
MutationObserverekkel és helyi Auth/API fixture-ökkel. Ez nem képernyőkép-alapú
böngészős ellenőrzés és nem élő Discord-fiókon végzett jutalomátvétel.
A `desktop`, `wide-desktop` és `short-desktop` eset külön ellenőrzi a Gear és
Achievements tisztítását, a késleltetett frissítéseket és a régi menük hiányát.

A CI minden push/PR esetén futtatja a PC-s felületteszteket is. Az Auth és
felhőmentés timeout-próbái a korábbi regressziókat védik.

## Felépítés és karbantartás

- `index.html`: determinisztikus betöltési sorrend, egyetlen first-party cache ID.
- `src/cherrift_app.js`: közös játék-, mentés- és natív menülogika. További régi
  rétegek vannak benne; a verziószám önmagában nem teszi törölhetővé őket.
- `src/cherrift_desktop_*.js`: PC-s megjelenítés és interakció a közös adatokon.
- `src/cherrift_runtime.js`: közös runtime és az egyetlen aktív Achievements-lista.
- `src/cherrift_world_ui.js`: az aktív World/Chapter-választó.
- `src/cherrift_online.js`: szerver által ellenőrzött jutalmak és tárgyműveletek.
- `supabase/functions/` és `supabase/migrations/`: az online működés forrásai.
- `docs/PC_*.md`: a megtartott PC rework-leírások; a hozzájuk tartozó képek
  a `docs/pc-*` mappákban vannak.

A kiadás megjelenített verzióját a `src/config.js` fájl `CHERRIFT_BUILD` objektuma
kezeli. Cache-frissítésnél az `index.html` összes first-party queryjét és a
`src/cherrift_manifest.json` `buildId` értékét együtt változtasd.
A `package.json` verziója a játék kiadását jelöli.

## Supabase és Discord

- [Cloud save beállítás](SUPABASE_CLOUD_SAVE_SETUP_HU_EN.md)
- [Discord OAuth](SUPABASE_DISCORD_SETUP_HU_EN.md)
- [GM Tool Pack](GM_TOOL_PACK_SETUP_HU.md)
- [Auth bootstrap és recovery](AUTH_BOOTSTRAP_V3_HU.md)
- [Online integritás és telepítés](JAVITASOK_ONLINE_PC_2026-10-17.md)
- [Pre-beta balansz](PREBETA_V095_BALANCE_HU.md)
- [Ideiglenes grafikai cserepontok](ASSET_PLACEHOLDERS.md)

A böngészős konfiguráció kizárólag publikus/publishable kulcsot tartalmazhat.
Service-role kulcs és Discord bot token nem kerülhet a frontendbe.
