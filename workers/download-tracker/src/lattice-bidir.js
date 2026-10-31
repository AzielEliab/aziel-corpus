/**
 * Secondary lattice for GodLock bidir. AZRT-DUAL-LATTICE-1.0.
 *
 * Primary shelf is aziel-runtime. This Worker is aziel-corpus, the secondary.
 * Wrap stores one hash block by entry_hash. Pull reads that hash back.
 * The pull is one indexed read plus a count across every plane
 * (users, sites, uses, host sites, access points, nodes, node mesh).
 * That aggregate, and any session-handle username on a row, requires the
 * operator token. An unauthenticated aggregate fails closed and lists no handles.
 * It does not walk the library ledger from genesis and it does not fan out.
 *
 * live stays false. Cap-7 stays off the ICANN name plane.
 * Paid sat stays HELD. decryption_complete stays false.
 * Unseal receipts from TimeToUnsealTheBook use the same wrap and pull.
 * They land on the unseal plane. Corpus refuses tie-break; runtime owns it.
 * Intake flags are not read or written here.
 * Author: Aziel Eliab.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { hashPayload } from "./ledger.js";
import { isOperator } from "./library.js";
import { isOperatorRequest, operatorTokenFromEnv } from "./rate-limit.js";
import {
  COUNTER_SNAPSHOT_KIND,
  KEYWORD_KIND,
  KEYWORD_RE,
  METHOD_RUN_KIND,
  PAID_SAT_HELD,
  SOURCE_BLOB_RE,
  TEST_ID_RE,
  THEME_RE,
  THEORY_KIND,
  UNSEAL_KINDS,
  UNSEAL_PLANE,
  UNSEAL_SOURCE,
  isUnsealSlot,
} from "./voynich-housing.js";
import { fileAggregateReceipt, isAggregateSite } from "./receipt-aggregate.js";

export const LATTICE_SPEC = "AZRT-DUAL-LATTICE-1.0";
export const PRIMARY_TARGET = "aziel-runtime";
export const SECONDARY_TARGET = "aziel-corpus";
export const LATTICE_WRAP_PATH = "/v1/lattice/wrap";
export const LATTICE_PULL_PATH = "/v1/lattice/pull";
export const LATTICE_USER_RE = /^[a-zA-Z0-9._-]{1,80}$/;
/** Product live stays false. These routes run because this file implements them. */
export const LATTICE_SECONDARY_LIVE = false;

/** Default off. Wrap and pull fail closed until this flag is on. */
export function latticeRemoteEnabled(env) {
  const value = env && env.LATTICE_REMOTE;
  if (value === true || value === 1) return true;
  const text = String(value == null ? "" : value).trim().toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
}

/** Planes a pull always reads. One row lives on one plane; the read covers every plane. */
export const LATTICE_PLANES = Object.freeze([
  "users",
  "sites",
  "uses",
  "host_sites",
  "access_points",
  "nodes",
  "node_mesh",
  UNSEAL_PLANE,
]);

const HEX64 = /^[a-f0-9]{64}$/;
const SLOT_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const MAX_BODY = 8192;
const TOP_KEYS = new Set(["entry_hash", "lattice", "position", "target", "spec", "plane", "scope", "unseal", "aggregate"]);
const AGGREGATE_KEYS = new Set([
  "site",
  "receipt_hash",
  "decryption_complete",
  "live",
  "cap7_is_icann",
  "public_icann",
  "resolves_to_hub",
  "paid_sat",
  "sat",
]);
const UNSEAL_KEYS = new Set([
  "source",
  "kind",
  "id",
  "slot",
  "decryption_complete",
  "live",
  "cap7_is_icann",
  "public_icann",
  "resolves_to_hub",
  "paid_sat",
  "sat",
  "receipt_hash",
  "tab",
  "test_id",
  "ledger_entry_hash",
  "sha256",
  "source_blob",
  "theory_id",
  "method_id",
  "keyword",
  "theme",
]);
const BLOCK_KEYS = new Set([
  "spec",
  "document_hash",
  "primary",
  "primary_prev",
  "secondary",
  "secondary_prev",
  "offline",
  "username",
  "lattices",
]);

export function latticePolicy() {
  return {
    live: false,
    auto_update: false,
    rf: false,
    sat: false,
    paid_sat: PAID_SAT_HELD,
    decryption_complete: false,
    cap7_is_icann: false,
    public_icann: false,
    resolves_to_hub: false,
    spend: false,
    tiebreak: "refused",
    tiebreak_owner: "aziel-runtime",
    role: "secondary",
    target: SECONDARY_TARGET,
    primary_target: PRIMARY_TARGET,
  };
}

export function isHex64(value) {
  return typeof value === "string" && HEX64.test(value);
}

function fail(status, code, extra = {}) {
  return {
    status,
    body: {
      ok: false,
      live: false,
      code,
      written: false,
      rebuilt_from_zero: false,
      fan_out: false,
      username_listing: false,
      role: "secondary",
      target: SECONDARY_TARGET,
      policy: latticePolicy(),
      ...extra,
    },
  };
}

function claimsIcann(obj) {
  if (!obj || typeof obj !== "object") return false;
  return obj.cap7_is_icann === true || obj.public_icann === true || obj.resolves_to_hub === true;
}

function hasIntakeFlag(obj) {
  return !!obj && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, "intake_live");
}

