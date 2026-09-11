import test from "node:test";
import assert from "node:assert/strict";
import { headMeta, defaultDescription, documentTitle, recordDescription, personNode, SHARE_IMAGE, ABOUT_PATH, aboutRedirectFrom } from "./seo.js";
import { handleRuntimeApi } from "./runtime.js";
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
  assert.ok(person.sameAs.includes("https://godlock.uk/AzielEliab"));
  assert.ok(person.sameAs.includes("https://github.com/AzielEliab"));
  assert.ok(person.sameAs.includes("https://github.com/AzielEliab/aziel-corpus"));
  assert.deepEqual(person.sameAs, [
    "https://godlock.uk/AzielEliab",
    "https://github.com/AzielEliab",
    "https://github.com/AzielEliab/aziel-corpus",
  ]);

  const html = headMeta({ title: "Aziel Eliab", path: ABOUT_PATH, kind: "about" });
  const ld = graphFrom(html);
  const types = ld["@graph"].map((n) => n["@type"]);
  assert.ok(types.includes("Person"));
  assert.ok(types.includes("Organization"));
  assert.ok(types.includes("WebSite"));
  assert.ok(types.includes("AboutPage"));
  assert.ok(types.includes("ProfilePage"));
  const who = ld["@graph"].find((n) => n["@type"] === "Person");
  assert.equal(who.name, "Aziel Eliab");
  assert.equal(who["@id"], "https://www.azielcorpuslibrary.net/AzielEliab#aziel-eliab");
  assert.equal(who.url, "https://www.azielcorpuslibrary.net/AzielEliab");
  assert.ok(who.alternateName.includes("Aziel Elroi Eliab"));
  assert.ok(who.sameAs.includes("https://godlock.uk/AzielEliab"));
  assert.ok(who.sameAs.includes("https://github.com/AzielEliab"));
  assert.ok(who.sameAs.includes("https://github.com/AzielEliab/aziel-corpus"));
  assert.match(html, /rel="me" href="https:\/\/godlock\.uk\/AzielEliab"/);
  assert.match(html, /keywords" content="Aziel Eliab, Aziel Elroi Eliab, Aziel Digital Library/);
  assert.match(html, /GodLock/);
  const aboutPage = ld["@graph"].find((n) => n["@type"] === "AboutPage");
  assert.equal(aboutPage.url, "https://www.azielcorpuslibrary.net/AzielEliab");
  assert.equal(aboutPage.mainEntity["@id"], "https://www.azielcorpuslibrary.net/AzielEliab#aziel-eliab");
  const profile = ld["@graph"].find((n) => n["@type"] === "ProfilePage");
  assert.equal(profile.url, "https://www.azielcorpuslibrary.net/AzielEliab");
  const org = ld["@graph"].find((n) => n["@type"] === "Organization");
  assert.equal(org.name, "Aziel Digital Library");
  const site = ld["@graph"].find((n) => n["@type"] === "WebSite");
  assert.equal(site.potentialAction["@type"], "SearchAction");
  assert.match(site.potentialAction.target.urlTemplate, /\?q=\{search_term_string\}/);
  assert.doesNotMatch(html, BANNED);
});

