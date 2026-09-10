import test from "node:test";
import assert from "node:assert/strict";
import {
  LIMITS,
  OPERATOR_HEADER,
  bumpWindows,
  checkVisitorRate,
  emptyWindows,
  enforceRateLimit,
  isFanoutPath,
  isOperatorRequest,
  isRateExemptPath,
  isSeoBot,
  overLimit,
  pathClass,
  resetRateState,
  visitorIdFrom,
} from "./rate-limit.js";

function req(path, headers = {}, method = "GET") {
  return new Request("https://www.azielcorpuslibrary.net" + path, {
    method,
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

test("browse, search, records, and SEO docs are never content-rationed", () => {
  assert.equal(isRateExemptPath("/donate"), true);
  assert.equal(isRateExemptPath("/assets/donate/btc.png"), true);
  assert.equal(isRateExemptPath("/v1/health"), true);
  assert.equal(isRateExemptPath("/"), true);
  assert.equal(isRateExemptPath("/v1/search"), true);
  assert.equal(isRateExemptPath("/record/AZDOC-1"), true);
  assert.equal(isRateExemptPath("/robots.txt"), true);
  assert.equal(isRateExemptPath("/sitemap.xml"), true);
  assert.equal(isRateExemptPath("/llms.txt"), true);
  assert.equal(isRateExemptPath("/cite.json"), true);
  assert.equal(isRateExemptPath("/software"), true);
  assert.equal(isRateExemptPath("/AzielEliab"), true);
  assert.equal(pathClass("/"), "content");
  assert.equal(pathClass("/record/AZDOC-1"), "content");
  assert.equal(isFanoutPath("/event", "POST"), true);
  assert.equal(isFanoutPath("/v1/search", "GET"), false);
});

test("SEO Allow-list bots are never 429, including on fan-out", async () => {
  resetRateState();
  const cache = { store: new Map(), async match() { return undefined; }, async put() { return; } };
  for (const ua of ["Googlebot/2.1", "GPTBot", "ClaudeBot", "bingbot", "PerplexityBot", "Claude-SearchBot"]) {
    assert.equal(isSeoBot(req("/", { "User-Agent": ua })), true);
    const decision = await enforceRateLimit(req("/v1/verify-backfill", { "User-Agent": ua }), {}, {
      cache,
      nowMs: 1,
      path: "/v1/verify-backfill",
    });
    assert.equal(decision.ok, true);
    assert.equal(decision.seo, true);
    assert.ok(!decision.response);
  }
});

test("humans can search and read far past the old 30/120/800 ceilings", async () => {
  resetRateState();
  const cache = { store: new Map(), async match() { return undefined; }, async put() { return; } };
  const env = { DOWNLOADS: { async get() { return null; }, async put() {}, async list() { throw new Error("no list"); } } };
  let last;
  for (let i = 0; i < 90; i++) {
    last = await enforceRateLimit(req("/v1/search?q=Florence"), env, {
      cache,
      nowMs: 9_000,
      path: "/v1/search",
    });
  }
  assert.equal(last.ok, true);
  assert.equal(last.content, true);
  const home = await enforceRateLimit(req("/"), env, { cache, nowMs: 9_000, path: "/" });
  assert.equal(home.ok, true);
  const record = await enforceRateLimit(req("/record/AZDOC-1"), env, { cache, nowMs: 9_000, path: "/record/AZDOC-1" });
  assert.equal(record.ok, true);
});

test("soft bucket trips only after extreme fan-out abuse", () => {
  let w = emptyWindows(1_000);
  for (let i = 0; i < LIMITS.fanout_per_minute; i++) w = bumpWindows(w, 1_000);
  assert.equal(overLimit(w), null);
  w = bumpWindows(w, 1_000);
  const hit = overLimit(w);
  assert.equal(hit.class, "rate-soft");
  assert.equal(hit.window, "fanout_minute");
});

test("operator token skips fan-out; extreme abuse is 429 + last packed catalog", async () => {
  resetRateState();
  const cache = {
    store: new Map(),
    async match() { return undefined; },
    async put() { return; },
  };
  const env = { OPERATOR_TOKEN: "secret-operator-token" };
  assert.equal(isOperatorRequest(req("/", { [OPERATOR_HEADER]: "secret-operator-token" }), env, null), true);
  assert.equal(isOperatorRequest(req("/"), env, null), false);

  const headerOp = await checkVisitorRate(
    req("/v1/verify-backfill", { [OPERATOR_HEADER]: "secret-operator-token" }),
    env,
    { cache, nowMs: 5_000, path: "/v1/verify-backfill" }
  );
  assert.equal(headerOp.operator, true);

  const visitorEnv = { DOWNLOADS: { async get() { return null; }, async put() {}, async list() { throw new Error("no list"); } } };
  let last;
  for (let i = 0; i < LIMITS.fanout_per_minute + 1; i++) {
    last = await enforceRateLimit(req("/v1/verify-backfill"), visitorEnv, {
      cache,
      nowMs: 9_000,
      path: "/v1/verify-backfill",
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
  assert.match(body.note, /never blocked/i);
});

test("signed operator session skips the bucket without a public IP allowlist", async () => {
  const decision = await checkVisitorRate(req("/v1/verify-backfill"), {}, {
    signed: { user_id: "master", role: "superadmin" },
    path: "/v1/verify-backfill",
    nowMs: 1,
  });
  assert.equal(decision.operator, true);
});