export function verifyLatticeBlock(block) {
  if (!block || typeof block !== "object" || Array.isArray(block)) return "LATTICE-SHAPE";
  if (Object.prototype.hasOwnProperty.call(block, "position")) return "LATTICE-POSITION-INSIDE";
  if (claimsIcann(block)) return "CAP7-NOT-ICANN";
  if (block.live === true) return "LATTICE-NOT-LIVE";
  if (hasIntakeFlag(block)) return "LATTICE-FLAG";
  if (Object.prototype.hasOwnProperty.call(block, "tiebreak")) return "LATTICE-TIEBREAK-CORPUS";
  if (Object.prototype.hasOwnProperty.call(block, "tab") && block.tab !== "voynich") return "VOYNICH-TAB";
  for (const key of Object.keys(block)) {
    if (key === "tab") continue;
    if (!BLOCK_KEYS.has(key)) return "LATTICE-FIELD";
  }
  if (block.spec !== LATTICE_SPEC) return "LATTICE-SPEC";
  if (!isHex64(block.document_hash) || !isHex64(block.primary) || !isHex64(block.secondary)) return "LATTICE-SHAPE";
  if (!isHex64(block.primary_prev) || !isHex64(block.secondary_prev)) return "LATTICE-SHAPE";
  const names = block.lattices;
  if (!Array.isArray(names) || names.length !== 2 || !names.includes("primary") || !names.includes("secondary")) {
    return "LATTICE-SHAPE";
  }
  const primary = hashPayload({ document: block.document_hash, prev: block.primary_prev });
  if (primary !== block.primary) return "LATTICE-PRIMARY-MISS";
  if (block.offline === true) {
    const username = block.username == null ? "" : String(block.username);
    if (!LATTICE_USER_RE.test(username)) return "LATTICE-USERNAME";
    const secondary = hashPayload({ primary: block.document_hash, username });
    if (secondary !== block.secondary) return "LATTICE-SECONDARY-MISS";
  } else if (block.offline === false) {
    if (block.username != null) return "LATTICE-USERNAME";
    const secondary = hashPayload({ offline: false, prev: block.secondary_prev, primary: block.primary });
    if (secondary !== block.secondary) return "LATTICE-SECONDARY-MISS";
  } else {
    return "LATTICE-SHAPE";
  }
  return null;
}

export function canonicalBlock(block) {
  return {
    spec: LATTICE_SPEC,
    document_hash: block.document_hash,
    primary: block.primary,
    primary_prev: block.primary_prev,
    secondary: block.secondary,
    secondary_prev: block.secondary_prev,
    offline: block.offline === true,
    username: block.offline === true ? String(block.username) : null,
    lattices: ["primary", "secondary"],
  };
}

/** Offline secondary rows are the users plane. Unseal receipts are the unseal plane. Aggregated receipts are the sites plane. */
function planeFor(body, block, kind) {
  const derived = kind === "unseal" ? UNSEAL_PLANE : kind === "aggregate" ? "sites" : (block.offline === true ? "users" : null);
  if (!derived) return null;
  const raw = body.plane != null ? body.plane : body.scope;
  if (raw == null || raw === "") return derived;
  if (String(raw).trim() !== derived) return null;
  return derived;
}

function storedLattice(block, extra) {
  const canon = canonicalBlock(block);
  const tab = block && block.tab === "voynich" ? "voynich" : (extra && extra.unseal && extra.unseal.tab === "voynich" ? "voynich" : null);
  if ((!extra || (!extra.unseal && !extra.aggregate)) && !tab) return canon;
  const stored = {
    spec: canon.spec,
    document_hash: canon.document_hash,
    primary: canon.primary,
    primary_prev: canon.primary_prev,
    secondary: canon.secondary,
    secondary_prev: canon.secondary_prev,
    offline: canon.offline,
    username: canon.username,
    lattices: canon.lattices,
  };
  if (tab) stored.tab = tab;
  if (extra && extra.unseal) stored.unseal = extra.unseal;
  if (extra && extra.aggregate) stored.aggregate = extra.aggregate;
  return stored;
}

