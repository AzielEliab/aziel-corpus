import { handleRuntimeApi, corsHeaders, json, LIMITATION } from "./runtime.js";
import { handleRuntimeRoot } from "./runtime-root.js";
import { handleAuth, getSession } from "./auth.js";
import { page, homeBody } from "./ui.js";
import { handleHosted } from "./hosted.js";
import { robotsTxt, sitemapXml, sitemapIndexXml, citeDoc, llmsDoc, aiTxt, humansTxt, mcpDiscovery, isReadMethod, crawlResponse, MIME } from "./crawl.js";
import { searchRecords, listFacets, parseBrowseParams, serveFile, serveFileByHash, normalizeContentHash } from "./library.js";
import { reviewAndStore, continueFullBackfill } from "./review-store.js";
import { continueVerifyGeo } from "./geo.js";
import { verifyBytes, sha256hex } from "./structure.js";

/**
 * Aziel Digital Library v2.7.0 public MASTER (Cloudflare Worker).
 *
 * GET  /          increments page-view counter, MASTER HTML (search, login, counted zip)
 * GET  /download  increments downloads, serves zip via env.ASSETS.fetch (HTTP 200, no 302)
 * GET  /install.sh  one-click install script
 *
 * KV binding DOWNLOADS. Isolated: Worker aziel-corpus-download-tracker, KV AZIEL_DIGITAL_LIBRARY_DOWNLOADS.
 * /v1 does not increment.
 * Author: Aziel Eliab.
 */

const PROJECT = "aziel-corpus";
const VERSION = "2.7.0";
const DEFAULT_ASSET = "aziel-digital-library-2.7.0.zip";
const LEGACY_ASSET = "aziel-digital-library-2.6.2.zip";
const ALLOWED_ASSETS = new Set([DEFAULT_ASSET, LEGACY_ASSET]);
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
  return tot;
}

async function incrementViews(env) {
  const n = parseInt((await env.DOWNLOADS.get(viewsKey())) || "0", 10) + 1;
  await env.DOWNLOADS.put(viewsKey(), String(n));
  return n;
}

