import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CSS, page, aboutBody, patternBody, softwareBody, runtimeBody, azielLibraryBody, homeBody } from "../workers/download-tracker/src/ui.js";
import { ocrPageBody, mapBody, SPECTRAL_LENSES } from "../workers/download-tracker/src/hosted-pages.js";
import { dedupeShelfRows } from "../workers/download-tracker/src/library.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NAV = [
  [">Search<", "/"],
  [">Aziel Library<", "/aziel-library"],
  [">Corpus<", "/corpus"],
  [">Pattern<", "/pattern"],
  [">Software<", "/software"],
  [">Tree<", "/tree"],
  [">Map<", "/map"],
  [">Historical<", "/historical"],
  [">Gazetteer<", "/gazetteer"],
  [">Intelligence<", "/intelligence"],
  [">About Aziel<", "/about"],
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
});

test("black/gold theme and royal purple Aziel Library text are in CSS", () => {
  assert.match(CSS, /--bg:#12100c/);
  assert.match(CSS, /--gold:#c9a227/);
  assert.match(CSS, /--royal:#6b3fa0/);
  assert.match(CSS, /html,body\{[^}]*overflow:auto/);
  assert.match(CSS, /\.about-aziel/);
  assert.match(CSS, /\.doc\.doc-aziel/);
  assert.match(CSS, /\.checkrow\{/);
  assert.match(CSS, /input\[type=checkbox\].*width:auto/);
  assert.match(CSS, /\.lens-grid\{/);
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
  assert.match(about, /— Aziel Eliab/);
  assert.match(about, /I am temporary/);
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
  assert.match(soft, /Downloadable software/);
  assert.match(soft, /aziel-runtime/);
  assert.doesNotMatch(soft, /zenodo/i);
  const runtime = runtimeBody();
  assert.match(runtime, /aziel-runtime/);
  assert.match(runtime, /\/v1\/runtime/);
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
  assert.match(html, /AZDOC-1/);
  assert.doesNotMatch(html, /AZDOC-2/);
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
  assert.match(home, /href="\/file\/A"/);
  assert.doesNotMatch(home, /href="\/file\/B"/);
  assert.deepEqual(
    dedupeShelfRows([
      { record_id: "1", content_sha256: "abc" },
      { record_id: "2", content_sha256: "ABC" },
      { record_id: "3", content_sha256: "" },
    ]).map((r) => r.record_id),
    ["1", "3"]
  );
});

test("sigil and spectral samples are hosted public assets", () => {
  assert.equal(existsSync(join(ROOT, "workers/download-tracker/public/sigil.png")), true);
  for (const id of ["zero", "tazel", "vyrn", "uv", "rosetta", "zen", "chaos", "balance"]) {
    assert.equal(existsSync(join(ROOT, "workers/download-tracker/public/spectral-samples/" + id + ".png")), true);
  }
});
