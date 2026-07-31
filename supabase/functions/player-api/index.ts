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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const requestId = crypto.randomUUID();
  try {
    const user = await authenticatedUser(req);
    const body = await req.json().catch(() => ({}));
    if (!isObject(body)) throw new Error("invalid_json_body");
    const action = typeof body.action === "string" ? body.action : "";

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
        .select("id,audience_type,target_user_id,title_hu,title_en,body_hu,body_en,attachments,starts_at,expires_at,created_at")
        .eq("active", true)
        .lte("starts_at", now.toISOString())
        .order("created_at", { ascending: false })
        .limit(200);
      if (messageError) throw messageError;

      const available = (messages ?? []).filter((message: any) => {
        const audienceMatches = message.audience_type === "all" || message.target_user_id === user.id;
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
