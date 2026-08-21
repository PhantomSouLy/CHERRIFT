# CHERRIFT Auth Bootstrap v2

## Mi romlott el

A `0.9 CLEANUP` után a production indulás és a CI eltért egymástól. A boot teszt egy külön, sikeres Supabase/Storage mockot használt, ezért zöldre vált akkor is, amikor a valódi oldal az `auth.bootstrapSave` lépésben maradt. A későbbi startup hotfixek timeoutokat tettek a meglévő rétegekre, de továbbra is a nagy, összevont `cherrift_app.js` auth blokkját javítgatták kívülről.

Az Auth v2 egyetlen karbantartott modulba került: `src/cherrift_auth.js`. A régi, bundle-be ágyazott auth blokk az external-auth jelző miatt nem fut.

## Indulási szerződés

1. A Supabase kliens pontosan egyszer jön létre.
2. A session ellenőrzés legfeljebb 6 másodpercig blokkolhatja az indulást.
3. Session nélkül a helyi Guest-mentés töltődik be, majd csak a teljes `UI.init` után nyílik meg a Guest/Discord választó.
4. Discord-sessionnel a `player-api/bootstrap_save` a hitelesített UUID mentését tölti be.
5. A cloud bootstrap legfeljebb 12 másodpercig blokkolhat.
6. Cloud hiba esetén csak az ugyanahhoz az UUID-hez kötött, tulajdonosmezővel is ellenőrzött helyi account-backup használható.
7. Másik Discord-fiókra váltáskor minden függőben lévő mentés és revision állapot törlődik, ezért az előző fiók haladása nem kerülhet át.
8. A Mail, Reward és egyéb Live Services ugyanazt a Supabase klienst használják; nem indítanak második Auth lockot.

## Guest mód

- A Guest-mentés a `CherriftStorage` helyi kulcsán marad.
- Discord belépés nem importálja automatikusan a Guest-haladást.
- Kijelentkezéskor a külön Guest-mentés töltődik vissza.
- A World 1 Chapter 2 utáni Discord-kérés továbbra is a Security UI feladata.
- Closed Beta alatt a Guest ideiglenesen kikapcsolható a `src/supabase_config.js` fájlban:

  ```js
  guestEnabled: false
  ```

  Ezt csak akkor kapcsold ki, amikor a Discord whitelist kapu már működik.

## Discord és cloud save

- Böngészőben kizárólag a Supabase publishable kulcs lehet.
- Discord Client Secret és Supabase service-role/secret kulcs nem kerülhet GitHubra vagy kliensoldali JavaScriptbe.
- A böngésző közvetlenül csak a saját `game_saves` sorát olvashatja.
- Minden mentésmódosítás a `player-api` Edge Functionön keresztül történik.
- A Function újra ellenőrzi a JWT-t, és a payload `security.accountOwnerId` értékét az Auth UUID-hez köti.
- Az `expected_updated_at` védi a mentést a régi böngészőfülek felülírásától.

## Supabase deploy ellenőrzőlista

1. A `game_saves.sql` és az account-isolation migráció legyen alkalmazva.
2. A `player-api` és `gm-api` Edge Function legyen deployolva.
3. A Function secretjei a Supabase Dashboardban legyenek, ne a repóban.
4. Authentication → Providers → Discord legyen bekapcsolva.
5. Authentication → URL Configuration tartalmazza a játék és GM oldalakat:

   ```text
   https://phantomsouly.github.io/CHERRIFT/
   https://phantomsouly.github.io/CHERRIFT/gm/
   http://localhost:8000/
   http://localhost:8000/gm/
   ```

6. A Discord Developer Portal redirectje továbbra is a Supabase callback:

   ```text
   https://qkukvltevryegjbnwcgg.supabase.co/auth/v1/callback
   ```

## Tesztek

```bash
npm ci
npm test
```

A smoke mátrix hét esetet futtat:

- desktop;
- short desktop;
- phone portrait;
- phone landscape;
- returning Discord session;
- végtelen `getSession` szimuláció;
- végtelen `bootstrap_save` szimuláció.

Az utolsó két eset akadályozza meg, hogy a korábbi 57%-os végtelen splash hiba ismét zöld CI mellett kerüljön productionbe.
