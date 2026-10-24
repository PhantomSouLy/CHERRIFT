# Sakura ösvény – PC betöltőképernyő

Dátum: 2026. október 24.
Projekt: C:/Users/phant/Documents/GitHub/CHERRIFT

## Elkészült

A jóváhagyott második koncepciót a játék PC-s induló és pályabetöltő képernyőjébe építettem. A főmenübe lépést kérő felirat csak az induló képernyőn jelenik meg; a pályabetöltés a játék eredeti folyamatát követi. A telefonos kompozíciót nem alakítottam át.

- Tiszta, UI nélküli rózsaarany sakuratáj, valódi külön logóval és betöltőelemekkel.
- Külön mozgó lebegő szigetek, szélben finoman lengő előtéri ág, hulló szirmok és sodródó köd.
- A tó felszínén finom hullámzás és külön mozgó fénycsíkok a vízeséseken.
- Íves betöltővonal, amely a tényleges betöltési értéket követi.
- Cherry az eredeti assets/ui/loading_sprite_sheet.png fájlból animálódik az ív mentén. A sheet Git-ellenőrzőösszege változatlan: e6156733ee78201c5744ebf79b427cded530607b.
- A valódi készenlét elérésekor a csík 100%-ra fut. Az utolsó 550 ms-os vizuális feltöltés befejezésére 600 ms várakozást hagytam; közben a továbblépés nem aktív.
- Ezután Cherry eltűnik, és megjelenik a finoman pulzáló Press any button, alatta a kis vonalas-gyémántos dísszel.
- Bárhol bal kattintva vagy normál billentyűt lenyomva egyszer nyílik meg a főmenü. Az indító esemény és az áttűnés alatti ismételt esemény nem aktiválja a mögötte megjelenő főmenügombot.
- A böngésző billentyűparancsai, a nyomva tartott billentyű ismétlése és a szövegbeviteli kompozíció nem léptetik át a képernyőt.
- Csökkentett mozgásnál nincs folyamatos háttérmozgás, és nincs szükség a vizuális feltöltési késleltetésre. A rejtett jelenetek mozgását szüneteltetem.

## Méretek

Új runtime képek: assets/ui/loading/sakura-path/

| Fájl | Felbontás | Méret |
|---|---:|---:|
| landscape.webp | 1672 × 941 | 343 100 bájt |
| floating-island.webp | 354 × 420, alfa | 56 596 bájt |
| sakura-branch.webp | 1100 × 440, alfa | 131 668 bájt |
| Összesen | | 531 364 bájt |

A meglévő logó és Cherry sheet külön, változatlan forrás. A táj nem tartalmaz ráégetett feliratot, logót, progress bart vagy Cherry figurát.

## Érintett kód

- assets/cherrift_desktop_loading.css – az új PC-s kompozíció és animációk.
- src/cherrift_desktop_loading.js – külön képrétegek, valódi progress érték követése és a rejtett animációk szüneteltetése.
- src/cherrift_boot.js – a kész állapot késleltetett megjelenése, Press any button és a bárhol kattintás/billentyű kezelés.
- index.html és src/cherrift_manifest.json – egységes 1024-sakura-petals-2 gyorsítótár-verzió, az új PC-s háttér előtöltése.
- tools/boot_start.test.mjs és tools/desktop_loading.test.mjs – a készenlét, bevitel és megjelenítés célzott ellenőrzése.
- package.json – npm run test:boot-start parancs; az új teszt a teljes tesztparancsban is szerepel.

## Ellenőrzés

- 16/16 célzott teszt sikeres.
- A projekt JavaScript-, CSS- és fájlhivatkozás-ellenőrzése sikeres.
- A visszatérő, bejelentkezett felhasználó teljes indulási tesztje sikeres, 1280 × 760-as tesztkörnyezetben.
- Valódi böngészőben megjelent a kész állapot, a K billentyű a főmenübe léptetett. Az előnézet hátterére kattintva szintén működött a továbblépés.
- A rövid, 1128 × 584-es PC-ablakban is ellenőriztem a kompozíciót.
- A szóköz- és sorvége-ellenőrzés sikeres.

## Mellékelt előnézet

A sakura-path-animalt-elonezet.html önálló, minden képet és szükséges kódot tartalmazó böngészős PC-előnézet. Nem igényel helyi kiszolgálót vagy bejelentkezést. Ebben a bemutatóban egy szándékos, kb. 6,5 másodperces előkészítési várakozás teszi láthatóvá az animációt; a játékban a valódi betöltési folyamat vezérli a csíkot. Továbblépés után újrajátszható. A bemutató nem a teljes játékot csomagolja be.

