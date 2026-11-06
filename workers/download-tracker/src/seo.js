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
import {
  PERSON_SAME_AS,
  PERSON_DESCRIPTION,
  personNode as lockedPersonNode,
  GODLOCK_HOME,
  ABOUT_DESCRIPTION,
  aboutPageNode,
  faqNode,
  whoFaqNode,
  LOCK_LINE,
  WHO_PATH as LOCKED_WHO_PATH,
  GITHUB_SECONDARY,
  X_PRIMARY,
  RUNTIME_HOME,
  FURNACE_NAME,
  FURNACE_HOME,
  FURNACE_AZIEL,
  UNSEAL_OFFICIAL,
  UNSEAL_NAME as UNSEAL_NAME_LOCK,
  sisterWebsiteNodes,
} from "./identity.js";

export { FURNACE_NAME, FURNACE_HOME, FURNACE_AZIEL, UNSEAL_OFFICIAL, RUNTIME_HOME };

export const CANON_HOST = "https://www.azielcorpuslibrary.net";
export const ABOUT_PATH = "/AzielEliab";
/** Pretty path for the Aziel handles tab. Not a redirect to /AzielEliab. */
export const AZIEL_HANDLES_PATH = "/aziel";
export const ABOUT_NAV_LABEL = "Aziel Eliab";
/** Public doors list. Handles on this site match that page. */
export const DOORS_URL = "https://www.azieleliab.com/doors";
export const UNSEAL_NAME = UNSEAL_NAME_LOCK;
export const UNSEAL_ORIGIN = "https://timetounsealthebook.net";
export const UNSEAL_AZIEL = UNSEAL_ORIGIN + "/aziel";
export const UNSEAL_COS_TIP = "5b3c878e";
/** Cap-7 is a design name. It is not an ICANN registration and not a public egress address. */
export const CAP7_PUBLIC = "Cap-7 is not an ICANN registration and is not a public egress address.";
/** Paid satellite stays held. This copy does not buy a domain, change DNS, or spend. */
export const PAID_SAT_PUBLIC = "Paid satellite stays HELD.";
/** Voynich / Unseal decryption flag stays false on this public door. */
export const DECRYPTION_PUBLIC = "decryption_complete stays false.";
/** This mirror stays unpublished as LIVE until those three gates clear. */
export const LIVE_HOLD_PUBLIC = "Not LIVE until Dual CLEAR, Aziel merge OK, and Cos.";
export const HDJ_HANDLE_NOTE = "He Didn't Jump is a handle, not a Live Node.";
export const UNSEAL_HANDLE_NOTE = "TimeToUnsealTheBook is a handle, not a Live Node.";
export const FURNACE_HANDLE_NOTE = "The Furnace Isn't Free is a handle, not a Live Node.";
export const GROWTH_ON_LINE = "Growth-ON. Allow.";
export const WHO_PATH = LOCKED_WHO_PATH;
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
/** Sister research archive. Not a Softwares-tab product. */
export const HEDIDNTJUMP_HOME = "https://www.hedidntjump.com/";
export const HEDIDNTJUMP_LABEL = "He Didn't Jump";
export const SHARE_IMAGE = CANON_HOST + "/sigil.png";
export const SITE_DESCRIPTION = "Aziel Digital Library by Aziel Eliab. Search the public MASTER across Aziel Library and Corpus. Temporal map, gazetteer, forensics, and hosted OCR.";

/** Visible ecosystem block (footer/nav). Not Softwares H1→list. */
export const ECOSYSTEM_HEADING = "Part of the Aziel Eliab ecosystem";
/**
 * Official sister mesh. Every footer, film door, and search-hub chrome lists these.
 * Softwares is the Aziel Runtime Worker. Furnace and Unseal use the confirmed public URLs.
 */
