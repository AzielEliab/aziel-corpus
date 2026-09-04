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

export const ZSOLVER_HOST = "https://zsolver-download-tracker.vibelock.workers.dev";
export const ZSOLVER_DISCLAIMER =
  "Provisional and assistive only. Does not solve Zioncheck or any case. Hard cap 75% / uncertainty floor 25%.";
export const ZSOLVER_CAP = 0.75;
export const ZSOLVER_FLOOR = 0.25;

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

async function persistReport(env, recordId, report) {
  const status = report.status || (zsolverIsLive(report) ? "scored" : report.queued ? "queued" : "local");
  const stored = { ...report, status };
  try {
    await env.DB.prepare("UPDATE records SET zsolver_json=?, zsolver_score=?, zsolver_status=? WHERE record_id=?")
      .bind(JSON.stringify(stored), stored.capped_confidence, status, recordId).run();
  } catch { /* schema */ }
  const payload = {
    record_id: recordId,
    capped_confidence: stored.capped_confidence,
    display: stored.display,
    status,
    source: stored.source,
    provisional: true,
    separate_from_triad: true,
  };
  if (stored.pattern_break) payload.pattern_break = stored.pattern_break;
  await appendLedger(env, "ZSOLVER_SCORE", payload);
  if (isDocumentId(recordId)) await appendDocumentLedger(env, recordId, "ZSOLVER_SCORE", payload);
  return stored;
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

export async function scoreZsolverForRecord(env, record, { force = false, pattern_break = null } = {}) {
  if (!env || !env.DB || !record || !record.record_id) return null;
  await ensureZsolverSchema(env);
  const existing = parseZsolver(record.zsolver_json);
  if (!force && zsolverIsLive(existing)) return existing;
  const answers = deriveZsolverAnswers(record);
  const extra = pattern_break ? { pattern_break } : null;
  const live = await requestZsolverScore(env, answers, extra);
  if (live) {
    try { await env.DB.prepare("DELETE FROM zsolver_queue WHERE record_id=?").bind(record.record_id).run(); } catch { /* */ }
    return persistReport(env, record.record_id, attachPatternBreak(live, pattern_break));
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
      await persistReport(env, row.record_id, attachPatternBreak(live, pattern_break));
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