async function listAllKeys(env) {
  const keys = [];
  let cursor;
  do {
    const page = await env.DOWNLOADS.list(cursor ? { cursor } : {});
    keys.push(...page.keys);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return keys;
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

async function collectStats(env) {
  const keys = await listAllKeys(env);
  let summed = 0;
  const by_repo = {};
  const by_branch = {};
  const by_fork = { "0": 0, "1": 0 };
  const breakdown = [];

  for (const k of keys) {
    const name = k.name;
    if (name === viewsKey() || name === totalKey() || name === githubCacheKey()) continue;
    const n = parseInt((await env.DOWNLOADS.get(name)) || "0", 10);
    if (!Number.isFinite(n) || n <= 0) continue;
    const parts = name.split("|");
    if (parts.length < 5) continue;
    const [project, owner, repo, branch, fork] = parts;
    summed += n;
    const repoId = `${owner}/${repo}`;
    by_repo[repoId] = (by_repo[repoId] || 0) + n;
    by_branch[branch] = (by_branch[branch] || 0) + n;
    const forkFlag = fork === "1" ? "1" : "0";
    by_fork[forkFlag] = (by_fork[forkFlag] || 0) + n;
    breakdown.push({ project, owner, repo, branch, fork: forkFlag, count: n });
  }

  const downloadsDirect = parseInt((await env.DOWNLOADS.get(totalKey())) || "0", 10);
  const downloads = Number.isFinite(downloadsDirect) && downloadsDirect > 0 ? downloadsDirect : summed;
  const views = parseInt((await env.DOWNLOADS.get(viewsKey())) || "0", 10) || 0;
  const github = await githubStats(env);
  return {
    project: PROJECT,
    views,
    downloads,
    total: downloads,
    by_repo,
    by_branch,
    by_fork,
    breakdown,
    github: {
      stars: github.stars || 0,
      forks: github.forks || 0,
      watchers: github.watchers || 0,
      release_download_count: github.release_download_count || 0,
    },
    note: "Forks identified by GitHub owner/repo. Key layout: project|owner|repo|branch|fork. Views are separate from downloads. /v1 does not increment.",
  };
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

function contentTypeFor(asset) {
  const a = String(asset || "").toLowerCase();
  if (a.endsWith(".zip")) return "application/zip";
  if (a.endsWith(".pdf")) return "application/pdf";
  if (a.endsWith(".gif")) return "image/gif";
  if (a.endsWith(".png")) return "image/png";
  if (a.endsWith(".tar.gz") || a.endsWith(".tgz") || a.endsWith(".gz")) return "application/gzip";
  return "application/octet-stream";
}

function safeAsset(raw) {
  const name = String(raw || "").split("/").pop().split("\\").pop();
  if (ALLOWED_ASSETS.has(name)) return name;
  return null;
}

async function serveAsset(request, env, asset, { head = false } = {}) {
  const name = safeAsset(asset);
  if (!name) {
    return json({ error: "unknown asset", asset, allowed: [...ALLOWED_ASSETS] }, 404);
  }
  if (!env.ASSETS) {
    return json({ error: "assets binding missing" }, 500);
  }
  let served = name;
  let assetUrl = new URL("/" + served, request.url);
  let assetRes = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
  if (!assetRes.ok && served === DEFAULT_ASSET) {
    served = LEGACY_ASSET;
    assetUrl = new URL("/" + served, request.url);
    assetRes = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
  }
  if (!assetRes.ok) {
    return json({ error: "asset not hosted", asset: name, status: assetRes.status }, 404);
  }
  const bytes = await assetRes.arrayBuffer();
  const structure = verifyBytes(bytes, { filename: served, contentType: contentTypeFor(served) });
  const digest = structure.sha256 || sha256hex(new Uint8Array(bytes));
  if (env.DB && !head) {
    try {
      await reviewAndStore(env, {
        recordId: "ASSET-" + served.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80),
        library: "package",
        title: served,
        body: "Aziel Digital Library counted zip. Author Aziel Eliab.",
        filename: served,
        contentType: contentTypeFor(served),
        sha256: digest,
        author: "Aziel Eliab",
        bytes,
        createdBy: "download",
        event: "download_verify",
        liveClce: false,
      });
    } catch { /* ledger optional on zip */ }
  }
  const headers = new Headers();
  headers.set("Content-Type", contentTypeFor(served));
  headers.set("Content-Disposition", 'attachment; filename="' + served.replaceAll('"', "") + '"');
  headers.set("Cache-Control", "private, no-store");
  headers.set("Content-Length", String(bytes.byteLength));
  headers.set("X-Aziel-SHA256", digest);
  headers.set("X-Aziel-Structure", structure.ok ? "VERIFIED" : "FAILED");
  headers.set("X-Aziel-Files", String((structure.files || []).length));
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  if (head) {
    return new Response(null, { status: 200, headers });
  }
  return new Response(bytes, { status: 200, headers });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function workCardsHtml() { return ""; }

async function indexHtml(env, request) {
  const url = new URL(request.url);
  const browse = parseBrowseParams(url);
  const stats = await collectStats(env);
  const signed = await getSession(env, request);
  const rows = await searchRecords(env, { q: browse.q, library: browse.lib, sort: browse.sort, author: browse.author, domain: browse.domain, subject: browse.subject, keyword: browse.keyword, limit: 300 });
  const facets = await listFacets(env, { library: browse.lib });
  return page("Corpus Search", homeBody({ ...browse, rows, facets, views: stats.views || 0, downloads: stats.downloads || 0, host: HOST }), { signed, path: "/", kind: "search" });
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
- GET ${HOST}/v1/search?q=
- GET ${HOST}/v1/skill
- GET ${HOST}/v1/example
- GET ${HOST}/v1/verify-geo?status=1
`;
}

export default {
  async scheduled(event, env, ctx) {
    const walk = async () => {
      await continueFullBackfill(env, { ms: 12000, all: false }).catch(() => null);
      await continueVerifyGeo(env, { ms: 12000, force: false }).catch(() => null);
    };
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(walk());
    else await walk();
  },
  async fetch(request, env, ctx) {
    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil((async () => {
        await continueFullBackfill(env, { ms: 8000, all: false }).catch(() => null);
        await continueVerifyGeo(env, { ms: 8000, force: false }).catch(() => null);
      })());
    }
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method === "PUT" || request.method === "PATCH" || request.method === "DELETE") {
      return json({ error: "records are append-only; PUT/PATCH/DELETE are rejected" }, 405);
    }


    const hostedPathEarly = url.pathname.replace(/\/+$/, "") || "/";
    if (hostedPathEarly === "/runtime" || hostedPathEarly === "/v1/runtime.json" || url.pathname.startsWith("/runtime/")) {
      const signedRuntime = hostedPathEarly === "/runtime" ? await getSession(env, request) : null;
      const runtimeRoot = await handleRuntimeRoot(request, url, env, signedRuntime, ctx);
      if (runtimeRoot) return runtimeRoot;
    }

    const runtime = await handleRuntimeApi(request, url, env);
    if (runtime) return runtime;

    const authed = await handleAuth(request, url, env, ctx);
    if (authed) return authed;

    const fileMatch = url.pathname.match(/^\/file\/([^/]+)\/?$/);
    if (fileMatch && request.method === "GET") {
      const id = decodeURIComponent(fileMatch[1]);
      if (normalizeContentHash(id)) return serveFileByHash(env, id);
      return serveFile(env, id);
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
      if (request.method === "HEAD") {
        return crawlResponse(request, "", "text/html; charset=utf-8", corsHeaders());
      }
      await incrementViews(env);
      return crawlResponse(request, await indexHtml(env, request), "text/html; charset=utf-8", corsHeaders());
    }

    const signed = await getSession(env, request);
    let hostedStats = null;
    const hostedPath = url.pathname.replace(/\/+$/, "") || "/";
    if (hostedPath === "/health" || hostedPath === "/software") hostedStats = await collectStats(env);
    const hosted = await handleHosted(request, url, env, ctx, signed, hostedStats);
    if (hosted) return hosted;

    if (url.pathname === "/search" && request.method === "GET") {
      const q = url.searchParams.get("q") || "";
      return Response.redirect(new URL("/?q=" + encodeURIComponent(q), url).toString(), 302);
    }

    if (url.pathname === "/count" && request.method === "GET") {
      const stats = await collectStats(env);
      return json({ project: PROJECT, views: stats.views || 0, downloads: stats.downloads || 0, total: stats.total || 0 });
    }

    if (url.pathname === "/stats" && request.method === "GET") {
      return json(await collectStats(env));
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
      const asset = dims.asset || DEFAULT_ASSET;
      dims.asset = asset;
      if (request.method === "GET") await increment(env, dims);
      return serveAsset(request, env, asset, { head: request.method === "HEAD" });
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
      const asset = dims.asset || DEFAULT_ASSET;
      dims.asset = asset;
      if (request.method === "GET") await increment(env, dims);
      return serveAsset(request, env, asset, { head: request.method === "HEAD" });
    }

    // gitbaby-seo-routes
    const crawlPath = url.pathname.replace(/\/+$/, "") || "/";
    if (isReadMethod(request.method) && crawlPath === "/robots.txt") {
      return crawlResponse(request, robotsTxt(), MIME.plain, corsHeaders());
    }
    if (isReadMethod(request.method) && crawlPath === "/sitemap.xml") {
      const xml = await sitemapXml(env);
      return crawlResponse(request, xml, MIME.xml, { "Last-Modified": new Date().toUTCString(), ...corsHeaders() });
    }
    if (isReadMethod(request.method) && crawlPath === "/sitemap-index.xml") {
      return crawlResponse(request, sitemapIndexXml(), MIME.xml, { "Last-Modified": new Date().toUTCString(), ...corsHeaders() });
    }
    if (isReadMethod(request.method) && (crawlPath === "/mcp.json" || crawlPath === "/.well-known/mcp.json")) {
      return crawlResponse(request, JSON.stringify(mcpDiscovery(), null, 2), MIME.json, corsHeaders());
    }
    if (isReadMethod(request.method) && crawlPath === "/cite.json") {
      return crawlResponse(request, JSON.stringify(citeDoc(), null, 2), MIME.json, corsHeaders());
    }
    if (isReadMethod(request.method) && crawlPath === "/llms.txt") {
      return crawlResponse(request, llmsDoc(LIMITATION), MIME.plain, corsHeaders());
    }
    if (isReadMethod(request.method) && crawlPath === "/ai.txt") {
      return crawlResponse(request, aiTxt(LIMITATION), MIME.plain, corsHeaders());
    }
    if (isReadMethod(request.method) && crawlPath === "/humans.txt") {
      return crawlResponse(request, humansTxt(), MIME.plain, corsHeaders());
    }
    // /gitbaby-seo-routes
    if (request.method === "POST") {
      return json({ error: "login required" }, 401);
    }
    return json({ error: "not found" }, 404);
  },
};
