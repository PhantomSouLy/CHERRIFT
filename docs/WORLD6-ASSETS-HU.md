# World6 – Dark Ruins assetcsomag

Az elfogadott 1-es romudvar néhány extra lila kristállyal. Elsődleges elemek:
törött oszlopok, szobrok és rúnakövek; a kristályok visszafogott kiegészítők.
Az illusztrációk a beépített ImageGen eszközzel készültek a választott kép alapján.

## Tartalom

16 külön RGBA tereptárgy: két törött oszlop, két eltérő őrszobor, rúnakő,
közepes és kisebb kristálycsoport, száraz fa, nagy szikla, sziklapár,
alacsony falmaradvány, kidőlt oszlop, csontok, száraz bokor, törmelék és
apró kristálycsoport. Külön kőtalaj és végleges pályaválasztó-kép.

| Típus | Low | Medium | High |
|---|---:|---:|---:|
| Talaj | 192×192 | 384×384 | 768×768 |
| Oszlopok, szobrok, fa max. oldala | 128 | 192 | 320 |
| Közepes tárgyak max. oldala | 64 | 128 | 256 |
| Apró dekoráció max. oldala | 32 | 64 | 128 |
| Pályakép befoglaló mérete | 640×360 | 1280×720 | 1920×1080 |

Aránytartó export, a forrás natív mérete fölé nagyítás nélkül. Objektumok:
veszteségmentes RGBA WebP. Talaj és pályakép: RGB WebP. Mindhárom szint
azonos logikai méreteket és talppontokat használ. A források megmaradnak;
az export csak kivágást, levált alfa-zaj eltávolítását, szegélyezést és méretezést végez.

## Telepítés

A ZIP tartalmát a CHERRIFT gyökerébe másold a mappaszerkezet megtartásával:

- `assets/map/world6/ruins/`: low/medium/high, splash-alias, méretek és katalógus.
- `docs/world6-sources/`: masterképek, választott koncepció, promptok és előnézet.
- `tools/prepare_world6_art.py`: megismételhető exportáló, Pillow szükséges.
- `docs/WORLD6-ASSETS-HU.md`: ez a leírás.

Csak új World6 fájlok vannak a csomagban. **Runtime-bekötés még nem történt**;
a jelenlegi játék és a régi assetek változatlanok. A World3–5 csomagokhoz
hasonlóan ez előkészített grafikai készlet, nem automatikusan aktív pálya.

Újraexport: `python tools/prepare_world6_art.py` a repository gyökeréből.
A script memóriában kódol és ellenőriz, majd teljes fájlt ír ki atomikus cserével.

## Bekötéshez

A dimensions.json kanonikus vásznat, logikai méretet, talppontot és javasolt
elliptikus ütközési lábnyomot ad; a catalog.json minőséghelyettesítős
útvonalakat tartalmaz. Azonos geometria maradjon Low/Medium/High váltáskor.
A talaj logikai csempemérete 384. A World1/2 tükrözött 2×2 ismétlését használd;
a nyers generált csempe önmagában nem ellenőrzött periodikus seamless textúra.
A kristályok színezése a képekbe van festve; külön fény- vagy pulzálás-effekt
nincs a csomagban. A kristályok visszafogott száma a későbbi generátor feladata.

Ellenőrzés: mind az 55 WebP dekódolása; 48 tereptárgy alfaátlátszósága,
üres szegélye és képaránya; három talajméret; tárgyelőnézet vizuális ellenőrzése.
A logikai méretek és ütközések játékbeli próbája a runtime-bekötés után szükséges.
