window.addEventListener("DOMContentLoaded", async () => {
  async function loadScript(src,label){
    try{
      await new Promise((resolve,reject)=>{
        const script=document.createElement("script");
        script.src=src;
        script.onload=resolve;
        script.onerror=reject;
        document.head.appendChild(script);
      });
    }catch(error){
      console.error(`[CHERRIFT] ${label} failed:`,error);
    }
  }

  await loadScript("src/cherrift_v042_completion.js?v=042","v0.4 completion");
  await loadScript("src/cherrift_v050.js?v=050","v0.5");
  await loadScript("src/cherrift_mobile_v051.js?v=051","v0.5.1");
  await loadScript("src/cherrift_v052.js?v=052","v0.5.2");
  await loadScript("src/cherrift_v053.js?v=053","v0.5.3");
  await loadScript("src/cherrift_v055a.js?v=055a","v0.5.5a");
  await loadScript("src/cherrift_v055b.js?v=055b","v0.5.5b");
  await loadScript("src/cherrift_v055c.js?v=055c","v0.5.5c");
  await loadScript("src/cherrift_v0551.js?v=0551","v0.5.5.1 hotfix");

  const save=CherriftStorage.load();

  if(!save.inventory.length&&!Object.keys(save.equipped||{}).length){
    save.inventory.push(
      {id:"starter_1",slot:"Weapon",type:"Crimson",rarity:"Common",itemLevel:1,locked:false,stats:{damage:4}},
      {id:"starter_2",slot:"Armor",type:"Azure",rarity:"Common",itemLevel:1,locked:false,stats:{maxHp:18,armor:2}},
      {id:"starter_3",slot:"Boots",type:"Verdant",rarity:"Common",itemLevel:1,locked:false,stats:{moveSpeed:7}}
    );
    CherriftStorage.save(save);
  }

  const input=new CherriftInput();
  const game=new CherriftGame(document.getElementById("game"),input,save);
  UI.init(save,game);
});