/**
 * Append-only hash-chain ledger matching aziel_library/core.py _ledger.
 * Author: Aziel Eliab.
 */
import { createHash } from "node:crypto";

const ZERO = "0".repeat(64);

export function canonicalJson(value) {
  if (value === null || value === undefined) return "null";
  const t = typeof value;
  if (t === "number") {
    if (!Number.isFinite(value)) return "null";
    return JSON.stringify(value);
  }
  if (t === "boolean") return value ? "true" : "false";
  if (t === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (t === "object") {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k])).join(",") + "}";
  }
  return JSON.stringify(String(value));
}

export function sha256hex(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

export function hashPayload(obj) {
  return sha256hex(canonicalJson(obj));
}

export async function ensureLedger(env) {
  if (!env || !env.DB) return;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS ledger (sequence INTEGER PRIMARY KEY, timestamp_utc TEXT NOT NULL, action TEXT NOT NULL, payload_json TEXT NOT NULL, previous_hash TEXT NOT NULL, entry_hash TEXT NOT NULL)"
  ).run();
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS derived_artifacts (derived_id TEXT PRIMARY KEY, record_id TEXT, artifact_type TEXT, processor TEXT, processor_version TEXT, content_sha256 TEXT, created_utc TEXT, status TEXT, object_key TEXT, note TEXT)"
  ).run();
  try { await env.DB.prepare("ALTER TABLE derived_artifacts ADD COLUMN object_key TEXT").run(); } catch { /* exists */ }
  try { await env.DB.prepare("ALTER TABLE derived_artifacts ADD COLUMN note TEXT").run(); } catch { /* exists */ }
  try { await env.DB.prepare("ALTER TABLE records ADD COLUMN content_sha256 TEXT").run(); } catch { /* exists */ }
  try { await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_records_sha ON records(content_sha256)").run(); } catch { /* exists */ }
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS document_ledger (record_id TEXT NOT NULL, sequence INTEGER NOT NULL, timestamp_utc TEXT NOT NULL, action TEXT NOT NULL, payload_json TEXT NOT NULL, previous_hash TEXT NOT NULL, entry_hash TEXT NOT NULL, PRIMARY KEY (record_id, sequence))"
  ).run();
  try { await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_doc_ledger_tip ON document_ledger(record_id, sequence)").run(); } catch { /* exists */ }
  for (const col of ["chain_tip TEXT", "chain_sequence INTEGER", "triad_combined REAL"]) {
    try { await env.DB.prepare("ALTER TABLE records ADD COLUMN " + col).run(); } catch { /* exists */ }
  }
}

export function isDocumentId(recordId) {
  return /^AZDOC-[A-Z0-9]+$/i.test(String(recordId || "").trim());
}

async function lastDocumentEntry(env, recordId) {
  const row = await env.DB.prepare(
    "SELECT sequence, entry_hash FROM document_ledger WHERE record_id=? ORDER BY sequence DESC LIMIT 1"
  ).bind(recordId).first();
  if (!row) return { sequence: 0, entry_hash: ZERO };
  return { sequence: Number(row.sequence) || 0, entry_hash: String(row.entry_hash || ZERO) };
}

