import test from "node:test";
import assert from "node:assert/strict";
import { handleAuth } from "./auth.js";
import { guestSession, ingestRecord } from "./library.js";
import { homeBody, corpusBody, uploadBody, page } from "./ui.js";

const HOST = "https://www.azielcorpuslibrary.net";

function ingestPost(fields = {}, file) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  if (file) fd.set("file", file);
  const url = new URL(HOST + "/ingest");
  return {
    url,
    request: new Request(url, { method: "POST", body: fd }),
  };
}

test("homepage anonymous form requires a title and drops the file-optional label", () => {
  const home = homeBody({ rows: [], host: HOST });
  assert.doesNotMatch(home, /files in the libraries/);
  assert.match(home, /id="upload-anonymous"/);
  assert.match(home, /id="signup"/);
  assert.doesNotMatch(home, /File \(optional if you include title and notes\)/);
  assert.doesNotMatch(home, /Files go to Corpus \(Lamb Lens\)/);
  assert.doesNotMatch(home, /Safety review \(poison quarantine, triad\)/);
  assert.match(home, />Title <span class="req" aria-hidden="true">\*<\/span></);
  assert.match(home, /id="anon-title"[^>]*required/);
  assert.match(home, /<h2>Upload anonymously<\/h2>\s*<form method="post" action="\/ingest"/);
});

test("signed-in Corpus form also requires a title and drops the file-optional label", () => {
  const html = corpusBody({ signed: { username: "reader", role: "user" }, rows: [] });
  assert.doesNotMatch(html, /files in Corpus/);
  assert.doesNotMatch(html, /File \(optional if you include title and notes\)/);
  assert.match(html, />Title <span class="req" aria-hidden="true">\*<\/span></);
  assert.match(html, /id="corpus-title"[^>]*required/);
});

test("POST /ingest rejects missing or blank title before upload", async () => {
  const file = new File([new Uint8Array([1, 2, 3])], "note.bin", { type: "application/octet-stream" });
  const missing = ingestPost({ from: "home", body: "notes only" }, file);
  const missingRes = await handleAuth(missing.request, missing.url, {}, {});
  assert.equal(missingRes.status, 400);
  const missingHtml = await missingRes.text();
  assert.match(missingHtml, /Title is required/);
  assert.match(missingHtml, /id="upload-anonymous"/);
  assert.doesNotMatch(missingHtml, /Upload a file, or include both title and notes/);

  const blank = ingestPost({ from: "home", title: "   ", body: "notes" }, file);
  const blankRes = await handleAuth(blank.request, blank.url, {}, {});
  assert.equal(blankRes.status, 400);
  assert.match(await blankRes.text(), /Title is required/);
});

function sessionRequest(path, { method = "GET", cookie = "op-token", body } = {}) {
  const url = new URL(HOST + path);
  const headers = { Cookie: "aziel_session=" + cookie };
  const init = { method, headers };
  if (body) init.body = body;
  return { url, request: new Request(url, init) };
}

function sessionEnv(row) {
  return {
    DB: {
      prepare() {
        return {
          bind() { return this; },
          async first() { return row; },
          async run() { return {}; },
        };
      },
    },
  };
}

const OPERATOR_ROW = {
  user_id: "master",
  username: "operator",
  role: "superadmin",
  expires_utc: "2099-01-01T00:00:00Z",
};

const USER_ROW = {
  user_id: "u1",
  username: "reader",
  role: "user",
  expires_utc: "2099-01-01T00:00:00Z",
};

test("public nav2 includes a basic Upload tab to /upload", () => {
  const html = page("Upload", uploadBody({}), { signed: null, path: "/upload", kind: "upload" });
  assert.match(html, /<nav class="nav2 quiet"/);
  assert.match(html, /href="\/upload">Upload<\/a>/);
  assert.match(html, /class="authbar"/);
  assert.match(html, /href="\/login">Log in<\/a>/);
  assert.match(html, /href="\/signup">Sign up<\/a>/);
  assert.doesNotMatch(html, /class="nav-aziel" href="\/upload"/);
});

test("GET /upload is Corpus for anonymous and signed-in non-operator", async () => {
  const anonUrl = new URL(HOST + "/upload");
  const anon = await handleAuth(new Request(anonUrl), anonUrl, {}, {});
  assert.equal(anon.status, 200);
  const anonHtml = await anon.text();
  assert.match(anonHtml, /<h1>Upload<\/h1>/);
  assert.match(anonHtml, /Upload to Corpus/);
  assert.match(anonHtml, /No account required/);
  assert.match(anonHtml, /<form method="post" action="\/upload"/);
  assert.match(anonHtml, /id="upload-title"[^>]*required/);
  assert.doesNotMatch(anonHtml, /Upload to Aziel Library/);

  const user = sessionRequest("/upload");
  const userRes = await handleAuth(user.request, user.url, sessionEnv(USER_ROW), {});
  assert.equal(userRes.status, 200);
  assert.match(await userRes.text(), /Upload to Corpus/);
});

test("GET /upload is Aziel Library when operator is signed in", async () => {
  const op = sessionRequest("/upload");
  const res = await handleAuth(op.request, op.url, sessionEnv(OPERATOR_ROW), {});
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Upload to <span class="aziel-name">Aziel Library<\/span>/);
  assert.match(html, />Upload to Aziel Library</);
  assert.match(html, /<form method="post" action="\/upload"/);
  assert.doesNotMatch(html, /Upload to Corpus/);
});

test("GET /ingest redirects to the Upload tab", async () => {
  const url = new URL(HOST + "/ingest");
  const res = await handleAuth(new Request(url), url, {}, {});
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("Location"), "/upload");
});

test("POST /upload rejects a missing title for anonymous Corpus", async () => {
  const fd = new FormData();
  fd.set("file", new File([new Uint8Array([1])], "note.bin", { type: "application/octet-stream" }));
  const url = new URL(HOST + "/upload");
  const res = await handleAuth(new Request(url, { method: "POST", body: fd }), url, {}, {});
  assert.equal(res.status, 400);
  const html = await res.text();
  assert.match(html, /Title is required/);
  assert.match(html, /action="\/upload"/);
  assert.match(html, /Upload to Corpus/);
});

test("POST /upload requires a file when operator is signed in", async () => {
  const fd = new FormData();
  fd.set("title", "Operator note");
  const op = sessionRequest("/upload", { method: "POST", body: fd });
  const res = await handleAuth(op.request, op.url, sessionEnv(OPERATOR_ROW), {});
  assert.equal(res.status, 400);
  const html = await res.text();
  assert.match(html, /A file is required/);
  assert.match(html, /Upload to Aziel Library/);
});

test("anonymous ingestRecord rejects a missing title even when a file is present", async () => {
  const guest = guestSession();
  const file = new File([new Uint8Array([9])], "x.bin", { type: "application/octet-stream" });
  await assert.rejects(
    () => ingestRecord({}, { signed: guest, file, body: "notes" }),
    (err) => err && err.status === 400 && /Title is required/.test(err.message)
  );
});