test("runtime JSON-LD and discovery links advertise Aziel Runtime 2.0.0-rc1 abstract", () => {
  const html = headMeta({ title: "Aziel Runtime", path: "/runtime", kind: "runtime" });
  const ld = graphFrom(html);
  const apps = ld["@graph"].filter((n) => n["@type"] === "SoftwareApplication");
  const runtimeApp = apps.find((n) => n.name === "aziel-runtime");
  assert.ok(runtimeApp);
  assert.equal(runtimeApp.softwareVersion, "2.0.0-rc1");
  assert.equal(runtimeApp.url, "https://www.azielcorpuslibrary.net/runtime");
  assert.ok(runtimeApp.sameAs.includes("https://aziel-runtime.vibelock.workers.dev/"));
  assert.ok(runtimeApp.sameAs.includes("https://github.com/AzielEliab/aziel-runtime"));
  assert.ok(runtimeApp.sameAs.includes("https://glama.ai/mcp/servers/AzielEliab/aziel-runtime"));
  assert.ok(runtimeApp.sameAs.includes("https://github.com/AzielEliab/aziel-runtime/tree/main/docs/2.0"));
  assert.match(runtimeApp.description, /not merely an API orchestrator/);
  assert.match(runtimeApp.description, /37 live/);
  assert.doesNotMatch(runtimeApp.description, /aziel-runtime 1\.9\.0 FragGate/);
  const api = ld["@graph"].find((n) => n["@type"] === "WebAPI");
  assert.ok(api);
  assert.equal(api.url, "https://www.azielcorpuslibrary.net/runtime/v1/fraggate");
  assert.match(html, /href="\/runtime\/openapi\.json"/);
  assert.match(html, /href="\/runtime\/mcp"/);
  assert.match(html, /href="\/\.well-known\/mcp\.json"/);
  assert.match(html, /href="\/v1\/software"/);
  assert.match(html, /href="\/sitemap-index\.xml"/);
  assert.match(html, /href="\/runtime\/llms\.txt"/);
  assert.match(html, /href="\/runtime\/v1\/fraggate"/);
  assert.match(html, /node-meshed MCP Softwares suite/);
  assert.match(defaultDescription("runtime"), /not merely an API orchestrator/);
  assert.match(defaultDescription("runtime"), /37 live/);
  assert.match(defaultDescription("runtime"), /FragGate is the single door/);
  assert.doesNotMatch(defaultDescription("runtime"), /aziel-runtime 1\.9\.0 FragGate/);
  assert.doesNotMatch(defaultDescription("runtime"), /1\.6\.2/);
  assert.doesNotMatch(defaultDescription("runtime"), /26 live/);
});

