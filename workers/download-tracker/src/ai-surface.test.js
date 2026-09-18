import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTHOR,
  AI_PATH_NOTE,
  AZCORPUS,
  AZLIBRARY,
  CAP7_DESIGNS,
  DOWNLOAD_OPS,
  DUAL_SURFACE,
  FIRST_CLASS_SLUGS,
  HONESTY,
  MCP_TOOLS,
  MIRAGEGRID_AZ_GENERATOR,
  MIRAGEGRID_BRIDGE_FUTURE,
  NO_FAN_SPEC,
  OPERATOR_TOKEN_ENV,
  OPERATOR_TOKEN_HEADER,
  PLANE_A_HUBS,
  UPLOAD_OPS,
  aiSurfaceLlmsBlock,
  bridgeDoc,
  cap7ShelvesCite,
  cap7SitesCompact,
  meshPullRecipe,
} from "./ai-surface.js";
import { designBySlug, designPackDoc, designPackIndex, handleDesignPackApi } from "./design-pack.js";
import { handleLibraryIngestApi, handleLibraryMcp, mcpToolsList } from "./library-mcp.js";
import { handleRuntimeApi } from "./runtime.js";
import { robotsTxt, aiTxt, llmsDoc, citeDoc, mcpDiscovery } from "./crawl.js";
import { isFanoutPath } from "./rate-limit.js";

const HOST = "https://www.azielcorpuslibrary.net";
const VISIBLE_1520 = /15:20/;
const AZ_GEN_CADENCE = /period_s\b|\b497\b|7m77s/i;
const LIVE_DNS = /live public DNS|resolves to azielcorpuslibrary|www\.survivalnetwork\.az is live/i;

function req(path, init) {
  return new Request(HOST + path, init);
}

