/**
 * ZionPattern Solver secondary score — public, separate from triad.
 * Author: Aziel Eliab only.
 *
 * Hard 75% confidence cap / 25% uncertainty floor. Provisional and assistive.
 * Does not solve Zioncheck or any case. Not merged into triad. No Aziel Library +25.
 * First-hand succession pattern-break proof can force-rescore a chain; narrative
 * and second-source materials never trigger that path.
 */
import { appendLedger, appendDocumentLedger, isDocumentId } from "./ledger.js";
import { classifyDomains } from "./domain-classify.js";

export const ZSOLVER_HOST = "https://zsolver-download-tracker.vibelock.workers.dev";
export const ZSOLVER_DISCLAIMER =
  "Provisional and assistive only. Does not solve Zioncheck or any case. Hard cap 75% / uncertainty floor 25%.";
export const ZSOLVER_CAP = 0.75;
export const ZSOLVER_FLOOR = 0.25;
export const ZSOLVER_SEED_DISPLAY = 75;
/** Historical / research / investigation / crime qualify. Philosophy / software / hardware / design do not. */
export const ZSOLVER_QUALIFY_MAINS = Object.freeze(["history", "historical", "research", "investigation", "crime"]);
export const ZSOLVER_OMIT_MAINS = Object.freeze(["philosophy", "software", "hardware", "design", "designs"]);

export const EVIDENCE_CLASS_FIRST_HAND = "first_hand";
export const EVIDENCE_CLASS_SECOND_HAND = "second_hand";

const PATTERN_IDS = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9"];

