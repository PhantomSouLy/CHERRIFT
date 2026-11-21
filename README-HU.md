# Beastclaw Cherry v2

A Beastclaw Rare skin sprite-frissítése a játék jelenlegi splash artja alapján.
A készlet 40 átlátszó, vízszintes PNG stripet tartalmaz. Egy képkocka 192 × 192 px.
Az Idle 4, a Walk, Attack, Walk Attack és Savage Rend 6 képkockás, nyolc irányban.
A három balos irány a megfelelő jobbos animáció tükrözése.

A v2 a hátulnézeti fehér fülpamacsot eltávolítja az Up, Up-Left és Up-Right
irányból mind az öt animációban. A többi irány sprite-jai bájtra azonosak a v1-gyel.

A v2 a hátulnézeti fehér fülpamacsot eltávolítja az Up, Up-Left és Up-Right
irányból mind az öt animációban. A többi irány sprite-jai bájtra azonosak a v1-gyel.

## Telepítés

A csomag alapja a PhantomSouLy/CHERRIFT 82f5bd5 commitja, amelynek buildje
1123-training-hud. GitHub Desktopban húzd le ezt a verziót vagy egy kompatibilis
állapotot. A csomag gyökeréből az `index.html`, `src` és `assets` elemeket másold
a CHERRIFT repo gyökerébe. A mappák tartalmát egyesítsd. A csomag frissíti az
`index.html` és a `src/cherrift_manifest.json` fájlt, és felveszi a Beastclaw
modult és sprite-okat. Ha azóta külön módosítottad az indexet vagy a manifestet,
a felülírás előtt nézd meg a GitHub Desktopban a fájlok eltéréseit.

Ezután a játékban equipeld Beastclaw Cherryt, lépj be a Training Testre, és
próbáld ki az átlós mozgást, a mozgás közbeni közelharci támadást és a Savage
Rend skillt. A csomag a jelenlegi splash artot, sebzést, hatótávot, cooldownokat,
előretörést és meglévő harci effekteket használja.

Az animációk GIF-ben a `preview` mappában is megtekinthetők.
