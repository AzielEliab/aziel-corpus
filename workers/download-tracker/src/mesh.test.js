import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTHOR,
  MESH_NOTE,
  destMeshPath,
  decorateMeshDoc,
  handleMeshApi,
  isMeshEnabled,
  isMeshLibraryPath,
  isMeshRuntimePath,
  liveNodesCount,
  liveNodesLabel,
  meshOffDoc,
  meshRefreshScript,
  meshStatusHtml,
  proxyMeshRequest,
} from "./mesh.js";
import { handleRuntimeApi } from "./runtime.js";
import { fallbackKind, handleRuntimeRoot, runtimeManifest, runtimeSkillMd } from "./runtime-root.js";
import { citeDoc, llmsDoc, mcpDiscovery, robotsTxt, sitemapXml } from "./crawl.js";
import { page } from "./ui.js";
import { shouldCountRuntimeUse } from "./runtime-uses.js";
import { headMeta } from "./seo.js";

const HOST = "https://www.azielcorpuslibrary.net";
const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;

function req(path, method = "GET", extra = {}) {
  return new Request(HOST + path, { method, ...extra });
}

test("mesh paths and dest mapping", () => {
  assert.equal(isMeshLibraryPath("/v1/mesh"), true);
  assert.equal(isMeshLibraryPath("/v1/mesh/nodes"), true);
  assert.equal(isMeshLibraryPath("/v1/lattice"), false);
  assert.equal(isMeshRuntimePath("/runtime/v1/mesh"), true);
  assert.equal(isMeshRuntimePath("/runtime/v1/mesh/status"), true);
  assert.equal(isMeshRuntimePath("/runtime/v1/health"), false);
  assert.equal(destMeshPath("/v1/mesh", ""), "/v1/mesh");
  assert.equal(destMeshPath("/runtime/v1/mesh/nodes", "?q=1"), "/v1/mesh/nodes?q=1");
  assert.equal(destMeshPath("/runtime/v1/health", ""), null);
  assert.equal(fallbackKind("/v1/mesh"), "mesh");
  assert.equal(fallbackKind("/v1/mesh/status"), "mesh");
  assert.equal(fallbackKind("/v1/mesh/nodes"), "mesh");
});

test("mesh default off until runtime enable; identity Aziel Eliab only", () => {
  const off = meshOffDoc();
  assert.equal(off.enabled, false);
  assert.equal(off.mesh, "off");
  assert.equal(off.live_nodes, 0);
  assert.deepEqual(off.nodes, []);
  assert.equal(off.default, "off");
  assert.equal(off.until, "runtime enable");
  assert.equal(off.author, AUTHOR);
  assert.equal(off.identity, "Aziel Eliab");
  assert.equal(AUTHOR, "Aziel Eliab");
  assert.match(off.host, /\/v1\/mesh$/);
  assert.match(off.runtime, /\/runtime\/v1\/mesh$/);
  assert.match(off.origin, /aziel-runtime\.vibelock\.workers\.dev\/v1\/mesh$/);
  assert.match(MESH_NOTE, /Default off until aziel-runtime enables it/);
  assert.match(MESH_NOTE, /not itself a mesh/);
  assert.match(MESH_NOTE, /Aziel Eliab only/);
  assert.doesNotMatch(MESH_NOTE, BANNED);
  assert.equal(isMeshEnabled(off), false);
  assert.equal(liveNodesCount(off), 0);
  assert.equal(liveNodesLabel(off), "Live Nodes · off");
});

test("decorateMeshDoc turns on only when runtime enables", () => {
  const on = decorateMeshDoc({
    enabled: true,
    mesh: "on",
    live_nodes: 3,
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
  });
  assert.equal(on.enabled, true);
  assert.equal(on.live_nodes, 3);
  assert.equal(liveNodesLabel(on), "Live Nodes · 3");
  assert.equal(on.author, "Aziel Eliab");
  assert.equal(on.identity, "Aziel Eliab");

  const forcedOff = decorateMeshDoc({ enabled: false, live_nodes: 9, nodes: [{ id: "x" }] });
  assert.equal(forcedOff.enabled, false);
  assert.equal(forcedOff.live_nodes, 0);
  assert.deepEqual(forcedOff.nodes, []);
});

test("GET /v1/mesh is default off when runtime has no mesh", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
    },
  };
  const url = new URL(HOST + "/v1/mesh");
  const res = await handleMeshApi(req("/v1/mesh"), url, env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.enabled, false);
  assert.equal(body.mesh, "off");
  assert.equal(body.live_nodes, 0);
  assert.equal(body.source, "library-default-off");
  assert.equal(body.author, "Aziel Eliab");
  assert.equal(body.identity, "Aziel Eliab");
});

test("GET /v1/mesh proxies a runtime-enabled mesh", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async (request) => {
        const dest = new URL(request.url);
        assert.equal(dest.pathname, "/v1/mesh");
        return new Response(JSON.stringify({
          ok: true,
          enabled: true,
          mesh: "on",
          live_nodes: 2,
          nodes: [{ id: "n1" }, { id: "n2" }],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      },
    },
  };
  const res = await handleRuntimeApi(req("/v1/mesh"), new URL(HOST + "/v1/mesh"), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.enabled, true);
  assert.equal(body.live_nodes, 2);
  assert.equal(body.nodes.length, 2);
  assert.equal(body.author, "Aziel Eliab");
  assert.match(body.host, /\/v1\/mesh$/);
  assert.match(body.runtime, /\/runtime\/v1\/mesh$/);
});

