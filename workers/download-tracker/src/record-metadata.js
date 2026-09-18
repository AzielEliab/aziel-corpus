/**
 * Crawlable discovery metadata for AZDOC uploads.
 *
 * Storage (same FILES binding as the paper — not a second store):
 *   1) Co-located package: {library}/{AZDOC-…}/JSONAZDOC-….json
 *   2) Collected tree:     .Json/JSONAZDOC-….json
 *
 * Receipts use prefix JSON + paper id (JSONAZDOC-…) on document_ledger so the
 * paper AZDOC hash-chain / records.chain_tip is never rewritten.
 *
 * Author: Aziel Eliab.
 */
import { createHash } from "node:crypto";
import {
  appendDocumentLedger,
  appendLedger,
  documentChain,
  ensureLedger,
  isDocumentId,
  isJsonDocumentId,
  jsonRecordId,
  paperRecordId,
} from "./ledger.js";
import { getObject, readObjectBytes } from "./library.js";
import { latticeAnchorTip } from "./lattice.js";
import { HUB_PERSON_ID } from "./seo.js";

export const HOST = "https://www.azielcorpuslibrary.net";
export const JSON_RECEIPT_PREFIX = "JSON";
export const JSON_TREE_SEGMENT = ".Json";
export const JSON_DISCOVERY_ACTION = "JSON_DISCOVERY";
export const JSON_HASH_REPAIR_ACTION = "JSON_HASH_REPAIR";
export const JSON_ARTIFACT_TYPE = "JSON_DISCOVERY";
export const CONTENT_EXCERPT_CHARS = 8000;
export const PUBLIC_AUTHOR = "Aziel Eliab";
export const META_BACKFILL_CURSOR_KEY = "metadata_backfill_cursor";
export const META_BACKFILL_DONE_KEY = "metadata_backfill_done_utc";
export const META_BACKFILL_STATS_KEY = "metadata_backfill_stats";
export const META_BACKFILL_CHUNK = 12;

const JSON_MIME = "application/json; charset=utf-8";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Aziel-Operator-Token",
  };
}

function isR2(store) {
  return !!(store && typeof store.head === "function");
}

function sha256hex(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return createHash("sha256").update(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).digest("hex");
}

