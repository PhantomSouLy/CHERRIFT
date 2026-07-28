(() => {
"use strict";

window.CHERRIFT_LOCALES = window.CHERRIFT_LOCALES || {};
window.CHERRIFT_LOCALES.hu = {
  common: {
    back: "Vissza",
    play: "Játék",
    equip: "Felszerelés",
    equipped: "Felszerelve",
    locked: "Zárolva",
    comingSoon: "Hamarosan",
    new: "Új",
    close: "Bezárás",
    claimed: "Átvéve",
    claim: "Átvétel",
    testBuild: "Tesztverzió"
  },
  skin: {
    title: "Cherry-választó",
    subtitle: "Válassz Cherryt a megtekintéshez. A felszerelés külön művelet.",
    splashArt: "Splash Art",
    gameView: "Játékbeli nézet",
    combatType: "Harci típus",
    passive: "Passzív",
    skill: "Képesség",
    skillDetails: "Képesség részletei",
    cooldown: "Újratöltés",
    damage: "Sebzés / Gyógyítás",
    range: "Hatótáv",
    type: "Típus",
    direction: "Irány",
    animation: "Animáció",
    idle: "Idle",
    walk: "Séta",
    attack: "Támadás",
    skillAnimation: "Képesség",
    stationary: "Álló támadás",
    mobile: "Mozgó támadás",
    lockedHint: "Ez a skin még nincs feloldva.",
    equippedToast: "{name} felszerelve."
  },
  world: {
    title: "Világválasztás",
    subtitle: "Válassz Világot, majd annak egyik chapterét.",
    recommendedLevel: "Ajánlott szint: {level}",
    difficulty: "Nehézség",
    completion: "Teljesítés",
    bestTime: "Legjobb idő",
    objective: "Cél",
    boss: "Boss",
    firstClearReward: "Első teljesítési jutalom",
    repeatReward: "Lehetséges / Ismételhető jutalmak",
    unavailable: "Ebben a Világban még nincs játszható chapter.",
    unlockRequirement: "Teljesítsd ezt: {chapter}.",
    worldRequirement: "Teljesítsd az előző Világot a feloldáshoz.",
    selectedLoadout: "Kiválasztott Cherry: {name}",
    enemies: "{amount} ellenfél",
    available: "Elérhető",
    completed: "Teljesítve",
    perfect: "Tökéletes teljesítés"
  },
  event: {
    title: "Eventek",
    subtitle: "Korlátozott események és tesztjutalmak.",
    welcomeName: "Closed Beta Welcome Event",
    welcomeDescription: "Kis tesztesemény a progress és az egyszeri jutalomátvétel ellenőrzésére.",
    loginTask: "Lépj be a játékba",
    progress: "Haladás",
    reward: "Üdvözlő jutalom",
    rewardContents: "250 Coin · 1 Common Chest",
    claimedToast: "Üdvözlő jutalom átvéve.",
    alreadyClaimed: "Ezt a jutalmat már átvetted."
  },
  menu: {
    feedback: "Visszajelzés",
    bugReport: "Hibajelentés",
    mail: "Levelek",
    settings: "Beállítások",
    event: "Event"
  },
  error: {
    missingTranslation: "Hiányzó fordítás: {key}",
    lockedSkin: "A skin zárolva van",
    lockedStage: "A chapter zárolva van"
  },
  skins: {
    cherry_default: { name:"Base Cherry", desc:"Az eredeti ranged Cherry.", passive:"+2% ATK bónusz", skill:"Bloom Dash", skillDesc:"Gyors előretörés rövid sérthetetlenséggel." },
    fairy_cherry: { name:"Fairy Cherry", desc:"Fürge mágikus Cherry.", passive:"Nagyobb mozgási sebesség", skill:"Magic Burst", skillDesc:"Cherry körül területi sebzést okoz." },
    beastclaw_cherry: { name:"Beastclaw Cherry", desc:"Közelharci karomharcos.", passive:"Közelharci nyomás", skill:"Savage Rend", skillDesc:"Előretörés, majd széles karmolás." },
    ninja_cherry: { name:"Ninja Cherry", desc:"Gyors, mozgó shurikenharcos.", passive:"5% méregsebzés", skill:"Shuriken Shots", skillDesc:"Minden irányba shurikent dob és gyorsabbá válik." },
    succubus_cherry: { name:"Succubus Cherry", desc:"Életerőt elszívó ranged Cherry.", passive:"5% HP Drain", skill:"Soul Drain", skillDesc:"Célkövető lelkek sebeznek és gyógyítanak." },
    warrior_cherry: { name:"Warrior Cherry", desc:"Tartós közelharci kardforgató.", passive:"+5% HP bónusz", skill:"Whirlwind", skillDesc:"Többször sebző forgó kardcsapás Cherry körül." },
    wuxia_sakura_cherry: { name:"Wuxia Sakura Cherry", desc:"Gyors, kétkardos harcos.", passive:"A killek csökkentik a maradék skill cooldownját", skill:"Blossom Spin", skillDesc:"Sakura kardforgás, amely a közeli ellenfeleket sebzi." },
    mage_cherry: { name:"Mage Cherry", desc:"Bottal harcoló távolsági mágus.", passive:"HP regeneráció", skill:"Magical Shot", skillDesc:"Öt célkövető mágikus gömböt idéz." },
    archer_cherry: { name:"Archer Cherry", desc:"Mozgékony távolsági íjász.", passive:"+10% kritikus esély", skill:"Four Arrow Shot", skillDesc:"Négy nyilat lő ki széles kúpban." },
    cake_deliver_cherry: { name:"Cake Deliver Cherry", desc:"Hybrid Common Cherry.", passive:"+1% ATK · +1% HP", skill:"Pink Burst", skillDesc:"Sebzés, hátralökés és rövid mozgási bónusz." },
    kimono_cherry: { name:"Kimono Cherry", desc:"Support Common Cherry.", passive:"Support bónusz", skill:"Sakura Heal", skillDesc:"Gyógyít és röviden növeli a mozgási sebességet." },
    pajama_cherry: { name:"Pajama Cherry", desc:"Defensive Common Cherry.", passive:"Defenzív bónusz", skill:"Dream Shield", skillDesc:"Gyógyít és rövid sérthetetlen pajzsot ad." },
    school_uniform_cherry: { name:"School Uniform Cherry", desc:"Offensive Common Cherry.", passive:"Támadási bónusz", skill:"Focused Bloom", skillDesc:"Offenzív Cherry-képesség." },
    sport_cherry: { name:"Sport Cherry", desc:"Offensive Common Cherry.", passive:"Támadási bónusz", skill:"Power Shot", skillDesc:"Offenzív Cherry-képesség." }
  },
  worlds: {
    w1: { name:"World 1 · Virágzó rét", desc:"Világos mezők, Slime raid és a Slime King." },
    w2: { name:"World 2 · Éjszakai virágzás", desc:"Holdfényes erdő rovarokkal és a Night Queennel." },
    w3: { name:"World 3 · Parázsromok", desc:"Hamuval borított ösvények, élő láng és a Cinder Guardian." },
    w4: { name:"World 4", desc:"A map tartalma előkészítés alatt áll." },
    w5: { name:"World 5", desc:"A map tartalma előkészítés alatt áll." },
    w6: { name:"World 6", desc:"A map tartalma előkészítés alatt áll." },
    w7: { name:"World 7", desc:"Hamarosan." }
  }
};
})();
