import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import {
  applyGameAction,
  prepareSave,
  serverPower,
  catalog,
} from "../supabase/functions/_shared/gameplay.mjs";

const NOW = Date.UTC(2026, 9, 16, 12);
function starter() {
  return prepareSave(
    {
      coins: 500,
      bloomGems: 0,
      energy: 50,
      chests: { common: 3, rare: 0, epic: 0 },
      account: { level: 1, xp: 0, totalXp: 0 },
      profile: {},
      security: { accountOwnerId: "a" },
      unlockedSkins: ["cherry_default"],
      unlockedStages: ["world_1_1"],
    },
    NOW,
    () => 0.5,
  );
}
const act = (s, operation, params = {}, now = NOW) =>
  applyGameAction(s, operation, params, {
    now,
    random: () => 0.5,
    id: () => "server-id",
  });
test("server opening charges an owned chest and creates its own item", () => {
  const before = starter(),
    { save, rewards } = act(before, "open_chest", {
      tier: "common",
      count: 1,
      item: { damage: 1e12 },
    });
  assert.equal(save.chests.common, 2);
  assert.equal(save.inventory.length, 1);
  assert.notEqual(save.inventory[0].id, "client-id");
  assert.ok(serverPower(save) < 1e9);
  assert.equal(rewards.length, 1);
  assert.equal(before.chests.common, 3);
});
test("invalid chest tiers, counts and absent resources cannot mint rewards", () => {
  for (const params of [
    { tier: "legendary", count: 1 },
    { tier: "common", count: 999 },
    { tier: "epic", count: 1 },
    { tier: "__proto__", count: 1 },
  ])
    assert.throws(() => act(starter(), "open_chest", params));
});
test("server enforces purchase prices and insufficient balance", () => {
  const bought = act(starter(), "buy_chest", { tier: "common" }).save;
  assert.equal(bought.coins, 50);
  assert.equal(bought.chests.common, 4);
  assert.throws(() => act(bought, "buy_chest", { tier: "common" }));
  assert.throws(() => act(starter(), "buy_chest", { tier: "epic", count: 10 }));
});
test("skin purchase checks the server catalogue, price and duplicate ownership", () => {
  const s = starter(),
    skin = catalog.skins.find((x) => x.id !== "cherry_default");
  s.sakuraEssence = 10000;
  const next = act(s, "buy_skin", { skin_id: skin.id }).save;
  assert.ok(next.unlockedSkins.includes(skin.id));
  assert.ok(next.sakuraEssence < 10000);
  assert.throws(() => act(next, "buy_skin", { skin_id: skin.id }));
});

test("Gunner is a purchasable Rare skin in the authoritative catalogue", () => {
  const skin = catalog.skins.find(skin => skin.id === "gunner_cherry");
  assert.equal(skin?.rarity, "Rare");
  const save = starter();
  save.sakuraEssence = 10000;
  const bought = act(save, "buy_skin", {skin_id:"gunner_cherry"}).save;
  assert.ok(bought.unlockedSkins.includes("gunner_cherry"));
  assert.ok(bought.sakuraEssence < save.sakuraEssence);
  assert.throws(() => act(bought, "buy_skin", {skin_id:"gunner_cherry"}));
});

