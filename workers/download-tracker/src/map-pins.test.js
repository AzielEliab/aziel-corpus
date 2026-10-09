// /map pin colors, ±3-year window, correspondence rule, last-10 list (AZNEWS-PINS-1.0 / AZNEWS-MATCH-1.0).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { mapPinTypeForLibrary, MAP_EVENT_COLORS } from "./geo.js";
import { mapBody, MAP_PIN_KEY } from "./hosted-pages.js";

function loadPins() {
  const src = readFileSync(new URL("../public/map-pins.js", import.meta.url), "utf8");
  const ctx = { globalThis: {} };
  ctx.window = ctx.globalThis;
  vm.runInNewContext(src, ctx);
  return ctx.globalThis.AZMapPins;
}
const AZ = loadPins();

test("color assignment follows the operator palette", () => {
  assert.equal(AZ.colorFor("news-event").color, "red");
  assert.equal(AZ.colorFor("news-report").color, "blue");
  assert.equal(AZ.colorFor("library-aziel-event").color, "purple");
  assert.equal(AZ.colorFor("library-aziel-report").color, "pink");
  assert.equal(AZ.colorFor("corpus-event").color, "lightgreen");
  assert.equal(AZ.colorFor("corpus-report").color, "darkgreen");
  assert.equal(AZ.colorFor("correspondence").color, "black");
  assert.equal(AZ.colorFor("correspondence-candidate").color, "white");
  assert.equal(AZ.corpusPinType({ library: "aziel" }, "event"), "library-aziel-event");
  assert.equal(AZ.corpusPinType({ library: "aziel" }, "report"), "library-aziel-report");
  assert.equal(AZ.corpusPinType({ library: "corpus" }, "event"), "corpus-event");
  assert.equal(AZ.corpusPinType({ library: null, created_by: "Aziel Eliab" }, "event"), "corpus-event", "uploader never decides the shelf color");
  assert.equal(mapPinTypeForLibrary("aziel"), "library-aziel-event");
  assert.equal(mapPinTypeForLibrary("corpus"), "corpus-event");
  assert.equal(MAP_EVENT_COLORS["library-aziel-event"], "purple");
  for (const [hex] of MAP_PIN_KEY) assert.ok(Object.values(AZ.PIN_COLORS).some((c) => c.hex === hex), hex);
});

test("±3-year window: matching and era slider", () => {
  assert.equal(AZ.withinYears("2023-01-01", "2026-10-09"), true);
  assert.equal(AZ.withinYears("2022", "2026-10-09"), false);
  assert.equal(AZ.withinYears("400 BCE", "-397"), true);
  assert.equal(AZ.withinYears(null, "2026"), false);
  assert.equal(AZ.inEra("2029-02-01", 2026), true);
  assert.equal(AZ.inEra("2030", 2026), false);
  assert.equal(AZ.inEra("", 2026), false, "undated pins stay out of era mode");
});

test("correspondence: black only when the full rule passes, white otherwise", () => {
  const corpus = { id: "AZEVT-1", source_id: "corpus:1", date: "2025", lat: 31.5, lon: 34.47, title: "Gaza Rafah Crossing Ceasefire Talks" };
  const near = { id: "pin-9", source_id: "news:9", date: "2026-10-09", lat: 31.52, lon: 34.45, title: "Gaza Rafah Crossing Ceasefire Holds" };
  const m = AZ.matchPair(corpus, near);
  assert.equal(m.level, "black");
  const far = { ...near, id: "pin-10", lat: 33.0, lon: 35.5, title: "Gaza Rafah Statement" };
  assert.equal(AZ.matchPair(corpus, far).level, "white");
  const old = { ...near, id: "pin-11", date: "2019" };
  assert.equal(AZ.matchPair(corpus, old).level, null, "outside ±3 years");
  assert.equal(AZ.matchPair(corpus, { ...near, source_id: "corpus:1" }).level, null, "same source never corresponds");
  const out = AZ.correspondences([corpus], [near, far, old]);
  assert.deepEqual(JSON.parse(JSON.stringify(out.map((c) => c.pin_type))), ["correspondence", "correspondence-candidate"]);
});

test("last-10 list is newest first and capped at 10", () => {
  const pins = Array.from({ length: 14 }, (_, i) => ({ id: "p" + i, added_at: new Date(Date.UTC(2026, 9, 9, 0, i)).toISOString() }));
  pins.push({ id: "undated", added_at: null });
  const last = AZ.lastAdded(pins);
  assert.equal(last.length, 10);
  assert.equal(last[0].id, "p13");
  assert.equal(last[9].id, "p4");
});

test("pins sharing a spot fan out", () => {
  const f = AZ.fanOut([{ x: 10, y: 10 }, { x: 10, y: 10 }, { x: 50, y: 50 }], 9);
  assert.equal(f.length, 3);
  assert.notDeepEqual([f[0].dx, f[0].dy], [f[1].dx, f[1].dy]);
  assert.equal(f[2].dx, 0);
});

test("/map has the last-10 panel, permalinks and the color key at the bottom", () => {
  const html = mapBody({ signed: null });
  assert.match(html, /id="last10"/);
  assert.match(html, /id="eraYear"/);
  assert.ok(html.lastIndexOf('id="colorKey"') > html.lastIndexOf('id="unresolvedList"'), "key is last");
  const client = readFileSync(new URL("../public/map-client.js", import.meta.url), "utf8");
  assert.match(client, /\?pin=/);
  assert.match(client, /\/v1\/fraggate\/call/);
  assert.match(client, /news_pins/);
  assert.doesNotMatch(client, /KV|D1/);
});
