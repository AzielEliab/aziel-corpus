/**
 * Persist reviews, quarantine, peer notes, and lattice tips on the hash-chain.
 * Author: Aziel Eliab.
 */
import { randomBytes } from "node:crypto";
import { appendLedger, appendDocumentLedger, ensureLedger, hashPayload, isDocumentId } from "./ledger.js";
import { reviewDocument, triadComposite, collectionTriad } from "./review.js";
import { verifyBytes, verifyTextRecord, sha256hex } from "./structure.js";
import { latticeAnchorTip } from "./lattice.js";
import {
  applySuccessionForRecord,
  backfillSuccession,
  ensureSuccessionSchema,
  loadSuccessionCite,
  maybeBackfillSuccession,
  maybeRescoreZsolverOnFirstHandPatternBreak,
  rescoreSuccessionMembers,
  successionCoverageFor,
} from "./succession.js";
import {
  compactZsolverPublic,
  drainZsolverQueue,
  ensureZsolverSchema,
  parseZsolver,
  patchTipZsolver,
  scoreZsolverForRecord,
  zsolverIsLive,
  zsolverIsSettled,
} from "./zsolver.js";
import { HTML_CACHE_PREFIX, cachePutText, htmlCacheUrl, refreshPackedIndex } from "./library-index.js";

const CLCE_LIVE = "https://azclce-download-tracker.vibelock.workers.dev/v1/score";

/** One request must finish inside Worker CPU/time limits. Tip reconcile is cursor-paginated. */
export const SHELF_SYNC_CURSOR_KEY = "shelf_sync_cursor";
export const SHELF_SYNC_DONE_KEY = "shelf_sync_done_utc";
export const SHELF_SYNC_STATS_KEY = "shelf_sync_stats";
export const SHELF_SYNC_CHUNK = 25;
export const SHELF_SYNC_CHUNK_MAX = 50;
export const SHELF_SYNC_MS = 12000;
/** Rebuild HTTP path: tip chunk only. Packed refresh is deferred to waitUntil. */
export const SHELF_REBUILD_MS = 4000;

export async function ensureReviewSchema(env) {
  if (!env || !env.DB) return;
  await ensureLedger(env);
  for (const col of [
    "quarantine_status TEXT",
    "review_json TEXT",
    "bayesian_posterior REAL",
    "lattice_tip_json TEXT",
    "triad_combined REAL",
    "chain_tip TEXT",
    "chain_sequence INTEGER",
  ]) {
    try { await env.DB.prepare("ALTER TABLE records ADD COLUMN " + col).run(); } catch { /* exists */ }
  }
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS peer_reviews (review_id TEXT PRIMARY KEY, record_id TEXT NOT NULL, stance TEXT NOT NULL, body TEXT NOT NULL, created_by TEXT, created_utc TEXT NOT NULL, entry_hash TEXT)"
  ).run();
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS lattice_tips (tip_id TEXT PRIMARY KEY, record_id TEXT, tip_json TEXT NOT NULL, created_utc TEXT NOT NULL, ledger_entry_hash TEXT)"
  ).run();
  try { await ensureSuccessionSchema(env); } catch { /* succession optional */ }
  try { await ensureZsolverSchema(env); } catch { /* zsolver optional */ }
}

export async function maybeLiveClce(r, d, p) {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 2500);
    const res = await fetch(CLCE_LIVE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 AzielDigitalLibrary" },
      body: JSON.stringify({ r, d, p }),
      signal: ac.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const json = await res.json();
    if (json && typeof json.triple === "number") {
      return {
        engine: "CLCE",
        schema: json.schema || "az-clce.report.v0.2",
        triple: json.triple,
        pairwise: json.pairwise,
        pairwise_avg: json.pairwise_avg,
        plus: json.plus,
        band: json.band,
        primary: json.primary,
        types: json.types || [],
        kid_plain: json.kid_plain,
        advisory: true,
        limitation: json.limitation,
        threshold: json.threshold || 0.7,
        source: "azclce-live",
      };
    }
  } catch {
    /* local port is enough */
  }
  return null;
}

export function structureFromBytes(bytes, meta) {
  if (bytes && (bytes.byteLength || bytes.length)) return verifyBytes(bytes, meta);
  return verifyTextRecord({ title: meta && meta.title, body: meta && meta.body });
}

