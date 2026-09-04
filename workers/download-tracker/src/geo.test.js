import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildExtractionBag,
  readableBodyPrefix,
  extractCoordinatePairs,
  paperDateMentions,
  zioncheckTitleSeed,
  extractEventsForText,
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
