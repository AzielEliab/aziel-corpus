import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildExtractionBag,
  readableBodyPrefix,
  extractCoordinatePairs,
  paperDateMentions,
  zioncheckTitleSeed,
  extractEventsForText,
  derivedTextForRecord,
  continueVerifyGeo,
  normName,
} from "./geo.js";

const SEATTLE = {
  name: "Seattle",
  asciiname: "Seattle",
  lat: 47.60621,
  lon: -122.33207,
  geonameid: 5809844,
  alias_norm: "seattle",
  population: 737015,
  country_code: "US",
  admin1: "WA",
  feature_code: "PPL",
};

async function resolveSeattle(name) {
  return normName(name) === "seattle" ? SEATTLE : null;
}

function mockEnv() {
  const events = [];
  function stmt(sql) {
    const self = {
      _sql: sql,
      _args: [],
      bind(...args) {
        self._args = args;
        return self;
      },
      async first() {
        return null;
      },
      async all() {
        return { results: [] };
      },
      async run() {
        if (/INSERT OR IGNORE INTO events/.test(sql)) events.push(rowFromInsert(self._args));
        return { success: true };
      },
    };
    return self;
  }
  return {
    events,
    DB: {
      prepare: (sql) => stmt(sql),
      async batch(stmts) {
        for (const s of stmts) await s.run();
      },
    },
  };
}

function rowFromInsert(args) {
  return {
    event_id: args[0],
    event_date: args[1],
    place_name: args[2],
    lat: args[3],
    lon: args[4],
    title: args[5],
    record_id: args[6],
    created_by: args[7],
    created_utc: args[8],
    confidence: args[9],
    source: args[10],
    status: args[11],
  };
}

test("extraction bag is title + subjects + keywords + author + domain + filename + readable body, never upload time", () => {
  const bag = buildExtractionBag({
    title: "Marion A. Zioncheck Visual Archive Vol 1",
    subjects: "Marion Zioncheck, investigation",
    keywords: "Zioncheck, evidence, archive",
    author: "Aziel Eliab",
    domain: "history",
    filename: "Marion_A_Zioncheck_Visual_Archive_Vol_1.pdf",
    body: "Author note\n%PDF-1.4\x00\x01\x02 binary Seattle-should-not-need-the-stream",
    created_utc: "2026-09-04T17:00:00.000Z",
  }, "OCR: funeral in Seattle August 1936");
  assert.match(bag, /Marion A\. Zioncheck Visual Archive Vol 1/);
  assert.match(bag, /investigation/);
  assert.match(bag, /evidence/);
  assert.match(bag, /Aziel Eliab/);
  assert.match(bag, /history/);
  assert.match(bag, /Marion_A_Zioncheck_Visual_Archive_Vol_1\.pdf/);
  assert.match(bag, /Author note/);
  assert.match(bag, /OCR: funeral in Seattle August 1936/);
  assert.doesNotMatch(bag, /2026-09-04T17:00:00/);
  assert.doesNotMatch(bag, /%PDF-1\.4/);
});

test("readable body prefix keeps metadata and drops PDF binary marker", () => {
  const text = readableBodyPrefix("Cover sheet Seattle\n%PDF-1.4\x00\x01\xff(Hello world string)");
  assert.match(text, /Cover sheet Seattle/);
  assert.doesNotMatch(text, /%PDF-1\.4/);
  assert.match(text, /Hello world string/);
});

test("explicit lat/lon pair is extracted; unlabeled Prime-Meridian noise is not invented", () => {
  const hits = extractCoordinatePairs("Stake at 47.6062, -122.3321 and table 40.0000,0.0000 plus lat 51.5 lon -0.12");
  assert.ok(hits.some((h) => Math.abs(h.lat - 47.6062) < 1e-6 && Math.abs(h.lon + 122.3321) < 1e-6));
  assert.ok(hits.some((h) => Math.abs(h.lat - 51.5) < 1e-6 && Math.abs(h.lon + 0.12) < 1e-6 && h.labeled));
  assert.ok(!hits.some((h) => Math.abs(h.lat - 40) < 1e-6 && Math.abs(h.lon) < 1e-6));
});

