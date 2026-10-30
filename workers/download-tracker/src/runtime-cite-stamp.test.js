import test from "node:test";
import assert from "node:assert/strict";
import {
  bakedRuntimeStamp,
  pickRuntimeStamp,
  readSoftwareStamp,
  stampFromSoftwareText,
} from "./runtime-cite-stamp.js";

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
