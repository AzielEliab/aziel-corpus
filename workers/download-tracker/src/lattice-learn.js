/**
 * Adaptive learning via the hashchain lattice.
 * Author: Aziel Eliab only.
 *
 * Recollection and reasoning walk document_ledger / global ledger
 * (tip + prev-hash). They do not use an opaque memory store or LLM-as-memory.
 *
 * Law: HASHCHAIN-LATTICE-LEARN-1.0
 * - LEARN / POSSIBILITY / POISON_LEARN / MAP_PIN append; never mutate prior stamps.
 * - Posterior ≠ truth. Possibility ≠ probability ≠ triad ≠ ZionPattern.
 * - Scores are not guilt verdicts / courtroom proof.
 * - Poison-learn stores hash + feature receipt only (no poison body).
 */
import { createHash } from "node:crypto";
import { appendLedger, appendDocumentLedger, documentChain, isDocumentId, sha256hex, hashPayload } from "./ledger.js";
import { poisonScan, clamp01, tokenize } from "./review.js";
import { verifyBytes, verifyTextRecord } from "./structure.js";

export const HASHCHAIN_LEARN_LAW =
  "adaptive learning via hashchain lattice for recollection and reasoning";
export const LEARN_SCHEMA = "aziel.learn.v1";
export const POSSIBILITY_SCHEMA = "aziel.possibility.v1";
export const POISON_LEARN_SCHEMA = "aziel.poison-learn.v1";
export const MAP_PIN_SCHEMA = "aziel.map-pin.v1";
export const POISON_LEARN_RECORD_ID = "AZDOC-POISONLEARN";
export const POSSIBILITY_KIND = "HEURISTIC";
export const POSSIBILITY_NOTE =
  "possibility ≠ probability ≠ triad ≠ ZionPattern. HEURISTIC density over lattice pin receipts. Not Beta-Bernoulli. Not a guilt verdict. Not courtroom proof. Posterior ≠ truth.";
export const LEARN_LIMITATION =
  "Adaptive learning appends LEARN stamps to the hashchain lattice. Recollection is tip + depth / prev-hash verify (fail closed on break). Reasoning walks lattice receipts + time×geo anchors. History is never rewritten. Author Aziel Eliab.";

export const MAP4D_CITE = {
  spec: "4DM-WP-1.0",
  cite: "https://github.com/AzielEliab/4dmap",
  home: "https://4dmap-download-tracker.vibelock.workers.dev/",
  axes: {
    T: "clock / paper event_date",
    Delta: "interval between pins",
    Gamma: "trajectory across pins",
    Pi: "pattern support / contradiction density",
  },
  note: "Inspection frame after AZPIPE, not an extra door. Not a live ICANN mesh DNS. Not GIS 4D. Receipts are not truth.",
};

export const LEARN_ACTIONS = new Set([
  "LEARN",
  "POISON_LEARN",
  "MAP_PIN",
  "MAP_PIN_REFUSED",
  "POSSIBILITY_SCORE",
  "LATTICE_ANCHOR",
  "REVIEW_SCORE",
  "POISON_QUARANTINE",
  "PEER_REVIEW",
  "INGEST",
  "STRUCTURE_VERIFY",
]);

const TRIGGER_RE =
  /\b(officials?|authorities|narrative|disinformation|misinformation|debunked|sheeple|hoax|fraud|fake|scam|cover-?up|shill|liar|lies?|wake|trust|settled|conspiracy)\b/gi;

export function round4(n) {
  return Math.round(clamp01(n) * 10000) / 10000;
}

export function featureHash(parts) {
  return hashPayload(parts);
}

export function poisonFeatureReceipt({ title = "", body = "", filename = "", sha256 = "", markers = [] } = {}) {
  const text = [title, filename].join("\n");
  const tokens = tokenize(text);
  const triggers = [];
  const src = String(title || "") + "\n" + String(filename || "");
  const rx = new RegExp(TRIGGER_RE.source, "gi");
  let m;
  while ((m = rx.exec(src))) triggers.push(String(m[0]).toLowerCase());
  const token_hashes = [...new Set(triggers.concat(tokens.filter((t) => t.length >= 4)))]
    .slice(0, 24)
    .map((t) => sha256hex(t));
  const feature_id = featureHash({
    schema: POISON_LEARN_SCHEMA,
    markers: [...markers].sort(),
    token_hashes: [...token_hashes].sort(),
  });
  return {
    schema: POISON_LEARN_SCHEMA,
    feature_id,
    content_sha256: sha256 || null,
    markers: [...markers],
    token_hashes,
    body_retained: false,
    note: "Hash + feature receipt only. Poison payload/body is not stored on this stamp.",
    author: "Aziel Eliab",
  };
}

