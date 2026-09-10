/**
 * TUN-WP-0.1 / RL-WP-0.1 packed library index.
 * Hot path: one KV get of library:index:v1 (+ Cache API). Never KV.list().
 * Worker is the standby catalog of truth for public AZDOC cards.
 * Author: Aziel Eliab only. Not a VPN. Not a Node Gate.
 */
import { createHash } from "node:crypto";

export const LIBRARY_INDEX_KEY = "library:index:v1";
export const KV_CACHE_TTL = 3600;
export const MAX_HOT_KV_OPS = 8;
export const PUBLIC_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=3600";
/** RL-WP-0.1-library: search / public HTML share this TTL so crawlers and humans hit one cache. */
export const SEARCH_CACHE_CONTROL = "public, s-maxage=120, stale-while-revalidate=3600";
export const HTML_CACHE_CONTROL = SEARCH_CACHE_CONTROL;
export const SEO_CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";
export const AUTHOR = "Aziel Eliab";
export const INDEX_CACHE_URL = "https://azielcorpuslibrary.net/__cache/library-index-v1";
export const HTML_CACHE_PREFIX = "https://azielcorpuslibrary.net/__cache/html";

const PROJECT = "aziel-corpus";

function sha256hex(text) {
  return createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

export function emptyPackedIndex(extra = {}) {
  return {
    version: 1,
    key: LIBRARY_INDEX_KEY,
    ts: extra.ts || new Date().toISOString(),
    index_sha256: extra.index_sha256 || "",
    project: PROJECT,
    author: AUTHOR,
    views: 0,
    downloads: 0,
    by_repo: {},
    by_branch: {},
    by_fork: { "0": 0, "1": 0 },
    breakdown: [],
    github: { stars: 0, forks: 0, watchers: 0, release_download_count: 0, fetched_at: 0 },
    records: [],
    kv_list_hot_path: false,
    note: "Packed shelf + counters. No PDF bodies. Hot path does not KV.list(). Author Aziel Eliab.",
    ...extra,
  };
}

export function sealPackedIndex(doc) {
  const next = Object.assign(emptyPackedIndex(), doc || {});
  next.key = LIBRARY_INDEX_KEY;
  next.version = 1;
  next.author = AUTHOR;
  next.kv_list_hot_path = false;
  next.ts = next.ts || new Date().toISOString();
  const copy = Object.assign({}, next);
  copy.index_sha256 = "";
  next.index_sha256 = sha256hex(stableStringify(copy));
  return next;
}

function stableStringify(value) {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map((v) => stableStringify(v)).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") + "}";
}

export function downloadsKv(env) {
  return env && env.DOWNLOADS && typeof env.DOWNLOADS.get === "function" ? env.DOWNLOADS : null;
}

export function createKvBudget(kv, { maxOps = MAX_HOT_KV_OPS, allowList = false } = {}) {
  const stats = { gets: 0, puts: 0, lists: 0, ops: 0, truncated: false };
  const bump = () => {
    stats.ops = stats.gets + stats.puts + stats.lists;
    if (stats.ops > maxOps) stats.truncated = true;
    return stats.truncated;
  };
  return {
    stats,
    allowList,
    async get(key, opts) {
      stats.gets += 1;
      if (bump()) return null;
      if (!kv || typeof kv.get !== "function") return null;
      return kv.get(key, opts);
    },
    async put(key, value, opts) {
      stats.puts += 1;
      if (bump()) return;
      if (!kv || typeof kv.put !== "function") return;
      return kv.put(key, value, opts);
    },
    async list(query) {
      stats.lists += 1;
      bump();
      if (!allowList) {
        const err = new Error("KV.list is not allowed on the library hot path");
        err.code = "kv-cap";
        throw err;
      }
      return kv.list(query);
    },
  };
}

async function defaultCache() {
  try {
    if (typeof caches !== "undefined" && caches && caches.default) return caches.default;
  } catch {
    /* node tests */
  }
  return null;
}

export async function cacheMatchJson(url, cache) {
  const store = cache || (await defaultCache());
  if (!store || typeof store.match !== "function") return null;
  try {
    const hit = await store.match(new Request(url, { method: "GET" }));
    if (!hit) return null;
    return await hit.json();
  } catch {
    return null;
  }
}

export function htmlCacheUrl(request) {
  try {
    const u = new URL(request && request.url ? request.url : String(request || "/"));
    return HTML_CACHE_PREFIX + u.pathname + u.search;
  } catch {
    return HTML_CACHE_PREFIX + "/";
  }
}

export async function cacheMatchText(url, cache) {
  const store = cache || (await defaultCache());
  if (!store || typeof store.match !== "function") return null;
  try {
    const hit = await store.match(new Request(url, { method: "GET" }));
    if (!hit) return null;
    return await hit.text();
  } catch {
    return null;
  }
}

