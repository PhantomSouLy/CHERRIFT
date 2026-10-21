# CHERRIFT – PC World → Chapter / Crystal Gallery

A kiválasztott 1-es világkártyás koncepció működő megvalósítása, beépített World → Chapter lépéssel.
Alap: main 1c4fb033eefcc691a28be393ed3c5bccb41889d8 (ReworkUpgrade).
Ág: feat/pc-world-chapter-gallery. Build: 1007-world-gallery.

## Megvalósítás

A PLAY a világkártyás nézetet nyitja meg. A hat meglévő világ között a nagy kártyákkal, nyilakkal vagy az alsó képsávval lehet váltani. A FEJEZETEK gomb az adott világ tényleges fejezeteit nyitja meg ugyanabban a vizuális keretben. Az eredeti öt fejezet nagy kártyákon és az alsó képsávon is kiválasztható. A PLAY a natív pályaindító gombot aktiválja.

- Meglévő világ- és fejezet-splash képek; az eredeti logó és főmenüháttér.
- Egyedi, átlátszó, szöveg nélküli kristályos kártyakeret; újrafelhasznált kristályos akciógomb.
- Valós csillagok, zárolások, jutalmak, első teljesítési jutalom, cél, energia és ajánlott szint/erő a natív menüből.
- Visszalépés Chapter → World → Lobby, a szülővilág megőrzésével.
- Hover, 3D kártyakiemelés, animált nézetváltás, sziromréteg, diszkrét parallax; reduced-motion támogatás.
- Nyílbillentyűk, Home/End, Escape, látható fókusz és képernyőolvasó-feliratok.
- Felső fiók-/erőforrássáv az eredeti menü funkcióival.
- A Training bejegyzés csak akkor látszik, ha a natív választó is felkínálja. Nem ad új hozzáférést vagy jogosultságot.

A külön JS-modul a natív karusszel renderelt adatait olvassa, majd visszaállítja annak eredeti kijelölését. A zárolt kártyák megtekinthetők, de az új akciógomb a natív gomb tiltását követi. Az indítás az eredeti útvonalon fut, rövid dupla kattintás elleni védelemmel; az online indítás további aszinkron védelmét a meglévő rendszer kezeli. A megjelenítés nem ír mentést és nem másolja le a feloldási szabályokat.

## Mobil

Minden stílus a desktop media query és a saját crystal-world-selector body-osztály mögött fut. A JS a főmenü meglévő desktop felismerését használja, az érintéses, alacsony fekvő nézetet is kizárva. Mobilra váltáskor minden hozzáadott elem és folyamatban lévő animáció eltűnik; az eredeti World / Chapter DOM marad. A megosztott világválasztó, autentikáció, játéklogika, pályaadatok és mobilos CSS változatlan.

## Tesztelés

- Teljes npm test: 80 automatizált teszt sikeres (5 főmenü + 5 skins + 5 gear + 7 gacha + 9 upgrade + 9 world + 34 integritás + 1 online API + 5 gunner).
- Mind a 9 boot smoke eset sikeres, továbbá az auth lock/timeout smoke is.
- validate: 49 JS, 19 CSS, 70 forrásfájl; a szintaxis, függőségek és assethivatkozások érvényesek.
- Repo audit: 0 szintaxis-/fájlszignatúra-hiba. A repo korábbi hiányzó hivatkozásai és placeholder találatai nem részei ennek a menücserének.
- Böngészőben mindkét nézet: 1366×768, 1920×1080, 2560×1440, 3440×1440 és 1128×584. Kártyák és vezérlők képernyőn belül; alsó információ és képsáv nem fedik egymást.
- Zárolt világ és fejezet megtekintése, indítás tiltása, billentyűzet, World→Chapter→World→Lobby, desktop→mobil→desktop tesztelve.
- A puszta előnézet nem változtatta a kiválasztott pályát, szintet, valutát, energiát és csillagokat.
- Natív indítógomb delegálása elszigetelt böngészős fixture-rel ellenőrizve; éles bejelentkezett pályaindítás, energiafogyasztás és jutalomkiosztás nem volt a teszt része.
- GM-lista és a második világból visszalépés külön helyi jogosultság-fixture-rel tesztelve; éles GM indítás nem volt a próba része.
- A natív lokalizáció után nincs ismétlődő karusszel-beolvasási ciklus.
- Mobil 390×844 és érintéses 844×390: World és Chapter előtt/után képpárok mind pixelre azonosak (4 összehasonlítás, 0 eltérő pixel). A DOM és a mentés változatlanságát célzott teszt is ellenőrzi.
- Böngészős menüteszt: 0 JavaScript hiba.

## Eltérések a koncepciótól

A fantázianeveket és kitalált világképeket az eredeti hat világ valódi nevei és grafikái váltották. Az alsó sáv világmódban a világokat, fejezetmódban a fejezeteket mutatja. Az indítás csak fejezetkiválasztás után érhető el; a két lépést a breadcrumb és egységes vizuális keret kapcsolja össze. A zárolások a kezdő fiók tényleges állapotát tükrözik.

## Fájllista

- index.html – desktop JS/CSS bekötés és egységes build-cache frissítés.
- src/cherrift_manifest.json – modul-, stílus- és felelősségregisztráció.
- src/cherrift_desktop_world.js – külön PC-s World/Chapter megjelenítés.
- assets/cherrift_desktop_world.css – desktop stílusok és animációk.
- assets/ui/world/gallery-frame-pc.webp – új átlátszó kristálykeret.
- tools/desktop_world.test.mjs – 9 célzott regressziós teszt.
- package.json, .github/workflows/ci.yml – tesztbekötés.
- docs/PC_WORLD_CHAPTER_REWORK.md, docs/pc-world-select/* – dokumentáció, prompt, képernyőképek, mobil összehasonlítás.

## Telepítés

A ZIP csak az alapverzióhoz képest változott/új fájlokat tartalmazza, közvetlenül a repository gyökeréhez igazított mappaszerkezettel. Kicsomagolás után egyesítsd a mappákat és írd felül az azonos nevű fájlokat. Nincs köztes files/ mappa. A korábbi menüreworkök már az alapverzió részei.

Ellenőrzés: npm ci, npm run test:desktop-world, npm run validate. Teljes ellenőrzés: npm test.
Automatikus élesítés és merge nem történt.

GitHub-átadás: a helyi ág és commit elkészült. A GitHub create-branch kérés 403 / Resource not accessible by integration hibát adott, ezért távoli ág és Pull Request nem jött létre. A ZIP tartalmazza az összes változtatást kézi feltöltéshez.
