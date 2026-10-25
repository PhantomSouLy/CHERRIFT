# A recovery_storage_unavailable hiba javítása

## Megtalált ok

A hibakód a böngésző helyi helyreállítási másolatának sikertelen írását jelenti. A GitHub main ágán lévő kódban a másolatok egyetlen, korlátlanul növekvő localStorage tömbbe kerültek. Ha az írás nem sikerült, a kliens cloudReady=false állapotra váltott, és letiltotta a pályaindítást és az online műveleteket akkor is, ha a Discord-hitelesítés és a Supabase szerver működött.

A GM-előnézet a kliensen ideiglenesen minden skint és pályát felold. Az összehasonlítás ezt tényleges haladáskülönbségként kezelte a szerver válaszához képest; így automentéseknél indokolatlan helyreállítási másolatok keletkezhettek.

További téves eltérés volt, hogy a menü a hiányzó képességszinteket nullás értékekkel normalizálja. Ezek azonos állapotot jelentenek, de az összehasonlítás eltérésnek vette őket. A javítás a mezősorrendtől és a hiányzó/nullás képességszintektől függetlenül hasonlít, miközben a valódi szintemelések és resetek továbbra is különbségnek számítanak.

A kijelentkezési ablak külön hibája volt, hogy a korábbi hibakulcsot és hibaleírást nem lehetett üres értékkel törölni. Emiatt a már lezárt kapcsolat régi hibája tovább látszott.

## Javítás

- A helyreállítási archívum külön IndexedDB adatbázisba kerül, fiókonként elkülönítve.
- A régi localStorage archívum valamennyi rekordját átköltöztetjük. A forrás csak a sikeres adatbázis-tranzakció után kerül ki a régi helyéről, és csak akkor, ha közben egy másik lap nem változtatta meg. Írási hiba esetén a régi adat megmarad.
- Az átköltöztetés a Discord/OAuth kliens létrehozása előtt is lefut, hogy az új bejelentkezési tokennek is legyen helye.
- Ha IndexedDB nem használható, a korábbi helyi tárolás a tartalék út. A kliens sikertelen írást nem jelent sikeres adatmegőrzésként.
- A GM ideiglenes feloldásait a korábban ténylegesen birtokolt listák alapján hasonlítjuk össze. Valódi haladáskülönbség továbbra is megmarad külön másolatként.
- A Fiók beállításainál az új és a régi helyről származó másolatok is letölthetők.
- A tárhelyhiba külön, érthető szöveget kap; nem általános felhőhibaként jelenik meg. Kijelentkezés után a régi hiba törlődik.
- A belépési réteg eltűnéséhez tartalék időzítés is tartozik, ha a böngésző nem szolgáltat animációs képkockákat.

## Ellenőrzés

78 célzott teszt sikeres, köztük a telített tároló, a sikertelen IndexedDB-tranzakció, párhuzamos archiválás, fiókváltás, kijelentkezés, 25 GM-automatikus mentés és a valódi API-kezelő helyi integrációja.

Valódi böngészőben, elkülönített helyi tesztoldalon a native QuotaExceededError állapotig töltöttük a tárolót. A javítás után a napló eredménye:

```json
{"cloudReady":true,"legacyRemoved":true,"archivedCopies":2}
```

A két korábbi másolat megmaradt; a tesztfiókkal ezután a főmenü → világ → fejezet → Play útvonalon elindult a World 1-1 pálya. A HUD 17 másodpercnél 14/120 ellenfelet mutatott, konzolhiba nélkül.

A teljes GM-indítási smoke teszt is sikeres: a valódi alakú szerveres válaszokkal végzett három ismételt automentés nem hoz létre fölösleges helyreállítási rekordot. A végső futás 68,1 s alatt befejeződött.

A forrásellenőrzés és a diff ellenőrzése is sikeres.

A Supabase-ben a felhasználó mentésének meglétét csak olvasással ellenőriztük; az élő mentést és jogosultságokat nem módosítottuk.

## Közzététel és használat

Az új build azonosítója `1025-recovery-storage-fix`. A változások helyi projektfájlok; commit/push és éles telepítés nélkül a GitHub Pages oldalon még a korábbi kód fut.

Frissítés után elég az oldal újratöltése és a normál Discord-belépés. Nem kell törölni a böngésző összes adatát: az új kód a régi helyreállítási másolatokat maga költözteti át.

Háttér: [MDN – böngészős tárhelykvóták](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).
