import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTHOR,
  EXAMPLE_BEARER,
  MESH_BAD_BEARER,
  MESH_METHOD,
  MESH_NEED_BEARER,
  MESH_NOTE,
  MESH_OFF,
  QNS_CD,
  QNS_CD_SPEC,
  collectDeclaredBearers,
  destMeshPath,
  decorateMeshDoc,
  handleMeshApi,
  isMeshEnabled,
  isMeshLibraryPath,
  isMeshRuntimePath,
  isMeshStatusReadPath,
  liveNodesCount,
  liveNodesLabel,
  meshOffDoc,
  meshRefreshScript,
  meshRefuseDoc,
  meshRefuseHttpStatus,
  meshStatusHtml,
  proxyMeshRequest,
  sanitizeBearer,
  synthesizeMeshRefuse,
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
  assert.match(MESH_NOTE, /QNS-CD-1\.0/);
  assert.match(MESH_NOTE, /no public proxy/);
  assert.match(MESH_NOTE, /no Node Gate/);
  assert.match(MESH_NOTE, /Aziel Eliab only/);
  assert.doesNotMatch(MESH_NOTE, BANNED);
  assert.equal(isMeshEnabled(off), false);
  assert.equal(liveNodesCount(off), 0);
  assert.equal(liveNodesLabel(off), "Live Nodes · off");
});

test("QNS-CD-1.0 cross-map is on Live Nodes payloads; not a Softwares-tab product", () => {
  assert.equal(QNS_CD_SPEC, "QNS-CD-1.0");
  assert.equal(QNS_CD.spec, "QNS-CD-1.0");
  assert.equal(QNS_CD.name, "photon QNS1 packet transfer");
  assert.equal(QNS_CD.kind, "hub-cite");
  assert.equal(QNS_CD.softwares_tab, false);
  assert.equal(QNS_CD.public_proxy, false);
  assert.equal(QNS_CD.node_gate, false);
  assert.equal(QNS_CD.default, "off");
  assert.equal(QNS_CD.qnsd, "local");
  assert.equal(QNS_CD.qnsd_coded_in, "https://github.com/AzielEliab/qnm-node");
  assert.equal(QNS_CD.runtime_cites, "https://github.com/AzielEliab/aziel-runtime");
  assert.equal(QNS_CD.pair_custody, "https://github.com/AzielEliab/azinterface");
  assert.match(QNS_CD.runtime_catalog, /\/v1\/software$/);
  assert.match(QNS_CD.runtime_mesh, /\/v1\/mesh$/);
  assert.match(QNS_CD.designs.qnm_wp, /QNM-WP-1\.0/);
  assert.match(QNS_CD.designs.node_mesh, /NODE_MESH/);
  assert.match(QNS_CD.note, /not a Softwares-tab product/);
  assert.equal(QNS_CD.author, "Aziel Eliab");
  assert.equal(QNS_CD.identity, "Aziel Eliab");

  const off = meshOffDoc();
  assert.equal(off.qns_cd_spec, "QNS-CD-1.0");
  assert.equal(off.qns_cd.spec, "QNS-CD-1.0");
  assert.equal(off.enabled, false);
  assert.equal(off.mesh, "off");

  const on = decorateMeshDoc({
    enabled: true,
    mesh: "on",
    live_nodes: 2,
    nodes: [{ id: "a" }, { id: "b" }],
  });
  assert.equal(on.enabled, true);
  assert.equal(on.qns_cd_spec, "QNS-CD-1.0");
  assert.equal(on.qns_cd.public_proxy, false);
  assert.equal(on.qns_cd.node_gate, false);
  assert.equal(on.default, "off");
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
  assert.equal(body.qns_cd_spec, "QNS-CD-1.0");
  assert.equal(body.qns_cd.spec, "QNS-CD-1.0");
  assert.equal(body.qns_cd.softwares_tab, false);
  assert.equal(body.qns_cd.public_proxy, false);
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
  assert.equal(body.qns_cd_spec, "QNS-CD-1.0");
  assert.equal(body.qns_cd.qnsd, "local");
});

test("GET /v1/mesh/nodes and /runtime/v1/mesh stay off when origin 404s", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
    },
  };
  const nodes = await handleMeshApi(req("/v1/mesh/nodes"), new URL(HOST + "/v1/mesh/nodes"), env);
  assert.equal(nodes.status, 200);
  const nodeBody = await nodes.json();
  assert.equal(nodeBody.enabled, false);
  assert.deepEqual(nodeBody.nodes, []);
  assert.equal(nodeBody.qns_cd_spec, "QNS-CD-1.0");

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
  assert.equal(runtimeBody.qns_cd_spec, "QNS-CD-1.0");
  assert.equal(runtimeBody.qns_cd.public_proxy, false);
});