A sakura-path-kesz.png a játékban megjelenő kész állapot képe. A sakura-path-betoltes.png az önálló előnézet futó Cherryvel látható betöltési állapota.

## Képalkotás

Eszköz: beépített imagegen. A jóváhagyott második koncepcióból készült tiszta háttér, valamint két külön átlátszó réteg. A generált képeket a runtime számára WebP-re optimalizáltam. Az eredeti generált PNG-k a Codex generated_images mappájában maradtak; a játék kizárólag a projektbe mentett WebP rétegekre hivatkozik.

### bg – teljes prompt

Use case: precise-object-edit. Input is the approved CHERRIFT Sakura Path loading screen mockup. Create the clean production BACKGROUND PLATE for the exact same composition, full landscape 16:9. Remove ALL user-interface graphics: remove the big CHERRIFT logo including rabbit emblem, all lettering, Loading complete, 100%, Press any button, the thin bottom glowing progress arc, all its blossom endpoints and ornaments, and the small running Cherry character. Seamlessly reconstruct the scenic sky, river and scenery behind every removed graphic. Keep the beautiful rose-gold dawn, sakura valley, cliffs, distant purple crystalline castle on the upper right, waterfalls, luminous lake reflections, framed blossom trees, architectural lanterns, mist, light direction and painterly-anime quality. Also remove the isolated floating rocky island at upper-left around x25% y10% and tiny isolated floating island above the castle around x67% y10%: rebuild clean sky there, these will be separate animated overlays. Leave the main castle and its broad supporting landmass intact. Keep the image calm and readable in the lower quarter for real UI text. No typography, no logo, no character, no progress bar, no frames. This must match the approved mockup's world and viewpoint, not invent an unrelated scene. Output crisp landscape background.

### island – teljes prompt

Use case: background-extraction. Production animated foreground/sky game asset on REAL TRANSPARENT BACKGROUND, isolated cutout. Reference is the approved Sakura Path CHERRIFT scene. Create ONE small floating rocky fantasy island matching the isolated island at upper-left in the original, with a small elegant pagoda-like violet crystal turret and a single graceful pink sakura tree on a mossy stone ledge, a tapered jagged hanging rock base with slender dangling amethyst crystal tips. Same painterly detailed anime fantasy style, rose-gold sunrise lighting from right, soft lavender shadows, pink cherry blossom foliage. The complete island fully inside frame with generous transparent padding all sides. No sky, no clouds behind, no scene, no water, no text, no character, no white or black backdrop, no contact shadow outside the object. Square or portrait composition. A beautiful distinct readable self-contained floating island for a subtle vertical bob animation over the loading screen. Keep it relatively simple and not an entire huge castle.

### branch – teljes prompt

Production isolated foreground game art, real transparent background. Reference is the Sakura Path loading-screen scenic plate. Create a graceful single thin sakura branch growing in from the upper LEFT corner and extending across upper part toward right, bearing clusters of soft pink blossoms, a few dangling fine twigs and three loose petals. Same richly painted anime fantasy style and warm rose-gold dawn lighting as reference, delicate branch with detailed pink five-petal flowers, dark warm brown wood. Wide horizontal shape. Complete visible branch and flowers within canvas except the branch base which exits the LEFT edge near upper-left; airy natural irregular silhouette, transparent gaps between every cluster, lower two thirds mainly transparent. No trunk, no ground, no scenery, no sky, no logo, no letters, no rectangle, no opaque background or shadow plate. This is a modest foreground overlay to sway gently in wind on top of the approved landscape. Do not obscure the middle or bottom user interface. Landscape image with alpha channel.


## Szirommozgás finomítása

A szirmok egyenként eltérő belépési helyet, méretet, mélységet, sebességet és forgási ritmust kapnak. Felülről és oldalról is érkeznek, balra és jobbra is sodródnak, több ponton irányt váltanak, és külön 3D-billegést végeznek. Minden teljes repülés végén, a képernyőn kívüli halvány állapotban új pálya sorsolódik; a felület frissítése nem indítja újra a mozgásukat. A szüneteltetés és a csökkentett mozgás továbbra is működik. Az animált HTML-előnézet is frissült.
