import { randomBytes, createHash } from "node:crypto";
import { appendLedger, appendDocumentLedger, ensureLedger } from "./ledger.js";
import { ensureReviewSchema, reviewAndStore } from "./review-store.js";
import { applySuccessionForRecord, maybeRescoreZsolverOnFirstHandPatternBreak, rescoreSuccessionMembers, successionCoverageFor } from "./succession.js";
import { scoreZsolverForRecord } from "./zsolver.js";
import { applyAutoClassification } from "./domain-classify.js";

const MAX_BYTES = 25 * 1024 * 1024;
const TEXT_CAP = 200000;
const PUBLIC_AUTHOR = "Aziel Eliab";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id",
  };
}

export function isOperator(signed) {
  if (!signed) return false;
  return signed.user_id === "master" || signed.role === "superadmin";
}

export function libraryFor(signed) {
  return isOperator(signed) ? "aziel" : "corpus";
}

export function safeFilename(name) {
  const base = String(name || "file").split("/").pop().split("\\").pop();
  const cleaned = base.replace(/[^\w.\- ()[\]]+/g, "_").replace(/^\.+/, "").slice(0, 180);
  return cleaned || "file";
}

export function asFile(value) {
  if (!value || typeof value !== "object") return null;
  if (typeof value.arrayBuffer !== "function") return null;
  const size = Number(value.size) || 0;
  const name = String(value.name || "");
  if (size <= 0 && !name) return null;
  if (size <= 0) return null;
  return value;
}

export function parseBrowseParams(url) {
  const sp = url && url.searchParams ? url.searchParams : new URLSearchParams();
  const libRaw = String(sp.get("lib") || "all").trim().toLowerCase() || "all";
  return {
    q: String(sp.get("q") || "").trim(),
    lib: libRaw === "aziel" || libRaw === "corpus" || libRaw === "all" ? libRaw : "all",
    sort: String(sp.get("sort") || "newest").trim() || "newest",
    domain: String(sp.get("domain") || "").trim(),
    subject: String(sp.get("subject") || "").trim(),
    keyword: String(sp.get("keyword") || "").trim(),
    author: String(sp.get("author") || "").trim(),
  };
}

function metaField(value, max = 400) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function csvField(value, max = 400) {
  const joined = String(value || "")
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
  return joined.slice(0, max);
}

function sortClause(sort) {
  const key = String(sort || "newest").toLowerCase();
  if (key === "oldest") return "ORDER BY created_utc ASC";
  if (key === "alpha" || key === "title") return "ORDER BY title COLLATE NOCASE ASC";
  if (key === "author") return "ORDER BY IFNULL(author,'') COLLATE NOCASE ASC, title COLLATE NOCASE ASC";
  if (key === "domain") return "ORDER BY IFNULL(domain,'') COLLATE NOCASE ASC, title COLLATE NOCASE ASC";
  // Bayesian posterior is unranked metadata — never a default shelf sort.
  return "ORDER BY created_utc DESC";
}

export async function searchRecords(env, { q, library, sort, author, domain, subject, keyword, limit, offset } = {}) {
  if (!env || !env.DB) return [];
  try { await ensureLedger(env); } catch { /* schema */ }
  try { await ensureReviewSchema(env); } catch { /* schema */ }
  const lim = Math.min(Math.max(Number(limit) || 300, 1), 500);
  const off = Math.max(Number(offset) || 0, 0);
  const query = String(q || "").trim();
  const lib = String(library || "all").toLowerCase();
  let sql =
    "SELECT record_id, title, substr(body,1,280) AS snippet, created_by, created_utc, library, filename, content_type, object_key, byte_size, author, domain, subjects, keywords, content_sha256, quarantine_status, triad_combined, zsolver_score, zsolver_status, chain_tip, chain_sequence FROM records";
  const where = [];
  const binds = [];
  if (query) {
    const like = "%" + query + "%";
    where.push(
      "(title LIKE ? OR body LIKE ? OR IFNULL(filename,'') LIKE ? OR IFNULL(author,'') LIKE ? OR IFNULL(domain,'') LIKE ? OR IFNULL(subjects,'') LIKE ? OR IFNULL(keywords,'') LIKE ?)"
    );
    binds.push(like, like, like, like, like, like, like);
  }
  if (lib === "aziel" || lib === "corpus") {
    where.push("library = ?");
    binds.push(lib);
  }
  // Oldest identical-SHA copies stay in D1/receipts but leave the public shelf.
  where.push("IFNULL(shelf_hidden,0) = 0");
  const authorFilter = String(author || "").trim();
  if (authorFilter) {
    where.push("IFNULL(author,'') LIKE ?");
    binds.push("%" + authorFilter + "%");
  }
  const domainFilter = String(domain || "").trim();
  if (domainFilter) {
    where.push("IFNULL(domain,'') LIKE ?");
    binds.push("%" + domainFilter + "%");
  }
  const subjectFilter = String(subject || "").trim();
  if (subjectFilter) {
    where.push("IFNULL(subjects,'') LIKE ?");
    binds.push("%" + subjectFilter + "%");
  }
  const keywordFilter = String(keyword || "").trim();
  if (keywordFilter) {
    where.push("IFNULL(keywords,'') LIKE ?");
    binds.push("%" + keywordFilter + "%");
  }
  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += " " + sortClause(sort) + " LIMIT ? OFFSET ?";
  binds.push(lim, off);
  try {
    return (await env.DB.prepare(sql).bind(...binds).all()).results || [];
  } catch {
    sql = sql.replace(", zsolver_score, zsolver_status", "");
    return (await env.DB.prepare(sql).bind(...binds).all()).results || [];
  }
}

