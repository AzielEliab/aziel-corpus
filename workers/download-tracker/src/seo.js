/** Crawl/index metadata for hosted MASTER pages. Author: Aziel Eliab. */
export const CANON_HOST = "https://www.azielcorpuslibrary.net";
const SITE = "Aziel Digital Library";
const AUTHOR = "Aziel Eliab";
const AKA = "Aziel Elroi Eliab";
const GITHUB_AUTHOR = "https://github.com/AzielEliab";
const GITHUB_REPO = "https://github.com/AzielEliab/aziel-corpus";
const GITHUB_RUNTIME = "https://github.com/AzielEliab/aziel-runtime";
export const SHARE_IMAGE = CANON_HOST + "/sigil.png";
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

export function personNode() {
  return {
    "@type": "Person",
    "@id": CANON_HOST + "/about#aziel-eliab",
    name: AUTHOR,
    alternateName: [AKA],
    url: CANON_HOST + "/about",
    sameAs: [GITHUB_AUTHOR],
  };
}

export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": CANON_HOST + "/#organization",
    name: SITE,
    url: CANON_HOST + "/",
    founder: { "@id": CANON_HOST + "/about#aziel-eliab" },
    sameAs: [GITHUB_REPO],
  };
}

export function defaultDescription(kind) {
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
  if (kind === "runtime") return "aziel-runtime 1.4.0 engine-runtime on the Aziel Digital Library. Prefer /runtime/*. Listed engines run in-process; receipts carry engine_digest. Proxy is not exec. Author Aziel Eliab.";
  if (kind === "software") return "Downloadable software by Aziel Eliab. Product catalog for aziel-runtime, AzielTether, and the Aziel suite. Invoke from /runtime. Author Aziel Eliab.";
  if (kind === "about") return "About Aziel Eliab, researcher and builder of Aziel Digital Library. Also known as Aziel Elroi Eliab. Primary credit Aziel Eliab.";
  if (kind === "scored" || kind === "how-its-scored") return "How Aziel Digital Library scores records: triad SPRE × CLCE × PhysLing, and ZionPattern meaning (75 is intentional suppression confidence; lower is more natural). Author Aziel Eliab.";
  if (kind === "pattern") return "Pattern clusters across Aziel Digital Library domains, subjects, and keywords. Author Aziel Eliab.";
  if (kind === "search") return "Search Aziel Digital Library by Aziel Eliab. Public MASTER across Aziel Library and Corpus.";
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
    node.author = { "@id": CANON_HOST + "/about#aziel-eliab" };
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

function jsonLd(title, path, kind, description, work) {
  const person = personNode();
  const org = organizationNode();
  const website = {
    "@type": "WebSite",
    "@id": CANON_HOST + "/#website",
    name: SITE,
    url: CANON_HOST + "/",
    description,
    author: { "@id": person["@id"] },
    publisher: { "@id": org["@id"] },
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
  const software = {
    "@type": "SoftwareApplication",
    name: SITE,
    applicationCategory: "DigitalLibrary",
    operatingSystem: "Web",
    url: CANON_HOST + "/",
    author: { "@id": person["@id"] },
    publisher: { "@id": org["@id"] },
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    codeRepository: GITHUB_REPO,
  };
  const library = {
    "@type": "DigitalLibrary",
    name: SITE,
    url: CANON_HOST + "/",
    creator: { "@id": person["@id"] },
    publisher: { "@id": org["@id"] },
  };
  const graph = [website, software, library, person, org];
  if (kind === "corpus" || kind === "search" || path === "/" || path === "/corpus") {
    graph.push({
      "@type": "Dataset",
      name: SITE + " corpus",
      url: CANON_HOST + (path || "/"),
      creator: { "@id": person["@id"] },
      license: "https://www.apache.org/licenses/LICENSE-2.0",
    });
  }
  if (kind === "map" || path === "/map") {
    graph.push({ "@type": "Map", name: "Temporal Map", url: CANON_HOST + "/map", creator: { "@id": person["@id"] } });
  }
  if (kind === "runtime" || path === "/runtime") {
    graph.push({
      "@type": "SoftwareApplication",
      name: "aziel-runtime",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Cloudflare Workers",
      url: CANON_HOST + "/runtime",
      description,
      author: { "@id": person["@id"] },
      license: "https://www.apache.org/licenses/LICENSE-2.0",
      codeRepository: GITHUB_RUNTIME,
    });
  }
  if (kind === "about" || path === "/about") {
    graph.push({
      "@type": "ProfilePage",
      name: title || "About Aziel",
      url: CANON_HOST + "/about",
      mainEntity: { "@id": person["@id"] },
    });
  }
  if (kind === "scored" || kind === "how-its-scored" || path === "/how-its-scored") {
    graph.push({
      "@type": "WebPage",
      name: "How it's scored",
      url: CANON_HOST + "/how-its-scored",
      description,
      author: { "@id": person["@id"] },
    });
  }
  if (kind === "software" || path === "/software") {
    graph.push({
      "@type": "CollectionPage",
      name: "Software",
      url: CANON_HOST + "/software",
      description,
      author: { "@id": person["@id"] },
    });
  }
  const workLd = workNode(work, path);
  if (workLd) graph.push(workLd);
  return { "@context": "https://schema.org", "@graph": graph };
}

function pageKeywords(kind) {
  const base = [AUTHOR, AKA, SITE, "aziel-corpus"];
  if (kind === "software" || kind === "runtime") base.push("aziel-runtime", "AzielTether");
  if (kind === "scored" || kind === "how-its-scored" || kind === "record") base.push("SPRE", "CLCE", "PhysLing", "ZionPattern");
  return base.join(", ");
}

export function headMeta(opts) {
  const title = opts.title || SITE;
  const path = opts.path || "/";
  const kind = opts.kind || "";
  const description = opts.description || defaultDescription(kind);
  const url = CANON_HOST + path;
  const ld = jsonLd(title, path, kind, description, opts.work);
  const ldOpen = "<" + "script type=" + Q + "application/ld+json" + Q + ">";
  const ldClose = "</" + "script>";
  const image = opts.image || SHARE_IMAGE;
  return [
    meta("description", description),
    meta("keywords", pageKeywords(kind)),
    meta("robots", "index,follow"),
    meta("googlebot", "index,follow"),
    meta("author", AUTHOR),
    linkRel("canonical", url),
    prop("og:title", title + " — " + SITE),
    prop("og:description", description),
    prop("og:type", kind === "record" ? "article" : "website"),
    prop("og:url", url),
    prop("og:site_name", SITE),
    prop("og:image", image),
    prop("og:image:alt", SITE + " sigil. Author " + AUTHOR + "."),
    meta("twitter:card", "summary"),
    meta("twitter:title", title + " — " + SITE),
    meta("twitter:description", description),
    meta("twitter:image", image),
    linkRel("alternate", "/cite.json", " type=" + Q + "application/json" + Q),
    linkRel("alternate", "/llms.txt", " type=" + Q + "text/plain" + Q),
    linkRel("alternate", "/ai.txt", " type=" + Q + "text/plain" + Q),
    linkRel("alternate", "/openapi.json", " type=" + Q + "application/json" + Q + " title=" + Q + "OpenAPI" + Q),
    ldOpen + JSON.stringify(ld) + ldClose
  ].join("");
}
