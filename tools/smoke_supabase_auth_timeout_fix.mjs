import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const patchUrl = new URL("../src/cherrift_network_guard.js", import.meta.url);
const patchSource = fs.readFileSync(fileURLToPath(patchUrl), "utf8");

const never = () => new Promise(() => {});

function makeFakeClient({ hanging = true } = {}) {
  return {
    auth: {
      getSession: hanging ? never : async () => ({ data:{ session:{ user:{ id:"test-user" } } }, error:null }),
      signOut: hanging ? never : async () => ({ error:null }),
      refreshSession: hanging ? never : async () => ({ data:{ session:null }, error:null }),
      setSession: hanging ? never : async () => ({ data:{ session:null }, error:null }),
      getUser: hanging ? never : async () => ({ data:{ user:null }, error:null })
    },
    functions: {
      invoke: hanging ? never : async () => ({ data:{ ok:true }, error:null })
    }
  };
}

function createSandbox(client, { hangingLock = false } = {}) {
  let capturedOptions = null;

  const locks = {
    request(name, options, fn) {
      if (!hangingLock) return Promise.resolve().then(fn);

      return new Promise((resolve, reject) => {
        const signal = options?.signal;
        if (signal?.aborted) {
          reject(Object.assign(new Error("aborted"), { name:"AbortError" }));
          return;
        }
        signal?.addEventListener("abort", () => {
          reject(Object.assign(new Error("aborted"), { name:"AbortError" }));
        }, { once:true });
      });
    }
  };

  const window = {
    CHERRIFT_TIMEOUTS: {
      authSessionMs: 35,
      authSignOutMs: 35,
      authRefreshMs: 35,
      authSetSessionMs: 35,
      authGetUserMs: 35,
      authLockMs: 35,
      functionInvokeMs: 35
    },
    setTimeout,
    clearTimeout,
    navigator: { locks },
    supabase: {
      createClient(url, key, options) {
        capturedOptions = options;
        return client;
      }
    }
  };

  const sandbox = {
    window,
    navigator: window.navigator,
    console,
    Promise,
    Error,
    DOMException,
    AbortController,
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
    filename: "src/cherrift_network_guard.js"
  });

  return {
    sandbox,
    get capturedOptions() { return capturedOptions; }
  };
}

async function expectTimeout(promise, expectedCode) {
  const started = Date.now();
  await assert.rejects(
    promise,
    error => error?.name === "TimeoutError" && error?.code === expectedCode
  );
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 300, `${expectedCode} exceeded smoke bound: ${elapsed} ms`);
}

async function testHangingAuthMethods() {
  const fake = makeFakeClient({ hanging:true });
  const env = createSandbox(fake);
  const client = env.sandbox.window.supabase.createClient(
    "https://example.supabase.co",
    "publishable-test-key",
    { auth:{ storageKey:"cherrift-test" } }
  );

  await expectTimeout(client.auth.getSession(), "auth_session_timeout");
  await expectTimeout(client.auth.signOut({ scope:"local" }), "auth_signout_timeout");
  await expectTimeout(client.auth.refreshSession(), "auth_refresh_timeout");
  await expectTimeout(client.auth.setSession({ access_token:"x", refresh_token:"y" }), "auth_set_session_timeout");
  await expectTimeout(client.auth.getUser(), "auth_get_user_timeout");

  assert.ok(env.sandbox.window.CHERRIFT_SUPABASE_STARTUP_GUARD.authTimeouts >= 5);
}

async function testWebLockIsBounded() {
  const fake = makeFakeClient({ hanging:false });
  const env = createSandbox(fake, { hangingLock:true });
  env.sandbox.window.supabase.createClient(
    "https://lock.supabase.co",
    "publishable-test-key",
    { auth:{ storageKey:"cherrift-lock-test" } }
  );

  const lock = env.capturedOptions?.auth?.lock;
  assert.equal(typeof lock, "function", "bounded auth lock was not injected");

  await expectTimeout(
    lock("lock:test", -1, async () => "never-reached"),
    "auth_lock_timeout"
  );

  assert.equal(
    env.sandbox.window.CHERRIFT_SUPABASE_STARTUP_GUARD.authLockTimeouts,
    1
  );
}

async function testHealthyCallsAndLock() {
  const fake = makeFakeClient({ hanging:false });
  const env = createSandbox(fake, { hangingLock:false });
  const client = env.sandbox.window.supabase.createClient(
    "https://healthy.supabase.co",
    "publishable-test-key",
    { auth:{ storageKey:"healthy" } }
  );

  const lock = env.capturedOptions?.auth?.lock;
  assert.equal(await lock("lock:healthy", -1, async () => "ok"), "ok");

  const sessionResult = await client.auth.getSession();
  assert.equal(sessionResult.data.session.user.id, "test-user");

  const signOutResult = await client.auth.signOut({ scope:"local" });
  assert.equal(signOutResult.error, null);

  const fnResult = await client.functions.invoke("health-check");
  assert.equal(fnResult.data.ok, true);
}

async function main() {
  await testHangingAuthMethods();
  await testWebLockIsBounded();
  await testHealthyCallsAndLock();
  console.log("[PASS] CHERRIFT bounded Supabase Auth lock + timeout smoke test");
}

main().catch(error => {
  console.error("[FAIL] CHERRIFT bounded Supabase Auth lock + timeout smoke test");
  console.error(error);
  process.exitCode = 1;
});
