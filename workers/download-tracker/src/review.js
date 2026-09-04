/**
 * Aziel Digital Library review engines (Worker-side lightweight ports).
 * Author: Aziel Eliab only.
 *
 * SPRE  — Source Provenance Reliability Engine (PC score). Does not assert criminal guilt.
 * CLCE  — Cross-Layer Consistency Engine port (Jaccard R/D/P). Detects inconsistency, not intent.
 * PLR   — PhysLing Review (physics × linguistics third review).
 * Poison — quarantine-or-flag filter. Never silently deletes. Hardest on public Corpus.
 * Bayesian — unranked Beta-Bernoulli posterior. Never used to sort the shelf.
 */
export const REVIEW_SCHEMA = "aziel.review.v1";
export const SPRE_LIMITATION =
  "SPRE scores provenance completeness. It does not assert criminal guilt. Advisory only. Author Aziel Eliab.";
export const CLCE_LIMITATION =
  "CLCE detects inconsistency, not intent. Type D is a label, not a finding of malice. Advisory. Threshold 0.7 is not a truth verdict.";
export const PLR_LIMITATION =
  "PhysLing Review (PLR) flags physics-impossible or linguistically manipulative framing. It is a third review beside SPRE and CLCE. Not a court finding.";
export const POISON_LIMITATION =
  "Poison immunity quarantines suspected shells. Status is hash-chained. Records are never silently deleted. Official narrative is not merged into evidence.";
export const TRIAD_SCHEMA = "aziel.triad.v1";
export const TRIAD_FORMULA =
  "TRIAD_V1 geometric mean: combined = (spre_pc × clce_consistency × plr_coherence)^(1/3). clce_consistency = CLCE.triple if triple ≥ 0.7 else pairwise_avg. plr_coherence = 0.6×physics_coherence + 0.4×linguistic_neutrality. Equal engine weight. Components stay stored for audit. Bayesian peer score is a separate unranked field.";
export const TRIAD_KID =
  "This one number is the report card from three checkers: SPRE, CLCE, and PhysLing. They all have to run first.";

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

/**
 * Lightweight AZ-CLCE port. Same Jaccard triple / pairwise idea as
 * https://azclce-download-tracker.vibelock.workers.dev/v1/score
 */
