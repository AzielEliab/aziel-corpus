import test from "node:test";
import assert from "node:assert/strict";
import { reviewDocument } from "./review.js";
import { runReviewBundle, storedTriadMatches } from "./review-store.js";
import { extractPdfText } from "./ocr.js";
import { shelfScoreState } from "./zsolver.js";
import { publicSearchCard, cardFromRecord } from "./library-index.js";
import { ledgerEntriesForRecord } from "./ledger.js";
import { loadRecordPageParts } from "./hosted.js";
import { shouldBackgroundWalk, shouldTunnelFirst } from "./index.js";

const SHA = "a".repeat(64);

function pdfWith(text) {
  const safe = String(text).replace(/[()\\]/g, "");
  const stream = "BT (" + safe + ") Tj ET";
  return new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\nstream\n" + stream + "\nendstream\n%%EOF");
}

function filingBody(meta) {
  const notes = meta.filename || "";
  const bits = [meta.author, meta.domain, meta.subjects, meta.keywords].filter(Boolean).join("\n");
  return [notes, bits].filter(Boolean).join("\n\n");
}

test("filing stub cycle mean is 45 and is not published", () => {
  const meta = {
    title: "scan.pdf",
    filename: "scan.pdf",
    author: "Aziel Eliab",
    domain: "general",
    subjects: "notes",
    keywords: "file",
    sha256: SHA,
    library: "corpus",
    structure: { ok: true, files: [{ path: "scan.pdf", bytes: 40, sha256: SHA }] },
  };
  const body = filingBody(meta);
  const published = reviewDocument({ ...meta, body });
  assert.equal(published.triad.display, null);
  assert.equal(published.triad.combined, null);
  assert.equal(published.triad.triad_input, "unread");
  assert.equal(published.triad.settled, false);
  const forced = reviewDocument({ ...meta, filename: "scan.txt", body, triad_input_hint: "document_text" });
  assert.equal(forced.triad.display, 45);
  assert.ok(Math.abs(forced.triad.combined - 0.4478) < 0.001);
});

test("evidence word in a filing stub is unavailable, not 86", () => {
  const meta = {
    title: "report.pdf",
    filename: "report.pdf",
    author: "Aziel Eliab",
    domain: "history",
    subjects: "archive",
    keywords: "primary source",
    sha256: SHA,
    library: "corpus",
  };
  const review = reviewDocument({ ...meta, body: filingBody(meta) });
  assert.equal(review.triad.display, null);
  assert.notEqual(review.triad.display, 86);
  assert.equal(review.triad.triad_input, "unread");
});

test("epistemology essay scores 49 from document text", () => {
  const review = reviewDocument({
    title: "A short treatise on meaning",
    body: "This essay argues that belief stays with the claim. as cited",
    filename: "essay.md",
    sha256: "c".repeat(64),
    author: "Aziel Eliab",
    domain: "philosophy",
    subjects: "philosophy, epistemology",
    library: "corpus",
    structure: { ok: true, files: [{ path: "essay.md", bytes: 80, sha256: "c".repeat(64) }] },
  });
  assert.equal(review.triad.triad_input, "document_text");
  assert.equal(review.triad.display, 49);
  assert.equal(review.triad.combined, review.triad.triad_cycle_mean);
});

test("hydrogen lab note extracted from a PDF scores 78", async () => {
  const text = "Hydrogen lab note. Independent primary source measurement of 12 joules at 3 kelvin. Archive hash recorded.";
  const bytes = pdfWith(text);
  assert.match(extractPdfText(bytes), /Hydrogen lab note/);
  const bundle = await runReviewBundle({
    title: "Hydrogen lab note",
    body: filingBody({
      filename: "hydrogen-lab-note.pdf",
      author: "Aziel Eliab",
      domain: "energy",
      subjects: "energy",
      keywords: "lab",
    }),
    filename: "hydrogen-lab-note.pdf",
    contentType: "application/pdf",
    sha256: "b".repeat(64),
    author: "Aziel Eliab",
    domain: "energy",
    subjects: "energy",
    keywords: "lab",
    library: "aziel",
    bytes,
    liveClce: false,
  });
  assert.equal(bundle.review.triad.triad_input, "document_text");
  assert.equal(bundle.review.triad.display, 78);
});

