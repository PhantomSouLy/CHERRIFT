# CHERRIFT PC Gear — Celestial Atelier

A 3. koncepció alapján: balra görgethető inventory, középen a felszerelt Cherry meglévő splash artja és hét felszereléshely, jobbra összesítés / a kiválasztott tárgy eredeti részletei és műveletei.

## Viselkedés

- PC-only: ugyanaz a desktop-ellenőrzés, mint a kristályos főmenünél. A 821 px alatti és az alacsony érintős tájolású felület változatlan.
- Az eredeti inventory-gombok, rendezés, slot- és ritkaságszűrés, felszerelés, levétel, zárolás, eladás, tömeges műveletek és pointeres drag & drop megmaradnak.
- Új, helyi kereső szűri a megjelenítést, adatot nem töröl és nem ment.
- Az eredeti item modal a jobb oszlopban jelenik meg. Ugyanazokat az eredeti, szerver által kezelt metódusokat hívja. Online Discord-fiók továbbra is szükséges a védett műveletekhez.
- A középső kép mindig a felszerelt skinhez tartozik. Base Cherryhez a korábban elkészült átlátszó PNG-ből készült WebP; a többihez a meglévő splash art lágy szélmaszkkal.
- Új skin, póz vagy karaktergrafika nem készült. A későbbi, hárompózos skin assetek külön munkafázisban cserélhetők be.
- 160–380 ms-os transzformációk és áttűnések; a csökkentett mozgás beállítása támogatott. A hoverhang a meglévő hangerőbeállításokat használja.
- Kilépéskor és mobilra váltáskor az új elemek eltűnnek, a natív inline elrendezés helyreáll.

## Grafika

Új: `assets/ui/gear/celestial-frame-pc.webp`, átlátszó kristály–sakura panelkeret. Beépített képgenerálással készült, szöveg nélkül, WebP-re exportálva. Prompt: portrait empty transparent UI frame, thin faceted pink/violet crystal border, cyan glints, small sakura blossoms, transparent center and outside, no text/characters/icons/buttons.

Újrafelhasznált: a kristályos főmenü tájképe, az eredeti CHERRIFT logó, a skinválasztó kristályos akciógombja és kártyakerete, a meglévő felszerelés- és core ikonok. A feliratok HTML-elemek.

## Módosított / új fájlok

- `src/cherrift_desktop_gear.js` — elkülönített PC-prezentáció, kereső, splash, visszalépés.
- `assets/cherrift_desktop_gear.css` — csak PC-n, csak a Gear route-on érvényes stílusok.
- `assets/ui/gear/celestial-frame-pc.webp` — új grafika.
- `index.html` — a modul és CSS betöltése, egységes `1004-celestial-gear` build query.
- `src/cherrift_manifest.json` — modulregisztráció és buildazonosító.
- `tools/desktop_gear.test.mjs` — öt integrációs ellenőrzés.
- `package.json`, `.github/workflows/ci.yml` — tesztparancsok.
- Ez a dokumentum és a `docs/pc-gear/` két képernyőképe.

A közös játékruntime, mobilos CSS/komponensek, autentikáció, Supabase és mentéskód nem módosult.

## Ellenőrzés

- 55/55 teszt: desktop menu 5, desktop skins 5, desktop gear 5, integrity 34, online API 1, Gunner 5.
- Mind a 9 boot smoke eset sikeres, továbbá auth lock / timeout smoke sikeres.
- `npm run validate`: sikeres; `git diff --check`: sikeres.
- Audit: nulla szintaxis-/fájlszignatúra-hiba; a korábbi placeholder- és referenciajelzések fennmaradnak.
- Chromium: 1366×768, 1920×1080, 2560×1440, 3440×1440 és 1128×584; a panelek és a hét slot képernyőn belül. Nulla JavaScript-hiba.
- Valódi böngészőben ellenőrizve a keresés, rendezés, slotfilter, részletek, action callbackek, zárolás, pointeres drag & drop, tömeges kijelölés, skinválasztóra navigálás, vissza, desktop–mobil–desktop helyreállítás.
- A felszerelés/levétel/zárolás böngészős műveleti tesztjei eldobható helyi szolgáltatáshelyettesítőket használnak. A tényleges szerverműveleteket az online API és integrity tesztek fedik. Élő Discord OAuth-végponttal nem történt E2E próba és valódi mentés nem módosult.
- A mobilos Gear képernyők 390×844 és érintős 844×390 méreten pixelpontosan egyeznek a módosítás előtti változattal.

A képernyőképeken látható 24 tárgy helyi böngészős tesztadat, a projekt saját tárgygenerátorával létrehozva. A csomag nem ad tárgyakat a játékosoknak, éles használatkor a tényleges mentés jelenik meg.

## Átadás

Külön ág: `feat/pc-celestial-inventory`. Nincs automatikus élesítés vagy merge. GitHub írási jogosultság a korábbi próbák alapján nem elérhető (403), ezért az átadás közvetlenül letölthető ZIP-pel történik. A ZIP könyvtárai közvetlenül a projekt gyökerébe másolhatók; nincs köztes `files/` mappa. A korábbi PC főmenü és Cherry skinválasztó telepítését feltételezi.
