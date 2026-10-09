import test from "node:test";
import assert from "node:assert/strict";
import { HitCounters, HIT_COUNTERS_NAME } from "./hit-counters.js";
import { bumpCounters, readCounters, listD1DimCounters } from "./counters.js";
import { canonicalShelfCacheUrl, injectNotice, isCrawlerRequest, staleNoticeHtml } from "./snapshot.js";
import { discardBody, mapLimit } from "./http-body.js";
import { LIBRARY_INDEX_KEY, sealPackedIndex, HTML_CACHE_PREFIX } from "./library-index.js";
import { bumpPaperCount } from "./paper-ux.js";
import worker from "./index.js";

const HOST = "https://www.azielcorpuslibrary.net";
const D1_DAILY = "D1_ERROR: Your account has exceeded D1's free tier daily row read limit. Upgrade to a paid plan or wait until tomorrow (midnight UTC) to continue.";

function fakeStorage() {
  const m = new Map();
  return {
    m,
    async get(keys) { if (Array.isArray(keys)) { const out = new Map(); for (const k of keys) if (m.has(k)) out.set(k, m.get(k)); return out; } return m.get(keys); },
    async put(obj) { for (const [k, v] of Object.entries(obj)) m.set(k, v); },
    async list({ prefix = "", limit = 1000 } = {}) { return new Map([...m].filter(([k]) => k.startsWith(prefix)).slice(0, limit)); },
  };
}

function fakeDoNamespace() {
  const objects = new Map();
  const names = [];
  return {
    names,
    objects,
    idFromName(n) { names.push(n); return n; },
    get(id) {
      if (!objects.has(id)) objects.set(id, new HitCounters({ storage: fakeStorage() }, {}));
      const obj = objects.get(id);
      return { fetch: (url, init) => obj.fetch(new Request(url, init)) };
    },
  };
}

function memoryKv(seed = {}) {
  const store = new Map(Object.entries(seed));
  const puts = [];
  return { store, puts, async get(k) { return store.has(k) ? store.get(k) : null; }, async put(k, v) { puts.push(k); store.set(k, String(v)); } };
}

function quotaDb() {
  const calls = { n: 0 };
  return {
    calls,
    prepare() {
      calls.n += 1;
      const st = { bind() { return st; }, async all() { throw new Error(D1_DAILY); }, async first() { throw new Error(D1_DAILY); }, async run() { throw new Error(D1_DAILY); } };
      return st;
    },
    async batch() { calls.n += 1; throw new Error(D1_DAILY); },
  };
}

function countingDb(rows = []) {
  const calls = { n: 0 };
  return {
    calls,
    prepare(sql) {
      calls.n += 1;
      const st = { bind() { return st; }, async all() { return { results: /FROM records/i.test(sql) ? rows : [] }; }, async first() { return null; }, async run() { return {}; } };
      return st;
    },
    async batch() { return []; },
  };
}

function packedShelf() {
  const records = [];
  for (let i = 0; i < 6; i++) records.push({ record_id: "AZDOC-S" + i, title: "Shelf paper " + i, library: i < 4 ? "aziel" : "corpus", domain: "History", subjects: "Florence", created_utc: "2026-10-0" + (i + 1) });
  return sealPackedIndex({ views: 3, downloads: 1, records });
}

const human = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15" };

test("HitCounters Durable Object counts exactly; reads add legacy KV", async () => {
  const ns = fakeDoNamespace();
  const kv = memoryKv({ "aziel-corpus|__views__": "40" });
  const env = { HIT_COUNTERS: ns, DOWNLOADS: kv };
  for (let i = 0; i < 5; i++) assert.equal((await bumpCounters(env, ["aziel-corpus|__views__"])).store, "do");
  assert.equal(kv.puts.length, 0);
  assert.deepEqual(ns.names.every((n) => n === HIT_COUNTERS_NAME), true);
  assert.equal((await readCounters(env, ["aziel-corpus|__views__"]))["aziel-corpus|__views__"], 45);
  await bumpCounters(env, ["aziel-corpus|AzielEliab|aziel-corpus|main|0"]);
  const dims = await listD1DimCounters(env, "aziel-corpus");
  assert.deepEqual(dims, [{ key: "aziel-corpus|AzielEliab|aziel-corpus|main|0", n: 1 }]);
});

test("Durable Object down: falls back to D1/KV instead of losing the hit", async () => {
  const broken = { idFromName: (n) => n, get: () => ({ fetch: async () => { throw new Error("DO unavailable"); } }) };
  const kv = memoryKv();
  const res = await bumpCounters({ HIT_COUNTERS: broken, DOWNLOADS: kv }, ["k"]);
  assert.equal(res.store, "kv");
  assert.equal(kv.store.get("k"), "1");
});

