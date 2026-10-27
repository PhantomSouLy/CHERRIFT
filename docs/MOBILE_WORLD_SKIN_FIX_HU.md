# CHERRIFT – mobilos world / skin javítás

Alap: c745978 (2026-10-27). Build: `1027-world-skin-fix`.

## Telepítés

A ZIP tartalmát másold a CHERRIFT repository gyökerébe, a meglévő fájlok felülírásával, majd commit + push. Várd meg a GitHub Pages frissítését, és töltsd újra a játékot. Az új buildazonosító friss JavaScript- és CSS-kéréseket indít.

A grafikai képeket nem kell újra feltölteni: a javítás a repositoryban már meglévő `savanna`, `red-desert`, `sand-desert`, `ruins`, `training/spider-lilies` csomagokat köti be.

A `player-api` szerveroldali javítása tesztelt, de még NINCS élesítve: az automatikus jóváhagyás-ellenőrzés a működő Edge Function teljes cseréjéhez külön kifejezett felhasználói engedélyt kért. A források a ZIP-ben benne vannak. A GitHub commit önmagában nem telepíti ezt a Supabase-függvényt; a Head GM-es skinmentés és az összes GM-pályaindítás javításának végleges működéséhez a szerverfrissítés is szükséges.

## Javított működés

- World 3–6: a régi PNG-k helyett az új, különálló assetek, a saját talaj és splash töltődik be. A low / medium / high a megfelelő exportot használja, az objektumok helye és ütközése nem változik minőségváltáskor.
- World 5–6 generáláskor is megőrzi a saját worldazonosítóját.
- Training: külön alap talaj, a teljes területet kitöltő különálló red spider lily objektumok. Az objektumok 256 egységes térbeli csoportokban vannak; rajzoláskor csak a kamera környéke kerül elő. A virágok átjárhatók, az előtérben a karaktert takaró virágok elhalványulnak. A dummy és a jutalommentes gyakorlás megmarad.
- A pályagrafika dekódolása a futam elindítása előtt befejeződik; sikertelen kérés időkorláttal hibát ad, és újrapróbálható.
- A Red Desert sziklaív két tartója külön ütköző alakzat, a közepe átjárható.
- Skin felszereléskor a menü és a játék ugyanazt a mentést használja.
- A szerver elfogadja az aktív, szerveroldalon birtokolt GM / Senior GM / Head GM címhez tartozó skin- és pályaelőnézeti választást. A választás nem ad végleges skinbirtoklást. Aktív GM címmel a pályák szerveroldali indítása is követi a kliens hozzáférési szabályát.
- A cím levételekor az előnézeti hozzáférés megszűnik; a szerver a valóban birtokolt tartalomra korlátoz. A megszerzett normál skinek felszerelése továbbra is megmarad.
- Ninja: a meglévő shuriken / katana és 360° skill működését ez a javítás nem írja át.

## Ellenőrzés

`npm run test:mobile-gameplay` az igazi Edge Function mentésellenőrző függvényét és az új pályamodult teszteli. Ellenőrzi a Head GM Ninja kiválasztását ismételt mentés/visszatöltés után, a jogosulatlan próbálkozásokat, a normál birtokolt skineket, a GM cím levételét, a valódi exportfájlokat és méreteket, az ütközést, a minőségváltást és a virágok kamerához kötött lekérdezését.

`npm run smoke -- --case=gm-phone` 390×844-es automatizált DOM/képernyőméretű környezetben a teljes alkalmazást tölti be. Natív gombokkal Ninját választ, felszereli, a tényleges szerveres ellenőrzővel ment, World 6-ot indít, ellenőrzi a létrejött Ninja szereplőt, majd a virágos Training pályát és a dummyt. Ez szimulált böngészőkörnyezet, nem fizikai Androidon végzett FPS-mérés.

A CI megkapta az új mobilos regressziós esetet és a célzott funkciótesztet is.