function splitTokens(value) {
  return String(value || "")
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function uniqueTokens(...groups) {
  const seen = new Map();
  for (const group of groups) {
    for (const token of splitTokens(Array.isArray(group) ? group.join(",") : group)) {
      const key = token.toLowerCase();
      if (!seen.has(key)) seen.set(key, token);
    }
  }
  return [...seen.values()];
}

function isoStamp(value, fallback) {
  const raw = String(value || "").trim();
  if (raw && !Number.isNaN(Date.parse(raw))) return new Date(raw).toISOString();
  return fallback || new Date().toISOString();
}

function shelfOf(row) {
  return String((row && (row.library || row.shelf)) || "").toLowerCase() === "aziel" ? "aziel" : "corpus";
}

export function isAzielLibraryAuthor(row) {
  const lib = shelfOf(row);
  const author = String((row && row.author) || "").trim();
  return lib === "aziel" || /^aziel(\s+elroi)?\s+eliab$/i.test(author) || !author;
}

export function discoveryAuthor(row) {
  if (isAzielLibraryAuthor(row)) {
    return { "@type": "Person", "@id": HUB_PERSON_ID, name: PUBLIC_AUTHOR };
  }
  return { "@type": "Person", name: String(row.author).trim() };
}

export function packageMetadataKey(library, paperId) {
  const paper = paperRecordId(paperId);
  const jsonId = jsonRecordId(paper);
  const lib = String(library || "corpus").toLowerCase() === "aziel" ? "aziel" : "corpus";
  return lib + "/" + paper + "/" + jsonId + ".json";
}

export function jsonTreeKey(paperId) {
  return JSON_TREE_SEGMENT + "/" + jsonRecordId(paperId) + ".json";
}

export function metadataUrls(paperId) {
  const paper = paperRecordId(paperId);
  return {
    url: HOST + "/record/" + paper,
    metadata_url: HOST + "/record/" + paper + "/metadata.json",
    metadata_alias_url: HOST + "/record/" + paper + ".json",
    file_url: HOST + "/file/" + paper,
    receipt_url: HOST + "/receipt/" + paper,
    json_receipt_url: HOST + "/receipt/" + jsonRecordId(paper),
  };
}

export function parseRecordMetadataPath(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  let m = path.match(/^\/record\/([^/]+)\/metadata\.json$/i);
  if (m) return { record_id: decodeURIComponent(m[1]), alias: "metadata.json" };
  m = path.match(/^\/record\/([^/]+)\/meta\.json$/i);
  if (m) return { record_id: decodeURIComponent(m[1]), alias: "meta.json" };
  m = path.match(/^\/record\/([^/]+)\.json$/i);
  if (m) return { record_id: decodeURIComponent(m[1]), alias: "json" };
  return null;
}

function discoveryText(row) {
  const title = String((row && row.title) || "").trim();
  const body = String((row && (row.body || row.extractText || row.content)) || "").trim();
  const subjects = uniqueTokens(row && row.subjects, row && row.keywords, row && row.domain);
  const filename = String((row && row.filename) || "").trim();
  let text = body;
  if (!text) {
    text = [title, subjects.join(", "), filename].filter(Boolean).join("\n");
  }
  if (!text) text = String((row && row.record_id) || "Aziel Digital Library record");
  return text.replace(/\s+/g, " ").trim();
}

export function buildDiscoveryMetadata(row, extras = {}) {
  const paper = paperRecordId(row && (row.record_id || row.id));
  if (!paper) return null;
  const jsonId = jsonRecordId(paper);
  const lib = shelfOf(row);
  const aziel = lib === "aziel";
  const urls = metadataUrls(paper);
  const generated_at = isoStamp(extras.generated_at);
  const created = isoStamp(row.created_utc || row.uploaded_at, generated_at);
  const updated = isoStamp(row.updated_at || row.updated || row.ts || row.created_utc, created);
  const subjects = uniqueTokens(row.subjects, row.keywords, row.domain);
  const subject = subjects[0] || String(row.subjects || row.domain || "library").trim() || "library";
  const fullText = discoveryText(row);
  const excerpt = fullText.slice(0, CONTENT_EXCERPT_CHARS);
  const fullChars = fullText.length;
  const contentSha = String(row.content_sha256 || extras.content_sha256 || "").trim() || null;
  const author = discoveryAuthor(row);
  const paperTip = extras.lattice_tip || null;
  const metadataSha = extras.metadata_sha256 || null;
  const doc = {
    "@context": "https://schema.org",
    "@type": aziel ? "ScholarlyArticle" : "CreativeWork",
    "@id": urls.url + "#record",
    record_id: paper,
    json_record_id: jsonId,
    receipt_id: jsonId,
    receipt_prefix: JSON_RECEIPT_PREFIX,
    title: String(row.title || paper).trim() || paper,
    name: String(row.title || paper).trim() || paper,
    headline: String(row.title || paper).trim() || paper,
    subject,
    subjects,
    keywords: uniqueTokens(row.keywords, subjects),
    author,
    content: excerpt,
    content_sha256: contentSha,
    content_url: urls.file_url,
    full_text_chars: fullChars,
    created_utc: created,
    uploaded_at: created,
    updated_at: updated,
    generated_at,
    url: urls.url,
    metadata_url: urls.metadata_url,
    file_url: urls.file_url,
    sameAs: [urls.metadata_alias_url, urls.json_receipt_url, HUB_PERSON_ID],
    isPartOf: {
      "@type": "Collection",
      name: aziel ? "Aziel Library" : "Corpus",
      url: HOST + (aziel ? "/aziel-library" : "/corpus"),
    },
    encoding: {
      "@type": "MediaObject",
      contentUrl: urls.file_url,
      sha256: contentSha,
    },
    paper_chain_tip: extras.paper_chain_tip || row.chain_tip || null,
    paper_chain_sequence: extras.paper_chain_sequence != null ? extras.paper_chain_sequence : (row.chain_sequence != null ? row.chain_sequence : null),
    lattice_tip: jsonLatticeTip(row, paperTip, jsonId, metadataSha),
    storage: {
      package_object_key: packageMetadataKey(lib, paper),
      json_tree_object_key: jsonTreeKey(paper),
      json_tree_segment: JSON_TREE_SEGMENT,
    },
  };
  if (fullChars > CONTENT_EXCERPT_CHARS) {
    doc.content_excerpted = true;
  }
  if (row.filename) doc.filename = String(row.filename);
  if (row.domain) doc.domain = String(row.domain);
  if (row.library || lib) doc.library = lib;
  if (extras.hash_repair) doc.hash_repair = extras.hash_repair;
  if (extras.content_sha256_previous) doc.content_sha256_previous = extras.content_sha256_previous;
  return doc;
}

export function jsonLatticeTip(paperRow, paperTip, jsonId, metadataSha) {
  const paper = paperRecordId(paperRow && (paperRow.record_id || paperRow.id));
  const base = paperTip && typeof paperTip === "object"
    ? { ...paperTip }
    : latticeAnchorTip({
      record_id: paper,
      library: shelfOf(paperRow),
      content_sha256: paperRow && paperRow.content_sha256,
      ledger_entry_hash: paperRow && paperRow.chain_tip,
      event: "verified_ingest",
    });
  return {
    ...base,
    kind: "aziel-corpus.json_discovery",
    type: "JSON",
    receipt_prefix: JSON_RECEIPT_PREFIX,
    record_id: jsonId,
    paper_record_id: paper,
    paper_chain_tip: (paperRow && paperRow.chain_tip) || base.ledger_entry_hash || null,
    paper_ledger_entry_hash: base.ledger_entry_hash || (paperRow && paperRow.chain_tip) || null,
    content_sha256: (paperRow && paperRow.content_sha256) || base.content_sha256 || null,
    metadata_sha256: metadataSha || null,
  };
}

export async function putSidecarObject(env, key, bytes, contentType) {
  const store = env && env.FILES;
  if (!store || !key) {
    const err = new Error("file storage is not available");
    err.status = 503;
    throw err;
  }
  if (isR2(store)) {
    await store.put(key, bytes, { httpMetadata: { contentType: contentType || JSON_MIME } });
    return;
  }
  await store.put(key, bytes, { metadata: { contentType: contentType || JSON_MIME } });
}

async function readSidecarJson(env, key) {
  if (!key) return null;
  try {
    const obj = await getObject(env, key);
    if (!obj) return null;
    const bytes = await readObjectBytes(obj);
    if (!bytes) return null;
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function loadPaperRow(env, paperId, hint) {
  const paper = paperRecordId(paperId);
  if (hint && paperRecordId(hint.record_id || hint.id) === paper && hint.title) {
    return { ...hint, record_id: paper };
  }
  if (!env || !env.DB || !paper) return hint ? { ...hint, record_id: paper } : null;
  try {
    const row = await env.DB.prepare(
      "SELECT record_id, title, body, created_by, created_utc, library, filename, content_type, object_key, byte_size, author, domain, subjects, keywords, content_sha256, lattice_tip_json, chain_tip, chain_sequence FROM records WHERE record_id=?"
    ).bind(paper).first();
    if (row) {
      let tip = null;
      try { tip = row.lattice_tip_json ? JSON.parse(row.lattice_tip_json) : null; } catch { tip = null; }
      return { ...row, lattice_tip: tip };
    }
  } catch {
    try {
      const row = await env.DB.prepare(
        "SELECT record_id, title, body, created_utc, library, filename, author, domain, subjects, keywords, content_sha256 FROM records WHERE record_id=?"
      ).bind(paper).first();
      if (row) return row;
    } catch { /* schema */ }
  }
  return hint ? { ...hint, record_id: paper } : null;
}

async function jsonChainExists(env, jsonId) {
  if (!env || !env.DB || !jsonId) return false;
  try {
    const row = await env.DB.prepare(
      "SELECT entry_hash FROM document_ledger WHERE record_id=? ORDER BY sequence DESC LIMIT 1"
    ).bind(jsonId).first();
    return !!(row && row.entry_hash);
  } catch {
    return false;
  }
}

async function rememberDerived(env, paper, jsonId, packageKey, treeKey, metadataSha) {
  if (!env || !env.DB) return;
  await ensureLedger(env);
  try {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO derived_artifacts(derived_id,record_id,artifact_type,processor,processor_version,content_sha256,created_utc,status,object_key,note) VALUES(?,?,?,?,?,?,?,?,?,?)"
    ).bind(
      jsonId,
      paper,
      JSON_ARTIFACT_TYPE,
      "AZIEL_RECORD_METADATA",
      "1.0.0",
      metadataSha,
      new Date().toISOString(),
      "READY",
      packageKey,
      treeKey
    ).run();
  } catch { /* schema */ }
}

/**
 * Persist discovery JSON beside the paper package and under .Json/.
 * Appends a JSONAZDOC-… document_ledger receipt that copies the paper lattice
 * and never updates records.chain_tip for the paper id.
 */
export async function persistRecordDiscoveryMetadata(env, hint = {}) {
  const paper = paperRecordId(hint.record_id || hint.id);
  if (!paper) return { ok: false, error: "record_id required" };
  const jsonId = jsonRecordId(paper);
  try {
    const row = await loadPaperRow(env, paper, hint);
    if (!row || !row.record_id) return { ok: false, error: "not found" };
    const paperTip = hint.lattice_tip || row.lattice_tip || null;
    const extras = {
      generated_at: hint.generated_at,
      lattice_tip: paperTip,
      paper_chain_tip: hint.chain_tip || row.chain_tip || (paperTip && paperTip.ledger_entry_hash) || null,
      paper_chain_sequence: hint.chain_sequence != null ? hint.chain_sequence : row.chain_sequence,
      content_sha256: hint.content_sha256 || row.content_sha256,
    };
    let doc = buildDiscoveryMetadata(row, extras);
    const body = JSON.stringify(doc, null, 2) + "\n";
    const metadataSha = sha256hex(body);
    doc = buildDiscoveryMetadata(row, { ...extras, metadata_sha256: metadataSha });
    doc.metadata_sha256 = metadataSha;
    const finalBody = JSON.stringify(doc, null, 2) + "\n";
    const finalSha = sha256hex(finalBody);
    doc.metadata_sha256 = finalSha;
    const bytes = new TextEncoder().encode(JSON.stringify(doc, null, 2) + "\n");
    const lib = shelfOf(row);
    const packageKey = packageMetadataKey(lib, paper);
    const treeKey = jsonTreeKey(paper);
    const written = [];
    if (env && env.FILES) {
      try {
        await putSidecarObject(env, packageKey, bytes, JSON_MIME);
        written.push(packageKey);
      } catch { /* package write */ }
      try {
        await putSidecarObject(env, treeKey, bytes, JSON_MIME);
        written.push(treeKey);
      } catch { /* tree write */ }
    }
    await rememberDerived(env, paper, jsonId, packageKey, treeKey, finalSha);
    let receipt = null;
    const alreadyChained = await jsonChainExists(env, jsonId);
    if (!alreadyChained) {
      const payload = {
        record_id: jsonId,
        paper_record_id: paper,
        type: "JSON",
        action: JSON_DISCOVERY_ACTION,
        content_sha256: doc.content_sha256,
        metadata_sha256: finalSha,
        package_object_key: packageKey,
        json_tree_object_key: treeKey,
        paper_chain_tip: extras.paper_chain_tip,
        lattice_kind: "aziel-corpus.json_discovery",
      };
      try {
        receipt = await appendDocumentLedger(env, jsonId, JSON_DISCOVERY_ACTION, payload);
      } catch { receipt = null; }
      try {
        await appendLedger(env, JSON_DISCOVERY_ACTION, payload);
      } catch { /* global ledger optional */ }
    }
    return {
      ok: true,
      unchanged: alreadyChained && written.length === 0,
      record_id: paper,
      json_record_id: jsonId,
      metadata_sha256: finalSha,
      package_object_key: packageKey,
      json_tree_object_key: treeKey,
      written,
      receipt_id: jsonId,
      document_entry_hash: receipt && receipt.entry_hash,
      metadata: doc,
    };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : "metadata persist failed", record_id: paper, json_record_id: jsonId };
  }
}

/**
 * Append-only hash repair tip. Writes a new JSON sidecar (current tip) and always
 * appends JSON_HASH_REPAIR to the JSONAZDOC- chain. Never deletes prior receipts
 * and never rewrites the paper AZDOC chain_tip.
 */
export async function persistHashRepairDiscovery(env, hint = {}) {
  const paper = paperRecordId(hint.record_id || hint.id);
  if (!paper) return { ok: false, error: "record_id required" };
  const jsonId = jsonRecordId(paper);
  try {
    const row = await loadPaperRow(env, paper, hint);
    if (!row || !row.record_id) return { ok: false, error: "not found" };
    const paperTip = hint.lattice_tip || row.lattice_tip || null;
    const previous = String(hint.previous_content_sha256 || "").trim() || null;
    const live = String(hint.content_sha256 || row.content_sha256 || "").trim() || null;
    const hashRepair = {
      previous_content_sha256: previous,
      content_sha256: live,
      repaired_utc: isoStamp(hint.repaired_utc),
      no_rewrite_bytes: true,
      live_byte_size: hint.byte_size != null ? Number(hint.byte_size) : null,
      unverified: !!hint.unverified,
    };
    const extras = {
      generated_at: hint.generated_at,
      lattice_tip: paperTip,
      paper_chain_tip: hint.chain_tip || row.chain_tip || (paperTip && paperTip.ledger_entry_hash) || null,
      paper_chain_sequence: hint.chain_sequence != null ? hint.chain_sequence : row.chain_sequence,
      content_sha256: live,
      content_sha256_previous: previous,
      hash_repair: hashRepair,
    };
    let doc = buildDiscoveryMetadata({ ...row, content_sha256: live }, extras);
    const body = JSON.stringify(doc, null, 2) + "\n";
    const metadataSha = sha256hex(body);
    doc = buildDiscoveryMetadata({ ...row, content_sha256: live }, { ...extras, metadata_sha256: metadataSha });
    doc.metadata_sha256 = metadataSha;
    doc.hash_repair = hashRepair;
    if (previous) doc.content_sha256_previous = previous;
    const finalBody = JSON.stringify(doc, null, 2) + "\n";
    const finalSha = sha256hex(finalBody);
    doc.metadata_sha256 = finalSha;
    const bytes = new TextEncoder().encode(JSON.stringify(doc, null, 2) + "\n");
    const lib = shelfOf(row);
    const packageKey = packageMetadataKey(lib, paper);
    const treeKey = jsonTreeKey(paper);
    const written = [];
    if (env && env.FILES) {
      try {
        await putSidecarObject(env, packageKey, bytes, JSON_MIME);
        written.push(packageKey);
      } catch { /* package write */ }
      try {
        await putSidecarObject(env, treeKey, bytes, JSON_MIME);
        written.push(treeKey);
      } catch { /* tree write */ }
    }
    await rememberDerived(env, paper, jsonId, packageKey, treeKey, finalSha);
    const payload = {
      record_id: jsonId,
      paper_record_id: paper,
      type: "JSON",
      action: JSON_HASH_REPAIR_ACTION,
      content_sha256: live,
      previous_content_sha256: previous,
      metadata_sha256: finalSha,
      package_object_key: packageKey,
      json_tree_object_key: treeKey,
      paper_chain_tip: extras.paper_chain_tip,
      lattice_kind: "aziel-corpus.json_discovery",
      no_rewrite_bytes: true,
      unverified: !!hint.unverified,
    };
    let receipt = null;
    try {
      receipt = await appendDocumentLedger(env, jsonId, JSON_HASH_REPAIR_ACTION, payload);
    } catch { receipt = null; }
    try {
      await appendLedger(env, JSON_HASH_REPAIR_ACTION, payload);
    } catch { /* global ledger optional */ }
    return {
      ok: true,
      record_id: paper,
      json_record_id: jsonId,
      metadata_sha256: finalSha,
      package_object_key: packageKey,
      json_tree_object_key: treeKey,
      written,
      receipt_id: jsonId,
      document_entry_hash: receipt && receipt.entry_hash,
      metadata: doc,
    };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : "hash repair metadata failed", record_id: paper, json_record_id: jsonId };
  }
}

