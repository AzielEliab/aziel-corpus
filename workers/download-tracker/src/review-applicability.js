/**
 * Component applicability gates for SPRE / CLCE / PhysLing.
 * Analogous to classifyZsolverApplicability (ZionPattern omit-when-N/A).
 * Author: Aziel Eliab.
 *
 * Positive rules (verified against review.js engines + domain-classify):
 * - SPRE applies when the record is a filed object with provenance
 *   (title, author, content hash, filename, or body). Ingest creates this.
 * - CLCE applies when claim-structure exists: a descriptive layer
 *   (body/abstract ≥ 20 chars) beside title or file/reality.
 * - PhysLing applies when the document makes physics-evaluable or
 *   measurement claims, or is classified energy/engineering, or hardware
 *   with physical language. Philosophy, software, and design without those
 *   claims omit PhysLing (never shown as 0).
 *
 * Triad always stays: geometric mean over applicable components only.
 */
import { classifyDomains } from "./domain-classify.js";

export const COMPONENT_APPLICABILITY_SCHEMA = "aziel.component_applicability.v1";

/** Heritage name. Bare energy / force / forensic do not qualify. Prefer hasPhysicsEvaluableClaim. */
export const PHYS_CLAIM_RE =
  /\b(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?|lb|pounds?|m|meters?|km|kilometers?|s|seconds?|j|joules?|n|newtons?|w|watts?|k|kelvin|hz|hertz|celsius|°c|°f)\b/i;
export const UNIT_HINT_RE =
  /\b(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?|lb|pounds?|m|meters?|km|kilometers?|s|seconds?|j|joules?|n|newtons?|w|watts?|k|kelvin|hz|hertz|celsius|°c|°f)\b/i;
export const PHYS_QTY_VERB_RE =
  /\b(conserv\w*|thermodynam\w*|perpetual motion|faster than light|superluminal|created (?:mass|energy)|causal(?:ly)?)\b/i;
export const COVERUP_RE =
  /\b(cover-?up|suppression|official narrative|metadata shadow|backpull|mandatory reporting|shadow (?:layer|archive|path)|destroyed (?:file|record)|chain.of.custody|ΔT|delta[- ]t)\b/i;
export const ARCHIVAL_RE =
  /\b(archive|coroner|warden|patholog|death certificate|accession|destruction log|registrar|governor.?s? office)\b/i;
export const EVIDENCE_SPAN_RE =
  /(\((?:[A-Za-z][^)]{0,80},\s*)?(?:1[0-9]{3}|20[0-9]{2})\)|\[\d+\]|doi:\s*\S+|https?:\/\/\S+|\b\d+(?:\.\d+)?\s*(?:kg|kilograms?|g|grams?|lb|pounds?|m|meters?|km|kilometers?|s|seconds?|ms|milliseconds?|j|joules?|n|newtons?|w|watts?|k|kelvin|celsius|°c|°f|hz|hertz)\b|\bbecause\b|\bas evidenced\b|\bcited\b|\baccording to\b|\bprimary source\b|\barchive\b|\bphotograph\b|\bledger\b|\bsha-?256\b|\bhash recorded\b|\bmeasurement\b)/i;
export const HEADING_RE = /^#{1,6}\s+\S/m;

export const PHYSLING_QUALIFY_MAINS = Object.freeze(["energy", "engineering"]);
export const PHYSLING_OMIT_MAINS = Object.freeze(["philosophy", "software", "design", "designs"]);

const CLCE_BODY_MIN = 20;

