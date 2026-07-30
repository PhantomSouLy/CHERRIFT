window.CHERRIFT_DATA = {
  version: "0.2.4-fixed-full",
  slots: ["Weapon", "Helmet", "Armor", "Gloves", "Boots", "Ring", "Necklace"],
  slotIcons: { Weapon:"🗡️", Helmet:"⛑️", Armor:"🛡️", Gloves:"🧤", Boots:"👢", Ring:"💍", Necklace:"📿" },
  gearTypes: {
    Crimson: { label:"Crimson", role:"Offensive", emoji:"🔴", stats:["damage", "crit", "critDamage", "attackSpeed"] },
    Azure: { label:"Azure", role:"Defensive", emoji:"🔵", stats:["maxHp", "armor", "regen"] },
    Verdant: { label:"Verdant", role:"Hybrid", emoji:"🟢", stats:["damage", "maxHp", "moveSpeed", "pickup"] }
  },
  rarities: {
    Common: { mult:1, color:"#ffffff" },
    Uncommon: { mult:1.45, color:"#7dff99" },
    Rare: { mult:2.05, color:"#75c8ff" }
  },
  skins: [
    {
      id:"cherry_default", name:"Base Cherry", rarity:"Common", emoji:"🐰",
      weapon:"Pink Bloom Orb", skill:"Bloom Dash",
      desc:"Alap Cherry skin. Külön idle/walk sprite sheet + rövid dash skill.",
      stats:{ damage:0, speed:0 }, gradient:["#ff73b9", "#281226"]
    },
    {
      id:"fairy_cherry", name:"Fairy Cherry", rarity:"Rare", emoji:"🧚‍♀️",
      weapon:"Fairy Bloom Orb", skill:"Magic Burst",
      desc:"Tündér Cherry skin. Külön idle/walk sprite sheet + mágikus burst skill.",
      stats:{ damage:2, speed:8 }, gradient:["#b6ffd8", "#ff9ed0"]
    }
  ],
  upgrades: [
    { id:"damage", name:"Bloom Damage", desc:"+15% sebzés", apply:p=>p.damage*=1.15 },
    { id:"speed", name:"Swift Bunny", desc:"+12% mozgási sebesség", apply:p=>p.speed*=1.12 },
    { id:"firerate", name:"Quick Bloom", desc:"+12% attack speed", apply:p=>p.fireInterval*=0.88 },
    { id:"hp", name:"Soft Shield", desc:"+20 max HP és gyógyítás", apply:p=>{p.maxHp+=20;p.hp=Math.min(p.maxHp,p.hp+20)} },
    { id:"pickup", name:"Petal Magnet", desc:"+28 pickup radius", apply:p=>p.pickup+=28 },
    { id:"crit", name:"Lucky Bloom", desc:"+8% crit chance", apply:p=>p.crit+=0.08 }
  ]
};