export async function runReviewBundle({ title, body, filename, contentType, sha256, author, library, bytes, liveClce = false, coverage } = {}) {
  const structure = structureFromBytes(bytes, { filename, contentType });
  const reality = [filename, sha256 || structure.sha256, structure.ok ? "structure verified" : "structure failed"].filter(Boolean).join(" ");
  let clce = null;
  if (liveClce) clce = await maybeLiveClce(title, body || title, reality);
  const review = reviewDocument({
    title,
    body,
    filename,
    sha256: sha256 || structure.sha256,
    author,
    library,
    structure,
    clce,
    coverage,
  });
  review.structure = {
    ok: structure.ok,
    files: structure.files,
    errors: structure.errors,
    sha256: structure.sha256,
    byte_size: structure.byte_size,
    kind: structure.kind,
  };
  if (!structure.ok) review.lights.structure = "FLAG";
  return { structure, review };
}

export async function persistReview(env, { recordId, library, sha256, title, createdBy, event, structure, review, zsolver }) {
  await ensureReviewSchema(env);
  const when = new Date().toISOString();
  const qStatus = review.quarantine_status || "CLEAR";
  const reviewJson = JSON.stringify(review);
  const posterior = review.bayesian && review.bayesian.posterior != null ? review.bayesian.posterior : null;
  const triad = review.triad || null;
  const combined = triad && triad.combined != null ? triad.combined : null;
  try {
    await env.DB.prepare(
      "UPDATE records SET quarantine_status=?, review_json=?, bayesian_posterior=?, triad_combined=? WHERE record_id=?"
    ).bind(qStatus, reviewJson, posterior, combined, recordId).run();
  } catch {
    try {
      await env.DB.prepare(
        "UPDATE records SET quarantine_status=?, review_json=?, bayesian_posterior=? WHERE record_id=?"
      ).bind(qStatus, reviewJson, posterior, recordId).run();
    } catch { /* schema */ }
  }

  async function chain(action, payload) {
    const global = await appendLedger(env, action, payload);
    if (isDocumentId(recordId)) await appendDocumentLedger(env, recordId, action, payload);
    return global;
  }

  const receipt = await chain("STRUCTURE_VERIFY", {
    record_id: recordId,
    library,
    sha256,
    event,
    ok: !!(structure && structure.ok),
    file_count: Array.isArray(structure && structure.files) ? structure.files.length : 0,
    errors: (structure && structure.errors) || [],
    created_by: createdBy || null,
  });

  await chain("REVIEW_SCORE", {
    record_id: recordId,
    library,
    sha256,
    event,
    spre_pc: review.spre && review.spre.pc,
    clce_triple: review.clce && review.clce.triple,
    plr_status: review.plr && review.plr.status,
    triad_combined: combined,
    triad_ready: !!(triad && triad.ready),
    bayesian_posterior: posterior,
    unranked: true,
    lights: review.lights,
    created_by: createdBy || null,
  });

  if (qStatus !== "CLEAR") {
    await chain("POISON_QUARANTINE", {
      record_id: recordId,
      library,
      sha256,
      status: qStatus,
      markers: review.poison && review.poison.markers,
      immutable: true,
      never_delete: true,
    });
  }

  let tip = null;
  let tipEntry = receipt;
  if (structure && structure.ok) {
    tip = latticeAnchorTip({
      record_id: recordId,
      library,
      content_sha256: sha256,
      ledger_entry_hash: receipt.entry_hash,
      structure,
      review,
      event,
      verified_utc: when,
      zsolver: compactZsolverPublic(zsolver),
    });
    tipEntry = await chain("LATTICE_ANCHOR", {
      record_id: recordId,
      library,
      sha256,
      schema: tip.schema,
      kind: tip.kind,
      carrier: tip.carrier,
      tip_sha256: hashPayload(tip),
      triad_combined: combined,
    });
    tip.ledger_entry_hash = tipEntry.entry_hash;
    const tipId = "AZTIP-" + randomBytes(6).toString("hex").toUpperCase();
    try {
      await env.DB.prepare(
        "INSERT INTO lattice_tips(tip_id,record_id,tip_json,created_utc,ledger_entry_hash) VALUES(?,?,?,?,?)"
      ).bind(tipId, recordId, JSON.stringify(tip), when, tipEntry.entry_hash).run();
      await env.DB.prepare("UPDATE records SET lattice_tip_json=? WHERE record_id=?").bind(JSON.stringify(tip), recordId).run();
    } catch { /* schema */ }
  }
  return { receipt, tip, quarantine_status: qStatus, review };
}

