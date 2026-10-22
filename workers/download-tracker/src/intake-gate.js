/**
 * CORPUS-INTAKE-SAFETY-1.0 — the intake gate.
 *
 * One screening gate that every corpus write door calls BEFORE anything is
 * written, stored or chained (no R2 put, no D1 records row, no ledger append).
 * Aziel's rule is that nothing is ever removed from the corpus once chained, so
 * the only place safety can live is in front of the chain.
 *
 * Fail closed:
 *   - a check that refuses  -> the item is refused;
 *   - a check that throws   -> the item is refused (INTAKE-CHECK-ERROR);
 *   - a receipt that cannot be written -> the item is STILL refused.
 * Refused items are never written, stored, cached, logged or chained.
 *
 * A refusal receipt holds only hashes plus a reason code. It never holds the
 * title, body, filename, bytes, submitter name or IP in the clear.
 *
 * This module adds no door, no tool, no Software and no version bump. It is a
 * pre-chain screen inside the existing ingest pipeline. Author: Aziel Eliab.
 */
import { createHash, randomBytes } from "node:crypto";

export const INTAKE_SPEC = "CORPUS-INTAKE-SAFETY-1.0";

/** Reason codes. A receipt carries exactly one. */
export const INTAKE_REASONS = Object.freeze({
  CHECK_ERROR: "INTAKE-CHECK-ERROR",
  UNREADABLE: "INTAKE-UNREADABLE",
});

const MAX_INTAKE_BYTES = 25 * 1024 * 1024;

function sha256hex(input) {
  const h = createHash("sha256");
  if (input == null) h.update("");
  else if (typeof input === "string") h.update(input, "utf8");
  else h.update(input instanceof Uint8Array ? input : new Uint8Array(input));
  return h.digest("hex");
}

/** Salted, one-way submitter key. Never the clear name or IP. */
export function submitterKey(env, kind, value) {
  const v = String(value == null ? "" : value).trim().toLowerCase();
  if (!v) return null;
  const salt = String((env && env.INTAKE_SALT) || "aziel-corpus-intake");
  return sha256hex(salt + "|" + kind + "|" + v);
}

export class IntakeRefusal extends Error {
  constructor(code, receipt, status) {
    // Public message: reason code and receipt id only. Never content.
    super("Refused at intake (" + code + "). Nothing was stored or chained." + (receipt && receipt.receipt_id ? " Receipt " + receipt.receipt_id + "." : ""));
    this.name = "IntakeRefusal";
    this.code = code;
    this.status = status || 422;
    this.intake_refused = true;
    this.receipt = receipt || null;
  }
}

/**
 * Checks run in order. Each check is { name, run(ctx) } and returns null to pass
 * or { code, status? } to refuse. Later PRs append checks here (media floor,
 * text, flood/rate). Order matters: the cheapest hard floors run first.
 */
export const INTAKE_CHECKS = [
  {
    name: "readable",
    run(ctx) {
      if (ctx.file && !(ctx.file.bytes instanceof Uint8Array)) return { code: INTAKE_REASONS.UNREADABLE, status: 400 };
      if (ctx.file && ctx.file.bytes.byteLength > MAX_INTAKE_BYTES) return { code: INTAKE_REASONS.UNREADABLE, status: 413 };
      return null;
    },
  },
];

async function readFileForIntake(file) {
  if (!file) return null;
  const name = String(file.name || "");
  const type = String(file.type || "");
  // Unreadable bytes are a refusal, never a pass.
  const buf = await file.arrayBuffer();
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return { name, type, bytes };
}

/** Build the hash-only refusal receipt. */
export function refusalReceipt(env, ctx, code) {
  const fileSha = ctx && ctx.file && ctx.file.bytes instanceof Uint8Array ? sha256hex(ctx.file.bytes) : null;
  const bodySha = ctx && ctx.body ? sha256hex(String(ctx.body)) : null;
  const titleSha = ctx && ctx.title ? sha256hex(String(ctx.title)) : null;
  return {
    spec: INTAKE_SPEC,
    receipt_id: "AZINR-" + randomBytes(6).toString("hex").toUpperCase(),
    created_utc: new Date().toISOString(),
    door: String((ctx && ctx.door) || "unknown").slice(0, 64),
    reason_code: String(code),
    content_sha256: fileSha || bodySha,
    title_sha256: titleSha,
    body_sha256: fileSha ? bodySha : null,
    submitter_key: ctx ? ctx.submitter_key || null : null,
    ip_key: ctx ? ctx.ip_key || null : null,
    stored: false,
    chained: false,
    content_retained: false,
  };
}

