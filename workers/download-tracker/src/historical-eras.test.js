import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleHosted } from "./hosted.js";
import { mapBody } from "./hosted-pages.js";
import {
  historicalGeojson,
  historicalLayers,
  historicalStatus,
  LAYER_CAP,
} from "./geo.js";
import {
  BUNDLED_ERAS,
  BUNDLED_YEARS,
  LAYER_CAP_BYTES,
  eraHonesty,
  loadBundledEraCollection,
  nearestBundledEra,
} from "./historical-eras.js";

const HOST = "https://www.azielcorpuslibrary.net";
const ERA_DIR = join(dirname(fileURLToPath(import.meta.url)), "../public/historical");

function sheetBytes(file) {
  return readFileSync(join(ERA_DIR, file));
}

function stubAssets(fetches) {
  return {
    async fetch(request) {
      const name = new URL(request.url).pathname.split("/").filter(Boolean).pop();
      if (fetches) fetches.push(new URL(request.url).pathname);
      try {
        const body = sheetBytes(name);
        return new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/geo+json" },
        });
      } catch {
        return new Response("missing", { status: 404 });
      }
    },
  };
}

function stubEnv() {
  const queries = [];
  function stmt(sql) {
    const self = {
      bind() { return self; },
      async run() { return { success: true }; },
      async first() {
        if (/FROM places/i.test(sql)) return { n: 10000000 };
        if (/FROM historical_layers/i.test(sql)) return { n: 0, f: 0 };
        return { n: 1 };
      },
      async all() {
        if (/FROM records/i.test(sql) && /body/i.test(sql)) return new Promise(() => {});
        return { results: [] };
      },
    };
    return self;
  }
  return {
    queries,
    ASSETS: stubAssets(),
    DB: {
      prepare(sql) {
        queries.push(sql);
        return stmt(sql);
      },
      async batch() { return []; },
    },
  };
}

function req(path) {
  return new Request(HOST + path, { method: "GET", headers: { Accept: "text/html" } });
}

test("bundled sheets are exactly 1914, 1945, 1994, and 2010 under the 1MB cap", () => {
  assert.deepEqual(BUNDLED_YEARS.slice(), [1914, 1945, 1994, 2010]);
  assert.equal(LAYER_CAP_BYTES, LAYER_CAP);
  assert.equal(BUNDLED_ERAS.length, 4);
  for (const era of BUNDLED_ERAS) {
    const bytes = sheetBytes(era.file);
    assert.equal(bytes.length, era.bytes);
    assert.ok(bytes.length <= LAYER_CAP, era.file);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), era.sha256);
    const fc = JSON.parse(bytes.toString("utf8"));
    assert.equal(fc.type, "FeatureCollection");
    assert.equal(Number(fc.year), era.year);
    assert.equal(fc.source, "aourednik/historical-basemaps");
    assert.equal(fc.features.length, era.feature_count);
    for (const feature of fc.features) {
      const kind = feature.geometry && feature.geometry.type;
      assert.ok(kind === "Polygon" || kind === "MultiPolygon");
    }
  }
});

test("nearest sheet matches 4dmap and labels a year that is not the sheet", () => {
  assert.equal(nearestBundledEra(1914), 1914);
  assert.equal(nearestBundledEra(1930), 1945);
  assert.equal(nearestBundledEra(1502), 1914);
  assert.equal(nearestBundledEra(1), 1914);
  assert.equal(nearestBundledEra(2010), 2010);
  assert.equal(nearestBundledEra(2026), 2010);
  const mismatch = eraHonesty(1930, 1945);
  assert.equal(mismatch.year_matches_sheet, false);
  assert.match(mismatch.honesty, /1930/);
  assert.match(mismatch.honesty, /1945/);
  assert.match(mismatch.honesty, /nearest public borders: 1945/);
  const match = eraHonesty(2010, 2010);
  assert.equal(match.year_matches_sheet, true);
  assert.doesNotMatch(match.honesty, /nearest public borders/);
});

