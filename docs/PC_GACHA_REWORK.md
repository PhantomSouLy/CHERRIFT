# CHERRIFT PC Gacha — Blossom Summoning

A 3. koncepció működő, PC-s megvalósítása: nagy ládabemutató balra, íves díszkártyák és a valódi nyitási adatok jobbra, alul a három meglévő láda választósora. Csak Common, Rare és Epic; nincs új ládatípus vagy új gazdasági szabály.

## Elkészült

- Külön fantasy tájkép, lebegő szirmok, kristályos választók és nyitógombok.
- Három új, átlátszó PC-s ládagrafika, egyenként zárt és nyitott állapottal. Kétkockás atlaszok, CSS-sel mintavételezve.
- Eredeti 1× és 10× nyitógombok, tényleges készletszámok, garanciaszámláló és nyitásszám.
- Ládaváltáskor 280–380 ms áttűnés / elmozdulás; visszalépéskor 160 ms animáció. Hoverhang a meglévő hangerőbeállításokkal.
- A szerver válaszáig a zárt láda várakozik. Csak sikeres válasz után jelenik meg a nyitott állapot, majd az eredeti jutalomösszesítő / skinfelfedés.
- A középső illusztrációk jutalomtípusokat jelölnek, nem garantált konkrét tárgyakat vagy esélyeket. Nincs fiktív ár, készlet vagy drop rate.
- Billentyűzettel használható ládaválasztó, fókuszkezelés a jutalomablakban, Tab-körbefogás és Escape-védelem folyamatban levő nyitás alatt.
- A csökkentett mozgás beállítása támogatott.

## Funkcionális határ

Az eredeti `src/cherrift_gacha.js` változatlan. Ugyanaz az `openMany()` hívja az eredeti `CHERRIFT_ONLINE.perform('open_chest', {tier,count})` műveletet. A nyitást, jogosultságot, ládafogyást, mentést, jutalmakat és duplikációs konverziót továbbra is az eredeti rendszer kezeli.

Nem módosult a közös játékruntime, autentikáció, Supabase, adatbázis, mentéskód vagy a régi ládák PNG-je. A PC-s grafika külön könyvtárban van, így a mobilos Gacha és a mobilon használt ládaképek megmaradnak. A korábbi menük általános hibajavítása későbbre marad.

A PC-feltétel a meglévő kristályos főmenüével egyezik. Mobilra váltáskor a dekorációk és a hozzáadott attribútumok eltűnnek; egy folyamatban levő nyitás az eredeti mobilos ablakban folytatódik.

## Fájlok

- `src/cherrift_desktop_gacha.js` — új PC-prezentáció és billentyűzet/fókuszkezelés.
- `assets/cherrift_desktop_gacha.css` — desktop media query + kizárólagos route-osztály.
- `assets/ui/gacha/blossom-vault-pc.webp` — új háttér.
- `assets/ui/gacha/common-states-pc.webp`, `rare-states-pc.webp`, `epic-states-pc.webp` — három új, kétállapotú ládaatlasz.
- `index.html`, `src/cherrift_manifest.json` — betöltés és egységes `1005-blossom-gacha` buildazonosító.
- `tools/desktop_gacha.test.mjs`, `package.json`, `.github/workflows/ci.yml` — hét új integrációs teszt és futtatásuk.
- Ez a dokumentum, továbbá a `docs/pc-gacha/` képei és az `asset-prompts.json` pontos grafikai promptjai.

A beépített képgeneráló eszközzel készültek az új grafikák, PNG-forrásból WebP-re exportálva. A logó, az akciógomb/kártyakeret és a jutalomtípusokat illusztráló felszerelés-/skin-/Essence-képek meglévő projektassetek.

## Ellenőrzések

- 62/62 teszt sikeres: desktop menu 5, skins 5, gear 5, gacha 7, integrity 34, online API 1, Gunner 5.
- 9/9 boot smoke eset sikeres; auth lock / timeout smoke sikeres.
- `npm run validate`, `git diff --check`: sikeres. Audit: nulla szintaxis-/fájlszignatúra-hiba; a repository korábbi placeholder- és referenciajelzései fennmaradnak.
- Chromium: 1366×768, 1920×1080, 2560×1440, 3440×1440 és 1128×584. A panelek és a nyitógombok képernyőn belül maradnak, a nyitógombokat nem vágja le a panel.
- Valódi böngészőben: ládaváltás, nullás készlet és 10× tiltás, vendégnyitás adatváltozás nélküli elutasítása, 1× / 10× sikeres nyitás, várakozás és nyitott grafika, eredeti jutalomösszesítő, duplikált skin és Essence-szöveg, null választ adó szerver, visszalépés, fókusz és billentyűzet, mobilra váltás folyamatban levő nyitás alatt. Nulla JavaScript-hiba.
- A sikeres böngészős nyitások eldobható helyi transporthelyettesítőt használtak. Az eredeti Gacha és jutalomrenderelő kód futott; a valódi szerveroldali jogosultságot és tranzakciókat az integrity / online API tesztek fedik. Élő Discord-fiókkal nem történt E2E próba, valódi felhasználói mentés nem módosult.
- Mobilos képernyők 390×844 és érintős 844×390 méreten pixelpontosan megegyeznek a módosítás előtti változattal.

A fő képernyőkép a valódi vendég-alapkészletet mutatja (3 Common láda). A nyitásról és jutalmakról készült képek helyi, elkülönített tesztfolyamatból származnak. A csomag nem tartalmaz játékosmentést és nem ad ingyen tárgyakat vagy ládákat.

## Átadás

Külön ág: `feat/pc-blossom-summoning`, az aktuális `origin/main` ReworkGear állapotából. Nincs automatikus élesítés vagy merge. A GitHub írási műveletei a korábbi kísérletekben 403-mal elutasultak, ezért a kézi átadáshoz közvetlen ZIP készült; távoli PR nem jött létre.

A ZIP tartalmát a projekt gyökerébe kell másolni a mappák egyesítésével, felülírással. Nincs köztes `files/` könyvtár. A korábbi PC főmenü, skinválasztó és Gear telepítését feltételezi. Új Supabase-beállítás nem szükséges.
