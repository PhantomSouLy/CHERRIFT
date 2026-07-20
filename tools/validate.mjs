#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const ignoredDirectories = new Set([".git", "node_modules"]);
const sourceExtensions = new Set([".html", ".css", ".js", ".mjs"]);
const errors = [];
const warnings = [];

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
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
  const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (check.status !== 0) {
    errors.push(`${relative(root, file)}: JavaScript syntax error\n${check.stderr.trim()}`);
  }
}

try {
  const cssTree = await import("css-tree");
  for (const file of cssFiles) {
    try {
      cssTree.parse(readFileSync(file, "utf8"), { filename: relative(root, file) });
    } catch (error) {
      errors.push(`${relative(root, file)}: CSS syntax error\n${error.message}`);
    }
  }
} catch (error) {
  if (error?.code === "ERR_MODULE_NOT_FOUND") warnings.push("css-tree is not installed; CSS parsing was skipped (run npm install)");
  else errors.push(`CSS validator failed to start: ${error?.message || error}`);
}

const directAssetPattern = /["'`(](assets\/[A-Za-z0-9_@./ ()+-]+?\.(?:png|jpe?g|webp|gif|svg|wav|mp3|ogg|json))(?:\?[^"'`)\s]*)?/gi;
const missingAssets = new Map();

for (const file of sourceFiles) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(directAssetPattern)) {
    const asset = match[1];
    if (asset.includes("${")) continue;
    const assetPath = join(root, asset);
    if (!existsSync(assetPath)) {
      const refs = missingAssets.get(asset) || [];
      refs.push(relative(root, file));
      missingAssets.set(asset, refs);
    } else if (statSync(assetPath).size === 0) {
      errors.push(`${asset}: referenced asset is empty`);
    }
  }
}

for (const [asset, refs] of missingAssets) {
  errors.push(`${asset}: missing asset (referenced by ${[...new Set(refs)].join(", ")})`);
}

const html = readFileSync(join(root, "index.html"), "utf8");
const ids = new Map();
for (const match of html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) {
  ids.set(match[1], (ids.get(match[1]) || 0) + 1);
}
for (const [id, count] of ids) {
  if (count > 1) errors.push(`index.html: duplicate id \"${id}\" (${count} occurrences)`);
}

