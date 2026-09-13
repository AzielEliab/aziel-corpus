/**
 * AZindex identity lock for Aziel Digital Library.
 * Person @id is always https://www.azieleliab.com/#aziel — never a corpus-local Person @id.
 * Mission object is the shared azieleliab pack (record over faith, not a biography).
 * Hebrew / misspelling forms are SEO tethers only. Biblical names are disambiguated, not claimed.
 * Author: Aziel Eliab.
 */

export const AUTHOR = "Aziel Eliab";
export const AUTHOR_AKA = "Aziel Elroi Eliab";
export const PERSON_ID = "https://www.azieleliab.com/#aziel";
export const HUB_ORIGIN = "https://www.azieleliab.com";
export const LIBRARY_HOST = "https://www.azielcorpuslibrary.net";
export const LIBRARY_WEBSITE_ID = LIBRARY_HOST + "/#website";
export const LIBRARY_WEBSITE_NAME = "Aziel Corpus Library";
export const LIBRARY_ROLE_PATH = "/AzielEliab";
export const LIBRARY_ROLE_URL = LIBRARY_HOST + LIBRARY_ROLE_PATH;
export const GODLOCK_HOME = "https://godlock.uk/";
export const HEDIDNTJUMP_HOME = "https://www.hedidntjump.com/";
export const GITHUB_AUTHOR = "https://github.com/AzielEliab";
export const GITHUB_SECONDARY = "https://github.com/azieltherevealerofthesealed-arch";
export const GLAMA_RUNTIME = "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime";
export const GITHUB_RUNTIME = "https://github.com/AzielEliab/aziel-runtime";
export const X_PRIMARY = "https://x.com/azieleliab";
export const X_AKA = "https://x.com/AzielElroiEliab";

/** Full public sameAs lock. Do not drop entries. Do not add legal-name / home / court IDs. */
export const PERSON_SAME_AS = Object.freeze([
  GITHUB_AUTHOR,
  GITHUB_SECONDARY,
  GLAMA_RUNTIME,
  HUB_ORIGIN + "/",
  LIBRARY_HOST + "/",
  GODLOCK_HOME,
  HEDIDNTJUMP_HOME,
  X_AKA,
  X_PRIMARY,
]);

/** Hebrew aka forms — SEO tether only, not a biography and not a biblical claim. */
export const HEBREW_AKA = Object.freeze([
  "עזיאל",
  "אל ראי",
  "אלרועי",
  "אליאב",
]);

/** Common misspellings / spacing variants — SEO alternateName only. */
export const MISSPELLING_AKA = Object.freeze([
  "Aziell",
  "Asiel",
  "El Roi",
  "Elroi",
  "Eliav",
  "Aziel Elroi",
  "Aziel El Roi",
  "Aziel El-Roi",
  "Aziel Eliav",
  "Aziell Eliab",
  "Asiel Eliab",
  "Elroi Eliab",
  "El Roi Eliab",
]);

export const ALTERNATE_NAMES = Object.freeze([
  AUTHOR_AKA,
  ...HEBREW_AKA,
  ...MISSPELLING_AKA,
]);

/** Cross-tether public stats. Do not invent extra counters. */
export const STATS_TETHER = Object.freeze({
  azieleliab: HUB_ORIGIN + "/v1/stats",
  corpus: LIBRARY_HOST + "/stats",
  hedidntjump: "https://www.hedidntjump.com/api/stats",
});

export const STATS_URLS = Object.freeze([
  STATS_TETHER.azieleliab,
  STATS_TETHER.corpus,
  STATS_TETHER.hedidntjump,
]);

/** Published About lead — verbatim from /AzielEliab. Not a biography. */
export const ABOUT_LEAD = "Who? Does not matter. What matters is the record.";

/** Published About first stanza — Researcher/Builder/one-man team/just a man + lead. */
export const ABOUT_STANZA =
  "Researcher. Builder. AI. A one-man dev team. Just a man. Who? Does not matter. What matters is the record.";

/** Published About record paragraph — public MASTER, no faith in the speaker. */
export const ABOUT_RECORD =
  "I do not ask you to believe a name. I ask you to read a record. This library is the public MASTER of the work: hashed receipts, timed files, and software that can be opened without taking the speaker on faith. If the files hold, the name was never the point.";

export const ABOUT_DESCRIPTION = ABOUT_STANZA + " " + ABOUT_RECORD;

/** AboutPage significantLink — machine identity files only. */
export const ABOUT_SIGNIFICANT_LINKS = Object.freeze([
  LIBRARY_HOST + "/person.jsonld",
  LIBRARY_HOST + "/who-is-aziel-eliab.txt",
  LIBRARY_HOST + "/graph.jsonld",
  LIBRARY_HOST + "/.well-known/aziel.json",
]);