test("paper dates reject far-future year tokens such as 2099", () => {
  const dates = paperDateMentions("Build guide 2099 and August 1936");
  assert.ok(dates.some((d) => d.date === "1936-08"));
  assert.ok(!dates.some((d) => String(d.date).startsWith("2099")));
});

test("coordinate pair + paper date creates a Map pin (never upload time)", async () => {
  const env = mockEnv();
  const n = await extractEventsForText(env, {
    recordId: "AZDOC-TESTCOORD",
    title: "Field survey notebook",
    body: "Survey stake at 47.6062, -122.3321 on August 1936.",
    createdBy: "test",
    skipGazetteer: true,
    resolve: async () => null,
  });
  assert.equal(n, 1);
  assert.equal(env.events.length, 1);
  const e = env.events[0];
  assert.equal(e.event_date, "1936-08");
  assert.equal(e.source, "AUTO_COORD");
  assert.ok(Math.abs(e.lat - 47.6062) < 1e-6);
  assert.ok(Math.abs(e.lon + 122.3321) < 1e-6);
  assert.doesNotMatch(String(e.event_date), /^2026-09/);
  assert.match(e.place_name, /47\.6062/);
});

test("Zioncheck-like title seed optionally pins Seattle × 1936-08 via gazetteer resolveUnique", async () => {
  const hint = zioncheckTitleSeed({
    title: "Marion A. Zioncheck Visual Archive Vol 1 — Primary Documents",
    filename: "Marion_A_Zioncheck_Visual_Archive_Vol_1.pdf",
    subjects: "Marion Zioncheck, investigation",
  });
  assert.ok(hint);
  assert.equal(hint.date, "1936-08");
  assert.equal(hint.placeName, "Seattle");
  const env = mockEnv();
  const n = await extractEventsForText(env, {
    recordId: "AZDOC-ZIONSEED",
    title: "Marion A. Zioncheck Visual Archive Vol 1 — Primary Documents",
    filename: "Marion_A_Zioncheck_Visual_Archive_Vol_1.pdf",
    body: "%PDF-1.4\x00\x01 no searchable place names",
    skipGazetteer: true,
    resolve: resolveSeattle,
  });
  assert.ok(n >= 1);
  const seed = env.events.find((e) => e.source === "AUTO_SEED");
  assert.ok(seed);
  assert.equal(seed.event_date, "1936-08");
  assert.equal(seed.place_name, "Seattle");
  assert.ok(Math.abs(seed.lat - 47.60621) < 1e-5);
  assert.ok(Math.abs(seed.lon + 122.33207) < 1e-5);
});

test("no pin without a paper date, even when a unique place resolves", async () => {
  const env = mockEnv();
  const n = await extractEventsForText(env, {
    recordId: "AZDOC-NODATE",
    title: "Notes from Uyo",
    body: "Visited Uyo. No year is written here.",
    createdBy: "test",
    skipGazetteer: true,
    resolve: async (name) => (normName(name) === "uyo" ? { name: "Uyo", asciiname: "Uyo", lat: 5.05, lon: 7.93, geonameid: 2320346 } : null),
  });
  assert.equal(n, 0);
  assert.equal(env.events.length, 0);
});

test("created_utc upload time does not mint a pin", async () => {
  const env = mockEnv();
  const n = await extractEventsForText(env, {
    recordId: "AZDOC-UPLOAD",
    title: "Seattle field folder",
    body: "Seattle is mentioned with no paper date.",
    filename: "folder.pdf",
    skipGazetteer: true,
    resolve: resolveSeattle,
  });
  assert.equal(n, 0);
  assert.equal(env.events.length, 0);
});

