import test from "node:test";
import assert from "node:assert/strict";
import { ingestRecord, operatorSession } from "./library.js";
import { handleHosted } from "./hosted.js";
import { handleRuntimeApi } from "./runtime.js";
import { handleOperatorIngestApi } from "./operator-ingest.js";
import {
  jsonRecordId,
  paperRecordId,
  isJsonDocumentId,
  isDocumentId,
} from "./ledger.js";
import {
  buildDiscoveryMetadata,
  packageMetadataKey,
  jsonTreeKey,
  JSON_TREE_SEGMENT,
  persistRecordDiscoveryMetadata,
  continueMetadataBackfill,
  parseRecordMetadataPath,
  PUBLIC_AUTHOR,
} from "./record-metadata.js";
import { sitemapRecordsXml, sitemapIndexXml, robotsTxt, llmsDoc, citeDoc } from "./crawl.js";
import { jsonLdScript } from "./seo.js";
import { HUB_PERSON_ID } from "./seo.js";

const HOST = "https://www.azielcorpuslibrary.net";
const FIXTURE_ID = "AZDOC-META1";
const TOKEN = "test-operator-token";

function decoder(bytes) {
  if (typeof bytes === "string") return bytes;
  return new TextDecoder().decode(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
}

function metadataEnv(seedRows = []) {
  const records = seedRows.map((r) => ({ ...r }));
  const ledger = [];
  const docLedger = [];
  const derived = [];
  const meta = new Map();
  const files = new Map();
  const store = { records, ledger, docLedger, derived, meta, files };

  function stmt(sql) {
    const self = {
      sql,
      binds: [],
      bind(...args) {
        self.binds = args;
        return self;
      },
      async run() {
        if (/INSERT INTO records/i.test(sql)) {
          records.push({
            record_id: self.binds[0],
            title: self.binds[1],
            body: self.binds[2],
            created_by: self.binds[3],
            created_utc: self.binds[4],
            library: self.binds[5],
            filename: self.binds[6],
            content_type: self.binds[7],
            object_key: self.binds[8],
            byte_size: self.binds[9],
            author: self.binds[10],
            domain: self.binds[11],
            subjects: self.binds[12],
            keywords: self.binds[13],
            content_sha256: self.binds[14],
            chain_tip: null,
            chain_sequence: 0,
          });
        }
        if (/INSERT INTO document_ledger/i.test(sql)) {
          docLedger.push({
            record_id: self.binds[0],
            sequence: self.binds[1],
            timestamp_utc: self.binds[2],
            action: self.binds[3],
            payload_json: self.binds[4],
            previous_hash: self.binds[5],
            entry_hash: self.binds[6],
          });
        }
        if (/INSERT INTO ledger/i.test(sql)) {
          ledger.push({ action: self.binds[2], payload_json: self.binds[3], entry_hash: self.binds[5] });
        }
        if (/INSERT OR IGNORE INTO derived_artifacts/i.test(sql)) {
          derived.push({
            derived_id: self.binds[0],
            record_id: self.binds[1],
            artifact_type: self.binds[2],
            object_key: self.binds[8],
            note: self.binds[9],
          });
        }
        if (/INSERT OR REPLACE INTO metadata/i.test(sql)) {
          meta.set(self.binds[0], self.binds[1]);
        }
        if (/UPDATE records SET chain_tip/i.test(sql)) {
          const rec = records.find((r) => r.record_id === self.binds[2]);
          if (rec) {
            rec.chain_tip = self.binds[0];
            rec.chain_sequence = self.binds[1];
          }
        }
        return { success: true };
      },
      async first() {
        if (/FROM records WHERE record_id=\?/i.test(sql)) {
          return records.find((r) => r.record_id === self.binds[0]) || null;
        }
        if (/content_sha256/i.test(sql) && /SELECT/i.test(sql) && /FROM records/i.test(sql)) {
          const want = String(self.binds[0] || "").toLowerCase();
          return records.find((r) => String(r.content_sha256 || "").toLowerCase() === want) || null;
        }
        if (/FROM document_ledger WHERE record_id=\?/i.test(sql) && /ORDER BY sequence DESC/i.test(sql)) {
          const rows = docLedger.filter((e) => e.record_id === self.binds[0]);
          return rows.length ? rows[rows.length - 1] : null;
        }
        if (/FROM metadata WHERE key=\?/i.test(sql)) {
          const v = meta.get(self.binds[0]);
          return v != null ? { value: v } : null;
        }
        if (/COUNT\(\*\)/i.test(sql)) {
          return { n: records.length };
        }
        return null;
      },
      async all() {
        if (/FROM document_ledger WHERE record_id=\?/i.test(sql)) {
          return { results: docLedger.filter((e) => e.record_id === self.binds[0]).slice() };
        }
        if (/FROM records/i.test(sql) && /record_id>\?/i.test(sql)) {
          const after = String(self.binds[0] || "");
          return { results: records.filter((r) => r.record_id > after).sort((a, b) => a.record_id.localeCompare(b.record_id)) };
        }
        if (/FROM records/i.test(sql)) {
          return { results: records.slice().sort((a, b) => a.record_id.localeCompare(b.record_id)) };
        }
        if (/FROM ledger/i.test(sql)) {
          return { results: ledger.slice() };
        }
        return { results: [] };
      },
    };
    return self;
  }

  return {
    OPERATOR_TOKEN: TOKEN,
    DB: {
      prepare(sql) { return stmt(sql); },
      async batch() { return []; },
    },
    FILES: {
      async head(key) { return files.has(key) ? { key } : null; },
      async put(key, bytes) { files.set(key, bytes); },
      async get(key) {
        if (!files.has(key)) return null;
        const value = files.get(key);
        return { arrayBuffer: async () => value, body: value };
      },
    },
    store,
    files,
  };
}

test("JSON receipt ids prefix paper AZDOC without colliding", () => {
  assert.equal(isDocumentId(FIXTURE_ID), true);
  assert.equal(isJsonDocumentId(FIXTURE_ID), false);
  assert.equal(jsonRecordId(FIXTURE_ID), "JSONAZDOC-META1");
  assert.equal(isJsonDocumentId("JSONAZDOC-META1"), true);
  assert.equal(isDocumentId("JSONAZDOC-META1"), false);
  assert.equal(paperRecordId("JSONAZDOC-META1"), FIXTURE_ID);
  assert.equal(packageMetadataKey("aziel", FIXTURE_ID), "aziel/AZDOC-META1/JSONAZDOC-META1.json");
  assert.equal(jsonTreeKey(FIXTURE_ID), ".Json/JSONAZDOC-META1.json");
  assert.equal(JSON_TREE_SEGMENT, ".Json");
  assert.deepEqual(parseRecordMetadataPath("/record/AZDOC-META1/metadata.json"), { record_id: "AZDOC-META1", alias: "metadata.json" });
  assert.deepEqual(parseRecordMetadataPath("/record/AZDOC-META1.json"), { record_id: "AZDOC-META1", alias: "json" });
});

test("discovery metadata includes required crawler fields and Aziel Person @id", () => {
  const doc = buildDiscoveryMetadata({
    record_id: FIXTURE_ID,
    title: "The Cockroach Doctrine",
    body: "First meaningful excerpt from the uploaded paper about succession and receipts.",
    author: "Aziel Eliab",
    library: "aziel",
    subjects: "law, library",
    keywords: "receipts, lattice",
    domain: "research",
    content_sha256: "a".repeat(64),
    created_utc: "2026-09-01T00:00:00.000Z",
  });
  assert.equal(doc["@context"], "https://schema.org");
  assert.equal(doc["@type"], "ScholarlyArticle");
  assert.equal(doc.title, "The Cockroach Doctrine");
  assert.equal(doc.subject, "law");
  assert.ok(doc.subjects.includes("law"));
  assert.equal(doc.author.name, PUBLIC_AUTHOR);
  assert.equal(doc.author["@id"], HUB_PERSON_ID);
  assert.match(doc.content, /First meaningful excerpt/);
  assert.ok(doc.created_utc);
  assert.ok(doc.uploaded_at);
  assert.ok(doc.updated_at);
  assert.ok(doc.generated_at);
  assert.equal(doc.record_id, FIXTURE_ID);
  assert.equal(doc.content_sha256, "a".repeat(64));
  assert.equal(doc.url, HOST + "/record/" + FIXTURE_ID);
  assert.equal(doc.metadata_url, HOST + "/record/" + FIXTURE_ID + "/metadata.json");
  assert.equal(doc.file_url, HOST + "/file/" + FIXTURE_ID);
  assert.equal(doc.receipt_id, "JSONAZDOC-META1");
  assert.equal(doc.storage.json_tree_segment, ".Json");
  assert.doesNotMatch(JSON.stringify(doc), /ever-?\s*blooming/i);
});

test("persist writes package + .Json sidecars and JSON-prefixed ledger without touching paper chain_tip", async () => {
  const env = metadataEnv([{
    record_id: FIXTURE_ID,
    title: "Fixture paper",
    body: "Plain text body of the uploaded document for discovery.",
    library: "aziel",
    author: "Aziel Eliab",
    subjects: "library",
    keywords: "metadata",
    domain: "research",
    content_sha256: "b".repeat(64),
    created_utc: "2026-09-02T00:00:00.000Z",
    chain_tip: "paper-tip-hash",
    chain_sequence: 3,
  }]);
  const out = await persistRecordDiscoveryMetadata(env, { record_id: FIXTURE_ID });
  assert.equal(out.ok, true);
  assert.equal(out.json_record_id, "JSONAZDOC-META1");
  const pkg = "aziel/AZDOC-META1/JSONAZDOC-META1.json";
  const tree = ".Json/JSONAZDOC-META1.json";
  assert.ok(env.files.has(pkg), "package sidecar missing");
  assert.ok(env.files.has(tree), "collected .Json tree missing");
  const parsed = JSON.parse(decoder(env.files.get(pkg)));
  assert.equal(parsed.record_id, FIXTURE_ID);
  assert.equal(parsed.author["@id"], HUB_PERSON_ID);
  assert.match(parsed.content, /Plain text body/);
  const paper = env.store.records.find((r) => r.record_id === FIXTURE_ID);
  assert.equal(paper.chain_tip, "paper-tip-hash");
  assert.equal(paper.chain_sequence, 3);
  assert.ok(env.store.docLedger.some((e) => e.record_id === "JSONAZDOC-META1" && e.action === "JSON_DISCOVERY"));
  assert.ok(!env.store.docLedger.some((e) => e.record_id === FIXTURE_ID));
  const again = await persistRecordDiscoveryMetadata(env, { record_id: FIXTURE_ID });
  const jsonEntries = env.store.docLedger.filter((e) => e.record_id === "JSONAZDOC-META1");
  assert.equal(jsonEntries.length, 1, "idempotent persist must not double-append JSON chain");
  assert.equal(again.ok, true);
});

test("ingestRecord writes discovery sidecar in the same upload", async () => {
  const env = metadataEnv();
  const rec = await ingestRecord(env, {
    signed: operatorSession(),
    title: "Ingested dossier",
    body: "Abstract of the new upload.",
    author: "Aziel Eliab",
    domain: "software, research",
    subjects: "aziel dossier",
    keywords: "sidecar",
    file: new File(["# Ingested dossier\n\nMeaningful extracted text for crawlers.\n"], "ingest-aziel-dossier-1.0.md", { type: "text/markdown" }),
  });
  assert.match(rec.id, /^AZDOC-/);
  assert.equal(rec.metadata_url, "/record/" + rec.id + "/metadata.json");
  assert.equal(rec.llms_url, "/record/" + rec.id + "/llms.txt");
  assert.equal(rec.cite_url, "/record/" + rec.id + "/cite.json");
  assert.equal(rec.json_record_id, "JSON" + rec.id);
  const pkg = packageMetadataKey("aziel", rec.id);
  const tree = jsonTreeKey(rec.id);
  assert.ok(env.files.has(pkg));
  assert.ok(env.files.has(tree));
  const doc = JSON.parse(decoder(env.files.get(pkg)));
  assert.equal(doc.title, "Ingested dossier");
  assert.ok(doc.content.length > 0);
  assert.equal(doc.author["@id"], HUB_PERSON_ID);
});

test("GET /record/{id}/metadata.json is 200 with required fields for a fixture record", async () => {
  const env = metadataEnv([{
    record_id: FIXTURE_ID,
    title: "Fixture paper",
    body: "Excerpt stored on the AZDOC row.",
    library: "aziel",
    author: "Aziel Eliab",
    subjects: "library",
    keywords: "discovery",
    domain: "research",
    content_sha256: "c".repeat(64),
    created_utc: "2026-09-03T12:00:00.000Z",
  }]);
  const url = new URL(HOST + "/record/" + FIXTURE_ID + "/metadata.json");
  const res = await handleHosted(new Request(url, { headers: { Accept: "application/json" } }), url, env, {}, null, null);
  assert.equal(res.status, 200);
  const doc = await res.json();
  for (const key of ["title", "subject", "subjects", "author", "content", "created_utc", "uploaded_at", "updated_at", "generated_at", "record_id", "content_sha256", "url", "metadata_url", "file_url", "@context", "@type"]) {
    assert.ok(doc[key] != null && doc[key] !== "", "missing " + key);
  }
  const aliasUrl = new URL(HOST + "/record/" + FIXTURE_ID + ".json");
  const alias = await handleHosted(new Request(aliasUrl, { headers: { Accept: "application/json" } }), aliasUrl, env, {}, null, null);
  assert.equal(alias.status, 200);
  const aliasDoc = await alias.json();
  assert.equal(aliasDoc.record_id, FIXTURE_ID);
});

test("backfill writes metadata for every index record", async () => {
  const env = metadataEnv([
    { record_id: "AZDOC-A1", title: "A", body: "alpha paper", library: "aziel", author: "Aziel Eliab", subjects: "a", created_utc: "2026-01-01T00:00:00.000Z", content_sha256: "1".repeat(64) },
    { record_id: "AZDOC-B2", title: "B", body: "beta paper", library: "corpus", author: "Guest", subjects: "b", created_utc: "2026-01-02T00:00:00.000Z", content_sha256: "2".repeat(64) },
    { record_id: "AZDOC-C3", title: "C", body: "gamma paper", library: "aziel", author: "Aziel Eliab", subjects: "c", created_utc: "2026-01-03T00:00:00.000Z", content_sha256: "3".repeat(64) },
  ]);
  const report = await continueMetadataBackfill(env, { all: true });
  assert.equal(report.ok, true);
  assert.equal(report.total, 3);
  assert.equal(report.written, 3);
  assert.equal(report.done, true);
  for (const id of ["AZDOC-A1", "AZDOC-B2", "AZDOC-C3"]) {
    const row = env.store.records.find((r) => r.record_id === id);
    assert.ok(env.files.has(packageMetadataKey(row.library, id)));
    assert.ok(env.files.has(jsonTreeKey(id)));
    assert.ok(env.store.docLedger.some((e) => e.record_id === jsonRecordId(id)));
  }
});

test("OpenAPI documents metadata routes; sitemap and robots allow them", async () => {
  const spec = await (await handleRuntimeApi(new Request(HOST + "/openapi.json"), new URL(HOST + "/openapi.json"), metadataEnv())).json();
  assert.ok(spec.paths["/record/{record_id}/metadata.json"]);
  assert.ok(spec.paths["/record/{record_id}.json"]);
  assert.ok(spec.paths["/v1/metadata-backfill"]);
  assert.ok(spec.paths["/v1/content-hash-repair"]);
  assert.ok(spec.paths["/sitemap-records.xml"]);
  const env = metadataEnv([{ record_id: FIXTURE_ID, created_utc: "2026-09-04T00:00:00Z", library: "aziel" }]);
  const recordsXml = await sitemapRecordsXml(env);
  assert.match(recordsXml, /\/record\/AZDOC-META1\/metadata\.json/);
  assert.match(recordsXml, /\/record\/AZDOC-META1\.json/);
  assert.match(recordsXml, /\/record\/AZDOC-META1\/llms\.txt/);
  assert.match(recordsXml, /\/record\/AZDOC-META1\/cite\.json/);
  assert.ok(spec.paths["/record/{record_id}/llms.txt"]);
  assert.ok(spec.paths["/record/{record_id}/cite.json"]);
  assert.ok(spec.paths["/help.txt"]);
  assert.ok(spec.paths["/addendum.txt"]);
  assert.ok(spec.paths["/help/uploads.txt"]);
  assert.match(sitemapIndexXml(), /\/sitemap-records\.xml/);
  assert.match(robotsTxt(), /Allow: \/record/);
  assert.match(robotsTxt(), /Sitemap: https:\/\/www\.azielcorpuslibrary\.net\/sitemap-records\.xml/);
  assert.match(llmsDoc("LIMIT"), /\/record\/\{record_id\}\/metadata\.json/);
  assert.equal(citeDoc().record_metadata, HOST + "/record/{record_id}/metadata.json");
});

test("JSON-LD ScholarlyArticle matches sidecar identity without changing visible chrome", () => {
  const html = jsonLdScript({
    title: "The Cockroach Doctrine",
    path: "/record/AZDOC-1",
    kind: "record",
    work: {
      title: "The Cockroach Doctrine",
      author: "Aziel Eliab",
      library: "aziel",
      record_id: "AZDOC-1",
      datePublished: "2026-09-01",
      subjects: "law",
      content: "Excerpt for machines.",
      content_sha256: "d".repeat(64),
    },
  });
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /ScholarlyArticle/);
  assert.match(html, /\/record\/AZDOC-1\/metadata\.json/);
  assert.match(html, /https:\/\/www\.azieleliab\.com\/#aziel/);
  assert.doesNotMatch(html, /ever-?\s*blooming/i);
});

test("operator ingest response cites metadata_url", async () => {
  const env = metadataEnv();
  const url = new URL(HOST + "/v1/operator/library-ingest");
  const form = new FormData();
  form.set("file", new File(["# Meta dossier\n\nPurpose text.\n"], "meta-aziel-dossier-1.0.md", { type: "text/markdown" }));
  form.set("title", "Meta dossier");
  form.set("author", "Aziel Eliab");
  form.set("subjects", "metadata aziel dossier");
  const res = await handleOperatorIngestApi(
    new Request(url, { method: "POST", headers: { "X-Aziel-Operator-Token": TOKEN }, body: form }),
    url,
    env,
    null
  );
  assert.equal(res.status, 200, await res.clone().text());
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.metadata_url, "/record/" + body.record_id + "/metadata.json");
  assert.equal(body.llms_url, "/record/" + body.record_id + "/llms.txt");
  assert.equal(body.cite_url, "/record/" + body.record_id + "/cite.json");
  assert.ok(env.files.has(packageMetadataKey("aziel", body.record_id)));
});
