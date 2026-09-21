import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CSS, page, donateStripHtml, aboutBody, whoBody, howItsScoredBody, patternBody, softwareBody, runtimeBody, azielLibraryBody, homeBody, homeSearchActive, corpusBody, uploadBody, brandMarkHtml, authBarHtml, brandCountPills, sigilNavHtml, trendingHtml, LCP_FOLD, splitLcpHtml, cardExcerpt, CARD_EXCERPT_CHARS, chipLabel, exploreRowHtml, startPathsHtml, agentsTabHtml, EXPLORE_LINKS } from "../workers/download-tracker/src/ui.js";
import { recordBody } from "../workers/download-tracker/src/hosted-pages.js";
import { guestSession, isOperator, libraryFor, quarantineHiddenFromPublic, ingestRecord, searchRecords } from "../workers/download-tracker/src/library.js";
import { ocrPageBody, mapBody, treeBody, historicalBody, intelligenceBody, SPECTRAL_LENSES } from "../workers/download-tracker/src/hosted-pages.js";
import { jeevesFabHtml } from "../workers/download-tracker/src/jeeves.js";
import { dedupeShelfRows } from "../workers/download-tracker/src/library.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NAV = [
  [">Search<", "/"],
  [">Aziel Library<", "/aziel-library"],
  [">Corpus<", "/corpus"],
  [">Software<", "/software"],
  [">How it's scored<", "/how-its-scored"],
  [">Tree<", "/tree"],
  [">Map<", "/map"],
  [">Historical<", "/historical"],
  [">Forensics<", "/forensics"],
  [">Aziel Eliab<", "/AzielEliab"],
  [">Receipts<", "/receipts"],
  [">Donate<", "/donate"],
  [">Upload<", "/upload"],
];

function chrome(body, extra) {
  return page("Test", body, { signed: null, path: "/", ...extra });
}

test("restored nav2 keeps every public tab and drops Health/Verify/Gazetteer from chrome", () => {
  const html = chrome("<p>ok</p>");
  for (const [label, href] of NAV) {
    assert.match(html, new RegExp('href="' + href.replace("/", "\\/") + '"'));
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /class="sitehead"/);
  assert.match(html, /class="brandrow nav1"><button type="button" class="brandmark-link sigil-nav-btn"/);
  assert.match(html, /class="brandmark"/);
  assert.match(html, /src="\/sigil\.png"/);
  assert.match(html, /<img class="brandmark"[^>]*alt=""/);
  assert.match(html, /Aziel Corpus Library/);
  assert.match(html, /class="authbar"/);
  assert.match(html, /href="\/login">Log in</);
  assert.match(html, /href="\/signup">Sign up</);
  assert.doesNotMatch(html, /href="\/health"/);
  assert.doesNotMatch(html, /href="\/verify"/);
  assert.doesNotMatch(html, />Pattern</);
  assert.doesNotMatch(html, /anyone can view/);
  assert.doesNotMatch(html, /Runtime v/);
  assert.doesNotMatch(html, /MASTER · WRITABLE/);
  assert.doesNotMatch(html, /id="aziel-live-nodes"/);
  assert.doesNotMatch(html, />Gazetteer</);
  assert.doesNotMatch(html, /href="\/gazetteer"/);
  assert.doesNotMatch(html, />Intelligence</);
  assert.doesNotMatch(html, /href="\/intelligence"/);
  assert.doesNotMatch(html, /ever-?\s*blooming/i);
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
  assert.match(html, />Corpus</);
  assert.match(html, />GodLock</);
  assert.match(html, />Runtime GitHub</);
  assert.match(html, />Try on Glama</);
  assert.match(html, /class="ecosystem"/);
});

test("Aziel Eliab identity tab stays one wrap unit in public nav2", () => {
  const html = chrome("<p>ok</p>");
  assert.match(html, /<a class="nav-aziel" href="\/AzielEliab">Aziel Eliab<\/a>/);
  assert.doesNotMatch(html, />Eliab</);
  assert.match(html, />Aziel Eliab</);
  assert.match(
    html,
    /href="\/forensics">Forensics<\/a><span class="sep">\|<\/span><a class="nav-aziel" href="\/AzielEliab">Aziel Eliab<\/a><span class="sep">\|<\/span><a href="\/receipts">Receipts<\/a><span class="sep">\|<\/span><a href="\/donate">Donate<\/a><span class="sep">\|<\/span><a href="\/upload">Upload<\/a>/,
  );
  assert.match(html, /class="authbar"[^>]*>[\s\S]*href="\/upload">Upload<\/a><a class="auth-link" href="\/login">Log in<\/a><a class="auth-link" href="\/signup">Sign up<\/a>/);
  assert.match(CSS, /\.nav2 a,\.quiet a\{[^}]*white-space:nowrap/);
  assert.match(CSS, /\.nav2 a,\.quiet a\{[^}]*flex-shrink:0/);
  assert.match(CSS, /\.nav2 a\.nav-aziel\{color:var\(--royal\);font-weight:700;white-space:nowrap;flex:0 0 auto\}/);
  const pages = [
    chrome("<p>ok</p>"),
    page("Software", softwareBody({
      products: [{ name: "aziel-runtime", version: "catalog", root: true, blurb: "Root source", links: [{ href: "/runtime", label: "Site front door", primary: true }] }],
    }), { path: "/software", kind: "software" }),
    page("Forensics", "<section class=\"hero\"><h1>Forensics</h1></section>", { path: "/forensics", kind: "forensics" }),
    page("Aziel Eliab", aboutBody(), { path: "/AzielEliab", kind: "about" }),
    page("Upload", uploadBody({}), { path: "/upload", kind: "upload" }),
  ];
  const navs = pages.map((pageHtml) => {
    const match = pageHtml.match(/<nav class="nav2 quiet"[^>]*>[\s\S]*?<\/nav>/);
    assert.ok(match, "every page renders nav2");
    return match[0];
  });
  assert.ok(navs.every((nav) => nav === navs[0]), "tabs chrome stays identical on every page");
});

