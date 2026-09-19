import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyComponentApplicability,
  classifyPhysLingApplicability,
  classifySpreApplicability,
  classifyClceApplicability,
  publicEngineView,
  publicComponentFlags,
} from "./review-applicability.js";
import {
  reviewDocument,
  triadComposite,
  publicizeReview,
  applyApplicabilityToReview,
  TRIAD_SCHEMA,
} from "./review.js";
import { recordBody } from "./hosted-pages.js";

const BANNED = /\+25|quiet (Aziel|triad|boost)|blocked.from|what this is not/i;

const LAB = {
  title: "Lab note",
  body: "Independent primary source measurement of 12 joules at 3 kelvin. Archive hash recorded.",
  filename: "note.txt",
  sha256: "b".repeat(64),
  author: "Aziel Eliab",
  domain: "energy",
};

const PHILOSOPHY = {
  title: "A short treatise on meaning",
  body: "This essay argues that belief stays with the claim. Epistemology is the subject of the treatise.",
  filename: "essay.md",
  sha256: "c".repeat(64),
  author: "Aziel Eliab",
  domain: "philosophy",
  subjects: "philosophy, epistemology",
};

const SOFTWARE = {
  title: "azbrowser-aziel-dossier-1.0.md",
  body: "Software dossier describing the local-first browser platform, APIs, and hash-chain receipts.",
  filename: "azbrowser-aziel-dossier-1.0.md",
  sha256: "d".repeat(64),
  author: "Aziel Eliab",
  domain: "software",
  subjects: "software, research",
};

test("SPRE applies to a filed object; CLCE needs a descriptive layer", () => {
  const titled = classifySpreApplicability({ title: "Filed" });
  assert.equal(titled.applicable, true);
  const empty = classifySpreApplicability({});
  assert.equal(empty.applicable, false);
  const clceOk = classifyClceApplicability(PHILOSOPHY);
  assert.equal(clceOk.applicable, true);
  const clceThin = classifyClceApplicability({ title: "Only a title" });
  assert.equal(clceThin.applicable, false);
});

test("PhysLing applies to energy/engineering and forensic language; philosophy and software omit it", () => {
  assert.equal(classifyPhysLingApplicability(LAB).applicable, true);
  assert.equal(classifyPhysLingApplicability(PHILOSOPHY).applicable, false);
  assert.equal(classifyPhysLingApplicability(SOFTWARE).applicable, false);
  const forensic = classifyPhysLingApplicability({
    title: "Zioncheck Visual Archive Vol 1 — Forensic Analysis",
    body: "Forensic analysis of the 1936 official Zioncheck account with contemporaneous archive photographs.",
    domain: "history, investigation",
    subjects: "history",
  });
  assert.equal(forensic.applicable, true);
  const hardwareOnly = classifyPhysLingApplicability({
    title: "Hardware case",
    body: "A plastic enclosure and mounting plate for the handheld unit.",
    domain: "hardware",
    subjects: "hardware",
  });
  assert.equal(hardwareOnly.applicable, false);
});

test("philosophy review always has a triad and omits PhysLing numbers in public view", () => {
  const review = reviewDocument({
    ...PHILOSOPHY,
    library: "corpus",
    structure: { ok: true, files: [{ path: PHILOSOPHY.filename, bytes: 40, sha256: PHILOSOPHY.sha256 }] },
  });
  assert.equal(review.triad.ready, true);
  assert.equal(review.triad.schema, TRIAD_SCHEMA);
  assert.ok(review.triad.display != null);
  assert.equal(review.applicability.flags.plr, false);
  assert.equal(review.applicability.flags.spre, true);
  assert.equal(review.applicability.flags.clce, true);
  assert.ok(review.triad.applicable_components.includes("spre"));
  assert.ok(review.triad.applicable_components.includes("clce"));
  assert.ok(!review.triad.applicable_components.includes("plr"));
  assert.equal(review.plr.applicable, false);
  assert.ok(review.plr.pc == null || review.plr.not_applicable === true);

  const pub = publicizeReview(review, PHILOSOPHY);
  assert.equal(pub.plr.applicable, false);
  assert.equal(pub.plr.status, "not_applicable");
  assert.equal(pub.plr.physics_coherence, undefined);
  assert.ok(pub.spre.pc != null);
  assert.ok(pub.triad.ready);
  assert.doesNotMatch(JSON.stringify(pub), BANNED);

  const expected = Math.pow(
    Math.max(review.spre.pc, 0.0001) * Math.max(review.clce.triple >= 0.7 ? review.clce.triple : review.clce.pairwise_avg, 0.0001),
    1 / 2
  );
  assert.ok(Math.abs(review.triad.combined - expected) < 0.002);
});

