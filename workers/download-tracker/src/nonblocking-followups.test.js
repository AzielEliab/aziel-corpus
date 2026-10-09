import test from "node:test";
import assert from "node:assert/strict";
import worker from "./index.js";
import { LIBRARY_INDEX_KEY, sealPackedIndex, statsFromPacked, readPackedIndex, unavailableStats, countsAvailable } from "./library-index.js";
import { canonicalShelfCacheUrl, emptySearchCacheUrl, OUTAGE_URL, noteOutage, readOutage, clearOutage, cachedStaleNotice } from "./snapshot.js";
import { HTML_CACHE_PREFIX } from "./library-index.js";
import { loadSoftwareCatalog, parseCountPayload, countPills } from "./software-catalog.js";
import { renderPaperReader } from "./paper-ux.js";

const HOST = "https://www.azielcorpuslibrary.net";
const D1_DAILY = "D1_ERROR: Your account has exceeded D1's free tier daily row read limit. Upgrade to a paid plan or wait until tomorrow (midnight UTC) to continue.";
const human = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15" };

function memoryKv(seed = {}) {
  const store = new Map(Object.entries(seed));
  return { store, async get(k) { return store.has(k) ? store.get(k) : null; }, async put(k, v) { store.set(k, String(v)); } };
}
function memoryCache() {
  const store = new Map();
  return {
    store,
    async match(req) { const h = store.get(typeof req === "string" ? req : req.url); return h ? new Response(h.body, { headers: h.headers }) : undefined; },
    async put(req, res) { store.set(typeof req === "string" ? req : req.url, { body: await res.text(), headers: Object.fromEntries(res.headers) }); },
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
function packed(extra = {}) {
  return sealPackedIndex({ records: [{ record_id: "AZDOC-N1", title: "Nonblocking paper", library: "aziel", domain: "History", created_utc: "2026-10-01" }], views: 120, downloads: 34, ...extra });
}
function ctxCollector() {
  const jobs = [];
  return { jobs, waitUntil(p) { jobs.push(Promise.resolve(p).catch(() => null)); }, async drain() { await Promise.all(jobs); } };
}
async function putAged(cache, url, body, ageMs) {
  await cache.put(new Request(url), new Response(body, { headers: { "X-Aziel-Cached-At": new Date(Date.now() - ageMs).toISOString() } }));
}

// (a)
test("(a) missing index: stats are unavailable (null), not 0", async () => {
  const doc = await readPackedIndex({ DOWNLOADS: memoryKv() });
  const stats = statsFromPacked(doc);
  assert.equal(stats.counts_available, false);
  assert.equal(stats.views, null);
  assert.equal(stats.downloads, null);
  assert.equal(stats.records_packed, null);
  assert.equal(countsAvailable(stats), false);
  const ok = statsFromPacked(packed());
  assert.equal(ok.counts_available, true);
  assert.equal(ok.views, 120);
  assert.equal(countsAvailable(ok), true);
});

test("(a) /count, /stats and /v1/stats answer 503 + short Retry-After on a missing index, 200 with counts otherwise", async () => {
  for (const p of ["/count", "/stats", "/v1/stats"]) {
    const res = await worker.fetch(new Request(HOST + p, { headers: human }), { DOWNLOADS: memoryKv() }, {});
    assert.equal(res.status, 503, p);
    assert.equal(res.headers.get("Retry-After"), "30", p);
    assert.equal(res.headers.get("Cache-Control"), "no-store", p);
    const body = await res.json();
    assert.equal(body.code, "COUNTS_UNAVAILABLE", p);
    assert.equal("views" in body, false, p + " must not carry a 0 count");
    const good = await worker.fetch(new Request(HOST + p, { headers: human }), { DOWNLOADS: memoryKv({ [LIBRARY_INDEX_KEY]: JSON.stringify(packed()) }) }, {});
    assert.equal(good.status, 200, p);
    const doc = await good.json();
    assert.equal(doc.views, 120, p);
    assert.equal(doc.downloads, 34, p);
  }
});

test("(a) Softwares cards and hub say 'unavailable', never 0, when the index is missing", async () => {
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("no", { status: 404 });
  const catalog = { products: [{ slug: "aziel-corpus", name: "Aziel Corpus", version: "2.7.0" }] };
  const env = { AZIEL_RUNTIME: { async fetch() { return new Response(JSON.stringify(catalog), { headers: { "Content-Type": "application/json" } }); } } };
  try {
    for (const light of [true, false]) {
      const built = await loadSoftwareCatalog(env, unavailableStats({}), { light });
      const corpus = built.products.find((p) => p.slug === "aziel-corpus");
      assert.deepEqual(corpus.pills.filter((p) => /views|downloads/.test(p)), ["downloads unavailable", "views unavailable"]);
      assert.equal(built.hub.pills.some((p) => /^0 (views|downloads)$/.test(p)), false, built.hub.pills.join(","));
      assert.ok(built.hub.pills.includes("views unavailable"));
    }
  } finally { globalThis.fetch = prevFetch; }
  assert.deepEqual(parseCountPayload({ ok: false, code: "COUNTS_UNAVAILABLE", error: "counts temporarily unavailable" }), { downloads: null, views: null, uploads: null, unavailable: true });
  assert.deepEqual(countPills({}, { requireViewsDownloads: true, unavailable: true }), ["downloads unavailable", "views unavailable"]);
});

test("(a) homepage/search counters say unavailable on a missing index", async () => {
  const res = await worker.fetch(new Request(HOST + "/search", { headers: human }), { DOWNLOADS: memoryKv() }, {});
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /id="views">unavailable</);
  assert.match(html, /id="downloads">unavailable</);
  assert.doesNotMatch(html, /id="views">0</);
});

// (b)
test("(b) outage marker: set on quota/overload only, read back with cause, cleared", async () => {
  await withCache(async (cache) => {
    assert.equal(await noteOutage(new Error("some bug")), false);
    assert.equal(await readOutage(), null);
    await noteOutage(new Error(D1_DAILY));
    assert.deepEqual((await readOutage()).cause, "daily");
    await noteOutage(new Error("D1_ERROR: D1 DB is overloaded. Too many requests queued."));
    assert.equal((await readOutage()).cause, "outage");
    await clearOutage();
    assert.equal(await readOutage(), null);
    assert.equal(cache.store.has(OUTAGE_URL), false);
  });
});

test("(b) cached shelf/tree older than the revalidate window gets a Stale banner during a recorded D1 outage", async () => {
  await withCache(async (cache) => {
    const env = { DOWNLOADS: memoryKv({ [LIBRARY_INDEX_KEY]: JSON.stringify(packed()) }), DB: db({ error: D1_DAILY }) };
    const shelfKey = canonicalShelfCacheUrl("/aziel-library", {});
    const treeKey = HTML_CACHE_PREFIX + "/tree";
    const body = "<html><body><main><h1>Cached page</h1></main></body></html>";
    await putAged(cache, shelfKey, body, 2 * 3600e3);
    await putAged(cache, treeKey, body, 2 * 3600e3);

    // First hit: serves the cached copy; the background re-render fails and records the outage.
    const ctx = ctxCollector();
    const first = await worker.fetch(new Request(HOST + "/aziel-library", { headers: human }), env, ctx);
    assert.equal(first.status, 200);
    await first.text();
    await ctx.drain();
    assert.equal((await readOutage()).cause, "daily");

    for (const p of ["/aziel-library", "/tree"]) {
      const res = await worker.fetch(new Request(HOST + p, { headers: human }), env, ctxCollector());
      assert.equal(res.status, 200, p);
      assert.match(res.headers.get("X-Aziel-Stale") || "", /^cache; age-s=\d+/, p);
      assert.equal(res.headers.get("Cache-Control"), "no-store", p);
      const html = await res.text();
      assert.match(html, /Cached page/, p);
      assert.match(html, /Stale view/, p);
      assert.match(html, /a cached copy of this page/, p);
      assert.match(html, /data-stale-cause="daily-limit"/, p);
    }
  });
});

test("(b) no banner on a fresh cached copy, or on an old one with no outage recorded; success clears the marker", async () => {
  await withCache(async (cache) => {
    assert.equal(await cachedStaleNotice({ text: "x", ageMs: 60e3 }), "");
    assert.equal(await cachedStaleNotice({ text: "x", ageMs: 5 * 3600e3 }), "");
    await noteOutage(new Error(D1_DAILY));
    assert.equal(await cachedStaleNotice({ text: "x", ageMs: 60e3 }), "", "fresh copy: no banner");
    assert.match(await cachedStaleNotice({ text: "x", ageMs: 5 * 3600e3 }), /Stale view/);

    // A healthy background re-render clears the outage marker.
    const shelfKey = canonicalShelfCacheUrl("/aziel-library", {});
    await putAged(cache, shelfKey, "<html><body><main>old</main></body></html>", 2 * 3600e3);
    const rows = [{ record_id: "AZDOC-N1", title: "Nonblocking paper", library: "aziel", created_utc: "2026-10-01" }];
    const env = { DOWNLOADS: memoryKv({ [LIBRARY_INDEX_KEY]: JSON.stringify(packed()) }), DB: db({ rows }) };
    const ctx = ctxCollector();
    const res = await worker.fetch(new Request(HOST + "/aziel-library", { headers: human }), env, ctx);
    await res.text();
    await ctx.drain();
    assert.equal(await readOutage(), null);
  });
});

// (c)
test("(c) zero-result searches are cached for 5 min; non-empty searches are not", async () => {
  await withCache(async (cache) => {
    let d1Calls = 0;
    const base = db({ rows: [] });
    const counting = { prepare(sql) { d1Calls += 1; return base.prepare(sql); }, batch: base.batch };
    const env = { DOWNLOADS: memoryKv({ [LIBRARY_INDEX_KEY]: JSON.stringify(packed()) }), DB: counting };
    const first = await worker.fetch(new Request(HOST + "/search?q=zzznothing", { headers: human }), env, {});
    assert.equal(first.status, 200);
    await first.text();
    const key = emptySearchCacheUrl({ q: "zzznothing" });
    assert.ok(cache.store.has(key), "empty search cached");
    assert.equal(cache.store.get(key).headers["cache-control"], "public, max-age=300");
    const before = d1Calls;
    const second = await worker.fetch(new Request(HOST + "/search?q=zzznothing", { headers: human }), env, {});
    assert.equal(second.headers.get("X-Aziel-Cache"), "empty-search");
    await second.text();
    assert.equal(d1Calls, before, "cached empty search does no D1 work");

    // Older than 5 min: re-run.
    await putAged(cache, key, "<html>old</html>", 6 * 60e3);
    const third = await worker.fetch(new Request(HOST + "/search?q=zzznothing", { headers: human }), env, {});
    assert.equal(third.headers.get("X-Aziel-Cache"), null);
    await third.text();

    const rowsEnv = { DOWNLOADS: env.DOWNLOADS, DB: db({ rows: [{ record_id: "AZDOC-N1", title: "Florence", library: "aziel", created_utc: "2026-10-01" }] }) };
    const hit = await worker.fetch(new Request(HOST + "/search?q=Florence", { headers: human }), rowsEnv, {});
    await hit.text();
    assert.equal(cache.store.has(emptySearchCacheUrl({ q: "Florence" })), false, "non-empty search not cached");
  });
});

test("(c) the empty-render rule for shelf/tree still holds next to empty-search caching", async () => {
  await withCache(async (cache) => {
    const env = { DOWNLOADS: memoryKv({ [LIBRARY_INDEX_KEY]: JSON.stringify(packed()) }), DB: db({ rows: [] }) };
    for (const p of ["/aziel-library?q=zzznothing", "/tree"]) {
      const res = await worker.fetch(new Request(HOST + p, { headers: human }), env, {});
      await res.text();
    }
    const keys = [...cache.store.keys()].map((k) => new URL(k).pathname);
    assert.equal(keys.some((k) => /aziel-library|\/tree$/.test(k)), false, keys.join(","));
  });
});

// (d)
test("(d) paper counts line names the real source, not data-source=\"kv\"", () => {
  const html = renderPaperReader({
    row: { record_id: "AZDOC-N1", title: "Nonblocking paper", library: "aziel" },
    counts: { available: true, views: 5, downloads: 2, source: "kv+d1+do" },
  });
  assert.match(html, /class="paper-counts" data-source="kv\+d1\+do" data-views="5" data-downloads="2"/);
  assert.doesNotMatch(html, /data-source="kv"/);
  const fallback = renderPaperReader({ row: { record_id: "AZDOC-N1", title: "x" }, counts: { views: 1, downloads: 1 } });
  assert.match(fallback, /data-source="kv\+d1\+do"/);
});
