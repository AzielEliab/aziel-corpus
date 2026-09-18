/**
 * Library MCP + JSON ingest for AI clients.
 * Hub writes only. Operator token → live azlibrary. Public session → Corpus.
 * Anonymous JSON ingest refused. Mesh Cap-7 names are not write targets.
 * Author: Aziel Eliab only.
 */
import { isOperatorRequest } from "./rate-limit.js";
import { isOperator, operatorSession, normalizeContentHash } from "./library.js";
import { jeevesUpload } from "./jeeves.js";
import { operatorLibraryIngest } from "./operator-ingest.js";
import {
  AUTHOR,
  AI_PATH_NOTE,
  DUAL_SURFACE,
  HONESTY,
  MCP_TOOLS,
} from "./ai-surface.js";
import { designBySlug, designPackDoc, designPackIndex } from "./design-pack.js";
import { LIBRARY_INDEX_KEY, packedRecordCounts, publicSearchCard, readPackedIndex, searchPackedRecords } from "./library-index.js";
import { matchPublishedTip, ingestVerifyJson, LOCKSET_TIP } from "./ingest-receipt.js";
import { HOST } from "./runtime-copy.js";

const PROTOCOL = "2025-03-26";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id, Authorization, X-Aziel-Operator-Token",
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() },
  });
}

function parseIngestFieldsFromObject(body) {
  const out = {
    file: null,
    title: body.title || "",
    body: body.body || body.notes || "",
    author: body.author || "",
    domain: body.domain || "",
    subjects: body.subjects || "",
    keywords: body.keywords || "",
    supersedes: body.supersedes || "",
    superseded_by: body.superseded_by || "",
  };
  if (body.markdown || body.text) {
    const md = String(body.markdown || body.text);
    const name = String(body.filename || "record.md");
    out.file = new File([md], name, { type: "text/markdown" });
  }
  return out;
}

export async function parseLibraryIngestBody(request) {
  const ct = request.headers.get("Content-Type") || "";
  if (ct.includes("multipart/form-data")) {
    const form = await request.formData();
    const out = {
      file: form.get("file"),
      title: form.get("title") || "",
      body: form.get("body") || form.get("notes") || "",
      author: form.get("author") || "",
      domain: form.get("domain") || "",
      subjects: form.get("subjects") || "",
      keywords: form.get("keywords") || "",
      supersedes: form.get("supersedes") || "",
      superseded_by: form.get("superseded_by") || "",
    };
    return out;
  }
  const body = await request.json();
  return parseIngestFieldsFromObject(body || {});
}

async function sessionFromRequest(env, request) {
  const raw = request.headers.get("Cookie") || "";
  const m = raw.match(/(?:^|;\s*)aziel_session=([^;]+)/);
  if (!m || !env || !env.DB) return null;
  try {
    const token = decodeURIComponent(m[1]);
    const row = await env.DB.prepare("SELECT * FROM sessions WHERE token=?").bind(token).first();
    if (!row) return null;
    if (row.expires_utc && row.expires_utc < new Date().toISOString()) return null;
    return row;
  } catch {
    return null;
  }
}

function anonymousIngestRefuse() {
  return {
    ok: false,
    error: "sign in or operator token required for AI / JSON ingest",
    status: 401,
    ai_path: AI_PATH_NOTE,
    human_anonymous: "POST /ingest from the homepage HTML form may file Corpus as a guest. That is not this JSON door.",
    mesh_write: false,
    honesty: HONESTY,
    author: AUTHOR,
  };
}

export async function libraryIngest(env, { signed, request, file, title, body, author, domain, subjects, keywords, supersedes, superseded_by }) {
  const who = signed || null;
  const operator = isOperator(who) || isOperatorRequest(request, env, who);
  if (!who && !operator) {
    const err = new Error(anonymousIngestRefuse().error);
    err.status = 401;
    err.payload = anonymousIngestRefuse();
    throw err;
  }
  if (operator) {
    const out = await operatorLibraryIngest(env, {
      signed: who,
      request,
      file,
      title,
      body,
      author,
      domain,
      subjects,
      keywords,
      supersedes,
      superseded_by,
    });
    return {
      ...out,
      hub_write: true,
      mesh_write: false,
      writes: "live hub azlibrary",
      cap7_name: null,
      honesty: HONESTY,
      dual_surface: DUAL_SURFACE,
    };
  }
  const out = await jeevesUpload(env, {
    signed: who,
    file,
    title,
    body,
    author,
    domain,
    subjects,
    keywords,
    supersedes,
    superseded_by,
  });
  return {
    ...out,
    hub_write: true,
    mesh_write: false,
    writes: "live hub Corpus (Lamb Lens)",
    cap7_name: null,
    honesty: HONESTY,
    dual_surface: DUAL_SURFACE,
  };
}