test("GET /v1/mesh/nodes and /runtime/v1/mesh stay off when origin 404s", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => { throw new Error("unreachable"); },
    },
  };
  const nodes = await handleMeshApi(req("/v1/mesh/nodes"), new URL(HOST + "/v1/mesh/nodes"), env);
  assert.equal(nodes.status, 200);
  const nodeBody = await nodes.json();
  assert.equal(nodeBody.enabled, false);
  assert.deepEqual(nodeBody.nodes, []);

  const runtime = await handleRuntimeRoot(
    req("/runtime/v1/mesh"),
    new URL(HOST + "/runtime/v1/mesh"),
    env,
    null,
    {},
  );
  assert.equal(runtime.status, 200);
  const runtimeBody = await runtime.json();
  assert.equal(runtimeBody.enabled, false);
  assert.equal(runtimeBody.source, "library-default-off");
});

test("POST mesh enable refuses while runtime mesh is off", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
    },
  };
  const res = await proxyMeshRequest(
    req("/v1/mesh/enable", "POST", { headers: { "Content-Type": "application/json" }, body: "{}" }),
    "/v1/mesh/enable",
    env,
  );
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.enabled, false);
  assert.match(body.error, /default off until runtime enable/);
});

test("OpenAPI, MCP, llms, cite, robots, sitemap cite mesh paths", async () => {
  const specRes = await handleRuntimeApi(req("/openapi.json"), new URL(HOST + "/openapi.json"), {});
  const spec = await specRes.json();
  assert.ok(spec.paths["/v1/mesh"]);
  assert.ok(spec.paths["/v1/mesh/status"]);
  assert.ok(spec.paths["/v1/mesh/nodes"]);
  assert.ok(spec.paths["/runtime/v1/mesh"]);
  assert.match(spec.paths["/v1/mesh"].get.summary, /default off/i);
  assert.match(spec.paths["/v1/mesh"].get.summary, /Aziel Eliab/);

  const mcp = mcpDiscovery();
  assert.match(mcp.mesh, /\/v1\/mesh$/);
  assert.match(mcp.runtime_mesh, /\/runtime\/v1\/mesh$/);
  assert.equal(mcp.author, "Aziel Eliab");

  const cite = citeDoc();
  assert.match(cite.mesh, /\/v1\/mesh$/);
  assert.match(cite.runtime_mesh, /\/runtime\/v1\/mesh$/);
  assert.match(cite.mesh_origin, /\/v1\/mesh$/);

  const llms = llmsDoc("LIMIT");
  assert.match(llms, /\/v1\/mesh/);
  assert.match(llms, /\/runtime\/v1\/mesh/);
  assert.match(llms, /default off/);
  assert.match(llms, /Live Nodes/);

  const robots = robotsTxt();
  assert.match(robots, /Allow: \/v1\/mesh/);
  assert.match(robots, /Allow: \/runtime\/v1\/mesh/);

  const xml = await sitemapXml({});
  assert.match(xml, /\/v1\/mesh</);
  assert.match(xml, /\/runtime\/v1\/mesh</);
  assert.doesNotMatch(JSON.stringify(spec) + JSON.stringify(mcp) + llms, BANNED);
});

test("runtime skill and manifest cite mesh; GET mesh does not increment uses", () => {
  const skill = runtimeSkillMd();
  assert.match(skill, /\/runtime\/v1\/mesh/);
  assert.match(skill, /default off/);
  assert.match(skill, /Aziel Eliab/);
  const man = runtimeManifest();
  assert.match(man.mesh, /\/runtime\/v1\/mesh$/);
  assert.equal(man.identity, "Aziel Eliab");
  assert.equal(shouldCountRuntimeUse("GET", "/runtime/v1/mesh"), false);
  assert.equal(shouldCountRuntimeUse("GET", "/runtime/v1/mesh/status"), false);
  assert.equal(shouldCountRuntimeUse("POST", "/runtime/v1/mesh/enable"), true);
});

test("human chrome shows quiet Live Nodes status without a redesign", () => {
  const html = page("Search", "<div class=\"card\">shelf</div>", { path: "/", kind: "search" });
  assert.match(html, /id="aziel-live-nodes"/);
  assert.match(html, /Live Nodes · off/);
  assert.match(html, /href="\/v1\/mesh"/);
  assert.match(html, /Suite mesh\. Default off until runtime enable/);
  assert.match(meshStatusHtml(meshOffDoc()), /Live Nodes · off/);
  assert.match(meshStatusHtml(decorateMeshDoc({ enabled: true, live_nodes: 4 })), /Live Nodes · 4/);
  assert.match(meshRefreshScript(), /fetch\("\/v1\/mesh"/);
  const meta = headMeta({ title: "aziel-runtime", path: "/runtime", kind: "runtime" });
  assert.match(meta, /href="\/v1\/mesh"/);
});
