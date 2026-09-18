/**
 * Recompute content_sha256 from the exact bytes GET /file serves.
 * Updates D1 + packed library:index:v1. Append-only JSON discovery tip.
 * Never rewrites original file bytes.
 * Author: Aziel Eliab.
 */
import { appendDocumentLedger, appendLedger, ensureLedger } from "./ledger.js";
import { digestBytes, loadServedFileBytes, normalizeContentHash } from "./library.js";
import { persistHashRepairDiscovery } from "./record-metadata.js";
import { patchPackedRecordSha, refreshPackedIndex } from "./library-index.js";

export const HASH_REPAIR_ACTION = "HASH_REPAIR";
export const HASH_UNVERIFIED_ACTION = "HASH_UNVERIFIED";
export const HASH_REPAIR_CURSOR_KEY = "content_hash_repair_cursor";
export const HASH_REPAIR_DONE_KEY = "content_hash_repair_done_utc";
export const HASH_REPAIR_STATS_KEY = "content_hash_repair_stats";
export const HASH_REPAIR_CHUNK = 8;

/** Live mismatches confirmed 2026-09-18 on www.azielcorpuslibrary.net. */
export const KNOWN_HASH_MISMATCH_IDS = Object.freeze([
  "AZDOC-00908C2A2E0A",
  "AZDOC-697F4E1D8C34",
  "AZDOC-C2B6A81A5A0B",
  "AZDOC-3673C06729C4",
  "AZDOC-B3A18F2CB097",
  "AZDOC-C6D76CC9D65C",
  "AZDOC-498664EBE53C",
  "AZDOC-57CA385CE98A",
  "AZDOC-213C0E8052F3",
]);

async function metaGet(env, key) {
  if (!env || !env.DB || !key) return "";
  try {
    const row = await env.DB.prepare("SELECT value FROM metadata WHERE key=?").bind(key).first();
    return row && row.value != null ? String(row.value) : "";
  } catch {
    return "";
  }
}

async function metaSet(env, key, value) {
  if (!env || !env.DB || !key) return;
  try {
    await env.DB.prepare("INSERT OR REPLACE INTO metadata(key,value) VALUES(?,?)").bind(key, String(value == null ? "" : value)).run();
  } catch { /* schema */ }
}

async function countRecords(env) {
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM records").first();
    return Number(row && row.n) || 0;
  } catch {
    return 0;
  }
}

async function loadRepairRow(env, recordId) {
  try {
    return await env.DB.prepare(
      "SELECT record_id, title, body, filename, content_type, object_key, byte_size, library, author, content_sha256, quarantine_status FROM records WHERE record_id=?"
    ).bind(recordId).first();
  } catch {
    try {
      return await env.DB.prepare(
        "SELECT record_id, title, body, filename, content_type, object_key, byte_size, library, author, content_sha256 FROM records WHERE record_id=?"
      ).bind(recordId).first();
    } catch {
      return null;
    }
  }
}

export async function inspectRecordContentHash(env, row) {
  const recordId = String((row && row.record_id) || "").trim();
  const stored = normalizeContentHash(row && row.content_sha256);
  let bytes = null;
  try {
    bytes = await loadServedFileBytes(env, row);
  } catch {
    bytes = null;
  }
  if (!bytes) {
    return {
      ok: false,
      record_id: recordId,
      stored_sha256: stored || null,
      live_sha256: null,
      match: false,
      unverified: true,
      byte_size: 0,
      object_key: (row && row.object_key) || null,
      error: row && row.object_key ? "stored file unreadable" : "no served bytes",
    };
  }
  const live = digestBytes(bytes);
  return {
    ok: true,
    record_id: recordId,
    stored_sha256: stored || null,
    live_sha256: live,
    match: !!(stored && stored === live),
    unverified: false,
    byte_size: bytes.byteLength,
    object_key: (row && row.object_key) || null,
  };
}

async function flagUnverified(env, row, check) {
  const payload = {
    record_id: row.record_id,
    library: row.library || null,
    stored_sha256: check.stored_sha256,
    object_key: row.object_key || null,
    error: check.error || "unverified",
    no_rewrite_bytes: true,
  };
  try { await appendLedger(env, HASH_UNVERIFIED_ACTION, payload); } catch { /* optional */ }
  try { await appendDocumentLedger(env, row.record_id, HASH_UNVERIFIED_ACTION, payload); } catch { /* optional */ }
  try {
    await env.DB.prepare(
      "UPDATE records SET quarantine_status=? WHERE record_id=? AND (quarantine_status IS NULL OR quarantine_status='' OR UPPER(quarantine_status)='CLEAR')"
    ).bind("HASH_UNVERIFIED", row.record_id).run();
  } catch { /* schema or already flagged */ }
  try {
    await persistHashRepairDiscovery(env, {
      record_id: row.record_id,
      content_sha256: check.stored_sha256,
      previous_content_sha256: check.stored_sha256,
      unverified: true,
    });
  } catch { /* sidecar optional */ }
}

