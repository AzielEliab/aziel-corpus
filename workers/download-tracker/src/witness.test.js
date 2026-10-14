import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { checkLog, loadLog, handleWitness, witnessBody, canonicalize, keyForN, etTime, isWitnessPath, WITNESS_CURRENT_KEY } from "./witness.js";
import { EXPLORE_LINKS } from "./explore-nav.js";

// Snapshot of the real aziel-anchors anchors/log.jsonl (n=1..18), used offline only.
const REAL = fs.readFileSync(new URL("./fixtures/witness-log.jsonl", import.meta.url), "utf8");
const lines = () => REAL.split("\n").filter(Boolean);

test("real log: every record passes, n from 1, retired key for n<=2", async () => {
  const r = await checkLog(REAL);
  assert.equal(r.ok, true, r.problems.join("; "));
  assert.equal(r.count, lines().length);
  assert.equal(r.entries[0].n, 1);
  assert.notEqual(keyForN(1), WITNESS_CURRENT_KEY);
  assert.equal(keyForN(3), WITNESS_CURRENT_KEY);
  assert.ok(r.entries.every((e) => e.heads.length > 0));
});

test("edited statement fails hash + signature", async () => {
  const L = lines(); const row = JSON.parse(L[3]); row.statement.heads.chains[0].seq += 1; L[3] = JSON.stringify(row);
  const r = await checkLog(L.join("\n"));
  assert.equal(r.ok, false);
  assert.equal(r.entries[3].checks.hash, false);
  assert.equal(r.entries[3].checks.signature, false);
});

test("edit + re-hash still fails signature", async () => {
  const L = lines(); const row = JSON.parse(L[5]); row.statement.observed_at = "2026-01-01T00:00:00Z";
  row.statement_hash = crypto.createHash("sha256").update(canonicalize(row.statement)).digest("hex"); L[5] = JSON.stringify(row);
  const r = await checkLog(L.join("\n"));
  assert.equal(r.entries[5].checks.hash, true);
  assert.equal(r.entries[5].checks.signature, false);
  assert.equal(r.ok, false);
});

test("self-signed row with its own key fails pinned_key", async () => {
  const L = lines(); const row = JSON.parse(L[4]);
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  row.public_key = publicKey.export({ type: "spki", format: "der" }).subarray(12).toString("base64url");
  row.sig = crypto.sign(null, Buffer.from(canonicalize(row.statement)), privateKey).toString("base64url");
  L[4] = JSON.stringify(row);
  const r = await checkLog(L.join("\n"));
  assert.equal(r.entries[4].checks.pinned_key, false);
  assert.equal(r.entries[4].checks.signature, false);
});

test("deleted or reordered row fails order/prev link", async () => {
  const L = lines(); L.splice(2, 1);
  let r = await checkLog(L.join("\n"));
  assert.equal(r.ok, false); assert.equal(r.entries[2].checks.n_in_order, false); assert.equal(r.entries[2].checks.prev_link, false);
  const M = lines(); [M[6], M[7]] = [M[7], M[6]];
  r = await checkLog(M.join("\n")); assert.equal(r.ok, false);
});

test("empty / garbage log is not ok", async () => {
  assert.equal((await checkLog("")).ok, false);
  const r = await checkLog(REAL + "\nnot json\n");
  assert.equal(r.ok, false);
});

test("loadLog caches; 429 is limit; 500 and throw are unreadable", async () => {
  const store = new Map(); let calls = 0;
  const cache = { match: async (k) => (store.has(k) ? new Response(store.get(k).body, { headers: store.get(k).h }) : null), put: async (k, res) => { store.set(k, { body: await res.text(), h: Object.fromEntries(res.headers) }); } };
  const fetchImpl = async () => { calls++; return new Response(REAL, { status: 200 }); };
  const a = await loadLog({ fetchImpl, cache }); const b = await loadLog({ fetchImpl, cache });
  assert.equal(calls, 1); assert.equal(a.cached, false); assert.equal(b.cached, true); assert.equal(b.text, REAL);
  await assert.rejects(loadLog({ fetchImpl: async () => new Response("", { status: 429 }), cache: null }), (e) => e.kind === "limit");
  await assert.rejects(loadLog({ fetchImpl: async () => new Response("", { status: 500 }), cache: null }), (e) => e.kind === "unreadable");
  await assert.rejects(loadLog({ fetchImpl: async () => new Response("", { status: 302 }), cache: null }), (e) => e.kind === "unreadable");
  await assert.rejects(loadLog({ fetchImpl: async () => { throw new Error("down"); }, cache: null }), (e) => e.kind === "unreadable");
});

test("handler: 200 lists newest first; 503 + try again later on limit; one witness only", async () => {
  const ok = await handleWitness(new Request("https://x/witness"), {}, null, { fetchImpl: async () => new Response(REAL), cache: null });
  assert.equal(ok.status, 200); const html = await ok.text();
  assert.match(html, /Only one witness exists/);
  assert.ok(html.indexOf(`id="n${lines().length}"`) < html.indexOf('id="n1"'));
  const own = witnessBody(await checkLog(REAL), { fetched_at: new Date().toISOString() });
  assert.doesNotMatch(own, /\blive\b|\bverified\b/i);
  const lim = await handleWitness(new Request("https://x/witness"), {}, null, { fetchImpl: async () => new Response("", { status: 429 }), cache: null });
  assert.equal(lim.status, 503); assert.ok(lim.headers.get("retry-after")); assert.match(await lim.text(), /Try again later/);
  const j = await handleWitness(new Request("https://x/witness.json"), {}, null, { fetchImpl: async () => new Response("", { status: 500 }), cache: null });
  const body = await j.json(); assert.equal(body.ok, false); assert.equal(body.code, "WITNESS-LOG-UNREADABLE"); assert.equal(body.witness2, "not_configured");
});

test("failed rows never say passed", async () => {
  const L = lines(); const row = JSON.parse(L[0]); row.sig = row.sig.slice(0, -2) + "AA"; L[0] = JSON.stringify(row);
  const r = await checkLog(L.join("\n"));
  const html = witnessBody(r, { fetched_at: new Date().toISOString() });
  assert.match(html, /failed a check/); assert.match(html, /Signature did NOT check out/);
  assert.doesNotMatch(html, /All \d+ records passed/);
});

test("ET time, routes, nav chip", () => {
  assert.equal(etTime("2026-10-14T14:29:20Z"), "Oct 14, 2026, 10:29:20 AM ET");
  assert.equal(etTime("nope"), "unknown time");
  assert.ok(isWitnessPath("/witness") && isWitnessPath("/witness.json") && !isWitnessPath("/witnesses"));
  assert.ok(EXPLORE_LINKS.some((l) => l.href === "/witness" && l.label === "Witness"));
});
