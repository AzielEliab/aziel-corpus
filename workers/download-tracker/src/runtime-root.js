/**
 * aziel-runtime hosted as the Digital Library AI runtime root.
 * /runtime is the human + AI page. /runtime/* proxies aziel-runtime 1.4.0.
 * Author: Aziel Eliab.
 */
import { page, runtimeBody } from "./ui.js";
import { corsHeaders, json } from "./runtime.js";

export const HOST = "https://www.azielcorpuslibrary.net";
export const RUNTIME_ORIGIN = "https://aziel-runtime.vibelock.workers.dev";
export const RUNTIME_VERSION = "1.4.0";
export const ENGINE_SLUGS = ["ark", "azai", "azclce", "decisiongate", "foldlock", "zsolver"];
const UA = "Mozilla/5.0 AzielDigitalLibrary";

export const RUNTIME_LIMITATION =
  "THIS IS: aziel-runtime 1.4.0 engine-runtime — the AI runtime root for Aziel Eliab products. Prefer same-origin /runtime/*. Catalog, pull, OpenAPI, MCP, skill, and proxy front doors remain. Listed engines (ark, azai, azclce, decisiongate, foldlock, zsolver) run in-process in the Worker isolate; receipts carry engine_digest and ran_in: aziel-runtime. Proxy is not exec. Session is open → policy → exec → receipt → close. Unsupported slugs are explicit proxy_fallback. Hosted on the Digital Library at /runtime. THIS IS NOT: a second software index. The Software tab stays the product-card catalog. The public library MASTER is not a mesh. No invented Zenodo DOIs. Author Aziel Eliab only.";

export function runtimeSkillMd() {
  return `---
name: aziel-runtime
description: Use when an assistant should pull or invoke Aziel Eliab product runtimes from the Digital Library runtime root. Prefer same-origin /runtime/*. Origin is engine-runtime 1.4.0 (in-process engines + engine_digest). Catalog/pull/proxy remain; proxy is not exec.
---

# aziel-runtime

**AI runtime root** for Aziel Eliab products. Hosted on the Digital Library at ${HOST}/runtime. Origin Worker: ${RUNTIME_ORIGIN}/ (**engine-runtime ${RUNTIME_VERSION}**).

**THIS IS:** 1.4.0 engine-runtime. Prefer same-origin \`/runtime/*\`. Catalog, OpenAPI, MCP, \`/v1/skill\`, \`/v1/runtime.json\`, \`/v1/pull/{slug}\`, and proxy front doors remain. Listed engines (\`${ENGINE_SLUGS.join("`, `")}\`) run inside the Worker isolate; session receipts carry \`engine_digest\` and \`ran_in: aziel-runtime\`. Session is \`open → policy → exec → receipt → close\`.

**THIS IS NOT:** a second software index. Downloadable product cards live at ${HOST}/software. Proxy is not exec. Unsupported slugs are explicit \`proxy_fallback\`. The library MASTER search/OCR/map APIs stay on ${HOST}/v1/*. No invented Zenodo DOIs. Author **Aziel Eliab** only.

Always send \`User-Agent: Mozilla/5.0\`.

## Same-origin pull root (prefer)

- Page: ${HOST}/runtime
- Health: \`GET ${HOST}/runtime/v1/health\`
- Manifest: \`GET ${HOST}/runtime/v1/runtime.json\`
- Skill: \`GET ${HOST}/runtime/v1/skill\`
- Session open: \`POST ${HOST}/runtime/v1/session/open\`
- Session exec: \`POST ${HOST}/runtime/v1/session/{id}/exec\`
- Pull: \`GET ${HOST}/runtime/v1/pull/{slug}\`
- Bundle: \`GET ${HOST}/runtime/v1/bundle/{slug}\`
- Catalog: \`GET ${HOST}/runtime/v1/catalog.json\`
- OpenAPI: \`GET ${HOST}/runtime/openapi.json\`
- MCP: \`POST ${HOST}/runtime/mcp\`
- Counted downloads: each product Worker's \`/download\` + \`/count\` (listed in catalog / pull)

## Origin Worker

- ${RUNTIME_ORIGIN}/
- ${RUNTIME_ORIGIN}/v1/health
- ${RUNTIME_ORIGIN}/v1/catalog.json
- ${RUNTIME_ORIGIN}/openapi.json
- \`POST ${RUNTIME_ORIGIN}/mcp\`
- ${RUNTIME_ORIGIN}/v1/skill
- ${RUNTIME_ORIGIN}/v1/runtime.json
- ${RUNTIME_ORIGIN}/v1/pull/{slug}
- \`POST ${RUNTIME_ORIGIN}/v1/session/open\`
- \`POST ${RUNTIME_ORIGIN}/v1/session/{id}/exec\`

## Example

\`\`\`bash
curl -sI -A 'Mozilla/5.0' ${HOST}/runtime
curl -s -A 'Mozilla/5.0' ${HOST}/runtime/v1/health
curl -s -A 'Mozilla/5.0' ${HOST}/runtime/v1/runtime.json
curl -s -A 'Mozilla/5.0' ${HOST}/runtime/v1/skill
curl -s -A 'Mozilla/5.0' ${HOST}/runtime/v1/pull/aziel-corpus
\`\`\`

Apache-2.0. Forks welcome.
`;
}

