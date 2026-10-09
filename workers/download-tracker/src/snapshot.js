/**
 * Shelf / tree pages without D1: render from the packed shelf snapshot
 * (library:index:v1, refreshed by cron) or a last-good Cache API copy, with an
 * honest stale label. Crawlers are always served from the snapshot.
 * Author: Aziel Eliab.
 */
import { HTML_CACHE_PREFIX } from "./library-index.js";
import { isCrawlerRequest } from "./crawler.js";
export { isCrawlerRequest };

/** Shelf HTML lives at the edge for a day; re-rendered at most every 30 min (cron cadence). */
export const SHELF_EDGE_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=86400";
export const SHELF_REVALIDATE_MS = 30 * 60 * 1000;
/** Last-good copy used only when D1/KV refuse (quota or overload). */
export const LASTGOOD_CACHE_CONTROL = "public, max-age=604800";

const SHELF_PARAMS = ["q", "sort", "author", "domain", "subject", "keyword", "offset", "limit", "lib"];
const DEFAULTS = { sort: "newest", offset: "0", limit: "48", lib: "all" };

/**
 * One cache key per distinct shelf view: known params only, sorted, defaults dropped,
 * so tracking junk and param order do not explode the cache. The default view keeps
 * the plain path key, so ingest invalidation (invalidatePublicHtmlCache) still hits it.
 */
export function canonicalShelfCacheUrl(path, browse) {
  const parts = [];
  for (const k of SHELF_PARAMS) {
    const v = browse && browse[k] != null ? String(browse[k]).trim() : "";
    if (!v || DEFAULTS[k] === v) continue;
    parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
  }
  return HTML_CACHE_PREFIX + path + (parts.length ? "?" + parts.join("&") : "");
}

/**
 * Last-good copies live under their own path, not "#lastgood": the Cloudflare cache
 * key ignores URL fragments, so a fragment key would collide with the main entry.
 * /__lastgood/ is never routed publicly (index.js answers 404 before any handler,
 * and it is not in run_worker_first or the static assets).
 */
export const LASTGOOD_PREFIX = "https://azielcorpuslibrary.net/__lastgood";

export function lastGoodUrl(cacheUrl) {
  const raw = String(cacheUrl || "");
  if (raw.startsWith(HTML_CACHE_PREFIX)) return LASTGOOD_PREFIX + (raw.slice(HTML_CACHE_PREFIX.length) || "/");
  try {
    const u = new URL(raw);
    return LASTGOOD_PREFIX + u.pathname + u.search;
  } catch {
    return LASTGOOD_PREFIX + "/" + encodeURIComponent(raw);
  }
}

/** Internal cache-key paths. Never served to the public. */
export function isInternalCachePath(pathname) {
  const p = String(pathname || "");
  return p === "/__lastgood" || p.startsWith("/__lastgood/") || p === "/__cache" || p.startsWith("/__cache/");
}

/** The packed index is missing or empty: not a valid snapshot (never render or cache an empty shelf from it). */
export function snapshotUnavailable(where = "") {
  const e = new Error("packed shelf snapshot unavailable" + (where ? " (" + where + ")" : ""));
  e.code = "SNAPSHOT_UNAVAILABLE";
  return e;
}

export function isSnapshotUnavailable(err) {
  return !!(err && err.code === "SNAPSHOT_UNAVAILABLE");
}

export function snapshotRecords(packed) {
  const records = packed && Array.isArray(packed.records) ? packed.records : [];
  if (!packed || packed.missing || records.length === 0) throw snapshotUnavailable();
  return records;
}

function escHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/**
 * cause "daily": a real Cloudflare daily-limit error (resets 00:00 UTC).
 * Anything else (overload, outage, missing data): short-lived wording, no midnight promise.
 */
export function staleNoticeHtml({ asOf, source, cause } = {}) {
  const when = asOf ? escHtml(String(asOf).replace("T", " ").slice(0, 16)) + " UTC" : "an earlier time";
  const what = source === "lastgood" ? "a saved copy of this page" : "the shelf snapshot";
  const why = cause === "daily"
    ? "The live catalog is paused because the Cloudflare daily limit was reached. Search inside documents is unavailable until the limit resets at 00:00 UTC."
    : "The live catalog is not answering right now (a temporary overload or outage). Try again in a minute.";
  return `<div class="card stale-notice" role="status" data-stale="true" data-stale-cause="${cause === "daily" ? "daily-limit" : "outage"}"><p><strong>Stale view.</strong> ${why} You are seeing ${what} from ${when}. It can be out of date.</p></div>`;
}

/** Put a notice at the top of <main> (or <body>). */
export function injectNotice(html, notice) {
  const s = String(html || "");
  const m = s.match(/<main\b[^>]*>/i) || s.match(/<body\b[^>]*>/i);
  if (!m) return notice + s;
  const at = m.index + m[0].length;
  return s.slice(0, at) + notice + s.slice(at);
}

export function sortTreeRows(rows) {
  const key = (r) => [String(r.library || ""), String(r.domain || ""), String(r.subjects || ""), String(r.title || "")];
  return (rows || []).slice().sort((a, b) => {
    const ka = key(a), kb = key(b);
    for (let i = 0; i < ka.length; i++) { const c = ka[i].localeCompare(kb[i]); if (c) return c; }
    return 0;
  });
}
