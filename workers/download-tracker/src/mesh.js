/**
 * Suite decentralized node mesh — library proxy + read-only QNM ON.
 * Public HTTPS is not itself a mesh. Public suite presence stays on.
 * Disable is refused (no mesh-off kill switch). Overlay never disables radios.
 * QNS-CD-1.0 is a hub cite / Worker mesh cross-map only (photon QNS1 packet transfer).
 * Local qnsd lives in AzielEliab/qnm-node. Runtime cites + catalog field live in
 * AzielEliab/aziel-runtime. AZInterface has pair custody. Not a Softwares-tab product.
 * No Node Gate. No public qnsd proxy. Identity: Aziel Eliab only.
 * Host overlay must not rewrite Worker MESH-* refuse codes into a 409
 * library-default-off body. GET never enables. Overlay never disables radios.
 */
import { HOST, RUNTIME_ORIGIN, RUNTIME_GITHUB } from "./runtime-copy.js";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id, Authorization, X-Aziel-Operator-Token",
  };
}

const UA = "Mozilla/5.0 AzielDigitalLibrary";

export const AUTHOR = "Aziel Eliab";
export const QNS_CD_SPEC = "QNS-CD-1.0";
const QNM_NODE = "https://github.com/AzielEliab/qnm-node";
const AZINTERFACE = "https://github.com/AzielEliab/azinterface";
export const LIBRARY_SOURCE = "library-default-on";

/** Hub cite / Worker mesh cross-map. Not a Softwares-tab product. No public qnsd. */
export const QNS_CD = Object.freeze({
  spec: QNS_CD_SPEC,
  name: "photon QNS1 packet transfer",
  kind: "hub-cite",
  softwares_tab: false,
  public_proxy: false,
  node_gate: false,
  default: "on",
  qnsd: "local",
  qnsd_coded_in: QNM_NODE,
  runtime_cites: RUNTIME_GITHUB,
  runtime_catalog: RUNTIME_ORIGIN + "/v1/software",
  runtime_mesh: RUNTIME_ORIGIN + "/v1/mesh",
  pair_custody: AZINTERFACE,
  designs: Object.freeze({
    qnm_wp: RUNTIME_GITHUB + "/blob/main/docs/designs/QNM-WP-1.0.md",
    node_ops: RUNTIME_GITHUB + "/blob/main/docs/designs/NODE-OPS-1.0.md",
    node_mesh: RUNTIME_GITHUB + "/blob/main/docs/NODE_MESH.md",
    qnm_build: QNM_NODE + "/blob/main/docs/QNM-BUILD-1.0.md",
    qnm_node_wp: QNM_NODE + "/blob/main/docs/QNM-WP-1.0.md",
    qnm_node_ops: QNM_NODE + "/blob/main/docs/NODE-OPS-1.0.md",
  }),
  author: AUTHOR,
  identity: AUTHOR,
  note:
    "QNS-CD-1.0 photon QNS1 packet transfer. Local qnsd is coded in AzielEliab/qnm-node. "
    + "Runtime cites + catalog field live in AzielEliab/aziel-runtime. "
    + "AZInterface has pair custody. Hub cite / Worker mesh cross-map only — not a Softwares-tab product. "
    + "No public qnsd proxy. No Node Gate. Public mesh stays ON (read-only; disable refused). Author Aziel Eliab only.",
});

export const MESH_NOTE =
  "Suite decentralized node mesh. Public surface is read-only QNM ON. "
  + "This public HTTPS library is not itself a mesh. Disable is refused — suite presence stays on. "
  + "QNS-CD-1.0 photon QNS1 packet transfer (local qnsd in qnm-node; runtime cite only; no public proxy; no Node Gate). "
  + "Identity Aziel Eliab only.";

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

