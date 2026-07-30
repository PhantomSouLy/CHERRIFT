import { createClient } from "npm:@supabase/supabase-js@2";

type JsonObject = Record<string, unknown>;

type AdminRow = {
  role: "owner" | "admin" | "support";
  permissions: string[];
  active: boolean;
};

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

if (!SUPABASE_URL || !PUBLIC_KEY || !SERVICE_KEY) {
  console.error("[CHERRIFT gm-api] Missing Supabase environment variables.");
}

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

function boundedInteger(value: unknown, min: number, max: number, fallback = 0): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return fallback;
  return number;
}

function optionalIso(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("invalid_datetime");
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("invalid_datetime");
  return date.toISOString();
}

function uniqueStrings(value: unknown, maxItems: number, maxLength = 80): string[] {
  if (!Array.isArray(value)) throw new Error("invalid_string_array");
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") throw new Error("invalid_string_array");
    const text = item.trim();
    if (!text || text.length > maxLength) throw new Error("invalid_string_array");
    if (!seen.has(text)) {
      seen.add(text);
      result.push(text);
    }
    if (result.length > maxItems) throw new Error("too_many_items");
  }
  return result;
}

function normalizeReward(value: unknown): JsonObject {
  const source = isObject(value) ? value : {};
  const reward: JsonObject = {};
  const coins = boundedInteger(source.coins, 0, 1_000_000_000, 0);
  const keys = boundedInteger(source.keys, 0, 1_000_000, 0);
  if (coins > 0) reward.coins = coins;
  if (keys > 0) reward.keys = keys;
  if (source.skins !== undefined) {
    const skins = uniqueStrings(source.skins, 100);
    if (skins.length) reward.skins = skins;
  }
  return reward;
}

function normalizeProfilePatch(value: unknown): JsonObject {
  if (!isObject(value)) throw new Error("invalid_profile_patch");
  const allowed = new Set([
    "coins", "keys", "selectedSkin", "unlockedSkins",
    "inventory", "equipped", "selectedStageId", "unlockedStages",
  ]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`profile_field_not_allowed:${key}`);
  }

  const patch: JsonObject = {};
  if ("coins" in value) {
    const coins = Number(value.coins);
    if (!Number.isInteger(coins) || coins < 0 || coins > 1_000_000_000) throw new Error("invalid_profile_coins");
    patch.coins = coins;
  }
  if ("keys" in value) {
    const keys = Number(value.keys);
    if (!Number.isInteger(keys) || keys < 0 || keys > 1_000_000) throw new Error("invalid_profile_keys");
    patch.keys = keys;
  }
  for (const key of ["selectedSkin", "selectedStageId"] as const) {
    if (key in value) {
      if (typeof value[key] !== "string" || !value[key].trim() || value[key].length > 80) {
        throw new Error(`invalid_${key}`);
      }
      patch[key] = value[key].trim();
    }
  }
  if ("unlockedSkins" in value) patch.unlockedSkins = uniqueStrings(value.unlockedSkins, 200);
  if ("unlockedStages" in value) patch.unlockedStages = uniqueStrings(value.unlockedStages, 200);
  if ("inventory" in value) {
    if (!Array.isArray(value.inventory) || value.inventory.length > 500) throw new Error("invalid_inventory");
    patch.inventory = value.inventory;
  }
  if ("equipped" in value) {
    if (!isObject(value.equipped)) throw new Error("invalid_equipped");
    patch.equipped = value.equipped;
  }
  if (!Object.keys(patch).length) throw new Error("empty_profile_patch");
  return patch;
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function generateRedeemCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let token = "";
  for (const byte of bytes) token += alphabet[byte % alphabet.length];
  return `CHERRY-${token.slice(0, 4)}-${token.slice(4, 8)}-${token.slice(8, 12)}`;
}

function accountView(user: any): JsonObject {
  const metadata = user?.user_metadata ?? {};
  const discord = Array.isArray(user?.identities)
    ? user.identities.find((identity: any) => identity?.provider === "discord")?.identity_data ?? {}
    : {};
  return {
    id: user?.id ?? "",
    discordId: discord.provider_id ?? discord.sub ?? metadata.provider_id ?? "",
    name: metadata.full_name ?? metadata.global_name ?? metadata.name ?? discord.full_name ?? discord.name ?? "Discord Player",
    username: metadata.user_name ?? metadata.preferred_username ?? discord.user_name ?? discord.preferred_username ?? "",
    avatar: metadata.avatar_url ?? metadata.picture ?? discord.avatar_url ?? discord.picture ?? "",
    email: user?.email ?? "",
    createdAt: user?.created_at ?? null,
    lastSignInAt: user?.last_sign_in_at ?? null,
  };
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

async function loadAdmin(userId: string): Promise<AdminRow | null> {
  const { data, error } = await adminClient
    .from("gm_admins")
    .select("role,permissions,active")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.active) return null;
  return data as AdminRow;
}

function hasPermission(admin: AdminRow, permission: string): boolean {
  if (admin.role === "owner") return true;
  return admin.permissions?.includes(permission) === true;
}

