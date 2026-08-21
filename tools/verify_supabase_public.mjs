#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(join(root, "src", "supabase_config.js"), "utf8");
const url = source.match(/\burl:\s*"([^"]+)"/)?.[1] || "";
const publishableKey = source.match(/\bpublishableKey:\s*"([^"]+)"/)?.[1] || "";
const origin = "https://phantomsouly.github.io";

assert.match(url, /^https:\/\/[a-z0-9-]+\.supabase\.co$/i, "public Supabase URL is configured");
assert.ok(publishableKey.startsWith("sb_publishable_") || publishableKey.split(".").length === 3, "public/publishable key is configured");
assert.doesNotMatch(publishableKey, /service_role|secret/i, "browser config does not contain a service-role key");

async function request(label, target, options = {}) {
  const startedAt = performance.now();
  const response = await fetch(target, {
    ...options,
    signal:AbortSignal.timeout(15_000)
  });
  const durationMs = Math.round(performance.now() - startedAt);
  console.log(`[supabase-public] ${label}: HTTP ${response.status} · ${durationMs} ms`);
  return response;
}

const settings = await request("Auth settings", `${url}/auth/v1/settings`, {
  headers:{ apikey:publishableKey }
});
assert.equal(settings.status, 200, "Supabase Auth settings are reachable");
const settingsBody = await settings.json();
assert.equal(settingsBody?.external?.discord, true, "Discord provider is enabled");

const oauthRedirect = `${origin}/CHERRIFT/`;
const oauth = await request(
  "Discord OAuth redirect",
  `${url}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(oauthRedirect)}`,
  { headers:{ apikey:publishableKey }, redirect:"manual" }
);
assert.equal(oauth.status, 302, "Supabase can start Discord OAuth");
const oauthLocation = oauth.headers.get("location") || "";
assert.match(oauthLocation, /^https:\/\/discord\.com\/api\/oauth2\/authorize\?/i, "OAuth redirects to Discord");
assert.equal(new URL(oauthLocation).searchParams.get("redirect_to"), oauthRedirect, "GitHub Pages callback is accepted");

const protectedTables = [
  "game_saves", "player_profiles", "account_entitlements", "friend_requests",
  "friendships", "user_blocks", "weekly_power_ranking", "reward_catalog",
  "mail_messages", "mail_recipients", "redeem_codes", "redeem_claims",
  "gm_admins", "gm_audit_logs", "profile_snapshots"
];
const tableChecks = await Promise.all(protectedTables.map(async table => {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, {
    headers:{ apikey:publishableKey, Authorization:`Bearer ${publishableKey}` },
    signal:AbortSignal.timeout(15_000)
  });
  let body = {};
  try { body = await response.json(); } catch (_) {}
  return { table, status:response.status, code:String(body?.code || "") };
}));
for (const check of tableChecks) {
  assert.equal(check.status, 401, `${check.table}: anonymous browser access is denied`);
  assert.equal(check.code, "42501", `${check.table}: table exists and rejects the anonymous role`);
}
console.log(`[supabase-public] protected schema: ${tableChecks.length}/${protectedTables.length} tables present · anon denied`);

const missingDeployments = [];
for (const functionName of ["player-api", "gm-api", "submit-report"]) {
  const preflight = await request(`${functionName} CORS`, `${url}/functions/v1/${functionName}`, {
    method:"OPTIONS",
    headers:{
      Origin:origin,
      "Access-Control-Request-Method":"POST",
      "Access-Control-Request-Headers":"authorization,apikey,content-type"
    }
  });
  if (![200, 204].includes(preflight.status)) {
    missingDeployments.push(`${functionName}: HTTP ${preflight.status}`);
    continue;
  }
  const allowOrigin = preflight.headers.get("access-control-allow-origin");
  assert.ok(allowOrigin === origin || allowOrigin === "*", `${functionName} allows the GitHub Pages origin`);
}

const unauthenticated = await request("player-api authentication boundary", `${url}/functions/v1/player-api`, {
  method:"POST",
  headers:{
    Origin:origin,
    apikey:publishableKey,
    Authorization:`Bearer ${publishableKey}`,
    "Content-Type":"application/json"
  },
  body:JSON.stringify({ action:"bootstrap_save" })
});
assert.equal(unauthenticated.status, 401, "player-api rejects a publishable key as a player session");
const unauthenticatedBody = await unauthenticated.json();
assert.match(String(unauthenticatedBody?.error || ""), /missing_auth_token|invalid_auth_token/i, "player-api reports an auth boundary error");
assert.ok(unauthenticatedBody?.requestId, "deployed player-api returns a request ID");

console.log("[supabase-public] CORE PASS · Auth, Discord, player-api, gm-api, CORS and JWT boundary are live.");
if (missingDeployments.length) {
  throw new Error(`Supabase deployment mismatch: ${missingDeployments.join(", ")}`);
}
console.log("[supabase-public] FULL PASS · Every repository Edge Function is deployed.");