export function matchLearnedPoison(features, learned = []) {
  const incoming = features || {};
  const list = Array.isArray(learned) ? learned : [];
  if (incoming.content_sha256 && list.some((x) => x.content_sha256 && x.content_sha256 === incoming.content_sha256)) {
    return { match: true, reason: "content_sha256", feature_id: incoming.feature_id || null };
  }
  if (incoming.feature_id && list.some((x) => x.feature_id === incoming.feature_id)) {
    return { match: true, reason: "feature_id", feature_id: incoming.feature_id };
  }
  const A = new Set(incoming.token_hashes || []);
  const M = new Set(incoming.markers || []);
  for (const row of list) {
    const B = new Set(row.token_hashes || []);
    if (!A.size || !B.size) continue;
    let inter = 0;
    for (const t of A) if (B.has(t)) inter += 1;
    const union = A.size + B.size - inter;
    const jaccard = union ? inter / union : 0;
    const sharedMarkers = [...M].filter((x) => (row.markers || []).includes(x)).length;
    if (jaccard >= 0.7 && sharedMarkers >= 1) {
      return { match: true, reason: "feature_jaccard", feature_id: row.feature_id || incoming.feature_id || null, jaccard: round4(jaccard) };
    }
  }
  return { match: false };
}

function rad(deg) {
  return (Number(deg) * Math.PI) / 180;
}