async function recordFailure(
  userId: string | null,
  action: string,
  targetUserId: string | null,
  requestId: string,
  status: "denied" | "failed",
  errorCode: string,
  metadata: JsonObject = {},
): Promise<void> {
  try {
    await adminClient.from("gm_audit_logs").insert({
      admin_user_id: userId,
      action,
      target_user_id: targetUserId,
      request_id: requestId,
      status,
      error_code: errorCode.slice(0, 200),
      metadata,
    });
  } catch (error) {
    console.error("[CHERRIFT gm-api] Audit failure:", error);
  }
}

async function playerSearch(query: string): Promise<JsonObject[]> {
  const normalized = query.trim().toLowerCase();
  let users: any[] = [];

  if (isUuid(normalized)) {
    const { data, error } = await adminClient.auth.admin.getUserById(normalized);
    if (error && error.status !== 404) throw error;
    if (data?.user) users = [data.user];
  } else {
    const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    users = data.users ?? [];
    if (normalized) {
      users = users.filter((user) => {
        const account = accountView(user);
        return [account.id, account.discordId, account.name, account.username, account.email]
          .some((field) => String(field ?? "").toLowerCase().includes(normalized));
      });
    }
  }

  users = users.slice(0, 40);
  const ids = users.map((user) => user.id).filter(Boolean);
  const saveMap = new Map<string, any>();
  if (ids.length) {
    const { data, error } = await adminClient
      .from("game_saves")
      .select("user_id,save_data,save_version,updated_at")
      .in("user_id", ids);
    if (error) throw error;
    for (const row of data ?? []) saveMap.set(row.user_id, row);
  }

  return users.map((user) => {
    const account = accountView(user);
    const row = saveMap.get(user.id);
    const save = isObject(row?.save_data) ? row.save_data : {};
    return {
      ...account,
      hasSave: !!row,
      saveVersion: row?.save_version ?? null,
      saveUpdatedAt: row?.updated_at ?? null,
      coins: Number(save.coins) || 0,
      keys: Number(save.keys) || 0,
      selectedSkin: typeof save.selectedSkin === "string" ? save.selectedSkin : "",
      selectedStageId: typeof save.selectedStageId === "string" ? save.selectedStageId : "",
    };
  });
}

