import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
const app = readFileSync("src/cherrift_app.js", "utf8");
const scope = vm.createContext({ window: {} });
vm.runInContext(readFileSync("src/cherrift_balance.js", "utf8"), scope);
vm.runInContext(
  app.slice(
    app.indexOf("const SKILL_TIERS ="),
    app.indexOf("const SKILL_NODE_FRAMES ="),
  ) + "\nglobalThis.skills={nodes:SKILL_NODES,branches:SKILL_BRANCHES};",
  scope,
);
vm.runInContext(
  app.slice(
    app.indexOf("const FOOD_CATALOG ="),
    app.indexOf("const EFFECT_LABELS ="),
  ) + "\nglobalThis.food=FOOD_CATALOG;",
  scope,
);
vm.runInContext(
  app.slice(
    app.indexOf("  const BASE_STATS ="),
    app.indexOf("  function createGear(world"),
  ) + "\nglobalThis.gearBase=BASE_STATS;",
  scope,
);
const runtime = readFileSync("src/cherrift_runtime.js", "utf8");
vm.runInContext(
  runtime.slice(
    runtime.indexOf("  const ACHIEVEMENTS ="),
    runtime.indexOf("  function language()"),
  ) + "\nglobalThis.achievements=ACHIEVEMENTS;",
  scope,
);
const data = {
  balance: scope.window.CHERRIFT_BALANCE,
  skills: scope.skills,
  food: scope.food,
  achievements: scope.achievements,
  gearBase: scope.gearBase,
};
mkdirSync("supabase/functions/_shared", { recursive: true });
writeFileSync(
  "supabase/functions/_shared/game_catalog.json",
  JSON.stringify(data, null, 2) + "\n",
);
// Reuse the real deterministic boot harness to collect final merged stage and
// skin definitions. The temporary child stays in tools so relative URLs match.
const temporary = "tools/.export-online-catalog.mjs";
const injection = `log("PASS");
  const fs = await import('node:fs');
  const catalog = JSON.parse(fs.readFileSync('supabase/functions/_shared/game_catalog.json','utf8'));
  catalog.stages = window.CHERRIFT_V040.stages.filter(stage=>!stage.training);
  catalog.skins = window.CHERRIFT_DATA.skins;
  catalog.gearTypes = window.CHERRIFT_DATA.gearTypes;
  catalog.rarities = window.CHERRIFT_DATA.rarities;
  fs.writeFileSync('supabase/functions/_shared/game_catalog.json',JSON.stringify(catalog,null,2)+'\\n');`;
writeFileSync(
  temporary,
  readFileSync("tools/smoke_boot_096.mjs", "utf8").replace(
    'log("PASS");',
    injection,
  ),
);
try {
  const result = spawnSync(process.execPath, [temporary, "--case=desktop"], {
    stdio: "inherit",
    timeout: 140000,
  });
  if (result.status !== 0) process.exitCode = 1;
} finally {
  unlinkSync(temporary);
}
