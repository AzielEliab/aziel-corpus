/** Crawl/index metadata for hosted MASTER pages. Author: Aziel Eliab. */
import {
  RUNTIME_ORIGIN,
  RUNTIME_GITHUB,
  RUNTIME_DOCS,
  RUNTIME_GLAMA,
  RUNTIME_LIVE_COUNT,
  RUNTIME_LOCAL_ONLY,
  RUNTIME_KERNEL,
  RUNTIME_TITLE,
  resolveRuntimeVersion,
  runtimeDescription,
  softwareDescription,
  softwareHubBlurb,
} from "./runtime-copy.js";

export const CANON_HOST = "https://www.azielcorpuslibrary.net";
export const ABOUT_PATH = "/AzielEliab";
export const ABOUT_NAV_LABEL = "Aziel Eliab";
export const HUB_ORIGIN = "https://www.azieleliab.com";
/** Shared public Person @id. Do not invent a corpus-local competing Person @id. */
export const HUB_PERSON_ID = "https://www.azieleliab.com/#aziel";
/** Parent Aziel Runtime @id. Do not invent a corpus-local Runtime identity. */
export const HUB_RUNTIME_ID = "https://www.azieleliab.com/runtime#runtime";
export const WEBSITE_ID = CANON_HOST + "/#website";
export const WEBSITE_NAME = "Aziel Corpus Library";
const SITE = "Aziel Digital Library";
const AUTHOR = "Aziel Eliab";
const AKA = "Aziel Elroi Eliab";
export const GITHUB_AUTHOR = "https://github.com/AzielEliab";
export const GITHUB_REPO = "https://github.com/AzielEliab/aziel-corpus";
const GITHUB_RUNTIME = RUNTIME_GITHUB;
export const GODLOCK_IDENTITY = "https://godlock.uk/AzielEliab";
export const SHARE_IMAGE = CANON_HOST + "/sigil.png";
export const SITE_DESCRIPTION = "Aziel Digital Library by Aziel Eliab. Search the public MASTER across Aziel Library and Corpus. Temporal map, gazetteer, intelligence, and hosted OCR.";

/** Visible ecosystem block (footer/nav). Not Softwares H1→list. */
export const ECOSYSTEM_HEADING = "Part of the Aziel Eliab ecosystem";
export const ECOSYSTEM_LINKS = Object.freeze([
  Object.freeze({ href: HUB_ORIGIN + "/", label: "Official site" }),
  Object.freeze({ href: CANON_HOST + "/", label: "Aziel Corpus Library" }),
  Object.freeze({ href: RUNTIME_GITHUB, label: "Aziel Runtime on GitHub" }),
  Object.freeze({ href: RUNTIME_ORIGIN + "/", label: "Aziel Runtime", muted: true }),
  Object.freeze({ href: RUNTIME_GLAMA, label: "Try on Glama", primary: true }),
]);

/** Unique <title> / OG / Twitter strings. Visible H1s stay in page bodies. */
export function documentTitle(kind, title) {
  if (kind === "search") return SITE + " — Public MASTER by " + AUTHOR;
  if (kind === "software") return "Softwares — " + AUTHOR + " catalog | " + SITE;
  if (kind === "runtime") return RUNTIME_TITLE;
  if (kind === "about") return "About " + AUTHOR + " | " + SITE;
  const t = String(title || "").trim();
  if (t && t !== SITE) return t + " — " + SITE;
  return SITE + " — Public MASTER by " + AUTHOR;
}

function ogType(kind) {
  if (kind === "record") return "article";
  if (kind === "about") return "profile";
  return "website";
}

/** Permanent Location for legacy /about and case-folded /AzielEliab. */
export function aboutRedirectFrom(path) {
  const p = String(path || "").replace(/\/+$/, "") || "/";
  if (p === ABOUT_PATH) return null;
  if (p === "/about" || p === "/aboutme") return ABOUT_PATH;
  if (p.toLowerCase() === "/azieleliab") return ABOUT_PATH;
  return null;
}
const Q = String.fromCharCode(34);

function esc(s) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
  map[Q] = "&quot;";
  return String(s || "").replace(/[&<>\u0022]/g, (c) => map[c] || c);
}

