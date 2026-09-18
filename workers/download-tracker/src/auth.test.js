import test from "node:test";
import assert from "node:assert/strict";
import { handleAuth } from "./auth.js";
import { guestSession, ingestRecord } from "./library.js";
import { homeBody, corpusBody } from "./ui.js";

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

test("anonymous ingestRecord rejects a missing title even when a file is present", async () => {
  const guest = guestSession();
  const file = new File([new Uint8Array([9])], "x.bin", { type: "application/octet-stream" });
  await assert.rejects(
    () => ingestRecord({}, { signed: guest, file, body: "notes" }),
    (err) => err && err.status === 400 && /Title is required/.test(err.message)
  );
});