/** Verbatim Who-is answer. FAQ + /who-is-aziel-eliab.txt + /who-is must match this string. */
export const WHO_IS_AZIEL_ELIAB =
  ABOUT_LEAD +
  " Public identity Aziel Eliab. Living publisher of this MASTER. Researcher. Builder. AI. A one-man dev team. Just a man. " +
  ABOUT_RECORD +
  " NOT biblical Aziel (1 Chronicles). NOT biblical Eliab. Person @id " +
  PERSON_ID;

export const FAQ_WHO_IS = Object.freeze({
  name: "Who is Aziel Eliab?",
  text: WHO_IS_AZIEL_ELIAB,
});

export const FAQ_WHAT_MATTERS = Object.freeze({
  name: "What matters about Aziel Eliab?",
  text: ABOUT_LEAD + " " + ABOUT_RECORD + " Not a biography. Person @id " + PERSON_ID,
});

export const FAQ_RESEARCHER_BUILDER = Object.freeze({
  name: "Is Aziel Eliab a researcher and builder?",
  text: ABOUT_STANZA + " Not a biography. Person @id " + PERSON_ID,
});

export const FAQ_BIBLICAL_AZIEL = Object.freeze({
  name: "Is Aziel Eliab the biblical Aziel?",
  text:
    "No. Biblical Aziel (1 Chronicles; עזיאל) is a scriptural name, not this publisher. The public identity Aziel Eliab is the living publisher of this MASTER, not the biblical Aziel. Hebrew עזיאל is an SEO tether only. Person @id https://www.azieleliab.com/#aziel",
});

export const FAQ_BIBLICAL_ELIAB = Object.freeze({
  name: "Is Aziel Eliab the biblical Eliab?",
  text:
    "No. Biblical Eliab (אליאב) is a scriptural name, not this publisher. The public identity Aziel Eliab is the living publisher of this MASTER, not the biblical Eliab. Hebrew אליאב is an SEO tether only. Person @id https://www.azieleliab.com/#aziel",
});

export const FAQ_ELROI = Object.freeze({
  name: "What is Aziel Elroi / El Roi?",
  text:
    "Aziel Elroi Eliab, El Roi, אל ראי, and אלרועי are SEO alternateName tethers only. Public identity is Aziel Eliab. Not a biography. Person @id https://www.azieleliab.com/#aziel",
});

export const IDENTITY_FAQS = Object.freeze([
  FAQ_WHO_IS,
  FAQ_WHAT_MATTERS,
  FAQ_RESEARCHER_BUILDER,
  FAQ_BIBLICAL_AZIEL,
  FAQ_BIBLICAL_ELIAB,
  FAQ_ELROI,
]);

export const MISSION = ABOUT_LEAD + " " + ABOUT_RECORD;

export const PHILOSOPHY = ABOUT_RECORD;

export const PERSON_DESCRIPTION = ABOUT_STANZA;

/** Shared azieleliab-pack mission object. Host-agnostic. doi stays null. */
export const AZIEL_MISSION = Object.freeze({
  v: "azindex-1.0",
  name: AUTHOR,
  alternateName: ALTERNATE_NAMES.slice(),
  hebrew_aka: HEBREW_AKA.slice(),
  misspelling_aka: MISSPELLING_AKA.slice(),
  person_id: PERSON_ID,
  url: HUB_ORIGIN + "/",
  mission: MISSION,
  philosophy: PHILOSOPHY,
  who_is: WHO_IS_AZIEL_ELIAB,
  about_lead: ABOUT_LEAD,
  about_stanza: ABOUT_STANZA,
  about_record: ABOUT_RECORD,
  faqs: IDENTITY_FAQS.slice(),
  sameAs: PERSON_SAME_AS.slice(),
  significant_links: ABOUT_SIGNIFICANT_LINKS.slice(),
  stats: { ...STATS_TETHER },
  doi: null,
  license: "Apache-2.0",
  note: "Public identity Aziel Eliab only. Not a biography. Hebrew and misspelling forms are SEO tethers only. Biblical Aziel/Eliab are disambiguated, not claimed. Do not invent DOIs. Do not publish legal name, home, county, employer, family, health, or court.",
});

export const IDENTITY_MIME = {
  jsonld: "application/ld+json; charset=utf-8",
  json: "application/json; charset=utf-8",
  plain: "text/plain; charset=utf-8",
};

export const IDENTITY_ROUTES = Object.freeze([
  "/person.jsonld",
  "/identity.jsonld",
  "/graph.jsonld",
  "/who-is-aziel-eliab.txt",
  "/who-is",
  "/.well-known/aziel.json",
]);

export function personNode() {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: AUTHOR,
    alternateName: ALTERNATE_NAMES.slice(),
    url: HUB_ORIGIN + "/",
    description: PERSON_DESCRIPTION,
    sameAs: PERSON_SAME_AS.slice(),
  };
}