export async function reviewAndStore(env, args) {
  const bundle = await runReviewBundle({ ...args, liveClce: args.liveClce !== false, coverage: args.coverage });
  const stored = await persistReview(env, {
    recordId: args.recordId,
    library: args.library,
    sha256: args.sha256 || bundle.structure.sha256,
    title: args.title,
    createdBy: args.createdBy,
    event: args.event || "verified_ingest",
    structure: bundle.structure,
    review: bundle.review,
  });
  return { ...bundle, ...stored };
}

export async function parseReviewJson(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function loadRecordReview(env, row) {
  await ensureReviewSchema(env);
  const review = await parseReviewJson(row && row.review_json);
  let peers = [];
  try {
    peers = (await env.DB.prepare(
      "SELECT review_id, record_id, stance, body, created_by, created_utc, entry_hash FROM peer_reviews WHERE record_id=? ORDER BY created_utc ASC"
    ).bind(row.record_id).all()).results || [];
  } catch { peers = []; }
  let tip = await parseReviewJson(row && row.lattice_tip_json);
  if (!tip) {
    try {
      const trow = await env.DB.prepare(
        "SELECT tip_json FROM lattice_tips WHERE record_id=? ORDER BY created_utc DESC LIMIT 1"
      ).bind(row.record_id).first();
      tip = trow ? await parseReviewJson(trow.tip_json) : null;
    } catch { tip = null; }
  }
  let succession = null;
  try { succession = await loadSuccessionCite(env, row && row.record_id); } catch { succession = null; }
  let zsolver = parseZsolver(row && row.zsolver_json);
  if (!zsolver && row && row.record_id) {
    try {
      const zrow = await env.DB.prepare("SELECT zsolver_json FROM records WHERE record_id=?").bind(row.record_id).first();
      zsolver = parseZsolver(zrow && zrow.zsolver_json);
    } catch { zsolver = null; }
  }
  return { review, peers, tip, succession, zsolver, quarantine_status: (row && row.quarantine_status) || (review && review.quarantine_status) || "CLEAR" };
}

export async function addPeerReview(env, { recordId, stance, body, signed }) {
  if (!signed) {
    const err = new Error("login required");
    err.status = 401;
    throw err;
  }
  const note = String(body || "").trim();
  if (!note) {
    const err = new Error("review note required");
    err.status = 400;
    throw err;
  }
  const st = String(stance || "note").toLowerCase();
  if (!["endorse", "challenge", "note"].includes(st)) {
    const err = new Error("stance must be endorse, challenge, or note");
    err.status = 400;
    throw err;
  }
  await ensureReviewSchema(env);
  const row = await env.DB.prepare("SELECT record_id, library, content_sha256 FROM records WHERE record_id=?").bind(recordId).first();
  if (!row) {
    const err = new Error("not found");
    err.status = 404;
    throw err;
  }
  const who = signed.username || signed.user_id || "peer";
  const id = "AZPEER-" + randomBytes(6).toString("hex").toUpperCase();
  const payload = {
    record_id: recordId,
    library: row.library,
    sha256: row.content_sha256 || null,
    review_id: id,
    stance: st,
    body: note.slice(0, 4000),
    created_by: who,
  };
  const entry = await appendLedger(env, "PEER_REVIEW", payload);
  if (isDocumentId(recordId)) await appendDocumentLedger(env, recordId, "PEER_REVIEW", payload);
  await env.DB.prepare(
    "INSERT INTO peer_reviews(review_id,record_id,stance,body,created_by,created_utc,entry_hash) VALUES(?,?,?,?,?,?,?)"
  ).bind(id, recordId, st, note.slice(0, 4000), who, entry.timestamp_utc, entry.entry_hash).run();
  return { review_id: id, record_id: recordId, stance: st, entry_hash: entry.entry_hash, created_utc: entry.timestamp_utc };
}

export async function verifyDownloadBytes(env, { recordId, library, filename, contentType, bytes, createdBy, event }) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const sha = sha256hex(u8);
  return reviewAndStore(env, {
    recordId: recordId || "DOWNLOAD",
    library: library || "package",
    filename,
    contentType,
    sha256: sha,
    title: filename || "download",
    body: "",
    author: "Aziel Eliab",
    bytes: u8,
    createdBy,
    event: event || "download_verify",
    liveClce: false,
  });
}

