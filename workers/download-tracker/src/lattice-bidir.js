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
 * Intake flags are not read or written here.
 * Author: Aziel Eliab.
 */
import { hashPayload } from "./ledger.js";
import { isOperatorRequest } from "./rate-limit.js";

export const LATTICE_SPEC = "AZRT-DUAL-LATTICE-1.0";
export const PRIMARY_TARGET = "aziel-runtime";
export const SECONDARY_TARGET = "aziel-corpus";
export const LATTICE_WRAP_PATH = "/v1/lattice/wrap";
export const LATTICE_PULL_PATH = "/v1/lattice/pull";
export const LATTICE_USER_RE = /^[a-zA-Z0-9._-]{1,80}$/;
/** Product live stays false. These routes run because this file implements them. */
export const LATTICE_SECONDARY_LIVE = false;

/** Planes a pull always reads. One row lives on one plane; the read covers every plane. */
export const LATTICE_PLANES = Object.freeze([
  "users",
  "sites",
  "uses",
  "host_sites",
  "access_points",
  "nodes",
  "node_mesh",
]);

const HEX64 = /^[a-f0-9]{64}$/;
const MAX_BODY = 8192;
const TOP_KEYS = new Set(["entry_hash", "lattice", "position", "target", "spec", "plane", "scope"]);
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
    cap7_is_icann: false,
    public_icann: false,
    resolves_to_hub: false,
    spend: false,
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
  if (Object.prototype.hasOwnProperty.call(block, "tiebreak")) return "LATTICE-TIEBREAK-PRIMARY";
  for (const key of Object.keys(block)) {
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

function planeFor(body, block) {
  const raw = body.plane != null ? body.plane : body.scope;
  if (raw == null || raw === "") return block.offline === true ? "users" : "sites";
  const name = String(raw).trim();
  if (!LATTICE_PLANES.includes(name)) return null;
  return name;
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
    + "created_utc TEXT NOT NULL)"
  ).run();
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
    "SELECT entry_hash, document_hash, plane, target, offline, position, lattice_json "
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

/** Operator header, bearer, or an operator session. A public caller is refused. */
async function mayReadAggregate(request, env) {
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
  return isOperatorRequest(request, env, signed);
}

function revealLattice(lattice, reveal) {
  if (!lattice || typeof lattice !== "object") return lattice;
  if (reveal) return lattice;
  const copy = { ...lattice };
  delete copy.username;
  return copy;
}

function pullBody(row, counts, reveal) {
  const base = {
    live: false,
    written: false,
    rebuilt_from_zero: false,
    fan_out: false,
    role: "secondary",
    target: SECONDARY_TARGET,
    policy: latticePolicy(),
  };
  if (!row) {
    const miss = {
      ...base,
      ok: false,
      code: "LATTICE-PULL-MISS",
    };
    if (reveal) miss.aggregate = aggregateBody(counts || emptyCounts(), []);
    return miss;
  }
  const body = {
    ...base,
    ok: true,
    code: "LATTICE-PULL-OK",
    entry_hash: row.entry_hash,
    position: row.position,
    plane: row.plane,
    lattice: revealLattice(row.lattice, reveal),
  };
  if (reveal) body.aggregate = aggregateBody(counts || emptyCounts(), row.plane ? [row.plane] : []);
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

async function pullEntry(request, env, entryHash) {
  if (!(await mayReadAggregate(request, env))) return fail(401, "LATTICE-AUTH");
  if (!isHex64(entryHash)) return fail(400, "LATTICE-DOCUMENT");
  if (!(await storeReady(env))) return fail(503, "LATTICE-STORE-UNAVAILABLE");
  let counts;
  let row;
  try {
    counts = await readAggregate(env);
    row = await readEntry(env, entryHash);
  } catch {
    return fail(503, "LATTICE-STORE-UNAVAILABLE");
  }
  const body = pullBody(row, counts, true);
  return { status: body.ok ? 200 : 404, body };
}

function screenWrap(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail(400, "LATTICE-JSON");
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
  if (reason) return fail(422, reason);
  if (body.lattice.document_hash !== entry_hash) return fail(400, "LATTICE-DOCUMENT");
  const plane = planeFor(body, body.lattice);
  if (!plane) return fail(422, "LATTICE-PLANE");
  const position = positionFor(body.position);
  if (!position.ok) return fail(422, "LATTICE-FIELD");
  return {
    ok: true,
    entry_hash,
    plane,
    position: position.position,
    lattice: canonicalBlock(body.lattice),
  };
}

async function offlineDouble(env, secondary, entryHash) {
  const row = await env.DB.prepare(
    "SELECT entry_hash FROM lattice_secondary WHERE offline = 1 AND secondary_hash = ? AND entry_hash != ? /* lattice-double */"
  ).bind(secondary, entryHash).first();
  return !!(row && row.entry_hash);
}

async function writeWrap(env, screened, reveal) {
  const lattice_json = JSON.stringify(screened.lattice);
  const existing = await readEntry(env, screened.entry_hash);
  if (existing) {
    const same = JSON.stringify(existing.lattice) === lattice_json
      && existing.plane === screened.plane
      && samePosition(existing.position, screened.position)
      && existing.target === SECONDARY_TARGET;
    if (!same) return fail(409, "LATTICE-DOUBLE", { entry_hash: screened.entry_hash });
    const counts = reveal ? await readAggregate(env) : null;
    const body = pullBody(existing, counts, reveal);
    body.code = "LATTICE-ALREADY";
    body.written = false;
    return { status: 200, body };
  }
  if (screened.lattice.offline === true && await offlineDouble(env, screened.lattice.secondary, screened.entry_hash)) {
    return fail(409, "LATTICE-DOUBLE", { entry_hash: screened.entry_hash });
  }
  const created_utc = new Date().toISOString();
  try {
    await env.DB.prepare(
      "INSERT INTO lattice_secondary(entry_hash, document_hash, plane, target, offline, secondary_hash, position, lattice_json, created_utc) "
      + "VALUES(?,?,?,?,?,?,?,?,?)"
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
    ).run();
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (!/UNIQUE/i.test(msg)) return fail(503, "LATTICE-STORE-UNAVAILABLE");
    const again = await readEntry(env, screened.entry_hash);
    if (!again || JSON.stringify(again.lattice) !== lattice_json) return fail(409, "LATTICE-DOUBLE", { entry_hash: screened.entry_hash });
  }
  const row = await readEntry(env, screened.entry_hash);
  if (!row || row.entry_hash !== screened.entry_hash) return fail(503, "LATTICE-STORE-UNAVAILABLE");
  const counts = reveal ? await readAggregate(env) : null;
  const body = pullBody(row, counts, reveal);
  body.code = "LATTICE-WRAP-PULL";
  body.written = true;
  return { status: 201, body };
}

async function wrapEntry(request, env) {
  const ctype = String((request.headers && request.headers.get("content-type")) || "");
  if (ctype && !/application\/json|text\/json/i.test(ctype)) return fail(415, "LATTICE-JSON");
  let raw = "";
  try { raw = await request.text(); } catch { return fail(400, "LATTICE-JSON"); }
  if (raw.length > MAX_BODY) return fail(413, "LATTICE-TOO-LARGE");
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return fail(400, "LATTICE-JSON"); }
  const screened = screenWrap(parsed);
  if (!screened.ok) return screened;
  if (!(await storeReady(env))) return fail(503, "LATTICE-STORE-UNAVAILABLE");
  try {
    const reveal = await mayReadAggregate(request, env);
    return await writeWrap(env, screened, reveal);
  } catch {
    return fail(503, "LATTICE-STORE-UNAVAILABLE");
  }
}

export async function handleLatticeBidir(request, url, env) {
  const path = String((url && url.pathname) || "").replace(/\/+$/, "") || "/";
  if (path !== LATTICE_WRAP_PATH && path !== LATTICE_PULL_PATH) return null;
  if (path === LATTICE_WRAP_PATH) {
    if (request.method !== "POST") return fail(405, "LATTICE-WRAP-POST");
    return wrapEntry(request, env);
  }
  if (request.method !== "GET" && request.method !== "HEAD") return fail(405, "LATTICE-PULL-GET");
  const entry_hash = String(url.searchParams.get("entry_hash") || "");
  return pullEntry(request, env, entry_hash);
}