export const SISTER_SITES = Object.freeze([
  Object.freeze({ id: "official", label: "azieleliab.com", href: HUB_ORIGIN + "/" }),
  Object.freeze({ id: "corpus", label: "azielcorpuslibrary.net", href: CANON_HOST + "/" }),
  Object.freeze({ id: "godlock", label: "GodLock", href: GODLOCK_HOME }),
  Object.freeze({ id: "hedidntjump", label: HEDIDNTJUMP_LABEL, href: HEDIDNTJUMP_HOME }),
  Object.freeze({ id: "softwares", label: "Softwares", href: RUNTIME_HOME }),
  Object.freeze({ id: "furnace", label: FURNACE_NAME, href: FURNACE_HOME }),
  Object.freeze({ id: "furnace-aziel", label: "Furnace · Aziel", href: FURNACE_AZIEL }),
  Object.freeze({ id: "unseal", label: UNSEAL_NAME, href: UNSEAL_OFFICIAL }),
]);

export const ECOSYSTEM_LINKS = Object.freeze([
  Object.freeze({ href: HUB_ORIGIN + "/", label: "Official site" }),
  Object.freeze({ href: CANON_HOST + "/", label: "Corpus" }),
  Object.freeze({ href: GODLOCK_HOME, label: "GodLock" }),
  Object.freeze({ href: HEDIDNTJUMP_HOME, label: HEDIDNTJUMP_LABEL }),
  Object.freeze({ href: RUNTIME_HOME, label: "Softwares" }),
  Object.freeze({ href: FURNACE_HOME, label: FURNACE_NAME }),
  Object.freeze({ href: FURNACE_AZIEL, label: "Furnace · Aziel" }),
  Object.freeze({ href: UNSEAL_OFFICIAL, label: UNSEAL_NAME }),
  Object.freeze({ href: RUNTIME_GITHUB, label: "Runtime GitHub" }),
  Object.freeze({ href: RUNTIME_GLAMA, label: "Try on Glama", primary: true }),
]);

/**
 * Same-origin human tabs. Each one is a path crawlers can fetch.
 * Hashes are not the crawl path. /aziel is the handles tab.
 */
export const TAB_PATHS = Object.freeze([
  Object.freeze({ href: "/", label: "Film" }),
  Object.freeze({ href: "/search", label: "Search" }),
  Object.freeze({ href: "/aziel-library", label: "Aziel Library" }),
  Object.freeze({ href: "/corpus", label: "Corpus" }),
  Object.freeze({ href: "/voynich", label: "voynich" }),
  Object.freeze({ href: "/software", label: "Software" }),
  Object.freeze({ href: "/runtime", label: "Runtime" }),
  Object.freeze({ href: "/how-its-scored", label: "How it's scored" }),
  Object.freeze({ href: "/tree", label: "Tree" }),
  Object.freeze({ href: "/map", label: "Map" }),
  Object.freeze({ href: "/historical", label: "Historical" }),
  Object.freeze({ href: "/forensics", label: "Forensics" }),
  Object.freeze({ href: "/receipts", label: "Receipts" }),
  Object.freeze({ href: ABOUT_PATH, label: "Aziel Eliab" }),
  Object.freeze({ href: AZIEL_HANDLES_PATH, label: "Aziel" }),
  Object.freeze({ href: WHO_PATH, label: "Who" }),
  Object.freeze({ href: "/donate", label: "Donate" }),
  Object.freeze({ href: "/upload", label: "Upload" }),
]);

const TRADES_HOME = "https://trades-runtime.vibelock.workers.dev/";
const TRADES_MCP = "https://trades-runtime.vibelock.workers.dev/mcp";

/**
 * Public doors. Same list as azieleliab.com/doors, plus this site's handles tab
 * TimeToUnsealTheBook, and The Furnace Isn't Free. He Didn't Jump is a handle, not a Live Node.
 */
