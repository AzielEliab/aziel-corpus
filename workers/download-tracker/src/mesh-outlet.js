/**
 * MESH-OUTLET-1.0 — corpus cite-sync consumer for runtime SoT fan-out.
 *
 * Live authority is GET https://aziel-runtime.vibelock.workers.dev/v1/software.
 * One SoT change can be pushed here (operator token) or pulled with ?sync=1.
 * Frozen constants are the last-known bake when the origin is unreachable.
 *
 * Applies: runtime/suite cite, Softwares count framing, Ask Jeeves suite-help wording.
 * Refuses: library-row invention, download-counter writes, Ask Jeeves as a Softwares card,
 * any identity other than Aziel Eliab.
 *
 * Download counters stay on their own KV keys. This module never increments them.
 * Author: Aziel Eliab only.
 */
import { timingSafeEqual } from "node:crypto";
import {
  HOST,
  RUNTIME_ORIGIN,
  RUNTIME_VERSION,
  RUNTIME_GIT_SHA,
  RUNTIME_GIT_FULL,
  RUNTIME_VERSION_ID,
  RUNTIME_SOT_BRANCH,
  RUNTIME_LIVE_COUNT,
  RUNTIME_TAB_COUNT,
  RUNTIME_ISOLATION_COUNT,
  RUNTIME_COUNT_NOTE,
  JEEVES_SUITE_HELP,
} from "./runtime-copy.js";
import { readPackedIndex } from "./library-index.js";
import { isReservedCounterKey } from "./stats-shape.js";

export const OUTLET_SPEC = "MESH-OUTLET-1.0";
export const INVENTORY_SPEC = "MESH-OUTLET-INVENTORY-1.0";
export const AUTHOR = "Aziel Eliab";
export const OUTLET_PATH = "/v1/mesh/outlet";
export const INVENTORY_PATH = "/v1/inventory";
export const OUTLET_KV_KEY = "mesh:outlet:sot:v1";
export const INVENTORY_KV_KEY = "mesh:outlet:inventory:v1";
export const SOFTWARE_SOT_URL = RUNTIME_ORIGIN + "/v1/software";
export const OPERATOR_HEADER = "X-Aziel-Operator-Token";
const PROJECT = "aziel-corpus";
const COUNTER_FIELDS = Object.freeze([
  "downloads",
  "views",
  "total",
  "views_human",
  "views_bot",
  "downloads_human",
  "downloads_bot",
]);
const ROW_FIELDS = Object.freeze(["records", "library_rows", "rows", "inventory", "library"]);
const SUITE_HELP_SLUGS = new Set(["jeeves", "askjeeves", "ask-jeeves"]);
const RECORD_ID = /^AZDOC-[A-Z0-9][A-Z0-9-]{0,80}$/;

export const INVENTORY_PEERS = Object.freeze([
  Object.freeze({
    id: "azielcorpuslibrary-net",
    origin: HOST,
    inventory: HOST + "/v1/library-index",
    local: true,
  }),
  Object.freeze({
    id: "azieleliab-com",
    origin: "https://www.azieleliab.com",
    inventory: "https://www.azieleliab.com/v1/library-index",
    local: false,
  }),
  Object.freeze({
    id: "godlock-uk",
    origin: "https://godlock.uk",
    inventory: "https://godlock.uk/v1/library-index",
    local: false,
  }),
  Object.freeze({
    id: "hedidntjump-com",
    origin: "https://www.hedidntjump.com",
    inventory: "https://www.hedidntjump.com/v1/library-index",
    local: false,
  }),
]);

