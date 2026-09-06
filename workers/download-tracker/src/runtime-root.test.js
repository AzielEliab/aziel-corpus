import test from "node:test";
import assert from "node:assert/strict";
import {
  destFromRuntimePath,
  fallbackKind,
  findProduct,
  handleRuntimeRoot,
  pullDescriptor,
  runtimeManifest,
  runtimeSkillMd,
} from "./runtime-root.js";
import { llmsDoc } from "./crawl.js";
import {
  RUNTIME_VIA,
  shouldCountRuntimeUse,
  recordRuntimeUse,
  runtimeUsesPayload,
} from "./runtime-uses.js";

test("destFromRuntimePath strips the /runtime prefix", () => {
  assert.equal(destFromRuntimePath("/runtime/v1/skill", ""), "/v1/skill");
  assert.equal(destFromRuntimePath("/runtime/v1/pull/aziel-corpus", "?x=1"), "/v1/pull/aziel-corpus?x=1");
  assert.equal(destFromRuntimePath("/runtime/openapi.json", ""), "/openapi.json");
  assert.equal(destFromRuntimePath("/runtime", ""), null);
  assert.equal(destFromRuntimePath("/software", ""), null);
});

test("fallbackKind recognizes pull/skill/bundle/runtime.json", () => {
  assert.equal(fallbackKind("/v1/runtime.json"), "runtime.json");
  assert.equal(fallbackKind("/v1/skill"), "skill");
  assert.deepEqual(fallbackKind("/v1/pull/aziel-corpus"), { kind: "pull", slug: "aziel-corpus" });
  assert.deepEqual(fallbackKind("/v1/bundle/foldlock"), { kind: "bundle", slug: "foldlock" });
  assert.equal(fallbackKind("/openapi.json"), null);
});

test("runtime manifest and skill cite the library /runtime root", () => {
  const man = runtimeManifest();
  assert.equal(man.kind, "runtime_root");
  assert.equal(man.author, "Aziel Eliab");
  assert.equal(man.identity, "Aziel Eliab");
  assert.equal(man.role, "engine-runtime");
  assert.equal(man.version, "1.6.2");
  assert.equal(man.door, "fraggate");
  assert.equal(man.live_count, 26);
  assert.equal(man.doi, null);
  assert.match(man.host, /\/runtime$/);
  assert.match(man.skill, /\/runtime\/v1\/skill$/);
  assert.match(man.pull, /\/runtime\/v1\/pull\/\{slug\}$/);
  assert.match(man.fraggate_list, /\/runtime\/v1\/fraggate\/list$/);
  assert.match(man.uses, /\/runtime\/v1\/uses$/);
  assert.match(man.session_open, /\/runtime\/v1\/session\/open$/);
  assert.match(man.limitation, /1\.6\.2/);
  assert.match(man.limitation, /FragGate/);
  assert.doesNotMatch(man.limitation, /1\.4\.0/);
  assert.doesNotMatch(man.limitation, /10\.5281\/zenodo/i);
  const skill = runtimeSkillMd();
  assert.match(skill, /name: aziel-runtime/);
  assert.match(skill, /\/runtime\/v1\/runtime\.json/);
  assert.match(skill, /1\.6\.2/);
  assert.match(skill, /FragGate/);
  assert.match(skill, /fraggate_list/);
  assert.match(skill, /fraggate_call/);
  assert.match(skill, /\/runtime\/v1\/uses/);
  assert.match(skill, /Author \*\*Aziel Eliab\*\*/);
  assert.doesNotMatch(skill, /Ever Blooming/i);
  assert.doesNotMatch(skill, /10\.5281\/zenodo/i);
});

test("pullDescriptor keeps counted download and skill URLs", () => {
  const d = pullDescriptor({
    slug: "aziel-corpus",
    name: "Aziel Digital Library",
    version: "2.7.0",
    one_line: "Self-contained immutable digital library.",
    download: "https://www.azielcorpuslibrary.net/download",
    count: "https://www.azielcorpuslibrary.net/count",
    skill: "https://www.azielcorpuslibrary.net/v1/skill",
    github: "https://github.com/AzielEliab/aziel-corpus",
  });
  assert.equal(d.ok, true);
  assert.equal(d.slug, "aziel-corpus");
  assert.match(d.download, /\/download$/);
  assert.match(d.count, /\/count$/);
  assert.equal(findProduct({ products: [{ slug: "FoldLock" }] }, "foldlock").slug, "FoldLock");
  assert.equal(findProduct({ products: [] }, "nope"), null);
});

