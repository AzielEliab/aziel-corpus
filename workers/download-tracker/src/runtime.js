/**
 * Aziel Corpus Library hosted runtime.
 * /v1 never touches DOWNLOADS KV.
 * Author: Aziel Eliab.
 */
import { WORKS_DOC } from "./works.js";

const PRODUCT = "aziel-corpus";
const VERSION = "0.1.0";
const SPEC = "aziel-corpus-v0";
const HOST = "https://www.azielcorpuslibrary.net";
const FALLBACK_HOST = "https://aziel-corpus-download-tracker.vibelock.workers.dev";
const CATALOG = "https://aziel-runtime.vibelock.workers.dev";
const PROTOCOL = "2025-03-26";
const EXAMPLE_PAYLOAD = { q: "lock" };

export const LIMITATION =
  "THIS IS: a public library index of Aziel Eliab software plus a counted download of the printed 468-page corpus PDF and the library package. THIS IS NOT: a search engine of private files; Zenodo; a new Lock engine; Horton; Revealer. GodLock is a product name in the corpus. Author Aziel Eliab only.";

const SKILL = `---
name: Aziel Corpus Library
description: Use when an assistant should look up Aziel Eliab software in the public library index, list works, search works, or fetch the counted corpus PDF / package via hosted /v1 or aziel-runtime.
---

# Aziel Corpus Library

Public library of Aziel Eliab software. Counted views and downloads. Author: **Aziel Eliab**.

**THIS IS:** a public library index of Aziel Eliab software plus a counted download of the printed 468-page corpus PDF and the library package.

**THIS IS NOT:** a search engine of private files; Zenodo; a new Lock engine. GodLock is a product name in the corpus, not identity.

Always send \`User-Agent: Mozilla/5.0\`. Cloudflare Workers may 403 an empty agent.

## Call these URLs

- Library: ${HOST}/
- Fallback Worker: ${FALLBACK_HOST}/
- Worker OpenAPI: ${HOST}/openapi.json
- Catalog OpenAPI: ${CATALOG}/openapi.json
- MCP: \`POST ${CATALOG}/mcp\`
- Live skill (this markdown): \`GET ${HOST}/v1/skill\`

Ops (do **not** increment downloads or views):

- \`GET /v1/health\`
- \`GET /v1/works\` — JSON list of indexed works
- \`GET /v1/search?q=\` — search works
- \`GET /v1/example\` — sample search payload
- \`GET /v1/skill\` — this file

Catalog aliases: \`GET /p/aziel-corpus/health\`, \`GET /p/aziel-corpus/works\`, \`GET /p/aziel-corpus/search\`, \`GET /p/aziel-corpus/skill\`.

MCP tools: \`aziel-corpus_health\`, \`aziel-corpus_works\`, \`aziel-corpus_search\`, \`aziel-corpus_skill\`.

Grok: import OpenAPI as a custom tool. ChatGPT: GPT Actions. Venice: HTTP tools.

## Example

\`\`\`bash
curl -s -A 'Mozilla/5.0' ${HOST}/v1/health
curl -s -A 'Mozilla/5.0' ${HOST}/v1/works
curl -s -A 'Mozilla/5.0' '${HOST}/v1/search?q=lock'
curl -s -A 'Mozilla/5.0' ${CATALOG}/p/aziel-corpus/skill
\`\`\`

## Local (after one-click install)

\`\`\`bash
curl -fsSL ${HOST}/install.sh | bash
aziel-corpus ui
aziel-corpus doctor
aziel-corpus search lock
\`\`\`

Local UI: Import JSON file and Export JSON of the works list. Loopback http://127.0.0.1:8890. Apache-2.0. Forks welcome.
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

function html(body) {
  return new Response(body, {
    headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() },
  });
}

function originOf(request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return HOST;
  }
}

export function listWorks() {
  return Array.isArray(WORKS_DOC.works) ? WORKS_DOC.works : [];
}

export function searchWorks(q) {
  const needle = String(q || "").trim().toLowerCase();
  const works = listWorks();
  if (!needle) return works;
  return works.filter((w) => {
    const hay = [w.slug, w.name, w.one_line, w.banner, w.kind, w.github, w.worker]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });
}

function openapiSpec(origin) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Aziel Corpus Library runtime",
      version: VERSION,
      summary: "Public library index of Aziel Eliab software. Counted PDF and package download. Not Zenodo. Not a new Lock engine.",
      description: LIMITATION,
      license: { name: "Apache-2.0", identifier: "Apache-2.0" },
      contact: { name: "Aziel Eliab", url: "https://github.com/AzielEliab/aziel-corpus" },
    },
    servers: [{ url: origin }, { url: HOST }, { url: FALLBACK_HOST }],
    paths: {
      "/v1/health": {
        get: {
          operationId: "aziel-corpus_health",
          summary: "Liveness. Does not increment download KV.",
          responses: { "200": { description: "ok" } },
        },
      },
      "/v1/works": {
        get: {
          operationId: "aziel-corpus_works",
          summary: "JSON list of indexed works. Does not increment downloads.",
          responses: { "200": { description: "works document" } },
        },
      },
      "/v1/search": {
        get: {
          operationId: "aziel-corpus_search",
          summary: "Search works by q=. Does not increment downloads.",
          parameters: [{ name: "q", in: "query", schema: { type: "string" } }],
          responses: { "200": { description: "matching works" } },
        },
      },
      "/v1/example": {
        get: {
          operationId: "aziel-corpus_example",
          summary: "Sample JSON payload. Does not increment downloads.",
          responses: { "200": { description: "OK" } },
        },
      },
      "/v1/skill": {
        get: {
          operationId: "aziel-corpus_skill",
          summary: "Return Aziel Corpus Library skill markdown. Does not increment downloads or views.",
          responses: { "200": { description: "text/markdown skill body" } },
        },
      },
    },
  };
}

function aiHtml(origin) {
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aziel Corpus Library — AI runtime</title>
<style>
  :root { color-scheme: dark; }
  body { font: 16px/1.45 system-ui, sans-serif; max-width: 44rem; margin: 3rem auto; padding: 0 1.25rem; background: #0e1014; color: #e8eaef; }
  a { color: #c9d4ff; }
  .banner { border: 1px solid #5c4a1a; background: #241c0d; color: #f0d78c; padding: .85rem 1rem; border-radius: 8px; }
  pre { background: #151922; padding: .85rem 1rem; overflow: auto; border-radius: 8px; }
</style>
<body>
<h1>Aziel Corpus Library runtime</h1>
<p class="banner">${LIMITATION}</p>
<p>OpenAPI: <a href="${origin}/openapi.json">${origin}/openapi.json</a></p>
<p>MCP: POST <code>${origin}/mcp</code> · Catalog: <a href="${CATALOG}/">${CATALOG}</a></p>
<pre>curl -A Mozilla/5.0 ${origin}/v1/health
curl -A Mozilla/5.0 ${origin}/v1/works
curl -A Mozilla/5.0 '${origin}/v1/search?q=lock'
curl -A Mozilla/5.0 ${origin}/v1/skill</pre>
<p>GET under <code>/v1</code> never increment the download counter. Not Zenodo. Not a new Lock engine.</p>
<p><a href="/">Library</a></p>
</body></html>`;
}