/** Unseal pointer on a wrap. Absent means a GodLock row. A present key must be a catalog slot. */
function screenUnsealPointer(value, entryHash) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, status: 422, code: "UNSEAL-SHAPE" };
  if (Object.prototype.hasOwnProperty.call(value, "tiebreak")) return { ok: false, status: 409, code: "LATTICE-TIEBREAK-CORPUS" };
  if (Object.prototype.hasOwnProperty.call(value, "decryption_complete") && value.decryption_complete !== false) {
    return { ok: false, status: 422, code: "UNSEAL-DECRYPTION-HELD" };
  }
  if (Object.prototype.hasOwnProperty.call(value, "live") && value.live !== false) {
    return { ok: false, status: 422, code: "LATTICE-NOT-LIVE" };
  }
  if (
    (Object.prototype.hasOwnProperty.call(value, "cap7_is_icann") && value.cap7_is_icann !== false)
    || (Object.prototype.hasOwnProperty.call(value, "public_icann") && value.public_icann !== false)
    || (Object.prototype.hasOwnProperty.call(value, "resolves_to_hub") && value.resolves_to_hub !== false)
  ) {
    return { ok: false, status: 422, code: "CAP7-NOT-ICANN" };
  }
  if (Object.prototype.hasOwnProperty.call(value, "sat") && value.sat !== false) {
    return { ok: false, status: 422, code: "UNSEAL-SAT-HELD" };
  }
  if (Object.prototype.hasOwnProperty.call(value, "paid_sat") && value.paid_sat !== PAID_SAT_HELD) {
    return { ok: false, status: 422, code: "UNSEAL-SAT-HELD" };
  }
  for (const key of Object.keys(value)) {
    if (!UNSEAL_KEYS.has(key)) return { ok: false, status: 422, code: "UNSEAL-FIELD" };
  }
  if (value.source !== UNSEAL_SOURCE) return { ok: false, status: 422, code: "UNSEAL-SOURCE" };
  if (Object.prototype.hasOwnProperty.call(value, "tab") && value.tab !== "voynich") {
    return { ok: false, status: 422, code: "VOYNICH-TAB" };
  }
  const flags = {
    decryption_complete: false,
    live: false,
    cap7_is_icann: false,
    public_icann: false,
    resolves_to_hub: false,
    paid_sat: PAID_SAT_HELD,
    sat: false,
  };
  if (value.kind === COUNTER_SNAPSHOT_KIND) {
    if (value.test_id || value.theory_id || value.method_id || value.keyword || value.ledger_entry_hash || value.sha256 || value.source_blob) {
      return { ok: false, status: 422, code: "UNSEAL-FIELD" };
    }
    return {
      ok: true,
      counter: true,
      unseal: { source: UNSEAL_SOURCE, kind: COUNTER_SNAPSHOT_KIND, id: "counter-snapshot", tab: "voynich", ...flags },
    };
  }
  if (value.kind === KEYWORD_KIND) {
    const keyword = typeof value.keyword === "string" ? value.keyword.trim() : "";
    const theme = typeof value.theme === "string" ? value.theme.trim() : "";
    const test_id = typeof value.test_id === "string" ? value.test_id : "";
    if (!KEYWORD_RE.test(keyword) || !THEME_RE.test(theme) || !TEST_ID_RE.test(test_id)) {
      return { ok: false, status: 422, code: "UNSEAL-SLOT" };
    }
    return {
      ok: true,
      unseal: { source: UNSEAL_SOURCE, kind: KEYWORD_KIND, keyword, theme, test_id, tab: "voynich", ...flags },
    };
  }
  if (value.kind === METHOD_RUN_KIND || (value.kind === "test" && value.method_id)) {
    const method_id = typeof value.method_id === "string" ? value.method_id : "";
    if (!TEST_ID_RE.test(method_id)) return { ok: false, status: 422, code: "UNSEAL-SLOT" };
    const test_id = value.test_id == null || value.test_id === "" ? null : value.test_id;
    if (test_id != null && !TEST_ID_RE.test(test_id)) return { ok: false, status: 422, code: "UNSEAL-SLOT" };
    return {
      ok: true,
      unseal: { source: UNSEAL_SOURCE, kind: METHOD_RUN_KIND, method_id, test_id, tab: "voynich", ...flags },
    };
  }
  if (value.kind === THEORY_KIND || (value.kind === "theory" && value.theory_id)) {
    const theory_id = typeof value.theory_id === "string" ? value.theory_id : "";
    if (!TEST_ID_RE.test(theory_id)) return { ok: false, status: 422, code: "UNSEAL-SLOT" };
    return {
      ok: true,
      unseal: { source: UNSEAL_SOURCE, kind: THEORY_KIND, theory_id, tab: "voynich", ...flags },
    };
  }
  const indexReceipt = value.test_id || value.ledger_entry_hash || value.sha256 || value.source_blob;
  if (indexReceipt) {
    if (value.kind !== "receipt" && value.kind !== "test") return { ok: false, status: 422, code: "UNSEAL-KIND" };
    const test_id = typeof value.test_id === "string" ? value.test_id : "";
    if (!TEST_ID_RE.test(test_id) || !isHex64(value.ledger_entry_hash) || value.ledger_entry_hash !== entryHash || !isHex64(value.sha256) || !SOURCE_BLOB_RE.test(value.source_blob)) {
      return { ok: false, status: 400, code: "UNSEAL-HASH" };
    }
    return {
      ok: true,
      unseal: {
        source: UNSEAL_SOURCE,
        kind: "receipt",
        test_id,
        ledger_entry_hash: value.ledger_entry_hash,
        sha256: value.sha256,
        source_blob: value.source_blob,
        tab: "voynich",
        ...flags,
      },
    };
  }
  if (!UNSEAL_KINDS.includes(value.kind)) return { ok: false, status: 422, code: "UNSEAL-KIND" };
  const id = typeof value.id === "string" ? value.id : "";
  const slot = value.slot == null || value.slot === "" ? id : value.slot;
  if (!SLOT_RE.test(id) || typeof slot !== "string" || !SLOT_RE.test(slot) || !isUnsealSlot(value.kind, slot)) {
    return { ok: false, status: 422, code: "UNSEAL-SLOT" };
  }
  if (value.receipt_hash != null && value.receipt_hash !== entryHash) {
    return { ok: false, status: 400, code: "UNSEAL-HASH" };
  }
  return {
    ok: true,
    unseal: { source: UNSEAL_SOURCE, kind: value.kind, id, slot, tab: value.tab === "voynich" ? "voynich" : undefined, ...flags },
  };
}

