import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CSS, page, donateStripHtml, aboutBody, howItsScoredBody, patternBody, softwareBody, runtimeBody, azielLibraryBody, homeBody, corpusBody } from "../workers/download-tracker/src/ui.js";
import { ocrPageBody, mapBody, SPECTRAL_LENSES } from "../workers/download-tracker/src/hosted-pages.js";
import { dedupeShelfRows } from "../workers/download-tracker/src/library.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NAV = [
  [">Search<", "/"],
  [">Aziel Library<", "/aziel-library"],
  [">Corpus<", "/corpus"],
  [">Pattern<", "/pattern"],
  [">Software<", "/software"],
  [">How it's scored<", "/how-its-scored"],
  [">Donate<", "/donate"],
  [">Runtime<", "/runtime"],
  [">Tree<", "/tree"],
  [">Map<", "/map"],
  [">Historical<", "/historical"],
  [">Gazetteer<", "/gazetteer"],
  [">Intelligence<", "/intelligence"],
  [">Aziel Eliab<", "/AzielEliab"],
];

function chrome(body, extra) {
  return page("Test", body, { signed: null, path: "/", ...extra });
}

test("restored nav2 keeps every public tab and drops Health/Verify from chrome", () => {
  const html = chrome("<p>ok</p>");
  for (const [label, href] of NAV) {
    assert.match(html, new RegExp('href="' + href.replace("/", "\\/") + '"'));
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /class="brandmark"/);
  assert.match(html, /src="\/sigil\.png"/);
  assert.doesNotMatch(html, /href="\/health"/);
  assert.doesNotMatch(html, /href="\/verify"/);
  assert.doesNotMatch(html, /Ever Blooming/i);
  assert.doesNotMatch(html, /10\.5281\/zenodo/i);
  assert.match(html, /class="donate-strip"/);
  assert.match(donateStripHtml(), /Donate/);
  assert.match(donateStripHtml(), /no Worker KV/);
  assert.match(donateStripHtml(), /Nothing is free/);
  assert.match(donateStripHtml(), /donate-aziel/);
  assert.doesNotMatch(donateStripHtml(), /bc1[a-z0-9]+/i);
  assert.doesNotMatch(donateStripHtml(), /0x[a-f0-9]{40}/i);
  assert.match(html, /Part of the Aziel Eliab ecosystem/);
  assert.match(html, />Official site</);
  assert.match(html, /href="https:\/\/www\.azieleliab\.com\/"/);
  assert.match(html, />Aziel Corpus Library</);
  assert.match(html, />Aziel Runtime on GitHub</);
  assert.match(html, /class="runtime-muted"[^>]*href="https:\/\/aziel-runtime\.vibelock\.workers\.dev\/"[^>]*>Aziel Runtime</);
  assert.match(html, />Try on Glama</);
  assert.match(html, /class="ecosystem"/);
});

test("Softwares page keeps heading then list with no interstitial copy", () => {
  const soft = softwareBody({
    products: [{ name: "aziel-runtime", version: "catalog", root: true, countLabel: "1 downloads", blurb: "Root source", links: [{ href: "/runtime", label: "Site front door", primary: true }] }],
  });
  assert.match(soft, /<h1>Softwares<\/h1>\s*<\/section>\s*<section class="soft-section"><h2>Software<\/h2>/);
  const chrome = page("Software", soft, { path: "/software", kind: "software" });
  assert.doesNotMatch(chrome, /id="views"/);
  assert.doesNotMatch(chrome, /id="downloads"/);
  assert.match(chrome, /id="aziel-live-nodes"/);
});

