import test from "node:test";
import assert from "node:assert/strict";
import {
  LIMITS,
  OPERATOR_HEADER,
  bumpWindows,
  checkVisitorRate,
  emptyWindows,
  enforceRateLimit,
  isOperatorRequest,
  isRateExemptPath,
  overLimit,
  pathClass,
  resetRateState,
  visitorIdFrom,
} from "./rate-limit.js";

function req(path, headers = {}) {
  return new Request("https://www.azielcorpuslibrary.net" + path, {
    headers: Object.assign({ "CF-Connecting-IP": "203.0.113.9", Accept: "application/json" }, headers),
  });
}

test("visitor id is SHA-256 of the connecting IP and is not the raw IP", () => {
  const withCookie = visitorIdFrom(req("/", { Cookie: "aziel_vid=abc" }), "abc");
  const without = visitorIdFrom(req("/"), "");
  assert.match(withCookie, /^[0-9a-f]{64}$/);
  assert.equal(withCookie, without);
  assert.doesNotMatch(withCookie, /203\.0\.113\.9/);
});

test("donate and health are rate-exempt", () => {
  assert.equal(isRateExemptPath("/donate"), true);
  assert.equal(isRateExemptPath("/v1/health"), true);
  assert.equal(isRateExemptPath("/"), false);
  assert.equal(pathClass("/"), "search");
  assert.equal(pathClass("/record/AZDOC-1"), "record");
});

test("soft bucket trips at 61 requests per minute", () => {
  let w = emptyWindows(1_000);
  for (let i = 0; i < LIMITS.minute; i++) w = bumpWindows(w, 1_000, "read");
  assert.equal(overLimit(w), null);
  w = bumpWindows(w, 1_000, "read");
  const hit = overLimit(w);
  assert.equal(hit.class, "rate-soft");
  assert.equal(hit.window, "minute");
});

test("search window is 30 per minute (TUN-WP-0.1)", () => {
  let w = emptyWindows(1_000);
  for (let i = 0; i < 30; i++) w = bumpWindows(w, 1_000, "search");
  assert.equal(overLimit(w), null);
  w = bumpWindows(w, 1_000, "search");
  assert.equal(overLimit(w).window, "search_minute");
});

test("operator token skips the bucket; visitor is 429 + catalog", async () => {
  resetRateState();
  const cache = {
    store: new Map(),
    async match() { return undefined; },
    async put() { return; },
  };
  const env = { OPERATOR_TOKEN: "secret-operator-token" };
  assert.equal(isOperatorRequest(req("/", { [OPERATOR_HEADER]: "secret-operator-token" }), env, null), true);
  assert.equal(isOperatorRequest(req("/"), env, null), false);

  const op = await checkVisitorRate(req("/v1/search"), env, {
    cache,
    nowMs: 5_000,
    path: "/v1/search",
  });
  assert.equal(op.ok, true);
  const headerOp = await checkVisitorRate(
    req("/v1/search", { [OPERATOR_HEADER]: "secret-operator-token" }),
    env,
    { cache, nowMs: 5_000, path: "/v1/search" }
  );
  assert.equal(headerOp.operator, true);

  const visitorEnv = { DOWNLOADS: { async get() { return null; }, async put() {}, async list() { throw new Error("no list"); } } };
  let last;
  for (let i = 0; i < 32; i++) {
    last = await enforceRateLimit(req("/v1/search"), visitorEnv, {
      cache,
      nowMs: 9_000,
      path: "/v1/search",
    });
  }
  assert.equal(last.ok, false);
  assert.equal(last.class, "rate-soft");
  assert.equal(last.response.status, 429);
  assert.equal(last.response.headers.get("Retry-After"), "30");
  const body = await last.response.json();
  assert.equal(body.code, "rate-soft");
  assert.ok(body.catalog);
  assert.equal(body.author, "Aziel Eliab");
});

test("signed operator session skips the bucket without a public IP allowlist", async () => {
  const decision = await checkVisitorRate(req("/"), {}, {
    signed: { user_id: "master", role: "superadmin" },
    path: "/",
    nowMs: 1,
  });
  assert.equal(decision.operator, true);
});
