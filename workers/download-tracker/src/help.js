/**
 * Human help / addendum txt routes.
 * Additive discoverability. Machine crawl indexes stay /llms.txt · /ai.txt · /cite.json.
 * Author: Aziel Eliab only. Person @id https://www.azieleliab.com/#aziel.
 */
import { HOST } from "./runtime-copy.js";
import { PERSON_ID } from "./identity.js";

export const AUTHOR = "Aziel Eliab";
export const HELP_INDEX = "/help.txt";
export const ADDENDUM = "/addendum.txt";
export const HELP_SCORES = "/help/how-to-read-scores.txt";
export const HELP_CITE = "/help/how-to-cite.txt";
export const HELP_UPLOADS = "/help/uploads.txt";

export const HELP_PATHS = Object.freeze([
  HELP_INDEX,
  ADDENDUM,
  HELP_SCORES,
  HELP_CITE,
  HELP_UPLOADS,
]);

export function isHelpPath(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  return HELP_PATHS.includes(path);
}

function header(title) {
  return [
    "# " + title,
    "",
    "Author: " + AUTHOR,
    "Person @id: " + PERSON_ID,
    "Library: " + HOST + "/",
    "",
  ].join("\n");
}

export function helpIndexTxt() {
  return header("Aziel Digital Library — human help")
    + "Plain-language help for people using the library. Machine indexes stay "
    + HOST + "/llms.txt · " + HOST + "/ai.txt · " + HOST + "/cite.json.\n\n"
    + "## Start here\n"
    + "- Home: " + HOST + "/\n"
    + "- Softwares: " + HOST + "/software\n"
    + "- Upload: " + HOST + "/upload\n"
    + "- How records are scored: " + HOST + "/how-its-scored\n"
    + "- Read scores: " + HOST + HELP_SCORES + "\n"
    + "- Cite a record: " + HOST + HELP_CITE + "\n"
    + "- Uploads: " + HOST + HELP_UPLOADS + "\n"
    + "- Addendum: " + HOST + ADDENDUM + "\n\n"
    + "## Find records\n"
    + "Search the public MASTER from " + HOST + "/ or " + HOST + "/search.\n"
    + "Browse Aziel Library: " + HOST + "/aziel-library\n"
    + "Browse Corpus: " + HOST + "/corpus\n"
    + "Open a record by id: " + HOST + "/record/{AZDOC-…}\n"
    + "Packed machine index: " + HOST + "/v1/library-index\n"
    + "Search API: " + HOST + "/v1/search?q=\n"
    + "Record sitemap: " + HOST + "/sitemap-records.xml\n\n"
    + "Each public record has a canonical HTML page, a download at /file/{AZDOC-…},\n"
    + "and Schema.org metadata at /record/{AZDOC-…}/metadata.json.\n\n"
    + "## Scores you will see\n"
    + "The triad is always the primary published score on a scored record.\n"
    + "TRIAD_V3 public score is the 36-cycle mean of applicable factors (physics, linguistics, bayesian, truth_formula, CLCE, SPRE).\n"
    + "Ingest always runs that path. Stored papers remint via GET /v1/recalibrate-all (repeat ?all=1 until done:true; single-walker lock TTL 90s).\n"
    + "SPRE, CLCE, and PhysLing appear when that component applies to the document's concept. N/A components are omitted (never shown as 0).\n"
    + "ZionPattern appears when the document qualifies.\n"
    + "Details: " + HOST + HELP_SCORES + " and " + HOST + "/how-its-scored.\n\n"
    + "## Per-record LLM access points\n"
    + "Every record also has machine surfaces for SEO and indexing discovery:\n"
    + "  GET " + HOST + "/record/{AZDOC-…}/llms.txt     text/plain positive definition of that record\n"
    + "  GET " + HOST + "/record/{AZDOC-…}/cite.json    application/json structured cite\n"
    + "They are generated from the packed index and public metadata. They work for existing\n"
    + "uploads and for new uploads as soon as the record is filed. The record HTML page links\n"
    + "them with rel=alternate. They are listed on sitemap-records.xml.\n\n"
    + "## Softwares\n"
    + "The Software tab lists live product cards from the runtime catalog. "
    + "Softwares tab count is 42 (placements included). 41 live advisory engines. "
    + "Isolation software_count is 33. Do not equate those counts. "
    + "Counted downloads stay on each product Worker.\n\n"
    + "## Ask Jeeves\n"
    + "Ask Jeeves is FragGate op jeeves on aziel-corpus (suite help). "
    + "software_tab is false. It is not a Softwares-tab card. "
    + "It answers from filed public text. POST " + HOST + "/v1/jeeves/chat.\n"
    + "Mesh outlet: " + HOST + "/v1/mesh/outlet\n"
    + "Site inventory: " + HOST + "/v1/inventory\n\n"
    + "Growth-ON. AI crawlers stay Allowed, including GPTBot. NO-LIE. Do not invent DOIs.\n";
}