export function isFullyScored(row, review) {
  const r = review || null;
  const triad = r && r.triad;
  const combined = row && row.triad_combined != null ? row.triad_combined : triad && triad.combined;
  return !!(
    r &&
    r.spre &&
    r.clce &&
    r.plr &&
    triad &&
    triad.ready &&
    combined != null
  );
}

export function storedTriadMatches(row, review, coverage) {
  if (!isFullyScored(row, review)) return false;
  const expected = collectionTriad(triadComposite({
    spre: review.spre,
    clce: review.clce,
    plr: review.plr,
  }), row && row.library, coverage);
  const stored = row && row.triad_combined != null ? Number(row.triad_combined) : review.triad && review.triad.combined;
  if (expected.combined == null || stored == null || !Number.isFinite(Number(stored))) return false;
  return Math.abs(Number(stored) - expected.combined) < 0.0002;
}

export async function backfillReviews(env, { limit = 25, force = false, recordId = null } = {}) {
  await ensureReviewSchema(env);
  const cap = Math.min(Math.max(Number(limit) || 25, 1), 50);
  let rows = [];
  if (recordId) {
    const row = await env.DB.prepare(
      "SELECT record_id, title, body, filename, content_type, object_key, library, author, content_sha256, created_by, review_json, triad_combined FROM records WHERE record_id=?"
    ).bind(String(recordId).trim()).first();
    if (row) rows = [row];
  } else {
    try {
      rows =
        (await env.DB.prepare(
          force
            ? "SELECT record_id, title, body, filename, content_type, object_key, library, author, content_sha256, created_by, review_json, triad_combined FROM records ORDER BY created_utc ASC LIMIT ?"
            : "SELECT record_id, title, body, filename, content_type, object_key, library, author, content_sha256, created_by, review_json, triad_combined FROM records WHERE library='aziel' OR review_json IS NULL OR review_json='' OR triad_combined IS NULL ORDER BY CASE WHEN review_json IS NULL OR review_json='' OR triad_combined IS NULL THEN 0 ELSE 1 END, created_utc ASC LIMIT ?"
        ).bind(cap).all()).results || [];
    } catch {
      rows =
        (await env.DB.prepare(
          "SELECT record_id, title, body, filename, content_type, object_key, library, author, content_sha256, created_by FROM records ORDER BY created_utc ASC LIMIT ?"
        ).bind(cap).all()).results || [];
    }
  }
  const results = [];
  let processed = 0;
  let skipped = 0;
  for (const row of rows) {
    try { await applySuccessionForRecord(env, row); } catch { /* match only when exact */ }
    const existing = await parseReviewJson(row.review_json);
    const coverage = await successionCoverageFor(env, row.record_id);
    if (!force && storedTriadMatches(row, existing, coverage)) {
      let zsolver = null;
      try { zsolver = await scoreZsolverForRecord(env, { ...row, body: row.body, title: row.title, filename: row.filename, subjects: row.subjects, keywords: row.keywords }); } catch { zsolver = null; }
      await maybeZsolverPatternBreakRescore(env, row);
      skipped += 1;
      results.push({ record_id: row.record_id, skipped: true, reason: "already fully scored", zsolver_status: zsolver && zsolver.status, zsolver_score: zsolver && zsolver.capped_confidence });
      continue;
    }
    let bytes = null;
    if (row.object_key && env.FILES) {
      try {
        const store = env.FILES;
        const obj = typeof store.head === "function" ? await store.get(row.object_key) : null;
        if (obj && obj.arrayBuffer) bytes = await obj.arrayBuffer();
        else if (obj && obj.body && typeof obj.body.arrayBuffer === "function") bytes = await obj.body.arrayBuffer();
        if (!bytes && typeof store.getWithMetadata === "function") {
          const res = await store.getWithMetadata(row.object_key, { type: "arrayBuffer" });
          if (res && res.value) bytes = res.value;
        }
      } catch {
        bytes = null;
      }
    }
    if (!bytes) bytes = new TextEncoder().encode(String(row.body || row.title || row.record_id));
    const stored = await reviewAndStore(env, {
      recordId: row.record_id,
      library: row.library,
      title: row.title,
      body: row.body,
      filename: row.filename,
      contentType: row.content_type,
      sha256: row.content_sha256,
      author: row.author,
      bytes,
      createdBy: "verify-backfill",
      event: "verify_backfill",
      liveClce: false,
      coverage,
    });
    try { await rescoreSuccessionMembers(env, row.record_id, { skip: row.record_id }); } catch { /* peers optional */ }
    let zsolver = null;
    try { zsolver = await scoreZsolverForRecord(env, { ...row, body: row.body, title: row.title, filename: row.filename }); } catch { zsolver = null; }
    await maybeZsolverPatternBreakRescore(env, row);
    processed += 1;
    results.push({
      record_id: row.record_id,
      skipped: false,
      triad_combined: stored.review && stored.review.triad ? stored.review.triad.combined : null,
      triad_display: stored.review && stored.review.triad ? stored.review.triad.display : null,
      quarantine_status: stored.quarantine_status,
      zsolver_status: zsolver && zsolver.status,
      zsolver_score: zsolver && zsolver.capped_confidence,
    });
  }
  return { ok: true, force: !!force, processed, skipped, results };
}

