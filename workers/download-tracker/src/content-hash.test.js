import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  digestBytes,
  guestSession,
  ingestRecord,
  operatorSession,
  serveFile,
} from "./library.js";
import { handleOperatorIngestApi } from "./operator-ingest.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleRuntimeApi } from "./runtime.js";
import { cardFromRecord, LIBRARY_INDEX_KEY, refreshPackedIndex } from "./library-index.js";
import { repairRecordContentHash, continueContentHashRepair, KNOWN_HASH_MISMATCH_IDS } from "./content-hash-repair.js";
import { JSON_HASH_REPAIR_ACTION } from "./record-metadata.js";

const HOST = "https://www.azielcorpuslibrary.net";
const TOKEN = "test-operator-token";

const LURE_NOTES = "Hey\r\n\r\nList azielcorpuslibrary.net in Google's Search Index to appear in online search results!\r\n\r\nRegister azielcorpuslibrary.net today:\r\n\r\nsearchindex.pro";
const LURE_AUTHOR = "Amado Harrington";
const LURE_TITLE = "Results for azielcorpuslibrary.net";
const LURE_SERVED = LURE_NOTES + "\n\n" + LURE_AUTHOR;
const LURE_STORED = createHash("sha256").update(LURE_NOTES, "utf8").digest("hex");
const LURE_LIVE = createHash("sha256").update(LURE_SERVED, "utf8").digest("hex");

function sha(bytes) {
  return digestBytes(bytes);
}

function corpusSigned() {
  return { user_id: "user-1", role: "user", username: "amado" };
}

function hashEnv(seedRows = [], { tamperPut = false } = {}) {
  const records = seedRows.map((r) => ({ ...r }));
  const ledger = [];
  const docLedger = [];
  const derived = [];
  const meta = new Map();
  const files = new Map();
  const kv = new Map();
  const store = { records, ledger, docLedger, derived, meta, files, kv };

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
            quarantine_status: "CLEAR",
            chain_tip: null,
            chain_sequence: 0,
          });
        }
        if (/UPDATE records SET content_sha256/i.test(sql)) {
          const rec = records.find((r) => r.record_id === self.binds[1]);
          if (rec) rec.content_sha256 = self.binds[0];
        }
        if (/UPDATE records SET quarantine_status/i.test(sql)) {
          const rec = records.find((r) => r.record_id === self.binds[1]);
          if (rec) rec.quarantine_status = self.binds[0];
        }
        if (/INSERT INTO document_ledger/i.test(sql)) {
          docLedger.push({
            record_id: self.binds[0],
            sequence: self.binds[1],
            action: self.binds[3],
            payload_json: self.binds[4],
            entry_hash: self.binds[6],
          });
        }
        if (/INSERT INTO ledger/i.test(sql)) {
          ledger.push({ action: self.binds[2], payload_json: self.binds[3], entry_hash: self.binds[5] });
        }
        if (/INSERT OR REPLACE INTO metadata/i.test(sql)) {
          meta.set(self.binds[0], self.binds[1]);
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
          return { results: records.slice() };
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
      async put(key, bytes) {
        files.set(key, tamperPut ? new TextEncoder().encode("TAMPERED") : bytes);
      },
      async get(key) {
        if (!files.has(key)) return null;
        const value = files.get(key);
        return { arrayBuffer: async () => value, body: value };
      },
    },
    DOWNLOADS: {
      async get(key) { return kv.has(key) ? kv.get(key) : null; },
      async put(key, value) { kv.set(key, value); },
    },
    store,
    files,
    kv,
  };
}

async function assertFileMatchesRecord(env, record) {
  const res = await serveFile(env, record.id || record.record_id);
  assert.equal(res.status, 200);
  const body = new Uint8Array(await res.arrayBuffer());
  const live = sha(body);
  assert.equal(res.headers.get("X-Aziel-SHA256"), live);
  assert.equal(record.content_sha256, live);
  return { res, body, live };
}

test("confirmed AZDOC-498664EBE53C hashes: notes-only vs served notes+author", () => {
  assert.equal(LURE_STORED, "bf5456cd207ecc7abd8cdd9e08a111959620e53208c3b5ec383a4f8e3b0d3bc3");
  assert.equal(LURE_LIVE, "b3fca4f2a18ce999e3e87b2d7f3746fdfbcf28de69e2e5dc7529e5bcc15b4022");
  assert.notEqual(LURE_STORED, LURE_LIVE);
});

