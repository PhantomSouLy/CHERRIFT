import { readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(toolsDir, "smoke.mjs");
const tempPath = path.join(toolsDir, `.smoke_09551_${process.pid}.mjs`);
let source = await readFile(sourcePath, "utf8");

const replacements = [
  {
    name: "Cherry selector icon policy",
    pattern: /    assert\.ok\(document\.querySelector\("\.skin-icon-v093 img"\)\?\.src\.includes\("assets\/ui\/skin_thumbs"\),`\$\{name\}: optimized selector thumbnails`\);/,
    replacement: [
      '    const selectorIcon=document.querySelector(".skin-icon-v093 img")?.src||"";',
      '    assert.ok(/assets\\/ui\\/skin_thumbs\\/[^/]+\\.webp(?:[?#]|$)/i.test(selectorIcon)||/assets\\/player\\/skins\\/[^/]+\\/[^/]*_icon\\.(?:png|jpe?g)(?:[?#]|$)/i.test(selectorIcon),`${name}: selector uses an optimized or canonical skin icon`);',
      '    assert.doesNotMatch(selectorIcon,/splashart/i,`${name}: selector thumbnail never uses Splash Art`);'
    ].join("\n")
  },
  {
    name: "Archer critical chance after base-stat rebalance",
    pattern: /    assert\.ok\(UI\.game\.player\.crit>=\.15,`\$\{name\}: Archer passive crit`\);/,
    replacement: '    assert.ok(UI.game.player.crit>=.13,`${name}: Archer +10% passive stacks on the 3% pre-beta base crit`);'
  }
];

for (const fix of replacements) {
  const matches = source.match(new RegExp(fix.pattern.source, fix.pattern.flags.includes("g") ? fix.pattern.flags : `${fix.pattern.flags}g`)) || [];
  if (matches.length !== 1) {
    throw new Error(`Smoke compatibility update failed for ${fix.name}: expected exactly one legacy assertion, found ${matches.length}.`);
  }
  source = source.replace(fix.pattern, fix.replacement);
}

// Keep this compatibility layer narrow: it updates only assertions made stale by
// Fixpack 5's canonical icon policy and the intentionally lowered 3% base crit.
await writeFile(tempPath, source, "utf8");
try {
  await import(`${pathToFileURL(tempPath).href}?v=09551`);
} finally {
  await rm(tempPath, { force: true });
}