export function runtimeManifest(via = "library") {
  return {
    ok: true,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    title: "aziel-runtime",
    kind: "runtime_root",
    role: "engine-runtime",
    version: RUNTIME_VERSION,
    layer: "catalog+pull+proxy+session+in-process-engines",
    true_engine_runtime: true,
    engine_slugs: ENGINE_SLUGS.slice(),
    proxy_is_not_exec: true,
    doi: null,
    via,
    host: HOST + "/runtime",
    origin: RUNTIME_ORIGIN + "/",
    library: HOST + "/",
    software: HOST + "/software",
    catalog: HOST + "/runtime/v1/catalog.json",
    catalog_origin: RUNTIME_ORIGIN + "/v1/catalog.json",
    openapi: HOST + "/runtime/openapi.json",
    openapi_origin: RUNTIME_ORIGIN + "/openapi.json",
    mcp: HOST + "/runtime/mcp",
    mcp_origin: RUNTIME_ORIGIN + "/mcp",
    skill: HOST + "/runtime/v1/skill",
    skill_origin: RUNTIME_ORIGIN + "/v1/skill",
    runtime_json: HOST + "/runtime/v1/runtime.json",
    pull: HOST + "/runtime/v1/pull/{slug}",
    bundle: HOST + "/runtime/v1/bundle/{slug}",
    session_open: HOST + "/runtime/v1/session/open",
    session_exec: HOST + "/runtime/v1/session/{id}/exec",
    health: HOST + "/runtime/v1/health",
    llms: HOST + "/llms.txt",
    github: "https://github.com/AzielEliab/aziel-runtime",
    license: "Apache-2.0",
    limitation: RUNTIME_LIMITATION,
  };
}

export function destFromRuntimePath(pathname, search) {
  const raw = String(pathname || "");
  if (!raw.startsWith("/runtime/") && raw !== "/runtime/") return null;
  const rest = raw.slice("/runtime".length) || "/";
  return rest + (search || "");
}

export function fallbackKind(destPath) {
  const path = String(destPath || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path === "/v1/runtime.json") return "runtime.json";
  if (path === "/v1/skill") return "skill";
  const pull = path.match(/^\/v1\/pull\/([^/]+)$/);
  if (pull) return { kind: "pull", slug: decodeURIComponent(pull[1]) };
  const bundle = path.match(/^\/v1\/bundle\/([^/]+)$/);
  if (bundle) return { kind: "bundle", slug: decodeURIComponent(bundle[1]) };
  return null;
}

export function pullDescriptor(product, { kind = "pull" } = {}) {
  if (!product || !product.slug) return null;
  const slug = String(product.slug);
  return {
    ok: true,
    author: "Aziel Eliab",
    kind,
    slug,
    name: product.name || slug,
    version: product.version || "",
    one_line: product.one_line || product.banner || "",
    github: product.github || "",
    download: product.download || "",
    count: product.count || "",
    install: product.install || "",
    skill: product.skill || "",
    openapi: product.openapi || "",
    catalog_card: product.catalog_card || RUNTIME_ORIGIN + "/p/" + encodeURIComponent(slug),
    catalog_skill: product.catalog_skill || RUNTIME_ORIGIN + "/p/" + encodeURIComponent(slug) + "/skill",
    ops: Array.isArray(product.ops) ? product.ops : [],
    software_tarball: product.software_tarball || null,
    pull: HOST + "/runtime/v1/pull/" + encodeURIComponent(slug),
    bundle: HOST + "/runtime/v1/bundle/" + encodeURIComponent(slug),
    runtime_root: HOST + "/runtime",
    origin: RUNTIME_ORIGIN + "/",
    limitation: RUNTIME_LIMITATION,
  };
}

