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

export const HELP_PATHS = Object.freeze([
  HELP_INDEX,
  ADDENDUM,
  HELP_SCORES,
  HELP_CITE,
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
    + "- Addendum: " + HOST + ADDENDUM + "\n\n"
    + "## Records\n"
    + "Open a record page at " + HOST + "/record/{AZDOC-…}. The triad is always the primary published score. "
    + "Component scores (SPRE, CLCE, PhysLing) appear when those verifiers have run. "
    + "ZionPattern appears when the document qualifies.\n\n"
    + "## Softwares\n"
    + "The Software tab lists live product cards from the runtime catalog. "
    + "Counted downloads stay on each product Worker.\n\n"
    + "Growth-ON. NO-LIE. Do not invent DOIs.\n";
}

export function addendumTxt() {
  return header("Aziel Digital Library — addendum")
    + "Companion to /help.txt. How to use this MASTER library.\n\n"
    + "## Two shelves\n"
    + "Aziel Library is the operator collection of Aziel Eliab's published work (royal purple). "
    + "Corpus is the public Lamb Lens shelf. Anyone may browse both. "
    + "Upload at " + HOST + "/upload — operator session files to Aziel Library; everyone else files to Corpus.\n\n"
    + "## Read a record\n"
    + "Search from " + HOST + "/ or " + HOST + "/search. Open " + HOST + "/record/{AZDOC-…}. "
    + "The triad is always shown first. Component scores appear when applicable. "
    + "See " + HOST + HELP_SCORES + " and " + HOST + "/how-its-scored.\n\n"
    + "## Cite\n"
    + "Use the record id (AZDOC-…) plus " + HOST + "/record/{AZDOC-…}. "
    + "Machine cite: " + HOST + "/cite.json. Person @id " + PERSON_ID + ". "
    + "Details: " + HOST + HELP_CITE + ".\n\n"
    + "## Softwares\n"
    + "Product cards: " + HOST + "/software · live catalog " + HOST + "/v1/software. "
    + "Runtime door: " + HOST + "/runtime.\n\n"
    + "Help index: " + HOST + HELP_INDEX + ".\n";
}

export function howToReadScoresTxt() {
  return header("How to read scores")
    + "Human guide. HTML explainer: " + HOST + "/how-its-scored\n\n"
    + "## Triad (always)\n"
    + "Every scored record publishes a triad first: SPRE × CLCE × PhysLing as TRIAD_V1, "
    + "an auditable geometric mean. Display is round(combined × 100). "
    + "API: " + HOST + "/v1/review?record_id=\n\n"
    + "## Component scores (when applicable)\n"
    + "SPRE, CLCE, and PhysLing stay stored for audit and appear on the record page when those verifiers have run.\n"
    + "- SPRE — source provenance completeness and consistency.\n"
    + "- CLCE — claim-to-claim consistency (AZ-CLCE).\n"
    + "- PhysLing — physics coherence mixed with linguistic neutrality.\n\n"
    + "## Other published numbers\n"
    + "AZCoherence is a second-pass triad coherence review (PASS / FLAG / NEUTRALIZE / REFUSE).\n"
    + "ZionPattern Solver is a secondary public score on qualifying historical / research / investigation / crime documents.\n"
    + "Bayesian posterior is unranked metadata for peer review. It never sorts the shelf.\n"
    + "Possibility is a labeled HEURISTIC over lattice time×geo pins. API: " + HOST + "/v1/possibility?record_id=\n\n"
    + "Record page: " + HOST + "/record/{AZDOC-…}\n"
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
    + "The triad is the primary published score. Name component scores only when they appear on that record.\n\n"
    + "## Scores\n"
    + "Explain the numbers with " + HOST + "/how-its-scored and " + HOST + HELP_SCORES + ".\n\n"
    + "## Softwares\n"
    + "Cite the Software tab " + HOST + "/software plus the product Worker / GitHub listed on the card. "
    + "Live catalog: " + HOST + "/v1/software.\n\n"
    + "Upload new public work at " + HOST + "/upload.\n"
    + "Help index: " + HOST + HELP_INDEX + ".\n";
}

export function helpRouteBody(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  if (path === HELP_INDEX) return helpIndexTxt();
  if (path === ADDENDUM) return addendumTxt();
  if (path === HELP_SCORES) return howToReadScoresTxt();
  if (path === HELP_CITE) return howToCiteTxt();
  return null;
}
