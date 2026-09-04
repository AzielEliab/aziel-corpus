/**
 * Exact-same-subject paper succession (supersedes / superseded-by).
 * Author: Aziel Eliab only.
 *
 * Chain only when the match is flawless. Loose topical relatedness is not enough.
 * Persist adjacent links immutably. Cite the full oldest → newest chain on both papers.
 */
import { randomBytes } from "node:crypto";
import { appendLedger, appendDocumentLedger, isDocumentId } from "./ledger.js";
import { triadComposite, triadCoveragePoints, collectionTriad } from "./review.js";

export const SUCCESSION_SCHEMA = "aziel.succession.v1";

const GENERIC_SUBJECTS = new Set([
  "unclassified",
  "standalone",
  "general",
  "misc",
  "miscellaneous",
  "other",
  "unknown",
  "n a",
  "na",
  "none",
  "untitled",
]);

const DOC_ID = /AZDOC-[A-Z0-9]+/i;
const LINEAGE_TAIL =
  /\s*[-–—:|]*\s*[([{]?\s*(?:v(?:er(?:sion)?)?|rev(?:ision)?|ed(?:ition)?|updated?|revised|supersedes?|superseded(?:\s+by)?|draft|final|addendum|corrigendum|errata)\b.*$/i;

export function normalizeKey(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function subjectKey(value) {
  const first = String(value || "").split(/[,;|/]/)[0];
  const key = normalizeKey(first);
  if (!key || GENERIC_SUBJECTS.has(key)) return "";
  return key;
}

export function domainKey(value) {
  return normalizeKey(value);
}

export function titleLineageCore(title) {
  let s = String(title || "").replace(/\.(txt|md|markdown|pdf|docx?|rtf|html?)$/i, "");
  let prev = "";
  while (s !== prev) {
    prev = s;
    s = s.replace(LINEAGE_TAIL, "");
    s = s.replace(/\s*[([{]\s*\d+(?:st|nd|rd|th)?\s*(?:ed(?:ition)?)?\s*[)\]}]\s*$/i, "");
    s = s.replace(/\s+v?\d+(?:\.\d+){0,3}\s*$/i, "");
  }
  const core = normalizeKey(s);
  return core.length >= 12 ? core : "";
}

function normalizeSha(value) {
  const h = String(value || "").trim().toLowerCase().replace(/^0x/, "");
  return /^[0-9a-f]{64}$/.test(h) ? h : "";
}

function recordTime(row) {
  const raw = String((row && (row.created_utc || row.ingested_utc)) || "");
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

function sortOldestFirst(rows) {
  return [...rows].sort((a, b) => {
    const dt = recordTime(a) - recordTime(b);
    if (dt) return dt;
    return String(a.record_id || "").localeCompare(String(b.record_id || ""));
  });
}

function domainsConflict(a, b) {
  const da = domainKey(a && a.domain);
  const db = domainKey(b && b.domain);
  return !!(da && db && da !== db);
}

function distinctPapers(rows) {
  const bySha = new Map();
  const noSha = [];
  for (const row of rows || []) {
    const sha = normalizeSha(row.content_sha256 || row.sha256);
    if (!sha) {
      noSha.push(row);
      continue;
    }
    const prev = bySha.get(sha);
    if (!prev || recordTime(row) < recordTime(prev)) bySha.set(sha, row);
  }
  return [...bySha.values(), ...noSha];
}

function blobForClaims(record) {
  const extras = record && record.extras ? record.extras : {};
  const meta = record && record.metadata ? record.metadata : {};
  const parts = [
    record && record.keywords,
    record && record.search_terms,
    record && String(record.body || "").slice(0, 4000),
    extras.supersedes,
    extras.superseded_by,
    extras.supersedes_record_id,
    meta.supersedes,
    meta.superseded_by,
    meta.supersedes_record_id,
  ];
  return parts.filter((x) => x != null && String(x).trim()).join("\n");
}

function pushClaim(out, kind, raw) {
  const text = String(raw || "").trim();
  if (!text) return;
  const idMatch = text.match(DOC_ID);
  if (idMatch) {
    out.push({ kind, record_id: idMatch[0].toUpperCase(), title: "" });
    return;
  }
  const title = normalizeKey(text.replace(/^["“'`]+|["”'`]+$/g, ""));
  if (title.length >= 8) out.push({ kind, record_id: "", title });
}

export function extractExplicitClaims(record) {
  const out = [];
  const extras = (record && record.extras) || {};
  const meta = (record && record.metadata) || {};
  pushClaim(out, "supersedes", extras.supersedes || extras.supersedes_record_id || meta.supersedes || meta.supersedes_record_id);
  pushClaim(out, "superseded_by", extras.superseded_by || meta.superseded_by);
  const blob = blobForClaims(record);
  for (const m of blob.matchAll(/\bsupersedes?\s*[:=]\s*(AZDOC-[A-Za-z0-9]+)/gi)) {
    pushClaim(out, "supersedes", m[1]);
  }
  for (const m of blob.matchAll(/\bsuperseded[-_ ]?by\s*[:=]\s*(AZDOC-[A-Za-z0-9]+)/gi)) {
    pushClaim(out, "superseded_by", m[1]);
  }
  for (const m of blob.matchAll(/\bsupersedes?\s*[:=]\s*["“]([^"”]{8,240})["”]/gi)) {
    pushClaim(out, "supersedes", m[1]);
  }
  for (const m of blob.matchAll(/\bsuperseded[-_ ]?by\s*[:=]\s*["“]([^"”]{8,240})["”]/gi)) {
    pushClaim(out, "superseded_by", m[1]);
  }
  return out;
}

function resolveClaim(claim, catalog, claimant) {
  if (claim.record_id) {
    return catalog.find((r) => String(r.record_id || "").toUpperCase() === claim.record_id) || null;
  }
  const want = normalizeKey(claim.title);
  const wantCore = titleLineageCore(claim.title);
  const exact = catalog.filter((r) => r.record_id !== claimant.record_id && normalizeKey(r.title) === want);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    const sameSubject = exact.filter((r) => {
      const sk = subjectKey(r.subjects || r.primary_subject);
      const ck = subjectKey(claimant.subjects || claimant.primary_subject);
      return sk && ck && sk === ck;
    });
    return sameSubject.length === 1 ? sameSubject[0] : null;
  }
  if (!wantCore) return null;
  const lined = catalog.filter((r) => r.record_id !== claimant.record_id && titleLineageCore(r.title) === wantCore);
  if (lined.length === 1) {
    const sk = subjectKey(lined[0].subjects || lined[0].primary_subject);
    const ck = subjectKey(claimant.subjects || claimant.primary_subject);
    if (sk && ck && sk !== ck) return null;
    return lined[0];
  }
  return null;
}

function addPair(pairs, seen, pred, succ, reason, subject_key) {
  if (!pred || !succ || pred.record_id === succ.record_id) return;
  if (normalizeSha(pred.content_sha256 || pred.sha256) &&
      normalizeSha(pred.content_sha256 || pred.sha256) === normalizeSha(succ.content_sha256 || succ.sha256)) {
    return;
  }
  if (recordTime(succ) && recordTime(pred) && recordTime(succ) < recordTime(pred)) return;
  const key = pred.record_id + "\n" + succ.record_id;
  if (seen.has(key)) return;
  seen.add(key);
  pairs.push({
    predecessor_id: pred.record_id,
    successor_id: succ.record_id,
    subject_key: subject_key || subjectKey(succ.subjects || succ.primary_subject) || subjectKey(pred.subjects || pred.primary_subject) || "",
    reason,
  });
}

export function proposeAllLinks(records, extraPairs) {
  const catalog = (records || []).filter((r) => r && r.record_id);
  const pairs = [];
  const seen = new Set();
  const groups = new Map();
  for (const row of catalog) {
    const sk = subjectKey(row.subjects || row.primary_subject);
    const tc = titleLineageCore(row.title || row.original_name);
    if (!sk || !tc) continue;
    const key = sk + "\n" + tc;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  for (const [key, group] of groups) {
    const sk = key.split("\n")[0];
    const ordered = sortOldestFirst(distinctPapers(group));
    for (let i = 0; i < ordered.length - 1; i += 1) {
      if (domainsConflict(ordered[i], ordered[i + 1])) continue;
      addPair(pairs, seen, ordered[i], ordered[i + 1], "subject_title_lineage", sk);
    }
  }
  for (const row of catalog) {
    for (const claim of extractExplicitClaims(row)) {
      const target = resolveClaim(claim, catalog, row);
      if (!target) continue;
      const older = recordTime(row) <= recordTime(target) ? row : target;
      const newer = older === row ? target : row;
      if (claim.kind === "supersedes" && row.record_id !== newer.record_id) continue;
      if (claim.kind === "superseded_by" && row.record_id !== older.record_id) continue;
      addPair(pairs, seen, older, newer, "explicit");
    }
  }
  for (const extra of extraPairs || []) {
    const pred = catalog.find((r) => r.record_id === extra.predecessor_id);
    const succ = catalog.find((r) => r.record_id === extra.successor_id);
    if (pred && succ) addPair(pairs, seen, pred, succ, extra.reason || "explicit", extra.subject_key);
  }
  return pairs;
}

export function citeFromChain(recordId, chain) {
  const ids = (chain || []).map((x) => x.record_id);
  const idx = ids.indexOf(recordId);
  if (idx < 0 || chain.length < 2) return null;
  return {
    schema: SUCCESSION_SCHEMA,
    chain,
    supersedes: chain.slice(0, idx),
    superseded_by: chain.slice(idx + 1),
  };
}

export async function ensureSuccessionSchema(env) {
  if (!env || !env.DB) return;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS succession_links (link_id TEXT PRIMARY KEY, predecessor_id TEXT NOT NULL, successor_id TEXT NOT NULL, subject_key TEXT NOT NULL DEFAULT '', reason TEXT NOT NULL, created_utc TEXT NOT NULL, entry_hash TEXT, UNIQUE(predecessor_id, successor_id))"
  ).run();
  try { await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_succ_pred ON succession_links(predecessor_id)").run(); } catch { /* exists */ }
  try { await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_succ_succ ON succession_links(successor_id)").run(); } catch { /* exists */ }
  try { await env.DB.prepare("ALTER TABLE records ADD COLUMN succession_json TEXT").run(); } catch { /* exists */ }
}

function compactRow(row, extras) {
  if (!row) return null;
  let metadata = row.metadata;
  if (!metadata && row.metadata_json) {
    try { metadata = JSON.parse(row.metadata_json); } catch { metadata = {}; }
  }
  return {
    record_id: row.record_id,
    title: row.title || row.original_name || "",
    subjects: row.subjects || row.primary_subject || "",
    primary_subject: row.primary_subject || row.subjects || "",
    domain: row.domain || "",
    keywords: row.keywords || row.search_terms || "",
    body: String(row.body || "").slice(0, 4000),
    created_utc: row.created_utc || row.ingested_utc || "",
    content_sha256: row.content_sha256 || row.sha256 || "",
    library: row.library || "",
    extras: extras || row.extras || {},
    metadata: metadata || {},
  };
}

async function loadCompactRecords(env) {
  try {
    const rs = await env.DB.prepare(
      "SELECT record_id, title, subjects, domain, keywords, substr(body,1,4000) AS body, created_utc, content_sha256, library FROM records ORDER BY created_utc ASC"
    ).all();
    return (rs.results || []).map((r) => compactRow(r));
  } catch {
    return [];
  }
}

async function persistLink(env, pair) {
  const exists = await env.DB.prepare(
    "SELECT link_id FROM succession_links WHERE predecessor_id=? AND successor_id=? LIMIT 1"
  ).bind(pair.predecessor_id, pair.successor_id).first();
  if (exists) return null;
  const when = new Date().toISOString();
  const linkId = "AZSUC-" + randomBytes(6).toString("hex").toUpperCase();
  const payload = {
    link_id: linkId,
    predecessor_id: pair.predecessor_id,
    successor_id: pair.successor_id,
    subject_key: pair.subject_key || "",
    reason: pair.reason,
  };
  const predEntry = await appendLedger(env, "SUPERSEDED_BY", { ...payload, record_id: pair.predecessor_id });
  if (isDocumentId(pair.predecessor_id)) await appendDocumentLedger(env, pair.predecessor_id, "SUPERSEDED_BY", { ...payload, record_id: pair.predecessor_id });
  await appendLedger(env, "SUPERSEDES", { ...payload, record_id: pair.successor_id });
  if (isDocumentId(pair.successor_id)) await appendDocumentLedger(env, pair.successor_id, "SUPERSEDES", { ...payload, record_id: pair.successor_id });
  await env.DB.prepare(
    "INSERT INTO succession_links(link_id,predecessor_id,successor_id,subject_key,reason,created_utc,entry_hash) VALUES(?,?,?,?,?,?,?)"
  ).bind(linkId, pair.predecessor_id, pair.successor_id, pair.subject_key || "", pair.reason, when, predEntry.entry_hash).run();
  return linkId;
}

async function loadComponentIds(env, startId) {
  const seen = new Set([startId]);
  const queue = [startId];
  while (queue.length) {
    const id = queue.shift();
    let rows = [];
    try {
      rows = (await env.DB.prepare(
        "SELECT predecessor_id, successor_id FROM succession_links WHERE predecessor_id=? OR successor_id=?"
      ).bind(id, id).all()).results || [];
    } catch { rows = []; }
    for (const row of rows) {
      for (const x of [row.predecessor_id, row.successor_id]) {
        if (!seen.has(x)) {
          seen.add(x);
          queue.push(x);
        }
      }
    }
  }
  return [...seen];
}

async function loadChainRows(env, ids) {
  const out = [];
  for (const id of ids) {
    let row = null;
    try {
      row = await env.DB.prepare(
        "SELECT record_id, title, created_utc FROM records WHERE record_id=?"
      ).bind(id).first();
    } catch { row = null; }
    if (row) out.push({ record_id: row.record_id, title: row.title || row.record_id, created_utc: row.created_utc || "" });
    else out.push({ record_id: id, title: id, created_utc: "" });
  }
  return sortOldestFirst(out);
}

export async function loadSuccessionCite(env, recordId) {
  if (!env || !env.DB || !recordId) return null;
  await ensureSuccessionSchema(env);
  const ids = await loadComponentIds(env, recordId);
  if (ids.length < 2) return null;
  const chain = await loadChainRows(env, ids);
  return citeFromChain(recordId, chain);
}

export async function successionCoverageFor(env, recordId) {
  const cite = await loadSuccessionCite(env, recordId);
  return triadCoveragePoints(cite && cite.chain ? cite.chain.length : 0);
}

async function writeSnapshot(env, recordId, cite) {
  if (!cite) return;
  try {
    await env.DB.prepare("UPDATE records SET succession_json=? WHERE record_id=?").bind(JSON.stringify(cite), recordId).run();
  } catch { /* column may be missing on very old schema */ }
  const payload = {
    record_id: recordId,
    chain: cite.chain.map((x) => x.record_id),
    supersedes: cite.supersedes.map((x) => x.record_id),
    superseded_by: cite.superseded_by.map((x) => x.record_id),
  };
  await appendLedger(env, "SUCCESSION_CITE", payload);
  if (isDocumentId(recordId)) await appendDocumentLedger(env, recordId, "SUCCESSION_CITE", payload);
}

export async function applyTriadCoverage(env, recordId) {
  if (!env || !env.DB || !recordId) return null;
  let row = null;
  try {
    row = await env.DB.prepare(
      "SELECT record_id, library, review_json, triad_combined FROM records WHERE record_id=?"
    ).bind(recordId).first();
  } catch { return null; }
  if (!row || !row.review_json) return null;
  let review = null;
  try { review = JSON.parse(row.review_json); } catch { return null; }
  if (!review || !review.spre || !review.clce || !review.plr) return null;
  const coverage = await successionCoverageFor(env, recordId);
  const triad = collectionTriad(triadComposite({
    spre: review.spre,
    clce: review.clce,
    plr: review.plr,
  }), row.library, coverage);
  const stored = row.triad_combined != null ? Number(row.triad_combined) : review.triad && review.triad.combined;
  if (triad.combined != null && stored != null && Number.isFinite(stored) && Math.abs(stored - triad.combined) < 0.0002) {
    return triad;
  }
  review.triad = triad;
  try {
    await env.DB.prepare("UPDATE records SET review_json=?, triad_combined=? WHERE record_id=?")
      .bind(JSON.stringify(review), triad.combined, recordId).run();
  } catch { /* schema */ }
  const payload = {
    record_id: recordId,
    library: row.library,
    event: "succession_recalibrate",
    triad_combined: triad.combined,
    triad_ready: !!triad.ready,
  };
  await appendLedger(env, "REVIEW_SCORE", payload);
  if (isDocumentId(recordId)) await appendDocumentLedger(env, recordId, "REVIEW_SCORE", payload);
  return triad;
}

export async function applySuccessionForRecord(env, record, extras) {
  if (!env || !env.DB || !record || !record.record_id) return { linked: 0, chain: [] };
  await ensureSuccessionSchema(env);
  const focus = compactRow(record, extras);
  const catalog = await loadCompactRecords(env);
  const byId = new Map(catalog.map((r) => [r.record_id, r]));
  byId.set(focus.record_id, { ...byId.get(focus.record_id), ...focus });
  const pairs = proposeAllLinks([...byId.values()]);
  let linked = 0;
  const affected = new Set([focus.record_id]);
  for (const pair of pairs) {
    const added = await persistLink(env, pair);
    if (added) linked += 1;
    affected.add(pair.predecessor_id);
    affected.add(pair.successor_id);
  }
  let cite = await loadSuccessionCite(env, focus.record_id);
  if (linked) {
    for (const id of affected) {
      const snap = await loadSuccessionCite(env, id);
      if (snap) await writeSnapshot(env, id, snap);
      if (id === focus.record_id) cite = snap;
    }
  }
  return { linked, chain: (cite && cite.chain) || [], cite };
}

export async function rescoreSuccessionMembers(env, recordId, { skip } = {}) {
  const cite = await loadSuccessionCite(env, recordId);
  const ids = cite && cite.chain ? cite.chain.map((x) => x.record_id) : [recordId];
  for (const id of ids) {
    if (skip && id === skip) continue;
    await applyTriadCoverage(env, id);
  }
}

export async function backfillSuccession(env) {
  if (!env || !env.DB) return { ok: true, linked: 0, records: 0 };
  await ensureSuccessionSchema(env);
  const rows = await loadCompactRecords(env);
  const pairs = proposeAllLinks(rows);
  let linked = 0;
  const affected = new Set();
  for (const pair of pairs) {
    const added = await persistLink(env, pair);
    if (added) linked += 1;
    affected.add(pair.predecessor_id);
    affected.add(pair.successor_id);
  }
  for (const id of affected) {
    const snap = await loadSuccessionCite(env, id);
    if (snap) await writeSnapshot(env, id, snap);
    await applyTriadCoverage(env, id);
  }
  return { ok: true, linked, records: affected.size };
}

export async function maybeBackfillSuccession(env) {
  if (!env || !env.DB) return { skipped: true };
  try {
    const flag = await env.DB.prepare("SELECT value FROM metadata WHERE key=?").bind("succession_backfill_utc").first();
    if (flag && flag.value) return { skipped: true };
  } catch { /* metadata optional */ }
  const report = await backfillSuccession(env);
  try {
    await env.DB.prepare("INSERT OR REPLACE INTO metadata(key,value) VALUES(?,?)")
      .bind("succession_backfill_utc", new Date().toISOString()).run();
  } catch { /* optional */ }
  return report;
}