function meta(name, content) {
  return "<meta name=" + Q + name + Q + " content=" + Q + esc(content) + Q + ">";
}
function prop(name, content) {
  return "<meta property=" + Q + name + Q + " content=" + Q + esc(content) + Q + ">";
}
function linkRel(rel, href, extra) {
  extra = extra || "";
  return "<link rel=" + Q + rel + Q + " href=" + Q + esc(href) + Q + extra + ">";
}

/** Person / publisher / creator references. Exact shared hub @id. */
export function personRef() {
  return { "@id": HUB_PERSON_ID };
}

export function runtimeRef() {
  return { "@id": HUB_RUNTIME_ID };
}

/** Hub named-tool @id. Never an MCP operation entity. */
export function hubToolId(slug) {
  return "https://www.azieleliab.com/runtime#" + String(slug || "").trim();
}

export function toolRef(slug) {
  return { "@id": hubToolId(slug) };
}

/**
 * Local Person stub for /AzielEliab (and graph completeness).
 * Same hub @id only — never a competing corpus-local Person @id.
 */
export function personNode() {
  return {
    "@type": "Person",
    "@id": HUB_PERSON_ID,
    name: AUTHOR,
    alternateName: [AKA],
    url: HUB_ORIGIN + "/",
    description: "Author of Aziel Digital Library. Identity Aziel Eliab only.",
    sameAs: [HUB_ORIGIN + "/", GODLOCK_IDENTITY, GITHUB_AUTHOR, GITHUB_REPO, CANON_HOST + ABOUT_PATH],
  };
}

export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": CANON_HOST + "/#organization",
    name: SITE,
    url: CANON_HOST + "/",
    founder: personRef(),
    sameAs: [GITHUB_REPO],
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: WEBSITE_NAME,
    url: CANON_HOST + "/",
    description: SITE_DESCRIPTION,
    author: personRef(),
    publisher: personRef(),
    sameAs: [GITHUB_REPO],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: CANON_HOST + "/?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function defaultDescription(kind, runtimeVersion) {
  if (kind === "map") return "Temporal map of Aziel Digital Library. Event pins from corpus evidence. Author Aziel Eliab.";
  if (kind === "gazetteer") return "World gazetteer for Aziel Digital Library. GeoNames CC BY 4.0 place lookup. Author Aziel Eliab.";
  if (kind === "tree") return "Evidence-based corpus tree for Aziel Digital Library. Author Aziel Eliab.";
  if (kind === "health") return "Live health dashboard for Aziel Digital Library hosted MASTER. Author Aziel Eliab.";
  if (kind === "intelligence") return "Hosted intelligence, OCR, SpectralLock lenses, and Whisper transcription for Aziel Digital Library. Author Aziel Eliab.";
  if (kind === "ocr") return "Hosted OCR and advisory SpectralLock lenses for Aziel Digital Library. Author Aziel Eliab.";
  if (kind === "historical") return "Historical geography layers for Aziel Digital Library. Author Aziel Eliab.";
  if (kind === "verify") return "Integrity verification of the hosted Aziel Digital Library MASTER. Author Aziel Eliab.";
  if (kind === "corpus") return "Public corpus of Aziel Digital Library. Search published records. Author Aziel Eliab.";
  if (kind === "aziel-library") return "Aziel Library — royal-purple operator collection of work by Aziel Eliab on Aziel Digital Library.";
  if (kind === "runtime") return runtimeDescription(runtimeVersion);
  if (kind === "software") return softwareDescription(runtimeVersion);
  if (kind === "about") return "About Aziel Eliab. What matters is the record: hashed receipts, timed files, and software that can be opened without taking the speaker on faith. Signed Aziel Elroi Eliab. GodLock is one product on that record.";
  if (kind === "scored" || kind === "how-its-scored") return "How Aziel Digital Library scores records: triad SPRE × CLCE × PhysLing, AZCoherence second-pass triad coherence (peer AZ-CLCE; not AKM-TRIAD), and ZionPattern meaning (75 is intentional suppression confidence; lower is more natural). Author Aziel Eliab.";
  if (kind === "pattern") return "Pattern clusters across Aziel Digital Library domains, subjects, and keywords. Author Aziel Eliab.";
  if (kind === "donate") return "AZL-DONATE-1.0. Donate to Aziel Digital Library. Static door. Exodus rails. No Worker KV. Not a catalog item. Author Aziel Eliab.";
  if (kind === "search") return SITE_DESCRIPTION + " Author Aziel Eliab.";
  if (kind === "record") return "Public record in Aziel Digital Library. Author Aziel Eliab.";
  return "Aziel Digital Library by Aziel Eliab. Search, map, gazetteer, intelligence, and hosted OCR on the public MASTER.";
}

