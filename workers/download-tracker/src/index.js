import { handleRuntimeApi, corsHeaders, json, LIMITATION } from "./runtime.js";
import { handleAuth, getSession } from "./auth.js";
import { page, homeBody, stub } from "./ui.js";
import { searchRecords, listFacets, parseBrowseParams, serveFile } from "./library.js";

/**
 * Aziel Digital Library v2.6.2 public MASTER (Cloudflare Worker).
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
const DEFAULT_ASSET = "aziel-digital-library-2.6.2.zip";
const ALLOWED_ASSETS = new Set([DEFAULT_ASSET]);
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
# Aziel Digital Library v2.6.2 counted zip install.
set -euo pipefail
HOST="${HOST}"
ASSET="${DEFAULT_ASSET}"
WORKDIR="\${AZIEL_LIBRARY_HOME:-\$HOME/aziel-digital-library}"
mkdir -p "\$WORKDIR"
cd "\$WORKDIR"
echo "Downloading counted zip from \${HOST}/download (User-Agent Mozilla/5.0)…"
if ! curl -fsSL -A 'Mozilla/5.0' "\${HOST}/download?asset=\${ASSET}" -o "\${ASSET}"; then
  echo "Canonical host failed; trying workers.dev fallback…"
  HOST="${FALLBACK_HOST}"
  curl -fsSL -A 'Mozilla/5.0' "\${HOST}/download?asset=\${ASSET}" -o "\${ASSET}"
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
echo "Installed Aziel Digital Library v2.6.2."
echo "Run:  python3 aziel_launcher.py"
echo "Then open http://127.0.0.1:8765  (local MASTER)"
echo "Aziel Digital Library. Author Aziel Eliab. Not a 26-card index."
`;
}

function contentTypeFor(asset) {
  const a = String(asset || "").toLowerCase();
  if (a.endsWith(".zip")) return "application/zip";
  if (a.endsWith(".pdf")) return "application/pdf";
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
  const assetUrl = new URL("/" + name, request.url);
  const assetRes = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
  if (!assetRes.ok) {
    return json({ error: "asset not hosted", asset: name, status: assetRes.status }, 404);
  }
  const headers = new Headers();
  headers.set("Content-Type", contentTypeFor(name));
  headers.set("Content-Disposition", 'attachment; filename="' + name.replaceAll('"', "") + '"');
  headers.set("Cache-Control", "private, no-store");
  const len = assetRes.headers.get("Content-Length");
  if (len) headers.set("Content-Length", len);
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  if (head) {
    return new Response(null, { status: 200, headers });
  }
  return new Response(assetRes.body, { status: 200, headers });
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
  return page("Corpus Search", homeBody({ ...browse, rows, facets, views: stats.views || 0, downloads: stats.downloads || 0, host: HOST }), { signed });
}

function llmsTxt() {
  return `# Aziel Digital Library v2.6.2

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
`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const runtime = await handleRuntimeApi(request, url, env);
    if (runtime) return runtime;

    const authed = await handleAuth(request, url, env);
    if (authed) return authed;

    const fileMatch = url.pathname.match(/^\/file\/([^/]+)\/?$/);
    if (fileMatch && request.method === "GET") {
      return serveFile(env, decodeURIComponent(fileMatch[1]));
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

    if (url.pathname === "/" && request.method === "GET") {
      await incrementViews(env);
      return new Response(await indexHtml(env, request), {
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() },
      });
    }

    const signed = await getSession(env, request);
    const masterPages = {
      "/tree": ["Corpus Tree", "Evidence-based corpus tree. Unclassified objects stay standalone instead of receiving invented links."],
      "/map": ["Temporal Map", "Temporal–geospatial corpus map. Event pins come from corpus evidence. Historical polygons come from preserved source layers. Drag to pan; use the year slider on the local launcher for full historical state."],
      "/historical": ["Historical Geography", "Source-aware temporal boundary layers. Competing sources overlap instead of being silently merged. Install .azh kits on the local MASTER vault."],
      "/gazetteer": ["World Gazetteer", "Offline place resolution (AZGDB). The local launcher can install lite/full GeoNames profiles. Hosted search uses published corpus records."],
      "/intelligence": ["Intelligence", ".azm model packages and .azk knowledge kits. Install through a signed-in account or the local CLI."],
      "/health": ["Health", LIMITATION],
      "/verify": ["Verify", "Integrity verification of the hosted MASTER. Counted zip SHA is published on the GitHub v2.6.2 release."],
    };
    if (request.method === "GET" && masterPages[url.pathname]) {
      const [title, lead] = masterPages[url.pathname];
      return new Response(page(title, stub(title, lead), { signed }), {
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() },
      });
    }
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
      const dims = parseDims(url.searchParams);
      if (!dims.asset && url.pathname.startsWith("/download/")) {
        dims.asset = decodeURIComponent(url.pathname.slice("/download/".length));
      }
      const asset = dims.asset || DEFAULT_ASSET;
      dims.asset = asset;
      if (request.method === "GET") await increment(env, dims);
      return serveAsset(request, env, asset, { head: request.method === "HEAD" });
    }

    // gitbaby-seo-routes
    if ((url.pathname === "/robots.txt" || url.pathname === "/robots.txt/") && request.method === "GET") {
      const body = "User-agent: *\nAllow: /\nSitemap: " + HOST + "/sitemap.xml\n";
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders() },
      });
    }
    if ((url.pathname === "/sitemap.xml" || url.pathname === "/sitemap.xml/") && request.method === "GET") {
      const locs = [HOST + "/", HOST + "/download", HOST + "/install.sh", HOST + "/v1/skill", HOST + "/openapi.json", HOST + "/llms.txt", HOST + "/cite.json", GITHUB_REPO];
      const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + locs.map((u) => "  <url><loc>" + u + "</loc></url>").join("\n")
        + "\n</urlset>\n";
      return new Response(xml, {
        status: 200,
        headers: { "Content-Type": "application/xml; charset=utf-8", ...corsHeaders() },
      });
    }
    if ((url.pathname === "/cite.json" || url.pathname === "/cite.json/") && request.method === "GET") {
      return json({
        author: "Aziel Eliab",
        title: "Aziel Digital Library",
        github: GITHUB_REPO,
        library: HOST + "/",
        download: HOST + "/download",
        license: "Apache-2.0",
        catalog: CATALOG + "/",
        how_to_cite: "Eliab, Aziel. (2026). Aziel Digital Library v2.6.2 [Software]. Apache-2.0. " + HOST + "/",
      });
    }
    if ((url.pathname === "/llms.txt" || url.pathname === "/llms.txt/") && request.method === "GET") {
      return new Response(llmsTxt(), {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders() },
      });
    }
    // /gitbaby-seo-routes
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, product: PROJECT, name: "Aziel Digital Library", version: "2.6.2", mode: "master" });
    }
    if ((url.pathname === "/map" || url.pathname === "/gazetteer" || url.pathname === "/verify") && request.method === "GET") {
      return json({ ok: true, path: url.pathname, public: true, note: "Published corpus view. Anonymous GET." });
    }
    if (request.method === "POST") {
      return json({ error: "login required" }, 401);
    }
    return json({ error: "not found" }, 404);
  },
};
