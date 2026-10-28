# Sakura Dance Cherry – Legendary

A jóváhagyott 2-es, Sziromtáncos koncepció alapján készült.

## Telepítés

A ZIP tartalmát másold a CHERRIFT projekt gyökerébe, azonos útvonalon felülírva a fájlokat. Ez kiegészítő csomag a meglévő projekthez, nem önálló játék. A jelenlegi, Succubus lábjavítást tartalmazó projektből indult.

A skin belső azonosítója továbbra is `wuxia_sakura_cherry`: a mentések, feloldások és a meglévő Legendary képességek ehhez tartoznak. A megjelenített neve Sakura Dance Cherry.

## Animációk

- Alap idle: finom légzés és hajmozgás.
- Extra idle 2: rövid kardpörgetés.
- Extra idle 3: meghajlás és kézmozdulat.
- Járás, kétkardos támadás, járás közbeni támadás és Blossom Spin.
- 8 irány, 56 RGBA PNG képsor, 336 rajzolt képkocka. Minden sorban 6 képkocka található.

A két extra idle 4–8 másodperces véletlen szünetek után váltakozik, és visszatér az alap idle-be. Mozgás, támadás vagy skill azonnal megszakítja őket. A külön kozmetikai véletlenszám-sorozat nem fogyasztja a harci véletleneket.

A járás és a járás közbeni támadás váltott támaszlábat használ. A támadó felsőtest a meglévő támadás idejét követi, a lépésfázis pedig a tényleges megtett utat, ezért a támadás nem indítja újra a lábakat.

A kardoknak hagyott nagyobb képkockán belüli tér miatt a rajz technikai mérete kisebb; ezt közös, iránytól és mozdulattól független megjelenítési szorzó ellensúlyozza. A karakter látható magassága így egyezik a többi Cherryvel. A talppont fix: 96,184.

## Megőrzött képességek

Twin Sakura Jian közelharci támadás, Blossom Spin körsebzés, +5% mozgási és támadási sebesség, szirmok járás közben, tíz ölésenként -30% hátralévő skilltöltés. Az eredeti sebzés, hatótáv, töltési és cast-idő, ideiglenes gyorsulás és effektkészlet változatlan maradt.

## Előnézet és ellenőrzés

Az asset mappában található `preview.html` ugyanazt a lábkezelést használja, mint a játék. Mind a nyolc irány és hét animáció választható, szüneteltethető és képkockánként léptethető. A `preview.gif` négy irányt mutat, a `approved-concept-2.png` a választott koncepció.

`npm run test:sakura-dance`: 11 sikeres ellenőrzés. Az eredeti harci kód és a kozmetikai javítás összevetése kiterjed a sebzésre, a területre, a passzívra, a gyorsításokra, a cast-időkre, a szünetre és az idle-megszakításokra. Külön renderellenőrzés: mind a 336 járás/támadási felsőtest/lábfázis kombinációban egyező felsőtest és levágás nélküli támaszláb.

Élő PC/mobil játékteszt még szükséges. GitHubra ez a csomag nincs feltöltve.

Build: `1028-sakura-dance1`.
