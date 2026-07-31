# CHERRIFT v0.9.4 — Stabilization Test Build

Browseres akció-RPG tesztverzió, egységesített PC-, telefonos álló és telefonos fekvő nézettel.

## A v0.9.4 fő javításai

- A telefonos World Select most valódi, középre rendezett lapozó: Training + World 1–4, világonként 5 fejezettel.
- A 844×390 körüli fekvő telefonokat a játék már mobilként kezeli, nem keskeny desktopként.
- A PC- és mobil-Gacha csak Common, Rare és Epic ládát használ; 1×/10× nyitás, pity és valódi nyitóanimáció működik.
- A régi `keys` és Legendary-egyenlegek automatikusan használható ládává alakulnak, adatvesztés nélkül.
- A gacha nyeremény nem jelenik meg kétszer; 10× nyitásnál előbb a skinek, majd az összesített többi jutalom látható.
- A navigációt egyetlen stabil router kezeli. A korábbi, egymást felülíró külső patch-lánc megszűnt.
- Discord módban minden mentés előtt fiókonkénti helyi biztonsági másolat készül. Hálózati hiba esetén ebből folytatódik a játék, majd online állapotban újrapróbálja a felhőmentést.
- A World 3–4 pályadefiníciók és map objectek a tényleges assetekre mutatnak; a régi, nem létező fájlútvonalak kikerültek.
- A mobil More menüből kikerültek a duplikált Daily/Weekly/Login/Mail elemek.

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
npm run smoke
```

A smoke teszt az alábbi nézeteket járja végig:

- 1440×900 desktop
- 1128×584 alacsony desktop/laptop
- 390×844 telefon álló nézet
- 844×390 telefon fekvő nézet
- visszatérő Discord-munkamenet

Ellenőrzi többek között a World Selectet, a Gachát és key-migrációt, a login gate-et, a Gear/BAG felületet, a skineket, a jutalmakat és a játékindítást.

## Runtime felépítés

Az `index.html` determinisztikus sorrendben tölti be az aktív rendszereket:

1. `src/cherrift_app.js` — konszolidált játék-runtime
2. `src/cherrift_gacha.js` — láda/Gacha
3. `src/cherrift_live_services.js` — szerveres Mail és Redeem híd
4. `src/cherrift_account_mail.js` — Account, Profile és Mail UI
5. `src/cherrift_world_ui.js` — mobil World/Chapter selector
6. `src/cherrift_stability.js` — egyetlen végső navigációs és stabilitási réteg

A régi különálló `cherrift_bugfix_v094*.js`, `cherrift_v0933.js`, `cherrift_theme_system.js` és `v0933.css` fájlokat nem szabad visszatenni: aktív tartalmuk már a runtime-ban vagy a fenti modulokban van.

## Ideiglenes assetek

A jelenleg hiányzó optimalizált képekhez meglévő, biztonságos helyettesítések vannak bekötve. A pontos cserepontokat az [ASSET_PLACEHOLDERS.md](ASSET_PLACEHOLDERS.md) tartalmazza.

## Supabase és Discord

- [Supabase cloud save beállítás](SUPABASE_CLOUD_SAVE_SETUP_HU_EN.md)
- [Discord OAuth beállítás](SUPABASE_DISCORD_SETUP_HU_EN.md)
- [GM Tool Pack beállítás](GM_TOOL_PACK_SETUP_HU.md)

A böngészős `src/supabase_config.js` kizárólag publikus/publishable kulcsot tartalmazhat. Service-role vagy más titkos kulcs nem kerülhet kliensoldali fájlba.

---

## English summary

CHERRIFT v0.9.4 is a browser action-RPG stabilization build. It consolidates navigation, repairs desktop and mobile Gacha, adds a real phone World/Chapter carousel, handles landscape phones, migrates legacy keys without losing value, and protects Discord progress with a per-account local backup plus cloud retry.

Run `npm ci && npm test` before every test release. See [ASSET_PLACEHOLDERS.md](ASSET_PLACEHOLDERS.md) for the intentionally temporary art mappings.
