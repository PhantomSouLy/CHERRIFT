# CHERRIFT Supabase + Discord beállítás / setup

## Magyar

A kliensoldali integráció készen áll, de a Discord Developer Portal és a Supabase Dashboard címeinek pontosan egyezniük kell.

### 1. Discord alkalmazás

1. Nyisd meg a Discord Developer Portalt, majd az alkalmazásod `OAuth2` oldalát.
2. A Redirects listához add hozzá pontosan ezt a Supabase callback címet:

   ```text
   https://qkukvltevryegjbnwcgg.supabase.co/auth/v1/callback
   ```

3. Másold ki a Discord Client ID-t és Client Secretet. A secretet csak a Supabase Dashboardban add meg; **soha ne kerüljön a GitHub repositoryba vagy böngészős JavaScriptbe**.

### 2. Supabase Discord provider

1. Supabase Dashboard → Authentication → Providers → Discord.
2. Kapcsold be a Discord providert.
3. Add meg a Discord Client ID-t és Client Secretet, majd mentsd el.

### 3. Engedélyezett webcímek

Supabase Dashboard → Authentication → URL Configuration:

- Site URL:

  ```text
  https://phantomsouly.github.io/CHERRIFT/
  ```

- Redirect URLs:

  ```text
  https://phantomsouly.github.io/CHERRIFT/
  http://localhost:8000/
  ```

A GitHub Pages útvonal kis- és nagybetűérzékeny, ezért a `CHERRIFT` részt pontosan így add meg.

### 4. Teszt

Helyi indítás:

```bash
python -m http.server 8000
```

Nyisd meg a `http://localhost:8000/` címet, várd meg a loadert, majd válaszd a Discord Login lehetőséget. Sikeres belépés után a Discord-név és avatar megjelenik a főmenüben és a Settings → Account oldalon.

### Fontos

- A `sb_publishable_...` kulcs nyilvános böngészős kulcs; a service-role kulcs és a Discord secret nem nyilvános.
- Ez a frissítés az azonosítást és a sessiont készíti el. A játékmentés még `localStorage`-ban marad.
- Felhőmentéshez külön `game_saves` tábla, felhasználónkénti Row Level Security és konfliktuskezelés szükséges.
- A Supabase által küldött `server.ts`, `middleware.ts` és `page.tsx` Next.js-projekthez való. A CHERRIFT statikus GitHub Pages oldal, ezért a böngészős Supabase kliens a helyes megoldás.

## English

The client integration is ready, but the Discord Developer Portal and Supabase Dashboard URLs must match exactly.

1. In the Discord application OAuth2 settings, add this redirect:

   ```text
   https://qkukvltevryegjbnwcgg.supabase.co/auth/v1/callback
   ```

2. Enable Discord under Supabase Dashboard → Authentication → Providers and enter the Discord Client ID and Client Secret there.
3. Under Authentication → URL Configuration set the Site URL to `https://phantomsouly.github.io/CHERRIFT/` and allow both that URL and `http://localhost:8000/` as Redirect URLs.
4. Never commit the Discord Client Secret or a Supabase service-role key.
5. This update provides identity and session handling. Game progress remains in browser `localStorage` until a protected save table and Row Level Security policies are added.
