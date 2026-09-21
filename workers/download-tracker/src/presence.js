/**
 * Concurrent human page-viewer presence on azielcorpuslibrary.net.
 * Operator lock 2026-09-21: Live Nodes includes current website viewers.
 * Packed KV only (no KV.list). Bots / prefetch / API do not inflate.
 * Prefer runtime GET /v1/mesh once it aggregates page viewers — never double-count.
 * NO-LIE: zero is honest; undercount beats invent. Author: Aziel Eliab only.
 */
import { classifyRequest } from "./classify.js";
import { HOST, RUNTIME_ORIGIN } from "./runtime-copy.js";
import {
  isSeoBot,
  newVisitorId,
  readVisitorCookie,
  visitorCookieHeader,
} from "./rate-limit.js";

export const AUTHOR = "Aziel Eliab";
export const PRESENCE_SPEC = "OPERATOR-LOCK-2026-09-21";
export const PRESENCE_KEY = "presence|page-viewers:v1";
export const PRESENCE_TTL_MS = 5 * 60 * 1000;
export const PRESENCE_CAP = 256;
export const PRESENCE_PATH = "/v1/presence";
export const PAGE_VIEWERS_PLANE = "human-page-viewers";
export const SITE_PRESENCE_HOST = "azielcorpuslibrary.net";
export const SITE_PRESENCE_KIND = "human-page";
export const SITE_PRESENCE_PATH = "/v1/mesh/site-presence";
export const SITE_PRESENCE_ALIAS = "/v1/mesh/site-heartbeat";
const SITE_PRESENCE_UA = "Mozilla/5.0 AzielDigitalLibrary";

const API_PREFIXES = Object.freeze([
  "/v1/",
  "/runtime/v1/",
  "/api/",
  "/mcp",
  "/.well-known/",
]);

const ASSET_PREFIXES = Object.freeze([
  "/assets/",
  "/file/",
  "/media/",
  "/derived/",
  "/spectral-samples/",
  "/download",
  "/sigil.png",
  "/favicon.ico",
  "/jeeves-kat-williams.gif",
  "/map-client.js",
  "/ocr-fallback.js",
  "/transcribe-client.js",
]);

const MACHINE_EXACT = Object.freeze([
  "/robots.txt",
  "/sitemap.xml",
  "/sitemap-index.xml",
  "/sitemap-records.xml",
  "/llms.txt",
  "/ai.txt",
  "/humans.txt",
  "/cite.json",
  "/lockset.json",
  "/bridge.json",
  "/openapi.json",
  "/mcp.json",
  "/person.jsonld",
  "/identity.jsonld",
  "/graph.jsonld",
  "/who-is-aziel-eliab.txt",
  "/who-is",
  "/count",
  "/stats",
  "/event",
  "/go",
  "/install.sh",
  "/health",
  "/v1/health",
  "/v1/mesh",
  "/v1/mesh/status",
  "/v1/mesh/nodes",
]);

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Aziel-Operator-Token",
  };
}

function finiteCount(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function presencePathOnly(pathname) {
  return String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
}

export function isPresencePath(pathname) {
  return presencePathOnly(pathname) === PRESENCE_PATH;
}

export function isPrefetchRequest(request) {
  if (!request || !request.headers) return false;
  const purpose = String(request.headers.get("Sec-Purpose") || request.headers.get("Purpose") || "");
  return /prefetch|preview/i.test(purpose);
}

export function isMachinePath(pathname) {
  const path = presencePathOnly(pathname);
  if (MACHINE_EXACT.includes(path)) return true;
  if (path.startsWith("/v1/mesh/")) return true;
  if (path.startsWith("/runtime/v1/mesh")) return true;
  for (const prefix of API_PREFIXES) {
    if (prefix === "/mcp") {
      if (path === "/mcp" || path.startsWith("/mcp/")) return true;
      continue;
    }
    if (path.startsWith(prefix)) return true;
  }
  for (const prefix of ASSET_PREFIXES) {
    if (path === prefix.replace(/\/+$/, "") || path.startsWith(prefix)) return true;
  }
  if (/\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|map|txt|xml|json|jsonld)$/i.test(path)) return true;
  return false;
}