test("priority pages have unique titles, canonicals, OG/Twitter, and page-type JSON-LD", () => {
  const home = headMeta({ title: "Corpus Search", path: "/", kind: "search" });
  const software = headMeta({ title: "Software", path: "/software", kind: "software", runtimeVersion: "1.6.7" });
  const about = headMeta({ title: "Aziel Eliab", path: ABOUT_PATH, kind: "about" });

  assert.equal(documentTitle("search", "Corpus Search"), "Aziel Digital Library — Public MASTER by Aziel Eliab");
  assert.equal(documentTitle("software", "Software"), "Softwares — Aziel Eliab catalog | Aziel Digital Library");
  assert.equal(documentTitle("about", "Aziel Eliab"), "About Aziel Eliab | Aziel Digital Library");
  assert.notEqual(documentTitle("search"), documentTitle("software"));
  assert.notEqual(documentTitle("software"), documentTitle("about"));
  assert.notEqual(documentTitle("search"), documentTitle("about"));

  assert.match(home, /rel="canonical" href="https:\/\/www\.azielcorpuslibrary\.net\/"/);
  assert.match(software, /rel="canonical" href="https:\/\/www\.azielcorpuslibrary\.net\/software"/);
  assert.match(about, /rel="canonical" href="https:\/\/www\.azielcorpuslibrary\.net\/AzielEliab"/);
  assert.match(home, /og:title" content="Aziel Digital Library — Public MASTER by Aziel Eliab"/);
  assert.match(software, /og:title" content="Softwares — Aziel Eliab catalog \| Aziel Digital Library"/);
  assert.match(about, /og:title" content="About Aziel Eliab \| Aziel Digital Library"/);
  assert.match(about, /og:type" content="profile"/);
  assert.match(home, /og:locale" content="en_US"/);
  assert.match(software, /twitter:image:alt"/);
  assert.match(home, /rel="author" href="https:\/\/www\.azielcorpuslibrary\.net\/AzielEliab"/);

  const homeLd = graphFrom(home);
  const softLd = graphFrom(software);
  const aboutLd = graphFrom(about);
  assert.ok(homeLd["@graph"].some((n) => n["@type"] === "WebSite"));
  assert.ok(homeLd["@graph"].some((n) => n["@type"] === "CollectionPage" && n.url === "https://www.azielcorpuslibrary.net/"));
  assert.ok(homeLd["@graph"].some((n) => n["@type"] === "Person"));
  const softPage = softLd["@graph"].find((n) => n["@type"] === "CollectionPage");
  assert.equal(softPage.name, "Softwares");
  assert.equal(softPage.url, "https://www.azielcorpuslibrary.net/software");
  assert.ok(softLd["@graph"].some((n) => n["@type"] === "Person"));
  assert.ok(aboutLd["@graph"].some((n) => n["@type"] === "AboutPage"));
  assert.ok(aboutLd["@graph"].some((n) => n["@type"] === "Person"));
  assert.ok(softLd["@graph"].some((n) => n["@type"] === "BreadcrumbList"));
  assert.ok(aboutLd["@graph"].some((n) => n["@type"] === "BreadcrumbList"));
  assert.doesNotMatch(software, BANNED);
  assert.doesNotMatch(software, /triad \+25|quiet triad|collection score/i);
  assert.doesNotMatch(defaultDescription("software"), /triad|\+25|quiet/i);
  assert.doesNotMatch(home, BANNED);
  assert.doesNotMatch(about, BANNED);
});

test("software JSON-LD and meta prefer live catalog.version over baked 1.6.2", () => {
  const html = headMeta({ title: "Software", path: "/software", kind: "software", runtimeVersion: "1.6.7" });
  const ld = graphFrom(html);
  const runtimeApp = ld["@graph"].find((n) => n["@type"] === "SoftwareApplication" && n.name === "aziel-runtime");
  assert.ok(runtimeApp);
  assert.equal(runtimeApp.softwareVersion, "1.6.7");
  assert.match(runtimeApp.description, /aziel-runtime/);
  assert.doesNotMatch(runtimeApp.description, /aziel-runtime 1\.6\.7 FragGate/);
  assert.doesNotMatch(runtimeApp.description, /1\.6\.2/);
  const api = ld["@graph"].find((n) => n["@type"] === "WebAPI");
  assert.equal(api.name, "FragGate");
  assert.match(api.description, /FragGate door/);
  assert.doesNotMatch(api.description, /FragGate 1\.6\.7/);
  assert.doesNotMatch(api.description, /1\.6\.2/);
  assert.match(html, /aziel-runtime/);
  assert.doesNotMatch(html, /aziel-runtime 1\.6\.7 FragGate/);
  assert.doesNotMatch(html, /aziel-runtime \d+\.\d+\.\d+ FragGate/);
  assert.doesNotMatch(html, /aziel-runtime 1\.6\.2/);
  assert.match(defaultDescription("software", "1.6.7"), /aziel-runtime/);
  assert.doesNotMatch(defaultDescription("software", "1.6.7"), /FragGate/);
  assert.doesNotMatch(defaultDescription("software", "1.6.7"), /1\.6\.7/);
  assert.doesNotMatch(defaultDescription("software"), /1\.6\.2/);
  assert.doesNotMatch(html, BANNED);
});

test("page-specific descriptions and share images", () => {
  assert.match(defaultDescription("about"), /Aziel Eliab/);
  assert.match(defaultDescription("about"), /Aziel Elroi Eliab/);
  assert.match(defaultDescription("about"), /What matters is the record/);
  assert.match(defaultDescription("about"), /GodLock/);
  assert.doesNotMatch(defaultDescription("about"), /researcher and builder/);
  assert.match(defaultDescription("software"), /Software|aziel-runtime/i);
  assert.match(defaultDescription("scored"), /intentional suppression/);
  assert.match(defaultDescription("search"), /Aziel Digital Library by Aziel Eliab/);
  assert.match(defaultDescription("search"), /public MASTER/);
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
  assert.match(html, /AZCoherence/);
  assert.match(html, /azcoherence/);
  assert.match(html, /Person/);
  assert.match(html, /Aziel Elroi Eliab/);
  assert.doesNotMatch(html, BANNED);
  assert.doesNotMatch(html, /collection score is the published triad/);
});

test("OpenAPI identity URLs include /AzielEliab and GodLock", async () => {
  const url = new URL("https://www.azielcorpuslibrary.net/openapi.json");
  const res = await handleRuntimeApi(new Request(url, { method: "GET" }), url, {});
  assert.equal(res.status, 200);
  const spec = await res.json();
  assert.ok(spec.paths["/AzielEliab"]);
  assert.equal(spec.info.contact.name, "Aziel Eliab");
  assert.equal(spec.info.contact.url, "https://www.azielcorpuslibrary.net/AzielEliab");
  assert.match(spec.info.description, /godlock\.uk\/AzielEliab/);
  assert.match(spec.paths["/AzielEliab"].get.summary, /godlock\.uk\/AzielEliab/);
  assert.ok(spec.paths["/v1/software"]);
  assert.ok(spec.paths["/v1/download"]);
  assert.ok(spec.paths["/v1/update/check"]);
  assert.ok(spec.paths["/.well-known/mcp.json"]);
  assert.doesNotMatch(JSON.stringify(spec), BANNED);
});
