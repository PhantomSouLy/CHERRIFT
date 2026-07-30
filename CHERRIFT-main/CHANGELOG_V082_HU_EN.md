# CHERRIFT v0.8.2 — Systems Rework

## Magyar

### Gear javítás
- Mind a 7 felszerelési slot új, stabil körkiosztást kapott.
- A Helmet, Necklace, Armor, Gloves, Weapon, Ring és Boots PC-n és telefonon is a karakter körül marad.
- A slotméret és a Gear-stage magassága kisebb képernyőkre is igazodik.
- Új többes kijelölési mód.
- Common/Uncommon automatikus kijelölés.
- Bulk Sell és Bulk Dismantle.
- Zárolt geart nem jelöl ki és nem bont le.
- Epic/Legendary kijelölésnél megerősítés szükséges.

### Kompakt Arsenal
- A felső material sáv megmaradt.
- Minden kártyán csak: ikon, slotnév, szint, csillag, szorzó, követelmények és egy fő gomb.
- A Level Up gomb a szintlimiten automatikusan Star Up gombbá válik.
- Materialokra kattintva megjelennek a beszerzési források.
- A régi Salvage/Merge gombok kikerültek az Arsenal kártyákról; a tömeges bontás a Gear inventoryban van.

### Új fő navigáció
Sorrend:
1. Játék
2. Cherry
3. Felszerelés
4. Arsenal
5. Player Upgrade
6. BAG
7. Gacha
8. Bolt
9. Gyűjtemény
10. Eredmények

Alul fixen:
- Beállítások
- Profil

### Main Menu
- Megmaradt az aktív Cherry, World, Power, HP és ATK kártya.
- Új gyorsgombok: Daily Reward, Weekly Reward, Login Reward, Mail, Social, Buff List.
- Jobb felső gyorsikonok: Feedback, Bug Report, Mail, Settings.
- Egységes Coin / Blossom Gem / Sakura Essence / Gear Scrap sáv.
- Akcióképes értesítési pöttyök.

### Gacha / BAG / Shop / Buff List
- A Gacha oldalon már csak a három chest és pity rendszer látható.
- BAG, Shop és Buff List külön menüpontként nyílik.
- A meglévő v0.8 adatmodell és jutalomlogika megmaradt.

### Collection és Player Profile
- A Collection többé nem Player Profile.
- A Collection alapértelmezetten a Skin gyűjteményt nyitja; Gear, Enemies és Worlds fülek maradnak.
- Külön Player Profile oldal:
  - profilnév és aktív Cherry;
  - Player Level;
  - Achievement szám;
  - kill, clear, XP, gear, Gacha és Arsenal statok;
  - választható Title rendszer;
  - későbbi ikonkeretek előkészítése.
- Külön Social placeholder a Friends List számára, multiplayer nélkül.

### Új Skill Tree
Vízszintesen görgethető kattintással/tappal és húzással, PC-n egérgörgővel is.

- Level 0: Damage 0/5, Max HP 0/5, Orb XP 0/5
- Level 5: Movement Speed 0/4, Critical Chance 0/5, Luck 0/3
- Level 10: Attack Speed 0/4, Critical Damage 0/5, Damage Reduction 0/4
- Level 15: Pickup Range 0/5, HP Regeneration 0/5, Skill Cooldown Reduction 0/2
- Level 20: Skill Damage 0/3, Boss Damage 0/3, Elite Damage 0/3
- Level 25: Coin Gain 0/3, Item Drop 0/2, Chest Drop 0/2

- Node-onként eltérő ranglimit.
- Szintkapuk.
- Régi Skill Tree automatikus migrációja.
- Skill Tree Reset megerősítéssel.
- Első reset ingyenes, a későbbiek Coinba kerülnek.
- Részletes Stat Summary oldal.

### Weekly Reward
- Heti 5 run, 3 clear és 300 kill cél.
- Jutalom: 800 Coin, 25 Blossom Gem, 1 Rare Chest.

### Tartalom
- World és új Cherry skin tartalom szándékosan nincs ebben a csomagban.
- Ezek a stabil rendszerpróba után kerülhetnek hozzá.

---

## English

- Stable seven-slot Gear layout on desktop and mobile.
- Bulk Select, Select Common, Bulk Sell and Bulk Dismantle.
- Compact Arsenal cards with one contextual Level Up / Star Up action.
- Clickable material source information.
- Rebuilt left navigation and fixed Settings/Profile footer.
- Separate Gacha, BAG, Shop, Buff List, Collection and Profile routes.
- Main Menu quick actions and top-right support tools.
- Dedicated Player Profile with unlockable Titles.
- Horizontal level-gated Skill Tree with per-node rank caps.
- Old Skill Tree migration and reset system.
- Stat Summary, actionable notification dots and shared resource bar.
- Weekly Reward system.
- Worlds and new Cherry skins are intentionally reserved for the next content pass.