async function metaGet(env, key) {
  try {
    const row = await env.DB.prepare("SELECT value FROM metadata WHERE key=?").bind(key).first();
    return row && row.value != null ? String(row.value) : "";
  } catch { return ""; }
}

async function metaSet(env, key, value) {
  try {
    await env.DB.prepare("INSERT OR REPLACE INTO metadata(key,value) VALUES(?,?)").bind(key, String(value == null ? "" : value)).run();
  } catch { /* optional */ }
}

async function countRecords(env) {
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM records").first();
    return Number(row && row.n) || 0;
  } catch { return 0; }
}

export async function backfillOneRecord(env, row, { force = false } = {}) {
  const existing = await parseReviewJson(row.review_json);
  try { await applySuccessionForRecord(env, row); } catch { /* exact match only */ }
  const coverage = await successionCoverageFor(env, row.record_id);
  const triadOk = !force && storedTriadMatches(row, existing, coverage);
  let triad = existing && existing.triad ? existing.triad : null;
  if (triadOk) {
    let zsolver = null;
    try {
      zsolver = await scoreZsolverForRecord(env, {
        record_id: row.record_id,
        title: row.title,
        body: row.body,
        filename: row.filename,
        subjects: row.subjects,
        keywords: row.keywords,
        zsolver_json: row.zsolver_json,
      }, { force: false });
    } catch { zsolver = parseZsolver(row.zsolver_json); }
    await maybeZsolverPatternBreakRescore(env, row);
    return {
      record_id: row.record_id,
      skipped: true,
      triad_combined: triad && triad.combined,
      zsolver_score: zsolver && zsolver.capped_confidence,
      zsolver_status: zsolver && zsolver.status,
    };
  }
  if (!triadOk) {
    let bytes = null;
    if (row.object_key && env.FILES) {
      try {
        const store = env.FILES;
        const obj = typeof store.get === "function" ? await store.get(row.object_key) : null;
        if (obj && obj.arrayBuffer) bytes = await obj.arrayBuffer();
        else if (obj && obj.body && typeof obj.body.arrayBuffer === "function") bytes = await obj.body.arrayBuffer();
      } catch { bytes = null; }
    }
    if (!bytes) bytes = new TextEncoder().encode(String(row.body || row.title || row.record_id));
    const stored = await reviewAndStore(env, {
      recordId: row.record_id,
      library: row.library,
      title: row.title,
      body: row.body,
      filename: row.filename,
      contentType: row.content_type,
      sha256: row.content_sha256,
      author: row.author,
      bytes,
      createdBy: "full-backfill",
      event: "full_backfill",
      liveClce: false,
      coverage,
    });
    triad = stored.review && stored.review.triad;
    try { await rescoreSuccessionMembers(env, row.record_id, { skip: row.record_id }); } catch { /* */ }
  }
  let zsolver = null;
  try {
    zsolver = await scoreZsolverForRecord(env, {
      record_id: row.record_id,
      title: row.title,
      body: row.body,
      filename: row.filename,
      subjects: row.subjects,
      keywords: row.keywords,
      zsolver_json: row.zsolver_json,
    }, { force });
  } catch { zsolver = null; }
  await maybeZsolverPatternBreakRescore(env, row);
  const zOk = zsolverIsSettled(zsolver) || zsolverIsLive(zsolver);
  return {
    record_id: row.record_id,
    skipped: !!(triadOk && zOk),
    triad_combined: triad && triad.combined,
    zsolver_score: zsolver && zsolver.capped_confidence,
    zsolver_status: zsolver && zsolver.status,
  };
}

