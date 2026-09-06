/**
 * Suite decentralized node mesh — library proxy + default-off status.
 * Public HTTPS is not itself a mesh. Mesh stays off until aziel-runtime enables it.
 * Identity: Aziel Eliab only.
 */
import { HOST, RUNTIME_ORIGIN } from "./runtime-copy.js";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id",
  };
}

const UA = "Mozilla/5.0 AzielDigitalLibrary";

export const AUTHOR = "Aziel Eliab";
export const MESH_NOTE =
  "Suite decentralized node mesh. Default off until aziel-runtime enables it. "
  + "This public HTTPS library is not itself a mesh. Identity Aziel Eliab only.";

export function isMeshLibraryPath(pathname) {
  const path = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  return path === "/v1/mesh" || path.startsWith("/v1/mesh/");
}

export function isMeshRuntimePath(pathname) {
  const path = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  return path === "/runtime/v1/mesh" || path.startsWith("/runtime/v1/mesh/");
}

export function destMeshPath(pathname, search) {
  const raw = String(pathname || "").split("?")[0];
  let rest = raw;
  if (rest.startsWith("/runtime/")) rest = rest.slice("/runtime".length) || "/";
  const trimmed = rest.replace(/\/+$/, "") || "/";
  if (trimmed !== "/v1/mesh" && !trimmed.startsWith("/v1/mesh/")) return null;
  return trimmed + (search || "");
}

export function isMeshEnabled(doc) {
  if (!doc || typeof doc !== "object") return false;
  if (doc.enabled === true) return true;
  const mesh = String(doc.mesh == null ? "" : doc.mesh).toLowerCase();
  return mesh === "on" || mesh === "enabled" || mesh === "live";
}

export function liveNodesCount(doc) {
  if (!doc || typeof doc !== "object") return 0;
  if (!isMeshEnabled(doc)) return 0;
  if (doc.live_nodes != null && Number.isFinite(Number(doc.live_nodes))) return Number(doc.live_nodes);
  if (doc.node_count != null && Number.isFinite(Number(doc.node_count))) return Number(doc.node_count);
  if (Array.isArray(doc.nodes)) return doc.nodes.length;
  return 0;
}

export function liveNodesLabel(doc) {
  if (isMeshEnabled(doc)) return "Live Nodes · " + liveNodesCount(doc);
  return "Live Nodes · off";
}

export function meshOffDoc(extra = {}) {
  return {
    ok: true,
    enabled: false,
    mesh: "off",
    live_nodes: 0,
    nodes: [],
    default: "off",
    until: "runtime enable",
    author: AUTHOR,
    identity: AUTHOR,
    host: HOST + "/v1/mesh",
    runtime: HOST + "/runtime/v1/mesh",
    origin: RUNTIME_ORIGIN + "/v1/mesh",
    note: MESH_NOTE,
    source: extra.source || "library-default-off",
    ...extra,
  };
}

export function decorateMeshDoc(doc, extra = {}) {
  if (!doc || typeof doc !== "object") return meshOffDoc(extra);
  const enabled = isMeshEnabled(doc);
  const nodes = Array.isArray(doc.nodes) ? doc.nodes : [];
  return {
    ...doc,
    ok: doc.ok !== false,
    enabled,
    mesh: enabled ? (doc.mesh && String(doc.mesh).toLowerCase() !== "off" ? doc.mesh : "on") : "off",
    live_nodes: enabled ? liveNodesCount({ ...doc, enabled: true, nodes }) : 0,
    nodes: enabled ? nodes : [],
    default: "off",
    until: "runtime enable",
    author: AUTHOR,
    identity: AUTHOR,
    host: HOST + "/v1/mesh",
    runtime: HOST + "/runtime/v1/mesh",
    origin: RUNTIME_ORIGIN + "/v1/mesh",
    note: doc.note || MESH_NOTE,
    source: extra.source || doc.source || "runtime",
  };
}

function meshJson(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(),
    },
  });
}