test("loaded PDF with no extractable words stays unavailable and settled", async () => {
  const bytes = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF");
  const bundle = await runReviewBundle({
    title: "scan.pdf",
    body: "scan.pdf\n\nAziel Eliab\nhistory\nnotes\nfile",
    filename: "scan.pdf",
    contentType: "application/pdf",
    sha256: SHA,
    author: "Aziel Eliab",
    domain: "history",
    subjects: "notes",
    keywords: "file",
    bytes,
    liveClce: false,
  });
  assert.equal(bundle.review.triad.display, null);
  assert.equal(bundle.review.triad.triad_input, "no_extractable_text");
  assert.equal(bundle.review.triad.settled, true);
  assert.equal(storedTriadMatches({ content_sha256: SHA }, bundle.review), true);
});

test("unread PDF is not settled", () => {
  const review = reviewDocument({
    title: "scan.pdf",
    filename: "scan.pdf",
    body: "scan.pdf\n\nAziel Eliab\ngeneral\nnotes\nfile",
    author: "Aziel Eliab",
    domain: "general",
    subjects: "notes",
    keywords: "file",
    sha256: SHA,
  });
  assert.equal(review.triad.triad_input, "unread");
  assert.equal(review.triad.settled, false);
  assert.equal(storedTriadMatches({ filename: "scan.pdf", content_sha256: SHA }, review), false);
});

test("shelf and search hide a number unless triad_input is document_text", () => {
  const stub = shelfScoreState({
    record_id: "AZDOC-STUB",
    title: "scan.pdf",
    filename: "scan.pdf",
    triad_combined: 0.4478,
    triad_display: 45,
  });
  assert.equal(stub.triad_display, null);
  const card = publicSearchCard(cardFromRecord({
    record_id: "AZDOC-STUB",
    title: "scan.pdf",
    filename: "scan.pdf",
    library: "corpus",
    triad_combined: 0.4478,
    triad_display: 45,
    created_utc: "2026-10-01T00:00:00Z",
  }));
  assert.equal(card.triad_display, undefined);
  const shown = shelfScoreState({
    record_id: "AZDOC-DOC",
    title: "Essay",
    triad_combined: 0.49,
    triad_input: "document_text",
  });
  assert.equal(shown.triad_display, 49);
});

test("ledger lookup filters by record id instead of loading every row", async () => {
  const sqls = [];
  const env = {
    DB: {
      prepare(sql) {
        sqls.push(sql);
        return {
          bind() { return this; },
          async run() { return {}; },
          async all() { return { results: [] }; },
          async first() { return null; },
        };
      },
    },
  };
  await ledgerEntriesForRecord(env, "AZDOC-D9F5EE1804DF");
  assert.ok(sqls.some((sql) => /FROM ledger WHERE payload_json LIKE \?/.test(sql)));
  assert.equal(sqls.some((sql) => /FROM ledger ORDER BY sequence ASC/.test(sql) && !/WHERE/.test(sql)), false);
});

test("page views do not start walks and record-page reads overlap", async () => {
  assert.equal(shouldBackgroundWalk("/"), false);
  assert.equal(shouldBackgroundWalk("/record/AZDOC-1"), false);
  assert.equal(shouldBackgroundWalk("/v1/recalibrate-all"), false);
  assert.equal(shouldBackgroundWalk("/v1/health"), true);
  assert.equal(shouldTunnelFirst("/record/AZDOC-1"), true);
  assert.equal(shouldTunnelFirst("/v1/recalibrate-all"), false);

  let inflight = 0;
  let max = 0;
  async function touch() {
    inflight += 1;
    max = Math.max(max, inflight);
    await new Promise((resolve) => setTimeout(resolve, 25));
    inflight -= 1;
    return { results: [] };
  }
  const env = {
    DB: {
      prepare() {
        return {
          bind() { return this; },
          all: touch,
          first: async () => {
            await touch();
            return null;
          },
          run: async () => {
            await touch();
            return {};
          },
        };
      },
    },
    DOWNLOADS: {
      async get() {
        await touch();
        return null;
      },
    },
  };
  const row = {
    record_id: "AZDOC-PAGE",
    title: "A note",
    filename: "note.txt",
    content_type: "text/plain",
    body: "This essay argues that belief stays with the claim and the reader.",
  };
  await loadRecordPageParts(env, row);
  assert.ok(max > 1, "independent record-page reads should overlap");
});