/** Append to the per-document hash-chain. Global ledger stays site-wide; this binds tip ↔ record_id. */
export async function appendDocumentLedger(env, recordId, action, payload) {
  await ensureLedger(env);
  const id = String(recordId || "").trim();
  if (!isDocumentId(id)) return null;
  const body = payload && typeof payload === "object" ? payload : {};
  body.record_id = id;
  let lastErr = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const prev = await lastDocumentEntry(env, id);
    const sequence = prev.sequence + 1;
    const timestamp_utc = new Date().toISOString();
    const previous_hash = prev.entry_hash || ZERO;
    const entry = { record_id: id, sequence, timestamp_utc, action: String(action), payload: body, previous_hash };
    const entry_hash = hashPayload(entry);
    try {
      await env.DB.prepare(
        "INSERT INTO document_ledger(record_id,sequence,timestamp_utc,action,payload_json,previous_hash,entry_hash) VALUES(?,?,?,?,?,?,?)"
      ).bind(id, sequence, timestamp_utc, String(action), canonicalJson(body), previous_hash, entry_hash).run();
      try {
        await env.DB.prepare("UPDATE records SET chain_tip=?, chain_sequence=? WHERE record_id=?").bind(entry_hash, sequence, id).run();
      } catch { /* schema */ }
      return { ...entry, entry_hash };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("document ledger append failed");
}

export async function documentChain(env, recordId) {
  await ensureLedger(env);
  const id = String(recordId || "").trim();
  if (!id) return { record_id: id, ok: false, entries: [], tip: ZERO, sequence: 0 };
  const rows = (await env.DB.prepare(
    "SELECT sequence, timestamp_utc, action, payload_json, previous_hash, entry_hash FROM document_ledger WHERE record_id=? ORDER BY sequence ASC"
  ).bind(id).all()).results || [];
  const errors = [];
  let expectedPrev = ZERO;
  let expectedSeq = 1;
  let tip = ZERO;
  const entries = [];
  for (const row of rows) {
    const seq = Number(row.sequence);
    if (seq !== expectedSeq) errors.push("sequence gap at " + seq);
    if (String(row.previous_hash) !== expectedPrev) errors.push("previous_hash mismatch at " + seq);
    let payload = {};
    try { payload = JSON.parse(row.payload_json || "{}"); } catch { errors.push("bad payload at " + seq); }
    const recomputed = hashPayload({ record_id: id, sequence: seq, timestamp_utc: row.timestamp_utc, action: row.action, payload, previous_hash: row.previous_hash });
    if (recomputed !== row.entry_hash) errors.push("entry_hash mismatch at " + seq);
    expectedPrev = row.entry_hash;
    expectedSeq = seq + 1;
    tip = row.entry_hash;
    entries.push({ sequence: seq, timestamp_utc: row.timestamp_utc, action: row.action, payload, previous_hash: row.previous_hash, entry_hash: row.entry_hash });
  }
  return { record_id: id, ok: errors.length === 0, entries, tip, sequence: entries.length, errors };
}

async function lastEntry(env) {
  const row = await env.DB.prepare("SELECT sequence, entry_hash FROM ledger ORDER BY sequence DESC LIMIT 1").first();
  if (!row) return { sequence: 0, entry_hash: ZERO };
  return { sequence: Number(row.sequence) || 0, entry_hash: String(row.entry_hash || ZERO) };
}

export async function appendLedger(env, action, payload) {
  await ensureLedger(env);
  const body = payload && typeof payload === "object" ? payload : {};
  let lastErr = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const prev = await lastEntry(env);
    const sequence = prev.sequence + 1;
    const timestamp_utc = new Date().toISOString();
    const previous_hash = prev.entry_hash || ZERO;
    const entry = { sequence, timestamp_utc, action: String(action), payload: body, previous_hash };
    const entry_hash = hashPayload(entry);
    try {
      await env.DB.prepare(
        "INSERT INTO ledger(sequence, timestamp_utc, action, payload_json, previous_hash, entry_hash) VALUES(?,?,?,?,?,?)"
      ).bind(sequence, timestamp_utc, String(action), canonicalJson(body), previous_hash, entry_hash).run();
      return { ...entry, entry_hash };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("ledger append failed");
}

export async function ledgerEntriesForRecord(env, recordId) {
  await ensureLedger(env);
  const id = String(recordId || "");
  if (!id) return [];
  const rows = (await env.DB.prepare(
    "SELECT sequence, timestamp_utc, action, payload_json, previous_hash, entry_hash FROM ledger ORDER BY sequence ASC"
  ).all()).results || [];
  const out = [];
  for (const row of rows) {
    let payload = {};
    try { payload = JSON.parse(row.payload_json || "{}"); } catch { payload = {}; }
    const blob = row.payload_json || "";
    if (payload.record_id === id || payload.existing_record_id === id || blob.indexOf(id) >= 0) {
      out.push({ sequence: row.sequence, timestamp_utc: row.timestamp_utc, action: row.action, payload, previous_hash: row.previous_hash, entry_hash: row.entry_hash });
    }
  }
  return out;
}

export async function verifyLedger(env) {
  await ensureLedger(env);
  const rows = (await env.DB.prepare(
    "SELECT sequence, timestamp_utc, action, payload_json, previous_hash, entry_hash FROM ledger ORDER BY sequence ASC"
  ).all()).results || [];
  const errors = [];
  let expectedPrev = ZERO;
  let expectedSeq = 1;
  let head = ZERO;
  for (const row of rows) {
    const seq = Number(row.sequence);
    if (seq !== expectedSeq) errors.push("sequence gap at " + seq + " expected " + expectedSeq);
    if (String(row.previous_hash) !== expectedPrev) errors.push("previous_hash mismatch at sequence " + seq);
    let payload = {};
    try { payload = JSON.parse(row.payload_json || "{}"); } catch {
      errors.push("payload_json not JSON at sequence " + seq);
    }
    const recomputed = hashPayload({ sequence: seq, timestamp_utc: row.timestamp_utc, action: row.action, payload, previous_hash: row.previous_hash });
    if (recomputed !== row.entry_hash) errors.push("entry_hash mismatch at sequence " + seq);
    expectedPrev = row.entry_hash;
    expectedSeq = seq + 1;
    head = row.entry_hash;
  }
  return { ok: errors.length === 0, entries: rows.length, ledger_head: head, errors };
}

export async function receiptForRecord(env, recordId) {
  await ensureLedger(env);
  const id = String(recordId || "").trim();
  if (!id) return null;
  const row = await env.DB.prepare(
    "SELECT record_id, title, library, filename, byte_size, content_sha256, object_key, created_by, created_utc FROM records WHERE record_id=?"
  ).bind(id).first();
  if (!row) return null;
  const entries = await ledgerEntriesForRecord(env, id);
  const chain = await documentChain(env, id);
  let extra = {};
  try {
    const full = await env.DB.prepare(
      "SELECT quarantine_status, review_json, bayesian_posterior, lattice_tip_json, chain_tip, chain_sequence, triad_combined FROM records WHERE record_id=?"
    ).bind(id).first();
    if (full) {
      extra = {
        quarantine_status: full.quarantine_status || "CLEAR",
        bayesian_posterior: full.bayesian_posterior,
        bayesian_unranked: true,
        triad_combined: full.triad_combined,
        review: full.review_json ? JSON.parse(full.review_json) : null,
        lattice_tip: full.lattice_tip_json ? JSON.parse(full.lattice_tip_json) : null,
        chain_tip: full.chain_tip || chain.tip,
        chain_sequence: full.chain_sequence != null ? full.chain_sequence : chain.sequence,
      };
    }
  } catch { /* older schema */ }
  return {
    record_id: row.record_id,
    title: row.title,
    library: row.library,
    filename: row.filename,
    byte_size: row.byte_size,
    content_sha256: row.content_sha256 || null,
    created_by: row.created_by,
    created_utc: row.created_utc,
    immutable: true,
    document_chain: chain,
    ledger: entries,
    ...extra,
  };
}

export { ZERO };