export const OUTLET_CONTRACT = Object.freeze({
  spec: OUTLET_SPEC,
  role: "corpus mesh outlet and cite-sync consumer",
  authority: SOFTWARE_SOT_URL,
  receive: "POST " + OUTLET_PATH,
  read: "GET " + OUTLET_PATH,
  pull: "GET " + OUTLET_PATH + "?sync=1",
  inventory: "GET " + INVENTORY_PATH,
  inventory_sync: "GET " + INVENTORY_PATH + "?sync=1",
  auth: OPERATOR_HEADER + " on POST and on sync=1. Public GET without sync returns the last-known cite.",
  identity: AUTHOR,
  applies: Object.freeze([
    "runtime/suite cite (version, branch, git)",
    "Softwares count framing (tab count, live engines, isolation software_count, count_note)",
    "Ask Jeeves suite-help wording (FragGate op jeeves on aziel-corpus)",
  ]),
  refuses: Object.freeze([
    "library row invention",
    "download counter writes",
    "Ask Jeeves as a Softwares-tab card",
    "any identity other than Aziel Eliab",
  ]),
  unreachable: "Keep the last-known cite and the last-known inventory rows. status unreachable. invented false.",
  counters: "untouched",
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, " + OPERATOR_HEADER,
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      ...corsHeaders(),
    },
  });
}

function headOrJson(request, body, status = 200) {
  const res = json(body, status);
  if (request && request.method === "HEAD") {
    return new Response(null, { status: res.status, headers: res.headers });
  }
  return res;
}

