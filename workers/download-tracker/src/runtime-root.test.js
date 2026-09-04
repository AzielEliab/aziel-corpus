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
  assert.match(man.host, /\/runtime$/);
  assert.match(man.skill, /\/runtime\/v1\/skill$/);
  assert.match(man.pull, /\/runtime\/v1\/pull\/\{slug\}$/);
  const skill = runtimeSkillMd();
  assert.match(skill, /name: aziel-runtime/);
  assert.match(skill, /\/runtime\/v1\/runtime\.json/);
  assert.match(skill, /Author \*\*Aziel Eliab\*\*/);
  assert.doesNotMatch(skill, /Ever Blooming/i);
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
  assert.doesNotMatch(html, /Ever Blooming/i);

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
  assert.match(txt, /Runtime root: https:\/\/www\.azielcorpuslibrary\.net\/runtime/);
  assert.match(txt, /\/runtime\/v1\/runtime\.json/);
  assert.match(txt, /\/runtime\/v1\/skill/);
  assert.match(txt, /\/runtime\/v1\/pull\/\{slug\}/);
});