const main = readFileSync(join(root, "src", "main.js"), "utf8");
const declaredPatchCount = Number(main.match(/const\s+patchCount\s*=\s*(\d+)/)?.[1]);
const actualPatchCount = [...main.matchAll(/await\s+loadScript\(/g)].length;
if (!Number.isFinite(declaredPatchCount)) {
  errors.push("src/main.js: patchCount declaration was not found");
} else if (declaredPatchCount !== actualPatchCount) {
  errors.push(`src/main.js: patchCount=${declaredPatchCount}, but ${actualPatchCount} patches are loaded`);
}

for (const match of main.matchAll(/loadScript\(["']([^"']+)["']/g)) {
  const script = match[1].split("?")[0];
  if (!existsSync(join(root, script))) errors.push(`src/main.js: missing runtime script ${script}`);
}

for (const match of html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["']/gi)) {
  const reference = match[1].split(/[?#]/)[0];
  if (/^(?:https?:|data:|#)/i.test(reference)) continue;
  if (!existsSync(join(root, reference))) errors.push(`index.html: missing local dependency ${reference}`);
}

const authPatchPath = join(root, "src", "cherrift_v064_auth.js");
const authConfigPath = join(root, "src", "supabase_config.js");
const supabaseVendorPath = join(root, "vendor", "supabase-js-2.110.7.js");
if (!existsSync(authPatchPath)) errors.push("src/cherrift_v064_auth.js: missing Discord auth patch");
else {
  const authPatch = readFileSync(authPatchPath, "utf8");
  for (const required of ["signInWithOAuth", 'provider: "discord"', 'flowType: "pkce"', "persistSession", "signOut", "authGateV064"]) {
    if (!authPatch.includes(required)) errors.push(`src/cherrift_v064_auth.js: missing ${required}`);
  }
}
if (!existsSync(authConfigPath)) errors.push("src/supabase_config.js: missing public Supabase configuration");
else {
  const authConfig = readFileSync(authConfigPath, "utf8");
  if (!authConfig.includes("https://qkukvltevryegjbnwcgg.supabase.co")) errors.push("src/supabase_config.js: unexpected Supabase project URL");
  if (!/sb_publishable_[A-Za-z0-9_-]+/.test(authConfig)) errors.push("src/supabase_config.js: publishable key is missing");
  if (/sb_(?:secret|service_role)_[A-Za-z0-9_-]+/i.test(authConfig)) errors.push("src/supabase_config.js: service-role material must never be shipped to the browser");
}
if (!existsSync(supabaseVendorPath) || statSync(supabaseVendorPath).size < 100000) {
  errors.push("vendor/supabase-js-2.110.7.js: local Supabase browser bundle is missing or incomplete");
}
if (!(html.indexOf("vendor/supabase-js-2.110.7.js") < html.indexOf("src/main.js"))) {
  errors.push("index.html: Supabase browser client must load before the game bootstrap");
}
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
for (const dependency of ["@supabase/supabase-js", "@supabase/ssr"]) {
  if (!packageJson.dependencies?.[dependency]) errors.push(`package.json: missing ${dependency}`);
}

if (existsSync(join(root, "src", "cherrift_v0562.js")) && !main.includes("cherrift_v0562.js")) {
  warnings.push("src/cherrift_v0562.js exists but is not loaded (v0.5.6.3 supersedes it)");
}

if (/v0\.2\.2/i.test(readFileSync(join(root, "README.md"), "utf8"))) {
  warnings.push("README.md still describes v0.2.2");
}

const wavPath = join(root, "assets", "audio", "click.wav");
if (existsSync(wavPath)) {
  const header = readFileSync(wavPath).subarray(0, 12).toString("ascii");
  if (!header.startsWith("RIFF") || !header.endsWith("WAVE")) {
    errors.push("assets/audio/click.wav: invalid RIFF/WAVE header");
  }
}

function pngInfo(file) {
  const data = readFileSync(file);
  const signature = data.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a" || data.length < 26) return null;
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    colorType: data[25]
  };
}

const equipmentRoot = join(root, "assets", "items", "equipments");
const equipmentPngs = existsSync(equipmentRoot)
  ? walk(equipmentRoot).filter(file => extname(file).toLowerCase() === ".png")
  : [];
if (equipmentPngs.length !== 28) {
  errors.push(`assets/items/equipments: expected 28 equipment icons, found ${equipmentPngs.length}`);
}
for (const file of equipmentPngs) {
  const info = pngInfo(file);
  if (!info) errors.push(`${relative(root, file)}: invalid PNG header`);
  else if (info.width !== 128 || info.height !== 128) {
    errors.push(`${relative(root, file)}: expected 128×128, found ${info.width}×${info.height}`);
  }
}

for (const name of ["purple_slash.png", "purple_slash2.png", "purple_slash3.png", "purple_slash4.png"]) {
  const file = join(root, "assets", "effects", "base_effects", name);
  const info = existsSync(file) ? pngInfo(file) : null;
  if (!info) errors.push(`assets/effects/base_effects/${name}: missing or invalid PNG`);
  else if (info.width !== 128 || info.height !== 128 || info.colorType !== 6) {
    errors.push(`assets/effects/base_effects/${name}: expected 128×128 RGBA PNG`);
  }
}

for (const name of ["warrior_slash_effects_true_rgba.png", "warrior_whirlwind_effects_true_rgba.png"]) {
  const file = join(root, "assets", "effects", "warrior_cherry", name);
  const info = existsSync(file) ? pngInfo(file) : null;
  if (!info) errors.push(`assets/effects/warrior_cherry/${name}: missing or invalid PNG`);
  else if (info.width !== 1448 || info.height !== 1086 || info.colorType !== 6) {
    errors.push(`assets/effects/warrior_cherry/${name}: expected 1448×1086 RGBA PNG`);
  }
}

console.log(`Validated ${javascriptFiles.length} JavaScript files, ${cssFiles.length} CSS files and ${sourceFiles.length} source files.`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);
console.log(errors.length ? `Validation failed with ${errors.length} error(s).` : "Validation passed.");
process.exitCode = errors.length ? 1 : 0;