export async function cachePutText(url, body, cache, { cacheControl = HTML_CACHE_CONTROL, contentType = "text/html; charset=utf-8" } = {}) {
  const store = cache || (await defaultCache());
  if (!store || typeof store.put !== "function") return false;
  try {
    await store.put(
      new Request(url, { method: "GET" }),
      new Response(String(body || ""), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": cacheControl,
        },
      })
    );
    return true;
  } catch {
    return false;
  }
}

export async function cachePutJson(url, doc, cache, { cacheControl = PUBLIC_CACHE_CONTROL } = {}) {
  const store = cache || (await defaultCache());
  if (!store || typeof store.put !== "function") return false;
  try {
    await store.put(
      new Request(url, { method: "GET" }),
      new Response(JSON.stringify(doc), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": cacheControl,
        },
      })
    );
    return true;
  } catch {
    return false;
  }
}

function parseIndex(raw) {
  if (!raw) return null;
  try {
    const doc = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!doc || typeof doc !== "object") return null;
    return sealPackedIndex(doc);
  } catch {
    return null;
  }
}

/** Hot-path read. One KV get. Never list(). */
export async function readPackedIndex(env, { cache, cacheTtl = KV_CACHE_TTL } = {}) {
  const cached = await cacheMatchJson(INDEX_CACHE_URL, cache);
  if (cached && cached.key === LIBRARY_INDEX_KEY) return sealPackedIndex(cached);
  const kv = downloadsKv(env);
  if (!kv) return emptyPackedIndex({ ts: new Date().toISOString() });
  let raw = null;
  try {
    raw = await kv.get(LIBRARY_INDEX_KEY, { cacheTtl });
  } catch {
    raw = await kv.get(LIBRARY_INDEX_KEY);
  }
  const doc = parseIndex(raw) || emptyPackedIndex({ ts: new Date().toISOString() });
  if (doc.index_sha256) await cachePutJson(INDEX_CACHE_URL, doc, cache);
  return doc;
}

export function statsFromPacked(doc) {
  const packed = sealPackedIndex(doc || {});
  return {
    project: PROJECT,
    views: Number(packed.views) || 0,
    downloads: Number(packed.downloads) || 0,
    total: Number(packed.downloads) || 0,
    by_repo: packed.by_repo || {},
    by_branch: packed.by_branch || {},
    by_fork: packed.by_fork || { "0": 0, "1": 0 },
    breakdown: Array.isArray(packed.breakdown) ? packed.breakdown : [],
    github: packed.github || { stars: 0, forks: 0, watchers: 0, release_download_count: 0 },
    index_sha256: packed.index_sha256,
    index_ts: packed.ts,
    kv_list_hot_path: false,
    note: "Forks identified by GitHub owner/repo. Packed key " + LIBRARY_INDEX_KEY + ". Views are separate from downloads. /v1 does not increment. Hot path does not KV.list().",
  };
}

/** Hot-path stats. Replaces KV.list() + per-key walk. */
export async function collectStats(env, opts) {
  const packed = await readPackedIndex(env, opts);
  return statsFromPacked(packed);
}

export function shelfOf(row) {
  const raw = String((row && (row.shelf || row.library)) || "corpus").toLowerCase();
  return raw === "aziel" ? "aziel" : "corpus";
}

export function cardFromRecord(row) {
  if (!row || typeof row !== "object") return null;
  const id = String(row.record_id || row.id || "").trim();
  if (!id) return null;
  const shelf = shelfOf(row);
  const updated = String(row.updated || row.updated_utc || row.ts || row.created_utc || "");
  return {
    id,
    record_id: id,
    title: String(row.title || id),
    shelf,
    library: shelf,
    author: String(row.author || ""),
    content_sha256: String(row.content_sha256 || ""),
    chain_tip: String(row.chain_tip || ""),
    updated,
    ts: updated,
    created_utc: String(row.created_utc || updated),
    domain: String(row.domain || ""),
    subjects: String(row.subjects || ""),
    keywords: String(row.keywords || ""),
    filename: String(row.filename || ""),
    href: "/record/" + id,
  };
}

/** Public /v1/search card. AZDOC id, title, shelf, content_sha256, chain_tip, updated. No PDF body. */
export function publicSearchCard(row) {
  const card = cardFromRecord(row);
  if (!card) return null;
  return {
    id: card.id,
    record_id: card.record_id,
    title: card.title,
    shelf: card.shelf,
    library: card.library,
    content_sha256: card.content_sha256,
    chain_tip: card.chain_tip,
    updated: card.updated,
    ts: card.ts,
    created_utc: card.created_utc,
    author: card.author,
    domain: card.domain,
    subjects: card.subjects,
    keywords: card.keywords,
    filename: card.filename,
    href: card.href,
  };
}

