import test from "node:test";
import assert from "node:assert/strict";
import { citeDoc, llmsDoc, humansTxt, aiTxt, mcpDiscovery } from "./crawl.js";
import { handleLibraryMcp } from "./library-mcp.js";
import {
  SOFTWARE_EXTRAS,
  mergeSoftwareExtras,
  collectCatalogProducts,
  softwareKind,
  productLinks,
  countUrlForProduct,
  displayName,
  canonicalSoftwareSlug,
  softwareTabCatalog,
} from "./software-catalog.js";
import {
  TRADES_RUNTIME,
  TRADES_RUNTIME_SLUG,
  TRADES_RUNTIME_SOFTWARE_EXTRA,
  TRADES_RUNTIME_WORKER_HOME,
  TRADES_RUNTIME_DOWNLOAD,
  TRADES_RUNTIME_STATS,
  TRADES_RUNTIME_GITHUB,
  TRADES_RUNTIME_MCP,
  TRADES_RUNTIME_VERSION,
  isTradesRuntimeSlug,
  tradesRuntimeLlmsBlock,
  tradesRuntimeCiteFields,
  tradesRuntimeMcpDiscovery,
} from "./trades-runtime.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;
const HOST = "https://www.azielcorpuslibrary.net";

test("Trades-Runtime cite is a local-first Softwares extra, not a FragGate engine", () => {
  assert.equal(TRADES_RUNTIME.slug, "trades-runtime");
  assert.equal(TRADES_RUNTIME.name, "Trades-Runtime");
  assert.equal(TRADES_RUNTIME_VERSION, "0.4.5");
  assert.equal(TRADES_RUNTIME.version, TRADES_RUNTIME_VERSION);
  assert.equal(TRADES_RUNTIME_SOFTWARE_EXTRA.version, "0.4.5");
  assert.equal(TRADES_RUNTIME.kind, "plain");
  assert.equal(TRADES_RUNTIME.fraggate_engine, false);
  assert.equal(TRADES_RUNTIME.live_backends, false);
  assert.equal(TRADES_RUNTIME.hosted_company_os, false);
  assert.equal(TRADES_RUNTIME.byo_field_os, true);
  assert.equal(TRADES_RUNTIME.tenant_data, false);
  assert.equal(TRADES_RUNTIME.servicetitan_write, false);
  assert.equal(TRADES_RUNTIME.probooks_write, false);
  assert.equal(TRADES_RUNTIME.pages, "off");
  assert.equal(TRADES_RUNTIME.doi, null);
  assert.equal(TRADES_RUNTIME.license, "Apache-2.0");
  assert.equal(TRADES_RUNTIME.identity, "Aziel Eliab");
  assert.equal(TRADES_RUNTIME.github, TRADES_RUNTIME_GITHUB);
  assert.equal(TRADES_RUNTIME.mcp, TRADES_RUNTIME_MCP);
  assert.equal(TRADES_RUNTIME.count, TRADES_RUNTIME_STATS);
  assert.equal(TRADES_RUNTIME.stats, TRADES_RUNTIME_STATS);
  assert.match(TRADES_RUNTIME.one_line, /live_backends: false/);
  assert.match(TRADES_RUNTIME.one_line, /ServiceTitan \+ ProBooks/);
  assert.match(TRADES_RUNTIME.note, /local-first BYO field OS/);
  assert.match(TRADES_RUNTIME.one_line, /BYO field OS/);
  assert.match(TRADES_RUNTIME.note, /own read-only MCP/);
  assert.match(TRADES_RUNTIME.how_to_cite, /Trades-Runtime 0\.4\.5/);
  assert.ok(TRADES_RUNTIME.sameAs.includes(TRADES_RUNTIME_GITHUB));
  assert.ok(TRADES_RUNTIME.sameAs.includes(TRADES_RUNTIME_MCP));
  assert.ok(isTradesRuntimeSlug("trades-runtime"));
  assert.ok(isTradesRuntimeSlug("tradesruntime"));
  assert.ok(isTradesRuntimeSlug("trades_runtime"));
  assert.equal(isTradesRuntimeSlug("aziel-runtime"), false);
  assert.doesNotMatch(JSON.stringify(TRADES_RUNTIME), BANNED);
  assert.doesNotMatch(TRADES_RUNTIME.one_line, /hosted multi-tenant company OS$/);
  assert.doesNotMatch(JSON.stringify(TRADES_RUNTIME), /"live_backends": true/);
});