export function recordDescription(row) {
  const title = String((row && row.title) || "Record").trim() || "Record";
  const author = String((row && row.author) || "").trim();
  const lib = String((row && row.library) || "").toLowerCase();
  const azielDoc = lib === "aziel" || /^aziel(\s+elroi)?\s+eliab$/i.test(author);
  if (azielDoc) {
    const shelf = lib === "aziel" ? "Aziel Library" : "Corpus";
    return title + " by Aziel Eliab. " + shelf + " record on Aziel Digital Library.";
  }
  if (author) {
    return title + " by " + author + ". Public record on Aziel Digital Library by Aziel Eliab.";
  }
  return title + ". Public record on Aziel Digital Library by Aziel Eliab.";
}

function isAzielAuthored(work) {
  if (!work) return false;
  const lib = String(work.library || "").toLowerCase();
  const author = String(work.author || "").trim();
  return lib === "aziel" || /^aziel(\s+elroi)?\s+eliab$/i.test(author) || !author;
}

function workNode(work, path) {
  if (!work || !work.title) return null;
  const lib = String(work.library || "").toLowerCase();
  const aziel = lib === "aziel";
  const url = CANON_HOST + (path || "/");
  const node = {
    "@type": aziel ? "ScholarlyArticle" : "CreativeWork",
    name: work.title,
    headline: work.title,
    url,
    isPartOf: {
      "@type": "Collection",
      name: aziel ? "Aziel Library" : "Corpus",
      url: CANON_HOST + (aziel ? "/aziel-library" : "/corpus"),
    },
  };
  if (isAzielAuthored(work)) {
    node.author = personRef();
  } else if (work.author) {
    node.author = { "@type": "Person", name: String(work.author) };
  }
  if (work.datePublished) node.datePublished = isoDate(work.datePublished);
  if (work.record_id) node.identifier = work.record_id;
  return node;
}

function isoDate(value) {
  const s = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return undefined;
}

function breadcrumbNode(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.item,
    })),
  };
}