function publicError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error ?? "unknown_error");
  return text.slice(0, 300);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const requestId = crypto.randomUUID();
  let user: any = null;
  let action = "unknown";
  let targetUserId: string | null = null;

  try {
    user = await authenticatedUser(req);
    const body = await req.json().catch(() => ({}));
    if (!isObject(body)) throw new Error("invalid_json_body");
    action = typeof body.action === "string" ? body.action : "";
    targetUserId = isUuid(body.target_user_id) ? body.target_user_id : null;

    const admin = await loadAdmin(user.id);
    if (!admin) {
      await recordFailure(user.id, action || "gm.access", targetUserId, requestId, "denied", "not_an_active_gm");
      return json(req, {
        error: "not_an_active_gm",
        userId: user.id,
        account: accountView(user),
        requestId,
      }, 403);
    }

    if (action === "me") {
      return json(req, { ok: true, requestId, account: accountView(user), admin });
    }

    if (action === "search_players") {
      if (!hasPermission(admin, "profile.view")) throw new Error("permission_denied:profile.view");
      const query = typeof body.query === "string" ? body.query.slice(0, 160) : "";
      return json(req, { ok: true, requestId, players: await playerSearch(query) });
    }

    if (action === "get_profile") {
      if (!hasPermission(admin, "profile.view")) throw new Error("permission_denied:profile.view");
      if (!targetUserId) throw new Error("invalid_target_user_id");
      const [{ data: userData, error: userError }, { data: save, error: saveError }] = await Promise.all([
        adminClient.auth.admin.getUserById(targetUserId),
        adminClient.from("game_saves").select("user_id,save_data,save_version,created_at,updated_at").eq("user_id", targetUserId).maybeSingle(),
      ]);
      if (userError || !userData.user) throw userError ?? new Error("player_not_found");
      if (saveError) throw saveError;
      return json(req, {
        ok: true,
        requestId,
        profile: {
          account: accountView(userData.user),
          save: save ?? {
            user_id: targetUserId,
            save_data: {},
            save_version: "0.6.3-cloud.1",
            created_at: null,
            updated_at: null,
          },
        },
      });
    }

    if (action === "update_profile") {
      if (!hasPermission(admin, "profile.edit")) throw new Error("permission_denied:profile.edit");
      if (!targetUserId) throw new Error("invalid_target_user_id");
      const patch = normalizeProfilePatch(body.patch);
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (reason.length < 3 || reason.length > 500) throw new Error("invalid_change_reason");
      const { data, error } = await adminClient.rpc("gm_apply_profile_patch", {
        p_admin_user_id: user.id,
        p_target_user_id: targetUserId,
        p_patch: patch,
        p_reason: reason,
        p_request_id: requestId,
      });
      if (error) throw error;
      return json(req, { ok: true, requestId, result: data });
    }

    if (action === "send_mail") {
      const audience = body.audience_type === "all" ? "all" : "user";
      const requiredPermission = audience === "all" ? "mail.broadcast" : "mail.send";
      if (!hasPermission(admin, requiredPermission)) throw new Error(`permission_denied:${requiredPermission}`);
      const target = audience === "user" && isUuid(body.target_user_id) ? body.target_user_id : null;
      targetUserId = target;
      if (audience === "user" && !target) throw new Error("invalid_target_user_id");
      const titleHu = typeof body.title_hu === "string" ? body.title_hu.trim() : "";
      const titleEn = typeof body.title_en === "string" ? body.title_en.trim() : "";
      const bodyHu = typeof body.body_hu === "string" ? body.body_hu.trim() : "";
      const bodyEn = typeof body.body_en === "string" ? body.body_en.trim() : "";
      if (!titleHu || titleHu.length > 120 || !bodyHu || bodyHu.length > 4000) throw new Error("invalid_mail_content");
      const attachments = normalizeReward(body.attachments);
      const startsAt = optionalIso(body.starts_at) ?? new Date().toISOString();
      const expiresAt = optionalIso(body.expires_at);
      if (expiresAt && new Date(expiresAt) <= new Date(startsAt)) throw new Error("invalid_mail_expiry");
      const { data, error } = await adminClient.rpc("gm_create_mail", {
        p_admin_user_id: user.id,
        p_audience_type: audience,
        p_target_user_id: target,
        p_title_hu: titleHu,
        p_title_en: titleEn || titleHu,
        p_body_hu: bodyHu,
        p_body_en: bodyEn || bodyHu,
        p_attachments: attachments,
        p_starts_at: startsAt,
        p_expires_at: expiresAt,
        p_request_id: requestId,
      });
      if (error) throw error;
      return json(req, { ok: true, requestId, result: data });
    }

    if (action === "create_redeem") {
      if (!hasPermission(admin, "redeem.create")) throw new Error("permission_denied:redeem.create");
      const rewards = normalizeReward(body.rewards);
      if (!Object.keys(rewards).length) throw new Error("empty_redeem_reward");
      const maxRedemptions = boundedInteger(body.max_redemptions, 1, 1_000_000, 1);
      const perUserLimit = boundedInteger(body.per_user_limit, 1, 100, 1);
      if (perUserLimit > maxRedemptions) throw new Error("per_user_limit_too_high");
      const startsAt = optionalIso(body.starts_at) ?? new Date().toISOString();
      const expiresAt = optionalIso(body.expires_at);
      if (expiresAt && new Date(expiresAt) <= new Date(startsAt)) throw new Error("invalid_redeem_expiry");
      const rawCode = generateRedeemCode();
      const normalized = normalizeCode(rawCode);
      const codeHash = await sha256(normalized);
      const codePrefix = rawCode.split("-").slice(0, 2).join("-");
      const { data, error } = await adminClient.rpc("gm_create_redeem_code", {
        p_admin_user_id: user.id,
        p_code_hash: codeHash,
        p_code_prefix: codePrefix,
        p_rewards: rewards,
        p_max_redemptions: maxRedemptions,
        p_per_user_limit: perUserLimit,
        p_starts_at: startsAt,
        p_expires_at: expiresAt,
        p_request_id: requestId,
      });
      if (error) throw error;
      return json(req, { ok: true, requestId, code: rawCode, result: data });
    }

    if (action === "recent_mail") {
      if (!hasPermission(admin, "mail.send")) throw new Error("permission_denied:mail.send");
      const { data, error } = await adminClient
        .from("mail_messages")
        .select("id,audience_type,target_user_id,title_hu,attachments,starts_at,expires_at,active,created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return json(req, { ok: true, requestId, messages: data ?? [] });
    }

    if (action === "recent_redeems") {
      if (!hasPermission(admin, "redeem.create")) throw new Error("permission_denied:redeem.create");
      const { data, error } = await adminClient
        .from("redeem_codes")
        .select("id,code_prefix,rewards,max_redemptions,total_redemptions,per_user_limit,starts_at,expires_at,active,created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return json(req, { ok: true, requestId, codes: data ?? [] });
    }

    if (action === "recent_activity") {
      if (!hasPermission(admin, "audit.view")) throw new Error("permission_denied:audit.view");
      const { data, error } = await adminClient
        .from("gm_audit_logs")
        .select("id,admin_user_id,action,target_user_id,request_id,status,error_code,metadata,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return json(req, { ok: true, requestId, activity: data ?? [] });
    }

    throw new Error("unknown_action");
  } catch (error) {
    const errorCode = publicError(error);
    const denied = errorCode.includes("permission_denied") || errorCode.includes("gm_permission_denied");
    if (user?.id) {
      await recordFailure(user.id, action || "unknown", targetUserId, requestId, denied ? "denied" : "failed", errorCode);
    }
    console.error(`[CHERRIFT gm-api] ${action} failed [${requestId}]`, error);
    return json(req, { error: errorCode, requestId }, denied ? 403 : 400);
  }
});
