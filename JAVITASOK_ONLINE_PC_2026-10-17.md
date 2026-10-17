# PC-s felület és online mentés – javítási jegyzet

Az offline fejlődés helyett a kért, online szerverműveletekre épülő működés készült el. A böngészős harc megjelenítése és vezérlése megmaradt; a tartós jutalmakat és költségeket a szerver számolja. A változások ebben a munkapéldányban vannak, nincsenek élesítve.

## PC-s kezelőfelület

- Külön sorba kerültek a főmenüpontok és az egyenleg/fiók/Energy gombok. A navigációhoz nem kell a zsúfolt fejlécet oldalra görgetni a vizsgált PC-méreteken.
- Nagyobb, olvasható feliratok és kattintási felületek; látható billentyűzetfókusz; egyértelműbb aktív menüpont.
- Egyetlen másodlagos navigáció maradt. A korábbi runtime-féle duplikált menü megszűnt.
- Alacsony laptopnézetben két oszlopos gyorsmenü és kisebb fejléc; a panelek a tényleges fejlécmagassághoz igazodnak.
- Javítva a Gacha Vissza gombja: a ládapanel és jutalomablak is bezáródik, a jelenlegi router visz a főmenübe.
- Egységes `1000-online-integrity` assetverzió, amit a validátor a manifestből ellenőriz.

## Mentések és fiókváltás

- A helyi biztonsági mentés külön tárolja, hogy van-e még el nem ismert módosítás, és melyik szerverrevízióból indult.
- Újratöltéskor az el nem ismert másolatot a kliens nem írja felül feltétel nélkül. Eltérő szerverrevíziónál külön helyreállítási példány készül.
- Korábbi offline haladás az új online szabályok mellett nem válhat automatikusan hiteles jutalommá. Az eredeti másolat megmarad; a Fiók beállításainál letölthető JSON-ként, GM általi ellenőrzéshez.
- Hálózati válasz csak az indulásakor aktív fiókhoz és session-generációhoz írhat UI-t, revíziót vagy backupot. Ugyanez védi a Live Services válaszait is.
- Régebbi írás visszaigazolása megőrzi a közben keletkezett újabb, még szinkronizálatlan másolatot.
- Elveszett művelet-visszaigazolásnál az újrapróbálás ugyanazt a műveletazonosítót használja. A szerver visszaadja a korábbi eredményt, és nem oszt újra jutalmat.

## Szerver által kezelt fejlődés

A `save_progress` csak megjelenítési beállításokat és már megszerzett tartalom kiválasztását fogadja el. Nem írhat valutát, XP-t, szintet, tárgyat, feloldást, címet, entitlementet vagy futamállapotot.

A `game_action` névvel és azonosítókkal megadott műveleteket kezel:

- Futamindítás, ellenőrzőpont, futamzárás és megszakítás; egyszeri Energy-költség, pályajutalom és feloldás.
- Ládanyitás szerveroldali sorsolással, pityvel, duplikált skinek átváltásával és inventorykorláttal.
- Láda, skin és étel vásárlása; ételhasználat; Energy-refill és italok, napi limitekkel.
- Felszerelés, levétel, zárolás, eladás, betörés és merge.
- Arsenal-, Skill Tree- és Elemental-fejlesztés, visszaállítás, szerver által ellenőrzött költséggel és előfeltételekkel.
- Napi/heti küldetések, login, event, welcome és achievement jutalmak, egyszeri átvételi állapottal.

Az entitlementek a szerver `account_entitlements` táblájából származnak. A ranglista a mentett, szerver által számolt Power/szint értéket használja; a kérésben küldött értékek nem számítanak. A jutalmazható legjobb helyezéshez legalább 100 aktív résztvevő kell. A helyi tesztlevelek nem adhatnak tartós jutalmat; a valódi levelek és redeem továbbra is a szerveroldali RPC-ket használják.

A napi elszámolás UTC szerint történik. A közös szabálykatalógus a ténylegesen összerakott kliensdefiníciókból készül: `npm run catalog:build`. Balance-, pálya-, skin-, gear-, skill- vagy achievement-definíció módosításakor ezt újra kell generálni és ellenőrizni.

## Fontos működési korlát

A futamellenőrzés szerver által kiadott futamazonosítót, pályafeloldást, időkorlátot, kill-határt és monoton ellenőrzőpontokat vizsgál. Ez **nem teljes szerveroldali harcszimuláció**: a mozgás, ütközések és találatok számítása továbbra is a böngészőben fut. Manipulált harckliens ellen teljes védelemhez a harc hiteles szerveroldali szimulációja vagy visszajátszása külön fejlesztés. A nyers pénz-/XP-/itemértékek feltöltésével történő csalást ez a változás lezárja.

Az online jutalomelszámolás most ellenőrzőpontonként történik, szerveroldali loot- és XP-számítással. A kliens által csak helyben mutatott, még nem elismert harci loot nem kerülhet közvetlenül a mentésbe. Ennek hosszabb távú balanszát a hat világ végigjátszásával is mérni kell.

## Ellenőrzés és telepítés

A teljes `npm test` sikeresen lefutott a beállított audit-Pythonnal: 28 célzott teszt, az API integrációs tesztje, Auth lock/timeout teszt és mind a 8 smoke-eset. Az audit nem talált szintaxis-/szignatúrahibát. A Deno-típusellenőrzés és a `git diff --check` is sikeres volt.

- `npm run test:integrity`: célzott mentési, fiókváltási, gazdasági és fejlődési tesztek.
- `npm run test:online-api`: a tényleges Edge Function handler próbája eldobható, memóriában tárolt tesztadatokkal; hamisított feltöltés, jogosultsághatár, ismételt kérés és párhuzamos írás.
- `npm run smoke`: a nyolc indulási eset, külön ellenőrzéssel arra, hogy az online hookok bekapcsoltak és a vendég nem indíthat jutalmat adó játékot.
- `npm run validate`, Deno-típusellenőrzés és `git diff --check`.
- Kézi böngészős vizsgálat: 1280×720 és 1128×584 PC-navigáció; szerver által sorsolt ládanyitás, futamindítás, szintlépés és futamzárás a helyi integrációs szerveren. A szerver nyilvántartásában az indítás és zárás is megjelent; első ellenőrzőpont előtti halálkor nem adott jutalmat és nem vont Energyt.

Az önálló helyi integrációs környezet: `node tools/test_online_server.mjs`, majd `http://127.0.0.1:8082`. Ez kizárólag tesztfiókot és memóriában élő adatokat használ. Leállításakor minden ilyen adat eltűnik; éles Discord- vagy Supabase-adatot nem módosít.

A csatlakoztatott CHERRIFT Supabase-projekt állapota az ellenőrzéskor **INACTIVE** volt (`qkukvltevryegjbnwcgg`). Éles használathoz:

1. A Supabase-projekt újraindítása a Dashboardon.
2. A `player-api` újratelepítése az új `_shared/gameplay.mjs` és `_shared/game_catalog.json` fájlokkal együtt.
3. Valódi tesztfiókkal belépés, frissítés, ládanyitás, futam, jutalom, fiókváltás, mail/redeem és több tab próbája.
4. Csak ezután a kliens kiadása. Régi szerverhez kapcsolódó új kliens jutalmazó műveletei szándékosan nem indulnak el.

Új adatbázismigráció nem készült. A már meglévő mentéseket nem töröltem és nem nulláztam. A telepített adatbázis sémáját és az éles működést az inaktív projekt miatt még nem lehetett igazolni.