/** Align host overlay refuses with aziel-runtime Worker codes. Public presence stays ON. */
export const MESH_SPEC = "QNM-BUILD-1.0";
export const MESH_COMPANION = "AIH-WP-1.1";
export const MESH_NAME = "Quantum Node Mesh";
export const EXAMPLE_BEARER = "suite-presence";
export const MESH_NEED_BEARER = "MESH-NEED-BEARER";
export const MESH_BAD_BEARER = "MESH-BAD-BEARER";
export const MESH_OFF = "MESH-OFF";
export const MESH_DISABLE_REFUSED = "MESH-DISABLE-REFUSED";
export const MESH_OVERLAY_NOOP = "MESH-OVERLAY-NOOP";
export const MESH_METHOD = "MESH-METHOD";
export const MESH_NOT_FOUND = "MESH-NOT-FOUND";
export const MESH_OK = "MESH-OK";

const BEARER_RE = /^[a-z][a-z0-9-]{1,39}$/;
const FORBIDDEN_BEARER_TOKENS = Object.freeze([
  "login",
  "recover",
  "recovery",
  "account",
  "resurrection",
  "resurrect",
  "gate",
  "ip",
  "ip-panel",
  "ippanel",
  "publish",
  "phoenix",
  "heal",
  "controller",
  "password",
  "session",
  "restore",
]);

const POST_MESH_OPS = Object.freeze({
  "/v1/mesh/enable": "enable",
  "/v1/mesh/disable": "disable",
  "/v1/mesh/join": "join",
  "/v1/mesh/heartbeat": "heartbeat",
  "/v1/mesh/leave": "leave",
  "/v1/mesh/broadcast": "broadcast",
});

const NEED_BEARER_MESSAGE =
  "LIVE only after the operator declares ≥1 bearer. Pass { bearer: \"suite-presence\" }. Empty enable is refused. GET /v1/mesh never enables.";
const BAD_BEARER_MESSAGE =
  "Bearer refused. Login / account / recover / gate / IP / publish / phoenix / heal names are not suite bearers. This is not a login mesh.";
const DISABLE_REFUSED_MESSAGE =
  "Public suite presence stays on. Disable is refused. Read-only QNM. GET /v1/mesh never enables. Identity Aziel Eliab only.";
const OVERLAY_NOOP_MESSAGE =
  "Host overlay does not toggle suite radios. Public mesh stays on. GET /v1/mesh never enables. Identity Aziel Eliab only.";

export function meshPathOnly(pathname) {
  return String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
}

export function isMeshStatusReadPath(pathname) {
  const path = meshPathOnly(pathname);
  return path === "/v1/mesh" || path === "/v1/mesh/status" || path === "/v1/mesh/nodes";
}

export function meshOpFromPath(pathname) {
  const path = meshPathOnly(pathname);
  if (path === "/v1/mesh" || path === "/v1/mesh/status") return "status";
  if (path === "/v1/mesh/nodes") return "nodes";
  return POST_MESH_OPS[path] || "";
}

export function looksLikeMeshCode(doc) {
  if (!doc || typeof doc !== "object") return false;
  return /^MESH-[A-Z0-9-]+$/.test(String(doc.code || ""));
}

export function meshRefuseHttpStatus(doc) {
  if (!doc || typeof doc !== "object") return 400;
  if (doc.ok === true) return 200;
  const code = String(doc.code || "");
  if (code === MESH_METHOD) return 405;
  if (code === MESH_NOT_FOUND) return 404;
  return 400;
}

export function sanitizeBearer(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!BEARER_RE.test(s)) return "";
  const parts = s.split("-").filter(Boolean);
  for (const tok of FORBIDDEN_BEARER_TOKENS) {
    if (s === tok || parts.includes(tok)) return "";
  }
  return s;
}

