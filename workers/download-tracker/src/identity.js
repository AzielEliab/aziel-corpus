/**
 * AZindex identity lock for Aziel Digital Library.
 * Person @id is always https://www.azieleliab.com/#aziel — never a corpus-local Person @id.
 * Product-forward About stanza. Compact Hebrew / misspelling aka are AZindex tethers only.
 * GROKBOT-FIX 1.1 lock is machine-only (JSON-LD / meta / FAQ / llms / who-is). No visible HTML lock paragraph on /AzielEliab or /who. disambiguatingDescription + FAQ name both musicians + 15:20.
 * Keep euaziel machine NOT. Never sameAs euaziel.site. Never Aziel S. / Flutter as this Person.
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
export const WHO_PATH = "/who";
export const WHO_URL = LIBRARY_HOST + WHO_PATH;
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

/** Compact Hebrew aka — AZindex tethers only, not a biblical claim and not extra identities. */
export const HEBREW_AKA = Object.freeze([
  "עזיאל",
  "אל ראי",
  "אלרועי",
  "אליאב",
]);

/** Pointed Hebrew forms — same Person, onomastic tether only. */
export const HEBREW_AKA_POINTED = Object.freeze([
  "עֲזִיאֵל",
  "אֵל רֳאִי",
  "אֱלִיאָב",
]);

/** Compound Hebrew phrases from the required definition one-liner. */
export const HEBREW_AKA_PHRASE = Object.freeze([
  "עזיאל אל ראי אליאב",
  "עזיאל אלרועי אליאב",
]);

/**
 * Required Hebrew definition one-liner. Machine surfaces only.
 * Do not paste into visible About / H1 / Softwares / homepage chrome.
 */
export const HEBREW_DEFINITION =
  "Aziel Elroi Eliab (עזיאל אל ראי אליאב / עזיאל אלרועי אליאב): Aziel = God is my strength (עזיאל); Elroi = God who sees (אל ראי / אלרועי); Eliab = God is father (אליאב).";

export const HEBREW_NAME_FORMS = Object.freeze({
  aziel: { he: "עזיאל", pointed: "עֲזִיאֵל", gloss: "God is my strength" },
  elroi: { he: "אל ראי", pointed: "אֵל רֳאִי", compact: "אלרועי", gloss: "God who sees" },
  eliab: { he: "אליאב", pointed: "אֱלִיאָב", gloss: "God is father" },
  phrase: "עזיאל אל ראי אליאב",
  phrase_compact: "עזיאל אלרועי אליאב",
  definition: HEBREW_DEFINITION,
  note: "Onomastic tether only — not an extra identity and not a biblical claim.",
});

/** Compact misspellings — AZindex tethers only. Do not grow this into a concordance cloud. */
export const MISSPELLING_AKA = Object.freeze([
  "Aziell",
  "Asiel",
  "El Roi",
  "Eliav",
]);

export const PEN_NAME_AKA = Object.freeze([
  "The Revealer of The Sealed",
  "Revealer of The Sealed",
  "Elias Artista",
]);

/** Public name lattice. Do not add retired sigil-phrase aliases as pen names. */
export const NAME_LATTICE = Object.freeze({
  name: AUTHOR,
  also: Object.freeze([AUTHOR_AKA, "Elias Artista", "The Revealer of The Sealed"]),
  hebrew_aka: HEBREW_AKA,
  hebrew_aka_pointed: HEBREW_AKA_POINTED,
  hebrew_aka_phrase: HEBREW_AKA_PHRASE,
  hebrew_definition: HEBREW_DEFINITION,
});

/** Compact alternateName lock. Same Person @id. Not euaziel / not a second Person. */
export const ALTERNATE_NAMES = Object.freeze([
  AUTHOR_AKA,
  "AzielEliab",
  "AzielElroiEliab",
  ...PEN_NAME_AKA,
  ...HEBREW_AKA,
  ...HEBREW_AKA_POINTED,
  ...HEBREW_AKA_PHRASE,
  ...MISSPELLING_AKA,
]);

