/**
 * CORPUS-INTAKE-SAFETY-1.0 — duplicate floods and rate limits.
 *
 * Runs last in INTAKE_CHECKS. Keeps HASHES ONLY (table intake_seen): a content
 * SHA-256, a 32-value MinHash signature of word 3-shingles, and salted submitter / IP keys.
 * No text, no filename, no raw IP is stored.
 *
 *   INTAKE-FLOOD-DUPLICATE        identical content (by hash) already accepted in the window (30 days)
 *   INTAKE-FLOOD-NEAR-DUPLICATE   >= 2 near-copies (MinHash Jaccard >= 0.75) from the same submitter/IP in 24 h,
 *                                 or >= 3 near-copies from anyone in 24 h
 *   INTAKE-RATE-LIMITED (429)     per-submitter or per-IP counts (accepted + refused attempts) over limit
 *   INTAKE-FLOOD-STORE-UNAVAILABLE (503)  we cannot read the counters, so we refuse (fail closed)
 *
 * The operator is exempt from this check (one trusted filer; re-filing is allowed).
 * Exact hashes are reliable; MinHash near-duplicate is heuristic (paraphrase evades it,
 * and two short, formulaic notes can collide). Author: Aziel Eliab.
 */
import { createHash, randomBytes } from "node:crypto";
import { normalizeForMatch } from "./intake-text.js";

export const FLOOD_REASONS = Object.freeze({
  DUPLICATE: "INTAKE-FLOOD-DUPLICATE",
  NEAR_DUPLICATE: "INTAKE-FLOOD-NEAR-DUPLICATE",
  RATE_LIMITED: "INTAKE-RATE-LIMITED",
  STORE_UNAVAILABLE: "INTAKE-FLOOD-STORE-UNAVAILABLE",
});

export const FLOOD_DEFAULTS = Object.freeze({
  DUP_WINDOW_MS: 30 * 24 * 3600e3,
  NEAR_WINDOW_MS: 24 * 3600e3,
  NEAR_SIMILARITY: 0.75,
  NEAR_SAME_KEY_MAX: 2,
  NEAR_GLOBAL_MAX: 3,
  MIN_SHINGLE_TOKENS: 20,
  USER_PER_HOUR: 10,
  USER_PER_DAY: 50,
  IP_PER_HOUR: 20,
  IP_PER_DAY: 100,
});

function limits(env) {
  const out = { ...FLOOD_DEFAULTS };
  for (const k of ["USER_PER_HOUR", "USER_PER_DAY", "IP_PER_HOUR", "IP_PER_DAY"]) {
    const v = Number(env && env["INTAKE_RATE_" + k]);
    if (Number.isFinite(v) && v > 0) out[k] = Math.floor(v);
  }
  return out;
}

const sha = (x) => createHash("sha256").update(x).digest("hex");

/** Content identity: file bytes when present, else the normalised body/texts (title alone if nothing else). */
export function contentHash(ctx) {
  if (ctx.file && ctx.file.bytes instanceof Uint8Array && ctx.file.bytes.byteLength) return "f:" + sha(ctx.file.bytes);
  const text = normalizeForMatch([ctx.body, ...(ctx.texts || [])].join("\n")) || normalizeForMatch(ctx.title);
  return text ? "t:" + sha(text) : null;
}

const MINHASH_K = 32;
const SEEDS = Array.from({ length: MINHASH_K }, (_, i) => (Math.imul(0x9e3779b1, i + 1) ^ 0x85ebca6b) >>> 0);
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function mix(h, seed) {
  h = (h ^ seed) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * MinHash signature (32 x 32-bit, hex) over word 3-shingles of the normalised text.
 * Null when the text is too short to compare fairly. Only the signature is stored.
 */
export function shingleSignature(text, minTokens = FLOOD_DEFAULTS.MIN_SHINGLE_TOKENS) {
  const toks = normalizeForMatch(text).split(" ").filter(Boolean).slice(0, 20000);
  if (toks.length < minTokens) return null;
  const mins = new Array(MINHASH_K).fill(0xffffffff);
  for (let i = 0; i + 2 < toks.length; i++) {
    const h = fnv1a(toks[i] + " " + toks[i + 1] + " " + toks[i + 2]);
    for (let k = 0; k < MINHASH_K; k++) { const v = mix(h, SEEDS[k]); if (v < mins[k]) mins[k] = v; }
  }
  return mins.map((v) => v.toString(16).padStart(8, "0")).join("");
}

/** Estimated Jaccard similarity of two signatures (0..1). */
export function similarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let same = 0;
  for (let i = 0; i < a.length; i += 8) if (a.slice(i, i + 8) === b.slice(i, i + 8)) same++;
  return same / (a.length / 8);
}

