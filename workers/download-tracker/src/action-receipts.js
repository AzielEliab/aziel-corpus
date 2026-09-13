/**
 * ACT-RECEIPT-1.0 — public action receipts tab.
 * Origin: https://www.azielcorpuslibrary.net/receipts
 * Not a Softwares-tab product. Not GodLock. Not TemporalLock. Not local ChainLock.
 * Author: Aziel Eliab only.
 */
import { timingSafeEqual } from "node:crypto";
import { page } from "./ui.js";
import { corsHeaders, json } from "./runtime.js";
import { hashPayload } from "./ledger.js";
import { CANON_HOST, HUB_PERSON_ID } from "./seo.js";

export const RECEIPTS_SPEC = "ACT-RECEIPT-1.0";
export const RECEIPTS_PATH = "/receipts";
export const ZERO = "0".repeat(64);
export const AUTHOR = "Aziel Eliab";
export const RUNTIME_VERSION = "2.7.0";

export const SISTER_SITES = Object.freeze([
  Object.freeze({ label: "azieleliab.com", origin: "https://www.azieleliab.com", path: "/receipts" }),
  Object.freeze({ label: "godlock.uk", origin: "https://godlock.uk", path: "/receipts" }),
  Object.freeze({ label: "hedidntjump.com", origin: "https://www.hedidntjump.com", path: "/receipts" }),
]);

const CHAIN_KEY = "act_receipt:chain";
const ISOLATED_KEY = "act_receipt:isolated";
const SISTERS_KEY = "act_receipt:sisters";
const ENTRY_PREFIX = "act_receipt:entry:";
const ID_PREFIX = "act_receipt:id:";

const META_DENY = new Set([
  "user",
  "email",
  "ip",
  "geo",
  "lat",
  "lon",
  "latitude",
  "longitude",
  "address",
  "cookie",
  "cookies",
  "token",
  "tokens",
  "legal_name",
  "legalname",
  "legal-name",
  "device",
  "location",
]);

const META_KEEP = ["surface", "path", "method", "status", "tool", "spec", "runtime_version", "event"];

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function normPath(path) {
  return String(path || "").replace(/\/+$/, "") || "/";
}

export function oneSentence(text) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  const m = s.match(/^.*?[.!?](?:\s|$)/);
  return (m ? m[0] : s).trim();
}

export function sanitizeMeta(meta) {
  const src = meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {};
  const out = {};
  for (const [rawKey, value] of Object.entries(src)) {
    const key = String(rawKey || "").trim();
    if (!key || META_DENY.has(key.toLowerCase().replace(/[\s-]/g, "_"))) continue;
    if (value == null || value === "") continue;
    if (typeof value === "object") continue;
    if (META_KEEP.includes(key) || !META_DENY.has(key.toLowerCase())) {
      if (META_KEEP.includes(key)) out[key] = String(value);
    }
  }
  return out;
}

export function shouldMint(method, path) {
  const verb = String(method || "").toUpperCase();
  const p = normPath(path);
  if (p === RECEIPTS_PATH || p === RECEIPTS_PATH + ".jsonl" || p.startsWith(RECEIPTS_PATH + "/")) return false;
  if (verb === "POST" && (p === "/event" || p.startsWith("/v1/") || p.startsWith("/runtime/"))) return true;
  if (verb === "GET" && (p === "/v1/search" || p === "/download" || p.startsWith("/download/"))) return true;
  if (p.includes("/fraggate")) return true;
  return false;
}

export function isReceiptsPath(path) {
  const p = normPath(path);
  if (p === RECEIPTS_PATH || p === RECEIPTS_PATH + ".jsonl") return true;
  if (p.startsWith(RECEIPTS_PATH + "/")) return true;
  if (p === "/v1/receipts" || p.startsWith("/v1/receipts/")) return true;
  return false;
}

/** Worker chrome routes for the human tab only — never /receipt or /v1. */
export function isReceiptsTabPath(path) {
  const p = normPath(path);
  if (p === RECEIPTS_PATH || p === RECEIPTS_PATH + ".jsonl") return true;
  return p.startsWith(RECEIPTS_PATH + "/");
}

