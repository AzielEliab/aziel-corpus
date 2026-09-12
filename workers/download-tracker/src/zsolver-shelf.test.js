import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyZsolverApplicability,
  compactZsolverPublic,
  isZioncheckSeedVol,
  notApplicableZsolver,
  seedBaselineZsolver,
  shelfScoreState,
  zsolverNumericDisplay,
} from "./zsolver.js";
import { cardFromRecord, publicSearchCard } from "./library-index.js";
import { shelfScoreRows } from "./ui.js";
import { recordBody } from "./hosted-pages.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;

const SEED_VOL = {
  record_id: "AZDOC-18DBE35A32DD",
  title: "Marion A. Zioncheck Visual Archive Vol 1 — Primary Documents, Death Certificates & Forensic Analysis",
  filename: "zioncheck-vol-1.pdf",
  subjects: "history, investigation",
  domain: "history",
  triad_combined: 0.79,
  zsolver: seedBaselineZsolver(),
};

const PHILOSOPHY = {
  record_id: "AZDOC-A53F8E3052E2",
  title: "The Cockroach Doctrine: A Resilience Doctrine for Remaining Operational",
  subjects: "philosophy, doctrine",
  domain: "philosophy",
  triad_combined: 0.58,
  zsolver: notApplicableZsolver("not applicable for philosophy"),
};

const UNSCORED = {
  record_id: "AZDOC-NEW",
  title: "Unscored historical note",
  domain: "history",
  triad_combined: 0.7,
};

test("Zioncheck Visual Archive vols 1–5 are seed baseline 75", () => {
  assert.equal(isZioncheckSeedVol(SEED_VOL), true);
  assert.equal(isZioncheckSeedVol({ title: "Marion A. Zioncheck Vol 5 — The Human & Institutional Evidence" }), true);
  assert.equal(isZioncheckSeedVol({ title: "Marion A. Zioncheck Visual Archive Vol 9" }), false);
  const appl = classifyZsolverApplicability(SEED_VOL);
  assert.equal(appl.applicable, true);
  assert.equal(appl.seed_corpus, true);
  assert.equal(seedBaselineZsolver().display, 75);
  assert.equal(zsolverNumericDisplay(seedBaselineZsolver()), 75);
});

test("philosophy / software / hardware / design are not_applicable", () => {
  assert.equal(classifyZsolverApplicability(PHILOSOPHY).applicable, false);
  assert.equal(classifyZsolverApplicability({ title: "AEEM HVAC Energy Valve — Prototype Design", domain: "hardware" }).applicable, false);
  assert.equal(classifyZsolverApplicability({ title: "ForgeReceipts platform", domain: "software" }).applicable, false);
  assert.equal(classifyZsolverApplicability({ title: "A Treatise on Virtue", domain: "philosophy" }).applicable, false);
});

test("historical / research / investigation / crime qualify", () => {
  assert.equal(classifyZsolverApplicability({ title: "The Xerxes Curse", domain: "history" }).applicable, true);
  assert.equal(classifyZsolverApplicability({ title: "County blotter", domain: "crime", subjects: "investigation" }).applicable, true);
});

test("shelf helper: seed vol shows Zion 75 under triad", () => {
  const { triadRow, zRow, zsolver_display, triad_display } = shelfScoreRows(SEED_VOL);
  assert.equal(triad_display, 79);
  assert.equal(zsolver_display, 75);
  assert.match(triadRow, /<span class="metric">79<\/span>/);
  assert.match(zRow, /<span class="metric">75<\/span>/);
  assert.match(zRow, /triad zsolver/);
  assert.match(zRow, /ZionPattern Solver/);
  assert.doesNotMatch(zRow, /pending backfill/);
  assert.doesNotMatch(zRow, /<span class="metric"><\/span>/);
  assert.doesNotMatch(triadRow + zRow, BANNED);
});

test("shelf helper: philosophy omits ZionPattern entirely", () => {
  const { triadRow, zRow } = shelfScoreRows(PHILOSOPHY);
  assert.match(triadRow, /<span class="metric">58<\/span>/);
  assert.equal(zRow, "");
  assert.doesNotMatch(triadRow + zRow, /ZionPattern/);
  assert.doesNotMatch(triadRow + zRow, /pending backfill/);
  assert.doesNotMatch(triadRow + zRow, /<span class="metric"><\/span>/);
});

test("shelf helper: pending only when truly unscored", () => {
  const { zRow } = shelfScoreRows(UNSCORED);
  assert.match(zRow, /ZionPattern Solver pending backfill/);
  const na = shelfScoreRows({ ...UNSCORED, zsolver_status: "not_applicable", zsolver: notApplicableZsolver("omit") });
  assert.equal(na.zRow, "");
  assert.doesNotMatch(na.zRow, /pending/);
  const zero = shelfScoreState({ zsolver: { status: "scored", display: 0, capped_confidence: 0, applicable: true } });
  assert.equal(zero.zsolver_display, null);
  assert.equal(zero.zsolver_pending, true);
});

test("empty metric never emitted for display 0", () => {
  const { zRow } = shelfScoreRows({
    title: "Zero live score",
    triad_combined: 0.75,
    zsolver_score: 0,
    zsolver_status: "scored",
    zsolver: { display: 0, capped_confidence: 0, status: "scored" },
  });
  assert.equal(zRow.includes('<span class="metric"></span>'), false);
  assert.doesNotMatch(zRow, />0</);
});

test("packed search card includes triad_display and omits N/A Zion", () => {
  const seed = publicSearchCard(cardFromRecord(SEED_VOL));
  assert.equal(seed.triad_display, 79);
  assert.equal(seed.zsolver_display, 75);
  const philo = publicSearchCard(cardFromRecord(PHILOSOPHY));
  assert.equal(philo.triad_display, 58);
  assert.equal("zsolver_display" in philo, false);
  assert.ok(!philo.zsolver || philo.zsolver.status === "not_applicable");
});

test("compact tip zsolver has display/status/applicable/seed flags", () => {
  const seed = compactZsolverPublic(seedBaselineZsolver());
  assert.equal(seed.display, 75);
  assert.equal(seed.status, "scored");
  assert.equal(seed.applicable, true);
  assert.equal(seed.seed_corpus, true);
  assert.equal(seed.baseline, true);
  const na = compactZsolverPublic(notApplicableZsolver("philosophy"));
  assert.equal(na.status, "not_applicable");
  assert.equal(na.applicable, false);
  assert.equal("display" in na, false);
});

test("record page omits ZionPattern when not_applicable and shows seed 75", () => {
  const seedHtml = recordBody({
    row: SEED_VOL,
    review: { triad: { display: 79, combined: 0.79, ready: true, formula: "TRIAD_V1" } },
    zsolver: seedBaselineZsolver(),
    events: [],
    peers: [],
  });
  assert.match(seedHtml, />75</);
  assert.match(seedHtml, /ZionPattern Solver/);
  const philoHtml = recordBody({
    row: PHILOSOPHY,
    review: { triad: { display: 58, combined: 0.58, ready: true } },
    zsolver: notApplicableZsolver("philosophy"),
    events: [],
    peers: [],
  });
  assert.doesNotMatch(philoHtml, /ZionPattern Solver/);
  assert.doesNotMatch(philoHtml, /pending backfill/);
});
