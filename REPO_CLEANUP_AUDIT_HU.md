# CHERRIFT mély repo- és startup-audit

Auditált kiinduló commit: `e0429612a3908ae08beef91e62355732dd7deb86`

## Bizonyított gyökérokok

1. A Guest indulás is egy Supabase-függő `await bootstrapSave()` mögött volt.
   Emiatt a `getSession`, a böngésző Web Lockja vagy a `player-api` a teljes
   login UI-t a splash mögött tarthatta.
2. A CI fake Supabase/Storage kliense nem reprodukálta a production Auth lockot.
   A `4b84e9c` commit a smoke mockját tette zölddé, nem a valódi critical pathot.
3. A cleanup az összes régi CSS-t beolvasztotta az
   `assets/cherrift_app.css` fájlba, de a nagy `src/cherrift_app.js` 30 törölt
   `v*.css`/`mobile_v051.css` fájlt továbbra is dinamikusan kért. Ezek minden
   induláskor fölösleges 404-eket és load-event késést okoztak.
4. A `20260801_prebeta_v095.sql` „újrafuttatható” migráció minden meglévő save-et
   owner entitlementtel ruházhatott fel. Most kizárólag aktív `gm_admins.owner`
   sor kaphat ilyen entitlementet.
5. A live Supabase-ben az Auth, Discord OAuth, `player-api` és `gm-api` működik,
   de a repóban lévő `submit-report` Function jelenleg nincs deployolva (404).

A cleanup előtti referenciapont a `84f2bf8` commit; a cleanup fő commitjai
`66728d7`, `38e14e6` és `0bdb020`. A teljes visszaállítás nem indokolt: a régi
verzióban nincs bizonyítottan jó jelenlegi Auth/SQL szerződés, és elvesztené a
későbbi gameplay-, account-isolation- és mobiljavításokat.

## Minden fájlra kiterjedő leltár

Az eredeti commit **937 Git-tracked fájlját** (277+ MB) gépi leltár vizsgálta:

- minden fájl SHA-256 és méret;
- 159 szöveges fájl UTF-8/NUL ellenőrzése;
- minden JavaScript/MJS és TypeScript parseres szintaxisellenőrzése;
- a Python, TOML és YAML fájlok natív/parseres ellenőrzése;
- minden JSON parse-olása és minden CSS parseres ellenőrzése;
- 776 kép és 2 hang fájlszignatúrája, ahol lehetséges képmérete;
- index/GM/package/Supabase entrypoint- és literális hivatkozási gráf;
- üres/placeholderek és byte-azonos duplikátumok.

Eredmény a javítás után:

- szintaxis- vagy fájlszignatúra-hiba: **0**;
- aktív runtime-ból hiányzó literális fájl: **0**;
- 1 byte-os placeholder: **26**;
- byte-azonos duplikátumcsoport: **25**.

Az audit eszköze: `tools/audit_repo.mjs`; kimenete az `audit-output/` mappába
kerül, amelyet nem kell GitHubra feltölteni.

## Biztonságosan törölhető most

### Betöltetlen régi patch-források

- `assets/cherrift_mobile_fix_096.css`
- `src/cherrift_boot_input_fix.js`
- `src/cherrift_fixpack_095.js`
- `src/cherrift_fixpack_095_round5.js`
- `src/cherrift_mobile_fix_096.js`
- `src/cherrift_stability.js`
- `tools/smoke.mjs` (a package az új `smoke_09551.mjs` futtatót használja)

Ezek egyikét sem tölti az `index.html`; törlésük a jelenlegi runtime-ot nem
változtatja. Az aktív tartalom a konszolidált app/runtime modulokban van.

### Üres patch/telepítési dokumentumok

- `APPLY_CACHE_BUST.bat`
- `AUTH_BOOTSTRAP_V2_HU.md` (helyette Auth v3 dokumentum van)
- `CHANGED_FILES_V095.txt`
- `CHERRIFT_PC_FIX_TELEPITES_HU.md`
- `CHERRIFT_PC_MENU_GACHA_PETALS_FIX_TELEPITES_HU.md`
- `DIAG_NOTES_HU.txt`
- `INDEX_CHANGE_REQUIRED.txt`
- `OPTIONAL_index_cache_bust.txt`
- `PREBETA_EVENT_GM_WORLD2_TELEPITES_HU.txt`
- `PREBETA_V095_SETUP_HU.md` (a régi owner-leírás már veszélyesen pontatlan)
- `README_FIX_V2_HU.txt`
- `README_PATCH.txt`
- `ROOTFIX_NOTES_HU.txt`
- `TELEPITES_HU.txt`
- `_TELEPITES_HU.txt`
- `_TORLENDO_FAJLOK.txt`

### 1 byte-os placeholderek

- `assets/audio/.gitkeep`
- `assets/effects/.gitkeep`
- `assets/effects/elemental/Readme.txt`
- `assets/effects/elemental/abyssal/Readme.txt`
- `assets/effects/elemental/blaze/Readme.txt`
- `assets/effects/elemental/celestial/Readme.txt`
- `assets/effects/elemental/common/Readme.txt`
- `assets/effects/elemental/rings/Readme.txt`
- `assets/effects/elemental/stoneveil/Readme.txt`
- `assets/effects/elemental/tidecall/Readme.txt`
- `assets/effects/elemental/windborne/Readme.txt`
- `assets/enemies/.gitkeep`
- `assets/map/.gitkeep`
- `assets/pickups/.gitkeep`
- `assets/player/.gitkeep`
- `assets/ui/.gitkeep`
- `assets/ui/elemental_resonance/common/Readme.txt`
- `assets/ui/elemental_resonance/elements/Readme.txt`
- `assets/ui/elemental_resonance/nodes/Readme.txt`
- `assets/ui/skin_thumbs/Readme.txt`
- `assets/ui/themes/Readme.txt`
- `gm/Readme.txt`
- `supabase/functions/Readme.txt`
- `supabase/functions/gm-api/Readme.txt`
- `supabase/functions/player-api/Readme.txt`
- `supabase/migrations/Readme.txt`

### Jelenlegi runtime-ban hivatkozás nélküli képek

- `assets/ui/bug_report_panel.png`
- `assets/ui/events/bug_report_panel.png`
- a teljes `assets/effects/succubus_cherry/` mappa

Az aktív Succubus effektek a
`assets/player/skins/succubus_cherry/effects/` útvonalról töltődnek.

## Második körben törölhető, előbb gameplay-próba kell

- `assets/player/skins/mage_cherry/compatibility_cherrift/`
- `assets/player/skins/succubus_cherry/legacy_aliases/`

Aktív literális hivatkozásuk nincs, és byte-azonosak a kanonikus attack
fájlokkal, de dokumentált külső/név-kompatibilitási aliasok. Előbb Mage és
Succubus minden irányú idle/walk/melee/ranged/skill animációját ellenőrizd.

Ne töröld pusztán azért a több száz assetet, mert a statikus audit nem talált
teljes útvonal-literált: sok skin, ellenfél, map object és effekt futás közben összeállított
útvonalon töltődik. Ugyanígy maradjanak az Archer külön jelentésű, de azonos
placeholder frame-jei, az elemental ring aliasok és a két apró `deno.json`.
