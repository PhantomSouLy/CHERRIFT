# CHERRIFT – teljes smoke-feladat időkerete

Cseréld le a repository `.github/workflows/ci.yml` fájlját a ZIP-ben lévő azonos útvonalú fájlra. Az indexet és a skineket nem kell cserélni.

A 40705370805 számú GitHub-futás naplójában a desktop smoke teszt sikeresen lefutott 43,5 másodperc alatt. A repository fetch 14:24:22-től 14:28:08-ig tartott, így a teljes feladatnak kevés volt a 4 perces keret. A forrásellenőrzés és az összes többi smoke eset sikeres.

A javítás kizárólag a smoke job teljes időkeretét emeli 4-ről 8 percre. Az egyes smoke tesztek meglévő 120 másodperces watchdogja, minden teszteset, parancs és ellenőrzés megmarad.

A fájl feltöltése új ellenőrzést indít; ennek eredményét a GitHub Actions alatt kell megvárni.