export async function loadDiscoveryMetadata(env, paperId, { persistIfMissing = true } = {}) {
  const paper = paperRecordId(paperId);
  if (!paper) return null;
  const row = await loadPaperRow(env, paper, null);
  const lib = row ? shelfOf(row) : "corpus";
  const fromPackage = await readSidecarJson(env, packageMetadataKey(lib, paper));
  if (fromPackage && fromPackage.record_id) return fromPackage;
  const fromTree = await readSidecarJson(env, jsonTreeKey(paper));
  if (fromTree && fromTree.record_id) return fromTree;
  if (!persistIfMissing) {
    return row ? buildDiscoveryMetadata(row, { lattice_tip: row.lattice_tip }) : null;
  }
  const saved = await persistRecordDiscoveryMetadata(env, row || { record_id: paper });
  return saved && saved.metadata ? saved.metadata : (row ? buildDiscoveryMetadata(row) : null);
}

export async function receiptForJsonMetadata(env, anyId) {
  const paper = paperRecordId(anyId);
  const jsonId = jsonRecordId(paper || anyId);
  if (!jsonId) return null;
  const row = await loadPaperRow(env, paper, null);
  if (!row) return null;
  const chain = await documentChain(env, jsonId);
  const meta = await loadDiscoveryMetadata(env, paper, { persistIfMissing: false });
  const tip = (meta && meta.lattice_tip) || jsonLatticeTip(row, row.lattice_tip, jsonId, meta && meta.metadata_sha256);
  return {
    receipt_id: jsonId,
    record_id: jsonId,
    paper_record_id: paper,
    kind: "JSON",
    type: "JSON",
    title: row.title,
    library: shelfOf(row),
    filename: jsonId + ".json",
    content_sha256: row.content_sha256 || null,
    metadata_sha256: (meta && meta.metadata_sha256) || null,
    created_utc: row.created_utc,
    immutable: true,
    lattice_tip: tip,
    paper_chain_tip: row.chain_tip || null,
    paper_chain_sequence: row.chain_sequence != null ? row.chain_sequence : null,
    document_chain: chain,
    metadata_url: HOST + "/record/" + paper + "/metadata.json",
    package_object_key: packageMetadataKey(shelfOf(row), paper),
    json_tree_object_key: jsonTreeKey(paper),
  };
}

