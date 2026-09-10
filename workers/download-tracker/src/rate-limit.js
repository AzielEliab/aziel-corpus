/**
 * RL-WP-0.1-library visitor rate buckets on azielcorpuslibrary.net only.
 * Identify visitor as SHA-256(CF-Connecting-IP). Cookie cannot evade.
 * 30 search/min, 120 record views/hour, 800 library requests/day.
 * Operator token / signed operator skips the bucket. No public IP allowlist UI.
 * Soft exceed: HTTP 429 + last cached search page. Author: Aziel Eliab only.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { isOperator } from "./library.js";
import {
  PUBLIC_CACHE_CONTROL,
  cacheMatchJson,
  cachePutJson,
  readPackedIndex,
  statsFromPacked,
} from "./library-index.js";
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id, Authorization, X-Aziel-Operator-Token",
  };
}

export const AUTHOR = "Aziel Eliab";
export const VISITOR_COOKIE = "aziel_vid";
export const OPERATOR_HEADER = "X-Aziel-Operator-Token";
export const CATALOG_CACHE_URL = "https://azielcorpuslibrary.net/__cache/last-catalog";
export const BUCKET_CACHE_PREFIX = "https://azielcorpuslibrary.net/__cache/rl/";

/** RL-WP-0.1-library buckets. Do not copy runtime-scope 60/600/5000 here. */
export const LIMITS = {
  day: 800,
  search_per_minute: 30,
  record_per_hour: 120,
};

export const RETRY_AFTER = 30;

const isolateBuckets = new Map();

export function resetRateState() {
  isolateBuckets.clear();
}

