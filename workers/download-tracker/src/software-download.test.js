import test from "node:test";
import assert from "node:assert/strict";
import {
  softwareDownloadDoc,
  serveSoftwareAsset,
  handleV1Download,
  DEFAULT_ASSET,
  LEGACY_ASSET,
} from "./software-download.js";
import { handleRuntimeApi } from "./runtime.js";

const HOST = "https://www.azielcorpuslibrary.net";

test("softwareDownloadDoc is an honest 2xx catalog descriptor", () => {
  const up = softwareDownloadDoc({ available: true, asset: DEFAULT_ASSET });
  assert.equal(up.ok, true);
  assert.equal(up.available, true);
  assert.equal(up.download_url, HOST + "/download");
  assert.equal(up.v1_download, HOST + "/v1/download");
  assert.equal(up.author, "Aziel Eliab");
  const down = softwareDownloadDoc({ available: false, status: 404 });
  assert.equal(down.ok, true);
  assert.equal(down.available, false);
  assert.match(down.note, /not hosted|GitHub/i);
});

test("GET /v1/download returns 200 JSON without touching ASSETS", async () => {
  const url = new URL(HOST + "/v1/download");
  const res = handleV1Download(new Request(url, { headers: { Accept: "application/json" } }), url);
  assert.ok(res);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.download_url, HOST + "/download");
  assert.equal(body.asset, DEFAULT_ASSET);
  assert.ok(body.allowed.includes(LEGACY_ASSET));
});

test("serveSoftwareAsset streams a hosted zip and is honest 200 when missing", async () => {
  const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 1, 2, 3]);
  const env = {
    ASSETS: {
      async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname.endsWith("/" + DEFAULT_ASSET)) {
          return new Response(zip, {
            status: 200,
            headers: { "Content-Type": "application/zip", "Content-Length": String(zip.byteLength) },
          });
        }
        return new Response("no", { status: 404 });
      },
    },
  };
  const got = await serveSoftwareAsset(new Request(HOST + "/download"), env, DEFAULT_ASSET);
  assert.equal(got.status, 200);
  assert.match(got.headers.get("content-type"), /zip/);
  assert.equal(got.headers.get("x-aziel-download"), "stream");
  assert.equal(new Uint8Array(await got.arrayBuffer()).byteLength, zip.byteLength);

  const missing = await serveSoftwareAsset(
    new Request(HOST + "/download"),
    { ASSETS: { async fetch() { return new Response("no", { status: 404 }); } } },
    DEFAULT_ASSET
  );
  assert.equal(missing.status, 200);
  const doc = await missing.json();
  assert.equal(doc.ok, true);
  assert.equal(doc.available, false);
  assert.equal(doc.download_url, HOST + "/download");
});

test("handleRuntimeApi GET /v1/download is 200", async () => {
  const res = await handleRuntimeApi(
    new Request(HOST + "/v1/download", { headers: { Accept: "application/json" } }),
    new URL(HOST + "/v1/download"),
    {}
  );
  assert.ok(res);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.match(body.download_url, /\/download$/);
});
