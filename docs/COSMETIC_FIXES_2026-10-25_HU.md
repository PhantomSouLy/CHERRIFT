# CHERRIFT – képes hibajegyzék javításai, 2026. október 25.

A felhasználó 1–10. pontjának megvalósítása a helyi projektben. A változások
elsősorban a PC-s menükre vonatkoznak. A meglévő natív műveletek végzik továbbra
is a névváltást, a felszerelést, a levelek kezelését és a mentést.

## Megvalósított változtatások

1. **Loading:** a kitöltést az eredeti SVG-görbe részlete rajzolja, a sprite
   ugyanennek a görbének a végpontját követi. Ez megszünteti a széthúzott SVG és
   a nem skálázódó szaggatás eltérését. A kész / „Press any button” fázisban az
   egész csík eltűnik. A sprite talppontja a görbéhez igazodik.
   A loading réteg eltávolításának időzítése a menü renderelése előtt élesedik,
   így egy hibás menürenderelés sem hagyja a bemenetet blokkoló fedőréteget ott.
2. **Bloom Veterán értesítés:** a betöltéskori régi mérföldkövek csendesen
   szinkronizálódnak. Ugyanazt a feloldást egy később érkező régi mentés sem
   játssza újra a munkamenetben. Az értesítés lejáratkor ténylegesen elrejtődik,
   és a szövege is törlődik. Az eredmények és az átvehető jutalmak megmaradnak.
3. **Főmenü:** COLLECTION → GACHA; a gombok kis alcímei eltűnnek, a címek és a
   PLAY felirat középre igazodnak, visszafogottabb mérettel.
4. **Profil:** mind a 19 keret portrényílása külön megmérve és igazítva. A
   korrigált geometria a kis felső portrékon is érvényesül. Bal oldali sorrend:
   portré → title → név + ceruza → szint/skin → username → hangsúlyos XP-panel.
   Nincsenek belső görgetősávok a névnél és a két információs sornál. A statok
   saját sötét alapot és belső térközt kapnak. Az alsó első gomb Stat részletek;
   a névváltó a név melletti ceruzáról nyílik. A felső fülek díszített panelek.
5. **Cherry adatlap:** a fegyver és a skill neve világos, jobban olvasható, a
   kis alcímek és a külön „i” gombok eltűnnek. Kattintásra a vezérlő mellett
   kompakt panel nyílik; kívülre kattintva vagy Escape-pel bezárható. A skill
   panel a rendelkezésre álló cooldown értéket is mutatja. A ritkaság külön
   sorba kerül a skin neve alá.
6. **Settings / fejléc:** CHERRIFT OPTIONS és a felső Főmenü vezérlő elrejtve.
   Alul Vissza és Kész gomb. A profil és a pénznemek közös felső sávja a tartalom
   szélességéhez igazodik, így a profil nem marad elszigetelve a másik oldalon.
7. **Postafiók:** díszített szűrőfülek, egységes akciógombok és sötét,
   kereten belüli listafelület. A fehér fejléc háttere megszűnik.
8. **GEAR:** a sötét hátterek beljebb kerülnek a díszkeretekbe, az aktív slotok
   külön négyzetes, lekerekített, dupla szegélyű megjelenést kapnak. Az inventory
   kártyái megtartják a saját keretüket. A GEAR cím a jobb felszerelési oszlophoz
   kerül, a CELESTIAL ATELIER alcím eltűnik, a visszalépő látható hátteret kap.
   A felszerelés explicit mentésváltozási eseményt küld, így a GEAR-előnézet
   frissül. A hibás cutout betöltés a skin saját képére esik vissza.
9. **Resonance:** a skin neve melletti ikon kattintható, külön gombkeret nélkül.
   A panel nevet és leírást mutat; hiányzó leírásnál:
   „Leírás: – Majd bővítve lesz”. A rejtett régi skilldialogus szövege helyett
   elsőbbséget kapnak az aktuális skin adatai.
10. **Újrahasználható háttér:** külön tájkép és valódi alfa-csatornás kristályos
    előtér. A főmenüben csak a táj mozog egérre, a kristálydísz fix. A megoldást
    a profil, Settings, postafiók, skinek, GEAR és több további PC-s menü is
    használja. A világ-/fejezetválasztó sötét alapra teszi a kiválasztott map
    halvány képét és a kristálydíszt, a váras háttér nélkül.

A skinlistában egy kártya kiválasztása továbbra is **előnézet**. A GEAR a
**Felszerelés** művelettel ténylegesen felszerelt skint mutatja. A két állapotot
a regressziós teszt külön is ellenőrzi.

További kis javítás: a küldetésjutalmak és a közösségi profil számformázása a
játék nyelvét követi a Windows nyelve helyett.

## Háttércsere eventhez

Az alapképek:

- `assets/ui/backgrounds/crystal-landscape-pc.webp` – 1672×941, 439 334 bájt.
- `assets/ui/backgrounds/crystal-foreground-pc.webp` – 1672×941, alfa, 354 938 bájt.

Egy menün vagy a dokumentum gyökérelemén a `--cherrift-landscape` CSS-változó
`url(...)` értékével cserélhető a belső táj, a fix kristálydísz megtartásával.
A világválasztó a saját kiválasztott pályaképét használja.

