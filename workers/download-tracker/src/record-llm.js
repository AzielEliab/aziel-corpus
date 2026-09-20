/**
 * Per-record LLM / SEO access points.
 * GET /record/{id}/llms.txt and GET /record/{id}/cite.json.
 * Built on the fly from packed index + metadata + review. Author: Aziel Eliab.
 */
import { paperRecordId, isDocumentId } from "./ledger.js";
import {
  HOST,
  metadataUrls,
  loadDiscoveryMetadata,
  loadPaperRow,
  discoveryJsonResponse,
} from "./record-metadata.js";
import { readPackedIndex } from "./library-index.js";
import { HUB_PERSON_ID } from "./seo.js";
import { parseZsolver, zsolverIsNotApplicable, zsolverNumericDisplay } from "./zsolver.js";
import {
  applicableComponentNames,
  applicabilityFlagsFrom,
  publicEngineView,
} from "./review-applicability.js";
import { applyApplicabilityToReview } from "./review.js";

export const RECORD_LLMS_TITLE = "llms.txt";
const BANNED_SEO = /\+25|quiet (Aziel|triad|boost)|blocked.from|what this is not|THIS IS NOT|what-not-to-say|not\s*=|≠/i;

function corsPlain() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
  };
}

export function parseRecordMachinePath(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  let m = path.match(/^\/record\/([^/]+)\/llms\.txt$/i);
  if (m) return { record_id: decodeURIComponent(m[1]), alias: "llms.txt" };
  m = path.match(/^\/record\/([^/]+)\/cite\.json$/i);
  if (m) return { record_id: decodeURIComponent(m[1]), alias: "cite.json" };
  return null;
}

