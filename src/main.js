window.addEventListener("DOMContentLoaded", async () => {
  try {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "src/cherrift_v042_completion.js?v=042";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  } catch (error) {
    console.error("[CHERRIFT] v0.4 completion patch failed to load:", error);
  }

  const save = CherriftStorage.load();

  if (!save.inventory.length && !Object.keys(save.equipped || {}).length) {
    save.inventory.push(
      { id:"starter_1", slot:"Weapon", type:"Crimson", rarity:"Common", stats:{ damage:4 } },
      { id:"starter_2", slot:"Armor", type:"Azure", rarity:"Common", stats:{ maxHp:18, armor:2 } },
      { id:"starter_3", slot:"Boots", type:"Verdant", rarity:"Common", stats:{ moveSpeed:7 } }
    );
    CherriftStorage.save(save);
  }

  const input = new CherriftInput();
  const game = new CherriftGame(document.getElementById("game"), input, save);
  UI.init(save, game);
});