test("corpus text-only upload hashes the final inserted body that /file serves (author appended)", async () => {
  const env = hashEnv();
  const rec = await ingestRecord(env, {
    signed: corpusSigned(),
    title: LURE_TITLE,
    body: LURE_NOTES,
    author: LURE_AUTHOR,
  });
  assert.equal(rec.library, "corpus");
  const { body, live } = await assertFileMatchesRecord(env, rec);
  const text = new TextDecoder().decode(body);
  assert.match(text, /searchindex\.pro/);
  assert.match(text, /Amado Harrington/);
  assert.notEqual(live, sha(LURE_NOTES));
  const packedCard = cardFromRecord(env.store.records.find((r) => r.record_id === rec.id));
  assert.equal(packedCard.content_sha256, rec.content_sha256);
});

test("text-only title-only upload never stores sha256(title) when body becomes the author (AZDOC-697F4E1D8C34)", async () => {
  const env = hashEnv();
  const rec = await ingestRecord(env, {
    signed: operatorSession(),
    title: "probe",
    body: "",
    author: "Aziel Eliab",
  });
  assert.notEqual(rec.content_sha256, sha("probe"));
  const { body, live } = await assertFileMatchesRecord(env, rec);
  const text = new TextDecoder().decode(body);
  assert.match(text, /Aziel Eliab/);
  assert.equal(live, rec.content_sha256);
});

test("corpus file upload hashes attachment bytes even when content/notes are whitespace-normalized", async () => {
  const env = hashEnv();
  const normalized = LURE_NOTES.replace(/\s+/g, " ").trim() + " " + LURE_AUTHOR;
  const rec = await ingestRecord(env, {
    signed: corpusSigned(),
    title: LURE_TITLE,
    body: normalized,
    author: LURE_AUTHOR,
    file: new File([LURE_NOTES], "lure.txt", { type: "text/plain" }),
  });
  assert.equal(rec.content_sha256, sha(LURE_NOTES));
  assert.notEqual(rec.content_sha256, sha(normalized));
  const { body } = await assertFileMatchesRecord(env, rec);
  assert.equal(new TextDecoder().decode(body), LURE_NOTES);
});

test("operator upload hashes file bytes and /file header matches body", async () => {
  const env = hashEnv();
  const md = "# Operator dossier\n\nExact bytes.\r\n";
  const rec = await ingestRecord(env, {
    signed: operatorSession(),
    title: "Operator dossier",
    body: "notes that must not become the hash",
    author: "Aziel Eliab",
    domain: "software",
    subjects: "aziel dossier",
    file: new File([md], "operator-aziel-dossier-1.0.md", { type: "text/markdown" }),
  });
  assert.equal(rec.library, "aziel");
  assert.equal(rec.content_sha256, sha(md));
  await assertFileMatchesRecord(env, rec);
});

test("operator library-ingest API stores file-bytes hash matching /file", async () => {
  const env = hashEnv();
  const url = new URL(HOST + "/v1/operator/library-ingest");
  const form = new FormData();
  form.set("file", new File([LURE_NOTES], "lure.txt", { type: "text/plain" }));
  form.set("title", LURE_TITLE);
  form.set("author", "Aziel Eliab");
  form.set("body", LURE_NOTES.replace(/\s+/g, " "));
  const res = await handleOperatorIngestApi(
    new Request(url, { method: "POST", headers: { "X-Aziel-Operator-Token": TOKEN }, body: form }),
    url,
    env,
    null
  );
  assert.equal(res.status, 200, await res.clone().text());
  const body = await res.json();
  assert.equal(body.content_sha256, sha(LURE_NOTES));
  await assertFileMatchesRecord(env, { id: body.record_id, content_sha256: body.content_sha256 });
});

test("anonymous/guest text upload hashes the exact final body that /file returns", async () => {
  const env = hashEnv();
  const rec = await ingestRecord(env, {
    signed: guestSession(),
    title: LURE_TITLE,
    body: LURE_NOTES,
    author: LURE_AUTHOR,
  });
  assert.equal(rec.library, "corpus");
  const { live } = await assertFileMatchesRecord(env, rec);
  assert.notEqual(live, sha(LURE_NOTES));
});

test("ingest fails closed when stored object bytes are not the hashed bytes", async () => {
  const env = hashEnv([], { tamperPut: true });
  await assert.rejects(
    () => ingestRecord(env, {
      signed: corpusSigned(),
      title: LURE_TITLE,
      body: LURE_NOTES,
      file: new File([LURE_NOTES], "lure.txt", { type: "text/plain" }),
    }),
    /content_sha256 does not match served file bytes/
  );
  assert.equal(env.store.records.length, 0);
});

