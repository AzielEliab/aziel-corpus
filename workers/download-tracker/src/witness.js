/**
 * Witness tab (/witness, /witness.json): every signed statement in the aziel-anchors
 * witness log (anchors/log.jsonl), newest first, each re-checked here.
 *
 * Reads the real log only. One cached fetch per CACHE_TTL_S per colo (Cache API), no cron,
 * no D1/KV. Fail closed: an unreadable log, a bad hash, a bad signature, a wrong key, a
 * broken prev link or an n gap is shown plainly and never called verified.
 * Only one witness exists (witness 2 is not configured).
 * Author: Aziel Eliab.
 */

import { page } from "./ui.js";

export const WITNESS_PATH = "/witness";
export const WITNESS_JSON_PATH = "/witness.json";
export const WITNESS_LOG_URL = "https://raw.githubusercontent.com/AzielEliab/aziel-anchors/main/anchors/log.jsonl";
export const WITNESS_REPO_URL = "https://github.com/AzielEliab/aziel-anchors";
export const CACHE_TTL_S = 60;
export const MAX_LOG_BYTES = 4 * 1024 * 1024;
const CACHE_KEY = "https://witness.internal/__cache/witness-log-v1";
const ZERO = "0".repeat(64);

/** Pinned keys (aziel-anchors keys/witness.pub and keys/epochs.json). */
export const WITNESS_CURRENT_KEY = "7G1g0sBqbrgPoarVni9iEH2k7CfYKookPdSikz7ZoSg";
export const WITNESS_RETIRED_KEYS = Object.freeze([
  Object.freeze({ public_key: "tCPVJRmcKKH6LwEdUfcrzoei_dRxkwKl1BouZ4VB0lo", from_n: 1, through_n: 2 }),
]);

export function isWitnessPath(path) {
  const p = String(path || "").replace(/\/+$/, "") || "/";
  return p === WITNESS_PATH || p === WITNESS_JSON_PATH;
}

export function keyForN(n) {
  const ep = WITNESS_RETIRED_KEYS.find((e) => n >= e.from_n && n <= e.through_n);
  return ep ? ep.public_key : WITNESS_CURRENT_KEY;
}

/** Byte-identical to aziel-anchors scripts/lib.mjs canonicalize(). */
export function canonicalize(value) {
  if (value === undefined) return undefined;
  if (value === null) return "null";
  const t = typeof value;
  if (t === "number") {
    if (!Number.isFinite(value)) throw new Error("cannot canonicalize non-finite number");
    return JSON.stringify(value);
  }
  if (t === "boolean") return value ? "true" : "false";
  if (t === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map((v) => canonicalize(v)).join(",") + "]";
  if (t === "object") {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(value[k])).join(",") + "}";
  }
  throw new Error("cannot canonicalize " + t);
}

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
export async function sha256Hex(text) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}

