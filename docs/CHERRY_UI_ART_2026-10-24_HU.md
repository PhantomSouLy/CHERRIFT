# Cherry UI képek – részletes átadás

Dátum: 2026. október 24.
Projekt: `C:\Users\phant\Documents\GitHub\CHERRIFT`

## Elkészült képcsomag

A megadott mappa mind a 40 PNG-jéből elkészült a WebP változat. Mind a tíz skinhez külön, az eredeti splash artból kivágott, arcközeli ikon és kis kártyaelőnézet is készült. Az ikonok nem újrarajzolt képek: az eredeti karakterábrázolást őrzik.

Az eredeti 40 kép összesen **92 165 292 bájt**. A teljes futás közbeni csomag a hozzáadott ikonokkal és előnézetekkel együtt **8 600 544 bájt**, azaz **90,67%-kal kisebb**. Ez a teljes csomag összehasonlítása, nem egy képernyő kötelező letöltési mérete.

| Típus | Darab | Legnagyobb oldal | Fájlméret |
|---|---:|---:|---:|
| Splash art | 20 | legfeljebb 1280 px | 112–317 KB |
| Átlátszó karakter | 20 | legfeljebb 1024 px | 90–237 KB |
| Arcközeli ikon | 10 | 256 × 256 px | 14–24 KB |
| Kártyaelőnézet | 10 | legfeljebb 384 px | 27–42 KB |

A méretek tizedes KB/MB értékek. A splash artok és a karakterképek aránya megmaradt. A részletgazdag képeknél a konverter a minőség és szükség esetén a felbontás igazításával tartja a méretkeretet. A WebP tömörítés veszteséges; az átlátszó háttér megmaradt.

## Érintett skinek

- Base Cherry
- Archer Cherry
- Beastclaw Cherry
- Fairy Cherry
- Gunner Cherry
- Mage Cherry
- Ninja Cherry
- Sakura Dance Cherry
- Succubus Cherry
- Warrior Cherry

Mindegyiknél az 1-es splash art az alapértelmezett. A 2-es splash art és a két átlátszó változat is elkészült. A második változatok elérhetők a közös képleírásban későbbi felhasználásra; nem került be új variánsválasztó.

A Cake Delivery, Kimono, Pajama, School Uniform és Sport Cherry a meglévő képeit használja, mert ezekhez nem érkezett új képanyag.

## Hol jelennek meg az új képek?

- A skinek alapadataiban és a korábbi UI-felülírásokban az új WebP ikonok és splash artok szerepelnek. Ez biztosítja, hogy a közös skinadatokból dolgozó felületek is az új képeket kapják.
- Az asztali skinválasztó nagy karaktermegjelenítésében minden új képpel rendelkező skin a saját átlátszó karakterképét használja.
- Az asztali skinválasztó kártyái külön kis előnézetet töltenek, késleltetett betöltéssel. Egy kártyához nem szükséges a teljes méretű splash artot letölteni.
- Az asztali felszerelésképernyő a kiválasztott Cherry saját átlátszó képét használja.
- A gyűjtemény skinrészleteinél szintén az adott Cherry átlátszó képe jelenik meg; más gyűjteménykategóriák képhasználata változatlan.
- A profil alapértelmezett avatárja arcközeli Base Cherry ikon lett.
- A Mage Cherry korábbi kivételét megszüntettem: ő is megkapta az új képeket.
- A skinválasztó hibás átlátszókép-betöltés esetén splash artra vált. A régi képpel rendelkező skinek megtartják a saját képüket.

## Sakura Dance Cherry átnevezés

A korábbi **Wuxia Sakura Cherry** megjelenített neve **Sakura Dance Cherry** lett. A név frissült az alapadatokban, a magyar és angol felületszövegekben, a helyi szerverkatalógusban és a skin leírófájljában.

