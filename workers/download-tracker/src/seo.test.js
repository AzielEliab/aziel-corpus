import test from "node:test";
import assert from "node:assert/strict";
import {
  headMeta,
  defaultDescription,
  documentTitle,
  recordDescription,
  personNode,
  personRef,
  websiteNode,
  SHARE_IMAGE,
  ABOUT_PATH,
  aboutRedirectFrom,
  forensicsRedirectFrom,
  FORENSICS_PATH,
  HUB_PERSON_ID,
  HUB_ORIGIN,
  HUB_RUNTIME_ID,
  WEBSITE_ID,
  WEBSITE_NAME,
  runtimeRef,
  hubToolId,
  ECOSYSTEM_HEADING,
  ECOSYSTEM_LINKS,
} from "./seo.js";
import { DISAMBIGUATING_DESCRIPTION } from "./identity.js";
import { handleRuntimeApi } from "./runtime.js";
import { page, howItsScoredBody, ecosystemBlockHtml, softwareBody } from "./ui.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;
const LOCAL_PERSON = "https://www.azielcorpuslibrary.net/AzielEliab#aziel-eliab";
const LOCAL_RUNTIME = /azielcorpuslibrary\.net\/runtime#/;
const MCP_OP = /fraggate_(list|describe|verify|call)|decisiongate_check|library_lookup|runtime_skill/;

function assertSharedIdentity(ld) {
  const people = ld["@graph"].filter((n) => n["@type"] === "Person");
  assert.ok(people.length >= 1);
  for (const p of people) {
    assert.equal(p["@id"], HUB_PERSON_ID);
    assert.notEqual(p["@id"], LOCAL_PERSON);
  }
  for (const n of ld["@graph"]) {
    assert.notEqual(n["@id"], LOCAL_PERSON);
    assert.doesNotMatch(String(n["@id"] || ""), LOCAL_RUNTIME);
    assert.doesNotMatch(String(n["@id"] || ""), MCP_OP);
    assert.doesNotMatch(String(n.name || ""), MCP_OP);
    for (const key of ["author", "publisher", "creator", "provider", "founder", "mainEntity"]) {
      const ref = n[key];
      if (!ref || typeof ref !== "object") continue;
      if (ref["@id"] === WEBSITE_ID) continue;
      if (key === "author" && ref["@type"] === "Person" && ref.name && !ref["@id"]) continue;
      if (ref["@id"]) assert.equal(ref["@id"], HUB_PERSON_ID, key + " must use hub Person @id");
    }
  }
  const site = ld["@graph"].find((n) => n["@type"] === "WebSite");
  assert.equal(site["@id"], WEBSITE_ID);
  assert.equal(site.url, "https://www.azielcorpuslibrary.net/");
  assert.equal(site.name, WEBSITE_NAME);
  assert.deepEqual(site.publisher, { "@id": HUB_PERSON_ID });
  assert.deepEqual(site.author, { "@id": HUB_PERSON_ID });
}

function graphFrom(html) {
  const m = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
  assert.ok(m, "json-ld missing");
  return JSON.parse(m[1]);
}