function b64urlToBytes(s) {
  if (typeof s !== "string" || !/^[A-Za-z0-9_-]+$/.test(s)) return null;
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  try {
    const bin = atob(b64);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch { return null; }
}

export async function ed25519Verify(pubB64url, text, sigB64url) {
  const pub = b64urlToBytes(pubB64url);
  const sig = b64urlToBytes(sigB64url);
  if (!pub || pub.length !== 32 || !sig || sig.length !== 64) return false;
  try {
    const key = await crypto.subtle.importKey("raw", pub, { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, key, sig, enc.encode(text));
  } catch { return false; }
}

/** Parse + check the whole log. Returns { ok, count, entries (oldest first), problems }. */
export async function checkLog(text) {
  const entries = [];
  const problems = [];
  const lines = String(text || "").split("\n").filter((l) => l.trim());
  let prevHash = ZERO;
  for (let i = 0; i < lines.length; i++) {
    const out = { line: i + 1, n: null, observed_at: null, heads: [], prev: null, statement_hash: null, checks: {}, ok: false, problem: null };
    let row;
    try { row = JSON.parse(lines[i]); } catch { out.problem = "line is not valid JSON"; entries.push(out); problems.push(`line ${i + 1}: not JSON`); prevHash = null; continue; }
    const st = row && row.statement;
    if (!st || typeof st !== "object") { out.problem = "no statement"; entries.push(out); problems.push(`line ${i + 1}: no statement`); prevHash = null; continue; }
    out.n = Number.isInteger(st.n) ? st.n : null;
    out.observed_at = typeof st.observed_at === "string" ? st.observed_at : null;
    out.prev = typeof st.prev_statement_hash === "string" ? st.prev_statement_hash : null;
    out.statement_hash = typeof row.statement_hash === "string" ? row.statement_hash : null;
    const chains = st.heads && Array.isArray(st.heads.chains) ? st.heads.chains : [];
    out.heads = chains.map((c) => ({ chain: String(c && c.c), seq: c && Number.isInteger(c.seq) ? c.seq : null, h: String(c && c.h) }));
    out.rekor = row.rekor && typeof row.rekor.url === "string" && row.rekor.url.startsWith("https://search.sigstore.dev/") ? row.rekor.url : null;
    let canon = null;
    try { canon = canonicalize(st); } catch { canon = null; }
    const want = out.n != null ? keyForN(out.n) : null;
    out.checks.n_in_order = out.n === i + 1;
    out.checks.hash = Boolean(canon) && out.statement_hash === (await sha256Hex(canon));
    out.checks.prev_link = prevHash !== null && out.prev === prevHash;
    out.checks.pinned_key = Boolean(want) && row.public_key === want;
    out.checks.signature = Boolean(canon && want) && (await ed25519Verify(want, canon, row.sig));
    out.ok = Object.values(out.checks).every(Boolean);
    if (!out.ok) {
      const failed = Object.entries(out.checks).filter(([, v]) => !v).map(([k]) => k);
      out.problem = "failed: " + failed.join(", ");
      problems.push(`n=${out.n ?? "?"}: ${out.problem}`);
    }
    prevHash = out.statement_hash;
    entries.push(out);
  }
  if (!lines.length) problems.push("log is empty");
  return { ok: lines.length > 0 && problems.length === 0, count: lines.length, entries, problems };
}

/** Fetch the raw log through the Cache API (CACHE_TTL_S). Throws {kind:"limit"|"unreadable"}. */
export async function loadLog({ fetchImpl = fetch, cache = (typeof caches !== "undefined" ? caches.default : null), ctx } = {}) {
  if (cache) {
    const hit = await cache.match(CACHE_KEY).catch(() => null);
    if (hit) return { text: await hit.text(), fetched_at: hit.headers.get("x-fetched-at"), cached: true };
  }
  let res;
  try {
    res = await fetchImpl(WITNESS_LOG_URL, { headers: { "user-agent": "aziel-corpus-witness-tab" }, redirect: "manual", cf: { cacheTtl: CACHE_TTL_S } });
  } catch (e) {
    throw Object.assign(new Error("log fetch failed: " + (e && e.message)), { kind: "unreadable" });
  }
  if (res.status === 429 || res.status === 403) throw Object.assign(new Error("log host limit " + res.status), { kind: "limit", retryAfter: Number(res.headers.get("retry-after")) || 300 });
  if (res.status !== 200) throw Object.assign(new Error("log host answered " + res.status), { kind: "unreadable" });
  const len = Number(res.headers.get("content-length") || 0);
  if (len > MAX_LOG_BYTES) throw Object.assign(new Error("log too large"), { kind: "unreadable" });
  const text = await res.text();
  if (text.length > MAX_LOG_BYTES) throw Object.assign(new Error("log too large"), { kind: "unreadable" });
  const fetched_at = new Date().toISOString();
  if (cache) {
    const put = cache.put(CACHE_KEY, new Response(text, { headers: { "cache-control": `public, max-age=${CACHE_TTL_S}`, "x-fetched-at": fetched_at } })).catch(() => {});
    if (ctx && ctx.waitUntil) ctx.waitUntil(put); else await put;
  }
  return { text, fetched_at, cached: false };
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function etTime(iso) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return "unknown time";
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" }).format(d) + " ET";
}

const ONE_WITNESS = "Only one witness exists. A second witness is not set up, so nothing here is confirmed by two witnesses.";

export function witnessBody(result, { fetched_at, error } = {}) {
  const head = `<h1>Witness</h1><p class="lede">An outside log in <a href="${WITNESS_REPO_URL}">aziel-anchors</a> records the runtime's chain heads every so often and signs each record. This page reads that log and re-checks every signature here. New records show up within about a minute.</p><p><strong>${ONE_WITNESS}</strong></p>`;
  if (error) {
    const msg = error.kind === "limit" ? "The log host is busy. Try again later." : "The witness log could not be read right now, so nothing here is checked. Try again later.";
    return `${head}<div class="card"><p><strong>${esc(msg)}</strong></p></div>`;
  }
  const bad = result.entries.filter((e) => !e.ok).length;
  const status = result.ok
    ? `All ${result.count} records passed every check (hash, signature against the pinned key, link to the record before, order).`
    : `${bad} of ${result.count} records failed a check. Those records are not trusted. See each one below.`;
  const rows = [...result.entries].reverse().map((e) => {
    const heads = e.heads.map((h) => `<li><code>${esc(h.chain)}</code> seq ${esc(h.seq)} <code>${esc(h.h)}</code></li>`).join("");
    const sig = e.checks.signature && e.checks.pinned_key ? "Signature checks out against the pinned key." : "Signature did NOT check out.";
    return `<div class="card witness-entry" id="n${esc(e.n)}"><h2>Record ${esc(e.n ?? "?")}</h2>
<p>${esc(etTime(e.observed_at))}</p>
<p><strong>${e.ok ? "Passed every check." : "Failed: " + esc(e.problem)}</strong> ${esc(sig)}</p>
<ul>${heads || "<li>No chain heads.</li>"}</ul>
<p>Record hash <code>${esc(e.statement_hash)}</code><br>Previous <code>${esc(e.prev)}</code></p>
${e.rekor ? `<p><a href="${esc(e.rekor)}">Public log entry (Sigstore)</a></p>` : ""}</div>`;
  }).join("\n");
  const poll = `<script>(function(){var c=${Number(result.count)};setInterval(function(){fetch("${WITNESS_JSON_PATH}").then(function(r){return r.ok?r.json():null}).then(function(j){if(j&&typeof j.count==="number"&&j.count!==c)location.reload()}).catch(function(){})},60000)})();</script>`;
  return `${head}<div class="card"><p><strong>${esc(status)}</strong></p><p>Log read ${esc(etTime(fetched_at))}. Newest first.</p></div>\n${rows}${poll}`;
}

export function witnessJson(result, { fetched_at, error } = {}) {
  if (error) return { ok: false, code: error.kind === "limit" ? "WITNESS-LOG-LIMIT" : "WITNESS-LOG-UNREADABLE", witnesses: 1, witness2: "not_configured", log: WITNESS_LOG_URL };
  return {
    ok: result.ok, code: result.ok ? "WITNESS-LOG-CHECKED" : "WITNESS-LOG-FAILED", count: result.count,
    witnesses: 1, witness2: "not_configured", log: WITNESS_LOG_URL, fetched_at, problems: result.problems,
    entries: [...result.entries].reverse(),
  };
}

export async function handleWitness(request, env, ctx, deps = {}) {
  const url = new URL(request.url);
  const asJson = url.pathname.replace(/\/+$/, "") === WITNESS_JSON_PATH;
  let loaded = null, error = null, result = null;
  try { loaded = await loadLog({ ...deps, ctx }); result = await checkLog(loaded.text); }
  catch (e) { error = { kind: e && e.kind === "limit" ? "limit" : "unreadable", retryAfter: (e && e.retryAfter) || 120 }; }
  const status = error ? 503 : 200;
  const headers = { "Cache-Control": `public, max-age=${error ? 0 : 30}` };
  if (error) headers["Retry-After"] = String(error.retryAfter);
  if (asJson) {
    return new Response(JSON.stringify(witnessJson(result, { fetched_at: loaded && loaded.fetched_at, error }), null, 2), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
  }
  const body = witnessBody(result, { fetched_at: loaded && loaded.fetched_at, error });
  const html = page("Witness", body, { path: WITNESS_PATH, kind: "article", description: "Signed witness log of the Aziel runtime's chain heads, re-checked on every read." });
  return new Response(request.method === "HEAD" ? null : html, { status, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
}
