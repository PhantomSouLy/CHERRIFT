# CHERRIFT roadmap — 0.6 → 1.0 BETA

Ez a terv különválasztja a stabilizálást, a tartalmat, az online rendszereket és a béta-előkészítést. Így egy verzió sem próbál egyszerre túl sok kockázatos dolgot megoldani.

This plan separates stabilization, content, online systems and beta preparation so each release has a clear, testable purpose.

## 0.6 — Quality foundation / Minőségi alap

**Cél:** a jelenlegi játék megbízhatóan induljon, navigálható és érthető legyen desktopon és telefonon.

**Goal:** make the current game consistently start, navigate and communicate well on desktop and mobile.

Ebben a 0.6.2 csomagban elkészült:

- kritikus Library/Skins kattintásblokkolás javítása;
- stabil boot folyamat kétnyelvű hibaoldallal, ha kötelező patch nem töltődik be;
- teljes HU/EN felületi lokalizáció és azonnali nyelvváltás;
- valódi kamera-zoom, tisztességes felső korláttal;
- dupla runindítás elleni védelem;
- háttérbe kerülés, beragadt billentyű és touch input javítása;
- mentésséma 5, backup-recovery, helyi napi reset;
- hibás assetútvonalak javítása;
- elérhető Daily/Achievements/Login Rewards/Shop navigáció;
- desktop- és mobil smoke teszt, asset- és szintaxisvalidálás;
- aktuális kétnyelvű dokumentáció.

**0.6 kilépési feltétel / exit criteria:** nincs ismert indulást vagy fő navigációt blokkoló hiba; a mentés migrálható; a Play, Pause, Main Menu, Library és nyelvváltás támogatott desktopon és mobilon.

## 0.7 — Content & progression / Tartalom és fejlődés

**Cél:** a stabil alapból valódi, ismét játszható tartalmi verzió legyen.

Fő feladatok:

1. World 3 teljes befejezése: saját pályaassetek, ellenfélsprite-ok, animációk, támadások, raid hullámok és végső boss; minden placeholder eltávolítása.
2. Bloom Chest sprite sheet bekötése, amint elkészül: zárt → rázkódó → nyíló → ritkaságfény animáció, reduced-motion alternatívával.
3. Gacha pity/duplikátum-kezelés, jutalom-előnézet és átlátható esélytábla; fizetős valuta nélkül is korrekt progresszió.
4. Pályák közötti nehézségi görbe, spawn-, HP-, sebzés-, XP- és coin-balance; külön mobil olvashatósági próba.
5. Első run onboarding: mozgás, aktív skill, XP, gear, Gacha és pályateljesítés rövid, átugorható bemutatása.
6. Daily Quests, Achievements, Login Rewards és Shop jutalmainak gazdasági egységesítése.
7. Több ellenféltípus és legalább egy egyedi mechanikájú boss világonként.
8. Hangcsomag bővítése: találat, pickup, skill, ládanyitás, boss/raid jelzés és hangerő-kategóriák.

**0.7 exit criteria:** World 1–3 elejétől végéig placeholder nélkül teljesíthető; egy új játékos külső segítség nélkül elindít és befejez egy run-t; a jutalomgazdaság nem akad el és nem enged végtelen ingyenes farmot.

## 0.8 — Accounts, cloud & live foundation / Fiók, felhő és online alap

**Cél:** opcionális, biztonságos cross-device profil és későbbi live funkciók alapja.

Fő feladatok:

1. Discord OAuth2 Authorization Code + PKCE belépés.
2. Szerveroldali token exchange Cloudflare Worker, Vercel Function, Supabase Edge Function vagy hasonló backend mögött. A Discord client secret **soha nem kerülhet a GitHub Pages kódjába**.
3. Vendégmód megtartása; meglévő helyi mentés összekapcsolása a Discord-fiókkal.
4. Verziózott felhőmentés, eszközütközésnél választási lehetőség: local, cloud vagy biztonsági másolat.
5. Rate limit, OAuth `state`/nonce ellenőrzés, rövid élettartamú session, kijelentkezés és fiókleválasztás.
6. Adatvédelmi tájékoztató, törlési/exportálási útvonal és opcionális telemetria-hozzájárulás.
7. Távoli, aláírt konfiguráció eventekhez és balanszhoz; a kliens ne dönthessen jutalmakról hitelesítés nélkül.
8. Hálózati hiba/offline fallback: a single-player játék belépés nélkül is működjön.

**0.8 exit criteria:** a Discord-login titok nem jut a kliensbe; mentés nem vész el összekapcsolás vagy konfliktus közben; offline vendégként minden single-player alapfunkció elérhető.

## 0.9 — Beta candidate / Bétajelölt

**Cél:** technikai és tartalmi fagyasztás előtt a projekt legyen karbantartható, gyors és mérhetően stabil.

Fő feladatok:

1. A jelenlegi 23 egymásra épülő patch script összevonása moduláris forrásba; egyértelmű boot sorrend és verziózott adatmodell.
2. Build pipeline, cache-busting és automatikus GitHub Pages deploy; visszagörgethető release artifact.
3. A kb. 100 MB assetkészlet auditja: duplikátumok, méretek, WebP/AVIF, sprite atlaszok, hangkompresszió és lazy loading.
4. Teljes save-migrációs teszt régi 0.2–0.8 mentésekkel, backup/rollback és import/export.
5. Böngésző-/eszközmátrix: Chrome, Firefox, Edge, Safari; Android/iOS; álló/fekvő mód; gyenge készülékprofil.
6. Teljes run automatizált tesztek, boss-, jutalom-, Gacha-, gear- és account tesztek; ismételhető balance-szimuláció.
7. Akadálymentesítés: billentyűzetes fókusz, képernyőolvasó címkék, kontraszt, reduced motion, színfüggetlen ritkaságjelzés.
8. Crash/error riport, teljesítménybudget és diagnosztikai export személyes adatok nélkül.
9. Tartalomfagyasztás, hibatriázs és minden felületen egységes HU/EN szövegellenőrzés.

**0.9 exit criteria:** nincs P0/P1 hiba; a fő run stabil a támogatott eszközmátrixon; a patch stack helyett karbantartható build készül; a régi mentések tesztelten migrálhatók.

## 1.0 — Public BETA / Nyilvános BÉTA

Az 1.0 itt tudatosan **BÉTA**, nem végleges kiadás.

Kiadási csomag:

- feature freeze és csak béta-blokkoló javítások;
- első indítási onboarding, verzió-/mentésfigyelmeztetés és könnyen elérhető feedback/bug report;
- publikus ismert hibák, adatvédelem, felhasználási feltételek és támogatási csatorna;
- fokozatos rollout, monitorozás, rollback-terv és külön béta mentésséma;
- szezon/event csak akkor, ha a szerveroldali jutalomellenőrzés kész;
- minimum egy teljesen befejezett, balanszolt tartalmi út World 1-től World 3 végéig;
- BÉTA utáni döntés adatok alapján: retention, run completion, crash rate, betöltési idő és játékosi visszajelzés.

**1.0 BETA exit criteria:** a nyilvános build biztonságosan frissíthető és visszagörgethető; a mentések védettek; a fő játékmenet teljes; a nyitott ismert hibák dokumentáltak, és egyik sem akadályozza a belépést vagy a run befejezését.

