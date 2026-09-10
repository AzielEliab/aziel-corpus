import test from "node:test";
import assert from "node:assert/strict";
import { donateBody, donateHtml, donateTouchesStorage, handleDonate, publishedNetworks, DONATE_NETWORKS } from "./donate.js";
import worker from "./index.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|10\.5281\/zenodo|support my custody/i;

function forbiddenEnv() {
  const boom = async () => {
    throw new Error("donate must not touch KV or D1");
  };
  return {
    DOWNLOADS: { get: boom, put: boom, list: boom },
    DB: { prepare() { throw new Error("donate must not touch D1"); } },
    FILES: { get: boom, put: boom },
  };
}

test("donate body is static and does not invent wallets", () => {
  assert.equal(publishedNetworks(DONATE_NETWORKS).length, 0);
  const html = donateBody();
  assert.match(html, /Donate/);
  assert.match(html, /Aziel Eliab/);
  assert.match(html, /does not invent wallet addresses/);
  assert.doesNotMatch(html, /bc1[a-z0-9]+/i);
  assert.doesNotMatch(html, /0x[a-f0-9]{40}/i);
  assert.doesNotMatch(html, BANNED);
  assert.equal(donateTouchesStorage(forbiddenEnv()), false);
});

test("handleDonate never reads env and stays Aziel Eliab only", async () => {
  const res = handleDonate(new Request("https://www.azielcorpuslibrary.net/donate", { headers: { Accept: "text/html" } }));
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Donate/);
  assert.match(html, /href="\/donate"/);
  assert.match(html, /donate-strip/);
  assert.match(html, /cycle cap/);
  assert.match(html, /Aziel Eliab/);
  assert.match(html, /royal|#6b3fa0|Aziel Library/);
  assert.doesNotMatch(html, BANNED);
});

test("GET /donate on the Worker does not touch KV", async () => {
  const res = await worker.fetch(
    new Request("https://www.azielcorpuslibrary.net/donate", { headers: { Accept: "text/html" } }),
    forbiddenEnv(),
    {}
  );
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Donate/);
  assert.match(donateHtml(), /Donate/);
});
