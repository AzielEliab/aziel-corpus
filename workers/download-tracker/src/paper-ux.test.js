import test from "node:test";
import assert from "node:assert/strict";
import {
  BLACK_BAR,
  bumpPaperCount,
  continuePaperBackfill,
  findPaperBySlug,
  linkCitations,
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
  assert.equal(pdf.mode, "pdf-deferred");
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
    row: { record_id: "AZDOC-PDF", title: "Scan", library: "aziel", content_type: "application/pdf" },
    body: "%PDF-1.7\nstream",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/scan",
  });
  assert.match(deferred, /data-reader="pdf-deferred"/);
  assert.match(deferred, /<strong>0<\/strong> views/);
  assert.doesNotMatch(deferred, /%PDF/);
  const undated = renderPaperReader({
    row: { record_id: "AZDOC-UNDATED", title: "No date", library: "aziel" },
    body: "Text.",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/no-date",
  });
  assert.match(undated, /Undated/);
  assert.doesNotMatch(undated, BANNED);
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
