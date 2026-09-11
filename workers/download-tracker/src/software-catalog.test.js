import test from "node:test";
import assert from "node:assert/strict";
import { softwareBody } from "./ui.js";
import { handleHosted } from "./hosted.js";
import {
  SOFTWARE_EXTRAS,
  FRAGGATE_DOWNLOAD,
  FRAGGATE_WORKER_HOME,
  FRAGGATE_COUNT,
  AZNET_DOWNLOAD,
  AZNET_WORKER_HOME,
  AZNET_COUNT,
  softwareKind,
  compareSoftware,
  displayName,
  collectCatalogProducts,
  collectCatalogExtras,
  softwareTabCatalog,
  mergeSoftwareExtras,
  productLinks,
  parseCountPayload,
  pathMentionsSlug,
  usesForSlug,
  countUrlForProduct,
  countPills,
  loadSoftwareCatalog,
  hubSoftwareCopy,
  normalizeSoftwareDoc,
  fetchLiveSoftwareCatalog,
  fetchLiveRuntimeVersion,
} from "./software-catalog.js";
import {
  AZCOHERENCE_DOWNLOAD,
  AZCOHERENCE_WORKER_HOME,
  AZCOHERENCE_COUNT,
} from "./azcoherence.js";
import { handleRuntimeApi } from "./runtime.js";

const HOST = "https://www.azielcorpuslibrary.net";
const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;

