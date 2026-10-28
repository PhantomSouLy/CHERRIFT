CHERRIFT LOCAL PREVIEW v3 – KATTINTÁS UTÁNI LOADING / RELOAD FIX
===========================================================

EZ A CSOMAG CSAK LOCAL PREVIEW FÁJLOKAT TARTALMAZ.
Nem írja át az index.html, src/, assets/ vagy Supabase fájlokat.

TELEPÍTÉS
1. A régi Preview fekete terminálablakában Ctrl+C.
2. A ZIP-ből a 'local-preview' mappát másold ebbe a mappába:
   C:\Users\phant\Documents\GitHub\CHERRIFT\local-preview
   Felülírhatod a RÉGI local-preview fájlokat, a játék forrását ne.
3. Kattints: CHERRIFT Preview inditasa.cmd
4. Böngésző: http://127.0.0.1:5178/
   Ha a régi UI maradt, Ctrl+Shift+R a böngészőben.
5. A felső sávon ezt keresd: CHERRIFT · PREVIEW v3.

FONTOS VÁLTOZÁS
- Egyetlen file-watcher esemény sem indít automatikus teljes oldalfrissítést.
- CSS fájl módosulása: a link stylesheet frissül helyben, loading nélkül.
- PNG/JPEG/WebP/SVG fájl módosulása: az oldalon lévő <img> elemek frissülnek helyben.
- A Canvasban betöltött sprite sheeteket/JS-t a böngésző már memóriában
  tarthatja. Ezeknél a felső 'Frissítés' gomb egyszeri kézi újratöltése kell.
- JS, HTML, JSON változás: a Preview jelzi, hogy 'Frissítés kell'.
- A 'Hot: BE/KI' csak a CSS/kép hot frissítést kapcsolja. Ez NEM teljes page reload.
- Az app indító gombjára a Preview legfeljebb egyszer kattint automatikusan.
- A Preview állapot/hiba panel megmutatja, a teljes induló vagy a pályabetöltő
  látható-e, és mi volt a megelőző kattintás.

HA MÉG MINDIG VISSZADOB LOADINGBA
1. Ellenőrizd, hogy PREVIEW v3 van felül, nem egy régebbi v1/v2 fül.
2. Kattints a 'Diagnosztika' gombra.
3. Kattints a 'Hibalista másolása' gombra és küldd el ChatGPT-ben a szöveget.
4. Ha a menü helyett csak a loading van, F12 Console is segít.
5. A 'Új tesztmentés' a helyi preview profilt állítja vissza. Ezt CSAK
   akkor használd, ha a tesztadatok nullázása is rendben van.

HOL FUT?
- 127.0.0.1:5178 (csak ezen a PC-n)
- A valódi Supabase URL/kulcs helyett a Preview oldal üres konfigurációt kap.
- A Content Security Policy tiltja a külső hálózati kapcsolódást.
- A mentés külön LOCAL PREVIEW browser localStorage kulcs alatt van.
- A valós Discord, cloud save, live mail és ranglisták nem tesztelhetők.
- A valódi szerveres gazdasági szabályok tesztverziója helyben fut.
- Nincs Github push vagy commit szükség.

További szerverállapot: http://127.0.0.1:5178/__preview__/health
Leállítás: Ctrl+C.
