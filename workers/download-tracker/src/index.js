import { handleRuntimeApi, corsHeaders, json, LIMITATION, listWorks, searchWorks } from "./runtime.js";

/**
 * Aziel Corpus Library download tracker (Cloudflare Worker).
 *
 * GET  /          increments page-view counter, library HTML (search + cards)
 * GET  /download  increments downloads, serves PDF or tarball via env.ASSETS.fetch (no 302)
 * GET  /install.sh  one-click install script
 *
 * KV binding DOWNLOADS. Isolated: Worker aziel-corpus-download-tracker, KV AZIELCORPUS_DOWNLOADS.
 * /v1 does not increment.
 * Author: Aziel Eliab.
 */

const PROJECT = "aziel-corpus";
const DEFAULT_ASSET = "aziel-corpus-0.1.0.tar.gz";
const PDF_ASSET = "AZIEL_Corpus_Library_software.pdf";
const ALLOWED_ASSETS = new Set([DEFAULT_ASSET, PDF_ASSET]);
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
# Aziel Corpus Library one-click install. Counted download via this Worker.
set -euo pipefail
HOST="${HOST}"
ASSET="${DEFAULT_ASSET}"
WORKDIR="\${AZIEL_CORPUS_HOME:-\$HOME/aziel-corpus}"
mkdir -p "\$WORKDIR"
cd "\$WORKDIR"
echo "Downloading counted tarball from \${HOST}/download (User-Agent Mozilla/5.0)…"
if ! curl -fsSL -A 'Mozilla/5.0' "\${HOST}/download?asset=\${ASSET}" -o "\${ASSET}"; then
  echo "Canonical host failed; trying workers.dev fallback…"
  HOST="${FALLBACK_HOST}"
  curl -fsSL -A 'Mozilla/5.0' "\${HOST}/download?asset=\${ASSET}" -o "\${ASSET}"
fi
tar -xzf "\${ASSET}"
DIR="\$(find . -maxdepth 1 -type d -name 'aziel_corpus-*' -o -name 'aziel-corpus-*' | head -n 1)"
if [ -n "\${DIR}" ]; then
  cd "\${DIR}"
fi
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -U pip
python -m pip install -e .
echo
echo "Installed Aziel Corpus Library."
echo "Run:  aziel-corpus ui"
echo "Then open http://127.0.0.1:8890  (loopback only)"
echo "Public library of Aziel Eliab software. Not Zenodo. Not a new Lock engine."
`;
}

function contentTypeFor(asset) {
  const a = String(asset || "").toLowerCase();
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

function workCardsHtml() {
  return listWorks()
    .map((w) => {
      const href = w.github || "#";
      const dl = w.download || "";
      const kind = w.kind || "work";
      return `<article class="work" data-hay="${escapeHtml(
        [w.slug, w.name, w.one_line, w.banner, w.kind, w.github].filter(Boolean).join(" ").toLowerCase(),
      )}">
  <h3><a href="${escapeHtml(href)}">${escapeHtml(w.name || w.slug)}</a> <span class="slug">${escapeHtml(w.slug || "")}</span></h3>
  <p class="oneline">${escapeHtml(w.one_line || "")}</p>
  <p class="kind">${escapeHtml(kind)}${w.pages ? " · " + w.pages + " pages" : ""}</p>
  <p class="meta">${dl ? `<a href="${escapeHtml(dl)}">download</a> · ` : ""}<a href="${escapeHtml(href)}">GitHub</a></p>