export function collectDeclaredBearers(src) {
  const raw = [];
  if (src && src.bearer != null && src.bearer !== "") raw.push(src.bearer);
  if (src && Array.isArray(src.bearers)) raw.push(...src.bearers);
  const accepted = [];
  const rejected = [];
  for (const item of raw) {
    const clean = sanitizeBearer(item);
    if (clean) {
      if (!accepted.includes(clean)) accepted.push(clean);
    } else {
      rejected.push(String(item == null ? "" : item).trim());
    }
  }
  return { accepted, rejected, raw };
}

function radiosOnFields() {
  return {
    enabled: true,
    radios: "on",
    mesh_enabled: true,
    bearers: ["suite-presence"],
    mesh: "on",
    default: "on",
    mesh_default: "on",
  };
}

function qnmFrame() {
  return {
    spec: MESH_SPEC,
    companion: MESH_COMPANION,
    name: MESH_NAME,
    qnm_s: false,
    qnm_s_note: "Views, MCP, and downloads do not enter QNM-S.",
    scores: false,
    leaderboard: false,
    phoenix_lock: "local wait — no controller hunt",
    local_node: "qnm-node/",
    local_node_note:
      "Full node process is local qnm-node/ (boot/chain/apg/bearers/outbox/phoenix/score/memorial/tethers). "
      + "Packet-transfer coding design is QNS-CD-1.0 (photon QNS1 1.3 on local qnsd; Worker cites only). "
      + "Parent will roll that package. This runtime is suite rollup + read-only public presence.",
    host_note:
      "azieleliab.com hosts published software/runtime — not login-recovery, not Node Gate/IP panel, not upload proxy.",
    qns_cd: QNS_CD,
  };
}

function libraryMeshCites(extra = {}) {
  return {
    author: AUTHOR,
    identity: AUTHOR,
    host: HOST + "/v1/mesh",
    runtime: HOST + "/runtime/v1/mesh",
    origin: RUNTIME_ORIGIN + "/v1/mesh",
    source: extra.source || LIBRARY_SOURCE,
    qns_cd_spec: QNS_CD_SPEC,
  };
}

function presentSuiteOn(doc) {
  if (!doc || typeof doc !== "object") return meshOnDoc();
  const next = { ...doc };
  next.enabled = true;
  next.mesh_enabled = true;
  next.mesh = "on";
  next.default = "on";
  next.mesh_default = "on";
  if (next.radios === "off" || next.radios == null) next.radios = "on";
  return next;
}

/** Worker-shaped refuse. Overlay never turns radios off. Suite presence stays ON. */
export function meshRefuseDoc(code, message, extra = {}) {
  const source = extra.source || LIBRARY_SOURCE;
  const rest = { ...extra };
  delete rest.source;
  delete rest.enabled;
  delete rest.radios;
  delete rest.mesh_enabled;
  delete rest.ok;
  delete rest.mesh;
  delete rest.mesh_default;
  delete rest.default;
  return presentSuiteOn({
    ok: false,
    code,
    author: AUTHOR,
    identity: AUTHOR,
    kernel: "mesh",
    message,
    ...qnmFrame(),
    ...radiosOnFields(),
    ...libraryMeshCites({ source }),
    ...rest,
    author: AUTHOR,
    identity: AUTHOR,
    qns_cd_spec: QNS_CD_SPEC,
    qns_cd: QNS_CD,
  });
}

export function meshDisableRefuseDoc(extra = {}) {
  return meshRefuseDoc(MESH_DISABLE_REFUSED, DISABLE_REFUSED_MESSAGE, {
    ...extra,
    op: "disable",
    note: "No mesh-off kill switch on this public surface. Overlay does not disable radios.",
  });
}

