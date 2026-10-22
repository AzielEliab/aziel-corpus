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
