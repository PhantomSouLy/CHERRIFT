# CHERRIFT – PC Achievements / Sakura Trophy Gallery

A kiválasztott 2. koncepció megvalósítása. Alap: 1013-blossom-missions; új build: 1014-sakura-achievements. A Missions-csomag helyi alapként került be, így ez a ZIP csak az Achievements új és módosult fájljait tartalmazza.

## Felület

Holdfényes sakurapalota, sötét áttetsző trófeakártyák, generált arany/ezüst/bronz nyuszis sakuraérmek. A bal oldali kategórialista függőlegesen görgethető, nincs rögzített elemszámra szabva. A jelenlegi valódi kategóriák: Mind, Gold, Silver, Bronze. Későbbi új játékkategóriákhoz továbbra is a natív achievement-katalógust és renderert kell bővíteni; a megjelenés nem talál ki új célokat vagy kategóriákat.

A középső rács külön görgethető; kisebb PC-n két oszlopra vált. A kártyák a valódi címet, leírást, haladást és jutalmakat mutatják. Állapotszűrés: minden, átvehető, folyamatban, átvéve, még nem teljesített. A szűrés a natív kategóriával együtt működik és újrarenderelésnél megmarad. Alul összesített teljesítés és Összes átvétele található. A teljesítésbe az aktuálisan teljesített és a már korábban átvett eredmények is beleszámítanak.

## Adatok és jutalmazás

A modul a CHERRIFT_RUNTIME.achievements 26 meglévő definícióját és a fixAchievementsClaimed állapotot olvassa. A megjelenés nem ír játékosmentést, nem változtat jutalmakat, árakat vagy teljesítési feltételeket. A natív egyenkénti átvétel gombjai és eseménykezelői megmaradnak.

Az Összes átvétele a meglévő CHERRIFT_ONLINE.perform('claim_achievement', {achievement_id}) műveletet hívja sorban az összes átvehető eredményre, a kiválasztott kategóriától függetlenül. Nincs új tömeges szerverművelet vagy kliensoldali jutalmazás. A szerver az egyes célokat és az ismételt átvételt továbbra is ellenőrzi. A gomb a feldolgozás alatt letiltott, az aktuális haladást mutatja. Hiba, fiókváltás, kilépés vagy mobilra váltás után további kérés nem indul; a már elküldött kérés befejeződhet a meglévő fiókvédett rendszerben. Az addig sikeresen átvett jutalmak megmaradnak. Vendégként az eredeti natív online belépési korlát érvényesül. Offline újracsatlakozás esetén az eredeti egyenkénti műveletet kapja meg a rendszer; a teljes sorozatot ezután a gomb újbóli megnyomása indítja.

## PC és kezelés

A korábbi reworkök desktopfelismerését használja (821 CSS-pixeltől; rövid érintős fekvő kijelzőn inaktív). Mobilra váltva eltűnik minden hozzáadott elem és ideiglenes attribútum. Az eredeti mobilfelület és a natív adatok megmaradnak. A Főmenü és az Escape a natív visszalépést használja; nyitott dialógusnál a natív billentyűkezelésé az elsőbbség. A kategóriák között a fel/le nyíl, Home és End mozgatja a fókuszt. A hozzáadott szövegek magyar/angol nyelvűek, a natív célok szövege változatlan. Csökkentett mozgás és látható billentyűzetfókusz támogatott.

## Fájlok és telepítés

Új modul: src/cherrift_desktop_achievements.js. Új stílus: assets/cherrift_desktop_achievements.css. Új háttér és három átlátszó WebP-érem: assets/ui/achievements/. Az index, manifest, package.json és CI betölti/ellenőrzi az új modult. Generálási leírás: docs/pc-achievements/IMAGE_PROMPT.txt.

A ZIP a már telepített Missions 1013 verzióra másolandó, a projekt gyökerébe. Részletek: TELEPITES-ACHIEVEMENTS.txt. Tesztek és korlátok: TEST_RESULTS_ACHIEVEMENTS.txt. Élő Discord-fiókon nem történt jutalomátvétel. A változtatás helyben készült; GitHub-push és élesítés nem történt. Új szervertelepítés vagy adatbázismigráció nem szükséges.