export async function handleLibraryIngestApi(request, url, env, signed) {
  const path = url.pathname.replace(/\/$/, "") || "/";
  if (path !== "/v1/ingest") return null;
  if (request.method === "OPTIONS") return json({ ok: true }, 200);
  if (request.method !== "POST") return json({ error: "POST required" }, 405);
  let who = signed || (await sessionFromRequest(env, request));
  if (isOperatorRequest(request, env, who)) who = operatorSession();
  let fields;
  try {
    fields = await parseLibraryIngestBody(request);
  } catch {
    return json({ error: "multipart or JSON body required", honesty: HONESTY }, 400);
  }
  try {
    return json(await libraryIngest(env, { signed: who, request, ...fields }));
  } catch (err) {
    if (err && err.payload) return json(err.payload, err.status || 401);
    return json({ error: err && err.message ? err.message : "ingest failed", honesty: HONESTY }, err && err.status ? err.status : 400);
  }
}

export function mcpToolsList() {
  return [
    {
      name: "aziel-corpus_health",
      description: "Library liveness. Does not increment downloads. Author Aziel Eliab.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    {
      name: "aziel-corpus_search",
      description: "Search packed MASTER cards (titles, hashes). No PDF bodies.",
      inputSchema: {
        type: "object",
        properties: { q: { type: "string" }, lib: { type: "string", enum: ["all", "aziel", "corpus"] } },
      },
    },
    {
      name: "aziel-corpus_skill",
      description: "Library skill markdown for AI clients.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    {
      name: "aziel-corpus_download",
      description: "Pull a record by content SHA-256 or AZDOC id. Returns URLs + honesty. Public GET.",
      inputSchema: {
        type: "object",
        properties: {
          hash: { type: "string", description: "64-hex content SHA-256" },
          record_id: { type: "string", description: "AZDOC-…" },
        },
      },
    },
    {
      name: "aziel-corpus_ingest",
      description:
        "Upload/ingest a receipt on the live hub. Session → Corpus. Operator token → live azlibrary only. "
        + "Refuses anonymous JSON and Cap-7 mesh writes.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          notes: { type: "string" },
          markdown: { type: "string" },
          text: { type: "string" },
          filename: { type: "string" },
          author: { type: "string" },
          domain: { type: "string" },
          subjects: { type: "string" },
          keywords: { type: "string" },
        },
      },
    },
    {
      name: "aziel-corpus_design_pack",
      description:
        "Download a first-class website design+content pack (azcorpus Corpus / Lamb Lens, azlibrary royal-purple Aziel Library) "
        + "or a sister-hub design for a qnm/MirageGrid node. Anyone may download. Hash-verify pack_sha256. Names are not ICANN.",
      inputSchema: {
        type: "object",
        properties: { slug: { type: "string", description: "azcorpus | azlibrary | azeliab | godlock | hedidntjump" } },
      },
    },
    {
      name: "aziel-corpus_receipt",
      description: "Verify a pasted SHA-256 against the published lockset tip (yes/no).",
      inputSchema: { type: "object", properties: { hash: { type: "string" } } },
    },
  ];
}

function rpcResult(id, result) {
  return json({ jsonrpc: "2.0", id: id == null ? null : id, result });
}

function rpcError(id, code, message, status = 200) {
  return json({ jsonrpc: "2.0", id: id == null ? null : id, error: { code, message } }, status);
}

