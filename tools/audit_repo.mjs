#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { stripTypeScriptTypes } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = join(root, "audit-output");
const jsonOutput = join(outputDirectory, "repo-file-audit.json");
const markdownOutput = join(outputDirectory, "repo-file-audit.md");

const textExtensions = new Set([
  "", ".bat", ".css", ".example", ".gitignore", ".html", ".js",
  ".json", ".md", ".mjs", ".py", ".sql", ".toml", ".ts", ".txt",
  ".yaml", ".yml"
]);
const imageExtensions = new Set([".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const audioExtensions = new Set([".mp3", ".ogg", ".wav"]);
const sourceExtensions = new Set([".css", ".html", ".js", ".mjs", ".ts"]);

function slash(value) {
  return String(value).replaceAll("\\", "/");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd:root,
    encoding:"utf8",
    maxBuffer:16 * 1024 * 1024
  }).split("\0").filter(Boolean).sort();
}

function isText(path) {
  const extension = extname(path).toLowerCase();
  return textExtensions.has(extension) || path.startsWith(".github/");
}

function pngInfo(buffer) {
  if (buffer.length < 26 || buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  return {
    format:"png",
    width:buffer.readUInt32BE(16),
    height:buffer.readUInt32BE(20)
  };
}

function jpegInfo(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      return {
        format:"jpeg",
        width:buffer.readUInt16BE(offset + 5),
        height:buffer.readUInt16BE(offset + 3)
      };
    }
    offset += length;
  }
  return null;
}

function gifInfo(buffer) {
  if (buffer.length < 10 || !["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"))) return null;
  return {
    format:"gif",
    width:buffer.readUInt16LE(6),
    height:buffer.readUInt16LE(8)
  };
}

function webpInfo(buffer) {
  if (buffer.length < 16 || buffer.subarray(0, 4).toString("ascii") !== "RIFF" || buffer.subarray(8, 12).toString("ascii") !== "WEBP") return null;
  const chunk = buffer.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      format:"webp",
      width:1 + buffer.readUIntLE(24, 3),
      height:1 + buffer.readUIntLE(27, 3)
    };
  }
  if (chunk === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return {
      format:"webp",
      width:(bits & 0x3fff) + 1,
      height:((bits >>> 14) & 0x3fff) + 1
    };
  }
  if (chunk === "VP8 " && buffer.length >= 30) {
    for (let offset = 20; offset + 9 < Math.min(buffer.length, 64); offset += 1) {
      if (buffer[offset] === 0x9d && buffer[offset + 1] === 0x01 && buffer[offset + 2] === 0x2a) {
        return {
          format:"webp",
          width:buffer.readUInt16LE(offset + 3) & 0x3fff,
          height:buffer.readUInt16LE(offset + 5) & 0x3fff
        };
      }
    }
  }
  return { format:"webp", width:null, height:null };
}

function binaryInfo(path, buffer) {
  const extension = extname(path).toLowerCase();
  if (extension === ".png") return pngInfo(buffer);
  if ([".jpg", ".jpeg"].includes(extension)) return jpegInfo(buffer);
  if (extension === ".gif") return gifInfo(buffer);
  if (extension === ".webp") return webpInfo(buffer);
  if (extension === ".wav") {
    return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WAVE"
      ? { format:"wav" }
      : null;
  }
  if (extension === ".mp3") {
    const valid = buffer.length >= 3 && (
      buffer.subarray(0, 3).toString("ascii") === "ID3" ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    );
    return valid ? { format:"mp3" } : null;
  }
  if (extension === ".ogg") {
    return buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS"
      ? { format:"ogg" }
      : null;
  }
  return null;
}

