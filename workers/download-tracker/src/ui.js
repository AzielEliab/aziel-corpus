import { isOperator } from "./library.js";
import { headMeta, defaultDescription } from "./seo.js";

/** Master UI chrome from Aziel Digital Library v2.7.0 webapp. Author: Aziel Eliab. */
export const CSS = `
:root{--paper:#f6f3ee;--ink:#1c1916;--btn:#1f3a44;--card:#fffcf7;--line:#e2d9cc;--muted:#6b645c;--cream:#fffaf3}
*{box-sizing:border-box}
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:var(--paper);color:var(--ink);line-height:1.5}
.wrap{max-width:920px;margin:auto;padding:28px 22px 72px}
.brand{font-size:23px;font-weight:800;letter-spacing:-.02em;line-height:1.2}
.nav1,.nav2,.top,.row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.nav1{margin-bottom:6px}
.nav2{margin:8px 0 28px;gap:2px 0}
.nav2 a,.quiet a{color:var(--ink);text-decoration:none;font-size:15px;padding:10px 11px;min-height:44px;display:inline-flex;align-items:center;border-radius:10px}
.nav2 a:hover{background:#ece6dc}
.nav2 .sep{color:#c4b9aa;padding:0 2px}
.muted{color:var(--muted)}
.pill{background:#ece6dc;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:650}
.pill.ok{background:#e4eee6;color:#1a5a32}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;margin:18px 0;box-shadow:0 1px 0 #00000008}
.button,button{background:var(--btn);color:#fff;border:0;padding:12px 16px;border-radius:10px;text-decoration:none;cursor:pointer;min-height:44px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:600}
.button.ghost,a.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.search,input,select,textarea{padding:12px 14px;border:1px solid #d3c8b8;border-radius:10px;background:#fff;color:var(--ink);font:inherit}
.search{min-width:0;width:100%;flex:1 1 auto}
input,select,textarea{width:100%;min-height:44px}
textarea{min-height:120px;resize:vertical}
label.filepick{display:block;margin:8px 0 14px}
input[type=file]{width:100%;min-height:44px;padding:10px;background:#fff}
.hero{padding:8px 0 4px}
.hero h1{font-size:28px;margin:0 0 8px;letter-spacing:-.03em}
.hero-search{display:flex;gap:10px;flex-wrap:wrap;align-items:stretch;margin:18px 0 8px}
.hero-search .search{flex:1 1 220px}
.hero-search button{flex:0 0 auto}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 8px}
.chip{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--ink);text-decoration:none;font-weight:650}
.chip.on{background:var(--btn);color:#fff;border-color:var(--btn)}
.doc{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px 20px 16px;margin:14px 0}
.doc h3{margin:8px 0 6px;font-size:20px;letter-spacing:-.02em}
.doc .meta{color:var(--muted);font-size:14px;margin:0 0 8px}
.doc p{margin:8px 0 12px}
.doc .byline{margin:0 0 8px;font-weight:650}
.lib-tag{display:inline-block;font-size:12px;font-weight:750;padding:4px 10px;border-radius:999px;letter-spacing:.02em}
.lib-tag.aziel{background:var(--btn);color:var(--paper)}
.lib-tag.corpus{background:#e7eeea;color:var(--btn)}
.drop{border:2px dashed #c9bfb0;border-radius:16px;padding:22px;background:var(--cream);margin:12px 0 8px}
.drop h3{margin:0 0 6px}
.pw-row{display:flex;gap:8px;align-items:center;margin:6px 0;flex-wrap:wrap}
.pw-row input[type=password],.pw-row input[type=text]{flex:1;min-width:0}
label.showpw{font-size:14px;color:var(--muted);white-space:nowrap;min-height:44px;display:inline-flex;align-items:center;gap:8px}
.ok{color:#176a38;font-weight:700}
.bad{color:#a51d2d;font-weight:700}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.metric{font-size:28px;font-weight:800}
.empty{color:var(--muted);padding:28px 8px;text-align:center}
.empty strong{display:block;color:var(--ink);margin-bottom:6px}
.tools{position:sticky;top:0;z-index:8;background:var(--paper);padding:10px 0 12px;margin:0 0 8px;border-bottom:1px solid var(--line)}
.tools-grid{display:grid;grid-template-columns:minmax(140px,.9fr) repeat(4,minmax(110px,1fr));gap:10px;margin:8px 0 4px}
.tools-grid label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;letter-spacing:.02em;color:var(--muted)}
.tools select,.tools input{min-height:44px;width:100%}
.facet{margin:10px 0}
.facet-label{display:block;font-size:12px;font-weight:700;color:var(--muted);margin:0 0 4px;letter-spacing:.02em}
.facet .chips{margin:0}
.mini-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.mini-chip{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:4px 10px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--ink);text-decoration:none;font-size:13px;font-weight:600}
.mini-chip.on{background:var(--btn);color:#fff;border-color:var(--btn)}
.q-badge{display:inline-block;font-size:12px;font-weight:750;padding:4px 10px;border-radius:999px;margin-left:6px}
.q-badge.go{background:#e4eee6;color:#1a5a32}
.q-badge.slow{background:#fff3d6;color:#7a5b00}
.q-badge.stop{background:#f8e0e3;color:#8a1524}
.lights{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:12px 0}
.light{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid var(--line);border-radius:12px;background:#fff;min-height:72px}
.light .lamp{width:18px;height:18px;border-radius:50%;flex:0 0 18px;margin-top:4px;box-shadow:inset 0 0 0 2px #00000014}
.light.go .lamp{background:#2f9e44}
.light.slow .lamp{background:#f0c14b}
.light.stop .lamp{background:#c92a2a}
.shelf{display:block}
.meta-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:10px 0}
@media (max-width:720px){
  .wrap{padding:16px 14px 56px}
  .brand{width:100%;font-size:20px}
  .search,.hero-search .search{width:100%;min-width:0}
  .hero-search{flex-direction:column}
  .hero-search button,.button,button{width:100%}
  .nav1,.nav2{width:100%}
  .doc,.card,.drop{padding:16px}
  .tools{width:100%}
  .tools-grid{grid-template-columns:1fr}
  .tools select,.tools input,.tools .search{width:100%;min-height:44px}
  .tools button{width:100%}
  .chips,.mini-chips{width:100%}
  .lights{grid-template-columns:1fr}
  .q-badge{display:block;margin:8px 0 0;width:fit-content}
}

.tree details{margin:4px 0}
.tree summary{cursor:pointer;min-height:44px;display:flex;align-items:center;padding:8px 4px;border-radius:10px}
.tree summary:hover{background:#ece6dc}
.tree ul{margin:0 0 0 14px;padding:0;list-style:none}
.tree li{margin:2px 0}
.map-tools{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:12px 0}
.map-tools label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;letter-spacing:.02em;color:var(--muted);flex:1 1 140px}
.map-tools input,.map-tools select{min-height:44px;width:100%}
input[type=range]{width:100%;min-height:44px;accent-color:var(--btn)}
#worldMap{width:100%;height:auto;background:#eef3f4;border-radius:10px;touch-action:none;display:block}
.event-row{padding:10px 0;border-bottom:1px solid var(--line);min-height:44px}
table.plain{width:100%;border-collapse:collapse}
table.plain th,table.plain td{text-align:left;vertical-align:top;padding:10px 8px;border-bottom:1px solid var(--line)}
pre.verify{white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;overflow:auto}
@media (max-width:720px){
  .map-tools{flex-direction:column;align-items:stretch}
  .map-tools label,.map-tools button,.map-tools input,.map-tools select{width:100%}
  table.plain{display:block;overflow-x:auto}
}
`;

