import test from "node:test";
import assert from "node:assert/strict";
import {
  bakedRuntimeStamp,
  pickRuntimeStamp,
  readSoftwareStamp,
  stampForHtmlCatalog,
  stampFromSoftwareDoc,
  stampFromSoftwareText,
} from "./runtime-cite-stamp.js";
import { citeDoc } from "./crawl.js";
import { runtimeSotPlain } from "./runtime-copy.js";
import { runtimeBody, softwareBody } from "./ui.js";

const LIVE = "{\"ok\":true,\"git_sha\":\"ce673365700d41fc604292ab2b92b1b1ca504016\",\"version_id\":\"eaf0b54c-1e5b-4d54-a582-25c5cdc09f92\",\"software\":[{\"slug\":\"peacelock\"}]}";

test("software prefix yields the live Softwares tip", () => {
  const stamp = stampFromSoftwareText(LIVE + "x".repeat(80000));
  assert.equal(stamp.git, "ce673365");
  assert.equal(stamp.git_full, "ce673365700d41fc604292ab2b92b1b1ca504016");
  assert.equal(stamp.version_id, "eaf0b54c-1e5b-4d54-a582-25c5cdc09f92");
  assert.equal(stamp.source, "live");
  assert.match(stamp.duty, /Cos LIVE restamp duty/);
});

test("a prefix reader stops before the rest of the catalog", async () => {
  const body = LIVE + "\n" + " ".repeat(200000);
  const stamp = await readSoftwareStamp(new Response(body, { status: 200, headers: { "Content-Type": "application/json" } }));
  assert.equal(stamp.git, "ce673365");
  assert.equal(stamp.version_id, "eaf0b54c-1e5b-4d54-a582-25c5cdc09f92");
});

test("retired outlet stamp loses to the bake", () => {
  const bake = bakedRuntimeStamp();
  assert.equal(bake.git, "ce673365");
  assert.equal(bake.version_id, "eaf0b54c-1e5b-4d54-a582-25c5cdc09f92");
  assert.equal(bake.source, "baked-fallback");
  const picked = pickRuntimeStamp(bake, {
    git: "231b02f",
    version_id: "a8f7fdc9",
  });
  assert.equal(picked.git, "ce673365");
  assert.equal(picked.source, "baked-fallback");
  assert.match(picked.duty, /GET \/v1\/mesh never enables/);
});

const HOLD = "1111111111111111111111111111111111111111";
const HOLD_VERSION = "11111111-1111-4111-8111-111111111111";
const TOP = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TOP_VERSION = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function softwareDoc(extra) {
  return JSON.stringify(Object.assign({
    ok: true,
    updated_at: "2026-11-09T00:00:00Z",
    version: "2.0.0-rc1",
    search_association: {
      tip_hold: {
        git_sha: HOLD,
        version_id: HOLD_VERSION,
        git_sha_source: "deploy_var",
        version_id_source: "cf_version_metadata",
      },
    },
    git_sha: TOP,
    git_sha_source: "deploy_var",
    git_sha_tracks_deployed_tip: true,
    deploy_lag: null,
    version_id: TOP_VERSION,
    version_id_source: "cf_version_metadata",
  }, extra));
}

test("top-level software git and version win over an earlier tip hold", () => {
  const stamp = stampFromSoftwareText(softwareDoc());
  assert.equal(stamp.git, "aaaaaaaa");
  assert.equal(stamp.git_full, TOP);
  assert.equal(stamp.version_id, TOP_VERSION);
  assert.notEqual(stamp.version_id, "2026-11-09T00:00:00Z");
  assert.equal(stamp.git_sha_source, "deploy_var");
  assert.equal(stamp.version_id_source, "cf_version_metadata");
  assert.equal(stamp.source, "live");
  assert.notEqual(stamp.git, HOLD.slice(0, 8));
});

