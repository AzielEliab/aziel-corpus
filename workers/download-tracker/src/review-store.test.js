import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SHELF_REBUILD_MS,
  SHELF_SYNC_CHUNK,
  SHELF_SYNC_CHUNK_MAX,
  SHELF_SYNC_CURSOR_KEY,
  SHELF_SYNC_DONE_KEY,
  continueFullBackfill,
  syncShelfScores,
} from "./review-store.js";
import { LIBRARY_INDEX_KEY } from "./library-index.js";
import { handleRuntimeApi } from "./runtime.js";
import { shouldBackgroundWalk } from "./index.js";
import { shelfScoreRows } from "./ui.js";
import { notApplicableZsolver, seedBaselineZsolver } from "./zsolver.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;

function seedJson() {
  return JSON.stringify(seedBaselineZsolver());
}
function naJson() {
  return JSON.stringify(notApplicableZsolver("not applicable for philosophy"));
}
function scoredJson(display) {
  return JSON.stringify({
    engine: "zsolver",
    product: "zsolver",
    author: "Aziel Eliab",
    capped_confidence: display / 100,
    display,
    status: "scored",
    applicable: true,
    seed_corpus: false,
    baseline: false,
    source: "zsolver-live",
  });
}

function sampleRecords() {
  return [
    {
      record_id: "AZDOC-A",
      title: "Marion A. Zioncheck Visual Archive Vol 1 — Primary Documents",
      filename: "zioncheck-vol-1.pdf",
      subjects: "history, investigation",
      keywords: "zioncheck",
      domain: "history",
      author: "Aziel Eliab",
      library: "aziel",
      content_sha256: "aa",
      chain_tip: "tip-a",
      created_utc: "2026-01-01T00:00:00Z",
      triad_combined: 0.79,
      zsolver_score: 0.75,
      zsolver_status: "scored",
      zsolver_json: seedJson(),
      lattice_tip_json: JSON.stringify({ schema: "aziel.lattice.anchor.v1", record_id: "AZDOC-A" }),
    },
    {
      record_id: "AZDOC-B",
      title: "The Cockroach Doctrine: A Resilience Doctrine for Remaining Operational",
      filename: "cockroach.md",
      subjects: "philosophy, doctrine",
      keywords: "doctrine",
      domain: "philosophy",
      author: "Aziel Eliab",
      library: "aziel",
      content_sha256: "bb",
      chain_tip: "tip-b",
      created_utc: "2026-01-02T00:00:00Z",
      triad_combined: 0.58,
      zsolver_score: null,
      zsolver_status: "not_applicable",
      zsolver_json: naJson(),
      lattice_tip_json: JSON.stringify({ schema: "aziel.lattice.anchor.v1", record_id: "AZDOC-B" }),
    },
    {
      record_id: "AZDOC-C",
      title: "The Xerxes Curse",
      filename: "xerxes.md",
      subjects: "history",
      keywords: "research",
      domain: "history",
      author: "Aziel Eliab",
      library: "corpus",
      content_sha256: "cc",
      chain_tip: "tip-c",
      created_utc: "2026-01-03T00:00:00Z",
      triad_combined: 0.66,
      zsolver_score: 0.6,
      zsolver_status: "scored",
      zsolver_json: scoredJson(60),
      lattice_tip_json: JSON.stringify({ schema: "aziel.lattice.anchor.v1", record_id: "AZDOC-C" }),
    },
    {
      record_id: "AZDOC-D",
      title: "County blotter notes",
      filename: "blotter.md",
      subjects: "investigation, crime",
      keywords: "crime",
      domain: "crime",
      author: "Aziel Eliab",
      library: "corpus",
      content_sha256: "dd",
      chain_tip: "tip-d",
      created_utc: "2026-01-04T00:00:00Z",
      triad_combined: 0.7,
      zsolver_score: 0.4,
      zsolver_status: "scored",
      zsolver_json: scoredJson(40),
      lattice_tip_json: JSON.stringify({ schema: "aziel.lattice.anchor.v1", record_id: "AZDOC-D" }),
    },
    {
      record_id: "AZDOC-E",
      title: "Archive research memo",
      filename: "memo.md",
      subjects: "research",
      keywords: "history",
      domain: "research",
      author: "Aziel Eliab",
      library: "corpus",
      content_sha256: "ee",
      chain_tip: "tip-e",
      created_utc: "2026-01-05T00:00:00Z",
      triad_combined: 0.72,
      zsolver_score: 0.5,
      zsolver_status: "scored",
      zsolver_json: scoredJson(50),
      lattice_tip_json: JSON.stringify({ schema: "aziel.lattice.anchor.v1", record_id: "AZDOC-E" }),
    },
  ];
}