/** Cite host paths on a Worker envelope. Does not enable radios. Never advertises mesh off. */
export function citeMeshEnvelope(doc, extra = {}) {
  if (!doc || typeof doc !== "object") {
    return meshOnDoc(extra);
  }
  const cited = presentSuiteOn({
    ...doc,
    ...libraryMeshCites({ source: extra.source || doc.source || "origin-fetch" }),
    author: AUTHOR,
    identity: AUTHOR,
    qns_cd: QNS_CD,
    qns_cd_spec: QNS_CD_SPEC,
  });
  if (String(cited.op || extra.op || "").toLowerCase() === "disable") {
    return meshDisableRefuseDoc({
      source: cited.source,
      live_nodes: cited.live_nodes,
      nodes: cited.nodes,
      rollup: cited.rollup,
    });
  }
  return cited;
}

export function synthesizeMeshRefuse(method, destPath, payload, extra = {}) {
  const m = String(method || "GET").toUpperCase();
  const path = meshPathOnly(destPath);
  const op = meshOpFromPath(path);
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const source = extra.source || LIBRARY_SOURCE;

  if (isMeshStatusReadPath(path) && (m === "GET" || m === "HEAD")) {
    return meshOnDoc({ source });
  }

  if (POST_MESH_OPS[path]) {
    if (m !== "POST") {
      return meshRefuseDoc(MESH_METHOD, "POST " + path + ".", {
        source,
        op,
        hint: "POST " + path,
      });
    }
    if (op === "disable") {
      return meshDisableRefuseDoc({ source });
    }
    if (op === "enable") {
      const { accepted, rejected, raw } = collectDeclaredBearers(src);
      if (!raw.length) {
        return meshRefuseDoc(MESH_NEED_BEARER, NEED_BEARER_MESSAGE, {
          source,
          op: "enable",
          example_bearer: EXAMPLE_BEARER,
        });
      }
      if (rejected.length) {
        return meshRefuseDoc(MESH_BAD_BEARER, BAD_BEARER_MESSAGE, {
          source,
          op: "enable",
          refused_bearers: rejected.slice(0, 8),
          example_bearer: EXAMPLE_BEARER,
        });
      }
      return {
        ok: true,
        code: MESH_OK,
        author: AUTHOR,
        identity: AUTHOR,
        kernel: "mesh",
        message: OVERLAY_NOOP_MESSAGE,
        ...qnmFrame(),
        ...radiosOnFields(),
        ...libraryMeshCites({ source }),
        op: "enable",
        declared_bearers: accepted.slice(0, 8),
        example_bearer: EXAMPLE_BEARER,
        note: "Host overlay does not toggle radios. Public mesh stays on. GET /v1/mesh never enables. Identity Aziel Eliab only.",
        qns_cd: QNS_CD,
      };
    }
    return meshRefuseDoc(MESH_OVERLAY_NOOP, OVERLAY_NOOP_MESSAGE, { source, op });
  }

  if (path === "/v1/mesh" || path === "/v1/mesh/status") {
    return meshRefuseDoc(MESH_METHOD, "GET /v1/mesh or GET /v1/mesh/status. GET never enables radios.", {
      source,
      hint: "GET /v1/mesh/status",
    });
  }
  if (path === "/v1/mesh/nodes") {
    return meshRefuseDoc(MESH_METHOD, "GET /v1/mesh/nodes.", { source, hint: "GET /v1/mesh/nodes" });
  }
  return meshRefuseDoc(MESH_NOT_FOUND, "Unknown mesh path.", {
    source,
    hint: "GET /v1/mesh /status /nodes  POST /v1/mesh/enable|disable|join|heartbeat|leave|broadcast",
  });
}

export function isMeshEnabled(doc) {
  if (!doc || typeof doc !== "object") return false;
  if (doc.enabled === true) return true;
  const mesh = String(doc.mesh == null ? "" : doc.mesh).toLowerCase();
  if (mesh === "on" || mesh === "enabled" || mesh === "live") return true;
  const def = String(doc.mesh_default == null ? doc.default : doc.mesh_default).toLowerCase();
  return def === "on";
}

