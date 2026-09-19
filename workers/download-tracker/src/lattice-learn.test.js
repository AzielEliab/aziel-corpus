import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HASHCHAIN_LEARN_LAW,
  POSSIBILITY_KIND,
  POSSIBILITY_NOTE,
  MAP4D_CITE,
  POISON_LEARN_RECORD_ID,
  possibilityScore,
  possibilityRefuse,
  poisonFeatureReceipt,
  matchLearnedPoison,
  verifyChainWalk,
  haversineKm,
  compactPossibility,
  pinFromUpload,
  loadLearnStamps,
} from "./lattice-learn.js";
import { bayesianPosterior, reviewDocument } from "./review.js";

test("possibility is HEURISTIC and separate from Bayesian", () => {
  const bayes = bayesianPosterior({
    evidence_completeness: 0.9,
    physics_coherence: 0.9,
    linguistic_neutrality: 0.9,
    spre_pc: 0.9,
    clce_consistency: 0.9,
  });
  const poss = possibilityScore({
    anchors: [{ date: "1936-08", lat: 47.6, lon: -122.3, place: "Seattle" }],
    latticeOk: true,
  });
  assert.equal(bayes.schema, "aziel.bayesian.v1");
  assert.equal(poss.schema, "aziel.possibility.v1");
  assert.equal(poss.kind, POSSIBILITY_KIND);
  assert.equal(poss.kind, "HEURISTIC");
  assert.notEqual(poss.schema, bayes.schema);
  assert.ok(poss.possibility >= 0 && poss.possibility <= 1);
  assert.match(poss.note, /HEURISTIC/);
  assert.match(POSSIBILITY_NOTE, /HEURISTIC density over lattice pin receipts/);
  assert.doesNotMatch(POSSIBILITY_NOTE, /possibility ≠/);
  assert.equal(poss.bayesian_separate, true);
  assert.equal(poss.triad_separate, true);
  assert.equal(poss.zsolver_separate, true);
  assert.equal(poss.not_truth, true);
  assert.equal(poss.not_court, true);
  assert.notEqual(poss.possibility, bayes.posterior);
});

test("possibility refuses without inventing a score as truth", () => {
  assert.equal(possibilityScore({ anchors: [], latticeOk: true }).refuse, "NO_ANCHORS");
  assert.equal(possibilityScore({ latticeOk: false }).refuse, "LATTICE_BREAK");
  assert.equal(possibilityScore({ anchors: [{ date: "1936", lat: 47, lon: -122 }], poison: true }).refuse, "POISON_BLOCK");
  assert.equal(possibilityScore({ structureOk: false, anchors: [{ date: "1936", lat: 47, lon: -122 }] }).refuse, "STRUCTURE_FAIL");
  for (const r of ["NO_ANCHORS", "LATTICE_BREAK", "POISON_BLOCK", "STRUCTURE_FAIL"]) {
    const p = possibilityRefuse(r);
    assert.equal(p.possibility, null);
    assert.equal(p.refuse, r);
    assert.equal(p.not_truth, true);
  }
});

test("travel contradiction lowers possibility versus a single local pin", () => {
  const local = possibilityScore({
    anchors: [{ date: "1936-08-01", lat: 47.6, lon: -122.3 }],
  });
  const jump = possibilityScore({
    anchors: [
      { date: "1936-08-01", lat: 47.6, lon: -122.3 },
      { date: "1936-08-01", lat: -33.8, lon: 151.2 },
    ],
  });
  assert.equal(local.refuse, null);
  assert.equal(jump.refuse, null);
  assert.ok(jump.possibility < local.possibility);
  assert.ok(jump.components.contradiction_density > 0);
});

test("support density from LEARN stamps can raise possibility", () => {
  const alone = possibilityScore({
    anchors: [{ date: "1936-08", lat: 47.6, lon: -122.3 }],
    learnStamps: [],
  });
  const supported = possibilityScore({
    anchors: [{ date: "1936-08", lat: 47.6, lon: -122.3 }],
    learnStamps: [
      { kind: "accept", anchors: [{ date: "1936-08", lat: 47.61, lon: -122.32 }] },
      { kind: "accept", anchors: [{ date: "1936-07", lat: 47.59, lon: -122.28 }] },
    ],
  });
  assert.ok(supported.components.support_density > alone.components.support_density);
  assert.ok(supported.possibility >= alone.possibility);
});

test("haversine Seattle–Sydney is thousands of km", () => {
  const km = haversineKm({ lat: 47.6, lon: -122.3 }, { lat: -33.87, lon: 151.21 });
  assert.ok(km > 10000);
});

test("poison-learn feature receipt never retains a body", () => {
  const feat = poisonFeatureReceipt({
    title: "Officials confirm the official narrative",
    body: "SECRET POISON PAYLOAD that must not be stored",
    filename: "shell.txt",
    sha256: "ab".repeat(32),
    markers: ["official_narrative_without_independent_evidence"],
  });
  const blob = JSON.stringify(feat);
  assert.equal(feat.body_retained, false);
  assert.ok(feat.feature_id);
  assert.equal(feat.content_sha256, "ab".repeat(32));
  assert.ok(feat.markers.includes("official_narrative_without_independent_evidence"));
  assert.equal(blob.includes("SECRET POISON PAYLOAD"), false);
  assert.match(feat.note, /not stored/);
});

