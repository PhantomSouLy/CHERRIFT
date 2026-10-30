import { readdir, readFile, writeFile } from 'node:fs/promises';
import { validateCatalog } from '../supabase/functions/_shared/events.mjs';
const root = new URL('../event/', import.meta.url);
const events = [];
for (const dir of (await readdir(root, { withFileTypes: true })).filter(d => d.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name))) {
  const entry = JSON.parse(await readFile(new URL(`${dir.name}/event.json`, root), 'utf8'));
  if (entry.id !== dir.name) throw new Error(`Event ID must match folder: ${dir.name}`);
  events.push(entry);
}
await writeFile(new URL('catalog.json', root), JSON.stringify(validateCatalog({ events }), null, 2)+'\n');
console.log(`Built ${events.length} event modules`);