test("training requires an owned active GM title and cannot grant rewards or spend run resources", () => {
  assert.throws(() => act(starter(),"start_run",{stage_id:"training_test"}));
  const forged=starter();
  forged.profile.activeTitle="gm";
  assert.throws(() => act(forged,"start_run",{stage_id:"training_test"}));
  const gm=starter();
  gm.ownedTitles=["gm"];
  gm.profile.activeTitle="gm";
  gm.energy=0;
  const before=structuredClone(gm);
  const started=act(gm,"start_run",{stage_id:"training_test"}).save;
  assert.equal(started.security.online.run.training,true);
  assert.equal(started.selectedStageId,"training_test");
  assert.equal(started.energy,0);
  assert.equal(started.stats.runs,before.stats.runs);
  assert.deepEqual(started.buffs,before.buffs);
  const progress={run_id:"server-id",star:3,kills:1000};
  assert.throws(() => act(started,"checkpoint_run",progress,NOW+60000));
  assert.throws(() => act(started,"end_run",progress,NOW+60000));
  const result=act(started,"end_run",{run_id:"server-id",star:0,kills:0},NOW+60000);
  assert.deepEqual(result.rewards,[]);
  assert.equal(result.save.security.online.run.ended,true);
  for(const key of ["coins","bloomGems","inventory","account","stageStars","stats"])
    assert.deepEqual(result.save[key],before[key],key);
});
test("run tickets enforce locks, one active run, elapsed time, caps and no replay", () => {
  let s = starter();
  assert.throws(() => act(s, "start_run", { stage_id: "world_6_5" }));
  s = act(s, "start_run", { stage_id: "world_1_1" }).save;
  assert.throws(() => act(s, "start_run", { stage_id: "world_1_1" }));
  assert.throws(() =>
    act(
      s,
      "checkpoint_run",
      { run_id: "forged", star: 3, kills: 120 },
      NOW + 60000,
    ),
  );
  assert.throws(() =>
    act(
      s,
      "checkpoint_run",
      { run_id: "server-id", star: 1, kills: 10 },
      NOW + 1000,
    ),
  );
  assert.throws(() =>
    act(
      s,
      "end_run",
      { run_id: "server-id", star: 3, kills: 1e9 },
      NOW + 60000,
    ),
  );
  s = act(
    s,
    "end_run",
    { run_id: "server-id", star: 3, kills: 120 },
    NOW + 60000,
  ).save;
  assert.equal(s.energy, 45);
  assert.equal(s.stats.clears, 1);
  assert.equal(s.stageStars.world_1_1, 3);
  assert.ok(s.unlockedStages.includes("world_1_2"));
  assert.throws(() =>
    act(
      s,
      "end_run",
      { run_id: "server-id", star: 3, kills: 120 },
      NOW + 61000,
    ),
  );
});
test("repeating a checkpoint cannot double-charge energy or award rewards twice", () => {
  let s = act(starter(), "start_run", { stage_id: "world_1_1" }).save;
  s = act(
    s,
    "checkpoint_run",
    { run_id: "server-id", star: 1, kills: 40 },
    NOW + 61000,
  ).save;
  const coins = s.coins;
  s = act(
    s,
    "checkpoint_run",
    { run_id: "server-id", star: 1, kills: 40 },
    NOW + 62000,
  ).save;
  assert.equal(s.coins, coins);
  assert.equal(s.energy, 45);
});
test("aborting before the first checkpoint grants no progression", () => {
  let s = act(starter(), "start_run", { stage_id: "world_1_1" }).save;
  s = act(
    s,
    "end_run",
    { run_id: "server-id", star: 0, kills: 20 },
    NOW + 10000,
  ).save;
  assert.equal(s.energy, 50);
  assert.equal(s.coins, 500);
  assert.equal(s.stats.kills, 0);
});
test("server login and event claims are once per server day", () => {
  let s = act(starter(), "claim_login").save;
  assert.equal(s.coins, 800);
  assert.throws(() => act(s, "claim_login"));
  s = act(s, "event_login", { day: 1 }).save;
  assert.equal(s.coins, 1100);
  assert.throws(() => act(s, "event_login", { day: 1 }));
  assert.throws(() => act(s, "event_login", { day: 7 }));
});
test("daily and weekly rewards require canonical progress", () => {
  const s = starter();
  assert.throws(() => act(s, "claim_daily_bonus"));
  assert.throws(() => act(s, "claim_weekly"));
  const q = s.daily.quests[0];
  assert.throws(() => act(s, "claim_daily", { quest_id: q.id, progress: 1e9 }));
});
test("refills use server dates, costs and limits", () => {
  let s = starter();
  s.coins = 5000;
  s.energy = 20;
  s = act(s, "refill_energy", { kind: "coins" }).save;
  assert.equal(s.coins, 4200);
  assert.equal(s.energy, 30);
  s = act(s, "refill_energy", { kind: "coins" }).save;
  assert.throws(() => act(s, "refill_energy", { kind: "coins" }));
  assert.throws(() => act(s, "refill_energy", { kind: "ad" }));
});
test("equipment operations can only use actual server-owned items", () => {
  let s = act(starter(), "open_chest", { tier: "common", count: 1 }).save;
  assert.throws(() => act(s, "equip", { item_id: "forged" }));
  const item = s.inventory[0];
  s = act(s, "equip", { item_id: item.id }).save;
  assert.equal(s.equipped[item.slot].id, item.id);
  s = act(s, "unequip", { slot: item.slot }).save;
  s = act(s, "lock", { item_id: item.id }).save;
  assert.throws(() => act(s, "sell", { item_id: item.id }));
  assert.throws(() => act(s, "dismantle", { item_ids: [item.id] }));
});
test("skill and arsenal upgrades check level, points, sequence and materials", () => {
  const s = starter();
  assert.throws(() => act(s, "upgrade_arsenal", { slot: "Weapon" }));
  assert.throws(() => act(s, "upgrade_skill", { node_id: "bossDamage" }));
  const next = act(s, "upgrade_skill", { node_id: "damage" }).save;
  assert.equal(next.account.skillPoints, 0);
  assert.throws(() => act(next, "upgrade_skill", { node_id: "damage" }));
});
test("achievements cannot be claimed based on supplied client stats", () => {
  assert.throws(() =>
    act(starter(), "claim_achievement", {
      achievement_id: "veteran_bunny",
      level: 999,
    }),
  );
  const s = starter();
  s.stats.clears = 1;
  const next = act(s, "claim_achievement", {
    achievement_id: "first_bloom",
  }).save;
  assert.ok(next.fixAchievementsClaimed.includes("first_bloom"));
  assert.throws(() =>
    act(next, "claim_achievement", { achievement_id: "first_bloom" }),
  );
});
test("unknown operations and NaN-derived counts fail closed", () => {
  assert.throws(() => act(starter(), "grant_money", { coins: 1e12 }));
  assert.throws(() =>
    act(starter(), "open_chest", { tier: "common", count: "NaN" }),
  );
});
test("prototype names and missing item IDs cannot create items or alter shared state", () => {
  for (const slot of ["__proto__", "constructor", "toString"]) {
    assert.throws(() => act(starter(), "unequip", { slot }));
    assert.throws(() => act(starter(), "upgrade_arsenal", { slot }));
    assert.throws(() => act(starter(), "refill_energy", { kind: slot }));
  }
  assert.throws(() => act(starter(), "sell", {}));
  assert.equal(Object.prototype.level, undefined);
});

