/** Crawl/index metadata for hosted MASTER pages. Author: Aziel Eliab. */
export const CANON_HOST = "https://www.azielcorpuslibrary.net";
const SITE = "Aziel Digital Library";
const AUTHOR = "Aziel Eliab";
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

export function defaultDescription(kind) {
  if (kind === "map") return "Temporal map of Aziel Digital Library. Event pins from corpus evidence. Author Aziel Eliab.";
  if (kind === "gazetteer") return "World gazetteer for Aziel Digital Library. GeoNames CC BY 4.0 place lookup. Author Aziel Eliab.";
  if (kind === "tree") return "Evidence-based corpus tree for Aziel Digital Library. Author Aziel Eliab.";
  if (kind === "health") return "Live health dashboard for Aziel Digital Library hosted MASTER. Author Aziel Eliab.";
  if (kind === "intelligence") return "Hosted intelligence and OCR for Aziel Digital Library. Author Aziel Eliab.";
  if (kind === "historical") return "Historical geography layers for Aziel Digital Library. Author Aziel Eliab.";
  if (kind === "verify") return "Integrity verification of the hosted Aziel Digital Library MASTER. Author Aziel Eliab.";
  if (kind === "corpus") return "Public corpus of Aziel Digital Library. Search published records. Author Aziel Eliab.";
  return "Aziel Digital Library by Aziel Eliab. Search, map, gazetteer, intelligence, and hosted OCR on the public MASTER.";
}

function jsonLd(title, path, kind, description) {
  const url = CANON_HOST + (path || "/");
  const org = { "@type": "Organization", "name": AUTHOR, "url": CANON_HOST + "/" };
  const website = { "@type": "WebSite", "name": SITE, "url": CANON_HOST + "/", "description": description, "author": org };
  const software = { "@type": "SoftwareApplication", "name": SITE, "applicationCategory": "DigitalLibrary", "operatingSystem": "Web", "url": CANON_HOST + "/", "author": org, "license": "https://www.apache.org/licenses/LICENSE-2.0" };
  const library = { "@type": "DigitalLibrary", "name": SITE, "url": CANON_HOST + "/", "creator": org };
  const graph = [website, software, library, org];
  if (kind === "corpus" || kind === "search" || path === "/" || path === "/corpus") {
    graph.push({ "@type": "Dataset", "name": SITE + " corpus", "url": CANON_HOST + (path || "/"), "creator": org, "license": "https://www.apache.org/licenses/LICENSE-2.0" });
  }
  if (kind === "map" || path === "/map") {
    graph.push({ "@type": "Map", "name": "Temporal Map", "url": CANON_HOST + "/map", "creator": org });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function headMeta(opts) {
  const title = opts.title || SITE;
  const path = opts.path || "/";
  const kind = opts.kind || "";
  const description = opts.description || defaultDescription(kind);
  const url = CANON_HOST + path;
  const ld = jsonLd(title, path, kind, description);
  const ldOpen = "<" + "script type=" + Q + "application/ld+json" + Q + ">";
  const ldClose = "</" + "script>";
  return [
    meta("description", description),
    meta("robots", "index,follow"),
    meta("googlebot", "index,follow"),
    meta("author", AUTHOR),
    linkRel("canonical", url),
    prop("og:title", title + " — " + SITE),
    prop("og:description", description),
    prop("og:type", "website"),
    prop("og:url", url),
    prop("og:site_name", SITE),
    meta("twitter:card", "summary"),
    meta("twitter:title", title + " — " + SITE),
    meta("twitter:description", description),
    linkRel("alternate", "/cite.json", " type=" + Q + "application/json" + Q),
    linkRel("alternate", "/llms.txt", " type=" + Q + "text/plain" + Q),
    linkRel("alternate", "/openapi.json", " type=" + Q + "application/json" + Q + " title=" + Q + "OpenAPI" + Q),
    ldOpen + JSON.stringify(ld) + ldClose
  ].join("");
}

