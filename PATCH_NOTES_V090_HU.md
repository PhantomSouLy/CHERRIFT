# CHERRIFT v0.9.0 — összefoglaló

Ez a csomag a v0.8.5–v0.9.0 közötti terveket hat, sorrendben betöltött patchben valósítja meg. A meglévő PC-s játékmenetet célzott kiegészítésekkel tartja meg, a mobilfelületet pedig egy végső, közös reszponzív réteggel stabilizálja.

## v0.8.5 — Combat Feel

- Rövid hit-stop, állítható screenshake és kritikus találat-visszajelzés.
- Külön damage/critical/poison színezés.
- Mozgási trail, pickup burst és aktív skill pulse.
- Sebességfüggő zoom-out, dash-kamera és finom look-ahead.
- Kizárólag rendereléskor alkalmazott bob/lean/squash; a hitbox és a világpozíció nem változik.
- Effektminőség, kamera mozgás, screenshake és combat sound beállítás.

## v0.8.6 — World 1 Remaster

- Pályánként változó, nem ütköző szirom-, lóhere-, lámpás- és shrine-dekoráció.
- Finom pályaszín-réteg és frissített raid warning.
- Mobilon automatikusan kisebb dekorációs sűrűség.

## v0.8.7 — Skin Identity

- Mage Cherry: 16 RGBA sheet, +5% HP recovery, staff orb ranged attack, öt célkövető gömbös Magical Shot.
- Archer Cherry: 16 RGBA sheet, +10% crit, íjlövés, tölcsér alakú Four Arrow Shot.
- Ha a Mage előtt egy ellenfél van, mind az öt gömb ugyanarra az ellenfélre áll rá.
- Az Archer saját irányonkénti attack és skill VFX sheetjei a runtime-ban is használatban vannak.
- Saját icon és splash art jelenik meg a gyűjteményben, a skinválasztóban és a navigációban.

## v0.8.8 — Enemy & Boss

- Ritka elite ellenfelek emelt HP/XP értékkel és külön aurával.
- Boss fázisváltás, jól látható területi telegráf és kitérhető pulse.
- Erősebb boss-, elite- és player-hit visszajelzés.

## v0.8.9 — Run & Loot

- Részletes run összegző: damage, crit, elite/boss, kulcs/láda és csúcsszint.
- A boss garantált kulcsot dob; elite ellenfélnél külön kulcsesély van.
- A pickup kulcs többé nem doboz emoji, hanem saját rajzolt kulcs.
- A korábbi hibás `assets/items/food` hivatkozások a tényleges `assets/items/buffs` fájlokra mutatnak.

## v0.9.0 — Night Bloom és mobil véglegesítés

- World 2 dinamikus, teljesítményhez igazított éjszakai fény/szirom atmoszféra.
- Egységes, öt gombos mobil alsó navigáció, duplikált Play nélkül.
- Álló és fekvő telefonos Gear, Settings, Skins, Collection, Gacha/BAG, World Select és harci HUD szabályok.
- A kiválasztott skin saját iconja jelenik meg a Cherry navigációban.
- Újdonságjelző piros pont a még nem megtekintett Mage/Archer skineknél.
- A loader a kiválasztott skin teljes aktuális animációkészletét előkészíti a menü feloldása előtt.
- Mobilon alacsonyabb render-scale plafon és effekt-darabszám; desktopon az eredeti minőség marad.

## Ellenőrzés

- JavaScript- és CSS-szintaxis, hiányzó assetek, duplikált HTML ID-k és patch-darabszám.
- 16-16 Mage/Archer sheet: 192 px cellák, négy irány, valódi alpha csatorna.
- Böngészős smoke: 1440×900, 390×844, 844×390 és visszatérő Discord-session.
- Mage/Archer passzív és skill lövedékszám, dinamikus kamera, World 1 dekoráció és boss ability timer.

## Arsenal / Gear slot hotfix

- A hét felszerelési hely most mindig teljes, zárt körben látszik Cherry körül:
  Sisak, Nyaklánc, Páncél, Kesztyű, Fegyver, Gyűrű és Csizma.
- Megszűnt a lefelé lépcsőző elrendezés, amely alacsony PC-ablaknál a panelen kívülre
  tolta a Fegyver, Gyűrű és Csizma slotot.
- Külön ellenőrzött rövid PC-nézet készült 1128×584 felbontásra, továbbá megmaradt
  az álló és fekvő telefonos reszponzív elrendezés.
