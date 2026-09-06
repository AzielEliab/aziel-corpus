import test from "node:test";
import assert from "node:assert/strict";
import { softwareBody } from "./ui.js";
import { handleHosted } from "./hosted.js";
import {
  SOFTWARE_EXTRAS,
  FRAGGATE_DOWNLOAD,
  FRAGGATE_WORKER_HOME,
  FRAGGATE_COUNT,
  softwareKind,
  compareSoftware,
  displayName,
  collectCatalogProducts,
  mergeSoftwareExtras,
  productLinks,
  parseCountPayload,
  pathMentionsSlug,
  usesForSlug,
  countUrlForProduct,
  countPills,
  loadSoftwareCatalog,
} from "./software-catalog.js";

const HOST = "https://www.azielcorpuslibrary.net";
const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;

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
  const ordered = [
    { slug: "peacelock", name: "PeaceLock" },
    { slug: "decisiongate", name: "DecisionGATE" },
    { slug: "staticclock", name: "StaticClock" },
    { slug: "azmail", name: "AZMail" },
    { slug: "fraggate", name: "FragGate" },
  ].sort(compareSoftware);
  assert.deepEqual(ordered.map((p) => p.slug), ["azmail", "staticclock", "decisiongate", "fraggate", "peacelock"]);
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
});

test("mergeSoftwareExtras adds FragGate and EmbryoLock without dropping catalog items", () => {
  const catalog = collectCatalogProducts({
    products: [{ slug: "peacelock", name: "PeaceLock" }, { slug: "foldlock", name: "FoldLock" }],
  });
  const merged = mergeSoftwareExtras(catalog);
  assert.equal(merged.filter((p) => p.slug === "peacelock").length, 1);
  assert.equal(merged.filter((p) => p.slug === "foldlock").length, 1);
  assert.ok(merged.some((p) => p.slug === "fraggate" && p.door));
  assert.ok(merged.some((p) => p.slug === "embryolock" && p.catalog_only));
  assert.equal(SOFTWARE_EXTRAS.length, 2);
  const already = mergeSoftwareExtras([{ slug: "fraggate", name: "FragGate", door: true }]);
  assert.equal(already.filter((p) => p.slug === "fraggate").length, 1);
  const fg = already.find((p) => p.slug === "fraggate");
  assert.equal(fg.download, FRAGGATE_DOWNLOAD);
  assert.equal(fg.worker_home, FRAGGATE_WORKER_HOME);
  assert.equal(fg.count, FRAGGATE_COUNT);
  assert.equal(countUrlForProduct(fg), FRAGGATE_COUNT);
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
    extras: 2,
    fetched: 0,
    catalogVersion: "1.6.4",
    usesTotal: 8,
    siteViews: 12,
    siteDownloads: 5,
  });
  assert.match(html, /mirrors the live aziel-runtime catalog/);
  assert.match(html, /no fixed 27-product cap/i);
  assert.match(html, /31 catalog products/);
  assert.match(html, /PeaceLock/);
  assert.match(html, /AZMail/);
  assert.match(html, /FragGate/);
  assert.match(html, /EmbryoLock/);
  assert.match(html, /fraggate-download-tracker\.vibelock\.workers\.dev\/download/);
  assert.match(html, /Runtime 1\.6\.4 · FragGate/);
  assert.match(html, /not nested AZBrowser UI/);
  assert.match(html, /<h2>Software<\/h2>/);
  assert.match(html, /<h2>Gate<\/h2>/);
  assert.match(html, /<h2>Lock<\/h2>/);
  const idxPlain = html.indexOf("<h2>Software</h2>");
  const idxGate = html.indexOf("<h2>Gate</h2>");
  const idxLock = html.indexOf("<h2>Lock</h2>");
  const idxAzmail = html.indexOf('data-slug="azmail"');
  const idxGateCard = html.indexOf('data-slug="decisiongate"');
  const idxPeace = html.indexOf('data-slug="peacelock"');
  const idxClock = html.indexOf('data-slug="staticclock"');
  assert.ok(idxPlain < idxGate && idxGate < idxLock);
  assert.ok(idxAzmail < idxGateCard && idxClock < idxGateCard);
  assert.ok(idxGateCard < idxPeace);
  assert.match(html, /library views 12/);
  assert.doesNotMatch(html, /Featured first/);
  assert.doesNotMatch(html, BANNED);
  const articleCount = (html.match(/<article class="soft-card/g) || []).length;
  assert.ok(articleCount >= 33, "hub + 31 catalog-ish + extras");
});

