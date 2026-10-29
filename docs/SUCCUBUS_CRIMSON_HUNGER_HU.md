# Succubus Cherry — Crimson Hunger

Elfogadott referencia: 02 Crimson Hunger; build: `1028-succubus-crimson1`.

Négy új, valódi átlátszó RGBA-képet az Imagegen skill beépített generátora
készített a jóváhagyott referencia alapján. A külön karomhullám, közelharci
karomív és lélek mellett az effektlap szolgáltatja az örvényt, találatot,
visszatérő lélekszálat, pajzsot, lábnyomot és gyógyulási villanást. A képeket
Canvas forgatja, halványítja és méretezi; nincsenek beégetve a karakterbe.

- Ranged: egyetlen előrefelé irányított karomhullám.
- Melee: mindkét meglévő találati fázishoz illeszkedő karomív és találatjel.
- Soul Drain: Cherry mögötti, nyitott közepű örvény és az eredeti célkövető
  léleklövedékek, amelyek külön képet kaptak.
- Lifesteal: vékony, ellenségtől a játékos felé mutató csík; csak tényleges
  gyógyulás vagy pajzsnövekedés esetén jelenik meg.
- Shield: rövid áttetsző, nyitott közepű pajzs a sprite mögött; a régi Succubus
  sprite-rajzolóba ágyazott pajzskép helyett.
- Walk: rövid életű, távolsághoz kötött karmolásnyomok; nincs állóhelyzetben,
  falnak futva vagy szünet alatt új nyom. Low módban kevesebb lábnyom.

A korábbi Base Cherry effektmodulja a repóban létezett, de a Ninja-csomag
indexének átvételekor kimaradt a betöltése. A scriptet az indexben és a
manifestben visszakapcsoltuk. A Ninja scriptje is aktív marad. Az összes
first-party cache-query és a manifest build ID azonos.

A meglévő sebzés, közelharci két fázis, sebzési időzítés, passzív, célkövetés,
gyógyítás, pajzs mértéke és cooldown változatlan; az új réteg kizárólag
megjelenítéssel foglalkozik. Az aktuális játékban 6–10 skill-lélek keletkezik
a célpontok számától függően. A régi, más helyeken még használt fájlok
megmaradnak; Succubus aktív rajzolója az új effekteket használja.

Ellenőrzés: `npm run test:succubus-chibi`, `npm run test:base-cherry`,
`npm run test:ninja-chibi`, `npm run test:cherry-motion`, `npm run validate`.
A ZIP egy statikus, a valós sprite-okkal és effektképekkel renderelt előnézetet
is tartalmaz; az animáció és mobilterhelés további játékbeli próbát igényel.

GitHub-feltöltés nem történt. A patch az alábbi kiinduló commithoz készült:
`a82ea0e383f31f835404ca0919f195ede9be3e30`. Supabase-módosítás nem szükséges.


## Négy közelharci grafika — 1029-succubus-melee4

Az eredeti kaszáló ív mellé három új Imagegen RGBA PNG készült:
`melee_cross.png`, `melee_rising.png`, `melee_descending.png`.
A sprite és a két tényleges találati fázis változatlan.

A kozmetikai képkiválasztás négyes kevert készletből dolgozik. Mind a négy
forma megjelenik minden négy új vágásban, közvetlen ismétlés nélkül, a négyes
csoportok határán is. Egy adott effekt objektuma végig ugyanazt a képet
használja. A kiválasztás önálló PRNG-t használ, nem fogyasztja a sebzés vagy
crit számításához használt Math.random sorozatát, és a régi effect.variant
értéket sem módosítja. A képek követik a támadás irányát.

Frissítés a már telepített Crimson Hunger csomaghoz. Az új fájlok mellé az
index/manifest cache-azonosítója és az effektmodul is frissül.
Ellenőrzés: 17 Succubus-teszt és forrásvalidáció; statikus runtime-előnézet.
