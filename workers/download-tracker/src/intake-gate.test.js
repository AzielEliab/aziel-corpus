import test from "node:test";
import assert from "node:assert/strict";
import { screenIntake, IntakeRefusal, INTAKE_SPEC, INTAKE_REASONS, refusalReceipt } from "./intake-gate.js";
import { ingestRecord, guestSession } from "./library.js";
import { intakeStubEnv, contentWritten, writesContain } from "./fixtures/intake-env.js";

const MARK = "AZ-SYNTHETIC-INTAKE-MARKER-7f3a";

test("clean text passes the gate and returns the screened context", async () => {
  const env = intakeStubEnv();
  const ctx = await screenIntake(env, { door: "upload", title: "A plain note", body: "Plain text about Florence." });
  assert.equal(ctx.spec, INTAKE_SPEC);
  assert.equal(ctx.door, "upload");
});

test("a check that throws refuses (fail closed) with INTAKE-CHECK-ERROR", async () => {
  const env = intakeStubEnv();
  const boom = { name: "boom", run() { throw new Error("scanner exploded " + MARK); } };
  await assert.rejects(
    () => screenIntake(env, { door: "upload", title: MARK, body: MARK }, { checks: [boom] }),
    (err) => {
      assert.ok(err instanceof IntakeRefusal);
      assert.equal(err.code, INTAKE_REASONS.CHECK_ERROR);
      assert.equal(err.receipt.stored, false);
      assert.equal(err.receipt.chained, false);
      assert.ok(!JSON.stringify(err.receipt).includes(MARK), "receipt holds no content");
      assert.ok(!String(err.message).includes(MARK), "message holds no content");
      return true;
    }
  );
  assert.ok(!writesContain(env, MARK), "nothing written holds the content");
  assert.ok(env.writes.sql.some((s) => /INSERT INTO intake_refusals/.test(s)), "hash-only receipt row written");
});

test("a refusing check refuses with its own code and a hash-only receipt", async () => {
  const env = intakeStubEnv();
  const no = { name: "no", run() { return { code: "INTAKE-TEST-REFUSE", status: 415 }; } };
  await assert.rejects(
    () => screenIntake(env, { door: "v1-ingest", title: MARK, body: MARK, ip: "198.51.100.7", signed: { user_id: "u1", username: "someone" } }, { checks: [no] }),
    (err) => {
      assert.equal(err.code, "INTAKE-TEST-REFUSE");
      assert.equal(err.status, 415);
      const r = err.receipt;
      assert.match(r.content_sha256, /^[0-9a-f]{64}$/);
      assert.match(r.title_sha256, /^[0-9a-f]{64}$/);
      assert.match(r.submitter_key, /^[0-9a-f]{64}$/);
      assert.match(r.ip_key, /^[0-9a-f]{64}$/);
      const s = JSON.stringify(r);
      for (const clear of [MARK, "198.51.100.7", "someone"]) assert.ok(!s.includes(clear), "receipt has no clear " + clear);
      return true;
    }
  );
  assert.ok(!writesContain(env, "198.51.100.7"));
  assert.ok(!writesContain(env, "someone"));
});

test("receipt storage failure still refuses", async () => {
  const env = intakeStubEnv({ failReceipts: true });
  const no = { name: "no", run() { return { code: "INTAKE-TEST-REFUSE" }; } };
  await assert.rejects(
    () => screenIntake(env, { door: "upload", title: "t", body: "b" }, { checks: [no] }),
    (err) => err instanceof IntakeRefusal && err.receipt.receipt_stored === false
  );
});

test("refusalReceipt never carries content fields", () => {
  const r = refusalReceipt({}, { door: "upload", title: MARK, body: MARK, file: { bytes: new TextEncoder().encode(MARK) } }, "X");
  assert.deepEqual(Object.keys(r).sort(), ["body_sha256", "chained", "content_retained", "content_sha256", "created_utc", "door", "reason_code", "receipt_id", "spec", "stored", "submitter_key", "ip_key", "title_sha256"].sort());
  assert.ok(!JSON.stringify(r).includes(MARK));
});