function jsonLd(title, path, kind, description, work, runtimeVersion) {
  const who = personRef();
  const person = personNode();
  const org = organizationNode();
  const website = websiteNode();
  const software = {
    "@type": "SoftwareApplication",
    name: SITE,
    applicationCategory: "DigitalLibrary",
    operatingSystem: "Web",
    url: CANON_HOST + "/",
    author: who,
    publisher: who,
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    codeRepository: GITHUB_REPO,
  };
  const library = {
    "@type": "DigitalLibrary",
    name: SITE,
    url: CANON_HOST + "/",
    creator: who,
    publisher: who,
  };
  const graph = [website, software, library, person, org];
  if (kind === "corpus" || kind === "search" || path === "/" || path === "/corpus") {
    graph.push({
      "@type": "Dataset",
      name: SITE + " corpus",
      url: CANON_HOST + (path || "/"),
      creator: who,
      license: "https://www.apache.org/licenses/LICENSE-2.0",
    });
  }
  if (kind === "search" || path === "/") {
    graph.push({
      "@type": "CollectionPage",
      "@id": CANON_HOST + "/#homepage",
      name: SITE,
      url: CANON_HOST + "/",
      description: defaultDescription("search"),
      isPartOf: { "@id": WEBSITE_ID },
      author: who,
      mainEntity: { "@id": WEBSITE_ID },
    });
  }
  if (kind === "map" || path === "/map") {
    graph.push({ "@type": "Map", name: "Temporal Map", url: CANON_HOST + "/map", creator: who });
  }
  if (kind === "runtime" || path === "/runtime" || kind === "software" || path === "/software" || path === "/") {
    const ver = resolveRuntimeVersion(runtimeVersion);
    const softwarePage = kind === "software" || path === "/software";
    graph.push({
      "@type": "SoftwareApplication",
      "@id": HUB_RUNTIME_ID,
      name: "aziel-runtime",
      alternateName: ["Aziel Runtime"],
      softwareVersion: ver,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Cloudflare Workers",
      url: HUB_ORIGIN + "/runtime",
      description: softwarePage ? softwareHubBlurb(ver) : runtimeDescription(ver),
      author: who,
      publisher: who,
      license: "https://www.apache.org/licenses/LICENSE-2.0",
      codeRepository: GITHUB_RUNTIME,
      sameAs: [CANON_HOST + "/runtime", RUNTIME_ORIGIN + "/", GITHUB_RUNTIME, RUNTIME_GLAMA, RUNTIME_DOCS],
    });
    graph.push({
      "@type": "WebAPI",
      "@id": hubToolId("fraggate"),
      name: softwarePage ? "FragGate" : "aziel-runtime FragGate",
      url: CANON_HOST + "/runtime/v1/fraggate",
      documentation: CANON_HOST + "/runtime",
      description: softwarePage
        ? "FragGate door. " + RUNTIME_LIVE_COUNT + " live advisory engines; " + RUNTIME_LOCAL_ONLY + " local_only; stubs refuse. Kernel " + RUNTIME_KERNEL + "."
        : "FragGate " + ver + " door. " + RUNTIME_LIVE_COUNT + " live advisory engines; " + RUNTIME_LOCAL_ONLY + " local_only; stubs refuse. Kernel " + RUNTIME_KERNEL + ".",
      isPartOf: runtimeRef(),
      provider: who,
      termsOfService: CANON_HOST + "/runtime",
    });
  }
  if (kind === "about" || path === ABOUT_PATH) {
    graph.push({
      "@type": "AboutPage",
      "@id": CANON_HOST + ABOUT_PATH + "#about",
      name: "About " + AUTHOR,
      url: CANON_HOST + ABOUT_PATH,
      description,
      isPartOf: { "@id": WEBSITE_ID },
      author: who,
      mainEntity: who,
    });
    graph.push({
      "@type": "ProfilePage",
      name: title || ABOUT_NAV_LABEL,
      url: CANON_HOST + ABOUT_PATH,
      description,
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: who,
    });
    graph.push(breadcrumbNode([
      { name: SITE, item: CANON_HOST + "/" },
      { name: "About " + AUTHOR, item: CANON_HOST + ABOUT_PATH },
    ]));
  }
  if (kind === "scored" || kind === "how-its-scored" || path === "/how-its-scored") {
    graph.push({
      "@type": "WebPage",
      name: "How it's scored",
      url: CANON_HOST + "/how-its-scored",
      description,
      author: who,
    });
  }
  if (kind === "software" || path === "/software") {
    graph.push({
      "@type": "CollectionPage",
      "@id": CANON_HOST + "/software#softwares",
      name: "Softwares",
      alternateName: "Software",
      url: CANON_HOST + "/software",
      description,
      isPartOf: { "@id": WEBSITE_ID },
      author: who,
      mainEntity: { "@id": WEBSITE_ID },
    });
    graph.push(breadcrumbNode([
      { name: SITE, item: CANON_HOST + "/" },
      { name: "Softwares", item: CANON_HOST + "/software" },
    ]));
  }
  const workLd = workNode(work, path);
  if (workLd) graph.push(workLd);
  return { "@context": "https://schema.org", "@graph": graph };
}

function pageKeywords(kind) {
  const base = [AUTHOR, AKA, SITE, "aziel-corpus"];
  if (kind === "about") base.push("GodLock");
  if (kind === "software" || kind === "runtime") base.push("aziel-runtime", "FragGate", "AzielTether", "GodLock", "AZCoherence", "azcoherence");
  if (kind === "scored" || kind === "how-its-scored" || kind === "record") base.push("SPRE", "CLCE", "PhysLing", "ZionPattern", "AZCoherence", "azcoherence", "AZ-CLCE");
  return base.join(", ");
}