function memoryKv() {
  const store = new Map();
  return {
    store,
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
    async list() {
      throw new Error("KV.list forbidden on rebuild path");
    },
  };
}

function memoryCache() {
  const store = new Map();
  return {
    store,
    async match(req) {
      const url = typeof req === "string" ? req : req.url;
      const hit = store.get(url);
      return hit ? new Response(hit, { headers: { "Content-Type": "application/json" } }) : undefined;
    },
    async put(req, res) {
      const url = typeof req === "string" ? req : req.url;
      store.set(url, await res.text());
    },
  };
}

function mockEnv(records, { metadata = {} } = {}) {
  const sqlLog = [];
  const kv = memoryKv();
  const cache = memoryCache();
  const env = {
    DOWNLOADS: kv,
    sqlLog,
    metadata,
    records,
    cache,
    DB: {
      prepare(sql) {
        const self = { _sql: sql, _args: [] };
        self.bind = (...args) => {
          self._args = args;
          return self;
        };
        self.first = async () => {
          sqlLog.push("first:" + sql);
          if (/COUNT\(\*\) AS n FROM records/.test(sql)) return { n: records.length };
          if (/FROM metadata WHERE key/.test(sql)) {
            const v = metadata[self._args[0]];
            return v != null ? { value: v } : null;
          }
          if (/SELECT lattice_tip_json FROM records WHERE record_id=\?/.test(sql)) {
            const rec = records.find((r) => r.record_id === self._args[0]);
            return rec ? { lattice_tip_json: rec.lattice_tip_json } : null;
          }
          if (/SELECT tip_json FROM lattice_tips/.test(sql)) {
            const rec = records.find((r) => r.record_id === self._args[0]);
            return rec && rec.lattice_tip_json ? { tip_json: rec.lattice_tip_json } : null;
          }
          if (/SELECT zsolver_json FROM records WHERE record_id=\?/.test(sql)) {
            const rec = records.find((r) => r.record_id === self._args[0]);
            return rec ? { zsolver_json: rec.zsolver_json } : null;
          }
          if (/FROM ledger/.test(sql) || /FROM document_ledger/.test(sql)) return null;
          return null;
        };
        self.all = async () => {
          sqlLog.push("all:" + sql);
          if (/FROM records/.test(sql)) {
            const unlimited = /FROM records/.test(sql) && !/LIMIT\s+\?/.test(sql) && !/LIMIT\s+\d+/.test(sql);
            if (unlimited && /SELECT record_id/.test(sql)) {
              throw new Error("rebuild must not SELECT all records without LIMIT");
            }
            let rows = records.slice();
            if (/record_id>\?/.test(sql)) {
              rows = rows.filter((r) => r.record_id > self._args[0]);
            }
            const limArg = /record_id>\?/.test(sql) ? self._args[1] : self._args[0];
            const lim = Number(limArg);
            if (Number.isFinite(lim) && lim > 0) rows = rows.slice(0, lim);
            if (/ORDER BY created_utc DESC/.test(sql)) {
              rows = rows.slice().sort((a, b) => String(b.created_utc).localeCompare(String(a.created_utc)));
            } else {
              rows = rows.slice().sort((a, b) => String(a.record_id).localeCompare(String(b.record_id)));
            }
            return { results: rows };
          }
          return { results: [] };
        };
        self.run = async () => {
          sqlLog.push("run:" + sql);
          if (/INSERT OR REPLACE INTO metadata/.test(sql)) {
            metadata[self._args[0]] = self._args[1];
          }
          if (/UPDATE records SET lattice_tip_json=\?/.test(sql)) {
            const rec = records.find((r) => r.record_id === self._args[1]);
            if (rec) rec.lattice_tip_json = self._args[0];
          }
          if (/UPDATE lattice_tips SET tip_json=\?/.test(sql)) {
            const rec = records.find((r) => r.record_id === self._args[1]);
            if (rec) rec.lattice_tip_json = self._args[0];
          }
          return { success: true };
        };
        return self;
      },
      async batch() {},
    },
  };
  return env;
}