/** HTML chrome / record pages. Presence heartbeat is allowed even on /v1/presence. */
export function isHtmlViewerPath(pathname) {
  const path = presencePathOnly(pathname);
  if (isPresencePath(path)) return true;
  return !isMachinePath(path);
}

export function isHumanPageViewer(request, pathname) {
  if (!request) return { ok: false, reason: "missing_request" };
  const method = String(request.method || "GET").toUpperCase();
  if (method === "HEAD" || method === "OPTIONS") return { ok: false, reason: "method" };
  if (method !== "GET" && method !== "POST") return { ok: false, reason: "method" };
  if (isPrefetchRequest(request)) return { ok: false, reason: "prefetch" };
  if (isSeoBot(request)) return { ok: false, reason: "seo_bot" };
  const cls = classifyRequest(request);
  if (cls.bucket !== "human") return { ok: false, reason: cls.reason || "bot", classification: cls };
  const path = pathname || (request.url ? new URL(request.url).pathname : "/");
  if (!isHtmlViewerPath(path) && !isPresencePath(path)) {
    return { ok: false, reason: "machine_path", classification: cls };
  }
  return { ok: true, reason: "human", classification: cls };
}

export function emptyPresenceDoc(nowMs = Date.now()) {
  return {
    spec: PRESENCE_SPEC,
    host: HOST.replace(/^https:\/\//, ""),
    viewers: {},
    count: 0,
    ts: new Date(nowMs).toISOString(),
    ttl_ms: PRESENCE_TTL_MS,
    complete: true,
    invent_users: false,
    bot_inflation: false,
    author: AUTHOR,
    identity: AUTHOR,
    plane: PAGE_VIEWERS_PLANE,
    note:
      "Concurrent human page viewers on azielcorpuslibrary.net. "
      + "TTL " + (PRESENCE_TTL_MS / 1000) + "s. Bots, prefetch, and machine routes do not count. "
      + "Not unique people across history. Zero is honest. Author Aziel Eliab only.",
  };
}

export function prunePresenceDoc(doc, nowMs = Date.now()) {
  const src = doc && typeof doc === "object" ? doc : emptyPresenceDoc(nowMs);
  const viewers = src.viewers && typeof src.viewers === "object" && !Array.isArray(src.viewers)
    ? src.viewers
    : {};
  const kept = {};
  for (const [id, exp] of Object.entries(viewers)) {
    const until = Number(exp);
    if (id && Number.isFinite(until) && until > nowMs) kept[id] = until;
  }
  const ids = Object.keys(kept);
  if (ids.length > PRESENCE_CAP) {
    ids.sort((a, b) => kept[a] - kept[b]);
    for (const id of ids.slice(0, ids.length - PRESENCE_CAP)) delete kept[id];
  }
  const count = Object.keys(kept).length;
  return {
    ...emptyPresenceDoc(nowMs),
    ...src,
    viewers: kept,
    count,
    ts: new Date(nowMs).toISOString(),
    complete: true,
    invent_users: false,
    bot_inflation: false,
    author: AUTHOR,
    identity: AUTHOR,
  };
}

async function readPackedPresence(env) {
  const kv = env && env.DOWNLOADS;
  if (!kv || typeof kv.get !== "function") return emptyPresenceDoc();
  try {
    const raw = await kv.get(PRESENCE_KEY);
    if (!raw) return emptyPresenceDoc();
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : emptyPresenceDoc();
  } catch {
    return emptyPresenceDoc();
  }
}

async function writePackedPresence(env, doc) {
  const kv = env && env.DOWNLOADS;
  if (!kv || typeof kv.put !== "function") return doc;
  await kv.put(PRESENCE_KEY, JSON.stringify(doc));
  return doc;
}

export async function readPageViewers(env, nowMs = Date.now()) {
  const pruned = prunePresenceDoc(await readPackedPresence(env), nowMs);
  return {
    page_viewers: pruned.count,
    count: pruned.count,
    complete: pruned.complete === true,
    invent_users: false,
    bot_inflation: false,
    spec: PRESENCE_SPEC,
    plane: PAGE_VIEWERS_PLANE,
    ttl_ms: PRESENCE_TTL_MS,
    ts: pruned.ts,
    source: "library-presence",
    host: pruned.host,
    author: AUTHOR,
    identity: AUTHOR,
  };
}

export function presenceIdFrom(request) {
  const cookie = readVisitorCookie(request);
  if (cookie && /^[A-Za-z0-9._-]{8,128}$/.test(cookie)) return { id: cookie, minted: false };
  return { id: newVisitorId(), minted: true };
}

/** Sync cookie mint so the HTML response can Set-Cookie before the KV write. */
export function prepareViewerCookie(request, path) {
  const dest = path || (request && request.url ? new URL(request.url).pathname : "/");
  const gate = isHumanPageViewer(request, dest);
  if (!gate.ok) {
    return { counted: false, reason: gate.reason, id: "", setCookie: "" };
  }
  const { id, minted } = presenceIdFrom(request);
  return {
    counted: true,
    reason: gate.reason,
    id,
    setCookie: minted ? visitorCookieHeader(id) : "",
  };
}

export async function commitPreparedViewer(env, prepared, nowMs = Date.now()) {
  if (!prepared || !prepared.counted || !prepared.id) {
    return { ok: true, counted: false, reason: prepared && prepared.reason, page_viewers: 0 };
  }
  let doc = prunePresenceDoc(await readPackedPresence(env), nowMs);
  doc.viewers[prepared.id] = nowMs + PRESENCE_TTL_MS;
  doc = prunePresenceDoc(doc, nowMs);
  await writePackedPresence(env, doc);
  const published = scheduleSitePresence(env, doc.count);
  return {
    ok: true,
    counted: true,
    reason: prepared.reason,
    page_viewers: doc.count,
    count: doc.count,
    setCookie: prepared.setCookie || "",
    published,
    author: AUTHOR,
  };
}

export async function touchPageViewer(env, request, { path, nowMs, op } = {}) {
  const when = nowMs != null ? nowMs : Date.now();
  const dest = path || (request && request.url ? new URL(request.url).pathname : "/");
  const gate = isHumanPageViewer(request, dest);
  if (!gate.ok) {
    return {
      ok: true,
      counted: false,
      reason: gate.reason,
      page_viewers: (await readPageViewers(env, when)).page_viewers,
      invent_users: false,
      bot_inflation: false,
      author: AUTHOR,
    };
  }
  const { id, minted } = presenceIdFrom(request);
  const action = String(op || "").toLowerCase() === "leave" ? "leave" : "touch";
  let doc = prunePresenceDoc(await readPackedPresence(env), when);
  if (action === "leave") {
    if (doc.viewers[id]) delete doc.viewers[id];
  } else {
    doc.viewers[id] = when + PRESENCE_TTL_MS;
  }
  doc = prunePresenceDoc(doc, when);
  await writePackedPresence(env, doc);
  const published = scheduleSitePresence(env, doc.count);
  return {
    ok: true,
    counted: action === "touch",
    op: action,
    reason: gate.reason,
    page_viewers: doc.count,
    count: doc.count,
    complete: true,
    invent_users: false,
    bot_inflation: false,
    spec: PRESENCE_SPEC,
    plane: PAGE_VIEWERS_PLANE,
    ttl_ms: PRESENCE_TTL_MS,
    ts: doc.ts,
    source: "library-presence",
    setCookie: minted ? visitorCookieHeader(id) : "",
    published,
    author: AUTHOR,
    identity: AUTHOR,
  };
}

export function attachPresenceCookie(res, touch) {
  if (!res || !touch || !touch.setCookie) return res;
  const headers = new Headers(res.headers);
  if (!headers.has("Set-Cookie")) headers.append("Set-Cookie", touch.setCookie);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export async function noteHtmlPageViewer(env, request, ctx, path) {
  const dest = path || (request && request.url ? new URL(request.url).pathname : "/");
  if (!isHtmlViewerPath(dest) || isPresencePath(dest)) {
    return { counted: false, reason: "not_html_page" };
  }
  const job = touchPageViewer(env, request, { path: dest });
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(job.catch(() => null));
    return { scheduled: true };
  }
  return job;
}

export function runtimeAggregatesPageViewers(doc) {
  if (!doc || typeof doc !== "object") return false;
  if (doc.page_viewers_source === "library-presence") return false;
  const c = doc.live_nodes_components && typeof doc.live_nodes_components === "object"
    ? doc.live_nodes_components
    : {};
  if (c.page_viewers_source === "library-presence") return false;
  if (doc.includes_site_viewers === true || doc.includes_page_viewers === true) return true;
  if (Number.isFinite(Number(doc.site_live_viewers))) return true;
  const hosts = doc.site_live_viewers_components && typeof doc.site_live_viewers_components === "object"
    ? doc.site_live_viewers_components
    : {};
  if (Number.isFinite(Number(hosts[SITE_PRESENCE_HOST]))) return true;
  if (doc.page_viewers_source === "runtime" || doc.website_viewers_source === "runtime") return true;
  if (Number.isFinite(Number(c.page_viewers)) || Number.isFinite(Number(c.website_viewers)) || Number.isFinite(Number(c.human_page_viewers)) || Number.isFinite(Number(c.site_live_viewers))) return true;
  if (Number.isFinite(Number(doc.website_viewers)) || Number.isFinite(Number(doc.human_page_viewers))) return true;
  if (Number.isFinite(Number(doc.page_viewers))) return true;
  const plane = String(doc.live_nodes_plane || "");
  return /page-viewer|website-viewer|site-viewer/.test(plane) && doc.page_viewers_source !== "library-presence";
}

/** Fail-closed body for runtime aziel-runtime#154. Null = do not invent. */
export function sitePresenceBody(viewers) {
  if (typeof viewers === "boolean") return null;
  if (typeof viewers === "string" && !/^\d+$/.test(viewers.trim())) return null;
  const n = typeof viewers === "number" ? viewers : Number(viewers);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return {
    host: SITE_PRESENCE_HOST,
    viewers: n,
    kind: SITE_PRESENCE_KIND,
  };
}

/** Best-effort POST to runtime SSoT. Binding first, then origin. Never invent. Never throw. */
export async function publishSitePresence(env, viewers) {
  const body = sitePresenceBody(viewers);
  if (!body) {
    return { ok: false, published: false, reason: "invalid_viewers", invent_users: false };
  }
  const dest = RUNTIME_ORIGIN + SITE_PRESENCE_PATH;
  const init = {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": SITE_PRESENCE_UA,
    },
    body: JSON.stringify(body),
  };
  try {
    if (env && env.AZIEL_RUNTIME && typeof env.AZIEL_RUNTIME.fetch === "function") {
      const bound = await env.AZIEL_RUNTIME.fetch(new Request(dest, init));
      if (bound) {
        return {
          ok: bound.ok === true,
          published: bound.ok === true,
          status: bound.status,
          via: "binding",
          host: body.host,
          viewers: body.viewers,
          kind: body.kind,
        };
      }
    }
  } catch {
    /* fall through to origin */
  }
  try {
    const res = await fetch(dest, init);
    return {
      ok: res.ok === true,
      published: res.ok === true,
      status: res.status,
      via: "origin",
      host: body.host,
      viewers: body.viewers,
      kind: body.kind,
    };
  } catch {
    return { ok: false, published: false, reason: "unreachable", invent_users: false, host: body.host };
  }
}

