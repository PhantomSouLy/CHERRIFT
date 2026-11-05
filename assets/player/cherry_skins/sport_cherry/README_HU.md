# Sport Cherry — Base-referencia szerinti chibi

Referencia: Base Cherry, `9b3d27f6603fb603d76f6764a1d80d88f885e19c`.
Build: `1030-sport-chibi1`.

Sport saját fehér–pink sportfelsője, futónadrágja, csíkos zoknija és sportcipője;
a Base kompakt chibi arányai, barna szeme, kiengedett barackrózsaszín haja,
nyuszifülei és loop ahogéja alapján. Az eredeti Sport splash és ikon megmarad.

## Játék

- Common / Defensive; +2% HP.
- Ranged Pink Bloom Orb; a cast a 2.5/18 mp-es eseménynél egyszer lő.
- Base-hez igazított mozgó lövés teljes mozgási sebességgel.
- Shield: a meglévő közös skillkód ad 2 mp sérthetetlenséget/pajzsot és
  10% max HP gyógyítást, a régi cooldownnal. Nem dash.
- Külön melee nincs ebben a reworkben.

## Assetek

8 irány, 6 állapot, 6 frame; 48 RGBA 1152×192 sheet és 288 külön 256×256 frame.
Pivot: 96,184; nyers látható magasság célértéke 156 px, a Base renderelt
méretéhez igazítva. Balos nézetek a jobbosok tükrözései.

Az imagegen 5 teljes irányatlaszt készített Base-sprite és Sport-outfit
referenciával. Ezek a `sources/` mappában, a teljes promptok `sources/PROMPTS.txt`
alatt vannak. A kivágás összefüggő figurákat keres; az egyenlő rácsvágás a
generált margók eltérései miatt levágná néhány cipő alját.

A nyers walk rajzok önmagukban nem adják a végleges járást. A `rig/` a Sport
saját, külön bemért lábmaszkjait és felsőtestlapjait tartalmazza. A
`cherrift_sport_gait.js` az eredeti Sport-cipőket vízszintes talpállással,
ellentétes fázisban mozgatja, folytonos bokakapcsolattal. A test/haj/karok saját
rajzi animációja megmarad. A valódi elmozdulásból számolt lábóra nem indul újra
lövéskor vagy irányváltáskor, falnál megáll.

30 kis kétirányú optical-flow textúra és a meglévő shared smoothing biztosítja
a pózközi átmeneteket. WebGL és Canvas/CPU fallback. A láb és a törzs adatai
Sport-specifikusak; a Base saját maszkjait nem másoltuk át.

Új Imagegen VFX: pink orb, sziromtalálat, világos kék-pink pajzsbuborék,
szirom, cast glint és semleges járáspor; atlasz és prompt az
`assets/effects/sport_cherry/` mappában.

## Bekötés és újraexport

Az index a Base után tölti: sport_data → sport_gait → sport_cherry → sport_vfx.
Az assetbetöltők a rig és VFX képeit is megvárják. A régi négyirányú
`assets/player/skins/sport_cherry/` sprite-konfigurációt csak Sport esetén írjuk
felül; az azonosító változatlan. Supabase-módosítás nem szükséges.

Újraexport: `python tools/export_sport_cherry.py` (Pillow, numpy, scipy,
opencv-python-headless). A forrásatlaszokat nem generálja újra, hanem megőrzi.
A másik skinhez tartozó assetek és renderelők tartalma változatlan.

Előnézet: `sport-cherry-preview.html`, helyi HTTP-kiszolgálóról megnyitva.
Példa: `python -m http.server 8000`, majd
`http://localhost:8000/sport-cherry-preview.html`.

Ellenőrzés: `npm run test:sport-cherry`, a Base/Cherry regressziótesztek és
`npm run validate`. A mellékelt GIF a tényleges renderelő modulok CPU referencia
útvonalával készült; nem külön kézzel rajzolt animáció. Ez nem teljes PC/mobil
játékteszt vagy a felhasználó vizuális jóváhagyása.