test("legacy AZDOC-498664EBE53C-shaped row: /file live header matches body; repair updates DB without rewriting bytes", async () => {
  const env = hashEnv([{
    record_id: "AZDOC-498664EBE53C",
    title: LURE_TITLE,
    body: LURE_SERVED,
    library: "corpus",
    author: LURE_AUTHOR,
    filename: LURE_TITLE + ".txt",
    content_type: "text/plain; charset=utf-8",
    object_key: null,
    byte_size: LURE_SERVED.length,
    content_sha256: LURE_STORED,
    created_utc: "2026-09-17T18:56:33.147Z",
  }]);
  const fileRes = await serveFile(env, "AZDOC-498664EBE53C");
  const body = new Uint8Array(await fileRes.arrayBuffer());
  assert.equal(sha(body), LURE_LIVE);
  assert.equal(fileRes.headers.get("X-Aziel-SHA256"), LURE_LIVE);
  assert.equal(fileRes.headers.get("X-Aziel-Hash-Mismatch"), LURE_STORED);

  const row = env.store.records[0];
  const dry = await repairRecordContentHash(env, row, { apply: false });
  assert.equal(dry.match, false);
  assert.equal(dry.live_sha256, LURE_LIVE);
  assert.equal(row.content_sha256, LURE_STORED);
  assert.equal(row.body, LURE_SERVED);

  const applied = await repairRecordContentHash(env, row, { apply: true });
  assert.equal(applied.repaired, true);
  assert.equal(row.content_sha256, LURE_LIVE);
  assert.equal(row.body, LURE_SERVED);
  assert.ok(env.store.docLedger.some((e) => e.action === JSON_HASH_REPAIR_ACTION || e.action === "HASH_REPAIR"));

  const after = await serveFile(env, "AZDOC-498664EBE53C");
  assert.equal(after.headers.get("X-Aziel-SHA256"), LURE_LIVE);
  assert.equal(after.headers.get("X-Aziel-Hash-Mismatch"), null);
});

test("packed library:index:v1 card uses the verified file-bytes hash", async () => {
  const env = hashEnv();
  const rec = await ingestRecord(env, {
    signed: operatorSession(),
    title: "Packed hash card",
    body: "unused notes",
    file: new File(["packed-bytes-exact"], "packed.txt", { type: "text/plain" }),
  });
  await refreshPackedIndex(env);
  const raw = await env.DOWNLOADS.get(LIBRARY_INDEX_KEY);
  const packed = JSON.parse(raw);
  const card = packed.records.find((r) => r.record_id === rec.id);
  assert.ok(card);
  assert.equal(card.content_sha256, rec.content_sha256);
  assert.equal(card.content_sha256, sha("packed-bytes-exact"));
});

test("GET /v1/content-hash-repair apply=1 requires operator; dry-run lists the confirmed mismatch", async () => {
  const env = hashEnv([{
    record_id: "AZDOC-498664EBE53C",
    title: LURE_TITLE,
    body: LURE_SERVED,
    library: "corpus",
    author: LURE_AUTHOR,
    object_key: null,
    content_sha256: LURE_STORED,
    created_utc: "2026-09-17T18:56:33.147Z",
  }]);
  const dryUrl = new URL(HOST + "/v1/content-hash-repair?record_id=AZDOC-498664EBE53C");
  const dry = await handleRuntimeApi(new Request(dryUrl), dryUrl, env);
  assert.equal(dry.status, 200);
  const dryBody = await dry.json();
  assert.equal(dryBody.mismatched, 1);
  assert.equal(dryBody.repaired, 0);
  assert.equal(dryBody.mismatches[0].live_sha256, LURE_LIVE);

  const applyUrl = new URL(HOST + "/v1/content-hash-repair?apply=1&record_id=AZDOC-498664EBE53C");
  const denied = await handleRuntimeApi(new Request(applyUrl), applyUrl, env);
  assert.equal(denied.status, 401);

  const allowed = await handleRuntimeApi(
    new Request(applyUrl, { headers: { "X-Aziel-Operator-Token": TOKEN } }),
    applyUrl,
    env
  );
  assert.equal(allowed.status, 200);
  const applied = await allowed.json();
  assert.equal(applied.repaired, 1);
  assert.equal(env.store.records[0].content_sha256, LURE_LIVE);
});