function tokenFromEnv(env) {
  if (!env) return "";
  for (const name of ["OPERATOR_TOKEN", "GATE_TOKEN", "LIBRARY_OPERATOR_TOKEN"]) {
    const value = env[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function safeEq(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (!left.length || left.length !== right.length) return false;
  try { return timingSafeEqual(left, right); } catch { return false; }
}

export function outletAuthorized(request, env) {
  const expected = tokenFromEnv(env);
  if (!expected || !request || !request.headers) return false;
  return safeEq(request.headers.get(OPERATOR_HEADER) || "", expected);
}

export function isSuiteHelpSlug(slug, name) {
  const id = String(slug || "").trim().toLowerCase();
  if (SUITE_HELP_SLUGS.has(id)) return true;
  return /^ask jeeves$/i.test(String(name || "").trim());
}

export function omitSuiteHelpProducts(products) {
  if (!Array.isArray(products)) return [];
  return products.filter((row) => row && !isSuiteHelpSlug(row.slug, row.name));
}

function finite(value) {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) return null;
  return n;
}

function text(value) {
  const s = typeof value === "string" ? value.trim() : "";
  return s || "";
}

export function frozenCite() {
  return {
    sot: {
      live: true,
      branch: RUNTIME_SOT_BRANCH,
      git: RUNTIME_GIT_SHA,
      git_full: RUNTIME_GIT_FULL,
      version: RUNTIME_VERSION,
      version_id: RUNTIME_VERSION_ID,
      origin: SOFTWARE_SOT_URL,
    },
    softwares: {
      count: RUNTIME_TAB_COUNT,
      live_count: RUNTIME_LIVE_COUNT,
      local_only_count: 1,
      isolation_software_count: RUNTIME_ISOLATION_COUNT,
      count_note: RUNTIME_COUNT_NOTE,
      framing: "Separate software / sibling software under one FragGate door. Never separate FragGate engines. Clock is not Lock.",
    },
    suite_help: JEEVES_SUITE_HELP,
  };
}

export function frozenOutletState() {
  return sealOutlet({
    cite: frozenCite(),
    source: "frozen",
    reachable: null,
    status: "last-known",
  });
}

function sealOutlet({ cite, source, reachable, status }) {
  return {
    ok: true,
    spec: OUTLET_SPEC,
    author: AUTHOR,
    identity: AUTHOR,
    source: source || "frozen",
    reachable: reachable == null ? null : Boolean(reachable),
    status: status || "last-known",
    invented: false,
    counters_untouched: true,
    downloads_untouched: true,
    library_rows: "refused",
    cite: {
      sot: Object.assign({}, cite && cite.sot),
      softwares: Object.assign({}, cite && cite.softwares),
      suite_help: Object.assign({}, cite && cite.suite_help),
    },
    contract: OUTLET_CONTRACT,
  };
}

function identityOk(body) {
  if (!body || typeof body !== "object") return false;
  const author = text(body.author);
  const identity = text(body.identity);
  if (!author && !identity) return false;
  if (author && author !== AUTHOR) return false;
  if (identity && identity !== AUTHOR) return false;
  return true;
}

function hasRowPayload(body) {
  if (!body || typeof body !== "object") return false;
  for (const key of ROW_FIELDS) {
    if (Array.isArray(body[key])) return true;
    if (body.sot && Array.isArray(body.sot[key])) return true;
    if (body.softwares && Array.isArray(body.softwares[key])) return true;
  }
  return false;
}

function droppedCounterFields(body) {
  const dropped = [];
  const bags = [body, body && body.sot, body && body.softwares];
  for (const bag of bags) {
    if (!bag || typeof bag !== "object") continue;
    for (const key of COUNTER_FIELDS) {
      if (bag[key] != null) dropped.push(key);
    }
  }
  return dropped;
}

function shortGit(value) {
  const s = text(value).toLowerCase();
  if (!s) return "";
  if (!/^[0-9a-f]{7,40}$/.test(s)) return null;
  return s.slice(0, 7);
}

function fullGit(value) {
  const s = text(value).toLowerCase();
  if (!s) return "";
  if (!/^[0-9a-f]{40}$/.test(s)) return null;
  return s;
}

export function suiteHelpOk(help) {
  if (help == null) return true;
  if (!help || typeof help !== "object" || Array.isArray(help)) return false;
  if (help.software_tab !== false) return false;
  if (help.slug != null && String(help.slug) !== "jeeves") return false;
  if (help.parent_slug != null && String(help.parent_slug) !== "aziel-corpus") return false;
  if (help.fraggate_slug != null && String(help.fraggate_slug) !== "aziel-corpus") return false;
  if (help.fraggate_op != null && String(help.fraggate_op) !== "jeeves") return false;
  if (help.interface_call != null && String(help.interface_call) !== "jeeves_help") return false;
  if (help.name != null && String(help.name) !== "Ask Jeeves") return false;
  return true;
}

function refuse(status, error) {
  return {
    ok: false,
    status,
    error,
    author: AUTHOR,
    identity: AUTHOR,
    invented: false,
    counters_untouched: true,
    applied: false,
  };
}

function baseCite(previous) {
  const prev = previous && previous.cite ? previous.cite : (previous && previous.sot ? previous : null);
  const frozen = frozenCite();
  if (!prev) return frozen;
  return {
    sot: Object.assign({}, frozen.sot, prev.sot || {}),
    softwares: Object.assign({}, frozen.softwares, prev.softwares || {}),
    suite_help: Object.assign({}, frozen.suite_help, prev.suite_help || {}),
  };
}

export function acceptFanout(previous, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return refuse(400, "OUTLET-BODY");
  if (!identityOk(body)) return refuse(403, "OUTLET-IDENTITY");
  if (hasRowPayload(body)) return refuse(400, "OUTLET-NO-ROWS");
  const help = body.suite_help != null ? body.suite_help : (body.cite && body.cite.suite_help);
  if (!suiteHelpOk(help)) return refuse(400, "OUTLET-SUITE-HELP");
  const sotIn = body.sot || (body.cite && body.cite.sot) || {};
  const softIn = body.softwares || (body.cite && body.cite.softwares) || {};
  const next = baseCite(previous);
  if (sotIn.branch != null) {
    const branch = text(sotIn.branch);
    if (!/^[A-Za-z0-9._/-]{1,80}$/.test(branch)) return refuse(400, "OUTLET-BRANCH");
    next.sot.branch = branch;
  }
  if (sotIn.git != null || sotIn.git_sha != null) {
    const git = shortGit(sotIn.git != null ? sotIn.git : sotIn.git_sha);
    if (git == null) return refuse(400, "OUTLET-SHA");
    if (git) next.sot.git = git;
  }
  if (sotIn.git_full != null || (sotIn.git_sha && String(sotIn.git_sha).length === 40)) {
    const full = fullGit(sotIn.git_full != null ? sotIn.git_full : sotIn.git_sha);
    if (full == null) return refuse(400, "OUTLET-SHA");
    if (full) {
      next.sot.git_full = full;
      next.sot.git = full.slice(0, 7);
    }
  }
  if (text(sotIn.version)) {
    const version = text(sotIn.version);
    if (!/^[0-9A-Za-z._+-]{1,40}$/.test(version)) return refuse(400, "OUTLET-VERSION");
    next.sot.version = version;
  }
  if (Object.prototype.hasOwnProperty.call(sotIn, "version_id")) {
    if (sotIn.version_id == null || sotIn.version_id === "") next.sot.version_id = null;
    else if (/^[0-9a-f]{8}$/i.test(String(sotIn.version_id))) next.sot.version_id = String(sotIn.version_id).toLowerCase();
    else return refuse(400, "OUTLET-VERSION-ID");
  }
  for (const key of ["count", "live_count", "local_only_count", "isolation_software_count"]) {
    if (softIn[key] == null && body[key] == null) continue;
    const n = finite(softIn[key] != null ? softIn[key] : body[key]);
    if (n == null) return refuse(400, "OUTLET-COUNT");
    next.softwares[key] = n;
  }
  if (softIn.count_note != null || body.count_note != null) {
    const note = text(softIn.count_note != null ? softIn.count_note : body.count_note);
    if (note.length > 4000) return refuse(400, "OUTLET-NOTE");
    next.softwares.count_note = note;
  }
  if (softIn.framing != null) {
    const framing = text(softIn.framing);
    if (framing.length > 1000) return refuse(400, "OUTLET-NOTE");
    next.softwares.framing = framing;
  }
  if (help) next.suite_help = Object.assign({}, JEEVES_SUITE_HELP, help, { software_tab: false });
  next.sot.live = true;
  next.sot.origin = SOFTWARE_SOT_URL;
  return {
    ok: true,
    status: 200,
    applied: true,
    counters_untouched: true,
    dropped_counter_fields: droppedCounterFields(body),
    state: sealOutlet({ cite: next, source: "fanout", reachable: true, status: "applied" }),
  };
}

export function citeFromSoftwareDoc(doc) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return refuse(502, "OUTLET-SOT");
  if ((doc.author && doc.author !== AUTHOR) || (doc.identity && doc.identity !== AUTHOR)) {
    return refuse(403, "OUTLET-IDENTITY");
  }
  const products = []
    .concat(Array.isArray(doc.software) ? doc.software : [])
    .concat(Array.isArray(doc.products) ? doc.products : []);
  const jeevesCard = products.some((row) => isSuiteHelpSlug(row && row.slug, row && row.name));
  const envelope = {
    author: doc.author || AUTHOR,
    identity: doc.identity || AUTHOR,
    sot: {
      branch: RUNTIME_SOT_BRANCH,
      git_sha: doc.git_sha || doc.git || "",
      version: doc.version || "",
    },
    softwares: {
      count: doc.count,
      live_count: doc.live_count,
      local_only_count: doc.local_only_count,
      isolation_software_count: doc.isolation_software_count,
      count_note: doc.count_note,
      framing: doc.framing,
    },
    suite_help: jeevesCard ? null : (doc.suite_help || JEEVES_SUITE_HELP),
  };
  if (jeevesCard) {
    envelope.suite_help = Object.assign({}, JEEVES_SUITE_HELP, { dropped_software_card: true });
  }
  if (Object.prototype.hasOwnProperty.call(doc, "version_id")) envelope.sot.version_id = doc.version_id;
  const accepted = acceptFanout(null, envelope);
  if (!accepted.ok) return accepted;
  accepted.state = sealOutlet({
    cite: accepted.state.cite,
    source: "pull",
    reachable: true,
    status: "live",
  });
  accepted.dropped_software_card = jeevesCard;
  return accepted;
}

export function unreachableCite(previous, why) {
  const state = sealOutlet({
    cite: baseCite(previous),
    source: "last-known",
    reachable: false,
    status: "unreachable",
  });
  state.note = "Runtime SoT was unreachable (" + (why || "fetch") + "). Last-known cite kept. No library rows invented.";
  state.applied = false;
  return state;
}

export async function pullSoftwareSot(previous, fetchImpl) {
  const fetchFn = fetchImpl || globalThis.fetch;
  try {
    const res = await fetchFn(SOFTWARE_SOT_URL, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 AzielDigitalLibrary" },
    });
    if (!res || !res.ok) return unreachableCite(previous, "http");
    const doc = await res.json();
    const accepted = citeFromSoftwareDoc(doc);
    if (!accepted.ok) {
      const kept = unreachableCite(previous, accepted.error || "refused");
      kept.error = accepted.error;
      kept.applied = false;
      return kept;
    }
    return accepted.state;
  } catch {
    return unreachableCite(previous, "fetch");
  }
}

