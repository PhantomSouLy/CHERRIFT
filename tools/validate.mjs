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
if (packageJson.version !== "0.9.3") errors.push(`package.json: expected version 0.9.3, found ${packageJson.version}`);
for (const [file, contents] of [
  ["index.html", html],
  ["src/main.js", main],
  ["src/config.js", readFileSync(join(root, "src", "config.js"), "utf8")]
]) {
  if (!contents.includes("0.9.3")) errors.push(`${file}: v0.9.3 build marker is missing`);
}
if (!main.includes("src/cherrift_v091.js")) errors.push("src/main.js: v0.9.1 runtime patch is not loaded");
if (!main.includes("src/cherrift_v092.js")) errors.push("src/main.js: v0.9.2 runtime patch is not loaded");
if (!main.includes("src/cherrift_v093.js")) errors.push("src/main.js: v0.9.3 runtime patch is not loaded");
for (const locale of ["src/locales/en.js", "src/locales/hu.js", "src/locales/index.js"]) {
  if (!main.includes(locale)) errors.push(`src/main.js: ${locale} is not loaded`);
}

const skinThumbRoot = join(root, "assets", "ui", "skin_thumbs");
const skinThumbs = existsSync(skinThumbRoot)
  ? readdirSync(skinThumbRoot).filter(name => name.endsWith(".webp"))
  : [];
if (skinThumbs.length !== 14) errors.push(`assets/ui/skin_thumbs: expected 14 optimized WebP thumbnails, found ${skinThumbs.length}`);
for (const name of skinThumbs) {
  const file = join(skinThumbRoot, name);
  const header = readFileSync(file).subarray(0, 12);
  if (header.subarray(0, 4).toString("ascii") !== "RIFF" || header.subarray(8, 12).toString("ascii") !== "WEBP") {
    errors.push(`assets/ui/skin_thumbs/${name}: invalid WebP header`);
  }
  if (statSync(file).size > 100000) errors.push(`assets/ui/skin_thumbs/${name}: thumbnail exceeds 100 KB`);
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

for (const name of [
  "melee_purplee_attack_1.png",
  "melee_purplee_attack_2.png",
  "melee_purplee_attack_3.png",
  "melee_purplee_attack_4.png"
]) {
  const file = join(root, "assets", "effects", "base_effects", name);
  const info = existsSync(file) ? pngInfo(file) : null;
  if (!info) errors.push(`assets/effects/base_effects/${name}: missing or invalid PNG`);
  else if (info.width !== 128 || info.height !== 128 || info.colorType !== 6) {
    errors.push(`assets/effects/base_effects/${name}: expected 128×128 RGBA PNG`);
  }
}

for (const name of ["attack_1.png", "skill_effect_1.png", "skill_effect_2.png"]) {
  const file = join(root, "assets", "effects", "warrior_cherry", name);
  const info = existsSync(file) ? pngInfo(file) : null;
  if (!info) errors.push(`assets/effects/warrior_cherry/${name}: missing or invalid PNG`);
  else if (info.width !== 128 || info.height !== 128 || info.colorType !== 6) {
    errors.push(`assets/effects/warrior_cherry/${name}: expected 128×128 RGBA PNG`);
  }
}

const commonSkins = [
  "cake_deliver_cherry",
  "kimono_cherry",
  "pajama_cherry",
  "school_uniform_cherry",
  "sport_cherry"
];
const spriteStates = { idle:4, walk:6, attack:6, skill:6 };
for (const skin of commonSkins) {
  const folder = join(root, "assets", "player", "skins", skin);
  const manifestPath = join(folder, "manifest.json");
  if (!existsSync(manifestPath)) errors.push(`${skin}: manifest.json is missing`);
  else {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.skin_id !== skin || manifest.rarity !== "common") {
      errors.push(`${skin}: invalid Common-skin manifest identity`);
    }
  }
  const splash = join(folder, `${skin}_splashart.png`);
  const splashInfo = existsSync(splash) ? pngInfo(splash) : null;
  if (!splashInfo) errors.push(`${skin}: splash art is missing or invalid`);
  for (const [state, frames] of Object.entries(spriteStates)) {
    for (const direction of ["down", "up", "left", "right"]) {
      const name = `${skin}_${state}_${direction}.png`;
      const file = join(folder, name);
      const info = existsSync(file) ? pngInfo(file) : null;
      if (!info) errors.push(`${skin}/${name}: missing or invalid PNG`);
      else if (info.width !== frames * 192 || info.height !== 192 || info.colorType !== 6) {
        errors.push(`${skin}/${name}: expected ${frames * 192}×192 RGBA PNG`);
      }
    }
  }
}

