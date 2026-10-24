# CHERRIFT · Crystal UI hangcsomag

2026. október 24.

Öt saját, szintetizált, külső minták és felvételek nélküli WAV effekt. Mindegyik 48 kHz, sztereó, 16 bites, tömörítetlen PCM WAV. Az öt fájl összesen 288 220 bájt.

| Fájl | Hossz | Szerep |
|---|---:|---|
| crystal-play.wav | 550 ms | A sima kattintással közös alap, hangsúlyosabb felfelé csillanással. |
| crystal-click.wav | 220 ms | Rövid, puha kristálykattintás. |
| crystal-hover.wav | 120 ms | Halk üveges jelzés. |
| crystal-back.wav | 320 ms | Lefelé suhanó, lágy visszalépés. |
| crystal-page.wav | 290 ms | Levegős, kristályos lapozás. |

Az egybefűzött menu-sfx-elonezet.wav sorrendje: Play → kattintás → hover → vissza → lapozás. Az előnézet az egyes hangok között szünetet hagy; nem egyetlen játékbeli effekt.

A menu-hangok-elonezet.html önállóan, helyi kiszolgáló nélkül nyitható böngészőben. Az öt hang külön-külön meghallgatható, és a hangerő állítható. Az ott használt arányok megegyeznek a játék keverésével.

## Bekötés a játékba

A WAV fájlok: assets/audio/menu/. Az új közös kezelő: src/cherrift_menu_audio.js, a fő alkalmazás előtt töltődik be. A régi kattintáskezelő a közös kezelőt használja, a korábbi asztali hoverkezelők pedig nem játszanak rá külön kattintáshangot.

- Play, pályaválasztó/indító vezérlők: kiemelt Play effekt.
- Normál gombok és egyéb menüvezérlők: kattintás.
- Vissza, Bezárás: visszalépési effekt.
- Skinválasztás, skin- és világlapozó nyilak: lapozási effekt.
- A kezelt Escape és billentyűs lapozás is saját vissza/lapozó hangot kap.
- Hover: a belépést követően 45 ms után szól; a gyerekikonokra mozgás nem indít új hangot. Kilépés vagy kattintás törli a függő hoverhangot. Érintésre nem szól hover, és van 110 ms-os ismétlési korlát.
- A lejátszás a meglévő master hangerőt követi; 0 hangerőn csendben marad. Nem ír át mentést.
- Letiltott, elrejtett, inert vezérlő nem szól. A játékmeneti HUD nem kap új menühangokat; a megnyitott menük és párbeszédek működnek.
- Egyszerre legfeljebb öt hang szólhat. Háttérbe tett dokumentumnál a menühangok leállnak.
- A harci effektek és a jutalomhang nem változott.

## Újraépítés és ellenőrzés

A generátor tools/generate_menu_sfx.py, csak a Python standard könyvtárát használja. Futtatás a projekt gyökerében: python tools/generate_menu_sfx.py.

Célzott hangteszt: npm run test:menu-audio. A hangok, a főmenü, a skinválasztó és a beállítások közös célzott futása 29/29 sikeres tesztet adott. A WAV fejléc, hossz, csúcsszint és záró minták ellenőrzése sikeres; nincs digitális túlvezérlés. A szintaxis-, CSS- és fájlhivatkozás-ellenőrzés sikeres.
