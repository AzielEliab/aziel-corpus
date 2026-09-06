/**
 * aziel-runtime hosted as the Digital Library AI runtime root.
 * /runtime is the human + AI page. /runtime/* proxies aziel-runtime 1.6.2 FragGate.
 * Author: Aziel Eliab.
 */
import { page, runtimeBody } from "./ui.js";
import { corsHeaders, json } from "./runtime.js";
import {
  HOST,
  RUNTIME_ORIGIN,
  RUNTIME_VERSION,
  RUNTIME_DOOR,
  RUNTIME_KERNEL,
  RUNTIME_GITHUB,
  RUNTIME_LIVE_COUNT,
  RUNTIME_PRODUCT_COUNT,
  RUNTIME_LOCAL_ONLY,
  ENGINE_SLUGS,
  AI_CLIENTS,
  RUNTIME_DESCRIPTION,
  RUNTIME_LIMITATION,
  runtimeHowTo,
} from "./runtime-copy.js";
import {
  RUNTIME_VIA,
  noteRuntimeUse,
  runtimeUsesPayload,
  runtimeUsesResponse,
} from "./runtime-uses.js";

export {
  HOST,
  RUNTIME_ORIGIN,
  RUNTIME_VERSION,
  ENGINE_SLUGS,
  RUNTIME_LIMITATION,
};

const UA = "Mozilla/5.0 AzielDigitalLibrary";

