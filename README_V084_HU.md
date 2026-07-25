# CHERRIFT v0.8.4 – PC UI javítások és mobilbiztonsági frissítés

Ez a csomag a jelenlegi **v0.8.3 Icons Update** állapotra épül.

## Telepítés a játékhoz

1. Készíts biztonsági mentést a CHERRIFT repóról.
2. A ZIP-ben található mappák és fájlok **tartalmát** másold közvetlenül a CHERRIFT gyökerébe, ahol az `index.html` található.
3. Engedélyezd a `src/main.js` felülírását.
4. Ellenőrizd, hogy ezek létrejöttek:
   - `src/cherrift_v084.js`
   - `v084.css`
   - `supabase/functions/submit-report/index.ts`
   - `supabase/config.toml`
5. Commit + push után a GitHub Pages oldalon használj `Ctrl + F5` frissítést.

## Javított PC-s pontok

- Stabil, panelen belül maradó hét Gear slot.
- Arsenal ikonháttér eltávolítása, olvasható csillagok és nagyobb material sor.
- Gear Scrap kiemelése és új ikonja az Arsenal walletben.
- Nagyobb, háttér nélküli Skill Tree ikonok és olvashatóbb node-ok.
- Kompakt Player Level / Skill Point blokkok, nagy görgetőnyilak, segítőszöveg nélkül.
- Újrendezett Stat részletek, nagyobb címkék és magyar statnevek.
- Teljes inventory-jellegű BAG kategóriafülekkel, item griddel és részletpanellel.
- Blossom Gem ikon a Shop áraknál, rarity-színű itemkártyák.
- Letisztított Gyűjtemény és kattintható Skin / Enemy részletes nézet.
- A globális resource bar nem úszik rá a tartalomra és nem duplázódik.
- Beállítások navigáció és Heti jutalom vissza gomb javítása.
- Főmenü jobb oldali oszlopának ütközésmentes elrendezése.
- Barátibb Bug Report, legfeljebb három képcsatolással.
- Feedback felület vizuálisan változatlan marad.

## Mobilvédelem

A PC-s Gear-slot átrendezés csak 821 px fölött aktív. A BAG, Skill Tree, Stat Details, Collection modal és report csatolmányok külön mobil töréspontokat kaptak. A meglévő mobil alsó navigáció és menülogika nem került lecserélésre.

# Discord Feedback és Bug Report – Supabase beállítás

A Discord webhook URL-eket **ne tedd a frontendbe és ne commitold GitHubra**.

## 1. Discord webhookok

Hozz létre két külön webhookot:

- Feedback Discord-szoba
- Bug Report Discord-szoba

## 2. Supabase secretek

A Supabase projektben add hozzá:

```text
DISCORD_FEEDBACK_WEBHOOK=<feedback webhook URL>
DISCORD_BUG_REPORT_WEBHOOK=<bug report webhook URL>
```

Dashboard útvonal általában:

```text
Project Settings / Edge Functions / Secrets
```

CLI-vel:

```bash
supabase secrets set DISCORD_FEEDBACK_WEBHOOK="..."
supabase secrets set DISCORD_BUG_REPORT_WEBHOOK="..."
```

## 3. Edge Function telepítése

A CHERRIFT repo gyökerében:

```bash
supabase login
supabase link --project-ref qkukvltevryegjbnwcgg
supabase functions deploy submit-report --no-verify-jwt
```

A `supabase/config.toml` már tartalmazza:

```toml
[functions.submit-report]
verify_jwt = false
```

## Mit véd a Function?

- a webhook URL csak Supabase secretként létezik;
- Discord mentionök tiltva vannak;
- legfeljebb 3 kép küldhető;
- képenként 6 MB, összesen 18 MB a limit;
- csak PNG, JPG és WEBP engedélyezett;
- szöveghossz-ellenőrzés;
- egyszerű IP-alapú időkorlát;
- Feedback és Bug Report külön Discord webhookra megy.

A Function nyilvánosan hívható, mert Guest játékosok is jelenthetnek hibát. Erősebb, hosszú távú spamvédelemhez később Cloudflare Turnstile vagy adatbázis-alapú rate limit ajánlott.

## Fontos

A Discord-integráció a két secret és az Edge Function telepítése előtt nem tud üzenetet küldeni. Ilyenkor a kliens a jelentést a vágólapra másolja, így a játékos nem veszíti el a szöveget.
