import { handleRuntimeApi, corsHeaders, json, LIMITATION } from "./runtime.js";
import { isQuotaError, quotaResponse } from "./quota.js";
import { handleRuntimeRoot } from "./runtime-root.js";
import { handleAuth, getSession } from "./auth.js";
import { page, homeBody, homeSearchActive, streamLcpHtml } from "./ui.js";
import { filmTheaterHtml, libraryHubRedirect, LIBRARY_HUB_PATH } from "./film.js";
import { peekMeshDualCounts } from "./mesh.js";
import { handleHosted } from "./hosted.js";
import { robotsTxt, sitemapXml, sitemapIndexXml, sitemapRecordsXml, citeDoc, llmsDoc, aiTxt, humansTxt, mcpDiscovery, isReadMethod, crawlResponse, MIME, isIndexNowKeyPath, indexNowKeyBody } from "./crawl.js";
import { readOutletState } from "./mesh-outlet.js";
import { helpRouteBody } from "./help.js";
import { bridgeDoc, productBySlug } from "./ai-surface.js";
import { serveDesignPack } from "./design-pack.js";
import { continueMetadataBackfill } from "./record-metadata.js";
import { bumpPaperCount, continuePaperBackfill, permalinksForRows, readPaperMetrics, recordIdForContentHash, stampPermalinks, topPapers } from "./paper-ux.js";
import { continueContentHashRepair, sampleContentHashIntegrity } from "./content-hash-repair.js";
import { identityRouteBody } from "./identity.js";
import { fetchLiveSurvival, isSurvivalSeoPath, SURVIVAL_SEO_CACHE_CONTROL } from "./ban-survival.js";
import { searchRecords, parseBrowseParams, serveFile, serveFileByHash, normalizeContentHash } from "./library.js";
import { continueFullBackfill, continueRecalibrateAll } from "./review-store.js";
import { continueVerifyGeo } from "./geo.js";
import {
  collectStats,
  notePackedIncrement,
  readPackedIndex,
  refreshPackedIndex,
  statsFromPacked,
  tryTunnelFirst,
  HTML_CACHE_CONTROL,
  SEO_CACHE_CONTROL,
} from "./library-index.js";
import { enforceRateLimit, rememberCatalog, isSeoBot } from "./rate-limit.js";
import { handleDonate, DONATE_PATH } from "./donate.js";
import { handleDonateQr, isDonateQrPath } from "./donate-qr.js";
import { handleReceipts, isReceiptsPath } from "./action-receipts.js";
import { locksetFile } from "./ingest-receipt.js";
import { isShelvesPath, shelvesDoc } from "./cold-shelf.js";
import { serveSoftwareAsset, DEFAULT_ASSET as SOFTWARE_DEFAULT_ASSET } from "./software-download.js";
import { classifyRequest, readBotManagement } from "./classify.js";
import {
  attachPresenceCookie,
  commitPreparedViewer,
  handlePresenceApi,
  isPresencePath,
  prepareViewerCookie,
} from "./presence.js";
import {
  isolatedKeys,
  isReservedCounterKey,
  shapeCountBody,
  shapeHumanBotFields,
} from "./stats-shape.js";

const WALK_API = new Set([
  "/v1/verify-backfill",
  "/v1/recalibrate-all",
  "/v1/verify-geo",
  "/v1/metadata-backfill",
  "/v1/content-hash-repair",
  "/v1/paper-backfill",
]);

function barePath(pathname) {
  return String(pathname || "").replace(/\/+$/, "") || "/";
}

/** HTML and record reads. These must not start backfill, remint, metadata, paper, or geo walks. */
export function isPageView(pathname) {
  const path = barePath(pathname);
  if (path === "/" || path === "/search") return true;
  if (path === "/record" || path.startsWith("/record/")) return true;
  if (path.startsWith("/azielcorpus/") || path.startsWith("/aziellibrary/")) return true;
  if (path.startsWith("/help")) return true;
  if (path.startsWith("/receipt/")) return true;
  if (WALK_API.has(path) || path.startsWith("/v1/") || path.startsWith("/api/") || path.startsWith("/runtime")) return false;
  if (path.startsWith("/file/") || path === "/download" || path.startsWith("/download/") || path === "/go" || path === "/count" || path === "/stats" || path === "/event") return false;
  return true;
}

/** Kept for tests and callers. fetch() no longer starts per-request walks at all (cron runs one per tick).
 * Operator walk APIs must not share the isolate with background backfill/geo. Page views must not start those walks. Cron and GET /v1/recalibrate-all still remint. */
