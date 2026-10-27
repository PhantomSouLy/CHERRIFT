# World4 – Red Desert assetcsomag

Az elfogadott 2-es koncepció rétegzett szikláit és kőtornyait ötvözi az
1-es nyitottabb, klasszikus sivatagi környezetével. A képek a beépített
ImageGen eszközzel készültek, nem a régi grafikák átszínezésével.

## Tartalom

16 különálló, valódi alfaátlátszóságú tereptárgy: rétegzett sziklatömb,
kőtorony, természetes kőív, száraz fa, két oszlopkaktusz, fügekaktusz,
gömbkaktusz, nagy szikla, sziklapár, lapos kő, száraz bokor, fűcsomó,
csontok, kidőlt fatörzs és kavicsok. Külön visszafogott talajtextúra és
16:9 körüli pályaválasztó-kép is tartozik hozzá.

| Export | Low | Medium | High |
|---|---:|---:|---:|
| Talaj | 192×192 | 384×384 | 768×768 |
| Nagy tárgyak maximális oldala | 128 | 192 | 320 |
| Közepes tárgyak maximális oldala | 64 | 128 | 256 |
| Apró dekoráció maximális oldala | 32 | 64 | 128 |
| Pályakép befoglaló mérete | 640×360 | 1280×720 | 1920×1080 |

Az export arányt tart és nem nagyít a forrás natív felbontása fölé.
A források teljes egészükben megmaradnak. Az exportáló csak elkülöníti a
sziluetteket, eltávolítja a levált alfa-zajt, átlátszó szegélyt ad és méretez.
Az objektumok veszteségmentes RGBA WebP-k; a talaj és a pályakép RGB WebP.

## Fájlok és telepítés

A ZIP tartalmát a CHERRIFT gyökerébe másold, megtartva a mappaszerkezetet:

- `assets/map/world4/red-desert/`: a három minőségi készlet, méretek és katalógus.
- `docs/world4-sources/`: generált masterképek, választott koncepciók, promptok és előnézet.
- `tools/prepare_world4_art.py`: megismételhető export Pillow-val.
- `docs/WORLD4-ASSETS-HU.md`: ez a leírás.

Ez a World3 csomagjához hasonlóan **asset-előkészítés**. A meglévő World4
fájlok és a játék működése változatlan; az új készlet runtime-bekötése még
szükséges. A ZIP nem tartalmaz más világot, teljes repositoryt vagy titkokat.

## Bekötési adatok

A `dimensions.json` kanonikus vásznat, logikai méretet, talppontot és
javasolt ütközési lábnyomot ad. A `catalog.json` minőséghelyettesítős
útvonalakat tartalmaz. Azonos logikai geometriát kell használni mindhárom
minőségnél. A talaj logikai csempemérete 384; a World1/2 tükörismétlését
kell használni a varratok elkerüléséhez. A forrás nem periodikusan ellenőrzött
nyers seamless csempe; a tükrözés a szükséges illesztési eljárás.

A kőív két külön támaszának javasolt ütközése a `collisionParts` mezőben
szerepel. Az x relatív a logikai szélességhez, az y a talpponttól számított
eltolás. Ne helyettesítsd egyetlen nagy ütközési ellipszissel: a nyílás maradjon
átjárható. Minden ütközési adat javaslat, játékbeli ellenőrzést igényel.

Újraexport: `python tools/prepare_world4_art.py` a repository gyökeréből.
Ellenőrizve: mind a 48 tárgyexport valódi alfa, üres szélek, képarány,
három talajméret, összesen 55 WebP. A tárgyelőnézet vizuálisan ellenőrizve.
Az új grafikák játékbeli tesztje a runtime-bekötés után végezhető el.
