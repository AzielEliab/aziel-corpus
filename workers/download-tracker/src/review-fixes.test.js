import test from "node:test";
import assert from "node:assert/strict";
import { readPaperCounts, paperCountKey } from "./paper-ux.js";
import { lastGoodUrl, LASTGOOD_PREFIX, canonicalShelfCacheUrl, staleNoticeHtml, isInternalCachePath, snapshotRecords } from "./snapshot.js";
import { isCrawlerRequest, isCrawlerUa } from "./crawler.js";
import { COUNTS_NOTE, HTML_CACHE_PREFIX, LIBRARY_INDEX_KEY, readPackedIndex, sealPackedIndex, writePackedIndex } from "./library-index.js";
import worker from "./index.js";

const HOST = "https://www.azielcorpuslibrary.net";
const D1_DAILY = "D1_ERROR: Your account has exceeded D1's free tier daily row read limit. Upgrade to a paid plan or wait until tomorrow (midnight UTC) to continue.";
const human = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15" };
const crawlerUa = { "User-Agent": "Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)" };

function memoryKv(seed = {}) {
  const store = new Map(Object.entries(seed));
  return { store, async get(k) { return store.has(k) ? store.get(k) : null; }, async put(k, v) { store.set(k, String(v)); } };
}

function memoryCache() {
  const store = new Map();
  return {
    store,
    async match(req) {
      const key = typeof req === "string" ? req : req.url;
      const hit = store.get(key);
      return hit ? new Response(hit.body, { headers: hit.headers }) : undefined;
    },
    async put(req, res) {
      const key = typeof req === "string" ? req : req.url;
      store.set(key, { body: await res.text(), headers: Object.fromEntries(res.headers) });
    },
    async delete(req) { return store.delete(typeof req === "string" ? req : req.url); },
  };
}

async function withCache(fn) {
  const prev = globalThis.caches;
  const cache = memoryCache();
  globalThis.caches = { default: cache };
  try { return await fn(cache); } finally { if (prev === undefined) delete globalThis.caches; else globalThis.caches = prev; }
}

function db({ error, rows = [] } = {}) {
  return {
    prepare(sql) {
      const st = {
        bind() { return st; },
        async all() { if (error) throw new Error(error); return { results: /FROM records/i.test(sql) ? rows : [] }; },
        async first() { if (error) throw new Error(error); return null; },
        async run() { if (error) throw new Error(error); return {}; },
      };
      return st;
    },
    async batch() { if (error) throw new Error(error); return []; },
  };
}

function packedShelf(n = 3) {
  const records = [];
  for (let i = 0; i < n; i++) records.push({ record_id: "AZDOC-R" + i, title: "Review paper " + i, library: "aziel", domain: "History", created_utc: "2026-10-0" + (i + 1) });
  return sealPackedIndex({ records });
}

// (1)
test("readPaperCounts: any counter-store read failure is unavailable with null counts, never KV-only totals", async () => {
  const id = "AZDOC-P1";
  const kv = memoryKv({ [paperCountKey(id, "views")]: "50", [paperCountKey(id, "downloads")]: "7" });
  const brokenDo = { idFromName: (n) => n, get: () => ({ fetch: async () => { throw new Error("DO reset"); } }) };
  for (const env of [
    { DOWNLOADS: kv, HIT_COUNTERS: brokenDo },
    { DOWNLOADS: kv, DB: db({ error: "D1_ERROR: network connection lost" }) },
    { DOWNLOADS: kv, DB: db({ error: D1_DAILY }) },
  ]) {
    const out = await readPaperCounts(env, id);
    assert.equal(out.available, false);
    assert.equal(out.views, null);
    assert.equal(out.downloads, null);
    assert.equal(out.views_human, null);
    assert.equal(out.invented, false);
  }
  const ok = await readPaperCounts({ DOWNLOADS: kv }, id);
  assert.equal(ok.available, true);
  assert.equal(ok.views, 50);
});

// (2)
test("last-good cache key uses its own path (CF cache keys ignore #fragments)", () => {
  const main = canonicalShelfCacheUrl("/aziel-library", { domain: "History" });
  const lg = lastGoodUrl(main);
  assert.equal(lg.includes("#"), false);
  assert.notEqual(new URL(lg).pathname, new URL(main).pathname);
  assert.equal(new URL(lg).pathname, "/__lastgood/aziel-library");
  assert.equal(new URL(lg).search, new URL(main).search);
  assert.ok(lg.startsWith(LASTGOOD_PREFIX));
  assert.equal(new URL(lastGoodUrl(HTML_CACHE_PREFIX + "/tree")).pathname, "/__lastgood/tree");
});

test("/__lastgood/* and /__cache/* are not publicly routable", async () => {
  assert.equal(isInternalCachePath("/__lastgood/aziel-library"), true);
  assert.equal(isInternalCachePath("/__cache/html-home-v9/corpus"), true);
  assert.equal(isInternalCachePath("/aziel-library"), false);
  for (const p of ["/__lastgood/aziel-library", "/__lastgood/tree?x=1", "/__cache/html-home-v9/corpus"]) {
    const res = await worker.fetch(new Request(HOST + p, { headers: human }), { DOWNLOADS: memoryKv() }, {});
    assert.equal(res.status, 404, p);
  }
});

