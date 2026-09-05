import { isOperator } from "./library.js";
import { headMeta, defaultDescription } from "./seo.js";
import { jeevesFabHtml } from "./jeeves.js";

/** Master UI chrome from Aziel Digital Library v2.7.0 webapp. Author: Aziel Eliab. */
export const CSS = `
:root{
  --bg:#12100c;--paper:#1b1712;--ink:#efe6d6;--muted:#a89880;--line:#3a3228;
  --gold:#c9a227;--btn:#c9a227;--card:#19150f;--cream:#221c14;
  --royal:#6b3fa0;--royal-deep:#4a2870;--aziel:#6b3fa0;
  --yes:#7dcea0;--no:#e07a7a;--rev:#e0b15a
}
*{box-sizing:border-box}
html,body{background:var(--bg);color:var(--ink);overflow:auto;height:auto;min-height:100%}
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;line-height:1.5}
.wrap{max-width:920px;margin:auto;padding:28px 22px 72px}
.brandrow{display:flex;flex-wrap:nowrap;gap:12px;align-items:center;margin-bottom:6px;min-height:48px}
.brandmark{width:40px;height:40px;border-radius:10px;object-fit:cover;flex:0 0 40px;box-shadow:0 0 0 1px #0003,0 0 0 1px var(--gold)}
.brand{font-size:23px;font-weight:800;letter-spacing:-.02em;line-height:1.2;color:var(--ink)}
.nav1,.nav2,.top,.row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.nav1{margin-bottom:6px}
.nav2{margin:8px 0 28px;gap:2px 0}
.nav2 a,.quiet a{color:var(--gold);text-decoration:none;font-size:15px;padding:10px 11px;min-height:44px;display:inline-flex;align-items:center;border-radius:10px}
.nav2 a:hover{background:#2a241c;color:var(--ink)}
.nav2 .sep{color:#5a4e3e;padding:0 2px}
.muted{color:var(--muted)}
a{color:var(--gold)}
.pill{background:#2a241c;border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:650;color:var(--ink)}
.pill.ok{background:#14261c;color:var(--yes);border-color:#2e6b45}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;margin:18px 0;box-shadow:0 1px 0 #00000040}
.button,button{background:var(--gold);color:#14110a;border:0;padding:12px 16px;border-radius:10px;text-decoration:none;cursor:pointer;min-height:44px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:700}
.button.ghost,a.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.search,input,select,textarea{padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:#16130f;color:var(--ink);font:inherit}
.search{min-width:0;width:100%;flex:1 1 auto}
input,select,textarea{width:100%;min-height:44px}
input[type=checkbox],input[type=radio]{width:auto!important;min-width:18px;min-height:18px;max-width:22px;height:18px;padding:0;flex:0 0 auto;accent-color:var(--btn);appearance:auto;-webkit-appearance:checkbox;background:transparent;border:0;box-shadow:none}
.checkrow{display:flex;align-items:flex-start;gap:10px;white-space:normal;word-break:break-word;overflow-wrap:anywhere;max-width:100%;width:100%;min-width:0;min-height:44px;line-height:1.35;font-size:15px;color:var(--ink);background:transparent}
.checkrow input{margin-top:3px}
.ocr-form{display:flex;flex-direction:column;gap:12px;min-width:0;max-width:100%}
.ocr-form button{align-self:flex-start;max-width:100%}
.lens-box{border:1px solid var(--line);border-radius:12px;padding:12px;min-width:0;max-width:100%;margin:0;background:var(--card);color:var(--ink)}
.lens-box legend{font-weight:750;padding:0 6px;color:var(--ink)}
.lens-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:8px;width:100%;min-width:0}
.lens-grid .checkrow,.lens-option{margin:0;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink);align-items:center}
.lens-sample{width:96px;height:36px;object-fit:contain;object-position:center;border-radius:8px;flex:0 0 96px;border:1px solid var(--line);background:var(--card);display:block}
.lens-copy{min-width:0;flex:1 1 auto;color:var(--ink)}
.lens-swatch{min-height:auto;padding:2px 8px;color:#fff}
textarea{min-height:120px;resize:vertical}
label.filepick{display:block;margin:8px 0 14px}
input[type=file]{width:100%;min-height:44px;padding:10px;background:#16130f;color:var(--ink)}
.hero{padding:8px 0 4px}
.hero h1{font-size:28px;margin:0 0 8px;letter-spacing:-.03em;color:var(--ink)}
.hero-search{display:flex;gap:10px;flex-wrap:wrap;align-items:stretch;margin:18px 0 8px}
.hero-search .search{flex:1 1 220px}
.hero-search button{flex:0 0 auto}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 8px}
.chip{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;border-radius:999px;border:1px solid var(--line);background:var(--paper);color:var(--ink);text-decoration:none;font-weight:650}
.chip.on{background:var(--gold);color:#14110a;border-color:var(--gold)}
.doc{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px 20px 16px;margin:14px 0}
.doc.doc-aziel{border-color:var(--royal);box-shadow:inset 3px 0 0 var(--royal)}
.doc h3{margin:8px 0 6px;font-size:20px;letter-spacing:-.02em}
.doc h3 a{color:var(--ink);text-decoration:none}
.doc h3 a:hover{color:var(--gold)}
.doc .meta{color:var(--muted);font-size:14px;margin:0 0 8px}
.doc p{margin:8px 0 12px}
.doc .byline{margin:0 0 8px;font-weight:650}
.lib-tag{display:inline-block;font-size:12px;font-weight:750;padding:4px 10px;border-radius:999px;letter-spacing:.02em}
.lib-tag.aziel{background:var(--royal);color:#f3e9ff;border:1px solid var(--royal-deep)}
.lib-tag.corpus{background:#2a241c;color:var(--gold);border:1px solid var(--line)}
.drop{border:2px dashed var(--line);border-radius:16px;padding:22px;background:var(--cream);margin:12px 0 8px}
.drop h3{margin:0 0 6px}
.pw-row{display:flex;gap:8px;align-items:center;margin:6px 0;flex-wrap:wrap}
.pw-row input[type=password],.pw-row input[type=text]{flex:1;min-width:0}
label.showpw{font-size:14px;color:var(--muted);white-space:nowrap;min-height:44px;display:inline-flex;align-items:center;gap:8px}
.ok{color:var(--yes);font-weight:700}
.bad{color:var(--no);font-weight:700}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.metric{font-size:28px;font-weight:800;color:var(--gold)}
.empty{color:var(--muted);padding:28px 8px;text-align:center}
.empty strong{display:block;color:var(--ink);margin-bottom:6px}
.tools{position:relative;z-index:8;background:var(--bg);padding:10px 0 12px;margin:0 0 8px;border-bottom:1px solid var(--line)}
.tools-grid{display:grid;grid-template-columns:minmax(140px,.9fr) repeat(4,minmax(110px,1fr));gap:10px;margin:8px 0 4px}
.tools-grid label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;letter-spacing:.02em;color:var(--muted)}
.tools select,.tools input{min-height:44px;width:100%}
.facet{margin:10px 0}
.facet-label{display:block;font-size:12px;font-weight:700;color:var(--muted);margin:0 0 4px;letter-spacing:.02em}
.facet .chips{margin:0}
.mini-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.mini-chip{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:4px 10px;border-radius:999px;border:1px solid var(--line);background:var(--paper);color:var(--ink);text-decoration:none;font-size:13px;font-weight:600}
.mini-chip.on{background:var(--gold);color:#14110a;border-color:var(--gold)}
.q-badge{display:inline-block;font-size:12px;font-weight:750;padding:4px 10px;border-radius:999px;margin-left:6px}
.q-badge.go{background:#14261c;color:var(--yes)}
.q-badge.slow{background:#2a2210;color:var(--rev)}
.q-badge.stop{background:#2a1414;color:var(--no)}
.lights{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:12px 0}
.light{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--paper);min-height:72px}
.light .lamp{width:18px;height:18px;border-radius:50%;flex:0 0 18px;margin-top:4px;box-shadow:inset 0 0 0 2px #00000044}
.light.go .lamp{background:#2f9e44}
.light.slow .lamp{background:#f0c14b}
.light.stop .lamp{background:#c92a2a}
.shelf{display:block;max-height:none;overflow:visible}
@media (min-width:721px){
  .tools{position:sticky;top:0}
  .shelf{display:block;max-height:min(58vh,520px);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;border:1px solid var(--line);border-radius:12px;padding:8px;background:var(--card)}
}
.meta-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:10px 0}
.triad{display:flex;gap:16px;align-items:center;margin:10px 0 4px}
.triad .metric{font-size:42px;line-height:1;color:var(--gold)}
.triad-card{border:1px solid var(--line);border-radius:14px;padding:16px;background:var(--paper);margin:12px 0}
.q-banner{background:#2a1414;color:var(--no);border:1px solid #8a2b2b;border-radius:12px;padding:12px 14px;margin:10px 0;font-weight:650}
.about-aziel,.about-aziel p,.about-prose,.about-sign{color:var(--royal)}
.about-aziel h1,.about-aziel h2{color:var(--royal)}
.about-aziel a{color:var(--royal)}
.about-aziel a:hover{color:var(--gold)}
.doc.doc-aziel,.doc.doc-aziel h3,.doc.doc-aziel h3 a,.doc.doc-aziel p,.doc.doc-aziel .meta,.doc.doc-aziel .byline{color:var(--royal)}
.doc.doc-aziel h3 a:hover{color:var(--gold)}
.doc.doc-aziel .mini-chip{color:var(--royal);border-color:var(--royal)}
.record-aziel,.record-aziel p,.record-aziel .meta,.record-aziel h1,.record-aziel h2,.record-aziel h3{color:var(--royal)}
.record-aziel a{color:var(--royal)}
.record-aziel a:hover{color:var(--gold)}
.pattern-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:12px 0}
.pattern-card{display:block;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;text-decoration:none;color:var(--ink)}
.pattern-card:hover{border-color:var(--gold);color:var(--ink)}
.pattern-card .metric{font-size:28px;font-weight:800;color:var(--gold);margin:0 0 6px}
.soft-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:12px 0}
.soft-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px}
.soft-card.featured{border-color:var(--royal);box-shadow:inset 3px 0 0 var(--royal)}
.soft-card h3{margin:0 0 8px;font-size:20px}
.soft-card p{margin:0 0 12px}
.soft-card .soft-meta{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.soft-card .soft-meta .pill{font-variant-numeric:tabular-nums}
.soft-card.root{border-color:var(--gold);box-shadow:inset 3px 0 0 var(--gold)}
.soft-card .soft-links{display:flex;flex-wrap:wrap;gap:8px;margin:0}
.jeeves-fab{position:fixed;right:16px;bottom:16px;z-index:40;width:auto;min-width:120px;max-width:calc(100vw - 32px);box-shadow:0 8px 24px #00000066;touch-action:manipulation;pointer-events:auto;background:var(--gold);color:#14110a}
.jeeves-drawer{position:fixed;right:12px;bottom:72px;z-index:39;width:min(380px,calc(100vw - 24px));max-height:70vh;overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;box-shadow:0 12px 32px #00000066;touch-action:pan-y;pointer-events:auto}
.jeeves-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
.jeeves-x{background:transparent;color:var(--ink);border:0;min-height:44px;width:44px;padding:0}
.jeeves-log{min-height:80px;max-height:28vh;overflow:auto;margin:8px 0;border:1px solid var(--line);border-radius:10px;padding:8px;background:#16130f}
.jeeves-msg{margin:0 0 8px;font-size:14px}
.jeeves-egg-img{display:block;max-width:100%;width:min(280px,100%);height:auto;margin:10px 0 4px;border-radius:12px;border:1px solid var(--line);background:#0f0d0a}
.jeeves-note{margin:6px 0 8px}
.jeeves-ask,.jeeves-up{display:flex;flex-direction:column;gap:8px;margin:8px 0}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
@media (max-width:720px){
  html,body{overflow:auto;height:auto;min-height:100%}
  .wrap{padding:16px 14px max(120px, calc(env(safe-area-inset-bottom, 0px) + 100px))}
  .brand{width:auto;font-size:20px;flex:1 1 auto;min-width:0}
  .brandrow{flex-wrap:wrap}
  .search,.hero-search .search{width:100%;min-width:0}
  .hero-search{flex-direction:column}
  .hero-search button,.button,button{width:100%}
  .jeeves-fab,.jeeves-drawer button,.jeeves-drawer .button,.jeeves-x{width:auto}
  .nav1,.nav2{width:100%}
  .doc,.card,.drop{padding:16px}
  .tools{position:static;width:100%}
  .tools-grid{grid-template-columns:1fr}
  .tools select,.tools input,.tools .search{width:100%;min-height:44px}
  .tools button{width:100%}
  .shelf{display:block;max-height:none;overflow:visible;border:0;padding:0;background:transparent}
  .chips,.mini-chips,.checkrow,.lens-grid,.ocr-form,.ocr-form button{width:100%}
  .lights{grid-template-columns:1fr}
  .q-badge{display:block;margin:8px 0 0;width:fit-content}
}

.tree details{margin:4px 0}
.tree summary{cursor:pointer;min-height:44px;display:flex;align-items:center;padding:8px 4px;border-radius:10px}
.tree summary:hover{background:#2a241c}
.tree ul{margin:0 0 0 14px;padding:0;list-style:none}
.tree li{margin:2px 0}
.tree-aziel>summary,.tree .tree-aziel{color:var(--royal);font-weight:700}
.map-tools{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:12px 0}
.map-tools label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;letter-spacing:.02em;color:var(--muted);flex:1 1 140px}
.map-tools input,.map-tools select{min-height:44px;width:100%}
input[type=range]{width:100%;min-height:44px;accent-color:var(--gold)}
#worldMap{width:100%;height:auto;background:#16130f;border:1px solid var(--line);border-radius:10px;touch-action:none;display:block}
.event-row{padding:10px 0;border-bottom:1px solid var(--line);min-height:44px}
table.plain{width:100%;border-collapse:collapse}
table.plain th,table.plain td{text-align:left;vertical-align:top;padding:10px 8px;border-bottom:1px solid var(--line);color:var(--ink)}
pre.verify{white-space:pre-wrap;word-break:break-word;background:#16130f;border:1px solid var(--line);border-radius:12px;padding:14px;overflow:auto;color:var(--ink)}
.media-options{display:flex;flex-direction:column;gap:6px;margin:8px 0 14px}
.media-actions{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
.media-form input[type=checkbox]{width:auto;min-height:18px;min-width:18px;flex:0 0 auto}
.av-player{width:100%;max-width:100%;margin:8px 0;min-height:44px}
@media (max-width:720px){
  .map-tools{flex-direction:column;align-items:stretch}
  .map-tools label,.map-tools button,.map-tools input,.map-tools select{width:100%}
  table.plain{display:block;overflow-x:auto}
  .media-actions .button,.media-actions button{width:100%}
}
`;