export function shouldBackgroundWalk(pathname) {
  const path = barePath(pathname);
  if (isPageView(path)) return false;
  return !WALK_API.has(path);
}

/** Tunnel hop stays off operator walk APIs. Page views may still tunnel; they do not start walks. */
export function shouldTunnelFirst(pathname) {
  return !WALK_API.has(barePath(pathname));
}

/**
 * Aziel Digital Library v2.7.0 public MASTER (Cloudflare Worker).
 *
 * GET  /          increments page-view counter, MASTER HTML (search, login, counted zip)
 * GET  /download  increments downloads, serves zip via env.ASSETS.fetch (HTTP 200, no 302)
 * GET  /install.sh  one-click install script
 *
 * KV binding DOWNLOADS. Isolated: Worker aziel-corpus-download-tracker, KV AZIEL_DIGITAL_LIBRARY_DOWNLOADS.
 * Hot path reads packed library:index:v1 (no KV.list()). /v1 does not increment.
 * Author: Aziel Eliab.
 */

const PROJECT = "aziel-corpus";
const KEYS = isolatedKeys(PROJECT);

async function withHumanBotStats(env, request, stats) {
  const views = Number(stats && stats.views) || 0;
  const downloads = Number(stats && (stats.downloads != null ? stats.downloads : stats.total)) || 0;
  const viewsHuman = parseInt((await env.DOWNLOADS.get(KEYS.views_human)) || "0", 10) || 0;
  const downloadsHuman = parseInt((await env.DOWNLOADS.get(KEYS.downloads_human)) || "0", 10) || 0;
  const split = shapeHumanBotFields({
    views,
    downloads,
    views_human: viewsHuman,
    downloads_human: downloadsHuman,
    botManagementAvailable: readBotManagement(request).available,
  });
  return { ...stats, ...split };
}

const VERSION = "2.7.0";
const DEFAULT_ASSET = "aziel-digital-library-2.7.0.zip";
const LEGACY_ASSET = "aziel-digital-library-2.6.2.zip";
const DEFAULT_OWNER = "AzielEliab";
const DEFAULT_REPO = "aziel-corpus";
const DEFAULT_BRANCH = "main";
const HOST = "https://www.azielcorpuslibrary.net";
const FALLBACK_HOST = "https://aziel-corpus-download-tracker.vibelock.workers.dev";
const GITHUB_REPO = "https://github.com/AzielEliab/aziel-corpus";
const GITHUB_LATEST = "https://github.com/AzielEliab/aziel-corpus/releases/latest";
const CATALOG = "https://aziel-runtime.vibelock.workers.dev";

function splitOwnerRepo(value, fallbackOwner, fallbackRepo) {
  if (typeof value === "string" && value.includes("/")) {
    const [o, r] = value.split("/").filter(Boolean);
    if (o && r) return { owner: o, repo: r };
  }
  return { owner: fallbackOwner, repo: fallbackRepo };
}

function parseDims(src) {
  const get = (k) => {
    if (src == null) return null;
    if (typeof src.get === "function") {
      const v = src.get(k);
      return v == null || v === "" ? null : v;
    }
    const v = src[k];
    return v == null || v === "" ? null : v;
  };

  let owner = get("owner") || DEFAULT_OWNER;
  let repo = get("repo") || DEFAULT_REPO;
  if (typeof repo === "string" && repo.includes("/")) {
    const split = splitOwnerRepo(repo, owner, DEFAULT_REPO);
    owner = split.owner;
    repo = split.repo;
  }

  const branch = get("branch") || DEFAULT_BRANCH;
  const tag = get("tag") || "latest";
  const asset = get("asset") || "";

  const forkRaw = get("fork");
  let fork = "0";
  if (forkRaw === 1 || forkRaw === true || forkRaw === "1" || forkRaw === "true") {
    fork = "1";
  } else if (typeof forkRaw === "string" && forkRaw.includes("/")) {
    const split = splitOwnerRepo(forkRaw, owner, repo);
    owner = split.owner;
    repo = split.repo;
    fork = "1";
  } else if (forkRaw != null && forkRaw !== 0 && forkRaw !== false && forkRaw !== "0" && forkRaw !== "false") {
    fork = "1";
  }

  if (`${owner}/${repo}`.toLowerCase() !== `${DEFAULT_OWNER}/${DEFAULT_REPO}`.toLowerCase()) {
    fork = "1";
  }

  return { project: PROJECT, owner, repo, branch, fork, tag, asset };
}

function kvKey(dims) {
  return `${dims.project}|${dims.owner}|${dims.repo}|${dims.branch}|${dims.fork}`;
}

function totalKey() {
  return PROJECT + "|__total__";
}