function functionSource(source, name) {
  const start = source.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(start >= 0, name);
  const rest = source.slice(start);
  const next = rest.search(/\n(?:  )?(?:async )?function /);
  return next < 0 ? rest : rest.slice(0, next);
}
const server = stripTypeScriptTypes(
  readFileSync("supabase/functions/player-api/index.ts", "utf8"),
  { mode: "transform" },
);
test("raw save uploads cannot change any protected progression or entitlement", () => {
  const context = vm.createContext({
    structuredClone,
    TextEncoder,
    Date,
    serverPower,
    prepareSave,
    MAX_SAVE_BYTES: 1500000,
    GM_TITLE_IDS: new Set(["gm", "senior_gm", "head_gm"]),
    sanitizeElementalResonance: (x) => x,
    discordProfile: () => ({ authProvider: "discord" }),
    starterSave: starter,
  });
  for (const name of [
    "isObject",
    "safeText",
    "boundedInteger",
    "sanitizeProgressSave",
  ])
    vm.runInContext(functionSource(server, name), context);
  const current = starter();
  current.prebeta.entitlements = {};
  current.ownedTitles = ["gm"];
  current.security.schema = 2;
  current.security.initializedBy = "player-api";
  const forged = {
    ...structuredClone(current),
    coins: 1e12,
    energy: 1e8,
    account: { level: 999 },
    inventory: [{ id: "forged" }],
    unlockedStages: ["world_6_5"],
    ownedTitles: ["head_gm"],
    prebeta: { entitlements: { owner: true } },
    security: { accountOwnerId: "a", online: { receipts: [] } },
  };
  const actual = context.sanitizeProgressSave(forged, current, { id: "a" });
  for (const key of [
    "coins",
    "energy",
    "account",
    "inventory",
    "unlockedStages",
    "ownedTitles",
    "prebeta",
    "security",
  ])
    assert.deepEqual(
      JSON.parse(JSON.stringify(actual[key])),
      JSON.parse(JSON.stringify(current[key])),
      key,
    );
});

