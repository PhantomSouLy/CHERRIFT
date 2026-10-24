# CHERRIFT – PC Shop / Blossom Emporium

A kiválasztott 3. Shop-koncepció PC-s megvalósítása. Alap: 1011-rift-collection; új build: 1012-blossom-shop.

## Felület

Sakurás, holdfényes kristálycsarnok; sötét üvegű, íves kirakatkártyák, rózsaszín vásárlási gombok és felül az aktuális pénznemek. A ládák három nagy kirakatban jelennek meg. A többi kategória ugyanebben a háromoszlopos, függőlegesen görgethető kínálatban működik.

A bal oldali kategóriasáv önállóan görgethető, és a natív kategóriagombokat használja. A lista később bővíthető anélkül, hogy a teljes boltfelületet eltolná. Nyíl fel/le, Home és End billentyűkkel is bejárható. Kategóriaváltás után a fókusz visszatér a kiválasztott kategóriára.

A jelenlegi tényleges kategóriák: ládák, Essence Shop, ételek/buffok. Az árakat, termékeket, tulajdonjogot és vásárlási jogosultságokat továbbra is a meglévő boltrendszer határozza meg. A látványterv fiktív csomagjait, akcióit, visszaszámlálását és áraiból semmit nem vezettünk be.

## Natív működés

Az új modul a #chests shop útvonalán díszíti az eredeti shop-catalog-v098 panelt. Az eredeti termékkártyák, vásárlási gombok, disabled állapotok, adat-attribútumok és eseménykezelők megmaradnak. A PC-s modul nem hív API-t, nem ír mentést és nem hajt végre vásárlást. A meglévő online ellenőrzések változatlanul működnek.

A termékre kattintva az eredeti részletes ablak nyílik meg. A PC-s kiegészítés dialógusszerepet, fókuszkezelést és Tab-korlátozást ad neki. Escape először a részleteket zárja be, és visszaadja a fókuszt a terméknek; a boltból Escape vagy Főmenü gomb visz vissza a lobbyba. A megjelenés a meglévő magyar/angol nyelvválasztást követi, a rendszer csökkentett mozgás beállítását támogatja.

## Képek

Új kép: assets/ui/shop/blossom-emporium-pc.webp. Beépített imagegen eszközzel készült, felirat és UI nélkül, ezért a gombok és szövegek valódi HTML-elemek maradnak. A ládák a már meglévő Gacha-rework Common/Rare/Epic grafikáit használják; skinek és ételek a natív termékgrafikákat. Generálási leírás: docs/pc-shop/IMAGE_PROMPT.txt.

## Csak PC

821 CSS-pixeltől aktív, az eddigi desktop felismerést használva. Alacsony érintős kijelzőn – például fekvő telefonon – nem aktiválódik. Mobilra váltáskor eltávolítja saját elemeit és ideiglenes attribútumait; az eredeti termékablak megmarad. A közös mobilos stílus és az eredeti shop forrása nem módosult.

## Ellenőrzés

Hét célzott regressziós teszt ellenőrzi a mobil érintetlenségét, natív DOM-elemek megőrzését, egyetlen vásárlási eseményt, tiltott termékeket, kategóriaváltás utáni fókuszt, a részletes ablakot és Escape-et, valamint a visszaállítást és nyelvváltást.

Valódi Chromium-böngészős vendégpróba: 1920×1080, 2560×1440, 1366×768, 1280×720 és 1024×768. Ellenőrzött mindhárom kategória, natív termékrészletek, fókusz és Escape, ideiglenesen kibővített kategóriasáv görgetése, pénznemek/tárgyak/tulajdonjog változatlansága és 390×844 mobilra visszaváltás. Külön 844×390 érintős, fekvő mobilpróba is sikeres. Az ideiglenes kategóriák csak a teszt böngészőmemóriájában szerepelnek.

A rework a repository része. Az aktuális indítási és ellenőrzési lépések a [README-ben](../README.md), a tisztítás és a teszteredmények a [cleanup-jelentésben](../REPO_CLEANUP_AUDIT_HU.md) találhatók.

## Telepítés

A rework a repository része. Az aktuális indítási és ellenőrzési lépések a [README-ben](../README.md), a tisztítás és a teszteredmények a [cleanup-jelentésben](../REPO_CLEANUP_AUDIT_HU.md) találhatók.

Új modul: src/cherrift_desktop_shop.js; új stílus: assets/cherrift_desktop_shop.css. Az index.html és a manifest betölti a modult; a package.json és a CI tartalmazza a célzott tesztet. Az összes first-party belépőhivatkozás egyetlen új buildazonosítót használ.

A munka helyi munkapéldányban készült; GitHub-feltöltés és élesítés nem történt.