export function pwField(name = "password") {
  const id = "pw_" + name.replace(/[^a-z0-9]/gi, "");
  return `<div class="pw-row"><input id="${id}" name="${name}" type="password" required placeholder="password" autocomplete="current-password"><label class="showpw"><input type="checkbox" onclick="var e=document.getElementById('${id}');e.type=this.checked?'text':'password'"> Show password</label></div>`;
}

export function page(title, body, { signed, scripts, path, kind, description } = {}) {
  const who = signed && signed.username ? String(signed.username) : "";
  const account = signed
    ? `<span class="pill ok">signed in as ${esc(who)}</span>`
    : `<span class="pill">anyone can view</span>`;
  const authLinks = signed
    ? `<a href="/logout">Log out</a>`
    : `<a href="/login">Log in</a><span class="sep">|</span><a href="/signup">Sign up</a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} — Aziel Digital Library</title>${headMeta({ title, path: path || "/", kind, description })}<style>${CSS}</style></head><body><div class="wrap">
<div class="brandrow nav1"><img class="brandmark" src="/sigil.png" width="40" height="40" alt="" decoding="async"><div class="brand">Aziel Digital Library</div><span class="pill">Runtime v2.7.0</span><span class="pill ok">MASTER · WRITABLE</span>${account}</div>
<nav class="nav2 quiet"><a href="/">Search</a><span class="sep">|</span><a href="/aziel-library">Aziel Library</a><span class="sep">|</span><a href="/corpus">Corpus</a><span class="sep">|</span><a href="/pattern">Pattern</a><span class="sep">|</span><a href="/software">Software</a><span class="sep">|</span><a href="/runtime">Runtime</a><span class="sep">|</span><a href="/tree">Tree</a><span class="sep">|</span><a href="/map">Map</a><span class="sep">|</span><a href="/historical">Historical</a><span class="sep">|</span><a href="/gazetteer">Gazetteer</a><span class="sep">|</span><a href="/intelligence">Intelligence</a><span class="sep">|</span><a href="/about">About Aziel</a><span class="sep">|</span>${authLinks}</nav>
${body}</div>${jeevesFabHtml()}${(scripts||[]).map((src)=>"<script src=\""+esc(src)+"\" defer></script>").join("")}</body></html>`;
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

function isAzielRow(r) {
  return String(r && r.library || "").toLowerCase() === "aziel";
}

function recordTimeMs(row) {
  const ms = Date.parse(String((row && row.created_utc) || ""));
  return Number.isFinite(ms) ? ms : 0;
}

function preferredShelfRow(a, b) {
  const la = String((a && a.library) || "").toLowerCase() === "aziel" ? 1 : 0;
  const lb = String((b && b.library) || "").toLowerCase() === "aziel" ? 1 : 0;
  if (la !== lb) return la > lb ? a : b;
  const ta = recordTimeMs(a);
  const tb = recordTimeMs(b);
  if (ta !== tb) return ta > tb ? a : b;
  return String((a && a.record_id) || "") >= String((b && b.record_id) || "") ? a : b;
}

function dedupeShelf(rows) {
  const bySha = new Map();
  const noSha = [];
  for (const r of rows || []) {
    const sha = String(r.content_sha256 || "").trim().toLowerCase();
    if (!sha) {
      noSha.push(r);
      continue;
    }
    const prev = bySha.get(sha);
    bySha.set(sha, prev ? preferredShelfRow(prev, r) : r);
  }
  const keepers = new Set([...bySha.values(), ...noSha].map((r) => r && r.record_id).filter(Boolean));
  return (rows || []).filter((r) => keepers.has(r.record_id));
}

function docCards(rows, state = {}, path = "/") {
  const unique = dedupeShelf(rows);
  if (!unique.length) {
    return `<div class="shelf"><p class="empty"><strong>This shelf is quiet.</strong>Nothing matches these filters. Clear a chip or try another sort.</p></div>`;
  }
  const st = browseState(state);
  const quietAziel = path === "/aziel-library";
  return `<div class="shelf">${unique
    .map((r) => {
      const aziel = isAzielRow(r);
      const combined = r.triad_combined != null ? Number(r.triad_combined) : (r.review && r.review.triad && r.review.triad.combined);
      const display = r.review && r.review.triad && r.review.triad.display != null ? r.review.triad.display : (combined != null ? Math.round(Number(combined) * 100) : null);
      const triadRow = display != null
        ? `<p class="triad"><span class="metric">${esc(display)}</span><span class="muted">Triad score (SPRE × CLCE × PhysLing)</span></p>`
        : (quietAziel ? "" : `<p class="muted">Triad score pending backfill</p>`);
      const zScore = r.zsolver_score != null ? Number(r.zsolver_score) : (r.zsolver && r.zsolver.capped_confidence);
      const zDisp = r.zsolver && r.zsolver.display != null ? r.zsolver.display : (zScore != null && Number.isFinite(zScore) ? Math.round(zScore * 100) : null);
      const zStat = String(r.zsolver_status || (r.zsolver && r.zsolver.status) || "").toLowerCase();
      const zRow = zDisp != null
        ? `<p class="triad"><span class="metric">${esc(zDisp)}</span><span class="muted">ZionPattern Solver (secondary` + (zStat === "queued" ? ", retry queued" : "") + `)</span></p>`
        : (quietAziel ? "" : `<p class="muted">ZionPattern Solver pending backfill</p>`);
      const sha = String(r.content_sha256 || "").trim();
      const open = `<p><a class="button" href="/file/${esc(r.record_id)}">Download</a>` + (sha ? ` <a class="button ghost" href="/download?hash=${esc(sha)}">By hash</a>` : "") + `</p>`;
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
      const shaRow = sha ? `<p class="meta">SHA-256 ${esc(sha.slice(0,12))}… · <a href="/receipt/${esc(r.record_id)}">receipt</a></p>` : `<p class="meta"><a href="/receipt/${esc(r.record_id)}">receipt</a></p>`;
      const q = String(r.quarantine_status || "").toUpperCase();
      const qBadge = q === "POISON_SUSPECT" || q === "QUARANTINE"
        ? `<span class="q-badge stop">Quarantine</span>`
        : q === "OPERATOR_FLAG" || q === "FLAGGED"
          ? `<span class="q-badge slow">Flagged</span>`
          : "";
      const extraRow = extra ? `<div class="mini-chips">${extra}</div>` : "";
      const docCls = aziel ? "doc doc-aziel" : "doc";
      return `<article class="${docCls}">${libTag(r.library)}${qBadge}<h3><a href="/record/${esc(r.record_id)}">${esc(r.title)}</a></h3>${byline}${extraRow}${triadRow}${zRow}<p class="meta">${file}${when ? " · " + when : ""}</p>${shaRow}<p>${esc(r.snippet || r.body || "")}</p>${open}</article>`;
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

export function azielLibraryBody({ rows, error, q, sort, domain, subject, keyword, author, facets, signed } = {}) {
  const err = error ? `<p class="bad">${esc(error)}</p>` : "";
  const state = browseState({ q, lib: "aziel", sort, domain, subject, keyword, author });
  const op = isOperator(signed);
  const upload = op
    ? `<div class="drop">
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
</div>`
    : `<div class="card"><p class="muted">Anyone can browse Aziel Library. Uploads are operator-only.</p></div>`;
  return `<section class="hero about-aziel"><h1>Aziel Library</h1><p class="muted">Aziel Eliab's work across domains.</p></section>
${browseTools({ action: "/aziel-library", showLibChips: false, ...state })}
${facetBlock(facets, state, "/aziel-library")}
${upload}
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

function patternCard(href, n, label, kind) {
  return `<a class="pattern-card" href="${esc(href)}"><div class="metric">${esc(n)}</div><div><b>${esc(label)}</b><div class="muted">${esc(kind)}</div></div></a>`;
}

export function patternBody({ total, domains, subjects, keywords, crosses } = {}) {
  const n = Number(total) || 0;
  const domainCards = (domains || []).map((x) => patternCard("/?domain=" + encodeURIComponent(x.label), x.n, x.label, "domain")).join("");
  const subjectCards = (subjects || []).map((x) => patternCard("/?subject=" + encodeURIComponent(x.label), x.n, x.label, "subject")).join("");
  const keywordCards = (keywords || []).map((x) => patternCard("/?keyword=" + encodeURIComponent(x.label), x.n, x.label, "keyword")).join("");
  const crossCards = (crosses || []).map((x) => patternCard("/?domain=" + encodeURIComponent(x.domain) + "&subject=" + encodeURIComponent(x.subject), x.n, x.domain + " × " + x.subject, "domain × subject")).join("");
  return `<section class="hero"><h1>Pattern</h1><p class="muted">Domain, subject, and keyword clusters across ${esc(n)} recent records. Cards open Search with that filter. Author Aziel Eliab.</p></section>
<div class="card"><h2>Domains</h2><div class="pattern-grid">${domainCards || "<p class=\"muted\">No domains yet.</p>"}</div></div>
<div class="card"><h2>Subjects</h2><div class="pattern-grid">${subjectCards || "<p class=\"muted\">No subjects yet.</p>"}</div></div>
<div class="card"><h2>Keywords</h2><div class="pattern-grid">${keywordCards || "<p class=\"muted\">No keywords yet.</p>"}</div></div>
<div class="card"><h2>Domain × subject</h2><div class="pattern-grid">${crossCards || "<p class=\"muted\">No pairs yet.</p>"}</div></div>`;
}

export function aboutBody() {
  return `<section class="hero about-aziel"><h1>About Aziel</h1>
<div class="card about-prose">
<p>If not me, then who holds the record when names get stripped and the files get sealed? I didn’t ask for the seat. The work was already sitting there undone. I build receipts so truth has a place to live that isn’t someone else’s story.</p>
<p>Carry the torch: I don’t own the flame. I keep it lit long enough for the next hands to find it. If the record is local, timed, and hashed, the work can outlive me. That is the point.</p>
<p>Truth that cannot be corrected is just a private religion. So the work stays public, chained for review, not a pulpit. Later papers bury earlier ones as confidence hardens. I am not always right. That is not a confession. It is the method.</p>
<p>I am here for the record, not the applause. If not me, then who. If not now, the seal holds. I carry the torch by leaving receipts. When the work can stand without my name on it, I am done.</p>
<p>I am temporary. The truth is not.</p>
<p class="about-sign"><strong>— Aziel Eliab</strong></p>
</div>
</section>`;
}

export function runtimeBody() {
  return `<section class="hero"><h1>aziel-runtime — AI runtime root</h1>
<p class="muted"><strong>engine-runtime 1.4.0.</strong> Prefer same-origin <code>/runtime/*</code>. Listed engines (<code>ark</code>, <code>azai</code>, <code>azclce</code>, <code>decisiongate</code>, <code>foldlock</code>, <code>zsolver</code>) run in-process inside the Worker isolate; session receipts carry <code>engine_digest</code>. Catalog, pull, OpenAPI, MCP, and proxy front doors remain. Proxy is not exec. Session: <code>open → policy → exec → receipt → close</code>. Unsupported slugs are <code>proxy_fallback</code>. Author Aziel Eliab.</p>
<p class="muted"><strong>THIS IS NOT</strong> a second software index. Downloadable product cards stay on <a href="/software">Software</a>. This page is the AI runtime root. No invented Zenodo DOIs.</p></section>
<div class="card">
<h2>Same-origin pull (prefer)</h2>
<p>AIs and tools should call these Digital Library URLs first (send <code>User-Agent: Mozilla/5.0</code>):</p>
<ul>
<li><a href="/runtime/v1/health"><code>/runtime/v1/health</code></a> — origin health (version, engine slugs, digests)</li>
<li><a href="/runtime/v1/runtime.json"><code>/runtime/v1/runtime.json</code></a> — runtime manifest</li>
<li><a href="/runtime/v1/skill"><code>/runtime/v1/skill</code></a> — runtime skill markdown</li>
<li><code>POST /runtime/v1/session/open</code> then <code>POST /runtime/v1/session/{id}/exec</code> — true exec (receipt + <code>engine_digest</code>)</li>
<li><code>GET /runtime/v1/pull/{slug}</code> — pull descriptor (example <a href="/runtime/v1/pull/aziel-corpus"><code>/runtime/v1/pull/aziel-corpus</code></a>)</li>
<li><code>GET /runtime/v1/bundle/{slug}</code> — bundle alias of pull</li>
<li><a href="/runtime/v1/catalog.json"><code>/runtime/v1/catalog.json</code></a> — machine catalog</li>
<li><a href="/runtime/openapi.json"><code>/runtime/openapi.json</code></a> — combined OpenAPI</li>
<li><code>POST /runtime/mcp</code> — MCP JSON-RPC (<code>tools/list</code>, <code>tools/call</code>)</li>
<li>Library alias: <a href="/v1/runtime.json"><code>/v1/runtime.json</code></a> (distinct from library version <a href="/v1/runtime"><code>/v1/runtime</code></a>)</li>
</ul>
<p class="soft-links"><a class="button" href="/runtime/v1/runtime.json">runtime.json</a> <a class="button ghost" href="/runtime/v1/skill">skill</a> <a class="button ghost" href="/runtime/v1/health">health</a> <a class="button ghost" href="/runtime/v1/catalog.json">catalog.json</a> <a class="button ghost" href="/runtime/openapi.json">OpenAPI</a></p>
</div>
<div class="card">
<h2>Origin Worker</h2>
<p>Live aziel-runtime <strong>1.3.0</strong> engine-runtime. Same APIs without the <code>/runtime</code> prefix. Use when calling the Worker directly:</p>
<ul>
<li><a href="https://aziel-runtime.vibelock.workers.dev/">https://aziel-runtime.vibelock.workers.dev/</a> — catalog home</li>
<li><a href="https://aziel-runtime.vibelock.workers.dev/v1/health"><code>/v1/health</code></a></li>
<li><a href="https://aziel-runtime.vibelock.workers.dev/v1/catalog.json"><code>/v1/catalog.json</code></a></li>
<li><a href="https://aziel-runtime.vibelock.workers.dev/openapi.json"><code>/openapi.json</code></a></li>
<li><code>POST https://aziel-runtime.vibelock.workers.dev/mcp</code></li>
<li><a href="https://aziel-runtime.vibelock.workers.dev/v1/skill"><code>/v1/skill</code></a> · <a href="https://aziel-runtime.vibelock.workers.dev/v1/runtime.json"><code>/v1/runtime.json</code></a> · <code>/v1/pull/{slug}</code></li>
<li><code>POST /v1/session/open</code> · <code>POST /v1/session/{id}/exec</code></li>
<li><a href="https://aziel-runtime.vibelock.workers.dev/llms.txt">llms.txt</a> · <a href="https://aziel-runtime.vibelock.workers.dev/cite.json">cite.json</a> · <a href="https://github.com/AzielEliab/aziel-runtime">GitHub</a></li>
</ul>
<p class="muted">Counted downloads stay on each product Worker <code>/download</code> + <code>/count</code>. The Software tab lists those cards. AzielTether is the survival mesh for downloaded nodes; this HTTPS site is not a mesh.</p>
<p class="soft-links"><a class="button ghost" href="/software">Software catalog</a> <a class="button ghost" href="https://aziel-runtime.vibelock.workers.dev/">Open origin</a> <a class="button ghost" href="/v1/lattice">Lattice API</a></p>
</div>`;
}

function softCard(p) {
  const cls = p.root ? "soft-card root" : p.featured ? "soft-card featured" : "soft-card";
  const tag = p.root ? `<span class="lib-tag aziel">AI root</span> ` : p.featured ? `<span class="lib-tag aziel">Featured</span> ` : "";
  const countPill = p.countLabel
    ? `<span class="pill${/\d/.test(String(p.countLabel)) && !/live on Worker/i.test(String(p.countLabel)) ? " ok" : ""}">${esc(p.countLabel)}</span>`
    : "";
  const ver = p.version ? `<span class="pill">v${esc(p.version)}</span>` : "";
  const links = (p.links || []).map((l) => `<a class="${l.primary ? "button" : "button ghost"}" href="${esc(l.href)}">${esc(l.label)}</a>`).join("");
  return `<article class="${cls}">${tag}<h3>${esc(p.name)}</h3><div class="soft-meta">${ver}${countPill}</div><p>${esc(p.blurb)}</p><p class="soft-links">${links}</p></article>`;
}

export function softwareBody({ products, fetched, downloadable } = {}) {
  const cards = (products || []).map(softCard).join("");
  const n = Number(downloadable != null ? downloadable : (products || []).length) || 0;
  const live = Number(fetched) || 0;
  return `<section class="hero"><h1>Downloadable software</h1>
<p class="muted">Catalog of Aziel Eliab products you can download and run. <strong>Pull and invoke</strong> live on <a href="/runtime">Runtime</a> — this tab is not a second AI root.</p>
<p class="muted"><strong>AzielTether</strong> is the survival mesh for downloaded Aziel software (prefer-central × peer sync). This public library is not a mesh — lattice tips are tip-shaped until tether carries them.</p>
<p class="muted">AzielTether is featured first; FoldLock next among packages. Counted downloads stay on each product Worker <code>/count</code>.</p><p class="muted">Live catalog from <a href="https://aziel-runtime.vibelock.workers.dev/">aziel-runtime</a> · author Aziel Eliab only · ${esc(n)} downloadable products · ${esc(live)} live counters fetched.</p></section>
<div class="soft-grid">${cards}</div>
<div class="card"><p class="soft-links"><a class="button" href="/runtime">Runtime root</a> <a class="button ghost" href="https://aziel-runtime.vibelock.workers.dev/v1/catalog.json">catalog.json</a> <a class="button ghost" href="/runtime/mcp">MCP</a> <a class="button ghost" href="/v1/lattice">Lattice API</a></p></div>`;
}

export { treeBody, mapBody, historicalBody, gazetteerBody, intelligenceBody, healthBody, verifyBody, recordBody, receiptBody, ocrPageBody, ocrBody, ocrFormHtml, SPECTRAL_LENSES, blockedAvBody } from "./hosted-pages.js";
