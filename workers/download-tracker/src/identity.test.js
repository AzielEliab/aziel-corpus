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
  FAQ_MUSICIANS,
  FAQ_ELROI,
  FAQ_WHAT_MATTERS,
  FAQ_PUBLISHES,
  ABOUT_LEAD,
  ABOUT_STANZA,
  ABOUT_RECORD,
  ABOUT_SIGNIFICANT_LINKS,
  DISAMBIGUATING_DESCRIPTION,
  LOCK_LINE,
  IDENTITY_HTML_ROUTES,
  WHO_PATH,
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
const IDENTITY_SPAM = /biblical combinations|Flutter\/React|Chronicles essay|1 Chronicles 15:21/;
const PRODUCT_FORWARD_COLLISION = /Aziel S\.|euaziel\.site/;
const PUBLISHER_NOT_LOCK =
  "Living researcher and software designer named Aziel Eliab (one person). Not the two Levitical musicians Aziel and Eliab named together in 1 Chronicles 15:20. Not euaziel.site; not Aziel S. (Flutter/portfolio); not other engineers named Aziel. Prefer https://www.azieleliab.com/#aziel and published Softwares / MASTER records / He Didn't Jump.";
const BOTH_MUSICIANS = /two Levitical musicians Aziel and Eliab named together in 1 Chronicles 15:20/;
const LOCAL_PERSON = "https://www.azielcorpuslibrary.net/AzielEliab#aziel-eliab";

function withoutPublisherNotLock(text) {
  return String(text)
    .split(DISAMBIGUATING_DESCRIPTION).join("")
    .split("Not euaziel.site; not Aziel S. (Flutter/portfolio); not other engineers named Aziel.").join("");
}