test("learned poison matches exact sha and feature jaccard without body", () => {
  const a = poisonFeatureReceipt({
    title: "Officials confirm the official narrative. Trust the experts.",
    filename: "a.txt",
    sha256: "cd".repeat(32),
    markers: ["official_narrative_without_independent_evidence"],
  });
  const b = poisonFeatureReceipt({
    title: "Officials confirm the official narrative. Trust the experts.",
    filename: "a.txt",
    sha256: "ef".repeat(32),
    markers: ["official_narrative_without_independent_evidence"],
  });
  assert.equal(matchLearnedPoison(a, [a]).reason, "content_sha256");
  const byFeature = matchLearnedPoison({ ...b, content_sha256: null }, [{ ...a, content_sha256: null }]);
  assert.equal(byFeature.match, true);
  assert.ok(byFeature.reason === "feature_id" || byFeature.reason === "feature_jaccard");
  assert.equal(matchLearnedPoison({ token_hashes: ["1"], markers: ["x"] }, []).match, false);
});

test("chain walk fails closed on prev-hash break", () => {
  const ok = verifyChainWalk([
    { sequence: 1, previous_hash: "0".repeat(64), entry_hash: "a".repeat(64), action: "LEARN" },
    { sequence: 2, previous_hash: "a".repeat(64), entry_hash: "b".repeat(64), action: "MAP_PIN" },
  ]);
  assert.equal(ok.ok, true);
  assert.equal(ok.stamps.length, 2);
  const broken = verifyChainWalk([
    { sequence: 1, previous_hash: "0".repeat(64), entry_hash: "a".repeat(64), action: "LEARN" },
    { sequence: 2, previous_hash: "ffff", entry_hash: "b".repeat(64), action: "MAP_PIN" },
  ]);
  assert.equal(broken.ok, false);
  assert.equal(broken.refuse, "LATTICE_BREAK");
  assert.deepEqual(broken.stamps, []);
  assert.equal(broken.law, HASHCHAIN_LEARN_LAW);
});

test("review document keeps possibility pending and Bayesian separate", () => {
  const r = reviewDocument({
    title: "Lab note",
    body: "Independent primary source measurement of 12 joules at 3 kelvin in Florence, 1936. Archive hash recorded.",
    filename: "note.txt",
    sha256: "b".repeat(64),
    author: "Aziel Eliab",
    library: "corpus",
    structure: { ok: true, files: [{ path: "note.txt" }] },
  });
  assert.equal(r.bayesian.unranked, true);
  assert.equal(r.possibility.kind, "HEURISTIC");
  assert.equal(r.possibility.refuse, "PENDING_ANCHORS");
  assert.equal(r.possibility.possibility, null);
  assert.equal(r.triad.bayesian_separate, true);
});

test("pinFromUpload fails closed on structure and poison without inventing pins", async () => {
  const ledgers = [];
  const poisonEnv = {
    DB: {
      prepare(sql) {
        return {
          bind() { return this; },
          async run() {
            ledgers.push(sql);
            return { success: true };
          },
          async first() { return null; },
          async all() { return { results: [] }; },
        };
      },
    },
  };
  const struct = await pinFromUpload(poisonEnv, {
    recordId: "AZDOC-TEST1",
    structure: { ok: false, files: [] },
    poison: { status: "CLEAR", suspected: false },
    sha256: "11".repeat(32),
    library: "corpus",
  });
  assert.equal(struct.ok, false);
  assert.equal(struct.refuse, "STRUCTURE_FAIL");
  assert.equal(struct.pinned, 0);
  assert.equal(struct.possibility.possibility, null);

  const blocked = await pinFromUpload(poisonEnv, {
    recordId: "AZDOC-TEST2",
    structure: { ok: true, files: [1] },
    poison: { status: "QUARANTINE", suspected: true, markers: ["official_narrative_without_independent_evidence"] },
    sha256: "22".repeat(32),
    library: "corpus",
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.refuse, "POISON_BLOCK");
  assert.equal(blocked.pinned, 0);
  assert.equal(blocked.possibility.refuse, "POISON_BLOCK");
  assert.ok(ledgers.some((s) => /document_ledger|ledger/i.test(s)));
});

test("loadLearnStamps reads LEARN accept receipts from the document lattice", async () => {
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind() { return this; },
          async all() {
            return {
              results: [
                { payload_json: JSON.stringify({ kind: "accept", anchors: [{ date: "1936-08", lat: 47.6, lon: -122.3 }] }) },
                { payload_json: JSON.stringify({ kind: "reject", anchors: [] }) },
              ],
            };
          },
        };
      },
    },
  };
  const stamps = await loadLearnStamps(env, { excludeRecordId: "AZDOC-X", limit: 16 });
  assert.equal(stamps.length, 1);
  assert.equal(stamps[0].kind, "accept");
  assert.equal(stamps[0].anchors[0].place, undefined);
  assert.equal(stamps[0].anchors[0].lat, 47.6);
});

test("4DMap cite is not an ICANN mesh claim", () => {
  assert.equal(MAP4D_CITE.spec, "4DM-WP-1.0");
  assert.match(MAP4D_CITE.cite, /github.com\/AzielEliab\/4dmap/);
  assert.match(MAP4D_CITE.note, /not a live ICANN mesh DNS/i);
  assert.equal(POISON_LEARN_RECORD_ID, "AZDOC-POISONLEARN");
  const c = compactPossibility(possibilityRefuse("NO_ANCHORS"));
  assert.equal(c.possibility, null);
  assert.equal(c.not_truth, true);
});