export const AZIEL_HANDLES = Object.freeze([
  Object.freeze({ id: "official", label: "azieleliab.com", href: HUB_ORIGIN + "/", official: true }),
  Object.freeze({ id: "github", label: "GitHub", href: GITHUB_AUTHOR }),
  Object.freeze({ id: "github-secondary", label: "Secondary source", href: GITHUB_SECONDARY }),
  Object.freeze({ id: "corpus", label: "Corpus", href: CANON_HOST + "/", official: true }),
  Object.freeze({ id: "corpus-aziel", label: "Corpus · AzielEliab", href: CANON_HOST + ABOUT_PATH }),
  Object.freeze({ id: "godlock", label: "GodLock", href: GODLOCK_HOME, official: true }),
  Object.freeze({ id: "hedidntjump", label: HEDIDNTJUMP_LABEL, href: HEDIDNTJUMP_HOME, official: true }),
  Object.freeze({ id: "runtime-hub", label: "Runtime", href: HUB_ORIGIN + "/runtime" }),
  Object.freeze({ id: "runtime", label: "Official Runtime", href: RUNTIME_ORIGIN + "/", official: true }),
  Object.freeze({ id: "glama", label: "Try on Glama", href: RUNTIME_GLAMA }),
  Object.freeze({ id: "trades", label: "Trades-Runtime", href: TRADES_HOME }),
  Object.freeze({ id: "trades-mcp", label: "Trades-Runtime MCP", href: TRADES_MCP }),
  Object.freeze({ id: "x", label: "X @AzielEliab", href: X_PRIMARY }),
  Object.freeze({ id: "furnace", label: FURNACE_NAME, href: FURNACE_HOME, official: true }),
  Object.freeze({ id: "furnace-aziel", label: "Furnace · Aziel", href: FURNACE_AZIEL, official: true }),
  Object.freeze({ id: "unseal-official", label: UNSEAL_NAME, href: UNSEAL_OFFICIAL, official: true }),
  Object.freeze({ id: "unseal", label: UNSEAL_NAME, href: UNSEAL_AZIEL }),
  Object.freeze({ id: "handles", label: "Corpus handles", href: CANON_HOST + AZIEL_HANDLES_PATH }),
]);

export function tabUrl(href) {
  const path = href || "/";
  return CANON_HOST + (path === "/" ? "/" : path);
}

export function unsealCite() {
  return {
    name: UNSEAL_NAME,
    official: UNSEAL_OFFICIAL,
    origin: UNSEAL_ORIGIN + "/",
    aziel: UNSEAL_AZIEL,
    cos_tip: UNSEAL_COS_TIP,
    live: false,
    live_node: false,
    paid_satellite: "HELD",
    cap7_public_icann: false,
    resolves_to_hub: false,
    decryption_complete: false,
    held_until: "Dual CLEAR + Aziel merge OK + Cos",
    note: UNSEAL_HANDLE_NOTE + " " + LIVE_HOLD_PUBLIC,
  };
}

export function furnaceCite() {
  return {
    name: FURNACE_NAME,
    home: FURNACE_HOME,
    aziel: FURNACE_AZIEL,
    live: false,
    live_node: false,
    paid_satellite: "HELD",
    cap7_public_icann: false,
    resolves_to_hub: false,
    decryption_complete: false,
    held_until: "Dual CLEAR + Aziel merge OK + Cos",
    note: FURNACE_HANDLE_NOTE + " " + LIVE_HOLD_PUBLIC,
  };
}

export function sisterSitesDoc() {
  return SISTER_SITES.map((row) => ({ id: row.id, label: row.label, href: row.href }));
}

export function azielHandlesDoc() {
  return {
    ok: true,
    product: "Aziel Corpus Library",
    site: "azielcorpuslibrary.net",
    author: AUTHOR,
    title: "Aziel handles",
    path: AZIEL_HANDLES_PATH,
    identity: AUTHOR,
    person_id: HUB_PERSON_ID,
    doors: DOORS_URL,
    handles: AZIEL_HANDLES.map((row) => {
      const out = { id: row.id, label: row.label, href: row.href };
      if (row.official) out.official = true;
      return out;
    }),
    sister_sites: sisterSitesDoc(),
    he_didnt_jump_is_live_node: false,
    unseal_is_live_node: false,
    furnace_is_live_node: false,
    cap7_is_icann: false,
    cap7_note: CAP7_PUBLIC,
    paid_satellite: "HELD",
    decryption_complete: false,
    live: false,
    live_gate: "Dual CLEAR + Aziel merge OK + Cos",
    growth: "ON",
    crawl: "Allow",
    ecosystem: ECOSYSTEM_HEADING,
  };
}

