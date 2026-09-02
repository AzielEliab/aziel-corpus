/**
 * Aziel Digital Library hosted runtime. /v1 never touches DOWNLOADS KV.
 * Author: Aziel Eliab.
 */
import { searchRecords } from "./library.js";
const PRODUCT = "aziel-corpus";
const VERSION = "2.6.2";
const SPEC = "aziel-digital-library-v2.6.2";
const HOST = "https://www.azielcorpuslibrary.net";
const FALLBACK_HOST = "https://aziel-corpus-download-tracker.vibelock.workers.dev";
const CATALOG = "https://aziel-runtime.vibelock.workers.dev";
const PROTOCOL = "2025-03-26";

export const LIMITATION =
  "THIS IS: Aziel Digital Library v2.6.2 — a self-contained immutable local digital library and intelligence runtime. The public site is the MASTER (writable for signed-in accounts; anonymous GET is read-only). THIS IS NOT: a 26-card software index; Zenodo; Horton; OpenAI. Author Aziel Eliab only.";

export const SKILL = `---
name: Aziel Digital Library
description: Use when an assistant should search the Aziel Digital Library master corpus, check health, or fetch the counted v2.6.2 software zip via hosted /v1 or aziel-runtime.
---

# Aziel Digital Library v2.6.2

Self-contained immutable local digital library and intelligence runtime. Public site is MASTER. Anonymous GET is read-only. Signed-in accounts may ingest. Author: **Aziel Eliab**.

**THIS IS:** Aziel Digital Library v2.6.2 (search, records, map, gazetteer, counted zip).

**THIS IS NOT:** a 26-card software index. Not Zenodo. Not Horton.

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
    return json({ ok: true, q, lib, sort, author, domain, subject, keyword, results: rows, limitation: LIMITATION });
  }
  if (path.startsWith("/v1/")) return json({ error: "not found" }, 404);
  return null;
}