test("OCR / derived extra text in the bag can supply the missing place+date", async () => {
  const env = mockEnv();
  const n = await extractEventsForText(env, {
    recordId: "AZDOC-OCR",
    title: "Scanned affidavit",
    filename: "affidavit.pdf",
    body: "%PDF-1.4\x00 binary only",
    extraText: "The hearing was held in Seattle in August 1936.",
    skipGazetteer: true,
    resolve: resolveSeattle,
  });
  assert.ok(n >= 1);
  const ev = env.events.find((e) => e.place_name === "Seattle" && e.event_date === "1936-08");
  assert.ok(ev);
  assert.ok(ev.source === "AUTO_SENTENCE" || ev.source === "AUTO_CONTEXT" || ev.source === "AUTO_DOCUMENT");
});

test("derivedTextForRecord prefers note slices and skips FILES when loadObjects is false", async () => {
  const note = "OCR note: funeral in Seattle August 1936. " + "x".repeat(12000);
  let filesGets = 0;
  const env = {
    FILES: {
      head: async () => ({ size: 1 }),
      get: async () => {
        filesGets += 1;
        throw new Error("FILES object load should be skipped");
      },
    },
    DB: {
      prepare(sql) {
        const self = { _args: [], bind(...a) { self._args = a; return self; } };
        self.all = async () => {
          if (/media_runs/.test(sql)) {
            return { results: [{ transcript: "transcript slice " + "t".repeat(12000) }] };
          }
          if (/ocr_jobs/.test(sql)) {
            return { results: [{ result: "ocr job " + "o".repeat(12000) }] };
          }
          if (/derived_artifacts/.test(sql)) {
            return { results: [{ artifact_type: "TEXT_EXTRACT", note, object_key: "derived/AZDOC-X/AZDER-1.txt" }] };
          }
          return { results: [] };
        };
        self.first = async () => null;
        self.run = async () => ({ success: true });
        return self;
      },
      async batch() {},
    },
  };
  const text = await derivedTextForRecord(env, "AZDOC-X", { loadObjects: false });
  assert.ok(text.includes("Seattle"));
  assert.ok(text.includes("transcript slice"));
  assert.ok(!text.includes("x".repeat(9000)), "note slice is capped");
  assert.ok(!text.includes("t".repeat(9000)), "transcript slice is capped");
  assert.equal(filesGets, 0);
});

