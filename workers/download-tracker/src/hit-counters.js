/**
 * HitCounters: SQLite-backed Durable Object for per-hit counters (same idea as
 * aziel-runtime #231 RuntimeKv). Its storage has its own limits, separate from the
 * account's daily D1 row and KV put allowances that kept taking the site down.
 *
 * One object (name "hit-counters-v1"). Requests to one object run one at a time
 * and storage get/put inside one request are not interleaved (input gates), so
 * n = n + 1 is exact. Legacy KV values are never rewritten; readers add them.
 * Author: Aziel Eliab.
 */
export const HIT_COUNTERS_NAME = "hit-counters-v1";
const LIST_CAP = 2000;

export class HitCounters {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async bump(keys) {
    const list = [...new Set((keys || []).filter(Boolean).map(String))].slice(0, 16);
    const out = {};
    if (!list.length) return out;
    const cur = await this.ctx.storage.get(list.map((k) => "c:" + k));
    const next = {};
    for (const k of list) {
      const n = (Number(cur.get("c:" + k)) || 0) + 1;
      next["c:" + k] = n;
      out[k] = n;
    }
    await this.ctx.storage.put(next);
    return out;
  }

  async read(keys) {
    const list = [...new Set((keys || []).filter(Boolean).map(String))].slice(0, 128);
    const out = {};
    if (!list.length) return out;
    const cur = await this.ctx.storage.get(list.map((k) => "c:" + k));
    for (const k of list) out[k] = Math.max(0, Number(cur.get("c:" + k)) || 0);
    return out;
  }

  async list(prefix, limit) {
    const cap = Math.max(1, Math.min(LIST_CAP, Number(limit) || LIST_CAP));
    const rows = await this.ctx.storage.list({ prefix: "c:" + String(prefix || ""), limit: cap });
    const out = [];
    for (const [k, n] of rows) out.push({ key: k.slice(2), n: Math.max(0, Number(n) || 0) });
    return out;
  }

  /** POST {op: "bump"|"read"|"list", keys?, prefix?, limit?} → JSON. */
  async fetch(request) {
    let body = {};
    try { body = await request.json(); } catch { body = {}; }
    const op = String(body.op || "");
    let result;
    if (op === "bump") result = await this.bump(body.keys);
    else if (op === "read") result = await this.read(body.keys);
    else if (op === "list") result = await this.list(body.prefix, body.limit);
    else return new Response(JSON.stringify({ ok: false, error: "unknown op" }), { status: 400, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ ok: true, result }), { headers: { "Content-Type": "application/json" } });
  }
}

/** Client side. Returns null when the binding is absent so callers fall back. */
export async function hitCountersCall(env, op, payload = {}) {
  const ns = env && env.HIT_COUNTERS;
  if (!ns || typeof ns.idFromName !== "function" || typeof ns.get !== "function") return null;
  const stub = ns.get(ns.idFromName(HIT_COUNTERS_NAME));
  const res = await stub.fetch("https://hit-counters/op", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, ...payload }),
  });
  const doc = await res.json();
  if (!res.ok || !doc || doc.ok !== true) throw new Error("HitCounters " + op + " failed: " + String((doc && doc.error) || res.status));
  return doc.result;
}