test("Upload tab page stays a basic file form and names the destination", () => {
  const corpus = uploadBody({});
  assert.match(corpus, /<h1>Upload<\/h1>/);
  assert.match(corpus, /Upload to Corpus/);
  assert.match(corpus, /No account required/);
  assert.match(corpus, /<form method="post" action="\/upload"/);
  assert.match(corpus, /type="file"/);
  assert.match(corpus, /id="upload-title"[^>]*required/);
  assert.doesNotMatch(corpus, /aziel-name/);
  const library = uploadBody({ signed: { user_id: "master", role: "superadmin", username: "operator" } });
  assert.match(library, /Upload to <span class="aziel-name">Aziel Library<\/span>/);
  assert.match(library, />Upload to Aziel Library</);
  assert.match(library, /<form method="post" action="\/upload"/);
  assert.doesNotMatch(library, /Upload to Corpus/);
});

test("Softwares page keeps heading then list with no interstitial copy", () => {
  const soft = softwareBody({
    products: [{ name: "aziel-runtime", version: "catalog", root: true, countLabel: "1 downloads", blurb: "Root source", links: [{ href: "/runtime", label: "Site front door", primary: true }] }],
  });
  assert.match(soft, /<h1>Softwares<\/h1>\s*<\/section>\s*<section class="soft-section"><h2>Software<\/h2>/);
  const chrome = page("Software", soft, { path: "/software", kind: "software" });
  assert.doesNotMatch(chrome, /id="views"/);
  assert.doesNotMatch(chrome, /id="downloads"/);
  assert.doesNotMatch(chrome, /id="aziel-live-nodes"/);
});

