import test from "node:test";
import assert from "node:assert/strict";
import {
  PERSON_ID,
  PERSON_SAME_AS,
  ALTERNATE_NAMES,
  HEBREW_AKA,
  MISSPELLING_AKA,
  PERSON_KNOWS_ABOUT,
  STATS_TETHER,
  STATS_URLS,
  WHO_IS_AZIEL_ELIAB,
  IDENTITY_FAQS,
  FAQ_WHO_IS,
  FAQ_CONCORDANCE,
  FAQ_ELROI,
  FAQ_WHAT_MATTERS,
  FAQ_PUBLISHES,
  ABOUT_LEAD,
  ABOUT_STANZA,
  ABOUT_RECORD,
  ABOUT_SIGNIFICANT_LINKS,
  DISAMBIGUATING_DESCRIPTION,
  aboutPageNode,
  IDENTITY_MIME,
  IDENTITY_ROUTES,
  personJsonLd,
  identityJsonLd,
  graphJsonLd,
  whoIsTxt,
  azielJson,
  identityRouteBody,
} from "./identity.js";
import { robotsTxt, sitemapXml, citeDoc, llmsDoc } from "./crawl.js";
import { personNode, HUB_PERSON_ID } from "./seo.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo|legalName|homeLocation|worksFor|familyName/;
const IDENTITY_SPAM = /1 Chronicles|biblical Aziel|biblical Eliab|biblical combinations|Aziel S\.|Flutter\/React/;
const LOCAL_PERSON = "https://www.azielcorpuslibrary.net/AzielEliab#aziel-eliab";

function assertNoPrivateBio(text) {
  assert.doesNotMatch(text, BANNED);
  assert.doesNotMatch(text, IDENTITY_SPAM);
}

test("Person @id is hub #aziel and sameAs is the full lock", () => {
  assert.equal(PERSON_ID, "https://www.azieleliab.com/#aziel");
  assert.equal(HUB_PERSON_ID, PERSON_ID);
  assert.deepEqual(PERSON_SAME_AS, [
    "https://github.com/AzielEliab",
    "https://github.com/azieltherevealerofthesealed-arch",
    "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime",
    "https://www.azieleliab.com/",
    "https://www.azielcorpuslibrary.net/",
    "https://godlock.uk/",
    "https://www.hedidntjump.com/",
    "https://x.com/AzielElroiEliab",
    "https://x.com/azieleliab",
  ]);
  const person = personJsonLd();
  assert.equal(person["@id"], PERSON_ID);
  assert.notEqual(person["@id"], LOCAL_PERSON);
  assert.deepEqual(person.sameAs, PERSON_SAME_AS.slice());
  assert.deepEqual(identityJsonLd(), personJsonLd());
  assert.deepEqual(personNode()["@id"], PERSON_ID);
  assert.deepEqual(personNode().sameAs, PERSON_SAME_AS.slice());
});

test("alternateName is compact aka tethers — no 1 Chronicles essays", () => {
  assert.deepEqual(ALTERNATE_NAMES.slice(0, 5), [
    "Aziel Elroi Eliab",
    "AzielEliab",
    "AzielElroiEliab",
    "The Revealer of The Sealed",
    "Revealer of The Sealed",
  ]);
  assert.deepEqual(HEBREW_AKA, ["עזיאל", "אל ראי", "אלרועי", "אליאב"]);
  assert.deepEqual(MISSPELLING_AKA, ["Aziell", "Asiel", "El Roi", "Eliav"]);
  assert.ok(ALTERNATE_NAMES.includes("עזיאל"));
  assert.ok(ALTERNATE_NAMES.includes("Aziell"));
  assert.ok(!ALTERNATE_NAMES.includes("Aziel Eliav"));
  const person = personJsonLd();
  assert.deepEqual(person.alternateName, ALTERNATE_NAMES.slice());
  assert.equal(person.disambiguatingDescription, DISAMBIGUATING_DESCRIPTION);
  assert.match(person.description, /GodLock/);
  assert.match(person.description, /Aziel Digital Library/);
  assert.match(person.description, /Aziel Runtime \(MCP\)/);
  assert.doesNotMatch(person.description, /scripture concordance/);
  assert.doesNotMatch(person.description, /euaziel/);
  assert.deepEqual(person.knowsAbout, PERSON_KNOWS_ABOUT.slice());
  assert.ok(!person.sameAs.includes("https://euaziel.site/"));
  const mission = azielJson();
  assert.deepEqual(mission.hebrew_aka, HEBREW_AKA.slice());
  assert.deepEqual(mission.misspelling_aka, MISSPELLING_AKA.slice());
  assert.equal(mission.doi, null);
  assert.equal(mission.person_id, PERSON_ID);
  assert.equal(mission.disambiguatingDescription, DISAMBIGUATING_DESCRIPTION);
  assertNoPrivateBio(JSON.stringify(person));
  assertNoPrivateBio(JSON.stringify(mission));
});

