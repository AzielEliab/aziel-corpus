import test from "node:test";
import assert from "node:assert/strict";
import {
  isHumanTag,
  isMachineFileTag,
  formatTagLabel,
  visibleTagEntries,
  visibleTagTokens,
  TAG_LABEL_MAX,
} from "./visible-tags.js";
import { CSS, azielLibraryBody, homeBody } from "./ui.js";
import { recordBody } from "./hosted-pages.js";

test("human keywords stay; ellipsis, json paths, hashes, and blobs are hidden", () => {
  assert.equal(isHumanTag("philosophy"), true);
  assert.equal(isHumanTag("cockroach doctrine"), true);
  assert.equal(isHumanTag("#research"), true);
  assert.equal(isHumanTag("energy/HVAC/retrofit"), true);
  assert.equal(isHumanTag("...."), false);
  assert.equal(isHumanTag("..."), false);
  assert.equal(isHumanTag("…"), false);
  assert.equal(isHumanTag("#...."), false);
  assert.equal(isHumanTag("metadata.json"), false);
  assert.equal(isHumanTag(".Json/JSONAZDOC-C6D76CC9D65C.json"), false);
  assert.equal(isHumanTag("JSONAZDOC-57CA385CE98A"), false);
  assert.equal(isHumanTag("corpus/AZDOC-1/metadata.json"), false);
  assert.equal(isHumanTag('{"title":"Instagram"}'), false);
  assert.equal(isHumanTag('"file": "metadata.json"}'), false);
  assert.equal(isHumanTag("a".repeat(64)), false);
  assert.equal(isMachineFileTag(".Json/JSONAZDOC-C6D76CC9D65C.json"), true);
  assert.equal(isMachineFileTag("note for auditors"), false);
});

test("hashtag soup splits; labels strip # and truncate", () => {
  const entries = visibleTagEntries("#seo #clarity .... metadata.json philosophy");
  assert.deepEqual(entries.map((x) => x.value), ["seo", "clarity", "philosophy"]);
  assert.deepEqual(visibleTagTokens("research, #library, ...., JSONAZDOC-ABC"), ["research", "library"]);
  const long = "Harmonic Laws Series Volume IV Proof Protocol extra words here";
  assert.ok(isHumanTag(long));
  assert.equal(formatTagLabel(long).length, TAG_LABEL_MAX);
  assert.match(formatTagLabel(long), /…$/);
});

test("layout CSS locks page overflow-x and wraps long tokens", () => {
  assert.match(CSS, /html,body\{[^}]*overflow-x:hidden/);
  assert.match(CSS, /html,body\{[^}]*overflow-y:auto/);
  assert.doesNotMatch(CSS, /html,body\{overflow:auto/);
  assert.match(CSS, /\.wrap\{[^}]*overflow-x:hidden/);
  assert.match(CSS, /\.card\{[^}]*overflow-x:hidden/);
  assert.match(CSS, /\.hero h1,[\s\S]*overflow-wrap:anywhere/);
  assert.match(CSS, /pre,code,pre\.verify\{[^}]*overflow-x:hidden/);
  assert.match(CSS, /\.brandrow\{display:flex;flex-wrap:wrap/);
});

test("shelf and record tag strips drop machine chrome and keep human tags", () => {
  const junkRow = {
    record_id: "AZDOC-C6D76CC9D65C",
    title: "Instagram",
    library: "corpus",
    author: "Faustino Lovegrove",
    domain: "spam",
    subjects: "...., metadata.json, .Json/JSONAZDOC-C6D76CC9D65C.json",
    keywords: "#instagram, {\"file\":\"metadata.json\"}, " + "f".repeat(64) + ", real-followers",
    filename: ".Json/JSONAZDOC-C6D76CC9D65C.json",
    snippet: "We run an Instagram service http://instagrow.business/",
    triad_combined: 0.37,
  };
  const shelf = azielLibraryBody({ signed: null, rows: [{ ...junkRow, library: "aziel" }] });
  const home = homeBody({ q: "Instagram", rows: [junkRow], views: 1, downloads: 1, host: "https://www.azielcorpuslibrary.net" });
  const rec = recordBody({
    row: junkRow,
    events: [],
    derived: [{
      derived_id: "JSONAZDOC-C6D76CC9D65C",
      artifact_type: "JSON_DISCOVERY",
      processor: "AZIEL_RECORD_METADATA",
      processor_version: "1.0.0",
      object_key: ".Json/JSONAZDOC-C6D76CC9D65C.json",
      note: ".Json/JSONAZDOC-C6D76CC9D65C.json",
    }],
  });
  for (const html of [shelf, home]) {
    assert.match(html, /real-followers|instagram|spam/);
    assert.doesNotMatch(html, />\.\.\.\.</);
    assert.doesNotMatch(html, /metadata\.json/);
    assert.doesNotMatch(html, /JSONAZDOC-C6D76CC9D65C\.json/);
    assert.doesNotMatch(html, /#instagram/);
    assert.doesNotMatch(html, /ffffff{10,}/);
  }
  assert.match(rec, /real-followers|instagram|spam/);
  assert.doesNotMatch(rec, />\.\.\.\.</);
  assert.doesNotMatch(rec, /class="mini-chip">[^<]*metadata\.json/);
  assert.doesNotMatch(rec, /JSONAZDOC-C6D76CC9D65C\.json/);
  assert.doesNotMatch(rec, /#instagram/);
  assert.doesNotMatch(rec, /ffffff{10,}/);
  assert.match(rec, /class="mini-chips record-tags"/);
  assert.match(rec, /real-followers/);
  assert.match(rec, /open artifact/);
  assert.match(rec, />text record</);
  assert.match(rec, /\/record\/AZDOC-C6D76CC9D65C\/metadata\.json/);
  assert.match(rec, /\/record\/AZDOC-C6D76CC9D65C\/llms\.txt/);
  assert.match(rec, /\/record\/AZDOC-C6D76CC9D65C\/cite\.json/);
  assert.doesNotMatch(rec, /Arpit · Arpit · Arpit/);
});
