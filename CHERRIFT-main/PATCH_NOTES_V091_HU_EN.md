# CHERRIFT v0.9.1 — Common Skins & VFX

## Magyar

### Új Common skinek

- Cake Deliver Cherry — Hybrid
- Kimono Cherry — Support
- Pajama Cherry — Defensive
- School Uniform Cherry — Hybrid
- Sport Cherry — Defensive

Mind az öt skin külön Idle, Walk, Attack és Skill animációt kapott négy irányban. A runtime 192×192 px-es cellákat, 4 Idle és 6 Walk/Attack/Skill frame-et, valamint fix `x=96, y=184` pivotot használ. A skinválasztó, a Collection és a navigáció a saját splash artokat jeleníti meg.

### Common szerepkörök

- Offensive: +2% ATK; a skill Dash.
- Defensive: +2% HP; a Shield 2 másodpercig blokkolja a sebzést és 10% max HP-t gyógyít.
- Hybrid: +1% ATK és +1% HP; a Pink Burst sebez, hátralök és 1 másodpercre +5% mozgási sebességet ad.
- Support: +1% mozgási sebesség és másodpercenként 1% max HP regeneráció; a Healing 40% max HP-t gyógyít és 2 másodpercre +5% mozgási sebességet ad.

Az alaplövedék az Offensive, Defensive, Hybrid és Support szerepkörhöz tartozó saját PNG színváltozatot használja.

### Effektek és sprite-javítások

- A Succubus Crimson Claw, Soul Drain Core, animált Soul Burst, Wisp, Soul Hit, Lifesteal Siphon, Release és Blood Shield PNG-jei bekerültek.
- A Ninja két shurikenje és találati effektje valódi PNG-ként jelenik meg.
- A Wuxia normál vágása és hét-frame-es spin effektje bekerült; a frissített karakter sheetek fix pivotról, cellák közötti mintavételezés nélkül renderelődnek.
- A Warrior a külön `attack_1`, `skill_effect_1` és `skill_effect_2` rétegeket használja.
- A régi patch-lánc többszörös attack-timer csökkentése korrigálva lett, ezért az animációk a megadott FPS-sel futnak.
- A korábbi törölt melee és hit effect hivatkozások az aktuális fájlnevekre mutatnak.

### Map-határ

A bejárható terület határvonalán túl fokozatos, sötét fog jelenik meg. A réteg a canvas világképe fölött fut, ezért desktopon és mobilon egyformán jelzi a lezárt területet, a HUD-ot viszont nem takarja.

## English

### New Common skins

- Cake Deliver Cherry — Hybrid
- Kimono Cherry — Support
- Pajama Cherry — Defensive
- School Uniform Cherry — Hybrid
- Sport Cherry — Defensive

All five skins include separate four-direction Idle, Walk, Attack and Skill strips. The runtime uses 192×192 cells, 4 Idle frames, 6 Walk/Attack/Skill frames and a fixed `x=96, y=184` pivot. Their splash art is used by the skin selector, Collection and navigation.

### Common roles

- Offensive: +2% ATK; Dash skill.
- Defensive: +2% HP; Shield blocks damage for 2 seconds and restores 10% max HP.
- Hybrid: +1% ATK and +1% HP; Pink Burst damages, knocks enemies back and grants +5% movement for 1 second.
- Support: +1% movement and 1% max-HP recovery per second; Healing restores 40% max HP and grants +5% movement for 2 seconds.

Base projectiles use the dedicated Offensive, Defensive, Hybrid and Support PNG color variants.

### Effects and sprite fixes

- Succubus Crimson Claw, Soul Drain Core, animated Soul Burst, Wisp, Soul Hit, Lifesteal Siphon, Release and Blood Shield PNGs are active.
- Ninja uses both shuriken PNGs and its hit effect.
- Wuxia uses the normal slash and seven-frame spin effect; refreshed character strips render from a fixed pivot without adjacent-cell sampling.
- Warrior uses the separate `attack_1`, `skill_effect_1` and `skill_effect_2` layers.
- Duplicate legacy attack-timer decrements are compensated, so attack strips now play at their configured FPS.
- Removed legacy melee and hit-effect paths now point to the current filenames.

### Map boundary

A progressive dark fog begins beyond the playable boundary. It is rendered over the canvas world on both desktop and mobile while leaving the HUD unobscured.