export function findProduct(catalog, slug) {
  const want = String(slug || "").toLowerCase();
  const products = catalog && Array.isArray(catalog.products) ? catalog.products : [];
  return products.find((p) => String(p.slug || "").toLowerCase() === want) || null;
}

async function loadCatalog() {
  const res = await fetch(RUNTIME_ORIGIN + "/v1/catalog.json", {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

function respondMaybeHead(request, response) {
  if (request.method !== "HEAD") return response;
  return new Response(null, { status: response.status, headers: response.headers });
}

function htmlPage(request, title, body, extra) {
  extra = extra || {};
  const headers = { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() };
  if (request.method === "HEAD") return new Response(null, { status: extra.status || 200, headers });
  return new Response(page(title, body, extra), {
    status: extra.status || 200,
    headers,
  });
}

function dropHopHeaders(headers) {
  const out = new Headers();
  for (const [k, v] of headers) {
    const key = k.toLowerCase();
    if (key === "host" || key === "connection" || key === "keep-alive" || key === "transfer-encoding" || key === "content-length") continue;
    if (key.startsWith("cf-")) continue;
    out.set(k, v);
  }
  if (!out.get("User-Agent")) out.set("User-Agent", UA);
  return out;
}

function decorate(res, via) {
  const headers = new Headers(res.headers);
  headers.set("X-Aziel-Runtime-Root", HOST + "/runtime");
  headers.set("X-Aziel-Runtime-Via", via);
  for (const [k, v] of Object.entries(corsHeaders())) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

async function cancelBody(res) {
  try {
    if (res && res.body && typeof res.body.cancel === "function") await res.body.cancel();
  } catch {
    /* ignore */
  }
}

async function fallbackResponse(request, kind) {
  if (kind === "runtime.json") return respondMaybeHead(request, json(runtimeManifest("library-fallback")));
  if (kind === "skill") {
    return respondMaybeHead(request, new Response(runtimeSkillMd(), {
      status: 200,
      headers: { "Content-Type": "text/markdown; charset=utf-8", ...corsHeaders(), "X-Aziel-Runtime-Via": "library-fallback" },
    }));
  }
  if (kind && (kind.kind === "pull" || kind.kind === "bundle")) {
    const catalog = await loadCatalog();
    const product = findProduct(catalog, kind.slug);
    if (!product) return json({ error: "not found", slug: kind.slug, hint: "GET /runtime/v1/catalog.json", limitation: RUNTIME_LIMITATION }, 404);
    return respondMaybeHead(request, json(pullDescriptor(product, { kind: kind.kind })));
  }
  return null;
}

async function proxyOrigin(request, destPathAndQuery, env) {
  const dest = new URL(destPathAndQuery, RUNTIME_ORIGIN + "/");
  const init = {
    method: request.method,
    headers: dropHopHeaders(request.headers),
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;
  if (env && env.AZIEL_RUNTIME && typeof env.AZIEL_RUNTIME.fetch === "function") {
    return env.AZIEL_RUNTIME.fetch(new Request(dest.toString(), init));
  }
  return fetch(dest.toString(), init);
}

export async function handleRuntimeRoot(request, url, env, signed) {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method;

  if (path === "/runtime" && (method === "GET" || method === "HEAD")) {
    return htmlPage(request, "aziel-runtime", runtimeBody(), {
      signed,
      path: "/runtime",
      kind: "runtime",
      description: "aziel-runtime 1.4.0 engine-runtime on the Aziel Digital Library. Prefer /runtime/*. Listed engines run in-process; receipts carry engine_digest. Proxy is not exec. Author Aziel Eliab.",
    });
  }

  if (path === "/v1/runtime.json" && (method === "GET" || method === "HEAD")) {
    return proxyOrFallback(request, "/v1/runtime.json", env);
  }

  const dest = destFromRuntimePath(url.pathname, url.search);
  if (!dest) return null;
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  return proxyOrFallback(request, dest, env);
}

async function proxyOrFallback(request, destPathAndQuery, env) {
  const kind = fallbackKind(destPathAndQuery);
  let res;
  try {
    res = await proxyOrigin(request, destPathAndQuery, env);
  } catch {
    if (kind) return fallbackResponse(request, kind);
    return json({ error: "runtime origin unreachable", origin: RUNTIME_ORIGIN, limitation: RUNTIME_LIMITATION }, 502);
  }
  if (kind && (res.status === 404 || res.status >= 500)) {
    await cancelBody(res);
    const fallback = await fallbackResponse(request, kind);
    if (fallback) return fallback;
  }
  return decorate(res, env && env.AZIEL_RUNTIME ? "service-binding" : "origin-fetch");
}
