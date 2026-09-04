/**
 * Aziel Digital Library hosted runtime. /v1 never touches DOWNLOADS KV.
 * Author: Aziel Eliab.
 */
import { searchRecords } from "./library.js";
import { receiptForRecord } from "./ledger.js";
import { loadRecordReview, runReviewBundle } from "./review-store.js";
import { latticeAnchorTip, LATTICE_NOTE } from "./lattice.js";
const PRODUCT = "aziel-corpus";
const VERSION = "2.7.0";
const SPEC = "aziel-digital-library-v2.7.0";
const HOST = "https://www.azielcorpuslibrary.net";
const FALLBACK_HOST = "https://aziel-corpus-download-tracker.vibelock.workers.dev";
const CATALOG = "https://aziel-runtime.vibelock.workers.dev";
const PROTOCOL = "2025-03-26";

export const LIMITATION =
  "THIS IS: Aziel Digital Library v2.7.0 — a self-contained immutable local digital library and intelligence runtime with poison immunity, PhysLing Review, unranked Bayesian peer scores, and full-structure verify on upload/download. The public site is the MASTER (writable for signed-in accounts; anonymous GET is read-only). Operator writes go to Aziel Library only; public/anonymous writes go to Corpus only (Lamb Lens). The live HTTPS site is NOT a mesh. THIS IS NOT: a 26-card software index; Zenodo; Horton; OpenAI; a Tor/VPN; a guilt verdict. Author Aziel Eliab only.";

export const SKILL = `---
name: Aziel Digital Library
description: Use when an assistant should search the Aziel Digital Library master corpus, check health, review scores, or fetch the counted software zip via hosted /v1 or aziel-runtime.
---

# Aziel Digital Library v2.7.0

Self-contained immutable local digital library and intelligence runtime. Public site is MASTER. Anonymous GET is read-only. Signed-in accounts may ingest. Author: **Aziel Eliab**.

**THIS IS:** Aziel Digital Library v2.7.0 (search, records, map, gazetteer, counted zip, poison immunity, PhysLing Review, unranked Bayesian scores).

**THIS IS NOT:** a 26-card software index. Not Zenodo. Not Horton. Not a mesh. Not a guilt engine.

Always send \`User-Agent: Mozilla/5.0\`.

## Call these URLs

- Library: ${HOST}/
- Fallback Worker: ${FALLBACK_HOST}/
- Worker OpenAPI: ${HOST}/openapi.json
- Catalog OpenAPI: ${CATALOG}/openapi.json
- MCP: \`POST ${CATALOG}/mcp\`
- Live skill: \`GET ${HOST}/v1/skill\`

Ops (do **not** increment downloads):

- \`GET /v1/health\`
- \`GET /v1/search?q=\`
- \`GET /v1/example\`
- \`GET /v1/skill\`
- \`GET /v1/review?record_id=\`
- \`GET /v1/lattice?record_id=\`
- \`POST /v1/score\` (document review preview)

Catalog aliases: \`GET /p/aziel-corpus/health\`, \`GET /p/aziel-corpus/search\`, \`GET /p/aziel-corpus/skill\`.

MCP tools: \`aziel-corpus_health\`, \`aziel-corpus_search\`, \`aziel-corpus_skill\`.

## Example

\`\`\`bash
curl -s -A 'Mozilla/5.0' ${HOST}/v1/health
curl -s -A 'Mozilla/5.0' '${HOST}/v1/search?q=Florence'
curl -s -A 'Mozilla/5.0' ${HOST}/v1/skill
\`\`\`

## Local

\`\`\`bash
curl -fsSL ${HOST}/install.sh | bash
python3 aziel_launcher.py
\`\`\`

Local MASTER is writable on http://127.0.0.1:8765. Apache-2.0. Forks welcome.
`;

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id",
  };
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() },
  });
}

function openapi() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Aziel Digital Library",
      version: VERSION,
      description: LIMITATION,
      contact: { name: "Aziel Eliab", url: HOST },
      license: { name: "Apache-2.0" },
    },
    servers: [{ url: HOST }, { url: FALLBACK_HOST }],
    paths: {
      "/v1/health": { get: { summary: "Liveness. Does not increment downloads.", operationId: "health" } },
      "/v1/search": { get: { summary: "Search published records in both libraries.", operationId: "search", parameters: [{ name: "q", in: "query", schema: { type: "string" } }, { name: "lib", in: "query", schema: { type: "string", enum: ["all", "aziel", "corpus"] } }, { name: "sort", in: "query", schema: { type: "string", enum: ["newest", "oldest", "alpha", "title", "author", "domain"] } }, { name: "author", in: "query", schema: { type: "string" } }, { name: "domain", in: "query", schema: { type: "string" } }, { name: "subject", in: "query", schema: { type: "string" } }, { name: "keyword", in: "query", schema: { type: "string" } }] } },
      "/v1/example": { get: { summary: "Sample search payload.", operationId: "example" } },
      "/v1/skill": { get: { summary: "Skill markdown.", operationId: "skill" } },
      "/v1/review": { get: { summary: "SPRE + CLCE + PhysLing + Bayesian + quarantine for one record. Unranked. Does not increment downloads.", operationId: "review", parameters: [{ name: "record_id", in: "query", required: true, schema: { type: "string" } }] } },
      "/v1/lattice": { get: { summary: "AzielTether lattice anchor tip for a verified record. Public site is not a mesh.", operationId: "lattice", parameters: [{ name: "record_id", in: "query", required: true, schema: { type: "string" } }] } },
      "/v1/score": { post: { summary: "Preview document review (SPRE, CLCE port, PhysLing, poison, Bayesian). Advisory. Does not write.", operationId: "score" } },
    },
  };
}

