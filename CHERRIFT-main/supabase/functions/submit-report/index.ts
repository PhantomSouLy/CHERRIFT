const MAX_FILES = 3;
const MAX_FILE_BYTES = 6 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 18 * 1024 * 1024;
const MAX_TITLE = 120;
const MAX_MESSAGE = 6000;
const RATE_LIMIT_MS = 45_000;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const recentRequests = new Map<string, number>();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function clean(value: FormDataEntryValue | null, max: number): string {
  if (typeof value !== "string") return "";
  return value.replaceAll("\u0000", "").trim().slice(0, max);
}

function parseJson(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function stringifyField(value: unknown, fallback = "—"): string {
  const text = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  return text.trim().slice(0, 900) || fallback;
}

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || "unknown";
}

function enforceRateLimit(request: Request): Response | null {
  const key = clientKey(request);
  const now = Date.now();
  const previous = recentRequests.get(key) || 0;
  if (now - previous < RATE_LIMIT_MS) {
    return json({ error: "Please wait before sending another report." }, 429);
  }
  recentRequests.set(key, now);
  if (recentRequests.size > 1000) {
    for (const [entry, timestamp] of recentRequests) {
      if (now - timestamp > RATE_LIMIT_MS * 3) recentRequests.delete(entry);
    }
  }
  return null;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const limited = enforceRateLimit(request);
  if (limited) return limited;

  try {
    const form = await request.formData();
    const type = clean(form.get("type"), 20) === "bug" ? "bug" : "feedback";
    const title = clean(form.get("title"), MAX_TITLE);
    const message = clean(form.get("message"), MAX_MESSAGE);
    const area = clean(form.get("area"), 80) || "other";
    const severity = clean(form.get("severity"), 80) || "medium";
    const diagnostics = parseJson(clean(form.get("diagnostics"), 8000));
    const reporter = parseJson(clean(form.get("reporter"), 3000));

    if (!title || !message) return json({ error: "Title and description are required." }, 400);

    const webhook = Deno.env.get(type === "bug" ? "DISCORD_BUG_REPORT_WEBHOOK" : "DISCORD_FEEDBACK_WEBHOOK");
    if (!webhook) return json({ error: "Discord webhook secret is not configured." }, 503);

    const files: File[] = [];
    let totalBytes = 0;
    for (const [, value] of form.entries()) {
      if (!(value instanceof File) || !value.size) continue;
      if (files.length >= MAX_FILES) return json({ error: `Maximum ${MAX_FILES} images are allowed.` }, 400);
      if (!ALLOWED_IMAGE_TYPES.has(value.type)) return json({ error: "Only PNG, JPG and WEBP images are allowed." }, 400);
      if (value.size > MAX_FILE_BYTES) return json({ error: "An image exceeds the 6 MB limit." }, 400);
      totalBytes += value.size;
      if (totalBytes > MAX_TOTAL_FILE_BYTES) return json({ error: "Attached images exceed the total size limit." }, 400);
      files.push(value);
    }

    const isHungarian = diagnostics.language !== "en";
    const labels = type === "bug"
      ? { heading: "🐛 Új hibajelentés", description: "Hiba leírása", area: "Érintett terület", severity: "Súlyosság" }
      : { heading: "💬 Új visszajelzés", description: "Üzenet", area: "Kategória", severity: "Típus" };
    const labelsEn = type === "bug"
      ? { heading: "🐛 New bug report", description: "Bug description", area: "Area", severity: "Severity" }
      : { heading: "💬 New feedback", description: "Message", area: "Category", severity: "Type" };
    const copy = isHungarian ? labels : labelsEn;

    const reporterName = stringifyField(reporter.name || reporter.username || reporter.mode, "Guest");
    const embed = {
      title: `${copy.heading}: ${title}`.slice(0, 256),
      description: message.slice(0, 4000),
      color: type === "bug" ? 0xff4f8f : 0xe85b9c,
      fields: [
        { name: copy.area, value: area, inline: true },
        ...(type === "bug" ? [{ name: copy.severity, value: severity, inline: true }] : []),
        { name: isHungarian ? "Beküldő" : "Reporter", value: reporterName, inline: true },
        { name: isHungarian ? "Verzió" : "Version", value: stringifyField(diagnostics.version), inline: true },
        { name: isHungarian ? "Kijelző" : "Viewport", value: stringifyField(diagnostics.viewport), inline: true },
        { name: isHungarian ? "Skin / Pálya" : "Skin / Stage", value: `${stringifyField(diagnostics.selectedSkin)} / ${stringifyField(diagnostics.selectedStage)}`.slice(0, 1024), inline: true },
      ],
      footer: { text: "CHERRIFT in-game report" },
      timestamp: new Date().toISOString(),
    };

    const payload = {
      username: type === "bug" ? "CHERRIFT Bug Report" : "CHERRIFT Feedback",
      allowed_mentions: { parse: [] },
      embeds: [embed],
    };

    const discordBody = new FormData();
    discordBody.append("payload_json", JSON.stringify(payload));
    files.forEach((file, index) => discordBody.append(`files[${index}]`, file, file.name.slice(0, 120)));

    const discordResponse = await fetch(webhook, { method: "POST", body: discordBody });
    if (!discordResponse.ok) {
      const detail = (await discordResponse.text()).slice(0, 500);
      console.error("Discord webhook failed:", discordResponse.status, detail);
      return json({ error: "Discord delivery failed." }, 502);
    }

    return json({ ok: true, type, files: files.length });
  } catch (error) {
    console.error("submit-report failed:", error);
    return json({ error: "Unexpected report delivery error." }, 500);
  }
});