test("ingestRecord: unreadable upload is refused before any write (no R2 put, no record, no ledger)", async () => {
  const env = intakeStubEnv();
  const file = { name: "note.txt", type: "text/plain", size: 10, async arrayBuffer() { throw new Error("stream broke"); } };
  await assert.rejects(
    () => ingestRecord(env, { signed: guestSession(), title: "x", body: "y", file, intake: { door: "upload", ip: "203.0.113.9" } }),
    (err) => {
      assert.equal(err.intake_refused, true);
      assert.equal(err.code, INTAKE_REASONS.CHECK_ERROR);
      return true;
    }
  );
  assert.equal(contentWritten(env), false, "nothing stored or chained");
  assert.ok(!writesContain(env, "203.0.113.9"));
});

test("ingestRecord: gate runs before ensureLedger (no ledger DDL or insert on refusal)", async () => {
  const env = intakeStubEnv();
  const file = { name: "a.txt", type: "text/plain", size: 3, async arrayBuffer() { throw new Error("x"); } };
  await assert.rejects(() => ingestRecord(env, { signed: guestSession(), title: "x", file }));
  assert.ok(!env.writes.sql.some((s) => /ledger/i.test(s)), "ledger never touched");
});

// ---- AZBot review fixes (#184): every chain-writing door is gated; salt; §7 order; one pass ----

import { intakeSalt, intakeReady, submitterKey, isIntakePass, isIntakeRefusal, MIN_SALT_LENGTH } from "./intake-gate.js";
import { addPeerReview, PEER_REVIEW_MAX_CHARS } from "./review-store.js";
import { addManualEvent, MANUAL_EVENT_PLACE_MAX } from "./geo.js";
import { handleHosted } from "./hosted.js";
import { hashPayload } from "./ledger.js";
import { POISON_LEARN_RECORD_ID } from "./lattice-learn.js";
import { createHash } from "node:crypto";

const HOSTED = "https://azielcorpuslibrary.net";
const noSalt = () => intakeStubEnv({ INTAKE_SALT: undefined });
const chainTouched = (env) => env.writes.sql.some((s) => /INSERT INTO (ledger|document_ledger|peer_reviews|events)\b/i.test(s));
const onlyReceipts = (env) => env.writes.sql.every((s) => /intake_refusals/.test(s));

test("salt: missing, short, or the public default salt is not usable; the gate refuses INTAKE-NOT-READY", async () => {
  for (const salt of [undefined, "", "short", "aziel-corpus-intake"]) {
    const env = intakeStubEnv({ INTAKE_SALT: salt });
    assert.equal(intakeSalt(env), null);
    assert.equal(intakeReady(env), false);
    assert.equal(submitterKey(env, "ip", "198.51.100.7"), null, "no reversible public-salt key");
    await assert.rejects(
      () => screenIntake(env, { door: "upload", title: "t", body: "plain", ip: "198.51.100.7" }),
      (err) => err instanceof IntakeRefusal && err.code === INTAKE_REASONS.NOT_READY && err.status === 503
    );
    assert.equal(contentWritten(env), false);
    assert.ok(!writesContain(env, "198.51.100.7"));
  }
  const ok = intakeStubEnv({ INTAKE_SALT: "x".repeat(MIN_SALT_LENGTH) });
  assert.equal(intakeReady(ok), true);
  assert.match(submitterKey(ok, "ip", "198.51.100.7"), /^[0-9a-f]{64}$/);
});

test("salt: operator uploads also refuse until INTAKE_SALT is set (no silent default)", async () => {
  const env = noSalt();
  await assert.rejects(
    () => screenIntake(env, { door: "upload", operator: true, title: "t", body: "plain" }),
    (err) => err.code === INTAKE_REASONS.NOT_READY
  );
});