export function pwField(name = "password") {
  const id = "pw_" + name.replace(/[^a-z0-9]/gi, "");
  return `<div class="pw-row"><input id="${id}" name="${name}" type="password" required placeholder="password" autocomplete="current-password"><label class="showpw"><input type="checkbox" onclick="var e=document.getElementById('${id}');e.type=this.checked?'text':'password'"> Show password</label></div>`;
}

export function page(title, body, { signed, scripts, path, kind, description } = {}) {
  const who = signed && signed.username ? String(signed.username) : "";
  const op = isOperator(signed);
  const account = signed
    ? `<span class="pill ok">signed in as ${esc(who)}</span>`
    : `<span class="pill">anyone can view</span>`;
  const authLinks = signed
    ? `<a href="/logout">Log out</a>`
    : `<a href="/login">Log in</a><span class="sep">|</span><a href="/signup">Sign up</a>`;
  const azielLink = op
    ? `<a href="/aziel-library">Aziel Library</a><span class="sep">|</span>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} — Aziel Digital Library</title>${headMeta({ title, path: path || "/", kind, description })}<style>${CSS}</style></head><body><div class="wrap">
<div class="nav1"><div class="brand">Aziel Digital Library</div><span class="pill">Runtime v2.7.0</span><span class="pill ok">MASTER · WRITABLE</span>${account}</div>
<nav class="nav2 quiet"><a href="/">Search</a><span class="sep">|</span>${azielLink}<a href="/corpus">Corpus</a><span class="sep">|</span><a href="/tree">Tree</a><span class="sep">|</span><a href="/map">Map</a><span class="sep">|</span><a href="/historical">Historical</a><span class="sep">|</span><a href="/gazetteer">Gazetteer</a><span class="sep">|</span><a href="/intelligence">Intelligence</a><span class="sep">|</span><a href="/health">Health</a><span class="sep">|</span><a href="/verify">Verify</a><span class="sep">|</span>${authLinks}</nav>
${body}</div>${(scripts||[]).map((src)=>"<script src=\""+esc(src)+"\" defer></script>").join("")}</body></html>`;
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function libTag(library) {
  const lib = String(library || "corpus").toLowerCase() === "aziel" ? "aziel" : "corpus";
  const label = lib === "aziel" ? "Aziel Library" : "Corpus";
  return `<span class="lib-tag ${lib}">${label}</span>`;
}

function browseState(opts = {}) {
  return {
    q: String(opts.q || "").trim(),
    lib: String(opts.lib || "all").trim() || "all",
    sort: String(opts.sort || "newest").trim() || "newest",
    domain: String(opts.domain || "").trim(),
    subject: String(opts.subject || "").trim(),
    keyword: String(opts.keyword || "").trim(),
    author: String(opts.author || "").trim(),
  };
}

function browseHref(path, state, extra = {}) {
  const merged = { ...browseState(state), ...extra };
  const sp = new URLSearchParams();
  for (const key of ["q", "lib", "sort", "domain", "subject", "keyword", "author"]) {
    let v = merged[key];
    if (v == null) continue;
    v = String(v).trim();
    if (!v) continue;
    if (key === "lib" && (v === "all" || path !== "/")) continue;
    if (key === "sort" && v === "newest") continue;
    sp.set(key, v);
  }
  const qs = sp.toString();
  return qs ? path + "?" + qs : path;
}

function splitTokens(value) {
  return String(value || "")
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function chip(label, href, on, cls = "chip") {
  return `<a class="${cls}${on ? " on" : ""}" href="${href}">${esc(label)}</a>`;
}

function miniChip(label, href, on) {
  return chip(label, href, on, "mini-chip");
}

const SORTS = [
  ["newest", "Newest upload"],
  ["oldest", "Oldest upload"],
  ["alpha", "Title A–Z"],
  ["author", "Author A–Z"],
  ["domain", "Domain A–Z"],
];

function browseTools({ action = "/", showLibChips = true, ...raw }) {
  const state = browseState(raw);
  const sortKey = state.sort === "title" ? "alpha" : state.sort;
  const opts = SORTS.map(
    ([v, lab]) => `<option value="${v}"${sortKey === v ? " selected" : ""}>${lab}</option>`
  ).join("");
  const hiddenLib = action === "/" ? `<input type="hidden" name="lib" value="${esc(state.lib)}">` : "";
  const libChips = showLibChips
    ? `<div class="chips">${chip("All", browseHref("/", state, { lib: "all" }), state.lib === "all" || !state.lib)}${chip("Aziel Library", browseHref("/", state, { lib: "aziel" }), state.lib === "aziel")}${chip("Corpus", browseHref("/", state, { lib: "corpus" }), state.lib === "corpus")}</div>`
    : "";
  return `<form class="tools" method="get" action="${esc(action)}">
<div class="hero-search"><input class="search" name="q" value="${esc(state.q)}" placeholder="Search title, text, author, domain, subjects, keywords…">${hiddenLib}<button>Search</button></div>
<div class="tools-grid">
<label>Sort<select name="sort">${opts}</select></label>
<label>Domain<input name="domain" value="${esc(state.domain)}" placeholder="Domain"></label>
<label>Subject<input name="subject" value="${esc(state.subject)}" placeholder="Subject"></label>
<label>Keyword<input name="keyword" value="${esc(state.keyword)}" placeholder="Keyword"></label>
<label>Author<input name="author" value="${esc(state.author)}" placeholder="Author"></label>
</div>
${libChips}
</form>`;
}

function facetRow(label, items, param, state, path) {
  if (!items || !items.length) return "";
  const current = String(state[param] || "").trim();
  const chips = items
    .map((token) => {
      const on = current.toLowerCase() === String(token).toLowerCase();
      return chip(token, browseHref(path, state, { [param]: on ? "" : token }), on);
    })
    .join("");
  return `<div class="facet"><span class="facet-label">${esc(label)}</span><div class="chips">${chips}</div></div>`;
}

function facetBlock(facets, state, path) {
  const f = facets || {};
  const rows = [
    facetRow("Domain", f.domains, "domain", state, path),
    facetRow("Subject", f.subjects, "subject", state, path),
    facetRow("Keyword", f.keywords, "keyword", state, path),
    facetRow("Author", f.authors, "author", state, path),
  ].filter(Boolean);
  return rows.length ? `<div class="facets">${rows.join("")}</div>` : "";
}

function docCards(rows, state = {}, path = "/") {
  if (!rows || !rows.length) {
    return `<div class="shelf"><p class="empty"><strong>This shelf is quiet.</strong>Nothing matches these filters. Clear a chip or try another sort.</p></div>`;
  }
  const st = browseState(state);
  return `<div class="shelf">${rows
    .map((r) => {
      const open = r.object_key
        ? `<p><a class="button" href="/file/${esc(r.record_id)}">Open file</a></p>`
        : "";
      const file = r.filename ? esc(r.filename) : "text record";
      const when = r.created_utc ? esc(String(r.created_utc).replace("T", " ").slice(0, 16)) : "";
      const authorName = String(r.author || "").trim();
      const byline = authorName
        ? `<p class="byline">${miniChip(authorName, browseHref(path, st, { author: authorName }), String(st.author).toLowerCase() === authorName.toLowerCase())}</p>`
        : "";
      const domainChips = splitTokens(r.domain)
        .map((t) => miniChip(t, browseHref(path, st, { domain: t }), String(st.domain).toLowerCase() === t.toLowerCase()))
        .join("");
      const subjectChips = splitTokens(r.subjects)
        .map((t) => miniChip(t, browseHref(path, st, { subject: t }), String(st.subject).toLowerCase() === t.toLowerCase()))
        .join("");
      const keywordChips = splitTokens(r.keywords)
        .map((t) => miniChip(t, browseHref(path, st, { keyword: t }), String(st.keyword).toLowerCase() === t.toLowerCase()))
        .join("");
      const extra = [domainChips, subjectChips, keywordChips].filter(Boolean).join("");
            const sha = String(r.content_sha256 || "").trim();
      const shaRow = sha ? `<p class="meta">SHA-256 ${esc(sha.slice(0,12))}… · <a href="/receipt/${esc(r.record_id)}">receipt</a></p>` : `<p class="meta"><a href="/receipt/${esc(r.record_id)}">receipt</a></p>`;
      const q = String(r.quarantine_status || "").toUpperCase();
      const qBadge = q === "POISON_SUSPECT" || q === "QUARANTINE"
        ? `<span class="q-badge stop">Quarantine</span>`
        : q === "OPERATOR_FLAG" || q === "FLAGGED"
          ? `<span class="q-badge slow">Flagged</span>`
          : "";
const extraRow = extra ? `<div class="mini-chips">${extra}</div>` : "";
      return `<article class="doc">${libTag(r.library)}${qBadge}<h3><a href="/record/${esc(r.record_id)}">${esc(r.title)}</a></h3>${byline}${extraRow}<p class="meta">${file}${when ? " · " + when : ""}</p>${shaRow}<p>${esc(r.snippet || r.body || "")}</p>${open}</article>`;
    })
    .join("")}</div>`;
}

function metaInputs({ authorPlaceholder = "Author" } = {}) {
  return `<div class="meta-fields">
<input name="author" placeholder="${esc(authorPlaceholder)}" autocomplete="off">
<input name="domain" placeholder="Domain">
<input name="subjects" placeholder="Subjects (comma-separated)">
<input name="keywords" placeholder="Keywords (comma-separated)">
</div>`;
}

export function homeBody({ q, lib, sort, domain, subject, keyword, author, rows, facets, views, downloads, host }) {
  const state = browseState({ q, lib, sort, domain, subject, keyword, author });
  return `<section class="hero">
<h1>Search the libraries</h1>
<p class="muted">Public search across Aziel Library and the corpus. Sign up to post. Author Aziel Eliab. Views ${esc(views)} · Counted downloads ${esc(downloads)}.</p>
</section>
${browseTools({ action: "/", showLibChips: true, ...state })}
${facetBlock(facets, state, "/")}
${docCards(rows, state, "/")}
<div class="card row"><a class="button" href="/download">Download library zip</a></div>
<div class="muted">One-click install: <code>curl -fsSL ${esc(host)}/install.sh | bash</code></div>`;
}

export function azielLibraryBody({ rows, error, q, sort, domain, subject, keyword, author, facets } = {}) {
  const err = error ? `<p class="bad">${esc(error)}</p>` : "";
  const state = browseState({ q, lib: "aziel", sort, domain, subject, keyword, author });
  return `<section class="hero"><h1>Aziel Library</h1><p class="muted">Aziel Eliab's work across domains.</p></section>
${browseTools({ action: "/aziel-library", showLibChips: false, ...state })}
${facetBlock(facets, state, "/aziel-library")}
<div class="drop">
<h3>Upload a file</h3>
<p class="muted">Multipart file upload. Title and notes are optional. Files stay in Aziel Library.</p>
${err}
<form method="post" action="/aziel-library" enctype="multipart/form-data">
<label class="filepick">File<input type="file" name="file" required></label>
<input name="title" placeholder="Title (optional)">
${metaInputs({ authorPlaceholder: "Aziel Eliab" })}
<textarea name="notes" rows="4" placeholder="Notes (optional)"></textarea>
<p><button>Upload to Aziel Library</button></p>
</form>
</div>
${docCards(rows, state, "/aziel-library")}`;
}

export function corpusBody({ signed, rows, error, q, sort, domain, subject, keyword, author, facets } = {}) {
  const op = isOperator(signed);
  const err = error ? `<p class="bad">${esc(error)}</p>` : "";
  const state = browseState({ q, lib: "corpus", sort, domain, subject, keyword, author });
  let form = "";
  if (op) {
    form = `<div class="card"><p>Operator files always go to Aziel Library.</p><p><a class="button" href="/aziel-library">Open Aziel Library upload</a></p></div>`;
  } else if (signed) {
    form = `<div class="drop">
<h3>Post to the corpus</h3>
<p class="muted">Signed-in accounts can upload a file and/or title + notes. Signup is required to post.</p>
${err}
<form method="post" action="/ingest" enctype="multipart/form-data">
<label class="filepick">File (optional if you include title and notes)<input type="file" name="file"></label>
<input name="title" placeholder="Title">
${metaInputs({ authorPlaceholder: "Author" })}
<textarea name="body" rows="6" placeholder="Text or notes"></textarea>
<p><button>Preserve + index</button></p>
</form>
</div>`;
  } else {
    form = `<div class="card"><p>Anyone can view this library. An account is required to post.</p><p><a class="button" href="/login">Log in</a> <a class="button ghost" href="/signup">Sign up</a></p></div>`;
  }
  return `<section class="hero"><h1>Corpus library</h1><p class="muted">Files from every other account.</p></section>
${browseTools({ action: "/corpus", showLibChips: false, ...state })}
${facetBlock(facets, state, "/corpus")}
${form}
${docCards(rows, state, "/corpus")}`;
}

export function stub(title, lead) {
  return `<div class="card"><h2>${esc(title)}</h2><p>${lead}</p><p class="muted">Hosted MASTER UI. Full local vault tools also run via <code>python3 aziel_launcher.py</code> on 127.0.0.1:8765.</p></div>`;
}

export { treeBody, mapBody, historicalBody, gazetteerBody, intelligenceBody, healthBody, verifyBody, recordBody } from "./hosted-pages.js";