A belső azonosító továbbra is `wuxia_sakura_cherry`. Ez szándékos: a mentések, feloldások és animációhivatkozások így továbbra is ugyanahhoz a skinhez tartoznak. A harci sprite sheetek és animációk nem változtak.

## Fájlok és újraépítés

A játék által használt új képek:

`assets/ui/skins/cherry_ui_skins/optimized/`

Példák:

- `base_cherry_1.webp`
- `base_cherry_2.webp`
- `base_cherry_transp_1.webp`
- `base_cherry_transp_2.webp`
- `base_cherry_icon_1.webp`
- `base_cherry_thumb_1.webp`

A többi skin ugyanezt a névsémát követi. A Sakura Dance képek előtagja `sakura_dancer_cherry`. A Warrior eredeti `trans` elnevezése a generált fájloknál egységesen `transp` lett.

A mappa `manifest.json` fájlja tartalmazza minden kép pontos méretét, felbontását, tömörítési minőségét, forrását és a forrás SHA-256 ellenőrzőösszegét. Az ikonok kivágási koordinátái is szerepelnek benne.

Az újraépítő eszköz: `tools/prepare_cherry_ui_art.py`. Pillow szükséges hozzá. A projekt gyökeréből:

```text
python tools/prepare_cherry_ui_art.py
```

A célzott képtesztek:

```text
npm run test:cherry-art
```

Az eredeti PNG-ket meghagytam forrásnak, és ellenőriztem, hogy változatlanok. A futó UI az új képekhez WebP útvonalakat használ; az eredeti forrásmappa lemezfoglalása emiatt nem csökkent. A böngésző gyorsítótár-verziója egységesen `1024-cherry-webp` lett.

## Ellenőrzések

- **60/60 WebP** sikeresen visszaolvasható; a fájlméretek és felbontások egyeznek a manifesttel.
- **20/20 átlátszó kép** megőrizte az alfa csatornáját és az átlátszó pixeleit.
- A források ellenőrzőösszege egyezik: az eredeti PNG-k nem módosultak.
- Az ikonokat vizuálisan is átnéztem; az összesített előnézet mellékelve van.
- A szintaxis-, CSS- és képhivatkozás-ellenőrzés sikeres.
- Az új képtesztek és a skinválasztó, felszerelés, gyűjtemény célzott tesztjei: **29/29 sikeres**.
- A teljes asztali tesztkör az akkori állapotban **140/142 sikeres** volt. A két hiba a változatlan küldetés- és social-tesztben jelentkezik: `3,500` és `1,500` szöveget várnak, míg a magyar alapértelmezett számformázás `3500` és `1500` eredményt ad. Az érintett két megjelenítő forrását és tesztjét nem módosítottam.
- A játékadat-integritási, online API- és Gunner-tesztek: **40/40 sikeres**.
- Az auth-zárolás/időkorlát ellenőrzése sikeres.
- A közvetlen asztali indulási teszt **1440 × 900** felbontáson sikeres, beleértve az asztali képernyők bejárását.
- A közvetlen mobilos indulási teszt **390 × 844** felbontáson sikeres.
- A teljes, kilenc esetre szánt smoke futás az első asztali esetnél elérte a 120 másodperces korlátot; emiatt ez a teljes futás nem tekinthető sikeresnek. A külön futtatott asztali és mobilos eset viszont sikeres.
- A fájlaudit az új fájlokat is tartalmazó ideiglenes Git-jegyzékkel **0 hiányzó aktív futásidejű hivatkozást** jelzett. A teljes audit négy, a környezetből hiányzó Python `yaml` modul miatti ellenőrzési hibával maradt; ezek meglévő GitHub YAML fájlokhoz tartoznak.
- A módosítások szóköz- és sorvége-ellenőrzése sikeres.

A képcsomag méretcsökkenése mérhető; tényleges játékmeneti FPS- és GPU-memóriamérés nem készült. A módosítások helyben vannak a CHERRIFT projektben; nem történt commit, push vagy éles telepítés.