function blockLiveRuntime(origFetch, extra) {
  return async (url, init) => {
    const href = String(url);
    if (typeof extra === "function") {
      const hit = await extra(href, url, init);
      if (hit) return hit;
    }
    if (/aziel-runtime\.vibelock\.workers\.dev/i.test(href)) {
      return new Response(JSON.stringify({ error: "blocked live runtime" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return origFetch(url, init);
  };
}

function stubEnv(runtime) {
  const stmt = {
    bind() { return this; },
    async run() { return { success: true }; },
    async first() { return null; },
    async all() { return { results: [] }; },
  };
  return {
    DB: {
      prepare() { return stmt; },
      async batch() { return []; },
    },
    AZIEL_RUNTIME: runtime || undefined,
  };
}

function mockCatalog() {
  const products = [
    { slug: "foldlock", name: "FoldLock", version: "0.8.0", github: "https://github.com/AzielEliab/foldlock", worker: "foldlock-download-tracker", download: "https://foldlock.example/download", one_line: "Not zip." },
    { slug: "decisiongate", name: "DecisionGATE", version: "0.1.0", github: "https://github.com/AzielEliab/decisiongate", worker: "decisiongate-download-tracker", download: "https://decisiongate.example/download", one_line: "Five gates." },
    { slug: "staticclock", name: "StaticClock", version: "0.2.0", github: "https://github.com/AzielEliab/staticclock", one_line: "Clock is not Lock." },
    { slug: "azieltether", name: "AzielTether", version: "0.1.0", github: "https://github.com/AzielEliab/azieltether", worker: "azieltether-download-tracker", download: "https://azieltether.example/download", one_line: "Not a VPN." },
    { slug: "peacelock", name: "PeaceLock", version: "0.1.0", github: "https://github.com/AzielEliab/peacelock", download: "https://peacelock.example/download", worker: "peacelock-download-tracker", one_line: "Chosen silence." },
  ];
  const extras = [];
  for (let i = 0; i < 25; i++) {
    extras.push({
      slug: "plain-" + String(i).padStart(2, "0"),
      name: "Plain Product " + String(i).padStart(2, "0"),
      github: "https://github.com/AzielEliab/plain-" + i,
      one_line: "Catalog growth fixture.",
    });
  }
  const all = products.concat(extras);
  const engines = { azmail: { slug: "azmail", description: "Launching mail door." } };
  return {
    version: "1.6.4",
    products: all,
    engines,
    engine_slugs: all.map((p) => p.slug).concat(["azmail"]),
    true_engine_slugs: all.map((p) => p.slug).concat(["azmail"]),
  };
}

test("Clock is not Lock; Gate before Lock; Plain first", () => {
  assert.equal(softwareKind({ slug: "staticclock", name: "StaticClock" }), "plain");
  assert.equal(softwareKind({ slug: "chronolock", name: "ChronoLock" }), "lock");
  assert.equal(softwareKind({ slug: "decisiongate", name: "DecisionGATE" }), "gate");
  assert.equal(softwareKind({ slug: "fraggate", name: "FragGate" }), "gate");
  assert.equal(softwareKind({ slug: "peacelock", name: "PeaceLock" }), "lock");
  assert.equal(softwareKind({ slug: "azmail", name: "AZMail" }), "plain");
  assert.equal(softwareKind({ slug: "aznet", name: "AZNet" }), "plain");
  assert.equal(softwareKind({ slug: "azbrowser", name: "AZBrowser" }), "plain");
  const ordered = [
    { slug: "peacelock", name: "PeaceLock" },
    { slug: "decisiongate", name: "DecisionGATE" },
    { slug: "staticclock", name: "StaticClock" },
    { slug: "azmail", name: "AZMail" },
    { slug: "aznet", name: "AZNet" },
    { slug: "fraggate", name: "FragGate" },
  ].sort(compareSoftware);
  assert.deepEqual(ordered.map((p) => p.slug), ["azmail", "aznet", "staticclock", "decisiongate", "fraggate", "peacelock"]);
});

test("collectCatalogProducts merges products, engines, and slug lists with no 27 cap", () => {
  const catalog = mockCatalog();
  const collected = collectCatalogProducts(catalog);
  assert.ok(collected.length > 27, "must not cap at 27");
  const slugs = collected.map((p) => p.slug);
  assert.ok(slugs.includes("peacelock"));
  assert.ok(slugs.includes("azmail"));
  assert.ok(slugs.includes("plain-24"));
  assert.equal(displayName({ slug: "azmail" }), "AZMail");
  assert.equal(displayName({ slug: "aznet" }), "AZNet");
});

test("mergeSoftwareExtras adds AZNet, FragGate, EmbryoLock, and AZCoherence without dropping catalog items", () => {
  const catalog = collectCatalogProducts({
    products: [{ slug: "peacelock", name: "PeaceLock" }, { slug: "foldlock", name: "FoldLock" }],
  });
  const merged = mergeSoftwareExtras(catalog);
  assert.equal(merged.filter((p) => p.slug === "peacelock").length, 1);
  assert.equal(merged.filter((p) => p.slug === "foldlock").length, 1);
  assert.ok(merged.some((p) => p.slug === "aznet" && p.worker_home === AZNET_WORKER_HOME));
  assert.ok(merged.some((p) => p.slug === "fraggate" && p.door));
  assert.ok(merged.some((p) => p.slug === "embryolock" && p.catalog_only));
  assert.equal(SOFTWARE_EXTRAS.length, 4);
  assert.ok(merged.some((p) => p.slug === "azcoherence"));
  const already = mergeSoftwareExtras([{ slug: "fraggate", name: "FragGate", door: true }]);
  assert.equal(already.filter((p) => p.slug === "fraggate").length, 1);
  const fg = already.find((p) => p.slug === "fraggate");
  assert.equal(fg.download, FRAGGATE_DOWNLOAD);
  assert.equal(fg.worker_home, FRAGGATE_WORKER_HOME);
  assert.equal(fg.count, FRAGGATE_COUNT);
  assert.equal(countUrlForProduct(fg), FRAGGATE_COUNT);
  const az = already.find((p) => p.slug === "aznet");
  assert.equal(az.download, AZNET_DOWNLOAD);
  assert.equal(az.worker_home, AZNET_WORKER_HOME);
  assert.equal(az.count, AZNET_COUNT);
  assert.equal(countUrlForProduct(az), AZNET_COUNT);
  assert.equal(softwareKind(az), "plain");
});

test("mergeSoftwareExtras fills FragGate Worker download when catalog extras omit it", () => {
  const collected = collectCatalogProducts({
    extras: [{
      slug: "fraggate",
      name: "FragGate",
      door: "fraggate",
      worker: null,
      github: "https://github.com/AzielEliab/fraggate",
      one_line: "Hashed registry door. Not a Software engine and not a download-tracker.",
    }],
  });
  const merged = mergeSoftwareExtras(collected);
  const fg = merged.find((p) => p.slug === "fraggate");
  assert.equal(merged.filter((p) => p.slug === "fraggate").length, 1);
  assert.equal(fg.download, FRAGGATE_DOWNLOAD);
  assert.equal(fg.worker, "fraggate-download-tracker");
  assert.equal(fg.worker_home, FRAGGATE_WORKER_HOME);
  assert.equal(fg.count, FRAGGATE_COUNT);
  assert.equal(countUrlForProduct({ slug: "fraggate", count: null }), FRAGGATE_COUNT);
  assert.match(fg.one_line, /Separate FragGate app/);
  assert.doesNotMatch(fg.one_line, /not a download-tracker/i);
});

test("mergeSoftwareExtras fills AZNet Worker download/count when catalog omits the slug", () => {
  const collected = collectCatalogProducts({
    products: [{ slug: "azbrowser", name: "AZBrowser", download: "https://azbrowser-download-tracker.vibelock.workers.dev/download" }],
  });
  const merged = mergeSoftwareExtras(collected);
  const az = merged.find((p) => p.slug === "aznet");
  assert.equal(merged.filter((p) => p.slug === "aznet").length, 1);
  assert.equal(az.download, AZNET_DOWNLOAD);
  assert.equal(az.worker, "aznet-download-tracker");
  assert.equal(az.worker_home, AZNET_WORKER_HOME);
  assert.equal(az.count, AZNET_COUNT);
  assert.equal(countUrlForProduct({ slug: "aznet", count: null }), AZNET_COUNT);
  assert.equal(softwareKind(az), "plain");
  assert.match(az.one_line, /Separate software; functional-order pair with AZBrowser/);
  assert.ok(merged.some((p) => p.slug === "azbrowser"));
});

test("productLinks tethers download, GitHub, and same-origin FragGate MCP door", () => {
  const links = productLinks({
    slug: "foldlock",
    worker: "foldlock-download-tracker",
    download: "https://foldlock.example/download",
    github: "https://github.com/AzielEliab/foldlock",
  });
  const hrefs = links.map((l) => l.href);
  assert.ok(hrefs.includes("https://foldlock.example/download"));
  assert.ok(hrefs.includes("https://github.com/AzielEliab/foldlock"));
  assert.ok(hrefs.includes("/runtime"));
  assert.ok(hrefs.includes("/runtime/v1/fraggate/list"));
  assert.ok(hrefs.includes("/runtime/mcp"));
  assert.ok(hrefs.includes("/runtime/v1/fraggate/describe?slug=foldlock"));
  const door = productLinks({ slug: "embryolock", catalog_only: true, github: "https://github.com/AzielEliab/embryolock" });
  assert.ok(!door.some((l) => l.label === "Download"));
  assert.ok(door.some((l) => l.href === "/runtime/v1/fraggate/describe?slug=embryolock"));
  const fg = productLinks(SOFTWARE_EXTRAS.find((p) => p.slug === "fraggate"));
  assert.equal(fg[0].label, "Download");
  assert.equal(fg[0].primary, true);
  assert.equal(fg[0].href, FRAGGATE_DOWNLOAD);
  assert.ok(fg.some((l) => l.label === "Worker" && l.href === FRAGGATE_WORKER_HOME && !l.primary));
  assert.ok(fg.some((l) => l.label === "GitHub" && l.href === "https://github.com/AzielEliab/fraggate"));
  const azb = productLinks({
    slug: "azbrowser",
    download: "https://azbrowser-download-tracker.vibelock.workers.dev/download",
    worker: "azbrowser-download-tracker",
    worker_home: "https://azbrowser-download-tracker.vibelock.workers.dev/",
    github: "https://github.com/AzielEliab/azbrowser",
  });
  assert.equal(azb[0].href, "https://azbrowser-download-tracker.vibelock.workers.dev/download");
  assert.ok(!azb.some((l) => l.label === "Worker"));
  assert.ok(!azb.some((l) => /fraggate-download-tracker/.test(l.href)));
  assert.ok(!azb.some((l) => /aznet-download-tracker/.test(l.href)));
  const azn = productLinks(SOFTWARE_EXTRAS.find((p) => p.slug === "aznet"));
  assert.equal(azn[0].label, "Download");
  assert.equal(azn[0].primary, true);
  assert.equal(azn[0].href, AZNET_DOWNLOAD);
  assert.ok(azn.some((l) => l.label === "Worker" && l.href === AZNET_WORKER_HOME && !l.primary));
  assert.ok(azn.some((l) => l.label === "GitHub" && l.href === "https://github.com/AzielEliab/aznet"));
  assert.ok(!azn.some((l) => /fraggate-download-tracker/.test(l.href)));
  assert.ok(!azn.some((l) => /azbrowser-download-tracker/.test(l.href)));
  const azc = productLinks(SOFTWARE_EXTRAS.find((p) => p.slug === "azcoherence"));
  assert.equal(azc[0].label, "Download");
  assert.equal(azc[0].primary, true);
  assert.equal(azc[0].href, AZCOHERENCE_DOWNLOAD);
  assert.ok(azc.some((l) => l.label === "Worker" && l.href === AZCOHERENCE_WORKER_HOME && !l.primary));
  assert.ok(azc.some((l) => l.label === "GitHub" && l.href === "https://github.com/AzielEliab/AZCoherence"));
  assert.ok(azc.some((l) => /fraggate\/describe\?slug=azcoherence/.test(l.href)));
  const azh = productLinks({
    slug: "azhub",
    download: "https://azhub-download-tracker.vibelock.workers.dev/download",
    worker: "azhub-download-tracker",
    github: "https://github.com/AzielEliab/azhub",
  });
  assert.equal(azh[0].href, "https://azhub-download-tracker.vibelock.workers.dev/download");
  assert.ok(azh.some((l) => l.label === "Worker" && l.href === "https://azhub-download-tracker.vibelock.workers.dev/" && !l.primary));
  assert.ok(!azh.some((l) => /azinterface-download-tracker/.test(l.href)));
  const azi = productLinks({
    slug: "azinterface",
    download: "https://azinterface-download-tracker.vibelock.workers.dev/download",
    worker: "azinterface-download-tracker",
    github: "https://github.com/AzielEliab/azinterface",
  });
  assert.equal(azi[0].href, "https://azinterface-download-tracker.vibelock.workers.dev/download");
  assert.ok(azi.some((l) => l.label === "Worker" && l.href === "https://azinterface-download-tracker.vibelock.workers.dev/" && !l.primary));
  assert.ok(!azi.some((l) => /azhub-download-tracker/.test(l.href)));
});

test("hubSoftwareCopy prefers separate software over separate engine", () => {
  assert.equal(
    hubSoftwareCopy("AZInterface is a separate engine."),
    "AZInterface is separate software.",
  );
  assert.equal(
    hubSoftwareCopy("AZNet is a separate engine (order/token pairing only)."),
    "AZNet is separate software (order/token pairing only).",
  );
  assert.equal(
    hubSoftwareCopy("Separate engine; functional-order pair with AZBrowser."),
    "Separate software; functional-order pair with AZBrowser.",
  );
  assert.equal(hubSoftwareCopy("Same FragGate door."), "Same FragGate door.");
});

test("count and uses helpers surface download, view, upload, and slug uses", () => {
  assert.deepEqual(parseCountPayload({ views: 10, downloads: 4, uploads: 2 }), { downloads: 4, views: 10, uploads: 2 });
  assert.deepEqual(parseCountPayload({ project: "fraggate", views: 8, downloads: 1, total: 1 }), { downloads: 1, views: 8, uploads: null });
  assert.equal(pathMentionsSlug("/p/foldlock/health", "foldlock"), true);
  assert.equal(pathMentionsSlug("/p/godlock/health", "foldlock"), false);
  assert.equal(usesForSlug({ by_path: { "/p/foldlock/health": 3, "/runtime/v1/pull/foldlock": 1 } }, "foldlock"), 4);
  assert.equal(usesForSlug({ by_op: { "codelock.health": 2 } }, "codelock"), 2);
  assert.equal(usesForSlug({ origin: { by_path: { "/p/codelock/health": 5 } } }, "codelock"), 5);
  assert.equal(usesForSlug({ by_op: { "azbrowser.ethical_search": 3, "azbrowser.pull": 1 } }, "azbrowser"), 4);
  assert.equal(usesForSlug({
    by_path: {},
    origin: { by_op: { "azbrowser.ethical_search": 2, "foldlock.health": 9 } },
  }, "azbrowser"), 2);
  assert.equal(usesForSlug({ by_path: { "/runtime/v1/fraggate/list": 4 } }, "fraggate"), 4);
  assert.deepEqual(countPills({ downloads: 4, views: 10, uses: 3 }), ["4 downloads", "10 views", "3 uses"]);
  assert.equal(countUrlForProduct({ slug: "azbrowser", count: "https://azbrowser-download-tracker.vibelock.workers.dev/count" }), "https://azbrowser-download-tracker.vibelock.workers.dev/count");
  assert.deepEqual(parseCountPayload({ project: "aznet", views: 3, downloads: 1, total: 1 }), { downloads: 1, views: 3, uploads: null });
  assert.equal(countUrlForProduct({ slug: "aznet" }), AZNET_COUNT);
});

test("softwareBody renders every card in Plain → Gate → Lock with live-catalog copy", () => {
  const products = mergeSoftwareExtras(collectCatalogProducts(mockCatalog()))
    .map((p) => ({
      slug: p.slug,
      name: displayName(p),
      kind: softwareKind(p),
      door: Boolean(p.door),
      catalog_only: Boolean(p.catalog_only),
      extra: Boolean(p.extra),
      blurb: p.one_line || "",
      links: productLinks(p),
    }))
    .sort(compareSoftware);
  const html = softwareBody({
    hub: { name: "aziel-runtime", root: true, blurb: "door", links: [{ href: "/runtime", label: "Runtime", primary: true }] },
    products,
    downloadable: 31,
    extras: 4,
    fetched: 0,
    catalogVersion: "1.6.4",
    usesTotal: 8,
    siteViews: 12,
    siteDownloads: 5,
  });
  assert.match(html, /<h1>Softwares<\/h1>\s*<\/section>\s*<section class="soft-section"><h2>Software<\/h2>/);
  assert.doesNotMatch(html, /Part of the Aziel Eliab ecosystem/);
  assert.match(html, /\/runtime\/v1\/software/);
  assert.match(html, /fraggate\/list/);
  assert.match(html, /PeaceLock/);
  assert.match(html, /AZMail/);
  assert.match(html, /FragGate/);
  assert.match(html, /AZNet/);
  assert.match(html, /EmbryoLock/);
  assert.match(html, /AZCoherence/);
  assert.match(html, /fraggate-download-tracker\.vibelock\.workers\.dev\/download/);
  assert.match(html, /aznet-download-tracker\.vibelock\.workers\.dev\/download/);
  assert.match(html, /azcoherence-download-tracker\.vibelock\.workers\.dev\/download/);
  assert.match(html, /<h2>Software<\/h2>/);
  assert.match(html, /<h2>Gate<\/h2>/);
  assert.match(html, /<h2>Lock<\/h2>/);
  const idxH1 = html.indexOf("<h1>Softwares</h1>");
  const idxPlain = html.indexOf("<h2>Software</h2>");
  const idxGate = html.indexOf("<h2>Gate</h2>");
  const idxLock = html.indexOf("<h2>Lock</h2>");
  const idxAzmail = html.indexOf('data-slug="azmail"');
  const idxAznet = html.indexOf('data-slug="aznet"');
  const idxGateCard = html.indexOf('data-slug="decisiongate"');
  const idxPeace = html.indexOf('data-slug="peacelock"');
  const idxClock = html.indexOf('data-slug="staticclock"');
  assert.ok(idxH1 < idxPlain && idxPlain < idxGate && idxGate < idxLock);
  assert.ok(idxAzmail < idxAznet && idxAznet < idxGateCard && idxClock < idxGateCard);
  assert.ok(idxGateCard < idxPeace);
  assert.doesNotMatch(html, /mirrors the live aziel-runtime catalog/);
  assert.doesNotMatch(html, /no fixed 27-product cap/i);
  assert.doesNotMatch(html, /31 catalog products/);
  assert.doesNotMatch(html, /Runtime \d+\.\d+\.\d+ · FragGate/);
  assert.doesNotMatch(html, /aziel-runtime \d+\.\d+\.\d+ FragGate/);
  assert.doesNotMatch(html, /Featured first/);
  assert.doesNotMatch(html, BANNED);
  assert.match(html, /class="button"[^>]*href="https:\/\/glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime"[^>]*>Try on Glama</);
  assert.match(html, /Source on GitHub/);
  assert.match(html, /https:\/\/github\.com\/AzielEliab\/aziel-runtime/);
  assert.match(html, /Documentation/);
  assert.match(html, /https:\/\/github\.com\/AzielEliab\/aziel-runtime\/tree\/main\/docs\/2\.0/);
  assert.match(html, /class="runtime-muted"[^>]*href="https:\/\/aziel-runtime\.vibelock\.workers\.dev\/"/);
  assert.match(html, /Official Runtime/);
  assert.doesNotMatch(html, /Try\/Deploy on Glama/);
  assert.doesNotMatch(html, /glama\.ai\/mcp\/servers\/[0-9a-f]{8,}/i);
  const glamaAt = html.indexOf(">Try on Glama<");
  const workerAt = html.indexOf(">Official Runtime<");
  assert.ok(glamaAt >= 0 && workerAt > glamaAt, "Try on Glama precedes the muted Worker link");
  const articleCount = (html.match(/<article class="soft-card/g) || []).length;
  assert.ok(articleCount >= 35, "hub + 31 catalog-ish + extras including AZNet and AZCoherence");
});

test("GET /software uses AZIEL_RUNTIME catalog binding and lists every product", async () => {
  const catalog = mockCatalog();
  const origFetch = globalThis.fetch;
  globalThis.fetch = blockLiveRuntime(origFetch, (href) => {
    if (href === FRAGGATE_COUNT) {
      return new Response(JSON.stringify({ project: "fraggate", views: 2, downloads: 0, total: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (href === AZNET_COUNT) {
      return new Response(JSON.stringify({ project: "aznet", views: 3, downloads: 1, total: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (href === AZCOHERENCE_COUNT) {
      return new Response(JSON.stringify({ project: "azcoherence", views: 5, downloads: 1, total: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return null;
  });
  const env = stubEnv({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/software") || url.pathname.endsWith("/catalog.json")) {
        return new Response(JSON.stringify(catalog), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (url.pathname.endsWith("/uses")) {
        return new Response(JSON.stringify({
          uses: 7,
          by_path: { "/p/foldlock/health": 2 },
          by_op: { "azbrowser.ethical_search": 3, "azbrowser.pull": 1, "fraggate.list": 6 },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("no", { status: 404 });
    },
  });
  const res = await handleHosted(
    new Request(HOST + "/software", { headers: { Accept: "text/html" } }),
    new URL(HOST + "/software"),
    env,
    {},
    null,
    { views: 99, downloads: 11 },
  );
  try {
    assert.ok(res);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /PeaceLock/);
    assert.match(html, /AZMail/);
    assert.match(html, /FragGate/);
    assert.match(html, /AZNet/);
    assert.match(html, /EmbryoLock/);
    assert.match(html, /AZCoherence/);
    assert.match(html, /Plain Product 24/);
    assert.match(html, /fraggate-download-tracker\.vibelock\.workers\.dev\/download/);
    assert.match(html, /aznet-download-tracker\.vibelock\.workers\.dev\/download/);
    assert.match(html, /azcoherence-download-tracker\.vibelock\.workers\.dev\/download/);
    assert.match(html, /aziel-runtime/);
    assert.doesNotMatch(html, /Runtime 1\.6\.4 · FragGate/);
    assert.doesNotMatch(html, /aziel-runtime 1\.6\.4 FragGate/);
    assert.doesNotMatch(html, /aziel-runtime \d+\.\d+\.\d+ FragGate/);
    assert.doesNotMatch(html, /aziel-runtime 1\.6\.2/);
    assert.doesNotMatch(html, /softwareVersion":"1\.6\.2"/);
    const ldMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
    assert.ok(ldMatch, "json-ld missing");
    const ld = JSON.parse(ldMatch[1]);
    const runtimeApp = ld["@graph"].find((n) => n["@type"] === "SoftwareApplication" && n.name === "aziel-runtime");
    assert.equal(runtimeApp["@id"], "https://www.azieleliab.com/runtime#runtime");
    assert.deepEqual(runtimeApp.author, { "@id": "https://www.azieleliab.com/#aziel" });
    assert.equal(runtimeApp.softwareVersion, "1.6.4");
    assert.match(runtimeApp.description, /aziel-runtime/);
    assert.doesNotMatch(runtimeApp.description, /aziel-runtime 1\.6\.4 FragGate/);
    assert.doesNotMatch(runtimeApp.description, /1\.6\.2/);
    assert.match(html, /\/runtime\/v1\/fraggate\/describe\?slug=peacelock/);
    assert.match(html, /\/runtime\/mcp/);
    assert.match(html, /<h1>Softwares<\/h1>\s*<\/section>\s*<section class="soft-section"><h2>Software<\/h2>/);
    assert.match(html, /Part of the Aziel Eliab ecosystem/);
    const ecoAt = html.indexOf("Part of the Aziel Eliab ecosystem");
    const listAt = html.indexOf("<h2>Software</h2>");
    assert.ok(listAt >= 0 && ecoAt > listAt, "ecosystem footer is not between Softwares H1 and the list");
    assert.match(html, /\/runtime\/v1\/software/);
    assert.match(res.headers.get("cache-control") || "", /s-maxage=3600|no-store/);
    assert.doesNotMatch(html, BANNED);
    assert.match(html, /<title>Softwares — Aziel Eliab catalog \| Aziel Digital Library<\/title>/);
    assert.match(html, /<h1>Softwares<\/h1>/);
    const softPage = ld["@graph"].find((n) => n["@type"] === "CollectionPage");
    assert.equal(softPage.name, "Softwares");
    assert.doesNotMatch(html, /triad \+25|quiet triad|collection score/i);
    const built = await loadSoftwareCatalog(env, { views: 99, downloads: 11 });
    assert.equal(built.catalogVersion, "1.6.4");
    assert.equal(built.hub.version, "1.6.4");
    assert.match(built.hub.blurb, /aziel-runtime/);
    assert.doesNotMatch(built.hub.blurb, /aziel-runtime 1\.6\.4 FragGate/);
    assert.doesNotMatch(built.hub.blurb, /1\.6\.2/);
    assert.ok(built.hub.links.some((l) => l.primary && l.label === "aziel-runtime"));
    assert.ok(built.hub.links.some((l) => l.primary && l.label === "Try on Glama" && l.href === "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime"));
    assert.ok(built.hub.links.some((l) => l.label === "Source on GitHub" && l.href === "https://github.com/AzielEliab/aziel-runtime"));
    assert.ok(built.hub.links.some((l) => l.label === "Documentation" && l.href === "https://github.com/AzielEliab/aziel-runtime/tree/main/docs/2.0"));
    const workerLink = built.hub.links.find((l) => l.href === "https://aziel-runtime.vibelock.workers.dev/");
    assert.ok(workerLink);
    assert.equal(workerLink.label, "Official Runtime");
    assert.equal(workerLink.muted, true);
    assert.notEqual(workerLink.primary, true);
    assert.ok(!built.hub.links.some((l) => /Try\/Deploy/.test(l.label)));
    assert.ok(built.downloadable > 27);
    assert.ok(built.products.some((p) => p.slug === "azmail"));
    assert.ok(built.products.some((p) => p.slug === "embryolock"));
    assert.ok(built.products.some((p) => p.slug === "aznet"));
    assert.ok(built.products.some((p) => p.slug === "azcoherence"));
    const azc = built.products.find((p) => p.slug === "azcoherence");
    assert.equal(azc.kind, "plain");
    assert.ok(azc.links.some((l) => l.primary && l.label === "Download" && l.href === AZCOHERENCE_DOWNLOAD));
    assert.ok(azc.links.some((l) => l.label === "Worker" && l.href === AZCOHERENCE_WORKER_HOME));
    assert.ok(azc.pills.includes("1 downloads"));
    assert.ok(azc.pills.includes("5 views"));
    const fg = built.products.find((p) => p.slug === "fraggate");
    assert.ok(fg.links.some((l) => l.primary && l.label === "Download" && l.href === FRAGGATE_DOWNLOAD));
    assert.ok(fg.links.some((l) => l.label === "Worker" && l.href === FRAGGATE_WORKER_HOME));
    assert.ok(fg.links.some((l) => l.label === "GitHub"));
    assert.ok(fg.pills.includes("0 downloads"));
    assert.ok(fg.pills.includes("2 views"));
    const azn = built.products.find((p) => p.slug === "aznet");
    assert.equal(azn.kind, "plain");
    assert.ok(azn.links.some((l) => l.primary && l.label === "Download" && l.href === AZNET_DOWNLOAD));
    assert.ok(azn.links.some((l) => l.label === "Worker" && l.href === AZNET_WORKER_HOME));
    assert.ok(azn.pills.includes("1 downloads"));
    assert.ok(azn.pills.includes("3 views"));
    assert.ok(!azn.links.some((l) => /fraggate-download-tracker|azbrowser-download-tracker/.test(l.href)));
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("Googlebot /software is a light crawl path: all cards, unique SEO, no count fan-out", async () => {
  const catalog = mockCatalog();
  let countHits = 0;
  const origFetch = globalThis.fetch;
  globalThis.fetch = blockLiveRuntime(origFetch, (href) => {
    if (/\/count(?:\?|$)/.test(href) || href === FRAGGATE_COUNT || href === AZNET_COUNT || href === AZCOHERENCE_COUNT) {
      countHits += 1;
      return new Promise(() => {});
    }
    return null;
  });
  const env = stubEnv({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/software") || url.pathname.endsWith("/catalog.json")) {
        return new Response(JSON.stringify(catalog), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (url.pathname.endsWith("/uses")) {
        return new Promise(() => {});
      }
      return new Response("no", { status: 404 });
    },
  });
  const started = Date.now();
  const res = await handleHosted(
    new Request(HOST + "/software", { headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" } }),
    new URL(HOST + "/software"),
    env,
    {},
    null,
    { views: 99, downloads: 11 },
  );
  try {
    assert.ok(res);
    assert.equal(res.status, 200);
    assert.ok(Date.now() - started < 2000, "Googlebot Softwares HTML must not wait on count fan-out");
    assert.equal(countHits, 0);
    assert.match(res.headers.get("cache-control") || "", /s-maxage=3600/);
    assert.match(res.headers.get("x-robots-tag") || "", /index/);
    const html = await res.text();
    assert.match(html, /<title>Softwares — Aziel Eliab catalog \| Aziel Digital Library<\/title>/);
    assert.match(html, /<h1>Softwares<\/h1>/);
    assert.match(html, /PeaceLock/);
    assert.match(html, /AZCoherence/);
    assert.match(html, /Plain Product 24/);
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
    const pageLd = ld["@graph"].find((n) => n["@type"] === "CollectionPage");
    assert.equal(pageLd.name, "Softwares");
    assert.doesNotMatch(html, BANNED);
    const light = await loadSoftwareCatalog(env, { views: 99, downloads: 11 }, { light: true });
    assert.ok(light.products.some((p) => p.slug === "peacelock"));
    assert.ok(light.products.some((p) => p.slug === "azcoherence"));
    assert.equal(light.products.find((p) => p.slug === "fraggate").pills.length, 0);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("empty Softwares catalog still ships unique title, description, and CollectionPage JSON-LD", async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = blockLiveRuntime(origFetch);
  const env = stubEnv({
    async fetch() {
      return new Response(JSON.stringify({ products: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  const res = await handleHosted(
    new Request(HOST + "/software", { headers: { Accept: "text/html", "User-Agent": "Googlebot/2.1" } }),
    new URL(HOST + "/software"),
    env,
    {},
    null,
    null,
  );
  try {
    const html = await res.text();
    assert.match(html, /<title>Softwares — Aziel Eliab catalog \| Aziel Digital Library<\/title>/);
    assert.match(html, /not merely an API orchestrator/);
    assert.match(html, /Softwares catalog for aziel-runtime/);
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
    assert.ok(ld["@graph"].some((n) => n["@type"] === "CollectionPage" && n.name === "Softwares"));
    assert.ok(ld["@graph"].some((n) => n["@type"] === "Person" && n.name === "Aziel Eliab" && n["@id"] === "https://www.azieleliab.com/#aziel"));
    const site = ld["@graph"].find((n) => n["@type"] === "WebSite");
    assert.equal(site.name, "Aziel Corpus Library");
    assert.deepEqual(site.publisher, { "@id": "https://www.azieleliab.com/#aziel" });
    const runtimeApp = ld["@graph"].find((n) => n["@type"] === "SoftwareApplication" && n.name === "aziel-runtime");
    assert.equal(runtimeApp["@id"], "https://www.azieleliab.com/runtime#runtime");
    assert.deepEqual(runtimeApp.author, { "@id": "https://www.azieleliab.com/#aziel" });
    const api = ld["@graph"].find((n) => n["@type"] === "WebAPI");
    assert.equal(api["@id"], "https://www.azieleliab.com/runtime#fraggate");
    assert.deepEqual(api.isPartOf, { "@id": "https://www.azieleliab.com/runtime#runtime" });
    assert.match(html, /AZCoherence|FragGate|EmbryoLock/);
    assert.doesNotMatch(html, BANNED);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("AZNet and FragGate card Worker /count pills; AZBrowser stays separate software", async () => {
  const catalog = {
    version: "1.6.6",
    products: [{
      slug: "azbrowser",
      name: "AZBrowser",
      version: "0.1.0",
      download: "https://azbrowser-download-tracker.vibelock.workers.dev/download",
      worker: "azbrowser-download-tracker",
      worker_home: "https://azbrowser-download-tracker.vibelock.workers.dev/",
      count: "https://azbrowser-download-tracker.vibelock.workers.dev/count",
      github: "https://github.com/AzielEliab/azbrowser",
      one_line: "AZBrowser / AZNet Phase 1. FragGate only.",
    }],
    extras: [{
      slug: "fraggate",
      name: "FragGate",
      door: "fraggate",
      worker: null,
      github: "https://github.com/AzielEliab/fraggate",
      one_line: "Hashed registry door. Not a download-tracker.",
    }],
  };
  const env = stubEnv({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/catalog.json")) {
        return new Response(JSON.stringify(catalog), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (url.pathname.endsWith("/uses")) {
        return new Response(JSON.stringify({
          uses: 40,
          by_path: { "/v1/fraggate/list": 5 },
          by_op: { "azbrowser.ethical_search": 3, "azbrowser.pull": 1, "fraggate.call": 9 },
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("no", { status: 404 });
    },
  });
  const origFetch = globalThis.fetch;
  globalThis.fetch = blockLiveRuntime(origFetch, (href) => {
    if (href === FRAGGATE_COUNT) {
      return new Response(JSON.stringify({ project: "fraggate", views: 8, downloads: 1, total: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (href === "https://azbrowser-download-tracker.vibelock.workers.dev/count") {
      return new Response(JSON.stringify({ project: "azbrowser", views: 4, downloads: 2, total: 2 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (href === AZNET_COUNT) {
      return new Response(JSON.stringify({ project: "aznet", views: 3, downloads: 1, total: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (href === AZCOHERENCE_COUNT) {
      return new Response(JSON.stringify({ project: "azcoherence", views: 5, downloads: 1, total: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return null;
  });
  try {
    const built = await loadSoftwareCatalog(env, {});
    const fg = built.products.find((p) => p.slug === "fraggate");
    const azb = built.products.find((p) => p.slug === "azbrowser");
    const azn = built.products.find((p) => p.slug === "aznet");
    assert.ok(fg);
    assert.ok(azb);
    assert.ok(azn);
    assert.deepEqual(fg.pills, ["1 downloads", "8 views", "5 uses"]);
    assert.ok(fg.links.some((l) => l.primary && l.href === FRAGGATE_DOWNLOAD));
    assert.ok(fg.links.some((l) => l.label === "Worker" && l.href === FRAGGATE_WORKER_HOME));
    assert.match(fg.blurb, /Separate FragGate app/);
    assert.equal(fg.kind, "gate");
    assert.deepEqual(azb.pills, ["2 downloads", "4 views", "4 uses"]);
    assert.equal(azb.links[0].href, "https://azbrowser-download-tracker.vibelock.workers.dev/download");
    assert.ok(!azb.links.some((l) => /fraggate-download-tracker/.test(l.href)));
    assert.ok(!azb.links.some((l) => /aznet-download-tracker/.test(l.href)));
    assert.ok(!azb.links.some((l) => l.label === "Worker"));
    assert.equal(azn.kind, "plain");
    assert.deepEqual(azn.pills, ["1 downloads", "3 views"]);
    assert.ok(azn.links.some((l) => l.primary && l.href === AZNET_DOWNLOAD));
    assert.ok(azn.links.some((l) => l.label === "Worker" && l.href === AZNET_WORKER_HOME));
    assert.ok(!azn.links.some((l) => /fraggate-download-tracker|azbrowser-download-tracker/.test(l.href)));
    assert.match(azn.blurb, /Separate software; functional-order pair with AZBrowser/);
    const html = softwareBody(built);
    assert.match(html, /data-slug="fraggate"/);
    assert.match(html, /data-slug="aznet"/);
    assert.match(html, /data-slug="azbrowser"/);
    assert.match(html, /1 downloads/);
    assert.match(html, /8 views/);
    assert.match(html, /3 views/);
    assert.match(html, /fraggate-download-tracker\.vibelock\.workers\.dev\/download/);
    assert.match(html, /aznet-download-tracker\.vibelock\.workers\.dev\/download/);
    assert.match(html, /aziel-runtime/);
    assert.doesNotMatch(html, /Runtime 1\.6\.6 · FragGate/);
    assert.doesNotMatch(html, /aziel-runtime 1\.6\.6 FragGate/);
    const idxAzb = html.indexOf('data-slug="azbrowser"');
    const idxAzn = html.indexOf('data-slug="aznet"');
    const idxFg = html.indexOf('data-slug="fraggate"');
    assert.ok(idxAzb < idxAzn && idxAzn < idxFg);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("loadSoftwareCatalog rewrites live catalog one_lines and adds Worker homepage", async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes("/v1/catalog.json") || href.includes("/v1/software")) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          version: "1.6.9",
          products: [
            {
              slug: "azbrowser",
              name: "AZBrowser",
              one_line: "AZBrowser (AZB-1.0): Lamb Lens ethical research browser. Cite; refuse harvest; no invented visits. FragGate only. AZNet is a separate engine (order/token pairing only).",
              kind: "software",
              github: "https://github.com/AzielEliab/azbrowser",
              worker: "azbrowser-download-tracker",
              worker_home: "https://azbrowser-download-tracker.vibelock.workers.dev/",
              download: "https://azbrowser-download-tracker.vibelock.workers.dev/download",
              count: "https://azbrowser-download-tracker.vibelock.workers.dev/count",
            },
            {
              slug: "aznet",
              name: "AZNet",
              one_line: "AZNet (AZN-WP-0.1): silent verification side-net. Hash continuity without hosting. Separate engine; functional-order pair with AZBrowser.",
              kind: "software",
              github: "https://github.com/AzielEliab/aznet",
              worker: "aznet-download-tracker",
              worker_home: "https://aznet-download-tracker.vibelock.workers.dev/",
              download: "https://aznet-download-tracker.vibelock.workers.dev/download",
              count: "https://aznet-download-tracker.vibelock.workers.dev/count",
            },
            {
              slug: "azhub",
              name: "AZHub",
              one_line: "AZHub (AIH-WP-1.0): Blank Key / neutral spatial container. Does not interpret. FragGate only. AZInterface is sibling software under the same FragGate door.",
              kind: "software",
              github: "https://github.com/AzielEliab/azhub",
              worker: "azhub-download-tracker",
              worker_home: "https://azhub-download-tracker.vibelock.workers.dev/",
              download: "https://azhub-download-tracker.vibelock.workers.dev/download",
              count: "https://azhub-download-tracker.vibelock.workers.dev/count",
            },
            {
              slug: "azinterface",
              name: "AZInterface",
              one_line: "AZInterface (AIH-WP-1.0): custodial operating environment. Pre-locked page cycles OFF/integrity/ON/FULL SHUTDOWN/MEMORIAL. FragGate only. AZHub is sibling software under the same FragGate door.",
              kind: "software",
              github: "https://github.com/AzielEliab/azinterface",
              worker: "azinterface-download-tracker",
              worker_home: "https://azinterface-download-tracker.vibelock.workers.dev/",
              download: "https://azinterface-download-tracker.vibelock.workers.dev/download",
              count: "https://azinterface-download-tracker.vibelock.workers.dev/count",
            },
          ],
        }),
      };
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  try {
    const built = await loadSoftwareCatalog();
    const azh = built.products.find((p) => p.slug === "azhub");
    const azi = built.products.find((p) => p.slug === "azinterface");
    const azb = built.products.find((p) => p.slug === "azbrowser");
    const azn = built.products.find((p) => p.slug === "aznet");
    assert.ok(azh);
    assert.ok(azi);
    assert.ok(azn);
    assert.equal(azh.kind, "plain");
    assert.equal(azi.kind, "plain");
    assert.equal(azn.kind, "plain");
    assert.match(azh.blurb, /AZInterface is sibling software under the same FragGate door/);
    assert.match(azi.blurb, /AZHub is sibling software under the same FragGate door/);
    assert.match(azb.blurb, /AZNet is separate software/);
    assert.match(azn.blurb, /Separate software; functional-order pair with AZBrowser/);
    assert.ok(!/separate engine/i.test(azh.blurb + azi.blurb + azb.blurb + azn.blurb));
    assert.ok(azh.links.some((l) => l.primary && l.href === "https://azhub-download-tracker.vibelock.workers.dev/download"));
    assert.ok(azh.links.some((l) => l.label === "Worker" && l.href === "https://azhub-download-tracker.vibelock.workers.dev/"));
    assert.ok(azi.links.some((l) => l.primary && l.href === "https://azinterface-download-tracker.vibelock.workers.dev/download"));
    assert.ok(azi.links.some((l) => l.label === "Worker" && l.href === "https://azinterface-download-tracker.vibelock.workers.dev/"));
    assert.ok(!azb.links.some((l) => l.label === "Worker"));
    assert.ok(!azh.links.some((l) => /azinterface-download-tracker/.test(l.href)));
    assert.ok(!azi.links.some((l) => /azhub-download-tracker/.test(l.href)));
    const html = softwareBody(built);
    const idxAzb = html.indexOf('data-slug="azbrowser"');
    const idxAzh = html.indexOf('data-slug="azhub"');
    const idxAzi = html.indexOf('data-slug="azinterface"');
    const idxAzn = html.indexOf('data-slug="aznet"');
    assert.ok(idxAzb < idxAzh && idxAzh < idxAzi && idxAzi < idxAzn);
    assert.match(html, /azhub-download-tracker\.vibelock\.workers\.dev\/["']/);
    assert.match(html, /azinterface-download-tracker\.vibelock\.workers\.dev\/["']/);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("normalizeSoftwareDoc accepts /v1/software and fraggate/list shapes", () => {
  const fromSoftware = normalizeSoftwareDoc({
    version: "1.6.11",
    software: [{ slug: "azmail", name: "AZMail", one_line: "Mail door." }],
  });
  assert.equal(fromSoftware.products[0].slug, "azmail");
  const fromList = normalizeSoftwareDoc({
    kernel_version: "FG-0.1",
    entries: [
      { slug: "decisiongate", name: "DecisionGATE", description: "Five gates." },
      { slug: "embryolock", name: "EmbryoLock", status: "stub", local_not_hosted: true, description: "Name only." },
    ],
  });
  assert.equal(fromList.products.length, 2);
  assert.equal(fromList.products[0].one_line, "Five gates.");
  assert.equal(fromList.products[1].catalog_only, true);
});

test("fetchLiveSoftwareCatalog prefers /v1/software then fraggate/list", async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = blockLiveRuntime(origFetch);
  const envSoftware = stubEnv({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/software")) {
        return new Response(JSON.stringify({
          version: "1.6.11",
          products: [{ slug: "azbrowser", name: "AZBrowser", one_line: "Lamb Lens." }],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (url.pathname.endsWith("/catalog.json")) {
        return new Response(JSON.stringify({
          version: "1.6.11",
          products: [{
            slug: "azbrowser",
            name: "AZBrowser",
            download: "https://azbrowser-download-tracker.vibelock.workers.dev/download",
          }],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("no", { status: 404 });
    },
  });
  try {
    const live = await fetchLiveSoftwareCatalog(envSoftware);
    assert.equal(live.source, "software");
    assert.ok(live.catalog.products.some((p) => p.slug === "azbrowser" && /download/.test(p.download)));

    const envList = stubEnv({
      async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname.endsWith("/fraggate/list")) {
          return new Response(JSON.stringify({
            ok: true,
            entries: [
              { slug: "peacelock", name: "PeaceLock", description: "Chosen silence." },
              { slug: "aznet", name: "AZNet", description: "Separate software; functional-order pair with AZBrowser." },
            ],
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
      },
    });
    const listed = await fetchLiveSoftwareCatalog(envList);
    assert.equal(listed.source, "fraggate/list");
    assert.ok(listed.catalog.products.some((p) => p.slug === "peacelock"));
    assert.ok(listed.catalog.products.some((p) => p.slug === "aznet"));
    assert.ok(!listed.catalog.products.some((p) => p.slug === "mesh"));
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("1.9.0 software[] plus catalog extras keep fraggate/mesh out of products[]", () => {
  const live = {
    version: "1.9.0",
    software: [
      { slug: "aziel-corpus", name: "Aziel Digital Library", download_url: "https://www.azielcorpuslibrary.net/download" },
      { slug: "peacelock", name: "PeaceLock" },
      { slug: "azcoherence", name: "AZCoherence" },
    ],
    fraggate: "https://aziel-runtime.vibelock.workers.dev/v1/fraggate",
    mesh: { status: "https://aziel-runtime.vibelock.workers.dev/v1/mesh/status", path: "/v1/mesh" },
  };
  const enrich = {
    version: "1.9.0",
    products: [{ slug: "peacelock", name: "PeaceLock", download: "https://peacelock.example/download" }],
    extras: [
      { slug: "fraggate", name: "FragGate", status: null },
      { slug: "mesh", name: "Quantum Node Mesh", status: "https://aziel-runtime.vibelock.workers.dev/v1/mesh/status" },
    ],
  };
  const tab = softwareTabCatalog(Object.assign({}, normalizeSoftwareDoc(live), {
    extras: collectCatalogExtras(live).concat(collectCatalogExtras(enrich)),
  }));
  assert.ok(tab.products.every((p) => p.slug !== "fraggate" && p.slug !== "mesh"));
  assert.ok(tab.products.some((p) => p.slug === "aziel-corpus" && p.download_url.endsWith("/download")));
  assert.ok(tab.extras.some((e) => e.slug === "fraggate" && (e.status == null || e.status === "")));
  assert.ok(tab.extras.some((e) => e.slug === "mesh" && /mesh\/status/.test(String(e.status || e.path || ""))));
  const collected = collectCatalogProducts({
    products: live.software.concat(enrich.extras),
    extras: enrich.extras,
  });
  assert.ok(!collected.some((p) => p.slug === "fraggate" || p.slug === "mesh"));
});

test("GET /v1/software products[] is Softwares-tab only; extras[] holds fraggate and mesh", async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = blockLiveRuntime(origFetch);
  const env = stubEnv({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/software")) {
        return new Response(JSON.stringify({
          version: "1.9.0",
          live_count: 37,
          software: [
            { slug: "aziel-corpus", name: "Aziel Digital Library", download_url: "https://www.azielcorpuslibrary.net/download" },
            { slug: "peacelock", name: "PeaceLock" },
          ],
          fraggate: "https://aziel-runtime.vibelock.workers.dev/v1/fraggate",
          mesh: { status: "https://aziel-runtime.vibelock.workers.dev/v1/mesh/status" },
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (url.pathname.endsWith("/catalog.json")) {
        return new Response(JSON.stringify({
          version: "1.9.0",
          products: [{ slug: "peacelock", name: "PeaceLock" }],
          extras: [
            { slug: "fraggate", name: "FragGate", status: null },
            { slug: "mesh", name: "Quantum Node Mesh", status: "https://aziel-runtime.vibelock.workers.dev/v1/mesh/status" },
          ],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("no", { status: 404 });
    },
  });
  try {
    const res = await handleRuntimeApi(
      new Request(HOST + "/v1/software", { headers: { Accept: "application/json" } }),
      new URL(HOST + "/v1/software"),
      env
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.ok(!body.products.some((p) => p.slug === "fraggate"));
    assert.ok(!body.products.some((p) => p.slug === "mesh"));
    assert.ok(body.extras.some((e) => e.slug === "fraggate"));
    assert.ok(body.extras.some((e) => e.slug === "mesh"));
    assert.equal(body.download_url, "https://www.azielcorpuslibrary.net/download");
    assert.match(body.v1_download, /\/v1\/download$/);
    const fg = body.extras.find((e) => e.slug === "fraggate");
    assert.ok(fg.status == null || fg.status === "");
    const mesh = body.extras.find((e) => e.slug === "mesh");
    assert.match(String(mesh.status), /mesh\/status/);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("GET /software HTML prefers packed catalog and does not wait on a hanging origin", async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = blockLiveRuntime(origFetch);
  const env = stubEnv({
    async fetch() {
      return new Promise(() => {});
    },
  });
  const started = Date.now();
  const res = await handleHosted(
    new Request(HOST + "/software", { headers: { Accept: "text/html" } }),
    new URL(HOST + "/software"),
    env,
    {},
    null,
    null,
  );
  try {
    assert.ok(res);
    assert.equal(res.status, 200);
    assert.ok(Date.now() - started < 2000, "Softwares HTML must not block SSR on a slow upstream");
    const html = await res.text();
    assert.match(html, /<h1>Softwares<\/h1>/);
    assert.match(html, /FragGate/);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("fetchLiveRuntimeVersion cites live health and falls back to 2.0.0-rc1", async () => {
  const env = stubEnv({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/v1/health")) {
        return new Response(JSON.stringify({ ok: true, version: "2.0.0-rc1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("no", { status: 404 });
    },
  });
  assert.equal(await fetchLiveRuntimeVersion(env, { timeoutMs: 200 }), "2.0.0-rc1");
  const quiet = stubEnv({
    async fetch() {
      return new Response(JSON.stringify({ error: "no" }), { status: 404 });
    },
  });
  assert.equal(await fetchLiveRuntimeVersion(quiet, { timeoutMs: 200 }), "2.0.0-rc1");
});
