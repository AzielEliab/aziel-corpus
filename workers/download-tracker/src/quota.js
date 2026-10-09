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
 * True when the error looks like a Cloudflare D1 or KV daily quota / limit error.
 * Examples: "KV put() limit exceeded for the day.",
 * "D1_ERROR: Exceeded maximum daily rows read", "Too many requests", code 10048.
 */
export function isQuotaError(err) {
  if (!err) return false;
  if (err.code === QUOTA_ERROR_CODE || err.quota === true) return true;
  const msg = String((err && (err.message || err.cause && err.cause.message)) || err || "");
  if (!msg) return false;
  if (/limit exceeded|exceeded .*limit|exceeded the daily|daily .*limit|rows read limit|rows written limit|maximum (daily )?rows|quota|too many requests|\b10048\b/i.test(msg)) return true;
  return false;
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
}

/** 503 + Retry-After. No body data is invented. */
export function quotaResponse(err, { nowMs = Date.now(), headers = {} } = {}) {
  const retry = retryAfterSeconds(nowMs);
  const body = {
    ok: false,
    error: "temporarily unavailable: Cloudflare daily D1/KV quota reached",
    code: QUOTA_ERROR_CODE,
    retry_after_s: retry,
    note: "Data is not lost. Free-tier daily limits reset at 00:00 UTC. Try again after Retry-After.",
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