async function applyHashRepair(env, row, check) {
  await ensureLedger(env);
  const previous = check.stored_sha256 || null;
  const live = check.live_sha256;
  try {
    await env.DB.prepare("UPDATE records SET content_sha256=? WHERE record_id=?").bind(live, row.record_id).run();
  } catch (err) {
    const e = new Error(err && err.message ? err.message : "content_sha256 update failed");
    e.status = 500;
    throw e;
  }
  const payload = {
    record_id: row.record_id,
    library: row.library || null,
    previous_content_sha256: previous,
    content_sha256: live,
    byte_size: check.byte_size,
    object_key: row.object_key || null,
    no_rewrite_bytes: true,
  };
  try { await appendLedger(env, HASH_REPAIR_ACTION, payload); } catch { /* optional */ }
  try { await appendDocumentLedger(env, row.record_id, HASH_REPAIR_ACTION, payload); } catch { /* paper chain append-only */ }
  try {
    await persistHashRepairDiscovery(env, {
      record_id: row.record_id,
      content_sha256: live,
      previous_content_sha256: previous,
      byte_size: check.byte_size,
    });
  } catch { /* sidecar optional */ }
  try {
    await patchPackedRecordSha(env, row.record_id, live);
  } catch { /* packed optional; refresh at chunk end */ }
}

export async function repairRecordContentHash(env, row, { apply = false } = {}) {
  const check = await inspectRecordContentHash(env, row);
  if (check.unverified) {
    if (apply) await flagUnverified(env, row, check);
    return { ...check, repaired: false, flagged: !!apply };
  }
  if (check.match) return { ...check, repaired: false, flagged: false };
  if (!apply) return { ...check, repaired: false, flagged: false };
  await applyHashRepair(env, row, check);
  return { ...check, repaired: true, flagged: false };
}

async function loadBatch(env, cursor, limit) {
  const lim = Math.min(Math.max(Number(limit) || HASH_REPAIR_CHUNK, 1), 25);
  try {
    if (cursor) {
      return (await env.DB.prepare(
        "SELECT record_id, title, body, filename, content_type, object_key, byte_size, library, author, content_sha256, quarantine_status FROM records WHERE record_id>? ORDER BY record_id ASC LIMIT ?"
      ).bind(cursor, lim).all()).results || [];
    }
    return (await env.DB.prepare(
      "SELECT record_id, title, body, filename, content_type, object_key, byte_size, library, author, content_sha256, quarantine_status FROM records ORDER BY record_id ASC LIMIT ?"
    ).bind(lim).all()).results || [];
  } catch {
    try {
      if (cursor) {
        return (await env.DB.prepare(
          "SELECT record_id, title, body, filename, content_type, object_key, byte_size, library, author, content_sha256 FROM records WHERE record_id>? ORDER BY record_id ASC LIMIT ?"
        ).bind(cursor, lim).all()).results || [];
      }
      return (await env.DB.prepare(
        "SELECT record_id, title, body, filename, content_type, object_key, byte_size, library, author, content_sha256 FROM records ORDER BY record_id ASC LIMIT ?"
      ).bind(lim).all()).results || [];
    } catch {
      return [];
    }
  }
}

function parseRecordIds(value) {
  if (Array.isArray(value)) {
    return value.map((id) => {
      if (id && typeof id === "object") return String(id.record_id || id.id || "").trim();
      return String(id || "").trim();
    }).filter(Boolean);
  }
  return String(value || "").split(/[\s,]+/).map((id) => id.trim()).filter(Boolean);
}

async function repairIdList(env, ids, { apply = false, refreshPacked = true } = {}) {
  const stats = {
    ok: true,
    apply: !!apply,
    total: ids.length,
    checked: 0,
    matched: 0,
    mismatched: 0,
    repaired: 0,
    unverified: 0,
    flagged: 0,
    failed: 0,
    done: true,
    cursor: "",
    mismatches: [],
    record_ids: ids.slice(),
  };
  for (const recordId of ids) {
    const row = await loadRepairRow(env, recordId);
    if (!row) {
      stats.failed += 1;
      stats.mismatches.push({ ok: false, record_id: recordId, error: "not found", unverified: true });
      continue;
    }
    try {
      const one = await repairRecordContentHash(env, row, { apply });
      stats.checked += 1;
      if (one.unverified) {
        stats.unverified += 1;
        if (one.flagged) stats.flagged += 1;
      } else if (one.match) {
        stats.matched += 1;
      } else {
        stats.mismatched += 1;
        stats.mismatches.push(one);
        if (one.repaired) stats.repaired += 1;
      }
    } catch {
      stats.failed += 1;
    }
  }
  if (refreshPacked && apply && stats.repaired) {
    try { await refreshPackedIndex(env); } catch { /* packed */ }
  }
  return stats;
}

