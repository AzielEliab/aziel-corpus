import { handleRuntimeApi, corsHeaders, json, LIMITATION } from "./runtime.js";
import { handleRuntimeRoot } from "./runtime-root.js";
import { handleAuth, getSession } from "./auth.js";
import { page, homeBody, streamLcpHtml } from "./ui.js";
import { handleHosted } from "./hosted.js";
import { robotsTxt, sitemapXml, sitemapIndexXml, citeDoc, llmsDoc, aiTxt, humansTxt, mcpDiscovery, isReadMethod, crawlResponse, MIME } from "./crawl.js";
import { identityRouteBody } from "./identity.js";
import { searchRecords, listFacets, parseBrowseParams, serveFile, serveFileByHash, normalizeContentHash } from "./library.js";
import { continueFullBackfill } from "./review-store.js";
import { continueVerifyGeo } from "./geo.js";
import {
  collectStats,
  notePackedIncrement,
  patchPackedStats,
  refreshPackedIndex,
  tryTunnelFirst,
  HTML_CACHE_CONTROL,
  HTML_EDGE_CACHE_CONTROL,
  SEO_CACHE_CONTROL,
  cacheMatchText,
  cachePutText,
  htmlCacheUrl,
} from "./library-index.js";
import { enforceRateLimit, rememberCatalog, isSeoBot } from "./rate-limit.js";
import { handleDonate, DONATE_PATH } from "./donate.js";
import { handleDonateQr, isDonateQrPath } from "./donate-qr.js";
import { serveSoftwareAsset, DEFAULT_ASSET as SOFTWARE_DEFAULT_ASSET } from "./software-download.js";