export async function loadShelfCards(env, { limit = 500 } = {}) {
  if (!env || !env.DB || typeof env.DB.prepare !== "function") return [];
  const lim = Math.min(Math.max(Number(limit) || 500, 1), 500);
  const sql =
    "SELECT record_id, title, author, library, content_sha256, chain_tip, created_utc, domain, subjects, keywords, filename FROM records WHERE IFNULL(shelf_hidden,0) = 0 ORDER BY created_utc DESC LIMIT ?";
  try {
    const rows = (await env.DB.prepare(sql).bind(lim).all()).results || [];
    return rows.map(cardFromRecord).filter(Boolean);
  } catch {
    try {
      const fallback =
        "SELECT record_id, title, author, library, content_sha256, created_utc, domain, subjects, keywords, filename FROM records ORDER BY created_utc DESC LIMIT ?";
      const rows = (await env.DB.prepare(fallback).bind(lim).all()).results || [];
      return rows.map(cardFromRecord).filter(Boolean);
    } catch {
      return [];
    }
  }
}

export function searchPackedRecords(doc, { q, library, sort, author, domain, subject, keyword, limit } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const query = String(q || "").trim().toLowerCase();
  const lib = String(library || "all").toLowerCase();
  const authorF = String(author || "").trim().toLowerCase();
  const domainF = String(domain || "").trim().toLowerCase();
  const subjectF = String(subject || "").trim().toLowerCase();
  const keywordF = String(keyword || "").trim().toLowerCase();
  let rows = Array.isArray(doc && doc.records) ? doc.records.slice() : [];
  if (lib === "aziel" || lib === "corpus") {
    rows = rows.filter((r) => shelfOf(r) === lib);
  }
  if (query) {
    rows = rows.filter((r) => {
      const blob = [r.title, r.author, r.filename, r.domain, r.subjects, r.keywords, r.record_id]
        .join(" ")
        .toLowerCase();
      return blob.includes(query);
    });
  }
  if (authorF) rows = rows.filter((r) => String(r.author || "").toLowerCase().includes(authorF));
  if (domainF) rows = rows.filter((r) => String(r.domain || "").toLowerCase().includes(domainF));
  if (subjectF) rows = rows.filter((r) => String(r.subjects || "").toLowerCase().includes(subjectF));
  if (keywordF) rows = rows.filter((r) => String(r.keywords || "").toLowerCase().includes(keywordF));
  const key = String(sort || "newest").toLowerCase();
  rows.sort((a, b) => {
    if (key === "oldest") return String(a.created_utc || "").localeCompare(String(b.created_utc || ""));
    if (key === "alpha" || key === "title") return String(a.title || "").localeCompare(String(b.title || ""), "en", { sensitivity: "base" });
    if (key === "author") return String(a.author || "").localeCompare(String(b.author || ""), "en", { sensitivity: "base" });
    if (key === "domain") return String(a.domain || "").localeCompare(String(b.domain || ""), "en", { sensitivity: "base" });
    return String(b.created_utc || "").localeCompare(String(a.created_utc || ""));
  });
  return rows.slice(0, lim);
}

function viewsKey() {
  return PROJECT + "|__views__";
}
function totalKey() {
  return PROJECT + "|__total__";
}
function githubCacheKey() {
  return PROJECT + "|__github__";
}