export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    ...personNode(),
  };
}

/** Alias of person.jsonld — same Person document, same @id. */
export function identityJsonLd() {
  return personJsonLd();
}

function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": LIBRARY_WEBSITE_ID,
    name: LIBRARY_WEBSITE_NAME,
    url: LIBRARY_HOST + "/",
    description: "Aziel Digital Library public MASTER. Publisher is Aziel Eliab.",
    author: { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID },
    creator: { "@id": PERSON_ID },
    relatedLink: STATS_URLS.slice(),
  };
}

function libraryRoleNode() {
  return {
    "@type": "AboutPage",
    "@id": LIBRARY_ROLE_URL + "#library-role",
    name: "Aziel Eliab — library role",
    url: LIBRARY_ROLE_URL,
    description: ABOUT_DESCRIPTION + " Library role on Aziel Digital Library. Not a biography.",
    isPartOf: { "@id": LIBRARY_WEBSITE_ID },
    mainEntity: { "@id": PERSON_ID },
    author: { "@id": PERSON_ID },
    creator: { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID },
    about: { "@id": PERSON_ID },
    significantLink: ABOUT_SIGNIFICANT_LINKS.slice(),
  };
}

export function aboutPageNode(description) {
  return {
    "@type": "AboutPage",
    "@id": LIBRARY_ROLE_URL + "#about",
    name: "About " + AUTHOR,
    url: LIBRARY_ROLE_URL,
    description: description || ABOUT_DESCRIPTION,
    isPartOf: { "@id": LIBRARY_WEBSITE_ID },
    mainEntity: { "@id": PERSON_ID },
    author: { "@id": PERSON_ID },
    creator: { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID },
    about: { "@id": PERSON_ID },
    significantLink: ABOUT_SIGNIFICANT_LINKS.slice(),
  };
}

function faqQuestion(item) {
  return {
    "@type": "Question",
    name: item.name,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.text,
    },
  };
}

export function faqNode() {
  return {
    "@type": "FAQPage",
    "@id": LIBRARY_HOST + "/graph.jsonld#faq",
    name: FAQ_WHO_IS.name,
    url: LIBRARY_HOST + "/who-is-aziel-eliab.txt",
    mainEntity: IDENTITY_FAQS.map(faqQuestion),
  };
}

function statsTetherNode() {
  return {
    "@type": "ItemList",
    "@id": LIBRARY_HOST + "/#stats-tether",
    name: "Aziel Eliab cross-tether stats",
    description: "Public view/download stats on Official site, Corpus, and He Didn't Jump.",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "azieleliab", url: STATS_TETHER.azieleliab },
      { "@type": "ListItem", position: 2, name: "corpus", url: STATS_TETHER.corpus },
      { "@type": "ListItem", position: 3, name: "hedidntjump", url: STATS_TETHER.hedidntjump },
    ],
    publisher: { "@id": PERSON_ID },
  };
}

export function graphJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [personNode(), faqNode(), websiteNode(), aboutPageNode(), libraryRoleNode(), statsTetherNode()],
  };
}

export function whoIsTxt() {
  return WHO_IS_AZIEL_ELIAB + "\n";
}

export function azielJson() {
  return {
    ...AZIEL_MISSION,
    alternateName: ALTERNATE_NAMES.slice(),
    hebrew_aka: HEBREW_AKA.slice(),
    misspelling_aka: MISSPELLING_AKA.slice(),
    about_lead: ABOUT_LEAD,
    about_stanza: ABOUT_STANZA,
    about_record: ABOUT_RECORD,
    faqs: IDENTITY_FAQS.slice(),
    sameAs: PERSON_SAME_AS.slice(),
    significant_links: ABOUT_SIGNIFICANT_LINKS.slice(),
    stats: { ...STATS_TETHER },
  };
}

export function identitySameAsLine() {
  return PERSON_SAME_AS.join(" · ");
}

export function identityRouteBody(path) {
  if (path === "/person.jsonld") {
    return { body: JSON.stringify(personJsonLd(), null, 2) + "\n", type: IDENTITY_MIME.jsonld };
  }
  if (path === "/identity.jsonld") {
    return { body: JSON.stringify(identityJsonLd(), null, 2) + "\n", type: IDENTITY_MIME.jsonld };
  }
  if (path === "/graph.jsonld") {
    return { body: JSON.stringify(graphJsonLd(), null, 2) + "\n", type: IDENTITY_MIME.jsonld };
  }
  if (path === "/who-is-aziel-eliab.txt" || path === "/who-is") {
    return { body: whoIsTxt(), type: IDENTITY_MIME.plain };
  }
  if (path === "/.well-known/aziel.json") {
    return { body: JSON.stringify(azielJson(), null, 2) + "\n", type: IDENTITY_MIME.json };
  }
  return null;
}