function parseJson(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function uniqueTokens(...groups) {
  const seen = new Map();
  for (const group of groups) {
    const parts = Array.isArray(group) ? group : String(group || "").split(/[,;]+/);
    for (const token of parts) {
      const t = String(token || "").trim();
      if (!t) continue;
      const key = t.toLowerCase();
      if (!seen.has(key)) seen.set(key, t);
    }
  }
  return [...seen.values()];
}

function shelfLabel(row) {
  return String((row && (row.library || row.shelf)) || "").toLowerCase() === "aziel"
    ? "Aziel Library"
    : "Corpus";
}

function isAzielAuthored(row) {
  const lib = String((row && (row.library || row.shelf)) || "").toLowerCase();
  const author = String((row && row.author) || "").trim();
  return lib === "aziel" || /^aziel(\s+elroi)?\s+eliab$/i.test(author) || !author;
}

function shortSummary(row, meta) {
  const fromMeta = String((meta && (meta.content || meta.description || meta.abstract)) || "").replace(/\s+/g, " ").trim();
  if (fromMeta) return fromMeta.slice(0, 480);
  const body = String((row && (row.body || row.content || row.snippet)) || "").replace(/\s+/g, " ").trim();
  if (body) return body.slice(0, 480);
  const title = String((row && row.title) || "").trim();
  const shelf = shelfLabel(row);
  if (title) return title + " — " + shelf + " record on Aziel Digital Library.";
  return "Public record on Aziel Digital Library.";
}

async function packedCard(env, paper) {
  try {
    const packed = await readPackedIndex(env);
    const recs = packed && Array.isArray(packed.records) ? packed.records : [];
    return recs.find((r) => String(r.record_id || r.id || "") === paper) || null;
  } catch {
    return null;
  }
}

export async function loadRecordMachineContext(env, recordId) {
  const paper = paperRecordId(recordId);
  if (!paper || !isDocumentId(paper)) return null;
  let row = null;
  try { row = await loadPaperRow(env, paper, null); } catch { row = null; }
  const card = (!row || !row.title) ? await packedCard(env, paper) : null;
  const base = row && row.record_id ? row : (card ? { ...card, record_id: paper } : null);
  if (!base) return null;
  let meta = null;
  try { meta = await loadDiscoveryMetadata(env, paper, { persistIfMissing: false }); } catch { meta = null; }
  let review = parseJson(base.review_json || base.review);
  if (review) {
    review = applyApplicabilityToReview(review, base, base.library, 0);
  }
  const zsolver = parseZsolver(base.zsolver_json || base.zsolver || (card && card.zsolver));
  return { paper, row: base, meta, review, zsolver, packed: card };
}

function publicTriad(review, row) {
  const triad = review && review.triad ? review.triad : null;
  const flags = applicabilityFlagsFrom(review, row);
  const names = applicableComponentNames(flags);
  let display = triad && triad.display != null ? Number(triad.display) : null;
  if (display == null && row && row.triad_display != null) display = Number(row.triad_display);
  if (display == null && row && row.triad_combined != null) display = Math.round(Number(row.triad_combined) * 100);
  const combined = triad && triad.combined != null
    ? triad.combined
    : (row && row.triad_combined != null ? Number(row.triad_combined) : null);
  if (display == null && combined == null) return null;
  return {
    display: display != null && Number.isFinite(display) ? Math.round(display) : (combined != null ? Math.round(Number(combined) * 100) : null),
    combined: combined != null && Number.isFinite(Number(combined)) ? Number(combined) : null,
    formula: (triad && triad.formula) || "TRIAD_V2 geometric mean over applicable components only",
    applicable_components: names,
    ready: triad && triad.ready != null ? !!triad.ready : combined != null,
  };
}

function publicZion(zsolver) {
  if (!zsolver || zsolverIsNotApplicable(zsolver)) return null;
  const display = zsolverNumericDisplay(zsolver);
  if (display == null || display <= 0) return null;
  return {
    display,
    applicable: true,
    status: zsolver.status || "scored",
    seed_corpus: !!(zsolver.seed_corpus || zsolver.baseline),
  };
}

export function buildRecordCite(ctx) {
  const row = ctx.row;
  const paper = ctx.paper;
  const urls = metadataUrls(paper);
  const meta = ctx.meta || {};
  const review = ctx.review;
  const flags = applicabilityFlagsFrom(review, row);
  const triad = publicTriad(review, row);
  const zion = publicZion(ctx.zsolver);
  const keywords = uniqueTokens(row.keywords, row.subjects, row.domain, meta.keywords);
  const subjects = uniqueTokens(row.subjects, meta.subjects);
  const sameAs = uniqueTokens(
    urls.metadata_url,
    urls.metadata_alias_url,
    urls.url + "/llms.txt",
    urls.url + "/cite.json",
    meta.sameAs,
    isAzielAuthored(row) ? HUB_PERSON_ID : ""
  );
  const hashes = {};
  const contentSha = String(row.content_sha256 || meta.content_sha256 || "").trim();
  const metaSha = String(meta.metadata_sha256 || "").trim();
  if (/^[0-9a-f]{64}$/i.test(contentSha)) hashes.content_sha256 = contentSha;
  if (/^[0-9a-f]{64}$/i.test(metaSha)) hashes.metadata_sha256 = metaSha;

  const cite = {
    "@context": "https://schema.org",
    "@id": urls.url + "#record",
    record_id: paper,
    url: urls.url,
    sameAs,
    title: String(row.title || paper).trim() || paper,
    name: String(row.title || paper).trim() || paper,
    author: isAzielAuthored(row)
      ? { "@type": "Person", "@id": HUB_PERSON_ID, name: "Aziel Eliab" }
      : { "@type": "Person", name: String(row.author || "").trim() || "Aziel Eliab" },
    library: shelfLabel(row),
    shelf: String((row.library || row.shelf) || "corpus").toLowerCase() === "aziel" ? "aziel" : "corpus",
    domain: String(row.domain || meta.domain || "").trim() || undefined,
    subjects,
    keywords,
    summary: shortSummary(row, meta),
    html: urls.url,
    metadata_url: urls.metadata_url,
    file_url: urls.file_url,
    llms: urls.url + "/llms.txt",
    cite: urls.url + "/cite.json",
  };
  if (triad) cite.triad = triad;
  if (flags.spre && review && review.spre) {
    const spre = publicEngineView(review.spre);
    if (spre && spre.applicable !== false && spre.pc != null) {
      cite.spre = { pc: spre.pc, band: spre.band, applicable: true };
    }
  }
  if (flags.clce && review && review.clce) {
    const clce = publicEngineView(review.clce);
    if (clce && clce.applicable !== false && (clce.triple != null || clce.pairwise_avg != null)) {
      cite.clce = { triple: clce.triple, pairwise_avg: clce.pairwise_avg, applicable: true };
    }
  }
  if (flags.plr && review && review.plr) {
    const plr = publicEngineView(review.plr);
    if (plr && plr.applicable !== false && plr.status) {
      cite.plr = { status: plr.status, applicable: true };
    }
  }
  if (zion) cite.zionpattern = zion;
  if (hashes.content_sha256) cite.content_sha256 = hashes.content_sha256;
  if (hashes.metadata_sha256) cite.metadata_sha256 = hashes.metadata_sha256;
  cite.how_its_scored = HOST + "/how-its-scored";
  cite.help = HOST + "/help.txt";
  cite.identity = "Aziel Eliab";
  cite.person_id = HUB_PERSON_ID;
  const dumped = JSON.stringify(cite);
  if (BANNED_SEO.test(dumped)) {
    delete cite.collection_boost;
  }
  return cite;
}

export function buildRecordLlms(ctx) {
  const row = ctx.row;
  const paper = ctx.paper;
  const urls = metadataUrls(paper);
  const meta = ctx.meta || {};
  const review = ctx.review;
  const flags = applicabilityFlagsFrom(review, row);
  const triad = publicTriad(review, row);
  const zion = publicZion(ctx.zsolver);
  const keywords = uniqueTokens(row.keywords, row.subjects, row.domain, meta.keywords);
  const authorLine = isAzielAuthored(row)
    ? "Aziel Eliab"
    : (String(row.author || "").trim() || "Aziel Eliab");
  const lines = [
    "# " + (String(row.title || paper).trim() || paper),
    "",
    "Author: " + authorLine,
    "Library shelf: " + shelfLabel(row),
    "Record: " + paper,
    "Canonical HTML: " + urls.url,
    "Metadata JSON: " + urls.metadata_url,
    "Cite JSON: " + urls.url + "/cite.json",
    "Content / file: " + urls.file_url,
  ];
  const domain = String(row.domain || meta.domain || "").trim();
  if (domain) lines.push("Domain: " + domain);
  const subjects = uniqueTokens(row.subjects, meta.subjects);
  if (subjects.length) lines.push("Subjects: " + subjects.join(", "));
  if (keywords.length) lines.push("Keywords: " + keywords.join(", "));
  lines.push("Summary: " + shortSummary(row, meta));
  if (triad && triad.display != null) {
    const names = (triad.applicable_components || []).join(", ") || "applicable checkers";
    lines.push("Triad: " + triad.display + " (geometric mean of " + names + ")");
  }
  if (flags.spre && review && review.spre && review.spre.applicable !== false && review.spre.pc != null) {
    lines.push("SPRE: " + Number(review.spre.pc).toFixed(2) + (review.spre.band ? " · " + review.spre.band : ""));
  }
  if (flags.clce && review && review.clce && review.clce.applicable !== false) {
    const bits = [];
    if (review.clce.triple != null) bits.push("triple " + Number(review.clce.triple).toFixed(2));
    if (review.clce.pairwise_avg != null) bits.push("pairwise " + Number(review.clce.pairwise_avg).toFixed(2));
    if (bits.length) lines.push("CLCE: " + bits.join(" · "));
  }
  if (flags.plr && review && review.plr && review.plr.applicable !== false && review.plr.status) {
    lines.push("PhysLing: " + review.plr.status);
  }
  if (zion) {
    lines.push("ZionPattern: " + zion.display + (zion.seed_corpus ? " (Zioncheck Visual Archive seed baseline)" : ""));
  }
  const sha = String(row.content_sha256 || meta.content_sha256 || "").trim();
  if (/^[0-9a-f]{64}$/i.test(sha)) lines.push("Content SHA-256: " + sha);
  lines.push("How it's scored: " + HOST + "/how-its-scored");
  lines.push("Human help: " + HOST + "/help.txt");
  lines.push("Identity: Aziel Eliab");
  lines.push("Person @id: " + HUB_PERSON_ID);
  lines.push("");
  const text = lines.join("\n") + "\n";
  if (BANNED_SEO.test(text)) {
    return text.replace(BANNED_SEO, "");
  }
  return text;
}

export function recordLlmsResponse(text, status = 200) {
  return new Response(text, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Robots-Tag": "index, follow",
      ...corsPlain(),
    },
  });
}

export async function serveRecordMachine(env, pathname) {
  const parsed = parseRecordMachinePath(pathname);
  if (!parsed) return null;
  const paper = paperRecordId(parsed.record_id);
  if (!isDocumentId(paper)) {
    if (parsed.alias === "cite.json") return discoveryJsonResponse({ error: "not found" }, 404);
    return recordLlmsResponse("not found\n", 404);
  }
  const ctx = await loadRecordMachineContext(env, paper);
  if (!ctx) {
    if (parsed.alias === "cite.json") return discoveryJsonResponse({ error: "not found" }, 404);
    return recordLlmsResponse("not found\n", 404);
  }
  if (parsed.alias === "cite.json") return discoveryJsonResponse(buildRecordCite(ctx), 200);
  return recordLlmsResponse(buildRecordLlms(ctx), 200);
}