test("GET /software uses AZIEL_RUNTIME catalog binding and lists every product", async () => {
  const catalog = mockCatalog();
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    if (href === FRAGGATE_COUNT) {
      return new Response(JSON.stringify({ project: "fraggate", views: 2, downloads: 0, total: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return origFetch(url, init);
  };
  const env = stubEnv({
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/catalog.json")) {
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
    assert.match(html, /EmbryoLock/);
    assert.match(html, /Plain Product 24/);
    assert.match(html, /fraggate-download-tracker\.vibelock\.workers\.dev\/download/);
    assert.match(html, /Runtime 1\.6\.4 · FragGate/);
    assert.match(html, /\/runtime\/v1\/fraggate\/describe\?slug=peacelock/);
    assert.match(html, /\/runtime\/mcp/);
    assert.match(html, /mirrors the live aziel-runtime catalog/);
    assert.doesNotMatch(html, BANNED);
    const built = await loadSoftwareCatalog(env, { views: 99, downloads: 11 });
    assert.ok(built.downloadable > 27);
    assert.ok(built.products.some((p) => p.slug === "azmail"));
    assert.ok(built.products.some((p) => p.slug === "embryolock"));
    const fg = built.products.find((p) => p.slug === "fraggate");
    assert.ok(fg.links.some((l) => l.primary && l.label === "Download" && l.href === FRAGGATE_DOWNLOAD));
    assert.ok(fg.links.some((l) => l.label === "Worker" && l.href === FRAGGATE_WORKER_HOME));
    assert.ok(fg.links.some((l) => l.label === "GitHub"));
    assert.ok(fg.pills.includes("0 downloads"));
    assert.ok(fg.pills.includes("2 views"));
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("FragGate cards Worker /count pills; AZBrowser uses by_op like other engines", async () => {
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
  globalThis.fetch = async (url, init) => {
    const href = String(url);
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
    return origFetch(url, init);
  };
  try {
    const built = await loadSoftwareCatalog(env, {});
    const fg = built.products.find((p) => p.slug === "fraggate");
    const azb = built.products.find((p) => p.slug === "azbrowser");
    assert.ok(fg);
    assert.ok(azb);
    assert.deepEqual(fg.pills, ["1 downloads", "8 views", "5 uses"]);
    assert.ok(fg.links.some((l) => l.primary && l.href === FRAGGATE_DOWNLOAD));
    assert.ok(fg.links.some((l) => l.label === "Worker" && l.href === FRAGGATE_WORKER_HOME));
    assert.match(fg.blurb, /Separate FragGate app/);
    assert.equal(fg.kind, "gate");
    assert.deepEqual(azb.pills, ["2 downloads", "4 views", "4 uses"]);
    assert.equal(azb.links[0].href, "https://azbrowser-download-tracker.vibelock.workers.dev/download");
    assert.ok(!azb.links.some((l) => /fraggate-download-tracker/.test(l.href)));
    assert.ok(!azb.links.some((l) => l.label === "Worker"));
    const html = softwareBody(built);
    assert.match(html, /data-slug="fraggate"/);
    assert.match(html, /1 downloads/);
    assert.match(html, /8 views/);
    assert.match(html, /fraggate-download-tracker\.vibelock\.workers\.dev\/download/);
    assert.match(html, /Runtime 1\.6\.6 · FragGate/);
  } finally {
    globalThis.fetch = origFetch;
  }
});
