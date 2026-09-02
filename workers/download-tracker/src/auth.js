import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { json, corsHeaders } from "./runtime.js";
const MASTER_USERNAME = "AzielElroiEliab";
const SCRYPT = { N: 16384, r: 8, p: 1, dklen: 32 };
function b64(buf) { return Buffer.from(buf).toString("base64"); }
function fromB64(s) { return Buffer.from(s, "base64"); }
function cookie(token) { return "aziel_session=" + token + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800"; }
function clearCookie() { return "aziel_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"; }
export function readCookie(request) { const raw = request.headers.get("Cookie") || ""; const m = raw.match(/(?:^|;\s*)aziel_session=([^;]+)/); return m ? m[1] : ""; }
function safeEq(a, b) { if (!a || !b || a.length !== b.length) return false; try { return timingSafeEqual(a, b); } catch { return false; } }
function masterRec(env) { try { return env.MASTER_HASH_JSON ? JSON.parse(env.MASTER_HASH_JSON) : null; } catch { return null; } }
function verifyMaster(password, rec) { if (!rec || rec.username !== MASTER_USERNAME) return false; const salt = fromB64(rec.salt_b64); const expected = fromB64(rec.hash_b64); const got = scryptSync(password, salt, rec.dklen || 32, { N: rec.n || 16384, r: rec.r || 8, p: rec.p || 1 }); return safeEq(got, expected); }
export async function getSession(env, request) { const token = readCookie(request); if (!token || !env.DB) return null; const row = await env.DB.prepare("SELECT * FROM sessions WHERE token=?").bind(token).first(); if (!row) return null; if (row.expires_utc && row.expires_utc < new Date().toISOString()) { await env.DB.prepare("DELETE FROM sessions WHERE token=?").bind(token).run(); return null; } return row; }
function formPage(title, inner) { return "<!doctype html><html><head><meta charset=utf-8><title>" + title + "</title><style>body{font-family:system-ui;background:#111;color:#eee;max-width:480px;margin:40px auto}input,button{padding:10px;margin:6px 0;width:100%;box-sizing:border-box}button{background:#c9a227;border:0;font-weight:700}</style></head><body>" + inner + "</body></html>"; }
export async function handleAuth(request, url, env) {
  const path = url.pathname;
  if (path === "/signup" && request.method === "GET") { return new Response(formPage("Sign up", "<h1>Sign up</h1><form method=post action=/signup><input name=username required placeholder=username><input name=password type=password required placeholder=password><button>Create account</button></form><p><a href=/login>Log in</a></p>"), { headers: { "Content-Type": "text/html; charset=utf-8" } }); }
  if (path === "/login" && request.method === "GET") { return new Response(formPage("Log in", "<h1>Log in</h1><form method=post action=/login><input name=username required placeholder=username><input name=password type=password required placeholder=password><button>Log in</button></form><p><a href=/signup>Sign up</a></p>"), { headers: { "Content-Type": "text/html; charset=utf-8" } }); }
  if (path === "/logout") { const token = readCookie(request); if (token && env.DB) await env.DB.prepare("DELETE FROM sessions WHERE token=?").bind(token).run(); return new Response(null, { status: 303, headers: { Location: "/", "Set-Cookie": clearCookie() } }); }
  if (path === "/signup" && request.method === "POST") {
    const form = await request.formData(); const username = String(form.get("username") || "").trim(); const password = String(form.get("password") || "");
    if (!username || username.length < 3 || !password) return json({ error: "username and password required" }, 400);
    if (username.toLowerCase() === MASTER_USERNAME.toLowerCase()) return json({ error: "username unavailable" }, 400);
    const salt = randomBytes(16); const hash = scryptSync(password, salt, SCRYPT.dklen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p }); const id = randomBytes(12).toString("hex");
    try { await env.DB.prepare("INSERT INTO users(id,username,salt_b64,hash_b64,n,r,p,dklen,role,hidden,created_utc) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(id, username, b64(salt), b64(hash), SCRYPT.N, SCRYPT.r, SCRYPT.p, SCRYPT.dklen, "user", 0, new Date().toISOString()).run(); } catch { return json({ error: "username unavailable" }, 400); }
    const token = randomBytes(24).toString("hex"); const exp = new Date(Date.now() + 7*864e5).toISOString();
    await env.DB.prepare("INSERT INTO sessions(token,user_id,username,role,expires_utc) VALUES(?,?,?,?,?)").bind(token, id, username, "user", exp).run();
    return new Response(null, { status: 303, headers: { Location: "/", "Set-Cookie": cookie(token) } });
  }
  if (path === "/login" && request.method === "POST") {
    const form = await request.formData(); const username = String(form.get("username") || "").trim(); const password = String(form.get("password") || "");
    let userId = "", role = "user", ok = false, sessionName = username;
    if (username === MASTER_USERNAME) { ok = verifyMaster(password, masterRec(env)); if (ok) { userId = "master"; role = "superadmin"; sessionName = "operator"; } }
    else { const row = await env.DB.prepare("SELECT * FROM users WHERE username=?").bind(username).first(); if (row) { const got = scryptSync(password, fromB64(row.salt_b64), row.dklen, { N: row.n, r: row.r, p: row.p }); ok = safeEq(got, fromB64(row.hash_b64)); if (ok) { userId = row.id; role = row.role || "user"; } } }
    if (!ok) return new Response(formPage("Log in", "<p>Login failed.</p><p><a href=/login>Try again</a></p>"), { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } });
    const token = randomBytes(24).toString("hex"); const exp = new Date(Date.now() + 7*864e5).toISOString();
    await env.DB.prepare("INSERT INTO sessions(token,user_id,username,role,expires_utc) VALUES(?,?,?,?,?)").bind(token, userId, sessionName, role, exp).run();
    return new Response(null, { status: 303, headers: { Location: "/", "Set-Cookie": cookie(token) } });
  }
  if (path === "/ingest" && request.method === "GET") { const s = await getSession(env, request); if (!s) return json({ error: "login required" }, 401); return new Response(formPage("Ingest", "<h1>Ingest</h1><form method=post action=/ingest><input name=title required placeholder=Title><textarea name=body rows=8 placeholder=Text style=width:100%></textarea><button>Preserve + index</button></form>"), { headers: { "Content-Type": "text/html; charset=utf-8" } }); }
  if (path === "/ingest" && request.method === "POST") { const s = await getSession(env, request); if (!s) return json({ error: "login required" }, 401); const form = await request.formData(); const title = String(form.get("title") || "").trim(); const body = String(form.get("body") || ""); if (!title) return json({ error: "title required" }, 400); const id = "AZDOC-" + randomBytes(6).toString("hex").toUpperCase(); const who = s.user_id === "master" ? "operator" : s.username; await env.DB.prepare("INSERT INTO records(record_id,title,body,created_by,created_utc) VALUES(?,?,?,?,?)").bind(id, title, body, who, new Date().toISOString()).run(); return new Response(null, { status: 303, headers: { Location: "/search" } }); }
  if (path === "/search" && request.method === "GET") { const q = (url.searchParams.get("q") || "").trim(); let rows = []; if (q) rows = (await env.DB.prepare("SELECT record_id, title, substr(body,1,280) AS snippet, created_utc FROM records WHERE title LIKE ? OR body LIKE ? ORDER BY created_utc DESC LIMIT 100").bind("%"+q+"%","%"+q+"%").all()).results || []; else rows = (await env.DB.prepare("SELECT record_id, title, substr(body,1,280) AS snippet, created_utc FROM records ORDER BY created_utc DESC LIMIT 100").all()).results || []; const items = rows.map(r => "<li><b>" + String(r.title).replace(/</g,"") + "</b> — " + String(r.snippet||"").replace(/</g,"") + "</li>").join("") || "<p>No corpus records match this view.</p>"; return new Response(formPage("Search", "<h1>Search</h1><form method=get action=/search><input name=q value=\"" + q.replace(/"/g,"") + "\"><button>Search</button></form><ul>" + items + "</ul><p><a href=/>Home</a></p>"), { headers: { "Content-Type": "text/html; charset=utf-8" } }); }
  if (request.method === "POST" && path !== "/login" && path !== "/signup") {
    const s = await getSession(env, request);
    if (!s) return json({ error: "login required" }, 401);
  }
  if (path === "/comments" && request.method === "POST") {
    const s = await getSession(env, request);
    const form = await request.formData();
    const body = String(form.get("body") || form.get("comment") || "");
    if (!body) return json({ error: "comment required" }, 400);
    await env.DB.prepare("INSERT INTO comments(id,body,created_by,created_utc) VALUES(?,?,?,?)").bind(randomBytes(12).toString("hex"), body, s.username, new Date().toISOString()).run();
    return json({ ok: true });
  }
  if (path === "/historical-import" && request.method === "POST") {
    const s = await getSession(env, request);
    if (s.role !== "superadmin") return json({ error: "forbidden" }, 403);
    return json({ ok: true, note: "historical import accepted" });
  }

  return null;
}