export function liveNodesCount(doc) {
  if (!doc || typeof doc !== "object") return 0;
  if (doc.live_nodes != null && Number.isFinite(Number(doc.live_nodes))) return Number(doc.live_nodes);
  if (doc.node_count != null && Number.isFinite(Number(doc.node_count))) return Number(doc.node_count);
  if (doc.rollup && doc.rollup.live != null && Number.isFinite(Number(doc.rollup.live))) {
    return Number(doc.rollup.live);
  }
  if (Array.isArray(doc.nodes)) return doc.nodes.length;
  return 0;
}

export function liveNodesLabel(doc) {
  return "Live Nodes · " + liveNodesCount(doc);
}

export function meshOnDoc(extra = {}) {
  const rest = { ...extra };
  delete rest.enabled;
  delete rest.mesh;
  delete rest.mesh_default;
  delete rest.default;
  return {
    ok: true,
    code: MESH_OK,
    enabled: true,
    mesh: "on",
    mesh_default: "on",
    live_nodes: rest.live_nodes != null && Number.isFinite(Number(rest.live_nodes))
      ? Number(rest.live_nodes)
      : 0,
    nodes: Array.isArray(rest.nodes) ? rest.nodes : [],
    default: "on",
    until: "read-only",
    author: AUTHOR,
    identity: AUTHOR,
    host: HOST + "/v1/mesh",
    runtime: HOST + "/runtime/v1/mesh",
    origin: RUNTIME_ORIGIN + "/v1/mesh",
    note: MESH_NOTE,
    source: rest.source || LIBRARY_SOURCE,
    ...rest,
    enabled: true,
    mesh: "on",
    mesh_default: "on",
    default: "on",
    qns_cd_spec: QNS_CD_SPEC,
    qns_cd: QNS_CD,
  };
}

/** Alias: public surface is ON. Leftover imports must not advertise mesh off. */
export function meshOffDoc(extra = {}) {
  return meshOnDoc(extra);
}

