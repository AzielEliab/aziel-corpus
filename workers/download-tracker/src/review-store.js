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
  rescoreSuccessionMembers,
  successionCoverageFor,
} from "./succession.js";
import { drainZsolverQueue, ensureZsolverSchema, parseZsolver, scoreZsolverForRecord, zsolverIsLive } from "./zsolver.js";

const CLCE_LIVE = "https://azclce-download-tracker.vibelock.workers.dev/v1/score";

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

export async function persistReview(env, { recordId, library, sha256, title, createdBy, event, structure, review }) {
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
  const zOk = zsolverIsLive(zsolver);
  return {
    record_id: row.record_id,
    skipped: !!(triadOk && zOk),
    triad_combined: triad && triad.combined,
    zsolver_score: zsolver && zsolver.capped_confidence,
    zsolver_status: zsolver && zsolver.status,
  };
}

export async function continueFullBackfill(env, { ms = 18000, force = false, all = false } = {}) {
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
  try { stats.zsolver_queue = await drainZsolverQueue(env, { limit: 15 }); } catch { /* */ }
  let cursor = await metaGet(env, "full_backfill_cursor");
  const doneFlag = await metaGet(env, "full_backfill_done_utc");
  if (doneFlag && !force && !all) {
    stats.done = true;
    stats.cursor = cursor;
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
  return stats;
}

export async function fullBackfillStatus(env) {
  const total = await countRecords(env);
  const done = await metaGet(env, "full_backfill_done_utc");
  const cursor = await metaGet(env, "full_backfill_cursor");
  let stats = null;
  try { stats = JSON.parse(await metaGet(env, "full_backfill_stats") || "null"); } catch { stats = null; }
  return { ok: true, total, done: !!done, done_utc: done || null, cursor: cursor || "", stats };
}

export { sha256hex };