export async function handleRuntimeApi(request, url, env) {
  const path = url.pathname.replace(/\/$/, "") || "/";
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (path === "/openapi.json" && request.method === "GET") return json(openapi());
  if (path === "/v1" || path === "/v1/health") {
    if (request.method !== "GET") return json({ error: "GET only" }, 405);
    return json({
      ok: true,
      product: PRODUCT,
      name: "Aziel Digital Library",
      version: VERSION,
      spec: SPEC,
      mode: "master",
      limitation: LIMITATION,
      author: "Aziel Eliab",
      host: HOST,
      catalog: CATALOG,
      protocol: PROTOCOL,
      review: {
        spre: "Source Provenance Reliability Engine (no guilt verdict)",
        clce: "AZ-CLCE Jaccard port + optional live /v1/score",
        plr: "PhysLing Review",
        poison: "hash-chained quarantine, never silent delete",
        bayesian: "unranked peer score, never default shelf sort",
        lattice: "aziel.lattice.anchor.v1 for AzielTether; site is not a mesh",
      },
    });
  }
  if (path === "/v1/skill" && request.method === "GET") {
    return new Response(SKILL, {
      status: 200,
      headers: { "Content-Type": "text/markdown; charset=utf-8", ...corsHeaders() },
    });
  }
  if (path === "/v1/example" && request.method === "GET") {
    return json({ q: "Florence" });
  }
  if (path === "/v1/search" && request.method === "GET") {
    const q = (url.searchParams.get("q") || "").trim();
    const lib = (url.searchParams.get("lib") || "all").trim() || "all";
    const sort = (url.searchParams.get("sort") || "newest").trim() || "newest";
    const author = (url.searchParams.get("author") || "").trim();
    const domain = (url.searchParams.get("domain") || "").trim();
    const subject = (url.searchParams.get("subject") || "").trim();
    const keyword = (url.searchParams.get("keyword") || "").trim();
    const rows = await searchRecords(env, { q, library: lib, sort, author, domain, subject, keyword, limit: 50 });
    return json({ ok: true, q, lib, sort, author, domain, subject, keyword, results: rows, bayesian_unranked: true, limitation: LIMITATION });
  }
  if (path === "/v1/review" && request.method === "GET") {
    const recordId = (url.searchParams.get("record_id") || url.searchParams.get("id") || "").trim();
    if (!recordId) return json({ error: "record_id required" }, 400);
    const receipt = await receiptForRecord(env, recordId);
    if (!receipt) return json({ error: "not found" }, 404);
    const extra = await loadRecordReview(env, { record_id: recordId, review_json: receipt.review ? JSON.stringify(receipt.review) : null, lattice_tip_json: receipt.lattice_tip ? JSON.stringify(receipt.lattice_tip) : null, quarantine_status: receipt.quarantine_status });
    return json({ ok: true, record_id: recordId, ...extra, bayesian_unranked: true, limitation: LIMITATION });
  }
  if (path === "/v1/lattice" && request.method === "GET") {
    const recordId = (url.searchParams.get("record_id") || url.searchParams.get("id") || "").trim();
    if (!recordId) return json({ error: "record_id required", note: LATTICE_NOTE }, 400);
    const extra = await loadRecordReview(env, { record_id: recordId });
    const tip = extra.tip || latticeAnchorTip({ record_id: recordId, event: "lookup" });
    return json({ ok: true, tip, note: LATTICE_NOTE, limitation: LIMITATION });
  }
  if (path === "/v1/score" && request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "JSON body required" }, 400); }
    const bundle = await runReviewBundle({
      title: body.title || body.r || "",
      body: body.body || body.d || "",
      filename: body.filename || "",
      sha256: body.sha256 || "",
      author: body.author || "",
      library: body.library || "corpus",
      liveClce: false,
    });
    return json({ ok: true, ...bundle, bayesian_unranked: true, limitation: LIMITATION });
  }
  if (path.startsWith("/v1/")) return json({ error: "not found" }, 404);
  return null;
}