function guardKey(key) {
  if (isReservedCounterKey(key, PROJECT) || /views|downloads|__total__/i.test(String(key || ""))) {
    const err = new Error("download counters are untouched");
    err.code = "OUTLET-COUNTERS";
    throw err;
  }
}

export async function readJsonKey(env, key) {
  guardKey(key);
  const kv = env && env.DOWNLOADS;
  if (!kv || typeof kv.get !== "function") return null;
  try {
    const raw = await kv.get(key);
    if (!raw) return null;
    const doc = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!doc || typeof doc !== "object") return null;
    if (doc.author && doc.author !== AUTHOR) return null;
    if (doc.identity && doc.identity !== AUTHOR) return null;
    return doc;
  } catch {
    return null;
  }
}

export async function writeJsonKey(env, key, doc) {
  guardKey(key);
  const kv = env && env.DOWNLOADS;
  if (!kv || typeof kv.put !== "function") return false;
  const body = Object.assign({}, doc, { author: AUTHOR, identity: AUTHOR });
  for (const field of COUNTER_FIELDS.concat(ROW_FIELDS)) delete body[field];
  await kv.put(key, JSON.stringify(body));
  return true;
}

export async function readOutletState(env) {
  const stored = await readJsonKey(env, OUTLET_KV_KEY);
  if (!stored || !stored.cite) return null;
  if (!suiteHelpOk(stored.cite.suite_help)) return null;
  return stored;
}

