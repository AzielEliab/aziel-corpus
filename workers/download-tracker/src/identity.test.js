import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PERSON_ID,
  PERSON_SAME_AS,
  ALTERNATE_NAMES,
  HEBREW_AKA,
  HEBREW_AKA_PHRASE,
  HEBREW_DEFINITION,
  NAME_LATTICE,
  MISSPELLING_AKA,
  PERSON_KNOWS_ABOUT,
  PERSON_JOB_TITLE,
  PERSON_JOB_TITLE_NOTE,
  SITE_BLURBS,
  GROWTH_ON,
  VISIBLE_HTML_CHROME,
  siteBlurbsCite,
  STATS_TETHER,
  STATS_URLS,
  WHO_IS_AZIEL_ELIAB,
  IDENTITY_FAQS,
  FAQ_WHO_IS,
  FAQ_CONCORDANCE,
  FAQ_MUSICIANS,
  FAQ_ELROI,
  FAQ_ELIAS,
  FAQ_HEBREW,
  FAQ_WHAT_MATTERS,
  FAQ_PUBLISHES,
  FAQ_WHAT_DOES_HE_DO,
  FAQ_WHAT_AZIEL_ELIAB_DOES,
  FAQ_WHO_IS_DEVELOPER,
  FAQ_WHAT_SOFTWARE,
  FAQ_WHY_PUBLISH,
  FAQ_WHY_AZIEL_ELIAB,
  WHAT_AZIEL_ELIAB_DOES,
  WHY_AZIEL_ELIAB,
  RESEARCH_HALF,
  HARDWARE_HALF,
  WHAT_HE_DOES_FAQ_TEXT,
  WHITESTONE_NOTE,
  WHITESTONE_CITE,
  ARK_NOTE,
  ARK_CITE,
  ARK_DOWNLOAD,
  ARK_STATS,
  SPECTRALLOCK_NOTE,
  SPECTRALLOCK_CITE,
  PEACELOCK_NOTE,
  PEACELOCK_CITE,
  CITE_RECORD_IDS,
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

const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo|legalName|homeLocation|worksFor|familyName|Everblooming Flower/;
const IDENTITY_SPAM = /biblical combinations|Flutter\/React|Chronicles essay|1 Chronicles 15:21/;
const PRODUCT_FORWARD_COLLISION = /Aziel S\.|euaziel\.site/;
const PUBLISHER_LOCK =
  "Living researcher, digital rights activist, software developer, author, and philosopher named Aziel Eliab (one person; published work only). Prefer https://www.azieleliab.com/#aziel and published Softwares / MASTER records / He Didn't Jump.";
const SEO_NOT_X = /THIS IS NOT|He is not the two Levitical|Not euaziel\.site|not a lawyer|Heatmap ≠|possibility ≠|CNS-ZENODO-IP-BAN|CNS-GITFLIC-EMAIL|CNS-GITLAB-CF-LOOP|death-by-ban|Mutual shelves↔ban|blocked from|IP ban/;
const LOCAL_PERSON = "https://www.azielcorpuslibrary.net/AzielEliab#aziel-eliab";

