import { createClient } from "npm:@supabase/supabase-js@2";

type JsonObject = Record<string, unknown>;

const ALLOWED_ORIGINS = new Set([
  "https://phantomsouly.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);

function firstJsonSecret(name: string): string {
  const raw = Deno.env.get(name);
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return Object.values(parsed).find((value) => typeof value === "string") ?? "";
  } catch {
    return "";
  }
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const PUBLIC_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  firstJsonSecret("SUPABASE_PUBLISHABLE_KEYS");
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SECRET_KEY") ??
  firstJsonSecret("SUPABASE_SECRET_KEYS");

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://phantomsouly.github.io";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

function isObject(value: unknown): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function authenticatedUser(req: Request): Promise<any> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("missing_auth_token");
  const authClient = createClient(SUPABASE_URL, PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) throw new Error("invalid_auth_token");
  return data.user;
}

function normalizeCode(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function errorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String((error as any)?.message ?? error ?? "unknown_error");
  for (const known of [
    "mail_not_available",
    "mail_already_claimed",
    "redeem_not_available",
    "redeem_user_limit_reached",
  ]) {
    if (message.includes(known)) return known;
  }
  return message.slice(0, 240);
}

function safeText(value: unknown, max = 80): string {
  return typeof value === "string" ? value.trim().replace(/[\u0000-\u001f]/g, "").slice(0, max) : "";
}

function profileCode(userId: string): string {
  return `CH-${userId.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

const GM_TITLE_IDS = new Set(["gm", "senior_gm", "head_gm"]);
const MAX_SAVE_BYTES = 1_500_000;

function discordProfile(user: any): JsonObject {
  const metadata = user?.user_metadata ?? {};
  return {
    name: safeText(metadata.full_name || metadata.global_name || metadata.name || metadata.user_name || metadata.preferred_username, 80) || "Cherry Player",
    authProvider: "discord",
    discordUserId: String(user.id),
    discordId: safeText(metadata.provider_id, 80),
    discordUsername: safeText(metadata.user_name || metadata.preferred_username, 80),
    avatarUrl: safeText(metadata.avatar_url || metadata.picture, 500),
    activeTitle: "",
    frameId: "frame0lvl",
    createdAt: Date.now(),
  };
}

function starterSave(user: any): JsonObject {
  return {
    coins: 500,
    keys: 0,
    bloomGems: 0,
    blossomGems: 0,
    sakuraEssence: 0,
    heartTokens: 0,
    chests: { common:3, rare:0, epic:0 },
    selectedSkin: "cherry_default",
    unlockedSkins: ["cherry_default"],
    selectedStageId: "world_1_1",
    unlockedStages: ["world_1_1"],
    clearedStages: {},
    stageStars: {},
    stageStats: {},
    firstClearClaimed: {},
    inventory: [],
    equipped: {},
    account: {
      level:1, xp:0, totalXp:0, skillPoints:1, manualV052:true,
      tree:{ power:0, vitality:0, haste:0, fortune:0 },
      skillTreeV082:{ ranks:{} }, skillTreeV082Migrated:true,
    },
    stats: { kills:0, clears:0, runs:0, coinsEarned:0, loginDays:0 },
    economy: { lifetimeCoinsEarned:0, bestWeeklyRank:0, activePlayers:0 },
    ownedTitles: [],
    titleRewardsClaimed: [],
    profile: discordProfile(user),
    energy: 50,
    energyState: { max:50, lastTick:Date.now(), refills:{}, drinks:{ small:0, standard:0, large:0 } },
    bag: { materials:{ gearScrap:0, stones:{ copper:0, iron:0, steel:0, silver:0, royal:0, magical:0 }, slotCores:{} } },
    settings: { volume:60, touchMode:true, fpsLimit:60, language:"hu" },
    prebeta: { schema:"prebeta-1", version:"0.9.5-prebeta.2", starterCreated:true, isStarter:true },
    security: { accountOwnerId:String(user.id), schema:2, initializedBy:"player-api" },
  };
}

function bindAuthoritativeIdentity(value: unknown, user: any): JsonObject {
  if (!isObject(value)) return starterSave(user);
  const next = structuredClone(value) as JsonObject;
  const previousProfile = isObject(next.profile) ? next.profile : {};
  next.profile = {
    ...previousProfile,
    ...discordProfile(user),
    activeTitle:safeText(previousProfile.activeTitle, 80),
    frameId:safeText(previousProfile.frameId, 50) || "frame0lvl",
    createdAt:Number(previousProfile.createdAt || Date.now()),
  };
  next.security = { accountOwnerId:String(user.id), schema:2, initializedBy:"player-api" };
  return next;
}

function sanitizeProgressSave(value: unknown, current: JsonObject, user: any): JsonObject {
  if (!isObject(value)) throw new Error("invalid_save_data");
  const serialized = JSON.stringify(value);
  if (new TextEncoder().encode(serialized).byteLength > MAX_SAVE_BYTES) throw new Error("save_too_large");
  const claimedOwner = safeText(isObject(value.security) ? value.security.accountOwnerId : "", 80);
  if (claimedOwner !== String(user.id)) throw new Error("account_owner_mismatch");
  const next = structuredClone(value) as JsonObject;
  const currentProfile = isObject(current.profile) ? current.profile : {};
  const requestedProfile = isObject(next.profile) ? next.profile : {};
  next.profile = {
    ...requestedProfile,
    ...discordProfile(user),
    activeTitle:safeText(requestedProfile.activeTitle, 80),
    frameId:safeText(requestedProfile.frameId, 50) || safeText(currentProfile.frameId, 50) || "frame0lvl",
    createdAt:Number(currentProfile.createdAt || requestedProfile.createdAt || Date.now()),
  };
  const currentTitles = Array.isArray(current.ownedTitles) ? current.ownedTitles.filter((id) => typeof id === "string") : [];
  const requestedTitles = Array.isArray(next.ownedTitles) ? next.ownedTitles.filter((id) => typeof id === "string" && !GM_TITLE_IDS.has(id)).slice(0, 500) : [];
  next.ownedTitles = [...new Set([...requestedTitles, ...currentTitles.filter((id) => GM_TITLE_IDS.has(id))])];
  const currentPrebeta = isObject(current.prebeta) ? current.prebeta : {};
  const requestedPrebeta = isObject(next.prebeta) ? next.prebeta : {};
  next.prebeta = { ...requestedPrebeta };
  if (currentPrebeta.serverEdit !== undefined) next.prebeta.serverEdit = currentPrebeta.serverEdit;
  if (currentPrebeta.gmAccessBackup !== undefined) next.prebeta.gmAccessBackup = currentPrebeta.gmAccessBackup;
  next.security = { accountOwnerId:String(user.id), schema:2, initializedBy:"player-api" };
  next.unlockedSkins = Array.isArray(next.unlockedSkins)
    ? [...new Set(next.unlockedSkins.filter((id) => typeof id === "string" && id.length <= 80))].slice(0, 500)
    : ["cherry_default"];
  if (!next.unlockedSkins.includes("cherry_default")) next.unlockedSkins.unshift("cherry_default");
  next.unlockedStages = Array.isArray(next.unlockedStages)
    ? [...new Set(next.unlockedStages.filter((id) => typeof id === "string" && /^world_[0-9]+_[0-9]+$/.test(id)))].slice(0, 500)
    : ["world_1_1"];
  if (!next.unlockedStages.includes("world_1_1")) next.unlockedStages.unshift("world_1_1");
  return next;
}

function mondayUtc(): string {
  const now = new Date();
  const day = now.getUTCDay() || 7;
  now.setUTCDate(now.getUTCDate() - day + 1);
  return now.toISOString().slice(0, 10);
}

async function profileRows(userIds: string[]): Promise<any[]> {
  if (!userIds.length) return [];
  const { data, error } = await adminClient.from("player_profiles")
    .select("user_id,public_code,display_name,discord_name,avatar_url,frame_id,level,power,best_weekly_rank,last_active_at")
    .in("user_id", [...new Set(userIds)]);
  if (error) throw error;
  return data ?? [];
}

async function friendCount(userId: string): Promise<number> {
  const [{ count: low, error: lowError }, { count: high, error: highError }] = await Promise.all([
    adminClient.from("friendships").select("user_low", { count:"exact", head:true }).eq("user_low", userId),
    adminClient.from("friendships").select("user_high", { count:"exact", head:true }).eq("user_high", userId),
  ]);
  if (lowError) throw lowError;
  if (highError) throw highError;
  return Number(low || 0) + Number(high || 0);
}

async function friendLimit(userId: string): Promise<number> {
  const { data, error } = await adminClient.from("player_profiles").select("level,friend_slot_bonus").eq("user_id",userId).single();
  if (error) throw error;
  return 30 + (Number(data?.level || 1) >= 20 ? 5 : 0) + Number(data?.friend_slot_bonus || 0);
}

async function frameAllowed(userId: string, frameId: string): Promise<boolean> {
  if (frameId === "frame0lvl") return true;
  const [{ data: profile, error: profileError }, { data: rights, error: rightsError }] = await Promise.all([
    adminClient.from("player_profiles").select("level,best_weekly_rank").eq("user_id",userId).single(),
    adminClient.from("account_entitlements").select("entitlements").eq("user_id",userId).maybeSingle(),
  ]);
  if (profileError) throw profileError;
  if (rightsError) throw rightsError;
  const entitlements = (rights?.entitlements ?? {}) as Record<string, unknown>;
  if (entitlements.owner || entitlements.allFrames) return true;
  const levelMatch=frameId.match(/^frame(5|30|50|80|100|150|200|225|250)lvl$/);
  if(levelMatch)return Number(profile.level||1)>=Number(levelMatch[1]);
  const rankMatch=frameId.match(/^frame_rank(50|3|2|1)$/);
  if(rankMatch){
    const { count, error }=await adminClient.from("weekly_power_ranking").select("user_id",{count:"exact",head:true}).eq("week_start",mondayUtc());
    if(error)throw error;
    const rank=Number(profile.best_weekly_rank||0);return Number(count||0)>=100&&rank>0&&rank<=Number(rankMatch[1]);
  }
  const entitlementByFrame: Record<string,string>={frame_beta:"beta",frame_pre_reg:"preRegistration",frame_event_1:"event1",frame_event_2:"event2",frame_event_3:"event3"};
  return !!entitlements[entitlementByFrame[frameId]];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const requestId = crypto.randomUUID();
  try {
    const user = await authenticatedUser(req);
    const body = await req.json().catch(() => ({}));
    if (!isObject(body)) throw new Error("invalid_json_body");
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "bootstrap_save") {
      const metadata = user.user_metadata ?? {};
      const now = new Date().toISOString();
      const { data: existing, error: selectError } = await adminClient.from("game_saves")
        .select("save_data,save_version,created_at,updated_at").eq("user_id", user.id).maybeSingle();
      if (selectError) throw selectError;
      let row = existing;
      let created = false;
      if (!row) {
        const initial = starterSave(user);
        const { data: inserted, error: insertError } = await adminClient.from("game_saves").insert({
          user_id:user.id, save_data:initial, save_version:"0.9.5-prebeta.2", updated_at:now,
        }).select("save_data,save_version,created_at,updated_at").single();
        if (insertError) {
          // Parallel tabs may race on the first login. In that case load the
          // row created by the winner; never use either tab's local save.
          if (String(insertError.code) !== "23505") throw insertError;
          const retry = await adminClient.from("game_saves").select("save_data,save_version,created_at,updated_at").eq("user_id", user.id).single();
          if (retry.error) throw retry.error;
          row = retry.data;
        } else {
          row = inserted;
          created = true;
        }
      } else {
        // Existing progress is authoritative, but identity fields are always
        // rebound to the authenticated Discord UUID. This upgrades legacy
        // saves without importing any browser-local state or resetting their
        // legitimate progression.
        const rebound = bindAuthoritativeIdentity(row.save_data, user);
        const { data: reboundRow, error: reboundError } = await adminClient.from("game_saves").update({
          save_data:rebound,
          save_version:safeText(row.save_version, 40) || "0.9.5-prebeta.2",
        }).eq("user_id", user.id).eq("updated_at", row.updated_at)
          .select("save_data,save_version,created_at,updated_at").maybeSingle();
        if (reboundError) throw reboundError;
        if (reboundRow) row = reboundRow;
        else {
          const latest = await adminClient.from("game_saves").select("save_data,save_version,created_at,updated_at").eq("user_id", user.id).single();
          if (latest.error) throw latest.error;
          row = latest.data;
        }
      }
      const displayName = safeText(metadata.full_name || metadata.name || metadata.user_name || metadata.preferred_username, 40) || "Cherry Player";
      await adminClient.from("player_profiles").upsert({
        user_id:user.id, public_code:profileCode(user.id), display_name:displayName,
        discord_name:safeText(metadata.user_name || metadata.preferred_username, 80) || null,
        avatar_url:safeText(metadata.avatar_url || metadata.picture, 500) || null,
        level:Number((row?.save_data as any)?.account?.level || 1),
        power:Number((row?.save_data as any)?.power || 0), last_active_at:now, updated_at:now,
      }, { onConflict:"user_id" });
      return json(req, { ok:true, requestId, created, save_data:row?.save_data, save_version:row?.save_version, updated_at:row?.updated_at });
    }

    if (action === "save_progress") {
      const { data: existing, error: selectError } = await adminClient.from("game_saves")
        .select("save_data,save_version,updated_at").eq("user_id", user.id).maybeSingle();
      if (selectError) throw selectError;
      if (!existing) throw new Error("save_not_initialized");
      const expected = typeof body.expected_updated_at === "string" ? body.expected_updated_at : "";
      if (expected && expected !== existing.updated_at) {
        return json(req, { ok:false, conflict:true, requestId, save_data:existing.save_data, save_version:existing.save_version, updated_at:existing.updated_at });
      }
      const next = sanitizeProgressSave(body.save_data, existing.save_data as JsonObject, user);
      const version = safeText(body.save_version, 40) || "0.9.5-prebeta.2";
      let update = adminClient.from("game_saves").update({ save_data:next, save_version:version })
        .eq("user_id", user.id).eq("updated_at", existing.updated_at)
        .select("save_data,save_version,updated_at").maybeSingle();
      const { data: saved, error: saveError } = await update;
      if (saveError) throw saveError;
      if (!saved) {
        const latest = await adminClient.from("game_saves").select("save_data,save_version,updated_at").eq("user_id", user.id).single();
        if (latest.error) throw latest.error;
        return json(req, { ok:false, conflict:true, requestId, ...latest.data });
      }
      return json(req, { ok:true, requestId, save_data:saved.save_data, save_version:saved.save_version, updated_at:saved.updated_at });
    }

    if (action === "bootstrap_profile") {
      const metadata = user.user_metadata ?? {};
      const displayName = safeText(metadata.full_name || metadata.name || metadata.user_name || metadata.preferred_username, 40) || "Cherry Player";
      const discordName = safeText(metadata.user_name || metadata.preferred_username || metadata.name, 80) || null;
      const avatarUrl = safeText(metadata.avatar_url || metadata.picture, 500) || null;
      const { data: existing } = await adminClient.from("player_profiles").select("frame_id,level,power").eq("user_id",user.id).maybeSingle();
      const { data: profile, error: profileError } = await adminClient.from("player_profiles").upsert({
        user_id:user.id, public_code:profileCode(user.id), display_name:displayName,
        discord_name:discordName, avatar_url:avatarUrl, frame_id:existing?.frame_id || "frame0lvl",
        level:Number(existing?.level || 1), power:Number(existing?.power || 0), last_active_at:new Date().toISOString(), updated_at:new Date().toISOString(),
      }, { onConflict:"user_id" }).select("user_id,public_code,display_name,discord_name,avatar_url,frame_id,level,power,best_weekly_rank").single();
      if (profileError) throw profileError;
      const { data: entitlementRow, error: entitlementError } = await adminClient.from("account_entitlements").select("entitlements").eq("user_id",user.id).maybeSingle();
      if (entitlementError) throw entitlementError;
      return json(req,{ok:true,requestId,profile,entitlements:entitlementRow?.entitlements ?? {}});
    }

    if (action === "sync_profile") {
      const updates: Record<string, unknown> = { updated_at:new Date().toISOString(), last_active_at:new Date().toISOString() };
      const displayName = safeText(body.display_name,40);
      const frameId = safeText(body.frame_id,50);
      if (displayName) updates.display_name=displayName;
      if (frameId && /^frame(?:0lvl|5lvl|30lvl|50lvl|80lvl|100lvl|150lvl|200lvl|225lvl|250lvl|_beta|_pre_reg|_event_[123]|_rank(?:50|3|2|1))$/.test(frameId)) {
        if(!await frameAllowed(user.id,frameId))throw new Error("frame_locked");
        updates.frame_id=frameId;
      }
      const { data, error } = await adminClient.from("player_profiles").update(updates).eq("user_id",user.id).select("user_id,public_code,display_name,avatar_url,frame_id,level,power").single();
      if (error) throw error;
      return json(req,{ok:true,requestId,profile:data});
    }

    if (action === "social_search") {
      const query = safeText(body.query,80);
      if (query.length < 2) throw new Error("search_too_short");
      let builder = adminClient.from("player_profiles").select("user_id,public_code,display_name,discord_name,avatar_url,frame_id,level,power").neq("user_id",user.id).limit(20);
      if(isUuid(query))builder=builder.eq("user_id",query);
      else if(/^CH-[A-Z0-9]+$/i.test(query))builder=builder.ilike("public_code",`${query}%`);
      else {const term=query.replace(/[%_,()]/g,"");builder=builder.or(`display_name.ilike.%${term}%,discord_name.ilike.%${term}%`);}
      const { data, error } = await builder;
      if (error) throw error;
      const { data: blocks, error: blockError } = await adminClient.from("user_blocks").select("blocker_id,blocked_id").or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      if (blockError) throw blockError;
      const blocked = new Set((blocks ?? []).map((row:any)=>row.blocker_id===user.id?row.blocked_id:row.blocker_id));
      return json(req,{ok:true,requestId,players:(data??[]).filter((row:any)=>!blocked.has(row.user_id))});
    }

    if (action === "friend_list") {
      const view = safeText(body.view,20) || "friends";
      if (view === "requests") {
        const { data, error } = await adminClient.from("friend_requests").select("sender_id,created_at").eq("receiver_id",user.id).eq("status","pending").order("created_at",{ascending:false});
        if (error) throw error;
        const profiles=await profileRows((data??[]).map((row:any)=>row.sender_id));
        return json(req,{ok:true,requestId,requests:profiles.map((profile:any)=>({...profile,request_id:profile.user_id}))});
      }
      if (view === "blocked") {
        const { data, error } = await adminClient.from("user_blocks").select("blocked_id,created_at").eq("blocker_id",user.id).order("created_at",{ascending:false});
        if (error) throw error;
        return json(req,{ok:true,requestId,blocked:await profileRows((data??[]).map((row:any)=>row.blocked_id))});
      }
      const { data, error } = await adminClient.from("friendships").select("user_low,user_high,created_at").or(`user_low.eq.${user.id},user_high.eq.${user.id}`).order("created_at",{ascending:false});
      if (error) throw error;
      const ids=(data??[]).map((row:any)=>row.user_low===user.id?row.user_high:row.user_low);
      return json(req,{ok:true,requestId,friends:await profileRows(ids),friend_count:ids.length});
    }

    if (action === "friend_request") {
      if (!isUuid(body.target_user_id) || body.target_user_id===user.id) throw new Error("invalid_friend_target");
      const target=body.target_user_id;
      const { data: block } = await adminClient.from("user_blocks").select("blocker_id").or(`and(blocker_id.eq.${user.id},blocked_id.eq.${target}),and(blocker_id.eq.${target},blocked_id.eq.${user.id})`).maybeSingle();
      if (block) throw new Error("friend_blocked");
      const limit=await friendLimit(user.id);
      if (await friendCount(user.id)>=limit) throw new Error("friend_list_full");
      const { error } = await adminClient.from("friend_requests").upsert({sender_id:user.id,receiver_id:target,status:"pending",updated_at:new Date().toISOString()},{onConflict:"sender_id,receiver_id"});
      if (error) throw error;
      return json(req,{ok:true,requestId});
    }

    if (action === "friend_accept") {
      if (!isUuid(body.request_id)) throw new Error("invalid_friend_request");
      const sender=body.request_id;
      const { data: request, error: requestError } = await adminClient.from("friend_requests").select("sender_id,receiver_id,status").eq("sender_id",sender).eq("receiver_id",user.id).eq("status","pending").single();
      if (requestError || !request) throw new Error("friend_request_missing");
      const [receiverCount,senderCount,receiverLimit,senderLimit]=await Promise.all([friendCount(user.id),friendCount(sender),friendLimit(user.id),friendLimit(sender)]);
      if(receiverCount>=receiverLimit||senderCount>=senderLimit)throw new Error("friend_list_full");
      const { data: block } = await adminClient.from("user_blocks").select("blocker_id").or(`and(blocker_id.eq.${user.id},blocked_id.eq.${sender}),and(blocker_id.eq.${sender},blocked_id.eq.${user.id})`).maybeSingle();
      if(block)throw new Error("friend_blocked");
      const [userLow,userHigh]=[sender,user.id].sort();
      const { error } = await adminClient.from("friendships").upsert({user_low:userLow,user_high:userHigh},{onConflict:"user_low,user_high"});
      if (error) throw error;
      await adminClient.from("friend_requests").update({status:"accepted",updated_at:new Date().toISOString()}).eq("sender_id",sender).eq("receiver_id",user.id);
      return json(req,{ok:true,requestId});
    }

    if (action === "friend_delete") {
      if (!isUuid(body.target_user_id)) throw new Error("invalid_friend_target");
      const [userLow,userHigh]=[user.id,body.target_user_id].sort();
      const { error } = await adminClient.from("friendships").delete().eq("user_low",userLow).eq("user_high",userHigh);
      if (error) throw error;
      return json(req,{ok:true,requestId});
    }

    if (action === "block_player") {
      if (!isUuid(body.target_user_id) || body.target_user_id===user.id) throw new Error("invalid_block_target");
      const target=body.target_user_id; const [userLow,userHigh]=[user.id,target].sort();
      const { error } = await adminClient.from("user_blocks").upsert({blocker_id:user.id,blocked_id:target},{onConflict:"blocker_id,blocked_id"});
      if (error) throw error;
      await adminClient.from("friendships").delete().eq("user_low",userLow).eq("user_high",userHigh);
      await adminClient.from("friend_requests").delete().or(`and(sender_id.eq.${user.id},receiver_id.eq.${target}),and(sender_id.eq.${target},receiver_id.eq.${user.id})`);
      return json(req,{ok:true,requestId});
    }

    if (action === "unblock_player") {
      if (!isUuid(body.target_user_id)) throw new Error("invalid_block_target");
      const { error } = await adminClient.from("user_blocks").delete().eq("blocker_id",user.id).eq("blocked_id",body.target_user_id);
      if (error) throw error;
      return json(req,{ok:true,requestId});
    }

    if (action === "player_profile") {
      if (!isUuid(body.target_user_id)) throw new Error("invalid_profile_target");
      const { data, error } = await adminClient.from("player_profiles").select("user_id,public_code,display_name,avatar_url,frame_id,level,power,best_weekly_rank").eq("user_id",body.target_user_id).single();
      if (error) throw error;
      return json(req,{ok:true,requestId,profile:data});
    }

    if (action === "ranking_submit") {
      const power=Math.min(100000000,Math.max(0,Math.floor(Number(body.power)||0)));
      const level=Math.min(1000,Math.max(1,Math.floor(Number(body.level)||1)));
      const weekStart=mondayUtc();
      const { error } = await adminClient.from("weekly_power_ranking").upsert({week_start:weekStart,user_id:user.id,power,level,submitted_at:new Date().toISOString()},{onConflict:"week_start,user_id"});
      if (error) throw error;
      const [{ count: higher, error: rankError }, { count: activePlayers, error: activeError }, { data: currentProfile, error: currentError }] = await Promise.all([
        adminClient.from("weekly_power_ranking").select("user_id",{count:"exact",head:true}).eq("week_start",weekStart).gt("power",power),
        adminClient.from("weekly_power_ranking").select("user_id",{count:"exact",head:true}).eq("week_start",weekStart),
        adminClient.from("player_profiles").select("best_weekly_rank").eq("user_id",user.id).single(),
      ]);
      if(rankError)throw rankError;if(activeError)throw activeError;if(currentError)throw currentError;
      const rank=Number(higher||0)+1;
      const previousBest=Number(currentProfile?.best_weekly_rank||0);
      const bestWeeklyRank=previousBest>0?Math.min(previousBest,rank):rank;
      await adminClient.from("player_profiles").update({power,level,best_weekly_rank:bestWeeklyRank,last_active_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("user_id",user.id);
      return json(req,{ok:true,requestId,week_start:weekStart,rank,best_weekly_rank:bestWeeklyRank,active_players:Number(activePlayers||0)});
    }

    if (action === "ranking_list") {
      const limit=Math.min(50,Math.max(1,Math.floor(Number(body.limit)||50)));
      const weekStart=mondayUtc();
      const [{ data: ranks, error }, { count: activePlayers, error: activeError }] = await Promise.all([
        adminClient.from("weekly_power_ranking").select("user_id,power,level,submitted_at").eq("week_start",weekStart).order("power",{ascending:false}).order("submitted_at",{ascending:true}).limit(limit),
        adminClient.from("weekly_power_ranking").select("user_id",{count:"exact",head:true}).eq("week_start",weekStart),
      ]);
      if (error) throw error;
      if (activeError) throw activeError;
      const profiles=await profileRows((ranks??[]).map((row:any)=>row.user_id)); const byId=new Map(profiles.map((row:any)=>[row.user_id,row]));
      const ranking=(ranks??[]).map((row:any,index:number)=>({rank:index+1,...row,...(byId.get(row.user_id)||{})}));
      return json(req,{ok:true,requestId,week_start:weekStart,active_players:Number(activePlayers||0),ranking});
    }

    if (action === "reward_catalog") {
      const { data, error } = await adminClient
        .from("reward_catalog")
        .select("resource_id,category,label_hu,label_en,max_amount,sort_order,metadata")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return json(req, {
        ok: true,
        requestId,
        resources: (data ?? []).map((row: any) => ({
          id: row.resource_id,
          category: row.category,
          label_hu: row.label_hu,
          label_en: row.label_en,
          max_amount: row.max_amount,
          sort_order: row.sort_order,
          metadata: row.metadata ?? {},
        })),
      });
    }

    if (action === "list_mail") {
      const now = new Date();
      const { data: messages, error: messageError } = await adminClient
        .from("mail_messages")
        .select("id,audience_type,target_user_id,audience_cutoff_at,title_hu,title_en,body_hu,body_en,attachments,starts_at,expires_at,created_at")
        .eq("active", true)
        .lte("starts_at", now.toISOString())
        .order("created_at", { ascending: false })
        .limit(200);
      if (messageError) throw messageError;

      const available = (messages ?? []).filter((message: any) => {
        const accountCreatedAt = new Date(user.created_at ?? 0).getTime();
        const audienceCutoff = new Date(message.audience_cutoff_at ?? message.created_at ?? 0).getTime();
        const audienceMatches = message.audience_type === "all_future" ||
          (message.audience_type === "existing" && accountCreatedAt <= audienceCutoff) ||
          (message.audience_type === "user" && message.target_user_id === user.id);
        const notExpired = !message.expires_at || new Date(message.expires_at).getTime() > now.getTime();
        return audienceMatches && notExpired;
      });

      if (available.length) {
        const recipients = available.map((message: any) => ({ mail_id: message.id, user_id: user.id }));
        const { error } = await adminClient
          .from("mail_recipients")
          .upsert(recipients, { onConflict: "mail_id,user_id", ignoreDuplicates: true });
        if (error) throw error;
      }

      const statusMap = new Map<string, any>();
      if (available.length) {
        const { data: statuses, error } = await adminClient
          .from("mail_recipients")
          .select("mail_id,delivered_at,read_at,claimed_at")
          .eq("user_id", user.id)
          .in("mail_id", available.map((message: any) => message.id));
        if (error) throw error;
        for (const status of statuses ?? []) statusMap.set(status.mail_id, status);
      }

      const result = available.map((message: any) => {
        const status = statusMap.get(message.id) ?? {};
        const attachments = isObject(message.attachments) && Object.keys(message.attachments).length
          ? message.attachments
          : null;
        return {
          id: message.id,
          title_hu: message.title_hu,
          title_en: message.title_en,
          body_hu: message.body_hu,
          body_en: message.body_en,
          attachments,
          starts_at: message.starts_at,
          expires_at: message.expires_at,
          created_at: message.created_at,
          delivered_at: status.delivered_at ?? null,
          read: !!status.read_at,
          claimed: !!status.claimed_at,
        };
      });

      return json(req, { ok: true, requestId, messages: result });
    }

    if (action === "mark_mail_read") {
      if (!isUuid(body.mail_id)) throw new Error("invalid_mail_id");
      const { error: upsertError } = await adminClient
        .from("mail_recipients")
        .upsert({ mail_id: body.mail_id, user_id: user.id }, { onConflict: "mail_id,user_id" });
      if (upsertError) throw upsertError;
      const { error } = await adminClient
        .from("mail_recipients")
        .update({ read_at: new Date().toISOString() })
        .eq("mail_id", body.mail_id)
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
      return json(req, { ok: true, requestId });
    }

    if (action === "claim_mail") {
      if (!isUuid(body.mail_id)) throw new Error("invalid_mail_id");
      const { data, error } = await adminClient.rpc("player_claim_mail", {
        p_user_id: user.id,
        p_mail_id: body.mail_id,
        p_request_id: requestId,
      });
      if (error) throw error;
      return json(req, { ok: true, requestId, result: data });
    }

    if (action === "redeem") {
      const normalized = normalizeCode(body.code);
      if (normalized.length < 8 || normalized.length > 64) throw new Error("invalid_redeem_code");
      const hash = await sha256(normalized);
      const { data, error } = await adminClient.rpc("player_redeem_code", {
        p_user_id: user.id,
        p_code_hash: hash,
        p_request_id: requestId,
      });
      if (error) throw error;
      return json(req, { ok: true, requestId, result: data });
    }

    throw new Error("unknown_action");
  } catch (error) {
    const code = errorCode(error);
    console.error(`[CHERRIFT player-api v1.1] Request failed [${requestId}]`, error);
    const status = code === "invalid_auth_token" || code === "missing_auth_token" ? 401 : 400;
    return json(req, { error: code, requestId }, status);
  }
});
