import { isOperator } from "./library.js";

/** Master UI chrome from Aziel Digital Library v2.6.2 webapp. Author: Aziel Eliab. */
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
.empty{color:var(--muted);padding:12px 0}
@media (max-width:720px){
  .wrap{padding:16px 14px 56px}
  .brand{width:100%;font-size:20px}
  .search,.hero-search .search{width:100%;min-width:0}
  .hero-search{flex-direction:column}
  .hero-search button,.button,button{width:100%}
  .nav1,.nav2{width:100%}
  .doc,.card,.drop{padding:16px}
}
`;

export function pwField(name = "password") {
  const id = "pw_" + name.replace(/[^a-z0-9]/gi, "");
  return `<div class="pw-row"><input id="${id}" name="${name}" type="password" required placeholder="password" autocomplete="current-password"><label class="showpw"><input type="checkbox" onclick="var e=document.getElementById('${id}');e.type=this.checked?'text':'password'"> Show password</label></div>`;
}

export function page(title, body, { signed } = {}) {
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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} — Aziel Digital Library</title><style>${CSS}</style></head><body><div class="wrap">
<div class="nav1"><div class="brand">Aziel Digital Library</div><span class="pill">Runtime v2.6.2</span><span class="pill ok">MASTER · WRITABLE</span>${account}</div>
<nav class="nav2 quiet"><a href="/">Search</a><span class="sep">|</span>${azielLink}<a href="/corpus">Corpus</a><span class="sep">|</span><a href="/tree">Tree</a><span class="sep">|</span><a href="/map">Map</a><span class="sep">|</span><a href="/gazetteer">Gazetteer</a><span class="sep">|</span><a href="/intelligence">Intelligence</a><span class="sep">|</span><a href="/health">Health</a><span class="sep">|</span><a href="/verify">Verify</a><span class="sep">|</span>${authLinks}</nav>
${body}</div></body></html>`;
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function libTag(library) {
  const lib = String(library || "corpus").toLowerCase() === "aziel" ? "aziel" : "corpus";
  const label = lib === "aziel" ? "Aziel Library" : "Corpus";
  return `<span class="lib-tag ${lib}">${label}</span>`;
}

function docCards(rows) {
  if (!rows || !rows.length) {
    return `<p class="empty">No documents in this view.</p>`;
  }
  return rows.map((r) => {
    const open = r.object_key
      ? `<p><a class="button" href="/file/${esc(r.record_id)}">Open file</a></p>`
      : "";
    const file = r.filename ? esc(r.filename) : "text record";
    const by = r.created_by ? esc(r.created_by) : "";
    const when = r.created_utc ? esc(String(r.created_utc).replace("T", " ").slice(0, 16)) : "";
    return `<article class="doc">${libTag(r.library)}<h3>${esc(r.title)}</h3><p class="meta">${file}${by ? " · " + by : ""}${when ? " · " + when : ""}</p><p>${esc(r.snippet || r.body || "")}</p>${open}</article>`;
  }).join("");
}

function chip(label, href, on) {
  return `<a class="chip${on ? " on" : ""}" href="${href}">${esc(label)}</a>`;
}

export function homeBody({ q, lib, rows, views, downloads, host }) {
  const current = String(lib || "all").toLowerCase();
  const qq = q ? "&q=" + encodeURIComponent(q) : "";
  const qParam = q ? "?q=" + encodeURIComponent(q) : "";
  return `<section class="hero">
<h1>Search the libraries</h1>
<p class="muted">Public search across Aziel Library and the corpus. Sign up to post. Author Aziel Eliab. Views ${esc(views)} · Counted downloads ${esc(downloads)}.</p>
<form class="hero-search" method="get" action="/"><input class="search" name="q" value="${esc(q)}" placeholder="Search title, full text, filename..."><input type="hidden" name="lib" value="${esc(current)}"><button>Search</button></form>
<div class="chips">${chip("All", "/" + (qParam || "?lib=all"), current === "all" || !current)}${chip("Aziel Library", "/?lib=aziel" + qq, current === "aziel")}${chip("Corpus", "/?lib=corpus" + qq, current === "corpus")}</div>
</section>
${docCards(rows)}
<div class="card row"><a class="button" href="/download">Download v2.6.2 zip</a></div>
<div class="muted">One-click install: <code>curl -fsSL ${esc(host)}/install.sh | bash</code></div>`;
}

export function azielLibraryBody({ rows, error } = {}) {
  const err = error ? `<p class="bad">${esc(error)}</p>` : "";
  return `<section class="hero"><h1>Aziel Library</h1><p class="muted">Aziel Eliab's work across domains.</p></section>
<div class="drop">
<h3>Upload a file</h3>
<p class="muted">Multipart file upload. Title and notes are optional. Files stay in Aziel Library.</p>
${err}
<form method="post" action="/aziel-library" enctype="multipart/form-data">
<label class="filepick">File<input type="file" name="file" required></label>
<input name="title" placeholder="Title (optional)">
<textarea name="notes" rows="4" placeholder="Notes (optional)"></textarea>
<p><button>Upload to Aziel Library</button></p>
</form>
</div>
${docCards(rows)}`;
}

export function corpusBody({ signed, rows, error } = {}) {
  const op = isOperator(signed);
  const err = error ? `<p class="bad">${esc(error)}</p>` : "";
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
<textarea name="body" rows="6" placeholder="Text or notes"></textarea>
<p><button>Preserve + index</button></p>
</form>
</div>`;
  } else {
    form = `<div class="card"><p>Anyone can view this library. An account is required to post.</p><p><a class="button" href="/login">Log in</a> <a class="button ghost" href="/signup">Sign up</a></p></div>`;
  }
  return `<section class="hero"><h1>Corpus library</h1><p class="muted">Files from every other account.</p></section>
${form}
${docCards(rows)}`;
}

export function stub(title, lead) {
  return `<div class="card"><h2>${esc(title)}</h2><p>${lead}</p><p class="muted">Hosted MASTER UI. Full local vault tools also run via <code>python3 aziel_launcher.py</code> on 127.0.0.1:8765.</p></div>`;
}