function assertNoPrivateBio(text) {
  assert.doesNotMatch(text, BANNED);
  assert.doesNotMatch(text, IDENTITY_SPAM);
  assert.doesNotMatch(text, /biblical Aziel|biblical Eliab|\bFlutter\b/);
  assert.doesNotMatch(text, /He is not the two Levitical/);
  assert.doesNotMatch(text, /Not euaziel\.site/);
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
    "https://x.com/AzielEliab",
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
  assert.deepEqual(ALTERNATE_NAMES.slice(0, 6), [
    "Aziel Elroi Eliab",
    "AzielEliab",
    "AzielElroiEliab",
    "The Revealer of The Sealed",
    "Revealer of The Sealed",
    "Elias Artista",
  ]);
  assert.deepEqual(HEBREW_AKA, ["עזיאל", "אל ראי", "אלרועי", "אליאב"]);
  assert.deepEqual(HEBREW_AKA_PHRASE, ["עזיאל אל ראי אליאב", "עזיאל אלרועי אליאב"]);
  assert.match(HEBREW_DEFINITION, /God is my strength/);
  assert.match(HEBREW_DEFINITION, /God who sees/);
  assert.match(HEBREW_DEFINITION, /God is father/);
  assert.deepEqual(NAME_LATTICE.also, ["Aziel Elroi Eliab", "Elias Artista", "The Revealer of The Sealed"]);
  assert.deepEqual(MISSPELLING_AKA, ["Aziell", "Asiel", "El Roi", "Eliav"]);
  assert.ok(ALTERNATE_NAMES.includes("עזיאל"));
  assert.ok(ALTERNATE_NAMES.includes("עזיאל אל ראי אליאב"));
  assert.ok(ALTERNATE_NAMES.includes("עזיאל אלרועי אליאב"));
  assert.ok(ALTERNATE_NAMES.includes("Elias Artista"));
  assert.ok(ALTERNATE_NAMES.includes("Aziell"));
  assert.ok(!ALTERNATE_NAMES.includes("Aziel Eliav"));
  assert.ok(!ALTERNATE_NAMES.includes("Everblooming Flower"));
  const person = personJsonLd();
  assert.deepEqual(person.alternateName, ALTERNATE_NAMES.slice());
  assert.equal(person.disambiguatingDescription, DISAMBIGUATING_DESCRIPTION);
  assert.match(person.description, /receipt-first/);
  assert.match(person.description, /local-first/);
  assert.match(person.description, /public MASTER records/);
  assert.match(person.description, /one living person/);
  assert.doesNotMatch(person.description, /scripture concordance/);
  assert.doesNotMatch(person.description, PRODUCT_FORWARD_COLLISION);
  assert.match(person.description, /Elias Artista/);
  assert.equal(person.description.includes(HEBREW_DEFINITION), true);
  assert.equal(person.disambiguatingDescription, PUBLISHER_LOCK);
  assert.doesNotMatch(person.disambiguatingDescription, /He is not the two Levitical/);
  assert.doesNotMatch(person.disambiguatingDescription, /euaziel\.site/);
  assert.doesNotMatch(person.disambiguatingDescription, /Aziel S\./);
  assert.equal(person.additionalName, "Elroi");
  assert.deepEqual(person.jobTitle, ["researcher", "digital rights activist", "software developer", "author", "philosopher"]);
  assert.equal(person.jobTitle_note, "published work only");
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
  assert.match(people[0].description, /one living person/);
  assert.equal(people[0].disambiguatingDescription, DISAMBIGUATING_DESCRIPTION);
  const faq = graph["@graph"].find((n) => n["@type"] === "FAQPage");
  const questions = faq.mainEntity.map((q) => q.name);
  assert.ok(questions.includes("Who is Aziel Eliab?"));
  assert.equal(FAQ_WHO_IS.name, "Who is Aziel Eliab?");
  assert.ok(questions.includes(FAQ_WHAT_MATTERS.name));
  assert.ok(questions.includes(FAQ_PUBLISHES.name));
  assert.ok(questions.includes("What does Aziel Eliab do?"));
  assert.ok(questions.includes("What Aziel Eliab does"));
  assert.ok(questions.includes("Who is Aziel Eliab the developer?"));
  assert.ok(questions.includes("What software does Aziel Eliab make?"));
  assert.ok(questions.includes("Why does Aziel Eliab publish?"));
  assert.ok(questions.includes("Why Aziel Eliab"));
  assert.ok(questions.includes(FAQ_MUSICIANS.name));
  assert.equal(FAQ_CONCORDANCE, FAQ_MUSICIANS);
  assert.ok(questions.includes(FAQ_ELROI.name));
  assert.ok(questions.includes(FAQ_ELIAS.name));
  assert.ok(questions.includes(FAQ_HEBREW.name));
  assert.equal(FAQ_ELIAS.text.includes("Elias Artista") || FAQ_ELIAS.name.includes("Elias Artista"), true);
  assert.equal(FAQ_HEBREW.text, HEBREW_DEFINITION);
  assert.ok(!questions.includes("Is Aziel Eliab a scripture concordance entry?"));
  assert.ok(!questions.includes("Is Aziel Eliab the biblical Aziel?"));
  assert.ok(!questions.includes("Is Aziel Eliab the biblical Eliab?"));
  const who = faq.mainEntity.find((q) => q.name === "Who is Aziel Eliab?");
  assert.equal(who.acceptedAnswer.text, WHO_IS_AZIEL_ELIAB);
  assert.match(who.acceptedAnswer.text, /one living person/);
  assert.match(who.acceptedAnswer.text, /receipt-first/);
  assert.doesNotMatch(who.acceptedAnswer.text, /scripture concordance/);
  assert.doesNotMatch(who.acceptedAnswer.text, /He is not the two Levitical/);
  assert.equal(people[0].disambiguatingDescription, PUBLISHER_LOCK);
  assert.doesNotMatch(people[0].disambiguatingDescription, /euaziel\.site/);
  const musicians = faq.mainEntity.find((q) => q.name === FAQ_MUSICIANS.name);
  assert.match(musicians.acceptedAnswer.text, /one living researcher/);
  assert.doesNotMatch(musicians.acceptedAnswer.text, /He is not the two Levitical/);
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
  const who = whoIsTxt();
  assert.match(who, new RegExp("^" + WHO_IS_AZIEL_ELIAB.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(who, /Elias Artista/);
  assert.equal(who.includes(HEBREW_DEFINITION), true);
  assert.match(who, /github\.com\/AzielEliab/);
  assert.match(who, /github\.com\/azieltherevealerofthesealed-arch/);
  assert.match(who, /x\.com\/AzielEliab/);
  assert.match(who, /Try on Glama: https:\/\/glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime/);
  assert.match(who, /Part of the Aziel Eliab ecosystem/);
  assert.match(who, /Why Aziel Eliab: /);
  assert.match(who, /dual-surface forensics and audit/);
  assert.match(WHO_IS_AZIEL_ELIAB, /researcher, digital rights activist, software developer, author, and philosopher/);
  assert.match(WHO_IS_AZIEL_ELIAB, /published work only/);
  assert.match(WHO_IS_AZIEL_ELIAB, /receipt-first/);
  assert.match(WHO_IS_AZIEL_ELIAB, /azielcorpuslibrary\.net/);
  assert.match(WHO_IS_AZIEL_ELIAB, /godlock\.uk/);
  assert.match(WHO_IS_AZIEL_ELIAB, /hedidntjump\.com/);
  assert.match(WHO_IS_AZIEL_ELIAB, /#aziel/);
  assert.match(WHO_IS_AZIEL_ELIAB, /one living person/);
  assert.doesNotMatch(WHO_IS_AZIEL_ELIAB, /He is not the two Levitical/);
  assert.doesNotMatch(WHO_IS_AZIEL_ELIAB, /scripture concordance/);
  assert.doesNotMatch(WHO_IS_AZIEL_ELIAB, /Researcher\. Builder/);
  assert.equal(DISAMBIGUATING_DESCRIPTION, PUBLISHER_LOCK);
  assert.equal(LOCK_LINE, "Aziel Eliab is a living researcher, digital rights activist, software developer, author, and philosopher (published work only).");
  assert.doesNotMatch(ABOUT_STANZA, PRODUCT_FORWARD_COLLISION);
  assert.doesNotMatch(ABOUT_STANZA, /1 Chronicles/);
  assert.equal(IDENTITY_FAQS[0].name, "Who is Aziel Eliab?");
  assert.equal(IDENTITY_FAQS[0].text, WHO_IS_AZIEL_ELIAB);
  assert.equal(FAQ_WHAT_MATTERS.text.includes(ABOUT_LEAD), true);
  assert.match(FAQ_PUBLISHES.text, /^GodLock, Aziel Digital Library on this site, Aziel Runtime \(MCP\)/);
  assert.match(ABOUT_RECORD, /public MASTER/);
});

test("machine who-is locks Softwares + RESEARCH + HARDWARE halves", () => {
  assert.equal(
    WHAT_AZIEL_ELIAB_DOES,
    "Aziel Eliab builds receipt-first, local-first software and public MASTER records — Softwares through Aziel Runtime (FragGate / MCP), the Aziel Digital Library, GodLock (product), and the He Didn’t Jump Zioncheck archive. Public identity is the work. @id https://www.azieleliab.com/#aziel"
  );
  assert.equal(FAQ_WHAT_DOES_HE_DO.name, "What does Aziel Eliab do?");
  assert.equal(FAQ_WHAT_AZIEL_ELIAB_DOES.name, "What Aziel Eliab does");
  assert.equal(FAQ_WHO_IS_DEVELOPER.name, "Who is Aziel Eliab the developer?");
  assert.equal(FAQ_WHAT_SOFTWARE.name, "What software does Aziel Eliab make?");
  assert.equal(FAQ_WHY_PUBLISH.name, "Why does Aziel Eliab publish?");
  assert.equal(FAQ_WHY_AZIEL_ELIAB.name, "Why Aziel Eliab");
  assert.equal(FAQ_WHY_PUBLISH.text, WHY_AZIEL_ELIAB);
  assert.equal(FAQ_WHY_AZIEL_ELIAB.text, WHY_AZIEL_ELIAB);
  assert.match(WHY_AZIEL_ELIAB, /published research/);
  assert.match(WHY_AZIEL_ELIAB, /dual-surface forensics and audit/);
  assert.doesNotMatch(WHY_AZIEL_ELIAB, /THIS IS NOT|does not|not a /i);
  assert.equal(FAQ_WHAT_DOES_HE_DO.text, WHAT_HE_DOES_FAQ_TEXT);
  assert.equal(FAQ_WHAT_AZIEL_ELIAB_DOES.text, WHAT_HE_DOES_FAQ_TEXT);
  assert.equal(FAQ_WHO_IS_DEVELOPER.text, WHAT_HE_DOES_FAQ_TEXT);
  assert.equal(FAQ_WHAT_SOFTWARE.text, WHAT_HE_DOES_FAQ_TEXT + " " + WHITESTONE_NOTE + " " + ARK_NOTE + " " + SPECTRALLOCK_NOTE + " " + PEACELOCK_NOTE);
  assert.equal(WHAT_HE_DOES_FAQ_TEXT, WHAT_AZIEL_ELIAB_DOES + " " + RESEARCH_HALF + " " + HARDWARE_HALF);
  assert.match(WHITESTONE_NOTE, /ephemeral pro se advisor/);
  assert.doesNotMatch(WHITESTONE_NOTE, /not a lawyer/);
  assert.equal(WHITESTONE_CITE.extra_card, false);
  assert.ok(PERSON_KNOWS_ABOUT.includes("Whitestone"));
  assert.match(ARK_NOTE, /The ARK \(Softwares\): local deniable vault/);
  assert.match(ARK_NOTE, /one phrase opens one vault/);
  assert.equal(ARK_NOTE.includes(ARK_DOWNLOAD), true);
  assert.equal(ARK_NOTE.includes(ARK_STATS), true);
  assert.equal(ARK_CITE.extra_card, false);
  assert.equal(ARK_CITE.slug, "ark");
  assert.ok(PERSON_KNOWS_ABOUT.includes("The ARK"));
  assert.match(SPECTRALLOCK_NOTE, /leftover container bytes recover honestly/);
  assert.match(SPECTRALLOCK_NOTE, /SL-UNREDACT-OPAQUE/);
  assert.doesNotMatch(SPECTRALLOCK_NOTE, /not a FragGate door op/);
  assert.match(SPECTRALLOCK_NOTE, /revision graph/);
  assert.match(SPECTRALLOCK_NOTE, /NO-LIE LIVE\/SLOT/);
  assert.match(SPECTRALLOCK_NOTE, /ink heuristics/);
  assert.doesNotMatch(SPECTRALLOCK_NOTE, /not ESDA/);
  assert.match(SPECTRALLOCK_NOTE, /Worker SSoT/);
  assert.equal(SPECTRALLOCK_CITE.extra_card, false);
  assert.equal(SPECTRALLOCK_CITE.slug, "spectrallock");
  assert.ok(PERSON_KNOWS_ABOUT.includes("SpectralLock"));
  assert.match(PEACELOCK_NOTE, /Public GitHub/);
  assert.match(PEACELOCK_NOTE, /Local-only runtime/);
  assert.match(PEACELOCK_NOTE, /github\.com\/AzielEliab\/peacelock/);
  assert.doesNotMatch(PEACELOCK_NOTE, /THIS IS NOT|does not|not a /i);
  assert.equal(PEACELOCK_CITE.extra_card, false);
  assert.equal(PEACELOCK_CITE.slug, "peacelock");
  assert.equal(PEACELOCK_CITE.public, true);
  assert.equal(PEACELOCK_CITE.private, false);
  assert.equal(PEACELOCK_CITE.fraggate_status, "live");
  assert.equal(PEACELOCK_CITE.fraggate_local_only, false);
  assert.ok(PERSON_KNOWS_ABOUT.includes("PeaceLock"));
  assert.match(RESEARCH_HALF, /Book of the Knowledge/);
  assert.match(RESEARCH_HALF, /Blemmyes\/Ewaipanoma/);
  assert.match(HARDWARE_HALF, /Dog Leash/);
  assert.match(HARDWARE_HALF, /Designs are published work/);
  assert.match(HARDWARE_HALF, /attorney-work-product/);
  const who = whoIsTxt();
  assert.doesNotMatch(who, /Whitestone/);
  assert.match(who, new RegExp(WHAT_AZIEL_ELIAB_DOES.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(who, /Softwares list: The ARK \(Softwares\): local deniable vault/);
  assert.match(who, /Softwares list: SpectralLock \(Softwares\): leftover container bytes recover honestly/);
  assert.match(who, /Softwares list: PeaceLock \(Softwares\): record chosen silence/);
  assert.match(who, /github\.com\/AzielEliab\/peacelock/);
  assert.match(who, /v1\/recover/);
  assert.match(who, /v1\/handwriting/);
  assert.match(who, /ink heuristics/);
  assert.match(who, /ark-download-tracker\.vibelock\.workers\.dev\/download/);
  assert.match(who, /ark-download-tracker\.vibelock\.workers\.dev\/stats/);
  assert.match(who, new RegExp(RESEARCH_HALF.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(who, new RegExp(HARDWARE_HALF.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(who, /AZDOC-A011CAD23671/);
  const person = personJsonLd();
  assert.match(person.description, new RegExp(WHAT_AZIEL_ELIAB_DOES.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.ok(person.knowsAbout.includes("AZDOC-A011CAD23671"));
  assert.ok(person.knowsAbout.includes("Dog Leash"));
  assert.ok(person.knowsAbout.includes("PPIN"));
  assert.ok(person.knowsAbout.includes("Whitestone"));
  assert.ok(person.knowsAbout.includes("The ARK"));
  assert.ok(person.knowsAbout.includes("SpectralLock"));
  assert.ok(person.knowsAbout.includes("PeaceLock"));
  assert.deepEqual(CITE_RECORD_IDS.slice(0, 6), [
    "AZDOC-A011CAD23671",
    "AZDOC-F83D7E6D28B6",
    "AZDOC-F22AD0DCAA9D",
    "AZDOC-8F14A40DC9A6",
    "AZDOC-B5094327857E",
    "AZDOC-149CA2191E99",
  ]);
  const cite = citeDoc();
  assert.equal(cite.what_aziel_eliab_does, WHAT_AZIEL_ELIAB_DOES);
  assert.equal(cite.research, RESEARCH_HALF);
  assert.equal(cite.hardware, HARDWARE_HALF);
  assert.equal(cite.whitestone.note, WHITESTONE_NOTE);
  assert.equal(cite.whitestone.extra_card, false);
  assert.equal(cite.ark.note, ARK_NOTE);
  assert.equal(cite.ark.extra_card, false);
  assert.equal(cite.ark.download, ARK_DOWNLOAD);
  assert.equal(cite.ark.stats, ARK_STATS);
  assert.equal(cite.spectrallock.slug, "spectrallock");
  assert.equal(cite.spectrallock.note, SPECTRALLOCK_NOTE);
  assert.equal(cite.spectrallock.extra_card, false);
  assert.equal(cite.spectrallock.unredact_is_door_op, false);
  assert.equal(cite.spectrallock.recover_is_door_op, false);
  assert.equal(cite.spectrallock.handwriting_is_door_op, false);
  assert.equal(cite.spectrallock.revision_graph, true);
  assert.equal(cite.peacelock.slug, "peacelock");
  assert.equal(cite.peacelock.note, PEACELOCK_NOTE);
  assert.equal(cite.peacelock.extra_card, false);
  assert.equal(cite.peacelock.public, true);
  assert.equal(cite.peacelock.private, false);
  assert.equal(cite.peacelock.runtime, "local-only");
  assert.equal(cite.peacelock.fraggate_status, "live");
  assert.equal(cite.peacelock.fraggate_local_only, false);
  assert.equal(cite.softwares_ssot_version, "2.0.0-rc1");
  assert.equal(cite.public_version, cite.softwares_ssot_version);
  const llms = llmsDoc("LIMIT");
  assert.match(llms, /What does Aziel Eliab do\?/);
  assert.match(llms, /Who is Aziel Eliab the developer\?/);
  assert.match(llms, /What software does Aziel Eliab make\?/);
  assert.match(llms, /Softwares list: Whitestone \(Softwares\): ephemeral pro se advisor/);
  assert.match(llms, /Softwares list: The ARK \(Softwares\): local deniable vault/);
  assert.match(llms, /Softwares list: SpectralLock \(Softwares\): leftover container bytes recover honestly/);
  assert.match(llms, /Softwares list: PeaceLock \(Softwares\): record chosen silence/);
  assert.match(llms, /AZDOC-F22AD0DCAA9D/);
  assert.match(llms, /bone-conduction STL/);
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
  assert.equal(cite.hebrew_definition, HEBREW_DEFINITION);
  assert.equal(wellKnown.hebrew_definition, HEBREW_DEFINITION);
  assert.deepEqual(cite.name_lattice.also, NAME_LATTICE.also.slice());
  assert.ok(cite.name_lattice.also.includes("Elias Artista"));
  assert.equal(cite.github_author, "https://github.com/AzielEliab");
  assert.equal(cite.github_secondary, "https://github.com/azieltherevealerofthesealed-arch");
  assert.equal(wellKnown.github_secondary, cite.github_secondary);
  assert.deepEqual(cite.misspelling_aka, wellKnown.misspelling_aka);
  assert.deepEqual(cite.faqs, wellKnown.faqs);
  assert.equal(wellKnown.about_lead, ABOUT_LEAD);
  assert.equal(wellKnown.about_stanza, ABOUT_STANZA);
  assert.equal(wellKnown.about_record, ABOUT_RECORD);
  assert.equal(wellKnown.who_is, WHO_IS_AZIEL_ELIAB);
  assert.equal(cite.who_is, WHO_IS_AZIEL_ELIAB);
  assert.deepEqual(cite.jobTitle, PERSON_JOB_TITLE.slice());
  assert.equal(cite.jobTitle_note, PERSON_JOB_TITLE_NOTE);
  assert.equal(cite.growth_on, true);
  assert.equal(cite.gptbot_disallow, false);
  assert.equal(cite.no_lie, "NO-LIE");
  assert.equal(cite.no_lie_spec, "NO-LIE-NO-REWRITE-1.0");
  assert.equal(cite.visible_html_chrome, false);
  assert.equal(cite.sites.digital_library.url, "https://www.azielcorpuslibrary.net/");
  assert.equal(cite.sites.person_hub.person_id, PERSON_ID);
  assert.equal(cite.sites.godlock.url, "https://godlock.uk/");
  assert.equal(cite.sites.hedidntjump.url, "https://www.hedidntjump.com/");
  assert.equal(cite.sites.runtime.runtime_id, "https://www.azieleliab.com/runtime#runtime");
  assert.match(cite.sites.digital_library.blurb, /public MASTER digital library/);
  assert.match(cite.sites.person_hub.blurb, /Person hub/);
  assert.match(cite.sites.godlock.blurb, /Specified Fit/);
  assert.match(cite.sites.hedidntjump.blurb, /Marion Zioncheck/);
  assert.match(cite.sites.runtime.blurb, /FragGate is THE single public executable door/);
  assert.match(cite.who_is, /one living person/);
  assert.doesNotMatch(cite.who_is, /He is not the two Levitical/);
  assert.ok(!ABOUT_STANZA.includes("not a biography"));
  assert.deepEqual(wellKnown.significant_links, ABOUT_SIGNIFICANT_LINKS.slice());
  assert.deepEqual(cite.about_lead, ABOUT_LEAD);
  assert.deepEqual(cite.significant_links, ABOUT_SIGNIFICANT_LINKS.slice());
  assert.equal(aboutPageNode().publisher["@id"], PERSON_ID);
  assert.equal(wellKnown.person_id, PERSON_ID);
  assert.equal(cite.person_id, PERSON_ID);
  assert.equal(wellKnown.doi, null);
  assert.equal(cite.doi, null);
  assert.match(wellKnown.note, /GodLock is a product/);
  assert.equal(wellKnown.disambiguatingDescription, PUBLISHER_LOCK);
  assert.doesNotMatch(wellKnown.disambiguatingDescription, /euaziel\.site/);
  assert.doesNotMatch(JSON.stringify(cite.azcoherence || {}), /Flutter/);
  assert.doesNotMatch(JSON.stringify(cite), /\bFlutter\b/);
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
  assert.match(llms, /x\.com\/AzielEliab/);
  assert.match(llms, /Aziel Digital Library on this site/);
  assert.match(llms, /GodLock/);
  assert.match(llms, /one living person/);
  assert.doesNotMatch(llms, /He is not the two Levitical/);
  assert.doesNotMatch(llms, /euaziel\.site/);
  assert.match(llms, /The Revealer of The Sealed/);
  assert.match(llms, /Elias Artista/);
  assert.equal(llms.includes(HEBREW_DEFINITION), true);
  assert.doesNotMatch(llms, /Everblooming Flower/);
  assert.match(llms, /Who is Aziel Eliab: https:\/\/www\.azielcorpuslibrary\.net\/who/);
  assert.doesNotMatch(llms, /\bFlutter\b/);
  assert.doesNotMatch(llms, SEO_NOT_X);
  assert.match(llms, /azieleliab\.com\/v1\/stats/);
  assert.match(llms, /azielcorpuslibrary\.net\/stats/);
  assert.doesNotMatch(llms, /azielcorpuslibrary\.net\/v1\/stats/);
  assert.match(llms, /hedidntjump\.com\/api\/stats/);
  assert.match(llms, /Who\? Does not matter\. What matters is the record\./);
  assert.match(llms, /## Site blurbs \(published work only\)/);
  assert.match(llms, /Roles \(published work only\): researcher, digital rights activist/);
  assert.match(llms, /Growth-ON/);
  assert.match(llms, /NO-LIE/);
  assert.match(llms, /No visible HTML chrome/);
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
      assert.equal(desc, PUBLISHER_LOCK, path);
      assert.doesNotMatch(desc, /He is not the two Levitical/);
    }
    if (path === "/who-is-aziel-eliab.txt" || path === "/who-is") {
      assert.equal(body, whoIsTxt());
      assert.match(body, /one living person/);
      assert.doesNotMatch(body, /He is not the two Levitical/);
      assert.match(body, /Elias Artista/);
      assert.equal(body.includes(HEBREW_DEFINITION), true);
    }
    if (path === "/.well-known/person.jsonld") {
      assert.equal(body, identityRouteBody("/person.jsonld").body);
      const doc = JSON.parse(body);
      assert.equal(doc["@id"], PERSON_ID);
      assert.equal(doc.disambiguatingDescription, PUBLISHER_LOCK);
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
  assert.match(html, /class="library-count"/);
  assert.match(html, /data-source="library:index:v1"/);
  assert.match(html, /<strong>0<\/strong> files in the libraries/);
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

test("GitHub crawl-aid snapshots match Worker person.jsonld and who-is*", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
  const person = readFileSync(join(root, "person.jsonld"), "utf8");
  const who = readFileSync(join(root, "who-is-aziel-eliab.txt"), "utf8");
  const whoAlias = readFileSync(join(root, "who-is.txt"), "utf8");
  assert.equal(person, identityRouteBody("/person.jsonld").body);
  assert.equal(who, whoIsTxt());
  assert.equal(whoAlias, whoIsTxt());
  const doc = JSON.parse(person);
  assert.equal(doc["@id"], PERSON_ID);
  assert.deepEqual(doc.jobTitle, PERSON_JOB_TITLE.slice());
  assert.equal(GROWTH_ON, true);
  assert.equal(VISIBLE_HTML_CHROME, false);
  assert.equal(SITE_BLURBS.person_hub.person_id, PERSON_ID);
  assert.equal(siteBlurbsCite().runtime.slug, "aziel-runtime");
});