test("a nested tip hold alone is not an observation", () => {
  const onlyHold = JSON.stringify({
    ok: true,
    search_association: { tip_hold: { git_sha: HOLD, version_id: HOLD_VERSION } },
  });
  assert.equal(stampFromSoftwareText(onlyHold), null);
});

test("a software tip that does not track the deploy, or carries lag, fails closed", () => {
  assert.equal(stampFromSoftwareText(softwareDoc({ git_sha_tracks_deployed_tip: false })), null);
  assert.equal(stampFromSoftwareText(softwareDoc({ deploy_lag: "behind" })), null);
  assert.equal(stampFromSoftwareText(softwareDoc({ version_id: "not-a-version" })), null);
});

test("a prefix reader keeps the top-level pair after a tip hold chunk", async () => {
  const hold = "{\"search_association\":{\"tip_hold\":{\"git_sha\":\"" + HOLD + "\",\"version_id\":\"" + HOLD_VERSION + "\"}},";
  const rest = softwareDoc().replace(/^\{/, "");
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode(hold));
      controller.enqueue(enc.encode(rest));
      controller.enqueue(enc.encode("\n" + " ".repeat(80000)));
      controller.close();
    },
  });
  const stamp = await readSoftwareStamp(new Response(stream, { status: 200, headers: { "Content-Type": "application/json" } }));
  assert.equal(stamp.git_full, TOP);
  assert.equal(stamp.version_id, TOP_VERSION);
  assert.notEqual(stamp.git, HOLD.slice(0, 8));
});

function assertFloor(stamp) {
  assert.equal(stamp.source, "baked-fallback");
  assert.equal(stamp.observed, false);
  assert.equal(stamp.current, false);
  assert.equal(stamp.floor, true);
  assert.equal(stamp.observed_at, null);
  assert.equal(stamp.git, "ce673365");
  assert.equal(stamp.git_full, "ce673365700d41fc604292ab2b92b1b1ca504016");
  assert.equal(stamp.version_id, "eaf0b54c-1e5b-4d54-a582-25c5cdc09f92");
  assert.match(stamp.duty, /ce673365 \/ eaf0b54c/);
  const cite = citeDoc(null, null, stamp);
  assert.equal(cite.runtime_git, stamp.git);
  assert.equal(cite.runtime_version_id, stamp.version_id);
  assert.equal(cite.runtime_stamp_source, "baked-fallback");
  assert.equal(cite.runtime_stamp_observed, false);
  assert.equal(cite.runtime_stamp_current, false);
  assert.equal(cite.runtime_stamp_floor, true);
  assert.equal(cite.runtime_stamp_observed_at, null);
  assert.equal(cite.runtime_launch.sot.live, false);
  assert.equal(cite.runtime_launch.sot.current, false);
  assert.equal(cite.runtime_launch.sot.floor, true);
  assert.equal(cite.runtime_launch.sot.git, "ce673365");
}

