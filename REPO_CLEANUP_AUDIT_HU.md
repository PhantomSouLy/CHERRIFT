# CHERRIFT mély cleanup-audit és folytatási pont

Kiinduló ág: `main`

Auditált kiinduló commit: `023e624` (`fixing v2`)

Aktuális cleanup build: `0983-structure`

## Rövid eredmény

A legutóbbi cleanup fájlszinten összevonta a régi verziókat, de a belső
felépítést nem tisztította meg: a `src/cherrift_app.js` egymás után tartalmazza
a v0.4–v0.9.4 rétegeket, amelyek sok helyen ugyanazokat a `UI`, Storage és Game
metódusokat csomagolják újra. A CSS ugyanezt a verzióláncot vitte tovább.

Az alsó mobilmenü villogása ennek közvetlen következménye volt. Legalább öt
generáció (v051, v052, v060, v082 és v090/v094) próbálta létrehozni vagy
átírni ugyanazt a gombsort; további account/world observerek a feliratokat és
route-okat figyelték, majd visszaírták.

Ebben a körben az aktív mobil navigáció egyetlen statikus DOM-tulajdonost
kapott. A runtime csak az aktív állapotot és a kiválasztott Cherry ikonját
frissítheti, a gombokat és a feliratokat nem építheti újra.

## Elvégzett javítások

1. **Egyetlen mobil főmenü**
   - A kanonikus öt gomb az `index.html` része: Cherry, Gear, Home, Gacha,
     More.
   - Kikerült a régi négyelemes `mobile-bottom-nav`, a v051 generált nav, a
     v0932 bal oldali Chest/Gear/Cherry másolat és minden hozzájuk tartozó
     DOM-átíró ág.
   - Kikerültek a régi v051 mobil profil-, currency-, karakterikon- és jobb
     oldali placeholder gombok; ezek helyett a jelenlegi v0932 komponensek
     maradtak.
   - Az account és world modul már nem címke alapján keres, töröl vagy nevez
     át navigációs gombokat, és nem figyeli observerrel a nav szövegét.
   - A régi navhoz tartozó aktív CSS-szelektorok is kikerültek.

2. **Egy hálózati/Auth védelmi réteg**
   - A böngésző fetch timeout, a Supabase singleton, a bounded Web Lock, az
     Auth timeoutok és az Edge Function timeout ugyanabban a
     `src/cherrift_network_guard.js` modulban élnek.
   - A külön `cherrift_supabase_timeout_fix.js` már nincs betöltve.
   - A vendor Supabase könyvtár a guard előtt töltődik, így a factoryt egyszer,
     determinisztikusan lehet védeni.

3. **Kevesebb aktív fájl és tisztább kategóriák**
   - A gyökér `style.css` és `menu_v040.css` tartalma egy kategorizált
     `assets/cherrift_shell.css` fájlba került.
   - A security UI stílus a közös `assets/cherrift_ui.css` része lett.
   - A külön reward UI patch kikerült a betöltésből; a kanonikus reward
     megjelenítés a runtime és a közös UI CSS tulajdona.
   - Első fél által szállított böngészős assetek egységes cache buildje:
     `0983-structure`.

4. **Indulási és mobil teljesítmény**
   - Az opcionális skin artwork preload nem blokkolja a bootot; csak az aktív
     idle grafika melegszik be háttérben.
   - Két teljes-document nav observer és több kizárólag navot újracsomagoló
     lifecycle wrapper kikerült.
   - A teljes telefonos smoke teszt observer callbackjei 823-ról 574-re
     csökkentek (kb. 30%).

5. **Visszaesést tiltó ellenőrzések**
   - Pontosan egy kanonikus nav és pontosan az öt rögzített felirat lehet.
   - A route-váltási smoke teszt figyeli a nav child/text mutációit; elvárt
     eredmény: nulla DOM-újraépítés.
   - A régi nav tulajdonosok/szelektorok, a külön timeout patch és a külön
     reward patch újbóli betöltése validációs hibát okoz.
   - A hálózati modul kötelező singleton/Auth/Function safety markereit külön
     ellenőrzés védi.

## Teljes fájlaudit

A gépi audit minden Git által követett fájlt ellenőriz. A PNG/JPG tartalmakat
a kérés szerint nem minősíti automatikusan törlendőnek; csak a fájlszignatúrát,
méretet, literális hivatkozást és byte-azonosságot jelzi.

- Ellenőrzött fájlok: **888**
- JavaScript/CSS/JSON/TOML/YAML/Python szintaxis- vagy szignatúrahiba: **0**
- Aktív runtime-ból hiányzó literális fájl: **0**
- 1 byte-os placeholder: **1**
- Byte-azonos fájlcsoport: **18**
- Statikusan nem bizonyíthatóan használt asset: **472**

Az utolsó szám nem törlési lista. A játék sok skin-, enemy-, map- és effect
útvonalat futás közben rak össze, ezért a statikus referencia hiánya önmagában
nem bizonyítja, hogy egy kép fölösleges.

## Biztonságosan törölhető fájlok

Ezeket az aktuális `index.html` és manifest már nem tölti; tartalmuk beolvadt a
kanonikus tulajdonosba vagy üres placeholder:

- `style.css`
- `menu_v040.css`
- `assets/cherrift_security_ui.css`
- `src/cherrift_rewards.js`
- `src/cherrift_supabase_timeout_fix.js`
- `assets/effects/elemental/common/Readme.txt`

## Még megmaradt szerkezeti adósság – következő mély kör

A mostani kör megszünteti a bizonyított mobil-nav és hálózati patch-ütközést,
de a teljes régi runtime-lánc még nincs biztonságosan újraírva:

- A `src/cherrift_app.js` még 47 korábbi verziószekciót tartalmaz.
- Több száz régi lifecycle/Storage/Game wrapper maradt benne; ezek között sok
  valódi gameplay-, save-migrációs és UI-funkció van, ezért tömeges törlésük
  adatvesztést vagy rejtett combat hibát okozhatna.
- Az `assets/cherrift_app.css` még a régi cascade jelentős részét őrzi.

A következő refaktor javasolt sorrendje:

1. Core/save/gameplay alap API-k kanonizálása.
2. Lobby/progression UI kivonása egy kategóriamodulba.
3. Gear/economy/gacha tulajdonosok összevonása.
4. Theme/presentation és world/skin felületek szétválasztása.
5. Minden kivont kategória után PC, mobil, returning session, Auth timeout és
   cloud timeout regresszió futtatása; csak ezután törölhető az adott régi
   szekció a monolitból.

Ez a fájl a pontos folytatási pont: a következő kör nem kezdheti újra a nav vagy
a network javítását újabb hotfixszel, hanem a fenti kategóriákat kell egyenként
kiváltania.