test("homepage brandrow is Aziel Corpus Library with Upload, Login, and Sign up", () => {
  const html = page("Corpus Search", homeBody({
    rows: [],
    views: 380386,
    downloads: 2199,
    host: "https://www.azielcorpuslibrary.net",
  }), { path: "/", kind: "search", views: 380386, downloads: 2199, nodes: 28032, liveNodes: 0 });
  assert.match(html, /class="sitehead"/);
  assert.match(html, /class="brandrow/);
  assert.match(html, /class="brandmark-link sigil-nav-btn"/);
  assert.match(html, /class="brandmark"/);
  assert.match(html, /<a class="brand" href="\/">Aziel Corpus Library<\/a>/);
  assert.match(html, /class="authbar"/);
  assert.match(html, /href="\/upload">Upload</);
  assert.match(html, /href="\/login">Log in</);
  assert.match(html, /href="\/signup">Sign up</);
  const auth = html.match(/<nav class="authbar"[^>]*>[\s\S]*?<\/nav>/)[0];
  assert.doesNotMatch(auth, />Agents</);
  assert.doesNotMatch(html.match(/<nav class="nav2 quiet"[^>]*>[\s\S]*?<\/nav>/)[0], />Agents</);
  assert.match(html, /class="agents-tab"/);
  const bar = html.match(/<div class="statbar"[^>]*>[\s\S]*?<\/div>/)[0];
  assert.match(bar, /id="views">380,386</);
  assert.match(bar, /id="downloads">2,199</);
  assert.match(bar, /id="nodes">28,032</);
  assert.match(bar, /id="livenodes">0</);
  assert.match(bar, />Views</);
  assert.match(bar, />Downloads</);
  assert.match(bar, />Nodes \/ Live Nodes</);
  assert.match(bar, /class="pill stat-counter"/);
  assert.match(bar, /class="stat-slash"/);
  assert.doesNotMatch(bar, /<a /);
  assert.doesNotMatch(bar, /<button/);
  assert.doesNotMatch(bar, /class="button"/);
  assert.doesNotMatch(bar, /41/);
  assert.doesNotMatch(html, /id="aziel-live-nodes"/);
  assert.doesNotMatch(html, /anyone can view/);
  assert.doesNotMatch(html, /Runtime v/);
  assert.doesNotMatch(html, /MASTER · WRITABLE/);
  assert.doesNotMatch(html, /<a class="brand"[^>]*>Aziel Digital Library/);
  const brand = html.indexOf("class=\"brandrow");
  const authAt = html.indexOf('class="authbar"');
  const statsAt = html.indexOf('class="statbar"');
  const hero = html.indexOf("Search the libraries");
  assert.ok(brand >= 0 && authAt > brand && hero > authAt, "auth cluster sits in the header above the hero");
  assert.ok(statsAt > authAt && statsAt < hero, "views/downloads counter sits top-right in the header");
  assert.match(CSS, /\.authbar\{/);
  assert.match(CSS, /\.statbar\{/);
  assert.match(CSS, /\.stat-counter\{/);
  assert.match(CSS, /\.stat-slash\{/);
});

test("homepage views/downloads counter is a display, not a button", () => {
  const pills = brandCountPills({ views: 380386, downloads: 2199, nodes: 28032, liveNodes: 0 });
  assert.match(pills, /class="statbar"/);
  assert.match(pills, /role="status"/);
  assert.match(pills, /aria-label="Library views, downloads, and Nodes\/Live Nodes"/);
  assert.match(pills, /id="views">380,386</);
  assert.match(pills, /id="downloads">2,199</);
  assert.match(pills, /id="nodes">28,032</);
  assert.match(pills, /id="livenodes">0</);
  assert.match(pills, /Views/);
  assert.match(pills, /Downloads/);
  assert.match(pills, /Nodes \/ Live Nodes/);
  assert.match(pills, /class="stat-sep"/);
  assert.match(pills, /class="stat-slash"/);
  assert.doesNotMatch(pills, /<a /);
  assert.doesNotMatch(pills, /<button/);
  assert.doesNotMatch(pills, /class="button"/);
  assert.doesNotMatch(pills, /id="aziel-live-nodes"/);
  assert.doesNotMatch(pills, /software_nodes/);
  assert.equal(brandCountPills({}), "");
  assert.match(brandCountPills({ views: 0, downloads: 0 }), /id="views">0</);
  assert.match(brandCountPills({ views: 0, downloads: 0 }), /id="nodes">0</);
  assert.match(brandCountPills({ views: 0, downloads: 0 }), /id="livenodes">0</);
  const other = page("Software", softwareBody({
    products: [{ name: "aziel-runtime", version: "catalog", root: true, blurb: "Root source", links: [{ href: "/runtime", label: "Site front door", primary: true }] }],
  }), { path: "/software", kind: "software", views: 9, downloads: 2 });
  assert.doesNotMatch(other, /id="views"/);
  assert.doesNotMatch(other, /id="downloads"/);
  assert.doesNotMatch(other, /id="nodes"/);
  assert.doesNotMatch(other, /class="statbar"/);
});

test("homepage LCP fold keeps hero first and leaves entity-graph plus doors intact", () => {
  const home = homeBody({
    rows: [{
      record_id: "AZDOC-lcp",
      title: "Shelf card stays after the fold",
      library: "aziel",
      author: "Aziel Eliab",
      snippet: "Public MASTER card.",
      content_sha256: "c".repeat(64),
    }],
    views: 12,
    downloads: 3,
    host: "https://www.azielcorpuslibrary.net",
  });
  assert.match(home, /<h1>Search the libraries<\/h1>/);
  assert.doesNotMatch(home, /files in the libraries/);
  assert.ok(home.includes(LCP_FOLD), "homepage body marks the LCP fold");
  assert.doesNotMatch(home, /Shelf card stays after the fold/);
  assert.match(home, /id="signup"/);
  assert.match(home, /id="upload-anonymous"/);
  assert.match(home, /Upload anonymously/);
  assert.doesNotMatch(home, /Nothing is free/);
  assert.doesNotMatch(home, /class="facets"/);
  assert.doesNotMatch(home, /curl -fsSL/);
  const split = splitLcpHtml(home);
  assert.match(split.early, /Search the libraries/);
  assert.match(split.early, /hero-search/);
  assert.doesNotMatch(split.early, /id="signup"/);
  assert.match(split.late, /id="signup"/);
  assert.match(split.late, /id="upload-anonymous"/);

  const html = page("Corpus Search", home, { path: "/", kind: "search", views: 12, downloads: 3 });
  const headEnd = html.indexOf("</head>");
  const foldAt = html.indexOf(LCP_FOLD);
  const ldAt = html.indexOf('<script type="application/ld+json">');
  const heroAt = html.indexOf("Search the libraries");
  const signAt = html.indexOf('id="signup"');
  assert.ok(headEnd > 0 && foldAt > headEnd, "fold sits in the body");
  assert.ok(heroAt > 0 && heroAt < foldAt, "hero is the LCP candidate before the doors");
  assert.ok(signAt > foldAt, "sign up and upload sit after the fold");
  assert.ok(ldAt > foldAt, "entity-graph JSON-LD stays on the page after first paint");
  assert.match(html.slice(0, headEnd), /rel="preload" href="\/sigil\.png" as="image" fetchpriority="high"/);
  assert.match(html.slice(0, headEnd), /href="\/person\.jsonld"/);
  assert.doesNotMatch(html.slice(0, headEnd), /<script type="application\/ld\+json">/);
  assert.doesNotMatch(html, /class="donate-strip"/);
  assert.doesNotMatch(html, /Nothing is free\. Static Donate door/);
  assert.doesNotMatch(html, /Part of the Aziel Eliab ecosystem/);
  assert.match(html, /fetchpriority="high"/);
  assert.match(html, /id="views">12</);
  assert.match(html, /id="downloads">3</);
  assert.match(html, /id="nodes">0</);
  assert.match(html, /id="livenodes">0</);
  assert.match(html, /class="statbar"/);
  assert.match(html, /fetch\("\/v1\/mesh"/);
  assert.match(html, /fetch\("\/v1\/stats"/);
  assert.doesNotMatch(html, /id="aziel-live-nodes"/);
  assert.doesNotMatch(html, /nodes&&d.nodes.length/);
  assert.doesNotMatch(html, /j\.nodes\.length/);
  assert.match(html, /id="jeevesFab"/);
  assert.match(html, /"@type":"CollectionPage"/);
  assert.match(html, /"@id":"https:\/\/www\.azieleliab\.com\/#aziel"/);
  assert.match(CSS, /\.doc\{[^}]*content-visibility:auto/);
  assert.match(CSS, /\.hero h1\{[^}]*content-visibility:visible/);
  assert.match(CSS, /html,body\{[^}]*overflow-x:hidden/);
  assert.match(CSS, /html,body\{[^}]*overflow-y:auto/);
});

test("black/gold theme and royal purple Aziel Library text are in CSS", () => {
  assert.match(CSS, /--bg:#12100c/);
  assert.match(CSS, /--gold:#c9a227/);
  assert.match(CSS, /--royal:#6b3fa0/);
  assert.match(CSS, /html,body\{[^}]*overflow-x:hidden/);
  assert.match(CSS, /html,body\{[^}]*overflow-y:auto/);
  assert.match(CSS, /\.about-aziel/);
  assert.match(CSS, /\.about-prose,.about-prose p,.about-sign\{color:var\(--royal\)/);
  assert.match(CSS, /\.about-record\{background:var\(--paper\)/);
  assert.match(CSS, /\.donate-aziel\{color:var\(--royal\)/);
  assert.match(CSS, /\.aziel-name\{color:var\(--royal\)/);
  assert.match(CSS, /\.nav2 a\.nav-aziel\{color:var\(--royal\)/);
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
  assert.match(CSS, /\.doc\{[^}]*overflow:hidden/);
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
  const home = homeBody({ q: "Cockroach", rows: [azielRow, corpusRow], views: 1, downloads: 1, host: "https://www.azielcorpuslibrary.net" });
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

test("browse cards clamp titles and shorten bleed-over snippets without rewriting stored docs", () => {
  assert.match(CSS, /\.doc\{[^}]*overflow:hidden/);
  assert.ok(CSS.includes(".doc h3{"));
  assert.ok(CSS.includes(".doc p{"));
  assert.ok(CSS.includes(".doc .meta{"));
  assert.ok(CSS.includes("-webkit-line-clamp:2"));
  assert.ok(CSS.includes("-webkit-line-clamp:3"));
  assert.ok(CSS.includes("overflow-wrap:anywhere"));
  assert.match(CSS, /\.mini-chip\{[^}]*overflow:hidden/);
  assert.match(CSS, /\.mini-chip\{[^}]*text-overflow:ellipsis/);
  assert.match(CSS, /\.mini-chip\{[^}]*white-space:nowrap/);
  assert.equal(chipLabel("philosophy"), "philosophy");
  assert.equal(
    chipLabel("f53419056b94b69be05c8214cb8d8329f7e74fe99d8505ecfa8a72a9a6e0333f"),
    "f53419056b94…333f",
  );
  assert.equal(
    chipLabel("e0153ec534890c0069bd6315e462cb3d7a993f0d8bc0bec7100c63bf5cd446a4"),
    "e0153ec53489…46a4",
  );
  assert.equal(CARD_EXCERPT_CHARS, 180);
  assert.equal(cardExcerpt("Short note."), "Short note.");
  assert.equal(cardExcerpt("   spaced   words   "), "spaced words");
  const spam = "Watch my Instagram growth course and unlock secret SEO traffic with this exclusive 280+ character pitch about brand deals, affiliate codes, drip funnels, comment pods, and a never-ending list of hashtags that should not blow past the card chrome on mobile or desktop browse. Book a consult today and scale your personal brand with recycled captions.";
  assert.ok(spam.length > 280);
  const clipped = cardExcerpt(spam);
  assert.ok(clipped.endsWith("…"));
  assert.ok(clipped.length <= CARD_EXCERPT_CHARS + 1);
  assert.doesNotMatch(clipped, /hashtags that should not blow/);

  const longTitle = "FREE Instagram SEO growth bible plus secret traffic hacks and brand-deal scripts that go on and on past two lines of card chrome on a phone";
  const row = {
    record_id: "AZDOC-spam-blurb",
    title: longTitle,
    library: "corpus",
    author: "anonymous",
    filename: "instagram-seo-pitch.txt",
    created_utc: "2026-09-17T12:00:00Z",
    content_sha256: "c".repeat(64),
    snippet: spam,
    body: spam,
    triad_combined: 0.12,
  };
  const home = homeBody({ q: "Instagram", rows: [row] });
  const corpus = corpusBody({ signed: null, rows: [row] });
  const hashSub = "f53419056b94b69be05c8214cb8d8329f7e74fe99d8505ecfa8a72a9a6e0333f";
  const hashSub2 = "e0153ec534890c0069bd6315e462cb3d7a993f0d8bc0bec7100c63bf5cd446a4";
  const aziel = azielLibraryBody({
    signed: null,
    rows: [{ ...row, record_id: "AZDOC-spam-aziel", library: "aziel", subjects: hashSub + "," + hashSub2 + ",philosophy" }],
  });
  assert.match(aziel, />philosophy</);
  assert.doesNotMatch(aziel, /f53419056b94…333f/);
  assert.doesNotMatch(aziel, /e0153ec53489…46a4/);
  assert.doesNotMatch(aziel, new RegExp("subject=" + hashSub));
  assert.doesNotMatch(aziel, new RegExp("subject=" + hashSub2));
  assert.doesNotMatch(aziel, />f53419056b94b69be05c8214cb8d8329f7e74fe99d8505ecfa8a72a9a6e0333f</);
  assert.doesNotMatch(aziel, />e0153ec534890c0069bd6315e462cb3d7a993f0d8bc0bec7100c63bf5cd446a4</);
  for (const html of [home, corpus, aziel]) {
    assert.match(html, /class="excerpt"/);
    assert.match(html, /class="doc-actions"/);
    assert.match(html, new RegExp(clipped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(html, /hashtags that should not blow/);
    assert.match(html, /FREE Instagram SEO growth bible/);
    assert.doesNotMatch(html, /15:20/);
    assert.match(html, /Download/);
  }
  assert.equal(row.snippet, spam);
  assert.equal(row.body, spam);
});

test("OCR page still ships all eight SpectralLock lenses", () => {
  const html = chrome(ocrPageBody({ signed: null, operator: false }), { path: "/ocr", kind: "ocr" });
  assert.equal(SPECTRAL_LENSES.length, 8);
  for (const id of ["zero", "tazel", "vyrn", "uv", "rosetta", "zen", "chaos", "balance"]) {
    assert.match(html, new RegExp('name="lens" value="' + id + '"'));
    assert.match(html, new RegExp("spectral-samples/" + id + "\\.png"));
  }
  assert.match(html, /Sign in to save/);
  assert.doesNotMatch(html.match(/<nav class="nav2 quiet"[^>]*>[\s\S]*?<\/nav>/)[0], /href="\/pattern"/);
  assert.match(html, /SL-UNREDACT-OPAQUE/);
  assert.match(html, /leftover bytes recover honestly|recovers leftover bytes honestly/);
  assert.match(html, /SL-UNREDACT-OPAQUE/);
  assert.match(html, /ink heuristics/);
  assert.match(html, /v1\/unredact/);
  assert.match(html, /v1\/recover/);
  assert.match(html, /v1\/handwriting/);
});

test("Pattern, Software, About, and runtime pages render live copy", () => {
  const about = aboutBody();
  const recordAt = about.indexOf('class="card about-record"');
  const prose = about.slice(about.indexOf('class="card about-prose"'), recordAt);
  const record = about.slice(recordAt);
  assert.match(about, /About Aziel/);
  assert.match(about, /Aziel Digital Library/);
  assert.match(about, /GodLock/);
  assert.match(about, /Aziel Runtime/);
  assert.match(about, /He Didn't Jump/);
  assert.doesNotMatch(about, /scripture concordance/);
  assert.match(prose, /Who\? Does not matter/);
  assert.match(prose, /I do not ask you to believe a name/);
  assert.match(prose, /— Aziel Elroi Eliab/);
  assert.doesNotMatch(prose, /Aziel Eliab publishes/);
  assert.doesNotMatch(prose, /Canonical Person/);
  assert.doesNotMatch(prose, /about-mission/);
  assert.doesNotMatch(prose, /Aziel Library/);
  assert.doesNotMatch(prose, /The software suite is listed/);
  assert.doesNotMatch(about, /royal purple/);
  assert.doesNotMatch(about, /Researcher\. Builder\. AI\. A one-man dev team\. Just a man\./);
  assert.doesNotMatch(about, /Aziel Eliab is a living researcher, digital rights activist, software developer, author, and philosopher \(published work only\)\. Not the two Levitical musicians Aziel and Eliab named together in 1 Chronicles 15:20\./);
  assert.match(about, /Who\? Does not matter/);
  assert.match(about, /public MASTER of the work/);
  assert.match(record, /class="about-mission"/);
  assert.match(record, /Publisher resolves to/);
  assert.match(record, /https:\/\/www\.azieleliab\.com\/#aziel/);
  assert.match(record, /Aziel Eliab publishes/);
  assert.match(record, /Canonical Person/);
  assert.match(record, /Aziel Library/);
  assert.match(record, /The software suite is listed/);
  assert.doesNotMatch(about, /Who does not matter/);
  assert.match(about, /— Aziel Elroi Eliab/);
  assert.match(about, /Aziel Elroi Eliab/);
  assert.match(about, /href="\/software"/);
  assert.match(about, /href="\/how-its-scored"/);
  assert.match(about, /href="https:\/\/godlock\.uk\/AzielEliab"/);
  assert.match(about, /GodLock is one product Aziel Eliab built/);
  assert.doesNotMatch(about, /Elias Artista/);
  assert.doesNotMatch(about, /God is my strength/);
  assert.doesNotMatch(about, /Everblooming Flower/);
  const who = whoBody();
  assert.match(who, /<h1>Who is Aziel Eliab<\/h1>/);
  assert.doesNotMatch(who, /Aziel Eliab is a living researcher, digital rights activist, software developer, author, and philosopher \(published work only\)\. Not the two Levitical musicians Aziel and Eliab named together in 1 Chronicles 15:20\./);
  assert.match(who, /researcher, digital rights activist, software developer, author, and philosopher/);
  assert.doesNotMatch(who, /Elias Artista/);
  assert.doesNotMatch(who, /God is my strength/);
  assert.match(about, /href="https:\/\/www\.hedidntjump\.com\/"/);
  assert.match(about, /He Didn't Jump/);
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
  assert.match(soft, /href="https:\/\/www\.hedidntjump\.com\/"/);
  assert.match(soft, /He Didn't Jump/);
  assert.doesNotMatch(soft, /zenodo/i);
  const runtime = runtimeBody();
  assert.match(runtime, /aziel-runtime/);
  assert.match(runtime, /\/runtime\/v1\/runtime\.json/);
  assert.match(runtime, /\/runtime\/v1\/skill/);
  assert.match(runtime, /\/runtime\/v1\/pull\//);
  assert.match(runtime, /\/runtime\/openapi\.json/);
  assert.match(runtime, /POST \/runtime\/mcp/);
  assert.match(runtime, /node-meshed MCP Softwares suite/);
  assert.match(runtime, /2\.0\.0-rc1/);
  assert.match(runtime, /41 live/);
  assert.match(runtime, /node-meshed orchestration suite/);
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
  assert.doesNotMatch(html, /files in Aziel Library/);
  assert.match(html, /AZDOC-2/);
  assert.doesNotMatch(html, /AZDOC-1/);
  assert.match(html, /doc-aziel/);
  const home = homeBody({
    q: "B",
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
  assert.equal(homeSearchActive({}), false);
  assert.equal(homeSearchActive({ q: "B" }), true);
  assert.match(home, /id="signup"/);
  assert.match(home, /action="\/signup"/);
  assert.match(home, /id="upload-anonymous"/);
  assert.match(home, /action="\/ingest"/);
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

test("homepage doors include Sign up and anonymous Corpus upload; other pages keep donate chrome", () => {
  const home = page("Corpus Search", homeBody({ rows: [], host: "https://www.azielcorpuslibrary.net" }), { path: "/", kind: "search" });
  const other = page("Forensics", "<section class=\"hero\"><h1>Forensics</h1></section>", { path: "/forensics", kind: "forensics" });
  assert.match(home, /<nav class="nav2 quiet"/);
  assert.match(home, /<a class="nav-aziel" href="\/AzielEliab">Aziel Eliab<\/a>/);
  assert.match(home, /id="signup"/);
  assert.match(home, /<h2>Sign up<\/h2>/);
  assert.match(home, /action="\/signup"/);
  assert.match(home, /id="upload-anonymous"/);
  assert.match(home, /Upload anonymously/);
  assert.match(home, /action="\/ingest"/);
  assert.match(home, /class="agents-tab"/);
  assert.match(home, /href="\/llms\.txt"[^>]*>Agents</);
  assert.doesNotMatch(home, /<strong>Agents<\/strong>/);
  assert.doesNotMatch(other, /class="agents-tab"/);
  assert.doesNotMatch(home, /Files go to Corpus \(Lamb Lens\)/);
  assert.doesNotMatch(home, /Safety review \(poison quarantine, triad\)/);
  assert.doesNotMatch(home, /Aziel Library upload stays operator-only/);
  assert.doesNotMatch(home, /File \(optional if you include title and notes\)/);
  assert.match(home, /<label class="field-label" for="anon-title">Title <span class="req" aria-hidden="true">\*<\/span><\/label>/);
  assert.match(home, /id="anon-title"[^>]*name="title"[^>]*required/);
  assert.match(home, /name="from" value="home"/);
  assert.match(home, /href="\/aziel-library"/);
  assert.match(home, /href="\/corpus"/);
  assert.doesNotMatch(home, /class="donate-strip"/);
  assert.doesNotMatch(home, /Nothing is free\. Static Donate door/);
  assert.doesNotMatch(home, /Part of the Aziel Eliab ecosystem/);
  assert.doesNotMatch(home, /class="shelf"/);
  assert.match(other, /class="donate-strip"/);
  assert.match(other, /Part of the Aziel Eliab ecosystem/);
  assert.match(other, /<a class="nav-aziel" href="\/AzielEliab">Aziel Eliab<\/a>/);
});

test("anonymous Corpus ingest is reviewed and never writes Aziel Library", async () => {
  const guest = guestSession();
  assert.equal(isOperator(guest), false);
  assert.equal(libraryFor(guest), "corpus");
  assert.equal(libraryFor(null), "corpus");
  assert.equal(quarantineHiddenFromPublic("POISON_SUSPECT"), true);
  assert.equal(quarantineHiddenFromPublic("QUARANTINE"), true);
  assert.equal(quarantineHiddenFromPublic("CLEAR"), false);
  try {
    await ingestRecord({}, {});
    assert.fail("expected ingest to fail without storage");
  } catch (err) {
    assert.notEqual(err && err.message, "login required");
  }
  let sql = "";
  const env = {
    DB: {
      prepare(s) {
        sql = String(s);
        return {
          bind() {
            return {
              async all() { return { results: [{ record_id: "AZDOC-poison", quarantine_status: "POISON_SUSPECT" }] }; },
              async first() { return null; },
              async run() { return { success: true }; },
            };
          },
        };
      },
    },
  };
  await searchRecords(env, { q: "x" });
  assert.match(sql, /POISON_SUSPECT/);
  assert.match(sql, /QUARANTINE/);
  const open = await searchRecords(env, { q: "x", includeQuarantine: true });
  assert.ok(Array.isArray(open));
});

test("rose-star brand mark is top-left chrome with no words on the mark", () => {
  const mark = brandMarkHtml();
  assert.match(mark, /^<button type="button" class="brandmark-link sigil-nav-btn"/);
  assert.match(mark, /aria-expanded="false"/);
  assert.match(mark, /aria-controls="sigilNav"/);
  assert.match(mark, /<img class="brandmark" src="\/sigil\.png"/);
  assert.match(mark, /alt=""/);
  assert.doesNotMatch(mark, />[^<]*ever/i);
  assert.match(authBarHtml(null), /href="\/upload">Upload</);
  assert.match(authBarHtml(null), /href="\/login">Log in</);
  assert.match(sigilNavHtml(), /id="sigilNav" hidden/);
  assert.doesNotMatch(sigilNavHtml(), />Pattern</);
  assert.doesNotMatch(sigilNavHtml(), /href="\/pattern"/);
  assert.doesNotMatch(sigilNavHtml(), /href="\/runtime"/);
  const pages = [
    page("Corpus Search", homeBody({ rows: [], views: 1, downloads: 1, host: "https://www.azielcorpuslibrary.net" }), { path: "/", kind: "search" }),
    page("Software", softwareBody({
      products: [{ name: "aziel-runtime", version: "catalog", root: true, blurb: "Root source", links: [{ href: "/runtime", label: "Site front door", primary: true }] }],
    }), { path: "/software", kind: "software" }),
    page("Forensics", "<section class=\"hero\"><h1>Forensics</h1></section>", { path: "/forensics", kind: "forensics" }),
    page("Aziel Eliab", aboutBody(), { path: "/AzielEliab", kind: "about" }),
    page("Runtime", runtimeBody(), { path: "/runtime", kind: "runtime" }),
    page("Pattern", patternBody({ total: 0 }), { path: "/pattern", kind: "pattern" }),
  ];
  for (const html of pages) {
    const headAt = html.indexOf('class="sitehead"');
    const markAt = html.indexOf('class="brandmark-link');
    const brandAt = html.indexOf('class="brand"');
    const navAt = html.indexOf('class="nav2');
    assert.ok(headAt >= 0 && markAt > headAt && brandAt > markAt && navAt > brandAt, "mark sits top-left before title and nav");
    assert.match(html, />Forensics</);
    assert.doesNotMatch(html, />Gazetteer</);
    assert.doesNotMatch(html, /href="\/gazetteer"/);
    assert.doesNotMatch(html, /ever-?\s*blooming/i);
  }
  const soft = pages[1];
  assert.match(soft, /<h1>Softwares<\/h1>\s*<\/section>\s*<section class="soft-section"><h2>Software<\/h2>/);
});

function walkFiles(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

test("Worker-served HTML and library docs never use the retired bloom phrase", () => {
  const banned = /ever-?\s*blooming/i;
  const roots = [
    join(ROOT, "workers/download-tracker/src"),
    join(ROOT, "dossiers"),
    join(ROOT, "docs"),
  ];
  const hits = [];
  for (const root of roots) {
    for (const file of walkFiles(root)) {
      if (file.endsWith(".test.js") || file.endsWith(".mjs")) continue;
      const text = readFileSync(file, "utf8");
      if (banned.test(text)) hits.push(file.slice(ROOT.length + 1));
    }
  }
  assert.deepEqual(hits, [], "banned bloom phrase remains in " + hits.join(", "));
});

test("homepage first screen names browse, upload, explore, and a footer Agents tab", () => {
  const home = homeBody({ rows: [], host: "https://www.azielcorpuslibrary.net" });
  assert.match(home, /<h1>Search the libraries<\/h1>/);
  assert.match(home, /public MASTER of hashed records/);
  assert.match(home, /Aziel Corpus Library is the public MASTER of hashed records/);
  assert.match(home, /Ask Jeeves/);
  assert.match(home, /class="trend"/);
  assert.match(home, /Per-record view counts are not published/);
  assert.match(home, /class="start-paths"/);
  assert.match(home, /href="\/aziel-library">Aziel Library</);
  assert.match(home, /href="\/corpus">Corpus</);
  assert.match(home, /href="\/upload">Upload a file</);
  assert.match(home, /href="\/tree">Tree</);
  assert.match(home, /href="\/map">Map</);
  assert.match(home, /href="\/forensics">Forensics</);
  assert.match(home, /class="agents-tab"/);
  assert.match(home, /href="\/llms\.txt"[^>]*>Agents</);
  assert.doesNotMatch(home, /<strong>Agents<\/strong>/);
  assert.doesNotMatch(startPathsHtml(), /Agents/);
  assert.match(agentsTabHtml(), /class="agents-tab"/);
  assert.match(agentsTabHtml(), /href="\/llms\.txt"[^>]*>Agents</);
  assert.doesNotMatch(home, /class="facets"/);
  assert.doesNotMatch(home, /15:20/);
  assert.doesNotMatch(home, /10\.5281\/zenodo/i);
  assert.doesNotMatch(home, /This is not/i);
  const split = splitLcpHtml(home);
  assert.match(split.early, /hero-search/);
  assert.match(split.early, /class="trend"/);
  assert.match(split.early, /Ask Jeeves/);
  assert.doesNotMatch(split.early, /id="signup"/);
  assert.doesNotMatch(split.early, /class="agents-tab"/);
  assert.match(split.late, /class="start-paths"/);
  assert.match(split.late, /class="agents-tab"/);
  assert.equal(startPathsHtml().includes("Browse"), true);
});

test("empty browse shelves offer Upload and shelf CTAs instead of a dead end", () => {
  const home = homeBody({ q: "zzzz-no-hit", rows: [] });
  const aziel = azielLibraryBody({ signed: null, rows: [] });
  const corpus = corpusBody({ signed: null, rows: [] });
  for (const html of [home, aziel, corpus]) {
    assert.match(html, /No matching records yet/);
    assert.match(html, /href="\/upload">Upload a file</);
    assert.match(html, /class="empty-actions"/);
    assert.doesNotMatch(html, /This shelf is quiet/);
  }
  assert.match(home, /href="\/aziel-library">Browse Aziel Library</);
  assert.match(home, /href="\/corpus">Browse Corpus</);
  assert.match(aziel, /href="\/aziel-library">Open Aziel Library</);
  assert.match(corpus, /href="\/corpus">Open Corpus</);
});

test("Upload, shelves, Map, Tree, Historical, and Forensics share explore chips and skip Gazetteer", () => {
  assert.equal(EXPLORE_LINKS.some((l) => l.href === "/gazetteer"), false);
  const upload = uploadBody({});
  const aziel = azielLibraryBody({ signed: null, rows: [] });
  const corpus = corpusBody({ signed: null, rows: [] });
  const map = mapBody({ events: [], unresolved: [], gazetteer: { state: "READY", places: 1, profile: "lite" }, signed: null });
  const tree = treeBody({ libraries: {}, standalone: [] });
  const hist = historicalBody({ status: {}, layers: [], signed: null });
  const forensics = intelligenceBody({ packages: [], aiReady: false, signed: null, operator: false });
  const pattern = patternBody({ total: 0 });
  for (const html of [upload, aziel, corpus, map, tree, hist, forensics, pattern, exploreRowHtml("/map")]) {
    assert.match(html, /class="explore-row"/);
    assert.match(html, /href="\/map">Map</);
    assert.match(html, /href="\/tree">Tree</);
    assert.match(html, /href="\/forensics">Forensics</);
    assert.doesNotMatch(html, /href="\/gazetteer"/);
    assert.doesNotMatch(html, />Gazetteer</);
  }
  assert.match(upload, /Upload to Corpus/);
  assert.match(upload, /No account required/);
  assert.match(upload, /\/record\/\{id\}\/llms\.txt/);
  assert.match(upload, /href="\/help\/uploads\.txt"/);
  assert.match(map, /<h1>Map<\/h1>/);
  assert.match(tree, /Open a title to read the record/);
  assert.match(hist, /<h1>Historical<\/h1>/);
  assert.match(CSS, /\.start-paths\{/);
  assert.match(CSS, /\.explore-row\{/);
  assert.match(CSS, /\.agents-tab\{/);
  assert.match(CSS, /html\{scroll-padding-bottom:96px\}/);
  assert.match(CSS, /\.soft-grid\{grid-template-columns:1fr\}/);
  assert.match(CSS, /\.button,button,\.chip,\.nav2 a\{touch-action:manipulation\}/);
});

test("Ask Jeeves FAB stays gold, labeled, and outside trapping chrome", () => {
  const html = page("Corpus Search", homeBody({ rows: [], host: "https://www.azielcorpuslibrary.net" }), { path: "/", kind: "search" });
  const fab = jeevesFabHtml();
  assert.match(html, /id="jeevesFab"/);
  assert.match(html, />Ask Jeeves</);
  assert.match(fab, /aria-label="Ask Jeeves about a filed record"/);
  assert.match(fab, /id="jeevesFab"/);
  assert.match(fab, /jeeves-links/);
  assert.match(fab, /citations:j\.citations/);
  assert.match(CSS, /\.jeeves-fab\{[^}]*position:fixed/);
  assert.match(CSS, /html,body\{[^}]*overflow-y:auto/);
});

test("sigil drawer hides hashes on cards, follows record facets, and keeps honest trending", () => {
  const html = chrome("<p>ok</p>");
  assert.match(html, /id="sigilNavBtn"/);
  assert.match(html, /id="sigilNav" hidden/);
  assert.match(html, /id="sigilNavScrim" hidden/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /sigilNavScript|aria-controls="sigilNav"/);
  assert.match(html, /function toggle\(\)/);
  assert.match(CSS, /\.nav2\{[^}]*position:fixed/);
  assert.match(CSS, /\.nav2\{[^}]*left:0/);
  assert.match(CSS, /\.nav2\{[^}]*height:100vh/);
  assert.match(CSS, /\.nav2\{[^}]*flex-direction:column/);
  assert.match(CSS, /\.sigil-nav-scrim\{[^}]*position:fixed/);
  assert.match(CSS, /\.sigil-nav-btn\{[^}]*order:-1/);
  const nav = html.match(/<nav class="nav2 quiet"[^>]*>[\s\S]*?<\/nav>/)[0];
  assert.doesNotMatch(nav, />Pattern</);
  assert.doesNotMatch(nav, /href="\/pattern"/);
  assert.doesNotMatch(nav, /href="\/runtime"/);
  assert.doesNotMatch(nav, /href="\/verify"/);
  assert.doesNotMatch(nav, /href="\/login"/);
  assert.doesNotMatch(nav, />Agents</);

  const emptyTrend = trendingHtml([]);
  assert.match(emptyTrend, /class="trend"/);
  assert.match(emptyTrend, /Per-record view counts are not published/);
  assert.doesNotMatch(emptyTrend, /class="shelf"/);
  const ranked = trendingHtml([{ record_id: "AZDOC-1", title: "Counted", views: 4 }, { record_id: "AZDOC-2", title: "Skip", views: 0 }]);
  assert.match(ranked, /href="\/record\/AZDOC-1">Counted</);
  assert.match(ranked, /4 views/);
  assert.doesNotMatch(ranked, /AZDOC-2/);

  const cardHome = homeBody({
    q: "Cockroach",
    rows: [{
      record_id: "AZDOC-hash",
      title: "Hashed note",
      library: "aziel",
      author: "Aziel Eliab",
      content_sha256: "ab".repeat(32),
      snippet: "Public note.",
    }],
  });
  assert.doesNotMatch(cardHome, /SHA-256/);
  assert.doesNotMatch(cardHome, /Author Aziel Eliab/i);
  assert.doesNotMatch(cardHome, /byline/);
  assert.match(cardHome, /Download/);

  const rec = recordBody({
    row: {
      record_id: "AZDOC-follow",
      title: "Followable record",
      library: "aziel",
      author: "Aziel Eliab",
      domain: "research",
      subjects: "doctrine",
      keywords: "clarity",
      micro: "micro-shelf",
      content_sha256: "cd".repeat(32),
      snippet: "A filed note.",
    },
  });
  assert.match(rec, /id="hashes"/);
  assert.match(rec, /class="verify-panel"/);
  assert.match(rec, /SHA-256 cdcd/);
  assert.match(rec, /class="follow-footer"/);
  assert.match(rec, /href="\/\?domain=research">research</);
  assert.match(rec, /href="\/\?subject=doctrine">doctrine</);
  assert.match(rec, /href="\/\?keyword=clarity">clarity</);
  assert.match(rec, /href="\/\?q=micro-shelf">micro-shelf</);
  assert.doesNotMatch(rec, /Author Aziel Eliab/i);
  const hashesAt = rec.indexOf('id="hashes"');
  const shaAt = rec.indexOf("SHA-256");
  const faceEnd = rec.indexOf("<h1>");
  assert.ok(hashesAt > 0 && shaAt > hashesAt, "hash text lives inside the Hashes panel");
  assert.ok(faceEnd > 0 && rec.slice(0, faceEnd).indexOf("SHA-256") < 0, "hash is not on the record face");
});
