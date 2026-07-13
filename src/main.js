window.addEventListener("DOMContentLoaded", async () => {
  async function loadScript(src,label){try{await new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}catch(error){console.error(`[CHERRIFT] ${label} failed to load:`,error);}}
  await loadScript("src/cherrift_v042_completion.js?v=042","v0.4 completion patch");
  await loadScript("src/cherrift_v050.js?v=050","v0.5 progression patch");
  await loadScript("src/cherrift_mobile_v051.js?v=051","v0.5.1 mobile menu patch");
  await loadScript("src/cherrift_v052.js?v=052","v0.5.2 progression/UI patch");
  const save=CherriftStorage.load();
  if(!save.inventory.length&&!Object.keys(save.equipped||{}).length){
    save.inventory.push(
      {id:"starter_1",slot:"Weapon",type:"Crimson",rarity:"Common",itemLevel:1,locked:false,stats:{damage:4}},
      {id:"starter_2",slot:"Armor",type:"Azure",rarity:"Common",itemLevel:1,locked:false,stats:{maxHp:18,armor:2}},
      {id:"starter_3",slot:"Boots",type:"Verdant",rarity:"Common",itemLevel:1,locked:false,stats:{moveSpeed:7}}
    );CherriftStorage.save(save);
  }
  const input=new CherriftInput();const game=new CherriftGame(document.getElementById("game"),input,save);UI.init(save,game);
});