test("GET and HEAD /runtime return 200 HTML without a second software index", async () => {
  const get = await handleRuntimeRoot(
    new Request("https://www.azielcorpuslibrary.net/runtime", { headers: { Accept: "text/html" } }),
    new URL("https://www.azielcorpuslibrary.net/runtime"),
    {},
    null
  );
  assert.equal(get.status, 200);
  assert.match(get.headers.get("content-type"), /text\/html/);
  const html = await get.text();
  assert.match(html, /href="\/runtime"/);
  assert.match(html, />Runtime</);
  assert.match(html, /src="\/sigil\.png"/);
  assert.match(html, /\/runtime\/v1\/runtime\.json/);
  assert.match(html, /1\.6\.2/);
  assert.match(html, /FragGate/);
  assert.match(html, /fraggate_list/);
  assert.match(html, /\/runtime\/v1\/fraggate\/list/);
  assert.match(html, /\/runtime\/v1\/uses/);
  assert.match(html, /Runtime OpenAPI/);
  assert.doesNotMatch(html, /1\.4\.0/);
  assert.doesNotMatch(html, /engine-runtime 1\.3\.0/);
  assert.doesNotMatch(html, /Ever Blooming/i);
  assert.doesNotMatch(html, /10\.5281\/zenodo/i);

  const head = await handleRuntimeRoot(
    new Request("https://www.azielcorpuslibrary.net/runtime", { method: "HEAD" }),
    new URL("https://www.azielcorpuslibrary.net/runtime"),
    {},
    null
  );
  assert.equal(head.status, 200);
  assert.match(head.headers.get("content-type"), /text\/html/);
  assert.equal(await head.text(), "");
});

test("missing origin /v1/runtime.json falls back to a library manifest", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { "Content-Type": "application/json" } }),
    },
  };
  const res = await handleRuntimeRoot(
    new Request("https://www.azielcorpuslibrary.net/runtime/v1/runtime.json"),
    new URL("https://www.azielcorpuslibrary.net/runtime/v1/runtime.json"),
    env,
    null
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.kind, "runtime_root");
  assert.equal(body.author, "Aziel Eliab");
  assert.match(body.runtime_json, /\/runtime\/v1\/runtime\.json$/);
});

test("llms.txt cites the runtime root and pull APIs", () => {
  const txt = llmsDoc("LIMIT");
  assert.match(txt, /Also known as: Aziel Elroi Eliab/);
  assert.match(txt, /Software hub: https:\/\/www\.azielcorpuslibrary\.net\/software/);
  assert.match(txt, /Runtime root: https:\/\/www\.azielcorpuslibrary\.net\/runtime/);
  assert.match(txt, /\/runtime\/v1\/runtime\.json/);
  assert.match(txt, /\/runtime\/v1\/skill/);
  assert.match(txt, /\/runtime\/v1\/pull\/\{slug\}/);
  assert.match(txt, /1\.6\.2/);
  assert.match(txt, /FragGate/);
  assert.match(txt, /fraggate_list/);
  assert.match(txt, /\/runtime\/v1\/fraggate\/list/);
  assert.match(txt, /\/runtime\/v1\/uses/);
  assert.doesNotMatch(txt, /1\.4\.0 engine-runtime/);
});

function memoryKv() {
  const store = new Map();
  return {
    store,
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
    async list({ prefix } = {}) {
      const keys = [...store.keys()]
        .filter((name) => !prefix || name.startsWith(prefix))
        .map((name) => ({ name }));
      return { keys, list_complete: true };
    },
  };
}

