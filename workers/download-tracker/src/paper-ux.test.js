import test from "node:test";
import assert from "node:assert/strict";
import {
  BLACK_BAR,
  bumpPaperCount,
  continuePaperBackfill,
  findPaperBySlug,
  linkCitations,
  lookupPaperSlug,
  paperAliasLocation,
  parsePaperPermalink,
  permalinkPath,
  readPaperCounts,
  redactIdentityCluster,
  renderPaperReader,
  slugifyTitle,
  splitPaperPages,
  stampPermalinks,
  topPapers,
} from "./paper-ux.js";
import { keepAppendedKeys } from "./record-metadata.js";
import { recordBody } from "./hosted-pages.js";
import { CSS, page, READER_ZOOM_STEPS, readerStageHeight, readerZoomScript } from "./ui.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|10\.5281\/zenodo/i;

function kv(seed = new Map()) {
  return {
    async get(key) {
      return seed.has(key) ? seed.get(key) : null;
    },
    async put(key, value) {
      seed.set(key, String(value));
    },
    store: seed,
  };
}

test("permalinks map shelves and stay locked", () => {
  const rows = stampPermalinks([
    { record_id: "AZDOC-BBB", title: "Cockroach Doctrine", library: "aziel", created_utc: "" },
    { record_id: "AZDOC-AAA", title: "Cockroach Doctrine", library: "aziel" },
    { record_id: "AZDOC-CCC", title: "Field Note", library: "corpus" },
  ]);
  const bare = rows.find((row) => row.record_id === "AZDOC-AAA");
  const other = rows.find((row) => row.record_id === "AZDOC-BBB");
  const corpus = rows.find((row) => row.record_id === "AZDOC-CCC");
  assert.equal(slugifyTitle("Cockroach Doctrine"), "cockroach-doctrine");
  assert.equal(bare.permalink, "/aziellibrary/cockroach-doctrine");
  assert.equal(other.permalink, "/aziellibrary/cockroach-doctrine-" + "AZDOC-BBB".replace(/^AZDOC-/i, "").slice(-6).toLowerCase());
  assert.equal(corpus.permalink, "/azielcorpus/usersubmitted/field-note");
  assert.equal(permalinkPath("aziel", "cockroach-doctrine"), "/aziellibrary/cockroach-doctrine");
  assert.equal(permalinkPath("corpus", "field-note"), "/azielcorpus/usersubmitted/field-note");
  const again = stampPermalinks(rows);
  assert.equal(again.find((row) => row.record_id === "AZDOC-AAA").permalink_slug, bare.permalink_slug);
  assert.equal(parsePaperPermalink("/aziellibrary/cockroach-doctrine").shelf, "aziel");
  assert.equal(parsePaperPermalink("/aziellibrary/cockroach-doctrine/p/2").page, 2);
  assert.equal(parsePaperPermalink("/azielcorpus/usersubmitted/field-note").shelf, "corpus");
  assert.equal(parsePaperPermalink("/?q=aziel&lib=all&sort=newest"), null);
  const found = findPaperBySlug(rows, "aziel", "cockroach-doctrine");
  assert.equal(found.record_id, "AZDOC-AAA");
  assert.equal(findPaperBySlug(rows, "corpus", "cockroach-doctrine"), null);
  assert.equal(rows.find((row) => row.record_id === "AZDOC-BBB").created_utc, "");
});

