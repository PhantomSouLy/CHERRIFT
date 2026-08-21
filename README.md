# CHERRIFT v0.9.5 — Pre-Beta

The pre-beta build adds the production starter progression, central economy
balance, first-star Energy commitment, six beta Worlds, stacking title stats,
profile frames, Social and a weekly Power Top 50. Only an active GM owner keeps
owner entitlements; normal and newly created accounts use locked progression.

Browseres akció-RPG tesztverzió, egységesített PC-, telefonos álló és telefonos fekvő nézettel.

## A v0.9.5 pre-beta fő változásai

- Valódi kezdőaccount: 500 Coin, 50 Energy, 3 Common Chest, Base Cherry és
  World 1-1; minden teszt-unlock eltűnt az új fiókokból.
- Központi currency-, Energy-, Gear-, Arsenal-, XP-, World- és enemy-balance.
- World 1–6 progression, chapter lockok és cserélhető World 5–6 placeholder.
- Halmozódó title statok és külön Title Stats összesítő.
- Feloldható profilkeretek, Social rendszer és heti Power Top 50.
- A meglévő migrációkori owner account teljes tartalma megmarad.

A pontos értékek: [PREBETA_V095_BALANCE_HU.md](PREBETA_V095_BALANCE_HU.md).

## A v0.9.4 stabilizálás fő javításai

- A telefonos World Select most valódi, középre rendezett lapozó: Training + World 1–4, világonként 5 fejezettel.
- A 844×390 körüli fekvő telefonokat a játék már mobilként kezeli, nem keskeny desktopként.
- A PC- és mobil-Gacha csak Common, Rare és Epic ládát használ; 1×/10× nyitás, pity és valódi nyitóanimáció működik.
- A régi `keys` és Legendary-egyenlegek automatikusan használható ládává alakulnak, adatvesztés nélkül.
- A gacha nyeremény nem jelenik meg kétszer; 10× nyitásnál előbb a skinek, majd az összesített többi jutalom látható.
- A navigációt egyetlen stabil router kezeli. A korábbi, egymást felülíró külső patch-lánc megszűnt.
- Discord módban minden mentés előtt fiókonkénti helyi biztonsági másolat készül. Hálózati hiba esetén ebből folytatódik a játék, majd online állapotban újrapróbálja a felhőmentést.
- A World 3–4 pályadefiníciók és map objectek a tényleges assetekre mutatnak; a régi, nem létező fájlútvonalak kikerültek.
- A mobil More menüből kikerültek a duplikált Daily/Weekly/Login/Mail elemek.
- Az Auth v3 helyi mentéssel, szinkron módon indít: sem Supabase, sem Discord,
  sem a `player-api` nem tarthatja a Guest felületet a loading screen mögött.
- A korábbi bundle-ben maradt 30, már nem létező verziózott CSS-kérés kikerült;
  ezek szabályai az egyetlen `assets/cherrift_app.css` fájlban vannak.

## Indítás

Node.js 20+ ajánlott.

```bash
npm ci
npm test
python3 -m http.server 8080
```

Ezután nyisd meg: `http://localhost:8080`.

Ne nyisd meg közvetlenül `file://` URL-lel, mert a böngésző biztonsági szabályai blokkolhatnak asseteket és a bejelentkezést.

## Tesztelés

```bash
npm run validate
npm run audit
npm run smoke
npm run verify:supabase-public
```

A smoke teszt az alábbi nézeteket járja végig:

- 1440×900 desktop
- 1128×584 alacsony desktop/laptop
- 390×844 telefon álló nézet
- 844×390 telefon fekvő nézet
- visszatérő Discord-munkamenet
- végtelen Supabase Auth/Web Lock várakozás közbeni Guest belépés
- végtelen `player-api/bootstrap_save` közbeni fiókhoz kötött fallback

Az audit minden Git-tracked fájlhoz SHA-256-ot, típus-/szignatúra- vagy
szintaxisellenőrzést és hivatkozási leltárt készít. A publikus Supabase-próba
ellenőrzi a Discord OAuth redirectet, a CORS-t és a `player-api` JWT-határát;
nem használ service-role kulcsot és nem módosít játékosadatot.

## Runtime felépítés

Az `index.html` determinisztikus sorrendben tölti be az aktív rendszereket:

1. Network/Supabase guard, publikus konfiguráció és központi balansz.
2. `src/cherrift_app.js` — a konszolidált játék-runtime.
3. `src/cherrift_auth.js` — az egyetlen aktív Guest/Discord Auth modul; a
   session- és cloud-felderítés csak a teljes `UI.init` után, háttérben indul.
4. Gacha, Live Services, Account/Mail, World UI és Clean Runtime modulok.
5. Pre-beta Event/Security/Game UI, Elemental és Skill Builder modulok.

A régi különálló fixpack/stability/mobile patch fájlokat nem szabad újra
betölteni: aktív tartalmuk már a konszolidált runtime-ban van. A karbantartott
törlési lista és a teljes vizsgálat a `REPO_CLEANUP_AUDIT_HU.md` fájlban van.

## Ideiglenes assetek

A jelenleg hiányzó optimalizált képekhez meglévő, biztonságos helyettesítések vannak bekötve. A pontos cserepontokat az [ASSET_PLACEHOLDERS.md](ASSET_PLACEHOLDERS.md) tartalmazza.

## Supabase és Discord

- [Supabase cloud save beállítás](SUPABASE_CLOUD_SAVE_SETUP_HU_EN.md)
- [Discord OAuth beállítás](SUPABASE_DISCORD_SETUP_HU_EN.md)
- [GM Tool Pack beállítás](GM_TOOL_PACK_SETUP_HU.md)
- [Auth v3 és runtime recovery](AUTH_BOOTSTRAP_V3_HU.md)

A böngészős `src/supabase_config.js` kizárólag publikus/publishable kulcsot tartalmazhat. Service-role vagy más titkos kulcs nem kerülhet kliensoldali fájlba.

---

## English summary

CHERRIFT v0.9.5-prebeta.1 adds production starter progression, central balance,
Energy, six beta Worlds, stacking titles, profile frames, Social and weekly Power
ranking on top of the consolidated desktop/mobile runtime.

Run `npm ci && npm test` before every test release. See [ASSET_PLACEHOLDERS.md](ASSET_PLACEHOLDERS.md) for the intentionally temporary art mappings.