/** Aggregated receipt pointer. The hash is filed. Sister prose is not copied. */
function screenAggregatePointer(value, entryHash) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, status: 422, code: "AGGREGATE-SHAPE" };
  if (Object.prototype.hasOwnProperty.call(value, "tiebreak")) return { ok: false, status: 409, code: "LATTICE-TIEBREAK-CORPUS" };
  if (Object.prototype.hasOwnProperty.call(value, "decryption_complete") && value.decryption_complete !== false) {
    return { ok: false, status: 422, code: "UNSEAL-DECRYPTION-HELD" };
  }
  if (Object.prototype.hasOwnProperty.call(value, "live") && value.live !== false) {
    return { ok: false, status: 422, code: "LATTICE-NOT-LIVE" };
  }
  if (
    (Object.prototype.hasOwnProperty.call(value, "cap7_is_icann") && value.cap7_is_icann !== false)
    || (Object.prototype.hasOwnProperty.call(value, "public_icann") && value.public_icann !== false)
    || (Object.prototype.hasOwnProperty.call(value, "resolves_to_hub") && value.resolves_to_hub !== false)
  ) {
    return { ok: false, status: 422, code: "CAP7-NOT-ICANN" };
  }
  if (Object.prototype.hasOwnProperty.call(value, "sat") && value.sat !== false) {
    return { ok: false, status: 422, code: "UNSEAL-SAT-HELD" };
  }
  if (Object.prototype.hasOwnProperty.call(value, "paid_sat") && value.paid_sat !== PAID_SAT_HELD) {
    return { ok: false, status: 422, code: "UNSEAL-SAT-HELD" };
  }
  for (const key of Object.keys(value)) {
    if (!AGGREGATE_KEYS.has(key)) return { ok: false, status: 422, code: "AGGREGATE-FIELD" };
  }
  const site = typeof value.site === "string" ? value.site : "";
  if (!isAggregateSite(site)) return { ok: false, status: 422, code: "AGGREGATE-SITE" };
  if (value.receipt_hash != null && value.receipt_hash !== entryHash) {
    return { ok: false, status: 400, code: "AGGREGATE-HASH" };
  }
  return {
    ok: true,
    aggregate: {
      site,
      receipt_hash: entryHash,
      decryption_complete: false,
      live: false,
      cap7_is_icann: false,
      public_icann: false,
      resolves_to_hub: false,
      paid_sat: PAID_SAT_HELD,
      sat: false,
    },
  };
}

function positionFor(value) {
  if (value == null) return { ok: true, position: null };
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 1000000000) {
    return { ok: false };
  }
  return { ok: true, position: value };
}

function emptyCounts() {
  const counts = {};
  for (const plane of LATTICE_PLANES) counts[plane] = 0;
  return counts;
}

function aggregateBody(counts, foundIn) {
  return {
    planes: LATTICE_PLANES.slice(),
    counts,
    found_in: foundIn,
    read: LATTICE_PLANES.join(","),
    fan_out: false,
    rebuilt_from_zero: false,
    cap7_is_icann: false,
    public_icann: false,
  };
}

async function ensureTable(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS lattice_secondary ("
    + "entry_hash TEXT PRIMARY KEY, "
    + "document_hash TEXT NOT NULL, "
    + "plane TEXT NOT NULL, "
    + "target TEXT NOT NULL, "
    + "offline INTEGER NOT NULL DEFAULT 0, "
    + "secondary_hash TEXT NOT NULL, "
    + "position INTEGER, "
    + "lattice_json TEXT NOT NULL, "
    + "created_utc TEXT NOT NULL, "
    + "submitter_key TEXT)"
  ).run();
  try {
    await env.DB.prepare("ALTER TABLE lattice_secondary ADD COLUMN submitter_key TEXT").run();
  } catch { /* column already present */ }
  await env.DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_lattice_secondary_plane ON lattice_secondary(plane)"
  ).run();
  await env.DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_lattice_secondary_offline ON lattice_secondary(secondary_hash)"
  ).run();
}

async function readAggregate(env) {
  const res = await env.DB.prepare(
    "SELECT plane, COUNT(*) AS n FROM lattice_secondary GROUP BY plane /* lattice-aggregate */"
  ).all();
  const counts = emptyCounts();
  const list = res && Array.isArray(res.results) ? res.results : [];
  for (const row of list) {
    const plane = row && LATTICE_PLANES.includes(row.plane) ? row.plane : null;
    if (!plane) continue;
    const n = Number(row.n);
    counts[plane] = Number.isFinite(n) && n > 0 ? n : 0;
  }
  return counts;
}

async function readEntry(env, entryHash) {
  const row = await env.DB.prepare(
    "SELECT entry_hash, document_hash, plane, target, offline, position, lattice_json, submitter_key "
    + "FROM lattice_secondary WHERE entry_hash = ? /* lattice-pull */"
  ).bind(entryHash).first();
  if (!row || row.entry_hash !== entryHash) return null;
  let lattice = null;
  try { lattice = JSON.parse(row.lattice_json); } catch { lattice = null; }
  if (!lattice || lattice.document_hash !== row.document_hash) return null;
  return {
    entry_hash: row.entry_hash,
    document_hash: row.document_hash,
    plane: row.plane,
    target: row.target,
    offline: Number(row.offline) === 1,
    position: row.position == null ? null : Number(row.position),
    submitter_key: row.submitter_key ? String(row.submitter_key) : "",
    lattice,
  };
}

function samePosition(a, b) {
  const left = a == null ? null : Number(a);
  const right = b == null ? null : Number(b);
  return left === right;
}