function respondMaybeHead(request, response) {
  if (request.method !== "HEAD") return response;
  return new Response(null, { status: response.status, headers: response.headers });
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

async function cancelBody(res) {
  try {
    if (res && res.body && typeof res.body.cancel === "function") await res.body.cancel();
  } catch {
    /* ignore */
  }
}

async function fetchRuntimeMesh(request, destPathAndQuery, env) {
  const dest = new URL(destPathAndQuery, RUNTIME_ORIGIN + "/");
  const init = {
    method: request.method,
    headers: dropHopHeaders(request.headers),
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;
  if (env && env.AZIEL_RUNTIME && typeof env.AZIEL_RUNTIME.fetch === "function") {
    try {
      const bound = await env.AZIEL_RUNTIME.fetch(new Request(dest.toString(), init));
      if (bound) return bound;
    } catch {
      /* fall through */
    }
  }
  return fetch(dest.toString(), init);
}

function looksLikeMeshDoc(doc) {
  if (!doc || typeof doc !== "object" || doc.error) return false;
  if (doc.enabled === true || doc.enabled === false) return true;
  if (doc.mesh != null || doc.live_nodes != null || doc.node_count != null) return true;
  if (Array.isArray(doc.nodes)) return true;
  return false;
}

export async function proxyMeshRequest(request, destPathAndQuery, env) {
  const method = String(request.method || "GET").toUpperCase();
  let res;
  try {
    res = await fetchRuntimeMesh(request, destPathAndQuery, env);
  } catch {
    if (method === "GET" || method === "HEAD") {
      return respondMaybeHead(request, meshJson(meshOffDoc({ source: "library-default-off" })));
    }
    return meshJson({ ...meshOffDoc({ source: "library-default-off" }), error: "mesh default off until runtime enable" }, 409);
  }

  if (res && res.ok && (method === "GET" || method === "HEAD")) {
    try {
      const doc = await res.json();
      if (looksLikeMeshDoc(doc)) {
        return respondMaybeHead(request, meshJson(decorateMeshDoc(doc, { source: env && env.AZIEL_RUNTIME ? "service-binding" : "origin-fetch" })));
      }
    } catch {
      /* treat as off */
    }
    return respondMaybeHead(request, meshJson(meshOffDoc({ source: "library-default-off" })));
  }

  if (res && res.ok) {
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders())) {
      if (!headers.has(k)) headers.set(k, v);
    }
    headers.set("Cache-Control", "no-store");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }

  await cancelBody(res);
  if (method === "GET" || method === "HEAD") {
    return respondMaybeHead(request, meshJson(meshOffDoc({ source: "library-default-off" })));
  }
  return meshJson({ ...meshOffDoc({ source: "library-default-off" }), error: "mesh default off until runtime enable" }, 409);
}

export async function handleMeshApi(request, url, env) {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (!isMeshLibraryPath(path)) return null;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  const dest = destMeshPath(url.pathname, url.search);
  if (!dest) return meshJson({ error: "not found", note: MESH_NOTE, author: AUTHOR }, 404);
  return proxyMeshRequest(request, dest, env);
}

export function meshStatusHtml(doc) {
  const enabled = isMeshEnabled(doc);
  const label = liveNodesLabel(doc);
  const cls = enabled ? "pill ok" : "pill";
  return `<a class="${cls}" id="aziel-live-nodes" href="/v1/mesh" title="Suite mesh. Default off until runtime enable. Author Aziel Eliab.">${esc(label)}</a>`;
}

export function meshRefreshScript() {
  return `<script>
(function(){
  var el=document.getElementById("aziel-live-nodes");
  if(!el||!el.textContent)return;
  fetch("/v1/mesh",{headers:{"Accept":"application/json","User-Agent":"Mozilla/5.0"}}).then(function(r){return r.json();}).then(function(d){
    if(!d)return;
    var on=d.enabled===true||d.mesh==="on"||d.mesh==="enabled"||d.mesh==="live";
    var n=d.live_nodes!=null?d.live_nodes:(d.nodes&&d.nodes.length)||0;
    el.textContent=on?("Live Nodes \\u00b7 "+n):"Live Nodes \\u00b7 off";
    if(on)el.className="pill ok";
  }).catch(function(){});
})();
</script>`;
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
