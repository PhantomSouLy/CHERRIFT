// Disposable local integration fixture. It runs the actual Edge Function
// handler and gameplay rules against an in-memory query adapter, never Supabase.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";
import {
  applyGameAction,
  prepareSave,
  serverPower,
  catalog,
} from "../supabase/functions/_shared/gameplay.mjs";
const root = path.resolve("."),
  tables = new Map();
let revision = 0,
  handler;
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  user_metadata: { full_name: "Helyi tesztfiók" },
  identities: [
    { provider: "discord", identity_data: { provider_id: "local-fixture" } },
  ],
};
class Query {
  constructor(name) {
    this.name = name;
    this.filters = [];
    this.mode = "read";
    this.maximum = 100;
    this.countOnly = false;
  }
  select(_columns = "*", options = {}) {
    this.countOnly = options.head || false;
    return this;
  }
  eq(key, value) {
    this.filters.push((row) => row[key] === value);
    return this;
  }
  neq(key, value) {
    this.filters.push((row) => row[key] !== value);
    return this;
  }
  gt(key, value) {
    this.filters.push((row) => row[key] > value);
    return this;
  }
  in(key, values) {
    this.filters.push((row) => values.includes(row[key]));
    return this;
  }
  is(key, value) {
    return this.eq(key, value);
  }
  lte() {
    return this;
  }
  gte() {
    return this;
  }
  or() {
    return this;
  }
  order() {
    return this;
  }
  not() {
    return this;
  }
  ilike() {
    return this;
  }
  limit(value) {
    this.maximum = value;
    return this;
  }
  insert(value) {
    this.mode = "insert";
    this.value = value;
    return this;
  }
  upsert(value) {
    this.mode = "upsert";
    this.value = value;
    return this;
  }
  update(value) {
    this.mode = "update";
    this.value = value;
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }
  async run(single = false) {
    const rows = tables.get(this.name) || [];
    tables.set(this.name, rows);
    let matched = rows.filter((row) => this.filters.every((test) => test(row)));
    if (this.mode === "insert" || this.mode === "upsert") {
      const values = Array.isArray(this.value) ? this.value : [this.value];
      matched = [];
      for (const value of values) {
        const existing = rows.find(
          (x) => x.user_id && x.user_id === value.user_id,
        );
        if (existing && this.mode === "insert")
          return { data: null, error: { code: "23505" } };
        const row = existing || {};
        Object.assign(row, structuredClone(value));
        if (this.name === "game_saves")
          row.updated_at = new Date(Date.now() + ++revision).toISOString();
        if (!existing) rows.push(row);
        matched.push(row);
      }
    } else if (this.mode === "update") {
      for (const row of matched) {
        Object.assign(row, structuredClone(this.value));
        if (this.name === "game_saves")
          row.updated_at = new Date(Date.now() + ++revision).toISOString();
      }
    } else if (this.mode === "delete")
      tables.set(
        this.name,
        rows.filter((row) => !matched.includes(row)),
      );
    const count = matched.length,
      data = this.countOnly
        ? null
        : single
          ? matched[0] || null
          : matched.slice(0, this.maximum);
    return { data: structuredClone(data), count, error: null };
  }
  single() {
    return this.run(true);
  }
  maybeSingle() {
    return this.run(true);
  }
  then(resolve, reject) {
    return this.run().then(resolve, reject);
  }
}
const client = {
  from: (name) => new Query(name),
  auth: {
    getUser: async (token) => ({
      data: { user: token === "local-fixture-token" ? user : null },
      error: null,
    }),
  },
};
const context = vm.createContext({
  console,
  Date,
  crypto,
  Request,
  Response,
  Headers,
  TextEncoder,
  structuredClone,
  applyGameAction,
  prepareSave,
  serverPower,
  catalog,
  createClient: () => client,
  Deno: {
    env: {
      get: (name) =>
        name === "SUPABASE_URL" ? "http://127.0.0.1:8082" : "fixture-key",
    },
    serve: (callback) => {
      handler = callback;
    },
  },
});
const source = stripTypeScriptTypes(
  readFileSync("supabase/functions/player-api/index.ts", "utf8"),
  { mode: "transform" },
).replace(/^import .*;\s*$/gm, "");
vm.runInContext(source, context);
const authScript = `(() => {
 if(location.search.includes('slowBoot=1')) window.CHERRIFT_TIMEOUTS={...window.CHERRIFT_TIMEOUTS,cloudBootstrapMs:30000};
 const user=${JSON.stringify(user)}, session={access_token:'local-fixture-token',user};
 if(new URLSearchParams(location.search).has('quotaRecovery')) {
  const owner=user.id,key='cherrift-discord-backup-v2:'+owner,security={accountOwnerId:owner};
  localStorage.setItem(key,JSON.stringify({ownerUserId:owner,cloudUpdatedAt:'fixture-old',dirty:true,saveData:{coins:900,security}}));
  const record={ownerUserId:owner,savedAt:'2026-10-24',cloudUpdatedAt:'fixture-old',saveData:{coins:800,security}};
  let filled=false;
  for(let size=50000;size<=10000000;size+=50000) {
   try {localStorage.setItem(key+':recovery',JSON.stringify([{...record,notes:'x'.repeat(size)}]));}
   catch(error){if(error.name!=='QuotaExceededError')throw error;filled=true;break;}
  }
  console.info('[Recovery fixture] native quota reached: '+filled);
  window.addEventListener('cherrift:authgate',async event=>{
   if(event.detail.mode!=='discord'||event.detail.visible)return;
   const records=await window.CHERRIFT_RECOVERY.list(owner);
   console.info('[Recovery fixture] '+JSON.stringify({cloudReady:window.CHERRIFT_AUTH.getState().cloudReady,legacyRemoved:localStorage.getItem(key+':recovery')===null,archivedCopies:records.length}));
  });
 }

 const client={auth:{getSession:async()=>({data:{session},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null})},functions:{invoke:async(_name,options)=>{try{if(location.search.includes('slowBoot=1')&&options.body.action==='bootstrap_save')await new Promise(resolve=>setTimeout(resolve,20000));const response=await fetch('/__test-api',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer local-fixture-token'},body:JSON.stringify(options.body)});const data=await response.json();return response.ok?{data,error:null}:{data,error:{message:data.error||'fixture_error'}};}catch(error){return {data:null,error};}}}};
 window.supabase={createClient:()=>client};
})();`;
const types = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
  ".wav": "audio/wav",
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1:8082");
    if (url.pathname === "/__test-api") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const response = await handler(
        new Request(url, { method: req.method, headers: req.headers, body }),
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
      return;
    }
    if (url.pathname === "/__test-auth.js") {
      res.writeHead(200, { "content-type": "text/javascript" });
      res.end(authScript);
      return;
    }
    if (url.pathname === "/") {
      const html = (await readFile("index.html", "utf8")).replace(
        /(<script src="src\/supabase_config[^>]*><\/script>)/,
        '$1<script src="/__test-auth.js"></script>',
      );
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(html);
      return;
    }
    const target = path.resolve(root, "." + decodeURIComponent(url.pathname));
    if (!target.startsWith(root + path.sep)) throw new Error("invalid path");
    await stat(target);
    res.writeHead(200, {
      "content-type": types[path.extname(target)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(await readFile(target));
  } catch (error) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
});
server.listen(
  Number(process.env.CHERRIFT_FIXTURE_PORT || 8082),
  "127.0.0.1",
  () =>
    console.log(
      `Disposable online gameplay fixture: http://127.0.0.1:${server.address().port} (no external data)`,
    ),
);