test("truncated doctrine slug interlocks with the full title and the short name", () => {
  const doctrine = {
    record_id: "AZDOC-A53F8E3052E2",
    title: "The Cockroach Doctrine: A Resilience Doctrine for Remaining Operational Under Repeated Asymmetric Disruption",
    library: "aziel",
    permalink_locked: true,
    permalink_slug: "the-cockroach-doctrine-a-resilience-doctrine-for-remaining-operational-u",
  };
  const pageOne = {
    record_id: "AZDOC-EBA502F4610D",
    title: "The Cockroach Doctrine — Page 1 — The Cockroach Doctrine",
    library: "aziel",
    permalink_locked: true,
    permalink_slug: "the-cockroach-doctrine-page-1-the-cockroach-doctrine",
  };
  const records = [doctrine, pageOne];
  const before = JSON.stringify(records);
  const canonical = doctrine.permalink_slug;
  const full = slugifyTitle(doctrine.title, 0);
  assert.ok(full.length > 72);
  assert.equal(slugifyTitle(doctrine.title), canonical);
  assert.equal(full.startsWith(canonical), true);
  const exact = lookupPaperSlug(records, "aziel", canonical);
  assert.equal(exact.alias, false);
  assert.equal(exact.row.record_id, doctrine.record_id);
  assert.equal(findPaperBySlug(records, "aziel", canonical).record_id, doctrine.record_id);
  const long = lookupPaperSlug(records, "aziel", full);
  assert.equal(long.alias, true);
  assert.equal(long.kind, "full-title");
  assert.equal(long.row.record_id, doctrine.record_id);
  assert.equal(paperAliasLocation(long.row, 1), "/aziellibrary/" + canonical);
  assert.equal(paperAliasLocation(long.row, 2), "/aziellibrary/" + canonical + "/p/2");
  const bareFull = full.replace(/^the-/, "");
  assert.equal(lookupPaperSlug(records, "aziel", bareFull).row.record_id, doctrine.record_id);
  const mid = full.slice(0, 90);
  assert.equal(lookupPaperSlug(records, "aziel", mid).kind, "longer-cut");
  assert.equal(lookupPaperSlug(records, "aziel", mid).row.record_id, doctrine.record_id);
  const short = lookupPaperSlug(records, "aziel", "cockroach-doctrine");
  assert.equal(short.alias, true);
  assert.equal(short.kind, "leading-title");
  assert.equal(short.row.record_id, doctrine.record_id);
  assert.equal(lookupPaperSlug(records, "aziel", "the-cockroach-doctrine").row.record_id, doctrine.record_id);
  assert.equal(lookupPaperSlug(records, "aziel", "the-cockroach-doctrine-a-resilience-doctrine").row.record_id, doctrine.record_id);
  assert.equal(lookupPaperSlug(records, "aziel", "the-cockroach"), null);
  assert.equal(lookupPaperSlug(records, "aziel", "cockroach-doctrine-not-filed"), null);
  assert.equal(lookupPaperSlug(records, "corpus", "cockroach-doctrine"), null);
  assert.equal(findPaperBySlug(records, "aziel", "cockroach-doctrine"), null);
  const pageHit = lookupPaperSlug(records, "aziel", pageOne.permalink_slug);
  assert.equal(pageHit.alias, false);
  assert.equal(pageHit.row.record_id, pageOne.record_id);
  assert.equal(lookupPaperSlug(records, "aziel", "the-cockroach-doctrine-page-1").row.record_id, pageOne.record_id);
  const named = {
    record_id: "AZDOC-SHORT",
    title: "Cockroach Doctrine",
    library: "aziel",
    permalink_locked: true,
    permalink_slug: "cockroach-doctrine",
  };
  const exactShort = lookupPaperSlug([named, doctrine], "aziel", "cockroach-doctrine");
  assert.equal(exactShort.alias, false);
  assert.equal(exactShort.row.record_id, "AZDOC-SHORT");
  assert.equal(JSON.stringify(records), before);
});