test("AZindex Growth-ON: robots and ai.txt Allow GPTBot; no Disallow GPTBot", () => {
  const robots = robotsTxt();
  const ai = aiTxt("LIMIT");
  assert.match(robots, /User-agent: GPTBot\nAllow: \//);
  assert.match(ai, /User-agent: GPTBot\nAllow: \//);
  assert.doesNotMatch(robots, /User-agent: GPTBot\nDisallow:/);
  assert.doesNotMatch(ai, /Disallow: \/.*GPTBot|User-agent: GPTBot\nDisallow/);
  assert.match(robots, /Allow: \/bridge\.json/);
  assert.match(ai, /Allow: \/bridge\.json/);
  assert.match(robots, /Content-Signal: search=yes, ai-input=yes, ai-train=yes/);
});

test("bridge.json cites Cap-7 via Plane A without DNS or AZ-GEN overclaim", () => {
  const doc = bridgeDoc();
  assert.equal(doc.author, AUTHOR);
  assert.equal(doc.person_id, "https://www.azieleliab.com/#aziel");
  assert.equal(doc.plane, "A");
  assert.equal(doc.cap, 7);
  assert.equal(doc.mesh_dns.icann, false);
  assert.equal(doc.mesh_dns.live_public_dns, false);
  assert.equal(doc.mesh_dns.names_are_not_icann, true);
  assert.equal(doc.mesh_dns.names_may_change, true);
  assert.equal(doc.resolves_to_hub, false);
  assert.equal(doc.inherit, "designs");
  assert.equal(doc.name_may_change, true);
  assert.equal(doc.fifth_product, false);
  assert.equal(doc.cap7_sites.azcorpus.design_of, HOST + "/");
  assert.equal(doc.cap7_sites.azlibrary.design_of, HOST + "/");
  assert.equal(doc.cap7_sites.azcorpus.resolves_to_hub, false);
  assert.equal(doc.cap7_sites.azlibrary.resolves_to_hub, false);
  assert.equal(doc.cap7_sites.azeliab.design_of, "https://www.azieleliab.com/");
  assert.equal(doc.cap7_sites.godlock.design_of, "https://godlock.uk/");
  assert.equal(doc.cap7_sites.hedidntjump.design_of, "https://www.hedidntjump.com/");
  assert.ok(doc.cap7_sites.azcorpus.tip);
  assert.ok(doc.cap7_sites.azcorpus.pack_sha256);
  assert.equal(doc.cap7_sites.azcorpus.alias, false);
  assert.equal(typeof doc.cap7_aliases, "undefined");
  assert.deepEqual(doc.mesh_dns.designs, ["azcorpus", "azlibrary", "azeliab", "godlock", "hedidntjump"]);
  assert.equal(doc.az_generator.callable, false);
  assert.equal(doc.az_generator.publish_cadence_claimed, false);
  assert.equal(doc.az_generator.cite, MIRAGEGRID_AZ_GENERATOR);
  assert.equal(doc.miragegrid.bridge_future, MIRAGEGRID_BRIDGE_FUTURE);
  assert.equal(doc.miragegrid.bridge_live, false);
  assert.equal(doc.upload.token_writes, "live hub azlibrary only");
  assert.equal(doc.upload.mesh_write, false);
  assert.equal(doc.mesh_copies.kind, "design+content-pack");
  assert.equal(doc.mesh_copies.resolves_to_hub, false);
  assert.equal(doc.mesh_copies.new_domain, false);
  assert.match(doc.plane_note, /design_of the four hubs/);
  assert.match(doc.plane_note, /resolves_to_hub: false/);
  assert.doesNotMatch(doc.plane_note, /ultimately ARE the original/);
  assert.doesNotMatch(doc.plane_note, /aliases → canonical/);
  assert.match(doc.cross_network_survival, /CROSS-NETWORK-SURVIVAL/);
  assert.equal(doc.no_fan, NO_FAN_SPEC);
  assert.equal(HONESTY.cap7_live_public_dns, false);
  assert.equal(HONESTY.upload_token_hub_azlibrary_only, true);
  const raw = JSON.stringify(doc);
  assert.doesNotMatch(raw, VISIBLE_1520);
  assert.doesNotMatch(raw, AZ_GEN_CADENCE);
  assert.doesNotMatch(raw, LIVE_DNS);
  for (const hub of PLANE_A_HUBS) {
    assert.match(hub.url, /^https:\/\//);
  }
  assert.deepEqual(FIRST_CLASS_SLUGS, ["azcorpus", "azlibrary"]);
  assert.equal(doc.products.azcorpus.kind, "website");
  assert.equal(doc.products.azlibrary.kind, "website");
  assert.equal(doc.products.azlibrary.chrome.royal_purple, true);
  assert.equal(doc.upload.azlibrary.token_required, true);
  assert.equal(doc.upload.azlibrary.header, OPERATOR_TOKEN_HEADER);
  assert.ok(doc.upload.azlibrary.env_names.includes("OPERATOR_TOKEN"));
  assert.equal(doc.upload.token_header, OPERATOR_TOKEN_HEADER);
  assert.equal(doc.upload.token_in_git, false);
  assert.equal(doc.download.anyone, true);
  assert.equal(doc.download.azcorpus.anyone, true);
  assert.equal(doc.download.azlibrary.anyone, true);
  assert.equal(doc.mesh_pull.azcorpus.receiver_pull, true);
  assert.equal(doc.mesh_pull.azlibrary.hash_verify, true);
  assert.equal(doc.mesh_pull.azlibrary.fail_closed_on_mismatch, true);
  assert.ok(doc.mesh_pull.azlibrary.steps.some((s) => s.op === "hash-verify"));
  for (const d of CAP7_DESIGNS) {
    assert.ok(d.kind === "website" || d.kind === "mesh-design");
    assert.equal(d.icann, false);
    assert.equal(d.new_domain, false);
    assert.ok(d.design_of);
    assert.equal(d.resolves_to_hub, false);
    assert.ok(d.tip);
    assert.ok(d.pack_sha256);
    assert.ok(d.plane_a_hub);
  }
  assert.equal(AZCORPUS.inside_corpus_hub, true);
  assert.equal(AZLIBRARY.inside_corpus_hub, true);
  assert.equal(AZCORPUS.design_of, HOST + "/");
  assert.equal(AZLIBRARY.design_of, HOST + "/");
  assert.equal(AZCORPUS.resolves_to_hub, false);
  assert.equal(HONESTY.azcorpus_azlibrary_plane_a_ui, true);
  assert.equal(HONESTY.resolves_to_hub, false);
  assert.equal(HONESTY.fifth_product, false);
  assert.equal(CAP7_DESIGNS.find((d) => d.slug === "azcorpus").kind, "website");
  assert.equal(CAP7_DESIGNS.find((d) => d.slug === "azlibrary").kind, "website");
  assert.equal(CAP7_DESIGNS.find((d) => d.slug === "azeliab").kind, "mesh-design");
});

test("first-class: anyone downloads both; only azlibrary token-uploads; no secret in docs", () => {
  assert.equal(AZCORPUS.download.anyone, true);
  assert.equal(AZLIBRARY.download.anyone, true);
  assert.equal(AZCORPUS.upload.token_required, false);
  assert.equal(AZLIBRARY.upload.token_required, true);
  assert.equal(AZLIBRARY.upload.header, OPERATOR_TOKEN_HEADER);
  assert.deepEqual(AZLIBRARY.upload.env_names, [...OPERATOR_TOKEN_ENV]);
  const dump = JSON.stringify({ AZCORPUS, AZLIBRARY, note: AI_PATH_NOTE });
  assert.ok(!/sk-[A-Za-z0-9]/.test(dump));
  assert.doesNotMatch(dump, /password\s*=/i);
  assert.equal(HONESTY.operator_token_in_git, false);
  assert.equal(HONESTY.anyone_may_download_azcorpus, true);
  assert.equal(HONESTY.anyone_may_download_azlibrary, true);
});

test("design packs inherit design_of; resolves_to_hub is false", () => {
  const idx = designPackIndex();
  assert.equal(idx.kind, "design-pack-index");
  assert.ok(idx.packs.some((p) => p.slug === "azcorpus"));
  assert.ok(idx.packs.some((p) => p.slug === "azlibrary"));
  assert.equal(idx.honesty.mesh_copies_are_design_content_packs, true);
  const azlib = designBySlug("azlibrary");
  const pack = designPackDoc(azlib, {
    index_sha256: "abc",
    records: [
      { record_id: "AZDOC-1", title: "Paper", library: "aziel", content_sha256: "aa".repeat(32) },
      { record_id: "AZDOC-2", title: "Public", library: "corpus", content_sha256: "bb".repeat(32) },
    ],
  });
  assert.equal(pack.resolves_to_hub, false);
  assert.equal(pack.design_of, HOST + "/");
  assert.equal(pack.inside_corpus_hub, true);
  assert.equal(pack.new_domain, false);
  assert.equal(pack.fifth_product, false);
  assert.equal(pack.upload_token_writes_this_name, true);
  assert.equal(pack.live_write, false);
  assert.equal(pack.mesh_name, "azlibrary");
  assert.equal(pack.first_class, true);
  assert.equal(pack.kind, "design+content-pack");
  assert.equal(pack.website.browse, "/aziel-library");
  assert.equal(pack.chrome.royal_purple, true);
  assert.equal(pack.download_anyone, true);
  assert.match(pack.counted_download, /\/download\?product=azlibrary$/);
  assert.equal(pack.mesh_pull.hash_verify, true);
  assert.equal(pack.mesh_pull.fail_closed_on_mismatch, true);
  assert.ok(pack.pack_sha256);
  assert.equal(pack.content.count, 1);
  assert.equal(pack.content.records[0].record_id, "AZDOC-1");
  assert.match(pack.cross_network_survival, /CROSS-NETWORK-SURVIVAL/);
  assert.doesNotMatch(JSON.stringify(pack), VISIBLE_1520);
  assert.doesNotMatch(JSON.stringify(pack), AZ_GEN_CADENCE);
});

test("GET /v1/design-pack and /bridge.json are honest 200s", async () => {
  const packRes = await handleDesignPackApi(req("/v1/design-pack"), new URL(HOST + "/v1/design-pack"), {});
  assert.equal(packRes.status, 200);
  const idx = await packRes.json();
  assert.equal(idx.author, AUTHOR);
  const one = await handleDesignPackApi(req("/v1/design-pack/azcorpus"), new URL(HOST + "/v1/design-pack/azcorpus"), {});
  assert.equal(one.status, 200);
  const body = await one.json();
  assert.equal(body.slug, "azcorpus");
  assert.equal(body.icann, false);
  const miss = await handleDesignPackApi(req("/v1/design-pack/www.azielcorpuslibrary.net"), new URL(HOST + "/v1/design-pack/www.azielcorpuslibrary.net"), {});
  assert.equal(miss.status, 404);
  const products = await handleDesignPackApi(req("/v1/products"), new URL(HOST + "/v1/products"), {});
  assert.equal(products.status, 200);
  const catalog = await products.json();
  assert.deepEqual(catalog.first_class, ["azcorpus", "azlibrary"]);
  assert.equal(catalog.products.azlibrary.upload.header, "X-Aziel-Operator-Token");
  const attach = await handleDesignPackApi(req("/v1/design-pack/azlibrary/download"), new URL(HOST + "/v1/design-pack/azlibrary/download"), {});
  assert.equal(attach.status, 200);
  assert.match(attach.headers.get("Content-Disposition") || "", /azlibrary-design-pack\.json/);
  assert.ok(attach.headers.get("X-Aziel-Pack-Sha256"));
});

test("POST /v1/ingest refuses anonymous JSON and does not write mesh names", async () => {
  assert.equal(isFanoutPath("/v1/ingest", "POST"), true);
  const url = new URL(HOST + "/v1/ingest");
  const res = await handleLibraryIngestApi(
    new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "x", body: "y" }) }),
    url,
    {},
    null
  );
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.match(body.error, /sign in or operator token/i);
  assert.equal(body.mesh_write, false);
  assert.equal(body.honesty.upload_token_hub_azlibrary_only, true);
  assert.match(body.ai_path, /Operator token writes live Aziel Library \(azlibrary\) on this hub only/);
});