export async function continueFullBackfill(env, { ms = 18000, force = false, all = false, background = false } = {}) {
  await ensureReviewSchema(env);
  const started = Date.now();
  const total = await countRecords(env);
  const stats = { ok: true, total, scored: 0, skipped: 0, failed: 0, succession_linked: 0, zsolver_queue: null, done: false, cursor: "" };
  try {
    const succ = await maybeBackfillSuccession(env);
    if (succ && succ.linked != null) stats.succession_linked = succ.linked;
    else if (succ && succ.skipped && !force) {
      /* already ran */
    } else {
      const again = await backfillSuccession(env);
      stats.succession_linked = again && again.linked != null ? again.linked : 0;
    }
  } catch { /* succession best-effort */ }
  try { stats.zsolver_queue = await drainZsolverQueue(env, { limit: background ? 2 : 15 }); } catch { /* */ }
  let cursor = await metaGet(env, "full_backfill_cursor");
  const doneFlag = await metaGet(env, "full_backfill_done_utc");
  if (doneFlag && !force && !all) {
    stats.done = true;
    stats.cursor = cursor;
    const shelfDone = await metaGet(env, SHELF_SYNC_DONE_KEY);
    if (!shelfDone) {
      try {
        stats.shelf = await syncShelfScores(env, {
          reconcile: true,
          resume: true,
          refreshPacked: !background,
          ms: background ? SHELF_REBUILD_MS : SHELF_SYNC_MS,
        });
      } catch { stats.shelf = null; }
    } else {
      stats.shelf = { ok: true, done: true, skipped: true, author: "Aziel Eliab" };
    }
    return stats;
  }
  if (force) {
    cursor = "";
    await metaSet(env, "full_backfill_done_utc", "");
  }
  while (all || Date.now() - started < ms) {
    let batch = [];
    try {
      if (cursor) {
        batch = (await env.DB.prepare(
          "SELECT record_id, title, body, filename, content_type, object_key, library, author, content_sha256, created_by, review_json, triad_combined, subjects, keywords, zsolver_json FROM records WHERE record_id>? ORDER BY record_id ASC LIMIT 8"
        ).bind(cursor).all()).results || [];
      } else {
        batch = (await env.DB.prepare(
          "SELECT record_id, title, body, filename, content_type, object_key, library, author, content_sha256, created_by, review_json, triad_combined, subjects, keywords, zsolver_json FROM records ORDER BY record_id ASC LIMIT 8"
        ).all()).results || [];
      }
    } catch {
      try {
        batch = (await env.DB.prepare(
          cursor
            ? "SELECT record_id, title, body, filename, content_type, object_key, library, author, content_sha256, created_by, review_json, triad_combined FROM records WHERE record_id>? ORDER BY record_id ASC LIMIT 8"
            : "SELECT record_id, title, body, filename, content_type, object_key, library, author, content_sha256, created_by, review_json, triad_combined FROM records ORDER BY record_id ASC LIMIT 8"
        ).bind(...(cursor ? [cursor] : [])).all()).results || [];
      } catch { batch = []; }
    }
    if (!batch.length) {
      stats.done = true;
      await metaSet(env, "full_backfill_done_utc", new Date().toISOString());
      await metaSet(env, "full_backfill_cursor", "");
      await metaSet(env, "full_backfill_stats", JSON.stringify(stats));
      break;
    }
    for (const row of batch) {
      try {
        const one = await backfillOneRecord(env, row, { force });
        if (one.skipped) stats.skipped += 1;
        else stats.scored += 1;
      } catch {
        stats.failed += 1;
      }
      cursor = row.record_id;
      stats.cursor = cursor;
      if (!all && Date.now() - started >= ms) break;
    }
    await metaSet(env, "full_backfill_cursor", cursor);
    await metaSet(env, "full_backfill_stats", JSON.stringify({ ...stats, updated_utc: new Date().toISOString() }));
    if (!all && Date.now() - started >= ms) break;
  }
  try {
    // Packed refresh only after a scoring walk. Full tip reconcile is chunked via rebuild=1
    // (or the done:true path above) so one request cannot exceed Worker CPU/time limits.
    stats.shelf = await syncShelfScores(env, {
      reconcile: !!stats.done,
      resume: true,
      refreshPacked: !background,
    });
  } catch { stats.shelf = null; }
  return stats;
}