function mcpTools() {
  return [
    { name: "aziel-corpus_health", description: "Liveness. Does not increment download KV.", inputSchema: { type: "object" } },
    { name: "aziel-corpus_works", description: "JSON list of indexed Aziel Eliab works. Does not increment downloads.", inputSchema: { type: "object" } },
    {
      name: "aziel-corpus_search",
      description: "Search the public library index by q. Not a private-file search engine.",
      inputSchema: { type: "object", properties: { q: { type: "string" } }, additionalProperties: true },
    },
    { name: "aziel-corpus_skill", description: "Return Aziel Corpus Library skill markdown. Does not increment downloads or views.", inputSchema: { type: "object" } },
  ];
}

async function handleMcp(request, url) {
  if (request.method === "GET") {
    return json({
      ok: true,
      transport: "JSON-RPC MCP-over-HTTP",
      endpoint: "POST /mcp",
      methods: ["initialize", "tools/list", "tools/call", "ping"],
      auth: "none (public)",
      limitation: LIMITATION,
    });
  }
  if (request.method !== "POST") return json({ error: "POST JSON-RPC to /mcp" }, 405);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
  }
  const id = body && body.id !== undefined ? body.id : null;
  const method = body && body.method;
  const params = (body && body.params) || {};
  const result = (value) => json({ jsonrpc: "2.0", id, result: value });
  if (method === "initialize") {
    return result({
      protocolVersion: PROTOCOL,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: PRODUCT, version: VERSION },
      instructions: LIMITATION,
    });
  }
  if (method === "notifications/initialized" || method === "initialized") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (method === "ping") return result({});
  if (method === "tools/list") return result({ tools: mcpTools() });
  if (method === "tools/call") {
    const name = params.name;
    const args = params.arguments || params.input || {};
    let payload;
    if (name === "aziel-corpus_health") {
      payload = { ok: true, product: PRODUCT, version: VERSION, kv_increment: false, limitation: LIMITATION, author: "Aziel Eliab" };
    } else if (name === "aziel-corpus_works") {
      payload = { ...WORKS_DOC, kv_increment: false };
    } else if (name === "aziel-corpus_search") {
      const q = args.q != null ? args.q : url.searchParams.get("q") || "";
      const hits = searchWorks(q);
      payload = { ok: true, q, count: hits.length, works: hits, kv_increment: false, limitation: LIMITATION };
    } else if (name === "aziel-corpus_skill") {
      payload = { markdown: SKILL, kv_increment: false, limitation: LIMITATION };
    } else {
      payload = { error: "unknown tool", name };
    }
    return result({ content: [{ type: "text", text: JSON.stringify(payload) }], isError: Boolean(payload.error) });
  }
  return json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
}

