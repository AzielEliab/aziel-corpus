import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_WELL_KNOWN_PATH,
  DOORS_PATH,
  LIVE_PUBLIC_DOORS,
  LIVE_PUBLIC_VERIFIED,
  TRADES_GLAMA,
  livePublicDoorsDoc,
  livePublicDoorsPlain,
} from "./public-doors.js";
import { canonicalWwwRedirect, siteFooterHtml } from "./seo.js";
import { doorsBody, doorsSectionHtml } from "./ui.js";
import { aiTxt, llmsDoc, sitemapIndexXml, sitemapXml } from "./crawl.js";
import { isLoopbackHost, requestUrl, unavailableResponse } from "./fixtures/hermetic-observe.js";

const HREFS = [
  "https://www.azieleliab.com/",
  "https://www.azielcorpuslibrary.net/",
  "https://godlock.uk/",
  "https://hedidntjump.com/",
  "https://furnaceisntfree.com/",
  "https://timetounsealthebook.net/",
  "https://whitestone.vibelock.workers.dev/",
  "https://aziel-runtime.vibelock.workers.dev/",
  "https://trades-runtime.vibelock.workers.dev/",
  "https://miragegrid.vibelock.workers.dev/",
];

function visible(html) {
  return String(html).replace(/<script[\s\S]*?<\/script>/gi, "");
}

test("ten live doors use the verified origins and refuse tracker hosts", () => {
  assert.equal(LIVE_PUBLIC_DOORS.length, 10);
  assert.equal(LIVE_PUBLIC_VERIFIED, "2026-11-19");
  assert.deepEqual(LIVE_PUBLIC_DOORS.map((row) => row.href), HREFS);
  const blob = JSON.stringify(livePublicDoorsDoc()) + livePublicDoorsPlain();
  assert.doesNotMatch(blob, /download-tracker/);
  assert.doesNotMatch(blob, /thefurnaceisntfree\.com/);
  assert.doesNotMatch(blob, /"live_backends":true/);
  assert.doesNotMatch(blob, /"pilot_started":true/);
  const trades = LIVE_PUBLIC_DOORS.find((row) => row.id === "trades-runtime");
  assert.equal(trades.live_backends, false);
  assert.equal(trades.pilot_started, false);
  assert.equal(trades.glama, TRADES_GLAMA);
  const grid = LIVE_PUBLIC_DOORS.find((row) => row.id === "miragegrid");
  assert.equal(grid.mesh_only, true);
  assert.equal(grid.public_icann, false);
  assert.equal(grid.icann_registrar, false);
  assert.match(grid.note, /Not an ICANN registrar/);
  const doc = livePublicDoorsDoc();
  assert.equal(doc.count, 10);
  assert.equal(doc.download_tracker_doors, false);
  assert.equal(doc.thefurnaceisntfree, false);
  assert.equal(doc.ai_well_known, "https://www.azielcorpuslibrary.net" + AI_WELL_KNOWN_PATH);
});