const FIRST_HAND_RE =
  /\b(death\s*cert(?:ificate)?s?|autopsy(?:\s+report)?|post[-\s]?mortem|coroner(?:['’]s)?\s+(?:file|report|inquest)|medical\s+examiner(?:\s+file)?|original\s+measurements?|independent\s+measurements?|contemporaneous\s+(?:primary|document|record|note|primary\s+document)|instrument\s+data|original\s+instrument|original\s+photographs?|photograph(?:s)?\s+with\s+provenance|sworn\s+affidavit|\baffidavit\b|first[-\s]?hand|primary\s+source|primary\s+document|original\s+document)\b/i;
const SECOND_HAND_RE =
  /\b(news\s+coverage|news\s+reports?|newspapers?|news\s+articles?|wire[-\s]?service|associated\s+press|\breuters\b|\bupi\b|second[-\s]?hand|second[-\s]?source|second-source\s+materials?|commentary|opinion\s+piece|editorials?|op-eds?|press\s+accounts?|media\s+accounts?|according\s+to\s+(?:reports?|officials)|official\s+narrative|narrative\s+only|summary\s+of\s+(?:reports?|coverage)|wire[-\s]?service\s+locked)\b/i;
const PATTERN_BREAK_RE =
  /\b(pattern\s+break|breaks?\s+(?:the|this|a)\s+pattern|break\s+in\s+the\s+pattern|proves?\s+a\s+break|first[-\s]?hand\s+disproof|contradicts?|refutes?|disproves?|invalidates?\s+the\s+prior|forensic\s+contradiction|corrects\s+the\s+record)\b/i;

const SIGNALS = {
  P1: { yes: ["unexplained gap", "timeline contradiction", "clocks cannot", "kinematic impossibility"], no: ["timeline consistent", "clocks agree"] },
  P2: { yes: ["incomplete custody", "provenance gap", "overwrite marks", "custody chain missing"], no: ["custody complete", "provenance verified"] },
  P3: { yes: ["unnamed witness", "missing blotter", "archival void", "second-hand summaries only"], no: ["named witness list"] },
  P4: { yes: ["location mismatch", "route inconsistency", "floor disagreement"], no: ["location corroborated"] },
  P5: { yes: ["pre-event discredit", "psychiatric framing before exam", "official narrative locked"], no: [] },
  P6: { yes: ["political conflict omitted", "motive context omitted"], no: [] },
  P7: { yes: ["encoded testimony", "rubye"], require: ["zioncheck", "rubye", "marion a. zioncheck"] },
  P8: { yes: ["same-day suicide conclusion", "narrative lock", "wire-service locked"], no: [] },
  P9: { yes: ["missing measurements", "no coroner file", "forensic gap", "no independent examiner"], no: ["independent measurements"] },
};

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

/** Zioncheck Visual Archive vols 1–5 are the seed baseline (display 75, never N/A, never 0). */
export function isZioncheckSeedVol(input = {}) {
  const bag = [input.title, input.filename, input.subjects, input.keywords].filter(Boolean).join("\n");
  if (!/zioncheck/i.test(bag)) return false;
  const m = bag.match(/\bvol(?:ume)?\.?\s*([1-5])\b/i);
  return !!(m && Number(m[1]) >= 1 && Number(m[1]) <= 5);
}

export function classifyZsolverApplicability(input = {}) {
  if (isZioncheckSeedVol(input)) {
    return {
      applicable: true,
      seed_corpus: true,
      baseline: true,
      reason: "Zioncheck Visual Archive vols 1–5 seed baseline",
    };
  }
  const mains = new Set();
  try {
    const classified = classifyDomains(input);
    for (const p of classified && classified.paths ? classified.paths : []) addMain(mains, p && p.main);
    addMain(mains, classified && classified.domain);
  } catch { /* classifier optional */ }
  for (const t of tokenList(input.domain)) addMain(mains, t);
  for (const t of tokenList(input.subjects)) addMain(mains, t);
  const omit = [...mains].filter((m) => ZSOLVER_OMIT_MAINS.includes(m));
  if (omit.length) {
    return {
      applicable: false,
      seed_corpus: false,
      baseline: false,
      reason: "not applicable for " + omit.join(", "),
    };
  }
  const qualify = [...mains].filter((m) => ZSOLVER_QUALIFY_MAINS.includes(m) || m === "history");
  if (qualify.length) {
    return {
      applicable: true,
      seed_corpus: false,
      baseline: false,
      reason: "qualifies as " + qualify.join(", "),
    };
  }
  return {
    applicable: false,
    seed_corpus: false,
    baseline: false,
    reason: "not historical, research, investigation, or crime",
  };
}

export function notApplicableZsolver(reason) {
  return {
    engine: "zsolver",
    product: "zsolver",
    author: "Aziel Eliab",
    official_contradiction: null,
    alternative_coherence: null,
    raw_confidence: null,
    capped_confidence: null,
    uncertainty: null,
    confidence_cap: ZSOLVER_CAP,
    uncertainty_floor: ZSOLVER_FLOOR,
    display: null,
    status: "not_applicable",
    applicable: false,
    seed_corpus: false,
    baseline: false,
    reason: String(reason || "not_applicable"),
    disclaimer: ZSOLVER_DISCLAIMER,
    provisional: true,
    assistive: true,
    solves_cases: false,
    primary_visible: false,
    separate_from_triad: true,
    source: "not_applicable",
  };
}

export function seedBaselineZsolver() {
  return {
    engine: "zsolver",
    product: "zsolver",
    author: "Aziel Eliab",
    official_contradiction: ZSOLVER_CAP,
    alternative_coherence: ZSOLVER_CAP,
    raw_confidence: ZSOLVER_CAP,
    capped_confidence: ZSOLVER_CAP,
    uncertainty: ZSOLVER_FLOOR,
    confidence_cap: ZSOLVER_CAP,
    uncertainty_floor: ZSOLVER_FLOOR,
    answered: 0,
    unknown_answers: 0,
    answers: [],
    display: ZSOLVER_SEED_DISPLAY,
    status: "scored",
    applicable: true,
    seed_corpus: true,
    baseline: true,
    reason: "Zioncheck Visual Archive vols 1–5 seed baseline",
    disclaimer: ZSOLVER_DISCLAIMER,
    provisional: true,
    assistive: true,
    solves_cases: false,
    primary_visible: true,
    separate_from_triad: true,
    source: "seed-baseline",
  };
}

function hay(input) {
  return [
    input && input.title,
    input && input.body,
    input && input.filename,
    input && input.subjects,
    input && input.keywords,
  ].filter(Boolean).join("\n").toLowerCase();
}

function evidenceHay(input) {
  const filename = String((input && input.filename) || "").replace(/[-_]+/g, " ");
  return hay({ ...input, filename });
}

export function classifyEvidenceClass(input = {}) {
  const text = evidenceHay(input);
  if (FIRST_HAND_RE.test(text)) return EVIDENCE_CLASS_FIRST_HAND;
  if (SECOND_HAND_RE.test(text)) return EVIDENCE_CLASS_SECOND_HAND;
  return "unknown";
}

export function detectFirstHandPatternBreak(input = {}) {
  const evidence_class = classifyEvidenceClass(input);
  const text = evidenceHay(input);
  const breakProof = PATTERN_BREAK_RE.test(text);
  if (evidence_class !== EVIDENCE_CLASS_FIRST_HAND) {
    return {
      proven: false,
      evidence_class,
      reason: evidence_class === EVIDENCE_CLASS_SECOND_HAND
        ? "narrative or second-source materials alone cannot prove a pattern break"
        : "first-hand materials required",
    };
  }
  if (!breakProof) {
    return {
      proven: false,
      evidence_class: EVIDENCE_CLASS_FIRST_HAND,
      reason: "first-hand materials present but no pattern-break proof",
    };
  }
  return {
    proven: true,
    evidence_class: EVIDENCE_CLASS_FIRST_HAND,
    reason: "first-hand pattern-break proof",
  };
}

export function patternBreakContext({ source_record_id, superseded_ids } = {}) {
  return {
    proven: true,
    evidence_class: EVIDENCE_CLASS_FIRST_HAND,
    source_record_id: source_record_id || "",
    superseded_ids: Array.isArray(superseded_ids) ? superseded_ids.filter(Boolean) : [],
  };
}

function hasAny(text, needles) {
  return (needles || []).some((n) => n && text.includes(String(n).toLowerCase()));
}

export function deriveZsolverAnswers(input = {}) {
  const text = hay(input);
  return PATTERN_IDS.map((id) => {
    const sig = SIGNALS[id] || {};
    if (sig.require && sig.require.length && !hasAny(text, sig.require)) {
      return { pattern_id: id, value: "unknown" };
    }
    if (hasAny(text, sig.yes)) return { pattern_id: id, value: "yes" };
    if (hasAny(text, sig.no)) return { pattern_id: id, value: "no" };
    return { pattern_id: id, value: "unknown" };
  });
}

function round4(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 10000) / 10000;
}

export function localZsolverScore(answers) {
  const list = Array.isArray(answers) ? answers : [];
  let yes = 0;
  let no = 0;
  let unknown = 0;
  for (const a of list) {
    const v = String(a && a.value || "").toLowerCase();
    if (v === "yes") yes += 1;
    else if (v === "no") no += 1;
    else unknown += 1;
  }
  const decided = yes + no;
  const official = decided ? yes / decided : 0;
  const raw = official;
  const capped = Math.min(ZSOLVER_CAP, raw);
  const uncertainty = capped > 0 ? Math.max(ZSOLVER_FLOOR, 1 - capped) : 1;
  return {
    engine: "zsolver",
    product: "zsolver",
    author: "Aziel Eliab",
    official_contradiction: round4(official),
    alternative_coherence: round4(official),
    raw_confidence: round4(raw),
    capped_confidence: round4(capped),
    uncertainty: round4(uncertainty),
    confidence_cap: ZSOLVER_CAP,
    uncertainty_floor: ZSOLVER_FLOOR,
    answered: list.length,
    unknown_answers: unknown,
    answers: list,
    display: Math.round(capped * 100),
    disclaimer: ZSOLVER_DISCLAIMER,
    provisional: true,
    assistive: true,
    solves_cases: false,
    primary_visible: true,
    separate_from_triad: true,
    source: "local-port",
    applicable: true,
    seed_corpus: false,
    baseline: false,
  };
}

function normalizeLive(json, answers, source) {
  if (!json || typeof json !== "object") return null;
  const capped = Number(json.capped_confidence);
  if (!Number.isFinite(capped)) return null;
  const raw = Number(json.raw_confidence);
  return {
    engine: "zsolver",
    product: "zsolver",
    author: "Aziel Eliab",
    official_contradiction: round4(json.official_contradiction),
    alternative_coherence: round4(json.alternative_coherence),
    raw_confidence: Number.isFinite(raw) ? round4(raw) : round4(capped),
    capped_confidence: round4(Math.min(ZSOLVER_CAP, Math.max(0, capped))),
    uncertainty: round4(json.uncertainty != null ? json.uncertainty : (capped > 0 ? Math.max(ZSOLVER_FLOOR, 1 - capped) : 1)),
    confidence_cap: ZSOLVER_CAP,
    uncertainty_floor: ZSOLVER_FLOOR,
    answered: json.answered != null ? json.answered : (answers || []).length,
    unknown_answers: json.unknown_answers != null ? json.unknown_answers : 0,
    answers: json.answers || answers || [],
    display: Math.round(Math.min(ZSOLVER_CAP, Math.max(0, capped)) * 100),
    disclaimer: json.disclaimer || ZSOLVER_DISCLAIMER,
    provisional: true,
    assistive: true,
    solves_cases: false,
    primary_visible: true,
    separate_from_triad: true,
    source: source || "zsolver-live",
    applicable: json.applicable !== false,
    seed_corpus: !!json.seed_corpus,
    baseline: !!json.baseline,
    status: json.status || "scored",
  };
}

function scoreBody(answers, extra) {
  const body = { answers };
  if (extra && extra.pattern_break) body.pattern_break = extra.pattern_break;
  return body;
}

async function postScore(fetcher, url, answers, extra) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    const res = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 AzielDigitalLibrary" },
      body: JSON.stringify(scoreBody(answers, extra)),
      signal: ac.signal,
    });
    if (!res || !res.ok) return null;
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function requestZsolverScore(env, answers, extra) {
  const list = Array.isArray(answers) ? answers : [];
  if (env && env.ZSOLVER && typeof env.ZSOLVER.fetch === "function") {
    try {
      const json = await postScore((u, init) => env.ZSOLVER.fetch(new Request("https://zsolver/v1/score", init)), "https://zsolver/v1/score", list, extra);
      const live = normalizeLive(json, list, "zsolver-binding");
      if (live) return live;
    } catch { /* fall through to HTTPS */ }
  }
  try {
    const json = await postScore(fetch, ZSOLVER_HOST + "/v1/score", list, extra);
    const live = normalizeLive(json, list, "zsolver-live");
    if (live) return live;
  } catch { /* local port + queue */ }
  return null;
}