const authSource = readFileSync("src/cherrift_auth.js", "utf8");
function authHarness() {
  const data = new Map(),
    applied = [],
    requests = [];
  const runtime = {
    session: { user: { id: "a" } },
    activeUserId: "a",
    accountGeneration: 1,
    pendingSave: null,
    lastCloudSavedAt: "r1",
    lastSavedJson: "",
    mode: "discord",
    cloudReady: true,
    onlinePolicy: false,
    savePromise: Promise.resolve(),
  };
  const context = vm.createContext({
    runtime,
    console,
    structuredClone,
    Date,
    JSON,
    crypto,
    Blob,
    URL,
    TextEncoder,
    Promise,
    SAVE_VERSION: "test",
    SAVE_DEBOUNCE_MS: 700,
    window: {
      localStorage: {
        getItem: (key) => data.get(key) || null,
        setItem: (key, value) => data.set(key, value),
      },
      clearTimeout() {},
      setTimeout() {
        return 1;
      },
      CHERRIFT_OBTAINED: { reset() {} },
      UI: { toast() {} },
    },
    normalizeSave: structuredClone,
    cloneJson: structuredClone,
    isObject: (x) => !!x && typeof x === "object" && !Array.isArray(x),
    language: () => "en",
    text: (x) => x,
    applyDiscordProfile: (save, session = runtime.session) => {
      save.security = { ...save.security, accountOwnerId: session.user.id };
    },
    applySaveToUi: (save) => applied.push(save),
    starterDiscordSave: starter,
    syncAccountUi() {},
    callPlayerApi: async (action, payload) => {
      requests.push({ action, payload });
      return {
        ok: true,
        save_data: {
          coins: 500,
          security: { accountOwnerId: runtime.session.user.id },
        },
        updated_at: "r1",
      };
    },
  });
  for (const name of [
    "accountContext",
    "isCurrentAccount",
    "backupKey",
    "readBackup",
    "writeBackup",
    "preserveRecovery",
    "progressDiffers",
    "bootstrapCloud",
    "fallbackDiscordSave",
    "queueCloudSave",
    "sendProgress",
    "flushCloudSave",
    "resolveDiscordSave",
    "reconnectCloud",
    "gameAction",
    "acceptServerSave",
  ])
    vm.runInContext(functionSource(authSource, name), context);
  return { context, runtime, data, applied, requests };
}
test("a signed-in legacy-server session can reconnect after deployment without uploading legacy progress", async () => {
  const {context:c,runtime:r,requests}=authHarness();
  r.cloudReady=true;
  r.onlinePolicy=false;
  r.pendingSave={coins:999999,security:{accountOwnerId:"a"}};
  c.callPlayerApi=async (action) => {
    requests.push(action);
    assert.equal(action,"bootstrap_save");
    return {gameplay_policy:"online-v1",save_data:{coins:500,security:{accountOwnerId:"a"}},updated_at:"r2"};
  };
  assert.equal(await c.reconnectCloud(),true);
  assert.equal(r.onlinePolicy,true);
  assert.equal(r.cloudReady,true);
  assert.equal(r.pendingSave,null);
  assert.deepEqual(requests,["bootstrap_save"]);
});

function onlineHarness() {
  let current={mode:"discord",cloudReady:true,onlinePolicy:false}, account="a";
  const messages=[], requests=[], listeners=new Map();
  class Game {
    async start(){ this.started=true; return true; }
    update(){} stageClear(){} gameOver(){}
    getSelectedStage(){return {id:"world_1_1"};}
  }
  const UI={save:{settings:{language:"en"},security:{}},toast:message=>messages.push(message),quit(){}};
  const window={UI,CherriftGame:Game,CherriftStorage:{save:()=>true},
    addEventListener:(name,handler)=>listeners.set(name,handler),dispatchEvent(){},
    CHERRIFT_AUTH:{getState:()=>current,captureAccount:()=>account,isCurrentAccount:context=>context===account,
      reconnectCloud:async()=>false,
      gameAction:async (operation,params)=>{requests.push({operation,params});return {save_data:{security:{online:{run:{id:"ticket"}}}}};}
    }
  };
  vm.runInNewContext(readFileSync("src/cherrift_online.js","utf8"),{
    window,UI,document:{getElementById:()=>null},CustomEvent:class {},console,setTimeout
  });
  listeners.get("cherrift:runtime-clean-ready")();
  return {window,current,messages,requests,Game,switchAccount:()=>{account="b";}};
}

