import test from "node:test";
import assert from "node:assert/strict";
import { compareVersions, updatePayload, checkLibraryUpdate } from "./update-check.js";
import { handleRuntimeApi } from "./runtime.js";

test("compareVersions treats a higher patch as an update", () => {
  assert.equal(compareVersions("2.7.1", "2.7.0"), 1);
  assert.equal(compareVersions("2.7.0", "2.7.0"), 0);
  assert.equal(compareVersions("2.6.2", "2.7.0"), -1);
});

test("updatePayload flags update_available from latest vs current", () => {
  const same = updatePayload({ current: "2.7.0", latest: "2.7.0" });
  assert.equal(same.update_available, false);
  assert.equal(same.author, "Aziel Eliab");
  const newer = updatePayload({ current: "2.7.0", latest: "2.8.0", source: "runtime:/v1/update/check" });
  assert.equal(newer.update_available, true);
  assert.match(newer.runtime, /\/v1\/update\/check$/);
});

test("checkLibraryUpdate prefers runtime /v1/update/check", async () => {
  const env = {
    AZIEL_RUNTIME: {
      async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname.endsWith("/update/check")) {
          return new Response(JSON.stringify({
            latest: "2.8.0",
            download: "https://www.azielcorpuslibrary.net/download",
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
      },
    },
  };
  const doc = await checkLibraryUpdate(env, { slug: "aziel-corpus", version: "2.7.0" });
  assert.equal(doc.latest, "2.8.0");
  assert.equal(doc.update_available, true);
  assert.match(doc.source, /update\/check/);
});

test("GET /v1/update/check falls back to catalog product version", async () => {
  const env = {
    AZIEL_RUNTIME: {
      async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname.endsWith("/catalog.json")) {
          return new Response(JSON.stringify({
            version: "1.6.11",
            products: [{ slug: "aziel-corpus", name: "Aziel Digital Library", version: "2.7.0" }],
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
      },
    },
  };
  const url = new URL("https://www.azielcorpuslibrary.net/v1/update/check?slug=aziel-corpus&version=2.7.0");
  const res = await handleRuntimeApi(new Request(url, { method: "GET" }), url, env);
  assert.equal(res.status, 200);
  const doc = await res.json();
  assert.equal(doc.ok, true);
  assert.equal(doc.latest, "2.7.0");
  assert.equal(doc.update_available, false);
  assert.equal(doc.author, "Aziel Eliab");
});