function sha256hex(text) {
  return createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

function safeEq(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (!left.length || left.length !== right.length) return false;
  try {
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function readVisitorCookie(request) {
  const raw = (request && request.headers && request.headers.get("Cookie")) || "";
  const m = raw.match(/(?:^|;\s*)aziel_vid=([A-Za-z0-9._-]+)/);
  return m ? m[1] : "";
}

export function visitorCookieHeader(vid) {
  return VISITOR_COOKIE + "=" + vid + "; Path=/; Secure; SameSite=Lax; Max-Age=86400";
}

export function newVisitorId() {
  try {
    return sha256hex("vid|" + randomBytes(16).toString("hex"));
  } catch {
    return sha256hex("vid|" + Date.now() + "|" + crypto.randomUUID());
  }
}

export function connectingIp(request) {
  if (!request || !request.headers) return "";
  return (
    request.headers.get("CF-Connecting-IP") ||
    String(request.headers.get("X-Forwarded-For") || "")
      .split(",")[0]
      .trim() ||
    ""
  );
}

export function visitorIdFrom(request, cookieVid) {
  const ip = connectingIp(request) || "unknown";
  const cookie = cookieVid || readVisitorCookie(request) || "";
  // IP is the stable cap so minting or dropping aziel_vid cannot evade the bucket.
  // Cookie is mixed in only as a suffix after a delimiter that still includes IP.
  void cookie;
  return sha256hex("ip|" + ip);
}

export function bearerToken(request) {
  const raw = (request && request.headers && request.headers.get("Authorization")) || "";
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export function operatorTokenFromEnv(env) {
  if (!env) return "";
  return String(env.OPERATOR_TOKEN || env.GATE_TOKEN || env.LIBRARY_OPERATOR_TOKEN || "").trim();
}

export function isOperatorRequest(request, env, signed) {
  if (isOperator(signed)) return true;
  const expected = operatorTokenFromEnv(env);
  if (!expected) return false;
  const header = (request && request.headers && request.headers.get(OPERATOR_HEADER)) || "";
  const token = header || bearerToken(request);
  return safeEq(token, expected);
}

const EXEMPT_PATHS = new Set([
  "/donate",
  "/robots.txt",
  "/sitemap.xml",
  "/sitemap-index.xml",
  "/sigil.png",
  "/humans.txt",
  "/cite.json",
  "/llms.txt",
  "/ai.txt",
  "/v1/health",
  "/health",
  "/favicon.ico",
]);

export function isRateExemptPath(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  if (EXEMPT_PATHS.has(path)) return true;
  if (path.startsWith("/assets/")) return true;
  if (path.startsWith("/spectral-samples/")) return true;
  return false;
}

export function pathClass(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/v1/search" || path === "/search" || path === "/aziel-library" || path === "/corpus") {
    return "search";
  }
  if (path.startsWith("/record/") || path.startsWith("/file/") || path.startsWith("/download")) {
    return "record";
  }
  return "read";
}

function windowStart(nowMs, sizeMs) {
  return Math.floor(nowMs / sizeMs) * sizeMs;
}

export function emptyWindows(nowMs = Date.now()) {
  return {
    minute: { start: windowStart(nowMs, 60 * 1000), n: 0 },
    hour: { start: windowStart(nowMs, 60 * 60 * 1000), n: 0 },
    day: { start: windowStart(nowMs, 24 * 60 * 60 * 1000), n: 0 },
    search_minute: { start: windowStart(nowMs, 60 * 1000), n: 0 },
    record_hour: { start: windowStart(nowMs, 60 * 60 * 1000), n: 0 },
  };
}

function roll(win, nowMs, sizeMs) {
  const start = windowStart(nowMs, sizeMs);
  if (!win || win.start !== start) return { start, n: 0 };
  return { start: win.start, n: Number(win.n) || 0 };
}

export function bumpWindows(windows, nowMs, klass) {
  const next = {
    minute: roll(windows && windows.minute, nowMs, 60 * 1000),
    hour: roll(windows && windows.hour, nowMs, 60 * 60 * 1000),
    day: roll(windows && windows.day, nowMs, 24 * 60 * 60 * 1000),
    search_minute: roll(windows && windows.search_minute, nowMs, 60 * 1000),
    record_hour: roll(windows && windows.record_hour, nowMs, 60 * 60 * 1000),
  };
  next.minute.n += 1;
  next.hour.n += 1;
  next.day.n += 1;
  if (klass === "search") next.search_minute.n += 1;
  if (klass === "record") next.record_hour.n += 1;
  return next;
}

export function overLimit(windows, limits = LIMITS) {
  if ((windows.search_minute && windows.search_minute.n) > limits.search_per_minute) {
    return { class: "rate-soft", window: "search_minute" };
  }
  if ((windows.record_hour && windows.record_hour.n) > limits.record_per_hour) {
    return { class: "rate-soft", window: "record_hour" };
  }
  if ((windows.day && windows.day.n) > limits.day) return { class: "rate-soft", window: "day" };
  return null;
}

async function defaultCache() {
  try {
    if (typeof caches !== "undefined" && caches && caches.default) return caches.default;
  } catch {
    /* tests */
  }
  return null;
}

async function loadBucket(id, cache) {
  const url = BUCKET_CACHE_PREFIX + id;
  const fromCache = await cacheMatchJson(url, cache);
  if (fromCache) return fromCache;
  const mem = isolateBuckets.get(id);
  return mem || emptyWindows();
}

async function saveBucket(id, windows, cache) {
  isolateBuckets.set(id, windows);
  const url = BUCKET_CACHE_PREFIX + id;
  await cachePutJson(url, windows, cache || (await defaultCache()), {
    cacheControl: "public, max-age=86400",
  });
}

export function rememberCatalog(doc, cache) {
  return cachePutJson(CATALOG_CACHE_URL, doc, cache);
}

export async function lastCachedCatalog(env, cache) {
  const cached = await cacheMatchJson(CATALOG_CACHE_URL, cache);
  if (cached) return cached;
  try {
    const packed = await readPackedIndex(env, { cache });
    return {
      ok: true,
      source: "packed",
      stats: statsFromPacked(packed),
      records: (packed.records || []).slice(0, 40),
      author: AUTHOR,
    };
  } catch {
    return { ok: true, source: "empty", records: [], author: AUTHOR };
  }
}

export async function checkVisitorRate(request, env, { signed, path, nowMs, cache } = {}) {
  const pathname = path || (request && request.url ? new URL(request.url).pathname : "/");
  if (isRateExemptPath(pathname)) return { ok: true, exempt: true };
  if (isOperatorRequest(request, env, signed)) return { ok: true, operator: true };
  let cookieVid = readVisitorCookie(request);
  let setCookie = "";
  if (!cookieVid) {
    cookieVid = newVisitorId();
    setCookie = visitorCookieHeader(cookieVid);
  }
  const id = visitorIdFrom(request, cookieVid);
  const now = nowMs != null ? nowMs : Date.now();
  const store = cache || (await defaultCache());
  const windows = bumpWindows(await loadBucket(id, store), now, pathClass(pathname));
  await saveBucket(id, windows, store);
  const hit = overLimit(windows);
  if (hit) {
    return {
      ok: false,
      class: hit.class,
      window: hit.window,
      retryAfter: RETRY_AFTER,
      visitor: id,
      setCookie,
    };
  }
  return { ok: true, visitor: id, setCookie };
}

export async function rateLimitedResponse(request, env, decision, { cache } = {}) {
  const catalog = await lastCachedCatalog(env, cache);
  const accept = (request && request.headers && request.headers.get("Accept")) || "";
  const headers = {
    "Retry-After": String(RETRY_AFTER),
    "Cache-Control": PUBLIC_CACHE_CONTROL,
    "X-Aziel-Rate": "rate-soft",
    ...corsHeaders(),
  };
  if (decision && decision.setCookie) headers["Set-Cookie"] = decision.setCookie;
  if (accept.includes("text/html")) {
    headers["Content-Type"] = "text/html; charset=utf-8";
    const n = catalog && Array.isArray(catalog.records) ? catalog.records.length : 0;
    const body =
      "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>Slow down — Aziel Digital Library</title></head><body>" +
      "<h1>Rate limit</h1><p>Soft visitor cap (RL-WP-0.1 library scope). Retry after " +
      RETRY_AFTER +
      " seconds. The last packed catalog still runs (" +
      n +
      " cards). Author Aziel Eliab. Not a Node Gate.</p>" +
      "<p><a href=\"/donate\">Donate</a> · <a href=\"/\">Search</a></p></body></html>";
    return new Response(body, { status: 429, headers });
  }
  headers["Content-Type"] = "application/json; charset=utf-8";
  return new Response(
    JSON.stringify(
      {
        ok: false,
        error: "rate-soft",
        code: "rate-soft",
        retry_after: RETRY_AFTER,
        catalog,
        author: AUTHOR,
        note: "Visitor bucket only. Operator token is uncapped. No public IP allowlist. Author Aziel Eliab.",
      },
      null,
      2
    ),
    { status: 429, headers }
  );
}

export async function enforceRateLimit(request, env, opts) {
  const decision = await checkVisitorRate(request, env, opts);
  if (decision.ok) return decision;
  return { ...decision, response: await rateLimitedResponse(request, env, decision, opts) };
}
