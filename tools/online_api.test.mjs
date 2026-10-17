import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
const endpoint = "http://127.0.0.1:8083/__test-api";
async function api(body, token = "local-fixture-token") {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  return { status: response.status, ...(await response.json()) };
}
test("actual Edge Function: authentication, immutable uploads, receipts and concurrent writes", async (t) => {
  const child = spawn(
    process.execPath,
    ["--no-warnings", "tools/test_online_server.mjs"],
    {
      env: { ...process.env, CHERRIFT_FIXTURE_PORT: "8083" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  t.after(() => child.kill());
  const startup = await Promise.race([
    once(child.stdout, "data").then(([chunk]) => String(chunk)),
    once(child, "exit").then(([code]) => {
      throw new Error(`fixture exited ${code}`);
    }),
  ]);
  assert.match(startup, /Disposable online/);
  assert.equal(
    (await api({ action: "bootstrap_save" }, "invalid")).status,
    401,
  );
  let boot = await api({ action: "bootstrap_save" });
  assert.equal(boot.gameplay_policy, "online-v1");
  assert.equal(boot.save_data.coins, 500);
  const forged = structuredClone(boot.save_data);
  forged.coins = 1e12;
  forged.account.level = 999;
  forged.power = 1e12;
  forged.unlockedStages = ["world_6_5"];
  forged.prebeta.entitlements = { owner: true };
  const uploaded = await api({
    action: "save_progress",
    expected_updated_at: boot.updated_at,
    save_data: forged,
  });
  assert.equal(uploaded.status, 200);
  assert.equal(uploaded.save_data.coins, 500);
  assert.equal(uploaded.save_data.account.level, 1);
  assert.deepEqual(uploaded.save_data.prebeta.entitlements, {});
  const id = crypto.randomUUID(),
    body = {
      action: "game_action",
      operation: "open_chest",
      operation_id: id,
      params: { tier: "common", count: 1 },
      expected_updated_at: uploaded.updated_at,
    };
  const opened = await api(body);
  assert.equal(opened.status, 200);
  assert.equal(opened.save_data.chests.common, 2);
  assert.equal(opened.rewards.length, 1);
  const duplicate = await api(body);
  assert.equal(duplicate.replayed, true);
  assert.equal(duplicate.save_data.chests.common, 2);
  assert.equal(duplicate.updated_at, opened.updated_at);
  const race = await Promise.all(
    [1, 2].map(() =>
      api({
        ...body,
        operation_id: crypto.randomUUID(),
        expected_updated_at: opened.updated_at,
      }),
    ),
  );
  assert.equal(race.filter((x) => x.ok).length, 1);
  assert.equal(race.filter((x) => x.conflict).length, 1);
  const stale = await api({
    action: "save_progress",
    expected_updated_at: uploaded.updated_at,
    save_data: forged,
  });
  assert.equal(stale.conflict, true);
  const ranked = await api({
    action: "ranking_submit",
    power: 1e12,
    level: 999,
  });
  assert.equal(ranked.status, 200);
  assert.equal(ranked.best_weekly_rank, 0);
  const list = await api({ action: "ranking_list" });
  assert.equal(list.ranking[0].level, 1);
  assert.ok(list.ranking[0].power < 1e9);
  boot = await api({ action: "bootstrap_save" });
  const wrongOwner = {
    ...boot.save_data,
    security: { accountOwnerId: "someone-else" },
  };
  assert.equal(
    (
      await api({
        action: "save_progress",
        expected_updated_at: boot.updated_at,
        save_data: wrongOwner,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await api({
        ...body,
        operation: "start_run",
        operation_id: crypto.randomUUID(),
        expected_updated_at: boot.updated_at,
        params: { stage_id: "world_6_5" },
      })
    ).status,
    400,
  );
});
