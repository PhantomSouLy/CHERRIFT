# CHERRIFT – PC Collection / Rift Galéria

A kiválasztott 2. koncepció PC-s megvalósítása a Mail rework után. Alap: 1010-crystal-mail; új build: 1011-rift-collection.

## Felület

Sötét kristálycsarnok, rózsaszín–lila és cián fények; bal oldali kategóriák, középen görgethető gyűjteményrács, jobb oldali karakter- vagy bejegyzésbemutató. Összes / Megszerzett / Zárolt szűrők; a skineknél és felszereléseknél a tényleges ritkaságok szerinti szűrés. A számláló a teljes kategória megszerzett bejegyzéseit mutatja, szűréstől függetlenül. Világoknál a teljesített és folyamatban lévő kategóriák használhatók.

A koncepció fiktív karakterei helyett a játék meglévő, saját karaktergrafikái jelennek meg. A kártyák kiválasztása a jobb oldali bemutatót frissíti; az Előnézet gomb az eredeti részletes Collection-ablakot nyitja meg. A zárolt skinek és fel nem fedezett ellenfelek továbbra is letiltott natív gombok: az új felület nem old fel és nem szerel fel semmit. A különálló eredeti Cherry választó marad a felszerelés helye.

A jelenlegi Collection mind a négy kategóriája megmarad: skinek, felszerelések, ellenfelek és világok. A felszereléseknél a megszerzett tárgyak, a világoknál a meglévő pálya- és csillaghaladás jelenik meg; ezekhez a korábbi rendszer sem tartalmazott részletes előnézeti ablakot. A koncepció mesterséges harcos/mágus osztályait és nem létező képességeit nem vezettük be.

## Kapcsolat a meglévő rendszerrel

Az új modul az eredeti libraryV0551 panel, natív kategóriagombok és collection-card-v084 kártyák megjelenését egészíti ki. A natív kártyák és eseménykezelők megmaradnak. PC-n a kártyakattintás csak kijelöl; az Előnézet az eredeti natív kártyaműveletet futtatja. A kiegészítés nem ír mentést, nem hív adatbázist és nem módosít tulajdonjogot, jutalmat vagy játékoshaladást.

Billentyűzet: a nyílbillentyűk, Home és End a látható, elérhető kártyák között navigálnak. A zárolt kártyák kimaradnak. Az előnézet fókuszt kap, Tab-kezelést és Escape-bezárást támogat. Bezárás után a fókusz visszatér a galériára; a galériában az Escape a főmenübe vezet. A csökkentett mozgás és a játék meglévő hoverhang-beállítása támogatott.

## Mobil

821 px alatt, illetve alacsony érintős kijelzőn a modul nem alakítja át a felületet. PC-ről mobilra váltva eltávolítja saját elemeit és visszaállítja az ideiglenes attribútumokat. A már nyitott natív előnézet megmarad. A közös mobilos CSS és a natív Collection, tulajdonjog- és mentéskezelés forrása változatlan.

## Ellenőrzés és képernyőképek

12 célzott regressziós teszt: mobil, állapot változatlansága, valós gyűjteményadatok, kezdőkategória, natív előnézet, zárolások, szűrés, négy kategória, újrarenderelés, fókusz és Escape, mobilra váltás, billentyűzet és nyelvváltás.

Valódi böngészős próba vendégindítással öt PC-s méretben: 1024×768, 1280×720, 1366×768, 1920×1080, 2560×1440. Továbbá natív részletes nézet, mind a négy kategória, zárolások, szűrés, fókusz, 390×844 mobil és főmenübe visszatérés. Nincs böngészős futási hiba vagy hiányzó erőforrás.

A játékosadatok ellenőrzése az automatikusan változó mentési időbélyeg és energiaóra kivételével történt; a valódi tulajdonjog, pénznemek, tárgyak és haladás változatlanok maradtak. A célzott modulpróbák a teljes mentés változatlanságát is ellenőrzik kontrollált környezetben.

A rework a repository része. Az aktuális indítási és ellenőrzési lépések a [README-ben](../README.md), a tisztítás és a teszteredmények a [cleanup-jelentésben](../REPO_CLEANUP_AUDIT_HU.md) találhatók.

## Fájlok és telepítés

Új modul: src/cherrift_desktop_collection.js; stílus: assets/cherrift_desktop_collection.css; háttér: assets/ui/collection/rift-gallery-pc.webp; tesztek: tools/desktop_collection.test.mjs. Az index.html, a manifest, a package.json és a CI betölti és ellenőrzi az új modult. A kristálycsarnok beépített imagegen eszközzel készült; a teljes leírás a docs/pc-collection/IMAGE_PROMPT.txt fájlban található. A karakterképek a meglévő játékból származnak.

A rework a repository része. Az aktuális indítási és ellenőrzési lépések a [README-ben](../README.md), a tisztítás és a teszteredmények a [cleanup-jelentésben](../REPO_CLEANUP_AUDIT_HU.md) találhatók.

A munka külön helyi munkapéldányban készült. GitHub-feltöltés, PR, merge és élesítés nem történt.
