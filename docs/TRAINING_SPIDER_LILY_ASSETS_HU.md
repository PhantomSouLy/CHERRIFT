# Tesztpálya – ködfátylas vörös pókliliommező

Az elfogadott **3-as koncepció** szerint: világos hamuszürke-bézs talaj,
vörös pókliliomok, világos kövek és finom alacsony köd. A források a
beépített ImageGen eszközzel készültek. Ez a tesztpálya, nem World7.

## Tartalom és rétegek

- Külön talaj, **virágok nélkül**.
- Tíz különböző vörös pókliliom-sprite: önálló szálak, bimbós változat,
  eltérő virágcsomók és magasságok. A növények átjárható dekorációk.
- Hat kiegészítő sprite: nagy kő, kőpár, kis kő, kavicsok, moha és fű.
- Külön átlátszó ködfátyol-sprite.
- Az elfogadott koncepció mint pályaválasztó-kép.

| Export | Low | Medium | High |
|---|---:|---:|---:|
| Talaj | 192×192 | 384×384 | 768×768 |
| Virágok maximális oldala | 64 | 96 | 192 |
| Nagyobb kövek maximális oldala | 64 | 128 | 256 |
| Apró dekoráció maximális oldala | 32 | 64 | 128 |
| Ködfátyol maximális szélessége | 256 | 512 | 1024 |
| Pályakép befoglaló mérete | 640×360 | 1280×720 | 1920×1080 |

Aránytartó export, felnagyítás nélkül. Objektumok és köd veszteségmentes RGBA
WebP; talaj és pályakép RGB WebP. A vékony virágszárak és porzók miatt
a virágok Low változata is legfeljebb 64 pixeles, nem 32. Az atlaszkivágás
több jelentős különálló képrészt is megtart, hogy ne vesszenek el külön szárak.

## Az egész pálya beültetése

A `scatter-preset.json` javasolt induló elosztási adatokat tartalmaz.
Seedelt, eltolásokkal lazított rács: 28 logikai egységenként 94% eséllyel
választott virágsprite, változó mérettel és tükrözéssel. A map közepe és a
kezdőterület is virágos; nincs nagy üres kör vagy csak peremre szorított mező.
A szilárd kövek lábnyomába ne helyezz növényt. Az adatokat a kész játékban
finomítani kell; ez még nem futó pályagenerátor.

Low/Medium/High alatt ugyanaz a virágelosztás és geometria maradjon;
csak a textúrafelbontás változzon. Rajzoláskor kamerakivágás, térbeli
darabolás és talppont szerinti rendezés szükséges. A karaktert takaró
előtéri virágok helyileg halványulhatnak. A virágok nem akadályok.

A köd külön RGBA sprite, nem a talajba vagy virágokba festett réteg.
Induló átlátszóság 0.12, felső javasolt érték 0.18, kevés ritkán elosztott
fátyollal. A forrás alfaértékeit a rajzoló globális alfájával szorozd.
Lassú sodródás és szüneteltetéskori megállás később a runtime feladata.

## Telepítés és állapot

A ZIP tartalmát a CHERRIFT gyökerébe másold a mappaszerkezet megtartásával:

- `assets/map/training/spider-lilies/`: három minőség, méretek, katalógus és elosztási javaslat.
- `docs/training-lily-sources/`: masterképek, promptok, koncepció/pályakép és tárgyelőnézet.
- `tools/prepare_training_lily_art.py`: megismételhető export, Pillow szükséges.
- `docs/TRAINING_SPIDER_LILY_ASSETS_HU.md`: ez a leírás.

**Csak assetcsomag, runtime-bekötés még nincs.** A jelenlegi tesztpályát nem
módosítja automatikusan, régi fájlt nem töröl. Nem tartalmaz World3–6 fájlokat.

Újraexport: `python tools/prepare_training_lily_art.py` a repository gyökeréből.
A dimensions.json minőségfüggetlen logikai méreteket, talppontokat és
javasolt kőütközést ad. A talaj logikai mérete 384; a World1/2 tükrözött
2×2 ismétlését használd. A nyers generált talaj önmagában nem ellenőrzött
periodikus seamless csempe.

Ellenőrizve: 58 WebP dekódolása, 48 tárgyexport átlátszó szegélye és képaránya,
három köd RGBA-formátuma, három talajméret és a tárgyak vizuális előnézete.
A sűrű mező sebessége, virágmérete, karaktertakarása és ködmozgása a
későbbi runtime-bekötéskor játékbeli ellenőrzést igényel.
