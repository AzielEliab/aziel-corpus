/**
 * Aziel Digital Library review engines (Worker-side lightweight ports).
 * Author: Aziel Eliab only.
 *
 * SPRE  — provenance completeness. Does not assert criminal guilt.
 * CLCE  — public term is structural match (claims↔evidence + headings + verified-file).
 *         Token Jaccard stays in the audit object only.
 * PLR   — PhysLing Review (physics × linguistics, equal weight).
 * Poison — quarantine-or-flag filter. Never silently deletes. Hardest on public Corpus.
 * Bayesian — unranked likelihood of internal consistency. Never used to sort the shelf.
 * Truth Formula — Cover-Up Truth Formula v1/v2 (applicable-only).
 * TRIAD_V3 — public shelf score is the 36-cycle mean. triad_raw freezes at first REVIEW_SCORE.
 */
import {
  classifyComponentApplicability,
  stampEngineApplicability,
  publicEngineView,
  applicabilityFlagsFrom,
  extractClaims,
  extractEvidenceSpans,
  headingsPresent,
  claimEvidenceRd,
} from "./review-applicability.js";

export const REVIEW_SCHEMA = "aziel.review.v1";
export const SPRE_LIMITATION =
  "SPRE scores provenance completeness. It does not assert criminal guilt. Advisory only. Author Aziel Eliab.";
export const CLCE_LIMITATION =
  "Public CLCE is structural match (claims↔evidence + headings + verified-file). Token Jaccard is audit-only. Type D is a label, not a finding of malice. Advisory. Threshold 0.7 is not a truth verdict.";
export const PLR_LIMITATION =
  "PhysLing Review (PLR) flags physics-impossible or linguistically manipulative framing. Equal-weight physics × linguistics. Not a court finding.";
export const POISON_LIMITATION =
  "Poison immunity quarantines suspected shells. Status is hash-chained. Records are never silently deleted. Official narrative is not merged into evidence.";
export const TRUTH_LIMITATION =
  "Cover-Up Truth Formula v1/v2 scores ΔT / suppression / metadata shadows / backpull on archival papers. Ordinary filings use a documented subset. Not a truth verdict. Author Aziel Eliab.";
export const TRIAD_SCHEMA = "aziel.triad.v3";
export const TRIAD_FORMULA =
  "TRIAD_V3: public combined = triad_cycle_mean = mean of all ordered pairings factor_i × factor_j among applicable factors of {physics, linguistics, bayesian, truth_formula, CLCE, SPRE} (36 when all six apply, including diagonals). Also stored: geometric_mean_applicable = (Π applicable engines SPRE/CLCE/PLR)^(1/n). Named axis products: physics×linguistics, bayesian×truth_formula, CLCE×SPRE. Bayesian is LIKELIHOOD of internal consistency, unranked, never a shelf sort key. triad_raw freezes to content SHA-256 at first REVIEW_SCORE. Downloads verify bytes and do not mint a new mean. No collection offset. Display is round(combined × 100) and is never written back into combined.";
export const TRIAD_KID =
  "This one number is the report card from the checkers that apply to this document.";
export const FACTOR_NAMES = Object.freeze(["physics", "linguistics", "bayesian", "truth_formula", "clce", "spre"]);

const STOP = new Set(
  "a an the and or but if then of to for in on at by with from as is are was were be been being this that these those it its they them their you your we our not no".split(" ")
);

export function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t && t.length > 1 && !STOP.has(t));
}

export function tokenSet(text) {
  return new Set(tokenize(text));
}

