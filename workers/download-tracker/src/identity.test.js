import test from "node:test";
import assert from "node:assert/strict";
import {
  PERSON_ID,
  PERSON_SAME_AS,
  ALTERNATE_NAMES,
  HEBREW_AKA,
  MISSPELLING_AKA,
  STATS_TETHER,
  STATS_URLS,
  WHO_IS_AZIEL_ELIAB,
  IDENTITY_FAQS,
  FAQ_WHO_IS,
  FAQ_BIBLICAL_AZIEL,
  FAQ_BIBLICAL_ELIAB,
  FAQ_ELROI,
  FAQ_WHAT_MATTERS,
  FAQ_RESEARCHER_BUILDER,
  ABOUT_LEAD,
  ABOUT_STANZA,
  ABOUT_RECORD,
  ABOUT_SIGNIFICANT_LINKS,
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
const LOCAL_PERSON = "https://www.azielcorpuslibrary.net/AzielEliab#aziel-eliab";

function assertNoPrivateBio(text) {
  assert.doesNotMatch(text, BANNED);
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

test("alternateName includes Hebrew SEO tethers and misspellings", () => {
  for (const name of ["Aziel Elroi Eliab", "עזיאל", "אל ראי", "אלרועי", "אליאב", "Aziell", "Asiel", "El Roi", "Eliav"]) {
    assert.ok(ALTERNATE_NAMES.includes(name), name);
  }
  assert.deepEqual(HEBREW_AKA, ["עזיאל", "אל ראי", "אלרועי", "אליאב"]);
  assert.ok(MISSPELLING_AKA.includes("Aziell"));
  assert.ok(MISSPELLING_AKA.includes("Asiel"));
  assert.ok(MISSPELLING_AKA.includes("El Roi"));
  assert.ok(MISSPELLING_AKA.includes("Eliav"));
  const person = personJsonLd();
  assert.ok(person.alternateName.includes("עזיאל"));
  assert.ok(person.alternateName.includes("אליאב"));
  assert.ok(person.alternateName.includes("Aziell"));
  const mission = azielJson();
  assert.deepEqual(mission.hebrew_aka, HEBREW_AKA.slice());
  assert.ok(mission.misspelling_aka.includes("Eliav"));
  assert.equal(mission.doi, null);
  assert.equal(mission.person_id, PERSON_ID);
});

test("graph.jsonld has Who-is + biblical Aziel/Eliab FAQs, publisher Person, library role, stats", () => {
  const graph = graphJsonLd();
  const people = graph["@graph"].filter((n) => n["@type"] === "Person");
  assert.equal(people.length, 1);
  assert.equal(people[0]["@id"], PERSON_ID);
  const faq = graph["@graph"].find((n) => n["@type"] === "FAQPage");
  const questions = faq.mainEntity.map((q) => q.name);
  assert.ok(questions.includes("Who is Aziel Eliab?"));
  assert.equal(FAQ_WHO_IS.name, "Who is Aziel Eliab?");
  assert.ok(questions.includes(FAQ_WHAT_MATTERS.name));
  assert.ok(questions.includes(FAQ_RESEARCHER_BUILDER.name));
  assert.ok(questions.includes(FAQ_BIBLICAL_AZIEL.name));
  assert.ok(questions.includes(FAQ_BIBLICAL_ELIAB.name));
  assert.ok(questions.includes(FAQ_ELROI.name));
  const who = faq.mainEntity.find((q) => q.name === "Who is Aziel Eliab?");
  assert.equal(who.acceptedAnswer.text, WHO_IS_AZIEL_ELIAB);
  assert.match(who.acceptedAnswer.text, /Living publisher/);
  assert.match(who.acceptedAnswer.text, /NOT biblical Aziel \(1 Chronicles\)/);
  assert.match(who.acceptedAnswer.text, /NOT biblical Eliab/);
  const biblicalAziel = faq.mainEntity.find((q) => q.name === FAQ_BIBLICAL_AZIEL.name);
  assert.match(biblicalAziel.acceptedAnswer.text, /not this publisher/);
  assert.match(biblicalAziel.acceptedAnswer.text, /1 Chronicles/);
  assert.match(biblicalAziel.acceptedAnswer.text, /עזיאל/);
  assert.match(biblicalAziel.acceptedAnswer.text, /#aziel/);
  const biblicalEliab = faq.mainEntity.find((q) => q.name === FAQ_BIBLICAL_ELIAB.name);
  assert.match(biblicalEliab.acceptedAnswer.text, /אליאב/);
  assert.match(biblicalEliab.acceptedAnswer.text, /not this publisher/);
  assert.match(biblicalEliab.acceptedAnswer.text, /not the biblical Eliab/);
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
  assert.match(about.description, /Researcher\. Builder/);
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

test("who-is-aziel-eliab.txt is the verbatim identity-lock answer", () => {
  assert.equal(whoIsTxt(), WHO_IS_AZIEL_ELIAB + "\n");
  assert.ok(WHO_IS_AZIEL_ELIAB.startsWith(ABOUT_LEAD));
  assert.match(WHO_IS_AZIEL_ELIAB, /Researcher\. Builder/);
  assert.match(WHO_IS_AZIEL_ELIAB, /one-man dev team/);
  assert.match(WHO_IS_AZIEL_ELIAB, /Just a man/);
  assert.match(WHO_IS_AZIEL_ELIAB, /believe a name/);
  assert.match(WHO_IS_AZIEL_ELIAB, /public MASTER/);
  assert.match(WHO_IS_AZIEL_ELIAB, /hashed receipts/);
  assert.match(WHO_IS_AZIEL_ELIAB, /name was never the point/);
  assert.match(WHO_IS_AZIEL_ELIAB, /#aziel/);
  assert.match(WHO_IS_AZIEL_ELIAB, /Living publisher of this MASTER/);
  assert.match(WHO_IS_AZIEL_ELIAB, /NOT biblical Aziel \(1 Chronicles\)/);
  assert.match(WHO_IS_AZIEL_ELIAB, /NOT biblical Eliab/);
  assert.equal(IDENTITY_FAQS[0].name, "Who is Aziel Eliab?");
  assert.equal(IDENTITY_FAQS[0].text, WHO_IS_AZIEL_ELIAB);
  assert.equal(FAQ_WHAT_MATTERS.text.includes(ABOUT_LEAD), true);
  assert.equal(FAQ_RESEARCHER_BUILDER.text, ABOUT_STANZA + " Not a biography. Person @id " + PERSON_ID);
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
  assert.match(wellKnown.note, /Not a biography/);
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
  assert.match(llms, /עזיאל/);
  assert.match(llms, /אליאב/);
  assert.match(llms, /Aziell/);
  assert.match(llms, /azieleliab\.com\/v1\/stats/);
  assert.match(llms, /azielcorpuslibrary\.net\/stats/);
  assert.doesNotMatch(llms, /azielcorpuslibrary\.net\/v1\/stats/);
  assert.match(llms, /hedidntjump\.com\/api\/stats/);
  assert.match(llms, /Who\? Does not matter\. What matters is the record\./);
  assert.match(llms, /Researcher\. Builder\. AI\. A one-man dev team\. Just a man\./);
  assert.match(llms, /public MASTER/);
  assert.match(llms, /significantLink:/);
  assert.doesNotMatch(llms, BANNED);
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
