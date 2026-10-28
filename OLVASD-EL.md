# CHERRIFT – Sakura Dance betöltés és CI-javítás

A ZIP-ben lévő `index.html` fájllal írd felül a GitHub repository gyökerében lévő `index.html` fájlt. Más fájl cseréje nem szükséges ehhez a javításhoz.

Az aktuális projekt manifestjének buildazonosítója: `1028-succubus-legs2`. Az indexben keveredett ezzel a `1028-sakura-dance1`, emiatt az ellenőrzés megállt. A javítás az összes saját böngészős hivatkozást a manifesthez igazítja.

A Sakura Dance két modulja már megvan a repositoryban, de az indexből hiányzott a betöltésük. A javítás a meglévő modulok után, helyes sorrendben betölti a lábkezelést és a karakter animációs modulját.

Ellenőrzés: az eredeti `tools/validate.mjs` buildazonosító-ellenőrzése a korábbi indexen hibát ad, a javított indexen sikeres. A GitHub aktuális fájlfája alapján az index összes helyi script- és stílusfüggősége létezik. A teljes GitHub Actions-futást a fájl feltöltése után lehet ellenőrizni.

Közvetlen GitHub-mentés nem történt: az integráció íráskor 403 (Resource not accessible by integration) hibát adott.
