/**
 * ACT-RECEIPT-1.0 — public action receipts.
 * Four public fields only. Insert-only. Not a Softwares-tab product.
 * Author: Aziel Eliab.
 */

export const RECEIPTS_SPEC = "ACT-RECEIPT-1.0";
export const ZERO = "0".repeat(64);
const HOST = "https://www.azielcorpuslibrary.net";

const META_DROP = new Set([
  "user",
  "email",
  "ip",
  "lat",
  "lon",
  "latitude",
  "longitude",
  "location",
  "geo",
  "cookie",
  "cookies",
  "token",
  "tokens",
  "authorization",
]);

function store() {
  if (!Array.isArray(globalThis.__AZ_ACTION_RECEIPTS)) {
    globalThis.__AZ_ACTION_RECEIPTS = [];
  }
  return globalThis.__AZ_ACTION_RECEIPTS;
}

export function oneSentence(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const cut = raw.match(/^(.+?[.!?])(\s|$)/);
  return (cut ? cut[1] : raw).trim();
}

export function sanitizeMeta(meta) {
  const out = {};
  if (!meta || typeof meta !== "object") return out;
  for (const [k, v] of Object.entries(meta)) {
    if (META_DROP.has(String(k).toLowerCase())) continue;
    out[k] = v;
  }
  return out;
}

export function shouldMint(method, path) {
  const m = String(method || "").toUpperCase();
  const p = String(path || "");
  if (/^\/receipts(\/|$)/.test(p) || p.startsWith("/v1/receipts")) return false;
  if (m === "GET" && (p === "/" || p === "")) return false;
  if (m === "POST" && (p.startsWith("/v1/") || p.startsWith("/runtime/") || p === "/event" || p === "/runtime/mcp")) return true;
  if (m === "GET" && (p === "/v1/search" || p.startsWith("/v1/search?") || p === "/download" || p.startsWith("/download?"))) return true;
  if (p.startsWith("/runtime/v1/fraggate")) return true;
  return false;
}

export function isReceiptsPath(path) {
  const p = String(path || "").replace(/\/+$/, "") || "/";
  return p === "/receipts" || p.startsWith("/receipts/") || p === "/v1/receipts" || p.startsWith("/v1/receipts/");
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function tip(rows) {
  return rows.length ? rows[rows.length - 1] : null;
}

export async function appendActionReceipt(env, payload) {
  const rows = store();
  const prev = tip(rows);
  const previous_hash = prev ? prev.hash : ZERO;
  const action = oneSentence(payload && payload.action);
  const output = oneSentence(payload && payload.output);
  const metadata = sanitizeMeta({
    surface: payload && payload.surface,
    path: payload && payload.path,
    method: payload && payload.method,
    tool: payload && payload.tool,
    spec: RECEIPTS_SPEC,
    ...(payload && payload.metadata ? payload.metadata : {}),
  });
  const id = "AZACT-" + Date.now().toString(36) + rows.length.toString(36);
  const canonical = JSON.stringify({
    id,
    previous_hash,
    action,
    output,
    metadata,
    spec: RECEIPTS_SPEC,
  });
  const hash = await sha256Hex(canonical);
  const receipt = {
    id,
    hash,
    entry_hash: hash,
    previous_hash,
    action,
    output,
    metadata,
    spec: RECEIPTS_SPEC,
    created_utc: new Date().toISOString(),
  };
  rows.push(receipt);
  return { ok: true, receipt };
}

export async function verifyActionChain(env) {
  const rows = store();
  let prev = ZERO;
  for (const row of rows) {
    if (row.previous_hash !== prev) {
      return { ok: false, entries: rows.length, spec: RECEIPTS_SPEC, broken: row.hash };
    }
    prev = row.hash;
  }
  return { ok: true, entries: rows.length, spec: RECEIPTS_SPEC, tip: prev === ZERO ? null : prev };
}

export async function listReceipts(env, limit) {
  const n = Math.max(1, Number(limit) || 25);
  return store().slice().reverse().slice(0, n);
}

export async function getReceipt(env, idOrHash) {
  const key = String(idOrHash || "");
  return store().find((r) => r.hash === key || r.entry_hash === key || r.id === key) || null;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function handleReceipts(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (!isReceiptsPath(path)) return null;
  if (request.method === "POST") {
    const token = request.headers.get("x-aziel-receipt") || "";
    const expected = (env && env.RECEIPT_APPEND_TOKEN) || "";
    if (!expected || token !== expected) {
      return json({ ok: false, error: "gated" }, 401);
    }
    let payload = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }
    return json(await appendActionReceipt(env, payload));
  }
  if (path === "/receipts/verify" || url.searchParams.get("verify") === "1") {
    return json(await verifyActionChain(env));
  }
  const id = path.replace(/^\/receipts\//, "").replace(/^\/v1\/receipts\//, "");
  if (id && id !== "receipts" && id !== "append") {
    const row = await getReceipt(env, id);
    if (!row) return json({ ok: false, error: "not found" }, 404);
    return json(row);
  }
  return json({
    ok: true,
    spec: RECEIPTS_SPEC,
    person_id: "https://www.azieleliab.com/#aziel",
    url: HOST + "/receipts",
    receipts: await listReceipts(env, 50),
  });
}