test("legacy-server purchases explain the server mismatch and background saves never repeat the toast",async()=>{
  const {window,messages,requests}=onlineHarness();
  for(let i=0;i<10;i++) assert.equal(window.CherriftStorage.save({}),false);
  assert.equal(messages.length,0);
  assert.equal(await window.CHERRIFT_ONLINE.perform("buy_chest",{tier:"common"}),null);
  assert.match(messages[0],/signed in with Discord.*server needs an update/);
  assert.equal(requests.length,0);
});

test("purchases and run starts resume after the deployed server becomes ready",async()=>{
  const {window,current,requests,Game}=onlineHarness();
  let reconnects=0;
  window.CHERRIFT_AUTH.reconnectCloud=async()=>{reconnects++;current.onlinePolicy=true;return true;};
  assert.ok(await window.CHERRIFT_ONLINE.perform("buy_chest",{tier:"common"}));
  assert.equal(requests[0].operation,"buy_chest");
  const game=new Game();
  assert.equal(await game.start(),true);
  assert.equal(game.started,true);
  assert.equal(requests[1].operation,"start_run");
  assert.equal(reconnects,1);
});

test("reconnecting a purchase cannot apply it to a newly switched account",async()=>{
  const {window,current,requests,switchAccount}=onlineHarness();
  window.CHERRIFT_AUTH.reconnectCloud=async()=>{switchAccount();current.onlinePolicy=true;return true;};
  assert.equal(await window.CHERRIFT_ONLINE.perform("buy_chest",{tier:"common"}),null);
  assert.equal(requests.length,0);
});

test("dirty backup at the same revision survives successful reload", async () => {
  const { context: c, runtime: r, data } = authHarness();
  c.writeBackup(
    { coins: 900, security: { accountOwnerId: "a" } },
    "a",
    true,
    "r1",
  );
  const loaded = await c.resolveDiscordSave(r.session);
  assert.equal(loaded.coins, 900);
  assert.equal(r.pendingSave.coins, 900);
  assert.equal(
    JSON.parse(data.get("cherrift-discord-backup-v2:a")).dirty,
    true,
  );
});
test("divergent remote and local saves are both retained", async () => {
  const { context: c, runtime: r, data } = authHarness();
  c.writeBackup(
    { coins: 900, security: { accountOwnerId: "a" } },
    "a",
    true,
    "old",
  );
  const loaded = await c.resolveDiscordSave(r.session);
  assert.equal(loaded.coins, 500);
  assert.equal(
    JSON.parse(data.get("cherrift-discord-backup-v2:a:recovery"))[0].saveData
      .coins,
    900,
  );
  assert.equal(
    JSON.parse(data.get("cherrift-discord-backup-v2:a")).dirty,
    false,
  );
});
for (const kind of ["success", "conflict", "failure"])
  test(`late ${kind} from account A cannot mutate B`, async () => {
    const { context: c, runtime: r, data, applied } = authHarness();
    let finish;
    c.callPlayerApi = () =>
      new Promise((resolve, reject) => {
        finish = kind === "failure" ? reject : resolve;
      });
    const context = c.accountContext(),
      pending = c.sendProgress(
        { coins: 900, security: { accountOwnerId: "a" } },
        context,
      );
    r.session = { user: { id: "b" } };
    r.accountGeneration++;
    r.pendingSave = { coins: 42 };
    r.lastCloudSavedAt = "b1";
    finish(
      kind === "failure"
        ? new Error("network")
        : {
            ok: true,
            conflict: kind === "conflict",
            save_data: { coins: 900, security: { accountOwnerId: "a" } },
            updated_at: "a2",
          },
    );
    await pending.catch(() => {});
    assert.equal(r.lastCloudSavedAt, "b1");
    assert.equal(r.pendingSave.coins, 42);
    assert.equal(data.size, 0);
    assert.equal(applied.length, 0);
  });
