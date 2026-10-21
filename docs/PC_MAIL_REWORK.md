# CHERRIFT – PC Kristályposta / Mail rework

A korábban kiválasztott sötét, kristálykeretes Kristályposta folytatása. A megszakadt munkamenetből visszanyert felületkód a helyi, 1009-crystal-profile alapra épül. Új build: 1010-crystal-mail.

## Megjelenés és működés

Bal oldalon az eredeti levéllista, jelölőnégyzetek és csoportos műveletek; jobb oldalon a kiválasztott levél. Összes / Olvasatlan / Jutalmak szűrők, kristálykeret, középső rózsaszín szalag, levélnyitási animáció és lebegő szirmok. A csökkentett mozgás és a meglévő hangbeállítások támogatottak.

A kiegészítés a meglévő natív DOM-elemeket és eseménykezelőket használja. Az olvasottnak jelölést, kijelölést, jutalomátvételt, törlést, online jogosultságokat és mentést továbbra is a cherrift_account_mail.js kezeli. A prezentációs modul nem ír mentést és nem hív szerver API-t. A levelek megnyitás nélkül nem lesznek olvasottak. A szűrés a megjelenést érinti; az eredeti összes kijelölése és csoportos műveletek a teljes postaládára vonatkoznak.

A hosszú levéltartalom és a jutalmak az olvasópanelen belül görgethetők. Escape bezárja a levelet és visszaadja a fókuszt a kijelölt sorra; újabb Escape visszatér a főmenübe. Nyitott jutalomablaknál az eredeti billentyűkezelés érvényesül.

## Folytatás közben javított hibák

- A body osztályának ismételt beállítása önmagát újraindító felületfrissítést okozhatott; az osztály csak változáskor módosul.
- A csukott jutalomablak visibility:hidden állapotát figyelembe veszi a billentyűkezelés, így nem blokkolja az Escape-et.
- A bezárt levél után a megfelelő sor kap fókuszt; a főmenübe visszatérés bezárja a natív levélablakot.
- A lecserélt natív sorok ideiglenes attribútumainak nyilvántartása felszabadul.
- A jutalomképek a projekt meglévő coin és blossom_gem assetjeit használják.

## Mobil és ellenőrzés

A módosítás kizárólag 821 px-től, megfelelő PC-s képernyőn aktív. Alacsony érintős kijelzőn nem épül fel. Mobilra átméretezve eltávolítja saját elemeit és visszaállítja az ideiglenes attribútumokat; egy már megnyitott natív levélablak megmarad. A közös mobilos CSS és az eredeti levelező forrása változatlan.

Kilenc célzott Mail-teszt ellenőrzi az állapot változatlanságát, a natív eseménykezelőket, a szűrőket, a jutalomgombokat, a fókuszt, a rejtett jutalomablakot, az újrarenderelést és a mobilra visszaváltást. Valódi böngészős próba vendégindítással, öt PC-s felbontáson: 1024×768, 1280×720, 1366×768, 1920×1080, 2560×1440; továbbá 390×844 mobil és főmenübe visszatérés. A Mail böngészős próbája futási hiba nélkül sikeres.

A docs/pc-mail képernyőképei helyi tesztleveleket mutatnak. Ezeket csak a böngészős teszt szúrja be, a szállított játékkódba nem kerülnek. Élő Discord-bejelentkezést és tényleges szerveres jutalomátvételt nem végeztünk. A teljes ellenőrzési eredmény a csomag TEST_RESULTS_MAIL.txt fájljában található.

## Telepítés

A CHERRIFT-PC-Mail.zip egy frissítőcsomag a már telepített Profil/Fiók reworkhöz. A projekt gyökerébe kell kibontani, az egyező fájlokat felülírva. Nem teljes játékmásolat. A telepítési útmutató TELEPITES-MAIL.txt néven található a ZIP gyökerében.

Módosított fájlok: index.html, package.json, src/cherrift_manifest.json, .github/workflows/ci.yml. Új fájlok: src/cherrift_desktop_mail.js, assets/cherrift_desktop_mail.css, assets/ui/mail/crystal-correspondence-pc.webp, tools/desktop_mail.test.mjs és a Mail dokumentáció.

A kristálykeret beépített imagegen eszközzel újrakészült, mert a korábbi generált kép a leállt távoli környezetben maradt. A teljes generálási leírás: docs/pc-mail/IMAGE_PROMPT.txt. A csomag önálló assetként tartalmazza a WebP fájlt.

Távoli feltöltés, PR, merge és élesítés nem történt. A változtatások külön helyi munkapéldányban készültek.