export function runtimeSkillMd() {
  return `---
name: aziel-runtime
description: >-
  One door — discover, route, refuse. FragGate ${RUNTIME_VERSION} on the Digital Library
  at /runtime. ${RUNTIME_LIVE_COUNT} live advisory engines; ${RUNTIME_LOCAL_ONLY} local_only;
  stubs refuse. Prefer same-origin /runtime/*. ${RUNTIME_ORIGIN} is alternate/sameAs.
---

# aziel-runtime

**FragGate door ${RUNTIME_VERSION}** for Aziel Eliab products. Hosted on this domain at ${HOST}/runtime.
Alternate origin (sameAs): ${RUNTIME_ORIGIN}/. Kernel: ${RUNTIME_KERNEL} (FG-0.1).

**THIS IS:** ${RUNTIME_VERSION} FragGate. One door — discover, route, refuse. Prefer same-origin \`/runtime/*\`.
${RUNTIME_LIVE_COUNT} live advisory engines; ${RUNTIME_LOCAL_ONLY} stays local_only; stub verbs refuse.
Catalog slugs (\`${ENGINE_SLUGS.join("`, `")}\`) are true engines. HTTP \`/p/{slug}/{op}\` is a proxy and is not exec.
Do **not** treat \`${HOST}/v1/runtime\` as the engine manifest (that is Digital Library package discovery).
Engine manifest: \`${HOST}/runtime/v1/runtime.json\` or \`${HOST}/v1/runtime.json\`.
Author **Aziel Eliab** only.

Always send \`User-Agent: Mozilla/5.0\`.

${runtimeHowTo(HOST)}

## Same-origin pull root (prefer)

- Page: ${HOST}/runtime
- FragGate: \`GET ${HOST}/runtime/v1/fraggate\`
- FragGate list: \`GET ${HOST}/runtime/v1/fraggate/list\`
- FragGate call: \`POST ${HOST}/runtime/v1/fraggate/call\`
- Health: \`GET ${HOST}/runtime/v1/health\`
- Uses (this door): \`GET ${HOST}/runtime/v1/uses\`
- Manifest: \`GET ${HOST}/runtime/v1/runtime.json\`
- Skill: \`GET ${HOST}/runtime/v1/skill\`
- Pull: \`GET ${HOST}/runtime/v1/pull/{slug}\`
- Bundle: \`GET ${HOST}/runtime/v1/bundle/{slug}\`
- Catalog: \`GET ${HOST}/runtime/v1/catalog.json\`
- OpenAPI: \`GET ${HOST}/runtime/openapi.json\`
- MCP: \`POST ${HOST}/runtime/mcp\`
- Runtime llms.txt: ${HOST}/runtime/llms.txt
- Runtime cite.json: ${HOST}/runtime/cite.json
- Counted downloads: each product Worker's \`/download\` + \`/count\` (listed in catalog / pull)
- Session tools (\`/runtime/v1/session/*\`) are advanced/internal. Prefer \`fraggate_call\`.

## Alternate origin (sameAs)

- ${RUNTIME_ORIGIN}/
- ${RUNTIME_ORIGIN}/v1/fraggate
- ${RUNTIME_ORIGIN}/v1/fraggate/list
- \`POST ${RUNTIME_ORIGIN}/v1/fraggate/call\`
- ${RUNTIME_ORIGIN}/v1/health
- ${RUNTIME_ORIGIN}/openapi.json
- \`POST ${RUNTIME_ORIGIN}/mcp\`
- ${RUNTIME_GITHUB}

Compatible AI clients: ${AI_CLIENTS}.

## Example

\`\`\`bash
curl -sI -A 'Mozilla/5.0' ${HOST}/runtime
curl -s -A 'Mozilla/5.0' ${HOST}/runtime/v1/health
curl -s -A 'Mozilla/5.0' ${HOST}/runtime/v1/fraggate/list
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
    door: RUNTIME_DOOR,
    kernel: RUNTIME_KERNEL,
    version: RUNTIME_VERSION,
    layer: "catalog+pull+proxy+session+in-process-engines+fraggate",
    live_count: RUNTIME_LIVE_COUNT,
    product_count: RUNTIME_PRODUCT_COUNT,
    local_only: [RUNTIME_LOCAL_ONLY.toLowerCase()],
    true_engine_runtime: true,
    true_engine_slugs: ENGINE_SLUGS.slice(),
    engine_slugs: ENGINE_SLUGS.slice(),
    proxy_is_not_exec: true,
    product: "aziel-runtime",
    name: "Aziel Eliab Runtime",
    doi: null,
    via,
    host: HOST + "/runtime",
    origin: RUNTIME_ORIGIN + "/",
    sameAs: [RUNTIME_ORIGIN + "/", RUNTIME_GITHUB],
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
    fraggate: HOST + "/runtime/v1/fraggate",
    fraggate_list: HOST + "/runtime/v1/fraggate/list",
    fraggate_call: HOST + "/runtime/v1/fraggate/call",
    pull: HOST + "/runtime/v1/pull/{slug}",
    bundle: HOST + "/runtime/v1/bundle/{slug}",
    session_open: HOST + "/runtime/v1/session/open",
    session_exec: HOST + "/runtime/v1/session/{id}/exec",
    session_note: "advanced/internal — prefer fraggate_call",
    health: HOST + "/runtime/v1/health",
    uses: HOST + "/runtime/v1/uses",
    llms: HOST + "/runtime/llms.txt",
    library_llms: HOST + "/llms.txt",
    cite: HOST + "/runtime/cite.json",
    robots: HOST + "/runtime/robots.txt",
    github: RUNTIME_GITHUB,
    compatible_clients: AI_CLIENTS,
    license: "Apache-2.0",
    description: RUNTIME_DESCRIPTION,
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
  out.set("X-Aziel-Runtime-Via", RUNTIME_VIA);
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

export async function handleRuntimeRoot(request, url, env, signed, ctx) {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method;

  if (path === "/runtime" && (method === "GET" || method === "HEAD")) {
    return htmlPage(request, "aziel-runtime", runtimeBody(), {
      signed,
      path: "/runtime",
      kind: "runtime",
      description: RUNTIME_DESCRIPTION,
    });
  }

  if (path === "/runtime/v1/uses" && (method === "GET" || method === "HEAD")) {
    return respondMaybeHead(request, runtimeUsesResponse(await runtimeUsesPayload(env)));
  }

  if (path === "/v1/runtime.json" && (method === "GET" || method === "HEAD")) {
    return proxyOrFallback(request, "/v1/runtime.json", env);
  }

  const dest = destFromRuntimePath(url.pathname, url.search);
  if (!dest) return null;
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  await noteRuntimeUse(env, ctx, method, path);
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