/** Shared crawler block for llms.txt and ai.txt. Paths are not hash-only. */
export function fleetSeoPlainBlock() {
  const paths = TAB_PATHS.map((tab) => "- " + tabUrl(tab.href)).join("\n");
  const handles = AZIEL_HANDLES.map((row) => "- " + row.href).join("\n");
  return "Growth-ON. Allow: /\n\n"
    + "Paths (not hash-only):\n\n"
    + paths + "\n\n"
    + "Handles, same public doors as " + DOORS_URL + " :\n\n"
    + handles + "\n\n"
    + "Sister sites: " + SISTER_SITES.map((row) => row.href).join(" · ") + "\n"
    + "He Didn't Jump is a handle. It is not a Live Node.\n"
    + "TimeToUnsealTheBook is a handle. It is not a Live Node.\n"
    + "The Furnace Isn't Free is a handle. It is not a Live Node.\n"
    + "Cap-7: not an ICANN name. Paid satellite stays HELD.\n"
    + "decryption_complete: false\n"
    + LIVE_HOLD_PUBLIC + "\n"
    + "Person: " + HUB_PERSON_ID + "\n"
    + "Ecosystem: " + ECOSYSTEM_HEADING + " (" + HUB_ORIGIN + "/)\n";
}

/** Shared colophon. Ecosystem mark, crawl files, pretty paths. No 15:20 chrome. */
export function siteFooterHtml() {
  const items = ECOSYSTEM_LINKS.map((l) => {
    const cls = l.primary ? "button" : "";
    const extra = cls ? " class=" + Q + cls + Q : "";
    return "<li><a" + extra + " href=" + Q + esc(l.href) + Q + " rel=" + Q + "noopener noreferrer" + Q + ">" + esc(l.label) + "</a></li>";
  }).join("");
  const paths = TAB_PATHS.map((tab) => "<a href=" + Q + esc(tab.href) + Q + ">" + esc(tab.href) + "</a>").join(" · ");
  const honesty = GROWTH_ON_LINE + " " + CAP7_PUBLIC + " " + PAID_SAT_PUBLIC + " " + DECRYPTION_PUBLIC + " " + LIVE_HOLD_PUBLIC + " " + HDJ_HANDLE_NOTE + " " + UNSEAL_HANDLE_NOTE + " " + FURNACE_HANDLE_NOTE;
  return "<footer class=\"ecosystem\" id=\"corpus-site-footer\" aria-label=\"" + esc(ECOSYSTEM_HEADING) + "\">"
    + "<p class=\"eco-head\">" + esc(ECOSYSTEM_HEADING) + "</p>"
    + "<nav class=\"ecosystem-nav\"><ul class=\"ecosystem-list\">" + items + "</ul></nav>"
    + "<p class=\"crawl-links\"><a href=\"/cite.json\">cite.json</a> · <a href=\"/llms.txt\">llms.txt</a> · <a href=\"/ai.txt\">ai.txt</a> · <a href=\"/sitemap.xml\">sitemap</a> · <a href=\"/person.jsonld\">person</a></p>"
    + "<p class=\"paths\">Paths: " + paths + ".</p>"
    + "<p class=\"honesty\">" + esc(honesty) + "</p>"
    + "</footer>";
}

/** Visible sister mesh for film doors and the search hub header. */
export function sisterMeshHtml(className) {
  const cls = className || "sisters";
  const items = SISTER_SITES.map((row) => "<a href=" + Q + esc(row.href) + Q + " rel=" + Q + "noopener noreferrer" + Q + ">" + esc(row.label) + "</a>").join("");
  return "<nav class=" + Q + esc(cls) + Q + " aria-label=" + Q + "Sister sites" + Q + ">" + items + "</nav>";
}

/** Unique <title> / OG / Twitter strings. Visible H1s stay in page bodies. */
export function documentTitle(kind, title) {
  if (kind === "search") return SITE + " — Public MASTER by " + AUTHOR;
  if (kind === "software") return "Softwares — " + AUTHOR + " catalog | " + SITE;
  if (kind === "runtime") return RUNTIME_TITLE;
  if (kind === "about") return "About " + AUTHOR + " | " + SITE;
  if (kind === "handles") return "Aziel handles — " + SITE;
  if (kind === "who") return "Who is Aziel Eliab";
  const t = String(title || "").trim();
  if (t && t !== SITE) return t + " — " + SITE;
  return SITE + " — Public MASTER by " + AUTHOR;
}