export async function ensureIntakeSchema(env) {
  if (!env || !env.DB) return;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS intake_refusals(receipt_id TEXT PRIMARY KEY, created_utc TEXT NOT NULL, door TEXT, reason_code TEXT NOT NULL, content_sha256 TEXT, title_sha256 TEXT, body_sha256 TEXT, submitter_key TEXT, ip_key TEXT)"
  ).run();
}

/** Append-only receipt row. Separate from the corpus hash chain on purpose. */
export async function writeRefusalReceipt(env, receipt) {
  if (!env || !env.DB || !receipt) return false;
  try {
    await ensureIntakeSchema(env);
    await env.DB.prepare(
      "INSERT INTO intake_refusals(receipt_id,created_utc,door,reason_code,content_sha256,title_sha256,body_sha256,submitter_key,ip_key) VALUES(?,?,?,?,?,?,?,?,?)"
    ).bind(
      receipt.receipt_id,
      receipt.created_utc,
      receipt.door,
      receipt.reason_code,
      receipt.content_sha256,
      receipt.title_sha256,
      receipt.body_sha256,
      receipt.submitter_key,
      receipt.ip_key
    ).run();
    return true;
  } catch {
    // Receipt storage failing never turns a refusal into a pass.
    return false;
  }
}

/**
 * Screen one intake item. Resolves to the screened context on pass.
 * Throws IntakeRefusal on any refusal or error. Never logs content.
 *
 * input: { door, signed, operator, title, body, file (File|Blob|null), texts[], ip }
 */
export async function screenIntake(env, input, opts = {}) {
  const checks = Array.isArray(opts.checks) ? opts.checks : INTAKE_CHECKS;
  const ctx = {
    spec: INTAKE_SPEC,
    env,
    door: String((input && input.door) || "unknown"),
    operator: !!(input && input.operator),
    title: String((input && input.title) || ""),
    body: String((input && input.body) || ""),
    texts: Array.isArray(input && input.texts) ? input.texts.map((t) => String(t == null ? "" : t)) : [],
    file: null,
    submitter_key: submitterKey(env, "user", input && input.signed && (input.signed.user_id || input.signed.username)),
    ip_key: submitterKey(env, "ip", input && input.ip),
    now: opts.now || Date.now(),
  };
  let code = null;
  let status = 422;
  try {
    ctx.file = await readFileForIntake(input && input.file);
    for (const check of checks) {
      const res = await check.run(ctx);
      if (res && res.code) {
        code = String(res.code);
        status = res.status || 422;
        break;
      }
    }
  } catch {
    code = INTAKE_REASONS.CHECK_ERROR;
    status = 422;
  }
  if (!code) return ctx;
  const receipt = refusalReceipt(env, ctx, code);
  receipt.receipt_stored = await writeRefusalReceipt(env, receipt);
  // Drop every reference to the content before the error leaves this function.
  ctx.file = null;
  ctx.body = "";
  ctx.title = "";
  ctx.texts = [];
  throw new IntakeRefusal(code, receipt, status);
}

/** Door metadata for callers that hold the Request. IP is hashed inside the gate. */
export function intakeMeta(request, door) {
  let ip = null;
  try {
    ip = request && request.headers ? (request.headers.get("CF-Connecting-IP") || null) : null;
  } catch { ip = null; }
  return { door: String(door || "unknown"), ip };
}

/** JSON body for a refused request: reason code + receipt, no content. */
export function intakeRefusalBody(err) {
  return {
    ok: false,
    refused: true,
    spec: INTAKE_SPEC,
    reason_code: err && err.code ? err.code : INTAKE_REASONS.CHECK_ERROR,
    receipt: err && err.receipt ? err.receipt : null,
    stored: false,
    chained: false,
  };
}