function sessionToken(request) {
  const raw = request && request.headers ? request.headers.get("Cookie") || "" : "";
  const match = raw.match(/(?:^|;\s*)aziel_session=([^;]+)/);
  return match ? match[1] : "";
}

function headerToken(request, name) {
  if (!request || !request.headers) return "";
  return String(request.headers.get(name) || "").trim();
}

function bearerToken(request) {
  const match = headerToken(request, "Authorization").match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function sameSecret(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  if (!a.length || a.length !== b.length) return false;
  try { return timingSafeEqual(a, b); } catch { return false; }
}

function configuredSecrets(env) {
  const runtime = env && env.RUNTIME_TOKEN ? String(env.RUNTIME_TOKEN).trim() : "";
  return [operatorTokenFromEnv(env), runtime].filter(Boolean);
}

/**
 * Operator session, corpus operator header, Authorization Bearer,
 * or X-Aziel-Runtime-Token. A public caller is not authorized.
 */
async function operatorGrant(request, env) {
  let signed = null;
  const token = sessionToken(request);
  if (token && env && env.DB && typeof env.DB.prepare === "function") {
    try {
      const row = await env.DB.prepare(
        "SELECT user_id, role, expires_utc FROM sessions WHERE token=? /* lattice-auth */"
      ).bind(token).first();
      if (row && !(row.expires_utc && row.expires_utc < new Date().toISOString())) {
        signed = { user_id: row.user_id, role: row.role };
      }
    } catch {
      signed = null;
    }
  }
  if (isOperator(signed) && signed.user_id) {
    return { ok: true, submitter_key: submitterKeyFor("session|" + signed.user_id) };
  }
  const secrets = configuredSecrets(env);
  const presented = [
    headerToken(request, "X-Aziel-Operator-Token"),
    headerToken(request, "X-Aziel-Runtime-Token"),
    bearerToken(request),
  ].filter(Boolean);
  for (const given of presented) {
    for (const secret of secrets) {
      if (sameSecret(given, secret)) return { ok: true, submitter_key: submitterKeyFor("token|" + given) };
    }
  }
  if (isOperatorRequest(request, env, signed)) {
    const material = presented[0] || (signed && signed.user_id) || "";
    if (!material) return { ok: false, submitter_key: "" };
    return { ok: true, submitter_key: submitterKeyFor("token|" + material) };
  }
  return { ok: false, submitter_key: "" };
}

const PRIVATE_FIELDS = new Set(["username", "lattice_handles", "offline_user", "offline_username", "user_handle", "submitter_key"]);

export const LATTICE_WRAP_PER_MINUTE = 30;
const wrapRate = new Map();

export function resetLatticeRate() {
  wrapRate.clear();
}

export function allowWrapRate(key, now = Date.now(), limit = LATTICE_WRAP_PER_MINUTE) {
  if (!key) return false;
  const cap = Number(limit);
  if (!Number.isFinite(cap) || cap < 1) return false;
  const window = Math.floor(now / 60000);
  const id = key + ":" + window;
  const next = (wrapRate.get(id) || 0) + 1;
  wrapRate.set(id, next);
  return next <= cap;
}

function submitterKeyFor(material) {
  return createHash("sha256").update("lattice-submitter|" + String(material)).digest("hex");
}

function omitPrivate(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(omitPrivate);
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (PRIVATE_FIELDS.has(key)) continue;
    out[key] = item && typeof item === "object" ? omitPrivate(item) : item;
  }
  return out;
}

function pullBody(row, counts, revealUser) {
  const base = {
    live: false,
    written: false,
    rebuilt_from_zero: false,
    fan_out: false,
    username_listing: false,
    role: "secondary",
    target: SECONDARY_TARGET,
    policy: latticePolicy(),
  };
  if (!row) {
    const miss = { ...base, ok: false, code: "LATTICE-PULL-MISS" };
    if (counts) miss.aggregate = aggregateBody(counts, []);
    return miss;
  }
  const body = {
    ...base,
    ok: true,
    code: "LATTICE-PULL-OK",
    entry_hash: row.entry_hash,
    position: row.position,
    plane: row.plane,
    lattice: revealUser ? row.lattice : omitPrivate(row.lattice),
    username_listing: !!(revealUser && row.lattice && row.lattice.username),
  };
  if (counts) body.aggregate = aggregateBody(counts, row.plane ? [row.plane] : []);
  return body;
}

async function storeReady(env) {
  if (!env || !env.DB || typeof env.DB.prepare !== "function") return false;
  try {
    await ensureTable(env);
    return true;
  } catch {
    return false;
  }
}

async function readHandles(env) {
  const res = await env.DB.prepare(
    "SELECT lattice_json FROM lattice_secondary /* lattice-handles */"
  ).all();
  const seen = [];
  const list = res && Array.isArray(res.results) ? res.results : [];
  for (const row of list) {
    let lattice = null;
    try { lattice = JSON.parse(row.lattice_json); } catch { lattice = null; }
    const name = lattice && lattice.username;
    if (typeof name === "string" && LATTICE_USER_RE.test(name) && !seen.includes(name)) seen.push(name);
  }
  return seen;
}

async function pullEntry(env, entryHash, revealUser) {
  if (!isHex64(entryHash)) return fail(400, "LATTICE-DOCUMENT");
  if (!(await storeReady(env))) return fail(503, "LATTICE-STORE-UNAVAILABLE");
  let row;
  try {
    row = await readEntry(env, entryHash);
  } catch {
    return fail(503, "LATTICE-STORE-UNAVAILABLE");
  }
  if (!row) return { status: 404, body: pullBody(null, null, false) };
  return { status: 200, body: pullBody(row, null, revealUser) };
}