function recordTimeMs(row) {
  const ms = Date.parse(String((row && row.created_utc) || ""));
  return Number.isFinite(ms) ? ms : 0;
}

/** Prefer Aziel Library over Corpus, then newest created_utc, then record_id. */
export function preferredShelfRow(a, b) {
  const la = String((a && a.library) || "").toLowerCase() === "aziel" ? 1 : 0;
  const lb = String((b && b.library) || "").toLowerCase() === "aziel" ? 1 : 0;
  if (la !== lb) return la > lb ? a : b;
  const ta = recordTimeMs(a);
  const tb = recordTimeMs(b);
  if (ta !== tb) return ta > tb ? a : b;
  return String((a && a.record_id) || "") >= String((b && b.record_id) || "") ? a : b;
}

/** Hide duplicate public shelf rows by content SHA; keep preferred copy. */
export function dedupeShelfRows(rows) {
  const bySha = new Map();
  const noSha = [];
  for (const r of rows || []) {
    const sha = String(r.content_sha256 || "").trim().toLowerCase();
    if (!sha) {
      noSha.push(r);
      continue;
    }
    const prev = bySha.get(sha);
    bySha.set(sha, prev ? preferredShelfRow(prev, r) : r);
  }
  const keepers = new Set([...bySha.values(), ...noSha].map((r) => r && r.record_id).filter(Boolean));
  // Preserve caller sort order among keepers.
  return (rows || []).filter((r) => keepers.has(r.record_id));
}

