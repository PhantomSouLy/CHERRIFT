window.CHERRIFT_DATA = {
  version: "0.2.2",
  slots: ["Weapon","Helmet","Armor","Gloves","Boots","Ring","Necklace"],
  slotIcons: { Weapon:"🗡️", Helmet:"⛑️", Armor:"🛡️", Gloves:"🧤", Boots:"👢", Ring:"💍", Necklace:"📿" },
  gearTypes: {
    Crimson: { label:"Crimson", role:"Offensive", emoji:"🔴", stats:["damage","crit","critDamage","attackSpeed"] },
    Azure: { label:"Azure", role:"Defensive", emoji:"🔵", stats:["maxHp","armor","regen"] },
    Verdant: { label:"Verdant", role:"Hybrid", emoji:"🟢", stats:["damage","maxHp","moveSpeed","pickup"] }
  },
  rarities: {
    Common: { mult:1, color:"#ffffff" },
    Uncommon: { mult:1.45, color:"#7dff99" },
    Rare: { mult:2.05, color:"#75c8ff" }
  },
  skins: [
    {
      id:"cherry_default", name:"Cherry", rarity:"Common", emoji:"🐰",
      weapon:"Pink Bloom Orb", skill:"Bloom Dash",
      desc:"Alap CHERRIFT skin. Pink orb lövés, rövid dash és kis körsebzés.",
      stats:{ damage:0, speed:0 },
      gradient:["#ff73b9","#281226"]
    },
    {
      id:"sakura_cherry", name:"Sakura Cherry", rarity:"Common", emoji:"🌸",
      weapon:"Petal Shot", skill:"Petal Burst",
      desc:"Virágszirom lövés. Skill: körkörös sziromrobbanás több irányba.",
      stats:{ damage:-1, speed:10 },
      gradient:["#ff9ccf","#38204b"]
    },
    {
      id:"bunny_rare", name:"Bunny Cherry", rarity:"Rare", emoji:"🐇",
      weapon:"Bunny Bolt", skill:"Haste Bloom",
      desc:"Gyorsabb lövés és mozgás. Skill: rövid attack speed buff.",
      stats:{ damage:2, speed:16 },
      gradient:["#ffffff","#ff68b3"]
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