export function addendumTxt() {
  return header("Aziel Digital Library — addendum")
    + "Companion to /help.txt. How to use this MASTER library.\n"
    + "This addendum sits beside the site-wide crawl files. Machine indexes stay /llms.txt · /ai.txt · /cite.json.\n\n"
    + "## Two shelves\n"
    + "Aziel Library is the operator collection of Aziel Eliab's published work (royal purple). "
    + "Corpus is the public Lamb Lens shelf. Anyone may browse both. "
    + "Upload at " + HOST + "/upload — operator session files to Aziel Library; everyone else files to Corpus.\n\n"
    + "## Read a record\n"
    + "Search from " + HOST + "/ or " + HOST + "/search. Open " + HOST + "/record/{AZDOC-…}. "
    + "The triad is always shown first (TRIAD_V3 36-cycle mean). SPRE, CLCE, PhysLing, and Truth Formula appear when that component applies. "
    + "See " + HOST + HELP_SCORES + " and " + HOST + "/how-its-scored.\n\n"
    + "Records stay findable as HTML (/record/{AZDOC-…}), metadata.json, file download, and per-record "
    + "/record/{AZDOC-…}/llms.txt plus /record/{AZDOC-…}/cite.json.\n\n"
    + "## Cite\n"
    + "Use the record id (AZDOC-…) plus " + HOST + "/record/{AZDOC-…}. "
    + "Per-record machine cite: " + HOST + "/record/{AZDOC-…}/cite.json. "
    + "Site-wide machine cite: " + HOST + "/cite.json. Person @id " + PERSON_ID + ". "
    + "Details: " + HOST + HELP_CITE + ".\n\n"
    + "## Softwares\n"
    + "Product cards: " + HOST + "/software · live catalog " + HOST + "/v1/software. "
    + "Runtime door: " + HOST + "/runtime.\n\n"
    + "Uploads: " + HOST + HELP_UPLOADS + ".\n"
    + "Help index: " + HOST + HELP_INDEX + ".\n";
}

export function howToReadScoresTxt() {
  return header("How to read scores")
    + "Human guide. HTML explainer: " + HOST + "/how-its-scored\n\n"
    + "## Triad (always)\n"
    + "Every scored record publishes a triad first. TRIAD_V3 public combined is the 36-cycle mean: mean of all ordered pairings factor_i × factor_j among applicable factors of physics, linguistics, bayesian, truth_formula, CLCE, SPRE (36 when all six apply). geometric_mean_applicable of SPRE/CLCE/PLR is stored beside it. Display is round(combined × 100) and is never written back into combined. triad_raw freezes to the content SHA-256 at first REVIEW_SCORE. Ingest always runs V3. Stored papers remint at " + HOST + "/v1/recalibrate-all. API: " + HOST + "/v1/review?record_id=\n\n"
    + "## Component scores (when they apply)\n"
    + "SPRE, CLCE, and PhysLing stay stored for audit. They appear on the record page and cite when they apply to the document's concept. N/A components are omitted (never shown as 0).\n"
    + "- SPRE — provenance completeness (title, body, hash, structure, author, evidence language). Applies when the record is a filed object with provenance. physics_language and independent_source are audit flags, not silent rank boosters.\n"
    + "- CLCE — structural match (claims↔evidence + headings + verified-file bit). Applies when claims exist beside title or file. Token Jaccard is audit-only. SHA-256 hex is never layer P. Omit if no claims (never 0).\n"
    + "- PhysLing — equal-weight physics × linguistics. Applies when the document makes physics-evaluable claims (unit span or conservation/causal verb + quantity) or is energy/engineering. Bare energy / force / forensic do not qualify.\n"
    + "- Truth Formula — Cover-Up Truth Formula v1/v2 (ΔT / suppression / backpull) on archival/cover-up papers; documented subset on ordinary Softwares/AZDOC filings; omit if N/A.\n"
    + "- Bayesian — unranked likelihood of internal consistency (not world accuracy). Never a shelf sort key.\n\n"
    + "## Other published numbers\n"
    + "AZCoherence is a second-pass triad coherence review (PASS / FLAG / NEUTRALIZE / REFUSE).\n"
    + "ZionPattern Solver is a secondary public score on qualifying historical / research / investigation / crime documents.\n"
    + "Bayesian posterior is unranked metadata for peer review. It never sorts the shelf.\n"
    + "Possibility is a labeled HEURISTIC over lattice time×geo pins. API: " + HOST + "/v1/possibility?record_id=\n\n"
    + "Record page: " + HOST + "/record/{AZDOC-…}\n"
    + "Per-record LLM: " + HOST + "/record/{AZDOC-…}/llms.txt · " + HOST + "/record/{AZDOC-…}/cite.json\n"
    + "Upload: " + HOST + "/upload\n"
    + "Softwares: " + HOST + "/software\n";
}