test("doors page, software tab, and footer link every live origin", () => {
  const page = visible(doorsBody());
  const tab = visible(doorsSectionHtml());
  const footer = siteFooterHtml();
  for (const href of HREFS) {
    const re = new RegExp('href="' + href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"');
    assert.match(page, re, href);
    assert.match(tab, re, href);
    assert.match(footer, re, href);
  }
  assert.match(page, /Glama/);
  assert.match(page, new RegExp(TRADES_GLAMA.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(page, /mesh-only/i);
  assert.match(page, /public_icann is false/);
  assert.match(page, /not an ICANN registrar/i);
  assert.match(page, /live_backends false/);
  assert.match(page, /pilot_started false/);
  assert.match(tab, /id="doors"/);
  assert.match(page, /id="ecosystem-doors"/);
  assert.doesNotMatch(page + tab + footer, /download-tracker/);
  assert.doesNotMatch(page + tab + footer, /thefurnaceisntfree\.com/);
  assert.doesNotMatch(page + tab + footer, /1 Chronicles 15:20/);
  assert.doesNotMatch(page + tab + footer, /identity-lock/);
});

test("llms.txt and ai.txt list the ten doors and the ai.txt alias", () => {
  const llms = llmsDoc("limit");
  const ai = aiTxt("limit");
  for (const href of HREFS) {
    assert.ok(llms.includes(href), href);
    assert.ok(ai.includes(href), href);
  }
  assert.ok(llms.includes(TRADES_GLAMA));
  assert.ok(ai.includes(TRADES_GLAMA));
  assert.match(llms, /live_backends false/);
  assert.match(llms, /pilot_started false/);
  assert.match(llms, /public_icann: false/);
  assert.match(llms, /Not an ICANN registrar/);
  assert.match(llms, /Mesh-only/);
  assert.ok(llms.includes("https://www.azielcorpuslibrary.net" + DOORS_PATH));
  assert.ok(llms.includes("https://www.azielcorpuslibrary.net" + AI_WELL_KNOWN_PATH));
  assert.ok(ai.includes("https://www.azielcorpuslibrary.net" + AI_WELL_KNOWN_PATH));
  assert.match(ai, /Allow: \/doors/);
  assert.match(ai, /Allow: \/\.well-known\/ai\.txt/);
});

test("sitemap drops /v1/search and download-tracker children", async () => {
  const xml = await sitemapXml({});
  assert.doesNotMatch(xml, /<loc>https:\/\/www\.azielcorpuslibrary\.net\/v1\/search<\/loc>/);
  assert.match(xml, /<loc>https:\/\/www\.azielcorpuslibrary\.net\/doors<\/loc>/);
  assert.match(xml, /<loc>https:\/\/www\.azielcorpuslibrary\.net\/\.well-known\/ai\.txt<\/loc>/);
  const index = sitemapIndexXml();
  assert.doesNotMatch(index, /download-tracker/);
  assert.doesNotMatch(index, /<lastmod>2026-09-20<\/lastmod>/);
  assert.match(index, /<lastmod>2026-11-20<\/lastmod>/);
});

test("apex redirects to www and keeps path plus query", () => {
  assert.equal(canonicalWwwRedirect("https://azielcorpuslibrary.net/doors?x=1"), "https://www.azielcorpuslibrary.net/doors?x=1");
  assert.equal(canonicalWwwRedirect("https://azielcorpuslibrary.net/software?q=Florence&lib=aziel"), "https://www.azielcorpuslibrary.net/software?q=Florence&lib=aziel");
  assert.equal(canonicalWwwRedirect("https://www.azielcorpuslibrary.net/doors"), null);
  assert.equal(canonicalWwwRedirect("https://aziel-corpus-download-tracker.vibelock.workers.dev/"), null);
});

test("worker serves /doors, ai.txt alias, and apex 301", async () => {
  const { default: worker } = await import("./index.js");
  const env = {
    DOWNLOADS: { async get() { return null; }, async put() {}, async list() { throw new Error("no list"); } },
  };
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = requestUrl(input);
    let host = "";
    try { host = new URL(url).hostname; } catch { host = ""; }
    if (isLoopbackHost(host)) return origFetch(input, init);
    return unavailableResponse();
  };
  try {
  const doors = await worker.fetch(
    new Request("https://www.azielcorpuslibrary.net/doors", { headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" } }),
    env,
    {}
  );
  assert.equal(doors.status, 200);
  assert.match(doors.headers.get("content-type") || "", /text\/html/);
  assert.equal(doors.headers.get("Content-Signal"), "search=yes, ai-input=yes, ai-train=yes");
  const html = await doors.text();
  const body = html.replace(/^[\s\S]*<body>/i, "").replace(/<\/body>[\s\S]*$/i, "").replace(/<script[\s\S]*?<\/script>/gi, "");
  assert.match(body, /<h1>Ecosystem \/ Doors<\/h1>/);
  assert.match(body, /href="https:\/\/whitestone\.vibelock\.workers\.dev\/"/);
  assert.match(body, /href="https:\/\/miragegrid\.vibelock\.workers\.dev\/"/);
  assert.doesNotMatch(body, /1 Chronicles 15:20/);
  assert.doesNotMatch(body, /identity-lock/);

  const machine = await worker.fetch(
    new Request("https://www.azielcorpuslibrary.net/doors?format=json", { headers: { Accept: "application/json" } }),
    env,
    {}
  );
  assert.equal(machine.status, 200);
  const json = await machine.json();
  assert.equal(json.count, 10);
  assert.equal(json.doors.find((row) => row.id === "miragegrid").public_icann, false);

  const alias = await worker.fetch(new Request("https://www.azielcorpuslibrary.net/.well-known/ai.txt"), env, {});
  const ai = await worker.fetch(new Request("https://www.azielcorpuslibrary.net/ai.txt"), env, {});
  assert.equal(alias.status, 200);
  assert.equal(ai.status, 200);
  assert.equal(await alias.text(), await ai.text());

  const apex = await worker.fetch(
    new Request("https://azielcorpuslibrary.net/doors?format=json"),
    env,
    {}
  );
  assert.equal(apex.status, 301);
  assert.equal(apex.headers.get("location"), "https://www.azielcorpuslibrary.net/doors?format=json");
  } finally {
    globalThis.fetch = origFetch;
  }
});
