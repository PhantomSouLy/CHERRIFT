# CHERRIFT v0.9.5 pre-beta balansz

Ez a fájl a `src/cherrift_balance.js` központi értékeinek emberileg
olvasható összefoglalója. A balansz módosításakor elsőként azt a fájlt kell
átírni; a progression, Energy, Arsenal, title és Gacha rendszerek abból olvasnak.

## Kezdő account

| Erőforrás / tartalom | Kezdő érték |
|---|---:|
| Coin | 500 |
| Bloom Gem | 0 |
| Sakura Essence | 0 |
| Scrap | 0 |
| Heart Token | 0, egyelőre kikapcsolva |
| Energy | 50 / 50 |
| Common Chest | 3 |
| Skin | csak Base Cherry |
| Pálya | csak World 1-1 |
| Player Level | 1 |
| Arsenal | minden slot Level 1 |
| Profilkeret | csak Bloom Frame |

A migráció futásakor már létező fiókok owner entitlementet kapnak. Az owner
megtartja a korábbi skineket, felszerelést és teszttartalmat; az új accountok
kapják a fenti valódi kezdést.

## Currencyk

- Coin: Gear/Arsenal/Player upgrade, shop és általános költségek.
- Bloom Gem: ritka prémium currency; Rare/Epic chest, skin, shop és limitált
  Energy refill. Sima pályateljesítés már nem ad Bloom Gemet.
- Sakura Essence: duplikált skinből jön. Common 5, Uncommon 8, Rare 15,
  Epic 45, Legendary 120 Essence.
- Scrap: főleg gear betörésből; Arsenal és későbbi tuning alapanyaga.
- Heart Token: az adatmodellben szerepel, de a friendship reward fázisig nem
  szerezhető és nem költhető el.

## Energy

| Szabály | Érték |
|---|---:|
| Kezdő maximum | 50 |
| Normál pálya | 5 Energy |
| Training | 0 Energy |
| Természetes töltés | óránként 5 |
| Napi reset | legalább a maximumra visszatölt |
| Kézi túltöltés felső határa | 100 |
| Coin refill | 800 Coin → 10 Energy, naponta 2× |
| Bloom refill | 40 Gem → 25 Energy, naponta 3× |
| Small / Standard / Large ital | 10 / 25 / 50 Energy |

Az Energy csak az első megszerzett csillagnál kerül levonásra. Ha a játékos
előbb kilép, nincs Energy-költség és nincs stage reward. Ugyanaz a futam nem
vonhat le kétszer Energyt.

## World progression

| World | Belépési szint | Tervezett befejezési szint | Ajánlott Power |
|---|---:|---:|---:|
| 1 | 1 | 5 | 100–850 |
| 2 | 5 | 10 | 800–1400 |
| 3 | 10 | 15 | 1350–2100 |
| 4 | 15 | 20 | 2000–2900 |
| 5 | 20 | 30 | 2800–4200 |
| 6 | 30 | 35 | 4100–5600 |

- Következő chapter: legalább 1 csillag az előző chapteren.
- Következő World: megfelelő Player Level és minden előző world chapteren
  legalább 1 csillag.
- World title: az adott World mind az öt chapterén 3 csillag.
- World 5 és 6 működő placeholder chaptereket használ; az art később egy helyen
  cserélhető.

## Stage Coin reward

| World | Ismételhető reward, 1–5 | Első teljesítés, 1–5 |
|---|---|---|
| 1 | 90, 100, 110, 125, 150 | 250, 320, 390, 470, 600 |
| 2 | 140, 155, 170, 190, 230 | 400, 500, 610, 740, 900 |
| 3 | 200, 220, 245, 270, 330 | 650, 770, 900, 1040, 1200 |
| 4 | 280, 310, 345, 385, 470 | 900, 1080, 1280, 1480, 1700 |
| 5 | 400, 450, 500, 560, 680 | 1300, 1550, 1820, 2100, 2400 |
| 6 | 560, 630, 700, 780, 950 | 1900, 2250, 2620, 3000, 3400 |

A korábbi túl magas, közel minden futamon ládát adó stage drop vissza lett
fogva. Bloom Gem nem esik normál first clearből.

## Gear és betörés