test("Worker-shaped enable refuse helpers stay off; identity Aziel Eliab only", () => {
  assert.equal(sanitizeBearer("suite-presence"), "suite-presence");
  assert.equal(sanitizeBearer("login"), "");
  assert.equal(sanitizeBearer("account-heal"), "");
  assert.deepEqual(collectDeclaredBearers({}), { accepted: [], rejected: [], raw: [] });
  assert.deepEqual(collectDeclaredBearers({ bearer: "login" }).rejected, ["login"]);
  assert.equal(isMeshStatusReadPath("/v1/mesh"), true);
  assert.equal(isMeshStatusReadPath("/v1/mesh/enable"), false);

  const need = synthesizeMeshRefuse("POST", "/v1/mesh/enable", {});
  assert.equal(need.code, MESH_NEED_BEARER);
  assert.equal(need.ok, false);
  assert.equal(need.enabled, false);
  assert.equal(need.radios, "off");
  assert.equal(need.author, "Aziel Eliab");
  assert.equal(need.identity, "Aziel Eliab");
  assert.equal(need.example_bearer, EXAMPLE_BEARER);
  assert.equal(meshRefuseHttpStatus(need), 400);
  assert.doesNotMatch(JSON.stringify(need), BANNED);

  const bad = synthesizeMeshRefuse("POST", "/v1/mesh/enable", { bearer: "login" });
  assert.equal(bad.code, MESH_BAD_BEARER);
  assert.deepEqual(bad.refused_bearers, ["login"]);
  assert.equal(bad.enabled, false);

  const declared = synthesizeMeshRefuse("POST", "/v1/mesh/enable", { bearer: "suite-presence" });
  assert.equal(declared.code, MESH_OFF);
  assert.equal(declared.enabled, false);
  assert.equal(isMeshEnabled(declared), false);

  const method = synthesizeMeshRefuse("GET", "/v1/mesh/enable", {});
  assert.equal(method.code, MESH_METHOD);
  assert.equal(meshRefuseHttpStatus(method), 405);

  const refuse = meshRefuseDoc(MESH_NEED_BEARER, "x", { enabled: true, radios: "operator" });
  assert.equal(refuse.enabled, false);
  assert.equal(refuse.radios, "off");
});

test("POST mesh enable synthesizes MESH-NEED-BEARER when origin has no mesh", async () => {
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
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.equal(body.code, MESH_NEED_BEARER);
  assert.equal(body.enabled, false);
  assert.equal(body.radios, "off");
  assert.equal(body.author, "Aziel Eliab");
  assert.equal(body.identity, "Aziel Eliab");
  assert.match(body.message, /GET \/v1\/mesh never enables/);
  assert.equal(body.error, undefined);
});

test("POST /runtime/v1/mesh/enable passes through Worker MESH-* refuse codes", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async (request) => {
        const dest = new URL(request.url);
        assert.equal(dest.pathname, "/v1/mesh/enable");
        let payload = {};
        try { payload = await request.json(); } catch { payload = {}; }
        if (payload.bearer === "login") {
          return new Response(JSON.stringify({
            ok: false,
            code: MESH_BAD_BEARER,
            author: "Aziel Eliab",
            identity: "Aziel Eliab",
            message: "Bearer refused. Login / account / recover / gate / IP / publish / phoenix / heal names are not suite bearers. This is not a login mesh.",
            op: "enable",
            mesh_enabled: false,
            refused_bearers: ["login"],
            example_bearer: EXAMPLE_BEARER,
          }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({
          ok: false,
          code: MESH_NEED_BEARER,
          author: "Aziel Eliab",
          identity: "Aziel Eliab",
          kernel: "mesh",
          mesh_default: "off",
          message: "LIVE only after the operator declares ≥1 bearer. Pass { bearer: \"suite-presence\" }. Empty enable is refused. GET /v1/mesh never enables.",
          enabled: false,
          radios: "off",
          mesh_enabled: false,
          op: "enable",
          example_bearer: EXAMPLE_BEARER,
        }), { status: 400, headers: { "Content-Type": "application/json" } });
      },
    },
  };

  const empty = await handleRuntimeRoot(
    req("/runtime/v1/mesh/enable", "POST", { headers: { "Content-Type": "application/json" }, body: "{}" }),
    new URL(HOST + "/runtime/v1/mesh/enable"),
    env,
    null,
    {},
  );
  assert.equal(empty.status, 400);
  const emptyBody = await empty.json();
  assert.equal(emptyBody.code, MESH_NEED_BEARER);
  assert.equal(emptyBody.ok, false);
  assert.equal(emptyBody.enabled, false);
  assert.equal(emptyBody.radios, "off");
  assert.equal(emptyBody.author, "Aziel Eliab");
  assert.equal(emptyBody.identity, "Aziel Eliab");
  assert.match(emptyBody.host, /\/v1\/mesh$/);
  assert.match(emptyBody.runtime, /\/runtime\/v1\/mesh$/);
  assert.equal(emptyBody.source, "service-binding");
  assert.notEqual(emptyBody.error, "mesh default off until runtime enable");

  const bad = await handleRuntimeRoot(
    req("/runtime/v1/mesh/enable", "POST", { headers: { "Content-Type": "application/json" }, body: "{\"bearer\":\"login\"}" }),
    new URL(HOST + "/runtime/v1/mesh/enable"),
    env,
    null,
    {},
  );
  assert.equal(bad.status, 400);
  const badBody = await bad.json();
  assert.equal(badBody.code, MESH_BAD_BEARER);
  assert.deepEqual(badBody.refused_bearers, ["login"]);
  assert.equal(badBody.enabled, false);
});