function countTokens(rows, getter, cap) {
  const map = new Map();
  for (const r of rows || []) {
    const parts = String(getter(r) || "").split(/[,;]+/);
    for (const part of parts) {
      const token = part.trim();
      if (!token) continue;
      const key = token.toLowerCase();
      const cur = map.get(key) || { label: token, n: 0 };
      cur.n += 1;
      map.set(key, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)).slice(0, cap);
}

export async function patternClusters(env, { limit = 400 } = {}) {
  const rows = dedupeShelfRows(await searchRecords(env, { library: "all", sort: "newest", limit: Math.min(Math.max(Number(limit) || 400, 1), 500) }));
  const domains = countTokens(rows, (r) => r.domain, 24);
  const subjects = countTokens(rows, (r) => r.subjects, 24);
  const keywords = countTokens(rows, (r) => r.keywords, 24);
  const pairs = new Map();
  for (const r of rows) {
    const ds = String(r.domain || "").split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    const ss = String(r.subjects || "").split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    for (const d of ds) {
      for (const s of ss) {
        const key = d.toLowerCase() + "\0" + s.toLowerCase();
        const cur = pairs.get(key) || { domain: d, subject: s, n: 0 };
        cur.n += 1;
        pairs.set(key, cur);
      }
    }
  }
  const crosses = [...pairs.values()].sort((a, b) => b.n - a.n || a.domain.localeCompare(b.domain)).slice(0, 24);
  return { total: rows.length, domains, subjects, keywords, crosses };
}

function collectTokens(values, cap) {
  const seen = new Map();
  for (const raw of values) {
    const parts = String(raw || "").split(/[,;]+/);
    for (const part of parts) {
      const token = part.trim();
      if (!token) continue;
      const key = token.toLowerCase();
      if (seen.has(key)) continue;
      seen.set(key, token);
      if (seen.size >= cap) return [...seen.values()];
    }
  }
  return [...seen.values()];
}

export async function listFacets(env, { library } = {}) {
  const empty = { domains: [], subjects: [], keywords: [], authors: [] };
  if (!env || !env.DB) return empty;
  const lib = String(library || "all").toLowerCase();
  let sql = "SELECT author, domain, subjects, keywords FROM records";
  const binds = [];
  const where = ["IFNULL(shelf_hidden,0) = 0"];
  if (lib === "aziel" || lib === "corpus") {
    where.push("library = ?");
    binds.push(lib);
  }
  sql += " WHERE " + where.join(" AND ");
  sql += " ORDER BY created_utc DESC LIMIT 400";
  const rows = (await env.DB.prepare(sql).bind(...binds).all()).results || [];
  return {
    domains: collectTokens(rows.map((r) => r.domain), 24),
    subjects: collectTokens(rows.map((r) => r.subjects), 24),
    keywords: collectTokens(rows.map((r) => r.keywords), 24),
    authors: collectTokens(rows.map((r) => r.author), 24),
  };
}

function isR2(store) {
  return !!(store && typeof store.head === "function");
}

function digestBytes(bytes) {
  return createHash("sha256").update(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).digest("hex");
}

export function normalizeContentHash(value) {
  let h = String(value || "").trim().toLowerCase();
  if (h.startsWith("0x")) h = h.slice(2);
  h = h.replace(/[-\s]/g, "");
  if (!/^[0-9a-f]{64}$/.test(h)) return "";
  return h;
}

export async function findRecordByHash(env, digest) {
  const h = normalizeContentHash(digest);
  if (!h || !env || !env.DB) return null;
  try {
    return await env.DB.prepare(
      "SELECT record_id, object_key, content_sha256, library FROM records WHERE lower(content_sha256)=? ORDER BY CASE WHEN object_key IS NOT NULL AND object_key != '' THEN 0 ELSE 1 END, created_utc ASC LIMIT 1"
    ).bind(h).first();
  } catch {
    try {
      return await env.DB.prepare(
        "SELECT record_id, object_key, content_sha256 FROM records WHERE lower(content_sha256)=? ORDER BY created_utc ASC LIMIT 1"
      ).bind(h).first();
    } catch {
      return null;
    }
  }
}

export async function serveFileByHash(env, digest) {
  const row = await findRecordByHash(env, digest);
  if (!row) return jsonErr("not found", 404);
  return serveFile(env, row.record_id);
}

export async function objectExists(env, key) {
  const store = env && env.FILES;
  if (!store || !key) return false;
  try {
    if (isR2(store)) {
      const h = await store.head(key);
      return !!h;
    }
    const res = await store.getWithMetadata(key);
    return !!(res && res.value != null);
  } catch {
    return false;
  }
}

export async function putObject(env, key, bytes, contentType) {
  const store = env && env.FILES;
  if (!store) {
    const err = new Error("file storage is not available");
    err.status = 503;
    throw err;
  }
  if (await objectExists(env, key)) {
    const err = new Error("object key already stored (immutable originals)");
    err.status = 409;
    throw err;
  }
  if (isR2(store)) {
    await store.put(key, bytes, { httpMetadata: { contentType } });
    return;
  }
  await store.put(key, bytes, { metadata: { contentType } });
}


/** Read bytes from an R2 object or our KV getObject wrapper. */
export async function readObjectBytes(obj) {
  if (!obj) return null;
  try {
    if (typeof obj.arrayBuffer === "function") {
      const ab = await obj.arrayBuffer();
      if (ab) return ab;
    }
  } catch { /* fall through */ }
  const b = obj.body;
  if (b == null) return null;
  try {
    if (typeof b.arrayBuffer === "function") return await b.arrayBuffer();
  } catch { /* ReadableStream has no .arrayBuffer */ }
  try {
    return await new Response(b).arrayBuffer();
  } catch { /* */ }
  if (typeof b === "string") return new TextEncoder().encode(b);
  if (b instanceof ArrayBuffer) return b;
  if (ArrayBuffer.isView(b)) return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  return null;
}

export async function getObject(env, key) {
  const store = env && env.FILES;
  if (!store) return null;
  if (isR2(store)) return store.get(key);
  // Prefer arrayBuffer so PDF/binary downloads never depend on stream.arrayBuffer().
  try {
    const res = await store.getWithMetadata(key, { type: "arrayBuffer" });
    if (res && res.value != null) {
      const value = res.value;
      const ct = (res.metadata && res.metadata.contentType) || "application/octet-stream";
      return {
        arrayBuffer: async () => value,
        body: value,
        httpMetadata: { contentType: ct },
      };
    }
  } catch { /* fall back to stream */ }
  const res = await store.getWithMetadata(key, { type: "stream" });
  if (!res || res.value == null) return null;
  const stream = res.value;
  const ct = (res.metadata && res.metadata.contentType) || "application/octet-stream";
  return {
    body: stream,
    arrayBuffer: async () => new Response(stream).arrayBuffer(),
    httpMetadata: { contentType: ct },
  };
}

function looksText(filename, contentType) {
  const ct = String(contentType || "").toLowerCase();
  const name = String(filename || "").toLowerCase();
  if (ct.startsWith("text/")) return true;
  if (ct.includes("json") || ct.includes("xml") || ct.includes("javascript") || ct.includes("markdown")) return true;
  return /\.(txt|md|markdown|json|csv|tsv|html|htm|xml|yml|yaml|log)$/i.test(name);
}

export async function ingestRecord(env, args) {
  const signed = args && args.signed;
  const title = args && args.title;
  const body = args && args.body;
  const file = args && args.file;
  const author = args && args.author;
  const domain = args && args.domain;
  const subjects = args && args.subjects;
  const keywords = args && args.keywords;
  const supersedes = args && args.supersedes;
  const supersededBy = args && (args.superseded_by || args.supersededBy);
  if (!signed) {
    const err = new Error("login required");
    err.status = 401;
    throw err;
  }
  await ensureLedger(env);
  try { await ensureReviewSchema(env); } catch { /* schema */ }
  const library = libraryFor(signed);
  let ocrHint = null;
  const id = "AZDOC-" + randomBytes(6).toString("hex").toUpperCase();
  const who = isOperator(signed) ? "operator" : signed.username;
  const notes = String(body || "").trim();
  let filename = null;
  let contentType = null;
  let objectKey = null;
  let byteSize = null;
  let searchBody = notes;
  let contentSha = null;
  let duplicateOf = null;
  let fileBytes = null;
  const f = asFile(file);
  let domainIn = csvField(domain);
  let subjectsIn = csvField(subjects);
  const keywordsIn = csvField(keywords);
  let biblioAuthor = metaField(author);
  if (isOperator(signed)) {
    if (!biblioAuthor) biblioAuthor = PUBLIC_AUTHOR;
  } else if (!biblioAuthor) {
    biblioAuthor = String(signed.username || who || "").trim();
  }
  if (f) {
    if (f.size > MAX_BYTES) {
      const err = new Error("file too large (25MB max)");
      err.status = 400;
      throw err;
    }
    filename = safeFilename(f.name);
    contentType = f.type || "application/octet-stream";
    byteSize = f.size;
    const bytes = await f.arrayBuffer();
    fileBytes = bytes;
    contentSha = digestBytes(bytes);
    let existing = null;
    try {
      existing = await env.DB.prepare("SELECT record_id, object_key FROM records WHERE content_sha256=? AND object_key IS NOT NULL LIMIT 1").bind(contentSha).first();
    } catch { existing = null; }
    if (existing && existing.object_key) {
      objectKey = existing.object_key;
      duplicateOf = existing.record_id;
    } else {
      objectKey = library + "/" + id + "/" + filename;
      await putObject(env, objectKey, bytes, contentType);
    }
    if (looksText(filename, contentType)) {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes).slice(0, TEXT_CAP);
      searchBody = [notes, text].filter(Boolean).join("\n\n");
    } else {
      searchBody = [notes, filename].filter(Boolean).join("\n");
    }
    if (!args.skipOcrHint && String(contentType).toLowerCase().startsWith("image/")) {
      ocrHint = { bytes, contentType };
    }
  } else {
    contentSha = digestBytes(new TextEncoder().encode(notes || title || id));
    byteSize = new TextEncoder().encode(notes || "").length;
  }
  let finalTitle = String(title || "").trim();
  if (!finalTitle) finalTitle = filename || id;
  if (!finalTitle) {
    const err = new Error("title or file required");
    err.status = 400;
    throw err;
  }
  // Front-door auto domain classification when domain/subjects empty or weak.
  try {
    const auto = applyAutoClassification({
      title: finalTitle,
      body: searchBody || notes,
      domain: domainIn,
      subjects: subjectsIn,
      keywords: keywordsIn,
      filename,
      author: biblioAuthor,
    });
    if (auto && auto.auto) {
      domainIn = csvField(auto.domain) || domainIn;
      subjectsIn = csvField(auto.subjects) || subjectsIn;
    }
  } catch { /* classification optional */ }
  const metaBits = [biblioAuthor, domainIn, subjectsIn, keywordsIn].filter(Boolean);
  if (metaBits.length) {
    searchBody = [searchBody, metaBits.join("\n")].filter(Boolean).join("\n\n");
  }
  await env.DB.prepare(
    "INSERT INTO records(record_id,title,body,created_by,created_utc,library,filename,content_type,object_key,byte_size,author,domain,subjects,keywords,content_sha256) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    id, finalTitle, searchBody || "", who, new Date().toISOString(), library, filename, contentType, objectKey, byteSize, biblioAuthor || null, domainIn || null, subjectsIn || null, keywordsIn || null, contentSha
  ).run();
  if (duplicateOf) {
    await appendLedger(env, "DUPLICATE_SEEN", { record_id: id, existing_record_id: duplicateOf, library, sha256: contentSha, filename, byte_size: byteSize, title: finalTitle, created_by: who });
  }
  const ingestPayload = { record_id: id, library, sha256: contentSha, filename, byte_size: byteSize, title: finalTitle, created_by: who };
  await appendLedger(env, "INGEST", ingestPayload);
  await appendDocumentLedger(env, id, "INGEST", ingestPayload);
  let succession = null;
  let successionCoverage = 0;
  try {
    succession = await applySuccessionForRecord(env, {
      record_id: id,
      title: finalTitle,
      subjects: subjectsIn,
      domain: domainIn,
      keywords: keywordsIn,
      body: searchBody || notes,
      created_utc: new Date().toISOString(),
      content_sha256: contentSha,
      library,
    }, { supersedes, superseded_by: supersededBy });
    successionCoverage = await successionCoverageFor(env, id);
  } catch {
    succession = null;
    successionCoverage = 0;
  }
  let reviewBundle = null;
  try {
    reviewBundle = await reviewAndStore(env, {
      recordId: id,
      library,
      title: finalTitle,
      body: searchBody || notes,
      filename,
      contentType,
      sha256: contentSha,
      author: biblioAuthor,
      bytes: fileBytes,
      createdBy: who,
      event: "verified_ingest",
      coverage: successionCoverage,
    });
    try { await rescoreSuccessionMembers(env, id, { skip: id }); } catch { /* peers optional */ }
  } catch {
    reviewBundle = null;
  }
  let zsolver = null;
  try {
    zsolver = await scoreZsolverForRecord(env, {
      record_id: id,
      title: finalTitle,
      body: searchBody || notes,
      filename,
      subjects: subjectsIn,
      keywords: keywordsIn,
    });
  } catch { zsolver = null; }
  try {
    await maybeRescoreZsolverOnFirstHandPatternBreak(env, {
      record_id: id,
      title: finalTitle,
      body: searchBody || notes,
      filename,
      subjects: subjectsIn,
      keywords: keywordsIn,
      zsolver_json: zsolver ? JSON.stringify(zsolver) : null,
    }, succession && succession.cite);
  } catch { /* first-hand pattern-break rescore optional */ }
  return {
    id,
    library,
    title: finalTitle,
    object_key: objectKey,
    author: biblioAuthor,
    domain: domainIn,
    subjects: subjectsIn,
    keywords: keywordsIn,
    ocrHint,
    extractText: searchBody,
    content_sha256: contentSha,
    signed,
    quarantine_status: reviewBundle && reviewBundle.quarantine_status,
    review: reviewBundle && reviewBundle.review,
    lattice_tip: reviewBundle && reviewBundle.tip,
    succession: succession && succession.cite,
    zsolver,
  };
}