test("homepage brandrow shows views, downloads, and Live Nodes pills", () => {
  const html = page("Corpus Search", homeBody({
    rows: [],
    views: 380386,
    downloads: 2199,
    host: "https://www.azielcorpuslibrary.net",
  }), { path: "/", kind: "search", views: 380386, downloads: 2199 });
  assert.match(html, /class="brandrow/);
  assert.match(html, /class="brandmark"/);
  assert.match(html, /id="views"/);
  assert.match(html, /href="\/stats"[^>]*>380386<span>views<\/span>/);
  assert.match(html, /id="downloads"/);
  assert.match(html, /href="\/stats"[^>]*>2199<span>downloads<\/span>/);
  assert.match(html, /id="aziel-live-nodes"/);
  assert.match(html, /href="\/v1\/mesh\/status"/);
  assert.match(html, /Live Nodes · off/);
  assert.doesNotMatch(html, /Views 380386 · Counted downloads 2199/);
  const brand = html.indexOf("class=\"brandrow");
  const viewsAt = html.indexOf('id="views"');
  const downloadsAt = html.indexOf('id="downloads"');
  const nodesAt = html.indexOf('id="aziel-live-nodes"');
  const hero = html.indexOf("Search the libraries");
  assert.ok(brand >= 0 && viewsAt > brand && downloadsAt > viewsAt && nodesAt > downloadsAt, "counters sit in brandrow after the mark");
  assert.ok(hero > nodesAt, "counters sit above the homepage hero");
  assert.match(CSS, /\.pill span\{/);
});

test("black/gold theme and royal purple Aziel Library text are in CSS", () => {
  assert.match(CSS, /--bg:#12100c/);
  assert.match(CSS, /--gold:#c9a227/);
  assert.match(CSS, /--royal:#6b3fa0/);
  assert.match(CSS, /html,body\{[^}]*overflow:auto/);
  assert.match(CSS, /\.about-aziel/);
  assert.match(CSS, /\.donate-aziel\{color:var\(--royal\)/);
  assert.match(CSS, /\.donate-rails\{display:grid;grid-template-columns:1fr/);
  assert.match(CSS, /\.donate-pair\{display:flex;flex-wrap:nowrap/);
  assert.match(CSS, /\.donate-qr\{[^}]*width:180px/);
  assert.match(CSS, /\.donate-qr\{[^}]*background:#fff/);
  assert.doesNotMatch(CSS, /qrline/);
  assert.match(CSS, /\.doc\.doc-aziel/);
  assert.match(CSS, /\.checkrow\{/);
  assert.match(CSS, /input\[type=checkbox\].*width:auto/);
  assert.match(CSS, /\.lens-grid\{/);
});

test("file and library cards grow with the page instead of a clipped overflow shelf", () => {
  const shelfRules = [...CSS.matchAll(/\.shelf\{[^}]+\}/g)].map((m) => m[0]);
  assert.ok(shelfRules.length >= 1, "shelf rules should exist");
  for (const rule of shelfRules) {
    assert.match(rule, /max-height:none/);
    assert.match(rule, /overflow:visible/);
    assert.doesNotMatch(rule, /overflow-y:auto/);
    assert.doesNotMatch(rule, /overflow:auto/);
    assert.doesNotMatch(rule, /max-height:min\(/);
    assert.doesNotMatch(rule, /58vh/);
  }
  assert.doesNotMatch(CSS, /\.shelf\{[^}]*max-height:min\(58vh,520px\)/);
  assert.match(CSS, /\.doc\{[^}]*overflow:visible/);
  assert.match(CSS, /\.mini-chips\{[^}]*flex-wrap:wrap/);
  assert.match(CSS, /\.mini-chips\{[^}]*overflow:visible/);
  assert.match(CSS, /\.doc\.doc-aziel\{border-color:var\(--royal\)/);
  assert.match(CSS, /\.lib-tag\.aziel\{background:var\(--royal\)/);
  assert.match(CSS, /\.soft-grid\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(240px,1fr\)\)/);
  assert.match(CSS, /\.soft-card\{background:var\(--card\);border:1px solid var\(--line\);border-radius:16px;padding:18px\}/);
  assert.match(CSS, /\.ecosystem\{/);
  assert.match(CSS, /\.ecosystem-list\{/);

  const azielRow = {
    record_id: "AZDOC-cockroach",
    title: "The Cockroach Doctrine: A Resilience Doctrine for Remaining Operational Under Repeated Asymmetric Disruption",
    library: "aziel",
    author: "Aziel Eliab",
    domain: "research,philosophy",
    subjects: "philosophy,doctrine,asymmetric disruption,cockroach doctrine,resilience",
    keywords: "asymmetric disruption,Aziel Eliab,August 2026",
    triad_combined: 0.58,
    filename: "The-Cockroach-Doctrine.pdf",
    created_utc: "2026-08-04T12:00:00Z",
    content_sha256: "a".repeat(64),
    snippet: "A public note for remaining operational under repeated asymmetric disruption.",
  };
  const corpusRow = {
    record_id: "AZDOC-smoke",
    title: "AZBot anonymous Corpus smoke",
    library: "corpus",
    author: "anonymous",
    triad_combined: 0.56,
    zsolver_score: 0.4,
    filename: "text record",
    created_utc: "2026-09-04T03:37:00Z",
    content_sha256: "b".repeat(64),
    snippet: "Peace → Clarity → Service. Safe public note for anonymous Corpus ingest test.",
  };
  const home = homeBody({ rows: [azielRow, corpusRow], views: 1, downloads: 1, host: "https://www.azielcorpuslibrary.net" });
  const aziel = azielLibraryBody({ signed: null, rows: [azielRow] });
  const corpus = corpusBody({ signed: null, rows: [corpusRow] });
  for (const html of [home, aziel, corpus]) {
    assert.match(html, /class="shelf"/);
    assert.match(html, /Download/);
    assert.match(html, /By hash/);
  }
  assert.match(home, /doc doc-aziel/);
  assert.match(aziel, /doc doc-aziel/);
  assert.match(aziel, /The Cockroach Doctrine/);
  assert.match(corpus, /AZBot anonymous Corpus smoke/);
  assert.match(corpus, /class="doc"/);
  assert.doesNotMatch(corpus, /doc-aziel/);
});

test("OCR page still ships all eight SpectralLock lenses", () => {
  const html = chrome(ocrPageBody({ signed: null, operator: false }), { path: "/ocr", kind: "ocr" });
  assert.equal(SPECTRAL_LENSES.length, 8);
  for (const id of ["zero", "tazel", "vyrn", "uv", "rosetta", "zen", "chaos", "balance"]) {
    assert.match(html, new RegExp('name="lens" value="' + id + '"'));
    assert.match(html, new RegExp("spectral-samples/" + id + "\\.png"));
  }
  assert.match(html, /Sign in to save/);
  assert.match(html, /href="\/pattern"/);
});

test("Pattern, Software, About, and runtime pages render live copy", () => {
  const about = aboutBody();
  assert.match(about, /About Aziel/);
  assert.match(about, /Who\? Does not matter/);
  assert.doesNotMatch(about, /Who does not matter/);
  assert.match(about, /— Aziel Elroi Eliab/);
  assert.match(about, /— Aziel Eliab/);
  assert.match(about, /I am temporary/);
  assert.match(about, /Aziel Elroi Eliab/);
  assert.match(about, /Aziel Library/);
  assert.match(about, /href="\/software"/);
  assert.match(about, /href="\/how-its-scored"/);
  assert.match(about, /href="https:\/\/godlock\.uk\/AzielEliab"/);
  assert.match(about, /GodLock is one product Aziel Eliab built/);
  const scored = howItsScoredBody();
  assert.match(scored, /How it's scored/);
  assert.match(scored, /SPRE/);
  assert.match(scored, /CLCE/);
  assert.match(scored, /PhysLing/);
  assert.match(scored, /intentional suppression confidence/);
  assert.match(scored, /lower is more natural/i);
  assert.doesNotMatch(scored, /\+25/);
  assert.doesNotMatch(scored, /quiet/i);
  assert.doesNotMatch(scored, /Collin Horton/i);
  assert.doesNotMatch(scored, /GodLock\.AZ/i);
  const pattern = patternBody({
    total: 3,
    domains: [{ label: "research", n: 2 }],
    subjects: [{ label: "succession", n: 1 }],
    keywords: [{ label: "Aziel Eliab", n: 3 }],
    crosses: [{ domain: "research", subject: "succession", n: 1 }],
  });
  assert.match(pattern, /<h1>Pattern<\/h1>/);
  assert.match(pattern, /href="\/\?domain=research"/);
  const soft = softwareBody({
    products: [{ name: "aziel-runtime", version: "catalog", root: true, countLabel: "1 downloads", blurb: "Root source", links: [{ href: "/runtime", label: "Site front door", primary: true }] }],
    fetched: 1,
    downloadable: 1,
  });
  assert.match(soft, /<h1>Softwares<\/h1>\s*<\/section>\s*<section class="soft-section"><h2>Software<\/h2>/);
  assert.match(soft, /aziel-runtime/);
  assert.match(soft, /class="button"[^>]*href="https:\/\/glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime"[^>]*>Try on Glama</);
  assert.match(soft, /class="runtime-muted"[^>]*href="https:\/\/aziel-runtime\.vibelock\.workers\.dev\/"[^>]*>Official Runtime</);
  assert.doesNotMatch(soft, /Try\/Deploy on Glama/);
  assert.doesNotMatch(soft, /Downloadable software/);
  assert.match(soft, /href="\/how-its-scored"/);
  assert.match(soft, /href="\/runtime"/);
  assert.match(soft, /href="https:\/\/godlock\.uk\/AzielEliab"/);
  assert.doesNotMatch(soft, /zenodo/i);
  const runtime = runtimeBody();
  assert.match(runtime, /aziel-runtime/);
  assert.match(runtime, /\/runtime\/v1\/runtime\.json/);
  assert.match(runtime, /\/runtime\/v1\/skill/);
  assert.match(runtime, /\/runtime\/v1\/pull\//);
  assert.match(runtime, /\/runtime\/openapi\.json/);
  assert.match(runtime, /POST \/runtime\/mcp/);
  assert.match(runtime, /THIS IS NOT<\/strong> an API aggregator or a second software index/);
  assert.match(runtime, /2\.0\.0-rc1/);
  assert.match(runtime, /37 live/);
  assert.match(runtime, /not merely an API orchestrator/);
  assert.match(runtime, /FragGate/);
  assert.match(runtime, /fraggate_list/);
  assert.match(runtime, /\/runtime\/v1\/fraggate\/list/);
  assert.match(runtime, /class="button"[^>]*href="https:\/\/glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime"[^>]*>Try on Glama</);
  assert.match(runtime, /class="runtime-muted"[^>]*href="https:\/\/aziel-runtime\.vibelock\.workers\.dev\/"[^>]*>Official Runtime</);
  assert.doesNotMatch(runtime, /class="button"[^>]*>Official Runtime</);
  assert.doesNotMatch(runtime, /Try\/Deploy on Glama/);
  assert.match(runtime, /href="https:\/\/godlock\.uk\/AzielEliab"/);
  assert.doesNotMatch(runtime, /1\.4\.0/);
  assert.doesNotMatch(runtime, /10\.5281\/zenodo/i);
});

test("map page uses BCE year sliders and a month filter", () => {
  const html = mapBody({ events: [], unresolved: [], gazetteer: { state: "READY", places: 1, profile: "lite" }, signed: null });
  assert.match(html, /id="yearFrom"/);
  assert.match(html, /id="yearTo"/);
  assert.match(html, /id="monthFilter"/);
  assert.match(html, /min="-4000"/);
  assert.match(html, /4000 BCE/);
  assert.match(html, /id="monthTicks"/);
});

test("Aziel Library is publicly browseable and shelf SHA-dedupes", () => {
  const html = azielLibraryBody({
    signed: null,
    rows: [
      { record_id: "AZDOC-1", title: "One", library: "aziel", content_sha256: "aa".repeat(32), triad_combined: 0.5, snippet: "a" },
      { record_id: "AZDOC-2", title: "Dup", library: "aziel", content_sha256: "aa".repeat(32), triad_combined: 0.5, snippet: "b" },
    ],
  });
  assert.match(html, /about-aziel/);
  assert.match(html, /Anyone can browse Aziel Library/);
  assert.match(html, /AZDOC-2/);
  assert.doesNotMatch(html, /AZDOC-1/);
  assert.match(html, /doc-aziel/);
  const home = homeBody({
    rows: [
      { record_id: "A", title: "A", library: "corpus", content_sha256: "bb".repeat(32), snippet: "x" },
      { record_id: "B", title: "B", library: "corpus", content_sha256: "bb".repeat(32), snippet: "y" },
    ],
    views: 1,
    downloads: 1,
    host: "https://www.azielcorpuslibrary.net",
  });
  assert.match(home, /href="\/file\/B"/);
  assert.doesNotMatch(home, /href="\/file\/A"/);
  assert.match(home, /href="\/runtime"/);
  assert.match(home, /Runtime 2\.0\.0-rc1/);
  assert.doesNotMatch(home, /Runtime 2\.0\.0-rc1 · FragGate/);
  assert.deepEqual(
    dedupeShelfRows([
      { record_id: "1", content_sha256: "abc" },
      { record_id: "2", content_sha256: "ABC" },
      { record_id: "3", content_sha256: "" },
    ]).map((r) => r.record_id),
    ["2", "3"]
  );
});

test("sigil and spectral samples are hosted public assets", () => {
  assert.equal(existsSync(join(ROOT, "workers/download-tracker/public/sigil.png")), true);
  for (const id of ["zero", "tazel", "vyrn", "uv", "rosetta", "zen", "chaos", "balance"]) {
    assert.equal(existsSync(join(ROOT, "workers/download-tracker/public/spectral-samples/" + id + ".png")), true);
  }
});