export function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null || a.lon == null || b.lon == null) return null;
  const R = 6371;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function parseYear(date) {
  const y = parseInt(String(date || "").slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

function daySpan(a, b) {
  const da = Date.parse(String(a).length === 4 ? a + "-01-01" : String(a).length === 7 ? a + "-01" : a);
  const db = Date.parse(String(b).length === 4 ? b + "-01-01" : String(b).length === 7 ? b + "-01" : b);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return null;
  return Math.max(1, Math.abs(db - da) / 86400000);
}

export function possibilityRefuse(reason, extra = {}) {
  return {
    schema: POSSIBILITY_SCHEMA,
    kind: POSSIBILITY_KIND,
    possibility: null,
    refuse: reason,
    unranked: true,
    sort_key: null,
    note: POSSIBILITY_NOTE,
    law: HASHCHAIN_LEARN_LAW,
    map4d: MAP4D_CITE,
    not_truth: true,
    not_court: true,
    bayesian_separate: true,
    triad_separate: true,
    zsolver_separate: true,
    kid_plain: "This is not a yes-or-no verdict. The lattice did not have enough honest anchors, or it refused.",
    ...extra,
  };
}

/**
 * HEURISTIC possibility ∈ [0,1] or refuse.
 * Could this have occurred as stated given the time×geo anchors on the lattice?
 * Derived view over lattice facts — not free-floating weights.
 */
export function possibilityScore({
  anchors = [],
  learnStamps = [],
  latticeOk = true,
  poison = false,
  structureOk = true,
} = {}) {
  if (latticeOk === false) return possibilityRefuse("LATTICE_BREAK");
  if (structureOk === false) return possibilityRefuse("STRUCTURE_FAIL");
  if (poison) return possibilityRefuse("POISON_BLOCK");

  const pins = (anchors || []).filter((a) => a && a.lat != null && a.lon != null && a.date);
  if (!pins.length) return possibilityRefuse("NO_ANCHORS");

  let supportHits = 0;
  let contradictionHits = 0;
  const accepts = (learnStamps || []).filter((s) => s && s.kind === "accept" && Array.isArray(s.anchors));
  for (const pin of pins) {
    for (const stamp of accepts) {
      for (const other of stamp.anchors) {
        if (!other || other.lat == null || other.lon == null || !other.date) continue;
        const km = haversineKm(pin, other);
        const years = Math.abs((parseYear(pin.date) || 0) - (parseYear(other.date) || 0));
        if (km != null && km <= 50 && years <= 1) supportHits += 1;
        if (km != null && km > 800 && years === 0) contradictionHits += 1;
      }
    }
  }

  const sameDocPairs = [];
  const ordered = pins.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  for (let i = 1; i < ordered.length; i++) {
    const km = haversineKm(ordered[i - 1], ordered[i]);
    const days = daySpan(ordered[i - 1].date, ordered[i].date);
    if (km == null || days == null) continue;
    sameDocPairs.push({ km, days, speed: km / days });
    if (km > 400 && String(ordered[i - 1].date) === String(ordered[i].date)) contradictionHits += 1;
  }

  let travel = 1;
  if (sameDocPairs.length) {
    const worst = Math.max(...sameDocPairs.map((p) => p.speed));
    // Generous civilian/historical travel ceiling (~2000 km/day). Faster is implausible as stated.
    travel = clamp01(1 - Math.max(0, worst - 2000) / 4000);
    if (worst > 8000) travel = 0;
  }

  const support_density = clamp01(supportHits / (pins.length + accepts.length + 1));
  const contradiction_density = clamp01(contradictionHits / (pins.length + 1));
  const possibility = clamp01(0.5 + 0.35 * support_density - 0.4 * contradiction_density - 0.25 * (1 - travel));

  return {
    schema: POSSIBILITY_SCHEMA,
    kind: POSSIBILITY_KIND,
    math: "HEURISTIC: clamp01(0.5 + 0.35·support_density − 0.40·contradiction_density − 0.25·(1 − travel_plausibility)) over lattice pin receipts. Not Beta-Bernoulli (Bayesian). Not TRIAD_V1. Not ZionPattern.",
    possibility: round4(possibility),
    refuse: null,
    components: {
      support_density: round4(support_density),
      contradiction_density: round4(contradiction_density),
      travel_plausibility: round4(travel),
      pin_count: pins.length,
      support_hits: supportHits,
      contradiction_hits: contradictionHits,
    },
    unranked: true,
    sort_key: null,
    note: POSSIBILITY_NOTE,
    law: HASHCHAIN_LEARN_LAW,
    map4d: MAP4D_CITE,
    not_truth: true,
    not_court: true,
    bayesian_separate: true,
    triad_separate: true,
    zsolver_separate: true,
    kid_plain:
      "This is a possibility guess from dates and places already on the chain. It is not the Bayesian number and it is not a court finding.",
  };
}

export function verifyChainWalk(entries, { tip = null, depth = 32 } = {}) {
  const ZERO = "0".repeat(64);
  const rows = Array.isArray(entries) ? entries : [];
  const errors = [];
  let expectedPrev = ZERO;
  let expectedSeq = 1;
  let walkedTip = ZERO;
  for (const row of rows) {
    const seq = Number(row.sequence);
    if (seq !== expectedSeq) errors.push("sequence gap at " + seq);
    if (String(row.previous_hash || row.prev_hash || "") !== expectedPrev) errors.push("previous_hash mismatch at " + seq);
    expectedPrev = row.entry_hash;
    expectedSeq = seq + 1;
    walkedTip = row.entry_hash;
  }
  if (tip && walkedTip && tip !== walkedTip) errors.push("tip mismatch");
  const ok = errors.length === 0;
  const take = Math.max(1, Number(depth) || 32);
  return {
    ok,
    refuse: ok ? null : "LATTICE_BREAK",
    errors,
    tip: walkedTip,
    stamps: ok ? rows.filter((e) => LEARN_ACTIONS.has(String(e.action))).slice(-take) : [],
    law: HASHCHAIN_LEARN_LAW,
  };
}

export async function recollectLattice(env, { record_id, depth = 32, tip = null } = {}) {
  const id = String(record_id || "").trim();
  if (!id) return { ok: false, refuse: "RECORD_REQUIRED", stamps: [], law: HASHCHAIN_LEARN_LAW };
  const chain = await documentChain(env, id);
  const walk = verifyChainWalk(chain.entries, { tip: tip || chain.tip, depth });
  if (!chain.ok || !walk.ok) {
    return {
      ok: false,
      refuse: "LATTICE_BREAK",
      record_id: id,
      errors: [...(chain.errors || []), ...(walk.errors || [])],
      stamps: [],
      tip: chain.tip,
      law: HASHCHAIN_LEARN_LAW,
      note: "Recollection failed closed. Prev-hash verify broke. Scores are not invented.",
    };
  }
  return {
    ok: true,
    record_id: id,
    tip: chain.tip,
    sequence: chain.sequence,
    stamps: walk.stamps,
    law: HASHCHAIN_LEARN_LAW,
    map4d: MAP4D_CITE,
    note: "Recollection = tip + depth / prev-hash verify. Reasoning walks these receipts.",
  };
}

export async function loadLearnStamps(env, { excludeRecordId = null, limit = 64 } = {}) {
  if (!env || !env.DB) return [];
  try {
    const take = Math.max(1, Number(limit) || 64);
    const exclude = String(excludeRecordId || "").trim();
    const stmt = exclude
      ? env.DB.prepare(
          "SELECT payload_json FROM document_ledger WHERE action=? AND record_id!=? ORDER BY timestamp_utc DESC LIMIT ?"
        ).bind("LEARN", exclude, take)
      : env.DB.prepare(
          "SELECT payload_json FROM document_ledger WHERE action=? ORDER BY timestamp_utc DESC LIMIT ?"
        ).bind("LEARN", take);
    const { results } = await stmt.all();
    const out = [];
    for (const row of results || []) {
      let payload = {};
      try { payload = JSON.parse(row.payload_json || "{}"); } catch { continue; }
      if ((payload.kind || "accept") !== "accept") continue;
      out.push({ kind: "accept", anchors: payload.anchors || [] });
    }
    return out;
  } catch {
    return [];
  }
}

export async function loadPoisonLearnMemory(env) {
  const rec = await recollectLattice(env, { record_id: POISON_LEARN_RECORD_ID, depth: 256 });
  if (!rec.ok) return { ok: rec.ok === true, features: [], refuse: rec.refuse || null, tip: rec.tip || null };
  const features = [];
  for (const e of rec.stamps) {
    const p = e.payload || {};
    if (e.action === "POISON_LEARN" && p.feature_id) {
      features.push({
        feature_id: p.feature_id,
        content_sha256: p.content_sha256 || null,
        markers: p.markers || [],
        token_hashes: p.token_hashes || [],
      });
    }
  }
  return { ok: true, features, tip: rec.tip, law: HASHCHAIN_LEARN_LAW };
}

async function chainBoth(env, recordId, action, payload) {
  const global = await appendLedger(env, action, payload);
  if (isDocumentId(recordId)) await appendDocumentLedger(env, recordId, action, payload);
  return global;
}

export async function appendLearnStamp(env, { recordId, kind, sha256, features = null, anchors = [], possibility = null, extra = {} } = {}) {
  const payload = {
    schema: LEARN_SCHEMA,
    law: HASHCHAIN_LEARN_LAW,
    kind: kind || "accept",
    record_id: recordId || null,
    content_sha256: sha256 || null,
    anchors: (anchors || []).map((a) => ({
      date: a.date || a.event_date || null,
      place: a.place || a.place_name || null,
      lat: a.lat != null ? Number(a.lat) : null,
      lon: a.lon != null ? Number(a.lon) : null,
      event_id: a.event_id || null,
    })),
    features: features
      ? { feature_id: features.feature_id, markers: features.markers, token_hashes: features.token_hashes, body_retained: false }
      : null,
    possibility: possibility && possibility.possibility != null ? possibility.possibility : null,
    possibility_kind: POSSIBILITY_KIND,
    no_rewrite: true,
    author: "Aziel Eliab",
    ...extra,
  };
  return chainBoth(env, recordId, "LEARN", payload);
}

export async function appendPoisonLearn(env, { recordId = POISON_LEARN_RECORD_ID, sha256, title, filename, markers = [], extra = {} } = {}) {
  const features = poisonFeatureReceipt({ title, filename, sha256, markers });
  const payload = {
    ...features,
    law: HASHCHAIN_LEARN_LAW,
    record_id: recordId || POISON_LEARN_RECORD_ID,
    no_rewrite: true,
    ...extra,
  };
  await chainBoth(env, POISON_LEARN_RECORD_ID, "POISON_LEARN", payload);
  if (recordId && recordId !== POISON_LEARN_RECORD_ID && isDocumentId(recordId)) {
    await chainBoth(env, recordId, "POISON_LEARN", payload);
  }
  return { receipt: payload, feature_id: features.feature_id };
}

export function preflightStructureAndPoison({ title, body, filename, sha256, library, bytes, learned = [] } = {}) {
  const structure = bytes && (bytes.byteLength || bytes.length)
    ? verifyBytes(bytes, { filename })
    : verifyTextRecord({ title, body });
  const poison = poisonScan({ title, body, filename, library });
  const features = poisonFeatureReceipt({ title, filename, sha256: sha256 || structure.sha256, markers: poison.markers });
  const learnedHit = matchLearnedPoison(features, learned);
  let refuse = null;
  if (!structure.ok) refuse = "STRUCTURE_FAIL";
  else if (learnedHit.match) refuse = "POISON_LEARNED";
  return { structure, poison, features, learnedHit, refuse };
}

export async function preflightIngest(env, args) {
  let learned = [];
  try {
    const mem = await loadPoisonLearnMemory(env);
    if (mem.ok) learned = mem.features;
  } catch {
    learned = [];
  }
  return preflightStructureAndPoison({ ...args, learned });
}

function eventAnchors(events) {
  return (events || []).map((e) => ({
    event_id: e.event_id,
    date: e.event_date || e.date,
    place: e.place_name || e.place,
    lat: e.lat != null ? Number(e.lat) : null,
    lon: e.lon != null ? Number(e.lon) : null,
    confidence: e.confidence,
    source: e.source,
  }));
}

/**
 * Upload → pin: extract time×geo anchors, pin to Temporal Map / verify-geo lattice,
 * append MAP_PIN + LEARN + POSSIBILITY on the hashchain. Fail closed on structure/poison.
 */
export async function pinFromUpload(env, {
  recordId,
  structure,
  poison,
  sha256,
  library,
  learnStamps = [],
} = {}) {
  const q = poison && (poison.status === "QUARANTINE" || poison.suspected) && String(library || "") !== "aziel";
  if (!structure || !structure.ok) {
    const payload = {
      schema: MAP_PIN_SCHEMA,
      ok: false,
      refuse: "STRUCTURE_FAIL",
      record_id: recordId,
      content_sha256: sha256 || null,
      map4d: MAP4D_CITE,
      law: HASHCHAIN_LEARN_LAW,
    };
    await chainBoth(env, recordId, "MAP_PIN_REFUSED", payload);
    return { ok: false, refuse: "STRUCTURE_FAIL", pinned: 0, anchors: [], possibility: possibilityRefuse("STRUCTURE_FAIL"), sha256 };
  }
  if (q) {
    await appendPoisonLearn(env, { recordId, sha256, markers: (poison && poison.markers) || [] });
    const payload = {
      schema: MAP_PIN_SCHEMA,
      ok: false,
      refuse: "POISON_BLOCK",
      record_id: recordId,
      content_sha256: sha256 || null,
      map4d: MAP4D_CITE,
      law: HASHCHAIN_LEARN_LAW,
    };
    await chainBoth(env, recordId, "MAP_PIN_REFUSED", payload);
    return { ok: false, refuse: "POISON_BLOCK", pinned: 0, anchors: [], possibility: possibilityRefuse("POISON_BLOCK"), sha256 };
  }

  let pinned = 0;
  let events = [];
  try {
    const geo = await import("./geo.js");
    pinned = await geo.extractEventsForRecord(env, recordId);
    events = await geo.recordEvents(env, recordId);
  } catch {
    pinned = 0;
    events = [];
  }
  const anchors = eventAnchors(events);
  const stamps = (learnStamps && learnStamps.length)
    ? learnStamps
    : await loadLearnStamps(env, { excludeRecordId: recordId });
  const possibility = possibilityScore({
    anchors,
    learnStamps: stamps,
    latticeOk: true,
    poison: false,
    structureOk: true,
  });
  const pinPayload = {
    schema: MAP_PIN_SCHEMA,
    ok: true,
    record_id: recordId,
    content_sha256: sha256 || null,
    pinned,
    anchors,
    map4d: MAP4D_CITE,
    law: HASHCHAIN_LEARN_LAW,
    note: "Pins are paper date × event × geolocation. Never upload time.",
  };
  await chainBoth(env, recordId, "MAP_PIN", pinPayload);
  await appendLearnStamp(env, {
    recordId,
    kind: "accept",
    sha256,
    anchors,
    possibility,
  });
  await chainBoth(env, recordId, "POSSIBILITY_SCORE", {
    schema: POSSIBILITY_SCHEMA,
    record_id: recordId,
    content_sha256: sha256 || null,
    possibility: possibility.possibility,
    refuse: possibility.refuse,
    kind: POSSIBILITY_KIND,
    components: possibility.components || null,
    note: POSSIBILITY_NOTE,
    law: HASHCHAIN_LEARN_LAW,
    not_truth: true,
  });
  return { ok: true, refuse: null, pinned, anchors, possibility, sha256, map4d: MAP4D_CITE };
}

export function compactPossibility(p) {
  if (!p) return null;
  return {
    schema: POSSIBILITY_SCHEMA,
    kind: p.kind || POSSIBILITY_KIND,
    possibility: p.possibility == null ? null : p.possibility,
    refuse: p.refuse || null,
    unranked: true,
    not_truth: true,
    note: POSSIBILITY_NOTE,
  };
}

export function scoresFromReview(review) {
  const bayes = review && review.bayesian;
  const poss = review && review.possibility;
  return {
    bayesian: bayes
      ? { posterior: bayes.posterior, unranked: true, schema: bayes.schema || "aziel.bayesian.v1" }
      : null,
    possibility: compactPossibility(poss),
    law: HASHCHAIN_LEARN_LAW,
    note: "possibility ≠ probability. Neither is courtroom truth.",
  };
}

export function digestUtf8(text) {
  return createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}