function tokenList(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[,;|/]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function addMain(set, raw) {
  const x = String(raw || "").trim().toLowerCase();
  if (!x) return;
  const head = x.split(/[/:]+/)[0].trim();
  if (head === "historical") set.add("history");
  else if (head === "designs") set.add("design");
  else if (head) set.add(head);
}

export function classificationMains(input = {}) {
  const mains = new Set();
  try {
    const classified = classifyDomains(input);
    for (const p of classified && classified.paths ? classified.paths : []) addMain(mains, p && p.main);
    addMain(mains, classified && classified.domain);
  } catch { /* classifier optional */ }
  for (const t of tokenList(input.domain)) addMain(mains, t);
  for (const t of tokenList(input.subjects)) addMain(mains, t);
  return mains;
}

export function hasProvenance(input = {}) {
  const title = String(input.title || "").trim();
  const author = String(input.author || "").trim();
  const filename = String(input.filename || "").trim();
  const body = String(input.body || input.content || "").trim();
  const sha = String(input.sha256 || input.content_sha256 || "").trim();
  return !!(title || author || filename || body || /^[0-9a-f]{64}$/i.test(sha));
}

export function extractClaims(title = "", body = "") {
  const text = String(body || "").trim();
  if (!text) return [];
  const parts = text.split(/(?<=[.!?])\s+/);
  const claims = [];
  for (const raw of parts) {
    const s = String(raw || "").trim();
    if (s.length < 12) continue;
    if (s.endsWith("?")) continue;
    claims.push(s);
  }
  if (!claims.length && text.length >= 12 && !text.endsWith("?")) claims.push(text);
  return claims;
}

export function extractEvidenceSpans(text) {
  const src = String(text || "");
  const rx = new RegExp(EVIDENCE_SPAN_RE.source, EVIDENCE_SPAN_RE.flags.includes("g") ? EVIDENCE_SPAN_RE.flags : EVIDENCE_SPAN_RE.flags + "g");
  return [...src.matchAll(rx)].map((m) => m[0]);
}

export function headingsPresent(title = "", body = "") {
  return !!(String(title || "").trim() || HEADING_RE.test(String(body || "")));
}

export function claimEvidenceRd(claims) {
  if (!claims || !claims.length) return null;
  let hits = 0;
  for (const c of claims) if (EVIDENCE_SPAN_RE.test(c)) hits += 1;
  return hits / claims.length;
}

export function hasClaimStructure(input = {}) {
  const title = String(input.title || "").trim();
  const body = String(input.body || input.content || "").replace(/\s+/g, " ").trim();
  const filename = String(input.filename || "").trim();
  const sha = String(input.sha256 || input.content_sha256 || "").trim();
  const claims = extractClaims(title, body);
  const descriptive = body.length >= CLCE_BODY_MIN && claims.length > 0;
  const other = !!(title || filename || /^[0-9a-f]{64}$/i.test(sha));
  return descriptive && other;
}

export function hasPhysicsEvaluableClaim(input = {}) {
  const bag = [
    input.title,
    input.body,
    input.content,
    input.filename,
    input.subjects,
    input.keywords,
    input.domain,
  ]
    .map((x) => String(x || ""))
    .join("\n");
  if (UNIT_HINT_RE.test(bag) || PHYS_CLAIM_RE.test(bag)) return true;
  return PHYS_QTY_VERB_RE.test(bag) && /\d/.test(bag);
}

export function hasCoverupTruthInputs(input = {}) {
  const bag = [input.title, input.body, input.content, input.filename, input.subjects, input.keywords, input.domain]
    .map((x) => String(x || ""))
    .join("\n");
  return COVERUP_RE.test(bag);
}

export function classifySpreApplicability(input = {}) {
  if (hasProvenance(input)) {
    return {
      applicable: true,
      reason: "filed object has provenance",
    };
  }
  return {
    applicable: false,
    reason: "no provenance signals on this record",
  };
}

export function classifyClceApplicability(input = {}) {
  if (hasClaimStructure(input)) {
    return {
      applicable: true,
      reason: "claim-structure: claims beside title or file",
    };
  }
  return {
    applicable: false,
    reason: "no descriptive claim layer to compare",
  };
}

export function classifyTruthFormulaApplicability(input = {}) {
  if (hasCoverupTruthInputs(input)) {
    return {
      applicable: true,
      mode: "coverup",
      reason: "archival/cover-up Truth Formula inputs present",
    };
  }
  if (hasProvenance(input)) {
    return {
      applicable: true,
      mode: "subset",
      reason: "ordinary filing — documented Truth Formula subset",
    };
  }
  return {
    applicable: false,
    mode: null,
    reason: "no filing to score",
  };
}

export function classifyPhysLingApplicability(input = {}) {
  const mains = classificationMains(input);
  const qualify = [...mains].filter((m) => PHYSLING_QUALIFY_MAINS.includes(m));
  if (qualify.length) {
    return {
      applicable: true,
      reason: "physics-evaluable domain " + qualify.join(", "),
    };
  }
  if (hasPhysicsEvaluableClaim(input)) {
    return {
      applicable: true,
      reason: "physics or measurement claims in the document",
    };
  }
  const omit = [...mains].filter((m) => PHYSLING_OMIT_MAINS.includes(m));
  if (omit.length) {
    return {
      applicable: false,
      reason: "concept is " + omit.join(", ") + " without physics-evaluable claims",
    };
  }
  if (mains.has("hardware") && !hasPhysicsEvaluableClaim(input)) {
    return {
      applicable: false,
      reason: "hardware without physics-evaluable claims",
    };
  }
  return {
    applicable: false,
    reason: "no physics-evaluable domain or measurement claims",
  };
}

/**
 * Classify all three triad components for one document concept.
 */
export function classifyComponentApplicability(input = {}) {
  const spre = classifySpreApplicability(input);
  const clce = classifyClceApplicability(input);
  const plr = classifyPhysLingApplicability(input);
  const truth = classifyTruthFormulaApplicability(input);
  return {
    schema: COMPONENT_APPLICABILITY_SCHEMA,
    spre,
    clce,
    plr,
    truth_formula: truth,
    flags: {
      spre: spre.applicable,
      clce: clce.applicable,
      plr: plr.applicable,
      truth_formula: truth.applicable,
      bayesian: true,
      physics: plr.applicable,
      linguistics: plr.applicable,
    },
  };
}

export function applicabilityFlagsFrom(review, input = {}) {
  if (review && review.applicability && review.applicability.flags) {
    const f = review.applicability.flags;
    return {
      spre: f.spre !== false,
      clce: f.clce !== false,
      plr: f.plr !== false,
      truth_formula: f.truth_formula !== false,
      bayesian: f.bayesian !== false,
      physics: f.physics !== false,
      linguistics: f.linguistics !== false,
    };
  }
  if (review && (review.spre || review.clce || review.plr)) {
    const fromStamp = {
      spre: review.spre ? review.spre.applicable !== false : true,
      clce: review.clce ? review.clce.applicable !== false : true,
      plr: review.plr ? review.plr.applicable !== false : true,
      truth_formula: review.truth_formula ? review.truth_formula.applicable !== false : false,
      bayesian: true,
      physics: review.plr ? review.plr.applicable !== false : true,
      linguistics: review.plr ? review.plr.applicable !== false : true,
    };
    const stamped = [review.spre, review.clce, review.plr].some((e) => e && Object.prototype.hasOwnProperty.call(e, "applicable"));
    if (stamped) return fromStamp;
  }
  return classifyComponentApplicability(input).flags;
}

export function stampEngineApplicability(engine, gate) {
  if (!engine || typeof engine !== "object") return engine;
  const applicable = !!(gate && gate.applicable);
  const next = {
    ...engine,
    applicable,
    applicability_reason: gate && gate.reason ? String(gate.reason) : (applicable ? "applies" : "not_applicable"),
    not_applicable: applicable ? false : true,
  };
  if (gate && gate.mode) next.mode = gate.mode;
  return next;
}

export function isComponentApplicable(engine) {
  if (!engine || typeof engine !== "object") return false;
  if (engine.applicable === false || engine.not_applicable === true) return false;
  if (engine.status === "not_applicable") return false;
  return true;
}

/**
 * Public engine view: omit numeric scores when N/A (never publish 0-as-score).
 */
export function publicEngineView(engine) {
  if (!engine || typeof engine !== "object") return null;
  if (!isComponentApplicable(engine)) {
    return {
      engine: engine.engine || null,
      applicable: false,
      status: "not_applicable",
      reason: engine.applicability_reason || engine.reason || "not_applicable",
    };
  }
  return engine;
}

export function applicableComponentNames(flags) {
  const names = [];
  if (flags && flags.spre) names.push("SPRE");
  if (flags && flags.clce) names.push("CLCE");
  if (flags && flags.plr) names.push("PhysLing");
  return names;
}

export function publicComponentFlags(review, row = {}) {
  const flags = applicabilityFlagsFrom(review, row);
  return {
    ...flags,
    names: applicableComponentNames(flags),
  };
}
