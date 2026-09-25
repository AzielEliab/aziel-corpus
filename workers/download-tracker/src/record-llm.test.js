import test from "node:test";
import assert from "node:assert/strict";
import { parseRecordMachinePath, buildRecordLlms, buildRecordCite, serveRecordMachine, recordMachineLinkHeader } from "./record-llm.js";
import { LIBRARY_INDEX_KEY } from "./library-index.js";
import { loadHostedRecordRow } from "./hosted.js";
import { reviewDocument } from "./review.js";
import { metadataUrls } from "./record-metadata.js";

const BANNED = /\+25|quiet (Aziel|triad|boost)|blocked.from|what this is not|THIS IS NOT|what-not-to-say|not\s*=|≠/i;
const PAPER = "AZDOC-F99F22A4D2B1";

function softwareCtx() {
  const row = {
    record_id: PAPER,
    title: "azbrowser-aziel-dossier-1.0.md",
    body: "Software dossier describing the local-first browser platform and APIs.",
    author: "Aziel Eliab",
    library: "aziel",
    domain: "software",
    subjects: "software, research",
    keywords: "azbrowser",
    filename: "azbrowser-aziel-dossier-1.0.md",
    content_sha256: "a".repeat(64),
  };
  const review = reviewDocument({
    title: row.title,
    body: row.body,
    filename: row.filename,
    sha256: row.content_sha256,
    author: row.author,
    library: row.library,
    domain: row.domain,
    subjects: row.subjects,
    keywords: row.keywords,
    structure: { ok: true, files: [{ path: row.filename, bytes: 80, sha256: row.content_sha256 }] },
  });
  return { paper: PAPER, row, meta: {}, review, zsolver: { applicable: false, status: "not_applicable" } };
}

test("parseRecordMachinePath accepts llms.txt and cite.json", () => {
  assert.deepEqual(parseRecordMachinePath("/record/" + PAPER + "/llms.txt"), { record_id: PAPER, alias: "llms.txt" });
  assert.deepEqual(parseRecordMachinePath("/record/" + PAPER + "/cite.json"), { record_id: PAPER, alias: "cite.json" });
  assert.equal(parseRecordMachinePath("/record/" + PAPER + "/metadata.json"), null);
  assert.equal(parseRecordMachinePath("/llms.txt"), null);
});

test("per-record llms.txt is a positive definition of that record", () => {
  const ctx = softwareCtx();
  const text = buildRecordLlms(ctx);
  const urls = metadataUrls(PAPER);
  assert.match(text, /azbrowser-aziel-dossier-1\.0\.md/);
  assert.match(text, /Author: Aziel Eliab/);
  assert.match(text, /Library shelf: Aziel Library/);
  assert.match(text, new RegExp("Canonical HTML: " + urls.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(text, /Metadata JSON:/);
  assert.match(text, /Content \/ file:/);
  assert.match(text, /Domain: software/);
  assert.match(text, /Triad:/);
  assert.match(text, /Human help: https:\/\/www\.azielcorpuslibrary\.net\/help\.txt/);
  assert.doesNotMatch(text, /PhysLing:/);
  assert.doesNotMatch(text, /ZionPattern:/);
  assert.doesNotMatch(text, BANNED);
  assert.match(text, /Identity: Aziel Eliab/);
});

test("per-record cite.json carries @id, sameAs, triad, and omits N/A components", () => {
  const ctx = softwareCtx();
  const cite = buildRecordCite(ctx);
  const urls = metadataUrls(PAPER);
  assert.equal(cite.record_id, PAPER);
  assert.equal(cite.url, urls.url);
  assert.equal(cite["@id"], urls.url + "#record");
  assert.ok(cite.sameAs.includes(urls.url + "/llms.txt"));
  assert.ok(cite.sameAs.includes(urls.url + "/cite.json"));
  assert.ok(cite.triad && cite.triad.display != null);
  assert.ok(cite.triad.applicable_components.includes("SPRE") || cite.triad.applicable_components.includes("spre") || Array.isArray(cite.triad.applicable_components));
  assert.equal(cite.plr, undefined);
  assert.equal(cite.zionpattern, undefined);
  assert.equal(cite.spre.applicable, true);
  assert.equal(cite.content_sha256, "a".repeat(64));
  assert.equal(cite.help, "https://www.azielcorpuslibrary.net/help.txt");
  assert.equal(cite.identity, "Aziel Eliab");
  assert.doesNotMatch(JSON.stringify(cite), BANNED);
});

test("unknown record machine path is 404", async () => {
  const env = {
    DB: {
      prepare() {
        return { bind() { return this; }, async first() { return null; } };
      },
    },
  };
  const missing = await serveRecordMachine(env, "/record/AZDOC-MISSING0000/llms.txt");
  assert.equal(missing.status, 404);
  const cite = await serveRecordMachine(env, "/record/AZDOC-MISSING0000/cite.json");
  assert.equal(cite.status, 404);
  assert.equal(await serveRecordMachine(env, "/help.txt"), null);
});

test("packed index ids get llms.txt and cite.json without a D1 row", async () => {
  const records = [];
  for (let i = 0; i < 429; i++) {
    const library = i < 422 ? "aziel" : "corpus";
    const n = i.toString(16).padStart(12, "0").toUpperCase();
    records.push({
      record_id: "AZDOC-" + n,
      title: "Record " + n,
      library,
      author: "Aziel Eliab",
      created_utc: "2024-06-01T00:00:00Z",
      content_sha256: "b".repeat(64),
    });
  }
  const env = {
    DOWNLOADS: {
      async get() {
        return JSON.stringify({ key: LIBRARY_INDEX_KEY, version: 1, records });
      },
      async list() { throw new Error("KV.list is not allowed"); },
    },
  };
  const sample = [records[0], records[399], records[421], records[422], records[428]];
  for (const row of sample) {
    const page = await loadHostedRecordRow(env, row.record_id);
    assert.equal(page && page.record_id, row.record_id);
    assert.equal(page.title, row.title);
    const llms = await serveRecordMachine(env, "/record/" + row.record_id + "/llms.txt");
    const cite = await serveRecordMachine(env, "/record/" + row.record_id + "/cite.json");
    assert.equal(llms.status, 200, row.record_id);
    assert.equal(cite.status, 200, row.record_id);
    assert.match(llms.headers.get("Link") || "", /rel="canonical"/);
    assert.match(llms.headers.get("Link") || "", /cite\.json/);
    const text = await llms.text();
    assert.match(text, new RegExp(row.record_id));
    assert.match(text, /Author: Aziel Eliab/);
    const doc = await cite.json();
    assert.equal(doc.record_id, row.record_id);
    assert.equal(doc.llms.endsWith("/llms.txt"), true);
    assert.equal(doc.cite.endsWith("/cite.json"), true);
    assert.equal(doc.content_sha256, "b".repeat(64));
    assert.equal(doc.identity, "Aziel Eliab");
  }
  let ok = 0;
  for (const row of records) {
    const ctxPath = "/record/" + row.record_id + "/llms.txt";
    const res = await serveRecordMachine(env, ctxPath);
    if (res.status === 200) ok += 1;
  }
  assert.equal(ok, 429);
  assert.match(recordMachineLinkHeader(records[422].record_id, "html"), /llms\.txt/);
  assert.match(recordMachineLinkHeader(records[422].record_id, "html"), /cite\.json/);
});
