# Base Cherry – Ninja 03-hoz igazított chibi sprite-készlet

A Base Cherry korábbi ruhája és arca kompakt, kb. 2,7 fejmagasságú chibi arányokkal.
A stílusreferencia a legutóbb elfogadott Ninja Cherry játékbeli sprite-ja.
Rózsaszín ruha, fehér blúz és csipkeszegély, hosszú barackrózsaszín haj,
barna szem és nyuszifülek. Minden képkocka egy teljesen megrajzolt karakter.

## Tartalom

- 8 irány: down, down_right, right, up_right, up, up_left, left, down_left.
- 6 állapot: idle, idle2, walk, attack, walk_attack, skill (egyszerű előre dash).
- Állapotonként és irányonként 6 képkocka: **288 külön 256×256 PNG**.
- **48 vízszintes sprite sheet**, 1152×192, 6 darab 192×192-es cellával.
- Valódi átlátszó RGBA, közös talpvonal és biztonsági keret.
- Offline HTML-lejátszó, mozgó és álló előnézet, manifest és promptok.

## Megnézés és használat

Nyisd meg a `preview.html` fájlt kicsomagolás után. A lejátszó nem igényel
telepítést vagy internetet. Az irány és állapot választható, a mozgás megállítható
és képkockánként léptethető. A PNG-ket váltja, köztes rajzokat nem állít elő.

A ZIP a `assets/player/cherry_skins/base_cherry/` útvonalat használja, egyezően
a korábban átadott Base Cherry aktiválással. Az új sheetek neve, mérete,
képkockaszáma és irányai megegyeznek a `cherrift_base_cherry.js` elvárásaival.
Ha az a bekötés már telepítve van, az új sheetek a régiek helyére másolhatók;
feltöltés után Ctrl+F5 szükséges a gyorsítótárazott képek frissítéséhez.
Ebben a csomagban nincs módosított játékkód vagy megváltoztatott statisztika.

A külön 256-os frame-ek a `frames256/` mappában találhatók. A játék a
`sheets192/` mappából tölti a 192-es csíkokat.

## Animációk

| Állapot | FPS | Tartalom |
|---|---:|---|
| idle | 3 | légzés és pislogás |
| idle2 | 3 | második idle, apró gesztusok |
| walk | 8 | váltott járáspózok |
| attack | 18 | álló Pink Bloom Orb kézmozdulat |
| walk_attack | 8 | járás és kézzel támadás |
| skill | 14 | előkészület, előredőlő dash, visszaállás |

Az FPS-ek a korábbi Base Cherry bekötéshez igazodnak. A támadó kézmozdulathoz
a játék külön hozza létre a meglévő lövedéket; az nincs a karakterre festve.
A skill nem forgó támadás, a világbeli elmozdulást a meglévő dashkód kezeli.

## Export és korlátok

192-es referencia: x=96, y=184. 256-os referencia: x=128, y=244.
Az alsó lábsávból becsült középvonal és közös talpvonal igazítja a rajzokat,
a biztonsági kereten belül. Ez nem kézzel bemért anatómiai csípőpont minden pózban.
Atlaszonként közös skálát használunk; a 256-os export egyes forrásfigurákat
felnagyíthat, ettől nem keletkezik új natív rajzi részlet.

Öt nézet külön generált. A balra és bal átlók a jobb oldaliak tükrözései,
ezért az aszimmetrikus haj- és ruharészletek is tükröződnek.
A képek között maradhatnak kisebb fej-, haj-, ruha- és pózeltérések, vagy
darabos átmenetek. A technikai ellenőrzés nem garantál kézi animációs minőséget.

A képeket a beépített ImageGen készítette. A kivágás, igazítás és sheetexport
mechanikus feldolgozás, csontváz vagy mozgatott testrészek nélkül.
A promptok a `sources/PROMPTS.txt` fájlban vannak. A nagy forrásatlaszok helyi
munkafájlok, a ZIP az exportokat tartalmazza. Az `export.py` újrafuttatásához
az atlaszok is kellenek, továbbá Pillow, numpy és scipy.

Ellenőrzés: 288 frame és 48 sheet, PNG-dekódolás, RGBA és méretek, üres frame-ek,
exporthatáron levágódás, valamint a nézetek és kijelölt mozgások vizuális áttekintése.