export function softwareFramingFields(catalog, outletCite, { source } = {}) {
  const soft = outletCite && outletCite.softwares;
  const catCount = finite(catalog && catalog.count);
  const outCount = finite(soft && soft.count);
  const catLive = finite(catalog && catalog.live_count);
  const outLive = finite(soft && soft.live_count);
  const catIso = finite(catalog && catalog.isolation_software_count);
  const outIso = finite(soft && soft.isolation_software_count);
  const empty = source === "empty" || source === "unreachable";
  const frozen = empty ? frozenCite().softwares : null;
  const tab = catCount != null ? catCount : outCount != null ? outCount : frozen ? frozen.count : null;
  let tabSource = "unspecified";
  if (catCount != null) tabSource = "sot";
  else if (outCount != null) tabSource = "last-known";
  else if (frozen) tabSource = "frozen";
  const note = text(catalog && catalog.count_note) || text(soft && soft.count_note) || (frozen ? frozen.count_note : "");
  const help = outletCite && outletCite.suite_help;
  return {
    suite_help: suiteHelpOk(help) && help ? Object.assign({}, JEEVES_SUITE_HELP, help, { software_tab: false }) : JEEVES_SUITE_HELP,
    softwares_tab_count: tab,
    softwares_tab_count_source: tabSource,
    softwares_live_count: catLive != null ? catLive : outLive != null ? outLive : frozen ? frozen.live_count : null,
    isolation_software_count: catIso != null ? catIso : outIso != null ? outIso : frozen ? frozen.isolation_software_count : null,
    count_note: note,
  };
}