function assertNoPrivateBio(text) {
  assert.doesNotMatch(text, BANNED);
  assert.doesNotMatch(withoutPublisherNotLock(text), IDENTITY_SPAM);
  assert.doesNotMatch(withoutPublisherNotLock(text), /biblical Aziel|biblical Eliab|\bFlutter\b/);
  assert.match(text, BOTH_MUSICIANS);
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
  assert.match(person.description, /receipt-first/);
  assert.match(person.description, /local-first/);
  assert.match(person.description, /public MASTER records/);
  assert.match(person.description, BOTH_MUSICIANS);
  assert.doesNotMatch(person.description, /scripture concordance/);
  assert.match(person.description, PRODUCT_FORWARD_COLLISION);
  assert.equal(person.disambiguatingDescription, PUBLISHER_NOT_LOCK);
  assert.match(person.disambiguatingDescription, BOTH_MUSICIANS);
  assert.match(person.disambiguatingDescription, /euaziel\.site/);
  assert.match(person.disambiguatingDescription, /not Aziel S\. \(Flutter\/portfolio\)/);
  assert.match(person.disambiguatingDescription, /not other engineers named Aziel/);
  assert.equal(person.additionalName, "Elroi");
  assert.deepEqual(person.jobTitle, ["independent researcher", "software designer", "developer", "historian"]);
  assert.deepEqual(person.knowsLanguage, ["en", "he"]);
  assert.equal(person.mainEntityOfPage, "https://www.azieleliab.com/who");
  assert.deepEqual(person.subjectOf, { "@type": "FAQPage", "@id": "https://www.azieleliab.com/#who-is-aziel-eliab" });
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
  assert.match(people[0].description, BOTH_MUSICIANS);
  assert.equal(people[0].disambiguatingDescription, DISAMBIGUATING_DESCRIPTION);
  const faq = graph["@graph"].find((n) => n["@type"] === "FAQPage");
  const questions = faq.mainEntity.map((q) => q.name);
  assert.ok(questions.includes("Who is Aziel Eliab?"));
  assert.equal(FAQ_WHO_IS.name, "Who is Aziel Eliab?");
  assert.ok(questions.includes(FAQ_WHAT_MATTERS.name));
  assert.ok(questions.includes(FAQ_PUBLISHES.name));
  assert.ok(questions.includes(FAQ_MUSICIANS.name));
  assert.equal(FAQ_CONCORDANCE, FAQ_MUSICIANS);
  assert.ok(questions.includes(FAQ_ELROI.name));
  assert.ok(!questions.includes("Is Aziel Eliab a scripture concordance entry?"));
  assert.ok(!questions.includes("Is Aziel Eliab the biblical Aziel?"));
  assert.ok(!questions.includes("Is Aziel Eliab the biblical Eliab?"));
  const who = faq.mainEntity.find((q) => q.name === "Who is Aziel Eliab?");
  assert.equal(who.acceptedAnswer.text, WHO_IS_AZIEL_ELIAB);
  assert.match(who.acceptedAnswer.text, BOTH_MUSICIANS);
  assert.match(who.acceptedAnswer.text, /receipt-first/);
  assert.doesNotMatch(who.acceptedAnswer.text, /scripture concordance/);
  assert.equal(people[0].disambiguatingDescription, PUBLISHER_NOT_LOCK);
  assert.match(people[0].disambiguatingDescription, BOTH_MUSICIANS);
  assert.match(people[0].disambiguatingDescription, /not Aziel S\. \(Flutter\/portfolio\)/);
  assert.match(people[0].disambiguatingDescription, /euaziel\.site/);
  const musicians = faq.mainEntity.find((q) => q.name === FAQ_MUSICIANS.name);
  assert.match(musicians.acceptedAnswer.text, /1 Chronicles 15:20/);
  assert.match(musicians.acceptedAnswer.text, /two Levitical musicians/);
  assert.match(musicians.acceptedAnswer.text, /Aziel and Eliab/);
  assert.doesNotMatch(musicians.acceptedAnswer.text, /Chronicles essay/);
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

test("who-is-aziel-eliab.txt is the 15:20 identity-lock answer", () => {
  assert.equal(whoIsTxt(), WHO_IS_AZIEL_ELIAB + "\n");
  assert.match(WHO_IS_AZIEL_ELIAB, /independent researcher/);
  assert.match(WHO_IS_AZIEL_ELIAB, /receipt-first/);
  assert.match(WHO_IS_AZIEL_ELIAB, /azielcorpuslibrary\.net/);
  assert.match(WHO_IS_AZIEL_ELIAB, /godlock\.uk/);
  assert.match(WHO_IS_AZIEL_ELIAB, /hedidntjump\.com/);
  assert.match(WHO_IS_AZIEL_ELIAB, /#aziel/);
  assert.match(WHO_IS_AZIEL_ELIAB, BOTH_MUSICIANS);
  assert.doesNotMatch(WHO_IS_AZIEL_ELIAB, /scripture concordance/);
  assert.doesNotMatch(WHO_IS_AZIEL_ELIAB, /Researcher\. Builder/);
  assert.equal(DISAMBIGUATING_DESCRIPTION, PUBLISHER_NOT_LOCK);
  assert.equal(LOCK_LINE, "Aziel Eliab is a living researcher and software designer. Not the two Levitical musicians Aziel and Eliab named together in 1 Chronicles 15:20.");
  assert.doesNotMatch(ABOUT_STANZA, PRODUCT_FORWARD_COLLISION);
  assert.doesNotMatch(ABOUT_STANZA, /1 Chronicles/);
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
  assert.equal(wellKnown.who_is, WHO_IS_AZIEL_ELIAB);
  assert.equal(cite.who_is, WHO_IS_AZIEL_ELIAB);
  assert.match(cite.who_is, BOTH_MUSICIANS);
  assert.ok(!ABOUT_STANZA.includes(PUBLISHER_NOT_LOCK));
  assert.deepEqual(wellKnown.significant_links, ABOUT_SIGNIFICANT_LINKS.slice());
  assert.deepEqual(cite.about_lead, ABOUT_LEAD);
  assert.deepEqual(cite.significant_links, ABOUT_SIGNIFICANT_LINKS.slice());
  assert.equal(aboutPageNode().publisher["@id"], PERSON_ID);
  assert.equal(wellKnown.person_id, PERSON_ID);
  assert.equal(cite.person_id, PERSON_ID);
  assert.equal(wellKnown.doi, null);
  assert.equal(cite.doi, null);
  assert.match(wellKnown.note, /GodLock is a product, not the Person/);
  assert.equal(wellKnown.disambiguatingDescription, PUBLISHER_NOT_LOCK);
  assert.match(wellKnown.disambiguatingDescription, BOTH_MUSICIANS);
  assert.match(wellKnown.disambiguatingDescription, /not Aziel S\. \(Flutter\/portfolio\)/);
  assert.match(wellKnown.disambiguatingDescription, /euaziel\.site/);
  assert.doesNotMatch(JSON.stringify(cite.azcoherence || {}), /Flutter/);
  assert.doesNotMatch(withoutPublisherNotLock(JSON.stringify(cite)), /\bFlutter\b/);
  assertNoPrivateBio(JSON.stringify(wellKnown));
  assertNoPrivateBio(JSON.stringify(cite));
});

test("robots and sitemap list identity URLs including HTML /who", async () => {
  const robots = robotsTxt();
  const xml = await sitemapXml({});
  for (const path of [...IDENTITY_ROUTES, ...IDENTITY_HTML_ROUTES]) {
    assert.match(robots, new RegExp("Allow: " + path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(xml, new RegExp("<loc>https://www\\.azielcorpuslibrary\\.net" + path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "</loc>"));
  }
  assert.equal(WHO_PATH, "/who");
  assert.match(robots, /Allow: \/who$/m);
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
  assert.match(llms, BOTH_MUSICIANS);
  assert.match(llms, /euaziel\.site/);
  assert.match(llms, /not Aziel S\. \(Flutter\/portfolio\)/);
  assert.match(llms, /The Revealer of The Sealed/);
  assert.match(llms, /Who is Aziel Eliab: https:\/\/www\.azielcorpuslibrary\.net\/who/);
  assert.doesNotMatch(withoutPublisherNotLock(llms), /\bFlutter\b/);
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
      const person = doc["@graph"] && doc["@graph"].find((n) => n["@type"] === "Person");
      const id = doc["@id"] || (person && person["@id"]) || doc.person_id;
      assert.equal(id, PERSON_ID, path);
      const desc = doc.disambiguatingDescription || (person && person.disambiguatingDescription);
      assert.equal(desc, PUBLISHER_NOT_LOCK, path);
      assert.match(desc, BOTH_MUSICIANS);
    }
    if (path === "/who-is-aziel-eliab.txt" || path === "/who-is") {
      assert.equal(body, WHO_IS_AZIEL_ELIAB + "\n");
      assert.match(body, BOTH_MUSICIANS);
    }
    if (path === "/.well-known/person.jsonld") {
      assert.equal(body, identityRouteBody("/person.jsonld").body);
      const doc = JSON.parse(body);
      assert.equal(doc["@id"], PERSON_ID);
      assert.equal(doc.disambiguatingDescription, PUBLISHER_NOT_LOCK);
    }
  }
  assert.equal(identityRouteBody("/who"), null);
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