test("graph.jsonld has Who-is + product FAQs, publisher Person, library role, stats", () => {
  const graph = graphJsonLd();
  const people = graph["@graph"].filter((n) => n["@type"] === "Person");
  assert.equal(people.length, 1);
  assert.equal(people[0]["@id"], PERSON_ID);
  assert.match(people[0].description, /Aziel Digital Library/);
  assert.equal(people[0].disambiguatingDescription, DISAMBIGUATING_DESCRIPTION);
  const faq = graph["@graph"].find((n) => n["@type"] === "FAQPage");
  const questions = faq.mainEntity.map((q) => q.name);
  assert.ok(questions.includes("Who is Aziel Eliab?"));
  assert.equal(FAQ_WHO_IS.name, "Who is Aziel Eliab?");
  assert.ok(questions.includes(FAQ_WHAT_MATTERS.name));
  assert.ok(questions.includes(FAQ_PUBLISHES.name));
  assert.ok(questions.includes(FAQ_CONCORDANCE.name));
  assert.ok(questions.includes(FAQ_ELROI.name));
  assert.ok(!questions.includes("Is Aziel Eliab the biblical Aziel?"));
  assert.ok(!questions.includes("Is Aziel Eliab the biblical Eliab?"));
  const who = faq.mainEntity.find((q) => q.name === "Who is Aziel Eliab?");
  assert.equal(who.acceptedAnswer.text, WHO_IS_AZIEL_ELIAB);
  assert.match(who.acceptedAnswer.text, /Aziel Digital Library/);
  assert.match(who.acceptedAnswer.text, /GodLock/);
  assert.doesNotMatch(who.acceptedAnswer.text, /scripture concordance/);
  assert.match(people[0].disambiguatingDescription, /Not scripture concordance entries/);
  assert.match(people[0].disambiguatingDescription, /euaziel\.site/);
  const concordance = faq.mainEntity.find((q) => q.name === FAQ_CONCORDANCE.name);
  assert.match(concordance.acceptedAnswer.text, /Not scripture concordance entries named Aziel or Eliab/);
  assert.doesNotMatch(concordance.acceptedAnswer.text, /1 Chronicles/);
  const site = graph["@graph"].find((n) => n["@type"] === "WebSite");
  assert.equal(site["@id"], "https://www.azielcorpuslibrary.net/#website");
  assert.deepEqual(site.publisher, { "@id": PERSON_ID });
  assert.deepEqual(site.creator, { "@id": PERSON_ID });
  assert.ok(site.relatedLink.includes(STATS_TETHER.azieleliab));
  assert.ok(site.relatedLink.includes(STATS_TETHER.corpus));
  assert.ok(site.relatedLink.includes(STATS_TETHER.hedidntjump));
  const about = graph["@graph"].find((n) => n["@id"] === "https://www.azielcorpuslibrary.net/AzielEliab#about");
  assert.ok(about);
  assert.deepEqual(about.publisher, { "@id": PERSON_ID });
  assert.deepEqual(about.creator, { "@id": PERSON_ID });
  assert.deepEqual(about.significantLink, ABOUT_SIGNIFICANT_LINKS.slice());
  assert.match(about.description, /Aziel Digital Library/);
  assert.match(about.description, /public MASTER/);
  const role = graph["@graph"].find((n) => n["@id"] === "https://www.azielcorpuslibrary.net/AzielEliab#library-role");
  assert.ok(role);
  assert.deepEqual(role.publisher, { "@id": PERSON_ID });
  assert.deepEqual(role.significantLink, ABOUT_SIGNIFICANT_LINKS.slice());
  const stats = graph["@graph"].find((n) => n["@id"] === "https://www.azielcorpuslibrary.net/#stats-tether");
  const urls = stats.itemListElement.map((i) => i.url);
  assert.deepEqual(urls, STATS_URLS.slice());
  assertNoPrivateBio(JSON.stringify(graph));
});