</article>`;
    })
    .join("\n");
}

async function indexHtml(env) {
  const stats = await collectStats(env);
  const views = Number(stats.views) || 0;
  const downloads = Number(stats.downloads) || 0;
  const v = views.toLocaleString("en-US");
  const n = downloads.toLocaleString("en-US");
  const gh = stats.github || {};
  const cards = workCardsHtml();
  const workCount = listWorks().length;
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aziel Corpus Library — Aziel Eliab</title>
<meta name="description" content="Public library of Aziel Eliab software. Counted download of the printed 468-page corpus PDF and the library package.">
<meta name="author" content="Aziel Eliab">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${HOST}/">
<meta property="og:title" content="Aziel Corpus Library — Aziel Eliab">
<meta property="og:description" content="Public library of Aziel Eliab software. Counted PDF and package download.">
<meta property="og:url" content="${HOST}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Aziel Eliab">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Aziel Corpus Library",
  "author": { "@type": "Person", "name": "Aziel Eliab", "url": "https://github.com/AzielEliab" },
  "codeRepository": "${GITHUB_REPO}",
  "downloadUrl": "${HOST}/download",
  "license": "https://www.apache.org/licenses/LICENSE-2.0",
  "url": "${HOST}/",
  "description": "Public library index of Aziel Eliab software plus a counted download of the printed 468-page corpus PDF and the library package."
}
</script>
<!-- gitbaby-seo -->
<style>
  :root { color-scheme: dark; }
  body { font: 16px/1.45 system-ui, sans-serif; max-width: 54rem; margin: 2.4rem auto; padding: 0 1.25rem 4rem; background: #0e1014; color: #e8eaef; }
  h1 { font-size: 1.85rem; margin: 0 0 .35rem; }
  h2 { font-size: 1.15rem; margin: 1.4rem 0 .6rem; }
  .motto { color: #9aa3b2; margin: 0 0 1.2rem; }
  .card { border: 1px solid #2a3140; border-radius: 12px; padding: 1.25rem 1.35rem; background: #151922; }
  .nums { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; margin: 0 0 1rem; }
  .count { font-size: 2.2rem; font-variant-numeric: tabular-nums; font-weight: 700; margin: 0; }
  .count span { display: block; font-size: .95rem; font-weight: 500; color: #9aa3b2; }
  .kid { font-size: 1.05rem; margin: 0 0 1rem; }
  .btns { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; margin: 0 0 .85rem; }
  @media (max-width: 640px) { .btns, .grid { grid-template-columns: 1fr; } }
  a.btn, button.btn { display: block; width: 100%; box-sizing: border-box; text-align: center; font: inherit; font-size: 1.05rem; font-weight: 750; padding: .9rem 1rem; border-radius: 10px; border: 0; cursor: pointer; text-decoration: none; }
  a.btn.primary { background: #e8eaef; color: #0e1014; }
  a.btn.pdf { background: #c9a227; color: #14110a; }
  button.btn.install { background: #3d5a80; color: #e8eaef; }
  button.btn.install.copied { background: #7dcf9a; color: #0e1014; }
  .meta { margin-top: .9rem; color: #9aa3b2; font-size: .92rem; }
  .meta a, a { color: #c9d4ff; }
  .iso { margin-top: .85rem; font-size: .85rem; color: #7d8696; }
  .banner { border: 1px solid #5c4a1a; background: #241c0d; color: #f0d78c; padding: .85rem 1rem; border-radius: 8px; margin: 0 0 1.2rem; font-size: .92rem; }
  pre { background: #0e1014; padding: .75rem .9rem; overflow: auto; border-radius: 8px; font-size: .82rem; }
  code { font-size: .88rem; }
  .cite { margin-top: 1.4rem; padding-top: 1rem; border-top: 1px solid #2a3140; }
  input#q { width: 100%; box-sizing: border-box; font: inherit; padding: .7rem .85rem; border-radius: 8px; border: 1px solid #2a3140; background: #0e1014; color: #e8eaef; margin: 0 0 1rem; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
  article.work { border: 1px solid #2a3140; border-radius: 10px; padding: .85rem .95rem; background: #12151c; }
  article.work h3 { margin: 0 0 .3rem; font-size: 1.02rem; }
  article.work .slug { font-weight: 500; color: #9aa3b2; font-size: .85rem; }
  article.work .oneline { margin: 0 0 .35rem; color: #c5ccd8; font-size: .92rem; }
  article.work .kind { margin: 0; font-size: .8rem; color: #7d8696; }
  article.work.hidden { display: none; }
</style>
<body>
  <h1>Aziel Corpus Library</h1>
  <p class="motto">Public library of Aziel Eliab software. Search the shelf. Download the book. Author Aziel Eliab.</p>
  <p class="banner">${LIMITATION}</p>
  <div class="card">
    <div class="nums">
      <p class="count">${v}<span>Views</span></p>
      <p class="count">${n}<span>Downloads</span></p>
    </div>
    <p class="kid"><strong>Two downloads. One install.</strong> The PDF is the printed 468-page corpus. The tarball is the library package. Each click counts. Then type <code>aziel-corpus ui</code>.</p>
    <div class="btns">
      <a class="btn pdf" href="/download?asset=${PDF_ASSET}">Download PDF (468 pages)</a>
      <a class="btn primary" href="/download?asset=${DEFAULT_ASSET}">Download library package</a>
      <button type="button" class="btn install" id="install-btn">One-click install</button>
    </div>
    <pre id="install-cmd">curl -fsSL ${HOST}/install.sh | bash</pre>
    <p class="kid">Then run: <code>aziel-corpus ui</code> and open http://127.0.0.1:8890 (this computer only).</p>
    <p class="meta">The Worker serves the file (HTTP 200). No 302 to GitHub. Forks using this same link are counted. ${n} counted downloads.</p>
    <p class="iso">Isolated counter: Worker <code>aziel-corpus-download-tracker</code>, project <code>aziel-corpus</code>, KV <code>AZIELCORPUS_DOWNLOADS</code>. Not mixed with any other product. /v1 does not increment downloads.</p>
    <p class="meta">GitHub: stars ${gh.stars || 0} · forks ${gh.forks || 0} · watchers ${gh.watchers || 0} · release assets ${gh.release_download_count || 0}</p>
    <p class="meta"><a href="/stats">JSON stats</a> · <a href="/openapi.json">OpenAPI</a> · <a href="/v1/skill">Skill</a> · <a href="/v1/works">Works</a> · <a href="${CATALOG}/">Catalog</a> · <a href="${GITHUB_REPO}">GitHub</a> · <a href="${GITHUB_LATEST}">releases</a></p>
    <script>
      (function () {
        var cmd = "curl -fsSL ${HOST}/install.sh | bash";
        var btn = document.getElementById("install-btn");
        var pre = document.getElementById("install-cmd");
        if (!btn) return;
        btn.addEventListener("click", function () {
          function done(ok) {
            btn.textContent = ok ? "Copied! Paste in Terminal, then run aziel-corpus ui" : "Select the command, copy it, then run aziel-corpus ui";
            btn.classList.add("copied");
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(cmd).then(function () { done(true); }).catch(function () { done(false); });
          } else {
            done(false);
            if (pre && window.getSelection) {
              var r = document.createRange();
              r.selectNodeContents(pre);
              var sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(r);
            }
          }
        });
      })();
    </script>
  </div>
  <h2>Works (${workCount})</h2>
  <p class="kid">Type a word. Matching cards stay. This is a public shelf, not a search of private files.</p>
  <input id="q" type="search" placeholder="Search works (name, slug, one-line)…" aria-label="Search works">
  <div class="grid" id="works">${cards}</div>
  <script>
    (function () {
      var input = document.getElementById("q");
      var cards = document.querySelectorAll("article.work");
      if (!input) return;
      input.addEventListener("input", function () {
        var needle = (input.value || "").trim().toLowerCase();
        for (var i = 0; i < cards.length; i++) {
          var hay = cards[i].getAttribute("data-hay") || "";
          cards[i].classList.toggle("hidden", needle && hay.indexOf(needle) === -1);
        }
      });
    })();
  </script>
<section class="cite" id="cite">
  <h2>How to cite</h2>
  <p>Aziel Eliab. Aziel Corpus Library. ${GITHUB_REPO}. ${HOST}.</p>
  <p><a href="${CATALOG}/">Catalog</a> · <a href="${GITHUB_REPO}">GitHub</a> · <a href="${HOST}/download">Download</a> · <a href="${HOST}/cite.json">cite.json</a></p>
</section>
<!-- /gitbaby-seo -->
</body>
</html>`;
}