export async function fullBackfillStatus(env) {
  const total = await countRecords(env);
  const done = await metaGet(env, "full_backfill_done_utc");
  const cursor = await metaGet(env, "full_backfill_cursor");
  const shelfDone = await metaGet(env, SHELF_SYNC_DONE_KEY);
  const shelfCursor = await metaGet(env, SHELF_SYNC_CURSOR_KEY);
  let stats = null;
  try { stats = JSON.parse(await metaGet(env, "full_backfill_stats") || "null"); } catch { stats = null; }
  let shelf_stats = null;
  try { shelf_stats = JSON.parse(await metaGet(env, SHELF_SYNC_STATS_KEY) || "null"); } catch { shelf_stats = null; }
  return {
    ok: true,
    total,
    done: !!done,
    done_utc: done || null,
    cursor: cursor || "",
    stats,
    shelf: {
      done: !!shelfDone,
      done_utc: shelfDone || null,
      cursor: shelfCursor || "",
      next_cursor: shelfDone ? "" : (shelfCursor || ""),
      stats: shelf_stats,
    },
  };
}

export { sha256hex };

async function invalidatePublicHtmlCache(cache) {
  const paths = ["/", "/aziel-library", "/corpus", "/?lib=aziel", "/?lib=corpus"];
  for (const path of paths) {
    try {
      const url = htmlCacheUrl(new Request("https://www.azielcorpuslibrary.net" + path));
      const req = new Request(url, { method: "GET" });
      if (cache && typeof cache.delete === "function") {
        try {
          await cache.delete(req);
          continue;
        } catch { /* fall through to empty put */ }
      }
      await cachePutText(url, "", cache, { cacheControl: "no-store" });
    } catch { /* cache optional */ }
  }
  return { busted: paths, prefix: HTML_CACHE_PREFIX };
}

/** Packed library:index:v1 + homepage HTML cache. Safe for ctx.waitUntil after rebuild JSON. */
export async function refreshPackedShelf(env, cache) {
  const stats = { packed: 0, html_cache: null, index_sha256: "" };
  try {
    const packed = await refreshPackedIndex(env, { cache });
    stats.packed = packed && Array.isArray(packed.records) ? packed.records.length : 0;
    stats.index_sha256 = (packed && packed.index_sha256) || "";
  } catch { /* packed optional */ }
  try { stats.html_cache = await invalidatePublicHtmlCache(cache); } catch { stats.html_cache = null; }
  return stats;
}

function clampShelfChunk(limit) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return SHELF_SYNC_CHUNK;
  return Math.min(Math.max(Math.floor(n), 1), SHELF_SYNC_CHUNK_MAX);
}

async function loadShelfSyncBatch(env, cursor, cap) {
  if (!env || !env.DB) return [];
  const hidden = "IFNULL(shelf_hidden,0) = 0";
  const cols = "record_id, title, filename, subjects, keywords, domain, zsolver_json, triad_combined, lattice_tip_json";
  const lite = "record_id, title, filename, subjects, keywords, domain, zsolver_json, triad_combined";
  try {
    if (cursor) {
      return (await env.DB.prepare(
        "SELECT " + cols + " FROM records WHERE " + hidden + " AND record_id>? ORDER BY record_id ASC LIMIT ?"
      ).bind(cursor, cap).all()).results || [];
    }
    return (await env.DB.prepare(
      "SELECT " + cols + " FROM records WHERE " + hidden + " ORDER BY record_id ASC LIMIT ?"
    ).bind(cap).all()).results || [];
  } catch {
    try {
      if (cursor) {
        return (await env.DB.prepare(
          "SELECT " + lite + " FROM records WHERE record_id>? ORDER BY record_id ASC LIMIT ?"
        ).bind(cursor, cap).all()).results || [];
      }
      return (await env.DB.prepare(
        "SELECT " + lite + " FROM records ORDER BY record_id ASC LIMIT ?"
      ).bind(cap).all()).results || [];
    } catch { return []; }
  }
}

/**
 * Copy already-scored zsolver onto tip + packed library:index:v1 so homepage/search
 * show the same numbers as /v1/review. Does not require the live zsolver API.
 *
 * Tip reconcile is cursor-paginated. One request processes at most `limit` rows
 * (default 25) or until `ms` elapses. Packed shelf is rebuilt from stored D1
 * scores after every chunk so homepage pending-backfill clears for already-scored
 * docs without waiting for every tip.
 */