/** Operator walk APIs must not share the isolate with background backfill/geo or a tunnel hop. */
export function shouldBackgroundWalk(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  return path !== "/v1/verify-backfill" && path !== "/v1/verify-geo";
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

async function increment(env, dims) {
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
  return tot;
}

async function incrementViews(env) {
  if (!env || !env.DOWNLOADS || typeof env.DOWNLOADS.get !== "function") return 0;
  const n = parseInt((await env.DOWNLOADS.get(viewsKey())) || "0", 10) + 1;
  await env.DOWNLOADS.put(viewsKey(), String(n));
  // Packed views refresh on cron. Do not rewrite library:index:v1 on every page view.
  return n;
}

async function githubStats(env) {
  const cached = await env.DOWNLOADS.get(githubCacheKey());
  if (cached) {
    try {
      const obj = JSON.parse(cached);
      if (obj && obj.fetched_at && Date.now() - obj.fetched_at < 5 * 60 * 1000) {
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
  try {
    const repoRes = await fetch("https://api.github.com/repos/AzielEliab/aziel-corpus", { headers });
    if (repoRes.ok) {
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
    }
  } catch {
    /* public API; empty is fine */
  }
  const out = { stars, forks, watchers, release_download_count, fetched_at: Date.now() };
  try {
    await env.DOWNLOADS.put(githubCacheKey(), JSON.stringify(out));
  } catch {
    /* ignore */
  }
  return out;
}

async function refreshGithubIntoIndex(env) {
  try {
    const github = await githubStats(env);
    await patchPackedStats(env, { github });
  } catch {
    /* cron optional */
  }
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
  const statsP = collectStats(env);
  const rowsP = searchRecords(env, { q: browse.q, library: browse.lib, sort: browse.sort, author: browse.author, domain: browse.domain, subject: browse.subject, keyword: browse.keyword, limit: 300 });
  const facetsP = listFacets(env, { library: browse.lib });
  const signedP = signed !== undefined ? Promise.resolve(signed) : getSession(env, request);
  const [stats, rows, facets, session] = await Promise.all([statsP, rowsP, facetsP, signedP]);
  return page("Corpus Search", homeBody({ ...browse, rows, facets, views: stats.views || 0, downloads: stats.downloads || 0, host: HOST }), { signed: session, path: "/", kind: "search", views: stats.views || 0, downloads: stats.downloads || 0 });
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

export default {
  async scheduled(event, env, ctx) {
    const walk = async () => {
      await refreshPackedIndex(env).catch(() => null);
      await refreshGithubIntoIndex(env).catch(() => null);
      await continueFullBackfill(env, { ms: 12000, all: false, background: true }).catch(() => null);
      await continueVerifyGeo(env, { ms: 12000, force: false }).catch(() => null);
    };
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(walk());
    else await walk();
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const earlyPath = url.pathname.replace(/\/+$/, "") || "/";
    if (ctx && typeof ctx.waitUntil === "function" && shouldBackgroundWalk(earlyPath)) {
      ctx.waitUntil((async () => {
        await continueFullBackfill(env, { ms: 8000, all: false, background: true }).catch(() => null);
        await continueVerifyGeo(env, { ms: 8000, force: false }).catch(() => null);
      })());
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (isDonateQrPath(earlyPath) && isReadMethod(request.method)) {
      return handleDonateQr(request, env);
    }
    if (earlyPath === DONATE_PATH && isReadMethod(request.method)) {
      return handleDonate(request);
    }

    let signedEarly = null;
    try { signedEarly = await getSession(env, request); } catch { signedEarly = null; }
    const limited = await enforceRateLimit(request, env, { path: earlyPath, signed: signedEarly });
    if (limited && limited.response) return limited.response;
    const attachVid = (res) => withRateCookie(res, limited);

    if (isReadMethod(request.method) && shouldBackgroundWalk(earlyPath)) {
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

    if (url.pathname === "/" && isReadMethod(request.method)) {
      const htmlHeaders = { "Cache-Control": HTML_CACHE_CONTROL, "X-Robots-Tag": "index, follow, max-image-preview:large", ...corsHeaders() };
      if (request.method === "HEAD") {
        return crawlResponse(request, "", "text/html; charset=utf-8", htmlHeaders);
      }
      const cacheUrl = htmlCacheUrl(request);
      if (!signedEarly) {
        const cached = await cacheMatchText(cacheUrl);
        if (cached) {
          return attachVid(crawlResponse(request, streamLcpHtml(cached), "text/html; charset=utf-8", htmlHeaders));
        }
      }
      if (!isSeoBot(request)) {
        const bump = incrementViews(env).catch(() => null);
        if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(bump);
        else await bump;
      }
      const html = await indexHtml(env, request, signedEarly);
      if (!signedEarly) await cachePutText(cacheUrl, html, undefined, { cacheControl: HTML_EDGE_CACHE_CONTROL });
      return attachVid(crawlResponse(request, streamLcpHtml(html), "text/html; charset=utf-8", htmlHeaders));
    }

    const signed = await getSession(env, request);
    let hostedStats = null;
    const hostedPath = url.pathname.replace(/\/+$/, "") || "/";
    if (hostedPath === "/health" || hostedPath === "/software") {
      hostedStats = await collectStats(env);
    }
    const hosted = await handleHosted(request, url, env, ctx, signed, hostedStats);
    if (hosted) return attachVid(hosted);

    if (url.pathname === "/search" && request.method === "GET") {
      const q = url.searchParams.get("q") || "";
      return Response.redirect(new URL("/?q=" + encodeURIComponent(q), url).toString(), 302);
    }

    if (url.pathname === "/count" && request.method === "GET") {
      const stats = await collectStats(env);
      try { await rememberCatalog({ ok: true, source: "count", stats, author: "Aziel Eliab" }); } catch { /* cache */ }
      const res = json({ project: PROJECT, views: stats.views || 0, downloads: stats.downloads || 0, total: stats.total || 0, kv_list_hot_path: false });
      res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
      return attachVid(res);
    }

    if (url.pathname === "/stats" && request.method === "GET") {
      const stats = await collectStats(env);
      const res = json(stats);
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
      const count = await increment(env, dims);
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
        onCounted: request.method === "GET" ? () => increment(env, dims) : null,
      });
    }

    if ((url.pathname === "/download" || url.pathname.startsWith("/download/")) && (request.method === "GET" || request.method === "HEAD")) {
      const recordId = (url.searchParams.get("record") || url.searchParams.get("record_id") || "").trim();
      if (recordId) {
        const dims = parseDims(url.searchParams);
        dims.asset = "record:" + recordId;
        if (request.method === "GET") await increment(env, dims);
        return serveFile(env, recordId);
      }
      const rawHash = (url.searchParams.get("hash") || url.searchParams.get("sha256") || url.searchParams.get("content_sha256") || "").trim();
      const pathTail = url.pathname.startsWith("/download/") ? decodeURIComponent(url.pathname.slice("/download/".length)) : "";
      const hash = normalizeContentHash(rawHash) || normalizeContentHash(pathTail);
      if (hash) {
        const dims = parseDims(url.searchParams);
        dims.asset = "hash:" + hash;
        if (request.method === "GET") await increment(env, dims);
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
        onCounted: request.method === "GET" ? () => increment(env, dims) : null,
      });
    }

    // gitbaby-seo-routes
    const crawlPath = url.pathname.replace(/\/+$/, "") || "/";
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
    if (isReadMethod(request.method) && (crawlPath === "/mcp.json" || crawlPath === "/.well-known/mcp.json")) {
      return crawlResponse(request, JSON.stringify(mcpDiscovery(), null, 2), MIME.json, { "Cache-Control": SEO_CACHE_CONTROL, ...corsHeaders() });
    }
    if (isReadMethod(request.method) && crawlPath === "/cite.json") {
      return crawlResponse(request, JSON.stringify(citeDoc(), null, 2), MIME.json, { "Cache-Control": SEO_CACHE_CONTROL, ...corsHeaders() });
    }
    if (isReadMethod(request.method)) {
      const identity = identityRouteBody(crawlPath);
      if (identity) {
        return crawlResponse(request, identity.body, identity.type, { "Cache-Control": SEO_CACHE_CONTROL, ...corsHeaders() });
      }
    }
    if (isReadMethod(request.method) && crawlPath === "/llms.txt") {
      return crawlResponse(request, llmsDoc(LIMITATION), MIME.plain, { "Cache-Control": SEO_CACHE_CONTROL, ...corsHeaders() });
    }
    if (isReadMethod(request.method) && crawlPath === "/ai.txt") {
      return crawlResponse(request, aiTxt(LIMITATION), MIME.plain, { "Cache-Control": SEO_CACHE_CONTROL, ...corsHeaders() });
    }
    if (isReadMethod(request.method) && crawlPath === "/humans.txt") {
      return crawlResponse(request, humansTxt(), MIME.plain, { "Cache-Control": SEO_CACHE_CONTROL, ...corsHeaders() });
    }
    // /gitbaby-seo-routes
    if (request.method === "POST") {
      return json({ error: "login required" }, 401);
    }
    return json({ error: "not found" }, 404);
  },
};