async function readInt(kv, key) {
  if (!kv) return 0;
  const n = parseInt((await kv.get(key)) || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function readGithub(kv) {
  if (!kv) return { stars: 0, forks: 0, watchers: 0, release_download_count: 0, fetched_at: 0 };
  try {
    const raw = await kv.get(githubCacheKey());
    if (!raw) return { stars: 0, forks: 0, watchers: 0, release_download_count: 0, fetched_at: 0 };
    const obj = JSON.parse(raw);
    return {
      stars: Number(obj.stars) || 0,
      forks: Number(obj.forks) || 0,
      watchers: Number(obj.watchers) || 0,
      release_download_count: Number(obj.release_download_count) || 0,
      fetched_at: Number(obj.fetched_at) || 0,
    };
  } catch {
    return { stars: 0, forks: 0, watchers: 0, release_download_count: 0, fetched_at: 0 };
  }
}

export async function writePackedIndex(env, doc, { cache } = {}) {
  const kv = downloadsKv(env);
  const sealed = sealPackedIndex(Object.assign({}, doc, { ts: new Date().toISOString() }));
  if (kv && typeof kv.put === "function") {
    await kv.put(LIBRARY_INDEX_KEY, JSON.stringify(sealed));
  }
  await cachePutJson(INDEX_CACHE_URL, sealed, cache);
  return sealed;
}

export async function patchPackedStats(env, patch, { cache } = {}) {
  const current = await readPackedIndex(env, { cache, cacheTtl: 60 });
  const next = Object.assign({}, current, patch || {});
  if (patch && patch.github) next.github = Object.assign({}, current.github || {}, patch.github);
  if (patch && Array.isArray(patch.records)) next.records = patch.records;
  if (patch && patch.breakdown) next.breakdown = patch.breakdown;
  return writePackedIndex(env, next, { cache });
}

function upsertBreakdown(list, dims, count) {
  const rows = Array.isArray(list) ? list.slice() : [];
  const owner = String((dims && dims.owner) || "");
  const repo = String((dims && dims.repo) || "");
  const branch = String((dims && dims.branch) || "");
  const fork = String((dims && dims.fork) || "0") === "1" ? "1" : "0";
  const i = rows.findIndex(
    (r) => r && r.owner === owner && r.repo === repo && r.branch === branch && String(r.fork) === fork
  );
  const row = { project: PROJECT, owner, repo, branch, fork, count: Number(count) || 0 };
  if (i >= 0) rows[i] = row;
  else rows.push(row);
  const by_repo = {};
  const by_branch = {};
  const by_fork = { "0": 0, "1": 0 };
  for (const r of rows) {
    const repoId = `${r.owner}/${r.repo}`;
    by_repo[repoId] = (by_repo[repoId] || 0) + (Number(r.count) || 0);
    by_branch[r.branch] = (by_branch[r.branch] || 0) + (Number(r.count) || 0);
    const f = String(r.fork) === "1" ? "1" : "0";
    by_fork[f] = (by_fork[f] || 0) + (Number(r.count) || 0);
  }
  return { breakdown: rows, by_repo, by_branch, by_fork };
}

export async function notePackedIncrement(env, { views, downloads, dims, count } = {}, opts) {
  const patch = {};
  if (views != null) patch.views = Number(views) || 0;
  if (downloads != null) patch.downloads = Number(downloads) || 0;
  if (dims && count != null) {
    const current = await readPackedIndex(env, opts);
    Object.assign(patch, upsertBreakdown(current.breakdown, dims, count));
    if (patch.views == null) patch.views = current.views;
    if (patch.downloads == null) patch.downloads = downloads != null ? downloads : current.downloads;
    return writePackedIndex(env, Object.assign({}, current, patch), opts);
  }
  return patchPackedStats(env, patch, opts);
}

/** Cron / ingest / operator refresh. D1 + known counter keys. No KV.list(). */
export async function refreshPackedIndex(env, { cache, github } = {}) {
  const kv = downloadsKv(env);
  const current = await readPackedIndex(env, { cache, cacheTtl: 60 });
  const records = await loadShelfCards(env);
  const views = kv ? await readInt(kv, viewsKey()) : Number(current.views) || 0;
  const downloads = kv ? await readInt(kv, totalKey()) : Number(current.downloads) || 0;
  const gh = github || (kv ? await readGithub(kv) : current.github);
  return writePackedIndex(
    env,
    Object.assign({}, current, {
      records,
      views,
      downloads,
      github: gh,
    }),
    { cache }
  );
}

export function libraryHealthFields(packed, env) {
  const doc = packed || emptyPackedIndex();
  return {
    role: "standby",
    topology: "tunnel-primary",
    failover_ready: true,
    index_key: LIBRARY_INDEX_KEY,
    index_sha256: doc.index_sha256 || "",
    ts: doc.ts || new Date().toISOString(),
    kv_list_hot_path: false,
    tunnel_origin_configured: !!(env && env.TUNNEL_ORIGIN),
    records_packed: Array.isArray(doc.records) ? doc.records.length : 0,
    note: "Tunnel is primary when a named cloudflared frontend is healthy. This Worker is standby catalog of truth. Not a VPN. Not untraceable-origin. Author Aziel Eliab only.",
  };
}

export async function tryTunnelFirst(request, env, { timeoutMs = 800 } = {}) {
  const origin = env && env.TUNNEL_ORIGIN ? String(env.TUNNEL_ORIGIN).trim() : "";
  if (!origin) return null;
  const method = String((request && request.method) || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return null;
  let dest;
  try {
    dest = new URL(request.url);
    const base = new URL(origin);
    dest.protocol = base.protocol;
    dest.host = base.host;
  } catch {
    return null;
  }
  const ctrl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const res = await fetch(new Request(dest.toString(), { method, headers: request.headers, signal: ctrl && ctrl.signal }));
    if (res && res.status >= 200 && res.status < 300) return res;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
  return null;
}
