/** Master UI chrome from Aziel Digital Library v2.6.2 webapp. Author: Aziel Eliab. */
export const CSS = `body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;background:#f4f7f8;color:#18272d}.wrap{max-width:1500px;margin:auto;padding:22px}.card{background:#fff;border:1px solid #dbe3e6;border-radius:12px;padding:18px;margin:14px 0;box-shadow:0 2px 10px #00000008}.top{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.brand{font-size:25px;font-weight:800}.muted{color:#66777e}.pill{background:#e9f1f3;border-radius:12px;padding:3px 8px;font-size:12px}.button,button{background:#1f3a44;color:white;border:0;padding:9px 13px;border-radius:8px;text-decoration:none;cursor:pointer}.search,input,select,textarea{padding:9px;border:1px solid #bdcbd0;border-radius:8px}.search{min-width:340px;flex:1}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;padding:9px;border-bottom:1px solid #e4eaec}th{background:#f3f7f8;position:sticky;top:0}.ok{color:#176a38;font-weight:700}.bad{color:#a51d2d;font-weight:700}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.metric{font-size:28px;font-weight:800}.pw-row{display:flex;gap:8px;align-items:center;margin:6px 0}.pw-row input[type=password],.pw-row input[type=text]{flex:1}label.showpw{font-size:13px;color:#52676f;white-space:nowrap}`;

export function pwField(name = "password") {
  const id = "pw_" + name.replace(/[^a-z0-9]/gi, "");
  return `<div class="pw-row"><input id="${id}" name="${name}" type="password" required placeholder="password" autocomplete="current-password"><label class="showpw"><input type="checkbox" onclick="var e=document.getElementById('${id}');e.type=this.checked?'text':'password'"> Show password</label></div>`;
}

export function page(title, body, { signed } = {}) {
  const who = signed && signed.username ? String(signed.username) : "";
  const account = signed
    ? `<span class="pill ok">signed in as ${esc(who)}</span><a class="button" href="/logout">Log out</a>`
    : `<a class="button" href="/login">Log in</a><a class="button" href="/signup">Sign up</a>`;
  const ingest = signed
    ? `<a class="button" href="/ingest">Mass Ingest</a>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)} — Aziel Digital Library</title><style>${CSS}</style></head><body><div class="wrap"><div class="top"><div class="brand">Aziel Digital Library</div><span class="pill">Runtime v2.6.2</span><span class="pill ok">MASTER · WRITABLE</span><a class="button" href="/">Search</a><a class="button" href="/tree">Tree</a><a class="button" href="/map">Temporal Map</a><a class="button" href="/historical">Historical Geography</a><a class="button" href="/gazetteer">Gazetteer</a><a class="button" href="/intelligence">Intelligence</a><a class="button" href="/health">Health</a><a class="button" href="/verify">Verify</a>${ingest}${account}</div>${body}</div></body></html>`;
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function homeBody({ q, rows, views, downloads, host }) {
  const table = (rows && rows.length)
    ? rows.map((r) => `<tr><td><b>${esc(r.title)}</b><div class="muted">${esc(r.record_id)}</div></td><td>${esc(r.created_by || "")}</td><td>${esc(r.snippet || r.body || "")}</td></tr>`).join("")
    : `<tr><td colspan="3" class="muted">No corpus records match this view.</td></tr>`;
  return `<div class="card"><form class="top" method="get" action="/"><input class="search" name="q" value="${esc(q)}" placeholder="Search title, full text, subjects, people, places..."><button>Search</button></form><p class="muted">Public search. Sign up to ingest. Author Aziel Eliab. Views ${views} · Counted downloads ${downloads}.</p></div>
<div class="card"><h3>Ingest originals</h3><p><a class="button" href="/ingest">Open mass-ingest</a></p><p class="muted">Anonymous visitors can view. Posting requires a signed-up account.</p></div>
<div class="card top"><a class="button" href="/download">Download v2.6.2 zip</a><a class="button" href="/export/xlsx">Export XLSX</a><a class="button" href="/export/pdf">Export PDF</a></div>
<div class="card scroll"><table><tr><th>Document</th><th>Posted by</th><th>Match</th></tr>${table}</table></div>
<div class="card muted">One-click install: <code>curl -fsSL ${esc(host)}/install.sh | bash</code></div>`;
}

export function stub(title, lead) {
  return `<div class="card"><h2>${esc(title)}</h2><p>${lead}</p><p class="muted">Hosted MASTER UI. Full local vault tools also run via <code>python3 aziel_launcher.py</code> on 127.0.0.1:8765.</p></div>`;
}