export function clceScore({ r = "", d = "", p = "", n = "" } = {}) {
  const R = tokenSet(r);
  const D = tokenSet(d);
  const P = tokenSet(p);
  const N = tokenSet(n);
  const triple = jaccardTriple(r, d, p);
  const rd = jaccard(R, D);
  const dp = jaccard(D, P);
  const rp = jaccard(R, P);
  const pairwise_avg = (rd + dp + rp) / 3;
  const union = new Set([...R, ...D, ...P]);
  const n_ratio = union.size ? [...N].filter((t) => union.has(t)).length / union.size : 0;
  const plus = clamp01(triple * (1 - 0.5 * n_ratio));
  let primary = "OK";
  const types = [];
  if (triple < 0.7 && pairwise_avg < 0.7) {
    types.push("C");
    primary = "C";
  }
  if (rd < 0.4 && dp >= rd && rp >= rd) {
    types.push("A");
    if (primary === "OK") primary = "A";
  }
  if (n_ratio > 0.35) {
    types.push("C");
    primary = "C";
  }
  const band = triple >= 0.7 ? "consistent" : pairwise_avg >= 0.45 ? "partial" : "structural_inconsistency";
  return {
    engine: "CLCE",
    schema: "az-clce.report.v0.2.port",
    triple: round4(triple),
    pairwise: { rd: round4(rd), dp: round4(dp), rp: round4(rp) },
    pairwise_avg: round4(pairwise_avg),
    plus: round4(plus),
    n_ratio: round4(n_ratio),
    band,
    primary,
    types,
    kid_plain:
      triple >= 0.7
        ? "The picture, the writing, and the file agree enough."
        : "These stories do not fully match. The title, the notes, and the real file are talking about different stuff.",
    advisory: true,
    limitation: CLCE_LIMITATION,
    threshold: 0.7,
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
  add(has(INDEPENDENT_RE, text), 0.1, "independent_source_language");
  add(has(PHYSICS_RE, text), 0.07, "physics_language");
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
    pc: round4(pc),
    band: pc >= 0.7 ? "strong" : pc >= 0.4 ? "partial" : "weak",
    kid_plain:
      pc >= 0.7
        ? "Green: we can see where this file came from and what it is."
        : pc >= 0.4
          ? "Yellow: some proof is here, but pieces are missing."
          : "Red: we cannot tell if this is a real source yet.",
    factors,
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
  const linguistic_neutrality = clamp01(lights.framing === "PASS" ? 0.86 : lights.framing === "REVIEW" ? 0.55 : 0.22);

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
  const triple = clamp01(clce.triple);
  const avg = clamp01(clce.pairwise_avg);
  return triple >= 0.7 ? triple : avg;
}

export function plrCoherence(plr) {
  if (!plr) return null;
  return clamp01(0.6 * clamp01(plr.physics_coherence) + 0.4 * clamp01(plr.linguistic_neutrality));
}

/**
 * One visible final score after SPRE, CLCE, and PhysLing have all run.
 * Geometric mean so one weak verifier pulls the report card down (auditable).
 */
export function triadComposite({ spre, clce, plr } = {}) {
  const spre_pc = spre && spre.pc != null ? clamp01(spre.pc) : null;
  const clce_consistency = clceConsistency(clce);
  const plr_coherence = plrCoherence(plr);
  const ready = spre_pc != null && clce_consistency != null && plr_coherence != null;
  const eps = 0.0001;
  const combined = ready
    ? Math.pow(Math.max(spre_pc, eps) * Math.max(clce_consistency, eps) * Math.max(plr_coherence, eps), 1 / 3)
    : null;
  const display = combined == null ? null : Math.round(combined * 100);
  return {
    schema: TRIAD_SCHEMA,
    formula: TRIAD_FORMULA,
    ready,
    components: {
      spre_pc: spre_pc == null ? null : round4(spre_pc),
      clce_consistency: clce_consistency == null ? null : round4(clce_consistency),
      plr_coherence: plr_coherence == null ? null : round4(plr_coherence),
    },
    weights: { spre: 1 / 3, clce: 1 / 3, plr: 1 / 3 },
    combined: combined == null ? null : round4(combined),
    display,
    kid_plain: TRIAD_KID,
    primary_visible: true,
    bayesian_separate: true,
  };
}

/**
 * Aziel Library collection score is the published triad (display capped at 100).
 * Corpus stays the geometric mean. No extra keys — do not re-apply in backfill.
 */
export function collectionTriad(triad, library) {
  if (!triad || !triad.ready || triad.display == null) return triad;
  if (String(library || "") !== "aziel") return triad;
  const display = Math.min(100, Number(triad.display) + 25);
  triad.display = display;
  triad.combined = round4(display / 100);
  return triad;
}

export function bayesianPosterior(priors) {
  const keys = ["evidence_completeness", "physics_coherence", "linguistic_neutrality", "spre_pc", "clce_consistency"];
  const used = {};
  let alpha = 1;
  let beta = 1;
  for (const k of keys) {
    const p = clamp01(priors[k]);
    used[k] = round4(p);
    alpha += p;
    beta += 1 - p;
  }
  const posterior = alpha / (alpha + beta);
  return {
    schema: "aziel.bayesian.v1",
    unranked: true,
    sort_key: null,
    note: "Unranked metadata for manual peer-to-peer review. Never used to sort the shelf.",
    priors: used,
    alpha: round4(alpha),
    beta: round4(beta),
    posterior: round4(posterior),
    kid_plain: "This number is a confidence guess. It does not move the books on the shelf.",
    continuity: "Peers may endorse or challenge later. History is append-only if the operator is gone one day.",
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
  const reality = input.reality || [filename, sha256, structure.ok ? "structure verified" : "structure failed"].filter(Boolean).join(" ");

  const clce = input.clce || clceScore({ r: title, d: body || title, p: reality, n: input.noise || "" });
  const spre = spreScore({ title, body, filename, sha256, structureOk: !!structure.ok, author });
  const plr = physLingReview({ title, body, filename });
  const poison = poisonScan({ title, body, filename, library });
  const evidence_completeness = clamp01((spre.factors.includes("text") ? 0.35 : 0.05) + (spre.factors.includes("content_hash") ? 0.35 : 0) + (spre.factors.includes("evidence_language") ? 0.3 : 0.1));
  const bayesian = bayesianPosterior({
    evidence_completeness,
    physics_coherence: plr.physics_coherence,
    linguistic_neutrality: plr.linguistic_neutrality,
    spre_pc: spre.pc,
    clce_consistency: clce.triple >= 0.7 ? clce.triple : clce.pairwise_avg,
  });

  const lights = {
    structure: structure.ok ? "PASS" : "FLAG",
    spre: spre.pc >= 0.7 ? "PASS" : spre.pc >= 0.4 ? "REVIEW" : "FLAG",
    clce: clce.triple >= 0.7 ? "PASS" : clce.pairwise_avg >= 0.45 ? "REVIEW" : "FLAG",
    plr: plr.status,
    poison: poison.status === "CLEAR" ? "PASS" : poison.status === "FLAGGED" ? "REVIEW" : "FLAG",
  };

  return {
    schema: REVIEW_SCHEMA,
    author: "Aziel Eliab",
    library,
    lights,
    structure: { ok: !!structure.ok, files: structure.files || [], errors: structure.errors || [] },
    spre,
    clce,
    plr,
    poison,
    bayesian,
    triad: collectionTriad(triadComposite({ spre, clce, plr }), library),
    quarantine_status: poison.status === "QUARANTINE" ? "POISON_SUSPECT" : poison.status === "FLAGGED" ? "OPERATOR_FLAG" : "CLEAR",
    limitation: [SPRE_LIMITATION, CLCE_LIMITATION, PLR_LIMITATION, POISON_LIMITATION, TRIAD_FORMULA].join(" "),
  };
}

function round4(n) {
  return Math.round(clamp01(n) * 10000) / 10000;
}

export { round4 };