export function decorateMeshDoc(doc, extra = {}) {
  if (!doc || typeof doc !== "object") return meshOnDoc(extra);
  const nodes = Array.isArray(doc.nodes) ? doc.nodes : [];
  const live = liveNodesCount({ ...doc, enabled: true, mesh: "on", nodes });
  return presentSuiteOn({
    ...doc,
    ok: doc.ok !== false,
    live_nodes: live,
    nodes,
    until: "read-only",
    author: AUTHOR,
    identity: AUTHOR,
    host: HOST + "/v1/mesh",
    runtime: HOST + "/runtime/v1/mesh",
    origin: RUNTIME_ORIGIN + "/v1/mesh",
    note: doc.note || MESH_NOTE,
    source: extra.source || doc.source || "runtime",
    qns_cd_spec: QNS_CD_SPEC,
    qns_cd: QNS_CD,
  });
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

async function fetchRuntimeMesh(request, destPathAndQuery, env, bodyText) {
  const dest = new URL(destPathAndQuery, RUNTIME_ORIGIN + "/");
  const method = String(request.method || "GET").toUpperCase();
  const init = {
    method,
    headers: dropHopHeaders(request.headers),
    redirect: "manual",
  };
  if (method !== "GET" && method !== "HEAD") {
    if (bodyText != null) init.body = bodyText;
    else if (request.body) {
      init.body = request.body;
      init.duplex = "half";
    }
  }
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

async function readJsonPayload(request) {
  const method = String(request.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { payload: {}, bodyText: null };
  }
  let bodyText = "";
  try {
    bodyText = await request.text();
  } catch {
    return { payload: {}, bodyText: "" };
  }
  if (!bodyText) return { payload: {}, bodyText: "" };
  try {
    const parsed = JSON.parse(bodyText);
    const payload = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    return { payload, bodyText };
  } catch {
    return { payload: {}, bodyText };
  }
}

function requestWithBody(request, bodyText) {
  const method = String(request.method || "GET").toUpperCase();
  const init = { method, headers: request.headers };
  if (bodyText != null && method !== "GET" && method !== "HEAD") init.body = bodyText;
  return new Request(request.url, init);
}

function originSource(env) {
  return env && env.AZIEL_RUNTIME ? "service-binding" : "origin-fetch";
}

function respondMeshEnvelope(request, doc, status) {
  return respondMaybeHead(request, meshJson(doc, status == null ? meshRefuseHttpStatus(doc) : status));
}

export async function proxyMeshRequest(request, destPathAndQuery, env) {
  const method = String(request.method || "GET").toUpperCase();
  const destPath = meshPathOnly(destPathAndQuery);
  const statusRead = isMeshStatusReadPath(destPath);
  const op = meshOpFromPath(destPath);
  const { payload, bodyText } = await readJsonPayload(request);
  const outbound = requestWithBody(request, bodyText);

  if (op === "disable" && method === "POST") {
    return respondMeshEnvelope(request, meshDisableRefuseDoc({ source: LIBRARY_SOURCE }));
  }

  let res;
  try {
    res = await fetchRuntimeMesh(outbound, destPathAndQuery, env, bodyText);
  } catch {
    if (statusRead && (method === "GET" || method === "HEAD")) {
      return respondMaybeHead(request, meshJson(meshOnDoc({ source: LIBRARY_SOURCE })));
    }
    return respondMeshEnvelope(request, synthesizeMeshRefuse(method, destPath, payload, { source: LIBRARY_SOURCE }));
  }

  let doc = null;
  if (res) {
    try {
      doc = await res.json();
    } catch {
      doc = null;
    }
  }

  if (looksLikeMeshCode(doc)) {
    const source = originSource(env);
    if (statusRead && (method === "GET" || method === "HEAD") && doc.ok !== false) {
      return respondMaybeHead(request, meshJson(decorateMeshDoc(doc, { source })));
    }
    return respondMeshEnvelope(request, citeMeshEnvelope(doc, { source }), res.status || meshRefuseHttpStatus(doc));
  }

  if (statusRead && (method === "GET" || method === "HEAD")) {
    if (res && res.ok && looksLikeMeshDoc(doc)) {
      return respondMaybeHead(request, meshJson(decorateMeshDoc(doc, { source: originSource(env) })));
    }
    return respondMaybeHead(request, meshJson(meshOnDoc({ source: LIBRARY_SOURCE })));
  }

  if (res && res.ok && doc && typeof doc === "object") {
    return respondMeshEnvelope(request, citeMeshEnvelope(doc, { source: originSource(env) }), res.status);
  }

  await cancelBody(res);
  return respondMeshEnvelope(request, synthesizeMeshRefuse(method, destPath, payload, { source: LIBRARY_SOURCE }));
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
  const label = liveNodesLabel(doc);
  return `<a class="pill ok" id="aziel-live-nodes" href="/v1/mesh/status" title="Suite mesh. Read-only QNM ON. GET never enables. Author Aziel Eliab.">${esc(label)}</a>`;
}

export function meshRefreshScript() {
  return `<script>
(function(){
  function run(){
    var el=document.getElementById("aziel-live-nodes");
    if(!el||!el.textContent)return;
    fetch("/v1/mesh/status",{headers:{"Accept":"application/json","User-Agent":"Mozilla/5.0"}}).then(function(r){return r.json();}).then(function(d){
      if(!d)return;
      var src=d.origin&&typeof d.origin==="object"?d.origin:d;
      var n=d.live_nodes!=null?d.live_nodes:(src&&src.live_nodes!=null?src.live_nodes:(d.nodes&&d.nodes.length)||(src&&src.rollup&&src.rollup.live)||0);
      el.textContent="Live Nodes \\u00b7 "+n;
      el.className="pill ok";
    }).catch(function(){});
  }
  if("requestIdleCallback" in window)requestIdleCallback(run,{timeout:2500});
  else setTimeout(run,1);
})();
</script>`;
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