function kv(env) {
  return env && env.DOWNLOADS && typeof env.DOWNLOADS.get === "function" && typeof env.DOWNLOADS.put === "function"
    ? env.DOWNLOADS
    : null;
}

function memChain() {
  if (!Array.isArray(globalThis.__AZ_ACTION_RECEIPTS)) globalThis.__AZ_ACTION_RECEIPTS = [];
  return globalThis.__AZ_ACTION_RECEIPTS;
}

function memIsolated() {
  if (!Array.isArray(globalThis.__AZ_ACTION_ISOLATED)) globalThis.__AZ_ACTION_ISOLATED = [];
  return globalThis.__AZ_ACTION_ISOLATED;
}

function publicMeta(input) {
  const clean = sanitizeMeta(input);
  const meta = {
    spec: RECEIPTS_SPEC,
    runtime_version: String(clean.runtime_version || RUNTIME_VERSION),
  };
  if (clean.surface) meta.surface = String(clean.surface);
  if (clean.path) meta.path = String(clean.path);
  if (clean.method) meta.method = String(clean.method).toUpperCase();
  if (clean.status != null && clean.status !== "") meta.status = String(clean.status);
  if (clean.tool) meta.tool = String(clean.tool);
  return meta;
}

function receiptId(hash) {
  return "AZACT-" + String(hash || "").slice(0, 16);
}

function toPublic(row) {
  if (!row) return null;
  const hash = String(row.hash || row.entry_hash || "");
  return {
    id: String(row.id || receiptId(hash)),
    hash,
    entry_hash: hash,
    previous_hash: String(row.previous_hash || ZERO),
    action: String(row.action || ""),
    output: String(row.output || ""),
    metadata: row.metadata && typeof row.metadata === "object" ? { ...row.metadata } : publicMeta({}),
    isolated: row.isolated ? true : undefined,
  };
}

function hashReceipt(fields) {
  return hashPayload({
    action: fields.action,
    output: fields.output,
    metadata: fields.metadata,
    previous_hash: fields.previous_hash,
  });
}