test("GET /api/historical returns the nearest bundled sheet and does not invent other eras", async () => {
  const env = stubEnv();
  const off = await historicalGeojson(env, "1930");
  assert.equal(off.sheet_year, 1945);
  assert.equal(off.requested_year, 1930);
  assert.equal(off.year_matches_sheet, false);
  assert.equal(off.topography, false);
  assert.equal(off.license, "GPL-3.0");
  assert.equal(off.source, "aourednik/historical-basemaps");
  assert.deepEqual(off.bundled_eras, [1914, 1945, 1994, 2010]);
  assert.equal(off.bundled_feature_count, 227);
  assert.equal(off.features.length, 227);
  assert.match(off.honesty, /No bundled borders for 1930/);
  const named = off.features.find((f) => f.properties.NAME);
  assert.ok(named);
  assert.equal(named.properties.name, named.properties.NAME);
  assert.equal(named.properties.valid_from, "1945");
  assert.equal(named.properties.valid_to, "1945");
  const unnamed = off.features.find((f) => f.properties.name_in_source === false);
  assert.ok(unnamed);
  assert.equal(unnamed.properties.name, "unnamed in source");
  assert.equal(unnamed.properties.NAME, "");

  const on = await historicalGeojson(env, "1914");
  assert.equal(on.year_matches_sheet, true);
  assert.equal(on.sheet_year, 1914);
  assert.equal(on.bundled_feature_count, 177);
  const luxembourg = on.features.find((f) => f.properties.NAME === "Luxembourg");
  assert.ok(luxembourg);
  assert.equal(luxembourg.geometry.type, "MultiPolygon");
  const ring = luxembourg.geometry.coordinates[0][0];
  assert.equal(ring[0][0], 5.82);
  assert.equal(ring[0][1], 49.51);

  const early = await historicalGeojson(env, "1502");
  assert.equal(early.sheet_year, 1914);
  assert.equal(early.year_matches_sheet, false);
  assert.match(early.honesty, /1502/);
  assert.doesNotMatch(JSON.stringify(early.bundled_eras), /1880|1492|2000/);
});

test("historical status lists the four sheets and does not draw a fake year span", async () => {
  const env = stubEnv();
  const st = await historicalStatus(env);
  assert.equal(st.state, "READY");
  assert.equal(st.layers, 4);
  assert.equal(st.features, 177 + 227 + 240 + 240);
  assert.deepEqual(st.bundled_eras, [1914, 1945, 1994, 2010]);
  assert.equal(st.min_year, "");
  assert.equal(st.max_year, "");
  assert.match(st.coverage_note, /Not every year/);
  assert.match(st.coverage_note, /Not topography/);
  const layers = await historicalLayers(env);
  assert.deepEqual(layers.map((x) => x.sheet_year), [1914, 1945, 1994, 2010]);
  assert.ok(layers.every((x) => x.source_name === "aourednik/historical-basemaps" && x.license === "GPL-3.0"));
});