function screenWrap(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail(400, "LATTICE-JSON");
  if (Object.prototype.hasOwnProperty.call(body, "tiebreak")) return fail(409, "LATTICE-TIEBREAK-CORPUS");
  if (body.decryption_complete === true || (body.lattice && body.lattice.decryption_complete === true)) {
    return fail(422, "UNSEAL-DECRYPTION-HELD");
  }
  if (body.sat === true || (body.paid_sat != null && body.paid_sat !== PAID_SAT_HELD)) return fail(422, "UNSEAL-SAT-HELD");
  if (claimsIcann(body) || claimsIcann(body.lattice) || claimsIcann(body.policy)) return fail(422, "CAP7-NOT-ICANN");
  if (body.live === true || (body.policy && body.policy.live === true) || (body.lattice && body.lattice.live === true)) {
    return fail(422, "LATTICE-NOT-LIVE");
  }
  if (hasIntakeFlag(body) || hasIntakeFlag(body.policy) || hasIntakeFlag(body.lattice)) return fail(422, "LATTICE-FLAG");
  for (const key of Object.keys(body)) {
    if (!TOP_KEYS.has(key)) return fail(422, "LATTICE-FIELD");
  }
  const entry_hash = typeof body.entry_hash === "string" ? body.entry_hash : "";
  if (!isHex64(entry_hash)) return fail(400, "LATTICE-DOCUMENT");
  if (body.spec != null && body.spec !== LATTICE_SPEC) return fail(422, "LATTICE-SPEC");
  if (body.target != null && body.target !== SECONDARY_TARGET) return fail(422, "LATTICE-TARGET");
  const reason = verifyLatticeBlock(body.lattice);
  if (reason === "LATTICE-TIEBREAK-CORPUS") return fail(409, reason);
  if (reason === "VOYNICH-TAB") return fail(422, reason);
  if (reason) return fail(422, reason);
  let unseal = null;
  if (Object.prototype.hasOwnProperty.call(body, "unseal")) {
    const screenedUnseal = screenUnsealPointer(body.unseal, entry_hash);
    if (!screenedUnseal.ok) return fail(screenedUnseal.status, screenedUnseal.code);
    unseal = screenedUnseal.unseal;
  }
  let aggregate = null;
  if (Object.prototype.hasOwnProperty.call(body, "aggregate")) {
    const screenedAggregate = screenAggregatePointer(body.aggregate, entry_hash);
    if (!screenedAggregate.ok) return fail(screenedAggregate.status, screenedAggregate.code);
    aggregate = screenedAggregate.aggregate;
  }
  if (body.lattice && body.lattice.tab != null && !unseal) return fail(422, "VOYNICH-TAB");
  if (unseal && unseal.kind === COUNTER_SNAPSHOT_KIND && body.lattice.tab !== "voynich") {
    return fail(422, "VOYNICH-TAB");
  }
  if (unseal && aggregate) return fail(422, "LATTICE-FIELD");
  if (unseal || aggregate) {
    if (body.lattice.offline !== false) return fail(422, unseal ? "UNSEAL-NOT-USER" : "AGGREGATE-NOT-USER");
  } else if (body.lattice.offline !== true) {
    return fail(409, "LATTICE-SECONDARY-OFFLINE");
  }
  if (body.lattice.document_hash !== entry_hash) return fail(400, "LATTICE-DOCUMENT");
  const plane = planeFor(body, body.lattice, unseal ? "unseal" : aggregate ? "aggregate" : "");
  if (!plane) return fail(422, "LATTICE-PLANE");
  const position = positionFor(body.position);
  if (!position.ok) return fail(422, "LATTICE-FIELD");
  return {
    ok: true,
    entry_hash,
    plane,
    position: position.position,
    lattice: storedLattice(body.lattice, { unseal, aggregate }),
    aggregate,
  };
}

async function offlineDouble(env, secondary, entryHash) {
  const row = await env.DB.prepare(
    "SELECT entry_hash FROM lattice_secondary WHERE offline = 1 AND secondary_hash = ? AND entry_hash != ? /* lattice-double */"
  ).bind(secondary, entryHash).first();
  return !!(row && row.entry_hash);
}

/** A second site for one hash is a tie-break. Any other changed block stays LATTICE-DOUBLE. */
function clashCode(existing, screened) {
  const prev = existing && existing.lattice && existing.lattice.aggregate && existing.lattice.aggregate.site;
  const next = screened && screened.aggregate && screened.aggregate.site;
  if (prev && next && prev !== next) return "LATTICE-TIEBREAK-CORPUS";
  return "LATTICE-DOUBLE";
}

async function fileIfAggregate(env, screened) {
  if (!screened.aggregate) return null;
  const filed = await fileAggregateReceipt(env, {
    site: screened.aggregate.site,
    entry_hash: screened.entry_hash,
  });
  if (!filed.ok) {
    const status = filed.code === "LATTICE-TIEBREAK-CORPUS" ? 409 : 503;
    return fail(status, filed.code, { entry_hash: screened.entry_hash, filed: false });
  }
  return null;
}