export async function serveFile(env, recordId) {
  const id = String(recordId || "").trim();
  if (!id || !env || !env.DB) {
    return jsonErr("not found", 404);
  }
  let row;
  try {
    row = await env.DB.prepare(
      "SELECT record_id, title, body, filename, content_type, object_key, byte_size, library, author, content_sha256, quarantine_status, triad_combined FROM records WHERE record_id=?"
    ).bind(id).first();
  } catch {
    row = await env.DB.prepare(
      "SELECT record_id, title, body, filename, content_type, object_key, byte_size, library, author, content_sha256 FROM records WHERE record_id=?"
    ).bind(id).first();
  }
  if (!row) return jsonErr("not found", 404);
  let bytes = null;
  let obj = null;
  if (row.object_key) {
    if (!env.FILES) return jsonErr("files binding missing", 500);
    obj = await getObject(env, row.object_key);
    if (obj) bytes = await readObjectBytes(obj);
    if (!bytes) return jsonErr("stored file unreadable", 500);
  }
  if (!bytes) {
    // Text-only records (no object_key) may serve notes; never substitute notes for a missing binary.
    const text = String(row.body || row.title || row.record_id);
    bytes = new TextEncoder().encode(text);
  }
  const ct = row.object_key
    ? (row.content_type || (obj && obj.httpMetadata && obj.httpMetadata.contentType) || "application/octet-stream")
    : "text/plain; charset=utf-8";
  const name = safeFilename(row.filename || (row.object_key ? "file" : (row.title || row.record_id) + ".txt"));
  let verify = null;
  try {
    verify = await reviewAndStore(env, {
      recordId: row.record_id,
      library: row.library,
      title: row.title,
      body: row.body,
      filename: name,
      contentType: ct,
      sha256: row.content_sha256,
      author: row.author,
      bytes,
      createdBy: "download",
      event: "download_verify",
      liveClce: false,
    });
  } catch { verify = null; }
  try {
    await appendDocumentLedger(env, row.record_id, "DOWNLOAD", {
      record_id: row.record_id,
      library: row.library,
      sha256: row.content_sha256,
      filename: name,
      quarantine_status: (verify && verify.quarantine_status) || row.quarantine_status || "CLEAR",
    });
  } catch { /* document chain */ }
  const q = String((verify && verify.quarantine_status) || row.quarantine_status || "CLEAR").toUpperCase();
  const inline = /^image\//i.test(ct) || ct === "application/pdf" || /\.(pdf|png|jpe?g|gif|webp|svg)$/i.test(name);
  const headers = new Headers();
  headers.set("Content-Type", ct);
  headers.set("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${name.replaceAll('"', "")}"`);
  headers.set("Cache-Control", "public, max-age=3600");
  headers.set("Content-Length", String(bytes.byteLength || bytes.length));
  if (row.content_sha256) headers.set("X-Aziel-SHA256", row.content_sha256);
  if (verify && verify.structure) headers.set("X-Aziel-Structure", verify.structure.ok ? "VERIFIED" : "FAILED");
  headers.set("X-Aziel-Quarantine", q);
  const triad = verify && verify.review && verify.review.triad;
  if (triad && triad.combined != null) headers.set("X-Aziel-Triad", String(triad.combined));
  else if (row.triad_combined != null) headers.set("X-Aziel-Triad", String(row.triad_combined));
  headers.set("X-Aziel-Downloadable", "1");
  for (const [k, v] of Object.entries(cors())) headers.set(k, v);
  return new Response(bytes, { status: 200, headers });
}

export async function serveDerived(env, derivedId) {
  const id = String(derivedId || "").trim();
  if (!id || !env || !env.DB) return jsonErr("not found", 404);
  let row = null;
  try {
    row = await env.DB.prepare(
      "SELECT derived_id, record_id, artifact_type, object_key, content_sha256 FROM derived_artifacts WHERE derived_id=?"
    ).bind(id).first();
  } catch {
    row = null;
  }
  if (!row || !row.object_key) return jsonErr("not found", 404);
  if (!env.FILES) return jsonErr("files binding missing", 500);
  const obj = await getObject(env, row.object_key);
  if (!obj) return jsonErr("not found", 404);
  const ct = (obj.httpMetadata && obj.httpMetadata.contentType) || "image/png";
  const name = safeFilename(id + (String(row.artifact_type || "").toLowerCase().includes("overlay") ? ".png" : ".bin"));
  const headers = new Headers();
  headers.set("Content-Type", ct);
  headers.set("Content-Disposition", `inline; filename="${name.replaceAll('"', "")}"`);
  headers.set("Cache-Control", "public, max-age=3600");
  for (const [k, v] of Object.entries(cors())) headers.set(k, v);
  return new Response(obj.body, { status: 200, headers });
}

function jsonErr(error, status) {
  return new Response(JSON.stringify({ error }, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors() },
  });
}