test("triadComposite heritage call still requires all three; flags drop N/A from the mean", () => {
  const incomplete = triadComposite({ spre: { pc: 0.5 } });
  assert.equal(incomplete.ready, false);
  const two = triadComposite({
    spre: { pc: 0.64 },
    clce: { triple: 0.8, pairwise_avg: 0.4 },
    plr: { physics_coherence: 0.1, linguistic_neutrality: 0.1 },
    applicability: { spre: true, clce: true, plr: false },
  });
  assert.equal(two.ready, true);
  const expected = Math.pow(0.64 * 0.8, 1 / 2);
  assert.ok(Math.abs(two.combined - expected) < 0.001);
  assert.equal(two.weights.plr, 0);
  assert.deepEqual(two.applicable_components, ["spre", "clce"]);
});

test("publicEngineView never publishes 0 as an N/A score", () => {
  const view = publicEngineView({ engine: "PhysLing", applicable: false, physics_coherence: 0, status: "PASS" });
  assert.equal(view.applicable, false);
  assert.equal(view.status, "not_applicable");
  assert.equal(view.physics_coherence, undefined);
  const live = publicEngineView({ engine: "SPRE", applicable: true, pc: 0.55, band: "partial" });
  assert.equal(live.pc, 0.55);
});

test("record HTML hides N/A PhysLing and still shows the triad plus machine links", () => {
  const review = reviewDocument({
    ...PHILOSOPHY,
    library: "corpus",
    structure: { ok: true, files: [{ path: PHILOSOPHY.filename, bytes: 40, sha256: PHILOSOPHY.sha256 }] },
  });
  const html = recordBody({
    row: {
      record_id: "AZDOC-PHILOSOPHY1",
      title: PHILOSOPHY.title,
      body: PHILOSOPHY.body,
      author: PHILOSOPHY.author,
      domain: PHILOSOPHY.domain,
      subjects: PHILOSOPHY.subjects,
      library: "corpus",
      filename: PHILOSOPHY.filename,
      content_sha256: PHILOSOPHY.sha256,
      review_json: JSON.stringify(review),
      triad_combined: review.triad.combined,
    },
    review,
  });
  assert.match(html, /Triad score/);
  assert.match(html, /\/record\/AZDOC-PHILOSOPHY1\/llms\.txt/);
  assert.match(html, /\/record\/AZDOC-PHILOSOPHY1\/cite\.json/);
  assert.match(html, /\/help\.txt/);
  assert.doesNotMatch(html, /PhysLing Review \(PLR\)/);
  assert.match(html, /SPRE PC/);
  assert.doesNotMatch(html, BANNED);
  const flags = publicComponentFlags(review, PHILOSOPHY);
  assert.equal(flags.plr, false);
  assert.ok(flags.names.includes("SPRE"));
});

test("thin input keeps stored applicability so serve-time does not invent N/A", () => {
  const review = reviewDocument({
    ...LAB,
    library: "aziel",
    structure: { ok: true, files: [{ path: LAB.filename, bytes: 40, sha256: LAB.sha256 }] },
  });
  const display = review.triad.display;
  const stamped = applyApplicabilityToReview(review, { title: LAB.title, library: "aziel" }, "aziel");
  assert.equal(stamped.applicability.flags.plr, true);
  assert.equal(stamped.triad.display, display);
});