function viewsKey() {
  return PROJECT + "|__views__";
}

function githubCacheKey() {
  return PROJECT + "|__github__";
}


async function bump(env, key) {
  const n = parseInt((await env.DOWNLOADS.get(key)) || "0", 10) + 1;
  await env.DOWNLOADS.put(key, String(n));
  return n;
}

/**
 * Only the human bucket is stored. The bot bucket is never read: every reader
 * shows bot = total - human (stats-shape.js strategy b), so writing the bot key
 * was a wasted KV put on every bot hit. Counts are unchanged and exact.
 * botKey stays in the signature so callers read the same.
 */
async function incrementSplit(env, humanKey, botKey, request) { // eslint-disable-line no-unused-vars
  const cls = classifyRequest(request);
  if (cls.bucket === "human") await bump(env, humanKey);
  return cls;
}

async function readHumanBotSplit(env, request) {
  const views = parseInt((await env.DOWNLOADS.get(KEYS.views)) || "0", 10) || 0;
  const downloadsRaw = await env.DOWNLOADS.get(KEYS.total);
  let downloads = parseInt(downloadsRaw || "0", 10);
  if (!Number.isFinite(downloads) || downloads < 0) downloads = 0;
  const viewsHuman = parseInt((await env.DOWNLOADS.get(KEYS.views_human)) || "0", 10) || 0;
  const downloadsHuman = parseInt((await env.DOWNLOADS.get(KEYS.downloads_human)) || "0", 10) || 0;
  const botManagementAvailable = readBotManagement(request).available;
  return shapeHumanBotFields({
    views,
    downloads,
    views_human: viewsHuman,
    downloads_human: downloadsHuman,
    botManagementAvailable,
  });
}

function enrichStatsWithHumanBot(stats, split) {
  return {
    ...stats,
    views_human: split.views_human,
    views_bot: split.views_bot,
    downloads_human: split.downloads_human,
    downloads_bot: split.downloads_bot,
    human: split.human,
    bot: split.bot,
    classification: split.classification,
  };
}

async function increment(env, dims, request) {
  const key = kvKey(dims);
  const n = parseInt((await env.DOWNLOADS.get(key)) || "0", 10) + 1;
  await env.DOWNLOADS.put(key, String(n));
  const tot = parseInt((await env.DOWNLOADS.get(totalKey())) || "0", 10) + 1;
  await env.DOWNLOADS.put(totalKey(), String(tot));
  try {
    await notePackedIncrement(env, { downloads: tot, dims, count: n });
  } catch {
    /* packed index is standby; counters above still wrote */
  }
  if (request) await incrementSplit(env, KEYS.downloads_human, KEYS.downloads_bot, request);

  return tot;
}

async function incrementViews(env, request) {
  if (!env || !env.DOWNLOADS || typeof env.DOWNLOADS.get !== "function") return 0;
  const n = parseInt((await env.DOWNLOADS.get(viewsKey())) || "0", 10) + 1;
  await env.DOWNLOADS.put(viewsKey(), String(n));
  // Packed views refresh on cron. Do not rewrite library:index:v1 on every page view.
  if (request) await incrementSplit(env, KEYS.views_human, KEYS.views_bot, request);

  return n;
}

/** GitHub stars/forks/release counts change slowly. 6 h cache keeps KV puts to a few a day. */
export const GITHUB_CACHE_MS = 6 * 60 * 60 * 1000;

export async function githubStats(env, { nowMs = Date.now() } = {}) {
  let prior = null;
  const cached = await env.DOWNLOADS.get(githubCacheKey());
  if (cached) {
    try {
      const obj = JSON.parse(cached);
      if (obj && typeof obj === "object") prior = obj;
      if (obj && obj.fetched_at && nowMs - obj.fetched_at < GITHUB_CACHE_MS) {
        return obj;
      }
    } catch {
      /* ignore */
    }
  }
  const headers = { "User-Agent": "Mozilla/5.0 AzielCorpus-download-tracker", Accept: "application/vnd.github+json" };
  let stars = 0;
  let forks = 0;
  let watchers = 0;
  let release_download_count = 0;
  let fetched = false;
  try {
    const repoRes = await fetch("https://api.github.com/repos/AzielEliab/aziel-corpus", { headers });
    if (repoRes.ok) {
      fetched = true;
      const repo = await repoRes.json();
      stars = Number(repo.stargazers_count) || 0;
      forks = Number(repo.forks_count) || 0;
      watchers = Number(repo.subscribers_count != null ? repo.subscribers_count : repo.watchers_count) || 0;
    }
    const relRes = await fetch("https://api.github.com/repos/AzielEliab/aziel-corpus/releases/latest", { headers });
    if (relRes.ok) {
      const rel = await relRes.json();
      const assets = Array.isArray(rel.assets) ? rel.assets : [];
      release_download_count = assets.reduce((s, a) => s + (Number(a.download_count) || 0), 0);
    } else if (prior) {
      release_download_count = Number(prior.release_download_count) || 0;
    }
  } catch {
    /* public API; empty is fine */
  }
  // A failed GitHub fetch must not overwrite real numbers with zeros, and must not spend a KV put.
  if (!fetched && prior) return prior;
  const out = { stars, forks, watchers, release_download_count, fetched_at: nowMs };
  try {
    await env.DOWNLOADS.put(githubCacheKey(), JSON.stringify(out));
  } catch {
    /* ignore */
  }
  return out;
}