export function headMeta(opts) {
  const title = opts.title || SITE;
  const path = opts.path || "/";
  const kind = opts.kind || "";
  const runtimeVersion = opts.runtimeVersion;
  const description = opts.description || defaultDescription(kind, runtimeVersion);
  const seoTitle = documentTitle(kind, title);
  const url = CANON_HOST + path;
  const ld = jsonLd(title, path, kind, description, opts.work, runtimeVersion);
  const ldOpen = "<" + "script type=" + Q + "application/ld+json" + Q + ">";
  const ldClose = "</" + "script>";
  const image = opts.image || SHARE_IMAGE;
  const imageAlt = SITE + " sigil. Author " + AUTHOR + ".";
  return [
    meta("description", description),
    meta("keywords", pageKeywords(kind)),
    meta("robots", "index,follow"),
    meta("googlebot", "index,follow"),
    meta("author", AUTHOR),
    linkRel("canonical", url),
    linkRel("author", CANON_HOST + ABOUT_PATH),
    prop("og:title", seoTitle),
    prop("og:description", description),
    prop("og:type", ogType(kind)),
    prop("og:url", url),
    prop("og:site_name", SITE),
    prop("og:locale", "en_US"),
    prop("og:image", image),
    prop("og:image:alt", imageAlt),
    meta("twitter:card", "summary"),
    meta("twitter:title", seoTitle),
    meta("twitter:description", description),
    meta("twitter:image", image),
    meta("twitter:image:alt", imageAlt),
    linkRel("alternate", "/cite.json", " type=" + Q + "application/json" + Q),
    linkRel("alternate", "/llms.txt", " type=" + Q + "text/plain" + Q),
    linkRel("alternate", "/ai.txt", " type=" + Q + "text/plain" + Q),
    linkRel("alternate", "/openapi.json", " type=" + Q + "application/json" + Q + " title=" + Q + "OpenAPI" + Q),
    linkRel("alternate", "/runtime/openapi.json", " type=" + Q + "application/json" + Q + " title=" + Q + "Runtime OpenAPI" + Q),
    linkRel("alternate", "/runtime/mcp", " type=" + Q + "application/json" + Q + " title=" + Q + "Runtime MCP" + Q),
    linkRel("alternate", "/.well-known/mcp.json", " type=" + Q + "application/json" + Q + " title=" + Q + "MCP discovery" + Q),
    linkRel("alternate", "/mcp.json", " type=" + Q + "application/json" + Q + " title=" + Q + "MCP discovery" + Q),
    linkRel("alternate", "/v1/software", " type=" + Q + "application/json" + Q + " title=" + Q + "Live software catalog" + Q),
    linkRel("alternate", "/v1/mesh", " type=" + Q + "application/json" + Q + " title=" + Q + "Suite mesh / Live Nodes" + Q),
    linkRel("alternate", "/runtime/v1/mesh", " type=" + Q + "application/json" + Q + " title=" + Q + "Runtime mesh" + Q),
    linkRel("alternate", "/runtime/llms.txt", " type=" + Q + "text/plain" + Q + " title=" + Q + "Runtime llms.txt" + Q),
    linkRel("alternate", "/runtime/cite.json", " type=" + Q + "application/json" + Q + " title=" + Q + "Runtime cite.json" + Q),
    linkRel("sitemap", "/sitemap.xml"),
    linkRel("sitemap", "/sitemap-index.xml"),
    linkRel("service", "/runtime/v1/fraggate", " title=" + Q + "FragGate" + Q),
    ...(kind === "about" || path === ABOUT_PATH ? [
      linkRel("me", HUB_ORIGIN + "/"),
      linkRel("me", HUB_PERSON_ID),
      linkRel("me", GODLOCK_IDENTITY),
      linkRel("me", GITHUB_AUTHOR),
      linkRel("me", GITHUB_REPO),
    ] : []),
    ldOpen + JSON.stringify(ld) + ldClose
  ].join("");
}
