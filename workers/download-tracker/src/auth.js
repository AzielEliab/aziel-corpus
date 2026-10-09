import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { json, corsHeaders } from "./runtime.js";
import { page, pwField, azielLibraryBody, corpusBody, homeBody, uploadBody, streamLcpHtml } from "./ui.js";
import { LIBRARY_HUB_PATH } from "./film.js";
import { isOperator, ingestRecord, searchRecords, listFacets, facetsFromRows, parseBrowseParams, asFile, guestSession } from "./library.js";
import { extractEventsForRecord } from "./geo.js";
import { attachPermalinks, permalinksForRows } from "./paper-ux.js";
import { isQuotaError, isTransientOverload } from "./quota.js";
import { canonicalShelfCacheUrl, injectNotice, isCrawlerRequest, isSnapshotUnavailable, lastGoodUrl, LASTGOOD_CACHE_CONTROL, SHELF_EDGE_CACHE_CONTROL, SHELF_REVALIDATE_MS, snapshotRecords, staleNoticeHtml } from "./snapshot.js";
import { ocrIngestHint } from "./ocr.js";
import {
  collectStats,
  refreshPackedIndex,
  HTML_CACHE_CONTROL,
  HTML_EDGE_CACHE_CONTROL,
  htmlCacheUrl,
  cacheMatchText,
  cacheMatchTextAged,
  needsRevalidate,
  cachePutText,
  readPackedIndex,
  searchPackedRecords,
  shelfOf,
  statsFromPacked,
} from "./library-index.js";

function fileCountsFromStats(stats) {
  if (!stats) return {};
  return {
    records_packed: stats.records_packed,
    records_aziel: stats.records_aziel,
    records_corpus: stats.records_corpus,
  };
}

async function packedFileCounts(env) {
  try {
    return fileCountsFromStats(await collectStats(env));
  } catch {
    return {};
  }
}


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
  if (!headers["Cache-Control"]) {
    headers["Cache-Control"] = signed ? "private, no-store" : HTML_CACHE_CONTROL;
  }
  if (head) return new Response(null, { status, headers });
  return new Response(pageBody, { status, headers });
}
function loginGate(signed, message) {
  return html(page("Log in required", `<div class="card"><h2>Sign in</h2><p>${message}</p><p><a class="button" href="/login">Log in</a> <a class="button ghost" href="/signup">Sign up</a></p></div>`, { signed }), { status: 401, signed });
}
function renderUpload(signed, { error, status = 200, received, head } = {}) {
  const held = String(received || "") === "held";
  const msg = error || (held
    ? "Received. Safety review held this file off the public shelf. It is not deleted."
    : "");
  return html(page("Upload", uploadBody({ signed, error: msg }), { signed, path: "/upload", kind: "upload" }), { status, signed, head });
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
        await refreshPackedIndex(env);
      })().catch(() => {}));
    } else if (rec && rec.id) {
      if (rec.ocrHint) await ocrIngestHint(env, rec);
      await extractEventsForRecord(env, rec.id);
      try { await refreshPackedIndex(env); } catch { /* packed index */ }
    }
  } catch {
  }
}

async function renderShelfHtml(env, signed, browse, spec) {
  const [rows, facets, counts] = await Promise.all([
    searchRecords(env, {
      q: browse.q,
      library: spec.library,
      sort: browse.sort,
      author: browse.author,
      domain: browse.domain,
      subject: browse.subject,
      keyword: browse.keyword,
      limit: browse.limit,
      offset: browse.offset,
      includeQuarantine: spec.includeQuarantine,
    }),
    listFacets(env, { library: spec.library }),
    packedFileCounts(env),
  ]);
  const linked = await attachPermalinks(env, rows);
  const out = page(spec.title, spec.render({
    rows: linked,
    facets,
    ...browse,
    lib: spec.library,
    signed,
    ...counts,
  }), { signed, path: spec.path, kind: spec.kind });
  return { html: out, empty: !Array.isArray(rows) || rows.length === 0 };
}

/** Shelf from library:index:v1 only (no D1). Same filters, facets and counts; excerpts are not in the snapshot. */
async function renderShelfFromPacked(env, signed, browse, spec, { notice, cause } = {}) {
  const packed = await readPackedIndex(env);
  // Missing or zero-record index is unavailable, never an empty shelf.
  const records = snapshotRecords(packed);
  const all = searchPackedRecords(packed, {
    q: browse.q,
    library: spec.library,
    sort: browse.sort,
    author: browse.author,
    domain: browse.domain,
    subject: browse.subject,
    keyword: browse.keyword,
    limit: 500,
  });
  const offset = Math.max(0, Number(browse.offset) || 0);
  const rows = all.slice(offset, offset + (Number(browse.limit) || 48));
  const shelf = records.filter((r) => spec.library !== "aziel" && spec.library !== "corpus" ? true : shelfOf(r) === spec.library);
  const body = spec.render({
    rows: permalinksForRows(rows, records),
    facets: facetsFromRows(shelf),
    ...browse,
    lib: spec.library,
    signed,
    ...fileCountsFromStats(statsFromPacked(packed)),
  });
  const html = page(spec.title, body, { signed, path: spec.path, kind: spec.kind });
  return { html: notice ? injectNotice(html, staleNoticeHtml({ asOf: packed.ts, source: "snapshot", cause })) : html, asOf: packed.ts, empty: rows.length === 0 };
}