function installScript() {
  return `#!/usr/bin/env bash
# Aziel Digital Library v${VERSION} counted zip install.
set -euo pipefail
HOST="${HOST}"
RUNTIME="\${AZIEL_RUNTIME_HOST:-${CATALOG}}"
ASSET="${DEFAULT_ASSET}"
LEGACY="${LEGACY_ASSET}"
WORKDIR="\${AZIEL_LIBRARY_HOME:-\$HOME/aziel-digital-library}"
mkdir -p "\$WORKDIR"
cd "\$WORKDIR"
echo "Checking updates via \${RUNTIME}/v1/update/check (User-Agent Mozilla/5.0)…"
UPDATE_JSON="\$(curl -fsSL -A 'Mozilla/5.0' "\${RUNTIME}/v1/update/check?slug=aziel-corpus&version=${VERSION}" || true)"
if [ -z "\$UPDATE_JSON" ]; then
  UPDATE_JSON="\$(curl -fsSL -A 'Mozilla/5.0' "\${HOST}/v1/update/check?slug=aziel-corpus&version=${VERSION}" || true)"
fi
if [ -n "\$UPDATE_JSON" ]; then
  echo "\$UPDATE_JSON"
fi
echo "Downloading counted zip from \${HOST}/download (User-Agent Mozilla/5.0)…"
if ! curl -fsSL -A 'Mozilla/5.0' "\${HOST}/download?asset=\${ASSET}" -o "\${ASSET}"; then
  echo "Canonical host failed; trying workers.dev fallback…"
  HOST="${FALLBACK_HOST}"
  if ! curl -fsSL -A 'Mozilla/5.0' "\${HOST}/download?asset=\${ASSET}" -o "\${ASSET}"; then
    ASSET="\$LEGACY"
    curl -fsSL -A 'Mozilla/5.0' "\${HOST}/download?asset=\${ASSET}" -o "\${ASSET}"
  fi
fi
python3 -m zipfile -e "\${ASSET}" .
DIR="\$(find . -maxdepth 1 -type d -name 'aziel-digital-library-*' -o -name 'aziel-digital-library-*' | head -n 1)"
if [ -n "\${DIR}" ]; then
  cd "\${DIR}"
fi
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -U pip
python -m pip install -e .
echo
echo "Installed Aziel Digital Library v${VERSION}."
echo "Run:  python3 aziel_launcher.py"
echo "Then open http://127.0.0.1:8765  (local MASTER)"
echo "Aziel Digital Library. Author Aziel Eliab. Not a 26-card index."
`;
}