function packedRecords(env) {
  const raw = env.DOWNLOADS.store.get(LIBRARY_INDEX_KEY);
  assert.ok(raw, "packed library:index:v1 should be written");
  const doc = JSON.parse(raw);
  return doc.records || [];
}

test("syncShelfScores chunks by cursor and does not load the whole table", async () => {
  const env = mockEnv(sampleRecords());
  const first = await syncShelfScores(env, { limit: 2, cache: env.cache, resume: false, force: true });
  assert.equal(first.ok, true);
  assert.equal(first.author, "Aziel Eliab");
  assert.equal(first.processed, 2);
  assert.equal(first.done, false);
  assert.equal(first.next_cursor, "AZDOC-B");
  assert.ok(first.total >= 5);
  assert.doesNotMatch(JSON.stringify(first), BANNED);
  const unlimited = env.sqlLog.filter((s) => /all:SELECT .* FROM records/.test(s) && !/LIMIT/.test(s));
  assert.equal(unlimited.length, 0);

  const packed = packedRecords(env);
  assert.equal(packed.length, 5);
  const byId = Object.fromEntries(packed.map((r) => [r.record_id, r]));
  assert.equal(byId["AZDOC-A"].zsolver_display, 75);
  assert.equal(byId["AZDOC-A"].triad_display, 79);
  assert.equal(byId["AZDOC-C"].zsolver_display, 60);
  assert.equal(byId["AZDOC-D"].zsolver_display, 40);
  assert.equal(byId["AZDOC-E"].zsolver_display, 50);
  assert.equal("zsolver_display" in byId["AZDOC-B"], false);
  const seedRows = shelfScoreRows(byId["AZDOC-A"]);
  assert.doesNotMatch(seedRows.zRow, /pending backfill/);
  const philoRows = shelfScoreRows(byId["AZDOC-B"]);
  assert.equal(philoRows.zRow, "");
  const histRows = shelfScoreRows(byId["AZDOC-C"]);
  assert.doesNotMatch(histRows.zRow, /pending backfill/);
});

test("repeating syncShelfScores with cursor then finishes", async () => {
  const env = mockEnv(sampleRecords());
  const first = await syncShelfScores(env, { limit: 2, cache: env.cache, resume: false, force: true });
  const second = await syncShelfScores(env, { limit: 2, cursor: first.next_cursor, cache: env.cache });
  assert.equal(second.processed, 2);
  assert.equal(second.done, false);
  assert.equal(second.next_cursor, "AZDOC-D");
  const last = await syncShelfScores(env, { limit: 2, cursor: second.next_cursor, cache: env.cache });
  assert.equal(last.done, true);
  assert.equal(last.next_cursor, "");
  assert.ok(last.processed >= 1);
  assert.ok(env.metadata[SHELF_SYNC_DONE_KEY]);
  assert.equal(env.metadata[SHELF_SYNC_CURSOR_KEY] || "", "");
});

test("resume without cursor continues the stored page", async () => {
  const env = mockEnv(sampleRecords());
  const first = await syncShelfScores(env, { limit: 2, cache: env.cache, force: true });
  assert.equal(first.next_cursor, "AZDOC-B");
  const second = await syncShelfScores(env, { limit: 2, cache: env.cache, resume: true });
  assert.equal(second.cursor, "AZDOC-D");
  assert.equal(second.done, false);
});

test("already-done rebuild refreshes packed shelf without re-walking rows", async () => {
  const env = mockEnv(sampleRecords(), {
    metadata: { [SHELF_SYNC_DONE_KEY]: "2026-09-12T00:00:00Z" },
  });
  const report = await syncShelfScores(env, { cache: env.cache, resume: true });
  assert.equal(report.done, true);
  assert.equal(report.processed, 0);
  assert.equal(report.packed, 5);
  const packed = packedRecords(env);
  assert.equal(packed.find((r) => r.record_id === "AZDOC-A").zsolver_display, 75);
  const walked = env.sqlLog.filter((s) => /all:SELECT record_id, title, filename/.test(s));
  assert.equal(walked.length, 0);
});

