#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", "node_modules"]);
const sourceExtensions = new Set([".html", ".css", ".js", ".mjs"]);
const imageExtensions = [".png", ".jpg", ".jpeg", ".webp"];
const errors = [];
const warnings = [];

function walk(directory) {
  const files = [];
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory, { withFileTypes:true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

const files = walk(root);
const sourceFiles = files.filter(file => sourceExtensions.has(extname(file).toLowerCase()));
const javascriptFiles = files.filter(file => [".js", ".mjs"].includes(extname(file).toLowerCase()));
const cssFiles = files.filter(file => extname(file).toLowerCase() === ".css");

for (const file of javascriptFiles) {
  const check = spawnSync(process.execPath, ["--check", file], { encoding:"utf8" });
  if (check.status !== 0) errors.push(`${relative(root, file)}: JavaScript syntax error\n${check.stderr.trim()}`);
}

try {
  const cssTree = await import("css-tree");
  for (const file of cssFiles) {
    try { cssTree.parse(readFileSync(file, "utf8"), { filename:relative(root, file) }); }
    catch (error) { errors.push(`${relative(root, file)}: CSS syntax error\n${error.message}`); }
  }
} catch (error) {
  if (error?.code === "ERR_MODULE_NOT_FOUND") warnings.push("css-tree is not installed; CSS parsing was skipped (run npm install)");
  else errors.push(`CSS validator failed to start: ${error?.message || error}`);
}

function sameStemCandidates(asset) {
  const absolute = join(root, asset);
  const directory = dirname(absolute);
  const extension = extname(absolute).toLowerCase();
  const stem = basename(absolute, extension);
  const candidates = [];

  if (imageExtensions.includes(extension)) {
    for (const alternate of imageExtensions) candidates.push(join(directory, `${stem}${alternate}`));
  }

  // A few old icon names existed before the canonical <folder>_icon convention.
  if (/assets[\\/]player[\\/]skins[\\/]/i.test(absolute) && existsSync(directory)) {
    const wantedType = /_splashart$/i.test(stem) ? "splashart" : /_icon$/i.test(stem) ? "icon" : "";
    if (wantedType) {
      for (const name of readdirSync(directory)) {
        const lower = name.toLowerCase();
        if (!imageExtensions.includes(extname(lower))) continue;
        if (wantedType === "icon" && /_icon\.(?:png|jpe?g|webp)$/i.test(lower)) candidates.push(join(directory, name));
        if (wantedType === "splashart" && /_splashart\.(?:png|jpe?g|webp)$/i.test(lower)) candidates.push(join(directory, name));
      }
    }
  }
  return candidates;
}

function normalizedEnemyStem(name) {
  return name.toLowerCase()
    .replace(/\.(?:png|jpe?g|webp)$/i, "")
    .replace(/_rgba$/i, "")
    .replace(/_sprite_sheet$/i, "_sprite")
    .replace(/_sheet$/i, "")
    .replace(/__+/g, "_");
}

const enemyFiles = walk(join(root, "assets", "enemies")).filter(file => imageExtensions.includes(extname(file).toLowerCase()));

function migratedAsset(asset) {
  const absolute = join(root, asset);
  if (existsSync(absolute)) return absolute;

  for (const candidate of sameStemCandidates(asset)) if (existsSync(candidate)) return candidate;

  if (/^assets\/enemies\//i.test(asset)) {
    const requested = basename(asset).toLowerCase();
    const exact = enemyFiles.find(file => basename(file).toLowerCase() === requested);
    if (exact) return exact;
    const normalized = normalizedEnemyStem(requested);
    const fuzzy = enemyFiles.find(file => normalizedEnemyStem(basename(file)) === normalized);
    if (fuzzy) return fuzzy;
  }

  // Legacy typo aliases from the pre-standardized skin icon pass.
  const aliases = [
    ["beatclaw_cherry_icon", "beastclaw_cherry_icon"],
    ["cake_delivery_cherry_icon", "cake_deliver_cherry_icon"]
  ];
  for (const [oldStem, newStem] of aliases) {
    if (!asset.toLowerCase().includes(oldStem)) continue;
    for (const extension of imageExtensions) {
      const candidate = join(root, asset.replace(new RegExp(`${oldStem}\\.[^.]+$`, "i"), `${newStem}${extension}`));
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

const directAssetPattern = /["'`(](assets\/[A-Za-z0-9_@./ ()+-]+?\.(?:png|jpe?g|webp|gif|svg|wav|mp3|ogg|json))(?:\?[^"'`)\s]*)?/gi;
const missingAssets = new Map();
const migrated = new Map();

for (const file of sourceFiles) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(directAssetPattern)) {
    const asset = match[1];
    if (asset.includes("${")) continue;
    const assetPath = join(root, asset);
    if (existsSync(assetPath)) {
      if (statSync(assetPath).size === 0) errors.push(`${asset}: referenced asset is empty`);
      continue;
    }
    const replacement = migratedAsset(asset);
    if (replacement) {
      const refs = migrated.get(asset) || { replacement:relative(root, replacement), refs:[] };
      refs.refs.push(relative(root, file));
      migrated.set(asset, refs);
    } else {
      const refs = missingAssets.get(asset) || [];
      refs.push(relative(root, file));
      missingAssets.set(asset, refs);
    }
  }
}

for (const [asset, info] of migrated) {
  warnings.push(`${asset}: legacy asset reference resolves to ${info.replacement} (referenced by ${[...new Set(info.refs)].join(", ")})`);
}
for (const [asset, refs] of missingAssets) {
  errors.push(`${asset}: missing asset (referenced by ${[...new Set(refs)].join(", ")})`);
}

const indexPath = join(root, "index.html");
const html = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
if (!html) errors.push("index.html: missing");
else {
  const ids = new Map();
  for (const match of html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) ids.set(match[1], (ids.get(match[1]) || 0) + 1);
  for (const [id, count] of ids) if (count > 1) errors.push(`index.html: duplicate id \"${id}\" (${count} occurrences)`);

  for (const match of html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["']/gi)) {
    const reference = match[1].split(/[?#]/)[0];
    if (/^(?:https?:|data:|#)/i.test(reference)) continue;
    if (!existsSync(join(root, reference))) errors.push(`index.html: missing local dependency ${reference}`);
  }

  const appScriptIndex = html.indexOf('src="src/cherrift_app.js');
  const authScriptIndex = html.indexOf('src="src/cherrift_auth.js');
  if (appScriptIndex < 0 || authScriptIndex < 0 || authScriptIndex < appScriptIndex) {
    errors.push("index.html: standalone auth must load immediately after cherrift_app.js");
  }
}

for (const required of ["src/cherrift_app.js", "src/cherrift_auth.js", "assets/cherrift_app.css", "src/config.js"]) {
  if (!existsSync(join(root, required))) errors.push(`${required}: required runtime file is missing`);
}

const packagePath = join(root, "package.json");
if (!existsSync(packagePath)) errors.push("package.json: missing");
else {
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  if (pkg.version !== "0.9.5-prebeta.1") errors.push(`package.json: expected version 0.9.5-prebeta.1, found ${pkg.version}`);
  for (const dependency of ["@supabase/supabase-js", "@supabase/ssr"]) {
    if (!pkg.dependencies?.[dependency]) errors.push(`package.json: missing ${dependency}`);
  }
}

const runtimePath = join(root, "src", "cherrift_app.js");
if (existsSync(runtimePath)) {
  const runtime = readFileSync(runtimePath, "utf8");
  for (const marker of ["__CHERRIFT_EXTERNAL_AUTH__", "0.9.5"]) {
    if (!runtime.includes(marker)) errors.push(`src/cherrift_app.js: runtime marker is missing: ${marker}`);
  }
  if (/\b(?:mobile_v051|v\d+)\.css(?:\?|["'`])/i.test(runtime)) {
    errors.push("src/cherrift_app.js: historical standalone CSS must not be requested; it is consolidated in assets/cherrift_app.css");
  }
  if (/await\s+window\.CHERRIFT_AUTH\.bootstrapSave/.test(runtime)) {
    errors.push("src/cherrift_app.js: Guest bootstrap must never await Supabase/Auth");
  }
}

const authPath = join(root, "src", "cherrift_auth.js");
if (existsSync(authPath)) {
  const auth = readFileSync(authPath, "utf8");
  for (const marker of ["3.0.0-local-first-bootstrap", "function bootstrapSave", "discoverSession", "signInWithOAuth", 'provider:"discord"', "auth_session_timeout", "player_api_${action}_timeout", "cherrift-discord-backup-v2", "guestEnabled", "getClient"]) {
    if (!auth.includes(marker)) errors.push(`src/cherrift_auth.js: auth safety marker is missing: ${marker}`);
  }
  if (/async\s+function\s+bootstrapSave/.test(auth)) {
    errors.push("src/cherrift_auth.js: bootstrapSave must remain synchronous and local-only");
  }
}

const authConfigPath = join(root, "src", "supabase_config.js");
if (!existsSync(authConfigPath)) errors.push("src/supabase_config.js: missing public Supabase configuration");
else {
  const authConfig = readFileSync(authConfigPath, "utf8");
  if (/sb_(?:secret|service_role)_[A-Za-z0-9_-]+/i.test(authConfig)) errors.push("src/supabase_config.js: service-role material must never be shipped to the browser");
  if (!authConfig.includes("__CHERRIFT_EXTERNAL_AUTH__")) errors.push("src/supabase_config.js: standalone auth activation marker is missing");
}

const supabaseFunctionConfigPath = join(root, "supabase", "config.toml");
if (!existsSync(supabaseFunctionConfigPath)) errors.push("supabase/config.toml: missing Edge Function configuration");
else {
  const functionConfig = readFileSync(supabaseFunctionConfigPath, "utf8");
  for (const marker of ["[functions.player-api]", "[functions.gm-api]", "[functions.submit-report]"]) {
    if (!functionConfig.includes(marker)) errors.push(`supabase/config.toml: missing ${marker}`);
  }
}

const prebetaMigrationPath = join(root, "supabase", "migrations", "20260801_prebeta_v095.sql");
if (existsSync(prebetaMigrationPath)) {
  const migration = readFileSync(prebetaMigrationPath, "utf8");
  if (!/join public\.gm_admins[\s\S]{0,180}admins\.role = 'owner'[\s\S]{0,100}admins\.active = true/.test(migration)) {
    errors.push("supabase/migrations/20260801_prebeta_v095.sql: owner entitlements must be restricted to an active GM owner");
  }
}

for (const requiredSql of [
  "supabase/VERIFY_CURRENT_SCHEMA.sql",
  "supabase/migrations/20260821_auth_runtime_guard.sql"
]) {
  if (!existsSync(join(root, requiredSql))) errors.push(`${requiredSql}: required Auth/RLS recovery SQL is missing`);
}

function pngInfo(file) {
  const data = readFileSync(file);
  if (data.length < 26 || data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  return { width:data.readUInt32BE(16), height:data.readUInt32BE(20), colorType:data[25] };
}

function jpegInfo(file) {
  const data = readFileSync(file);
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) { offset++; continue; }
    const marker = data[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > data.length) break;
    const length = data.readUInt16BE(offset);
    if (length < 2 || offset + length > data.length) break;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      return { height:data.readUInt16BE(offset + 3), width:data.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  return null;
}

function imageInfo(file) {
  const extension = extname(file).toLowerCase();
  if (extension === ".png") return pngInfo(file);
  if (extension === ".jpg" || extension === ".jpeg") return jpegInfo(file);
  return null;
}

function validateDimensions(file, width, height, severity = "warning") {
  if (!existsSync(file)) return false;
  const info = imageInfo(file);
  const label = relative(root, file);
  if (!info) {
    const message = `${label}: could not read image dimensions`;
    (severity === "error" ? errors : warnings).push(message);
    return false;
  }
  if (info.width !== width || info.height !== height) {
    const message = `${label}: expected ${width}×${height}, found ${info.width}×${info.height}`;
    (severity === "error" ? errors : warnings).push(message);
  }
  return true;
}

// Canonical art contracts. PNG and JPEG are both supported source formats;
// dimensions and naming role matter more than forcing a pointless re-encode.
const skinRoot = join(root, "assets", "player", "skins");
if (existsSync(skinRoot)) {
  for (const entry of readdirSync(skinRoot, { withFileTypes:true })) {
    if (!entry.isDirectory()) continue;
    const folder = entry.name;
    const directory = join(skinRoot, folder);
    const names = readdirSync(directory);
    const findArt = type => {
      const exact = [".png", ".jpg", ".jpeg"]
        .map(extension => join(directory, `${folder}_${type}${extension}`))
        .find(existsSync);
      if (exact) return exact;
      const roleMatch = names.find(name => new RegExp(`_${type}\\.(?:png|jpe?g)$`, "i").test(name));
      return roleMatch ? join(directory, roleMatch) : null;
    };
    const icon = findArt("icon");
    const splash = findArt("splashart");

    if (icon) validateDimensions(icon, 512, 512, "warning");
    else warnings.push(`assets/player/skins/${folder}: skin icon is missing`);

    if (splash) validateDimensions(splash, 1152, 1536, "warning");
    else warnings.push(`assets/player/skins/${folder}: skin splash art is missing`);
  }
}

for (let world = 1; world <= 6; world++) {
  const directory = join(root, "assets", "map", `world${world}`);
  const variantCount = world === 4 ? 2 : 3;
  for (let variant = 1; variant <= variantCount; variant++) {
    const file = join(directory, `world${world}_splashart_${variant}.png`);
    if (!existsSync(file)) warnings.push(`assets/map/world${world}/world${world}_splashart_${variant}.png: canonical World splash is missing`);
    else validateDimensions(file, 450, 800, "warning");
  }
}

const equipmentRoot = join(root, "assets", "items", "equipments");
for (const file of walk(equipmentRoot).filter(file => extname(file).toLowerCase() === ".png")) {
  const info = pngInfo(file);
  if (!info) errors.push(`${relative(root, file)}: invalid PNG header`);
  else if (info.width !== 128 || info.height !== 128) warnings.push(`${relative(root, file)}: equipment icon is ${info.width}×${info.height}, expected 128×128`);
}

if (warnings.length) {
  console.warn(`Validation warnings (${warnings.length}):`);
  for (const warning of warnings) console.warn(`WARN: ${warning}`);
}
if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s).`);
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}

console.log(`Validated ${javascriptFiles.length} JavaScript files, ${cssFiles.length} CSS files and ${sourceFiles.length} source files.`);
console.log("Asset migration aliases, canonical art dimensions, runtime dependencies and syntax are valid.");