async function readJson(store, key, fallback) {
  try {
    const raw = await store.get(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function loadChainRows(env) {
  const store = kv(env);
  if (!store) return memChain().map(toPublic).filter(Boolean);
  const hashes = await readJson(store, CHAIN_KEY, []);
  const rows = [];
  for (const hash of hashes) {
    const row = await readJson(store, ENTRY_PREFIX + hash, null);
    if (row) rows.push(toPublic(row));
  }
  return rows;
}

async function loadIsolatedRows(env) {
  const store = kv(env);
  if (!store) return memIsolated().map(toPublic).filter(Boolean);
  const hashes = await readJson(store, ISOLATED_KEY, []);
  const rows = [];
  for (const hash of hashes) {
    const row = await readJson(store, ENTRY_PREFIX + hash, null);
    if (row) rows.push(toPublic({ ...row, isolated: true }));
  }
  return rows;
}

async function persistReceipt(env, receipt, isolated) {
  const store = kv(env);
  if (!store) {
    const bag = isolated ? memIsolated() : memChain();
    bag.push(receipt);
    return;
  }
  await store.put(ENTRY_PREFIX + receipt.hash, JSON.stringify(receipt));
  await store.put(ID_PREFIX + receipt.id, receipt.hash);
  const key = isolated ? ISOLATED_KEY : CHAIN_KEY;
  const hashes = await readJson(store, key, []);
  hashes.push(receipt.hash);
  await store.put(key, JSON.stringify(hashes));
}

async function chainTip(env) {
  const rows = await loadChainRows(env);
  return rows.length ? rows[rows.length - 1].hash : ZERO;
}

export async function appendActionReceipt(env, body) {
  const src = body && typeof body === "object" ? body : {};
  const action = oneSentence(src.action);
  const output = oneSentence(src.output);
  if (!action || !output) return { ok: false, error: "action and output are required" };
  const metadata = publicMeta({
    surface: src.surface,
    path: src.path,
    method: src.method,
    status: src.status,
    tool: src.tool,
    runtime_version: src.runtime_version,
    ...(src.metadata && typeof src.metadata === "object" ? src.metadata : {}),
  });
  const tip = await chainTip(env);
  const claimed = String(src.previous_hash || tip || ZERO);
  const isolated = claimed !== tip;
  const previous_hash = isolated ? claimed : tip;
  const hash = hashReceipt({ action, output, metadata, previous_hash });
  const receipt = {
    id: receiptId(hash),
    hash,
    entry_hash: hash,
    previous_hash,
    action,
    output,
    metadata,
    isolated: isolated || undefined,
  };
  await persistReceipt(env, receipt, isolated);
  return { ok: !isolated, isolated, receipt: toPublic(receipt) };
}

export async function listReceipts(env, limit = 50) {
  const rows = await loadChainRows(env);
  const newest = rows.slice().reverse();
  const n = Number(limit);
  if (Number.isFinite(n) && n > 0) return newest.slice(0, n);
  return newest;
}

export async function getReceipt(env, key) {
  const want = String(key || "").trim();
  if (!want) return null;
  const store = kv(env);
  if (store) {
    if (want.startsWith("AZACT-")) {
      const hash = await store.get(ID_PREFIX + want);
      if (hash) {
        const row = await readJson(store, ENTRY_PREFIX + hash, null);
        if (row) return toPublic(row);
      }
    }
    const byHash = await readJson(store, ENTRY_PREFIX + want, null);
    if (byHash) return toPublic(byHash);
  }
  const all = [...memChain(), ...memIsolated(), ...(store ? [] : await loadChainRows(env))];
  return all.map(toPublic).find((row) => row && (row.hash === want || row.id === want || row.entry_hash === want)) || null;
}

export async function verifyActionChain(env) {
  const rows = await loadChainRows(env);
  const errors = [];
  let expectedPrev = ZERO;
  rows.forEach((row, i) => {
    if (!row) {
      errors.push("missing receipt at index " + i);
      return;
    }
    if (String(row.previous_hash) !== expectedPrev) {
      errors.push("previous_hash mismatch at " + (row.hash || i));
    }
    const recomputed = hashReceipt({
      action: row.action,
      output: row.output,
      metadata: row.metadata,
      previous_hash: row.previous_hash,
    });
    if (recomputed !== row.hash && recomputed !== row.entry_hash) {
      errors.push("entry_hash mismatch at " + (row.hash || i));
    }
    expectedPrev = row.hash || row.entry_hash || expectedPrev;
  });
  return {
    ok: errors.length === 0,
    spec: RECEIPTS_SPEC,
    entries: rows.length,
    tip: rows.length ? rows[rows.length - 1].hash : ZERO,
    errors,
  };
}

export function receiptsDataset(tip) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "ACT-RECEIPT-1.0 public action receipts",
    url: CANON_HOST + RECEIPTS_PATH,
    description: "Immutable public action receipts on Aziel Digital Library. Four fields only. Author Aziel Eliab.",
    creator: { "@id": HUB_PERSON_ID },
    author: { "@id": HUB_PERSON_ID },
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    isAccessibleForFree: true,
    identifier: tip && tip !== ZERO ? tip : RECEIPTS_SPEC,
  };
}

function metaLine(meta) {
  const m = meta || {};
  return ["surface", "path", "method", "status", "tool", "spec", "runtime_version"]
    .filter((k) => m[k])
    .map((k) => k + "=" + m[k])
    .join(" · ");
}

function receiptCard(row, { tip } = {}) {
  const rec = toPublic(row);
  if (!rec) return "";
  const href = RECEIPTS_PATH + "/" + encodeURIComponent(rec.hash);
  const tipMark = tip && rec.hash === tip ? ` <span class="pill ok">tip</span>` : "";
  return (
    `<article class="card" id="${esc(rec.id)}">` +
    `<p class="muted">hash${tipMark}</p>` +
    `<p><a href="${esc(href)}"><code>${esc(rec.hash)}</code></a> · <code>${esc(rec.id)}</code></p>` +
    `<p><strong>Action.</strong> ${esc(rec.action)}</p>` +
    `<p><strong>Output.</strong> ${esc(rec.output)}</p>` +
    `<p class="muted"><strong>Event.</strong> ${esc(metaLine(rec.metadata) || "spec=" + RECEIPTS_SPEC)}</p>` +
    `<p class="muted">previous_hash <code>${esc(rec.previous_hash)}</code></p>` +
    `</article>`
  );
}

export function receiptsBody({ rows = [], isolated = [], verify, sisters = SISTER_SITES, tip } = {}) {
  const list = rows || [];
  const chainTipHash = tip || (list[0] && list[0].hash) || ZERO;
  const tipRow = list.find((row) => row && row.hash === chainTipHash) || list[0] || null;
  const tipHtml = tipRow
    ? receiptCard(tipRow, { tip: chainTipHash })
    : `<div class="card"><p class="muted">No public action receipts on this origin yet. The chain is empty and verifies against ${esc(ZERO.slice(0, 8))}… genesis.</p></div>`;
  const listHtml = list.length
    ? list.map((row) => receiptCard(row, { tip: chainTipHash })).join("")
    : `<div class="card"><p class="muted">Newest-first list is empty.</p></div>`;
  const isolatedHtml = isolated.length
    ? `<h2>Isolated</h2><p class="muted">Broken previous_hash rows stay off the main chain.</p>${isolated.map((row) => receiptCard(row)).join("")}`
    : "";
  const sisterHtml = (sisters || SISTER_SITES).map((site) => {
    const href = String(site.href || (site.origin + (site.path || RECEIPTS_PATH)));
    const label = site.label || href;
    const sisterTip = site.tip ? ` — tip <code>${esc(site.tip)}</code>` : "";
    return `<li><a href="${esc(href)}" rel="noopener noreferrer">${esc(label)}${esc(RECEIPTS_PATH)}</a>${sisterTip}</li>`;
  }).join("");
  const verifyHtml = verify
    ? `<p class="pill ${verify.ok ? "ok" : ""}">${verify.ok ? "chain verifies" : "chain failed"} · ${Number(verify.entries) || 0} entries</p>`
    : "";
  const dataset = receiptsDataset(chainTipHash);
  return `<section class="hero">
<p class="pill">${esc(RECEIPTS_SPEC)}</p>
<h1>Receipts</h1>
<p>Public action receipts. Each row is four fields: hash, one sentence of the requested action, one sentence of the output given, and event metadata. previous_hash is the chain link. Not a Softwares-tab product. Not GodLock challenge receipts. Not TemporalLock. Not local ChainLock.</p>
${verifyHtml}
</section>
<h2>Chain tip</h2>
${tipHtml}
<h2>Newest first</h2>
${listHtml}
${isolatedHtml}
<div class="card">
<h2>Cross-lattice</h2>
<p class="muted">Sister <code>/receipts</code> tabs. Hash-chain previous_hash must verify on each origin. Tips are shown when present.</p>
<ul>${sisterHtml}</ul>
<p class="muted"><a href="${RECEIPTS_PATH}.jsonl">receipts.jsonl</a> · <a href="${RECEIPTS_PATH}/verify">verify</a></p>
</div>
<script type="application/ld+json">${JSON.stringify(dataset)}</script>`;
}

function wantsJson(request) {
  const accept = String((request && request.headers && request.headers.get("Accept")) || "");
  return /application\/json/i.test(accept) && !/text\/html/i.test(accept);
}

function htmlHeaders() {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, max-age=0, must-revalidate",
    ...corsHeaders(),
  };
}