function ogType(kind) {
  if (kind === "record") return "article";
  if (kind === "about") return "profile";
  return "website";
}

/** Permanent Location for legacy /about and case-folded /AzielEliab. /aziel stays the handles tab. */
export function aboutRedirectFrom(path) {
  const p = String(path || "").replace(/\/+$/, "") || "/";
  if (p === ABOUT_PATH) return null;
  if (p.toLowerCase() === AZIEL_HANDLES_PATH) return null;
  if (p === "/about" || p === "/aboutme") return ABOUT_PATH;
  if (p.toLowerCase() === "/azieleliab") return ABOUT_PATH;
  return null;
}

/** Case-folded /Aziel lands on /aziel. It does not become /AzielEliab. */
export function handlesRedirectFrom(path) {
  const p = String(path || "").replace(/\/+$/, "") || "/";
  if (p === AZIEL_HANDLES_PATH) return null;
  if (p.toLowerCase() === AZIEL_HANDLES_PATH) return AZIEL_HANDLES_PATH;
  return null;
}

export const FORENSICS_PATH = "/forensics";

/** Permanent Location for legacy /intelligence. */
export function forensicsRedirectFrom(path) {
  const p = String(path || "").replace(/\/+$/, "") || "/";
  if (p === FORENSICS_PATH) return null;
  if (p.toLowerCase() === "/intelligence") return FORENSICS_PATH;
  return null;
}
const Q = String.fromCharCode(34);