test("JSON-LD types the author as Person with alternateName", () => {
  assert.deepEqual(personRef(), { "@id": HUB_PERSON_ID });
  assert.equal(HUB_PERSON_ID, "https://www.azieleliab.com/#aziel");
  const person = personNode();
  assert.equal(person["@type"], "Person");
  assert.equal(person["@id"], HUB_PERSON_ID);
  assert.equal(person.name, "Aziel Eliab");
  assert.ok(person.alternateName.includes("Aziel Elroi Eliab"));
  assert.ok(person.alternateName.includes("AzielEliab"));
  assert.ok(person.alternateName.includes("The Revealer of The Sealed"));
  assert.ok(person.alternateName.includes("עזיאל"));
  assert.ok(person.alternateName.includes("Aziell"));
  assert.equal(person.disambiguatingDescription, DISAMBIGUATING_DESCRIPTION);
  assert.match(person.disambiguatingDescription, /Not Aziel S\./);
  assert.match(person.disambiguatingDescription, /euaziel\.site/);
  assert.ok(person.knowsAbout.includes("Aziel Digital Library"));
  assert.equal(person.url, HUB_ORIGIN + "/");
  assert.ok(person.sameAs.includes("https://godlock.uk/"));
  assert.ok(person.sameAs.includes("https://www.hedidntjump.com/"));
  assert.ok(person.sameAs.includes("https://github.com/AzielEliab"));
  assert.ok(person.sameAs.includes("https://github.com/azieltherevealerofthesealed-arch"));
  assert.ok(person.sameAs.includes("https://glama.ai/mcp/servers/AzielEliab/aziel-runtime"));
  assert.ok(person.sameAs.includes(HUB_ORIGIN + "/"));
  assert.ok(person.sameAs.includes("https://www.azielcorpuslibrary.net/"));
  assert.ok(person.sameAs.includes("https://x.com/AzielElroiEliab"));
  assert.ok(person.sameAs.includes("https://x.com/azieleliab"));
  assert.equal(person["@id"], "https://www.azieleliab.com/#aziel");

  const html = headMeta({ title: "Aziel Eliab", path: ABOUT_PATH, kind: "about" });
  const ld = graphFrom(html);
  assertSharedIdentity(ld);
  const types = ld["@graph"].map((n) => n["@type"]);
  assert.ok(types.includes("Person"));
  assert.ok(types.includes("Organization"));
  assert.ok(types.includes("WebSite"));
  assert.ok(types.includes("AboutPage"));
  assert.ok(types.includes("ProfilePage"));
  const who = ld["@graph"].find((n) => n["@type"] === "Person");
  assert.equal(who.name, "Aziel Eliab");
  assert.equal(who["@id"], "https://www.azieleliab.com/#aziel");
  assert.equal(who.url, "https://www.azieleliab.com/");
  assert.ok(who.alternateName.includes("Aziel Elroi Eliab"));
  assert.ok(who.sameAs.includes("https://godlock.uk/"));
  assert.ok(who.sameAs.includes("https://www.hedidntjump.com/"));
  assert.ok(who.sameAs.includes("https://github.com/AzielEliab"));
  assert.ok(who.sameAs.includes("https://x.com/azieleliab"));
  assert.match(html, /rel="me" href="https:\/\/www\.azieleliab\.com\/#aziel"/);
  assert.match(html, /rel="me" href="https:\/\/godlock\.uk\/AzielEliab"/);
  assert.match(html, /keywords" content="Aziel Eliab, Aziel Elroi Eliab, Aziel Digital Library/);
  assert.match(html, /GodLock/);
  assert.doesNotMatch(html, /AzielEliab#aziel-eliab/);
  const aboutPage = ld["@graph"].find((n) => n["@type"] === "AboutPage");
  assert.equal(aboutPage.url, "https://www.azielcorpuslibrary.net/AzielEliab");
  assert.deepEqual(aboutPage.mainEntity, { "@id": HUB_PERSON_ID });
  assert.deepEqual(aboutPage.author, { "@id": HUB_PERSON_ID });
  assert.deepEqual(aboutPage.creator, { "@id": HUB_PERSON_ID });
  assert.deepEqual(aboutPage.publisher, { "@id": HUB_PERSON_ID });
  assert.deepEqual(aboutPage.significantLink, [
    "https://www.azielcorpuslibrary.net/person.jsonld",
    "https://www.azielcorpuslibrary.net/who-is-aziel-eliab.txt",
    "https://www.azielcorpuslibrary.net/graph.jsonld",
    "https://www.azielcorpuslibrary.net/.well-known/aziel.json",
    "https://www.azielcorpuslibrary.net/.well-known/person.jsonld",
  ]);
  assert.match(aboutPage.description, /Aziel Digital Library/);
  assert.match(aboutPage.description, /GodLock/);
  assert.doesNotMatch(aboutPage.description, /1 Chronicles/);
  const aboutFaq = ld["@graph"].find((n) => n["@type"] === "FAQPage");
  assert.ok(aboutFaq);
  assert.ok(aboutFaq.mainEntity.some((q) => q.name === "What matters about Aziel Eliab?"));
  assert.ok(aboutFaq.mainEntity.some((q) => q.name === "What does Aziel Eliab publish?"));
  assert.ok(aboutFaq.mainEntity.some((q) => q.name === "Is Aziel Eliab a scripture concordance entry?"));
  assert.ok(!aboutFaq.mainEntity.some((q) => /biblical Aziel|biblical Eliab/.test(q.name)));
  const profile = ld["@graph"].find((n) => n["@type"] === "ProfilePage");
  assert.equal(profile.url, "https://www.azielcorpuslibrary.net/AzielEliab");
  assert.deepEqual(profile.mainEntity, { "@id": HUB_PERSON_ID });
  const org = ld["@graph"].find((n) => n["@type"] === "Organization");
  assert.equal(org.name, "Aziel Digital Library");
  assert.deepEqual(org.founder, { "@id": HUB_PERSON_ID });
  const site = websiteNode();
  assert.equal(site["@id"], "https://www.azielcorpuslibrary.net/#website");
  assert.equal(site.url, "https://www.azielcorpuslibrary.net/");
  assert.equal(site.name, "Aziel Corpus Library");
  assert.deepEqual(site.publisher, { "@id": "https://www.azieleliab.com/#aziel" });
  assert.ok(site.sameAs.includes("https://www.hedidntjump.com/"));
  const liveSite = ld["@graph"].find((n) => n["@type"] === "WebSite");
  assert.equal(liveSite.potentialAction["@type"], "SearchAction");
  assert.match(liveSite.potentialAction.target.urlTemplate, /\?q=\{search_term_string\}/);
  assert.doesNotMatch(html, BANNED);
});

test("runtime JSON-LD and discovery links advertise Aziel Runtime 2.0.0-rc1 abstract", () => {
  const html = headMeta({ title: "Aziel Runtime", path: "/runtime", kind: "runtime" });
  const ld = graphFrom(html);
  const apps = ld["@graph"].filter((n) => n["@type"] === "SoftwareApplication");
  const runtimeApp = apps.find((n) => n.name === "aziel-runtime");
  assert.ok(runtimeApp);
  assert.deepEqual(runtimeRef(), { "@id": HUB_RUNTIME_ID });
  assert.equal(HUB_RUNTIME_ID, "https://www.azieleliab.com/runtime#runtime");
  assert.equal(runtimeApp["@id"], "https://www.azieleliab.com/runtime#runtime");
  assert.deepEqual(runtimeApp.author, { "@id": HUB_PERSON_ID });
  assert.equal(runtimeApp.softwareVersion, "2.0.0-rc1");
  assert.equal(runtimeApp.url, "https://www.azieleliab.com/runtime");
  assert.ok(runtimeApp.sameAs.includes("https://www.azielcorpuslibrary.net/runtime"));
  assert.ok(runtimeApp.sameAs.includes("https://aziel-runtime.vibelock.workers.dev/"));
  assert.ok(runtimeApp.sameAs.includes("https://github.com/AzielEliab/aziel-runtime"));
  assert.ok(runtimeApp.sameAs.includes("https://glama.ai/mcp/servers/AzielEliab/aziel-runtime"));
  assert.ok(runtimeApp.sameAs.includes("https://github.com/AzielEliab/aziel-runtime/tree/main/docs/2.0"));
  assert.match(runtimeApp.description, /not merely an API orchestrator/);
  assert.match(runtimeApp.description, /37 live/);
  assert.doesNotMatch(runtimeApp.description, /aziel-runtime 1\.9\.0 FragGate/);
  assertSharedIdentity(ld);
  const api = ld["@graph"].find((n) => n["@type"] === "WebAPI");
  assert.ok(api);
  assert.equal(api["@id"], hubToolId("fraggate"));
  assert.equal(api["@id"], "https://www.azieleliab.com/runtime#fraggate");
  assert.deepEqual(api.isPartOf, { "@id": HUB_RUNTIME_ID });
  assert.equal(api.url, "https://www.azielcorpuslibrary.net/runtime/v1/fraggate");
  assert.deepEqual(api.provider, { "@id": HUB_PERSON_ID });
  assert.equal(ld["@graph"].filter((n) => MCP_OP.test(String(n["@id"] || "")) || MCP_OP.test(String(n.name || ""))).length, 0);
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
  assertSharedIdentity(homeLd);
  assertSharedIdentity(softLd);
  assertSharedIdentity(aboutLd);
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
  assert.equal(runtimeApp["@id"], HUB_RUNTIME_ID);
  assert.deepEqual(runtimeApp.author, { "@id": HUB_PERSON_ID });
  assert.equal(runtimeApp.softwareVersion, "1.6.7");
  assert.match(runtimeApp.description, /aziel-runtime/);
  assert.doesNotMatch(runtimeApp.description, /aziel-runtime 1\.6\.7 FragGate/);
  assert.doesNotMatch(runtimeApp.description, /1\.6\.2/);
  const api = ld["@graph"].find((n) => n["@type"] === "WebAPI");
  assert.equal(api["@id"], "https://www.azieleliab.com/runtime#fraggate");
  assert.deepEqual(api.isPartOf, { "@id": HUB_RUNTIME_ID });
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
  assert.match(defaultDescription("about"), /Aziel Digital Library/);
  assert.match(defaultDescription("about"), /GodLock/);
  assert.match(defaultDescription("about"), /public MASTER/);
  assert.doesNotMatch(defaultDescription("about"), /Researcher\. Builder/);
  assert.doesNotMatch(defaultDescription("about"), /1 Chronicles/);
  assert.doesNotMatch(defaultDescription("about"), /Aziel S\.|Flutter\/React/);
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
  assert.doesNotMatch(record, /Search, map, gazetteer, forensics, and hosted OCR/);
  assert.match(record, /The Cockroach Doctrine by Aziel Eliab/);
  assert.match(record, /og:image" content="https:\/\/www\.azielcorpuslibrary\.net\/sigil\.png"/);
  assert.match(record, /twitter:image" content="https:\/\/www\.azielcorpuslibrary\.net\/sigil\.png"/);
  assert.match(record, /og:image:alt" content="Aziel Digital Library rose-star brand mark. Author Aziel Eliab."/);
  assert.doesNotMatch(record, /ever-?\s*blooming/i);
  assert.equal(SHARE_IMAGE, "https://www.azielcorpuslibrary.net/sigil.png");
  const ld = graphFrom(record);
  assertSharedIdentity(ld);
  const article = ld["@graph"].find((n) => n["@type"] === "ScholarlyArticle");
  assert.ok(article);
  assert.equal(article.name, "The Cockroach Doctrine");
  assert.equal(article.isPartOf.name, "Aziel Library");
  assert.deepEqual(article.author, { "@id": HUB_PERSON_ID });
});

test("ecosystem footer/nav is chrome, not Softwares heading→list", () => {
  assert.equal(ECOSYSTEM_HEADING, "Part of the Aziel Eliab ecosystem");
  assert.deepEqual(ECOSYSTEM_LINKS.map((l) => [l.label, l.href, !!l.muted, !!l.primary]), [
    ["Official site", "https://www.azieleliab.com/", false, false],
    ["Corpus", "https://www.azielcorpuslibrary.net/", false, false],
    ["GodLock", "https://godlock.uk/", false, false],
    ["He Didn't Jump", "https://www.hedidntjump.com/", false, false],
    ["Runtime GitHub", "https://github.com/AzielEliab/aziel-runtime", false, false],
    ["Glama", "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime", false, true],
  ]);
  const block = ecosystemBlockHtml();
  assert.match(block, /<footer class="ecosystem"/);
  assert.match(block, /Part of the Aziel Eliab ecosystem/);
  assert.match(block, /href="https:\/\/www\.azieleliab\.com\/"/);
  assert.match(block, />Official site</);
  assert.match(block, /href="https:\/\/www\.azielcorpuslibrary\.net\/"/);
  assert.match(block, />Corpus</);
  assert.match(block, /href="https:\/\/godlock\.uk\/"/);
  assert.match(block, />GodLock</);
  assert.match(block, /href="https:\/\/www\.hedidntjump\.com\/"/);
  assert.match(block, />He Didn't Jump</);
  assert.match(block, /href="https:\/\/github\.com\/AzielEliab\/aziel-runtime"/);
  assert.match(block, />Runtime GitHub</);
  assert.match(block, /class="button"[^>]*href="https:\/\/glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime"[^>]*>Glama</);
  const softBody = softwareBody({
    products: [{ slug: "azmail", name: "AZMail", kind: "plain", blurb: "door", links: [] }],
  });
  const chrome = page("Software", softBody, { path: "/software", kind: "software" });
  assert.match(chrome, /rel="canonical" href="https:\/\/www\.azielcorpuslibrary\.net\/software"/);
  assert.match(chrome, /<h1>Softwares<\/h1>\s*<\/section>\s*<section class="soft-section"><h2>Software<\/h2>/);
  const h1 = chrome.indexOf("<h1>Softwares</h1>");
  const list = chrome.indexOf("<h2>Software</h2>");
  const eco = chrome.indexOf("Part of the Aziel Eliab ecosystem");
  assert.ok(h1 >= 0 && list > h1 && eco > list, "ecosystem footer stays after Softwares heading→list");
  assert.doesNotMatch(softBody, /Part of the Aziel Eliab ecosystem/);
  assertSharedIdentity(graphFrom(chrome));
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

test("legacy /intelligence paths permanently redirect to /forensics", () => {
  assert.equal(FORENSICS_PATH, "/forensics");
  assert.equal(forensicsRedirectFrom("/intelligence"), "/forensics");
  assert.equal(forensicsRedirectFrom("/intelligence/"), "/forensics");
  assert.equal(forensicsRedirectFrom("/Intelligence"), "/forensics");
  assert.equal(forensicsRedirectFrom("/forensics"), null);
  assert.equal(forensicsRedirectFrom("/software"), null);
});

test("page chrome keeps entity-graph JSON-LD after first paint", () => {
  const html = page("Corpus Search", "<section class=\"hero\"><h1>Search the libraries</h1></section>", { path: "/", kind: "search" });
  const head = html.slice(0, html.indexOf("</head>"));
  assert.doesNotMatch(head, /<script type="application\/ld\+json">/);
  assert.match(head, /href="\/person\.jsonld"/);
  assert.match(head, /rel="preload" href="\/sigil\.png"/);
  const ld = graphFrom(html);
  assertSharedIdentity(ld);
  assert.ok(ld["@graph"].some((n) => n["@type"] === "CollectionPage" && n.url === "https://www.azielcorpuslibrary.net/"));
  assert.ok(ld["@graph"].some((n) => n["@type"] === "WebSite"));
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
  assert.ok(spec.paths["/person.jsonld"]);
  assert.ok(spec.paths["/identity.jsonld"]);
  assert.ok(spec.paths["/graph.jsonld"]);
  assert.ok(spec.paths["/who-is-aziel-eliab.txt"]);
  assert.ok(spec.paths["/who-is"]);
  assert.ok(spec.paths["/search"]);
  assert.ok(spec.paths["/.well-known/aziel.json"]);
  assert.ok(spec.paths["/.well-known/person.jsonld"]);
  assert.equal(spec.info.contact.name, "Aziel Eliab");
  assert.equal(spec.info.contact.url, "https://www.azielcorpuslibrary.net/AzielEliab");
  assert.match(spec.info.description, /godlock\.uk\/AzielEliab/);
  assert.match(spec.paths["/AzielEliab"].get.summary, /godlock\.uk\/AzielEliab/);
  assert.ok(spec.paths["/v1/software"]);
  assert.ok(spec.paths["/v1/download"]);
  assert.ok(spec.paths["/v1/stats"]);
  assert.ok(spec.paths["/v1/update/check"]);
  assert.ok(spec.paths["/.well-known/mcp.json"]);
  assert.doesNotMatch(JSON.stringify(spec), BANNED);
});