export async function handleRuntimeApi(request, url) {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/mcp") return handleMcp(request, url);
  if (path === "/v1/skill" && request.method === "GET") {
    return new Response(SKILL, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "private, no-store",
        ...corsHeaders(),
      },
    });
  }
  if (path === "/v1/health" && request.method === "GET") {
    return json({
      ok: true,
      product: PRODUCT,
      version: VERSION,
      spec: SPEC,
      runtime: true,
      kv_increment: false,
      limitation: LIMITATION,
      catalog: CATALOG,
      library: HOST,
      library_fallback: FALLBACK_HOST,
      author: "Aziel Eliab",
      works: listWorks().length,
    });
  }
  if (path === "/v1/example" && (request.method === "GET" || request.method === "HEAD")) {
    return json({
      ok: true,
      product: PRODUCT,
      author: "Aziel Eliab",
      example: EXAMPLE_PAYLOAD,
      note: "Sample payload only. Does not increment downloads.",
    });
  }
  if (path === "/v1/works" && request.method === "GET") {
    return json({ ...WORKS_DOC, kv_increment: false });
  }
  if (path === "/v1/search" && request.method === "GET") {
    const q = url.searchParams.get("q") || "";
    const hits = searchWorks(q);
    return json({
      ok: true,
      q,
      count: hits.length,
      works: hits,
      kv_increment: false,
      limitation: LIMITATION,
      author: "Aziel Eliab",
    });
  }
  if (path === "/openapi.json" && request.method === "GET") {
    return json(openapiSpec(originOf(request)));
  }
  if ((path === "/ai" || url.pathname === "/ai/") && request.method === "GET") {
    return html(aiHtml(originOf(request)));
  }
  if (path.startsWith("/v1/") || path === "/v1") {
    return json(
      {
        error: "not found",
        hint: "GET /v1/health  GET /v1/works  GET /v1/search?q=  GET /v1/example  GET /v1/skill",
        limitation: LIMITATION,
      },
      404,
    );
  }
  return null;
}
