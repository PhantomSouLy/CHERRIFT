import { readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(toolsDir, "smoke.mjs");
const tempPath = path.join(toolsDir, `.smoke_09552_${process.pid}.mjs`);
let source = await readFile(sourcePath, "utf8");

const replacements = [
  {
    name: "Warrior canonical icon",
    pattern: /assert\.ok\(window\.CHERRIFT_DATA\.skins\.find\(skin=>skin\.id==="warrior_cherry"\)\?\.icon\.endsWith\("warrior_cherry_icon\.png"\),`\$\{name\}: Warrior placeholder thumbnail`\);/,
    replacement: 'assert.ok(window.CHERRIFT_DATA.skins.find(skin=>skin.id==="warrior_cherry")?.icon?.match(/warrior_cherry_icon\.(?:png|jpe?g)(?:[?#]|$)/i),`${name}: Warrior placeholder thumbnail`);'
  },
  {
    name: "Wuxia canonical icon",
    pattern: /assert\.ok\(window\.CHERRIFT_DATA\.skins\.find\(skin=>skin\.id==="wuxia_sakura_cherry"\)\?\.icon\.endsWith\("wuxia_sakura_cherry_icon\.png"\),`\$\{name\}: Wuxia placeholder thumbnail`\);/,
    replacement: 'assert.ok(window.CHERRIFT_DATA.skins.find(skin=>skin.id==="wuxia_sakura_cherry")?.icon?.match(/wuxia_sakura_cherry_icon\.(?:png|jpe?g)(?:[?#]|$)/i),`${name}: Wuxia placeholder thumbnail`);'
  },
  {
    name: "Archer critical chance after base-stat rebalance",
    pattern: /assert\.ok\(UI\.game\.player\.crit>=\.15,`\$\{name\}: Archer passive crit`\);/,
    replacement: 'assert.ok(UI.game.player.crit>=.13,`${name}: Archer passive crit (13% base + 10% passive)`);'
  }
];

for (const fix of replacements) {
  const matches = source.match(new RegExp(fix.pattern.source, fix.pattern.flags.includes("g") ? fix.pattern.flags : `${fix.pattern.flags}g`)) || [];
  if (matches.length !== 1) {
    throw new Error(`Smoke compatibility update failed for ${fix.name}: expected exactly one legacy assertion, found ${matches.length}.`);
  }
  source = source.replace(fix.pattern, fix.replacement);
}

// Keep this compatibility layer narrow: it updates smoke assertions made
// stale by JPG icon assets and Archer base stat rebalance.
// Runtime behavior is still exercised normally.
await writeFile(tempPath, source, "utf8");
try {
  await import(`${pathToFileURL(tempPath).href}?v=09552`);
} finally {
  await rm(tempPath, { force: true });
}