export function howToCiteTxt() {
  return header("How to cite")
    + "Cite published records and Softwares by id and URL. Do not invent DOIs.\n\n"
    + "## Library\n"
    + "Eliab, Aziel. (2026). Aziel Digital Library v2.7.0 [Software]. Apache-2.0. " + HOST + "/\n"
    + "Person @id: " + PERSON_ID + "\n"
    + "Machine cite: " + HOST + "/cite.json\n\n"
    + "## A record\n"
    + "Use the AZDOC id on the record page: " + HOST + "/record/{AZDOC-…}\n"
    + "Public metadata: " + HOST + "/record/{AZDOC-…}/metadata.json\n"
    + "Per-record LLM text: " + HOST + "/record/{AZDOC-…}/llms.txt\n"
    + "Per-record structured cite: " + HOST + "/record/{AZDOC-…}/cite.json\n"
    + "The triad is the primary published score. Name SPRE, CLCE, or PhysLing only when they appear on that record.\n\n"
    + "## Scores\n"
    + "Explain the numbers with " + HOST + "/how-its-scored and " + HOST + HELP_SCORES + ".\n\n"
    + "## Softwares\n"
    + "Cite the Software tab " + HOST + "/software plus the product Worker / GitHub listed on the card. "
    + "Live catalog: " + HOST + "/v1/software.\n\n"
    + "Upload new public work at " + HOST + "/upload.\n"
    + "Uploads help: " + HOST + HELP_UPLOADS + ".\n"
    + "Help index: " + HOST + HELP_INDEX + ".\n";
}

export function helpUploadsTxt() {
  return header("Aziel Digital Library — uploads")
    + "Anyone may file Corpus (Lamb Lens) from " + HOST + "/upload or the homepage ingest form.\n"
    + "The operator files Aziel Library. Signed-in JSON ingest writes Corpus; the operator token\n"
    + "writes Aziel Library on this hub.\n\n"
    + "After a successful upload the record is immediately findable at:\n"
    + "  HTML          " + HOST + "/record/{AZDOC-…}\n"
    + "  Metadata      " + HOST + "/record/{AZDOC-…}/metadata.json\n"
    + "  LLM text      " + HOST + "/record/{AZDOC-…}/llms.txt\n"
    + "  Cite JSON     " + HOST + "/record/{AZDOC-…}/cite.json\n"
    + "  File          " + HOST + "/file/{AZDOC-…}\n\n"
    + "Those machine surfaces are built from the live metadata and packed index. A new upload\n"
    + "is live from metadata immediately.\n\n"
    + "Scoring runs on ingest through TRIAD V3 only. A paper does not publish a score on any other path.\n"
    + "SPRE, CLCE, PhysLing, and Truth Formula are published when they apply to the filed concept.\n"
    + "N/A components are omitted (never shown as 0).\n"
    + "Stored papers remint at " + HOST + "/v1/recalibrate-all (repeat ?all=1 until done:true).\n\n"
    + "Human help: " + HOST + HELP_INDEX + "\n"
    + "How it's scored: " + HOST + "/how-its-scored\n"
    + "Read scores: " + HOST + HELP_SCORES + "\n"
    + "Browse Corpus: " + HOST + "/corpus\n"
    + "Browse Aziel Library: " + HOST + "/aziel-library\n";
}

export function helpRouteBody(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  if (path === HELP_INDEX) return helpIndexTxt();
  if (path === ADDENDUM) return addendumTxt();
  if (path === HELP_SCORES) return howToReadScoresTxt();
  if (path === HELP_CITE) return howToCiteTxt();
  if (path === HELP_UPLOADS) return helpUploadsTxt();
  return null;
}