test("followup token: a forged object is ignored; only a genuine pass is honoured", async () => {
  const env = intakeStubEnv();
  const forged = await screenIntake(env, { door: "upload", title: "a", body: "plain", followup: { door: "x", forged: true } });
  assert.equal(forged.followup, null);
  assert.equal(isIntakePass({ door: "upload" }), false);
  const first = await screenIntake(env, { door: "ocr", title: "a", body: "plain" });
  assert.equal(isIntakePass(first), true);
  const second = await screenIntake(env, { door: "ocr", title: "a", body: "plain", followup: first });
  assert.equal(second.followup, first);
  const no = { name: "no", run() { return { code: "INTAKE-TEST-REFUSE" }; } };
  await assert.rejects(() => screenIntake(env, { door: "ocr", title: "a", body: "b", followup: first }, { checks: [no] }), (err) => err.code === "INTAKE-TEST-REFUSE");
  assert.equal(isIntakeRefusal(new IntakeRefusal("X", {}, 400)), true);
  assert.equal(isIntakeRefusal(new Error("plain")), false);
});

test("peer review: refused at the gate before schema, D1 row, or PEER_REVIEW ledger append", async () => {
  const env = noSalt();
  await assert.rejects(
    () => addPeerReview(env, { recordId: "AZDOC-TEST-1", stance: "note", body: "a plain review note " + MARK, signed: guestSession(), intake: { door: "peer-review", ip: "203.0.113.5" } }),
    (err) => isIntakeRefusal(err) && err.code === INTAKE_REASONS.NOT_READY
  );
  assert.equal(chainTouched(env), false, "nothing chained or stored");
  assert.ok(onlyReceipts(env), "no schema, row, or ledger SQL ran; only the refusal receipt");
  assert.ok(!writesContain(env, MARK));
  const receipts = env.writes.sql.filter((s) => /INSERT INTO intake_refusals/.test(s));
  assert.equal(receipts.length, 1, "exactly one hash-only receipt");
});

test("peer review: an over-long note is refused (413) instead of silently truncated, and nothing is written", async () => {
  const env = intakeStubEnv();
  await assert.rejects(
    () => addPeerReview(env, { recordId: "AZDOC-TEST-1", stance: "note", body: "x".repeat(PEER_REVIEW_MAX_CHARS + 1), signed: guestSession() }),
    (err) => err.status === 413
  );
  assert.equal(env.writes.sql.length, 0);
});

test("POST /record/:id/peer returns the intake refusal body and writes nothing to the chain", async () => {
  const env = noSalt();
  const form = new FormData();
  form.set("stance", "note");
  form.set("body", "plain review " + MARK);
  const req = new Request(HOSTED + "/record/AZDOC-TEST-1/peer", { method: "POST", body: form, headers: { Accept: "application/json", "CF-Connecting-IP": "203.0.113.5" } });
  const res = await handleHosted(req, new URL(req.url), env, { waitUntil() {} }, guestSession(), null);
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.refused, true);
  assert.equal(body.reason_code, INTAKE_REASONS.NOT_READY);
  assert.equal(chainTouched(env), false);
  assert.ok(!writesContain(env, MARK) && !writesContain(env, "203.0.113.5"));
});

test("map event: place name is capped and screened before ensureSchema, D1 insert, or EVENT_ADD", async () => {
  const long = intakeStubEnv();
  await assert.rejects(
    () => addManualEvent(long, { signed: guestSession(), date: "2020-01-01", place: "p".repeat(MANUAL_EVENT_PLACE_MAX + 1), lat: 1, lon: 1 }),
    (err) => err.status === 413
  );
  assert.equal(long.writes.sql.length, 0, "no schema, no row, no ledger");

  const env = noSalt();
  await assert.rejects(
    () => addManualEvent(env, { signed: guestSession(), date: "2020-01-01", place: "Florence " + MARK, lat: 43.77, lon: 11.25, intake: { door: "map-event" } }),
    (err) => isIntakeRefusal(err) && err.code === INTAKE_REASONS.NOT_READY
  );
  assert.equal(chainTouched(env), false);
  assert.ok(onlyReceipts(env), "gate ran before ensureSchema");
  assert.ok(!writesContain(env, MARK));
});

