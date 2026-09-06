/**
 * Local API use tracker for the Digital Library /runtime door.
 * Reuses DOWNLOADS KV with runtime_uses| prefix. Does not touch download totals.
 * Author: Aziel Eliab only.
 */
import { corsHeaders } from "./runtime.js";
import { HOST, RUNTIME_ORIGIN } from "./runtime-copy.js";

export const RUNTIME_VIA = "azielcorpuslibrary.net";
export const RUNTIME_USES_HOST = "www.azielcorpuslibrary.net";
export const RUNTIME_USES_PREFIX = "runtime_uses|";
export const RUNTIME_USES_TOTAL = RUNTIME_USES_PREFIX + "total";
export const RUNTIME_USES_RECENT = RUNTIME_USES_PREFIX + "recent";
export const RUNTIME_USES_PATH_PREFIX = RUNTIME_USES_PREFIX + "path|";
export const RUNTIME_USES_RECENT_CAP = 32;
export const AUTHOR = "Aziel Eliab";

const UA = "Mozilla/5.0 AzielDigitalLibrary";

const SEO_STATIC = new Set([
  "/runtime",
  "/runtime/llms.txt",
  "/runtime/ai.txt",
  "/runtime/cite.json",
  "/runtime/robots.txt",
  "/runtime/humans.txt",
  "/runtime/sitemap.xml",
  "/runtime/sitemap-index.xml",
  "/runtime/sigil.png",
  "/runtime/glama.json",
]);

export function normalizeRuntimePath(pathname) {
  const raw = String(pathname || "").split("?")[0];
  const trimmed = raw.replace(/\/+$/, "") || "/";
  return trimmed;
}

export function isRuntimeSeoStatic(pathname) {
  return SEO_STATIC.has(normalizeRuntimePath(pathname));
}

export function shouldCountRuntimeUse(method, pathname) {
  const m = String(method || "GET").toUpperCase();
  if (m === "OPTIONS" || m === "HEAD") return false;
  const path = normalizeRuntimePath(pathname);
  if (path === "/runtime/v1/uses") return false;
  if (isRuntimeSeoStatic(path)) return false;
  if (m === "GET" && (path === "/runtime/v1/health" || path === "/runtime/v1/ready")) return false;
  if (path.startsWith("/runtime/v1/fraggate")) return true;
  if (path === "/runtime/mcp" || path.startsWith("/runtime/mcp/")) return true;
  if (path.startsWith("/runtime/v1/session")) return true;
  if (path.startsWith("/runtime/v1/pull")) return true;
  if (path.startsWith("/runtime/v1/")) return true;
  return false;
}

function downloadsKv(env) {
  return env && env.DOWNLOADS && typeof env.DOWNLOADS.get === "function" && typeof env.DOWNLOADS.put === "function"
    ? env.DOWNLOADS
    : null;
}

async function readInt(kv, key) {
  const n = parseInt((await kv.get(key)) || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function readJson(kv, key, fallback) {
  try {
    const raw = await kv.get(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

export async function recordRuntimeUse(env, { method, path } = {}) {
  const kv = downloadsKv(env);
  if (!kv) return null;
  const libraryPath = normalizeRuntimePath(path);
  const verb = String(method || "GET").toUpperCase();
  try {
    const total = (await readInt(kv, RUNTIME_USES_TOTAL)) + 1;
    await kv.put(RUNTIME_USES_TOTAL, String(total));
    const pathKey = RUNTIME_USES_PATH_PREFIX + libraryPath;
    const pathCount = (await readInt(kv, pathKey)) + 1;
    await kv.put(pathKey, String(pathCount));
    const recentRaw = await readJson(kv, RUNTIME_USES_RECENT, []);
    const recent = Array.isArray(recentRaw) ? recentRaw : [];
    recent.unshift({
      at: new Date().toISOString(),
      method: verb,
      path: libraryPath,
    });
    await kv.put(RUNTIME_USES_RECENT, JSON.stringify(recent.slice(0, RUNTIME_USES_RECENT_CAP)));
    return { uses: total, path: libraryPath, path_count: pathCount };
  } catch {
    return null;
  }
}

export async function noteRuntimeUse(env, ctx, method, path) {
  if (!shouldCountRuntimeUse(method, path)) return;
  const work = recordRuntimeUse(env, { method, path });
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(work.catch(() => null));
    return;
  }
  await work.catch(() => null);
}

async function listPathCounts(kv) {
  const byPath = {};
  if (!kv || typeof kv.list !== "function") return byPath;
  let cursor;
  do {
    const page = await kv.list(cursor ? { prefix: RUNTIME_USES_PATH_PREFIX, cursor } : { prefix: RUNTIME_USES_PATH_PREFIX });
    const keys = page && Array.isArray(page.keys) ? page.keys : [];
    for (const item of keys) {
      const name = item && item.name ? item.name : "";
      if (!name.startsWith(RUNTIME_USES_PATH_PREFIX)) continue;
      const path = name.slice(RUNTIME_USES_PATH_PREFIX.length);
      if (!path) continue;
      byPath[path] = await readInt(kv, name);
    }
    cursor = page && page.list_complete ? undefined : page && page.cursor;
  } while (cursor);
  return byPath;
}

async function fetchOriginUses(env) {
  const dest = RUNTIME_ORIGIN + "/v1/uses";
  const headers = { "User-Agent": UA, Accept: "application/json" };
  try {
    let res;
    if (env && env.AZIEL_RUNTIME && typeof env.AZIEL_RUNTIME.fetch === "function") {
      res = await env.AZIEL_RUNTIME.fetch(new Request(dest, { headers }));
    } else {
      res = await fetch(dest, { headers });
    }
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

export async function runtimeUsesPayload(env) {
  const kv = downloadsKv(env);
  const uses = kv ? await readInt(kv, RUNTIME_USES_TOTAL) : 0;
  const by_path = kv ? await listPathCounts(kv) : {};
  const recentRaw = kv ? await readJson(kv, RUNTIME_USES_RECENT, []) : [];
  const recent = Array.isArray(recentRaw) ? recentRaw.slice(0, RUNTIME_USES_RECENT_CAP) : [];
  const origin = await fetchOriginUses(env);
  return {
    ok: true,
    host: RUNTIME_USES_HOST,
    via: RUNTIME_VIA,
    uses,
    by_path,
    recent,
    author: AUTHOR,
    origin,
  };
}

export function runtimeUsesResponse(body) {
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(),
      "X-Aziel-Runtime-Via": RUNTIME_VIA,
      "X-Aziel-Runtime-Root": HOST + "/runtime",
    },
  });
}