export function inventoryRowsFromDoc(doc) {
  const raw = doc && (Array.isArray(doc.records) ? doc.records : Array.isArray(doc.rows) ? doc.rows : null);
  if (!raw) return { present: false, rows: [] };
  const rows = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const id = String(row.record_id || "").trim();
    if (!RECORD_ID.test(id)) continue;
    const card = { record_id: id, invented: false };
    if (typeof row.title === "string" && row.title.trim()) card.title = row.title.trim();
    if (typeof row.author === "string" && row.author.trim()) card.author = row.author.trim();
    rows.push(card);
  }
  return { present: true, rows };
}

function cloneRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => Object.assign({ invented: false }, row, { invented: false }));
}

function peerState(peer, extra) {
  return Object.assign({
    id: peer.id,
    origin: peer.origin,
    inventory: peer.inventory,
    invented: false,
    counters_untouched: true,
  }, extra);
}

async function syncRemotePeer(peer, fetchFn, lastKnown) {
  const prev = lastKnown && lastKnown.peers && lastKnown.peers[peer.id];
  const kept = cloneRows(prev && prev.rows);
  try {
    const res = await fetchFn(peer.inventory, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 AzielDigitalLibrary" },
    });
    if (!res || !res.ok) throw new Error("unreachable");
    const doc = await res.json();
    const parsed = inventoryRowsFromDoc(doc);
    if (!parsed.present) {
      return peerState(peer, {
        reachable: true,
        status: "live-unspecified",
        source: "last-known",
        rows: kept,
        fetched_at: new Date().toISOString(),
        note: "Peer responded without a library row list. Last-known rows kept. None invented.",
      });
    }
    return peerState(peer, {
      reachable: true,
      status: "live",
      source: peer.inventory,
      rows: parsed.rows,
      fetched_at: new Date().toISOString(),
      note: "Rows are the peer list after record_id checks. None invented.",
    });
  } catch {
    return peerState(peer, {
      reachable: false,
      status: "unreachable",
      source: "last-known",
      rows: kept,
      fetched_at: prev && prev.fetched_at || null,
      note: kept.length
        ? "Peer hub unreachable. Last-known library rows kept. None invented."
        : "Peer hub unreachable. No last-known library rows. None invented.",
    });
  }
}

export async function syncSiteInventory(env, { fetchImpl, lastKnown } = {}) {
  const fetchFn = fetchImpl || globalThis.fetch;
  const peers = [];
  for (const peer of INVENTORY_PEERS) {
    if (peer.local) {
      let rows = [];
      let reachable = true;
      try {
        const packed = await readPackedIndex(env);
        rows = inventoryRowsFromDoc(packed).rows;
      } catch {
        reachable = false;
        const prev = lastKnown && lastKnown.peers && lastKnown.peers[peer.id];
        rows = cloneRows(prev && prev.rows);
      }
      peers.push(peerState(peer, {
        reachable,
        status: reachable ? "local" : "unreachable",
        source: reachable ? "packed-index" : "last-known",
        rows,
        note: reachable
          ? "Packed library:index:v1 rows only."
          : "Packed index unread. Last-known rows kept. None invented.",
      }));
      continue;
    }
    peers.push(await syncRemotePeer(peer, fetchFn, lastKnown));
  }
  const byId = {};
  for (const peer of peers) byId[peer.id] = peer;
  return {
    ok: true,
    spec: INVENTORY_SPEC,
    author: AUTHOR,
    identity: AUTHOR,
    invented: false,
    counters_untouched: true,
    downloads_untouched: true,
    peers,
    by_id: byId,
  };
}

