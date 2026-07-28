(() => {
"use strict";

window.CHERRIFT_LOCALES = window.CHERRIFT_LOCALES || {};
window.CHERRIFT_LOCALES.en = {
  common: {
    back: "Back",
    play: "Play",
    equip: "Equip",
    equipped: "Equipped",
    locked: "Locked",
    comingSoon: "Coming Soon",
    new: "New",
    close: "Close",
    claimed: "Claimed",
    claim: "Claim",
    testBuild: "Test Build"
  },
  skin: {
    title: "Cherry Selector",
    subtitle: "Select a Cherry to inspect it. Equipping is a separate action.",
    splashArt: "Splash Art",
    gameView: "Game View",
    combatType: "Combat Type",
    passive: "Passive",
    skill: "Skill",
    skillDetails: "Skill details",
    cooldown: "Cooldown",
    damage: "Damage / Healing",
    range: "Range",
    type: "Type",
    direction: "Direction",
    animation: "Animation",
    idle: "Idle",
    walk: "Walk",
    attack: "Attack",
    skillAnimation: "Skill",
    stationary: "Stationary Attack",
    mobile: "Mobile Attack",
    lockedHint: "This skin has not been unlocked.",
    equippedToast: "{name} equipped."
  },
  world: {
    title: "World Select",
    subtitle: "Choose a World, then select one of its chapters.",
    recommendedLevel: "Recommended level: {level}",
    difficulty: "Difficulty",
    completion: "Completion",
    bestTime: "Best Time",
    objective: "Objective",
    boss: "Boss",
    firstClearReward: "First Clear Reward",
    repeatReward: "Possible / Repeat Rewards",
    unavailable: "No playable chapters are available in this World yet.",
    unlockRequirement: "Clear {chapter} to unlock.",
    worldRequirement: "Complete the previous World to unlock.",
    selectedLoadout: "Selected Cherry: {name}",
    enemies: "{amount} enemies",
    available: "Available",
    completed: "Completed",
    perfect: "Perfect Clear"
  },
  event: {
    title: "Events",
    subtitle: "Limited events and test rewards.",
    welcomeName: "Closed Beta Welcome Event",
    welcomeDescription: "A small test event for validating progress and one-time reward delivery.",
    loginTask: "Enter the game",
    progress: "Progress",
    reward: "Welcome reward",
    rewardContents: "250 Coins · 1 Common Chest",
    claimedToast: "Welcome reward claimed.",
    alreadyClaimed: "This reward has already been claimed."
  },
  menu: {
    feedback: "Feedback",
    bugReport: "Bug Report",
    mail: "Mail",
    settings: "Settings",
    event: "Event"
  },
  error: {
    missingTranslation: "Missing translation: {key}",
    lockedSkin: "Skin locked",
    lockedStage: "Chapter locked"
  },
  skins: {
    cherry_default: { name:"Base Cherry", desc:"The original ranged Cherry.", passive:"+2% ATK bonus", skill:"Bloom Dash", skillDesc:"A fast forward dash with a brief invulnerable window." },
    fairy_cherry: { name:"Fairy Cherry", desc:"A nimble magical Cherry.", passive:"Increased movement speed", skill:"Magic Burst", skillDesc:"Damages enemies in an area around Cherry." },
    beastclaw_cherry: { name:"Beastclaw Cherry", desc:"A close-range claw fighter.", passive:"Melee pressure", skill:"Savage Rend", skillDesc:"A forward lunge followed by a wide claw strike." },
    ninja_cherry: { name:"Ninja Cherry", desc:"A fast mobile shuriken fighter.", passive:"5% poison damage", skill:"Shuriken Shots", skillDesc:"Throws shuriken in every direction and gains movement speed." },
    succubus_cherry: { name:"Succubus Cherry", desc:"A life-draining ranged Cherry.", passive:"5% HP drain", skill:"Soul Drain", skillDesc:"Homing souls damage enemies and restore health." },
    warrior_cherry: { name:"Warrior Cherry", desc:"A durable close-range sword fighter.", passive:"+5% HP bonus", skill:"Whirlwind", skillDesc:"A multi-hit spinning sword attack around Cherry." },
    wuxia_sakura_cherry: { name:"Wuxia Sakura Cherry", desc:"A swift dual-sword fighter.", passive:"Kills reduce remaining skill cooldown", skill:"Blossom Spin", skillDesc:"A Sakura sword spin that damages nearby enemies." },
    mage_cherry: { name:"Mage Cherry", desc:"A staff-wielding ranged caster.", passive:"HP recovery", skill:"Magical Shot", skillDesc:"Releases five homing magic orbs." },
    archer_cherry: { name:"Archer Cherry", desc:"A mobile ranged bow user.", passive:"+10% critical chance", skill:"Four Arrow Shot", skillDesc:"Fires four arrows in a wide cone." },
    cake_deliver_cherry: { name:"Cake Deliver Cherry", desc:"A hybrid Common Cherry.", passive:"+1% ATK · +1% HP", skill:"Pink Burst", skillDesc:"Damage, knockback and a short movement boost." },
    kimono_cherry: { name:"Kimono Cherry", desc:"A support Common Cherry.", passive:"Support bonus", skill:"Sakura Heal", skillDesc:"Restores health and briefly increases movement speed." },
    pajama_cherry: { name:"Pajama Cherry", desc:"A defensive Common Cherry.", passive:"Defensive bonus", skill:"Dream Shield", skillDesc:"Restores health and grants a short invulnerable shield." },
    school_uniform_cherry: { name:"School Uniform Cherry", desc:"An offensive Common Cherry.", passive:"Attack bonus", skill:"Focused Bloom", skillDesc:"An offensive Cherry skill." },
    sport_cherry: { name:"Sport Cherry", desc:"An offensive Common Cherry.", passive:"Attack bonus", skill:"Power Shot", skillDesc:"An offensive Cherry skill." }
  },
  worlds: {
    w1: { name:"World 1 · Blooming Meadow", desc:"Bright meadows, Slime raids and the Slime King." },
    w2: { name:"World 2 · Night Bloom", desc:"A moonlit forest filled with insects and the Night Queen." },
    w3: { name:"World 3 · Ember Ruins", desc:"Ash-covered paths, living flame and the Cinder Guardian." },
    w4: { name:"World 4", desc:"Map content is being prepared." },
    w5: { name:"World 5", desc:"Map content is being prepared." },
    w6: { name:"World 6", desc:"Map content is being prepared." },
    w7: { name:"World 7", desc:"Coming Soon." }
  }
};
})();
