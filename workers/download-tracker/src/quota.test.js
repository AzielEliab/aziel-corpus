import test from "node:test";
import assert from "node:assert/strict";
import { isQuotaError, quotaResponse, retryAfterSeconds, rethrowIfQuota, QUOTA_ERROR_CODE } from "./quota.js";
import {
  LIBRARY_INDEX_KEY,
  loadShelfCards,
  readPackedIndex,
  refreshPackedIndex,
  sealPackedIndex,
  writePackedIndex,
  wouldWipeIndex,
} from "./library-index.js";
import worker, { SCHEDULED_WALKS, scheduledWalkIndex, runScheduledTick, CRON_INTERVAL_MS, githubStats, GITHUB_CACHE_MS } from "./index.js";
import { readFileSync } from "node:fs";

const HOST = "https://www.azielcorpuslibrary.net";
const KV_PUT_LIMIT = "KV put() limit exceeded for the day.";
const KV_GET_LIMIT = "KV get() limit exceeded for the day.";
const D1_LIMIT = "D1_ERROR: Exceeded maximum daily rows read limit. Your account has exceeded D1's free tier.";

function memoryKv(seed = {}, { getError, putError } = {}) {
  const store = new Map(Object.entries(seed));
  const puts = [];
  return {
    store,
    puts,
    async get(key) {
      if (getError) throw new Error(getError);
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      if (putError) throw new Error(putError);
      puts.push(key);
      store.set(key, String(value));
    },
    async list() { throw new Error("no list"); },
  };
}

function d1({ rows = [], error } = {}) {
  const calls = { prepare: 0 };
  return {
    calls,
    prepare() {
      calls.prepare += 1;
      const stmt = {
        bind() { return stmt; },
        async all() { if (error) throw new Error(error); return { results: rows }; },
        async first() { if (error) throw new Error(error); return rows[0] || null; },
        async run() { if (error) throw new Error(error); return {}; },
      };
      return stmt;
    },
  };
}

function packedWith(n) {
  const records = [];
  for (let i = 0; i < n; i++) records.push({ record_id: "AZDOC-Q" + i, title: "Q" + i, library: "aziel", created_utc: "2026-10-0" + ((i % 8) + 1) });
  return sealPackedIndex({ views: 5, downloads: 2, records });
}

test("isQuotaError matches Cloudflare D1/KV daily limit errors only", () => {
  assert.equal(isQuotaError(new Error(KV_PUT_LIMIT)), true);
  assert.equal(isQuotaError(new Error(KV_GET_LIMIT)), true);
  assert.equal(isQuotaError(new Error(D1_LIMIT)), true);
  assert.equal(isQuotaError(new Error("D1_ERROR: no such column: zsolver_json")), false);
  assert.equal(isQuotaError(new Error("network down")), false);
  assert.equal(isQuotaError(null), false);
  assert.throws(() => rethrowIfQuota(new Error(KV_PUT_LIMIT)), (e) => e.code === QUOTA_ERROR_CODE);
  assert.doesNotThrow(() => rethrowIfQuota(new Error("no such table")));
});