function scheduleSitePresence(env, viewers) {
  return publishSitePresence(env, viewers).catch(() => ({ ok: false, published: false, reason: "unreachable" }));
}

function pageViewerCountFrom(doc, local) {
  if (local && typeof local === "object") {
    const n = finiteCount(local.page_viewers != null ? local.page_viewers : local.count);
    if (n != null) return n;
  }
  if (!doc || typeof doc !== "object") return 0;
  const c = doc.live_nodes_components && typeof doc.live_nodes_components === "object"
    ? doc.live_nodes_components
    : {};
  return (
    finiteCount(doc.page_viewers)
    ?? finiteCount(doc.human_page_viewers)
    ?? finiteCount(doc.website_viewers)
    ?? finiteCount(c.page_viewers)
    ?? finiteCount(c.human_page_viewers)
    ?? 0
  );
}

function meshPresenceCount(doc) {
  if (!doc || typeof doc !== "object") return 0;
  const users = finiteCount(doc.human_mesh_users);
  if (users != null) return users;
  const plane = String(doc.live_nodes_plane || "");
  if (plane === "human-mesh-users") {
    return finiteCount(doc.live_nodes) || 0;
  }
  return 0;
}

/**
 * Live Nodes = mesh presence + current page viewers.
 * If runtime already aggregates viewers, use runtime live_nodes (no local add).
 * Never add human_uses (that is Nodes, not Live Nodes). Never software_nodes.
 */