function localDependencies(text) {
  const dependencies = [];
  const pattern = /<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["']/gi;
  for (const match of text.matchAll(pattern)) {
    const raw = match[1].split(/[?#]/)[0];
    if (!raw || /^(?:data:|https?:|#)/i.test(raw)) continue;
    dependencies.push(raw);
  }
  return dependencies;
}

function resolveReference(sourcePath, rawReference) {
  const clean = String(rawReference)
    .replaceAll("&amp;", "&")
    .split(/[?#]/)[0]
    .replace(/^\/+/, "");
  if (!clean || clean.includes("${") || clean.includes("<%") || clean.includes("...")) return null;

  const fromSource = clean.startsWith("./") || clean.startsWith("../") || sourcePath.endsWith(".html");
  const absolute = fromSource
    ? resolve(root, dirname(sourcePath), clean)
    : resolve(root, clean);
  const candidate = slash(relative(root, normalize(absolute)));
  return candidate.startsWith("../") ? null : candidate;
}

const paths = trackedFiles();
const pathSet = new Set(paths);
const buffers = new Map();
const texts = new Map();

for (const path of paths) {
  const buffer = readFileSync(join(root, path));
  buffers.set(path, buffer);
  if (isText(path)) texts.set(path, buffer.toString("utf8"));
}

const entrypoints = new Set([
  "index.html",
  "gm/index.html",
  ...paths.filter(path => path.startsWith(".github/workflows/")),
  ...paths.filter(path => /^supabase\/(?:config\.toml|functions\/[^/]+\/index\.ts)$/.test(path))
]);
for (const entrypoint of [...entrypoints]) {
  const text = texts.get(entrypoint) || "";
  for (const dependency of localDependencies(text)) {
    const path = resolveReference(entrypoint, dependency);
    if (pathSet.has(path)) entrypoints.add(path);
  }
}

const packageJson = JSON.parse(texts.get("package.json") || "{}");
for (const command of Object.values(packageJson.scripts || {})) {
  for (const match of String(command).matchAll(/(?:^|\s)([A-Za-z0-9_./-]+\.(?:m?js|py))(?:\s|$)/g)) {
    if (pathSet.has(match[1])) entrypoints.add(match[1]);
  }
}

// Follow tool/module filenames assembled with path.join() instead of import.
// This keeps dynamic smoke-runner children in the active tooling graph.
let entrypointAdded = true;
while (entrypointAdded) {
  entrypointAdded = false;
  for (const source of [...entrypoints]) {
    const text = texts.get(source);
    if (!text) continue;
    const directory = dirname(source);
    for (const candidate of paths) {
      if (dirname(candidate) !== directory || entrypoints.has(candidate)) continue;
      if (![".js", ".mjs", ".py", ".ts"].includes(extname(candidate).toLowerCase())) continue;
      const filename = candidate.slice(directory === "." ? 0 : directory.length + 1);
      if (!text.includes(filename)) continue;
      entrypoints.add(candidate);
      entrypointAdded = true;
    }
  }
}

const referencePattern = /["'`](?!https?:|data:|#)((?:\.\.\/|\.\/)?(?:assets|src|gm|supabase|vendor)\/[A-Za-z0-9_@./ ()+${}-]+?\.(?:bat|css|gif|html|jpe?g|js|json|md|mjs|mp3|ogg|png|py|sql|toml|ts|txt|wav|webp|ya?ml)(?:\?[^"'`\s)]*)?)["'`)]/gi;
const rootStylePattern = /\b(?:href|src)\s*=\s*["'`]([A-Za-z0-9_-]+\.(?:css|js)(?:\?[^"'`]*)?)["'`]/gi;
const references = [];

for (const [source, text] of texts) {
  for (const pattern of [referencePattern, rootStylePattern]) {
    for (const match of text.matchAll(pattern)) {
      const target = resolveReference(source, match[1]);
      if (!target) continue;
      references.push({
        source,
        raw:match[1],
        target,
        exists:pathSet.has(target),
        runtimeSource:entrypoints.has(source)
      });
    }
  }
}

const exactReferenceCounts = new Map(paths.map(path => [path, 0]));
for (const reference of references) {
  if (reference.exists) {
    exactReferenceCounts.set(reference.target, (exactReferenceCounts.get(reference.target) || 0) + 1);
  }
}

const hashGroups = new Map();
const files = [];
const syntaxFailures = [];
let cssTree = null;
try { cssTree = await import("css-tree"); } catch (_) {}

for (const path of paths) {
  const buffer = buffers.get(path);
  const extension = extname(path).toLowerCase();
  const digest = sha256(buffer);
  const issues = [];
  const checks = [];
  let detail = null;

  if (!hashGroups.has(digest)) hashGroups.set(digest, []);
  hashGroups.get(digest).push(path);

  if (buffer.length === 0) issues.push("empty-file");
  if (buffer.length === 1 && buffer[0] === 0x0a) issues.push("one-byte-placeholder");

  if (isText(path)) {
    const text = texts.get(path);
    checks.push("utf8-text");
    if (text.includes("\ufffd")) issues.push("invalid-utf8-sequence");
    if (text.includes("\u0000")) issues.push("nul-byte-in-text");

    if (extension === ".json") {
      checks.push("json-parse");
      try { JSON.parse(text); }
      catch (error) { issues.push(`json-parse:${error.message}`); }
    }

    if ([".js", ".mjs"].includes(extension)) {
      checks.push("node-syntax");
      const result = spawnSync(process.execPath, ["--check", join(root, path)], { encoding:"utf8" });
      if (result.status !== 0) issues.push(`javascript-syntax:${String(result.stderr || result.stdout).trim()}`);
    }

    if (extension === ".ts") {
      checks.push("typescript-parse");
      try { stripTypeScriptTypes(text, { mode:"transform" }); }
      catch (error) { issues.push(`typescript-syntax:${error.message}`); }
    }

    if (extension === ".py") {
      checks.push("python-ast-parse");
      const result = spawnSync("python3", [
        "-c",
        "import ast,sys; ast.parse(open(sys.argv[1],encoding='utf-8').read(), filename=sys.argv[1])",
        join(root, path)
      ], { encoding:"utf8" });
      if (result.status !== 0) issues.push(`python-syntax:${String(result.stderr || result.stdout).trim()}`);
    }

    if (extension === ".toml") {
      checks.push("toml-parse");
      const result = spawnSync("python3", [
        "-c",
        "import sys,tomllib; tomllib.load(open(sys.argv[1],'rb'))",
        join(root, path)
      ], { encoding:"utf8" });
      if (result.status !== 0) issues.push(`toml-syntax:${String(result.stderr || result.stdout).trim()}`);
    }

    if ([".yml", ".yaml"].includes(extension)) {
      checks.push("yaml-parse");
      const result = spawnSync("python3", [
        "-c",
        "import sys,yaml; yaml.safe_load(open(sys.argv[1],encoding='utf-8'))",
        join(root, path)
      ], { encoding:"utf8" });
      if (result.status !== 0) issues.push(`yaml-syntax:${String(result.stderr || result.stdout).trim()}`);
    }

    if (extension === ".css" && cssTree) {
      checks.push("css-parse");
      try { cssTree.parse(text, { filename:path }); }
      catch (error) { issues.push(`css-syntax:${error.message}`); }
    }
  } else if (imageExtensions.has(extension) || audioExtensions.has(extension)) {
    checks.push("binary-signature");
    detail = binaryInfo(path, buffer);
    if (!detail) issues.push("invalid-binary-signature");
    if (detail && "width" in detail && (!detail.width || !detail.height)) {
      issues.push("image-dimensions-unreadable");
    }
  } else {
    checks.push("binary-present");
  }

  if (issues.some(issue => /syntax|parse|invalid|unreadable/.test(issue))) {
    syntaxFailures.push({ path, issues });
  }

  files.push({
    path,
    bytes:buffer.length,
    sha256:digest,
    kind:isText(path) ? "text" : imageExtensions.has(extension) ? "image" : audioExtensions.has(extension) ? "audio" : "binary",
    entrypoint:entrypoints.has(path),
    exactReferences:exactReferenceCounts.get(path) || 0,
    checks,
    detail,
    issues
  });
}

const duplicateGroups = [...hashGroups.entries()]
  .filter(([, group]) => group.length > 1)
  .map(([hash, group]) => ({
    sha256:hash,
    bytes:buffers.get(group[0]).length,
    files:group
  }))
  .sort((a, b) => (b.bytes * b.files.length) - (a.bytes * a.files.length));

const missingReferences = references
  .filter(reference => !reference.exists)
  .filter((reference, index, values) =>
    values.findIndex(item => item.source === reference.source && item.target === reference.target) === index
  )
  .sort((a, b) => a.target.localeCompare(b.target) || a.source.localeCompare(b.source));

const oneBytePlaceholders = files
  .filter(file => file.issues.includes("one-byte-placeholder"))
  .map(file => file.path);

const unprovenUnusedSource = files
  .filter(file => /^(?:src\/.*\.js|assets\/[^/]+\.css)$/.test(file.path))
  .filter(file => !file.entrypoint)
  .map(file => file.path);

const unprovenUnusedAssets = files
  .filter(file => file.path.startsWith("assets/"))
  .filter(file => !file.entrypoint && file.exactReferences === 0)
  .map(file => file.path);

const report = {
  generatedAt:new Date().toISOString(),
  commit:execFileSync("git", ["rev-parse", "HEAD"], { cwd:root, encoding:"utf8" }).trim(),
  scope:"Every Git-tracked file at the audited commit",
  summary:{
    trackedFiles:files.length,
    bytes:files.reduce((sum, file) => sum + file.bytes, 0),
    textFiles:files.filter(file => file.kind === "text").length,
    imageFiles:files.filter(file => file.kind === "image").length,
    audioFiles:files.filter(file => file.kind === "audio").length,
    syntaxOrSignatureFailures:syntaxFailures.length,
    oneBytePlaceholders:oneBytePlaceholders.length,
    exactDuplicateGroups:duplicateGroups.length,
    missingLiteralReferences:missingReferences.length,
    missingRuntimeReferences:missingReferences.filter(item => item.runtimeSource).length,
    unprovenUnusedSource:unprovenUnusedSource.length,
    unprovenUnusedAssets:unprovenUnusedAssets.length
  },
  notes:[
    "A zero reference count is evidence for review, not automatic proof that a file is unused; runtime paths can be assembled dynamically.",
    "Binary files were checked by file signature; PNG/JPEG/GIF/WebP dimensions were decoded where supported.",
    "JavaScript/MJS, JSON and CSS files received syntax/parse checks. Other text files were checked for UTF-8 replacement and NUL bytes."
  ],
  oneBytePlaceholders,
  duplicateGroups,
  missingReferences,
  syntaxFailures,
  unprovenUnusedSource,
  unprovenUnusedAssets,
  files
};

const markdown = [
  "# CHERRIFT teljes fájlaudit",
  "",
  `Commit: \`${report.commit}\``,
  "",
  `- Ellenőrzött Git-fájlok: **${report.summary.trackedFiles}**`,
  `- Összméret: **${report.summary.bytes.toLocaleString("hu-HU")} byte**`,
  `- Szintaxis-/szignatúrahibák: **${report.summary.syntaxOrSignatureFailures}**`,
  `- Egysoros (1 byte-os) placeholderek: **${report.summary.oneBytePlaceholders}**`,
  `- Azonos tartalmú csoportok: **${report.summary.exactDuplicateGroups}**`,
  `- Hiányzó, literálisan hivatkozott útvonalak: **${report.summary.missingLiteralReferences}**`,
  `- Ezekből aktív futási útvonalon: **${report.summary.missingRuntimeReferences}**`,
  "",
  "## Hiányzó literális hivatkozások",
  "",
  ...(missingReferences.length
    ? missingReferences.map(item => `- ${item.runtimeSource ? "**AKTÍV** " : ""}\`${item.target}\` ← \`${item.source}\``)
    : ["Nincs."]),
  "",
  "## 1 byte-os placeholderek",
  "",
  ...oneBytePlaceholders.map(path => `- \`${path}\``),
  "",
  "## Szintaxis- vagy fájlszignatúra-hibák",
  "",
  ...(syntaxFailures.length
    ? syntaxFailures.map(item => `- \`${item.path}\`: ${item.issues.join("; ")}`)
    : ["Nincs."]),
  "",
  "> A teljes, fájlonkénti SHA-256/check/reference leltár a repo-file-audit.json fájlban található."
].join("\n");

mkdirSync(outputDirectory, { recursive:true });
writeFileSync(jsonOutput, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(markdownOutput, `${markdown}\n`);

console.log(JSON.stringify({
  output:slash(relative(root, jsonOutput)),
  markdown:slash(relative(root, markdownOutput)),
  ...report.summary
}, null, 2));

if (syntaxFailures.length) process.exitCode = 1;
