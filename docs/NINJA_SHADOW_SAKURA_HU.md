# Ninja Cherry — Shadow Sakura (Epic)

Elfogadott koncepció: 01 / Shadow Sakura. Build: `1028-ninja-shadow1`.

Az új effektmodul: `src/cherrift_ninja_shadow_sakura.js`. Az index a Ninja
karaktermodul után tölti; minden első félhez tartozó cache-query és a manifest
buildazonosítója egységes.

- Katana: hegyes végű pink vágásív, fehér pengeél, füst és szirmok.
  Több eltalált ellenfélnél is csak egy vágásív jelenik meg.
- Shuriken: az eredeti valódi lövedékek kapnak új acélcsillag-rajzolást,
  pink élt, rövid füstös csóvát és szirmokat. A találat új textúrát kap.
- Futás: legfeljebb két halvány sprite-utókép, keskeny fénycsík, kevés füst
  és szirom. A skill gyorsítása alatt erősebb a fény és az utókép.
- Lábnyom: bal/jobb váltakozó talpnyomok, valódi megtett távolság alapján;
  gyorsan elhalványulnak. Nem keletkeznek falnál/állva. Legfeljebb 10 aktív.
- Skill: füstből, szirmokból és megszakított pink ívekből álló rövid indítás;
  az eredeti 12 shuriken kifelé repül. Nincs új sebző mező vagy extra lövedék.

A generált, valódi RGBA effektlap:
`assets/effects/ninja_shadow_sakura/shadow_sakura_atlas.png` (1254 × 1254).
Imagegen készítette a Shadow Sakura koncepcióhoz; a füst, egyetlen szirom,
kontaktvillanás és talpnyom külön forrásrégióból kerül kirajzolásra. Az eredeti
PNG módosítatlan. A dekódolás nem blokkolja a játékot: addig egyszerű Canvas
alakzatok helyettesítik. Nincs shadowBlur és nincs frame-enkénti pixelolvasás.
Low beállításnál legfeljebb egy utókép és öt lábnyom, kevesebb részecske.

A modul csak a látványt kezeli. A sebzés, poison, alap két shuriken, skill
12 shurikenje, +35% sebesség 3 másodpercig és cooldown változatlan.
A régi Ninja arc/storm effekt új típusra vált; a régi általános mozgásnyom és
skill-pulzus nem rakódik rá az újra. Más skinek effektjei delegálódnak.

Ellenőrzés: `npm run test:ninja-chibi`, `npm run validate`.
A saját renderelővel készült képi előnézet szintén a csomag része.

A GitHub-integráció feltöltési próbája 403 (Resource not accessible by
integration) hibát kapott. A csomag ezért elkészült, de az élő verzió nincs
frissítve. A Base Cherry korábbi, szintén fel nem töltött csomagjától független.