test("GET /v1/verify-backfill?rebuild=1 returns a prompt JSON page", async () => {
  const env = mockEnv(sampleRecords());
  const res = await handleRuntimeApi(
    new Request("https://www.azielcorpuslibrary.net/v1/verify-backfill?rebuild=1&limit=2&force=1"),
    new URL("https://www.azielcorpuslibrary.net/v1/verify-backfill?rebuild=1&limit=2&force=1"),
    env
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.rebuild, true);
  assert.equal(body.done, false);
  assert.equal(body.next_cursor, "AZDOC-B");
  assert.equal(body.shelf.processed, 2);
  assert.equal(body.packed_refresh, "inline");
  assert.match(body.note, /cursor=/);
  assert.match(body.limitation, /Aziel Eliab/);
  assert.doesNotMatch(JSON.stringify(body), BANNED);

  const nextUrl = "https://www.azielcorpuslibrary.net/v1/verify-backfill?rebuild=1&limit=2&cursor=" + body.next_cursor;
  const res2 = await handleRuntimeApi(new Request(nextUrl), new URL(nextUrl), env);
  const body2 = await res2.json();
  assert.equal(body2.ok, true);
  assert.equal(body2.rebuild, true);
  assert.equal(body2.done, false);
});

test("rebuild with ctx.waitUntil returns JSON before packed refresh", async () => {
  const env = mockEnv(sampleRecords());
  const jobs = [];
  const ctx = {
    waitUntil(p) {
      jobs.push(p);
    },
  };
  const res = await handleRuntimeApi(
    new Request("https://www.azielcorpuslibrary.net/v1/verify-backfill?rebuild=1&limit=2&force=1"),
    new URL("https://www.azielcorpuslibrary.net/v1/verify-backfill?rebuild=1&limit=2&force=1"),
    env,
    ctx
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.rebuild, true);
  assert.equal(body.packed_refresh, "deferred");
  assert.equal(body.shelf.processed, 2);
  assert.equal(body.done, false);
  assert.equal(jobs.length, 1);
  assert.equal(env.DOWNLOADS.store.has(LIBRARY_INDEX_KEY), false, "packed write must not block the JSON response");
  await jobs[0];
  const packed = packedRecords(env);
  assert.equal(packed.find((r) => r.record_id === "AZDOC-A").zsolver_display, 75);
  assert.doesNotMatch(JSON.stringify(body), BANNED);
});

test("shouldBackgroundWalk skips verify-backfill and verify-geo", () => {
  assert.equal(shouldBackgroundWalk("/v1/verify-backfill"), false);
  assert.equal(shouldBackgroundWalk("/v1/verify-geo"), false);
  assert.equal(shouldBackgroundWalk("/v1/health"), true);
  assert.equal(shouldBackgroundWalk("/"), true);
});

test("chunk constants stay inside Worker-safe bounds", () => {
  assert.equal(SHELF_SYNC_CHUNK, 25);
  assert.equal(SHELF_SYNC_CHUNK_MAX, 50);
  assert.equal(SHELF_REBUILD_MS, 4000);
});

test("background continueFullBackfill does not refresh packed while shelf is in progress", async () => {
  const env = mockEnv(sampleRecords(), {
    metadata: {
      full_backfill_done_utc: "2026-09-12T00:00:00Z",
      succession_backfill_utc: "2026-09-12T00:00:00Z",
    },
  });
  const report = await continueFullBackfill(env, { ms: 4000, all: false, background: true });
  assert.equal(report.done, true);
  assert.ok(report.shelf);
  assert.equal(env.DOWNLOADS.store.has(LIBRARY_INDEX_KEY), false);
});

test("continueFullBackfill skips shelf walk once scoring and shelf are done", async () => {
  const env = mockEnv(sampleRecords(), {
    metadata: {
      full_backfill_done_utc: "2026-09-12T00:00:00Z",
      succession_backfill_utc: "2026-09-12T00:00:00Z",
      [SHELF_SYNC_DONE_KEY]: "2026-09-12T00:00:00Z",
    },
  });
  const report = await continueFullBackfill(env, { ms: 18000, all: false });
  assert.equal(report.done, true);
  assert.equal(report.shelf.done, true);
  assert.equal(report.shelf.skipped, true);
  const walked = env.sqlLog.filter((s) => /all:SELECT record_id, title, filename/.test(s));
  assert.equal(walked.length, 0);
});