test("continueVerifyGeo advances cursor before extract and walks LIMIT 1 without FILES loads", async () => {
  const records = [
    { record_id: "AZDOC-AAA", title: "First", body: "no geo", author: "", domain: "", subjects: "", keywords: "", filename: "a.pdf" },
    { record_id: "AZDOC-BBB", title: "Second", body: "no geo", author: "", domain: "", subjects: "", keywords: "", filename: "b.pdf" },
  ];
  const metadata = {};
  const ops = [];
  let filesGets = 0;
  const env = {
    FILES: {
      head: async () => ({ size: 1 }),
      get: async () => {
        filesGets += 1;
        throw new Error("verify-geo must not load FILES objects");
      },
    },
    DB: {
      prepare(sql) {
        const self = { _sql: sql, _args: [], bind(...a) { self._args = a; return self; } };
        self.first = async () => {
          if (/COUNT\(\*\) AS n FROM places/.test(sql)) return { n: 999999 };
          if (/COUNT\(\*\) AS n FROM records/.test(sql)) return { n: records.length };
          if (/COUNT\(\*\) AS n FROM events/.test(sql)) return { n: 0 };
          if (/FROM metadata WHERE key/.test(sql)) {
            const v = metadata[self._args[0]];
            return v != null ? { value: v } : null;
          }
          if (/FROM records WHERE record_id=\?/.test(sql) && /\bbody\b/.test(sql)) {
            const rec = records.find((r) => r.record_id === self._args[0]);
            if (rec && rec.binaryFail) throw new Error("BLOB");
            return rec ? { body: rec.body } : null;
          }
          return null;
        };
        self.all = async () => {
          if (/FROM records/.test(sql) && /LIMIT 1/.test(sql)) {
            ops.push("select:" + (self._args[0] || "start"));
            assert.doesNotMatch(sql, /substr\s*\(\s*body/i);
            assert.match(sql, /LIMIT 1/);
            if (/record_id>\?/.test(sql)) {
              const after = self._args[0];
              return { results: records.filter((r) => r.record_id > after).slice(0, 1) };
            }
            return { results: records.slice(0, 1) };
          }
          if (/media_runs|ocr_jobs|derived_artifacts/.test(sql)) {
            ops.push("derived:" + self._args[0]);
            return { results: [{ artifact_type: "TEXT_EXTRACT", note: "lenses zero\nshort", object_key: "derived/AZDOC-AAA/x.txt" }] };
          }
          return { results: [] };
        };
        self.run = async () => {
          if (/INSERT OR REPLACE INTO metadata/.test(sql)) {
            metadata[self._args[0]] = self._args[1];
            if (self._args[0] === "geo_verify_cursor") ops.push("cursor:" + self._args[1]);
          }
          return { success: true };
        };
        return self;
      },
      async batch() {},
    },
  };
  const report = await continueVerifyGeo(env, { ms: 8000, force: true });
  assert.equal(filesGets, 0);
  assert.ok(report.ok);
  const firstCursor = ops.findIndex((x) => x === "cursor:AZDOC-AAA");
  const firstDerived = ops.findIndex((x) => x.startsWith("derived:AZDOC-AAA"));
  assert.ok(firstCursor >= 0, "cursor written for first record");
  assert.ok(firstDerived >= 0, "derived text loaded for first record");
  assert.ok(firstCursor < firstDerived, "cursor advances before extract so a hung record cannot freeze the walk");
  assert.ok(ops.some((x) => x === "select:AZDOC-AAA"), "next chunk uses record_id>? not the same first row");
  assert.equal(metadata.geo_verify_done_utc && metadata.geo_verify_done_utc.length > 0, true);
});

test("continueVerifyGeo walks past a binary PDF body that fails CAST/SELECT", async () => {
  const records = [
    { record_id: "AZDOC-BIN", title: "Scanned PDF", body: "%PDF-1.4", binaryFail: true, filename: "scan.pdf" },
    { record_id: "AZDOC-OK", title: "Seattle notes August 1936", body: "Meeting in Seattle in August 1936.", filename: "note.txt" },
  ];
  const metadata = {};
  const env = {
    DB: {
      prepare(sql) {
        const self = { _sql: sql, _args: [], bind(...a) { self._args = a; return self; } };
        self.first = async () => {
          if (/COUNT\(\*\) AS n FROM places/.test(sql)) return { n: 999999 };
          if (/COUNT\(\*\) AS n FROM records/.test(sql)) return { n: records.length };
          if (/COUNT\(\*\) AS n FROM events/.test(sql)) return { n: 0 };
          if (/FROM metadata WHERE key/.test(sql)) {
            const v = metadata[self._args[0]];
            return v != null ? { value: v } : null;
          }
          if (/FROM records WHERE record_id=\?/.test(sql) && /\bbody\b/.test(sql)) {
            const rec = records.find((r) => r.record_id === self._args[0]);
            if (!rec) return null;
            if (rec.binaryFail) throw new Error("cannot CAST BLOB");
            return { body: rec.body };
          }
          return null;
        };
        self.all = async () => {
          if (/FROM records/.test(sql) && /LIMIT 1/.test(sql)) {
            assert.doesNotMatch(sql, /substr\s*\(\s*body/i);
            if (/record_id>\?/.test(sql)) {
              return { results: records.filter((r) => r.record_id > self._args[0]).slice(0, 1) };
            }
            return { results: records.slice(0, 1) };
          }
          return { results: [] };
        };
        self.run = async () => {
          if (/INSERT OR REPLACE INTO metadata/.test(sql)) metadata[self._args[0]] = self._args[1];
          if (/INSERT OR IGNORE INTO events/.test(sql)) {
            /* extract may insert */
          }
          return { success: true };
        };
        return self;
      },
      async batch() {},
    },
  };
  const report = await continueVerifyGeo(env, { ms: 8000, force: true });
  assert.equal(report.failed, 0);
  assert.ok(report.scanned >= 2);
  assert.ok(report.done);
});
