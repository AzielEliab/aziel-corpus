/**
 * Hit counters (Views, Downloads, human splits, per-repo download keys).
 *
 * Why: Workers Free allows 1,000 KV puts/day, and the account's daily D1 row
 * allowance is shared with every page. Every counted hit used to be a KV get + put
 * (and racy under concurrency).
 *
 * Write order: HitCounters Durable Object (own SQLite storage, exact n+1) →
 * D1 hit_counters upsert → legacy KV get+put. A count is only skipped when all
 * stores refuse it, and the caller is told (store: "none").
 * Exact count = legacy KV value (never rewritten) + D1 value + Durable Object value.
 * Never sampled, never invented.
 * Author: Aziel Eliab.
 */
import { isQuotaError } from "./quota.js";
import { hitCountersCall } from "./hit-counters.js";

export const COUNTER_TABLE = "hit_counters";
const CREATE_SQL =
  "CREATE TABLE IF NOT EXISTS hit_counters (key TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0, updated_utc TEXT)";
const UPSERT_SQL =
  "INSERT INTO hit_counters (key, n, updated_utc) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET n = n + 1, updated_utc = excluded.updated_utc";

function hasDb(env) {
  return !!(env && env.DB && typeof env.DB.prepare === "function");
}

function kvOf(env) {
  return env && env.DOWNLOADS && typeof env.DOWNLOADS.get === "function" ? env.DOWNLOADS : null;
}

function noTable(err) {
  return /no such table/i.test(String((err && err.message) || err || ""));
}

async function upsertAll(env, keys, now) {
  const stmts = keys.map((k) => env.DB.prepare(UPSERT_SQL).bind(k, now));
  if (typeof env.DB.batch === "function") await env.DB.batch(stmts);
  else for (const s of stmts) await s.run();
}

async function kvBump(kv, key) {
  const n = parseInt((await kv.get(key)) || "0", 10) + 1;
  await kv.put(key, String(Number.isFinite(n) ? n : 1));
}

/**
 * Count one hit on each key. Returns { store: "d1" | "kv" | "none", error? }.
 * Throws nothing: callers decide whether a skipped count matters.
 */
export async function bumpCounters(env, keys) {
  const list = [...new Set((keys || []).filter(Boolean).map(String))];
  if (!list.length) return { store: "none" };
  const now = new Date().toISOString();
  let d1Error = null;
  try {
    const done = await hitCountersCall(env, "bump", { keys: list });
    if (done) return { store: "do" };
  } catch { /* fall back to D1, then KV */ }
  if (hasDb(env)) {
    try {
      await upsertAll(env, list, now);
      return { store: "d1" };
    } catch (e) {
      if (noTable(e)) {
        try {
          await env.DB.prepare(CREATE_SQL).run();
          await upsertAll(env, list, now);
          return { store: "d1" };
        } catch (e2) { d1Error = e2; }
      } else {
        d1Error = e;
      }
    }
  }
  const kv = kvOf(env);
  if (kv && typeof kv.put === "function") {
    try {
      for (const k of list) await kvBump(kv, k);
      return { store: "kv", d1_error: d1Error ? String(d1Error.message || d1Error) : undefined };
    } catch (e) {
      return { store: "none", error: e, quota: isQuotaError(e) || isQuotaError(d1Error) };
    }
  }
  return { store: "none", error: d1Error, quota: isQuotaError(d1Error) };
}

/** D1 part only. Quota errors propagate (a partial count would read low); a missing table is 0. */
export async function readD1Counters(env, keys) {
  const out = {};
  const list = [...new Set((keys || []).filter(Boolean).map(String))];
  for (const k of list) out[k] = 0;
  if (!list.length || !hasDb(env)) return out;
  try {
    const sql = "SELECT key, n FROM hit_counters WHERE key IN (" + list.map(() => "?").join(",") + ")";
    const rows = (await env.DB.prepare(sql).bind(...list).all()).results || [];
    for (const r of rows) if (r && r.key in out) out[r.key] = Math.max(0, Number(r.n) || 0);
  } catch (e) {
    if (noTable(e)) return out;
    throw e;
  }
  return out;
}

/** Exact totals: legacy KV + D1 + Durable Object. Any store that cannot be read throws (never a low count). */
export async function readCounters(env, keys) {
  const list = [...new Set((keys || []).filter(Boolean).map(String))];
  const d1 = await readD1Counters(env, list);
  const dobj = (await hitCountersCall(env, "read", { keys: list })) || {};
  const kv = kvOf(env);
  const out = {};
  for (const k of list) {
    let base = 0;
    if (kv) {
      const n = parseInt((await kv.get(k)) || "0", 10);
      base = Number.isFinite(n) && n > 0 ? n : 0;
    }
    out[k] = base + (d1[k] || 0) + (Number(dobj[k]) || 0);
  }
  return out;
}

function mergeRows(a, b) {
  const m = new Map();
  for (const r of [...(a || []), ...(b || [])]) {
    if (!r || typeof r.key !== "string") continue;
    m.set(r.key, (m.get(r.key) || 0) + Math.max(0, Number(r.n) || 0));
  }
  return [...m].map(([key, n]) => ({ key, n }));
}

/** Per-repo download keys with D1 or Durable Object hits (n = D1 + DO; legacy KV added by the caller). */
export async function listD1DimCounters(env, project, { limit = 200 } = {}) {
  const d1 = await listD1DimRows(env, project, { limit });
  const dobj = ((await hitCountersCall(env, "list", { prefix: project + "|", limit: 2000 })) || [])
    .filter((r) => r && typeof r.key === "string" && !r.key.startsWith(project + "|paper|") && r.key.split("|").length === 5 && !r.key.includes("|__"));
  return mergeRows(d1, dobj).slice(0, limit);
}

async function listD1DimRows(env, project, { limit = 200 } = {}) {
  if (!hasDb(env)) return [];
  try {
    const rows = (await env.DB.prepare(
      "SELECT key, n FROM hit_counters WHERE key LIKE ? AND key NOT LIKE ? ORDER BY n DESC LIMIT ?"
    ).bind(project + "|%", project + "|paper|%", limit).all()).results || [];
    return rows.filter((r) => r && typeof r.key === "string" && r.key.split("|").length === 5 && !r.key.includes("|__"));
  } catch (e) {
    if (noTable(e)) return [];
    throw e;
  }
}

/** Per-paper counter rows (prefix|<record_id>|views|downloads): n = D1 + Durable Object. */
export async function listD1PrefixCounters(env, prefix, { limit = 2000 } = {}) {
  const d1 = await listD1PrefixRows(env, prefix, { limit });
  const dobj = (await hitCountersCall(env, "list", { prefix, limit })) || [];
  return mergeRows(d1, dobj);
}

async function listD1PrefixRows(env, prefix, { limit = 2000 } = {}) {
  if (!hasDb(env)) return [];
  try {
    return (await env.DB.prepare(
      "SELECT key, n FROM hit_counters WHERE key LIKE ? LIMIT ?"
    ).bind(prefix + "%", limit).all()).results || [];
  } catch (e) {
    if (noTable(e)) return [];
    throw e;
  }
}
