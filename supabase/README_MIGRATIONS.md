# CHERRIFT migrációk

A `supabase/migrations` fájljai az adatbázis teljes felépítési és javítási láncát
tartalmazzák. Ezeket a Supabase CLI és a GitHub–Supabase integráció használja;
a már lefutott fájlok is szükségesek az előzmények egyeztetéséhez és egy új
adatbázis/preview felépítéséhez.

Minden SQL-fájl egyedi, 14 számjegyű verzióval kezdődik. Egy napon belül is
külön verzió kell minden fájlnak. Új migrációt a `supabase migration new <név>`
paranccsal kell létrehozni, majd a fájlt a kóddal együtt commitolni.

## A 2026-10-26-i rendezés

A régi, nap pontosságú verziók között két `20260731` és négy `20260809`
azonosító ütközött. Az örökölt fájlok egyedi 14 számjegyű verziót kaptak.
Az economy séma a chest-only javítás elé került; a GM-cím függvény a rá
hivatkozó profilcsomag elé került. A mentési jogosultsági védelem a régi
általános migrációk után kerül alkalmazásra.

Az éles adatbázison korábban kézzel alkalmazott történeti változásokat a
`20261026022249_reconcile_legacy_migration_versions.sql` rögzíti a migrációs
nyilvántartásban. A régi adatfrissítéseket nem futtatja újra. Helyreállítja a
legutóbbi szerverfüggvényeket és mentési védelmet, mert a hibás első automatikus
futtatás a régi triggert és függvényeket visszaírta.

A save/GM hotfix az opcionális régi `player_saves` és egyéb objektumokat csak
akkor módosítja, ha azok léteznek. Így friss preview adatbázison is futtatható.

## Ellenőrzés

`npm run validate`: fájlnévformátum és duplikált migrációverziók ellenőrzése.

`npm run test:migrations`: az összes SQL végigfuttatása izolált PGlite PostgreSQL
adatbázison, majd idempotens újrafuttatás és a korábbi részleges migrációs
nyilvántartás javításának tesztje. A teszt ellenőrzi a játékosadatok megőrzését,
a végső mentési triggert és a szerveroldali írási jogosultságot. A Supabase által
biztosított auth alapsémát és szerepeket a teszt előállítja; csak a pgcrypto
extension telepítőutasítását hagyja ki, mivel a teszt PostgreSQL-ben a használt
gen_random_uuid függvény natívan rendelkezésre áll.

Mindkét ellenőrzés része az npm tesztfolyamatnak és a GitHub CI-nak.

A rendezés után a teljes helyi változtatáscsomagot kell commitolni és pusholni:
a régi fájlnevek eltűnését, az új fájlneveket, az új helyreállító migrációt,
a validátort, a replay tesztet, a package fájlokat és a CI-frissítést együtt.
