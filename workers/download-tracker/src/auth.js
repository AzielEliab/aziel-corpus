import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { json, corsHeaders } from "./runtime.js";
import { page, pwField, azielLibraryBody, corpusBody } from "./ui.js";
import { isOperator, ingestRecord, searchRecords, listFacets, parseBrowseParams, asFile } from "./library.js";
import { extractEventsForRecord } from "./geo.js";
import { ocrIngestHint } from "./ocr.js";


function formMeta(form) {
  return {
    author: String(form.get("author") || "").trim(),
    domain: String(form.get("domain") || "").trim(),
    subjects: String(form.get("subjects") || "").trim(),
    keywords: String(form.get("keywords") || "").trim(),
  };
}

const SCRYPT = { N: 16384, r: 8, p: 1, dklen: 32 };
function b64(buf) { return Buffer.from(buf).toString("base64"); }
function fromB64(s) { return Buffer.from(s, "base64"); }
function cookie(token) { return "aziel_session=" + token + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800"; }
function clearCookie() { return "aziel_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"; }
export function readCookie(request) {
  const raw = request.headers.get("Cookie") || "";
  const m = raw.match(/(?:^|;\s*)aziel_session=([^;]+)/);
  return m ? m[1] : "";
}
function safeEq(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  try { return timingSafeEqual(a, b); } catch { return false; }
}
function masterRec(env) {
  try { return env.MASTER_HASH_JSON ? JSON.parse(env.MASTER_HASH_JSON) : null; } catch { return null; }
}
function masterName(env) {
  const rec = masterRec(env);
  return rec && rec.username ? String(rec.username) : "";
}
function isMasterUsername(env, username) {
  const n = masterName(env);
  return !!(n && username && n.toLowerCase() === String(username).toLowerCase());
}
function verifyMaster(password, rec) {
  if (!rec || !rec.username || !rec.salt_b64 || !rec.hash_b64) return false;
  const salt = fromB64(rec.salt_b64);
  const expected = fromB64(rec.hash_b64);
  const got = scryptSync(password, salt, rec.dklen || 32, { N: rec.n || 16384, r: rec.r || 8, p: rec.p || 1 });
  return safeEq(got, expected);
}
function html(pageBody, { status = 200, signed, extraHeaders, head } = {}) {
  const headers = { "Content-Type": "text/html; charset=utf-8", ...corsHeaders(), ...(extraHeaders || {}) };
  if (head) return new Response(null, { status, headers });
  return new Response(pageBody, { status, headers });
}
function loginGate(signed, message) {
  return html(page("Log in required", `<div class="card"><h2>Sign in</h2><p>${message}</p><p><a class="button" href="/login">Log in</a> <a class="button ghost" href="/signup">Sign up</a></p></div>`, { signed }), { status: 401, signed });
}
export async function getSession(env, request) {
  const token = readCookie(request);
  if (!token || !env.DB) return null;
  const row = await env.DB.prepare("SELECT * FROM sessions WHERE token=?").bind(token).first();
  if (!row) return null;
  if (row.expires_utc && row.expires_utc < new Date().toISOString()) {
    await env.DB.prepare("DELETE FROM sessions WHERE token=?").bind(token).run();
    return null;
  }
  return row;
}

async function afterIngest(env, rec, ctx) {
  try {
    if (rec && rec.ocrHint && ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil((async () => {
        await ocrIngestHint(env, rec);
        await extractEventsForRecord(env, rec.id);
      })().catch(() => {}));
    } else if (rec && rec.id) {
      if (rec.ocrHint) await ocrIngestHint(env, rec);
      await extractEventsForRecord(env, rec.id);
    }
  } catch {
  }
}

export async function handleAuth(request, url, env, ctx) {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const signed = await getSession(env, request);

  if (path === "/signup" && request.method === "GET") {
    return html(page("Sign up", `<div class="card"><h2>Sign up</h2><p class="muted">Anyone can view. An account is required to post or ingest.</p><form method="post" action="/signup"><input name="username" required minlength="3" placeholder="username" autocomplete="username">${pwField("password")}<button>Create account</button></form><p><a href="/login">Log in</a></p></div>`, { signed }), { signed });
  }
  if (path === "/login" && request.method === "GET") {
    return html(page("Log in", `<div class="card"><h2>Log in</h2><form method="post" action="/login"><input name="username" required placeholder="username" autocomplete="username">${pwField("password")}<button>Log in</button></form><p><a href="/signup">Sign up</a></p></div>`, { signed }), { signed });
  }
  if (path === "/logout") {
    const token = readCookie(request);
    if (token && env.DB) await env.DB.prepare("DELETE FROM sessions WHERE token=?").bind(token).run();
    return new Response(null, { status: 303, headers: { Location: "/", "Set-Cookie": clearCookie() } });
  }
  if (path === "/signup" && request.method === "POST") {
    const form = await request.formData();
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");
    if (!username || username.length < 3 || !password) return json({ error: "username and password required" }, 400);
    if (isMasterUsername(env, username)) return json({ error: "username unavailable" }, 400);
    // role is always user; client-supplied role/superadmin is ignored.
    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, SCRYPT.dklen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
    const id = randomBytes(12).toString("hex");
    try {
      await env.DB.prepare("INSERT INTO users(id,username,salt_b64,hash_b64,n,r,p,dklen,role,hidden,created_utc) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
        .bind(id, username, b64(salt), b64(hash), SCRYPT.N, SCRYPT.r, SCRYPT.p, SCRYPT.dklen, "user", 0, new Date().toISOString()).run();
    } catch { return json({ error: "username unavailable" }, 400); }
    const token = randomBytes(24).toString("hex");
    const exp = new Date(Date.now() + 7 * 864e5).toISOString();
    await env.DB.prepare("INSERT INTO sessions(token,user_id,username,role,expires_utc) VALUES(?,?,?,?,?)").bind(token, id, username, "user", exp).run();
    return new Response(null, { status: 303, headers: { Location: "/", "Set-Cookie": cookie(token) } });
  }
  if (path === "/login" && request.method === "POST") {
    const form = await request.formData();
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");
    let userId = "", role = "user", ok = false, sessionName = username;
    const rec = masterRec(env);
    if (isMasterUsername(env, username)) {
      ok = verifyMaster(password, rec);
      if (ok) { userId = "master"; role = "superadmin"; sessionName = "operator"; }
    } else {
      const row = await env.DB.prepare("SELECT * FROM users WHERE username=?").bind(username).first();
      if (row) {
        const got = scryptSync(password, fromB64(row.salt_b64), row.dklen, { N: row.n, r: row.r, p: row.p });
        ok = safeEq(got, fromB64(row.hash_b64));
        if (ok) { userId = row.id; role = row.role || "user"; }
      }
    }
    if (!ok) {
      return html(page("Log in", `<div class="card"><p class="bad">Login failed.</p><p><a class="button" href="/login">Try again</a></p></div>`, { signed: null }), { status: 401, signed: null });
    }
    const token = randomBytes(24).toString("hex");
    const exp = new Date(Date.now() + 7 * 864e5).toISOString();
    await env.DB.prepare("INSERT INTO sessions(token,user_id,username,role,expires_utc) VALUES(?,?,?,?,?)").bind(token, userId, sessionName, role, exp).run();
    return new Response(null, { status: 303, headers: { Location: "/", "Set-Cookie": cookie(token) } });
  }

  if (path === "/aziel-library" && (request.method === "GET" || request.method === "HEAD")) {
    const browse = parseBrowseParams(url);
    const rows = request.method === "HEAD" ? [] : await searchRecords(env, { q: browse.q, library: "aziel", sort: browse.sort, author: browse.author, domain: browse.domain, subject: browse.subject, keyword: browse.keyword, limit: 300 });
    const facets = request.method === "HEAD" ? {} : await listFacets(env, { library: "aziel" });
    return html(page("Aziel Library", azielLibraryBody({ rows, facets, ...browse, lib: "aziel", signed }), { signed, path: "/aziel-library", kind: "aziel-library" }), { signed, head: request.method === "HEAD" });
  }
  if (path === "/aziel-library" && request.method === "POST") {
    if (!signed) return loginGate(signed, "Operator sign-in is required for Aziel Library upload.");
    if (!isOperator(signed)) {
      return html(page("Forbidden", `<div class="card"><h2>Forbidden</h2><p>Aziel Library upload is for the operator.</p></div>`, { signed }), { status: 403, signed });
    }
    const form = await request.formData();
    const file = asFile(form.get("file"));
    const title = String(form.get("title") || "").trim();
    const notes = String(form.get("notes") || form.get("body") || "");
    const meta = formMeta(form);
    if (!file) {
      const rows = await searchRecords(env, { library: "aziel", limit: 300 });
      return html(page("Aziel Library", azielLibraryBody({ rows, error: "A file is required.", signed }), { signed }), { status: 400, signed });
    }
    try {
      const rec = await ingestRecord(env, { signed, title, body: notes, file, ...meta });
      await afterIngest(env, rec, ctx);
    } catch (err) {
      const rows = await searchRecords(env, { library: "aziel", limit: 300 });
      return html(page("Aziel Library", azielLibraryBody({ rows, error: err && err.message ? err.message : "Upload failed.", signed }), { signed }), { status: err && err.status ? err.status : 400, signed });
    }
    return new Response(null, { status: 303, headers: { Location: "/aziel-library" } });
  }

  if (path === "/corpus" && (request.method === "GET" || request.method === "HEAD")) {
    const browse = parseBrowseParams(url);
    const rows = request.method === "HEAD" ? [] : await searchRecords(env, { q: browse.q, library: "corpus", sort: browse.sort, author: browse.author, domain: browse.domain, subject: browse.subject, keyword: browse.keyword, limit: 300 });
    const facets = request.method === "HEAD" ? {} : await listFacets(env, { library: "corpus" });
    return html(page("Corpus library", corpusBody({ signed, rows, facets, ...browse, lib: "corpus" }), { signed, path: "/corpus", kind: "corpus" }), { signed, head: request.method === "HEAD" });
  }

  if (path === "/ingest" && request.method === "GET") {
    if (isOperator(signed)) {
      return new Response(null, { status: 303, headers: { Location: "/aziel-library" } });
    }
    if (!signed) return loginGate(signed, "Anyone can view. Posting needs an account.");
    const browse = parseBrowseParams(url);
    const rows = await searchRecords(env, { q: browse.q, library: "corpus", sort: browse.sort, author: browse.author, domain: browse.domain, subject: browse.subject, keyword: browse.keyword, limit: 300 });
    const facets = await listFacets(env, { library: "corpus" });
    return html(page("Corpus library", corpusBody({ signed, rows, facets, ...browse, lib: "corpus" }), { signed, path: "/corpus", kind: "corpus" }), { signed });
  }
  if (path === "/ingest" && request.method === "POST") {
    if (!signed) return json({ error: "login required" }, 401);
    if (isOperator(signed)) {
      return new Response(null, { status: 303, headers: { Location: "/aziel-library" } });
    }
    const form = await request.formData();
    const file = asFile(form.get("file"));
    const title = String(form.get("title") || "").trim();
    const body = String(form.get("body") || form.get("notes") || "");
    const meta = formMeta(form);
    if (!file && !(title && body)) {
      const rows = await searchRecords(env, { library: "corpus", limit: 300 });
      return html(page("Corpus library", corpusBody({ signed, rows, error: "Upload a file, or include both title and notes." }), { signed }), { status: 400, signed });
    }
    try {
      const rec = await ingestRecord(env, { signed, title, body, file, ...meta });
      await afterIngest(env, rec, ctx);
    } catch (err) {
      const rows = await searchRecords(env, { library: "corpus", limit: 300 });
      return html(page("Corpus library", corpusBody({ signed, rows, error: err && err.message ? err.message : "Upload failed." }), { signed }), { status: err && err.status ? err.status : 400, signed });
    }
    return new Response(null, { status: 303, headers: { Location: "/corpus" } });
  }

  if (request.method === "POST") {
    const publicPosts = new Set(["/login", "/signup", "/event", "/ocr", "/transcribe", "/ingest"]);
    if (!publicPosts.has(path) && !signed) return json({ error: "login required" }, 401);
  }
  return null;
}
