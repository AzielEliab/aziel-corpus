import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTHOR,
  PRESENCE_KEY,
  PRESENCE_SPEC,
  PRESENCE_TTL_MS,
  commitPreparedViewer,
  emptyPresenceDoc,
  handlePresenceApi,
  isHtmlViewerPath,
  isHumanPageViewer,
  isMachinePath,
  isPrefetchRequest,
  isPresencePath,
  mergeLiveNodes,
  prepareViewerCookie,
  prunePresenceDoc,
  readPageViewers,
  runtimeAggregatesPageViewers,
  sitePresenceBody,
  publishSitePresence,
  SITE_PRESENCE_HOST,
  SITE_PRESENCE_KIND,
  SITE_PRESENCE_PATH,
  touchPageViewer,
} from "./presence.js";
import { decorateMeshDoc, liveNodesCount, nodesCount } from "./mesh.js";

const HOST = "https://www.azielcorpuslibrary.net";

function req(path, extra = {}) {
  const headers = extra.headers || {};
  return new Request(HOST + path, {
    method: extra.method || "GET",
    headers: {
      "User-Agent": extra.ua || "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0.0.0",
      ...headers,
    },
    body: extra.body,
  });
}

function silentRuntime() {
  return {
    async fetch() {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  };
}

function throwingListKv(store = new Map()) {
  return {
    store,
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
    async list() {
      throw new Error("KV.list forbidden on hot path");
    },
  };
}

test("presence paths: HTML pages yes, machine/mesh no", () => {
  assert.equal(isPresencePath("/v1/presence"), true);
  assert.equal(isPresencePath("/v1/presence/"), true);
  assert.equal(isHtmlViewerPath("/"), true);
  assert.equal(isHtmlViewerPath("/software"), true);
  assert.equal(isHtmlViewerPath("/record/AZDOC-1"), true);
  assert.equal(isHtmlViewerPath("/v1/presence"), true);
  assert.equal(isHtmlViewerPath("/v1/mesh"), false);
  assert.equal(isHtmlViewerPath("/v1/mesh/status"), false);
  assert.equal(isMachinePath("/v1/mesh/status"), true);
  assert.equal(isMachinePath("/robots.txt"), true);
  assert.equal(isMachinePath("/download"), true);
});

test("bots, empty UA, prefetch, and SEO do not count as human viewers", () => {
  assert.equal(isHumanPageViewer(req("/", { headers: { "User-Agent": "Googlebot/2.1" } }), "/").ok, false);
  assert.equal(isHumanPageViewer(req("/", { headers: { "User-Agent": "curl/8.0" } }), "/").ok, false);
  assert.equal(isHumanPageViewer(req("/", { headers: { "User-Agent": "" }, ua: "" }), "/").ok, false);
  assert.equal(isHumanPageViewer(req("/", { headers: { "User-Agent": "python-requests/2.32" } }), "/").ok, false);
  const prefetch = req("/", { headers: { "Sec-Purpose": "prefetch", "User-Agent": "Mozilla/5.0 Chrome/128.0.0.0" } });
  assert.equal(isPrefetchRequest(prefetch), true);
  assert.equal(isHumanPageViewer(prefetch, "/").ok, false);
  assert.equal(isHumanPageViewer(req("/v1/mesh/status"), "/v1/mesh/status").ok, false);
  assert.equal(isHumanPageViewer(req("/"), "/").ok, true);
});

test("packed presence: same vid is one viewer; expire drops; no KV.list", async () => {
  const kv = throwingListKv();
  const env = { DOWNLOADS: kv, AZIEL_RUNTIME: silentRuntime() };
  const now = Date.now();
  const a = req("/", { headers: { Cookie: "aziel_vid=viewer-aaaa-1111", "User-Agent": "Mozilla/5.0 Chrome/128.0.0.0" } });
  const first = await touchPageViewer(env, a, { path: "/", nowMs: now });
  assert.equal(first.counted, true);
  assert.equal(first.page_viewers, 1);
  const again = await touchPageViewer(env, a, { path: "/", nowMs: now + 1000 });
  assert.equal(again.page_viewers, 1);
  const b = req("/", { headers: { Cookie: "aziel_vid=viewer-bbbb-2222", "User-Agent": "Mozilla/5.0 Chrome/128.0.0.0" } });
  const second = await touchPageViewer(env, b, { path: "/", nowMs: now + 2000 });
  assert.equal(second.page_viewers, 2);
  const bot = await touchPageViewer(env, req("/", { ua: "GPTBot/1.0" }), { path: "/", nowMs: now + 3000 });
  assert.equal(bot.counted, false);
  assert.equal(bot.page_viewers, 2);
  const later = prunePresenceDoc(JSON.parse(kv.store.get(PRESENCE_KEY)), now + 2000 + PRESENCE_TTL_MS + 1);
  assert.equal(later.count, 0);
  const local = await readPageViewers(env, now + 2000 + PRESENCE_TTL_MS + 1);
  assert.equal(local.page_viewers, 0);
  assert.equal(local.invent_users, false);
  assert.equal(emptyPresenceDoc().spec, PRESENCE_SPEC);
  assert.equal(AUTHOR, "Aziel Eliab");
});

test("prepare cookie then commit uses the same id (no double mint)", async () => {
  const kv = throwingListKv();
  const env = { DOWNLOADS: kv, AZIEL_RUNTIME: silentRuntime() };
  const request = req("/");
  const prep = prepareViewerCookie(request, "/");
  assert.equal(prep.counted, true);
  assert.ok(prep.id);
  assert.ok(prep.setCookie);
  const committed = await commitPreparedViewer(env, prep);
  assert.equal(committed.page_viewers, 1);
  const again = await commitPreparedViewer(env, prep);
  assert.equal(again.page_viewers, 1);
});

test("GET/POST /v1/presence: human heartbeats; bots do not inflate", async () => {
  const kv = throwingListKv();
  const env = { DOWNLOADS: kv, AZIEL_RUNTIME: silentRuntime() };
  const human = req("/v1/presence", {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 Chrome/128.0.0.0",
      Cookie: "aziel_vid=viewer-cccc-3333",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const res = await handlePresenceApi(human, new URL(HOST + "/v1/presence"), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.counted, true);
  assert.equal(body.page_viewers, 1);
  assert.equal(body.bot_inflation, false);
  const bot = await handlePresenceApi(
    req("/v1/presence", { method: "POST", ua: "curl/8.0", body: "{}" }),
    new URL(HOST + "/v1/presence"),
    env
  );
  const botBody = await bot.json();
  assert.equal(botBody.counted, false);
  assert.equal(botBody.page_viewers, 1);
  const get = await handlePresenceApi(req("/v1/presence"), new URL(HOST + "/v1/presence"), env);
  const got = await get.json();
  assert.equal(got.page_viewers, 1);
  assert.match(got.note, /2026-09-21/);
});

test("merge Live Nodes: add local viewers unless runtime already aggregates", () => {
  assert.equal(runtimeAggregatesPageViewers({ human_mesh_users: 0, live_nodes: 0 }), false);
  assert.equal(runtimeAggregatesPageViewers({ page_viewers: 3, live_nodes: 3 }), true);
  assert.equal(runtimeAggregatesPageViewers({ page_viewers_source: "library-presence", page_viewers: 2 }), false);
  const local = mergeLiveNodes({ human_mesh_users: 2, human_uses: 99, live_nodes: 2, live_nodes_plane: "human-mesh-users" }, { page_viewers: 3 });
  assert.equal(local.live_nodes, 5);
  assert.equal(local.page_viewers, 3);
  assert.equal(local.double_count, false);
  const ssot = mergeLiveNodes({
    human_mesh_users: 1,
    live_nodes: 6,
    page_viewers: 5,
    live_nodes_plane: "human-mesh-users-page-viewers",
    live_nodes_components: { page_viewers: 5, human_mesh_users: 1 },
  }, { page_viewers: 40 });
  assert.equal(ssot.live_nodes, 6);
  assert.equal(ssot.aggregated, true);
  assert.equal(liveNodesCount({ human_mesh_users: 2, human_uses: 50 }, { page_viewers: 1 }), 3);
  assert.equal(nodesCount({ human_mesh_users: 2, human_uses: 50 }), 52);
  const decorated = decorateMeshDoc(
    { enabled: true, live_nodes_plane: "human-mesh-users", live_nodes: 0, human_mesh_users: 0, human_uses: 12 },
    { page_viewers: { page_viewers: 4, count: 4 } }
  );
  assert.equal(decorated.live_nodes, 4);
  assert.equal(decorated.page_viewers, 4);
  assert.equal(decorated.nodes_count, 12);
  assert.equal(decorated.page_viewers_source, "library-presence");
  assert.equal(runtimeAggregatesPageViewers({ site_live_viewers: 0, live_nodes: 0, includes_site_viewers: true }), true);
  assert.equal(runtimeAggregatesPageViewers({ live_nodes_plane: "human-mesh-users-site-viewers", live_nodes: 9 }), true);
  const fleet = mergeLiveNodes({
    human_mesh_users: 1,
    live_nodes: 8,
    site_live_viewers: 7,
    includes_site_viewers: true,
    live_nodes_plane: "human-mesh-users-site-viewers",
  }, { page_viewers: 7 });
  assert.equal(fleet.live_nodes, 8);
  assert.equal(fleet.aggregated, true);
  assert.notEqual(fleet.live_nodes, 1 + 7 + 7);
});

test("site-presence body is fail-closed; POST goes to runtime binding", async () => {
  assert.deepEqual(sitePresenceBody(4), {
    host: SITE_PRESENCE_HOST,
    viewers: 4,
    kind: SITE_PRESENCE_KIND,
  });
  assert.equal(sitePresenceBody(-1), null);
  assert.equal(sitePresenceBody(1.5), null);
  assert.equal(sitePresenceBody("nope"), null);
  assert.equal(sitePresenceBody(true), null);
  const posts = [];
  const env = {
    DOWNLOADS: throwingListKv(),
    AZIEL_RUNTIME: {
      async fetch(request) {
        posts.push({
          url: String(request.url),
          method: request.method,
          body: await request.json(),
        });
        return new Response(JSON.stringify({ ok: true, live_nodes: 4 }), { status: 200 });
      },
    },
  };
  const published = await publishSitePresence(env, 4);
  assert.equal(published.published, true);
  assert.equal(published.via, "binding");
  assert.equal(posts.length, 1);
  assert.match(posts[0].url, new RegExp(SITE_PRESENCE_PATH.replace("/", "\\/")));
  assert.equal(posts[0].method, "POST");
  assert.deepEqual(posts[0].body, { host: "azielcorpuslibrary.net", viewers: 4, kind: "human-page" });
  const invalid = await publishSitePresence(env, "invent");
  assert.equal(invalid.published, false);
  assert.equal(posts.length, 1);
  const a = req("/", { headers: { Cookie: "aziel_vid=viewer-dddd-4444", "User-Agent": "Mozilla/5.0 Chrome/128.0.0.0" } });
  const touch = await touchPageViewer(env, a, { path: "/", nowMs: Date.now() });
  assert.equal(touch.page_viewers, 1);
  const beat = await touch.published;
  assert.equal(beat.published, true);
  assert.equal(posts.at(-1).body.viewers, 1);
  assert.equal(posts.at(-1).body.host, "azielcorpuslibrary.net");
  const bot = await touchPageViewer(env, req("/", { ua: "Googlebot/2.1" }), { path: "/" });
  assert.equal(bot.counted, false);
  assert.equal(bot.published, undefined);
});