async function callTool(name, args, env, request) {
  const a = args && typeof args === "object" ? args : {};
  if (name === "aziel-corpus_health") {
    let packed = { records: [] };
    try { packed = await readPackedIndex(env); } catch { packed = { records: [] }; }
    const counts = packedRecordCounts(packed);
    return {
      ok: true,
      product: "aziel-corpus",
      name: "Aziel Digital Library",
      version: "2.7.0",
      author: AUTHOR,
      host: HOST,
      first_class: ["azcorpus", "azlibrary"],
      products: {
        azcorpus: { browse: HOST + "/corpus", download: "anyone", upload: "session / Lamb Lens Corpus" },
        azlibrary: { browse: HOST + "/aziel-library", download: "anyone", upload: "X-Aziel-Operator-Token on live hub only" },
      },
      dual_surface: DUAL_SURFACE,
      honesty: HONESTY,
      ...counts,
      skill: HOST + "/v1/skill",
      openapi: HOST + "/openapi.json",
      mcp: HOST + "/mcp",
      products_index: HOST + "/v1/products",
      design_pack: HOST + "/v1/design-pack",
    };
  }
  if (name === "aziel-corpus_search") {
    const q = String(a.q || "").trim();
    const lib = String(a.lib || "all").trim() || "all";
    let packed = await readPackedIndex(env);
    if (!Array.isArray(packed.records) || packed.records.length === 0) {
      packed = { records: [] };
    }
    const rows = searchPackedRecords(packed, { q, library: lib, limit: 50 }).map(publicSearchCard).filter(Boolean);
    return {
      ok: true,
      q,
      lib,
      results: rows,
      source: "packed",
      index_key: LIBRARY_INDEX_KEY,
      ...packedRecordCounts(packed),
      honesty: HONESTY,
    };
  }
  if (name === "aziel-corpus_skill") {
    return {
      ok: true,
      url: HOST + "/v1/skill",
      dual_surface: DUAL_SURFACE,
      tools: MCP_TOOLS.slice(),
      note: "GET /v1/skill for full markdown. Compatible OpenAPI at /openapi.json.",
    };
  }
  if (name === "aziel-corpus_download") {
    const hash = normalizeContentHash(a.hash || a.sha256 || "");
    const recordId = String(a.record_id || a.record || "").trim();
    if (hash) {
      return {
        ok: true,
        hash,
        download: "/v1/docs/" + hash + "/download",
        counted: "/download?hash=" + hash,
        file: "/file/" + hash,
        increments: false,
        honesty: HONESTY,
      };
    }
    if (recordId) {
      return {
        ok: true,
        record_id: recordId,
        download: "/file/" + recordId,
        counted: "/download?record=" + recordId,
        increments: true,
        honesty: HONESTY,
      };
    }
    return { ok: false, error: "hash or record_id required", honesty: HONESTY };
  }
  if (name === "aziel-corpus_ingest") {
    let who = await sessionFromRequest(env, request);
    if (isOperatorRequest(request, env, who)) who = operatorSession();
    const fields = parseIngestFieldsFromObject(a);
    return libraryIngest(env, { signed: who, request, ...fields });
  }
  if (name === "aziel-corpus_design_pack") {
    const slug = String(a.slug || "").trim();
    if (!slug) return designPackIndex();
    const design = designBySlug(slug);
    if (!design) return { ok: false, error: "unknown design pack", known: ["azcorpus", "azlibrary", "azeliab", "godlock", "hedidntjump"] };
    let packed = { records: [], index_sha256: "" };
    try { packed = await readPackedIndex(env); } catch { packed = { records: [], index_sha256: "" }; }
    return designPackDoc(design, packed);
  }
  if (name === "aziel-corpus_receipt") {
    const result = matchPublishedTip(a.hash || a.sha256 || "");
    return ingestVerifyJson(result, { published_tip: LOCKSET_TIP });
  }
  return { ok: false, error: "unknown tool", known: MCP_TOOLS.slice() };
}

export async function handleLibraryMcp(request, url, env) {
  const path = url.pathname.replace(/\/$/, "") || "/";
  if (path !== "/mcp") return null;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  if (request.method === "GET" || request.method === "HEAD") {
    const body = {
      ok: true,
      name: "aziel-corpus",
      title: "Aziel Digital Library",
      transport: "http",
      protocol: PROTOCOL,
      author: AUTHOR,
      tools: MCP_TOOLS.slice(),
      dual_surface: DUAL_SURFACE,
      honesty: HONESTY,
      note: "POST JSON-RPC initialize / tools/list / tools/call. Runtime FragGate door stays POST /runtime/mcp.",
    };
    const res = json(body);
    if (request.method === "HEAD") return new Response(null, { status: res.status, headers: res.headers });
    return res;
  }
  if (request.method !== "POST") return json({ error: "POST JSON-RPC required" }, 405);
  let msg;
  try {
    msg = await request.json();
  } catch {
    return rpcError(null, -32700, "parse error", 400);
  }
  const id = msg && msg.id;
  const method = String((msg && msg.method) || "");
  const params = (msg && msg.params) || {};
  if (method === "initialize") {
    return rpcResult(id, {
      protocolVersion: PROTOCOL,
      capabilities: { tools: {} },
      serverInfo: { name: "aziel-corpus", version: "2.7.0", author: AUTHOR },
      instructions: DUAL_SURFACE + " " + AI_PATH_NOTE,
    });
  }
  if (method === "notifications/initialized" || method === "initialized") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (method === "tools/list") {
    return rpcResult(id, { tools: mcpToolsList() });
  }
  if (method === "tools/call") {
    const name = String(params.name || "");
    try {
      const result = await callTool(name, params.arguments || params.input || {}, env, request);
      const text = JSON.stringify(result, null, 2);
      return rpcResult(id, { content: [{ type: "text", text }], structuredContent: result, isError: result && result.ok === false });
    } catch (err) {
      const payload = err && err.payload ? err.payload : { error: err && err.message ? err.message : "tool failed", honesty: HONESTY };
      return rpcResult(id, { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }], structuredContent: payload, isError: true });
    }
  }
  if (method === "ping") return rpcResult(id, {});
  return rpcError(id, -32601, "method not found: " + method);
}