test("cite.json / llms.txt / humans.txt / ai.txt cite Trades-Runtime honestly", () => {
  const cite = citeDoc();
  const blob = JSON.stringify(cite);
  assert.ok(cite.keywords.includes("Trades-Runtime"));
  assert.ok(cite.keywords.includes("trades-runtime"));
  assert.equal(cite.trades_runtime.slug, TRADES_RUNTIME_SLUG);
  assert.equal(cite.trades_runtime_slug, "trades-runtime");
  assert.equal(cite.github_trades_runtime, TRADES_RUNTIME_GITHUB);
  assert.equal(cite.trades_runtime_mcp, TRADES_RUNTIME_MCP);
  assert.equal(cite.trades_runtime.mcp, TRADES_RUNTIME_MCP);
  assert.equal(cite.trades_runtime.live_backends, false);
  assert.equal(cite.trades_runtime.pages, "off");
  assert.equal(cite.trades_runtime.fraggate_engine, false);
  assert.equal(cite.trades_runtime.doi, null);
  assert.match(cite.trades_runtime.how_to_cite, /Trades-Runtime 0\.4\.5/);
  assert.equal(cite.trades_runtime.version, "0.4.5");
  assert.equal(cite.products_trades_runtime.version, "0.4.5");
  assert.equal(cite.products_trades_runtime.slug, "trades-runtime");
  assert.equal(cite.products_trades_runtime.mcp, TRADES_RUNTIME_MCP);
  assert.ok(cite.products_trades_runtime.sameAs.includes(TRADES_RUNTIME_GITHUB));
  assert.match(cite.products_trades_runtime.description, /live_backends: false/);
  assert.doesNotMatch(blob, BANNED);
  assert.doesNotMatch(blob, /github\.io\/trades-runtime/i);

  const fields = tradesRuntimeCiteFields(HOST);
  assert.equal(fields.github_trades_runtime, TRADES_RUNTIME_GITHUB);
  assert.equal(fields.products_trades_runtime.pages, "off");

  const llms = llmsDoc("LIMIT");
  assert.match(llms, /Trades-Runtime/);
  assert.match(llms, /trades-runtime/);
  assert.match(llms, /trades-runtime\.vibelock\.workers\.dev/);
  assert.match(llms, /github\.com\/AzielEliab\/trades-runtime/);
  assert.match(llms, /trades-runtime\.vibelock\.workers\.dev\/mcp/);
  assert.match(llms, /\/v1\/stats/);
  assert.match(llms, /live_backends: false/);
  assert.match(llms, /Trades-Runtime \(trades-runtime\) is a public Softwares extra \/ BYO field OS/);
  assert.doesNotMatch(llms, /not a FragGate-exec true engine/i);
  assert.doesNotMatch(llms, BANNED);

  const humans = humansTxt();
  assert.match(humans, /Trades-Runtime/);
  assert.match(humans, /trades-runtime/);

  const ai = aiTxt("LIMIT");
  assert.match(ai, /Trades-Runtime/);
  assert.match(ai, /trades-runtime\.vibelock\.workers\.dev\/mcp/);

  const block = tradesRuntimeLlmsBlock();
  assert.match(block, /POST https:\/\/trades-runtime\.vibelock\.workers\.dev\/mcp/);
  assert.match(block, /\/v1\/stats/);
});

