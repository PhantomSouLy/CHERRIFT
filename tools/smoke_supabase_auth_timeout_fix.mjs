import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const patchUrl = new URL("../src/cherrift_supabase_timeout_fix.js", import.meta.url);
const patchSource = fs.readFileSync(fileURLToPath(patchUrl), "utf8");

const never = () => new Promise(() => {});

function makeFakeClient({ hanging = true } = {}) {
  return {
    auth: {
      getSession: hanging
        ? never
        : async () => ({ data: { session: { user: { id: "test-user" } } }, error: null }),
      signOut: hanging
        ? never
        : async () => ({ error: null }),
      refreshSession: hanging
        ? never
        : async () => ({ data: { session: null }, error: null }),
      setSession: hanging
        ? never
        : async () => ({ data: { session: null }, error: null }),
      getUser: hanging
        ? never
        : async () => ({ data: { user: null }, error: null })
    },
    functions: {
      invoke: hanging
        ? never
        : async () => ({ data: { ok: true }, error: null })
    }
  };
}

function createSandbox(client) {
  const window = {
    CHERRIFT_TIMEOUTS: {
      authSessionMs: 35,
      authSignOutMs: 35,
      authRefreshMs: 35,
      authSetSessionMs: 35,
      authGetUserMs: 35,
      functionInvokeMs: 35
    },
    setTimeout,
    clearTimeout,
    supabase: {
      createClient() {
        return client;
      }
    }
  };

  const sandbox = {
    window,
    console,
    Promise,
    Error,
    Map,
    Object,
    Number,
    String,
    URL,
    setTimeout,
    clearTimeout
  };

  sandbox.globalThis = window;
  vm.createContext(sandbox);
  vm.runInContext(patchSource, sandbox, {
    filename: "src/cherrift_supabase_timeout_fix.js"
  });
  return sandbox;
}

async function expectTimeout(promise, expectedCode) {
  const started = Date.now();
  await assert.rejects(
    promise,
    error => error?.name === "TimeoutError" && error?.code === expectedCode
  );
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 250, `${expectedCode} exceeded smoke-test bound: ${elapsed} ms`);
}

async function testHangingAuthCannotFreezeBootstrap() {
  const fake = makeFakeClient({ hanging: true });
  const sandbox = createSandbox(fake);
  const client = sandbox.window.supabase.createClient(
    "https://example.supabase.co",
    "publishable-test-key"
  );

  await expectTimeout(client.auth.getSession(), "auth_session_timeout");
  await expectTimeout(client.auth.signOut({ scope: "local" }), "auth_signout_timeout");
  await expectTimeout(client.auth.refreshSession(), "auth_refresh_timeout");
  await expectTimeout(client.auth.setSession({ access_token: "x", refresh_token: "y" }), "auth_set_session_timeout");
  await expectTimeout(client.auth.getUser(), "auth_get_user_timeout");

  // This mirrors the important part of CHERRIFT's recovery path:
  // getSession fails -> local signOut cleanup fails/times out -> guest/local
  // fallback MUST still be reachable instead of waiting forever.
  async function simulatedBootstrapRecovery() {
    try {
      await client.auth.getSession();
      return "cloud";
    } catch (_) {
      try {
        await client.auth.signOut({ scope: "local" });
      } catch (_) {}
      return "guest/local";
    }
  }

  const recoveryResult = await Promise.race([
    simulatedBootstrapRecovery(),
    new Promise((_, reject) => setTimeout(
      () => reject(new Error("simulated bootstrap remained pending")),
      250
    ))
  ]);

  assert.equal(recoveryResult, "guest/local");
  assert.ok(sandbox.window.CHERRIFT_SUPABASE_STARTUP_GUARD.authTimeouts >= 2);
}

async function testHealthyCallsAreUnchanged() {
  const fake = makeFakeClient({ hanging: false });
  const sandbox = createSandbox(fake);
  const client = sandbox.window.supabase.createClient(
    "https://healthy.supabase.co",
    "publishable-test-key"
  );

  const sessionResult = await client.auth.getSession();
  assert.equal(sessionResult.data.session.user.id, "test-user");

  const signOutResult = await client.auth.signOut({ scope: "local" });
  assert.equal(signOutResult.error, null);

  const fnResult = await client.functions.invoke("health-check");
  assert.equal(fnResult.data.ok, true);
}

async function main() {
  await testHangingAuthCannotFreezeBootstrap();
  await testHealthyCallsAreUnchanged();
  console.log("[PASS] Supabase Auth timeout/deadlock guard smoke test");
}

main().catch(error => {
  console.error("[FAIL] Supabase Auth timeout/deadlock guard smoke test");
  console.error(error);
  process.exitCode = 1;
});