async function serveShelfPage(request, url, env, ctx, signed, spec) {
  const browse = parseBrowseParams(url);
  if (request.method === "HEAD") {
    return html("", { signed, head: true });
  }
  const crawler = !signed && isCrawlerRequest(request);
  const cacheUrl = canonicalShelfCacheUrl(spec.path, browse);
  // Crawlers (Amazonbot, GPTBot, Applebot...) walk every facet combination. They get the
  // packed snapshot, never a D1 render (that was ~800 D1 rows per uncached URL).
  const renderFresh = async () => (crawler
    ? await renderShelfFromPacked(env, signed, browse, spec)
    : await renderShelfHtml(env, signed, browse, spec));
  // Never cache or last-good-write an empty render.
  const store = (r) => (!r || r.empty || !r.html) ? Promise.resolve(null) : Promise.all([
    cachePutText(cacheUrl, r.html, undefined, { cacheControl: SHELF_EDGE_CACHE_CONTROL }),
    cachePutText(lastGoodUrl(cacheUrl), r.html, undefined, { cacheControl: LASTGOOD_CACHE_CONTROL }),
  ]).catch(() => null);
  if (!signed) {
    const aged = await cacheMatchTextAged(cacheUrl);
    if (aged && aged.text) {
      // Re-render at most once per SHELF_REVALIDATE_MS, never on every hit (CPU 1102, D1 reads).
      if (needsRevalidate(aged, SHELF_REVALIDATE_MS) && ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(renderFresh().then(store).catch(() => null));
      }
      return html(streamLcpHtml(aged.text), { signed, extraHeaders: { "Cache-Control": HTML_CACHE_CONTROL } });
    }
  }
  let rendered;
  try {
    rendered = await renderFresh();
  } catch (err) {
    if (!isQuotaError(err) && !isTransientOverload(err)) throw err;
    const cause = isQuotaError(err) ? "daily" : "outage";
    // D1 refused: packed snapshot with a stale label (unless the snapshot is what failed),
    // then a last-good copy, then 503 + Retry-After.
    if (!isSnapshotUnavailable(err)) {
      try {
        const snap = await renderShelfFromPacked(env, signed, browse, spec, { notice: true, cause });
        return html(streamLcpHtml(snap.html), { signed, extraHeaders: { "Cache-Control": "no-store", "X-Aziel-Stale": "snapshot; cause=" + cause + "; as-of=" + (snap.asOf || "") } });
      } catch { /* KV refused or snapshot missing/empty */ }
    }
    const saved = await cacheMatchTextAged(lastGoodUrl(cacheUrl));
    if (saved && saved.text) {
      const asOf = Number.isFinite(saved.ageMs) ? new Date(Date.now() - saved.ageMs).toISOString() : "";
      return html(streamLcpHtml(injectNotice(saved.text, staleNoticeHtml({ asOf, source: "lastgood", cause }))), { signed, extraHeaders: { "Cache-Control": "no-store", "X-Aziel-Stale": "lastgood; cause=" + cause + "; as-of=" + asOf } });
    }
    throw err;
  }
  if (!signed) {
    const put = store(rendered);
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(put);
    else await put;
  }
  return html(streamLcpHtml(rendered.html), { signed });
}