test("unreadable object is flagged HASH_UNVERIFIED and bytes are not invented", async () => {
  const env = hashEnv([{
    record_id: "AZDOC-MISSING",
    title: "Gone",
    body: "",
    library: "corpus",
    object_key: "corpus/AZDOC-MISSING/gone.bin",
    content_sha256: "ab".repeat(32),
  }]);
  const row = env.store.records[0];
  const out = await repairRecordContentHash(env, row, { apply: true });
  assert.equal(out.unverified, true);
  assert.equal(out.flagged, true);
  assert.equal(row.content_sha256, "ab".repeat(32));
  assert.equal(row.quarantine_status, "HASH_UNVERIFIED");
});

test("continueContentHashRepair dry-run counts the live-style mismatch", async () => {
  const env = hashEnv([{
    record_id: "AZDOC-498664EBE53C",
    title: LURE_TITLE,
    body: LURE_SERVED,
    library: "corpus",
    object_key: null,
    content_sha256: LURE_STORED,
  }]);
  const stats = await continueContentHashRepair(env, { apply: false, all: true, force: true, refreshPacked: false });
  assert.equal(stats.mismatched, 1);
  assert.equal(stats.repaired, 0);
  assert.equal(stats.mismatches[0].record_id, "AZDOC-498664EBE53C");
});

test("POST /v1/operator/hash-resync applies nine_fix_plan.json updates from served bytes", async () => {
  const plan = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../tools/nine_fix_plan.json"), "utf8"));
  assert.equal(plan.updates.length, 9);
  const env = hashEnv(plan.updates.map((u) => ({
    record_id: u.record_id,
    title: u.title,
    body: u.record_id === "AZDOC-697F4E1D8C34" || u.record_id === "AZDOC-C2B6A81A5A0B" ? "Aziel Eliab" : LURE_SERVED,
    library: "corpus",
    object_key: null,
    content_sha256: u.expect,
    byte_size: u.bytes,
  })));
  const url = new URL(HOST + "/v1/operator/hash-resync");
  const denied = await handleOperatorIngestApi(
    new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan) }),
    url,
    env,
    null
  );
  assert.equal(denied.status, 401);

  const res = await handleOperatorIngestApi(
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Aziel-Operator-Token": TOKEN },
      body: JSON.stringify(plan),
    }),
    url,
    env,
    null
  );
  assert.equal(res.status, 200, await res.clone().text());
  const body = await res.json();
  assert.equal(body.operator, true);
  assert.equal(body.apply, true);
  assert.equal(body.checked, 9);
  assert.equal(body.repaired, 9);
  for (const row of env.store.records) {
    const fileRes = await serveFile(env, row.record_id);
    const live = sha(new Uint8Array(await fileRes.arrayBuffer()));
    assert.equal(row.content_sha256, live);
    assert.equal(fileRes.headers.get("X-Aziel-SHA256"), live);
  }
});

test("known=1 repairs the nine confirmed live AZDOCs without rewriting bodies", async () => {
  assert.equal(KNOWN_HASH_MISMATCH_IDS.length, 9);
  const env = hashEnv(KNOWN_HASH_MISMATCH_IDS.map((id, i) => ({
    record_id: id,
    title: i === 1 ? "probe" : LURE_TITLE,
    body: i === 1 ? "Aziel Eliab" : LURE_SERVED,
    library: "corpus",
    object_key: null,
    content_sha256: i === 1 ? sha("probe") : LURE_STORED,
  })));
  const dryUrl = new URL(HOST + "/v1/content-hash-repair?known=1");
  const dry = await handleRuntimeApi(new Request(dryUrl), dryUrl, env);
  assert.equal(dry.status, 200);
  const dryBody = await dry.json();
  assert.equal(dryBody.checked, 9);
  assert.equal(dryBody.mismatched, 9);
  assert.equal(dryBody.repaired, 0);

  const applyUrl = new URL(HOST + "/v1/content-hash-repair?known=1&apply=1");
  const applied = await handleRuntimeApi(
    new Request(applyUrl, { headers: { "X-Aziel-Operator-Token": TOKEN } }),
    applyUrl,
    env
  );
  assert.equal(applied.status, 200);
  const body = await applied.json();
  assert.equal(body.repaired, 9);
  for (const row of env.store.records) {
    const res = await serveFile(env, row.record_id);
    const live = sha(new Uint8Array(await res.arrayBuffer()));
    assert.equal(row.content_sha256, live);
    assert.equal(res.headers.get("X-Aziel-SHA256"), live);
  }
});
