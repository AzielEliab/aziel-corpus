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
  alignTradesRuntimeExtra,
} from "./trades-runtime.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;
const HOST = "https://www.azielcorpuslibrary.net";

test("Trades-Runtime cite is a local-first Softwares extra, not a FragGate engine", () => {
  assert.equal(TRADES_RUNTIME.slug, "trades-runtime");
  assert.equal(TRADES_RUNTIME.name, "Trades-Runtime");
  assert.equal(TRADES_RUNTIME_VERSION, "1.0.0-local");
  assert.equal(TRADES_RUNTIME.version, TRADES_RUNTIME_VERSION);
  assert.equal(TRADES_RUNTIME_SOFTWARE_EXTRA.version, "1.0.0-local");
  assert.equal(TRADES_RUNTIME.product_label, "Local Softwares 1.0");
  assert.equal(TRADES_RUNTIME_SOFTWARE_EXTRA.product_label, "Local Softwares 1.0");
  assert.equal(TRADES_RUNTIME.kind, "plain");
  assert.equal(TRADES_RUNTIME.door, "none");
  assert.equal(TRADES_RUNTIME.software_tab, false);
  assert.equal(TRADES_RUNTIME.fraggate_call, false);
  assert.equal(TRADES_RUNTIME.fraggate_engine, false);
  assert.equal(TRADES_RUNTIME_SOFTWARE_EXTRA.door, false);
  assert.equal(TRADES_RUNTIME_SOFTWARE_EXTRA.software_tab, false);
  assert.equal(TRADES_RUNTIME_SOFTWARE_EXTRA.fraggate_call, false);
  assert.equal(TRADES_RUNTIME.version_id, undefined);
  assert.equal(TRADES_RUNTIME.live_backends, false);
  assert.equal(TRADES_RUNTIME.pilot_started, false);
  assert.equal(TRADES_RUNTIME.field_claim, false);
  assert.equal(TRADES_RUNTIME_SOFTWARE_EXTRA.pilot_started, false);
  assert.equal(TRADES_RUNTIME_SOFTWARE_EXTRA.field_claim, false);
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
  assert.match(TRADES_RUNTIME.note, /Local Softwares 1\.0 \(installable\)/);
  assert.match(TRADES_RUNTIME.note, /giveaway Worker UI on the VibeLock host \(browser \/ PWA\) without downloading first/);
  assert.match(TRADES_RUNTIME.note, /Agents use OpenAPI and MCP/);
  assert.match(TRADES_RUNTIME.note, /optional counted pack is GET \/download \(trades-runtime-1\.0\.0-local\.tgz\)/);
  assert.match(TRADES_RUNTIME.note, /Local CLI common commands: help, softwares, version, health/);
  assert.match(TRADES_RUNTIME.note, /Honesty locks: live_backends false; pilot_started false; field_claim false; hosted_company_os false/);
  assert.match(TRADES_RUNTIME.note, /Public Glama MCP listing stays ~0\.3\.4 \/ Latest pre-0\.4\.4 parked/);
  assert.match(TRADES_RUNTIME.note, /FragGate door none/);
  assert.match(TRADES_RUNTIME.note, /software_tab false/);
  assert.match(TRADES_RUNTIME.note, /fraggate_call does not execute trades-runtime/);
  assert.doesNotMatch(TRADES_RUNTIME.note, /Public get = Worker download/);
  assert.doesNotMatch(TRADES_RUNTIME.note, /Track [LF]/);
  assert.doesNotMatch(TRADES_RUNTIME.note, /Field 1\.0/);
  assert.doesNotMatch(TRADES_RUNTIME.note, /Office 1\.0/);
  assert.doesNotMatch(TRADES_RUNTIME.note, /company OS live/);
  assert.doesNotMatch(TRADES_RUNTIME.note, /Glama Latest|Make Release/);
  assert.match(TRADES_RUNTIME.how_to_cite, /Trades-Runtime 1\.0\.0-local/);
  assert.ok(TRADES_RUNTIME.sameAs.includes(TRADES_RUNTIME_GITHUB));
  assert.ok(TRADES_RUNTIME.sameAs.includes(TRADES_RUNTIME_MCP));
  assert.ok(isTradesRuntimeSlug("trades-runtime"));
  assert.ok(isTradesRuntimeSlug("tradesruntime"));
  assert.ok(isTradesRuntimeSlug("trades_runtime"));
  assert.equal(isTradesRuntimeSlug("aziel-runtime"), false);
  assert.doesNotMatch(JSON.stringify(TRADES_RUNTIME), BANNED);
  assert.doesNotMatch(JSON.stringify(TRADES_RUNTIME), /Field 1\.0/);
  assert.doesNotMatch(JSON.stringify(TRADES_RUNTIME), /Office 1\.0/);
  assert.doesNotMatch(JSON.stringify(TRADES_RUNTIME), /company OS live/);
  assert.equal(Object.prototype.hasOwnProperty.call(TRADES_RUNTIME, "version_id"), false);
  assert.doesNotMatch(JSON.stringify(TRADES_RUNTIME), /Glama Latest|Make Release/);
  assert.doesNotMatch(TRADES_RUNTIME.one_line, /hosted multi-tenant company OS$/);
  assert.doesNotMatch(JSON.stringify(TRADES_RUNTIME), /"live_backends": true/);
  assert.doesNotMatch(JSON.stringify(TRADES_RUNTIME), /"pilot_started": true/);
  assert.doesNotMatch(JSON.stringify(TRADES_RUNTIME), /"field_claim": true/);
  assert.doesNotMatch(JSON.stringify(TRADES_RUNTIME), /"hosted_company_os": true/);
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
  assert.match(cite.trades_runtime.how_to_cite, /Trades-Runtime 1\.0\.0-local/);
  assert.equal(cite.trades_runtime.version, "1.0.0-local");
  assert.equal(cite.trades_runtime.product_label, "Local Softwares 1.0");
  assert.equal(cite.trades_runtime.pilot_started, false);
  assert.equal(cite.trades_runtime.field_claim, false);
  assert.equal(cite.products_trades_runtime.version, "1.0.0-local");
  assert.equal(cite.products_trades_runtime.product_label, "Local Softwares 1.0");
  assert.equal(cite.products_trades_runtime.pilot_started, false);
  assert.equal(cite.products_trades_runtime.field_claim, false);
  assert.equal(cite.products_trades_runtime.hosted_company_os, false);
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
  assert.match(llms, /Local Softwares 1\.0 \(installable\)/);
  assert.match(llms, /pilot_started false/);
  assert.match(llms, /field_claim false/);
  assert.match(llms, /Public Glama MCP listing stays ~0\.3\.4 \/ Latest pre-0\.4\.4 parked/);
  assert.match(llms, /FragGate door none/);
  assert.match(llms, /fraggate_call does not execute trades-runtime/);
  assert.doesNotMatch(llms, /Field 1\.0/);
  assert.doesNotMatch(llms, /Office 1\.0/);
  assert.doesNotMatch(llms, /company OS live/);
  assert.doesNotMatch(llms, /Glama Latest|Make Release/);
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
  assert.match(block, /giveaway Worker UI on the VibeLock host \(browser \/ PWA\) without downloading first/);
  assert.match(block, /optional counted pack is GET \/download \(trades-runtime-1\.0\.0-local\.tgz\)/);
  assert.match(block, /Local CLI common commands: help, softwares, version, health/);
  assert.match(block, /Local Softwares 1\.0 \(installable\)/);
  assert.match(block, /Honesty locks: live_backends false; pilot_started false; field_claim false; hosted_company_os false/);
  assert.match(block, /Public Glama MCP listing stays ~0\.3\.4 \/ Latest pre-0\.4\.4 parked/);
  assert.match(block, /FragGate door none/);
  assert.match(block, /fraggate_call does not execute trades-runtime/);
  assert.doesNotMatch(block, /Public get = Worker download/);
  assert.doesNotMatch(block, /Field 1\.0/);
  assert.doesNotMatch(block, /company OS live/);
  assert.doesNotMatch(block, /Glama Latest|Make Release/);
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
  assert.equal(tr.fraggate_call, false);
  assert.equal(tr.software_tab, false);
  assert.equal(tr.door, false);
  assert.equal(tr.version, "1.0.0-local");
  assert.equal(tr.product_label, "Local Softwares 1.0");
  assert.equal(tr.pilot_started, false);
  assert.equal(tr.field_claim, false);
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

test("stale suite row 0.4.9 is replaced by live health 1.0.0-local", () => {
  const stale = alignTradesRuntimeExtra({
    slug: "trades-runtime",
    version: "0.4.9",
    live_backends: true,
    pilot_started: true,
    field_claim: true,
    fraggate_call: true,
    software_tab: true,
    door: true,
    how_to_cite: "Eliab, Aziel. (2026). Trades-Runtime 0.4.9 [Software]. Apache-2.0. https://github.com/AzielEliab/trades-runtime",
  });
  assert.equal(stale.version, "1.0.0-local");
  assert.equal(stale.product_label, "Local Softwares 1.0");
  assert.equal(stale.live_backends, false);
  assert.equal(stale.pilot_started, false);
  assert.equal(stale.field_claim, false);
  assert.equal(stale.fraggate_call, false);
  assert.equal(stale.software_tab, false);
  assert.equal(stale.door, false);
  assert.equal(stale.hosted_company_os, false);

  const merged = mergeSoftwareExtras([{
    slug: "trades-runtime",
    name: "Trades-Runtime",
    version: "0.4.9",
    live_backends: true,
    pilot_started: true,
    field_claim: true,
    hosted_company_os: true,
    fraggate_call: true,
    software_tab: true,
    door: true,
  }]);
  const tr = merged.find((p) => p.slug === "trades-runtime");
  assert.equal(tr.version, "1.0.0-local");
  assert.equal(tr.product_label, "Local Softwares 1.0");
  assert.equal(tr.live_backends, false);
  assert.equal(tr.pilot_started, false);
  assert.equal(tr.field_claim, false);
  assert.equal(tr.hosted_company_os, false);
  assert.equal(tr.fraggate_call, false);
  assert.equal(tr.software_tab, false);
  assert.equal(tr.door, false);
  assert.doesNotMatch(JSON.stringify(tr), /0\.4\.9/);
  assert.doesNotMatch(JSON.stringify(tr), /Field 1\.0|Office 1\.0/);

  const tab = softwareTabCatalog({
    version: "2.0.0-rc1",
    software: [{ slug: "peacelock", name: "PeaceLock" }],
    extras: [{ slug: "trades-runtime", name: "Trades-Runtime", version: "0.4.9", live_backends: true, door: true, fraggate_call: true, software_tab: true }],
  }, { passThrough: true });
  const extra = tab.extras.find((e) => e.slug === "trades-runtime");
  assert.ok(extra);
  assert.equal(extra.version, "1.0.0-local");
  assert.equal(extra.product_label, "Local Softwares 1.0");
  assert.equal(extra.pilot_started, false);
  assert.equal(extra.field_claim, false);
  assert.equal(extra.live_backends, false);
  assert.equal(extra.fraggate_call, false);
  assert.equal(extra.software_tab, false);
  assert.equal(extra.door, false);
  assert.equal(extra.pages, "off");
  assert.ok(!tab.products.some((p) => p.slug === "trades-runtime"));
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
  assert.equal(disc.version, "1.0.0-local");
  assert.equal(disc.product_label, "Local Softwares 1.0");
  assert.equal(disc.live_backends, false);
  assert.equal(disc.pilot_started, false);
  assert.equal(disc.field_claim, false);
  assert.equal(disc.software_tab, false);
  assert.equal(disc.fraggate_call, false);
  assert.equal(disc.door, "none");
  assert.match(disc.note, /health, stats, cite, skill/);
  assert.doesNotMatch(disc.note, /Field 1\.0|company OS live|Glama Latest|Make Release/);
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