export async function ensureFloodSchema(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS intake_seen(seen_id TEXT PRIMARY KEY, created_utc TEXT NOT NULL, door TEXT, content_sha256 TEXT, minhash TEXT, submitter_key TEXT, ip_key TEXT)"
  ).run();
}

async function count(env, table, col, value, sinceIso) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM " + table + " WHERE " + col + " = ? AND created_utc >= ?").bind(value, sinceIso).first();
  const n = Number(row && row.n);
  if (!Number.isFinite(n)) throw new Error("count unavailable");
  return n;
}

async function attempts(env, col, value, sinceIso) {
  return (await count(env, "intake_seen", col, value, sinceIso)) + (await count(env, "intake_refusals", col, value, sinceIso));
}

async function recordSeen(env, ctx, chash, sh) {
  await env.DB.prepare("INSERT INTO intake_seen(seen_id,created_utc,door,content_sha256,minhash,submitter_key,ip_key) VALUES(?,?,?,?,?,?,?)")
    .bind("AZSEEN-" + randomBytes(6).toString("hex"), new Date(ctx.now).toISOString(), String(ctx.door).slice(0, 64), chash, sh, ctx.submitter_key || null, ctx.ip_key || null)
    .run();
}

export const floodChecks = {
  name: "flood",
  async run(ctx) {
    const env = ctx.env;
    const L = limits(env);
    const chash = contentHash(ctx);
    const sh = shingleSignature([ctx.body, ...(ctx.texts || [])].join("\n"), L.MIN_SHINGLE_TOKENS);
    if (ctx.operator) {
      // Exempt, but still leave the hash so a guest re-flooding the operator's text is caught.
      try { if (env && env.DB) { await ensureFloodSchema(env); await recordSeen(env, ctx, chash, sh); } } catch { /* operator path never blocks on counters */ }
      return null;
    }
    const iso = (ms) => new Date(ctx.now - ms).toISOString();
    try {
      if (!env || !env.DB) throw new Error("no store");
      await ensureFloodSchema(env);
      // Rate limits first: they count refused attempts too, so hammering with refused content also trips them.
      for (const [col, key, hour, day] of [["submitter_key", ctx.submitter_key, L.USER_PER_HOUR, L.USER_PER_DAY], ["ip_key", ctx.ip_key, L.IP_PER_HOUR, L.IP_PER_DAY]]) {
        if (!key) continue;
        if ((await attempts(env, col, key, iso(3600e3))) >= hour) return { code: FLOOD_REASONS.RATE_LIMITED, status: 429 };
        if ((await attempts(env, col, key, iso(24 * 3600e3))) >= day) return { code: FLOOD_REASONS.RATE_LIMITED, status: 429 };
      }
      if (chash && (await count(env, "intake_seen", "content_sha256", chash, iso(L.DUP_WINDOW_MS))) > 0) return { code: FLOOD_REASONS.DUPLICATE, status: 409 };
      if (sh) {
        const res = await env.DB.prepare("SELECT minhash, submitter_key, ip_key FROM intake_seen WHERE created_utc >= ? ORDER BY created_utc DESC LIMIT 5000").bind(iso(L.NEAR_WINDOW_MS)).all();
        if (!res || !Array.isArray(res.results)) throw new Error("scan unavailable");
        let same = 0;
        let global = 0;
        for (const r of res.results) {
          if (similarity(sh, r.minhash) < L.NEAR_SIMILARITY) continue;
          global++;
          if ((ctx.submitter_key && r.submitter_key === ctx.submitter_key) || (ctx.ip_key && r.ip_key === ctx.ip_key)) same++;
        }
        if (same >= L.NEAR_SAME_KEY_MAX || global >= L.NEAR_GLOBAL_MAX) return { code: FLOOD_REASONS.NEAR_DUPLICATE, status: 409 };
      }
      await recordSeen(env, ctx, chash, sh);
      return null;
    } catch {
      return { code: FLOOD_REASONS.STORE_UNAVAILABLE, status: 503 };
    }
  },
};