export async function handleAuth(request, url, env, ctx) {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const signed = await getSession(env, request);

  if (path === "/signup" && request.method === "GET") {
    return html(page("Sign up", `<div class="card"><h2>Sign up</h2><p class="muted">Create an account to post under a name. You can also <a href="/upload">upload</a> without an account. Corpus uploads are reviewed for safety before they appear. Aziel Library stays operator-only.</p><form method="post" action="/signup"><input name="username" required minlength="3" placeholder="username" autocomplete="username">${pwField("password")}<button>Create account</button></form><p><a href="/login">Log in</a></p></div>`, { signed }), { signed });
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
    return new Response(null, { status: 303, headers: { Location: LIBRARY_HUB_PATH, "Set-Cookie": cookie(token) } });
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
    return new Response(null, { status: 303, headers: { Location: LIBRARY_HUB_PATH, "Set-Cookie": cookie(token) } });
  }

  if (path === "/aziel-library" && (request.method === "GET" || request.method === "HEAD")) {
    return serveShelfPage(request, url, env, ctx, signed, {
      path: "/aziel-library",
      title: "Aziel Library",
      kind: "aziel-library",
      library: "aziel",
      includeQuarantine: isOperator(signed),
      render: (model) => azielLibraryBody(model),
    });
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
    return serveShelfPage(request, url, env, ctx, signed, {
      path: "/corpus",
      title: "Corpus library",
      kind: "corpus",
      library: "corpus",
      includeQuarantine: false,
      render: (model) => corpusBody(model),
    });
  }

  if (path === "/upload" && (request.method === "GET" || request.method === "HEAD")) {
    return renderUpload(signed, { received: url.searchParams.get("received"), head: request.method === "HEAD" });
  }
  if (path === "/upload" && request.method === "POST") {
    const form = await request.formData();
    const file = asFile(form.get("file"));
    const title = String(form.get("title") || "").trim();
    const body = String(form.get("body") || form.get("notes") || "");
    const meta = formMeta(form);
    if (isOperator(signed)) {
      if (!file) return renderUpload(signed, { error: "A file is required.", status: 400 });
      try {
        const rec = await ingestRecord(env, { signed, title, body, file, ...meta });
        await afterIngest(env, rec, ctx);
      } catch (err) {
        return renderUpload(signed, { error: err && err.message ? err.message : "Upload failed.", status: err && err.status ? err.status : 400 });
      }
      return new Response(null, { status: 303, headers: { Location: "/aziel-library" } });
    }
    const who = signed || guestSession();
    if (!title) return renderUpload(signed, { error: "Title is required.", status: 400 });
    try {
      const rec = await ingestRecord(env, { signed: who, title, body, file, ...meta });
      await afterIngest(env, rec, ctx);
      const held = rec && rec.quarantine_status && String(rec.quarantine_status).toUpperCase() !== "CLEAR";
      return new Response(null, { status: 303, headers: { Location: held ? "/upload?received=held" : "/record/" + rec.id } });
    } catch (err) {
      return renderUpload(signed, { error: err && err.message ? err.message : "Upload failed.", status: err && err.status ? err.status : 400 });
    }
  }

  if (path === "/ingest" && request.method === "GET") {
    return new Response(null, { status: 303, headers: { Location: "/upload" } });
  }
  if (path === "/ingest" && request.method === "POST") {
    if (isOperator(signed)) {
      return new Response(null, { status: 303, headers: { Location: "/aziel-library" } });
    }
    const who = signed || guestSession();
    const form = await request.formData();
    const fromHome = String(form.get("from") || "") === "home" || !signed;
    const file = asFile(form.get("file"));
    const title = String(form.get("title") || "").trim();
    const body = String(form.get("body") || form.get("notes") || "");
    const meta = formMeta(form);
    const homeErr = (message, status = 400) => html(page("Corpus Search", homeBody({ error: message, host: "https://www.azielcorpuslibrary.net" }), { signed, path: LIBRARY_HUB_PATH, kind: "search" }), { status, signed });
    if (!title) {
      if (fromHome) return homeErr("Title is required.");
      const rows = await searchRecords(env, { library: "corpus", limit: 300 });
      return html(page("Corpus library", corpusBody({ signed, rows, error: "Title is required." }), { signed }), { status: 400, signed });
    }
    try {
      const rec = await ingestRecord(env, { signed: who, title, body, file, ...meta });
      await afterIngest(env, rec, ctx);
      if (fromHome) {
        const held = rec && rec.quarantine_status && String(rec.quarantine_status).toUpperCase() !== "CLEAR";
        return new Response(null, { status: 303, headers: { Location: held ? LIBRARY_HUB_PATH + "?received=held#upload-anonymous" : "/record/" + rec.id } });
      }
    } catch (err) {
      const message = err && err.message ? err.message : "Upload failed.";
      if (fromHome) return homeErr(message, err && err.status ? err.status : 400);
      const rows = await searchRecords(env, { library: "corpus", limit: 300 });
      return html(page("Corpus library", corpusBody({ signed, rows, error: message }), { signed }), { status: err && err.status ? err.status : 400, signed });
    }
    return new Response(null, { status: 303, headers: { Location: "/corpus" } });
  }

  if (request.method === "POST") {
    const publicPosts = new Set(["/login", "/signup", "/event", "/ocr", "/transcribe", "/ingest", "/upload"]);
    if (!publicPosts.has(path) && !signed) return json({ error: "login required" }, 401);
  }
  return null;
}
