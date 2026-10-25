# Bejelentkezés, pályaindítás és menühangok javítása

## Mi változott

- A Play megvárja az adott fiók már folyamatban lévő felhő-helyreállítását.
- Ha a korábban sikertelen mentés újraküldése ismét hibázik, a kliens megpróbálja betölteni a szerver hiteles mentését. A különböző helyi másolatot a fiókhoz kötött helyreállítási tárolóban megőrzi; sikertelen megőrzés esetén nem dobja el.
- A tokenfrissítés az aktuális munkamenetet frissíti, és szükség esetén újrapróbálja a felhőkapcsolatot, ismételt fiókbetöltés nélkül.
- A Play a kattintáskor kiválasztott fejezetet kéri a szervertől. A felhő betöltése vagy egy korábbi futam lezárása nem válthatja vissza egy régebbi fejezetre.
- A pályafeloldás, a GM-hozzáférés és az indítási jegy ellenőrzése továbbra is szerveroldali.
- A menühang a tényleges gomb kattinthatóságát ellenőrzi. A díszítő szülőréteg `pointer-events: none` beállítása nem némítja el a külön engedélyezett gombot.
- Az új fejezetválasztó Play és a GM Training kiemelt hangot kap; a világválasztó tovább gombja normál kattintást. Az új skin- és világkártyák lapozóhangot kapnak.
- A hangkezelő az online műveletek eseménykezelője előtt töltődik be, így a megvásárláskor elfogott kattintásnak is van hangja. A szintetikus továbbküldött kattintások nem duplázzák a hangot.
- A hangok és a betöltés célzott tesztjei a GitHub Actions ellenőrzésben is futnak.

## Ellenőrzés

- 68/68 célzott teszt sikeres: hitelesítés és integritás, felhőből helyreállított GM/normál pályaindítás, korábbi futam lezárása, szerveres jogosultságok, menühangok, fejezetválasztó, betöltés és a valódi Edge Function helyi integrációja.
- A hibás fejezetindítást az új teszt a javítás előtt reprodukálta: a kiválasztott `world_1_2` helyett `world_1_1` indult. Javítás után mindkét fióktípussal a megfelelő fejezet indul.
- A teljes `gm-returning-session` smoke eset utolsó futása sikeres (56,7 s). Egy korábbi, párhuzamos helyi futás a betöltőréteg eltűnésének 10 s-os várakozásán túlfutott; futásidejű JavaScript-hibát nem jelzett. Az ismételt futás sikerült, a határidőket nem emeltük meg.
- A forrásellenőrzés sikeres: 76 JavaScript, 29 CSS, 107 forrásfájl. A diff whitespace-ellenőrzése sikeres.
- Az előző ellenőrzésben böngészőből a teljes új menü → világ → fejezet → Play útvonalon elindult a helyi tesztpálya, és megjelent a HUD.

## Éles állapot

A módosítások a helyi CHERRIFT projektben vannak. Commit, push és éles telepítés nem történt. A felhasználó éles böngészős munkamenetéhez nincs közvetlen hozzáférés; a képernyőképen szereplő hiba pontos hálózati kiváltó oka ezért nem igazolt. A korábban átnézett Supabase-napló sikeres Discord-hitelesítést mutatott. Az éles munkamenettel a frissített oldal közzététele után lehet visszaellenőrizni.

Mentést, GM-jogosultságot és éles adatbázist a javítás nem módosított.
