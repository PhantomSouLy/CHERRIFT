# World1 – Napfényes rét

Build: `1025-world1-meadow-active`. Az elfogadott 1-es képkoncepcióból készült új
talaj és 16 új tereptárgy. A cseresznyevirágos 2-es irány későbbre marad.

## Bekötés a játékba

Az index a `cherrift_world1.js` modult a közös runtime előtt tölti be.
A közös runtime World1-en az új modul generátorát, talaj- és tárgyrajzolását,
ütközését és teljes pályarajzolását használja. A World/Chapter-választó és a
pályabetöltő új World1-borítót kapott. World2–6 megtartja a közös működését.

Minden indítás új, csak a futáshoz tartozó seedet kap; a pálya ugyanazon futás
alatt stabil. A középső kezdőterület és két kanyargó átjárósáv akadálymentes.
A fák törzse, a nagyobb kövek, rönkök és tuskók a játékost megállítják, az
ellenfelek változatlan közös AI-ja átjárhat rajtuk. A mobok kamerán kívül
jelennek meg. A dekoráció nem ütközik. A takaró lombkorona áttetszővé válik.

A pálya határán túl külön dekoratív tájsáv folytatja a füvet és a tereptárgyakat.
A sötétítés a határ előtt kezdődik és a külső tájra fut ki; nincs rózsaszín
határvonal vagy üres fekete hátterű fal. A játékos mozgáshatára változatlan.

## Low / Medium / High

A meglévő `effectQuality` beállítás neve a felületen „Grafikai minőség”.
World1-en a tényleges exportkészletet is kiválasztja. A talaj 192 / 384 / 768
pixeles; a különálló objektumok arányosan exportált, átlátszó WebP-k.
A talajcsempe világmérete mindig 384 egység, exportfelbontástól függetlenül.
A tükrözött 2×2 mintázat azonos élpixeleket illeszt össze.

Mindhárom szinten ugyanaz a geometria, seed, hitbox és akadályszám marad.
Csak az átjárható dekoráció mennyisége, a növényreakció és a render-DPR
(legfeljebb 1 / 1,25 / 1,5) változik. A képcsomag hozzávetőleg 139 / 376 / 1007 KiB.
A minőségváltás megvárja az új készletet, és megtartja az aktuális pályát.

A növényreakció a runtime végleges rajzolójára csatlakozik, így a korábbi
betöltési sorrend nem kerüli meg a dőlési animációt. Low módban World1-en
a növényreakció kikapcsol.

## Képek és újraexportálás

- `docs/world1-sources/`: elfogadott koncepció, generált masterképek és promptok.
- `assets/map/world1/meadow/`: a játékban használt három exportkészlet.
- `tools/prepare_world1_art.py`: a spritesheet mért cellahatáraiból kinyeri és
  arányosan méretezi a képeket; nem alakít át régi World1-grafikát.

Újraexportálás Pillow-val: `python tools/prepare_world1_art.py`.

## Ellenőrzés

`npm run test:world1`: 100 seed, összefüggő járható tér, kezdőterület,
akadálytávolságok, determinisztikus újraépítés, exportútvonalak, képarányok,
minőségváltási versenyhelyzetek és a növényreakció betöltési sorrendje.

A teljes alkalmazás indítási próbája a valódi CherriftGame prototípusán is
ellenőrzi az új mapgenerátort, ütközést, képbetöltést, rajzolást és a köveken
áthaladó ellenfeleket. A vendégmód online indítási tilalma megmarad.

Helyi vizuális ellenőrzéshez szolgáld ki a repositoryt HTTP-n, majd nyisd meg
a `world1-preview.html` oldalt. Ugyanazt a World1-generátort és renderelőt
használja, WASD/érintés, minőségváltás, új seed, pályaszél és mobkapcsoló
segíti a vizsgálatot. Ez az oldal nem indít jutalmazott játékot és nem módosít
fiókot. A teljes játék továbbra is az `index.html` címen indul.
