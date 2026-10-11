import test from "node:test";
import assert from "node:assert/strict";
import { originCandidates, citedOriginForRecord } from "./cited-origin.js";

const PLACES = [
  { geonameid: 1, name: "London", asciiname: "London", lat: 51.5085, lon: -0.1257, country_code: "GB", alias_norm: "london", population: 8000000 },
  { geonameid: 2, name: "Paris", asciiname: "Paris", lat: 48.8534, lon: 2.3488, country_code: "FR", alias_norm: "paris", population: 2000000 },
  { geonameid: 3, name: "Paris", asciiname: "Paris", lat: 33.6609, lon: -95.5555, country_code: "US", alias_norm: "paris", population: 25000 },
  { geonameid: 4, name: "Kingston", asciiname: "Kingston", lat: 17.997, lon: -76.7936, country_code: "JM", alias_norm: "kingston", population: 900000 },
  { geonameid: 5, name: "Nowhere", asciiname: "Nowhere", lat: 84, lon: 0, country_code: "XX", alias_norm: "nowhere", population: 1 },
];
const env = { DB: { prepare: () => ({ bind: (n) => ({ all: async () => ({ results: PLACES.filter((p) => p.alias_norm === n) }) }) }) } };

test("dateline, written-at, author location and cited origin are found", () => {
  const c = originCandidates("LONDON, Oct. 9 - The council met.\nThis letter was written at Kingston in 1901. Place of publication: Paris");
  assert.deepEqual(c.map((x) => x.method), ["dateline", "written-at", "cited-origin"]);
  assert.equal(c[0].name, "LONDON");
});

test("pink for the Aziel Library, dark green for other corpus docs; never the uploader", async () => {
  const pink = await citedOriginForRecord(env, { record_id: "r1", title: "Letter", library: "aziel", created_by: "uploader-in-Tokyo" }, "Written at London, 3 May 1890.");
  assert.equal(pink.pin_type, "library-aziel-report"); assert.equal(pink.pin_color, "pink"); assert.equal(pink.place_name, "London");
  const green = await citedOriginForRecord(env, { record_id: "r2", title: "Report", library: "corpus" }, "I am writing from Kingston this week.");
  assert.equal(green.pin_type, "corpus-report"); assert.equal(green.pin_color, "darkgreen");
});

test("ambiguous, junk-coordinate and absent origins are not pinned", async () => {
  const amb = await citedOriginForRecord(env, { record_id: "r3", title: "T", library: "aziel" }, "Printed in Paris.");
  assert.equal(amb.origin, null); assert.match(amb.unresolved[0].reason, /ambiguous/);
  const junk = await citedOriginForRecord(env, { record_id: "r4", title: "T", library: "aziel" }, "Written at Nowhere.");
  assert.equal(junk.origin, null); assert.match(junk.unresolved[0].reason, /GEO-PIN-QUALITY-1.0/);
  const none = await citedOriginForRecord(env, { record_id: "r5", title: "HVAC valve guide", library: "corpus" }, "Turn the valve clockwise.");
  assert.equal(none.origin, null); assert.match(none.reason, /states no origin/);
});
