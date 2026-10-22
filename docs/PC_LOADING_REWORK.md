# CHERRIFT – PC loading / Moonlit Journey

A kiválasztott 2. koncepció adaptációja az eredeti logóval és meglévő hátterekkel. Alap: main 0d26d6691ed21dea16ebc0004a05f47965375231. Új build: 1016-moonlit-loading.

## Felület

Az eredeti assets/ui/cherrift_logo.png bal felül, az illusztráció szabad területén jelenik meg, változatlan képaránnyal, finom árnyékkal. A boot megtartja a loading_pc_1920x1080.png képet, a pályabetöltő pedig saját meglévő ui/backgrounds/background.png hátterét. Egyik háttér és a logó képfájlját sem módosítottuk. Nem generáltunk új grafikát.

Alul sötét, áttetsző, rózsaszín-arany szegélyű vízszintes panel: balra az új futó Cherry és Loading..., jobbra a natív betöltősáv, állapotszöveg és indulásnál a meglévő százalék. A pályabetöltőben a pályanév is megmarad. Alul magyar/angol tipp. A belépési panel és a CLICK TO START az eredeti gombokat és működést használja, az új kompozícióhoz igazított helyen.

## Animáció

A felhasználó 1774×887 RGBA sheetje már a repó assets/ui/loading_sprite_sheet.png fájljában is megtalálható, bájtról bájtra azonos a most kapott képpel. Ezt a meglévő fájlt használjuk, új másolatot nem csomagolunk. Négy oszlop, két sor, nyolc képkocka: felső sor balról jobbra, majd alsó sor balról jobbra. CSS background-size:400% 200%, nyolc diszkrét background-position állás, 0,8 másodperces ciklus. A félpixeles forráscellákat nem vágtuk vagy nyújtottuk át, a böngésző arányosan jeleníti meg őket. A képfájl megegyezik a kapott forrással, a karaktert nem generáltuk újra.

A futást apró porcsík, hullámzó pontok, a valódi sávon végighaladó fény és tizenkét lassan sodródó fényrészecske kíséri. A logó és az alsó panel rövid belépőmozgást kap. A fontos elemek az animáció elején is legalább 80–85%-os fedettséggel láthatók, rövid töltésnél sem tűnnek el. Az indítógomb finom fénylüktetést kap, a belépőgombok hover és fókusz visszajelzést. Nincsenek új folyamatos JavaScript-időzítők vagy rajzolási ciklusok. A rejtett részecskék megállnak, a csökkentett mozgás opció letiltja az animációkat és a betöltősáv átmenetét.

PC-n az új sprite felülírja a korábbi loading-sprite megjelenítését. A régi általános Base Cherry walk assetet nem töröltük: a mobil és a játék más részei továbbra is használhatják.

## Működés

A src/cherrift_desktop_loading.js a headben állítja be a desktop jelölést, hogy az első boot képkocka is az új geometriát használja. Nem mozgatja vagy cseréli a natív DOM-csomópontokat. Két dekorációs réteget/tippet és hozzáférhető progressbar attribútumokat ad, amelyek a natív fill szélességét olvassák. A boot állapotgépe, Discord/Vendég/Start/Retry gombok, hibakezelés, pályabetöltés és felhőállapot változatlan marad. A modul nem kezdeményez fiókműveletet, nem ír mentést és nem indít pályát.

Nincs új, kitalált számláló vagy mesterséges várakozás. A boot százalékát az eredeti readiness logika kezeli. A pályabetöltősáv meglévő értékei a korábbi natív előkészítési fázisok jelzései, nem fájlletöltésből mért bájtszázalékok; nem adtunk melléjük új százalékfeliratot.

821 CSS-pixeltől aktív, kivéve a legfeljebb 600 px magas érintős fekvő kijelzőket. A desktop felismerés induláskor a főmenü moduljától függetlenül működik. Mobilra váltáskor a CSS-jelölő, hozzáadott elemek és ideiglenes attribútumok eltűnnek. A háttér, logó és natív mobil loading változatlan.

## Telepítés és ellenőrzés

Új CSS, JS és hat célzott teszt; a manifest, index, package.json és CI betölti/ellenőrzi a modult. Az index minden első félhez tartozó build-queryje egyezik a manifest 1016-moonlit-loading értékével. A ZIP csak az új és módosult fájlokat tartalmazza, a már telepített Achievements/Index fix verzióra másolandó. Részletek: TELEPITES-PC-LOADING.txt és TEST_RESULTS-PC-LOADING.txt.

GitHub-push, PR vagy élesítés nem történt. Új adatbázismigráció vagy szervertelepítés nincs. A képek és a forráskód a meglévő felhasználói projekthez tartoznak; a csomag nem teljes játékmásolat.
