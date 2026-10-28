# CHERRIFT – közös animációsimítás és Sakura javítás

A csomag a Base Cherry, Archer Cherry, Ninja / Shadow Sakura Cherry, Succubus Cherry és Sakura Dance Cherry felújított sprite-rendszerét használja. Mind az öt megkapja a közös képkockaköztesítést az elérhető idle-, járás-, álló és mozgó támadás-, valamint skillállapotaiban.

## Telepítés

A ZIP teljes tartalmát másold a CHERRIFT projekt gyökerébe, azonos útvonalon felülírva a fájlokat. Az `assets/player/animation_flow` új mappát is töltsd fel, ne csak a JS fájlokat. Az öt skin meglévő PNG sprite-jai szükségesek hozzá, azokat ez a csomag nem írja át.

Az index és a manifest közös buildje `1028-animation-smooth3`. A friss GitHub-index Ninja/Shadow Sakura effektbetöltése megmaradt. A CI időkeretét beállító workflow fájlt a csomag nem cseréli.

## Mi változott?

A közös rajzoló tört képkockafázist kap. A két szomszédos rajz közötti, előre mért mozgásvektorok alapján számolja a köztes pózt. Ezt az idle és a támadás/skill is használja; a renderelés nem csak az eredeti egész képkockákra vált.

Járásnál az animált felsőtest és a két láb külön réteg. A felsőtest újra a teljes rajzolt pózsort követi, miközben a lábak a tényleges megtett út szerinti folyamatos lépésfázist kapják. A támadás nem indítja újra a lépést.

A Sakura bal és bal-felfelé jelentkező plusz lábának konkrét oka a tükrözésből megmaradt rajzolási transzformáció volt. A normalizálás után most visszaáll a rajzoló állapota, így a lábmaszk jó helyre kerül. A térd és a csizma közti illesztést is javítottam; a csizma nem válik két külön mozgó darabra.

A simító nagyobb belső rajzterülete megőrzi a széles íjakat, kardokat és hajat. Ez a karakter látható méretét, világpozícióját, talppontját és hitboxát nem nagyítja meg.

Az eredeti képességek, sebzés, lövedékszám, találati események, töltési és cast-idők, passzívok, három idle-szabályok és meglévő VFX-ek megmaradnak. A simító nem módosít harci véletlenszámokat.

## Teljesítmény és alapértelmezett használat

WebGL esetén a köztes póz egy shaderrajzolásból készül. A mozgásadatok kis PNG adatmappák, nem újrarajzolt teljes sprite-sorok. Csak az éppen használt irány/állapot adatai töltődnek be; a közös gyorsítótár legfeljebb hat készletet tart meg. A közös járó-rig előkészített pózainak gyorsítótára is korlátozott.

WebGL nélkül Canvas-alapú tartalék rajzoló működik, változatlan játékszabályokkal. Ez egyszerűbb közelítést használhat, mint a GPU-változat. A tényleges FPS a készüléktől és a teljes játéktól függ.

A további felújított skinekhez is ezt a közös rajzolót kell használni: tört animációs idő, fix világpozíció/talppont, mozgásadat, külön járó lábfázis. A karakter eredetiségét új sprite-dizájn készítése nélkül őrzi meg.

## Előnézet és ellenőrzés

- `animation-preview.html`: választható skin, nyolc irány, elérhető idle-változatok, álló/járó támadás és skill. A meglévő Sakura/Succubus preview link is ide vezet. Helyi HTTP-kiszolgálóról vagy a projekt webes címén nyisd meg.
- `Animation-preview-five-skins.mp4`: rövid, GPU-s renderelőből készült áttekintés az öt skin négy alapállapotáról.
- `Sakura-mirror-check.png`: a balra és bal-felfelé nézet több köztes póza.

63 célzott Node-teszt sikeres, beleértve a korábbi öt skin harci regresszióit és a tükrözési hibát. A GPU-s ellenőrzés mind a 175 mozgásadatsor 1 060 képkockapárjának köztes pózát renderelte: nincs üres póz és nincs a munkakeret szélébe ütköző rajz. A Sakura felsőtestén minden vizsgált irányban mérhető animáció van, tehát nem egy álló képet rajzol a járás fölé.

Ellenőrző parancsok: `npm run test:animation-smoothing`, `npm run test:cherry-motion`, `npm run test:sakura-dance`, `npm run test:succubus-chibi`, továbbá az eredeti Base/Ninja/Archer tesztek.

Teljes élő PC/mobil játékteszt és az új feltöltés GitHub Actions-futása még szükséges. A csomag nincs közvetlenül feltöltve GitHubra.