async function serveAsset(request, env, asset, { head = false, onCounted } = {}) {
  return serveSoftwareAsset(request, env, asset || SOFTWARE_DEFAULT_ASSET, { head, onCounted });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function withRateCookie(res, limited) {
  if (!res || !limited || !limited.setCookie) return res;
  const headers = new Headers(res.headers);
  if (!headers.has("Set-Cookie")) headers.append("Set-Cookie", limited.setCookie);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function workCardsHtml() { return ""; }

async function indexHtml(env, request, signed) {
  const url = new URL(request.url);
  const browse = parseBrowseParams(url);
  const searching = homeSearchActive(browse);
  const held = String(url.searchParams.get("received") || "") === "held";
  const meshP = peekMeshDualCounts(env);
  const rowsP = searching
    ? searchRecords(env, { q: browse.q, library: browse.lib, sort: browse.sort, author: browse.author, domain: browse.domain, subject: browse.subject, keyword: browse.keyword, limit: 300 })
    : Promise.resolve([]);
  const signedP = signed !== undefined ? Promise.resolve(signed) : getSession(env, request);
  const packedP = readPackedIndex(env);
  const metricsP = readPaperMetrics(env);
  const [packed, rows, session, mesh, metrics] = await Promise.all([packedP, rowsP, signedP, meshP, metricsP]);
  const stats = statsFromPacked(packed);
  const catalog = stampPermalinks((packed && packed.records) || []);
  const linkedRows = permalinksForRows(rows, catalog);
  const error = held
    ? "Received. Safety review held this file off the public shelf. It is not deleted."
    : "";
  return page("Corpus Search", homeBody({
    ...browse,
    rows: linkedRows,
    error,
    views: stats.views || 0,
    downloads: stats.downloads || 0,
    records_packed: stats.records_packed,
    records_aziel: stats.records_aziel,
    records_corpus: stats.records_corpus,
    trending: topPapers(metrics, catalog, "views", 5),
    downloaded: topPapers(metrics, catalog, "downloads", 5),
    host: HOST,
  }), { signed: session, path: LIBRARY_HUB_PATH, kind: "search", views: stats.views || 0, downloads: stats.downloads || 0, nodes: mesh.nodes, liveNodes: mesh.liveNodes, donateStrip: false, ecosystem: false });
}

function llmsTxt() {
  return `# Aziel Digital Library v2.7.0

Author: Aziel Eliab
Library: ${HOST}/
GitHub: ${GITHUB_REPO}
OpenAPI: ${HOST}/openapi.json
Catalog: ${CATALOG}/
License: Apache-2.0

${LIMITATION}

## Downloads (HTTP 200, counted, no 302)

- Package: ${HOST}/download?asset=${DEFAULT_ASSET}
- Install: curl -fsSL ${HOST}/install.sh | bash

## API (does not increment)

- GET ${HOST}/v1/health
- GET ${HOST}/v1/stats
- GET ${HOST}/v1/search?q=
- GET ${HOST}/v1/skill
- GET ${HOST}/v1/example
- GET ${HOST}/v1/verify-geo?status=1
`;
}

// Cron cadence: wrangler.toml triggers every 30 min. Keep the two in step.
export const CRON_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Background walks. Cron runs at most ONE per tick, in rotation, so each walk
 * runs every SCHEDULED_WALKS.length ticks (every 3 h at a 30 min cron).
 * Page views and API requests never start walks (free-tier D1 read budget).
 */
export const SCHEDULED_WALKS = Object.freeze([
  ["full-backfill", (env) => continueFullBackfill(env, { ms: 12000, all: false, background: true })],
  // TRIAD remint: continueRecalibrateAll acquires the single-walker lock or returns RECALIBRATE_LOCKED (cursor untouched).
  ["recalibrate-all", (env) => continueRecalibrateAll(env, { ms: 12000, all: false, background: true })],
  ["metadata-backfill", (env) => continueMetadataBackfill(env, { ms: 8000, all: false })],
  ["paper-backfill", (env) => continuePaperBackfill(env, { ms: 4000, all: false })],
  ["content-hash", async (env) => {
    await sampleContentHashIntegrity(env, { limit: 8 }).catch(() => null);
    return continueContentHashRepair(env, { ms: 4000, apply: false, all: false });
  }],
  ["verify-geo", (env) => continueVerifyGeo(env, { ms: 12000, force: false })],
]);

export function scheduledWalkIndex(scheduledTime, intervalMs = CRON_INTERVAL_MS) {
  const t = Number(scheduledTime);
  const tick = Number.isFinite(t) && t > 0 ? Math.floor(t / intervalMs) : 0;
  return ((tick % SCHEDULED_WALKS.length) + SCHEDULED_WALKS.length) % SCHEDULED_WALKS.length;
}

/** One cron tick: refresh the packed index once (GitHub stats folded in), then at most one walk. */
export async function runScheduledTick(env, scheduledTime = Date.now(), { walks = SCHEDULED_WALKS } = {}) {
  const out = { index: null, walk: null };
  const github = await githubStats(env).catch(() => null);
  try {
    await refreshPackedIndex(env, github ? { github } : {});
    out.index = "ok";
  } catch (e) {
    out.index = (e && e.code) || "error";
  }
  const [name, run] = walks[scheduledWalkIndex(scheduledTime) % walks.length];
  out.walk = name;
  await Promise.resolve().then(() => run(env)).catch(() => null);
  return out;
}

export default {
  async scheduled(event, env, ctx) {
    const when = event && event.scheduledTime ? event.scheduledTime : Date.now();
    const job = runScheduledTick(env, when);
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(job);
    else await job;
  },
  async fetch(request, env, ctx) {
    try {
      return await handleFetch(request, env, ctx);
    } catch (err) {
      // Daily D1/KV quota: 503 + Retry-After instead of an uncaught 1101.
      if (isQuotaError(err)) return quotaResponse(err, { headers: corsHeaders() });
      throw err;
    }
  },
};

async function handleFetch(request, env, ctx) {
    const url = new URL(request.url);
    const earlyPath = url.pathname.replace(/\/+$/, "") || "/";
    // Per-request background walks removed: cron runs one walk per tick (D1 read budget).

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (isDonateQrPath(earlyPath) && isReadMethod(request.method)) {
      return handleDonateQr(request, env);
    }
    if (earlyPath === DONATE_PATH && isReadMethod(request.method)) {
      return handleDonate(request);
    }
    if (isReceiptsPath(earlyPath) && (isReadMethod(request.method) || request.method === "POST")) {
      return handleReceipts(request, env);
    }

    let signedEarly = null;
    try { signedEarly = await getSession(env, request); } catch { signedEarly = null; }
    const limited = await enforceRateLimit(request, env, { path: earlyPath, signed: signedEarly });
    if (limited && limited.response) return limited.response;
    const presencePrep = prepareViewerCookie(request, earlyPath);
    if (presencePrep.counted && !isPresencePath(earlyPath)) {
      const job = commitPreparedViewer(env, presencePrep)
        .then((touch) => {
          if (touch && touch.published && typeof touch.published.then === "function") {
            return touch.published.catch(() => null);
          }
          return touch;
        })
        .catch(() => null);
      const homePaint = earlyPath === "/" || earlyPath === "/search";
      if (homePaint || !ctx || typeof ctx.waitUntil !== "function") await job;
      else ctx.waitUntil(job);
    }
    const attachVid = (res) => attachPresenceCookie(withRateCookie(res, limited), presencePrep);

    if (isReadMethod(request.method) && shouldTunnelFirst(earlyPath)) {
      const tunneled = await tryTunnelFirst(request, env);
      if (tunneled) return tunneled;
    }

    if (request.method === "PUT" || request.method === "PATCH" || request.method === "DELETE") {
      return json({ error: "records are append-only; PUT/PATCH/DELETE are rejected" }, 405);
    }


    const hostedPathEarly = url.pathname.replace(/\/+$/, "") || "/";
    if (hostedPathEarly === "/runtime" || hostedPathEarly === "/v1/runtime.json" || url.pathname.startsWith("/runtime/")) {
      const signedRuntime = hostedPathEarly === "/runtime" ? await getSession(env, request) : null;
      const runtimeRoot = await handleRuntimeRoot(request, url, env, signedRuntime, ctx);
      if (runtimeRoot) return attachVid(runtimeRoot);
    }

    const runtime = await handleRuntimeApi(request, url, env, ctx);
    if (runtime) return attachVid(runtime);

    const authed = await handleAuth(request, url, env, ctx);
    if (authed) return attachVid(authed);

    const fileMatch = url.pathname.match(/^\/file\/([^/]+)\/?$/);
    if (fileMatch && request.method === "GET") {
      const id = decodeURIComponent(fileMatch[1]);
      if (normalizeContentHash(id)) return attachVid(await serveFileByHash(env, id));
      return attachVid(await serveFile(env, id));
    }

    if ((url.pathname === "/install.sh" || url.pathname === "/install.sh/") && request.method === "GET") {
      return new Response(installScript(), {
        status: 200,
        headers: {
          "Content-Type": "text/x-shellscript; charset=utf-8",
          "Cache-Control": "private, no-store",
          ...corsHeaders(),
        },
      });
    }

    if ((url.pathname === "/search" || url.pathname === "/search/") && isReadMethod(request.method)) {
      const htmlHeaders = { "Cache-Control": HTML_CACHE_CONTROL, "X-Robots-Tag": "index, follow, max-image-preview:large", ...corsHeaders() };
      if (request.method === "HEAD") {
        return crawlResponse(request, "", "text/html; charset=utf-8", htmlHeaders);
      }
      const html = await indexHtml(env, request, signedEarly);
      return attachVid(crawlResponse(request, streamLcpHtml(html), "text/html; charset=utf-8", htmlHeaders));
    }

    if (url.pathname === "/" && isReadMethod(request.method)) {
      const hub = libraryHubRedirect(url);
      if (hub) {
        return new Response(null, {
          status: 302,
          headers: { Location: hub, "Cache-Control": "no-store", ...corsHeaders() },
        });
      }
      const htmlHeaders = { "Cache-Control": HTML_CACHE_CONTROL, "X-Robots-Tag": "index, follow, max-image-preview:large", ...corsHeaders() };
      if (request.method === "HEAD") {
        return crawlResponse(request, "", "text/html; charset=utf-8", htmlHeaders);
      }
      if (!isSeoBot(request)) {
        const bump = incrementViews(env, request).catch(() => null);
        if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(bump);
        else await bump;
      }
      return attachVid(crawlResponse(request, filmTheaterHtml(), "text/html; charset=utf-8", htmlHeaders));
    }

    const signed = await getSession(env, request);
    let hostedStats = null;
    const hostedPath = url.pathname.replace(/\/+$/, "") || "/";
    if (hostedPath === "/health") {
      hostedStats = await collectStats(env);
    }
    const hosted = await handleHosted(request, url, env, ctx, signed, hostedStats);
    if (hosted) return attachVid(hosted);

    if (url.pathname === "/count" && request.method === "GET") {
      const stats = await collectStats(env, request);
      const __enriched = await withHumanBotStats(env, request, {
        project: PROJECT,
        views: stats.views || 0,
        downloads: stats.downloads || 0,
        total: stats.total || 0,
        kv_list_hot_path: false,
      });
      try { await rememberCatalog({ ok: true, source: "count", stats: __enriched, author: "Aziel Eliab" }); } catch { /* cache */ }
      const res = json(__enriched);
      res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
      return attachVid(res);
    }

    if (url.pathname === "/stats" && request.method === "GET") {
      const stats = await collectStats(env, request);
      const __enriched = await withHumanBotStats(env, request, stats);
      const res = json(__enriched);
      res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
      return attachVid(res);
    }

    if (url.pathname === "/event" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "JSON body required" }, 400);
      }
      const dims = parseDims(body || {});
      const count = await increment(env, dims, request);
      return json({
        ok: true,
        key: kvKey(dims),
        count,
        owner: dims.owner,
        repo: dims.repo,
        branch: dims.branch,
        fork: dims.fork,
        asset: dims.asset || null,
      });
    }

    if (url.pathname === "/go" && (request.method === "GET" || request.method === "HEAD")) {
      const dims = parseDims(url.searchParams);
      const asset = dims.asset || DEFAULT_ASSET || SOFTWARE_DEFAULT_ASSET;
      dims.asset = asset;
      return serveAsset(request, env, asset, {
        head: request.method === "HEAD",
        onCounted: request.method === "GET" ? () => increment(env, dims, request) : null,
      });
    }

    if ((url.pathname === "/download" || url.pathname.startsWith("/download/")) && (request.method === "GET" || request.method === "HEAD")) {
      const productSlug = (url.searchParams.get("product") || url.searchParams.get("pack") || "").trim().toLowerCase();
      if (productSlug && productBySlug(productSlug)) {
        const dims = parseDims(url.searchParams);
        dims.asset = "product:" + productSlug;
        if (request.method === "GET" && env && env.DOWNLOADS) await increment(env, dims, request);
        return attachVid(await serveDesignPack(env, productSlug, { attachment: true, head: request.method === "HEAD" }));
      }
      const recordId = (url.searchParams.get("record") || url.searchParams.get("record_id") || "").trim();
      if (recordId) {
        const dims = parseDims(url.searchParams);
        dims.asset = "record:" + recordId;
        if (request.method === "GET") {
          await increment(env, dims, request);
          await bumpPaperCount(env, recordId, "downloads", request).catch(() => null);
        }
        return serveFile(env, recordId);
      }
      const rawHash = (url.searchParams.get("hash") || url.searchParams.get("sha256") || url.searchParams.get("content_sha256") || "").trim();
      const pathTail = url.pathname.startsWith("/download/") ? decodeURIComponent(url.pathname.slice("/download/".length)) : "";
      const hash = normalizeContentHash(rawHash) || normalizeContentHash(pathTail);
      if (hash) {
        const dims = parseDims(url.searchParams);
        dims.asset = "hash:" + hash;
        if (request.method === "GET") {
          await increment(env, dims, request);
          const hashedId = await recordIdForContentHash(env, hash);
          if (hashedId) await bumpPaperCount(env, hashedId, "downloads", request).catch(() => null);
        }
        return serveFileByHash(env, hash);
      }
      const dims = parseDims(url.searchParams);
      if (!dims.asset && pathTail) {
        dims.asset = pathTail;
      }
      const asset = dims.asset || DEFAULT_ASSET || SOFTWARE_DEFAULT_ASSET;
      dims.asset = asset;
      return serveAsset(request, env, asset, {
        head: request.method === "HEAD",
        onCounted: request.method === "GET" ? () => increment(env, dims, request) : null,
      });
    }

    // gitbaby-seo-routes
    const crawlPath = url.pathname.replace(/\/+$/, "") || "/";
    const survival = isSurvivalSeoPath(crawlPath) || crawlPath === "/bridge.json"
      ? await fetchLiveSurvival(env)
      : null;
    const seoCache = isSurvivalSeoPath(crawlPath) ? SURVIVAL_SEO_CACHE_CONTROL : SEO_CACHE_CONTROL;
    if (isReadMethod(request.method) && isIndexNowKeyPath(crawlPath)) {
      return crawlResponse(request, indexNowKeyBody(), MIME.plain, { "Cache-Control": SEO_CACHE_CONTROL, ...corsHeaders() });
    }
    if (isReadMethod(request.method) && crawlPath === "/robots.txt") {
      return crawlResponse(request, robotsTxt(), MIME.plain, { "Cache-Control": SEO_CACHE_CONTROL, ...corsHeaders() });
    }
    if (isReadMethod(request.method) && crawlPath === "/sitemap.xml") {
      const xml = await sitemapXml(env);
      return crawlResponse(request, xml, MIME.xml, { "Cache-Control": SEO_CACHE_CONTROL, "Last-Modified": new Date().toUTCString(), ...corsHeaders() });
    }
    if (isReadMethod(request.method) && crawlPath === "/sitemap-index.xml") {
      return crawlResponse(request, sitemapIndexXml(), MIME.xml, { "Cache-Control": SEO_CACHE_CONTROL, "Last-Modified": new Date().toUTCString(), ...corsHeaders() });
    }
    if (isReadMethod(request.method) && crawlPath === "/sitemap-records.xml") {
      const xml = await sitemapRecordsXml(env);
      return crawlResponse(request, xml, MIME.xml, { "Cache-Control": SEO_CACHE_CONTROL, "Last-Modified": new Date().toUTCString(), ...corsHeaders() });
    }
    if (isReadMethod(request.method) && (crawlPath === "/mcp.json" || crawlPath === "/.well-known/mcp.json")) {
      return crawlResponse(request, JSON.stringify(mcpDiscovery(), null, 2), MIME.json, { "Cache-Control": SEO_CACHE_CONTROL, ...corsHeaders() });
    }
    if (isReadMethod(request.method) && crawlPath === "/cite.json") {
      const outlet = await readOutletState(env);
      return crawlResponse(request, JSON.stringify(citeDoc(survival, outlet && outlet.cite), null, 2), MIME.json, { "Cache-Control": seoCache, ...corsHeaders() });
    }
    if (isReadMethod(request.method) && crawlPath === "/bridge.json") {
      return crawlResponse(request, JSON.stringify(bridgeDoc(), null, 2), MIME.json, { "Cache-Control": SEO_CACHE_CONTROL, ...corsHeaders() });
    }
    if (isReadMethod(request.method) && crawlPath === "/lockset.json") {
      return crawlResponse(request, locksetFile(), MIME.json, { "Cache-Control": SEO_CACHE_CONTROL, ...corsHeaders() });
    }
    if (isReadMethod(request.method) && isShelvesPath(crawlPath)) {
      return crawlResponse(request, JSON.stringify(shelvesDoc(), null, 2), MIME.json, { "Cache-Control": SEO_CACHE_CONTROL, ...corsHeaders() });
    }
    if (isReadMethod(request.method)) {
      const identity = identityRouteBody(crawlPath, survival);
      if (identity) {
        return crawlResponse(request, identity.body, identity.type, { "Cache-Control": seoCache, ...corsHeaders() });
      }
    }
    if (isReadMethod(request.method) && crawlPath === "/llms.txt") {
      return crawlResponse(request, llmsDoc(LIMITATION, survival), MIME.plain, { "Cache-Control": seoCache, ...corsHeaders() });
    }
    if (isReadMethod(request.method) && crawlPath === "/ai.txt") {
      return crawlResponse(request, aiTxt(LIMITATION, survival), MIME.plain, { "Cache-Control": seoCache, ...corsHeaders() });
    }
    if (isReadMethod(request.method) && crawlPath === "/humans.txt") {
      return crawlResponse(request, humansTxt(), MIME.plain, { "Cache-Control": SEO_CACHE_CONTROL, ...corsHeaders() });
    }
    if (isReadMethod(request.method)) {
      const help = helpRouteBody(crawlPath);
      if (help) {
        return crawlResponse(request, help, MIME.plain, { "Cache-Control": SEO_CACHE_CONTROL, ...corsHeaders() });
      }
    }
    // /gitbaby-seo-routes
    if (request.method === "POST") {
      return json({ error: "login required" }, 401);
    }
    return json({ error: "not found" }, 404);
}
