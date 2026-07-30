(() => {
"use strict";

const VERSION = "0.6.2-i18n";
const SUPPORTED = new Set(["hu", "en"]);
const textSources = new WeakMap();
const textOutputs = new WeakMap();
const attributeSources = new WeakMap();
const attributeOutputs = new WeakMap();
const ignoredParents = "script,style,noscript,template,canvas,[data-i18n-ignore]";

/* English is the canonical content language. Every pair is deliberately kept
   here instead of scattered through UI patches, so future content can reuse
   the same translator from CHERRIFT_I18N.translate(). */
const pairs = [
  ["Play", "Játék"], ["Choose stage", "Pályaválasztás"], ["Start stage", "Pálya indítása"],
  ["Back", "Vissza"], ["Retry", "Újra"], ["Replay", "Újrajátszás"], ["Next stage", "Következő pálya"],
  ["Resume", "Folytatás"], ["Resume run", "Run folytatása"], ["Main menu", "Főmenü"], ["Pause", "Szünet"],
  ["Settings", "Beállítások"], ["Gear", "Felszerelés"], ["Gear & Loadout", "Felszerelés és összeállítás"],
  ["Skills", "Képességek"], ["Cherry", "Cherry"], ["Gacha", "Gacha"], ["Library", "Gyűjtemény"],
  ["Profile", "Profil"], ["Stats", "Statisztikák"], ["Enemies", "Ellenfelek"], ["Skins", "Kinézetek"],
  ["Worlds", "Világok"], ["Home", "Főmenü"], ["Daily", "Napi"], ["Achievements", "Eredmények"],
  ["Shop", "Bolt"], ["Login", "Belépési jutalom"], ["Goals", "Célok"], ["More", "Továbbiak"],
  ["New", "Új"], ["Live", "Aktív"], ["Coming soon", "Hamarosan"], ["Coming soon 🔒", "Hamarosan 🔒"],
  ["General", "Általános"], ["Audio", "Hang"], ["Display", "Kijelző"], ["Controls", "Irányítás"],
  ["Gameplay UI", "Játékfelület"], ["Accessibility", "Akadálymentesítés"], ["Account", "Fiók"], ["Later", "Később"],
  ["Language", "Nyelv"], ["Interface language", "A felület nyelve"], ["Preload artwork", "Grafikák előtöltése"],
  ["Game preferences", "Játékbeállítások"], ["Sound", "Hangzás"], ["Performance & screen", "Teljesítmény és képernyő"],
  ["Desktop & mobile input", "Asztali és mobil irányítás"], ["Combat information", "Harci információk"],
  ["Comfort options", "Kényelmi beállítások"], ["CHERRIFT Account", "CHERRIFT-fiók"],
  ["Customize the game for desktop and mobile.", "Szabd személyre a játékot asztali gépen és mobilon."],
  ["Saved automatically on this device.", "A beállítások automatikusan mentődnek ezen az eszközön."],
  ["Your settings save automatically", "A beállítások automatikusan mentődnek"],
  ["Balance CHERRIFT audio output.", "Állítsd be a CHERRIFT hangerejét."],
  ["Balanced defaults are recommended.", "A kiegyensúlyozott alapbeállításokat ajánljuk."],
  ["Choose how much information appears during a run.", "Válaszd ki, mennyi információ jelenjen meg egy run alatt."],
  ["Visual settings also affect Gacha and menu effects.", "A vizuális beállítások a Gacha és a menü effektjeire is hatnak."],
  ["This area is prepared for a future account system.", "Ez a rész a későbbi fiókrendszer számára van előkészítve."],
  ["Account sync is coming later", "A fiókszinkronizálás később érkezik"],
  ["Login, cloud saves, linked profiles and account security will appear here without another settings redesign.", "Itt jelenik majd meg a belépés, a felhőmentés, a kapcsolt profilok és a fiókbiztonság."],
  ["Master volume", "Fő hangerő"], ["All game audio", "A játék teljes hangereje"],
  ["Music volume", "Zene hangereje"], ["Effects volume", "Effektek hangereje"],
  ["Available with the audio update", "A későbbi hangfrissítéssel érkezik"],
  ["FPS limit", "FPS-korlát"], ["Maximum rendered frames per second", "A másodpercenként kirajzolt képkockák felső határa"],
  ["View zoom", "Kamera-közelítés"], ["A fair, closer combat view on every screen", "Korrekt, közelebbi harci nézet minden képernyőn"],
  ["Balanced", "Kiegyensúlyozott"], ["Closer", "Közelebbi"], ["Close-up", "Közeli"],
  ["Toggle fullscreen", "Teljes képernyő váltása"], ["Full-screen touch movement", "Teljes képernyős érintéses mozgás"],
  ["Move from the left play area on phones", "Telefonon a bal oldali játékterületről mozoghatsz"],
  ["UI scale", "Felület mérete"], ["HUD and skill-button size", "A HUD és a képességgomb mérete"],
  ["Mobile controls remain optimized for full-screen touch.", "A mobilirányítás teljes képernyős érintéshez van optimalizálva."],
  ["The skill button stays separate in the lower-right corner on mobile.", "Mobilon a képességgomb külön marad a jobb alsó sarokban."],
  ["Compact objective HUD", "Kompakt cél-HUD"], ["Use the smaller stage objective display", "Kisebb pályacél-kijelzés használata"],
  ["Damage numbers", "Sebzésszámok"], ["Show damage dealt above enemies", "Sebzés megjelenítése az ellenfelek fölött"],
  ["Reduce motion", "Mozgások csökkentése"], ["Minimize decorative movement and reveal effects", "A dekoratív mozgások és felfedési effektek csökkentése"],
  ["High contrast UI", "Nagy kontrasztú felület"], ["Increase text and control contrast", "A szövegek és vezérlők kontrasztjának növelése"],
  ["Load skin icons and splash art before the menu appears", "A kinézetikonok és illusztrációk betöltése a menü előtt"],
  ["The new loader prevents the old menu from flashing before current data and critical images are ready.", "Az új betöltő megvárja az adatokat és a fontos képeket, így nem villan fel a régi menü."],
  ["Mobilon a bal oldali nagy képernyőterület mozgat. A skill gomb külön marad jobb alul.", "On mobile, use the large left play area to move. The skill button stays in the lower-right corner."],
  ["A HUD és skill gomb méretét állítja mobilon és PC-n is.", "Adjusts the HUD and skill-button size on both mobile and desktop."],
  ["Balanced az ajánlott, fair alapnézet. Closer és Close-up közelebb hozza Cherry-t.", "Balanced is the recommended fair view. Closer and Close-up bring Cherry nearer."],
  ["Játék közben innen visszaléphetsz Pause-ba vagy közvetlenül folytathatod a run-t.", "During a run, return to Pause or resume directly from here."],

  ["World select", "Pályaválasztó"], ["Selected stage", "Kiválasztott pálya"], ["World ready", "A világ készen áll"],
  ["Objective", "Cél"], ["Reward", "Jutalom"], ["Repeat reward", "Ismétlési jutalom"], ["First clear", "Első teljesítés"],
  ["First clear reward", "Első teljesítési jutalom"], ["Unlocked", "Feloldva"], ["Locked", "Zárolva"], ["Cleared", "Teljesítve"],
  ["Ready to clear", "Teljesítésre kész"], ["Clear enemies and survive raids.", "Győzd le az ellenfeleket és éld túl a raid hullámokat."],
  ["Stage locked", "A pálya zárolva"], ["Next stage unlocked", "Következő pálya feloldva"],
  ["Cleared · Replay available", "Teljesítve · Újrajátszható"], ["All current stages cleared", "Minden jelenlegi pálya teljesítve"],
  ["Válassz pályát lapozással, majd lent nyomj Play-t.", "Browse the stages, then press Play below."],
  ["Az első pálya: több mob, raid hullámok, stabil progression.", "The opening stage: more enemies, raid waves and steady progression."],
  ["Gyorsabb spawn, több slime típus.", "Faster spawns and more slime types."],
  ["Vegyes slime raid hullámok.", "Mixed slime raid waves."],
  ["Tankosabb slimeok, nagyobb raid nyomás.", "Tougher slimes and heavier raid pressure."],
  ["World 1 záró pálya mini boss-szal.", "The World 1 finale with a mini-boss."],
  ["Első éjszakai pálya rovar/pók enemy poollal.", "The first night stage with insect and spider enemies."],
  ["Éjszakai raid hullámok gyorsabb ellenfelekkel.", "Night raid waves with faster enemies."],
  ["Sűrűbb spawn, agresszívebb rovarok.", "Denser spawns and more aggressive insects."],
  ["Erős éjszakai raid pálya.", "A demanding night raid stage."],
  ["World 2 záró pálya mini boss-szal.", "The World 2 finale with a mini-boss."],
  ["A warm savannah stage with golden grass, acacia trees and placeholder creatures.", "Meleg szavannapálya aranyló fűvel, akáciákkal és fejlesztés alatt álló ellenfelekkel."],
  ["A hamuval borított ösvényen tűzlények és kőszörnyek támadnak.", "Fire creatures and stone monsters attack along the ash-covered path."],
  ["A kihűlt kert alatt még mindig izzik a föld.", "The ground still glows beneath the cooled garden."],
  ["A régi kohó romjai között egyre erősebb hullámok érkeznek.", "Increasingly powerful waves arrive among the old furnace ruins."],
  ["Az Ashen Crown elit lényei őrzik a világ magját.", "The elite creatures of the Ashen Crown guard the heart of this world."],
  ["World 3 záró pálya: győzd le a Cinder Guardiant.", "The World 3 finale: defeat the Cinder Guardian."],
  ["Blooming Meadow", "Virágzó Rét"], ["Petal Trail", "Sziromösvény"], ["Clover Crossing", "Lóhere-átkelő"],
  ["Rooted Hollow", "Gyökérkatlan"], ["Slime Nest", "Slime-fészek"], ["Night Bloom", "Éji Virágzás"],
  ["Moonlit Grove", "Holdfényes Liget"], ["Shadow Thicket", "Árnybozót"], ["Echo Burrow", "Visszhangüreg"],
  ["Midnight Den", "Éjféli Odú"], ["Golden Grasslands", "Aranyló Szavanna"], ["Acacia Trail", "Akáciaösvény"],
  ["Sunstone Valley", "Napkő-völgy"], ["Lionwind Ridge", "Oroszlánszél-gerinc"], ["Savannah Heart", "A Szavanna Szíve"],
  ["Emberfall Path", "Parázsösvény"], ["Cinder Garden", "Parázskert"], ["Broken Furnace", "Törött Kohó"],
  ["Ashen Crown", "Hamukorona"], ["Heart of Cinders", "Parázsszív"],

  ["Characters & Skins", "Karakterek és kinézetek"],
  ["Skin = kinézet + lövés / melee támadás + aktív skill. Gear csak statot ad.", "A skin determines appearance, ranged/melee attacks and the active skill. Gear only grants stats."],
  ["Weapon", "Fegyver"], ["Skill", "Képesség"], ["Passive", "Passzív"], ["Unique passive", "Egyedi passzív"],
  ["Passive bonus", "Passzív bónusz"], ["In-game preview", "Játékon belüli előnézet"], ["Equip", "Felszerelés"], ["Equipped", "Felszerelve"],
  ["Change skin", "Kinézet váltása"], ["Change Cherry", "Cherry váltása"], ["Costume", "Jelmez"], ["Artifacts", "Ereklyék"],
  ["Default skin.", "Alapértelmezett kinézet."], ["Alap Cherry skin.", "Base Cherry skin."], ["Tündér Cherry skin.", "Fairy Cherry skin."],
  ["Alap Cherry skin. Külön idle/walk sprite sheet + rövid dash skill.", "Base Cherry skin with separate idle/walk sprite sheets and a short dash skill."],
  ["Tündér Cherry skin. Külön idle/walk sprite sheet + mágikus burst skill.", "Fairy Cherry skin with separate idle/walk sprite sheets and a magical burst skill."],
  ["Az alap Cherry skin. Ranged Bloom Orb támadás és gyors Bloom Dash skill.", "The base Cherry skin uses ranged Bloom Orb attacks and a quick Bloom Dash skill."],
  ["Közelharci karmolás és Savage Rend skill.", "Melee claw attacks with the Savage Rend skill."],
  ["Gyors dash előre, rövid sérthetetlenséggel és ütközési sebzéssel.", "A quick forward dash with brief invulnerability and impact damage."],
  ["Mágikus burst Cherry körül. Több ellenfelet sebez egyszerre.", "A magical burst around Cherry that damages several enemies at once."],
  ["Rövid előretörés és nagy területű karmolás. Közelharci burst sebzés.", "A short lunge and wide claw strike for melee burst damage."],
  ["Két shurikent dobó ranged skin. A skill 360°-ban shurikeneket lő ki és ideiglenesen megnöveli a movement speedet.", "A ranged skin that throws two shuriken. Its skill fires in every direction and briefly increases movement speed."],
  ["Vörös karmolásokkal támad. A Soul Drain célkövető lelkekkel sebez, gyógyít, teljes HP-n pedig shieldet készít.", "Attacks with crimson claws. Soul Drain sends homing spirits that deal damage, heal, and grant a shield at full HP."],
  ["Közelharci kardforgató Cherry. A Whirlwind körbeforduló területi kardcsapásokkal sebzi a körülötte lévő ellenfeleket.", "A melee sword-wielding Cherry. Whirlwind damages nearby enemies with a spinning area attack."],
  ["Every 10 kills: -30% remaining Skill CD", "Minden 10. ölés: a hátralévő képességidő -30%"],
  ["Every 10 kills: remaining Skill CD -30%", "Minden 10. ölés: a hátralévő képességidő -30%"],
  ["+5% Movement · +5% Attack Speed · Sakura walking trail", "+5% mozgás · +5% támadási sebesség · Sakura járási nyom"],
  ["+5% Movement Speed · +5% Attack Speed · Sakura petal trail", "+5% mozgási sebesség · +5% támadási sebesség · Sakura sziromnyom"],
  ["Legendary dual-sword melee skin. Every 10 defeated enemies reduces the remaining Blossom Spin cooldown by 30%.", "Legendás, kétkardos közelharci kinézet. Minden 10 legyőzött ellenfél 30%-kal csökkenti a Blossom Spin hátralévő töltési idejét."],
  ["Blossom Spin cuts a medium area and grants a 2% movement-speed burst that fades to zero over one second.", "A Blossom Spin közepes területet vág le, és 2% mozgásisebesség-löketet ad, amely egy másodperc alatt lecseng."],

  ["Current loadout", "Jelenlegi összeállítás"], ["Loadout", "Összeállítás"], ["Inventory", "Tárgylista"],
  ["Equipment collection", "Felszerelésgyűjtemény"], ["My collection", "Gyűjteményem"], ["Total power", "Összerő"],
  ["Total stats", "Összes stat"], ["Item power", "Tárgyerő"], ["Compared to equipped", "Összevetés a felszerelttel"],
  ["No equipment equipped yet.", "Még nincs felszerelt tárgy."], ["No gear collected.", "Még nincs gyűjtött felszerelés."],
  ["No gear equipped.", "Nincs felszerelt tárgy."], ["No items in this category.", "Nincs tárgy ebben a kategóriában."],
  ["No stat bonuses.", "Nincs statbónusz."], ["Sell", "Eladás"], ["Unequip", "Levétel"], ["Details", "Részletek"],
  ["Lock", "Zárolás"], ["Unlock", "Feloldás"], ["Item locked", "Tárgy zárolva"], ["Item unlocked", "Tárgy feloldva"],
  ["Unlock this item before selling", "Eladás előtt oldd fel a tárgy zárolását"],
  ["All slots", "Minden hely"], ["Item level", "Tárgyszint"], ["Newest", "Legújabb"], ["Rarity", "Ritkaság"],
  ["Power ↓", "Erő ↓"], ["Level ↓", "Szint ↓"], ["Rarity ↓", "Ritkaság ↓"], ["By quality", "Minőség szerint"],
  ["Attack Speed", "Támadási sebesség"], ["Critical Rate", "Kritikus esély"], ["Critical Damage", "Kritikus sebzés"],
  ["Move Speed", "Mozgási sebesség"], ["Pickup Range", "Felszedési távolság"], ["HP Regen", "HP-regeneráció"],
  ["Damage", "Sebzés"], ["Crit", "Kritikus esély"], ["Crit Damage", "Kritikus sebzés"], ["Max HP", "Max HP"],
  ["Regen", "Regeneráció"], ["Pickup", "Felszedési távolság"],
  ["Offensive", "Támadó"], ["Defensive", "Védekező"], ["Hybrid", "Hibrid"],
  ["Inventory full", "A tárgylista megtelt"], ["Dropped", "Megszerezve"], ["Sold", "Eladva"],
  ["Armor", "Páncél"], ["Chestplate", "Mellvért"], ["Gloves", "Kesztyű"], ["Boots", "Csizma"], ["Ring", "Gyűrű"], ["Necklace", "Nyaklánc"], ["Helmet", "Sisak"],
  ["Crimson = offenzív, Azure = defenzív, Verdant = hybrid. Gear csak statot ad.", "Crimson is offensive, Azure is defensive and Verdant is hybrid. Gear only grants stats."],
  ["Húzd az itemet a világító, megfelelő slotra.", "Drag the item to the glowing compatible slot."],
  ["Húzd az inventory itemet a megfelelő body slotra, vagy kattints rá a részletekhez.", "Drag an inventory item to the matching body slot, or click it for details."],
  ["Húzz egy itemet a megfelelő slotra", "Drag an item to the matching slot"],
  ["Select item", "Válassz tárgyat"], ["Close item details", "Tárgyrészletek bezárása"],

  ["Player upgrade", "Játékosfejlesztés"], ["Collect XP, level up manually, then spend skill points.", "Gyűjts XP-t, lépj szintet kézzel, majd költsd el a képességpontokat."],
  ["Active Cherry", "Aktív Cherry"], ["Your equipped skin and stable idle preview.", "A felszerelt kinézeted és stabil idle előnézete."],
  ["Player level", "Játékosszint"], ["Level up", "Szintlépés"], ["More XP needed", "További XP szükséges"],
  ["Bloom skill tree", "Bloom képességfa"], ["Skill tree", "Képességfa"], ["Bloom Power", "Bloom Erő"],
  ["Soft Vitality", "Lágy Életerő"], ["Bunny Haste", "Nyuszi Gyorsaság"], ["Lucky Petals", "Szerencsés Szirmok"],
  ["+3% base damage per rank", "+3% alapsebzés szintenként"], ["+8 maximum HP per rank", "+8 maximális HP szintenként"],
  ["+1.5% movement and attack speed per rank", "+1,5% mozgási és támadási sebesség szintenként"], ["+1% crit per rank", "+1% kritikus esély szintenként"],
  ["Bloom Damage", "Bloom Sebzés"], ["Swift Bunny", "Fürge Nyuszi"], ["Quick Bloom", "Gyors Bloom"],
  ["Soft Shield", "Puha Pajzs"], ["Petal Magnet", "Szirommágnes"], ["Lucky Bloom", "Szerencsés Bloom"],
  ["+15% sebzés", "+15% damage"], ["+12% mozgási sebesség", "+12% movement speed"],
  ["+12% attack speed", "+12% támadási sebesség"], ["+20 max HP és gyógyítás", "+20 max HP and healing"],
  ["+24 max HP és gyógyítás", "+24 max HP and healing"], ["+28 pickup radius", "+28 felszedési sugár"],
  ["+32 pickup radius", "+32 felszedési sugár"], ["+8% crit chance", "+8% kritikus esély"],
  ["Multi Strike", "Többszörös Csapás"], ["Combat Arc", "Harci Ív"], ["Thorn Aura", "Tüskeaura"],
  ["Ranged: +1 lövés · Melee: +18% range", "Ranged: +1 projectile · Melee: +18% range"],
  ["Ranged: szélesebb spread · Melee: szélesebb cone", "Ranged: wider spread · Melee: wider cone"],
  ["Közeli enemyk lassan sebződnek", "Nearby enemies slowly take damage"],
  ["Permanent milestones and rewards.", "Állandó mérföldkövek és jutalmak."], ["Achievement unlocked", "Eredmény feloldva"],
  ["First Bloom", "Első Virágzás"], ["Pathfinder", "Útkereső"], ["Meadow Guardian", "A Rét Őrzője"],
  ["Night Survivor", "Éjszakai Túlélő"], ["Growing Bunny", "Fejlődő Nyuszi"], ["Bloom Veteran", "Bloom Veterán"],
  ["Rare Find", "Ritka Lelet"], ["Epic Treasure", "Epikus Kincs"], ["Golden Miracle", "Aranycsoda"], ["Collector", "Gyűjtő"],
  ["Rising Star", "Feltörekvő Csillag"], ["Star Collector", "Csillaggyűjtő"], ["Savannah Hero", "A Szavanna Hőse"], ["Powerful Bloom", "Erős Bloom"],
  ["Clear your first stage.", "Teljesítsd az első pályádat."], ["Complete 10 stage clears.", "Teljesíts összesen 10 pályát."],
  ["Clear World 1-5.", "Teljesítsd a Világ 1-5 pályát."], ["Clear World 2-5.", "Teljesítsd a Világ 2-5 pályát."], ["Clear World 3-5.", "Teljesítsd a Világ 3-5 pályát."],
  ["Reach Player Level 5.", "Érd el az 5. játékosszintet."], ["Reach Player Level 10.", "Érd el a 10. játékosszintet."],
  ["Obtain a Rare item.", "Szerezz egy ritka tárgyat."], ["Obtain an Epic item.", "Szerezz egy epikus tárgyat."],
  ["Obtain a Legendary item.", "Szerezz egy legendás tárgyat."], ["Own 20 equipment items.", "Legyen 20 felszerelésed."],
  ["Earn 10 stage stars.", "Szerezz 10 pályacsillagot."], ["Earn 20 stage stars.", "Szerezz 20 pályacsillagot."],
  ["Reach 1000 total power.", "Érd el az 1000 összerőt."], ["Claimed:", "Átvéve:"],

  ["Key summon", "Kulcsos idézés"], ["Use a key to reveal gear and rare Cherry skins.", "Használj egy kulcsot felszerelés és ritka Cherry-kinézetek felfedéséhez."],
  ["Bloom summon", "Bloom idézés"], ["Key Invocation", "Kulcsidézés"], ["Open · 1 key", "Nyitás · 1 kulcs"],
  ["Reveal one reward", "Egy jutalom felfedése"], ["Skip animation", "Animáció átugrása"],
  ["Reward revealed", "Jutalom felfedve"], ["The Bloom Chest is opening…", "A Bloom láda nyílik…"],
  ["Opening the chest…", "Láda nyitása…"], ["Chest opened — reward revealed", "Láda kinyitva — jutalom felfedve"],
  ["Collection reward", "Gyűjteményjutalom"], ["Mystery reward", "Rejtélyes jutalom"], ["New Cherry unlocked", "Új Cherry feloldva"],
  ["Reward", "Jutalom"], ["Got", "Kaptál"], ["New", "Új"],
  ["Common / Uncommon / Rare gear. Ritkán skin unlock.", "Common, Uncommon and Rare gear. A skin may unlock on rare occasions."],
  ["Chest nyitás, gear és skin unlock prototípus.", "Prototype for opening chests and unlocking gear or skins."],
  ["Reveal gear and, on rare occasions, a new Cherry skin.", "Fedj fel felszerelést, ritkán pedig egy új Cherry-kinézetet."],

  ["Profile, collection, enemies and statistics.", "Profil, gyűjtemény, ellenfelek és statisztikák."],
  ["Player Profile", "Játékosprofil"], ["Statistics", "Statisztikák"], ["Enemy Encyclopedia", "Ellenfél-enciklopédia"], ["Bestiary", "Bestiárium"],
  ["Your long-term CHERRIFT progression.", "A hosszú távú CHERRIFT fejlődésed."],
  ["Lifetime account and combat records.", "A fiók és a harcok teljes élettartamra szóló statisztikái."],
  ["Gear, enemies, skins and worlds.", "Felszerelések, ellenfelek, kinézetek és világok."],
  ["Defeat enemies to reveal their records.", "Győzd le az ellenfeleket az adataik felfedéséhez."],
  ["Stages", "Pályák"], ["Total XP", "Összes XP"], ["Gear owned", "Meglévő felszerelés"],
  ["Days played", "Játszott napok"], ["View", "Megtekintés"], ["Upgrade", "Fejlesztés"], ["Upgrades", "Fejlesztések"],
  ["Enemies defeated", "Legyőzött ellenfelek"], ["Runs started", "Elindított runok"], ["Stage clears", "Pályateljesítések"],
  ["Boss kills", "Legyőzött bossok"], ["Coins earned", "Szerzett érmék"], ["Chests opened", "Kinyitott ládák"],
  ["Gear found", "Talált felszerelések"], ["Best time", "Legjobb idő"], ["Unknown enemy", "Ismeretlen ellenfél"],
  ["Unknown skin", "Ismeretlen kinézet"], ["Defeat to discover", "Győzd le a felfedezéshez"], ["In progress", "Folyamatban"],

  ["Daily quests", "Napi küldetések"], ["Five fresh objectives every day.", "Minden nap öt új feladat."],
  ["Slime Cleanup", "Slime-takarítás"], ["Keep Moving", "Mozgásban"], ["Stage Hunter", "Pályavadász"],
  ["Treasure Trail", "Kincsösvény"], ["Open Sesame", "Szezám, tárulj!"], ["Gear Collector", "Felszerelésgyűjtő"], ["Boss Breaker", "Bosszúzó"],
  ["quests claimed", "küldetés átvéve"], ["No keys", "Nincs kulcs"],
  ["Reroll", "Újrasorsolás"], ["Claim all", "Összes átvétele"], ["Claim", "Átvétel"], ["Claimed", "Átvéve"],
  ["Claim 250 coins + 2 keys", "250 érme + 2 kulcs átvétele"],
  ["Daily Completion Chest", "Napi teljesítési láda"], ["Login rewards", "Belépési jutalmak"],
  ["A seven-day repeating reward track.", "Hétnapos, ismétlődő jutalomsor."], ["Daily freebies and simple purchases.", "Napi ingyenes jutalmak és egyszerű vásárlások."],
  ["Daily Coins", "Napi érmék"], ["Daily Key", "Napi kulcs"], ["Key Pack", "Kulcscsomag"], ["Coin Bundle", "Érmecsomag"],
  ["Login reward", "Belépési jutalom"],
  ["Free", "Ingyenes"], ["Purchase complete", "Vásárlás kész"], ["Not enough keys", "Nincs elég kulcs"], ["Not enough coins", "Nincs elég érme"],
  ["Daily missions", "Napi küldetések"], ["Complete missions to earn rewards.", "Teljesíts küldetéseket jutalmakért."],
  ["Daily offers", "Napi ajánlatok"], ["Seven-day track", "Hétnapos jutalomsor"],
  ["Rewards and services", "Jutalmak és szolgáltatások"],
  ["Season event", "Szezonális esemény"], ["Join the event and get exclusive rewards.", "Vegyél részt az eseményen exkluzív jutalmakért."],
  ["News", "Hírek"], ["Quests & rewards", "Küldetések és jutalmak"], ["Permanent goals", "Állandó célok"], ["Game & account", "Játék és fiók"],

  ["Loading game systems…", "Játékrendszerek betöltése…"], ["Reading local progress…", "Helyi mentés beolvasása…"],
  ["Preparing the menu…", "Menü előkészítése…"], ["Finalizing interface…", "Felület véglegesítése…"],
  ["Preparing artwork…", "Grafikák előkészítése…"], ["Preparing Cherry…", "Cherry előkészítése…"],
  ["Welcome back, Cherry", "Üdv újra, Cherry!"], ["Loading failed", "A betöltés sikertelen"],
  ["Reload game", "Játék újratöltése"], ["Some game files could not be loaded.", "Néhány játékfájl nem tölthető be."],
  ["Quality & localization · v0.6.2", "Minőségi javítások és lokalizáció · v0.6.2"],
  ["HU/EN localization, stable navigation, fair camera, save and input fixes.", "Magyar/angol nyelv, stabil navigáció, korrekt kamera-, mentés- és irányításjavítások."],
  ["Use active skill", "Aktív képesség használata"], ["Previous skin", "Előző kinézet"],
  ["Next skin", "Következő kinézet"], ["Previous stage", "Előző pálya"], ["Next stage", "Következő pálya"],
  ["Open the Bloom Chest", "Bloom láda kinyitása"], ["Discord login is coming later", "A Discord-belépés később érkezik"],
  ["Raid incoming", "Raid közeleg"], ["Wave approaching", "Hullám közeleg"], ["Mini boss", "Mini boss"], ["Boss", "Boss"],
  ["Victory!", "Győzelem!"], ["Stage clear!", "Pálya teljesítve!"], ["Run complete", "Run teljesítve"],
  ["Rewards incoming.", "Jutalmak érkeznek."], ["Level up!", "Szintlépés!"], ["Válassz egy fejlesztést:", "Choose an upgrade:"],
  ["Ready!", "Kész!"], ["Ready with missing optional assets", "Kész, néhány opcionális asset nélkül"],
  ["Loading stage...", "Pálya betöltése…"], ["Preparing Cherry...", "Cherry előkészítése…"],

  ["Common", "Gyakori"], ["Uncommon", "Nem gyakori"], ["Rare", "Ritka"], ["Epic", "Epikus"], ["Legendary", "Legendás"],
  ["Power", "Erő"], ["Keys", "Kulcsok"], ["Coins", "Érmék"], ["Energy", "Energia"], ["Collection", "Gyűjtemény"],
  ["Performance", "Teljesítmény"], ["Quick actions", "Gyorsműveletek"], ["Recommended power", "Ajánlott erő"],
  ["All", "Mind"], ["Other", "Egyéb"], ["By power", "Erő szerint"], ["Empty", "Üres"],
  ["No passive bonus", "Nincs passzív bónusz"], ["No gear drop", "Nem esett felszerelés"], ["Gear drops", "Felszerelésjutalmak"], ["Player XP", "Játékos XP"],
  ["Skin locked", "A kinézet zárolva"], ["Show damage numbers", "Sebzésszámok mutatása"], ["Mobile controls", "Mobilirányítás"],
  ["Pink Slime", "Rózsaszín Slime"], ["Green Slime", "Zöld Slime"], ["Blue Slime", "Kék Slime"], ["Big Slime", "Nagy Slime"],
  ["Tank Blue Slime", "Tank Kék Slime"], ["Slime King", "Slime Király"], ["Spider", "Pók"], ["Beetle", "Bogár"],
  ["Crawler", "Mászó"], ["Moth", "Moly"], ["Night Queen", "Éjkirálynő"], ["Ember Slime", "Parázs Slime"],
  ["Ash Moth", "Hamu Moly"], ["Stone Imp", "Kőmanó"], ["Magma Beetle", "Magma Bogár"], ["Flame Wisp", "Lánglidérc"],
  ["Cinder Guardian", "Parázsőr"], ["Unknown", "Ismeretlen"], ["None", "Nincs"]
];

const aliases = new Map();
const lowerAliases = new Map();
function hungarianScore(value) {
  const text = String(value || "").toLocaleLowerCase("hu");
  let score = (text.match(/[áéíóöőúüű]/g) || []).length * 3;
  const words = text.match(/[a-záéíóöőúüű]+/g) || [];
  const markers = new Set([
    "a", "az", "alap", "általános", "angol", "átvéve", "beállítások", "belépési", "csak", "egy", "egyedi",
    "ellenfél", "ellenfelek", "első", "és", "érme", "érmék", "felszerelés", "feloldva", "főmenü", "gyakori",
    "gyorsabb", "gyűjtemény", "hamarosan", "hang", "húzd", "húzz", "ingyenes", "irányítás", "játék", "játékos",
    "jutalom", "képesség", "később", "kinézet", "következő", "közeli", "közelharci", "kulcs", "küldetés",
    "magyar", "minden", "mobilon", "mozgási", "napi", "nap", "nem", "nincs", "nyelv", "nyitás", "összes",
    "pálya", "ritka", "sebzés", "sebződnek", "sikerült", "szélesebb", "szint", "szintenként", "tárgy", "teljesítés",
    "tündér", "új", "üres", "válassz", "világ", "vörös", "zárolva"
  ]);
  for (const word of words) if (markers.has(word)) score++;
  return score;
}

for (const [left, right] of pairs) {
  const [en, hu] = hungarianScore(left) > hungarianScore(right) ? [right, left] : [left, right];
  const pair = { en, hu };
  for (const alias of [left, right]) {
    aliases.set(alias, pair);
    const lowered = alias.toLocaleLowerCase("hu");
    if (!lowerAliases.has(lowered)) lowerAliases.set(lowered, pair);
  }
}

const patterns = [
  { en:/^World (\d+)(?:-(\d+))?$/i, hu:/^Világ (\d+)(?:-(\d+))?$/i,
    out:(m,lang)=>`${lang === "hu" ? "Világ" : "World"} ${m[1]}${m[2] ? `-${m[2]}` : ""}` },
  { en:/^Player Level (\d+)$/i, hu:/^Játékosszint (\d+)$/i,
    out:(m,lang)=>`${lang === "hu" ? "Játékosszint" : "Player Level"} ${m[1]}` },
  { en:/^Level (\d+)$/i, hu:/^Szint (\d+)$/i,
    out:(m,lang)=>`${lang === "hu" ? "Szint" : "Level"} ${m[1]}` },
  { en:/^Power (\d+)$/i, hu:/^Erő (\d+)$/i,
    out:(m,lang)=>`${lang === "hu" ? "Erő" : "Power"} ${m[1]}` },
  { en:/^(\d+) enemies$/i, hu:/^(\d+) ellenfél$/i,
    out:(m,lang)=>lang === "hu" ? `${m[1]} ellenfél` : `${m[1]} enemies` },
  { en:/^([+]?\d+) coins?$/i, hu:/^([+]?\d+) érme$/i,
    out:(m,lang)=>lang === "hu" ? `${m[1]} érme` : `${m[1]} coins` },
  { en:/^([+]?\d+) keys?$/i, hu:/^([+]?\d+) kulcs$/i,
    out:(m,lang)=>lang === "hu" ? `${m[1]} kulcs` : `${m[1]} ${Number(m[1].replace("+", "")) === 1 ? "key" : "keys"}` },
  { en:/^(\d+) items?$/i, hu:/^(\d+) tárgy$/i,
    out:(m,lang)=>lang === "hu" ? `${m[1]} tárgy` : `${m[1]} items` },
  { en:/^(\d+) skill points? available$/i, hu:/^(\d+) képességpont érhető el$/i,
    out:(m,lang)=>lang === "hu" ? `${m[1]} képességpont érhető el` : `${m[1]} skill ${m[1] === "1" ? "point" : "points"} available` },
  { en:/^Rank (\d+)\/(\d+)$/i, hu:/^Szint (\d+)\/(\d+)$/i,
    out:(m,lang)=>`${lang === "hu" ? "Szint" : "Rank"} ${m[1]}/${m[2]}` },
  { en:/^Day (\d+)$/i, hu:/^(\d+)\. nap$/i,
    out:(m,lang)=>lang === "hu" ? `${m[1]}. nap` : `Day ${m[1]}` },
  { en:/^Best:\s*(.+)$/i, hu:/^Legjobb:\s*(.+)$/i,
    out:(m,lang)=>`${lang === "hu" ? "Legjobb" : "Best"}: ${m[1]}` },
  { en:/^(.+) equipped$/i, hu:/^Felszerelve:\s*(.+)$/i,
    out:(m,lang)=>lang === "hu" ? `Felszerelve: ${translateCore(m[1], lang)}` : `${translateCore(m[1], lang)} equipped` },
  { en:/^Achievement unlocked:\s*(.+)$/i, hu:/^Eredmény feloldva:\s*(.+)$/i,
    out:(m,lang)=>`${lang === "hu" ? "Eredmény feloldva" : "Achievement unlocked"}: ${translateCore(m[1], lang)}` },
  { en:/^Loading artwork (\d+)\/(\d+)$/i, hu:/^Grafikák betöltése (\d+)\/(\d+)$/i,
    out:(m,lang)=>`${lang === "hu" ? "Grafikák betöltése" : "Loading artwork"} ${m[1]}/${m[2]}` },
  { en:/^(\d+)\/(\d+) stages · (\d+)\/(\d+) ⭐$/i, hu:/^(\d+)\/(\d+) pálya · (\d+)\/(\d+) ⭐$/i,
    out:(m,lang)=>lang === "hu" ? `${m[1]}/${m[2]} pálya · ${m[3]}/${m[4]} ⭐` : `${m[1]}/${m[2]} stages · ${m[3]}/${m[4]} ⭐` },
  { en:/^(.+) · (\d+) enemies$/i, hu:/^(.+) · (\d+) ellenfél$/i,
    out:(m,lang)=>`${translateCore(m[1], lang)} · ${m[2]} ${lang === "hu" ? "ellenfél" : "enemies"}` },
  { en:/^(\d+) quests? claimed$/i, hu:/^(\d+) küldetés átvéve$/i,
    out:(m,lang)=>lang === "hu" ? `${m[1]} küldetés átvéve` : `${m[1]} ${m[1] === "1" ? "quest" : "quests"} claimed` },
  { en:/^(\d+)\/(\d+) quests? claimed$/i, hu:/^(\d+)\/(\d+) küldetés átvéve$/i,
    out:(m,lang)=>lang === "hu" ? `${m[1]}/${m[2]} küldetés átvéve` : `${m[1]}/${m[2]} quests claimed` },
  { en:/^Reroll \((\d+)\)$/i, hu:/^Újrasorsolás \((\d+)\)$/i,
    out:(m,lang)=>`${lang === "hu" ? "Újrasorsolás" : "Reroll"} (${m[1]})` },
  { en:/^Inventory full · item converted to (\d+) coins$/i, hu:/^A tárgylista megtelt · a tárgy (\d+) érmére váltva$/i,
    out:(m,lang)=>lang === "hu" ? `A tárgylista megtelt · a tárgy ${m[1]} érmére váltva` : `Inventory full · item converted to ${m[1]} coins` },
  { en:/^Sold for (\d+) coins$/i, hu:/^(\d+) érméért eladva$/i,
    out:(m,lang)=>lang === "hu" ? `${m[1]} érméért eladva` : `Sold for ${m[1]} coins` },
  { en:/^No (.+) item available$/i, hu:/^Nincs elérhető (.+) tárgy$/i,
    out:(m,lang)=>lang === "hu" ? `Nincs elérhető ${translateCore(m[1], lang)} tárgy` : `No ${translateCore(m[1], lang)} item available` },
  { en:/^(.+) item cannot be placed in the (.+) slot$/i, hu:/^(.+) item nem rakható (.+) slotra$/i,
    out:(m,lang)=>lang === "hu" ? `${translateCore(m[1], lang)} tárgy nem rakható a(z) ${translateCore(m[2], lang)} helyre` : `${translateCore(m[1], lang)} item cannot be placed in the ${translateCore(m[2], lang)} slot` },
  { en:/^(Common|Uncommon|Rare|Epic|Legendary) (Crimson|Azure|Verdant) (Weapon|Helmet|Armor|Gloves|Boots|Ring|Necklace)$/i,
    hu:/^(Gyakori|Nem gyakori|Ritka|Epikus|Legendás) (Crimson|Azure|Verdant) (Fegyver|Sisak|Páncél|Kesztyű|Csizma|Gyűrű|Nyaklánc)$/i,
    out:(m,lang)=>`${translateCore(m[1], lang)} ${m[2]} ${translateCore(m[3], lang)}` },
  { en:/^(Common|Uncommon|Rare|Epic|Legendary) (Weapon|Helmet|Armor|Gloves|Boots|Ring|Necklace) dropped!$/i,
    hu:/^(Gyakori|Nem gyakori|Ritka|Epikus|Legendás) (Fegyver|Sisak|Páncél|Kesztyű|Csizma|Gyűrű|Nyaklánc) megszerezve!$/i,
    out:(m,lang)=>lang === "hu" ? `${translateCore(m[1], lang)} ${translateCore(m[2], lang)} megszerezve!` : `${translateCore(m[1], lang)} ${translateCore(m[2], lang)} dropped!` },
  { en:/^(\d+) \/ 7 equipped$/i, hu:/^(\d+) \/ 7 felszerelve$/i,
    out:(m,lang)=>`${m[1]} / 7 ${lang === "hu" ? "felszerelve" : "equipped"}` },
  { en:/^Player Level (\d+)! \+1 skill point$/i, hu:/^Játékosszint (\d+)! \+1 képességpont$/i,
    out:(m,lang)=>lang === "hu" ? `Játékosszint ${m[1]}! +1 képességpont` : `Player Level ${m[1]}! +1 skill point` }
];

function languageFromSave() {
  const live = window.UI?.save?.settings?.language;
  if (SUPPORTED.has(live)) return live;
  try {
    const key = window.CherriftStorage?.key;
    const raw = key ? JSON.parse(localStorage.getItem(key) || "null") : null;
    if (SUPPORTED.has(raw?.settings?.language)) return raw.settings.language;
  } catch (_) {}
  return SUPPORTED.has(document.documentElement.lang) ? document.documentElement.lang : "hu";
}

let language = languageFromSave();

function caseAdjusted(value, source, targetLanguage) {
  const letters = source.replace(/[^A-Za-zÀ-ž]/g, "");
  if (letters && letters === letters.toLocaleUpperCase("hu")) return value.toLocaleUpperCase(targetLanguage === "hu" ? "hu" : "en");
  const sourceWords = source.match(/[A-Za-zÀ-ž]+/g) || [];
  const titleCase = sourceWords.length > 1 && sourceWords.every(word => word[0] === word[0].toLocaleUpperCase("en"));
  if (titleCase && targetLanguage === "en") {
    return value.replace(/\b([a-z])/g, letter => letter.toLocaleUpperCase("en"));
  }
  return value;
}

function translateCore(source, targetLanguage = language) {
  const clean = String(source ?? "").trim();
  if (!clean || !/[A-Za-zÀ-ž]/.test(clean)) return clean;
  const pair = aliases.get(clean) || lowerAliases.get(clean.toLocaleLowerCase("hu"));
  if (pair) return caseAdjusted(pair[targetLanguage], clean, targetLanguage);
  for (const pattern of patterns) {
    const match = clean.match(pattern.en) || clean.match(pattern.hu);
    if (match) return pattern.out(match, targetLanguage);
  }
  if (clean.includes(" · ")) {
    return clean.split(" · ").map(part => translateCore(part, targetLanguage)).join(" · ");
  }
  return clean;
}

function translatePreservingWhitespace(source, targetLanguage = language) {
  const value = String(source ?? "");
  const leading = value.match(/^\s*/)?.[0] || "";
  const trailing = value.match(/\s*$/)?.[0] || "";
  return leading + translateCore(value.trim(), targetLanguage) + trailing;
}

function skipTextNode(node) {
  const parent = node.parentElement;
  return !parent || !!parent.closest(ignoredParents);
}

function translateTextNode(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE || skipTextNode(node)) return;
  const current = node.nodeValue || "";
  const previousOutput = textOutputs.get(node);
  if (!textSources.has(node) || (previousOutput !== undefined && current !== previousOutput)) textSources.set(node, current);
  const output = translatePreservingWhitespace(textSources.get(node), language);
  textOutputs.set(node, output);
  if (current !== output) node.nodeValue = output;
}

function translateAttribute(element, attribute) {
  if (!element?.hasAttribute?.(attribute) || element.closest?.("[data-i18n-ignore]")) return;
  let sources = attributeSources.get(element);
  let outputs = attributeOutputs.get(element);
  if (!sources) { sources = new Map(); attributeSources.set(element, sources); }
  if (!outputs) { outputs = new Map(); attributeOutputs.set(element, outputs); }
  const current = element.getAttribute(attribute) || "";
  if (!sources.has(attribute) || (outputs.has(attribute) && current !== outputs.get(attribute))) sources.set(attribute, current);
  const output = translatePreservingWhitespace(sources.get(attribute), language);
  outputs.set(attribute, output);
  if (current !== output) element.setAttribute(attribute, output);
}

function translateSubtree(root = document.documentElement) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
  const element = root.nodeType === Node.ELEMENT_NODE ? root : null;
  if (element) for (const attribute of ["title", "aria-label", "placeholder"]) translateAttribute(element, attribute);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) translateTextNode(node);
  const descendants = root.querySelectorAll?.("[title],[aria-label],[placeholder]") || [];
  for (const child of descendants) for (const attribute of ["title", "aria-label", "placeholder"]) translateAttribute(child, attribute);
}

