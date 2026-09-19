import test from "node:test";
import assert from "node:assert/strict";
import { parseRecordMachinePath, buildRecordLlms, buildRecordCite, serveRecordMachine } from "./record-llm.js";
import { reviewDocument } from "./review.js";
import { metadataUrls } from "./record-metadata.js";

const BANNED = /\+25|quiet (Aziel|triad|boost)|blocked.from|what this is not|≠/i;
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