export async function continueContentHashRepair(env, {
  apply = false,
  all = false,
  force = false,
  recordId = null,
  recordIds = null,
  known = false,
  ms = 8000,
  refreshPacked = true,
} = {}) {
  const started = Date.now();
  const listed = known ? KNOWN_HASH_MISMATCH_IDS.slice() : parseRecordIds(recordIds || recordId);
  if (listed.length) {
    return repairIdList(env, listed, { apply, refreshPacked });
  }
  const total = await countRecords(env);
  const stats = {
    ok: true,
    apply: !!apply,
    total,
    checked: 0,
    matched: 0,
    mismatched: 0,
    repaired: 0,
    unverified: 0,
    flagged: 0,
    failed: 0,
    done: false,
    cursor: "",
    mismatches: [],
  };
  let cursor = await metaGet(env, HASH_REPAIR_CURSOR_KEY);
  const doneFlag = await metaGet(env, HASH_REPAIR_DONE_KEY);
  if (doneFlag && !force && !all) {
    stats.done = true;
    stats.cursor = cursor;
    return stats;
  }
  if (force) {
    cursor = "";
    await metaSet(env, HASH_REPAIR_DONE_KEY, "");
  }
  while (all || Date.now() - started < ms) {
    const batch = await loadBatch(env, cursor, HASH_REPAIR_CHUNK);
    if (!batch.length) {
      stats.done = true;
      await metaSet(env, HASH_REPAIR_DONE_KEY, new Date().toISOString());
      await metaSet(env, HASH_REPAIR_CURSOR_KEY, "");
      await metaSet(env, HASH_REPAIR_STATS_KEY, JSON.stringify(stats));
      break;
    }
    for (const row of batch) {
      try {
        const one = await repairRecordContentHash(env, row, { apply });
        stats.checked += 1;
        if (one.unverified) {
          stats.unverified += 1;
          if (one.flagged) stats.flagged += 1;
        } else if (one.match) {
          stats.matched += 1;
        } else {
          stats.mismatched += 1;
          if (stats.mismatches.length < 25) stats.mismatches.push(one);
          if (one.repaired) stats.repaired += 1;
        }
      } catch {
        stats.failed += 1;
      }
      cursor = row.record_id;
      stats.cursor = cursor;
      if (!all && Date.now() - started >= ms) break;
    }
    await metaSet(env, HASH_REPAIR_CURSOR_KEY, cursor);
    await metaSet(env, HASH_REPAIR_STATS_KEY, JSON.stringify({ ...stats, updated_utc: new Date().toISOString() }));
    if (!all && Date.now() - started >= ms) break;
  }
  if (refreshPacked && apply && stats.repaired) {
    try { await refreshPackedIndex(env); } catch { /* packed */ }
  }
  return stats;
}

export async function contentHashRepairStatus(env) {
  const total = await countRecords(env);
  let stats = null;
  try { stats = JSON.parse((await metaGet(env, HASH_REPAIR_STATS_KEY)) || "null"); } catch { stats = null; }
  return {
    ok: true,
    total,
    cursor: await metaGet(env, HASH_REPAIR_CURSOR_KEY),
    done_utc: await metaGet(env, HASH_REPAIR_DONE_KEY),
    stats,
    how: "GET /v1/content-hash-repair (dry-run). ?known=1 repairs the 9 confirmed live AZDOCs. ?apply=1 is operator-only and updates content_sha256 from served file bytes without rewriting those bytes. ?all=1 walks remaining. ?force=1 restarts. ?status=1 progress. ?record_id=AZDOC-… one record. Append-only JSON_HASH_REPAIR tip. Packed library:index:v1 is patched then refreshed.",
    known_ids: KNOWN_HASH_MISMATCH_IDS,
  };
}

/** Cron / CI sample: compare stored hashes to live served bytes. Does not apply. */
export async function sampleContentHashIntegrity(env, { limit = 8 } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 8, 1), 25);
  let rows = [];
  try {
    rows = (await env.DB.prepare(
      "SELECT record_id, title, body, filename, content_type, object_key, byte_size, library, author, content_sha256 FROM records ORDER BY created_utc DESC LIMIT ?"
    ).bind(lim).all()).results || [];
  } catch {
    try {
      rows = (await env.DB.prepare(
        "SELECT record_id, title, body, filename, content_type, object_key, byte_size, library, author, content_sha256 FROM records LIMIT ?"
      ).bind(lim).all()).results || [];
    } catch { rows = []; }
  }
  const sample = [];
  let matched = 0;
  let mismatched = 0;
  let unverified = 0;
  for (const row of rows) {
    const one = await inspectRecordContentHash(env, row);
    sample.push(one);
    if (one.unverified) unverified += 1;
    else if (one.match) matched += 1;
    else mismatched += 1;
  }
  const report = {
    ok: mismatched === 0 && unverified === 0,
    sampled: sample.length,
    matched,
    mismatched,
    unverified,
    sample,
    checked_utc: new Date().toISOString(),
  };
  try {
    await metaSet(env, "content_hash_integrity_sample", JSON.stringify(report));
  } catch { /* optional */ }
  return report;
}