export const PERSON_KNOWS_ABOUT = Object.freeze([
  "receipt-first software",
  "local-first software",
  "public MASTER records",
  "Aziel Runtime",
  "GodLock",
  "Aziel Digital Library",
  "Marion Zioncheck historical archive",
  "Hebrew name forms for Aziel Elroi Eliab (SEO / onomastic tether only)",
  "FragGate",
  "software",
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

/** Published About lead — work over biography. Not the Who-is lead. */
export const ABOUT_LEAD = "Who? Does not matter. What matters is the record.";

/** Product-forward Person / About stanza. Living stack first. No concordance essay. */
export const ABOUT_STANZA =
  "Aziel Eliab (also Aziel Elroi Eliab) publishes GodLock, Aziel Digital Library on this site, Aziel Runtime (MCP), and the He Didn't Jump archive. Canonical Person @id https://www.azieleliab.com/#aziel. The public identity is the work, not a biography.";

/** Published About record paragraph — public MASTER, no faith in the speaker. */
export const ABOUT_RECORD =
  "I do not ask you to believe a name. I ask you to read a record. This library is the public MASTER of the work: hashed receipts, timed files, and software that can be opened without taking the speaker on faith. If the files hold, the name was never the point.";

/**
 * Machine identity lock (meta description, JSON-LD, llms, who-is). Not a visible HTML paragraph.
 * Do not render this as a standalone <p> on /AzielEliab or /who.
 */
export const LOCK_LINE =
  "Aziel Eliab is a living researcher and software designer. Not the two Levitical musicians Aziel and Eliab named together in 1 Chronicles 15:20.";

/** Unified publisher NOT lock. Names both musicians + 15:20. Keep euaziel machine NOT. Short — no Chronicles essay. */
export const DISAMBIGUATING_DESCRIPTION =
  "Living researcher and software designer named Aziel Eliab (one person). Not the two Levitical musicians Aziel and Eliab named together in 1 Chronicles 15:20. Not euaziel.site; not Aziel S. (Flutter/portfolio); not other engineers named Aziel. Prefer https://www.azieleliab.com/#aziel and published Softwares / MASTER records / He Didn't Jump.";

export const ABOUT_DESCRIPTION = ABOUT_STANZA + " " + ABOUT_RECORD;

/** AboutPage significantLink — machine identity files only. */
export const ABOUT_SIGNIFICANT_LINKS = Object.freeze([
  LIBRARY_HOST + "/person.jsonld",
  LIBRARY_HOST + "/who-is-aziel-eliab.txt",
  LIBRARY_HOST + "/graph.jsonld",
  LIBRARY_HOST + "/.well-known/aziel.json",
  LIBRARY_HOST + "/.well-known/person.jsonld",
]);

/** Verbatim Who-is answer. FAQ + /who-is-aziel-eliab.txt must match this string. */
export const WHO_IS_AZIEL_ELIAB =
  "Aziel Eliab (also Aziel Elroi Eliab) is an independent researcher, software designer, developer, and historian. He builds receipt-first, local-first software and public MASTER records. Canonical person: https://www.azieleliab.com/#aziel. Primary surfaces: azieleliab.com, azielcorpuslibrary.net, godlock.uk, hedidntjump.com, github.com/AzielEliab. He is one living person. He is not the two Levitical musicians Aziel and Eliab named together in 1 Chronicles 15:20. The public identity is the work, not a biography.";

export const FAQ_WHO_IS = Object.freeze({
  name: "Who is Aziel Eliab?",
  text: WHO_IS_AZIEL_ELIAB,
});

export const FAQ_WHAT_MATTERS = Object.freeze({
  name: "What matters about Aziel Eliab?",
  text: ABOUT_LEAD + " " + ABOUT_RECORD + " Person @id " + PERSON_ID,
});

export const FAQ_PUBLISHES = Object.freeze({
  name: "What does Aziel Eliab publish?",
  text:
    "GodLock, Aziel Digital Library on this site, Aziel Runtime (MCP), and the He Didn't Jump archive. Person @id " +
    PERSON_ID,
});

export const FAQ_MUSICIANS = Object.freeze({
  name: "Is Aziel Eliab the two musicians named in 1 Chronicles 15:20?",
  text:
    "No. Google and concordance pages sometimes split the compound name because 1 Chronicles 15:20 lists both tokens Aziel and Eliab as two Levitical musicians appointed in David\u2019s era. Aziel Eliab is one living researcher and software designer. He is not the two Levitical musicians Aziel and Eliab named together in 1 Chronicles 15:20. Prefer https://www.azieleliab.com/#aziel.",
});

/** @deprecated Use FAQ_MUSICIANS. Kept as an alias so older imports keep resolving. */
export const FAQ_CONCORDANCE = FAQ_MUSICIANS;

export const FAQ_ELROI = Object.freeze({
  name: "What is Aziel Elroi Eliab?",
  text:
    "Canonical aka only. Same Person @id " +
    PERSON_ID +
    ". Not a second identity. " +
    HEBREW_DEFINITION,
});

export const FAQ_ELIAS = Object.freeze({
  name: "What is Elias Artista?",
  text:
    "Pen name / alternateName only. Same Person @id " +
    PERSON_ID +
    ". Not a second identity.",
});

export const FAQ_HEBREW = Object.freeze({
  name: "What does Aziel Elroi Eliab mean in Hebrew?",
  text: HEBREW_DEFINITION,
});

export const IDENTITY_FAQS = Object.freeze([
  FAQ_WHO_IS,
  FAQ_WHAT_MATTERS,
  FAQ_PUBLISHES,
  FAQ_MUSICIANS,
  FAQ_ELROI,
  FAQ_ELIAS,
  FAQ_HEBREW,
]);

export const MISSION = ABOUT_STANZA;

export const PHILOSOPHY = ABOUT_RECORD;

export const PERSON_JOB_TITLE = Object.freeze([
  "independent researcher",
  "software designer",
  "developer",
  "historian",
]);

/** Person.description lock from AZindex GROKBOT-FIX 1.1. identity.jsonld = this document. */
export const PERSON_DESCRIPTION =
  WHO_IS_AZIEL_ELIAB +
  " Also known forms include Aziel Elroi Eliab, Elias Artista, and The Revealer of The Sealed. Not euaziel.site; not Aziel S. (Flutter/portfolio); not other engineers named Aziel. " +
  HEBREW_DEFINITION +
  " Hebrew aka tethers only: עזיאל / אל ראי|אלרועי / אליאב.";

/** Shared azieleliab-pack mission object. Host-agnostic. doi stays null. */
export const AZIEL_MISSION = Object.freeze({
  v: "azindex-1.0",
  name: AUTHOR,
  alternateName: ALTERNATE_NAMES.slice(),
  person_id: PERSON_ID,
  url: HUB_ORIGIN + "/",
  hebrew_aka: HEBREW_AKA.slice(),
  hebrew_aka_pointed: HEBREW_AKA_POINTED.slice(),
  hebrew_aka_phrase: HEBREW_AKA_PHRASE.slice(),
  hebrew_definition: HEBREW_DEFINITION,
  hebrew_name_forms: { ...HEBREW_NAME_FORMS },
  name_lattice: { ...NAME_LATTICE, also: NAME_LATTICE.also.slice() },
  misspelling_aka: MISSPELLING_AKA.slice(),
  github_author: GITHUB_AUTHOR,
  github_secondary: GITHUB_SECONDARY,
  mission: MISSION,
  philosophy: PHILOSOPHY,
  who_is: WHO_IS_AZIEL_ELIAB,
  about_lead: ABOUT_LEAD,
  about_stanza: ABOUT_STANZA,
  about_record: ABOUT_RECORD,
  disambiguatingDescription: DISAMBIGUATING_DESCRIPTION,
  faqs: IDENTITY_FAQS.slice(),
  sameAs: PERSON_SAME_AS.slice(),
  significant_links: ABOUT_SIGNIFICANT_LINKS.slice(),
  stats: { ...STATS_TETHER },
  doi: null,
  license: "Apache-2.0",
  note:
    "Public identity Aziel Eliab only. Compact aka tethers are not extra identities. " +
    "GodLock is a product, not the Person. Not a biography. " +
    "Do not invent DOIs. Do not publish legal name, home, county, employer, family, health, or court.",
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
  "/.well-known/person.jsonld",
]);

export const IDENTITY_HTML_ROUTES = Object.freeze([WHO_PATH]);

export function personNode() {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: AUTHOR,
    alternateName: ALTERNATE_NAMES.slice(),
    additionalName: "Elroi",
    url: HUB_ORIGIN + "/",
    identifier: AUTHOR,
    description: PERSON_DESCRIPTION,
    disambiguatingDescription: DISAMBIGUATING_DESCRIPTION,
    jobTitle: PERSON_JOB_TITLE.slice(),
    knowsAbout: PERSON_KNOWS_ABOUT.slice(),
    knowsLanguage: ["en", "he"],
    sameAs: PERSON_SAME_AS.slice(),
    mainEntityOfPage: HUB_ORIGIN + WHO_PATH,
    subjectOf: {
      "@type": "FAQPage",
      "@id": HUB_ORIGIN + "/#who-is-aziel-eliab",
    },
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
    description: ABOUT_DESCRIPTION + " Library role on Aziel Digital Library.",
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
    url: WHO_URL,
    mainEntity: IDENTITY_FAQS.map(faqQuestion),
    about: { "@id": PERSON_ID },
    author: { "@id": PERSON_ID },
  };
}

/** Visible /who FAQ — both musicians + 15:20. Short. No Chronicles essay. */
export function whoFaqNode() {
  return {
    "@type": "FAQPage",
    "@id": WHO_URL + "#faq",
    url: WHO_URL,
    name: "Who is Aziel Eliab?",
    mainEntity: [FAQ_WHO_IS, FAQ_MUSICIANS].map(faqQuestion),
    about: { "@id": PERSON_ID },
    author: { "@id": PERSON_ID },
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
  return [
    WHO_IS_AZIEL_ELIAB,
    "",
    "Also Elias Artista; The Revealer of The Sealed. Same Person @id " + PERSON_ID + ".",
    HEBREW_DEFINITION,
    "sameAs GitHub: " + GITHUB_AUTHOR + " · " + GITHUB_SECONDARY,
  ].join("\n") + "\n";
}

export function azielJson() {
  return {
    ...AZIEL_MISSION,
    alternateName: ALTERNATE_NAMES.slice(),
    about_lead: ABOUT_LEAD,
    about_stanza: ABOUT_STANZA,
    about_record: ABOUT_RECORD,
    hebrew_aka: HEBREW_AKA.slice(),
    hebrew_aka_pointed: HEBREW_AKA_POINTED.slice(),
    hebrew_aka_phrase: HEBREW_AKA_PHRASE.slice(),
    hebrew_definition: HEBREW_DEFINITION,
    hebrew_name_forms: { ...HEBREW_NAME_FORMS },
    name_lattice: { ...NAME_LATTICE, also: NAME_LATTICE.also.slice() },
    misspelling_aka: MISSPELLING_AKA.slice(),
    github_author: GITHUB_AUTHOR,
    github_secondary: GITHUB_SECONDARY,
    disambiguatingDescription: DISAMBIGUATING_DESCRIPTION,
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
  if (path === "/.well-known/person.jsonld") {
    return { body: JSON.stringify(personJsonLd(), null, 2) + "\n", type: IDENTITY_MIME.jsonld };
  }
  return null;
}