function inventoryDocument(doc) {
  const peers = INVENTORY_PEERS.map((peer) => {
    const prev = doc && doc.peers && doc.peers[peer.id];
    if (prev && typeof prev === "object") {
      return peerState(peer, {
        reachable: prev.reachable == null ? null : Boolean(prev.reachable),
        status: prev.status || "last-known",
        source: prev.source || "last-known",
        rows: cloneRows(prev.rows),
        fetched_at: prev.fetched_at || null,
        note: prev.note || "Last-known inventory. None invented.",
      });
    }
    return peerState(peer, {
      reachable: null,
      status: "not-synced",
      source: "none",
      rows: [],
      note: "No sync yet. No library rows invented.",
    });
  });
  return {
    ok: true,
    spec: INVENTORY_SPEC,
    author: AUTHOR,
    identity: AUTHOR,
    invented: false,
    counters_untouched: true,
    downloads_untouched: true,
    peers,
  };
}

function pathOf(url) {
  return String(url && url.pathname || "").replace(/\/+$/, "") || "/";
}

export async function handleMeshOutlet(request, url, env) {
  const path = pathOf(url);
  if (path !== OUTLET_PATH) return null;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  if (request.method === "GET" || request.method === "HEAD") {
    const stored = await readOutletState(env);
    const sync = url.searchParams && url.searchParams.get("sync") === "1";
    if (!sync) {
      const state = stored || frozenOutletState();
      return headOrJson(request, state);
    }
    if (!outletAuthorized(request, env)) {
      return json({ ok: false, error: "OUTLET-AUTH", author: AUTHOR, identity: AUTHOR, counters_untouched: true }, 401);
    }
    const pulled = await pullSoftwareSot(stored || frozenOutletState(), env && env.outletFetch);
    if (pulled && pulled.ok && pulled.status !== "unreachable" && pulled.source === "pull") {
      await writeJsonKey(env, OUTLET_KV_KEY, pulled);
    }
    return headOrJson(request, pulled, pulled && pulled.ok === false ? 403 : 200);
  }
  if (request.method !== "POST") {
    return json({ ok: false, error: "OUTLET-METHOD", author: AUTHOR, identity: AUTHOR }, 405);
  }
  if (!outletAuthorized(request, env)) {
    return json({ ok: false, error: "OUTLET-AUTH", author: AUTHOR, identity: AUTHOR, counters_untouched: true }, 401);
  }
  let body;
  try { body = await request.json(); } catch { return json(refuse(400, "OUTLET-BODY"), 400); }
  const stored = await readOutletState(env);
  const accepted = acceptFanout(stored || frozenOutletState(), body);
  if (!accepted.ok) return json(accepted, accepted.status);
  await writeJsonKey(env, OUTLET_KV_KEY, accepted.state);
  return json(Object.assign({ dropped_counter_fields: accepted.dropped_counter_fields }, accepted.state), 200);
}

export async function handleSiteInventory(request, url, env) {
  const path = pathOf(url);
  if (path !== INVENTORY_PATH) return null;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ ok: false, error: "OUTLET-METHOD", author: AUTHOR, identity: AUTHOR }, 405);
  }
  const stored = await readJsonKey(env, INVENTORY_KV_KEY);
  const sync = url.searchParams && url.searchParams.get("sync") === "1";
  if (!sync) return headOrJson(request, inventoryDocument(stored));
  if (!outletAuthorized(request, env)) {
    return json({ ok: false, error: "OUTLET-AUTH", author: AUTHOR, identity: AUTHOR, counters_untouched: true }, 401);
  }
  const next = await syncSiteInventory(env, { fetchImpl: env && env.outletFetch, lastKnown: stored });
  const saved = {
    spec: INVENTORY_SPEC,
    author: AUTHOR,
    identity: AUTHOR,
    invented: false,
    peers: next.by_id,
    updated_at: new Date().toISOString(),
  };
  await writeJsonKey(env, INVENTORY_KV_KEY, saved);
  return headOrJson(request, {
    ok: true,
    spec: INVENTORY_SPEC,
    author: AUTHOR,
    identity: AUTHOR,
    invented: false,
    counters_untouched: true,
    downloads_untouched: true,
    peers: next.peers,
  });
}
