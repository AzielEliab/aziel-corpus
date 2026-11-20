/**
 * RECEIPT-PORT-1.0 — one ingest for sister-site receipts.
 * POST /v1/port/receipts stores a receipt. It does not call /v1/ingest
 * and it does not write the library ledger. Receipts are not documents.
 * Online accepts are wrapped onto the secondary lattice primary chain
 * (offline false) when D1 is bound. The public lattice door stays
 * fail-closed until LATTICE_REMOTE is on. live stays false.
 * Cap-7 is not ICANN. Paid sat stays HELD. Mesh tracking stays off.
 * Author: Aziel Eliab.
 */
import { timingSafeEqual } from "node:crypto";
import { hashPayload } from "./ledger.js";
import { json } from "./runtime.js";
import { isOperatorRequest } from "./rate-limit.js";
import { wrapPortReceipt } from "./lattice-bidir.js";

export const PORT_SPEC = "RECEIPT-PORT-1.0";
export const PORT_RECEIPTS_PATH = "/v1/port/receipts";
export const PORT_SITES_PATH = "/v1/port/sites";
export const PORT_MAX_BYTES = 64 * 1024;
export const PORT_PER_MINUTE = 60;
export const FURNACE_SCHEMA = "the-furnace-isnt-free.receipt.v1";
export const GENERIC_SCHEMA = "aziel.receipt-port.v1";
export const ZERO_HASH = "0".repeat(64);

const HEX64 = /^[a-f0-9]{64}$/;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,80}$/;
const KIND_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const SCHEMA_RE = /^[a-z0-9][a-z0-9._-]{0,119}$/;
const IMAGE_BYTE_KEYS = new Set(["jpeg_base64", "jpg_base64", "image_base64", "bytes_base64", "data_base64"]);
const ROW_PREFIX = "port:row:";
const INDEX_PREFIX = "port:index:";
const CHAIN_PREFIX = "port:chain:";
const INDEX_CAP = 5000;

const portRate = new Map();

/**
 * Adding a site is one entry here plus one Wrangler secret.
 * Slugs match the receipts aggregate catalog so the lattice can file the hash.
 */
export const PORT_SITES = Object.freeze([
  Object.freeze({
    id: "furnace",
    label: "furnaceisntfree.com",
    origin: "https://furnaceisntfree.com",
    aliases: Object.freeze(["https://www.furnaceisntfree.com"]),
    token_env: "PORT_TOKEN_FURNACE",
    schema: FURNACE_SCHEMA,
  }),
  Object.freeze({
    id: "godlock",
    label: "godlock.uk",
    origin: "https://godlock.uk",
    aliases: Object.freeze(["https://www.godlock.uk"]),
    token_env: "PORT_TOKEN_GODLOCK",
    schema: GENERIC_SCHEMA,
  }),
  Object.freeze({
    id: "unseal",
    label: "timetounsealthebook",
    origin: "https://www.timetounsealthebook.net",
    aliases: Object.freeze(["https://timetounsealthebook.net"]),
    token_env: "PORT_TOKEN_UNSEAL",
    schema: GENERIC_SCHEMA,
  }),
]);

export function resetPortRate() {
  portRate.clear();
}

export function allowPortRate(site, now = Date.now(), limit = PORT_PER_MINUTE) {
  const cap = Number(limit);
  if (!Number.isFinite(cap) || cap < 1) return false;
  const window = Math.floor(now / 60000);
  const id = String(site || "unknown") + ":" + window;
  const next = (portRate.get(id) || 0) + 1;
  portRate.set(id, next);
  return next <= cap;
}

export function isReceiptPortPath(path) {
  const bare = String(path || "").replace(/\/+$/, "") || "/";
  return bare === PORT_RECEIPTS_PATH || bare === PORT_SITES_PATH;
}

export function portSite(id) {
  return PORT_SITES.find((site) => site.id === id) || null;
}