async function writeWrap(env, screened, reveal) {
  const lattice_json = JSON.stringify(screened.lattice);
  const existing = await readEntry(env, screened.entry_hash);
  if (existing) {
    if (!screened.submitter_key || existing.submitter_key !== screened.submitter_key) {
      return fail(409, "LATTICE-SQUAT", { entry_hash: screened.entry_hash });
    }
    const same = JSON.stringify(existing.lattice) === lattice_json
      && existing.plane === screened.plane
      && samePosition(existing.position, screened.position)
      && existing.target === SECONDARY_TARGET;
    if (!same) return fail(409, clashCode(existing, screened), { entry_hash: screened.entry_hash });
    const refused = await fileIfAggregate(env, screened);
    if (refused) return refused;
    const body = pullBody(existing, null, reveal);
    body.code = "LATTICE-ALREADY";
    body.written = false;
    body.filed = !!screened.aggregate;
    return { status: 200, body };
  }
  if (screened.lattice.offline === true && await offlineDouble(env, screened.lattice.secondary, screened.entry_hash)) {
    return fail(409, "LATTICE-DOUBLE", { entry_hash: screened.entry_hash });
  }
  const created_utc = new Date().toISOString();
  try {
    await env.DB.prepare(
      "INSERT INTO lattice_secondary(entry_hash, document_hash, plane, target, offline, secondary_hash, position, lattice_json, created_utc, submitter_key) "
      + "VALUES(?,?,?,?,?,?,?,?,?,?)"
    ).bind(
      screened.entry_hash,
      screened.lattice.document_hash,
      screened.plane,
      SECONDARY_TARGET,
      screened.lattice.offline ? 1 : 0,
      screened.lattice.secondary,
      screened.position,
      lattice_json,
      created_utc,
      screened.submitter_key,
    ).run();
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (!/UNIQUE/i.test(msg)) return fail(503, "LATTICE-STORE-UNAVAILABLE");
    const again = await readEntry(env, screened.entry_hash);
    if (!again) return fail(503, "LATTICE-STORE-UNAVAILABLE");
    if (!screened.submitter_key || again.submitter_key !== screened.submitter_key) {
      return fail(409, "LATTICE-SQUAT", { entry_hash: screened.entry_hash });
    }
    if (JSON.stringify(again.lattice) !== lattice_json) return fail(409, clashCode(again, screened), { entry_hash: screened.entry_hash });
  }
  const row = await readEntry(env, screened.entry_hash);
  if (!row || row.entry_hash !== screened.entry_hash) return fail(503, "LATTICE-STORE-UNAVAILABLE");
  const refused = await fileIfAggregate(env, screened);
  if (refused) return refused;
  const body = pullBody(row, null, reveal);
  body.code = "LATTICE-WRAP-PULL";
  body.written = true;
  body.filed = !!screened.aggregate;
  return { status: 201, body };
}

async function wrapEntry(request, env) {
  if (!latticeRemoteEnabled(env)) return fail(403, "LATTICE-REMOTE-OFF", { enabled: false });
  const ctype = String((request.headers && request.headers.get("content-type")) || "");
  if (ctype && !/application\/json|text\/json/i.test(ctype)) return fail(415, "LATTICE-JSON");
  let raw = "";
  try { raw = await request.text(); } catch { return fail(400, "LATTICE-JSON"); }
  if (raw.length > MAX_BODY) return fail(413, "LATTICE-TOO-LARGE");
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return fail(400, "LATTICE-JSON"); }
  const screened = screenWrap(parsed);
  if (!screened.ok) return screened;
  const grant = await operatorGrant(request, env);
  if (!grant.ok || !grant.submitter_key) return fail(401, "LATTICE-AUTH");
  if (screened.aggregate) {
    const store = env && env.DOWNLOADS;
    if (!store || typeof store.get !== "function" || typeof store.put !== "function") {
      return fail(503, "AGGREGATE-STORE-UNAVAILABLE", { filed: false });
    }
  }
  const limit = env && env.LATTICE_WRAP_RATE != null ? Number(env.LATTICE_WRAP_RATE) : LATTICE_WRAP_PER_MINUTE;
  if (!allowWrapRate(grant.submitter_key, Date.now(), limit)) return fail(429, "LATTICE-RATE");
  if (!(await storeReady(env))) return fail(503, "LATTICE-STORE-UNAVAILABLE");
  try {
    return await writeWrap(env, { ...screened, submitter_key: grant.submitter_key }, true);
  } catch {
    return fail(503, "LATTICE-STORE-UNAVAILABLE");
  }
}

function truthyFlag(value) {
  return value === true || value === 1 || value === "1" || value === "true" || value === "all";
}

function aggregateFlag(url, source) {
  const hasPlanes = !!(url && url.searchParams.has("planes")) || !!(source && Object.prototype.hasOwnProperty.call(source, "planes"));
  const agg = source && source.aggregate != null ? source.aggregate : (url ? url.searchParams.get("aggregate") : null);
  return hasPlanes || truthyFlag(agg);
}