export function discoveryJsonResponse(doc, status = 200) {
  return new Response(JSON.stringify(doc, null, 2) + "\n", {
    status,
    headers: {
      "Content-Type": JSON_MIME,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Robots-Tag": "index, follow",
      ...cors(),
    },
  });
}

export async function serveRecordMetadata(env, pathname) {
  const parsed = parseRecordMetadataPath(pathname);
  if (!parsed) return null;
  const paper = paperRecordId(parsed.record_id);
  if (!isDocumentId(paper)) {
    return discoveryJsonResponse({ error: "not found" }, 404);
  }
  const doc = await loadDiscoveryMetadata(env, paper, { persistIfMissing: true });
  if (!doc) return discoveryJsonResponse({ error: "not found" }, 404);
  return discoveryJsonResponse(doc, 200);
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

async function loadPackedIndexIds(env) {
  try {
    const { readPackedIndex } = await import("./library-index.js");
    const packed = await readPackedIndex(env);
    const recs = packed && Array.isArray(packed.records) ? packed.records : [];
    return recs.map((r) => String(r.record_id || r.id || "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Incremental, idempotent backfill. Safe to call from cron, request walk, or GET /v1/metadata-backfill.
 */
export async function continueMetadataBackfill(env, { ms = 8000, force = false, all = false, recordId = null } = {}) {
  const started = Date.now();
  const total = await countRecords(env);
  const stats = { ok: true, total, written: 0, skipped: 0, failed: 0, done: false, cursor: "" };
  if (recordId) {
    const one = await persistRecordDiscoveryMetadata(env, { record_id: recordId });
    if (one && one.ok) stats.written += 1;
    else stats.failed += 1;
    stats.done = true;
    return stats;
  }
  let cursor = await metaGet(env, META_BACKFILL_CURSOR_KEY);
  const doneFlag = await metaGet(env, META_BACKFILL_DONE_KEY);
  if (doneFlag && !force && !all) {
    stats.done = true;
    stats.cursor = cursor;
    return stats;
  }
  if (force) {
    cursor = "";
    await metaSet(env, META_BACKFILL_DONE_KEY, "");
  }
  while (all || Date.now() - started < ms) {
    let batch = [];
    try {
      if (cursor) {
        batch = (await env.DB.prepare(
          "SELECT record_id, title, body, created_utc, library, filename, author, domain, subjects, keywords, content_sha256, lattice_tip_json, chain_tip, chain_sequence FROM records WHERE record_id>? ORDER BY record_id ASC LIMIT ?"
        ).bind(cursor, META_BACKFILL_CHUNK).all()).results || [];
      } else {
        batch = (await env.DB.prepare(
          "SELECT record_id, title, body, created_utc, library, filename, author, domain, subjects, keywords, content_sha256, lattice_tip_json, chain_tip, chain_sequence FROM records ORDER BY record_id ASC LIMIT ?"
        ).bind(META_BACKFILL_CHUNK).all()).results || [];
      }
    } catch {
      try {
        batch = (await env.DB.prepare(
          cursor
            ? "SELECT record_id, title, body, created_utc, library, filename, author, domain, subjects, keywords, content_sha256 FROM records WHERE record_id>? ORDER BY record_id ASC LIMIT ?"
            : "SELECT record_id, title, body, created_utc, library, filename, author, domain, subjects, keywords, content_sha256 FROM records ORDER BY record_id ASC LIMIT ?"
        ).bind(...(cursor ? [cursor, META_BACKFILL_CHUNK] : [META_BACKFILL_CHUNK])).all()).results || [];
      } catch { batch = []; }
    }
    if (!batch.length) {
      stats.done = true;
      await metaSet(env, META_BACKFILL_DONE_KEY, new Date().toISOString());
      await metaSet(env, META_BACKFILL_CURSOR_KEY, "");
      await metaSet(env, META_BACKFILL_STATS_KEY, JSON.stringify(stats));
      break;
    }
    for (const row of batch) {
      try {
        const one = await persistRecordDiscoveryMetadata(env, row);
        if (one && one.ok && one.unchanged) stats.skipped += 1;
        else if (one && one.ok) stats.written += 1;
        else stats.failed += 1;
      } catch {
        stats.failed += 1;
      }
      cursor = row.record_id;
      stats.cursor = cursor;
      if (!all && Date.now() - started >= ms) break;
    }
    await metaSet(env, META_BACKFILL_CURSOR_KEY, cursor);
    await metaSet(env, META_BACKFILL_STATS_KEY, JSON.stringify({ ...stats, updated_utc: new Date().toISOString() }));
    if (!all && Date.now() - started >= ms) break;
  }
  return stats;
}

export async function metadataBackfillStatus(env) {
  const total = await countRecords(env);
  const packedIds = await loadPackedIndexIds(env);
  let stats = null;
  try { stats = JSON.parse((await metaGet(env, META_BACKFILL_STATS_KEY)) || "null"); } catch { stats = null; }
  return {
    ok: true,
    total,
    packed_index_records: packedIds.length,
    cursor: await metaGet(env, META_BACKFILL_CURSOR_KEY),
    done_utc: await metaGet(env, META_BACKFILL_DONE_KEY),
    stats,
    how: "GET /v1/metadata-backfill (chunked). Repeat until done:true. ?all=1 walks remaining. ?force=1 restarts. ?status=1 progress. Cron and request walks also continue. Idempotent: existing JSONAZDOC-… chains are not rewritten.",
  };
}

export { jsonRecordId, paperRecordId, isJsonDocumentId, isDocumentId };
