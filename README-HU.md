# CHERRIFT · Fairy Cherry v3

Fairy Cherry nyolc irányban kap új idle, walk, attack, walk attack és Magic Burst animációt. Az export 192 × 192 pixeles, átlátszó képkockákból áll. A balra néző irányok a megfelelő jobbra néző irányok tükörképei.

A Fairy Bloom Orb és a Magic Burst a `assets/effects/fairy_cherry/` mappában található. A lövedék négy képkockás, a Magic Burst nyolc képkockás. A Magic Burst középpontja a cast eredeti helyén marad.

## Telepítés

Másold az `assets` és a `src` mappát, valamint az `activate-fairy.py` fájlt a CHERRIFT gyökerébe. A gyökérmappából futtasd a `python activate-fairy.py` parancsot. A szkript az aktuális buildazonosítóval hozzáadja a két modult az `index.html`-hez és a runtime manifesthez. Újrafuttatható.

Az előnézetben mind az öt animáció és a két külön VFX kiválasztható.

## Képgenerálás

A képek a CHERRIFT jelenlegi sprite-ját és Fairy Cherry splash artját követik. A generált sprite-ok külön pózokban mutatják a légzést, az alternáló lépéseket, az álló és mozgás közbeni orbcastot, valamint a Magic Burst kitáruló kézmozdulatát. A VFX külön promptból készült, mentazöld szélívekkel, rózsaszín virágszirmokkal és halvány arany szikrákkal.