/** Pull may ask for the Unseal receipt on a hash. An object here is a wrap, not a pull. */
function unsealPullRequested(url, source) {
  if (source && Object.prototype.hasOwnProperty.call(source, "unseal")) {
    const value = source.unseal;
    if (value && typeof value === "object") return { ok: false, code: "UNSEAL-FIELD" };
    if (value === true || value === 1 || value === "1" || value === "true") return { ok: true, wants: true };
    if (value === false || value === 0 || value === "0" || value === "false" || value == null) return { ok: true, wants: false };
    return { ok: false, code: "UNSEAL-FIELD" };
  }
  const q = url && url.searchParams.has("unseal") ? url.searchParams.get("unseal") : null;
  if (q == null) return { ok: true, wants: false };
  if (q === "1" || q === "true") return { ok: true, wants: true };
  if (q === "0" || q === "false" || q === "") return { ok: true, wants: false };
  return { ok: false, code: "UNSEAL-FIELD" };
}

function aggregateRequested(url, source) {
  const fromQuery = String((url && url.searchParams.get("entry_hash")) || "");
  const fromBody = source && source.entry_hash != null ? String(source.entry_hash) : "";
  if (fromQuery && fromBody && fromQuery !== fromBody) return { mismatch: true, entry: "" };
  const entry = fromQuery || fromBody;
  const hasPlanes = !!(url && url.searchParams.has("planes")) || !!(source && Object.prototype.hasOwnProperty.call(source, "planes"));
  const agg = source && source.aggregate != null ? source.aggregate : (url ? url.searchParams.get("aggregate") : null);
  const wants = !entry || hasPlanes || agg === true || agg === 1 || agg === "1" || agg === "true" || agg === "all";
  return { mismatch: false, entry, wants };
}

async function readPullSource(request) {
  if (!request || request.method !== "POST") return { ok: true, value: {} };
  let raw = "";
  try { raw = await request.text(); } catch { return fail(400, "LATTICE-JSON"); }
  if (!raw) return { ok: true, value: {} };
  if (raw.length > MAX_BODY) return fail(413, "LATTICE-TOO-LARGE");
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return fail(400, "LATTICE-JSON");
    return { ok: true, value };
  } catch {
    return fail(400, "LATTICE-JSON");
  }
}

async function pullAggregate(env, entryHash, revealUser) {
  if (!(await storeReady(env))) return fail(503, "LATTICE-STORE-UNAVAILABLE");
  try {
    const counts = await readAggregate(env);
    const handles = await readHandles(env);
    const row = entryHash ? await readEntry(env, entryHash) : null;
    if (entryHash && !isHex64(entryHash)) return fail(400, "LATTICE-DOCUMENT");
    if (entryHash && isHex64(entryHash) && !row) {
      const miss = pullBody(null, counts, false);
      miss.aggregate.lattice_handles = handles;
      return { status: 404, body: miss };
    }
    const body = row ? pullBody(row, counts, revealUser) : {
      ok: true,
      live: false,
      code: "LATTICE-AGGREGATE",
      written: false,
      rebuilt_from_zero: false,
      fan_out: false,
      username_listing: handles.length > 0,
      role: "secondary",
      target: SECONDARY_TARGET,
      policy: latticePolicy(),
      aggregate: aggregateBody(counts, []),
    };
    body.aggregate.lattice_handles = handles;
    if (!revealUser) {
      body.lattice = body.lattice ? omitPrivate(body.lattice) : body.lattice;
      delete body.aggregate.lattice_handles;
      body.username_listing = false;
    }
    return { status: body.ok ? 200 : 404, body };
  } catch {
    return fail(503, "LATTICE-STORE-UNAVAILABLE");
  }
}

export async function handleLatticeBidir(request, url, env) {
  const path = String((url && url.pathname) || "").replace(/\/+$/, "") || "/";
  if (path !== LATTICE_WRAP_PATH && path !== LATTICE_PULL_PATH) return null;
  if (!latticeRemoteEnabled(env)) return fail(403, "LATTICE-REMOTE-OFF", { enabled: false });
  if (path === LATTICE_WRAP_PATH) {
    if (request.method !== "POST") return fail(405, "LATTICE-WRAP-POST");
    return wrapEntry(request, env);
  }
  if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "POST") {
    return fail(405, "LATTICE-PULL-GET");
  }
  const source = await readPullSource(request);
  if (!source.ok) return source;
  if ((url && url.searchParams.has("tiebreak")) || Object.prototype.hasOwnProperty.call(source.value, "tiebreak")) {
    return fail(409, "LATTICE-TIEBREAK-CORPUS");
  }
  const unsealAsk = unsealPullRequested(url, source.value);
  if (!unsealAsk.ok) return fail(422, unsealAsk.code);
  const asked = aggregateRequested(url, source.value);
  if (asked.mismatch) return fail(400, "LATTICE-ENTRY-MISMATCH");
  if (unsealAsk.wants && aggregateFlag(url, source.value)) return fail(409, "LATTICE-TIEBREAK-CORPUS");
  if (unsealAsk.wants && !asked.entry) return fail(400, "UNSEAL-ENTRY");
  const revealUser = (await operatorGrant(request, env)).ok;
  if (!unsealAsk.wants && asked.wants) {
    if (!revealUser) return fail(401, "LATTICE-AUTH");
    if (asked.entry && !isHex64(asked.entry)) return fail(400, "LATTICE-DOCUMENT");
    return pullAggregate(env, asked.entry, true);
  }
  const pulled = await pullEntry(env, asked.entry, revealUser);
  if (!unsealAsk.wants) return pulled;
  if (pulled.status === 503 || pulled.status === 400) return pulled;
  const rowUnseal = pulled.body && pulled.body.lattice && pulled.body.lattice.unseal;
  if (!rowUnseal) return fail(404, "UNSEAL-PULL-MISS");
  return pulled;
}