test("SOFTWARE_EXTRAS lists Trades-Runtime with github, download, mcp, and /v1/stats", () => {
  assert.ok(SOFTWARE_EXTRAS.some((p) => p.slug === "trades-runtime"));
  assert.equal(SOFTWARE_EXTRAS.length, 6);
  assert.equal(softwareKind(TRADES_RUNTIME_SOFTWARE_EXTRA), "plain");
  assert.equal(displayName({ slug: "trades-runtime" }), "Trades-Runtime");
  assert.equal(displayName({ slug: "tradesruntime" }), "Trades-Runtime");
  assert.equal(displayName({ slug: "trades_runtime" }), "Trades-Runtime");
  assert.equal(canonicalSoftwareSlug("trades_runtime"), "trades-runtime");
  const merged = mergeSoftwareExtras(collectCatalogProducts({
    products: [{ slug: "peacelock", name: "PeaceLock" }],
  }));
  const tr = merged.find((p) => p.slug === "trades-runtime");
  assert.ok(tr);
  assert.equal(tr.worker_home, TRADES_RUNTIME_WORKER_HOME);
  assert.equal(tr.download, TRADES_RUNTIME_DOWNLOAD);
  assert.equal(tr.github, TRADES_RUNTIME_GITHUB);
  assert.equal(tr.mcp, TRADES_RUNTIME_MCP);
  assert.equal(tr.fraggate_engine, false);
  assert.equal(countUrlForProduct(tr), TRADES_RUNTIME_STATS);
  assert.equal(countUrlForProduct({ slug: "trades-runtime", count: null }), TRADES_RUNTIME_STATS);
  assert.equal(countUrlForProduct({ slug: "tradesruntime" }), TRADES_RUNTIME_STATS);
  assert.match(tr.one_line, /live_backends: false/);
  const links = productLinks(SOFTWARE_EXTRAS.find((p) => p.slug === "trades-runtime"));
  assert.ok(links.some((l) => l.primary && l.href === TRADES_RUNTIME_DOWNLOAD));
  assert.ok(links.some((l) => l.label === "Worker" && l.href === TRADES_RUNTIME_WORKER_HOME));
  assert.ok(links.some((l) => l.label === "GitHub" && l.href === TRADES_RUNTIME_GITHUB));
  assert.ok(links.some((l) => l.label === "MCP" && l.href === TRADES_RUNTIME_MCP));
  assert.ok(!links.some((l) => /fraggate\/describe\?slug=trades-runtime/.test(l.href)));
  assert.ok(!links.some((l) => l.href === "/runtime/mcp" && l.label === "MCP"));

  const aliasMerged = mergeSoftwareExtras([{ slug: "tradesruntime", name: "Trades Runtime" }]);
  assert.equal(aliasMerged.filter((p) => p.slug === "trades-runtime").length, 1);
  assert.ok(!aliasMerged.some((p) => p.slug === "tradesruntime"));
});

test("softwareTabCatalog extras merge includes trades-runtime without promoting FragGate", () => {
  const tab = softwareTabCatalog({
    version: "1.9.0",
    software: [{ slug: "peacelock", name: "PeaceLock" }],
    fraggate: "https://aziel-runtime.vibelock.workers.dev/v1/fraggate",
    mesh: { status: "https://aziel-runtime.vibelock.workers.dev/v1/mesh/status" },
  });
  const tr = tab.products.find((p) => p.slug === "trades-runtime");
  assert.ok(tr);
  assert.equal(tr.mcp, TRADES_RUNTIME_MCP);
  assert.equal(tr.download, TRADES_RUNTIME_DOWNLOAD);
  assert.equal(tr.github, TRADES_RUNTIME_GITHUB);
  assert.ok(tab.products.every((p) => p.slug !== "fraggate" && p.slug !== "mesh"));
});

test("MCP discovery cites the product host and does not invent ST write tools", () => {
  const mcp = mcpDiscovery();
  assert.equal(mcp.mcpServers["trades-runtime"].url, TRADES_RUNTIME_MCP);
  assert.ok(mcp.servers.some((s) => s.name === "trades-runtime" && s.url === TRADES_RUNTIME_MCP));
  assert.equal(mcp.sister_mcp["trades-runtime"].url, TRADES_RUNTIME_MCP);
  assert.match(mcp.sister_mcp["trades-runtime"].note, /Not FragGate/);
  assert.match(mcp.sister_mcp["trades-runtime"].note, /No ServiceTitan or ProBooks write/);
  assert.doesNotMatch(JSON.stringify(mcp.sister_mcp), /servicetitan_write": true|write-back/i);
  const disc = tradesRuntimeMcpDiscovery();
  assert.equal(disc.live_backends, false);
  assert.match(disc.note, /health, stats, cite, skill/);
});

test("library MCP cites the trades-runtime host and does not add ST write tools", async () => {
  const res = await handleLibraryMcp(
    new Request(HOST + "/mcp", { method: "GET" }),
    new URL(HOST + "/mcp"),
    {}
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.sister_mcp["trades-runtime"].url, TRADES_RUNTIME_MCP);
  assert.match(body.sister_mcp["trades-runtime"].note, /Not FragGate/);
  assert.deepEqual(body.tools, [
    "aziel-corpus_health",
    "aziel-corpus_search",
    "aziel-corpus_skill",
    "aziel-corpus_download",
    "aziel-corpus_ingest",
    "aziel-corpus_design_pack",
    "aziel-corpus_receipt",
  ]);
});