test("an unavailable software observation stays on the labelled baked floor", async () => {
  const { resolveRuntimeCiteStamp } = await import("./runtime-cite-stamp.js");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("origin down"); };
  try {
    const missing = await resolveRuntimeCiteStamp({
      AZIEL_RUNTIME: {
        async fetch() {
          return new Response(JSON.stringify({
            ok: true,
            search_association: { tip_hold: { git_sha: HOLD, version_id: HOLD_VERSION } },
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        },
      },
    }, { timeoutMs: 1000 });
    assertFloor(missing);

    const errored = await resolveRuntimeCiteStamp({
      AZIEL_RUNTIME: {
        async fetch() {
          return new Response("no", { status: 503 });
        },
      },
    }, { timeoutMs: 1000 });
    assertFloor(errored);

    const lagged = await resolveRuntimeCiteStamp({
      AZIEL_RUNTIME: {
        async fetch() {
          return new Response(softwareDoc({ deploy_lag: "behind" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      },
    }, { timeoutMs: 1000 });
    assertFloor(lagged);

    const timedOut = await resolveRuntimeCiteStamp({
      AZIEL_RUNTIME: {
        async fetch() {
          throw new Error("timeout");
        },
      },
    }, { timeoutMs: 20 });
    assertFloor(timedOut);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("human pages use the same floor, current, lag, and outlet words as the machine stamp", () => {
  const floorHtml = runtimeBody("2.0.0-rc1");
  const floorSoft = softwareBody({});
  for (const html of [floorHtml, floorSoft]) {
    assert.match(html, /SoT floor, not a fresh observation/);
    assert.match(html, /ce673365/);
    assert.match(html, /eaf0b54c-1e5b-4d54-a582-25c5cdc09f92/);
    assert.match(html, /observed_at unknown/);
    assert.doesNotMatch(html, /SoT LIVE/);
  }
  assert.match(floorSoft, /Lamb Lens/);
  assert.match(floorSoft, /Growth-ON/);

  const current = stampFromSoftwareText(softwareDoc());
  const currentHtml = runtimeBody("2.0.0-rc1", current);
  assert.match(currentHtml, /SoT current observation/);
  assert.match(currentHtml, /aaaaaaaa/);
  assert.match(currentHtml, /observed_at was not recorded/);
  assert.doesNotMatch(currentHtml, /SoT LIVE/);
  assert.doesNotMatch(currentHtml, /SoT floor/);
  const cite = citeDoc(null, null, current);
  assert.equal(cite.runtime_stamp_current, true);
  assert.equal(cite.runtime_stamp_floor, false);
  assert.equal(cite.runtime_launch.sot.live, true);

  assert.equal(stampFromSoftwareDoc({
    search_association: { tip_hold: { git_sha: HOLD, version_id: HOLD_VERSION } },
  }), null);
  const lagged = stampFromSoftwareDoc({
    git_sha: TOP,
    version_id: TOP_VERSION,
    git_sha_tracks_deployed_tip: false,
    deploy_lag: "behind",
    search_association: { tip_hold: { git_sha: HOLD, version_id: HOLD_VERSION } },
  });
  assert.equal(lagged, null);
  assert.match(runtimeSotPlain(lagged), /SoT floor, not a fresh observation/);

  const outlet = pickRuntimeStamp(bakedRuntimeStamp(), {
    git: "abcdef01",
    git_full: "abcdef0123456789abcdef0123456789abcdef01",
    version_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  });
  assert.equal(outlet.source, "outlet");
  assert.equal(outlet.current, false);
  assert.equal(outlet.floor, false);
  assert.match(runtimeSotPlain(outlet), /SoT outlet copy, not a fresh observation/);
  assert.match(softwareBody({ sot: outlet }), /SoT outlet copy, not a fresh observation/);
  const outletCite = citeDoc(null, { sot: { git: "abcdef01", git_full: "abcdef0123456789abcdef0123456789abcdef01", version_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" } }, null);
  assert.equal(outletCite.runtime_stamp_source, "outlet");
  assert.equal(outletCite.runtime_stamp_current, false);
  assert.equal(outletCite.runtime_stamp_observed, false);
  assert.equal(outletCite.runtime_launch.sot.live, false);

  const copy = stampForHtmlCatalog({ git_sha: TOP, version_id: TOP_VERSION, git_sha_tracks_deployed_tip: true, deploy_lag: null }, "cache");
  assert.equal(copy.source, "catalog-copy");
  assert.equal(copy.current, false);
  assert.match(runtimeSotPlain(copy), /not current forever/);
});

test("a newer outlet stamp still applies when the live read is down", () => {
  const picked = pickRuntimeStamp(bakedRuntimeStamp(), {
    git: "abcdef0",
    git_full: "abcdef0123456789abcdef0123456789abcdef01",
    version_id: null,
  });
  assert.equal(picked.source, "outlet");
  assert.equal(picked.git, "abcdef0");
  assert.equal(picked.version_id, null);
});
