/**
 * CORPUS-INTAKE-SAFETY-1.0 (d) — AZBot review #187: per-IP bucket is the IPv6 /64,
 * and a follow-up screen of the same request (ctx.followup) is one submission.
 * Synthetic inputs only (documentation address ranges RFC 3849 / RFC 5737).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { FLOOD_REASONS } from "./intake-flood.js";
import { screenIntake, submitterKey, ipBucket } from "./intake-gate.js";
import { intakeStubEnv } from "./fixtures/intake-env.js";

const guest = (n) => ({ user_id: "u-synthetic-r" + n, username: "synthetic-r" + n, role: "user" });
const WORDS = Array.from({ length: 60 }, (_, i) => "term" + ((i * 7919) % 1000));
const LONG = WORDS.join(" ");
const nearCopy = (k) => WORDS.map((w, i) => (i === 59 - k ? "edit" + k : w)).join(" ");
const pass = (env, input, now = Date.now()) => screenIntake(env, { door: "upload", title: "Synthetic", ...input }, { now });
async function code(env, input, now) {
  try { await pass(env, input, now); return null; } catch (e) { return e.code; }
}
const seenRows = (env) => env.tables.intake_seen.length;

test("#187 IPv6: addresses in one /64 share an IP key; another /64, IPv4, and IPv4-mapped behave", () => {
  const env = intakeStubEnv();
  const k = (ip) => submitterKey(env, "ip", ip);
  assert.equal(k("2001:db8:1:2::1"), k("2001:db8:1:2:abcd:ef01:2345:6789"));
  assert.equal(k("2001:db8:1:2::1"), k("2001:0DB8:0001:0002::ffff"), "case and zero padding normalised");
  assert.equal(k("2001:db8:1:2::1"), k("[2001:db8:1:2::9]"));
  assert.notEqual(k("2001:db8:1:2::1"), k("2001:db8:1:3::1"));
  assert.equal(k("::ffff:198.51.100.7"), k("198.51.100.7"));
  assert.notEqual(k("198.51.100.7"), k("198.51.100.8"), "IPv4 stays per address");
  assert.equal(ipBucket("2001:db8:1:2:3:4:192.0.2.1"), "v6/64:2001:db8:1:2");
});

test("#187 IPv6: rotating the low 64 bits does not escape the per-IP limit", async () => {
  const env = intakeStubEnv({ INTAKE_RATE_IP_PER_HOUR: "2" });
  assert.equal(await code(env, { signed: guest(1), body: "synthetic note alpha", ip: "2001:db8:1:2::1" }), null);
  assert.equal(await code(env, { signed: guest(2), body: "synthetic note beta", ip: "2001:db8:1:2::2" }), null);
  assert.equal(await code(env, { signed: guest(3), body: "synthetic note gamma", ip: "2001:db8:1:2:ffff::3" }), FLOOD_REASONS.RATE_LIMITED);
  assert.equal(await code(env, { signed: guest(4), body: "synthetic note delta", ip: "2001:db8:1:3::1" }), null, "a different /64 has its own bucket");
});

test("#187 followup: the same request screened twice is not its own duplicate and writes one row", async () => {
  const env = intakeStubEnv();
  const first = await pass(env, { door: "ocr", signed: guest(1), body: "synthetic scanned page text", ip: "203.0.113.9" });
  assert.equal(seenRows(env), 1);
  const second = await pass(env, { door: "upload", signed: guest(1), body: "synthetic scanned page text", ip: "203.0.113.9", followup: first });
  assert.equal(second.followup, first);
  assert.equal(seenRows(env), 1, "no second intake_seen row");
  // A fresh (non-follow-up) resubmission is still a duplicate.
  assert.equal(await code(env, { signed: guest(2), body: "synthetic scanned page text", ip: "203.0.113.10" }), FLOOD_REASONS.DUPLICATE);
});

test("#187 followup: no second rate count", async () => {
  const env = intakeStubEnv({ INTAKE_RATE_USER_PER_HOUR: "1", INTAKE_RATE_IP_PER_HOUR: "1" });
  const first = await pass(env, { door: "ocr", signed: guest(1), body: "synthetic note for rate", ip: "203.0.113.20" });
  await pass(env, { door: "upload", signed: guest(1), body: "synthetic note for rate", ip: "203.0.113.20", followup: first });
  assert.equal(await code(env, { signed: guest(1), body: "a different synthetic note", ip: "203.0.113.21" }), FLOOD_REASONS.RATE_LIMITED, "a real second request still counts");
});

test("#187 followup: its own row is not a near copy, but earlier near copies still count", async () => {
  const env = intakeStubEnv();
  const g = guest(1);
  await pass(env, { signed: g, body: LONG, ip: "203.0.113.30" });
  const p = await pass(env, { door: "ocr", signed: g, body: nearCopy(1), ip: "203.0.113.30" });
  assert.equal(await code(env, { signed: g, body: nearCopy(1), ip: "203.0.113.30", followup: p }), null);
  assert.equal(seenRows(env), 2);
  assert.equal(await code(env, { signed: g, body: nearCopy(2), ip: "203.0.113.30" }), FLOOD_REASONS.NEAR_DUPLICATE, "a fresh third near copy is still refused");
});

test("#187 followup: only the request's own row is excluded; other copies and forged followups are not", async () => {
  const env = intakeStubEnv();
  await pass(env, { signed: guest(1), body: "synthetic text one", ip: "203.0.113.40" });
  const other = await pass(env, { door: "ocr", signed: guest(2), body: "synthetic text two", ip: "203.0.113.41" });
  assert.equal(await code(env, { signed: guest(2), body: "synthetic text one", ip: "203.0.113.41", followup: other }), FLOOD_REASONS.DUPLICATE);
  const forged = { seen_id: env.tables.intake_seen[0].seen_id, door: "ocr" };
  assert.equal(await code(env, { signed: guest(3), body: "synthetic text one", ip: "203.0.113.42", followup: forged }), FLOOD_REASONS.DUPLICATE, "a plain object is not a pass");
});

test("#187 followup: operator follow-up writes no second row", async () => {
  const env = intakeStubEnv();
  const first = await screenIntake(env, { door: "ocr", operator: true, title: "Synthetic", body: "synthetic operator text" });
  await screenIntake(env, { door: "upload", operator: true, title: "Synthetic", body: "synthetic operator text", followup: first });
  assert.equal(seenRows(env), 1);
});