test("reader links an in-library cite and pages a multi-page paper", () => {
  const catalog = stampPermalinks([
    { record_id: "AZDOC-AAA111", title: "Cockroach Doctrine", library: "aziel", permalink_locked: true, permalink_slug: "cockroach-doctrine" },
    { record_id: "AZDOC-BBB222", title: "Field Methods Note", library: "corpus", permalink_locked: true, permalink_slug: "field-methods-note" },
  ]);
  const html = linkCitations(
    "See Cockroach Doctrine and AZDOC-AAA111. A missing pamphlet stays plain.",
    catalog,
    "AZDOC-BBB222"
  );
  assert.match(html, /href="\/aziellibrary\/cockroach-doctrine"/);
  assert.match(html, /AZDOC-AAA111/);
  assert.match(html, /missing pamphlet/);
  assert.doesNotMatch(html, /href="\/\?q=/);
  const self = linkCitations("Field Methods Note cites itself.", catalog, "AZDOC-BBB222");
  assert.doesNotMatch(self, /href=/);
  const split = splitPaperPages("Alpha page.\fBeta page.");
  assert.equal(split.mode, "paged");
  assert.equal(split.page_count, 2);
  const alone = splitPaperPages("One standing paper.");
  assert.equal(alone.mode, "standalone");
  assert.equal(alone.page_count, 1);
  const pdf = splitPaperPages("%PDF-1.7 binary", { contentType: "application/pdf" });
  assert.equal(pdf.mode, "binary");
  assert.equal(pdf.pages.length, 0);
  const reader = renderPaperReader({
    row: { record_id: "AZDOC-BBB222", title: "Field Methods Note", library: "corpus", content_sha256: "ab".repeat(32) },
    body: "Alpha page.\fSee Cockroach Doctrine.\fGamma.",
    counts: { views: 3, downloads: 1, available: true, source: "kv" },
    permalink: "/azielcorpus/usersubmitted/field-methods-note",
    catalog,
    page: 2,
  });
  assert.match(reader, /data-reader="paged"/);
  assert.match(reader, /Page 2 of 3/);
  assert.match(reader, /data-views="3"/);
  assert.match(reader, /data-downloads="1"/);
  assert.match(reader, /href="\/aziellibrary\/cockroach-doctrine"/);
  assert.match(reader, /class="page-turner page-turner-top"/);
  assert.match(reader, /class="page-turner page-turner-end"/);
  assert.match(reader, /class="page-turn"/);
  assert.match(reader, /rel="prev" href="\/azielcorpus\/usersubmitted\/field-methods-note"/);
  assert.match(reader, /rel="next" href="\/azielcorpus\/usersubmitted\/field-methods-note\/p\/3"/);
  assert.match(reader, /class="paper-actions"/);
  assert.match(reader, /href="\/file\/AZDOC-BBB222"/);
  assert.match(reader, /href="\/download\?record=AZDOC-BBB222"/);
  assert.match(html, /class="paper-cite"/);
  assert.match(reader, /Lamb Lens: Service/);
  assert.match(reader, /Clarity/);
  assert.match(reader, /Peace/);
  assert.doesNotMatch(reader, /%PDF/);
  const deferred = renderPaperReader({
    row: {
      record_id: "AZDOC-PDF",
      title: "Scan",
      library: "aziel",
      content_type: "application/pdf",
      filename: "scan.pdf",
      object_key: "aziel/AZDOC-PDF/scan.pdf",
    },
    body: "%PDF-1.7\nstream",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/scan",
  });
  assert.match(deferred, /data-reader="pdf"/);
  assert.match(deferred, /class="paper-embed paper-pdf"/);
  assert.match(deferred, /src="\/file\/AZDOC-PDF#view=FitH"/);
  assert.match(deferred, /class="button ghost" href="\/file\/AZDOC-PDF" download="scan.pdf"/);
  assert.match(deferred, /<strong>0<\/strong> views/);
  assert.doesNotMatch(deferred, /%PDF/);
  assert.doesNotMatch(deferred, /Page images are not rendered/);
  const noted = renderPaperReader({
    row: {
      record_id: "AZDOC-PDF",
      title: "Scan",
      library: "aziel",
      content_type: "application/pdf",
      filename: "scan.pdf",
      object_key: "aziel/AZDOC-PDF/scan.pdf",
    },
    body: "A note stored beside the scan.",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/scan",
  });
  assert.match(noted, /data-reader="pdf"/);
  assert.match(noted, /Stored text/);
  assert.match(noted, /A note stored beside the scan/);
  const image = renderPaperReader({
    row: {
      record_id: "AZDOC-IMG",
      title: "Plate",
      library: "aziel",
      content_type: "image/png",
      filename: "plate.png",
      object_key: "aziel/AZDOC-IMG/plate.png",
    },
    body: "",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/plate",
  });
  assert.match(image, /data-reader="image"/);
  assert.match(image, /<img class="paper-embed paper-image" src="\/file\/AZDOC-IMG"/);
  const audio = renderPaperReader({
    row: {
      record_id: "AZDOC-AUD",
      title: "Take",
      library: "corpus",
      content_type: "audio/mpeg",
      filename: "take.mp3",
      object_key: "corpus/AZDOC-AUD/take.mp3",
    },
    body: "",
    counts: { views: 1, downloads: 0, available: true },
    permalink: "/azielcorpus/usersubmitted/take",
  });
  assert.match(audio, /<audio class="paper-embed paper-av av-player" controls/);
  const htmlFile = renderPaperReader({
    row: {
      record_id: "AZDOC-HTM",
      title: "Page",
      library: "corpus",
      content_type: "text/html",
      filename: "page.html",
      object_key: "corpus/AZDOC-HTM/page.html",
    },
    body: "<p>Hello</p>",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/azielcorpus/usersubmitted/page",
  });
  assert.match(htmlFile, /data-reader="html"/);
  assert.match(htmlFile, /sandbox=""/);
  assert.match(htmlFile, /src="\/file\/AZDOC-HTM"/);
  assert.doesNotMatch(htmlFile, /<p>Hello<\/p>/);
  const zip = renderPaperReader({
    row: {
      record_id: "AZDOC-ZIP",
      title: "Bundle",
      library: "aziel",
      content_type: "application/zip",
      filename: "bundle.zip",
      object_key: "aziel/AZDOC-ZIP/bundle.zip",
    },
    body: "Notes kept with the archive.",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/bundle",
  });
  assert.match(zip, /data-reader="opaque"/);
  assert.match(zip, /ZIP archive \(\.zip\)/);
  assert.match(zip, /did not read the archive/);
  assert.match(zip, /nothing is listed/);
  assert.match(zip, /class="button" href="\/file\/AZDOC-ZIP" download="bundle.zip"/);
  assert.match(zip, /Notes kept with the archive/);
  assert.doesNotMatch(zip, /<iframe/);
  assert.doesNotMatch(zip, /cannot paint this type/);
  const markdown = renderPaperReader({
    row: {
      record_id: "AZDOC-MD",
      title: "Note",
      library: "aziel",
      content_type: "text/markdown",
      filename: "note.md",
      object_key: "aziel/AZDOC-MD/note.md",
    },
    body: "First line.\n\nSecond line.",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/note",
  });
  assert.match(markdown, /data-reader="standalone"/);
  assert.match(markdown, /<p>First line\.<\/p><p>Second line\.<\/p>/);
  assert.doesNotMatch(markdown, /<iframe/);
  const undated = renderPaperReader({
    row: { record_id: "AZDOC-UNDATED", title: "No date", library: "aziel" },
    body: "Text.",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/no-date",
  });
  assert.match(undated, /Undated/);
  assert.doesNotMatch(undated, BANNED);
});

test("painted readers offer zoom and fit the pane; opaque files stay download-only", () => {
  assert.equal(readerStageHeight(900, 260, 110, 0), 530);
  assert.equal(readerStageHeight(740, 400, 176, 0), 564);
  assert.equal(readerStageHeight(360, 180, 140, 0), 220);
  assert.equal(readerStageHeight(900, 260, 110, 180), 180);
  assert.equal(readerStageHeight(900, 260, 110, 2000), 530);
  assert.equal(readerStageHeight(300, 220, 160, 0), 140);
  assert.ok(READER_ZOOM_STEPS.includes(1));
  const pdf = renderPaperReader({
    row: {
      record_id: "AZDOC-PDF",
      title: "Scan",
      library: "aziel",
      content_type: "application/pdf",
      filename: "scan.pdf",
      object_key: "aziel/AZDOC-PDF/scan.pdf",
    },
    body: "",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/scan",
  });
  assert.match(pdf, /class="paper-stage paper-stage-framed"/);
  assert.match(pdf, /data-stage="pdf"/);
  assert.match(pdf, /data-scale="1"/);
  assert.match(pdf, /src="\/file\/AZDOC-PDF#view=FitH"/);
  assert.match(pdf, />Zoom out</);
  assert.match(pdf, />Zoom in</);
  assert.match(pdf, />Fit</);
  assert.match(pdf, />Reset</);
  assert.match(pdf, /class="paper-zoom-readout"/);
  assert.doesNotMatch(pdf, /<script/i);
  const image = renderPaperReader({
    row: {
      record_id: "AZDOC-IMG",
      title: "Plate",
      library: "aziel",
      content_type: "image/png",
      filename: "plate.png",
      object_key: "aziel/AZDOC-IMG/plate.png",
    },
    body: "",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/plate",
  });
  assert.match(image, /data-stage="image"/);
  assert.match(image, /paper-stage-framed/);
  assert.match(image, />Zoom in</);
  const note = renderPaperReader({
    row: {
      record_id: "AZDOC-MD",
      title: "Note",
      library: "aziel",
      content_type: "text/markdown",
      filename: "note.md",
      object_key: "aziel/AZDOC-MD/note.md",
    },
    body: "First line.\n\nSecond line.",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/note",
  });
  assert.match(note, /data-stage="text"/);
  assert.match(note, /paper-stage-flow/);
  assert.match(note, />Fit</);
  assert.doesNotMatch(note, /<iframe/);
  assert.doesNotMatch(note, /<script/i);
  const zip = renderPaperReader({
    row: {
      record_id: "AZDOC-ZIP",
      title: "Bundle",
      library: "aziel",
      content_type: "application/zip",
      filename: "bundle.zip",
      object_key: "aziel/AZDOC-ZIP/bundle.zip",
    },
    body: "Notes kept with the archive.",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/bundle",
  });
  assert.match(zip, /data-reader="opaque"/);
  assert.doesNotMatch(zip, /paper-stage/);
  assert.doesNotMatch(zip, /Zoom in/);
  assert.doesNotMatch(zip, /<iframe/);
  const audio = renderPaperReader({
    row: {
      record_id: "AZDOC-AUD",
      title: "Take",
      library: "corpus",
      content_type: "audio/mpeg",
      filename: "take.mp3",
      object_key: "corpus/AZDOC-AUD/take.mp3",
    },
    body: "",
    counts: { views: 1, downloads: 0, available: true },
    permalink: "/azielcorpus/usersubmitted/take",
  });
  assert.doesNotMatch(audio, /paper-stage/);
  assert.match(audio, /<audio /);
  const shell = page("Scan", pdf, { path: "/aziellibrary/scan", kind: "record" });
  assert.match(shell, /aziel-reader-zoom:v1:/);
  assert.match(shell, /sessionStorage/);
  assert.equal(shell.includes("min-height:420px"), false);
  const home = page("Home", "<p>Search</p>", { kind: "search" });
  assert.doesNotMatch(home, /aziel-reader-zoom/);
  assert.match(CSS, /\.paper-stage-framed\{/);
  assert.doesNotMatch(CSS, /min-height:420px/);
  const script = readerZoomScript();
  assert.doesNotMatch(script, BANNED);
  const start = script.indexOf("function readerStageHeight");
  const end = script.indexOf("var root=");
  const fromScript = new Function(`${script.slice(start, end)} return readerStageHeight;`)();
  for (const args of [[900, 260, 110, 0], [740, 400, 176, 0], [360, 180, 140, 0], [900, 260, 110, 180], [300, 220, 160, 0], [280, 40, 200, 0]]) {
    assert.equal(fromScript(...args), readerStageHeight(...args), args.join(","));
  }
});

test("identity cluster is black-barred only when a name token is present", () => {
  const clean = redactIdentityCluster("Indiana in 1995 remained a place name.");
  assert.equal(clean.redacted, false);
  assert.match(clean.text, /Indiana/);
  assert.match(clean.text, /1995/);
  const hit = redactIdentityCluster("Collin Horton of Fishers, Indiana, 1995");
  assert.equal(hit.redacted, true);
  assert.equal(hit.text.includes("Collin"), false);
  assert.equal(hit.text.includes("Horton"), false);
  assert.match(hit.text, new RegExp(BLACK_BAR));
  const shown = renderPaperReader({
    row: { record_id: "AZDOC-REDACT", title: hit.text, library: "aziel" },
    body: hit.text,
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/withheld",
  });
  assert.doesNotMatch(shown, BANNED);
});

test("per-paper counters stay honest and rank only stored hits", async () => {
  const store = new Map();
  const env = { DOWNLOADS: kv(store) };
  const missing = await readPaperCounts(env, "AZDOC-NONE");
  assert.equal(missing.views, 0);
  assert.equal(missing.downloads, 0);
  assert.equal(missing.invented, false);
  const none = await readPaperCounts({}, "AZDOC-NONE");
  assert.equal(none.available, false);
  assert.equal(none.views, null);
  await bumpPaperCount(env, "AZDOC-AAA", "views", new Request("https://azielcorpuslibrary.net/aziellibrary/cockroach-doctrine", { headers: { "user-agent": "Mozilla/5.0" } }));
  await bumpPaperCount(env, "AZDOC-AAA", "downloads", new Request("https://azielcorpuslibrary.net/download?record=AZDOC-AAA", { headers: { "user-agent": "Mozilla/5.0" } }));
  const counts = await readPaperCounts(env, "AZDOC-AAA");
  assert.equal(counts.views, 1);
  assert.equal(counts.downloads, 1);
  const metrics = JSON.parse(store.get("library:paper-metrics:v1"));
  const catalog = stampPermalinks([
    { record_id: "AZDOC-AAA", title: "Cockroach Doctrine", library: "aziel" },
    { record_id: "AZDOC-GHOST", title: "Not really filed", library: "corpus" },
  ]);
  metrics.papers["AZDOC-GHOST"] = { views: 9, downloads: 9 };
  metrics.papers["AZDOC-ZZZ"] = { views: 4, downloads: 0 };
  const viewed = topPapers(metrics, catalog, "views", 5);
  assert.deepEqual(viewed.map((row) => row.record_id), ["AZDOC-GHOST", "AZDOC-AAA"]);
  assert.equal(viewed[0].permalink, "/azielcorpus/usersubmitted/not-really-filed");
  assert.equal(viewed.some((row) => row.record_id === "AZDOC-ZZZ"), false);
  const offline = await continuePaperBackfill(null, {});
  assert.equal(offline.ok, false);
  assert.equal(offline.invented, false);
});

test("discovery merge only adds missing keys", () => {
  const previous = {
    title: "Kept",
    content_sha256: "abc",
    paper_chain_tip: "tip",
    sameAs: ["https://www.azielcorpuslibrary.net/record/AZDOC-1"],
    permalink: "https://www.azielcorpuslibrary.net/aziellibrary/kept",
  };
  const next = {
    title: "Rebuilt",
    content_sha256: "abc",
    paper_chain_tip: "tip",
    sameAs: ["https://www.azielcorpuslibrary.net/record/AZDOC-1"],
  };
  const merged = keepAppendedKeys(previous, next);
  assert.equal(merged.title, "Rebuilt");
  assert.equal(merged.permalink, previous.permalink);
  assert.equal(merged.paper_chain_tip, "tip");
  assert.equal(merged.content_sha256, "abc");
});

test("record page shows the reader and stored counts", () => {
  const html = recordBody({
    row: {
      record_id: "AZDOC-follow",
      title: "Followable record",
      library: "aziel",
      author: "Aziel Eliab",
      domain: "research",
      subjects: "doctrine",
      keywords: "clarity",
      content_sha256: "cd".repeat(32),
      body: "A filed note about Cockroach Doctrine.",
      permalink: "/aziellibrary/followable-record",
    },
    counts: { views: 2, downloads: 1, available: true, source: "kv" },
    permalink: "/aziellibrary/followable-record",
    catalog: stampPermalinks([
      { record_id: "AZDOC-OTHER", title: "Cockroach Doctrine", library: "aziel", permalink_locked: true, permalink_slug: "cockroach-doctrine" },
    ]),
  });
  assert.match(html, /data-reader="standalone"/);
  assert.match(html, /data-views="2"/);
  assert.match(html, /data-downloads="1"/);
  assert.match(html, /href="\/aziellibrary\/cockroach-doctrine"/);
  assert.match(html, /href="\/aziellibrary\/followable-record"/);
  assert.doesNotMatch(html, /\/\?q=/);
  assert.doesNotMatch(html, BANNED);
});