test("Retry-After counts down to the 00:00 UTC quota reset", () => {
  const at = Date.UTC(2026, 9, 9, 1, 15, 0); // 9:15 PM ET
  assert.equal(retryAfterSeconds(at), 22 * 3600 + 45 * 60);
  assert.equal(retryAfterSeconds(Date.UTC(2026, 9, 9, 23, 59, 59)), 60, "floor of 60s");
  const res = quotaResponse(new Error(KV_PUT_LIMIT), { nowMs: at });
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("Retry-After"), String(22 * 3600 + 45 * 60));
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

async function get(env, path) {
  return worker.fetch(new Request(HOST + path, { headers: { "User-Agent": "Mozilla/5.0" } }), env, {});
}

test("stats, count, library-index and v1/stats answer 503 + Retry-After on a KV quota error (not 1101)", async () => {
  const env = { DOWNLOADS: memoryKv({}, { getError: KV_GET_LIMIT }) };
  for (const path of ["/stats", "/count", "/v1/stats", "/v1/library-index"]) {
    const res = await get(env, path);
    assert.equal(res.status, 503, path);
    assert.ok(Number(res.headers.get("Retry-After")) >= 60, path + " Retry-After");
    const body = await res.json();
    assert.equal(body.code, QUOTA_ERROR_CODE, path);
  }
});

test("record page answers 503 (not 404) when D1 is over quota and no packed card exists", async () => {
  const env = { DOWNLOADS: memoryKv(), DB: d1({ error: D1_LIMIT }) };
  const res = await get(env, "/record/AZDOC-QUOTA1");
  assert.equal(res.status, 503);
  assert.ok(res.headers.get("Retry-After"));
});

test("sitemap-records answers 503 (not an empty sitemap) when D1 is over quota and the packed index is empty", async () => {
  const env = { DOWNLOADS: memoryKv(), DB: d1({ error: D1_LIMIT }) };
  const res = await get(env, "/sitemap-records.xml");
  assert.equal(res.status, 503);
  assert.ok(res.headers.get("Retry-After"));
  const sm = await get(env, "/sitemap.xml");
  assert.equal(sm.status, 503);
});

test("sitemap-records still lists packed ids when only D1 is over quota", async () => {
  const packed = packedWith(3);
  const env = { DOWNLOADS: memoryKv({ [LIBRARY_INDEX_KEY]: JSON.stringify(packed) }), DB: d1({ error: D1_LIMIT }) };
  const res = await get(env, "/sitemap-records.xml");
  assert.equal(res.status, 200);
  const xml = await res.text();
  assert.match(xml, /AZDOC-Q0/);
  assert.match(xml, /AZDOC-Q2/);
});

test("/v1/search answers 503 when the shelf is empty because D1 is over quota", async () => {
  const env = { DOWNLOADS: memoryKv(), DB: d1({ error: D1_LIMIT }) };
  const res = await get(env, "/v1/search?q=x");
  assert.equal(res.status, 503);
  assert.ok(res.headers.get("Retry-After"));
});

test("loadShelfCards throws on a D1 error instead of returning []", async () => {
  const quota = d1({ error: D1_LIMIT });
  await assert.rejects(() => loadShelfCards({ DB: quota }), (e) => e.code === QUOTA_ERROR_CODE);
  assert.equal(quota.calls.prepare, 1, "quota error is not retried through the schema fallbacks");
  const broken = d1({ error: "D1_ERROR: no such table: records" });
  await assert.rejects(() => loadShelfCards({ DB: broken }), (e) => e.code === "D1_SHELF_UNAVAILABLE");
  assert.equal(broken.calls.prepare, 3, "schema fallbacks still run for non-quota errors");
});

test("refresh never wipes library:index:v1: D1 error leaves it untouched", async () => {
  const packed = packedWith(4);
  const kv = memoryKv({ [LIBRARY_INDEX_KEY]: JSON.stringify(packed) });
  await assert.rejects(() => refreshPackedIndex({ DOWNLOADS: kv, DB: d1({ error: D1_LIMIT }) }));
  assert.equal(kv.puts.includes(LIBRARY_INDEX_KEY), false);
  assert.equal(JSON.parse(kv.store.get(LIBRARY_INDEX_KEY)).records.length, 4);
});

test("refresh never wipes library:index:v1: empty fresh shelf over a non-empty one is not written", async () => {
  const packed = packedWith(4);
  const kv = memoryKv({ [LIBRARY_INDEX_KEY]: JSON.stringify(packed) });
  const out = await refreshPackedIndex({ DOWNLOADS: kv, DB: d1({ rows: [] }) });
  assert.equal(kv.puts.includes(LIBRARY_INDEX_KEY), false);
  assert.equal(out.records.length, 4);
  assert.equal(JSON.parse(kv.store.get(LIBRARY_INDEX_KEY)).records.length, 4);
});

test("writePackedIndex refuses an empty index over a non-empty current one", async () => {
  const current = packedWith(2);
  assert.equal(wouldWipeIndex(current, { records: [] }), true);
  assert.equal(wouldWipeIndex({ records: [] }, { records: [] }), false);
  const kv = memoryKv();
  await assert.rejects(() => writePackedIndex({ DOWNLOADS: kv }, { ...current, records: [] }, { current }), (e) => e.code === "EMPTY_INDEX_GUARD");
  assert.equal(kv.puts.length, 0);
});

test("refresh skips the KV put when nothing changed", async () => {
  const rows = [{ record_id: "AZDOC-S1", title: "S1", library: "aziel", created_utc: "2026-10-01" }];
  const kv = memoryKv({ "aziel-corpus|__views__": "7", "aziel-corpus|__total__": "3" });
  const env = { DOWNLOADS: kv, DB: d1({ rows }) };
  await refreshPackedIndex(env);
  assert.equal(kv.puts.filter((k) => k === LIBRARY_INDEX_KEY).length, 1);
  await refreshPackedIndex(env);
  assert.equal(kv.puts.filter((k) => k === LIBRARY_INDEX_KEY).length, 1, "unchanged content: no second put");
  kv.store.set("aziel-corpus|__views__", "8");
  const after = await refreshPackedIndex(env);
  assert.equal(kv.puts.filter((k) => k === LIBRARY_INDEX_KEY).length, 2);
  assert.equal(after.views, 8, "Views still refresh exactly");
});

test("cron runs every 30 min and at most one walk per tick, rotating through every walk", () => {
  const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  assert.match(toml, /crons = \["\*\/30 \* \* \* \*"\]/);
  assert.doesNotMatch(toml, /crons = \["\* \* \* \* \*"\]/);
  assert.equal(CRON_INTERVAL_MS, 30 * 60 * 1000);
  const seen = new Set();
  const base = Date.UTC(2026, 9, 9, 0, 0, 0);
  for (let i = 0; i < SCHEDULED_WALKS.length; i++) seen.add(scheduledWalkIndex(base + i * CRON_INTERVAL_MS));
  assert.equal(seen.size, SCHEDULED_WALKS.length);
});

test("scheduled() refreshes the index once and runs exactly one walk", async () => {
  const rows = [{ record_id: "AZDOC-C1", title: "C1", library: "aziel", created_utc: "2026-10-01" }];
  const kv = memoryKv({ "aziel-corpus|__github__": JSON.stringify({ stars: 1, forks: 0, watchers: 0, release_download_count: 0, fetched_at: Date.now() }) });
  const db = d1({ rows });
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("no network in tests"); };
  try {
    const ran = [];
    const walks = SCHEDULED_WALKS.map(([name]) => [name, async () => { ran.push(name); }]);
    const out = await runScheduledTick({ DOWNLOADS: kv, DB: db }, Date.UTC(2026, 9, 9, 0, 0, 0), { walks });
    assert.equal(ran.length, 1, "exactly one walk per tick");
    assert.equal(out.walk, ran[0]);
    assert.equal(out.index, "ok");
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(kv.puts.filter((k) => k === LIBRARY_INDEX_KEY).length, 1, "one packed index put per tick");
  const packed = JSON.parse(kv.store.get(LIBRARY_INDEX_KEY));
  assert.equal(packed.github.stars, 1, "GitHub stats are folded into the same put");
});

test("page and API requests do not start background walks", async () => {
  const db = d1({ rows: [] });
  const env = { DOWNLOADS: memoryKv(), DB: db };
  const waits = [];
  const ctx = { waitUntil(p) { waits.push(p); } };
  await worker.fetch(new Request(HOST + "/v1/health", { headers: { "User-Agent": "Mozilla/5.0" } }), env, ctx);
  await Promise.all(waits.map((p) => Promise.resolve(p).catch(() => null)));
  assert.equal(db.calls.prepare, 0, "GET /v1/health makes no D1 calls");
});

test("bot hits no longer write the unread bot bucket; human hits still count exactly", async () => {
  const kv = memoryKv();
  const env = { DOWNLOADS: kv };
  const post = (ua) => worker.fetch(new Request(HOST + "/event", {
    method: "POST",
    headers: { "User-Agent": ua, "Content-Type": "application/json" },
    body: JSON.stringify({ owner: "AzielEliab", repo: "aziel-corpus", branch: "main" }),
  }), env, {});
  assert.equal((await post("Googlebot/2.1")).status, 200);
  assert.equal(kv.store.get("aziel-corpus|__total__"), "1");
  assert.equal(kv.store.has("aziel-corpus|__downloads_bot__"), false);
  const stats = await (await get(env, "/stats")).json();
  assert.equal(stats.downloads_bot, 1, "bot = total - human");
  assert.equal(stats.downloads_human, 0);
});

test("githubStats: 6 h cache, and a failed fetch keeps prior numbers without a KV put", async () => {
  assert.equal(GITHUB_CACHE_MS, 6 * 3600 * 1000);
  const prior = { stars: 9, forks: 2, watchers: 1, release_download_count: 40, fetched_at: 1 };
  const kv = memoryKv({ "aziel-corpus|__github__": JSON.stringify(prior) });
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("rate limited", { status: 403 });
  try {
    const out = await githubStats({ DOWNLOADS: kv }, { nowMs: Date.now() });
    assert.equal(out.stars, 9);
    assert.equal(kv.puts.length, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
  const fresh = memoryKv({ "aziel-corpus|__github__": JSON.stringify({ ...prior, fetched_at: Date.now() }) });
  await githubStats({ DOWNLOADS: fresh });
  assert.equal(fresh.puts.length, 0, "inside the cache window: no fetch, no put");
});

test("readPackedIndex propagates a KV quota error so the route can 503", async () => {
  await assert.rejects(() => readPackedIndex({ DOWNLOADS: memoryKv({}, { getError: KV_GET_LIMIT }) }), (e) => isQuotaError(e));
});