test("acknowledging an older write preserves the newer dirty snapshot", async () => {
  const { context: c, runtime: r, data } = authHarness();
  let finish;
  c.callPlayerApi = () => new Promise((resolve) => (finish = resolve));
  const pending = c.sendProgress({
    coins: 600,
    security: { accountOwnerId: "a" },
  });
  r.pendingSave = { coins: 700, security: { accountOwnerId: "a" } };
  finish({ ok: true, updated_at: "r2" });
  await pending;
  const record = JSON.parse(data.get("cherrift-discord-backup-v2:a"));
  assert.equal(record.saveData.coins, 700);
  assert.equal(record.cloudUpdatedAt, "r2");
  assert.equal(record.dirty, true);
});
test("stale bootstrap cannot change the new account revision or UI", async () => {
  const { context: c, runtime: r, applied } = authHarness();
  let finish;
  c.callPlayerApi = () => new Promise((resolve) => (finish = resolve));
  const pending = c.resolveDiscordSave(r.session);
  r.session = { user: { id: "b" } };
  r.activeUserId = "b";
  r.accountGeneration++;
  r.lastCloudSavedAt = "b1";
  finish({ save_data: { coins: 900 }, updated_at: "a2" });
  assert.equal(await pending, null);
  assert.equal(r.lastCloudSavedAt, "b1");
  assert.equal(applied.length, 0);
});

test("lost action acknowledgement retries the same operation ID", async () => {
  const { context: c, runtime: r } = authHarness();
  r.onlinePolicy = true;
  const ids = [];
  c.callPlayerApi = async (_action, payload) => {
    ids.push(payload.operation_id);
    if (ids.length === 1) throw new TypeError("fetch failed");
    return {
      ok: true,
      save_data: { coins: 500, security: { accountOwnerId: "a" } },
      updated_at: "r2",
    };
  };
  await c.gameAction("open_chest", { tier: "common", count: 1 });
  assert.equal(ids.length, 2);
  assert.equal(ids[0], ids[1]);
  assert.equal(r.lastCloudSavedAt, "r2");
});
test("account switching while awaiting a flush cannot replace the new account queue", async () => {
  const { context: c, runtime: r } = authHarness();
  r.onlinePolicy = true;
  let finish;
  c.flushCloudSave = () => new Promise((resolve) => (finish = resolve));
  const pending = c.gameAction("open_chest");
  r.session = { user: { id: "b" } };
  r.accountGeneration++;
  const newQueue = Promise.resolve("new-account");
  r.savePromise = newQueue;
  finish();
  await assert.rejects(pending, /online_account_required/);
  assert.equal(r.savePromise, newQueue);
});
test("a late game action cannot hydrate another account", async () => {
  const { context: c, runtime: r, applied, data } = authHarness();
  r.onlinePolicy = true;
  let finish;
  c.callPlayerApi = () => new Promise((resolve) => (finish = resolve));
  const pending = c.gameAction("open_chest");
  while (!finish) await Promise.resolve();
  r.session = { user: { id: "b" } };
  r.accountGeneration++;
  r.lastCloudSavedAt = "b1";
  finish({
    ok: true,
    updated_at: "a2",
    save_data: { coins: 900, security: { accountOwnerId: "a" } },
  });
  await assert.rejects(pending, /stale_account_response/);
  assert.equal(r.lastCloudSavedAt, "b1");
  assert.equal(applied.length, 0);
  assert.equal(data.size, 0);
});
test("optional service hydration rejects stale contexts and wrong owners", () => {
  const { context: c, runtime: r, data } = authHarness(),
    context = c.accountContext();
  r.accountGeneration++;
  assert.equal(
    c.acceptServerSave({ security: { accountOwnerId: "a" } }, "r2", context),
    false,
  );
  assert.equal(
    c.acceptServerSave({ security: { accountOwnerId: "b" } }, "r3"),
    false,
  );
  assert.equal(data.size, 0);
});
test("a checkpoint unlocks the next chapter using the existing one-star rule", () => {
  let s = act(starter(), "start_run", { stage_id: "world_1_1" }).save;
  s = act(
    s,
    "end_run",
    { run_id: "server-id", star: 1, kills: 30 },
    NOW + 61000,
  ).save;
  assert.ok(s.unlockedStages.includes("world_1_2"));
  assert.ok(!s.unlockedStages.includes("world_2_1"));
});