export function jaccard(a, b) {
  const A = a instanceof Set ? a : tokenSet(a);
  const B = b instanceof Set ? b : tokenSet(b);
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

export function jaccardTriple(r, d, p) {
  const R = tokenSet(r);
  const D = tokenSet(d);
  const P = tokenSet(p);
  const union = new Set([...R, ...D, ...P]);
  if (!union.size) return 1;
  let inter = 0;
  for (const t of union) if (R.has(t) && D.has(t) && P.has(t)) inter += 1;
  return inter / union.size;
}

export function clceLayerP(title = "", structureOk = false, hashOk = false) {
  const heading = String(title || "").trim();
  const bit = structureOk && hashOk ? "structure verified" : "structure failed";
  return (heading + " " + bit).trim();
}

export function clceStructuralMatch({ title = "", body = "", structureOk = false, hashOk = false } = {}) {
  const claims = extractClaims(title, body);
  if (!claims.length) {
    return {
      applicable: false,
      structural: null,
      rd: null,
      sp: null,
      headings_present: headingsPresent(title, body),
      verified_file: !!(structureOk && hashOk),
      claim_count: 0,
      evidence_span_count: extractEvidenceSpans(body).length,
      reason: "no claims — omit CLCE (never 0)",
    };
  }
  const rd = claimEvidenceRd(claims);
  const hp = headingsPresent(title, body);
  const vf = !!(structureOk && hashOk);
  const sp = 0.5 * (hp ? 1 : 0) + 0.5 * (vf ? 1 : 0);
  const x = 0.7 * Number(rd) + 0.3 * sp;
  return {
    applicable: true,
    structural: round4(x),
    rd: round4(rd),
    sp: round4(sp),
    headings_present: hp,
    verified_file: vf,
    claim_count: claims.length,
    evidence_span_count: extractEvidenceSpans(body).length,
    reason: "structural match claims↔evidence + headings + verified-file",
  };
}

/**
 * Lightweight AZ-CLCE port. Public term is structural match.
 * Token Jaccard stays in audit_jaccard only.
 */
export function clceScore({ r = "", d = "", p = "", n = "", title, body, structureOk = false, hashOk = false } = {}) {
  const R = tokenSet(r);
  const D = tokenSet(d);
  const P = tokenSet(p);
  const N = tokenSet(n);
  const triple = jaccardTriple(r, d, p);
  const rdJ = jaccard(R, D);
  const dp = jaccard(D, P);
  const rp = jaccard(R, P);
  const pairwise_avg = (rdJ + dp + rp) / 3;
  const union = new Set([...R, ...D, ...P]);
  const n_ratio = union.size ? [...N].filter((t) => union.has(t)).length / union.size : 0;
  const plus = clamp01(triple * (1 - 0.5 * n_ratio));
  let primary = "OK";
  const types = [];
  if (triple < 0.7 && pairwise_avg < 0.7) {
    types.push("C");
    primary = "C";
  }
  if (rdJ < 0.4 && dp >= rdJ && rp >= rdJ) {
    types.push("A");
    if (primary === "OK") primary = "A";
  }
  if (n_ratio > 0.35) {
    types.push("C");
    primary = "C";
  }
  const jaccardBand = triple >= 0.7 ? "consistent" : pairwise_avg >= 0.45 ? "partial" : "structural_inconsistency";
  const srcTitle = title != null ? title : r;
  const srcBody = body != null ? body : d;
  const structural = clceStructuralMatch({ title: srcTitle, body: srcBody, structureOk, hashOk });
  const x = structural.structural;
  return {
    engine: "CLCE",
    schema: "az-clce.report.v0.3.port",
    public_term: "structural_match",
    structural: x == null ? null : round4(x),
    rd: structural.rd,
    sp: structural.sp,
    headings_present: structural.headings_present,
    verified_file: structural.verified_file,
    claim_count: structural.claim_count,
    evidence_span_count: structural.evidence_span_count,
    triple: round4(triple),
    pairwise: { rd: round4(rdJ), dp: round4(dp), rp: round4(rp) },
    pairwise_avg: round4(pairwise_avg),
    plus: round4(plus),
    n_ratio: round4(n_ratio),
    band: x != null && x >= 0.7 ? "consistent" : jaccardBand,
    primary,
    types,
    audit_jaccard: { triple: round4(triple), pairwise_avg: round4(pairwise_avg), note: "audit only — not the public CLCE term" },
    kid_plain:
      x != null && x >= 0.7
        ? "The claims and the evidence spans agree enough."
        : x != null
          ? "These stories do not fully match. The title, the notes, and the real file are talking about different stuff."
          : "No claims to match — CLCE omitted.",
    advisory: true,
    limitation: CLCE_LIMITATION,
    threshold: 0.7,
    omit_if_no_claims: true,
  };
}

const EVIDENCE_RE =
  /\b(measur|observ|photograph|instrument|primary source|archive|witness|citation|cited|dataset|sha-?256|hash|ledger|experiment|lab note|field note|timestamp|coordinate|latitud|longitud|si unit|kilogram|meter|joule|newton|pascal|kelvin|wavelength)\w*/i;
const INDEPENDENT_RE = /\b(independent|primary source|first-hand|firsthand|raw data|unedited|original document|contemporaneous)\b/i;
const PHYSICS_RE = /\b(conserv|energy|momentum|mass|force|entropy|causal|thermodynam|wavelength|frequency|gravity|electromagnet|unit|joule|newton|watt)\w*/i;
const OFFICIAL_RE =
  /\b(officials? (confirm|say|said|state|stated)|authorities (say|said|confirm)|official (account|narrative|story|version)|trust the (experts?|science)|the science is settled)\b/i;
const DISMISSAL_RE = /\b(conspiracy theor\w*|disinformation|misinformation|debunked|fake news|only a fool|everyone knows|nobody (serious|credible))\b/i;
const ADVOCACY_RE = /\b(must (vote|believe|support)|wake up|sheeple|do your own research!|they don't want you to know)\b/i;
const ATTACK_RE = /\b(liar|lies?|hoax|fraud|fake|scam|cover-?up|shill)\b/i;
const GUILT_RE = /\b(is guilty|are guilty|committed (the )?(crime|murder|fraud)|proven criminal)\b/i;

function has(re, text) {
  return re.test(String(text || ""));
}

function countMatches(re, text) {
  const src = String(text || "");
  const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  return [...src.matchAll(rx)].length;
}

export function spreScore({ title = "", body = "", filename = "", sha256 = "", structureOk = false, author = "" } = {}) {
  const text = [title, body, filename].join("\n");
  let pc = 0;
  const factors = [];
  const add = (ok, w, name) => {
    if (ok) {
      pc += w;
      factors.push(name);
    }
  };
  add(!!String(title || "").trim(), 0.12, "title");
  add(String(body || "").trim().length >= 20, 0.15, "text");
  add(/^[0-9a-f]{64}$/i.test(String(sha256 || "")), 0.18, "content_hash");
  add(!!structureOk, 0.18, "structure_ok");
  add(!!String(author || "").trim(), 0.08, "author");
  add(has(EVIDENCE_RE, text), 0.12, "evidence_language");
  const audit_flags = [];
  if (has(INDEPENDENT_RE, text)) audit_flags.push("independent_source");
  if (has(PHYSICS_RE, text)) audit_flags.push("physics_language");
  let penalty = 0;
  if (has(OFFICIAL_RE, text) && !has(EVIDENCE_RE, text) && !has(PHYSICS_RE, text)) {
    penalty += 0.25;
    factors.push("official_narrative_without_evidence");
  }
  if (has(ADVOCACY_RE, text) && !has(EVIDENCE_RE, text) && !has(PHYSICS_RE, text)) {
    penalty += 0.2;
    factors.push("advocacy_without_evidence");
  }
  pc = clamp01(pc - penalty);
  return {
    engine: "SPRE",
    name: "Source Provenance Reliability Engine",
    public_name: "provenance completeness",
    pc: round4(pc),
    band: pc >= 0.7 ? "strong" : pc >= 0.4 ? "partial" : "weak",
    kid_plain:
      pc >= 0.7
        ? "Green: we can see where this file came from and what it is."
        : pc >= 0.4
          ? "Yellow: some proof is here, but pieces are missing."
          : "Red: we cannot tell if this is a real source yet.",
    factors,
    audit_flags,
    guilt_language: has(GUILT_RE, text),
    limitation: SPRE_LIMITATION,
  };
}

const UNIT_PAIR_RE =
  /\b(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?|lb|pounds?|m|meters?|km|kilometers?|s|seconds?|ms|milliseconds?|j|joules?|n|newtons?|w|watts?|k|kelvin|c|celsius|°c|°f|hz|hertz)\b/gi;
const IMPOSSIBLE_UNIT = [
  { qty: /weighs?\s+\d/i, bad: /\b(seconds?|hertz|kelvin|celsius|joules?|watts?)\b/i, why: "Weight described with a non-mass unit." },
  { qty: /temperatur\w*\s+\d/i, bad: /\b(kilograms?|meters?|joules?|newtons?|seconds?)\b/i, why: "Temperature described with a non-temperature unit." },
  { qty: /lasted\s+\d/i, bad: /\b(kilograms?|meters?|joules?)\b/i, why: "Duration described with a non-time unit." },
];
const CONSERVATION_RE =
  /\b(perpetual motion|over-?unity|free energy|energy from nothing|created (mass|energy) from nothing|violat\w+ (conservation|thermodynam))\b/i;
const FTL_RE = /\b(faster than light|superluminal travel)\b/i;
const WEASEL_RE = /\b(everyone knows|nobody denies|it is obvious that|studies show(?! \w)|experts agree|trust us)\b/i;

function extractYears(text) {
  const years = [];
  const re = /\b((?:1[0-9]{3}|20[0-9]{2}))\b/g;
  let m;
  const src = String(text || "");
  while ((m = re.exec(src))) years.push({ year: Number(m[1]), index: m.index });
  return years;
}

export function physLingReview({ title = "", body = "", filename = "" } = {}) {
  const text = [title, body, filename].join("\n");
  const flags = [];
  const lights = {
    units: "PASS",
    conservation: "PASS",
    causal: "PASS",
    temporal: "PASS",
    framing: "PASS",
  };

  for (const rule of IMPOSSIBLE_UNIT) {
    if (rule.qty.test(text) && rule.bad.test(text)) {
      flags.push({ kind: "units", why: rule.why });
      lights.units = "FLAG";
    }
  }
  UNIT_PAIR_RE.lastIndex = 0;
  const units = [];
  let um;
  while ((um = UNIT_PAIR_RE.exec(text))) units.push(String(um[2]).toLowerCase());
  if (units.includes("kg") && /weighs?\s+\d+(?:\.\d+)?\s*s\b/i.test(text)) {
    flags.push({ kind: "units", why: "Mass stated in seconds." });
    lights.units = "FLAG";
  }

  if (has(CONSERVATION_RE, text) && !/\b(thought experiment|fiction|hypothetical|alleged claim)\b/i.test(text)) {
    flags.push({ kind: "conservation", why: "Conservation-breaking claim without a physics mechanism." });
    lights.conservation = "FLAG";
  }
  if (has(FTL_RE, text) && !/\b(fiction|hypothetical|thought experiment|alleged)\b/i.test(text)) {
    flags.push({ kind: "conservation", why: "Faster-than-light stated as fact." });
    lights.conservation = lights.conservation === "FLAG" ? "FLAG" : "REVIEW";
  }

  const years = extractYears(text);
  for (let i = 1; i < years.length; i++) {
    const window = text.slice(Math.max(0, years[i - 1].index - 20), years[i].index + 8);
    if (/\b(after|then|later|caused|led to|which caused)\b/i.test(window) && years[i].year < years[i - 1].year) {
      flags.push({ kind: "temporal", why: "Later event dated before an earlier one in causal language." });
      lights.temporal = "FLAG";
      lights.causal = "FLAG";
    }
  }
  if (/\btherefore\b/i.test(text) && text.toLowerCase().indexOf("therefore") < 24 && String(body || "").trim().length < 80) {
    flags.push({ kind: "causal", why: "Conclusion appears before a supporting premise." });
    lights.causal = lights.causal === "FLAG" ? "FLAG" : "REVIEW";
  }

  if (has(WEASEL_RE, text) || has(DISMISSAL_RE, text)) {
    flags.push({ kind: "framing", why: "Weasel or dismissal framing without independent evidence." });
    lights.framing = has(EVIDENCE_RE, text) ? "REVIEW" : "FLAG";
  }
  if (has(OFFICIAL_RE, text) && !has(INDEPENDENT_RE, text) && !has(EVIDENCE_RE, text)) {
    flags.push({ kind: "framing", why: "Official narrative language without independent evidence." });
    lights.framing = "FLAG";
  }

  const flagCount = flags.filter((f) => lights[f.kind] === "FLAG").length;
  const reviewCount = Object.values(lights).filter((v) => v === "REVIEW").length;
  let status = "PASS";
  if (flagCount) status = "FLAG";
  else if (reviewCount) status = "REVIEW";

  const physics_coherence = clamp01(1 - flagCount * 0.28 - reviewCount * 0.12);
  const linguistic_neutrality = clamp01(lights.framing === "PASS" ? 1 : lights.framing === "REVIEW" ? 0.7 : 0.25);

  return {
    engine: "PLR",
    name: "PhysLing Review",
    status,
    lights,
    flags,
    physics_coherence: round4(physics_coherence),
    linguistic_neutrality: round4(linguistic_neutrality),
    kid_plain:
      status === "PASS"
        ? "Green: the words and the physics rules agree."
        : status === "REVIEW"
          ? "Yellow: a grown-up should read this again. Something might be mixed up."
          : "Red: the words break physics rules or try to push a story without proof.",
    limitation: PLR_LIMITATION,
  };
}

export function poisonScan({ title = "", body = "", filename = "", library = "corpus" } = {}) {
  const text = [title, body, filename].join("\n");
  const markers = [];
  const officialNoEvidence = has(OFFICIAL_RE, text) && !has(EVIDENCE_RE, text) && !has(PHYSICS_RE, text) && !has(INDEPENDENT_RE, text);
  if (officialNoEvidence) markers.push("official_narrative_without_independent_evidence");
  const advocacyNoBasis = has(ADVOCACY_RE, text) && !has(EVIDENCE_RE, text) && !has(PHYSICS_RE, text);
  if (advocacyNoBasis) markers.push("non_neutral_advocacy_without_evidence_or_physics");
  if (has(DISMISSAL_RE, text) && !has(EVIDENCE_RE, text)) markers.push("propaganda_dismissal_shell");
  const attacks = countMatches(ATTACK_RE, text);
  const evidenceHits = countMatches(EVIDENCE_RE, text);
  if (attacks >= 3 && evidenceHits === 0) markers.push("contradictory_only_propaganda_shell");

  const lib = String(library || "corpus").toLowerCase() === "aziel" ? "aziel" : "corpus";
  const suspected = markers.length > 0;
  // Hardest on public Corpus. Operator Aziel Library may still file evidence.
  let status = "CLEAR";
  if (suspected && lib === "corpus") status = "QUARANTINE";
  else if (suspected) status = "FLAGGED";

  return {
    engine: "POISON",
    suspected,
    status,
    markers,
    library: lib,
    kid_plain:
      status === "CLEAR"
        ? "Green: this does not look like a poison shell."
        : status === "FLAGGED"
          ? "Yellow: operator evidence file — watch for poison words, but keep the file."
          : "Red: this looks like a poison story. It is locked in a quarantine box. It is not deleted.",
    immutable: true,
    never_delete: true,
    limitation: POISON_LIMITATION,
  };
}

export function clceConsistency(clce) {
  if (!clce) return null;
  if (clce.structural != null) return clamp01(clce.structural);
  if (clce.applicable === false) return null;
  const triple = clamp01(clce.triple);
  const avg = clamp01(clce.pairwise_avg);
  return triple >= 0.7 ? triple : avg;
}

export function plrCoherence(plr) {
  if (!plr) return null;
  return clamp01(0.5 * clamp01(plr.physics_coherence) + 0.5 * clamp01(plr.linguistic_neutrality));
}

export function cycleMean(factors) {
  const vals = (factors || []).filter((v) => v != null).map((v) => clamp01(v));
  if (!vals.length) return null;
  const products = [];
  for (let i = 0; i < vals.length; i++) {
    for (let j = 0; j < vals.length; j++) products.push(vals[i] * vals[j]);
  }
  return products.reduce((a, b) => a + b, 0) / products.length;
}

export function geometricMean(values) {
  const vals = (values || []).filter((v) => v != null).map((v) => Math.max(clamp01(v), 0.0001));
  if (!vals.length) return null;
  return Math.pow(vals.reduce((a, b) => a * b, 1), 1 / vals.length);
}

/**
 * One visible final score from the applicable checkers.
 * Geometric mean over applicable components only — N/A engines do not weight the public triad.
 * When applicability is omitted, all three still required (heritage TRIAD_V1 call shape).
 */
export function triadCoveragePoints(chainLength) {
  const n = Number(chainLength);
  if (!Number.isFinite(n) || n < 2) return 0;
  return Math.min(12, Math.floor(n - 1) * 3);
}

export function freezeTriadRaw(triad, contentSha256, event = "REVIEW_SCORE") {
  if (!triad || !triad.ready || triad.combined == null) return triad;
  const sha = String(contentSha256 || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(sha)) return triad;
  if (triad.triad_raw != null && triad.frozen_to) return triad;
  return {
    ...triad,
    triad_raw: triad.combined,
    frozen_to: sha,
    frozen_event: event,
  };
}

export function isTriadFrozen(triad) {
  if (!triad) return false;
  const sha = String(triad.frozen_to || "").trim().toLowerCase();
  return triad.triad_raw != null && /^[0-9a-f]{64}$/.test(sha);
}

/** Ingest/persist refuse: a published score must be TRIAD_V3 36-cycle. */
export function assertTriadV3(review, contentSha256) {
  const fail = (why) => {
    const err = new Error("TRIAD_V3_REQUIRED: " + why);
    err.code = "TRIAD_V3_REQUIRED";
    err.status = 422;
    throw err;
  };
  if (!review) fail("missing review");
  const triad = review.triad;
  if (!triad) fail("missing triad");
  if (triad.schema !== TRIAD_SCHEMA) fail("schema " + (triad.schema || "none"));
  if (triad.collection_offset) fail("collection offset is deleted");
  if (!triad.ready) {
    if (triad.combined != null) fail("unready triad cannot publish combined");
    return false;
  }
  if (triad.combined == null || triad.triad_cycle_mean == null) fail("cycle mean missing");
  if (triad.public_score && triad.public_score !== "triad_cycle_mean") fail("public_score is not triad_cycle_mean");
  if (triad.triad_raw == null || !triad.frozen_to) fail("triad_raw not frozen");
  const sha = String(contentSha256 || "").trim().toLowerCase();
  if (sha && /^[0-9a-f]{64}$/.test(sha) && String(triad.frozen_to).toLowerCase() !== sha) {
    fail("frozen_to does not match content SHA-256");
  }
  if (Math.abs(Number(triad.combined) - Number(triad.triad_cycle_mean)) >= 0.0002) {
    fail("combined is not cycle mean");
  }
  return true;
}

export function triadComposite({ spre, clce, plr, bayesian, truth_formula, applicability, content_sha256 } = {}) {
  const heritage = !(applicability && typeof applicability === "object");
  const flags = heritage
    ? { spre: true, clce: true, plr: true, truth_formula: !!truth_formula, bayesian: !!bayesian, physics: true, linguistics: true }
    : {
        spre: applicability.spre !== false,
        clce: applicability.clce !== false,
        plr: applicability.plr !== false,
        truth_formula: applicability.truth_formula !== false,
        bayesian: applicability.bayesian !== false,
        physics: applicability.physics !== false,
        linguistics: applicability.linguistics !== false,
      };
  const spre_pc = spre && spre.pc != null ? clamp01(spre.pc) : null;
  const clce_consistency = clceConsistency(clce);
  const plr_coherence = plrCoherence(plr);
  const physics = plr && plr.physics_coherence != null ? clamp01(plr.physics_coherence) : null;
  const linguistics = plr && plr.linguistic_neutrality != null ? clamp01(plr.linguistic_neutrality) : null;
  const bayes_p = bayesian && bayesian.posterior != null ? clamp01(bayesian.posterior) : null;
  const truth_s = truth_formula && truth_formula.score != null ? clamp01(truth_formula.score) : null;

  const use_spre = flags.spre && spre_pc != null;
  const use_clce = flags.clce && clce_consistency != null;
  const use_plr = flags.plr && plr_coherence != null;
  const use_physics = flags.physics && physics != null && use_plr;
  const use_ling = flags.linguistics && linguistics != null && use_plr;
  const use_bayes = flags.bayesian && bayes_p != null;
  const use_truth = flags.truth_formula && truth_s != null;

  const neededOk = heritage
    ? spre_pc != null && clce_consistency != null && plr_coherence != null
    : (flags.spre ? spre_pc != null : true)
      && (flags.clce ? clce_consistency != null : true)
      && (flags.plr ? plr_coherence != null : true);

  const factorMap = {
    physics: use_physics ? physics : null,
    linguistics: use_ling ? linguistics : null,
    bayesian: use_bayes ? bayes_p : null,
    truth_formula: use_truth ? truth_s : null,
    clce: use_clce ? clce_consistency : null,
    spre: use_spre ? spre_pc : null,
  };
  const usedFactors = FACTOR_NAMES.filter((k) => factorMap[k] != null);
  const cycle = cycleMean(usedFactors.map((k) => factorMap[k]));
  const used = [];
  const geoVals = [];
  if (use_spre) { geoVals.push(spre_pc); used.push("spre"); }
  if (use_clce) { geoVals.push(clce_consistency); used.push("clce"); }
  if (use_plr) { geoVals.push(plr_coherence); used.push("plr"); }
  const geo = geometricMean(geoVals);
  const ready = !!(neededOk && usedFactors.length && cycle != null);
  const combined = ready ? cycle : null;
  const display = combined == null ? null : Math.round(combined * 100);
  const weight = used.length ? 1 / used.length : 0;
  const triad = {
    schema: TRIAD_SCHEMA,
    formula: TRIAD_FORMULA,
    ready,
    components: {
      spre_pc: spre_pc == null ? null : round4(spre_pc),
      clce_consistency: clce_consistency == null ? null : round4(clce_consistency),
      plr_coherence: plr_coherence == null ? null : round4(plr_coherence),
      physics: physics == null ? null : round4(physics),
      linguistics: linguistics == null ? null : round4(linguistics),
      bayesian: bayes_p == null ? null : round4(bayes_p),
      truth_formula: truth_s == null ? null : round4(truth_s),
    },
    factors: Object.fromEntries(FACTOR_NAMES.map((k) => [k, factorMap[k] == null ? null : round4(factorMap[k])])),
    axis_products: {
      physics_linguistics: use_physics && use_ling ? round4(physics * linguistics) : null,
      bayesian_truth_formula: use_bayes && use_truth ? round4(bayes_p * truth_s) : null,
      clce_spre: use_clce && use_spre ? round4(clce_consistency * spre_pc) : null,
    },
    cycle_factors: usedFactors,
    pairing_count: usedFactors.length * usedFactors.length,
    triad_cycle_mean: cycle == null ? null : round4(cycle),
    geometric_mean_applicable: geo == null ? null : round4(geo),
    weights: {
      spre: used.includes("spre") ? weight : 0,
      clce: used.includes("clce") ? weight : 0,
      plr: used.includes("plr") ? weight : 0,
    },
    applicable_components: used,
    combined: combined == null ? null : round4(combined),
    display,
    kid_plain: TRIAD_KID,
    primary_visible: true,
    bayesian_separate: true,
    public_score: "triad_cycle_mean",
    collection_offset: 0,
  };
  return freezeTriadRaw(triad, content_sha256);
}

function inputHasConceptSignals(input = {}) {
  return !!(
    String(input.body || input.content || "").trim() ||
    String(input.domain || "").trim() ||
    String(input.subjects || "").trim() ||
    String(input.keywords || "").trim()
  );
}

function flagsEqual(a, b) {
  if (!a || !b) return false;
  return a.spre === b.spre && a.clce === b.clce && a.plr === b.plr
    && a.truth_formula === b.truth_formula && a.physics === b.physics && a.linguistics === b.linguistics;
}

/** Re-stamp stored reviews with live gates. Recompute the public triad only when gates change. */
export function applyApplicabilityToReview(review, input = {}, library, coverage) {
  if (!review || typeof review !== "object") return review;
  const appl = (review.applicability && review.applicability.flags && !inputHasConceptSignals(input))
    ? review.applicability
    : classifyComponentApplicability({
        title: input.title,
        body: input.body || input.content,
        filename: input.filename,
        sha256: input.sha256 || input.content_sha256,
        author: input.author,
        domain: input.domain,
        subjects: input.subjects,
        keywords: input.keywords,
      });
  const next = {
    ...review,
    spre: stampEngineApplicability(review.spre, appl.spre),
    clce: stampEngineApplicability(review.clce, appl.clce),
    plr: stampEngineApplicability(review.plr, appl.plr),
    truth_formula: stampEngineApplicability(review.truth_formula, appl.truth_formula),
    applicability: appl,
  };
  const prevFlags = review.applicability && review.applicability.flags;
  if (isTriadFrozen(review.triad)) {
    next.triad = review.triad;
    return next;
  }
  if (flagsEqual(prevFlags, appl.flags) && review.triad && review.triad.ready) {
    next.triad = review.triad;
    return next;
  }
  next.triad = triadComposite({
    spre: next.spre,
    clce: next.clce,
    plr: next.plr,
    bayesian: next.bayesian || review.bayesian,
    truth_formula: next.truth_formula || review.truth_formula,
    applicability: appl.flags,
    content_sha256: input.sha256 || input.content_sha256 || review.triad && review.triad.frozen_to,
  });
  return next;
}

/** Public API/UI view: omit N/A component numbers (never publish 0-as-score). */
export function publicizeReview(review, row = {}) {
  if (!review) return null;
  const stamped = applyApplicabilityToReview(review, row, row.library);
  const flags = applicabilityFlagsFrom(stamped, row);
  const lights = { ...(stamped.lights || {}) };
  if (!flags.spre) delete lights.spre;
  if (!flags.clce) delete lights.clce;
  if (!flags.plr) delete lights.plr;
  return {
    ...stamped,
    spre: publicEngineView(stamped.spre),
    clce: publicEngineView(stamped.clce),
    plr: publicEngineView(stamped.plr),
    truth_formula: publicEngineView(stamped.truth_formula),
    lights,
    applicability: stamped.applicability,
    triad: stamped.triad,
  };
}

/**
 * Identity. Collection +25 and coverage +0..12 are deleted.
 * Do not write display back into combined.
 */
export function collectionTriad(triad, library, coverage) {
  return triad;
}

export function truthFormulaScore({ title = "", body = "", filename = "", sha256 = "", structureOk = false, mode = "subset" } = {}) {
  const text = [title, body, filename].join("\n");
  const factors = [];
  let score = 0;
  const add = (ok, w, name) => {
    if (ok) {
      score += w;
      factors.push(name);
    }
  };
  const T0_RE = /\b(raw truth|primary source|contemporaneous|original document|first-?hand|unedited|instrument data)\b/i;
  const T1_RE = /\b(official (account|narrative|story|version)|authorities (say|said)|officials? (confirm|say|said))\b/i;
  const T2_RE = /\b(suppress\w*|cover-?up|shadow (layer|archive|path)|purge|destroyed (file|record)|missing attachment|chain.of.custody|euphemis\w*|vague (cause|reason)|delay)\b/i;
  const DELTA_T_RE = /\b(contradict\w*|diverg\w*|discrepan\w*|ΔT|delta[- ]t|official.{0,40}(vs|versus|against)|raw.{0,40}official)\b/i;
  const META_SHADOW_RE = /\b(metadata shadow|routing (slip|log)|index card|accession|destruction log|ledger|sha-?256|content hash)\b/i;
  const BACKPULL_RE = /\b(backpull|mandatory (reporting|chain)|coroner|warden|patholog|registrar|governor|reconstruct|surviving (node|record|cop))\b/i;
  let formula;
  if (mode === "coverup") {
    add(has(T0_RE, text) || has(EVIDENCE_RE, text), 0.2, "T0_raw");
    add(has(T1_RE, text), 0.15, "T1_official_identified");
    add(has(T2_RE, text), 0.15, "T2_suppression");
    add(has(DELTA_T_RE, text), 0.15, "delta_T");
    add(has(META_SHADOW_RE, text) || /^[0-9a-f]{64}$/i.test(String(sha256 || "")), 0.15, "metadata_shadow");
    add(has(BACKPULL_RE, text), 0.2, "backpull");
    if (has(OFFICIAL_RE, text) && !has(EVIDENCE_RE, text)) {
      score -= 0.25;
      factors.push("official_as_raw_without_evidence");
    }
    if (has(ADVOCACY_RE, text) && !has(EVIDENCE_RE, text)) {
      score -= 0.2;
      factors.push("advocacy_without_evidence");
    }
    formula = "coverup_v2: T0/T1/T2 + ΔT + metadata shadows + backpull; penalties for official-as-raw";
  } else {
    add(String(body || "").trim().length >= 20, 0.35, "T0_lite_body");
    add(!(has(OFFICIAL_RE, text) && !has(EVIDENCE_RE, text)), 0.25, "no_unchallenged_official_as_truth");
    add(/^[0-9a-f]{64}$/i.test(String(sha256 || "")), 0.25, "metadata_hash");
    add(!!structureOk, 0.15, "structure_ok");
    formula = "subset: T0-lite body + no unchallenged official-as-truth + metadata hash + structure";
  }
  score = clamp01(score);
  return {
    engine: "TRUTH_FORMULA",
    name: "Cover-Up Truth Formula",
    schema: "aziel.truth_formula.v2",
    mode,
    score: round4(score),
    factors,
    formula,
    limitation: TRUTH_LIMITATION,
    not_truth: true,
  };
}

export function bayesianPosterior(hypotheses = {}) {
  const h = hypotheses || {};
  const checks = [];
  if ("h1" in h || "structure_ok" in h || "hash_ok" in h) {
    checks.push({ id: "H1", pass: !!(h.h1 != null ? h.h1 : h.structure_ok && h.hash_ok) });
  }
  if (h.plr_applicable !== false && ("h2" in h || "physics_lights_pass" in h || "plr_applicable" in h)) {
    checks.push({ id: "H2", pass: !!(h.h2 != null ? h.h2 : h.physics_lights_pass) });
  }
  if ("h3" in h || "framing_pass" in h) {
    checks.push({ id: "H3", pass: !!(h.h3 != null ? h.h3 : h.framing_pass) });
  }
  if ("h4" in h || "rd" in h) {
    const rd = h.rd;
    checks.push({ id: "H4", pass: !!(h.h4 != null ? h.h4 : rd != null && Number(rd) >= 0.7) });
  }
  if ("h5" in h || "poison_markers" in h || "no_poison" in h) {
    const markers = h.poison_markers || [];
    checks.push({ id: "H5", pass: !!(h.h5 != null ? h.h5 : h.no_poison != null ? h.no_poison : markers.length === 0) });
  }
  const heritageKeys = ["evidence_completeness", "physics_coherence", "linguistic_neutrality", "spre_pc", "clce_consistency"];
  if (!checks.length && heritageKeys.some((k) => k in h)) {
    const used = {};
    let alpha = 1;
    let beta = 1;
    for (const k of heritageKeys) {
      const p = clamp01(h[k]);
      used[k] = round4(p);
      alpha += p;
      beta += 1 - p;
    }
    return {
      schema: "aziel.bayesian.v2",
      kind: "LIKELIHOOD",
      of: "internal_consistency",
      not_truth: true,
      unranked: true,
      sort_key: null,
      note: "Unranked likelihood of internal consistency. Never used to sort the shelf. Not world accuracy.",
      priors: used,
      hypotheses: [],
      applied: 0,
      alpha: round4(alpha),
      beta: round4(beta),
      posterior: round4(alpha / (alpha + beta)),
      kid_plain: "This number is a likelihood of internal consistency. It does not move the books on the shelf.",
      continuity: "Peers may endorse or challenge later. History is append-only if the operator is gone one day.",
      possibility_separate: true,
    };
  }
  const k = checks.length;
  const hits = checks.filter((c) => c.pass).length;
  const alpha = 1 + hits;
  const beta = 1 + (k - hits);
  return {
    schema: "aziel.bayesian.v2",
    kind: "LIKELIHOOD",
    of: "internal_consistency",
    not_truth: true,
    unranked: true,
    sort_key: null,
    note: "Unranked likelihood of internal consistency. Never used to sort the shelf. Not world accuracy.",
    hypotheses: checks,
    applied: k,
    hits,
    alpha: round4(alpha),
    beta: round4(beta),
    posterior: round4(alpha / (alpha + beta)),
    kid_plain: "This number is a likelihood of internal consistency. It does not move the books on the shelf.",
    continuity: "Peers may endorse or challenge later. History is append-only if the operator is gone one day.",
    possibility_separate: true,
  };
}

export function reviewDocument(input = {}) {
  const title = String(input.title || "");
  const body = String(input.body || "");
  const filename = String(input.filename || "");
  const sha256 = String(input.sha256 || "");
  const author = String(input.author || "");
  const library = String(input.library || "corpus");
  const structure = input.structure || { ok: !!sha256, files: [] };
  const structureOk = !!structure.ok;
  const hashOk = /^[0-9a-f]{64}$/i.test(sha256);
  const pLayer = clceLayerP(title, structureOk, hashOk);
  const appl = classifyComponentApplicability({
    title,
    body,
    filename,
    sha256,
    author,
    domain: input.domain,
    subjects: input.subjects,
    keywords: input.keywords,
  });

  const localClce = clceScore({
    r: title,
    d: body || title,
    p: pLayer,
    n: input.noise || "",
    title,
    body,
    structureOk,
    hashOk,
  });
  if (input.clce && typeof input.clce === "object" && input.clce.triple != null) {
    localClce.audit_jaccard = {
      triple: input.clce.triple,
      pairwise_avg: input.clce.pairwise_avg,
      source: input.clce.source || "provided",
      note: "audit only — not the public CLCE term",
    };
    localClce.triple = input.clce.triple;
    if (input.clce.pairwise_avg != null) localClce.pairwise_avg = input.clce.pairwise_avg;
  }
  const clce = stampEngineApplicability(localClce, appl.clce);
  const spre = stampEngineApplicability(spreScore({ title, body, filename, sha256, structureOk, author }), appl.spre);
  const plr = stampEngineApplicability(physLingReview({ title, body, filename }), appl.plr);
  const poison = poisonScan({ title, body, filename, library });
  const truth = stampEngineApplicability(
    truthFormulaScore({
      title,
      body,
      filename,
      sha256,
      structureOk,
      mode: (appl.truth_formula && appl.truth_formula.mode) || "subset",
    }),
    appl.truth_formula
  );
  const physicsPass = ["units", "conservation", "causal", "temporal"].every((k) => (plr.lights || {})[k] === "PASS");
  const bayesian = bayesianPosterior({
    structure_ok: structureOk,
    hash_ok: hashOk,
    plr_applicable: !!appl.flags.plr,
    physics_lights_pass: physicsPass,
    framing_pass: (plr.lights || {}).framing === "PASS",
    rd: clce.rd,
    poison_markers: poison.markers || [],
  });
  const clceX = clceConsistency(clce);
  const lights = {
    structure: structureOk ? "PASS" : "FLAG",
    spre: spre.pc >= 0.7 ? "PASS" : spre.pc >= 0.4 ? "REVIEW" : "FLAG",
    poison: poison.status === "CLEAR" ? "PASS" : poison.status === "FLAGGED" ? "REVIEW" : "FLAG",
  };
  if (clceX != null) lights.clce = clceX >= 0.7 ? "PASS" : clceX >= 0.45 ? "REVIEW" : "FLAG";
  if (appl.flags.plr) lights.plr = plr.status;

  return {
    schema: REVIEW_SCHEMA,
    author: "Aziel Eliab",
    library,
    lights,
    structure: { ok: structureOk, files: structure.files || [], errors: structure.errors || [] },
    spre,
    clce,
    plr,
    truth_formula: truth,
    poison,
    bayesian,
    applicability: appl,
    triad: triadComposite({
      spre,
      clce,
      plr,
      bayesian,
      truth_formula: truth,
      applicability: appl.flags,
      content_sha256: sha256 || structure.sha256,
    }),
    quarantine_status: poison.status === "QUARANTINE" ? "POISON_SUSPECT" : poison.status === "FLAGGED" ? "OPERATOR_FLAG" : "CLEAR",
    possibility: input.possibility || {
      schema: "aziel.possibility.v1",
      kind: "HEURISTIC",
      possibility: null,
      refuse: "PENDING_ANCHORS",
      unranked: true,
      sort_key: null,
      note: "HEURISTIC over lattice time×geo pins.",
      bayesian_separate: true,
      not_truth: true,
    },
    limitation: [SPRE_LIMITATION, CLCE_LIMITATION, PLR_LIMITATION, POISON_LIMITATION, TRUTH_LIMITATION, TRIAD_FORMULA].join(" "),
  };
}

function round4(n) {
  return Math.round(clamp01(n) * 10000) / 10000;
}

export { round4 };
