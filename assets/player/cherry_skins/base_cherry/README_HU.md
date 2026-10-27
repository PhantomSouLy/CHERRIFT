# Base Cherry – teljes karakteres sprite sheet készlet

A választott 2-es JRPG/anime irány az 1-es aranyosabb arányaival keverve.
A karakterek minden képkockán teljes egészükben megrajzolt képek. A csomag
nem használ csontvázat, testrészekből összeállított bábot vagy rig-renderelést.

## Tartalom

- 8 irány: le, le-jobbra, jobbra, fel-jobbra, fel, fel-balra, balra, le-balra.
- 6 állapot: idle, idle2, walk, attack, walk_attack és skill.
- Állapotonként és irányonként 6 képkocka, összesen **288 külön 256×256 PNG**.
- **48 vízszintes sprite sheet**, mindegyik 1152×192 (6 darab 192×192 cella).
- Átlátszó RGBA, biztonsági szegély, közös alsó igazítás; semmi nem lóg át a következő képkockába.
- Böngészős lejátszó, mozgó és álló előnézetek, forrásképek, promptok és exportáló.

Az 5 eredeti nézet külön generált rajz. A bal, le-bal és fel-bal a megfelelő
jobb oldali képkockák tükrözése; nem külön újrarajzolt mozdulatok.
Az aszimmetrikus haj- és ruharészletek is tükröződnek.

## Megtekintés

Csomagold ki, és nyisd meg a **preview.html** fájlt. Választható a hat állapot
és a nyolc irány, a lejátszás megállítható és képkockánként léptethető.
Internetkapcsolat és telepítés nem kell. A lejátszó tényleges PNG-képkockákat
vált; nem generál köztes mozgást és nem használ áttűnést.

## Fájlok

- `frames256/<irány>/<állapot>/000.png`…`005.png`: külön teljes karakterképek.
- `sheets192/base_cherry_<állapot>_<irány>.png`: a 48 kompatibilitási csík.
- `manifest.json`: frame-számok, sebességek, irányok, források és igazítási adatok.
- `sources/`: öt teljes forrásatlasz, öt külön járás/támadó járás javítás és promptok.
- `export.py`: kivágás és aránytartó export (Python + Pillow).
- `validation.json`: technikai ellenőrzési eredmények.

Az újraexport helyi köztes eredményként külön 192-es PNG-ket is készít;
ezeket a ZIP nem ismétli meg, a 192-es változat a sprite sheetekben van.

## Animációk

| Állapot | Javasolt sebesség | Viselkedés |
|---|---:|---|
| idle | 3 fps | nyugodt állás, pislogás |
| idle2 | 3 fps | második álló változat, apró gesztusok |
| walk | 8 fps | váltott járáspózok |
| attack | 12 fps | álló kivető/célzó kézmozdulat |
| walk_attack | 8 fps | járás támadó kartartással |
| skill | 14 fps | előredőlés, dash-póz, visszaállás; egyszeri lejátszás |

A skill sima előre dash, nem körbeforgó támadás. A világbeli elmozdulás,
lövedék és egyéb VFX a játékkód feladata; nincs beégetve a képekbe.
A konkrét fegyver nincs a képekre rajzolva; a jelenlegi kivető kézmozdulat
a projekt korábbi ranged/orb ábrázolásához igazodik.

## Méret és pontosság

A generált karakterek összefüggő, jelentős alfa-sziluettjeit különítettük el,
a levált áttetsző zajt eltávolítottuk, majd teljes alakban vászonra helyeztük.
Az alapforráson belül közös skálát használunk; a külön generált járáslapokat
nézetenként az alapállás méretéhez igazítottuk. A képkockák vízszintesen a
teljes sziluett középvonalára igazítottak, alul közös alapvonalra. Ez nem
kézzel bemért anatómiai csípőpont minden egyes rajzon.

256-os vászon: (128,244) igazítási referencia. 192-es csík: (96,184).
A 256-os export egyes képeket mérsékelten felnagyít a generált forrásból;
ez nem jelent új, natív 256-os rajzi részletet. A forrásméretek megmaradnak.

**A képkockák és animációk léteznek, de ez nem garantáltan végleges animációs
minőség.** A generált nézetek fej-/testarányai és kamerája nem teljesen
azonosak. A lépésváltások, haj- és ruharajzok között maradhatnak kisebb
eltérések vagy darabos átmenetek. Különösen a le/fel és az átlós mozgások
foreshorteningje igényelhet további kézi javítást. Nem állítjuk, hogy a
forrásképek anatómiai azonossága vagy a járás biomechanikája pixelpontosan tesztelt.

## Bekötés és ellenőrzés

**A játékba nincs automatikusan bekötve**, a meglévő Base Cherry fájlokat
nem írja felül. Az integrációnak frissítenie kell a 8 irány kezelését, az
idle 6 frame-es számát és az idle2/walk_attack állapotválasztást. A régi
4 frame-es idle-beállítás mellett nem játszódna le az egész sor.

Újraexport: `python export.py` a csomag gyökeréből.
Ellenőrizve: 288 nem üres 256-os PNG, a helyi 288 192-es PNG, 48 sprite sheet,
helyes RGBA és méretek, üres külső képszegély. A nézeteket és a kiválasztott
mozgássorokat statikus áttekintésen átnéztük. A technikai teszt a fájlokat
ellenőrzi; a fenti mozgásminőségi korlátokat nem minősíti véglegesnek.
