window.addEventListener("DOMContentLoaded", () => {
  const save = CherriftStorage.load();

  if (!save.inventory.length && !Object.keys(save.equipped || {}).length) {
    save.inventory.push(
      { id:"starter_1", slot:"Weapon", type:"Crimson", rarity:"Common", stats:{ damage:4 } },
      { id:"starter_2", slot:"Armor", type:"Azure", rarity:"Common", stats:{ maxHp:18, armor:2 } },
      { id:"starter_3", slot:"Boots", type:"Verdant", rarity:"Common", stats:{ moveSpeed:7 } }
    );
  }

  const input = new CherriftInput();
  const game = new CherriftGame(document.getElementById("game"), input, save);
  UI.init(save, game);
});