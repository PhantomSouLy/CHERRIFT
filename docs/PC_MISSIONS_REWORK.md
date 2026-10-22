# CHERRIFT – PC Missions / Blossom Expedition

A kiválasztott 3. koncepció PC-s megvalósítása. Alap: 1012-blossom-shop (main: 7dc2ee5a1a26b69417c8fa255ed6b212ae793adc); új build: 1013-blossom-missions.

## Elrendezés

Bal oldalon a görgethető küldetéslista, felül Napi / Heti fülekkel; jobb oldalon a nagy bónuszjutalom-kirakat, kör alakú haladásjelzővel és a tényleges jutalmakkal. Holdfényes, sakurás kristálypalota-háttér, sötét üvegfelületek, rózsaszín gombok és diszkrét arany-rózsaszín keretek. Az új háttér beépített imagegen eszközzel készült; a Common/Rare ládagrafikák a meglévő Gacha-reworkből származnak.

A játék valódi tartalma marad: öt napi és három heti cél. A látványterv négy példafeladatát, értékeit és jutalmait nem vezettük be.

## Natív adatok és műveletek

Az eredeti dailyQuests és weeklyV082 panelek, célok, haladásjelzők, műveletgombok és eseménykezelők maradnak. Az új modul csak megjelenítést ad; nem ír mentést, nem hív API-t és nem hajt végre jutalmazást.

Napi nézet: egyenkénti átvétel, eredeti Összes átvétele és újrasorsolás. A sorok jutalomikonjai a save.daily.quests tényleges reward adatait használják. A bónuszhoz az összes napi jutalmat át kell venni; a kör az átvett jutalmak számát mutatja. Napi bónusz: 500 Coin, 1 Common Chest, 15 Energy.

Heti nézet: a három natív cél (5 menet, 3 pályateljesítés, 300 ellenfél) egy közös jutalmat old fel. A kör a teljesített célokat mutatja. Nincs kitalált célonkénti heti jutalom vagy külön heti Claim All. Heti bónusz: 3500 Coin, 20 Bloom Gem, 1 Rare Chest, 1 normál energiaital. A napi/heti bónusz megjelenített tartalma a jelenlegi natív rendererrel és a repó szerveroldali gameplay.mjs jutalmaival egyezik.

A meglévő disabled állapotokat a modul nem oldja fel. Az online fiókkövetelményt és a szerveroldali ellenőrzéseket az eredeti rendszer kezeli. Vendégként a menü előnézhető, jutalmazás nem történik.

## Kezelés és mobil

A Napi / Heti fülek a meglévő UI.open útvonalait használják. Váltás után a fókusz a megfelelő fülre kerül; bal/jobb nyíl, Home és End a fülek között vált. Escape vagy Főmenü az eredeti Vissza gomb műveletével tér vissza a lobbyba. A heti fülről kilépés is ezt a natív bezárást futtatja. Ha egy régebbi navigációs eseménykezelő elfogja a Vissza kattintást, a kiegészítés bezárja a távozó heti panelt, így az átméretezés után sem marad a főmenü felett. A natív heti megnyitás ismét rendesen megnyitja. Nyitott natív dialógusnál az eredeti billentyűkezelés marad érvényben. A haladásjelzők hozzáférhető számszerű értékeket kapnak. A hozzáadott szövegek követik a magyar/angol beállítást, a megjelenés figyelembe veszi a rendszer csökkentett mozgás opcióját.

Kizárólag PC-n, 821 CSS-pixeltől és megfelelő magasságú érintős kijelzőn aktív, az eddigi desktop felismeréssel. Mobilra váltva minden hozzáadott elem és ideiglenes attribútum eltűnik, a natív szövegek és markup megmaradnak. A mobilos és eredeti küldetéskezelő forrást nem módosítottuk.

## Ellenőrzés

Tizenkét célzott regressziós teszt: mobil, natív napi csomópontok és tényleges jutalomadatok, egyszeri átvétel, eredeti Claim All/újrasorsolás, heti útvonal és közös jutalom, online heti claimed állapot, pontos visszaállítás, újrarenderelés/nyelvváltás, billentyűzet/fókusz, rejtett és nyitott dialógusok, valamint heti natív bezárás átméretezés után.

Valódi Chromium vendégpróba: mindkét nézet 1920×1080, 2560×1440, 1366×768, 1280×720, 1024×768 és 844×700 méretben. Továbbá görgetés, fülek és billentyűzet, vendégjutalom blokkolása, változatlan pénznemek/tárgyak/tulajdonjog, 390×844 mobilra visszaváltás és lobbyba visszatérés. Külön 844×390 érintős kijelzőn is ellenőrzött a PC-modul inaktivitása és a hozzáadott elemek hiánya. Élő Discord-fiókos szerveres jutalomátvételt nem végeztünk. Részletes eredmények: TEST_RESULTS_MISSIONS.txt.

## Telepítés

A CHERRIFT-PC-Missions.zip csak új és módosult fájlokat tartalmaz a már telepített Shop-reworkre. Kibontás a projekt gyökerébe, mappák egyesítésével és egyező fájlok felülírásával. Nem teljes játékmásolat. Útmutató: TELEPITES-MISSIONS.txt.

Új modul: src/cherrift_desktop_missions.js. Új stílus: assets/cherrift_desktop_missions.css. Új háttér: assets/ui/missions/blossom-expedition-pc.webp. Az index, a manifest, a package.json és a CI tartalmazza a megfelelő betöltést és célzott tesztet.

A változtatás helyi munkapéldányban készült. GitHub-feltöltés, PR, merge és élesítés nem történt.
