import test from "node:test";
import assert from "node:assert/strict";
import { headMeta, defaultDescription, recordDescription, personNode, SHARE_IMAGE, ABOUT_PATH, aboutRedirectFrom } from "./seo.js";
import { page, howItsScoredBody } from "./ui.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;

function graphFrom(html) {
  const m = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
  assert.ok(m, "json-ld missing");
  return JSON.parse(m[1]);
}

test("JSON-LD types the author as Person with alternateName", () => {
  const person = personNode();
  assert.equal(person["@type"], "Person");
  assert.equal(person.name, "Aziel Eliab");
  assert.deepEqual(person.alternateName, ["Aziel Elroi Eliab"]);
  assert.ok(person.sameAs.includes("https://github.com/AzielEliab"));

  const html = headMeta({ title: "Aziel Eliab", path: ABOUT_PATH, kind: "about" });
  const ld = graphFrom(html);
  const types = ld["@graph"].map((n) => n["@type"]);
  assert.ok(types.includes("Person"));
  assert.ok(types.includes("Organization"));
  assert.ok(types.includes("WebSite"));
  assert.ok(types.includes("ProfilePage"));
  const who = ld["@graph"].find((n) => n["@type"] === "Person");
  assert.equal(who.name, "Aziel Eliab");
  assert.equal(who["@id"], "https://www.azielcorpuslibrary.net/AzielEliab#aziel-eliab");
  assert.equal(who.url, "https://www.azielcorpuslibrary.net/AzielEliab");
  assert.ok(who.alternateName.includes("Aziel Elroi Eliab"));
  const profile = ld["@graph"].find((n) => n["@type"] === "ProfilePage");
  assert.equal(profile.url, "https://www.azielcorpuslibrary.net/AzielEliab");
  const org = ld["@graph"].find((n) => n["@type"] === "Organization");
  assert.equal(org.name, "Aziel Digital Library");
  const site = ld["@graph"].find((n) => n["@type"] === "WebSite");
  assert.equal(site.potentialAction["@type"], "SearchAction");
  assert.match(site.potentialAction.target.urlTemplate, /\?q=\{search_term_string\}/);
  assert.doesNotMatch(html, BANNED);
});

test("page-specific descriptions and share images", () => {
  assert.match(defaultDescription("about"), /Aziel Eliab/);
  assert.match(defaultDescription("about"), /Aziel Elroi Eliab/);
  assert.match(defaultDescription("software"), /Software|aziel-runtime/i);
  assert.match(defaultDescription("scored"), /intentional suppression/);
  assert.match(defaultDescription("search"), /Search Aziel Digital Library/);
  const about = headMeta({ title: "Aziel Eliab", path: ABOUT_PATH, kind: "about" });
  const record = headMeta({
    title: "The Cockroach Doctrine",
    path: "/record/AZDOC-1",
    kind: "record",
    description: recordDescription({ title: "The Cockroach Doctrine", author: "Aziel Eliab", library: "aziel" }),
    work: { title: "The Cockroach Doctrine", author: "Aziel Eliab", library: "aziel", record_id: "AZDOC-1" },
  });
  assert.match(about, /content="About Aziel Eliab/);
  assert.doesNotMatch(record, /Search, map, gazetteer, intelligence, and hosted OCR/);
  assert.match(record, /The Cockroach Doctrine by Aziel Eliab/);
  assert.match(record, /og:image" content="https:\/\/www\.azielcorpuslibrary\.net\/sigil\.png"/);
  assert.match(record, /twitter:image" content="https:\/\/www\.azielcorpuslibrary\.net\/sigil\.png"/);
  assert.equal(SHARE_IMAGE, "https://www.azielcorpuslibrary.net/sigil.png");
  const ld = graphFrom(record);
  const article = ld["@graph"].find((n) => n["@type"] === "ScholarlyArticle");
  assert.ok(article);
  assert.equal(article.name, "The Cockroach Doctrine");
  assert.equal(article.isPartOf.name, "Aziel Library");
});

test("recordDescription uses document title and Aziel Eliab for library docs", () => {
  const aziel = recordDescription({ title: "Paper One", author: "Aziel Eliab", library: "aziel" });
  assert.match(aziel, /Paper One by Aziel Eliab/);
  assert.match(aziel, /Aziel Library/);
  const corpus = recordDescription({ title: "Filed note", author: "A reader", library: "corpus" });
  assert.match(corpus, /Filed note by A reader/);
  assert.match(corpus, /Aziel Eliab/);
});

test("legacy /about paths permanently redirect to /AzielEliab", () => {
  assert.equal(aboutRedirectFrom("/about"), "/AzielEliab");
  assert.equal(aboutRedirectFrom("/about/"), "/AzielEliab");
  assert.equal(aboutRedirectFrom("/aboutme"), "/AzielEliab");
  assert.equal(aboutRedirectFrom("/azieleliab"), "/AzielEliab");
  assert.equal(aboutRedirectFrom("/AZIELELIAB"), "/AzielEliab");
  assert.equal(aboutRedirectFrom("/AzielEliab"), null);
  assert.equal(aboutRedirectFrom("/software"), null);
});

test("chrome page for how-its-scored does not leak the quiet triad boost", () => {
  const html = page("How it's scored", howItsScoredBody(), { path: "/how-its-scored", kind: "scored" });
  assert.match(html, /href="\/how-its-scored"/);
  assert.match(html, /SPRE × CLCE × PhysLing|geometric mean/);
  assert.match(html, /intentional suppression confidence/);
  assert.match(html, /Person/);
  assert.match(html, /Aziel Elroi Eliab/);
  assert.doesNotMatch(html, BANNED);
  assert.doesNotMatch(html, /collection score is the published triad/);
});