## Ellenőrzés

- `npm run validate`: JavaScript/CSS szintaxis, manifest, cache buildazonosító,
  hivatkozott fájlok ellenőrzése.
- `npm run test:cosmetics`: új regressziós tesztek az achievement/toast,
  betöltőgörbe, 19 keret és a háromféle infópanel működésére.
- Meglévő desktop tesztek: a mobilra visszaállás, natív gombok, mentési adatok,
  zárolt állapotok és navigáció megőrzése.
- `tools/inspect_frame_geometry.py`: az eredeti képek megváltoztatása nélkül
  méri a középső portrényílásokat, és előállítja a geometriai CSS-t.
- Keretellenőrző kép: `docs/pc-polish/frame-alignment-after.jpg`.

Utolsó sikeres ellenőrzések:

| Ellenőrzés | Eredmény |
| --- | --- |
| Desktop tesztcsomag | 149 / 149 |
| Új kozmetikai regressziók | 5 / 5 |
| Loading / Start vezérlő | 9 / 9 |
| Recovery | 7 / 7 |
| Integritás | 45 / 45 |
| Helyi API-integráció | 1 / 1 |
| Gunner | 5 / 5 |
| Artwork | 3 / 3 |
| Menü audio | 8 / 8 |
| Auth-lock smoke | PASS |
| Szintaxis és aktív fájlhivatkozások | PASS |

A helyi API-teszthez a sandbox localhost-tiltása nélküli futtatás kellett.
A teljes fájlaudit Python-ellenőrzéséhez a hiányzó PyYAML a figyelmen kívül
hagyott `audit-output/python-deps` könyvtárba került; a futtatás
`CHERRIFT_PYTHON` és `PYTHONPATH` változókkal történt. Az audit 0 szintaxis- vagy
fájlszignatúra-hibát jelzett. Az audit csak a Git által már követett fájlokkal
számol, ezért a még nem stage-elt két új CSS-t tévesen hiányzóként sorolja fel;
a teljes fájlrendszert ellenőrző `validate` ezeket megtalálja és ellenőrzi.

A teljes indulási smoke **nem sikeres**: a desktop esetben a loading réteg
eltávolítására várva időtúllépés következett be. A diagnosztikában a játék
kész, a lobby aktív, a réteg `done` állapotú, és nincs jelentett futási hiba.
A célzott Start-tesztekben az eltávolítás működik, megállt animációs képkockák
és szinkron menürenderelési hiba mellett is. Ez a különbség további integrációs
vizsgálatot igényel; nem tekinthető a teljes indulási folyamat sikeres
ellenőrzésének. A diagnosztikai kimenet most a loading DOM-állapotát is rögzíti.
Az új két kozmetikai CSS nélkül végzett összehasonlító futás ugyanezen a lobby
átmeneten akadt el; a munkához indított elakadt próbafolyamatot leállítottam.

A valódi böngészőben végzett vizuális ellenőrzés **nem fejeződött be**:
a Computer Use nem tudta megbízhatóan azonosítani a Windows böngésző URL-jét,
és leállította a UI-vezérlést. A teljes menüelrendezés végső ellenőrzéséhez
szükséges a helyi játék megnyitása; a kontaktképes keretellenőrzés és az
automatizált DOM-/működési tesztek ezt nem helyettesítik.

## Későbbre hagyott, kifejezetten külön kért munkák

- Új reward popup.
- Rarity szerinti új keretek az alsó skinlistához.
- A külön bejelentendő funkcióellenőrzések.

## Képgenerálás

Beépített ImageGen eszköz, a projekt eredeti
`assets/ui/backgrounds/crystal-realm-pc.webp` képével mint szerkesztési céllal.
Az eredeti fájl megmaradt; a két új kép WebP-ként került a projektbe. A PNG
források a Codex generated_images mappájában is megmaradtak.

Végső prompt – átlátszó előtér:

> Edit target: attached CHERRIFT game background, 1672x941 widescreen. Create ONLY the foreground crystal crescent border as a reusable transparent PNG layer. Preserve placement/composition of the large ornate pink violet blue faceted crystal arch from top near x650 curving along x1000 at center to bottom and sweeping across bottom right. Keep the cherry blossom branches at upper left as foreground. Remove ALL castle, sky, moon, floating islands, bridges, landscape, courtyard and dark purple solid right backdrop: these should become genuinely transparent empty regions. No text, no UI, no added objects. Match exact existing painterly anime fantasy crystal style. Maintain widescreen full canvas matching reference, crystal boundary same position, right side empty transparent. This is a production game overlay asset.

Végső prompt – belső táj:

> Edit target attached CHERRIFT background. Create a CLEAN full widescreen landscape backdrop with same anime fantasy castle on floating islands, pink cherry trees, waterfalls, full moon, blue violet night sky and lower left palace terrace. Remove all foreground large faceted pink crystal crescent/arch border and remove cherry branches overlay at very top. Extend the natural fantasy landscape into those removed areas and across full canvas including right side. Preserve existing castle design and location at left x400, moon at x500 upper left, floating islands, ethereal lighting and color palette. Right side can be softer distant dark violet mountains and sky for UI legibility. No crystal arch, no foreground frame, no text, no logo, no character, no interface. Production 16:9 game background, matching reference composition; painting only.