export async function syncShelfScores(env, {
  reconcile = true,
  cursor,
  limit = SHELF_SYNC_CHUNK,
  all = false,
  force = false,
  resume = true,
  refreshPacked = true,
  ms = SHELF_SYNC_MS,
  cache,
} = {}) {
  await ensureReviewSchema(env);
  const started = Date.now();
  const cap = clampShelfChunk(limit);
  const total = await countRecords(env);
  const explicitCursor = cursor != null && String(cursor) !== "";
  let pos = explicitCursor ? String(cursor) : "";
  if (!explicitCursor && !force && resume) {
    pos = await metaGet(env, SHELF_SYNC_CURSOR_KEY);
  }
  const priorDone = await metaGet(env, SHELF_SYNC_DONE_KEY);
  const stats = {
    ok: true,
    records: 0,
    tips: 0,
    packed: 0,
    processed: 0,
    total,
    cursor: pos || "",
    next_cursor: "",
    done: false,
    html_cache: null,
    author: "Aziel Eliab",
  };

  if (reconcile && priorDone && !force && !explicitCursor && !all && resume) {
    stats.done = true;
    stats.next_cursor = "";
    if (refreshPacked) {
      const packed = await refreshPackedShelf(env, cache);
      stats.packed = packed.packed;
      stats.index_sha256 = packed.index_sha256;
      stats.html_cache = packed.html_cache;
    }
    return stats;
  }

  if (force) {
    pos = explicitCursor ? String(cursor) : "";
    await metaSet(env, SHELF_SYNC_DONE_KEY, "");
    if (!explicitCursor) await metaSet(env, SHELF_SYNC_CURSOR_KEY, "");
  }

  if (reconcile && env && env.DB) {
    while (true) {
      const batch = await loadShelfSyncBatch(env, pos, cap);
      if (!batch.length) {
        stats.done = true;
        stats.next_cursor = "";
        await metaSet(env, SHELF_SYNC_DONE_KEY, new Date().toISOString());
        await metaSet(env, SHELF_SYNC_CURSOR_KEY, "");
        break;
      }
      let batchComplete = true;
      for (const row of batch) {
        try {
          const report = await scoreZsolverForRecord(env, row, { reconcileOnly: true });
          if (report) stats.tips += 1;
        } catch { /* one record */ }
        pos = row.record_id;
        stats.processed += 1;
        stats.records = stats.processed;
        stats.cursor = pos;
        stats.next_cursor = pos;
        if (!all && Date.now() - started >= ms) {
          batchComplete = false;
          break;
        }
      }
      if (batchComplete && batch.length < cap) {
        stats.done = true;
        stats.next_cursor = "";
        await metaSet(env, SHELF_SYNC_DONE_KEY, new Date().toISOString());
        await metaSet(env, SHELF_SYNC_CURSOR_KEY, "");
        break;
      }
      await metaSet(env, SHELF_SYNC_CURSOR_KEY, pos);
      await metaSet(env, SHELF_SYNC_DONE_KEY, "");
      if (!all) break;
      if (Date.now() - started >= ms) break;
    }
  } else {
    stats.done = !!(priorDone && !force);
  }

  if (refreshPacked) {
    const packed = await refreshPackedShelf(env, cache);
    stats.packed = packed.packed;
    stats.index_sha256 = packed.index_sha256;
    stats.html_cache = packed.html_cache;
  }
  await metaSet(env, SHELF_SYNC_STATS_KEY, JSON.stringify({
    processed: stats.processed,
    tips: stats.tips,
    packed: stats.packed,
    done: stats.done,
    cursor: stats.next_cursor || stats.cursor || "",
    updated_utc: new Date().toISOString(),
  }));
  return stats;
}

async function maybeZsolverPatternBreakRescore(env, row) {
  try {
    const cite = await loadSuccessionCite(env, row && row.record_id);
    await maybeRescoreZsolverOnFirstHandPatternBreak(env, {
      record_id: row.record_id,
      title: row.title,
      body: row.body,
      filename: row.filename,
      subjects: row.subjects,
      keywords: row.keywords,
      zsolver_json: row.zsolver_json,
    }, cite);
  } catch { /* first-hand pattern-break optional */ }
}