test("bot record views are not counted (no write at all)", async () => {
  const kv = memoryKv();
  const ns = fakeDoNamespace();
  const out = await bumpPaperCount({ DOWNLOADS: kv, HIT_COUNTERS: ns }, "AZDOC-1", "views", new Request(HOST + "/record/AZDOC-1", { headers: { "User-Agent": "Mozilla/5.0 (compatible; Amazonbot/0.1)" } }));
  assert.equal(out.counted, false);
  assert.equal(out.reason, "bot");
  assert.equal(kv.puts.length, 0);
  assert.equal(ns.objects.size, 0);
});

test("crawlers get /aziel-library from the packed snapshot with zero D1 calls", async () => {
  const db = countingDb();
  const env = { DOWNLOADS: memoryKv({ [LIBRARY_INDEX_KEY]: JSON.stringify(packedShelf()) }), DB: db };
  assert.equal(isCrawlerRequest(new Request(HOST, { headers: { "User-Agent": "Mozilla/5.0 (compatible; GPTBot/1.0)" } })), true);
  const res = await worker.fetch(new Request(HOST + "/aziel-library?domain=History", { headers: { "User-Agent": "Mozilla/5.0 (compatible; Amazonbot/0.1)" } }), env, {});
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Shelf paper 0/);
  assert.doesNotMatch(html, /Shelf paper 5/, "corpus rows stay off the Aziel shelf");
  assert.equal(db.calls.n, 0, "no D1 for crawlers");
});

test("/aziel-library and /corpus still answer 200 with a stale label when D1 is over quota", async () => {
  const env = { DOWNLOADS: memoryKv({ [LIBRARY_INDEX_KEY]: JSON.stringify(packedShelf()) }), DB: quotaDb() };
  for (const path of ["/aziel-library", "/corpus"]) {
    const res = await worker.fetch(new Request(HOST + path, { headers: human }), env, {});
    assert.equal(res.status, 200, path);
    assert.match(res.headers.get("X-Aziel-Stale") || "", /^snapshot; as-of=/, path);
    assert.equal(res.headers.get("Cache-Control"), "no-store", path);
    const html = await res.text();
    assert.match(html, /data-stale="true"/, path);
    assert.match(html, /Stale view/, path);
  }
});

test("/tree answers 200 from the snapshot with a stale label when D1 is over quota", async () => {
  const env = { DOWNLOADS: memoryKv({ [LIBRARY_INDEX_KEY]: JSON.stringify(packedShelf()) }), DB: quotaDb() };
  const res = await worker.fetch(new Request(HOST + "/tree", { headers: human }), env, {});
  assert.equal(res.status, 200);
  assert.match(res.headers.get("X-Aziel-Stale") || "", /^snapshot/);
  const html = await res.text();
  assert.match(html, /Stale view/);
  assert.match(html, /Shelf paper 1/);
});

test("with neither D1 nor a snapshot, shelf pages still answer 503 + Retry-After (no false empty shelf)", async () => {
  const env = { DOWNLOADS: { async get() { throw new Error("KV get() limit exceeded for the day."); }, async put() {} }, DB: quotaDb() };
  const res = await worker.fetch(new Request(HOST + "/aziel-library", { headers: human }), env, {});
  assert.equal(res.status, 503);
  assert.ok(Number(res.headers.get("Retry-After")) >= 60);
});

test("canonical shelf cache key: param order and defaults do not split the cache; default view keeps the plain key", () => {
  const a = canonicalShelfCacheUrl("/aziel-library", { domain: "History", keyword: "aziel", sort: "newest", offset: 0, limit: 48, lib: "all" });
  const b = canonicalShelfCacheUrl("/aziel-library", { keyword: "aziel", domain: "History" });
  assert.equal(a, b);
  assert.equal(canonicalShelfCacheUrl("/aziel-library", { sort: "newest", offset: 0, limit: 48 }), HTML_CACHE_PREFIX + "/aziel-library");
});

test("stale notice lands inside <main> and names the snapshot time", () => {
  const out = injectNotice("<html><body><main class=x><h1>Shelf</h1></main></body></html>", staleNoticeHtml({ asOf: "2026-10-08T21:28:58Z" }));
  assert.match(out, /<main class=x><div class="card stale-notice"/);
  assert.match(out, /2026-10-08 21:28 UTC/);
});

test("discardBody cancels unread bodies; mapLimit caps concurrency", async () => {
  let cancelled = false;
  const res = new Response(new ReadableStream({ pull() {}, cancel() { cancelled = true; } }));
  await discardBody(res);
  assert.equal(cancelled, true);
  let live = 0, peak = 0;
  const out = await mapLimit([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4, async (x) => {
    live += 1; peak = Math.max(peak, live);
    await new Promise((r) => setTimeout(r, 2));
    live -= 1;
    return x * 2;
  });
  assert.equal(peak <= 4, true);
  assert.deepEqual(out, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
});
