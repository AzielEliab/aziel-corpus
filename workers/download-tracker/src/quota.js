/**
 * Cloudflare free-tier quota handling (D1 rows read/written, KV puts/reads).
 *
 * When the account hits a daily D1 or KV limit, a route must say so with
 * 503 + Retry-After. It must not answer 404, an empty sitemap, an empty
 * shelf, or an uncaught Worker exception (1101). Free-tier daily limits
 * reset at 00:00 UTC (8 PM ET during daylight time).
 * Author: Aziel Eliab.
 */

export const QUOTA_ERROR_CODE = "CF_QUOTA";
const MIN_RETRY_AFTER_S = 60;
const FALLBACK_RETRY_AFTER_S = 3600;

/**
 * True only for Cloudflare Workers Free DAILY limits, which reset at 00:00 UTC:
 *   D1: "Your account has exceeded D1's free tier daily row read limit. ..." (and "row write")
 *   KV: "KV put() limit exceeded for the day." (also get/delete/list)
 * A bare "quota" or "too many requests" is NOT a daily limit (see isTransientOverload).
 */
export function isQuotaError(err) {
  if (!err) return false;
  if (err.code === QUOTA_ERROR_CODE || err.quota === true) return true;
  const msg = errMessage(err);
  if (!msg) return false;
  return /exceeded D1'?s free tier daily row (read|write) limit/i.test(msg)
    || /\bKV (get|put|delete|list)\(\) limit exceeded for the day/i.test(msg)
    || /daily (row )?(read|write|request) limit (has been )?(exceeded|reached)/i.test(msg);
}

/** Short-lived overload (rate limit, per-key write rate, D1 overloaded). Retry in seconds, not at midnight. */
export function isTransientOverload(err) {
  if (!err || isQuotaError(err)) return false;
  // Packed snapshot missing/empty while the page must not hit D1: short retry, not a midnight one.
  if (err.code === "SNAPSHOT_UNAVAILABLE") return true;
  const msg = errMessage(err);
  return /too many requests|\b429\b|rate limit|overloaded|D1_ERROR:.*(timeout|timed out|reset|try again)|network connection lost/i.test(msg);
}

export const TRANSIENT_RETRY_AFTER_S = 30;

function errMessage(err) {
  const own = typeof err === "string" ? err : String((err && err.message) || "");
  const cause = err && err.cause && err.cause.message ? " " + String(err.cause.message) : "";
  return (own + cause).trim();
}

/** Seconds until the next 00:00 UTC (free-tier quota reset). */
export function retryAfterSeconds(nowMs = Date.now()) {
  const now = new Date(nowMs);
  if (Number.isNaN(now.getTime())) return FALLBACK_RETRY_AFTER_S;
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
  const s = Math.ceil((next - nowMs) / 1000);
  return Math.max(MIN_RETRY_AFTER_S, s);
}

/** Wrap any error as a quota error so callers can rethrow it through catch-alls. */
export function quotaError(err, where = "") {
  const e = new Error(String((err && err.message) || err || "quota exceeded"));
  e.code = QUOTA_ERROR_CODE;
  e.quota = true;
  e.where = where;
  e.cause = err;
  return e;
}

/** Rethrow quota errors; swallow nothing else here. Use inside existing catch blocks. */
export function rethrowIfQuota(err, where = "") {
  if (isQuotaError(err)) throw (err && err.code === QUOTA_ERROR_CODE ? err : quotaError(err, where));
  // Transient overloads also must not become a false 404 / empty sitemap; the top-level handler gives a short Retry-After.
  if (isTransientOverload(err)) throw err;
}

/** 503 + Retry-After. Daily limit: seconds to 00:00 UTC. Transient overload: 30 s. No body data is invented. */
export function quotaResponse(err, { nowMs = Date.now(), headers = {} } = {}) {
  const daily = isQuotaError(err);
  const retry = daily ? retryAfterSeconds(nowMs) : TRANSIENT_RETRY_AFTER_S;
  const body = daily ? {
    ok: false,
    error: "temporarily unavailable: Cloudflare daily D1/KV quota reached",
    code: QUOTA_ERROR_CODE,
    retry_after_s: retry,
    note: "Data is not lost. Free-tier daily limits reset at 00:00 UTC. Try again after Retry-After.",
    author: "Aziel Eliab",
  } : {
    ok: false,
    error: "temporarily unavailable: storage overloaded",
    code: "CF_OVERLOAD",
    retry_after_s: retry,
    note: "Short overload, not a daily limit. Data is not lost. Try again after Retry-After.",
    author: "Aziel Eliab",
  };
  return new Response(JSON.stringify(body, null, 2), {
    status: 503,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Retry-After": String(retry),
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}