test("POST /api/map-event returns the intake refusal body and writes nothing", async () => {
  const env = noSalt();
  const form = new FormData();
  form.set("date", "2020-01-01");
  form.set("place", "Florence " + MARK);
  form.set("lat", "43.77");
  form.set("lon", "11.25");
  const req = new Request(HOSTED + "/api/map-event", { method: "POST", body: form, headers: { Accept: "application/json" } });
  const res = await handleHosted(req, new URL(req.url), env, { waitUntil() {} }, guestSession(), null);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).refused, true);
  assert.equal(chainTouched(env), false);
});

test("map event: a clean event still stores (gate passes, place under the cap)", async () => {
  const env = intakeStubEnv();
  const id = await addManualEvent(env, { signed: guestSession(), date: "2020-01-01", place: "Florence", lat: 43.77, lon: 11.25 });
  assert.match(id, /^AZEVT-/);
  assert.ok(env.writes.sql.some((s) => /INSERT INTO events/.test(s)));
});

function poisonMemoryRows(contentSha) {
  const payload = { feature_id: "f-test-1", content_sha256: contentSha, markers: [], token_hashes: [] };
  const row = { record_id: POISON_LEARN_RECORD_ID, sequence: 1, timestamp_utc: "2026-01-01T00:00:00Z", action: "POISON_LEARN", payload, previous_hash: "0".repeat(64) };
  return [{ sequence: 1, timestamp_utc: row.timestamp_utc, action: row.action, payload_json: JSON.stringify(payload), previous_hash: row.previous_hash, entry_hash: hashPayload(row) }];
}

test("§7: a POISON_LEARNED file is refused before any R2 put (body_retained:false is literally true)", async () => {
  const bytes = new TextEncoder().encode("A plain synthetic note about Florence.\n");
  const sha = createHash("sha256").update(bytes).digest("hex");
  const env = intakeStubEnv({
    all: (sql, binds) => (/FROM document_ledger WHERE record_id=/.test(sql) && binds[0] === POISON_LEARN_RECORD_ID ? { results: poisonMemoryRows(sha) } : null),
  });
  const file = new File([bytes], "note.txt", { type: "text/plain" });
  await assert.rejects(
    () => ingestRecord(env, { signed: guestSession(), title: "Note", file, intake: { door: "upload" } }),
    (err) => err.receipt && err.receipt.refuse === "POISON_LEARNED"
  );
  assert.equal(env.writes.puts.length, 0, "no R2 object was written");
  assert.ok(!env.writes.sql.some((s) => /INSERT INTO records/.test(s)));
});

test("§7: a preflight that cannot read poison memory fails closed (503) with no R2 put", async () => {
  const env = intakeStubEnv({
    all: (sql) => { if (/FROM document_ledger WHERE record_id=/.test(sql)) throw new Error("D1 read failed"); return null; },
  });
  const file = new File([new TextEncoder().encode("A plain synthetic note.\n")], "note.txt", { type: "text/plain" });
  await assert.rejects(
    () => ingestRecord(env, { signed: guestSession(), title: "Note", file, intake: { door: "upload" } }),
    (err) => err.status === 503 && err.receipt && err.receipt.refuse === "PREFLIGHT_UNAVAILABLE" && err.receipt.body_retained === false
  );
  assert.equal(env.writes.puts.length, 0);
  assert.ok(!env.writes.sql.some((s) => /INSERT INTO records/.test(s)));
});

test("§7: a text-only upload is also not put to R2 when the preflight cannot run", async () => {
  const env = intakeStubEnv({
    all: (sql) => { if (/FROM document_ledger WHERE record_id=/.test(sql)) throw new Error("D1 read failed"); return null; },
  });
  await assert.rejects(() => ingestRecord(env, { signed: guestSession(), title: "Note", body: "A plain synthetic note.", intake: { door: "upload" } }), (err) => err.status === 503);
  assert.equal(env.writes.puts.length, 0);
});