/** Absolute canonical path: query strings and fragments stripped. */
export function canonicalPath(path) {
  let p = String(path || "/").split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = "/" + p;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

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
  const locked = lockedPersonNode();
  return {
    ...locked,
    description: PERSON_DESCRIPTION,
    sameAs: PERSON_SAME_AS.slice(),
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
    creator: personRef(),
    publisher: personRef(),
    sameAs: [GITHUB_REPO, HUB_ORIGIN + "/", HUB_ORIGIN + "/runtime/", GODLOCK_HOME, HEDIDNTJUMP_HOME, RUNTIME_HOME, FURNACE_HOME, FURNACE_AZIEL, UNSEAL_OFFICIAL],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: CANON_HOST + "/search?q={search_term_string}",
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
  if (kind === "forensics" || kind === "intelligence") return "Hosted forensics, OCR, SpectralLock lenses, and Whisper transcription for Aziel Digital Library. SpectralLock leftover-bytes recover is honest; /v1/unredact cites revision_graph; /v1/recover is universal NO-LIE LIVE/SLOT; /v1/handwriting is ink heuristics; opaque empty refuses SL-UNREDACT-OPAQUE; corpus OCR recovers leftover bytes honestly. Author Aziel Eliab.";
  if (kind === "ocr") return "Hosted OCR and advisory SpectralLock lenses for Aziel Digital Library. Leftover container bytes recover honestly; /v1/unredact revision graph; /v1/recover universal (NO-LIE LIVE/SLOT); /v1/handwriting ink heuristics; opaque rewrite refuses SL-UNREDACT-OPAQUE; corpus OCR recovers leftover bytes honestly. Author Aziel Eliab.";
  if (kind === "historical") return "Historical geography layers for Aziel Digital Library. Author Aziel Eliab.";
  if (kind === "verify") return "Integrity verification of the hosted Aziel Digital Library MASTER. Author Aziel Eliab.";
  if (kind === "corpus") return "Public corpus of Aziel Digital Library. Search published records. Author Aziel Eliab.";
  if (kind === "upload") return "Upload to Aziel Digital Library. Anyone may file Corpus; the operator files Aziel Library. Author Aziel Eliab.";
  if (kind === "aziel-library") return "Aziel Library — royal-purple operator collection of work by Aziel Eliab on Aziel Digital Library.";
  if (kind === "runtime") return runtimeDescription(runtimeVersion);
  if (kind === "software") return softwareDescription(runtimeVersion);
  if (kind === "about") return LOCK_LINE + " About Aziel Eliab, publisher of Aziel Digital Library on this site. " + ABOUT_DESCRIPTION + " Signed Aziel Elroi Eliab. GodLock is one product on that record.";
  if (kind === "handles") return "Public handles for Aziel Eliab. Same doors as " + DOORS_URL + ". " + HDJ_HANDLE_NOTE + " " + UNSEAL_HANDLE_NOTE + " " + FURNACE_HANDLE_NOTE + " " + CAP7_PUBLIC + " " + PAID_SAT_PUBLIC + " " + DECRYPTION_PUBLIC + " " + LIVE_HOLD_PUBLIC;
  if (kind === "who") return LOCK_LINE;
  if (kind === "scored" || kind === "how-its-scored") return "How Aziel Digital Library scores records: the triad is always published (TRIAD_V3 36-cycle mean of applicable factors), AZCoherence second-pass triad coherence (peer AZ-CLCE), and ZionPattern meaning (75 is intentional suppression confidence; lower is more natural). Author Aziel Eliab.";
  if (kind === "pattern") return "Pattern clusters across Aziel Digital Library domains, subjects, and keywords. Author Aziel Eliab.";
  if (kind === "donate") return "AZL-DONATE-1.0. Donate to Aziel Digital Library. Static door. Exodus rails. No Worker KV. Not a catalog item. Author Aziel Eliab.";
  if (kind === "search") return SITE_DESCRIPTION + " Author Aziel Eliab.";
  if (kind === "record") return "Public record in Aziel Digital Library. Author Aziel Eliab.";
  return "Aziel Digital Library by Aziel Eliab. Search, map, gazetteer, forensics, and hosted OCR on the public MASTER.";
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
  if (work.dateCreated) node.dateCreated = isoDate(work.dateCreated);
  else if (work.datePublished) node.dateCreated = isoDate(work.datePublished);
  if (work.dateModified) node.dateModified = isoDate(work.dateModified);
  if (work.record_id) {
    node.identifier = work.record_id;
    node.sameAs = [
      CANON_HOST + "/record/" + work.record_id + "/metadata.json",
      CANON_HOST + "/record/" + work.record_id + ".json",
      CANON_HOST + "/record/" + work.record_id + "/llms.txt",
      CANON_HOST + "/record/" + work.record_id + "/cite.json",
    ];
    node.encoding = {
      "@type": "MediaObject",
      contentUrl: CANON_HOST + "/file/" + work.record_id,
      sha256: work.content_sha256 || undefined,
    };
  }
  const subjects = String(work.subjects || work.keywords || work.domain || "")
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (subjects.length) {
    node.about = subjects;
    node.keywords = subjects.join(", ");
  }
  const excerpt = String(work.content || work.description || "").replace(/\s+/g, " ").trim();
  if (excerpt) {
    node.description = excerpt.slice(0, 8000);
    node.abstract = node.description;
  }
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
  const withWorks = kind === "about" || path === ABOUT_PATH;
  const person = withWorks ? lockedPersonNode({ works: true }) : personNode();
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
  const graph = [website, ...sisterWebsiteNodes(), software, library, person, org];
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
    const hubPath = kind === "search" && path && path !== "/" ? path : "/";
    graph.push({
      "@type": "CollectionPage",
      "@id": CANON_HOST + (hubPath === "/" ? "/#homepage" : hubPath + "#search"),
      name: SITE,
      url: CANON_HOST + hubPath,
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
      sameAs: [HUB_ORIGIN + "/runtime/", CANON_HOST + "/runtime", RUNTIME_ORIGIN + "/", GITHUB_RUNTIME, RUNTIME_GLAMA, RUNTIME_DOCS],
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
  if (kind === "handles" || path === AZIEL_HANDLES_PATH) {
    graph.push({
      "@type": "WebPage",
      "@id": CANON_HOST + AZIEL_HANDLES_PATH + "#page",
      name: "Aziel handles",
      url: CANON_HOST + AZIEL_HANDLES_PATH,
      description: defaultDescription("handles"),
      isPartOf: { "@id": WEBSITE_ID },
      author: who,
      mainEntity: {
        "@type": "ItemList",
        name: "Aziel Eliab handles",
        itemListElement: AZIEL_HANDLES.map((row, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: row.label,
          url: row.href,
        })),
      },
    });
    graph.push(breadcrumbNode([
      { name: SITE, item: CANON_HOST + "/" },
      { name: "Aziel handles", item: CANON_HOST + AZIEL_HANDLES_PATH },
    ]));
  }
  if (kind === "about" || path === ABOUT_PATH) {
    graph.push(aboutPageNode(description));
    graph.push(faqNode());
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
  if (kind === "who" || path === WHO_PATH) {
    graph.push(whoFaqNode());
    graph.push({
      "@type": "WebPage",
      "@id": CANON_HOST + WHO_PATH + "#page",
      name: "Who is Aziel Eliab",
      url: CANON_HOST + WHO_PATH,
      description: LOCK_LINE,
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: who,
      about: who,
      author: who,
    });
    graph.push(breadcrumbNode([
      { name: SITE, item: CANON_HOST + "/" },
      { name: "Who is Aziel Eliab", item: CANON_HOST + WHO_PATH },
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
  const base = [AUTHOR, AKA, "Elias Artista", SITE, "aziel-corpus"];
  if (kind === "about") base.push("GodLock");
  if (kind === "handles") base.push("Aziel handles", "TimeToUnsealTheBook");
  if (kind === "software" || kind === "runtime") base.push("aziel-runtime", "FragGate", "AzielTether", "GodLock", "AZCoherence", "azcoherence");
  if (kind === "scored" || kind === "how-its-scored" || kind === "record") base.push("SPRE", "CLCE", "PhysLing", "ZionPattern", "AZCoherence", "azcoherence", "AZ-CLCE");
  return base.join(", ");
}

/** JSON-LD graph tag. Keep on the page; homepage chrome puts it after the LCP fold. */
export function jsonLdScript(opts) {
  const title = (opts && opts.title) || SITE;
  const path = (opts && opts.path) || "/";
  const kind = (opts && opts.kind) || "";
  const runtimeVersion = opts && opts.runtimeVersion;
  const description = (opts && opts.description) || defaultDescription(kind, runtimeVersion);
  const ld = jsonLd(title, path, kind, description, opts && opts.work, runtimeVersion);
  const ldOpen = "<" + "script type=" + Q + "application/ld+json" + Q + ">";
  const ldClose = "</" + "script>";
  return ldOpen + JSON.stringify(ld) + ldClose;
}

export function headMeta(opts) {
  const title = opts.title || SITE;
  const path = opts.path || "/";
  const kind = opts.kind || "";
  const runtimeVersion = opts.runtimeVersion;
  const description = opts.description || defaultDescription(kind, runtimeVersion);
  const seoTitle = documentTitle(kind, title);
  const url = CANON_HOST + canonicalPath(path);
  const image = opts.image || SHARE_IMAGE;
  const imageAlt = SITE + " rose-star brand mark. Author " + AUTHOR + ".";
  const tags = [
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
    linkRel("alternate", "/person.jsonld", " type=" + Q + "application/ld+json" + Q),
    linkRel("alternate", "/identity.jsonld", " type=" + Q + "application/ld+json" + Q),
    linkRel("alternate", "/graph.jsonld", " type=" + Q + "application/ld+json" + Q),
    linkRel("alternate", "/who", " type=" + Q + "text/html" + Q + " title=" + Q + "who" + Q),
    linkRel("alternate", "/who-is-aziel-eliab.txt", " type=" + Q + "text/plain" + Q + " title=" + Q + "who-is" + Q),
    linkRel("alternate", "/.well-known/aziel.json", " type=" + Q + "application/json" + Q),
    linkRel("alternate", "/.well-known/person.jsonld", " type=" + Q + "application/ld+json" + Q),
    linkRel("alternate", "/llms.txt", " type=" + Q + "text/plain" + Q + " title=" + Q + "llms.txt" + Q),
    linkRel("alternate", "/help.txt", " type=" + Q + "text/plain" + Q + " title=" + Q + "help" + Q),
    linkRel("alternate", "/addendum.txt", " type=" + Q + "text/plain" + Q + " title=" + Q + "addendum" + Q),
    linkRel("alternate", "/ai.txt", " type=" + Q + "text/plain" + Q),
    linkRel("alternate", "/openapi.json", " type=" + Q + "application/json" + Q + " title=" + Q + "OpenAPI" + Q),
    linkRel("alternate", "/runtime/openapi.json", " type=" + Q + "application/json" + Q + " title=" + Q + "Runtime OpenAPI" + Q),
    linkRel("alternate", "/runtime/mcp", " type=" + Q + "application/json" + Q + " title=" + Q + "Runtime MCP" + Q),
    linkRel("alternate", "/.well-known/mcp.json", " type=" + Q + "application/json" + Q + " title=" + Q + "MCP discovery" + Q),
    linkRel("alternate", "/mcp.json", " type=" + Q + "application/json" + Q + " title=" + Q + "MCP discovery" + Q),
    linkRel("alternate", "/mcp", " type=" + Q + "application/json" + Q + " title=" + Q + "Library MCP" + Q),
    linkRel("alternate", "/bridge.json", " type=" + Q + "application/json" + Q + " title=" + Q + "Cap-7 bridge cite" + Q),
    linkRel("alternate", "/survival", " type=" + Q + "application/json" + Q + " title=" + Q + "BAN-SURVIVAL-1.0" + Q),
    linkRel("alternate", "/v1/survival", " type=" + Q + "application/json" + Q + " title=" + Q + "BAN-SURVIVAL-1.0" + Q),
    linkRel("alternate", "/runtime/survival", " type=" + Q + "application/json" + Q + " title=" + Q + "BAN-SURVIVAL-1.0" + Q),
    linkRel("alternate", "/runtime/v1/survival", " type=" + Q + "application/json" + Q + " title=" + Q + "BAN-SURVIVAL-1.0" + Q),
    linkRel("alternate", "/v1/products", " type=" + Q + "application/json" + Q + " title=" + Q + "azcorpus / azlibrary products" + Q),
    linkRel("alternate", "/v1/design-pack", " type=" + Q + "application/json" + Q + " title=" + Q + "Cap-7 design packs" + Q),
    linkRel("alternate", "/v1/software", " type=" + Q + "application/json" + Q + " title=" + Q + "Live software catalog" + Q),
    linkRel("alternate", "/v1/mesh", " type=" + Q + "application/json" + Q + " title=" + Q + "Suite mesh / Live Nodes (human users + uses)" + Q),
    linkRel("alternate", "/runtime/v1/mesh", " type=" + Q + "application/json" + Q + " title=" + Q + "Runtime mesh" + Q),
    linkRel("alternate", "/runtime/llms.txt", " type=" + Q + "text/plain" + Q + " title=" + Q + "Runtime llms.txt" + Q),
    linkRel("alternate", "/runtime/cite.json", " type=" + Q + "application/json" + Q + " title=" + Q + "Runtime cite.json" + Q),
    linkRel("sitemap", "/sitemap.xml"),
    linkRel("sitemap", "/sitemap-index.xml"),
    linkRel("service", "/runtime/v1/fraggate", " title=" + Q + "FragGate" + Q),
    ...(kind === "about" || path === ABOUT_PATH || kind === "who" || path === WHO_PATH ? [
      linkRel("me", HUB_ORIGIN + "/"),
      linkRel("me", HUB_PERSON_ID),
      linkRel("me", GODLOCK_IDENTITY),
      linkRel("me", GITHUB_AUTHOR),
      linkRel("me", GITHUB_SECONDARY),
      linkRel("me", GITHUB_REPO),
    ] : []),
  ];
  if (kind === "record" && opts.work && opts.work.record_id) {
    const id = String(opts.work.record_id);
    tags.push(
      linkRel("alternate", "/record/" + id + "/llms.txt", " type=" + Q + "text/plain" + Q + " title=" + Q + "llms.txt" + Q),
      linkRel("alternate", "/record/" + id + "/cite.json", " type=" + Q + "application/json" + Q + " title=" + Q + "cite.json" + Q)
    );
  }
  if (opts.includeJsonLd !== false) tags.push(jsonLdScript(opts));
  return tags.join("");
}