test("shouldCountRuntimeUse counts API doors and skips SEO, uses, and GET health/ready", () => {
  assert.equal(shouldCountRuntimeUse("GET", "/runtime/v1/fraggate/list"), true);
  assert.equal(shouldCountRuntimeUse("POST", "/runtime/v1/fraggate/call"), true);
  assert.equal(shouldCountRuntimeUse("POST", "/runtime/mcp"), true);
  assert.equal(shouldCountRuntimeUse("POST", "/runtime/v1/session/open"), true);
  assert.equal(shouldCountRuntimeUse("GET", "/runtime/v1/pull/aziel-corpus"), true);
  assert.equal(shouldCountRuntimeUse("GET", "/runtime/v1/skill"), true);
  assert.equal(shouldCountRuntimeUse("GET", "/runtime/v1/uses"), false);
  assert.equal(shouldCountRuntimeUse("GET", "/runtime/v1/health"), false);
  assert.equal(shouldCountRuntimeUse("GET", "/runtime/v1/ready"), false);
  assert.equal(shouldCountRuntimeUse("GET", "/runtime/llms.txt"), false);
  assert.equal(shouldCountRuntimeUse("GET", "/runtime/cite.json"), false);
  assert.equal(shouldCountRuntimeUse("GET", "/runtime/robots.txt"), false);
  assert.equal(shouldCountRuntimeUse("GET", "/runtime"), false);
  assert.equal(shouldCountRuntimeUse("HEAD", "/runtime/v1/fraggate"), false);
  assert.equal(shouldCountRuntimeUse("OPTIONS", "/runtime/mcp"), false);
});

test("GET /runtime/v1/uses is local and does not increment", async () => {
  const kv = memoryKv();
  await recordRuntimeUse({ DOWNLOADS: kv }, { method: "GET", path: "/runtime/v1/fraggate/list" });
  const env = {
    DOWNLOADS: kv,
    AZIEL_RUNTIME: {
      fetch: async () => {
        throw new Error("uses must not proxy");
      },
    },
  };
  const res = await handleRuntimeRoot(
    new Request("https://www.azielcorpuslibrary.net/runtime/v1/uses"),
    new URL("https://www.azielcorpuslibrary.net/runtime/v1/uses"),
    env,
    null
  );
  assert.equal(res.status, 200);
  assert.match(res.headers.get("cache-control") || "", /no-store/);
  assert.equal(res.headers.get("x-aziel-runtime-via"), RUNTIME_VIA);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.host, "www.azielcorpuslibrary.net");
  assert.equal(body.via, "azielcorpuslibrary.net");
  assert.equal(body.author, "Aziel Eliab");
  assert.equal(body.uses, 1);
  assert.equal(body.by_path["/runtime/v1/fraggate/list"], 1);
  assert.equal(Array.isArray(body.recent), true);
  assert.ok("origin" in body);
  const after = await runtimeUsesPayload(env);
  assert.equal(after.uses, 1);
});

test("API traffic through /runtime increments KV and stamps X-Aziel-Runtime-Via on the proxied request", async () => {
  const kv = memoryKv();
  let proxied;
  const env = {
    DOWNLOADS: kv,
    AZIEL_RUNTIME: {
      fetch: async (req) => {
        proxied = req;
        return new Response(JSON.stringify({ ok: true, door: "fraggate" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  };
  const res = await handleRuntimeRoot(
    new Request("https://www.azielcorpuslibrary.net/runtime/v1/fraggate/list", {
      headers: { Accept: "application/json" },
    }),
    new URL("https://www.azielcorpuslibrary.net/runtime/v1/fraggate/list"),
    env,
    null
  );
  assert.equal(res.status, 200);
  assert.ok(proxied);
  assert.equal(proxied.headers.get("X-Aziel-Runtime-Via"), "azielcorpuslibrary.net");
  const logged = await runtimeUsesPayload(env);
  assert.equal(logged.uses, 1);
  assert.equal(logged.by_path["/runtime/v1/fraggate/list"], 1);
  assert.equal(logged.recent[0].path, "/runtime/v1/fraggate/list");
  assert.equal(logged.recent[0].method, "GET");
});

test("GET health and SEO static through /runtime do not increment", async () => {
  const kv = memoryKv();
  const env = {
    DOWNLOADS: kv,
    AZIEL_RUNTIME: {
      fetch: async () => new Response("ok", { status: 200, headers: { "Content-Type": "text/plain" } }),
    },
  };
  for (const path of ["/runtime/v1/health", "/runtime/llms.txt", "/runtime/cite.json", "/runtime/robots.txt"]) {
    const res = await handleRuntimeRoot(
      new Request("https://www.azielcorpuslibrary.net" + path),
      new URL("https://www.azielcorpuslibrary.net" + path),
      env,
      null
    );
    assert.equal(res.status, 200, path);
  }
  const logged = await runtimeUsesPayload(env);
  assert.equal(logged.uses, 0);
  assert.deepEqual(logged.by_path, {});
});