test("OpenAPI + MCP expose upload and download ops; full client set", async () => {
  const spec = await (await handleRuntimeApi(req("/openapi.json"), new URL(HOST + "/openapi.json"), {})).json();
  assert.ok(spec.paths["/v1/ingest"]);
  assert.ok(spec.paths["/v1/jeeves/upload"]);
  assert.ok(spec.paths["/v1/operator/library-ingest"]);
  assert.ok(spec.paths["/v1/docs/{hash}/download"]);
  assert.ok(spec.paths["/download"]);
  assert.ok(spec.paths["/file/{record_id}"]);
  assert.ok(spec.paths["/v1/products"]);
  assert.ok(spec.paths["/v1/design-pack"]);
  assert.ok(spec.paths["/v1/design-pack/{slug}"]);
  assert.ok(spec.paths["/v1/design-pack/{slug}/download"]);
  assert.ok(spec.paths["/bridge.json"]);
  assert.ok(spec.paths["/mcp"]);
  assert.match(spec.paths["/v1/products"].get.summary, /azcorpus/);
  assert.match(spec.paths["/v1/products"].get.summary, /azlibrary/);
  assert.match(spec.paths["/download"].get.summary, /product=azcorpus\|azlibrary/);
  assert.match(spec.paths["/v1/ingest"].post.summary, /live hub azlibrary only/);
  assert.match(spec.paths["/v1/ingest"].post.summary, /ChatGPT, Grok, Venice, Claude, Cursor, Glama/);
  assert.match(spec.paths["/v1/operator/library-ingest"].post.summary, /live hub azlibrary only/);
  assert.match(spec.paths["/v1/docs/{hash}/download"].get.summary, /aziel-corpus_download/);
  assert.equal(spec.paths["/v1/ingest"].post.operationId, "ingestRecord");
  assert.equal(spec.paths["/v1/docs/{hash}/download"].get.operationId, "downloadByHash");

  const tools = mcpToolsList().map((t) => t.name);
  for (const name of MCP_TOOLS) assert.ok(tools.includes(name), name);
  assert.ok(UPLOAD_OPS.length >= 3);
  assert.ok(DOWNLOAD_OPS.some((o) => o.op === "downloadByHash"));

  const list = await handleLibraryMcp(
    new Request(HOST + "/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) }),
    new URL(HOST + "/mcp"),
    {}
  );
  assert.equal(list.status, 200);
  const listed = await list.json();
  const names = listed.result.tools.map((t) => t.name);
  assert.ok(names.includes("aziel-corpus_ingest"));
  assert.ok(names.includes("aziel-corpus_download"));
  assert.ok(names.includes("aziel-corpus_design_pack"));

  const dl = await handleLibraryMcp(
    new Request(HOST + "/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "aziel-corpus_download", arguments: { hash: "ab".repeat(32) } } }),
    }),
    new URL(HOST + "/mcp"),
    {}
  );
  const dlBody = await dl.json();
  assert.match(dlBody.result.structuredContent.download, /\/v1\/docs\//);
});

test("llms.txt / cite / MCP discovery carry dual-surface + CNS + no AZ-GEN overclaim", () => {
  const llms = llmsDoc("LIMIT");
  assert.match(llms, /Dual-surface upload \+ download/);
  assert.match(llms, /POST https:\/\/www\.azielcorpuslibrary\.net\/v1\/ingest/);
  assert.match(llms, /aziel-corpus_ingest/);
  assert.match(llms, /\/bridge\.json/);
  assert.match(llms, /## azcorpus/);
  assert.match(llms, /## azlibrary/);
  assert.match(llms, /design_of the four hubs/);
  assert.match(llms, /resolves_to_hub: false/);
  assert.doesNotMatch(llms, /ultimately ARE the original/);
  assert.doesNotMatch(llms, /aliases → canonical/);
  assert.match(llms, /X-Aziel-Operator-Token/);
  assert.match(llms, /hash-verify/);
  assert.match(llms, /local cold shelf/);
  assert.match(llms, /CROSS-NETWORK-SURVIVAL/);
  assert.match(llms, /ChatGPT, Grok, Venice, Claude, Cursor, Glama/);
  assert.match(llms, /no AZ-GEN publish cadence/);
  assert.doesNotMatch(llms, AZ_GEN_CADENCE);
  assert.match(DUAL_SURFACE, /Worker \+ mobile \+ download/);
  assert.match(AI_PATH_NOTE, /Anonymous JSON ingest is refused/);
  assert.match(AI_PATH_NOTE, /Operator token writes live Aziel Library \(azlibrary\) on this hub only/);

  const cite = citeDoc();
  assert.equal(cite.bridge, HOST + "/bridge.json");
  assert.equal(cite.ingest, HOST + "/v1/ingest");
  assert.equal(cite.azcorpus, HOST + "/corpus");
  assert.equal(cite.azlibrary, HOST + "/aziel-library");
  assert.equal(cite.azcorpus_counted, HOST + "/download?product=azcorpus");
  assert.equal(cite.azlibrary_counted, HOST + "/download?product=azlibrary");
  assert.equal(cite.cap7_sites.azcorpus.design_of, HOST + "/");
  assert.equal(cite.cap7_sites.azcorpus.resolves_to_hub, false);
  assert.equal(cite.cap7_sites.azeliab.design_of, "https://www.azieleliab.com/");
  assert.equal(cite.redline.spec, "REDLINE-2026-09-14");
  assert.equal(cite.redline.pointer, true);
  assert.match(cite.attack_sim_refuse, /Attack sims refuse/);
  const shelvesCap7 = cap7ShelvesCite();
  assert.equal(shelvesCap7.spec, "CAP-7-BRIDGE-CITE-1.0");
  assert.equal(shelvesCap7.resolves_to_hub, false);
  assert.equal(shelvesCap7.sites.azcorpus.design_of, HOST + "/");
  assert.equal(cap7SitesCompact().azlibrary.resolves_to_hub, false);
  assert.ok(cite.library_mcp_tools.includes("aziel-corpus_ingest"));

  const mcp = mcpDiscovery();
  assert.equal(mcp.mcpServers["aziel-corpus"].url, HOST + "/mcp");
  assert.equal(mcp.mcpServers["trades-runtime"].url, "https://trades-runtime.vibelock.workers.dev/mcp");
  assert.equal(mcp.bridge, HOST + "/bridge.json");
});

test("mesh pull recipe is receiver-pull + hash-verify fail-closed", () => {
  const r = meshPullRecipe("azlibrary");
  assert.equal(r.receiver_pull, true);
  assert.equal(r.hash_verify, true);
  assert.equal(r.fail_closed_on_mismatch, true);
  assert.equal(r.land_on, "local cold shelf");
  assert.equal(r.steps[3].op, "hash-verify");
  assert.match(r.counted_download, /\/download\?product=azlibrary$/);
  const block = aiSurfaceLlmsBlock();
  assert.match(block, /## azcorpus/);
  assert.match(block, /## azlibrary/);
  assert.match(block, /royal purple/);
  assert.match(block, /X-Aziel-Operator-Token/);
  assert.match(block, /OPERATOR_TOKEN/);
  assert.match(block, /\/download\?product=/);
  assert.ok(!/sk-[A-Za-z0-9]/.test(block));
  assert.doesNotMatch(block, VISIBLE_1520);
});