test("GET mesh enable is MESH-METHOD and never enables", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => new Response(JSON.stringify({
        ok: false,
        code: MESH_METHOD,
        message: "POST /v1/mesh/enable.",
        hint: "POST /v1/mesh/enable",
        author: "Aziel Eliab",
        identity: "Aziel Eliab",
      }), { status: 405, headers: { "Content-Type": "application/json" } }),
    },
  };
  const res = await handleMeshApi(req("/v1/mesh/enable"), new URL(HOST + "/v1/mesh/enable"), env);
  assert.equal(res.status, 405);
  const body = await res.json();
  assert.equal(body.code, MESH_METHOD);
  assert.equal(body.ok, false);
  assert.notEqual(body.enabled, true);
  assert.equal(isMeshEnabled(body), false);

  const down = await proxyMeshRequest(
    req("/v1/mesh/enable"),
    "/v1/mesh/enable",
    { AZIEL_RUNTIME: { fetch: async () => new Response(JSON.stringify({ error: "not found" }), { status: 404 }) } },
  );
  assert.equal(down.status, 405);
  const downBody = await down.json();
  assert.equal(downBody.code, MESH_METHOD);
  assert.equal(downBody.enabled, false);
  assert.equal(isMeshEnabled(downBody), false);
});

test("GET /v1/mesh still never enables when origin has no mesh", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
    },
  };
  const res = await handleMeshApi(req("/v1/mesh"), new URL(HOST + "/v1/mesh"), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.enabled, false);
  assert.equal(body.mesh, "off");
  assert.equal(body.source, "library-default-off");
  assert.equal(body.author, "Aziel Eliab");
});

test("overlay does not locally enable a declared bearer", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
    },
  };
  const res = await proxyMeshRequest(
    req("/v1/mesh/enable", "POST", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bearer: "suite-presence" }),
    }),
    "/v1/mesh/enable",
    env,
  );
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.code, MESH_OFF);
  assert.equal(body.enabled, false);
  assert.equal(body.radios, "off");
  assert.equal(isMeshEnabled(body), false);
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
  assert.equal(cite.qns_cd_spec, "QNS-CD-1.0");
  assert.match(cite.mesh_note, /QNS-CD-1\.0/);

  const llms = llmsDoc("LIMIT");
  assert.match(llms, /\/v1\/mesh/);
  assert.match(llms, /\/runtime\/v1\/mesh/);
  assert.match(llms, /default off/);
  assert.match(llms, /Live Nodes/);
  assert.match(llms, /QNS-CD-1\.0/);

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
  assert.match(skill, /QNS-CD-1\.0/);
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
  assert.match(html, /href="\/v1\/mesh\/status"/);
  assert.match(html, /Suite mesh\. Default off until runtime enable/);
  assert.match(html, /GET never enables/);
  assert.match(meshStatusHtml(meshOffDoc()), /Live Nodes · off/);
  assert.match(meshStatusHtml(decorateMeshDoc({ enabled: true, live_nodes: 4 })), /Live Nodes · 4/);
  assert.match(meshRefreshScript(), /fetch\("\/v1\/mesh\/status"/);
  const meta = headMeta({ title: "aziel-runtime", path: "/runtime", kind: "runtime" });
  assert.match(meta, /href="\/v1\/mesh"/);
});