A gear ritkaságok: Common, Uncommon, Rare, Epic, Legendary. Az Uncommon külön
lépcső a Common és Rare között, és Common Chestből is eshet.

| Ritkaság | Betörési reward |
|---|---|
| Common | 3 Scrap |
| Uncommon | 5 Scrap |
| Rare | 8 Scrap + 1 Copper |
| Epic | 20 Scrap + 2 Copper, 8% eséllyel 1 Silver |
| Legendary | 55 Scrap + 3 Silver |

## Arsenal

- Béta maximum: Level 30.
- Egy Arsenal slot szintje soha nem lehet magasabb a Player Levelnél.
- Minden Arsenal level +2,5% erősítést ad a hozzá tartozó felszerelésnek.
- 1–5: Coin + Scrap.
- 6–15: Coin + Scrap + Copper.
- 16–30: Coin + Scrap + Copper; a fontosabb mérföldköveknél Silver.
- A csillag automatikusan követi a szintet: Level 1–10 = 1★,
  11–20 = 2★, 21–30 = 3★.

## Player XP és Skill Tree

Az XP-görbe: `120 + 55 × level^1.5`, egészre kerekítve. Minden tényleges
szintlépés 1 Skill Pointot ad. A Skill Tree első resetje ingyenes, utána a reset
ára minden használattal nő.

Egy World öt chapterének első teljesítési XP-je együtt a World
`unlockLevel` és `completionLevel` értéke közötti teljes XP-t fedezi. A chapterek
13% / 16% / 19% / 23% / 29% arányban osztják el ezt. Egy már teljesített chapter
ismétlése az első teljesítési XP 35%-át adja, ezért a normál progression nem
akad el, de az egyetlen könnyű pálya ismétlése sem lesz túl hatékony.

## Gacha

- Common Chest pity: 10.
- Rare Chest pity: 15.
- Epic Chest pity: 25.
- Common Chest már Common és Uncommon geart is adhat.
- A `Shape of Bunny` +2% Chest Luck title a ritkább kimenetek felé tolja a rollt.
- A duplikált skin automatikusan Sakura Essence-re váltódik.
- A ládanyitó animáció befejeződik a reward megjelenése előtt.

## Napi és heti alapjutalom

- Daily quest: 150–300 Coin.
- Öt Daily quest után: 500 Coin, 1 Common Chest, 15 Energy.
- Weekly: 3500 Coin, 20 Bloom Gem, 1 Rare Chest, 1 Standard Energy Drink.

## Title rendszer

- A kiválasztott title csak a profilon megjelenő név.
- Minden megszerzett title statja egyszerre, összeadva érvényesül.
- Az `All Stats` jelenleg ugyanannyi ATK-, HP-, mozgási sebesség- és Armor
  pontot jelent; százalékos statokat nem növel korlátlanul.
- A Title Stats panel title-enként és összesítve mutatja a bónuszokat.
- A ranglista-title és rank frame csak legalább 100 heti aktív játékosnál
  oldható fel.
- A beta Arsenal cap fölötti title-k láthatatlan post-beta célok maradnak.

A teljes title-katalógus, követelmény és stat a
`src/cherrift_balance.js` `TITLES` listájában található.

## Profilkeretek, Social és Ranking

- A Discord profilkép kör alakú; a keret a Profilon és a főmenüben is látszik.
- Keret a profilképre kattintva választható. A szerver is ellenőrzi, hogy a keret
  valóban fel van-e oldva.
- Social: Discord név/public code keresés, add, accept, delete, block, unblock és
  profilnézet.
- Alap friend limit 30; Level 20-on +5, achievement-bónusz később hozzáadható.
- Weekly Power Ranking: Top 50, hétfő 00:00 UTC alapú hét, profil megnyitható.
- A Social és Ranking adatokat csak a hitelesített Edge Function írhatja.

## Következő balanszkörhöz mérendő adatok

- átlagos idő Level 5, 10, 20 és 30 eléréséig;
- stage success rate és kapott sebzés world/chapter bontásban;
- Coin be- és kiáramlás, Arsenal bottleneck;
- chest/gear rarity tényleges eloszlás legalább 1000 nyitásból;
- Energy kifogyási arány és refill használat;
- heti Power szórás és a Top 50 belépési küszöbe.