for (const name of [
  "basic_cherry_attack_offensive.png",
  "basic_cherry_attack_deffensive.png",
  "basic_cherry_attack_hybrid.png",
  "basic_cherry_attack_support.png"
]) {
  const file = join(root, "assets", "effects", name);
  const info = existsSync(file) ? pngInfo(file) : null;
  if (!info) errors.push(`assets/effects/${name}: missing or invalid PNG`);
  else if (info.width !== 128 || info.height !== 128 || ![3, 6].includes(info.colorType)) {
    errors.push(`assets/effects/${name}: expected transparent 128×128 PNG`);
  }
}

const exactEffects = new Map([
  ["succubus_cherry/succubus_crimson_claw_wave.png", [128, 128]],
  ["succubus_cherry/succubus_soul_drain_core.png", [256, 256]],
  ["succubus_cherry/succubus_soul_drain_burst_sheet.png", [768, 768]],
  ["succubus_cherry/succubus_soul_wisp.png", [128, 128]],
  ["succubus_cherry/succubus_soul_hit.png", [128, 128]],
  ["succubus_cherry/succubus_lifesteal_siphon.png", [256, 256]],
  ["succubus_cherry/succubus_blood_shield.png", [128, 128]],
  ["succubus_cherry/succubus_soul_drain_release.png", [256, 256]],
  ["wuxia_sakura_cherry/attack_1.png", [128, 128]],
  ["wuxia_sakura_cherry/skill_effect_1.png", [256, 256]],
  ["wuxia_sakura_cherry/skill_effect_1_sheet.png", [768, 768]],
  ["ninja_cherry/shuriken_1.png", [128, 128]],
  ["ninja_cherry/shuriken_2.png", [128, 128]],
  ["ninja_cherry/shuriken_hit_effect.png", [128, 128]]
]);
for (const [name, [width, height]] of exactEffects) {
  const file = join(root, "assets", "effects", name);
  const info = existsSync(file) ? pngInfo(file) : null;
  if (!info) errors.push(`assets/effects/${name}: missing or invalid PNG`);
  else if (info.width !== width || info.height !== height || info.colorType !== 6) {
    errors.push(`assets/effects/${name}: expected ${width}×${height} RGBA PNG`);
  }
}

for (const skin of ["archer_cherry", "wuxia_sakura_cherry"]) {
  const reportPath = join(root, "assets", "player", "skins", skin, `${skin}_validation.json`);
  if (!existsSync(reportPath)) {
    errors.push(`${skin}: sprite validation report is missing`);
    continue;
  }
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  if (!report.valid || report.canonical_files !== 16) {
    errors.push(`${skin}: expected 16 valid canonical sprite strips`);
  }
  for (const file of report.files || []) {
    if (file.mode !== "RGBA" || file.size?.[1] !== 192 || file.size?.[0] !== file.frames * 192) {
      errors.push(`${skin}/${file.file}: invalid RGBA strip geometry`);
    }
    if ((file.errors || []).length) errors.push(`${skin}/${file.file}: ${file.errors.join(", ")}`);
  }
}

console.log(`Validated ${javascriptFiles.length} JavaScript files, ${cssFiles.length} CSS files and ${sourceFiles.length} source files.`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);
console.log(errors.length ? `Validation failed with ${errors.length} error(s).` : "Validation passed.");
process.exitCode = errors.length ? 1 : 0;