test("who-is-aziel-eliab.txt is the product-forward identity-lock answer", () => {
  assert.equal(whoIsTxt(), WHO_IS_AZIEL_ELIAB + "\n");
  assert.ok(WHO_IS_AZIEL_ELIAB.startsWith(ABOUT_STANZA));
  assert.match(WHO_IS_AZIEL_ELIAB, /GodLock/);
  assert.match(WHO_IS_AZIEL_ELIAB, /Aziel Digital Library on this site/);
  assert.match(WHO_IS_AZIEL_ELIAB, /Aziel Runtime \(MCP\)/);
  assert.match(WHO_IS_AZIEL_ELIAB, /He Didn't Jump/);
  assert.match(WHO_IS_AZIEL_ELIAB, /#aziel/);
  assert.doesNotMatch(WHO_IS_AZIEL_ELIAB, /scripture concordance/);
  assert.doesNotMatch(WHO_IS_AZIEL_ELIAB, /1 Chronicles/);
  assert.doesNotMatch(WHO_IS_AZIEL_ELIAB, /Researcher\. Builder/);
  assert.equal(DISAMBIGUATING_DESCRIPTION, "Not scripture concordance entries named Aziel or Eliab. Not https://euaziel.site/.");
  assert.equal(IDENTITY_FAQS[0].name, "Who is Aziel Eliab?");
  assert.equal(IDENTITY_FAQS[0].text, WHO_IS_AZIEL_ELIAB);
  assert.equal(FAQ_WHAT_MATTERS.text.includes(ABOUT_LEAD), true);
  assert.match(FAQ_PUBLISHES.text, /^GodLock, Aziel Digital Library on this site, Aziel Runtime \(MCP\)/);
  assert.match(ABOUT_RECORD, /public MASTER/);
});

test("cite and well-known share stats tether and mission lock", () => {
  const wellKnown = azielJson();
  const cite = citeDoc();
  assert.equal(STATS_TETHER.corpus, "https://www.azielcorpuslibrary.net/stats");
  assert.notEqual(STATS_TETHER.corpus, "https://www.azielcorpuslibrary.net/v1/stats");
  assert.deepEqual(wellKnown.stats, {
    azieleliab: "https://www.azieleliab.com/v1/stats",
    corpus: "https://www.azielcorpuslibrary.net/stats",
    hedidntjump: "https://www.hedidntjump.com/api/stats",
  });
  assert.deepEqual(cite.stats, wellKnown.stats);
  assert.deepEqual(cite.hebrew_aka, wellKnown.hebrew_aka);
  assert.deepEqual(cite.misspelling_aka, wellKnown.misspelling_aka);
  assert.deepEqual(cite.faqs, wellKnown.faqs);
  assert.equal(wellKnown.about_lead, ABOUT_LEAD);
  assert.equal(wellKnown.about_stanza, ABOUT_STANZA);
  assert.equal(wellKnown.about_record, ABOUT_RECORD);
  assert.deepEqual(wellKnown.significant_links, ABOUT_SIGNIFICANT_LINKS.slice());
  assert.deepEqual(cite.about_lead, ABOUT_LEAD);
  assert.deepEqual(cite.significant_links, ABOUT_SIGNIFICANT_LINKS.slice());
  assert.equal(aboutPageNode().publisher["@id"], PERSON_ID);
  assert.equal(wellKnown.person_id, PERSON_ID);
  assert.equal(cite.person_id, PERSON_ID);
  assert.equal(wellKnown.doi, null);
  assert.equal(cite.doi, null);
  assert.match(wellKnown.note, /GodLock is a product, not the Person/);
  assert.match(wellKnown.disambiguatingDescription, /Not scripture concordance entries/);
  assertNoPrivateBio(JSON.stringify(wellKnown));
  assertNoPrivateBio(JSON.stringify(cite));
});

test("robots and sitemap list the five identity URLs", async () => {
  const robots = robotsTxt();
  const xml = await sitemapXml({});
  for (const path of IDENTITY_ROUTES) {
    assert.match(robots, new RegExp("Allow: " + path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(xml, new RegExp("<loc>https://www\\.azielcorpuslibrary\\.net" + path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "</loc>"));
  }
});

test("llms.txt keeps library sections and the full sameAs lock", () => {
  const llms = llmsDoc("LIMIT");
  assert.match(llms, /## Softwares \(HTML hub — crawl this\)/);
  assert.match(llms, /## About Aziel Eliab \(HTML — crawl this\)/);
  assert.match(llms, /Person @id: https:\/\/www\.azieleliab\.com\/#aziel/);
  assert.match(llms, /github\.com\/azieltherevealerofthesealed-arch/);
  assert.match(llms, /x\.com\/AzielElroiEliab/);
  assert.match(llms, /Aziel Digital Library on this site/);
  assert.match(llms, /GodLock/);
  assert.match(llms, /Not scripture concordance entries named Aziel or Eliab/);
  assert.match(llms, /The Revealer of The Sealed/);
  assert.match(llms, /azieleliab\.com\/v1\/stats/);
  assert.match(llms, /azielcorpuslibrary\.net\/stats/);
  assert.doesNotMatch(llms, /azielcorpuslibrary\.net\/v1\/stats/);
  assert.match(llms, /hedidntjump\.com\/api\/stats/);
  assert.match(llms, /Who\? Does not matter\. What matters is the record\./);
  assert.match(llms, /public MASTER/);
  assert.match(llms, /significantLink:/);
  assert.match(llms, /Compact Hebrew aka/);
  assert.match(llms, /Aziell/);
  assert.doesNotMatch(llms, BANNED);
  assert.doesNotMatch(llms, IDENTITY_SPAM);
});

test("Worker serves identity routes with locked Content-Types", async () => {
  const { default: worker } = await import("./index.js");
  const env = {
    DOWNLOADS: { async get() { return null; }, async put() {}, async list() { throw new Error("no list"); } },
  };
  const expected = {
    "/person.jsonld": IDENTITY_MIME.jsonld,
    "/identity.jsonld": IDENTITY_MIME.jsonld,
    "/graph.jsonld": IDENTITY_MIME.jsonld,
    "/who-is-aziel-eliab.txt": IDENTITY_MIME.plain,
    "/who-is": IDENTITY_MIME.plain,
    "/.well-known/aziel.json": IDENTITY_MIME.json,
    "/.well-known/person.jsonld": IDENTITY_MIME.jsonld,
  };
  for (const [path, type] of Object.entries(expected)) {
    const packed = identityRouteBody(path);
    assert.ok(packed, path);
    assert.equal(packed.type, type);
    const res = await worker.fetch(
      new Request("https://www.azielcorpuslibrary.net" + path, { headers: { "User-Agent": "Mozilla/5.0" } }),
      env,
      {}
    );
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get("content-type"), type, path);
    const body = await res.text();
    assert.match(body, /Aziel Eliab/);
    assert.ok(!body.includes(LOCAL_PERSON), path + " must not invent a corpus-local Person @id");
    assert.doesNotMatch(body, /10\.5281\/zenodo/);
    assert.doesNotMatch(body, IDENTITY_SPAM);
    if (path.endsWith(".jsonld") || path.endsWith(".json")) {
      const doc = JSON.parse(body);
      const id = doc["@id"] || (doc["@graph"] && doc["@graph"].find((n) => n["@type"] === "Person")["@id"]) || doc.person_id;
      assert.equal(id, PERSON_ID, path);
    }
    if (path === "/who-is-aziel-eliab.txt" || path === "/who-is") {
      assert.equal(body, WHO_IS_AZIEL_ELIAB + "\n");
    }
  }
  const head = await worker.fetch(
    new Request("https://www.azielcorpuslibrary.net/person.jsonld", { method: "HEAD" }),
    env,
    {}
  );
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-type"), IDENTITY_MIME.jsonld);
  assert.equal(await head.text(), "");
});

test("GET /search is HTTP 200 and does not increment homepage views", async () => {
  const { default: worker } = await import("./index.js");
  let views = 0;
  const env = {
    DOWNLOADS: {
      async get() { return null; },
      async put() { views += 1; },
      async list() { throw new Error("no list"); },
    },
  };
  const res = await worker.fetch(
    new Request("https://www.azielcorpuslibrary.net/search?q=Florence", { headers: { "User-Agent": "Mozilla/5.0" } }),
    env,
    {}
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("location"), null);
  assert.match(res.headers.get("content-type") || "", /text\/html/);
  const html = await res.text();
  assert.match(html, /Corpus Search|Aziel Eliab/);
  assert.ok(!html.includes(LOCAL_PERSON));
  assert.equal(views, 0);
  const head = await worker.fetch(
    new Request("https://www.azielcorpuslibrary.net/search", { method: "HEAD", headers: { "User-Agent": "Mozilla/5.0" } }),
    env,
    {}
  );
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});
