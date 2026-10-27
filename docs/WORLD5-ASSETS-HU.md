# World5 – Sand Desert assetcsomag

Az elfogadott **2-es, szélkoptatta világos sziklavidék** koncepció alapján.
Egyszerű aranyhomokos sivatag, krémszínű rétegzett sziklákkal, kisebb dűnékkel
és ritkás növényzettel. A pályaválasztó képe maga az elfogadott koncepció.
Az új tárgylap és talaj a beépített ImageGen eszközzel készült.

## Tartalom

16 különálló RGBA tereptárgy: gombaformájú szikla, homokkőoszlop, ferde szikla,
lapos nagy szikla, kisebb sziklacsoport, lapos kő, két dűne, két kaktusz,
száraz tüskebokor, száraz cserje, fű, csontok, sivatagi virág és kavicsok.
Külön visszafogott homoktalaj és pályaválasztó-kép.

| Típus | Low | Medium | High |
|---|---:|---:|---:|
| Talaj | 192×192 | 384×384 | 768×768 |
| Nagy sziklák és dűnék max. oldala | 128 | 192 | 320 |
| Közepes tárgyak max. oldala | 64 | 128 | 256 |
| Apró dekoráció max. oldala | 32 | 64 | 128 |
| Pályakép befoglaló mérete | 640×360 | 1280×720 | 1920×1080 |

Az export tartja a képarányt, nem nagyít a forrásméret fölé. Tereptárgyak:
veszteségmentes RGBA WebP. Talaj és pályakép: RGB WebP. A dűnék lágy
alfaátmenetet kapnak a talajba illesztéshez.

## Telepítés és bekötés

A ZIP-et a CHERRIFT gyökerébe másold, megtartva a mappaszerkezetet.
Csak új World5 fájlokat tartalmaz:

- `assets/map/world5/sand-desert/`: három készlet, splash-alias, dimensions és catalog.
- `docs/world5-sources/`: masterképek, elfogadott koncepció/splash, promptok és előnézet.
- `tools/prepare_world5_art.py`: ismételhető exportáló; Pillow szükséges.
- `docs/WORLD5-ASSETS-HU.md`: ez a leírás.

**Ez assetcsomag, a runtime-bekötés még hátravan**, ugyanúgy, mint a World3/4
csomagjainál. Nem módosítja a jelenlegi pályagenerálást és nem töröl régi képeket.
Újraexport: `python tools/prepare_world5_art.py` a repository gyökeréből.

A dimensions.json minden minőségi szinten közös logikai méreteket és
talppontot ad. A catalog.json minőséghelyettesítős útvonalakat, valamint
javasolt ütközési lábnyomokat tartalmaz. A minőségváltáskor a logikai
geometriát meg kell tartani. A dűnék átjárható dekorációk. Az ütközési
adatok javaslatok, játékbeli ellenőrzésük a bekötéskor szükséges.

A talaj forrása a generált kép középső négyzetes kivágása, nyújtás nélkül.
Logikai csempeméret 384; a World1/2 tükrözött 2×2 ismétlését használd.
A nyers forrás önmagában nem ellenőrzött periodikus seamless csempe.

Ellenőrizve: 48 tereptárgyexport valódi alfaátlátszósága, üres szegélye és
képaránya; három talajméret; 55 WebP összesen; tárgyelőnézet vizuális átnézése.
Játékbeli render- és ütközésteszt még nem történt, mert nincs runtime-bekötés.