export function mergeLiveNodes(doc, local) {
  const src = doc && typeof doc === "object" ? doc : {};
  if (runtimeAggregatesPageViewers(src)) {
    const viewers = pageViewerCountFrom(src, null);
    const live = finiteCount(src.live_nodes);
    return {
      live_nodes: live != null ? live : meshPresenceCount(src) + viewers,
      page_viewers: viewers,
      human_page_viewers: viewers,
      aggregated: true,
      double_count: false,
    };
  }
  const viewers = pageViewerCountFrom(src, local);
  const presence = meshPresenceCount(src);
  return {
    live_nodes: presence + viewers,
    page_viewers: viewers,
    human_page_viewers: viewers,
    aggregated: false,
    double_count: false,
  };
}

export function presenceNote() {
  return (
    "Operator lock 2026-09-21: Live Nodes includes current human page viewers on azielcorpuslibrary.net "
    + "plus mesh presence (human_mesh_users) via GET /v1/mesh SSoT. Prefer runtime /v1/mesh once it "
    + "aggregates page viewers — do not add library viewers on top. Bots do not count. Uses stay on Nodes. "
    + "NO-LIE: zero is honest. Author Aziel Eliab only."
  );
}

function presenceJson(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(),
    },
  });
}

export async function handlePresenceApi(request, url, env) {
  const path = presencePathOnly(url && url.pathname);
  if (!isPresencePath(path)) return null;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method === "HEAD") {
    const res = presenceJson({ ok: true, author: AUTHOR });
    return new Response(null, { status: res.status, headers: res.headers });
  }
  if (request.method === "GET") {
    const local = await readPageViewers(env);
    return presenceJson({
      ok: true,
      ...local,
      note: presenceNote(),
    });
  }
  if (request.method !== "POST") {
    return presenceJson({
      ok: false,
      error: "method",
      hint: "GET or POST /v1/presence",
      author: AUTHOR,
    }, 405);
  }
  let op = "touch";
  try {
    const text = await request.text();
    if (text) {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") op = String(parsed.op || parsed.action || "touch");
    }
  } catch {
    /* empty / non-JSON body is a touch */
  }
  const touch = await touchPageViewer(env, request, { path, op });
  const res = presenceJson({
    ok: true,
    counted: touch.counted === true,
    reason: touch.reason,
    page_viewers: touch.page_viewers,
    op: touch.op || op,
    spec: PRESENCE_SPEC,
    plane: PAGE_VIEWERS_PLANE,
    ttl_ms: PRESENCE_TTL_MS,
    invent_users: false,
    bot_inflation: false,
    note: presenceNote(),
    author: AUTHOR,
    identity: AUTHOR,
  });
  return attachPresenceCookie(res, touch);
}