test("GET /map shell returns before D1 or ASSETS", async () => {
  const queries = [];
  const fetches = [];
  const env = {
    queries,
    ASSETS: {
      fetch(request) {
        fetches.push(new URL(request.url).pathname);
        return new Promise(() => {});
      },
    },
    DB: {
      prepare(sql) {
        queries.push(sql);
        const self = {
          bind() { return self; },
          run() { return new Promise(() => {}); },
          first() { return new Promise(() => {}); },
          all() { return new Promise(() => {}); },
        };
        return self;
      },
      async batch() { return new Promise(() => {}); },
    },
  };
  const url = new URL(HOST + "/map");
  const started = Date.now();
  const res = await Promise.race([
    handleHosted(req("/map"), url, env, { waitUntil() {} }, null, null),
    new Promise((_, reject) => setTimeout(() => reject(new Error("GET /map hung")), 2000)),
  ]);
  const elapsed = Date.now() - started;
  assert.equal(res.status, 200);
  assert.ok(elapsed < 2000, "TTFB " + elapsed + "ms");
  assert.deepEqual(queries, []);
  assert.deepEqual(fetches, []);
  const html = await res.text();
  assert.ok(html.length < 90000, "html bytes " + html.length);
  assert.match(html, /id="worldMap"/);
  assert.match(html, /window\.__mapEventsPromise=fetch\("\/api\/events"/);
  assert.match(html, /id="unresolvedList"/);
  assert.match(html, /Waiting until the basemap and event pins paint/);
  assert.match(html, /src="\/map-client\.js\?v=3"/);
  assert.match(html, /src="\/map-pins\.js\?v=1"/);
  assert.match(html, /id="last10"/);
  assert.match(html, /id="colorKey"/);
  assert.match(html, /nearest bundled sheet \(1914, 1945, 1994, or 2010\)/);
  assert.doesNotMatch(html, /id="map-events"/);
  assert.doesNotMatch(html, /AZEVT-/);
  assert.doesNotMatch(html, /No historical boundary layers installed yet/);
});

test("GET /historical lists the bundled sheets", async () => {
  const env = stubEnv();
  const url = new URL(HOST + "/historical");
  const res = await handleHosted(req("/historical"), url, env, { waitUntil() {} }, null, null);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /world_1914/);
  assert.match(html, /world_1945/);
  assert.match(html, /world_1994/);
  assert.match(html, /world_2010/);
  assert.match(html, /aourednik\/historical-basemaps/);
  assert.match(html, /GPL-3\.0/);
  assert.match(html, /Not topography/);
  assert.doesNotMatch(html, /No historical boundary layers installed yet/);
  assert.doesNotMatch(html, /all eras/i);
});

test("GET /api/historical?date=2010 is the 2010 sheet", async () => {
  const env = stubEnv();
  const res = await handleHosted(req("/api/historical?date=2010"), new URL(HOST + "/api/historical?date=2010"), env, { waitUntil() {} }, null, null);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.sheet_year, 2010);
  assert.equal(body.year_matches_sheet, true);
  assert.equal(body.bundled_feature_count, 240);
  assert.equal(body.topography, false);
});

test("undated events stay undated in the map list", () => {
  const src = readFileSync(new URL("../public/map-client.js", import.meta.url), "utf8");
  assert.match(src, /Undated place pins remain visible across year filters/);
  assert.match(src, /e\.event_date\|\|'undated'\)\+' — '\+esc\(e\.place_name\)/);
  assert.doesNotMatch(src, /event_date\|\|'undated'\)\+' — '\+esc\(e\.place_name\)[^;]{0,80}2010/);
  const html = mapBody({ signed: null });
  assert.doesNotMatch(html, /undated — Uyo/);
  assert.match(html, /Undated events stay undated/);
});

test("era loader reads /historical sheets from ASSETS and does not use node:fs", async () => {
  const src = readFileSync(new URL("./historical-eras.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /node:fs|node:path|node:crypto|node:url|fileURLToPath|readFile\(/);
  assert.match(src, /\/historical\//);
  assert.match(src, /ASSETS/);
  await assert.rejects(
    () => loadBundledEraCollection({}, 1994),
    /ASSETS binding required to read \/historical\/era-1994\.geojson/,
  );
  const fetches = [];
  const loaded = await loadBundledEraCollection({ ASSETS: stubAssets(fetches) }, 1994);
  assert.deepEqual(fetches, ["/historical/era-1994.geojson"]);
  assert.equal(loaded.era.year, 1994);
  assert.equal(loaded.collection.features.length, 240);
});

test("map client paints events before lazy historical and unresolved fetches", () => {
  const src = readFileSync(new URL("../public/map-client.js", import.meta.url), "utf8");
  assert.match(src, /renderEvents\(\);\n\s*startLazyLayers\(\);/);
  assert.match(src, /__mapEventsPromise/);
  assert.match(src, /\/api\/events/);
  assert.match(src, /scheduleAfterPaint/);
  assert.match(src, /\/api\/unresolved/);
  assert.match(src, /\/api\/historical\?date=/);
  assert.doesNotMatch(src, /if \(slider\) renderHistory/);
  assert.doesNotMatch(src, /map-events/);
});
