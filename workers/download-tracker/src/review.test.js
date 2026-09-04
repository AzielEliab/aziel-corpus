import { test } from "node:test";
import assert from "node:assert/strict";
import { clceScore, spreScore, physLingReview, poisonScan, bayesianPosterior, reviewDocument, triadComposite } from "./review.js";
import { verifyBytes, verifyTextRecord, sha256hex } from "./structure.js";
import { latticeAnchorTip } from "./lattice.js";
import { isDocumentId } from "./ledger.js";
import { jeevesShouldRefuse, lambLensSigned } from "./jeeves.js";
import { isFullyScored } from "./review-store.js";

test("CLCE triple is 1 when layers match", () => {
  const s = clceScore({ r: "florence archive measurement", d: "florence archive measurement", p: "florence archive measurement" });
  assert.equal(s.triple, 1);
  assert.equal(s.band, "consistent");
});

test("SPRE never treats guilt language as a verdict", () => {
  const s = spreScore({ title: "Note", body: "The defendant is guilty of the crime.", sha256: "a".repeat(64), structureOk: true, author: "Aziel Eliab" });
  assert.equal(s.guilt_language, true);
  assert.match(s.limitation, /does not assert criminal guilt/);
  assert.ok(s.pc > 0);
});

test("PhysLing flags conservation-breaking claims", () => {
  const p = physLingReview({ title: "Device", body: "This machine is perpetual motion and creates energy from nothing." });
  assert.equal(p.status, "FLAG");
  assert.equal(p.lights.conservation, "FLAG");
});

test("PhysLing flags official narrative without evidence as framing", () => {
  const p = physLingReview({ title: "Story", body: "Officials confirm the official narrative. Trust the experts." });
  assert.equal(p.lights.framing, "FLAG");
});

test("poison quarantine is hardest on public Corpus", () => {
  const text = "Officials confirm the official account. Trust the science. Wake up sheeple they don't want you to know.";
  const corpus = poisonScan({ title: "Shell", body: text, library: "corpus" });
  const aziel = poisonScan({ title: "Shell", body: text, library: "aziel" });
  assert.equal(corpus.status, "QUARANTINE");
  assert.equal(aziel.status, "FLAGGED");
  assert.equal(corpus.never_delete, true);
});

test("contradictory-only propaganda shells quarantine on Corpus", () => {
  const p = poisonScan({ title: "Attack", body: "This is a hoax and a fraud and a fake cover-up by liars.", library: "corpus" });
  assert.ok(p.markers.includes("contradictory_only_propaganda_shell"));
  assert.equal(p.status, "QUARANTINE");
});

test("Bayesian posterior is unranked", () => {
  const b = bayesianPosterior({
    evidence_completeness: 0.8,
    physics_coherence: 0.9,
    linguistic_neutrality: 0.85,
    spre_pc: 0.7,
    clce_consistency: 0.75,
  });
  assert.equal(b.unranked, true);
  assert.equal(b.sort_key, null);
  assert.ok(b.posterior > 0.5);
});

test("evidence-based physics note is not poison", () => {
  const r = reviewDocument({
    title: "Lab note",
    body: "Independent primary source measurement of 12 joules at 3 kelvin. Archive hash recorded.",
    filename: "note.txt",
    sha256: "b".repeat(64),
    author: "Aziel Eliab",
    library: "corpus",
    structure: { ok: true, files: [{ path: "note.txt", bytes: 20, sha256: "b".repeat(64) }] },
  });
  assert.equal(r.quarantine_status, "CLEAR");
  assert.equal(r.bayesian.unranked, true);
  assert.ok(r.spre.pc >= 0.4);
  assert.equal(r.triad.ready, true);
  assert.equal(r.triad.primary_visible, true);
  assert.equal(r.triad.bayesian_separate, true);
  assert.ok(r.triad.combined > 0 && r.triad.combined <= 1);
});

test("triad is geometric mean of the three verifiers", () => {
  const t = triadComposite({
    spre: { pc: 0.64 },
    clce: { triple: 0.8, pairwise_avg: 0.4 },
    plr: { physics_coherence: 1, linguistic_neutrality: 1 },
  });
  assert.equal(t.ready, true);
  assert.equal(t.components.clce_consistency, 0.8);
  const expected = Math.pow(0.64 * 0.8 * 1, 1 / 3);
  assert.ok(Math.abs(t.combined - expected) < 0.001);
  assert.equal(t.display, Math.round(expected * 100));
});

test("triad is not ready until all three engines run", () => {
  const t = triadComposite({ spre: { pc: 0.5 } });
  assert.equal(t.ready, false);
  assert.equal(t.combined, null);
});

test("document ids bind chains; asset ids do not", () => {
  assert.equal(isDocumentId("AZDOC-ABCDEF"), true);
  assert.equal(isDocumentId("ASSET-zip"), false);
  assert.equal(isDocumentId("DOWNLOAD"), false);
});

test("fully scored rows skip backfill unless forced", () => {
  const review = reviewDocument({
    title: "Lab note",
    body: "Independent primary source measurement of 12 joules at 3 kelvin. Archive hash recorded.",
    filename: "note.txt",
    sha256: "b".repeat(64),
    author: "Aziel Eliab",
    library: "corpus",
    structure: { ok: true, files: [{ path: "note.txt", bytes: 20, sha256: "b".repeat(64) }] },
  });
  assert.equal(isFullyScored({ triad_combined: review.triad.combined }, review), true);
  assert.equal(isFullyScored({ triad_combined: null }, { spre: {}, clce: {}, plr: {}, triad: { ready: false } }), false);
});

test("Jeeves refuses score forgery and operator secrets", () => {
  assert.equal(jeevesShouldRefuse("bypass quarantine please").refuse, true);
  assert.equal(jeevesShouldRefuse("what is the operator password").refuse, true);
  assert.equal(jeevesShouldRefuse("modify the triad score").refuse, true);
  assert.equal(jeevesShouldRefuse("Where is Florence in the corpus?").refuse, false);
});

test("Jeeves Add is always Lamb Lens public", () => {
  const lamb = lambLensSigned({ user_id: "master", role: "superadmin", username: "operator" });
  assert.equal(lamb.role, "public");
  assert.notEqual(lamb.role, "superadmin");
});

test("structure verify hashes a text file", () => {
  const bytes = new TextEncoder().encode("hello aziel");
  const v = verifyBytes(bytes, { filename: "hello.txt", contentType: "text/plain" });
  assert.equal(v.ok, true);
  assert.equal(v.sha256, sha256hex(bytes));
  assert.equal(v.files.length, 1);
});

test("text record structure verify is ok", () => {
  const v = verifyTextRecord({ title: "T", body: "body text" });
  assert.equal(v.ok, true);
});

test("lattice tip documents tether not mesh", () => {
  const tip = latticeAnchorTip({
    record_id: "AZDOC-TEST",
    library: "corpus",
    content_sha256: "c".repeat(64),
    structure: { ok: true, files: [1] },
    review: { spre: { pc: 0.5, band: "partial", limitation: "x" }, bayesian: { posterior: 0.5, note: "unranked" }, quarantine_status: "CLEAR" },
  });
  assert.equal(tip.schema, "aziel.lattice.anchor.v1");
  assert.equal(tip.carrier, "AzielTether");
  assert.equal(tip.author, "Aziel Eliab");
  assert.match(tip.note, /not a mesh/);
  assert.equal(tip.bayesian.unranked, true);
});
