# CHERRIFT v0.9.4.3 – PC + map stability javítás

Alapként használt GitHub main commit:

`b970edd46b1c3c554df762ba687197e0d126f829` – `frames to assets`

## Feltöltés

A ZIP teljes tartalmát töltsd fel a repository gyökerébe, a mappaszerkezet megtartásával.

Felülírandó:

- `src/supabase_config.js`

Új fájl:

- `src/cherrift_bugfix_v0943.js`

Ehhez a csomaghoz:

- nem kell Supabase SQL-t futtatni;
- nem kell Edge Functiont újradeployolni;
- az új map- és splash-art asseteket nem tartalmazza, mert azok már a main ágon vannak.

## Javítások

- Stabil desktop és mobil menü-routing; a Gacha nem nyílik rá más menükre.
- Gacha Back, bal/jobb nyíl, tier pontok, Open 1× és Open 10× közvetlen eseménykezelése.
- Gacha bezárása után ismét megnyitható a főmenü és minden más panel.
- Cherry Selector Splash Art automatikus helyreállítása a skin mappájából.
- Régi kattintásos szirom-trail elrejtése.
- Új egyszeri, enyhe színes sziromrobbanás kattintáskor, lehulló és eltűnő animációval.
- Desktop felső globális wallet: Coin, Bloom Gem, Sakura Essence, Scrap.
- World 1–4 normál 450×800 splash-art kiosztás.
- World 1–4 új, levágott object PNG-k valódi képaránya alapján új render-méret.
- Az új object-méretből számolt talajközeli elliptikus collision.
- A Training Test pálya érintetlen marad.
- Közvetlen, egyszeres object-renderelés és high-quality canvas smoothing.
- Kisebb Small/Big XP orb megjelenítés.

## Tesztelés

Feltöltés után várj a GitHub Pages frissülésére, majd végezz kemény frissítést vagy nyisd meg inkognitóablakban.

PC-n ellenőrizd:

1. felső menü összes gombja;
2. Gacha bal/jobb, Open 1×, Open 10× és Back;
3. Cherry Selector → Splash Art és Game View;
4. új felső currency wallet;
5. World 1–4 objectek élessége és collisionje;
6. kis és nagy XP orb mérete.

Telefonon ellenőrizd:

1. alsó navigáció;
2. More menü;
3. Gacha érintés és swipe;
4. World/Chapter választó;
5. pálya collisionök.