function tokenOk(request, env) {
  const got = String((request && request.headers && request.headers.get("x-aziel-receipt")) || "");
  const want = String((env && env.RECEIPT_APPEND_TOKEN) || "");
  if (!got || !want) return false;
  const left = Buffer.from(got, "utf8");
  const right = Buffer.from(want, "utf8");
  if (left.length !== right.length) return false;
  try {
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

async function loadSisterTips(env) {
  const store = kv(env);
  if (!store) {
    return SISTER_SITES.map((site) => ({ ...site, href: site.origin + site.path }));
  }
  const cached = await readJson(store, SISTERS_KEY, null);
  return SISTER_SITES.map((site) => {
    const hit = cached && cached[site.origin];
    return {
      ...site,
      href: site.origin + site.path,
      tip: hit && hit.tip ? String(hit.tip) : "",
    };
  });
}

function jsonldBundle(tip, receipts) {
  return {
    spec: RECEIPTS_SPEC,
    tip,
    receipts,
    lattice: SISTER_SITES.map((site) => ({ origin: site.origin, receipts: site.origin + site.path })),
    jsonld: receiptsDataset(tip),
    author: AUTHOR,
  };
}

export async function handleReceipts(request, env) {
  const url = new URL(request.url);
  const path = normPath(url.pathname);
  const method = String(request.method || "GET").toUpperCase();

  if (method === "POST" && (path === "/v1/receipts" || path === "/v1/receipts/append")) {
    if (!tokenOk(request, env)) return json({ ok: false, error: "receipt append denied" }, 401);
    let body = {};
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "JSON body required" }, 400);
    }
    const result = await appendActionReceipt(env, body);
    return json(result, result.ok ? 200 : result.isolated ? 200 : 400);
  }

  if (method !== "GET" && method !== "HEAD") {
    return json({ ok: false, error: "method not allowed" }, 405);
  }

  if (path === "/receipts/verify") {
    const verify = await verifyActionChain(env);
    if (wantsJson(request)) return json(verify, verify.ok ? 200 : 409);
    const rows = await listReceipts(env, 20);
    const html = page("Receipts verify", receiptsBody({ rows, verify, sisters: await loadSisterTips(env), tip: verify.tip }), {
      path: "/receipts/verify",
      kind: "receipts",
    });
    if (method === "HEAD") return new Response(null, { status: verify.ok ? 200 : 409, headers: htmlHeaders() });
    return new Response(html, { status: verify.ok ? 200 : 409, headers: htmlHeaders() });
  }

  if (path === "/receipts.jsonl") {
    const rows = (await loadChainRows(env)).map(toPublic);
    const body = rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : "");
    const headers = {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      ...corsHeaders(),
    };
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(body, { status: 200, headers });
  }

  const detail = path.match(/^\/receipts\/([^/]+)$/);
  if (detail && detail[1] !== "verify") {
    const rec = await getReceipt(env, decodeURIComponent(detail[1]));
    if (!rec) return json({ ok: false, error: "not found" }, 404);
    if (wantsJson(request)) return json(rec);
    const html = page("Receipt " + rec.id, receiptsBody({ rows: [rec], sisters: await loadSisterTips(env), tip: rec.hash }), {
      path: RECEIPTS_PATH + "/" + rec.hash,
      kind: "receipts",
    });
    if (method === "HEAD") return new Response(null, { status: 200, headers: htmlHeaders() });
    return new Response(html, { status: 200, headers: htmlHeaders() });
  }

  if (path === "/v1/receipts") {
    const rows = await listReceipts(env, 50);
    const verify = await verifyActionChain(env);
    return json(jsonldBundle(verify.tip, rows));
  }

  const rows = await listReceipts(env, 50);
  const isolated = await loadIsolatedRows(env);
  const verify = await verifyActionChain(env);
  const html = page("Receipts", receiptsBody({
    rows,
    isolated,
    verify,
    sisters: await loadSisterTips(env),
    tip: verify.tip,
  }), { path: RECEIPTS_PATH, kind: "receipts" });
  if (method === "HEAD") return new Response(null, { status: 200, headers: htmlHeaders() });
  return new Response(html, { status: 200, headers: htmlHeaders() });
}