// (3)
test("a null KV index is missing, not an empty shelf", async () => {
  const doc = await readPackedIndex({ DOWNLOADS: memoryKv() });
  assert.equal(doc.missing, true);
  assert.throws(() => snapshotRecords(doc), (e) => e.code === "SNAPSHOT_UNAVAILABLE");
  assert.throws(() => snapshotRecords(sealPackedIndex({ records: [] })), (e) => e.code === "SNAPSHOT_UNAVAILABLE");
  const kv = memoryKv();
  await writePackedIndex({ DOWNLOADS: kv }, { ...doc, records: [{ record_id: "AZDOC-W1" }] });
  assert.equal("missing" in JSON.parse(kv.store.get(LIBRARY_INDEX_KEY)), false, "the read-side flag is never written");
});

test("crawler + missing index: 503 short Retry-After, and nothing is cached or last-good-written", async () => {
  await withCache(async (cache) => {
    const res = await worker.fetch(new Request(HOST + "/aziel-library", { headers: crawlerUa }), { DOWNLOADS: memoryKv(), DB: db() }, {});
    assert.equal(res.status, 503);
    assert.equal(res.headers.get("Retry-After"), "30");
    assert.equal(cache.store.size, 0);
  });
});

test("D1 over quota + missing index: falls through to last-good, then 503", async () => {
  await withCache(async (cache) => {
    const env = { DOWNLOADS: memoryKv(), DB: db({ error: D1_DAILY }) };
    const none = await worker.fetch(new Request(HOST + "/aziel-library", { headers: human }), env, {});
    assert.equal(none.status, 503);
    const key = lastGoodUrl(canonicalShelfCacheUrl("/aziel-library", {}));
    await cache.put(new Request(key), new Response("<html><body><main><h1>Saved shelf</h1></main></body></html>", { headers: { "X-Aziel-Cached-At": new Date(Date.now() - 3600e3).toISOString() } }));
    const res = await worker.fetch(new Request(HOST + "/aziel-library", { headers: human }), env, {});
    assert.equal(res.status, 200);
    assert.match(res.headers.get("X-Aziel-Stale") || "", /^lastgood; cause=daily/);
    const html = await res.text();
    assert.match(html, /Saved shelf/);
    assert.match(html, /data-stale-cause="daily-limit"/);
    const tree = await worker.fetch(new Request(HOST + "/tree", { headers: human }), env, {});
    assert.equal(tree.status, 503, "no snapshot and no last-good tree: 503");
  });
});

test("empty renders are never cached or last-good-written; non-empty ones are", async () => {
  await withCache(async (cache) => {
    await worker.fetch(new Request(HOST + "/aziel-library", { headers: human }), { DOWNLOADS: memoryKv(), DB: db({ rows: [] }) }, {});
    assert.equal(cache.store.size, 0, "zero-row shelf not cached");
    await worker.fetch(new Request(HOST + "/tree", { headers: human }), { DOWNLOADS: memoryKv(), DB: db({ rows: [] }) }, {});
    assert.equal(cache.store.size, 0, "empty tree not cached");
    const env = { DOWNLOADS: memoryKv({ [LIBRARY_INDEX_KEY]: JSON.stringify(packedShelf()) }), DB: db() };
    const res = await worker.fetch(new Request(HOST + "/aziel-library", { headers: crawlerUa }), env, {});
    assert.equal(res.status, 200);
    const keys = [...cache.store.keys()].map((k) => new URL(k).pathname);
    assert.ok(keys.some((k) => k.endsWith("/aziel-library") && k.includes("/__cache/")));
    assert.ok(keys.includes("/__lastgood/aziel-library"));
  });
});

// smaller items
test("stale banner wording follows the cause", async () => {
  const daily = staleNoticeHtml({ asOf: "2026-10-09T01:00:00Z", cause: "daily" });
  const outage = staleNoticeHtml({ asOf: "2026-10-09T01:00:00Z", cause: "outage" });
  assert.match(daily, /daily limit/);
  assert.match(daily, /00:00 UTC/);
  assert.doesNotMatch(outage, /daily limit|00:00 UTC/);
  assert.match(outage, /temporary overload or outage/);
  const env = { DOWNLOADS: memoryKv({ [LIBRARY_INDEX_KEY]: JSON.stringify(packedShelf()) }), DB: db({ error: "D1_ERROR: D1 DB is overloaded. Too many requests queued." }) };
  const res = await worker.fetch(new Request(HOST + "/corpus", { headers: human }), env, {});
  assert.equal(res.status, 200);
  assert.match(res.headers.get("X-Aziel-Stale") || "", /cause=outage/);
  assert.doesNotMatch(await res.text(), /daily limit/);
});

test("COUNTS_NOTE names the Durable Object", () => {
  assert.match(COUNTS_NOTE, /Durable Object/);
});

test("crawler regex: phones like CUBOT are people; real crawlers are still crawlers", () => {
  assert.equal(isCrawlerUa("Mozilla/5.0 (Linux; Android 10; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36"), false);
  assert.equal(isCrawlerUa("Mozilla/5.0 (Linux; Android 11; CUBOT KINGKONG 7) AppleWebKit/537.36 Chrome/119 Mobile Safari/537.36"), false);
  for (const ua of [
    "Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.1; +https://openai.com/gptbot)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  ]) assert.equal(isCrawlerUa(ua), true, ua);
  assert.equal(isCrawlerRequest(new Request(HOST, { headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10; CUBOT X30) Chrome/120 Mobile Safari/537.36" } })), false);
});