function updateDocumentMetadata() {
  document.documentElement.lang = language;
  document.title = window.CHERRIFT_BUILD?.title || "CHERRIFT v0.9.0 – TEST BUILD";
  const selector = document.getElementById("languageV060");
  if (selector && selector.value !== language) selector.value = language;
}

function setLanguage(nextLanguage, persist = true) {
  language = SUPPORTED.has(nextLanguage) ? nextLanguage : "hu";
  if (window.UI?.save) {
    window.UI.save.settings ||= {};
    window.UI.save.settings.language = language;
    if (persist) {
      try { window.CherriftStorage?.save?.(window.UI.save); } catch (_) {}
    }
  }
  updateDocumentMetadata();
  translateSubtree(document.documentElement);
  window.dispatchEvent(new CustomEvent("cherrift:languagechange", { detail: { language } }));
  return language;
}

const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    if (mutation.type === "characterData") translateTextNode(mutation.target);
    else if (mutation.type === "attributes") translateAttribute(mutation.target, mutation.attributeName);
    else for (const node of mutation.addedNodes) translateSubtree(node);
  }
});
observer.observe(document.documentElement, {
  subtree: true,
  childList: true,
  characterData: true,
  attributes: true,
  attributeFilter: ["title", "aria-label", "placeholder"]
});

document.addEventListener("change", event => {
  if (event.target?.id === "languageV060") setLanguage(event.target.value, true);
});

const previousInit = window.UI?.init?.bind(window.UI);
if (previousInit) {
  window.UI.init = function initI18nV062(save, game) {
    const result = previousInit(save, game);
    setLanguage(save?.settings?.language || language, false);
    return result;
  };
}

updateDocumentMetadata();
translateSubtree(document.documentElement);

window.CHERRIFT_I18N = {
  version: VERSION,
  get language() { return language; },
  translate: translateCore,
  translateSubtree,
  setLanguage,
  supported: [...SUPPORTED]
};

console.info("[CHERRIFT] v0.6.2 Hungarian/English localization loaded.");
})();
