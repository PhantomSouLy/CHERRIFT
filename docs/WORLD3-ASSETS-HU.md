# World3 – aranyló akáciás és baobabos szavanna

Új assetcsomag az elfogadott 1-es és 3-as koncepció kombinációjához.
Az illusztrációk a beépített image_gen eszközzel készültek, a World3 két
elfogadott koncepcióját stílus- és biomreferenciaként használva.

## Tartalom

- tree1 / tree2: két különböző ernyős lombkoronájú akácia.
- tree3: vastag törzsű baobab.
- bush1 / bush2 / deadBush: tüskés és száraz bokrok.
- rock1 / rock2 / rockSmall / pebbles: sziklák és kavicsok.
- log / stump: kidőlt fatörzs és tuskó.
- bones: dekoratív, vérmentes koponya és bordák.
- grass1 / grass2 / grass3: háromféle száraz fűcsomó.
- ground: ismételhető, visszafogott talajtextúra.
- splash: a két irányt ötvöző pályaválasztó-kép.

## Felbontások

| Típus | Low | Medium | High |
|---|---:|---:|---:|
| Talaj | 192×192 | 384×384 | 768×768 |
| Fák maximális oldala | 128 px | 192 px | 320 px |
| Bokrok, kövek, fatörzsek maximális oldala | 64 px | 128 px | 256 px |
| Fű, csontok, kavicsok maximális oldala | 32 px | 64 px | 128 px |
| Pályaválasztó-kép befoglaló mérete | 640×360 | 1280×720 | 1920×1080 |

A tárgyak és a pályakép méretarányt tartó exportot kapnak; a méretkorlát
nem jelent felnagyítást a generált forrás natív mérete fölé. Minden tárgy
valódi alfaátlátszóságú, veszteségmentes WebP. A talaj és a pályakép RGB WebP.

## Beépítéshez

Assetmappa: `assets/map/world3/savanna/low`, `medium`, `high`.
Közös pályakép-alias: `assets/map/world3/savanna/splash.webp`.
Forrásképek és promptok: `docs/world3-sources/`.

Az `assets/map/world3/savanna/dimensions.json` azonos kanonikus vásznat,
arányokat és javasolt logikai méreteket/talppontokat ad mindhárom szinthez.
A `catalog.json` a képek kulcsait, minőségi útvonalait és javasolt ütközési
lábnyomait tartalmazza. A beépítés során a logikai méreteket kell használni,
így a Low/Medium/High váltás nem változtatja a geometriai akadályokat.
A ground javasolt logikai csempemérete 384 játékegység, függetlenül a pixelektől.
A varratmentes használathoz a World1/World2 tükörismétlési eljárása ajánlott.

A csomag asseteket készít elő; a World3 runtime-bekötése és a végleges
ütközési talppontok játékbeli ellenőrzése külön következő lépés.

Újraexportálás: `python tools/prepare_world3_art.py` a projekt gyökeréből,
Pillow telepítésével. A script csak kivágást, átlátszó szegélyt és arányos
átméretezést végez; a képi tartalmat az image_gen készítette.