export function tokenEquals(provided, expected) {
  const left = Buffer.from(String(provided || ""), "utf8");
  const right = Buffer.from(String(expected || ""), "utf8");
  if (!left.length || left.length !== right.length) return false;
  try {
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function receiptHash(fields) {
  return hashPayload({
    spec: PORT_SPEC,
    site: fields.site,
    id: fields.id,
    schema: fields.schema,
    kind: fields.kind,
    content_sha256: fields.content_sha256,
    created_at: fields.created_at,
    previous_hash: fields.previous_hash,
  });
}

function policyFields() {
  return {
    live: false,
    decryption_complete: false,
    cap7_is_icann: false,
    public_icann: false,
    resolves_to_hub: false,
    paid_sat: "HELD",
    sat: false,
    mesh_tracking: false,
    library_document: false,
  };
}

function reply(body, status) {
  const res = json(body, status);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function deny() {
  return reply({ ok: false, code: "PORT-AUTH", error: "unauthorized", written: false, ...policyFields() }, 401);
}

function fail(status, code, error) {
  return reply({ ok: false, code, error, written: false, ...policyFields() }, status);
}

function kv(env) {
  const store = env && env.DOWNLOADS;
  if (!store || typeof store.get !== "function" || typeof store.put !== "function") return null;
  return store;
}

function portLimit(env) {
  const raw = env && env.PORT_RATE_PER_MINUTE;
  if (raw == null || raw === "") return PORT_PER_MINUTE;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return PORT_PER_MINUTE;
  return Math.floor(n);
}

function bearerToken(request) {
  const raw = request && request.headers ? request.headers.get("authorization") || "" : "";
  const match = raw.match(/^Bearer\s+(\S+)\s*$/i);
  return match ? match[1] : "";
}

function sitesForToken(provided, env) {
  const hits = [];
  for (const site of PORT_SITES) {
    const expected = env && env[site.token_env] != null ? String(env[site.token_env]) : "";
    if (tokenEquals(provided, expected)) hits.push(site);
  }
  return hits;
}

function siteIdFromUrl(value) {
  if (value == null || value === "") return "";
  let host = "";
  try {
    host = new URL(String(value)).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
  for (const site of PORT_SITES) {
    const names = [site.origin, ...(site.aliases || [])];
    for (const name of names) {
      try {
        const known = new URL(name).hostname.toLowerCase().replace(/^www\./, "");
        if (known === host) return site.id;
      } catch {
        /* skip a bad registry origin */
      }
    }
  }
  return "";
}

function claimsFrom(body, request) {
  const claims = [];
  function add(id) {
    if (id && !claims.includes(id)) claims.push(id);
  }
  if (body && typeof body.site === "string") add(body.site.trim().toLowerCase());
  if (body && body.schema === FURNACE_SCHEMA) add("furnace");
  add(siteIdFromUrl(body && body.source));
  add(siteIdFromUrl(body && body.canonical_url));
  const box = body && body.ingest_as_receipt;
  add(siteIdFromUrl(box && box.canonical_url));
  add(siteIdFromUrl(request && request.headers ? request.headers.get("origin") : ""));
  return claims;
}

function resolveClaim(claims) {
  if (!claims.length) return { site: null };
  const ids = [];
  for (const id of claims) {
    if (!portSite(id)) return { error: "unknown" };
    if (!ids.includes(id)) ids.push(id);
  }
  if (ids.length !== 1) return { error: "mismatch" };
  return { site: portSite(ids[0]) };
}

function hasImageBytes(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasImageBytes(item));
  for (const [key, item] of Object.entries(value)) {
    const norm = key.toLowerCase().replace(/[\s-]/g, "_");
    if (IMAGE_BYTE_KEYS.has(norm) && item != null && item !== "") return true;
    if (typeof item === "string" && /^data:image\//i.test(item)) return true;
    if (item && typeof item === "object" && hasImageBytes(item)) return true;
  }
  return false;
}

function isIso(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 40 && Number.isFinite(Date.parse(value));
}

function intOrNull(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100000) return null;
  return value;
}

function imageMeta(image) {
  if (image == null) return { value: { present: false } };
  if (typeof image !== "object" || Array.isArray(image)) return { error: "image", status: 400, code: "PORT-SHAPE" };
  if (image.present === false) return { value: { present: false } };
  const sha = typeof image.sha256 === "string" ? image.sha256.toLowerCase() : "";
  if (image.present !== true && !sha) return { value: { present: false } };
  if (!HEX64.test(sha)) return { error: "image.sha256", status: 400, code: "PORT-SHAPE" };
  if (typeof image.bytes === "string") return { error: "images are stored by hash only", status: 422, code: "PORT-IMAGE-HASH-ONLY" };
  const bytes = image.bytes;
  if (image.present === true && (typeof bytes !== "number" || !Number.isInteger(bytes) || bytes < 0 || bytes > 20000000)) {
    return { error: "image.bytes", status: 400, code: "PORT-SHAPE" };
  }
  return {
    value: {
      present: true,
      sha256: sha,
      bytes: typeof bytes === "number" ? bytes : null,
      width: intOrNull(image.width),
      height: intOrNull(image.height),
    },
  };
}

function sealedString(value, limit) {
  if (typeof value !== "string") return "";
  return value.length > limit ? value.slice(0, limit) : value;
}

function parseFurnace(body) {
  const box = body && body.ingest_as_receipt;
  if (!box || typeof box !== "object" || Array.isArray(box)) return { error: "ingest_as_receipt", status: 400, code: "PORT-SHAPE" };
  const id = typeof box.id === "string" ? box.id : "";
  const created_at = typeof box.created_at === "string" ? box.created_at : "";
  const content_sha256 = typeof box.content_sha256 === "string" ? box.content_sha256.toLowerCase() : "";
  const canonical_url = typeof box.canonical_url === "string" ? box.canonical_url : "";
  if (!ID_RE.test(id)) return { error: "id", status: 400, code: "PORT-SHAPE" };
  if (!HEX64.test(content_sha256)) return { error: "content_sha256", status: 400, code: "PORT-SHAPE" };
  if (!isIso(created_at)) return { error: "created_at", status: 400, code: "PORT-SHAPE" };
  if (siteIdFromUrl(canonical_url) !== "furnace") return { error: "canonical_url", status: 400, code: "PORT-SHAPE" };
  if (body.kind !== "tool-usefulness") return { error: "kind", status: 400, code: "PORT-SHAPE" };
  const image = imageMeta(body.image);
  if (image.error) return image;
  const source = typeof body.source === "string" && siteIdFromUrl(body.source) === "furnace"
    ? body.source
    : "https://furnaceisntfree.com";
  return {
    value: {
      site: "furnace",
      schema: FURNACE_SCHEMA,
      id,
      created_at,
      content_sha256,
      kind: "tool-usefulness",
      canonical_url,
      source,
      image: image.value,
      sealed: {
        tool: sealedString(body.tool, 80),
        useful: body.useful === true ? true : body.useful === false ? false : null,
        comment: sealedString(body.comment, 1024),
        snapshot: body.snapshot && typeof body.snapshot === "object" && !Array.isArray(body.snapshot) ? body.snapshot : {},
        publish_consent: body.publish_consent === true,
      },
    },
  };
}

function parseGeneric(body, site) {
  const id = typeof body.id === "string" ? body.id : "";
  const created_at = typeof body.created_at === "string" ? body.created_at : "";
  const content_sha256 = typeof body.content_sha256 === "string" ? body.content_sha256.toLowerCase() : "";
  const schema = typeof body.schema === "string" ? body.schema : "";
  const kind = typeof body.kind === "string" ? body.kind : "";
  if (!ID_RE.test(id)) return { error: "id", status: 400, code: "PORT-SHAPE" };
  if (!HEX64.test(content_sha256)) return { error: "content_sha256", status: 400, code: "PORT-SHAPE" };
  if (!isIso(created_at)) return { error: "created_at", status: 400, code: "PORT-SHAPE" };
  if (!SCHEMA_RE.test(schema) || schema === FURNACE_SCHEMA) return { error: "schema", status: 400, code: "PORT-SHAPE" };
  if (!KIND_RE.test(kind)) return { error: "kind", status: 400, code: "PORT-SHAPE" };
  if (body.site != null && String(body.site).trim().toLowerCase() !== site.id) {
    return { error: "site", status: 401, code: "PORT-AUTH" };
  }
  const canonical_url = typeof body.canonical_url === "string" ? body.canonical_url : "";
  if (canonical_url && siteIdFromUrl(canonical_url) !== site.id) {
    return { error: "canonical_url", status: 400, code: "PORT-SHAPE" };
  }
  if (body.body != null && (typeof body.body !== "object" || Array.isArray(body.body))) {
    return { error: "body", status: 400, code: "PORT-SHAPE" };
  }
  const image = imageMeta(body.image);
  if (image.error) return image;
  return {
    value: {
      site: site.id,
      schema,
      id,
      created_at,
      content_sha256,
      kind,
      canonical_url: canonical_url || null,
      source: site.origin,
      image: image.value,
      sealed: {
        comment: sealedString(body.comment, 1024),
        username: sealedString(body.username, 80),
        body: body.body && typeof body.body === "object" ? body.body : {},
      },
    },
  };
}

function parseReceipt(body, site) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "json", status: 400, code: "PORT-SHAPE" };
  if (hasImageBytes(body)) return { error: "images are stored by hash only", status: 422, code: "PORT-IMAGE-HASH-ONLY" };
  if (body.schema === FURNACE_SCHEMA || (site.id === "furnace" && body.ingest_as_receipt && body.schema == null)) {
    if (site.id !== "furnace") return { error: "site", status: 401, code: "PORT-AUTH" };
    return parseFurnace(body);
  }
  return parseGeneric(body, site);
}

function acceptBody(row, duplicate) {
  return {
    ok: true,
    code: duplicate ? "PORT-DUPLICATE" : "PORT-STORED",
    spec: PORT_SPEC,
    site: row.site,
    id: row.id,
    receipt_hash: row.receipt_hash,
    stored_at: row.stored_at,
    duplicate,
    ...policyFields(),
    lattice: {
      wrapped: !!(row.lattice && row.lattice.wrapped),
      code: row.lattice && row.lattice.code ? row.lattice.code : "",
      plane: row.lattice && row.lattice.wrapped ? "sites" : null,
      offline: false,
      chain: "primary",
    },
  };
}

export function publicReceipt(row) {
  if (!row) return null;
  return {
    ok: true,
    spec: PORT_SPEC,
    site: row.site,
    id: row.id,
    schema: row.schema,
    kind: row.kind,
    content_sha256: row.content_sha256,
    receipt_hash: row.receipt_hash,
    created_at: row.created_at,
    stored_at: row.stored_at,
    canonical_url: row.canonical_url || null,
    image: row.image && row.image.present
      ? {
          present: true,
          sha256: row.image.sha256,
          bytes: row.image.bytes,
          width: row.image.width,
          height: row.image.height,
        }
      : { present: false },
    ...policyFields(),
  };
}

function sitesCatalog() {
  return {
    ok: true,
    spec: PORT_SPEC,
    path: PORT_SITES_PATH,
    post: PORT_RECEIPTS_PATH,
    note: "Registered sister sites. Token env names are not secret values. This route is not LIVE until an approved deploy. Receipts are not library documents.",
    ...policyFields(),
    sites: PORT_SITES.map((site) => ({
      id: site.id,
      label: site.label,
      origin: site.origin,
      aliases: site.aliases.slice(),
      token_env: site.token_env,
      schema: site.schema,
    })),
  };
}

async function readJson(store, key, fallback) {
  try {
    const raw = await store.get(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function rowKey(site, id) {
  return ROW_PREFIX + site + ":" + id;
}

async function readChain(store, site) {
  const row = await readJson(store, CHAIN_PREFIX + site, null);
  if (!row || typeof row !== "object") {
    return { receipt_hash: ZERO_HASH, primary: ZERO_HASH, secondary: ZERO_HASH };
  }
  return {
    receipt_hash: typeof row.receipt_hash === "string" && HEX64.test(row.receipt_hash) ? row.receipt_hash : ZERO_HASH,
    primary: typeof row.primary === "string" && HEX64.test(row.primary) ? row.primary : ZERO_HASH,
    secondary: typeof row.secondary === "string" && HEX64.test(row.secondary) ? row.secondary : ZERO_HASH,
  };
}

async function writeChain(store, site, chain) {
  await store.put(CHAIN_PREFIX + site, JSON.stringify(chain));
}

async function rememberId(store, site, id) {
  const key = INDEX_PREFIX + site;
  const list = await readJson(store, key, []);
  const ids = Array.isArray(list) ? list.slice() : [];
  if (!ids.includes(id) && ids.length < INDEX_CAP) {
    ids.push(id);
    await store.put(key, JSON.stringify(ids));
  }
}

function latticeView(result, prev) {
  return {
    wrapped: !!result.wrapped,
    code: result.code || "",
    primary: result.primary || "",
    secondary: result.secondary || "",
    primary_prev: prev.primary,
    secondary_prev: prev.secondary,
    entry_hash: result.entry_hash || "",
    plane: result.wrapped ? "sites" : null,
    offline: false,
  };
}

async function storeReceipt(env, store, parsed) {
  const existing = await readJson(store, rowKey(parsed.site, parsed.id), null);
  if (existing && existing.site === parsed.site && existing.id === parsed.id) {
    if (existing.content_sha256 !== parsed.content_sha256) {
      return { response: fail(409, "PORT-REWRITE", "id already stored") };
    }
    let row = existing;
    if (!existing.lattice || !existing.lattice.wrapped) {
      const wrapped = await wrapPortReceipt(env, {
        entryHash: existing.receipt_hash,
        site: parsed.site,
        primaryPrev: existing.lattice && existing.lattice.primary_prev,
        secondaryPrev: existing.lattice && existing.lattice.secondary_prev,
      });
      if (wrapped.wrapped) {
        row = {
          ...existing,
          lattice: latticeView(wrapped, {
            primary: existing.lattice && existing.lattice.primary_prev,
            secondary: existing.lattice && existing.lattice.secondary_prev,
          }),
        };
        await store.put(rowKey(parsed.site, parsed.id), JSON.stringify(row));
        const chain = await readChain(store, parsed.site);
        const parent = existing.lattice && existing.lattice.primary_prev;
        if (!parent || chain.primary === parent || chain.primary === ZERO_HASH) {
          await writeChain(store, parsed.site, {
            receipt_hash: chain.receipt_hash === ZERO_HASH ? existing.receipt_hash : chain.receipt_hash,
            primary: wrapped.primary,
            secondary: wrapped.secondary,
          });
        }
      }
    }
    return { response: reply(acceptBody(row, true), 200) };
  }

  const chain = await readChain(store, parsed.site);
  const previous_hash = chain.receipt_hash;
  const receipt_hash = receiptHash({ ...parsed, previous_hash });
  const stored_at = new Date().toISOString();
  const primaryPrev = chain.primary;
  const secondaryPrev = chain.secondary;
  const wrapped = await wrapPortReceipt(env, {
    entryHash: receipt_hash,
    site: parsed.site,
    primaryPrev,
    secondaryPrev,
  });
  const row = {
    spec: PORT_SPEC,
    site: parsed.site,
    id: parsed.id,
    schema: parsed.schema,
    kind: parsed.kind,
    content_sha256: parsed.content_sha256,
    created_at: parsed.created_at,
    stored_at,
    receipt_hash,
    previous_hash,
    canonical_url: parsed.canonical_url || null,
    source: parsed.source || null,
    image: parsed.image,
    sealed: parsed.sealed,
    lattice: latticeView(wrapped, { primary: primaryPrev, secondary: secondaryPrev }),
    ...policyFields(),
  };
  await store.put(rowKey(parsed.site, parsed.id), JSON.stringify(row));
  await rememberId(store, parsed.site, parsed.id);
  await writeChain(store, parsed.site, {
    receipt_hash,
    primary: wrapped.wrapped ? wrapped.primary : chain.primary,
    secondary: wrapped.wrapped ? wrapped.secondary : chain.secondary,
  });
  return { response: reply(acceptBody(row, false), 201), row };
}

async function readBounded(request) {
  const declared = Number(request.headers.get("content-length") || "");
  if (Number.isFinite(declared) && declared > PORT_MAX_BYTES) return { error: "size" };
  if (!request.body || typeof request.body.getReader !== "function") {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > PORT_MAX_BYTES) return { error: "size" };
    return { raw };
  }
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const step = await reader.read();
    if (step.done) break;
    total += step.value.byteLength;
    if (total > PORT_MAX_BYTES) {
      try { await reader.cancel(); } catch { /* already over the cap */ }
      return { error: "size" };
    }
    chunks.push(step.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { raw: new TextDecoder().decode(bytes) };
}

function rated(site, env) {
  return allowPortRate(site, Date.now(), portLimit(env));
}

async function handlePost(request, env) {
  const ctype = String((request.headers && request.headers.get("content-type")) || "");
  if (ctype && !/application\/json|text\/json/i.test(ctype)) return fail(415, "PORT-TYPE", "JSON body required");
  const bounded = await readBounded(request);
  if (bounded.error) return fail(413, "PORT-TOO-LARGE", "JSON body exceeds 64KB");

  let parsedJson = null;
  let jsonOk = false;
  if (bounded.raw) {
    try {
      parsedJson = JSON.parse(bounded.raw);
      jsonOk = true;
    } catch {
      jsonOk = false;
    }
  }
  const claims = jsonOk ? claimsFrom(parsedJson, request) : [];
  const claim = jsonOk ? resolveClaim(claims) : { site: null };
  const provided = bearerToken(request);
  const hits = sitesForToken(provided, env);
  const authorized = provided && hits.length === 1 && !claim.error && (!claim.site || claim.site.id === hits[0].id);
  if (!authorized) {
    if (!rated("auth", env)) return fail(429, "PORT-RATE", "rate limit");
    return deny();
  }
  const site = claim.site || hits[0];
  if (!rated(site.id, env)) return fail(429, "PORT-RATE", "rate limit");
  if (!jsonOk || !parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) {
    return fail(400, "PORT-SHAPE", "JSON body required");
  }
  const parsed = parseReceipt(parsedJson, site);
  if (parsed.error) {
    if (parsed.status === 401) return deny();
    return fail(parsed.status, parsed.code, parsed.error);
  }
  if (parsed.value.site !== site.id) return deny();
  const store = kv(env);
  if (!store) return fail(503, "PORT-STORE", "receipt store unavailable");
  const saved = await storeReceipt(env, store, parsed.value);
  return saved.response;
}

async function handleGet(request, url, env) {
  const path = String(url.pathname || "").replace(/\/+$/, "") || "/";
  if (path === PORT_SITES_PATH) return reply(sitesCatalog(), 200);
  const siteId = String(url.searchParams.get("site") || "").trim().toLowerCase();
  const id = String(url.searchParams.get("id") || "").trim();
  const store = kv(env);
  if (siteId && id) {
    if (!portSite(siteId)) return reply({ ok: false, code: "PORT-SITE", error: "unknown site", ...policyFields() }, 404);
    if (!store) return fail(503, "PORT-STORE", "receipt store unavailable");
    const row = await readJson(store, rowKey(siteId, id), null);
    if (!row || row.site !== siteId || row.id !== id) {
      return reply({ ok: false, code: "PORT-MISS", error: "not found", ...policyFields() }, 404);
    }
    return reply(publicReceipt(row), 200);
  }
  if (!isOperatorRequest(request, env, null)) return deny();
  if (!store) return fail(503, "PORT-STORE", "receipt store unavailable");
  const wanted = siteId ? [portSite(siteId)].filter(Boolean) : PORT_SITES.slice();
  if (siteId && !wanted.length) return reply({ ok: false, code: "PORT-SITE", error: "unknown site", ...policyFields() }, 404);
  const receipts = [];
  for (const site of wanted) {
    const ids = await readJson(store, INDEX_PREFIX + site.id, []);
    for (const item of Array.isArray(ids) ? ids : []) {
      const row = await readJson(store, rowKey(site.id, item), null);
      const pub = publicReceipt(row);
      if (pub) receipts.push(pub);
    }
  }
  return reply({
    ok: true,
    code: "PORT-LIST",
    spec: PORT_SPEC,
    aggregate: true,
    count: receipts.length,
    receipts,
    ...policyFields(),
  }, 200);
}

export async function handleReceiptPort(request, env) {
  const url = new URL(request.url);
  const path = String(url.pathname || "").replace(/\/+$/, "") || "/";
  if (!isReceiptPortPath(path)) return null;
  const method = String(request.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") {
    const res = await handleGet(request, url, env);
    if (method === "HEAD") return new Response(null, { status: res.status, headers: res.headers });
    return res;
  }
  if (method === "POST" && path === PORT_RECEIPTS_PATH) return handlePost(request, env);
  return fail(405, "PORT-METHOD", "method not allowed");
}
