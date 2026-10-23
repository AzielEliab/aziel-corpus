/**
 * CORPUS-INTAKE-SAFETY-1.0 (d) — duplicate floods and rate limits. Hash-only bookkeeping.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { FLOOD_REASONS, FLOOD_DEFAULTS, shingleSignature, similarity, contentHash } from "./intake-flood.js";
import { screenIntake, submitterKey } from "./intake-gate.js";
import { ingestRecord, operatorSession } from "./library.js";
import { handleLibraryIngestApi } from "./library-mcp.js";
import { intakeStubEnv, contentWritten } from "./fixtures/intake-env.js";

const HOST = "https://www.azielcorpuslibrary.net";
const OPERATOR = operatorSession();
const guest = (n) => ({ user_id: "u-synthetic-" + n, username: "synthetic-" + n, role: "user" });
const MARK = "__AZ_SYNTHETIC_FLOOD_MARKER__";
const WORDS = Array.from({ length: 60 }, (_, i) => "term" + ((i * 7919) % 1000));
const LONG = WORDS.join(" ") + " " + MARK;
const nearCopy = (k) => WORDS.map((w, i) => (i === 59 - k ? "edit" + k : w)).join(" ") + " " + MARK;
const UNRELATED = Array.from({ length: 60 }, (_, i) => "other" + ((i * 104729) % 977)).join(" ");

async function screen(env, input, now = Date.now()) {
  try { await screenIntake(env, { door: "upload", title: "Synthetic", ...input }, { now }); return null; } catch (e) { return e; }
}

test("signatures: near copies score high, unrelated text scores low, short text has no signature", () => {
  const a = shingleSignature(LONG);
  assert.equal(a.length, 32 * 8);
  assert.ok(similarity(a, shingleSignature(nearCopy(1))) >= FLOOD_DEFAULTS.NEAR_SIMILARITY);
  assert.ok(similarity(a, shingleSignature(UNRELATED)) < 0.2);
  assert.equal(shingleSignature("too short to compare"), null);
  assert.match(contentHash({ body: "Hello  WORLD", texts: [] }), /^t:[0-9a-f]{64}$/);
  assert.equal(contentHash({ body: "hello world", texts: [] }), contentHash({ body: "Hello\u200B  World", texts: [] }), "normalised before hashing");
});

test("exact duplicate: identical body (new title, new submitter) refused 409; identical file bytes refused", async () => {
  const env = intakeStubEnv();
  assert.equal(await screen(env, { signed: guest(1), body: "short synthetic note one", ip: "203.0.113.1" }), null);
  const e = await screen(env, { signed: guest(2), title: "Different title", body: "Short  synthetic NOTE one", ip: "203.0.113.2" });
  assert.equal(e.code, FLOOD_REASONS.DUPLICATE);
  assert.equal(e.status, 409);
  const f = () => new File([new TextEncoder().encode("synthetic file text")], "a.txt", { type: "text/plain" });
  assert.equal(await screen(env, { signed: guest(3), body: "", file: f(), ip: "203.0.113.3" }), null);
  assert.equal((await screen(env, { signed: guest(4), body: "", file: f(), ip: "203.0.113.4" })).code, FLOOD_REASONS.DUPLICATE);
  // outside the 30-day window the same text is accepted again
  const later = Date.now() + FLOOD_DEFAULTS.DUP_WINDOW_MS + 1000;
  assert.equal(await screen(env, { signed: guest(5), body: "short synthetic note one", ip: "203.0.113.5" }, later), null);
});

test("near-duplicate flood: third near copy from the same submitter refused; fourth from anyone refused", async () => {
  const env = intakeStubEnv();
  const g = guest(1);
  assert.equal(await screen(env, { signed: g, body: LONG, ip: "203.0.113.1" }), null);
  assert.equal(await screen(env, { signed: g, body: nearCopy(1), ip: "203.0.113.1" }), null);
  assert.equal((await screen(env, { signed: g, body: nearCopy(2), ip: "203.0.113.1" })).code, FLOOD_REASONS.NEAR_DUPLICATE);
  assert.equal(await screen(env, { signed: g, body: UNRELATED, ip: "203.0.113.1" }), null, "unrelated text from the same submitter passes");

  const env2 = intakeStubEnv();
  for (let i = 0; i < 3; i++) assert.equal(await screen(env2, { signed: guest(10 + i), body: nearCopy(i), ip: "198.51.100." + i }), null, "copy " + i);
  assert.equal((await screen(env2, { signed: guest(20), body: nearCopy(5), ip: "198.51.100.50" })).code, FLOOD_REASONS.NEAR_DUPLICATE);
});

test("rate limits: per submitter (10/h) and per IP (20/h), 429; refused attempts count too; env override", async () => {
  const env = intakeStubEnv();
  const g = guest(1);
  for (let i = 0; i < FLOOD_DEFAULTS.USER_PER_HOUR; i++) assert.equal(await screen(env, { signed: g, body: "note " + i, ip: "203.0.113." + i }), null, "item " + i);
  const e = await screen(env, { signed: g, body: "note next", ip: "203.0.113.99" });
  assert.equal(e.code, FLOOD_REASONS.RATE_LIMITED);
  assert.equal(e.status, 429);

  const env2 = intakeStubEnv();
  for (let i = 0; i < FLOOD_DEFAULTS.IP_PER_HOUR; i++) assert.equal(await screen(env2, { signed: guest(i), body: "ip note " + i, ip: "192.0.2.7" }), null);
  assert.equal((await screen(env2, { signed: guest(999), body: "ip note next", ip: "192.0.2.7" })).code, FLOOD_REASONS.RATE_LIMITED);
  assert.equal(await screen(env2, { signed: guest(999), body: "ip note next", ip: "192.0.2.8" }), null, "other IP unaffected");

  const env3 = intakeStubEnv();
  for (let i = 0; i < FLOOD_DEFAULTS.USER_PER_HOUR; i++) {
    const r = await screen(env3, { signed: g, body: "zero\u200Bwidth " + i, ip: "203.0.113.1" });
    assert.equal(r.code, "INTAKE-TEXT-INVISIBLE");
  }
  assert.equal((await screen(env3, { signed: g, body: "clean now", ip: "203.0.113.1" })).code, FLOOD_REASONS.RATE_LIMITED, "hammering with refused content trips the limit");

  const env4 = intakeStubEnv({ INTAKE_RATE_USER_PER_HOUR: "2" });
  assert.equal(await screen(env4, { signed: g, body: "a1" }), null);
  assert.equal(await screen(env4, { signed: g, body: "a2" }), null);
  assert.equal((await screen(env4, { signed: g, body: "a3" })).code, FLOOD_REASONS.RATE_LIMITED);
  // window rolls: an hour later the hourly limit resets
  assert.equal(await screen(env4, { signed: g, body: "a4" }, Date.now() + 3600e3 + 1000), null);
});

test("fail closed: flood store down or missing refuses guests (503); operator still passes", async () => {
  const down = intakeStubEnv({ failFlood: true });
  const e = await screen(down, { signed: guest(1), body: "synthetic" });
  assert.equal(e.code, FLOOD_REASONS.STORE_UNAVAILABLE);
  assert.equal(e.status, 503);
  assert.equal(await screen(down, { signed: OPERATOR, operator: true, body: "synthetic" }), null);
  const noDb = intakeStubEnv();
  delete noDb.DB;
  assert.equal((await screen(noDb, { signed: guest(1), body: "synthetic" })).code, FLOOD_REASONS.STORE_UNAVAILABLE);
});

test("operator is exempt from flood and rate, but leaves a hash so a guest cannot re-flood the same text", async () => {
  const env = intakeStubEnv();
  for (let i = 0; i < 15; i++) assert.equal(await screen(env, { signed: OPERATOR, operator: true, body: LONG }), null);
  assert.equal((await screen(env, { signed: guest(1), body: LONG, ip: "203.0.113.1" })).code, FLOOD_REASONS.DUPLICATE);
});

test("bookkeeping is hash-only: no text, filename or raw IP in intake_seen or receipts", async () => {
  const env = intakeStubEnv();
  await screen(env, { signed: guest(1), body: LONG, ip: "203.0.113.77", file: new File([new TextEncoder().encode(LONG)], "secret-name-" + MARK + ".txt") });
  await screen(env, { signed: guest(1), body: LONG, ip: "203.0.113.77", file: new File([new TextEncoder().encode(LONG)], "secret-name-" + MARK + ".txt") });
  const blob = JSON.stringify(env.tables);
  assert.ok(env.tables.intake_seen.length === 1 && env.tables.intake_refusals.length === 1);
  for (const bad of [MARK, "203.0.113.77", "secret-name", "term"]) assert.ok(!blob.includes(bad), bad);
  const row = env.tables.intake_seen[0];
  assert.match(row.submitter_key, /^[0-9a-f]{64}$/);
  assert.match(row.ip_key, /^[0-9a-f]{64}$/);
  assert.equal(row.submitter_key, submitterKey(env, "user", "u-synthetic-1"));
  assert.equal(contentWritten(env), false);
});

test("door path: ingestRecord duplicate refused before any content write", async () => {
  const env = intakeStubEnv();
  env.tables.intake_seen.push({ seen_id: "seed", created_utc: new Date().toISOString(), door: "upload", content_sha256: contentHash({ body: "synthetic duplicate body", texts: [] }), minhash: null, submitter_key: null, ip_key: null });
  let err;
  try { await ingestRecord(env, { signed: guest(1), title: "Synthetic", body: "synthetic duplicate body", intake: { door: "v1-ingest", ip: "203.0.113.5" } }); } catch (e) { err = e; }
  assert.ok(err && err.intake_refused);
  assert.equal(err.code, FLOOD_REASONS.DUPLICATE);
  assert.equal(contentWritten(env), false);
});

test("POST /v1/ingest over the rate limit: 429 with a hash-only receipt", async () => {
  const env = intakeStubEnv();
  const g = guest(1);
  const key = submitterKey(env, "user", g.user_id);
  for (let i = 0; i < FLOOD_DEFAULTS.USER_PER_HOUR; i++) env.tables.intake_seen.push({ seen_id: "s" + i, created_utc: new Date().toISOString(), door: "v1-ingest", content_sha256: "x" + i, minhash: null, submitter_key: key, ip_key: null });
  const req = new Request(HOST + "/v1/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Synthetic", markdown: "fresh synthetic text " + MARK }) });
  const res = await handleLibraryIngestApi(req, new URL(req.url), env, g);
  const body = await res.json();
  assert.equal(res.status, 429);
  assert.equal(body.reason_code, FLOOD_REASONS.RATE_LIMITED);
  assert.equal(body.stored, false);
  assert.ok(!JSON.stringify(body).includes(MARK));
  assert.equal(contentWritten(env), false);
});

test("Jeeves / agent door: rate limit is per real caller, not the shared jeeves-public identity", async () => {
  const { jeevesUpload } = await import("./jeeves.js");
  const env = intakeStubEnv();
  const g = guest(1);
  const key = submitterKey(env, "user", g.user_id);
  const shared = submitterKey(env, "user", "jeeves-public");
  // another caller already used up "their" budget under the shared identity; g must not be affected
  for (let i = 0; i < FLOOD_DEFAULTS.USER_PER_HOUR; i++) env.tables.intake_seen.push({ seen_id: "j" + i, created_utc: new Date().toISOString(), door: "jeeves-upload", content_sha256: "y" + i, minhash: null, submitter_key: shared, ip_key: null });
  let err = null;
  try { await jeevesUpload(env, { signed: g, title: "Synthetic", body: "fresh synthetic agent note" }); } catch (e) { err = e; }
  assert.ok(!(err && err.code === FLOOD_REASONS.RATE_LIMITED), "shared identity must not throttle a different caller");
  for (let i = 0; i < FLOOD_DEFAULTS.USER_PER_HOUR; i++) env.tables.intake_seen.push({ seen_id: "k" + i, created_utc: new Date().toISOString(), door: "jeeves-upload", content_sha256: "z" + i, minhash: null, submitter_key: key, ip_key: null });
  err = null;
  try { await jeevesUpload(env, { signed: g, title: "Synthetic", body: "another fresh agent note" }); } catch (e) { err = e; }
  assert.equal(err && err.code, FLOOD_REASONS.RATE_LIMITED);
});
