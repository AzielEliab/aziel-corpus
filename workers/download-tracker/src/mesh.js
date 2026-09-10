/**
 * Suite decentralized node mesh — library proxy + default-off status.
 * Public HTTPS is not itself a mesh. Mesh stays off until aziel-runtime enables it.
 * QNS-CD-1.0 is a hub cite / Worker mesh cross-map only (photon QNS1 packet transfer).
 * Local qnsd lives in AzielEliab/qnm-node. Runtime cites + catalog field live in
 * AzielEliab/aziel-runtime. AZInterface has pair custody. Not a Softwares-tab product.
 * No Node Gate. No public qnsd proxy. Identity: Aziel Eliab only.
 * Host overlay must not rewrite Worker MESH-* refuse codes into a 409
 * library-default-off body. GET never enables. Overlay never enables radios.
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

/** Hub cite / Worker mesh cross-map. Not a Softwares-tab product. No public qnsd. */
export const QNS_CD = Object.freeze({
  spec: QNS_CD_SPEC,
  name: "photon QNS1 packet transfer",
  kind: "hub-cite",
  softwares_tab: false,
  public_proxy: false,
  node_gate: false,
  default: "off",
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
    + "No public qnsd proxy. No Node Gate. Mesh default OFF. Author Aziel Eliab only.",
});

export const MESH_NOTE =
  "Suite decentralized node mesh. Default off until aziel-runtime enables it. "
  + "This public HTTPS library is not itself a mesh. "
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

/** Align host overlay refuses with aziel-runtime Worker codes. Radios stay OFF here. */
export const MESH_SPEC = "QNM-BUILD-1.0";
export const MESH_COMPANION = "AIH-WP-1.1";
export const MESH_NAME = "Quantum Node Mesh";
export const EXAMPLE_BEARER = "suite-presence";
export const MESH_NEED_BEARER = "MESH-NEED-BEARER";
export const MESH_BAD_BEARER = "MESH-BAD-BEARER";
export const MESH_OFF = "MESH-OFF";
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
const OFF_MESSAGE =
  "QNM radios are off. Default OFF. Declare ≥1 bearer with enable first. Site pings do not enable.";

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

function radiosOffFields() {
  return {
    enabled: false,
    radios: "off",
    mesh_enabled: false,
    bearers: [],
    rollup: { live: 0, locked: 0, isolated: 0 },
    live_nodes: 0,
    locked_nodes: 0,
    isolated_nodes: 0,
    products_present: [],
    products: [],
    nodes: [],
    mesh: "off",
    default: "off",
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
      + "Parent will roll that package. This runtime is suite rollup + operator enable only.",
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
    source: extra.source || "library-default-off",
    qns_cd_spec: QNS_CD_SPEC,
  };
}

/** Worker-shaped refuse. Overlay never turns radios on. */
export function meshRefuseDoc(code, message, extra = {}) {
  const source = extra.source || "library-default-off";
  const rest = { ...extra };
  delete rest.source;
  delete rest.enabled;
  delete rest.radios;
  delete rest.mesh_enabled;
  delete rest.ok;
  return {
    ok: false,
    code,
    author: AUTHOR,
    identity: AUTHOR,
    kernel: "mesh",
    mesh_default: "off",
    message,
    ...qnmFrame(),
    ...radiosOffFields(),
    ...libraryMeshCites({ source }),
    ...rest,
    enabled: false,
    radios: "off",
    mesh_enabled: false,
    mesh: "off",
    author: AUTHOR,
    identity: AUTHOR,
    qns_cd_spec: QNS_CD_SPEC,
    qns_cd: QNS_CD,
  };
}

/** Cite host paths on a Worker envelope. Does not enable radios. */
export function citeMeshEnvelope(doc, extra = {}) {
  if (!doc || typeof doc !== "object") {
    return meshRefuseDoc(MESH_OFF, OFF_MESSAGE, extra);
  }
  const cited = {
    ...doc,
    ...libraryMeshCites({ source: extra.source || doc.source || "origin-fetch" }),
    author: AUTHOR,
    identity: AUTHOR,
    qns_cd: doc.qns_cd && typeof doc.qns_cd === "object" ? doc.qns_cd : QNS_CD,
    qns_cd_spec: QNS_CD_SPEC,
  };
  if (cited.enabled === true && !isMeshEnabled(doc)) cited.enabled = false;
  return cited;
}

export function synthesizeMeshRefuse(method, destPath, payload, extra = {}) {
  const m = String(method || "GET").toUpperCase();
  const path = meshPathOnly(destPath);
  const op = meshOpFromPath(path);
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const source = extra.source || "library-default-off";

  if (isMeshStatusReadPath(path) && (m === "GET" || m === "HEAD")) {
    return meshOffDoc({ source });
  }

  if (POST_MESH_OPS[path]) {
    if (m !== "POST") {
      return meshRefuseDoc(MESH_METHOD, "POST " + path + ".", {
        source,
        op,
        hint: "POST " + path,
      });
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
      return meshRefuseDoc(MESH_OFF, OFF_MESSAGE, {
        source,
        op: "enable",
        declared_bearers: accepted.slice(0, 8),
        example_bearer: EXAMPLE_BEARER,
        note: "Host overlay does not enable radios. GET /v1/mesh never enables. Identity Aziel Eliab only.",
      });
    }
    if (op === "disable" || op === "leave") {
      return {
        ok: true,
        code: MESH_OK,
        author: AUTHOR,
        identity: AUTHOR,
        kernel: "mesh",
        mesh_default: "off",
        ...qnmFrame(),
        ...radiosOffFields(),
        ...libraryMeshCites({ source }),
        op,
        note: op === "disable"
          ? "Radios/bearers OFF. Tethers drop clean — no implicit heal, no account resurrection, no wipe internals."
          : "Presence dropped clean. No implicit heal.",
        qns_cd: QNS_CD,
      };
    }
    return meshRefuseDoc(MESH_OFF, OFF_MESSAGE, { source, op });
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
    qns_cd_spec: QNS_CD_SPEC,
    qns_cd: QNS_CD,
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
    qns_cd_spec: QNS_CD_SPEC,
    qns_cd: QNS_CD,
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

async function peekJsonBody(request) {
  const method = String(request.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return {};
  try {
    const text = await request.clone().text();
    if (!text) return {};
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
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
  const payload = await peekJsonBody(request);

  let res;
  try {
    res = await fetchRuntimeMesh(request, destPathAndQuery, env);
  } catch {
    if (statusRead && (method === "GET" || method === "HEAD")) {
      return respondMaybeHead(request, meshJson(meshOffDoc({ source: "library-default-off" })));
    }
    return respondMeshEnvelope(request, synthesizeMeshRefuse(method, destPath, payload, { source: "library-default-off" }));
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
    return respondMaybeHead(request, meshJson(meshOffDoc({ source: "library-default-off" })));
  }

  if (res && res.ok && doc && typeof doc === "object") {
    return respondMeshEnvelope(request, citeMeshEnvelope(doc, { source: originSource(env) }), res.status);
  }

  await cancelBody(res);
  return respondMeshEnvelope(request, synthesizeMeshRefuse(method, destPath, payload, { source: "library-default-off" }));
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