export function pendingZsolver(answers, error) {
  const local = localZsolverScore(answers);
  return {
    ...local,
    status: "queued",
    queued: true,
    last_error: String(error || "zsolver unavailable"),
    source: "queued",
  };
}

export async function ensureZsolverSchema(env) {
  if (!env || !env.DB) return;
  for (const col of ["zsolver_json TEXT", "zsolver_score REAL", "zsolver_status TEXT"]) {
    try { await env.DB.prepare("ALTER TABLE records ADD COLUMN " + col).run(); } catch { /* exists */ }
  }
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS zsolver_queue (record_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_utc TEXT NOT NULL, last_error TEXT, created_utc TEXT NOT NULL)"
  ).run();
}

export function parseZsolver(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

export function zsolverIsLive(report) {
  const src = report && report.source;
  return src === "zsolver-live" || src === "zsolver-binding";
}

export function zsolverNumericDisplay(report) {
  if (!report || typeof report !== "object") return null;
  if (zsolverIsNotApplicable(report)) return null;
  if (report.display != null && report.display !== "") {
    const n = Number(report.display);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  const capped = Number(report.capped_confidence);
  if (Number.isFinite(capped) && capped > 0) return Math.round(capped * 100);
  return null;
}

export function zsolverIsNotApplicable(report) {
  if (!report || typeof report !== "object") return false;
  const status = String(report.status || "").toLowerCase();
  if (status === "not_applicable" || report.applicable === false) return true;
  if (report.source === "not_applicable") return true;
  return false;
}

export function zsolverIsQueued(report) {
  if (!report || typeof report !== "object") return false;
  const status = String(report.status || "").toLowerCase();
  return status === "queued" || report.queued === true || report.source === "queued";
}

export function zsolverIsSettled(report) {
  if (!report || typeof report !== "object") return false;
  if (zsolverIsNotApplicable(report)) return true;
  if (report.seed_corpus || report.baseline || report.source === "seed-baseline") {
    return zsolverNumericDisplay(report) === ZSOLVER_SEED_DISPLAY;
  }
  if (zsolverIsQueued(report)) return false;
  return zsolverNumericDisplay(report) != null;
}

/** Compact fields for tip / packed shelf / search. Omit display when N/A. */
export function compactZsolverPublic(report) {
  if (!report || typeof report !== "object") return null;
  if (zsolverIsNotApplicable(report)) {
    return {
      status: "not_applicable",
      applicable: false,
      seed_corpus: false,
      baseline: false,
    };
  }
  const display = zsolverNumericDisplay(report);
  const out = {
    status: zsolverIsQueued(report) ? "queued" : (report.status || (display != null ? "scored" : "pending")),
    applicable: true,
    seed_corpus: !!report.seed_corpus,
    baseline: !!report.baseline,
  };
  if (display != null) out.display = display;
  return out;
}

export function triadDisplayFromRow(row) {
  if (!row || typeof row !== "object") return null;
  if (row.triad_display != null && row.triad_display !== "") {
    const n = Number(row.triad_display);
    if (Number.isFinite(n)) return Math.round(n);
  }
  const review = row.review && row.review.triad ? row.review.triad : null;
  if (review && review.display != null && review.display !== "") {
    const n = Number(review.display);
    if (Number.isFinite(n)) return Math.round(n);
  }
  const combined = row.triad_combined != null ? Number(row.triad_combined) : (review && review.combined);
  if (combined != null && Number.isFinite(Number(combined))) return Math.round(Number(combined) * 100);
  return null;
}

export function zsolverFromRow(row) {
  if (!row || typeof row !== "object") return null;
  let report = parseZsolver(row.zsolver_json || row.zsolver);
  if (!report && (row.zsolver_status || row.zsolver_score != null || row.zsolver_display != null)) {
    report = {
      status: row.zsolver_status || "",
      applicable: row.zsolver_applicable,
      display: row.zsolver_display,
      capped_confidence: row.zsolver_score,
      seed_corpus: row.zsolver_seed || row.seed_corpus,
      baseline: row.zsolver_baseline || row.baseline,
    };
  }
  return report || null;
}

/**
 * Shelf / card UI state. Never invent 0. Pending only when truly unscored.
 * N/A omits the ZionPattern line entirely.
 */
export function shelfScoreState(row) {
  const triad_display = triadDisplayFromRow(row);
  const report = zsolverFromRow(row);
  if (zsolverIsNotApplicable(report)) {
    return { triad_display, zsolver_display: null, zsolver_pending: false, zsolver_omit: true, zsolver_queued: false, zsolver_seed: false };
  }
  const display = zsolverNumericDisplay(report);
  if (display != null) {
    return {
      triad_display,
      zsolver_display: display,
      zsolver_pending: false,
      zsolver_omit: false,
      zsolver_queued: zsolverIsQueued(report),
      zsolver_seed: !!(report && (report.seed_corpus || report.baseline)),
    };
  }
  if (zsolverIsQueued(report)) {
    return { triad_display, zsolver_display: null, zsolver_pending: true, zsolver_omit: false, zsolver_queued: true, zsolver_seed: false };
  }
  return { triad_display, zsolver_display: null, zsolver_pending: true, zsolver_omit: false, zsolver_queued: false, zsolver_seed: false };
}

export function finalizeZsolverReport(record, report) {
  const appl = classifyZsolverApplicability(record || {});
  if (appl.seed_corpus) return seedBaselineZsolver();
  if (!appl.applicable) return notApplicableZsolver(appl.reason);
  if (!report) return notApplicableZsolver("no score");
  if (zsolverIsNotApplicable(report)) return notApplicableZsolver(report.reason || appl.reason);
  const display = zsolverNumericDisplay(report);
  if (display == null || display <= 0) return notApplicableZsolver("score 0 / non-match");
  return {
    ...report,
    applicable: true,
    seed_corpus: false,
    baseline: false,
    display,
    status: zsolverIsQueued(report) ? "queued" : (report.status || "scored"),
  };
}

async function persistReport(env, recordId, report) {
  let stored = report && typeof report === "object" ? { ...report } : notApplicableZsolver("empty report");
  if (!zsolverIsQueued(stored) && !zsolverIsNotApplicable(stored) && zsolverNumericDisplay(stored) == null) {
    stored = stored.seed_corpus ? seedBaselineZsolver() : notApplicableZsolver(stored.reason || "score 0 / non-match");
  }
  const status = stored.status || (zsolverIsLive(stored) ? "scored" : stored.queued ? "queued" : "local");
  stored.status = status;
  const scoreBind = stored.capped_confidence != null && Number.isFinite(Number(stored.capped_confidence))
    ? Number(stored.capped_confidence)
    : null;
  try {
    await env.DB.prepare("UPDATE records SET zsolver_json=?, zsolver_score=?, zsolver_status=? WHERE record_id=?")
      .bind(JSON.stringify(stored), scoreBind, status, recordId).run();
  } catch { /* schema */ }
  const payload = {
    record_id: recordId,
    capped_confidence: stored.capped_confidence,
    display: stored.display,
    status,
    applicable: stored.applicable !== false,
    seed_corpus: !!stored.seed_corpus,
    source: stored.source,
    provisional: true,
    separate_from_triad: true,
  };
  if (stored.pattern_break) payload.pattern_break = stored.pattern_break;
  await appendLedger(env, "ZSOLVER_SCORE", payload);
  if (isDocumentId(recordId)) await appendDocumentLedger(env, recordId, "ZSOLVER_SCORE", payload);
  try { await patchTipZsolver(env, recordId, stored); } catch { /* tip optional */ }
  return stored;
}

async function readTipJson(env, recordId) {
  try {
    const row = await env.DB.prepare("SELECT lattice_tip_json FROM records WHERE record_id=?").bind(recordId).first();
    if (row && row.lattice_tip_json) {
      const tip = typeof row.lattice_tip_json === "string" ? JSON.parse(row.lattice_tip_json) : row.lattice_tip_json;
      if (tip && typeof tip === "object") return tip;
    }
  } catch { /* */ }
  try {
    const trow = await env.DB.prepare(
      "SELECT tip_json FROM lattice_tips WHERE record_id=? ORDER BY created_utc DESC LIMIT 1"
    ).bind(recordId).first();
    if (trow && trow.tip_json) {
      const tip = typeof trow.tip_json === "string" ? JSON.parse(trow.tip_json) : trow.tip_json;
      if (tip && typeof tip === "object") return tip;
    }
  } catch { /* */ }
  return null;
}

export async function patchTipZsolver(env, recordId, report) {
  if (!env || !env.DB || !recordId) return null;
  const compact = compactZsolverPublic(report);
  let tip = await readTipJson(env, recordId);
  if (!tip || typeof tip !== "object") return compact;
  tip = { ...tip, zsolver: compact };
  const raw = JSON.stringify(tip);
  try {
    await env.DB.prepare("UPDATE records SET lattice_tip_json=? WHERE record_id=?").bind(raw, recordId).run();
  } catch { /* schema */ }
  try {
    await env.DB.prepare(
      "UPDATE lattice_tips SET tip_json=? WHERE record_id=? AND created_utc=(SELECT MAX(created_utc) FROM lattice_tips WHERE record_id=?)"
    ).bind(raw, recordId, recordId).run();
  } catch { /* schema */ }
  return tip;
}

export async function enqueueZsolver(env, recordId, answers, error, extra) {
  await ensureZsolverSchema(env);
  const when = new Date().toISOString();
  const next = new Date(Date.now() + 60 * 1000).toISOString();
  try {
    await env.DB.prepare(
      "INSERT INTO zsolver_queue(record_id,payload_json,attempts,next_utc,last_error,created_utc) VALUES(?,?,1,?,?,?) ON CONFLICT(record_id) DO UPDATE SET payload_json=excluded.payload_json, attempts=zsolver_queue.attempts+1, next_utc=excluded.next_utc, last_error=excluded.last_error"
    ).bind(recordId, JSON.stringify(scoreBody(answers, extra)), next, String(error || "unavailable").slice(0, 300), when).run();
  } catch { /* schema */ }
}

function attachPatternBreak(report, pattern_break) {
  if (!report || !pattern_break) return report;
  return { ...report, pattern_break };
}

export async function scoreZsolverForRecord(env, record, { force = false, pattern_break = null, reconcileOnly = false } = {}) {
  if (!env || !env.DB || !record || !record.record_id) return null;
  await ensureZsolverSchema(env);
  const appl = classifyZsolverApplicability(record);
  if (appl.seed_corpus) {
    if (!force) {
      const existingSeed = parseZsolver(record.zsolver_json);
      if (existingSeed && existingSeed.seed_corpus && zsolverNumericDisplay(existingSeed) === ZSOLVER_SEED_DISPLAY) {
        try { await patchTipZsolver(env, record.record_id, existingSeed); } catch { /* */ }
        return existingSeed;
      }
    }
    return persistReport(env, record.record_id, seedBaselineZsolver());
  }
  if (!appl.applicable) {
    const na = notApplicableZsolver(appl.reason);
    if (!force) {
      const existingNa = parseZsolver(record.zsolver_json);
      if (zsolverIsNotApplicable(existingNa)) {
        try { await patchTipZsolver(env, record.record_id, existingNa); } catch { /* */ }
        return finalizeZsolverReport(record, existingNa);
      }
    }
    return persistReport(env, record.record_id, na);
  }
  const existing = parseZsolver(record.zsolver_json);
  if (reconcileOnly) {
    if (existing && (existing.display === 0 || Number(existing.capped_confidence) === 0) && !zsolverIsQueued(existing)) {
      return persistReport(env, record.record_id, notApplicableZsolver("score 0 / non-match"));
    }
    if (existing) {
      try { await patchTipZsolver(env, record.record_id, existing); } catch { /* */ }
    }
    return existing;
  }
  if (!force && zsolverIsSettled(existing) && !zsolverIsNotApplicable(existing)) {
    try { await patchTipZsolver(env, record.record_id, existing); } catch { /* */ }
    return existing;
  }
  const answers = deriveZsolverAnswers(record);
  const extra = pattern_break ? { pattern_break } : null;
  const live = await requestZsolverScore(env, answers, extra);
  if (live) {
    try { await env.DB.prepare("DELETE FROM zsolver_queue WHERE record_id=?").bind(record.record_id).run(); } catch { /* */ }
    return persistReport(env, record.record_id, finalizeZsolverReport(record, attachPatternBreak(live, pattern_break)));
  }
  if (!force && zsolverIsSettled(existing)) {
    try { await patchTipZsolver(env, record.record_id, existing); } catch { /* */ }
    return existing;
  }
  await enqueueZsolver(env, record.record_id, answers, "zsolver API unavailable", extra);
  const queued = pendingZsolver(answers, "zsolver API unavailable");
  return persistReport(env, record.record_id, attachPatternBreak(queued, pattern_break));
}

export async function drainZsolverQueue(env, { limit = 20 } = {}) {
  if (!env || !env.DB) return { drained: 0, scored: 0, failed: 0 };
  await ensureZsolverSchema(env);
  const now = new Date().toISOString();
  let rows = [];
  try {
    rows = (await env.DB.prepare(
      "SELECT record_id, payload_json, attempts FROM zsolver_queue WHERE next_utc<=? ORDER BY next_utc ASC LIMIT ?"
    ).bind(now, Math.min(Math.max(Number(limit) || 20, 1), 50)).all()).results || [];
  } catch { return { drained: 0, scored: 0, failed: 0 }; }
  let scored = 0;
  let failed = 0;
  for (const row of rows) {
    let answers = [];
    let pattern_break = null;
    try {
      const payload = JSON.parse(row.payload_json) || {};
      answers = payload.answers || [];
      pattern_break = payload.pattern_break || null;
    } catch { answers = []; }
    const live = await requestZsolverScore(env, answers, pattern_break ? { pattern_break } : null);
    if (live) {
      const scored = zsolverNumericDisplay(live) == null
        ? notApplicableZsolver("score 0 / non-match")
        : { ...live, applicable: true, status: "scored" };
      await persistReport(env, row.record_id, attachPatternBreak(scored, pattern_break));
      try { await env.DB.prepare("DELETE FROM zsolver_queue WHERE record_id=?").bind(row.record_id).run(); } catch { /* */ }
      scored += 1;
    } else {
      const delay = Math.min(60 * 60 * 1000, 60 * 1000 * Math.pow(2, Number(row.attempts) || 1));
      const next = new Date(Date.now() + delay).toISOString();
      try {
        await env.DB.prepare("UPDATE zsolver_queue SET attempts=attempts+1, next_utc=?, last_error=? WHERE record_id=?")
          .bind(next, "zsolver API unavailable", row.record_id).run();
      } catch { /* */ }
      failed += 1;
    }
  }
  return { drained: rows.length, scored, failed };
}