function llmsTxt() {
  const works = listWorks()
    .map((w) => `- ${w.name} (${w.slug}): ${w.one_line || ""} ${w.github || ""}`)
    .join("\n");
  return `# Aziel Corpus Library

> Public library of Aziel Eliab software. Counted download of the printed 468-page corpus PDF and the library package.

Author: Aziel Eliab
Library: ${HOST}/
Fallback: ${FALLBACK_HOST}/
GitHub: ${GITHUB_REPO}
OpenAPI: ${HOST}/openapi.json
Catalog: ${CATALOG}/
License: Apache-2.0

${LIMITATION}

## Downloads (HTTP 200, counted, no 302)

- PDF: ${HOST}/download?asset=${PDF_ASSET}
- Package: ${HOST}/download?asset=${DEFAULT_ASSET}
- Install: curl -fsSL ${HOST}/install.sh | bash

## API (does not increment)

- GET ${HOST}/v1/health
- GET ${HOST}/v1/works
- GET ${HOST}/v1/search?q=
- GET ${HOST}/v1/skill
- GET ${HOST}/v1/example

## Works

${works}

## How to cite
Eliab, Aziel. (2026). Aziel Corpus Library [Software]. Apache-2.0. ${HOST}/
`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const runtime = await handleRuntimeApi(request, url);
    if (runtime) return runtime;

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
      return new Response(await indexHtml(env), {
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() },
      });
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
      const locs = [HOST + "/", HOST + "/download", HOST + "/install.sh", HOST + "/v1/skill", HOST + "/v1/works", HOST + "/openapi.json", HOST + "/llms.txt", HOST + "/cite.json", GITHUB_REPO];
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
        title: "Aziel Corpus Library",
        github: GITHUB_REPO,
        library: HOST + "/",
        download: HOST + "/download",
        license: "Apache-2.0",
        catalog: CATALOG + "/",
        how_to_cite: "Eliab, Aziel. (2026). Aziel Corpus Library [Software]. Apache-2.0. " + HOST + "/",
      });
    }
    if ((url.pathname === "/llms.txt" || url.pathname === "/llms.txt/") && request.method === "GET") {
      return new Response(llmsTxt(), {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders() },
      });
    }
    // /gitbaby-seo-routes
    return json({ error: "not found" }, 404);
  },
};
