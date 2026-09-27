/**
 * Paper UX for Aziel Corpus Library.
 * Permalinks, honest per-paper counters, in-library reader, cite links.
 * Discovery fields are additive. Counters are stored KV totals, never invented.
 * Author: Aziel Eliab.
 */
import { classifyRequest } from "./classify.js";
import { isHumanTag, visibleTagEntries } from "./visible-tags.js";

export const PAPER_METRICS_KEY = "library:paper-metrics:v1";
export const PAPER_UX_SPEC = "PAPER-UX-1.0";
export const AUTHOR = "Aziel Eliab";
export const BLACK_BAR = "████";
export const READER_TEXT_CAP = 200000;
const COUNT_PREFIX = "aziel-corpus|paper|";
const INDEX_DONE_KEY = "paper_ux_index_done";
const CURSOR_KEY = "paper_ux_backfill_cursor";
const DONE_KEY = "paper_ux_backfill_done";
const STATS_KEY = "paper_ux_backfill_stats";
const CHUNK = 25;

const NAME_RE = /\bCollin\b|\bHorton\b/i;
const CLUSTER_RES = [/\bCollin\b/gi, /\bHorton\b/gi, /\bFishers\b/gi, /\bIndiana\b/g, /\b1995\b/g];

function kvOf(env) {
  return env && env.DOWNLOADS && typeof env.DOWNLOADS.get === "function" ? env.DOWNLOADS : null;
}

export function shelfOfPaper(row) {
  const raw = String((row && (row.shelf || row.library)) || "corpus").toLowerCase();
  return raw === "aziel" ? "aziel" : "corpus";
}

/** Black-bar the identity cluster only when a name token makes it applicable. */
export function redactIdentityCluster(value) {
  const text = String(value == null ? "" : value);
  NAME_RE.lastIndex = 0;
  if (!NAME_RE.test(text)) return { text, redacted: false };
  let next = text;
  for (const re of CLUSTER_RES) {
    re.lastIndex = 0;
    next = next.replace(re, BLACK_BAR);
  }
  return { text: next, redacted: next !== text };
}

const SLUG_LIMIT = 72;
const ARTICLE_RE = /^(?:the|a|an)-/;
const ALIAS_RANK = { "full-title": 4, "longer-cut": 3, "leading-title": 2, "shorter-cut": 1 };

export function slugifyTitle(title, limit = SLUG_LIMIT) {
  let s = String(title || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const cap = Number(limit);
  if (Number.isFinite(cap) && cap > 0) s = s.slice(0, cap).replace(/-+$/g, "");
  return s;
}

function unboundedSlug(title) {
  return slugifyTitle(title, 0);
}

function stripArticle(slug) {
  const next = String(slug || "").replace(ARTICLE_RE, "");
  return next && next !== slug ? next : "";
}

function hyphenCut(guess, stem) {
  return !!guess && !!stem && guess !== stem && guess.includes("-") && guess.length >= 12 && stem.startsWith(guess + "-");
}

function longerCut(guess, locked, full) {
  return !!guess && !!locked && !!full && guess.length > locked.length && guess.startsWith(locked) && full.startsWith(guess);
}

function leadingClause(title) {
  const clause = String(title || "").split(/\s*(?::|\u2014|\u2013|\s-\s|\|)\s*/)[0];
  return unboundedSlug(clause);
}

/** How a non-canonical guess interlocks with one locked slug. Empty when it does not. */
function aliasKind(row, guess) {
  const locked = String(row.permalink_slug || "").toLowerCase();
  const full = unboundedSlug(row.title) || locked;
  if (!locked || guess === locked) return "";
  const truncated = full.length > SLUG_LIMIT && full !== locked;
  const bareFull = truncated ? stripArticle(full) : "";
  const bareLocked = truncated ? stripArticle(locked) : "";
  if (guess === full || (bareFull && guess === bareFull)) return "full-title";
  if (longerCut(guess, locked, full) || (bareLocked && longerCut(guess, bareLocked, bareFull))) return "longer-cut";
  const lead = truncated ? leadingClause(row.title) : "";
  const bareLead = lead ? stripArticle(lead) : "";
  if ((lead && guess === lead) || (bareLead && guess === bareLead)) return "leading-title";
  if (hyphenCut(guess, locked) || (bareLocked && hyphenCut(guess, bareLocked))) return "shorter-cut";
  return "";
}

export function permalinkPath(shelf, slug) {
  const s = String(slug || "").trim().toLowerCase();
  if (!s) return "";
  if (shelfOfPaper({ library: shelf }) === "aziel") return "/aziellibrary/" + s;
  return "/azielcorpus/usersubmitted/" + s;
}

function humanList(value) {
  return visibleTagEntries(value).map((entry) => entry.label).filter(Boolean).join(", ");
}

/** First human subject, else domain, else keyword. Empty when the row has none. */
export function conceptFromRow(row) {
  const chunks = [row && row.subjects, row && row.domain, row && row.keywords];
  for (const chunk of chunks) {
    for (const part of String(chunk || "").split(/[,;]+/)) {
      const token = part.trim();
      if (token && isHumanTag(token)) return token.replace(/^#+/, "");
    }
  }
  return "";
}

function recordIdOf(row) {
  return String((row && (row.record_id || row.id)) || "").trim();
}

function idSuffix(recordId) {
  return String(recordId || "").replace(/^AZDOC-/i, "").slice(-6).toLowerCase() || "paper";
}

/**
 * Assign permalink_slug without changing a locked slug.
 * Bare slug goes to the lowest record_id when two unlocked rows collide.
 */
export function stampPermalinks(records) {
  const rows = (records || []).filter((r) => recordIdOf(r));
  const used = new Set();
  const locked = [];
  const open = [];
  for (const r of rows) {
    const id = recordIdOf(r);
    const shelf = shelfOfPaper(r);
    const existing = String(r.permalink_slug || "").trim().toLowerCase();
    if (existing && r.permalink_locked) {
      const slug = existing;
      used.add(shelf + ":" + slug);
      locked.push({
        ...r,
        record_id: id,
        permalink_slug: slug,
        permalink: permalinkPath(shelf, slug),
        permalink_locked: true,
      });
    } else {
      open.push({ ...r, record_id: id });
    }
  }
  open.sort((a, b) => a.record_id.localeCompare(b.record_id));
  const out = locked.slice();
  for (const r of open) {
    const shelf = shelfOfPaper(r);
    const base = slugifyTitle(r.title) || ("record-" + idSuffix(r.record_id));
    let slug = base;
    const key = () => shelf + ":" + slug;
    if (used.has(key())) slug = (base + "-" + idSuffix(r.record_id)).replace(/-+/g, "-");
    let n = 2;
    while (used.has(key())) {
      slug = base + "-" + String(r.record_id).replace(/^AZDOC-/i, "").toLowerCase() + "-" + n;
      n += 1;
      if (n > 6) break;
    }
    used.add(key());
    out.push({
      ...r,
      permalink_slug: slug,
      permalink: permalinkPath(shelf, slug),
      permalink_locked: true,
    });
  }
  return out;
}

/** Copy locked permalinks from the previous packed cards onto a fresh D1 rebuild. */
export function mergeLockedPermalinks(fresh, previous) {
  const prev = new Map();
  for (const row of previous || []) {
    const id = recordIdOf(row);
    if (id && row.permalink_locked && row.permalink_slug) prev.set(id, row);
  }
  return (fresh || []).map((row) => {
    const id = recordIdOf(row);
    const kept = id ? prev.get(id) : null;
    if (!kept) return row;
    const shelf = shelfOfPaper(row);
    const slug = String(kept.permalink_slug).toLowerCase();
    return {
      ...row,
      permalink_slug: slug,
      permalink: permalinkPath(shelf, slug),
      permalink_locked: true,
    };
  });
}

export function permalinksForRows(rows, packedRecords) {
  const byId = new Map();
  for (const row of packedRecords || []) {
    const id = recordIdOf(row);
    if (id) byId.set(id, row);
  }
  for (const row of rows || []) {
    const id = recordIdOf(row);
    if (id && !byId.has(id)) byId.set(id, row);
  }
  const stamped = stampPermalinks([...byId.values()]);
  const slugById = new Map(stamped.map((row) => [row.record_id, row]));
  return (rows || []).map((row) => {
    const hit = slugById.get(recordIdOf(row));
    if (!hit || !hit.permalink) return row;
    return { ...row, permalink_slug: hit.permalink_slug, permalink: hit.permalink, permalink_locked: true };
  });
}

export async function attachPermalinks(env, rows) {
  let records = [];
  try {
    const { readPackedIndex } = await import("./library-index.js");
    const packed = await readPackedIndex(env);
    records = (packed && packed.records) || [];
  } catch {
    records = [];
  }
  return permalinksForRows(rows, records);
}

export function parsePaperPermalink(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  const az = path.match(/^\/aziellibrary\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/p\/(\d+))?$/);
  if (az) return { shelf: "aziel", slug: az[1], page: az[2] ? Number(az[2]) : 1 };
  const co = path.match(/^\/azielcorpus\/usersubmitted\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/p\/(\d+))?$/);
  if (co) return { shelf: "corpus", slug: co[1], page: co[2] ? Number(co[2]) : 1 };
  const rec = path.match(/^\/record\/([^/]+)(?:\/p\/(\d+))?$/);
  if (rec && !/\.(json|txt)$/i.test(rec[1])) {
    return { shelf: "", slug: "", record_id: decodeURIComponent(rec[1]), page: rec[2] ? Number(rec[2]) : 1, legacy: true };
  }
  return null;
}

export function findPaperBySlug(records, shelf, slug) {
  const hit = lookupPaperSlug(records, shelf, slug);
  if (!hit || hit.alias) return null;
  return hit.row;
}

/**
 * Exact locked slug, or one interlocking alias of a paper that already exists.
 * Longer and shorter cuts must sit on that paper's real title slug.
 * A truncated slug also answers its leading title (`cockroach-doctrine`).
 * Two matches at the same strength return null. Does not add rows or rewrite slugs.
 */
export function lookupPaperSlug(records, shelf, slug) {
  const want = String(slug || "").trim().toLowerCase();
  const shelfWant = shelf === "aziel" ? "aziel" : "corpus";
  if (!want) return null;
  const stamped = stampPermalinks(records || []).filter((row) => shelfOfPaper(row) === shelfWant && row.permalink_slug);
  const exact = stamped.find((row) => row.permalink_slug === want);
  if (exact) return { row: exact, alias: false, kind: "exact" };
  const best = new Map();
  for (const row of stamped) {
    const kind = aliasKind(row, want);
    if (!kind) continue;
    const prev = best.get(row.record_id);
    if (!prev || ALIAS_RANK[kind] > ALIAS_RANK[prev.kind]) best.set(row.record_id, { row, kind });
  }
  if (!best.size) return null;
  const ranked = [...best.values()];
  const top = Math.max(...ranked.map((hit) => ALIAS_RANK[hit.kind]));
  const winners = ranked.filter((hit) => ALIAS_RANK[hit.kind] === top);
  if (winners.length !== 1) return null;
  return { row: winners[0].row, alias: true, kind: winners[0].kind };
}

/** Canonical locked path for an alias. Page 1 stays unsuffixed. */
export function paperAliasLocation(row, page) {
  const base = (row && row.permalink) || (row && row.record_id ? "/record/" + row.record_id : "");
  if (!base) return "";
  const n = Math.max(Number(page) || 1, 1);
  return n <= 1 ? base : base + "/p/" + n;
}

export function filedLabel(row) {
  const raw = String((row && row.created_utc) || "").trim();
  if (!raw || Number.isNaN(Date.parse(raw))) return { text: "Undated", undated: true };
  return { text: "Filed " + raw.replace("T", " ").slice(0, 16), undated: false };
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function looksBinaryText(text, contentType) {
  const t = String(text || "");
  const ct = String(contentType || "").toLowerCase();
  if (t.startsWith("%PDF")) return true;
  if (ct.includes("pdf") && !/[A-Za-z]{40}/.test(t)) return true;
  const sample = t.slice(0, 2000);
  if (!sample) return ct.includes("pdf") || ct.includes("octet-stream");
  let weird = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c === 0 || c < 9 || (c > 13 && c < 32)) weird += 1;
  }
  return weird / sample.length > 0.05;
}

const PAGE_LINE = /^(?:<!--\s*)?page\s+\d+(?:\s*of\s*\d+)?(?:\s*-->)?$|^\[\[page\s+\d+\]\]$|^---\s*page\s*break\s*---$/i;

/** Split stored text into reader pages. One block stays a standalone paper. */
export function splitPaperPages(text, { contentType = "" } = {}) {
  const raw = String(text || "");
  if (looksBinaryText(raw, contentType)) {
    return {
      mode: "pdf-deferred",
      pages: [],
      page_count: 0,
      note: "This file is a PDF (or other binary). Page images are not rendered in the library reader. Download the original. Extracted text is shown when the upload stored it.",
    };
  }
  const chunks = raw.split(/\f|(?:\r?\n)\s*(?=(?:<!--\s*)?page\s+\d+|\[\[page\s+\d+\]\]|---\s*page\s*break\s*---)/i);
  const pages = [];
  for (const chunk of chunks) {
    const lines = String(chunk || "").split(/\r?\n/);
    const body = lines.filter((line) => !PAGE_LINE.test(line.trim())).join("\n").trim();
    if (body) pages.push(body);
  }
  if (!pages.length && raw.trim()) pages.push(raw.trim());
  if (pages.length <= 1) {
    return { mode: "standalone", pages: pages.length ? pages : [""], page_count: pages.length ? 1 : 0, note: "" };
  }
  return { mode: "paged", pages, page_count: pages.length, note: "" };
}

function overlaps(spans, start, end) {
  return spans.some((span) => start < span.end && end > span.start);
}

/** Link AZDOC ids and exact titles that already exist in the library. */
export function linkCitations(raw, catalog, selfId) {
  const text = String(raw || "");
  const self = String(selfId || "");
  const others = (catalog || []).filter((row) => row && recordIdOf(row) && recordIdOf(row) !== self && row.permalink);
  const spans = [];
  const idRe = /\bAZDOC-[A-F0-9]{6,}\b/gi;
  let match;
  while ((match = idRe.exec(text))) {
    const id = match[0].toUpperCase();
    const hit = others.find((row) => recordIdOf(row).toUpperCase() === id);
    if (hit) spans.push({ start: match.index, end: match.index + match[0].length, href: hit.permalink });
  }
  const titles = others
    .map((row) => ({ title: String(row.title || "").trim(), href: row.permalink }))
    .filter((row) => row.title.length >= 12 && row.title.split(/\s+/).length >= 2)
    .sort((a, b) => b.title.length - a.title.length);
  const lower = text.toLowerCase();
  for (const title of titles) {
    const needle = title.title.toLowerCase();
    let from = 0;
    while (from <= lower.length) {
      const at = lower.indexOf(needle, from);
      if (at < 0) break;
      const before = at === 0 ? "" : text[at - 1];
      const after = text[at + title.title.length] || "";
      const boundary = (ch) => !ch || !/[A-Za-z0-9]/.test(ch);
      const end = at + title.title.length;
      if (boundary(before) && boundary(after) && !overlaps(spans, at, end)) {
        spans.push({ start: at, end, href: title.href });
      }
      from = at + Math.max(needle.length, 1);
    }
  }
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = [];
  for (const span of spans) {
    if (!overlaps(kept, span.start, span.end)) kept.push(span);
  }
  let html = "";
  let cursor = 0;
  for (const span of kept) {
    html += esc(text.slice(cursor, span.start));
    html += "<a class=\"paper-cite\" href=\"" + esc(span.href) + "\">" + esc(text.slice(span.start, span.end)) + "</a>";
    cursor = span.end;
  }
  html += esc(text.slice(cursor));
  return html;
}

function paragraphsHtml(linked) {
  const blocks = String(linked || "").split(/\n{2,}/);
  const parts = blocks.map((block) => block.trim()).filter(Boolean);
  if (!parts.length) return "<p class=\"muted\">No extracted text is stored for this paper.</p>";
  return parts.map((block) => "<p>" + block.replace(/\n/g, "<br>") + "</p>").join("");
}

export function renderPaperReader({
  row,
  body = "",
  contentType = "",
  counts = null,
  permalink = "",
  catalog = [],
  page = 1,
  truncated = false,
} = {}) {
  const id = recordIdOf(row);
  const title = redactIdentityCluster((row && row.title) || id || "Paper").text;
  const shelf = shelfOfPaper(row);
  const shelfName = shelf === "aziel" ? "Aziel Library" : "Corpus";
  const link = permalink || (row && row.permalink) || "";
  const filed = filedLabel(row);
  const split = splitPaperPages(body, { contentType: contentType || (row && row.content_type) || "" });
  const asked = Math.max(Number(page) || 1, 1);
  const inRange = split.mode !== "paged" || asked <= split.page_count;
  const pageIndex = split.mode === "paged" ? Math.min(asked, Math.max(split.page_count, 1)) : 1;
  const pageText = split.mode === "pdf-deferred" ? "" : (split.pages[pageIndex - 1] || "");
  const shown = redactIdentityCluster(pageText).text;
  const linked = split.mode === "pdf-deferred" ? "" : linkCitations(shown, catalog, id);
  const base = link || ("/record/" + id);
  function turnerNav(place) {
    if (split.mode !== "paged") return "";
    const prev = pageIndex > 1 ? (pageIndex === 2 ? base : base + "/p/" + (pageIndex - 1)) : "";
    const next = pageIndex < split.page_count ? base + "/p/" + (pageIndex + 1) : "";
    const prevCtl = prev
      ? "<a class=\"page-turn\" rel=\"prev\" href=\"" + esc(prev) + "\">Previous</a>"
      : "<span class=\"page-turn\" aria-disabled=\"true\">Previous</span>";
    const nextCtl = next
      ? "<a class=\"page-turn\" rel=\"next\" href=\"" + esc(next) + "\">Next</a>"
      : "<span class=\"page-turn\" aria-disabled=\"true\">Next</span>";
    return "<nav class=\"page-turner page-turner-" + place + "\" aria-label=\"Pages\" data-page=\"" + pageIndex + "\" data-pages=\"" + split.page_count + "\">"
      + prevCtl
      + "<span class=\"page-status\">Page " + pageIndex + " of " + split.page_count + "</span>"
      + nextCtl
      + "</nav>";
  }
  const turnerTop = turnerNav("top");
  const turnerEnd = turnerNav("end");
  let countsHtml = "<p class=\"paper-counts\" data-source=\"unread\">Views and downloads load with the paper page.</p>";
  if (counts && counts.available === false) {
    countsHtml = "<p class=\"paper-counts\" data-source=\"unavailable\">Per-paper counters are not available on this render.</p>";
  } else if (counts && counts.views != null && counts.downloads != null) {
    const views = Number(counts.views) || 0;
    const downloads = Number(counts.downloads) || 0;
    countsHtml = "<p class=\"paper-counts\" data-source=\"kv\" data-views=\"" + views + "\" data-downloads=\"" + downloads + "\"><strong>"
      + views.toLocaleString("en-US") + "</strong> views · <strong>" + downloads.toLocaleString("en-US") + "</strong> downloads</p>";
  }
  const tip = String((row && (row.chain_tip || row.paper_chain_tip)) || "").trim();
  const author = redactIdentityCluster(String((row && row.author) || "").trim()).text;
  const concept = conceptFromRow(row);
  const metaRows = [
    ["Shelf", shelfName],
    ["Record", id],
    ["Permalink", link || "/record/" + id],
    ["Filed", filed.text],
    ["Author", author || ""],
    ["Concept", concept],
    ["Domain", humanList(row && row.domain)],
    ["Subjects", humanList(row && row.subjects)],
    ["Keywords", humanList(row && row.keywords)],
    ["Chain tip", tip],
  ].filter((pair) => pair[1]);
  const meta = "<aside class=\"paper-meta\"><h2>Record</h2><dl>"
    + metaRows.map((pair) => "<dt>" + esc(pair[0]) + "</dt><dd>" + esc(pair[1]) + "</dd>").join("")
    + "</dl><p class=\"muted\">Lamb Lens: Service — this page opens the filed paper. Clarity — views and downloads are stored counters, and a cite links only when that paper is already in the library. Peace — a name that is not in the library stays plain text.</p></aside>";
  const rangeNote = !inRange
    ? "<p class=\"muted\">Page " + asked + " is not in this paper" + (split.page_count ? " (" + split.page_count + (split.page_count === 1 ? " page" : " pages") + ")" : "") + ".</p>"
    : "";
  const bodyHtml = split.mode === "pdf-deferred"
    ? "<p>" + esc(split.note) + "</p>"
    : rangeNote + paragraphsHtml(linked);
  const trunc = truncated ? "<p class=\"muted\">Stored text is longer than the reader window (" + READER_TEXT_CAP.toLocaleString("en-US") + " characters). Download the file for the rest.</p>" : "";
  const share = link
    ? "<p class=\"paper-permalink\"><a href=\"" + esc(link) + "\">" + esc(link) + "</a></p>"
    : "";
  const fileHref = id ? "/file/" + encodeURIComponent(id) : "";
  const countHref = id ? "/download?record=" + encodeURIComponent(id) : "";
  const actions = id
    ? "<p class=\"paper-actions\"><a class=\"button\" href=\"" + esc(fileHref) + "\">Download</a><a class=\"button ghost\" href=\"" + esc(countHref) + "\">Counted download</a></p>"
    : "";
  const mode = split.mode === "pdf-deferred" ? "pdf-deferred" : split.mode;
  return "<article class=\"paper-reader\" data-reader=\"" + mode + "\" data-record=\"" + esc(id) + "\" data-pages=\"" + (split.page_count || 0) + "\">"
    + "<header class=\"paper-head\"><p class=\"paper-kicker\">" + esc(shelfName) + (filed.undated ? " · Undated" : "") + "</p>"
    + countsHtml + actions + share + "</header>"
    + "<div class=\"paper-layout\"><div class=\"paper-body\">" + turnerTop + bodyHtml + trunc + turnerEnd + "</div>" + meta + "</div></article>";
}

async function readInt(kv, key) {
  if (!kv) return 0;
  const n = parseInt((await kv.get(key)) || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function paperCountKey(recordId, kind) {
  return COUNT_PREFIX + String(recordId || "").trim() + "|" + kind;
}

export async function readPaperCounts(env, recordId) {
  const id = String(recordId || "").trim();
  const kv = kvOf(env);
  if (!id) return { record_id: "", views: null, downloads: null, available: false, invented: false, source: "absent" };
  if (!kv) return { record_id: id, views: null, downloads: null, available: false, invented: false, source: "no-kv" };
  const views = await readInt(kv, paperCountKey(id, "views"));
  const downloads = await readInt(kv, paperCountKey(id, "downloads"));
  let viewsHuman = await readInt(kv, paperCountKey(id, "views_human"));
  let downloadsHuman = await readInt(kv, paperCountKey(id, "downloads_human"));
  if (viewsHuman > views) viewsHuman = views;
  if (downloadsHuman > downloads) downloadsHuman = downloads;
  return {
    record_id: id,
    views,
    downloads,
    views_human: viewsHuman,
    views_bot: views - viewsHuman,
    downloads_human: downloadsHuman,
    downloads_bot: downloads - downloadsHuman,
    available: true,
    invented: false,
    source: "kv",
  };
}

async function readMetrics(env) {
  const kv = kvOf(env);
  const empty = {
    version: 1,
    key: PAPER_METRICS_KEY,
    author: AUTHOR,
    invented: false,
    papers: {},
    note: "Honest per-paper counters. A missing id is not ranked. Counts are not invented.",
  };
  if (!kv) return empty;
  try {
    const raw = await kv.get(PAPER_METRICS_KEY);
    if (!raw) return empty;
    const doc = JSON.parse(raw);
    if (!doc || typeof doc !== "object") return empty;
    doc.papers = doc.papers && typeof doc.papers === "object" ? doc.papers : {};
    doc.invented = false;
    doc.author = AUTHOR;
    return doc;
  } catch {
    return empty;
  }
}

export async function readPaperMetrics(env) {
  return readMetrics(env);
}

async function patchPaperMetrics(env, recordId, kind, absolute) {
  const kv = kvOf(env);
  if (!kv || typeof kv.put !== "function") return null;
  const doc = await readMetrics(env);
  const papers = { ...doc.papers };
  const prev = papers[recordId] && typeof papers[recordId] === "object" ? papers[recordId] : {};
  papers[recordId] = {
    views: Number(prev.views) || 0,
    downloads: Number(prev.downloads) || 0,
    [kind]: Number(absolute) || 0,
  };
  const next = {
    version: 1,
    key: PAPER_METRICS_KEY,
    author: AUTHOR,
    invented: false,
    spec: PAPER_UX_SPEC,
    papers,
    note: "Honest per-paper counters. A missing id is not ranked. Counts are not invented.",
  };
  await kv.put(PAPER_METRICS_KEY, JSON.stringify(next));
  return next;
}

/** Increment one stored counter. Does not invent a starting total. */
export async function bumpPaperCount(env, recordId, kind, request) {
  const kv = kvOf(env);
  const id = String(recordId || "").trim();
  if (!kv || !id) return null;
  if (kind !== "views" && kind !== "downloads") return null;
  const cls = request ? classifyRequest(request) : { bucket: "bot" };
  const n = (await readInt(kv, paperCountKey(id, kind))) + 1;
  await kv.put(paperCountKey(id, kind), String(n));
  if (cls.bucket === "human") {
    const human = (await readInt(kv, paperCountKey(id, kind + "_human"))) + 1;
    await kv.put(paperCountKey(id, kind + "_human"), String(human));
  }
  try { await patchPaperMetrics(env, id, kind, n); } catch { /* page key is the source of truth */ }
  return { record_id: id, [kind]: n, invented: false };
}

/** Top papers that exist in the library and have a stored count above zero. */
export function topPapers(metrics, records, field, limit = 5) {
  const papers = metrics && metrics.papers && typeof metrics.papers === "object" ? metrics.papers : {};
  const byId = new Map();
  for (const row of records || []) {
    const id = recordIdOf(row);
    if (id) byId.set(id, row);
  }
  const rows = [];
  for (const [id, counts] of Object.entries(papers)) {
    const n = Number(counts && counts[field]) || 0;
    if (n <= 0) continue;
    const rec = byId.get(id);
    if (!rec) continue;
    rows.push({
      record_id: id,
      title: rec.title || id,
      views: Number(counts.views) || 0,
      downloads: Number(counts.downloads) || 0,
      permalink: rec.permalink || ("/record/" + id),
      created_utc: rec.created_utc || "",
      undated: filedLabel(rec).undated,
    });
  }
  rows.sort((a, b) => {
    const delta = (Number(b[field]) || 0) - (Number(a[field]) || 0);
    if (delta) return delta;
    return String(a.record_id).localeCompare(String(b.record_id));
  });
  return rows.slice(0, Math.max(Number(limit) || 5, 1));
}

export async function recordIdForContentHash(env, hash) {
  const want = String(hash || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(want)) return null;
  try {
    const { readPackedIndex } = await import("./library-index.js");
    const packed = await readPackedIndex(env);
    const hits = ((packed && packed.records) || []).filter((row) => String(row.content_sha256 || "").toLowerCase() === want);
    if (hits.length === 1) return recordIdOf(hits[0]);
  } catch { /* no guess */ }
  return null;
}

export async function loadReaderText(env, row) {
  let text = String((row && (row.body || row.snippet)) || "");
  let contentType = String((row && row.content_type) || "");
  if (env && env.DB && row && row.record_id && typeof env.DB.prepare === "function") {
    try {
      const full = await env.DB.prepare("SELECT body, content_type, byte_size FROM records WHERE record_id=?").bind(row.record_id).first();
      if (full && full.body != null) text = String(full.body);
      if (full && full.content_type) contentType = String(full.content_type);
    } catch { /* preview text stands */ }
  }
  const truncated = text.length > READER_TEXT_CAP;
  if (truncated) text = text.slice(0, READER_TEXT_CAP);
  const redacted = redactIdentityCluster(text);
  return { text: redacted.text, contentType, truncated, redacted: redacted.redacted };
}

async function metaGet(env, key) {
  try {
    const row = await env.DB.prepare("SELECT value FROM metadata WHERE key=?").bind(key).first();
    return row && row.value ? String(row.value) : "";
  } catch {
    return "";
  }
}

async function metaSet(env, key, value) {
  try {
    await env.DB.prepare("INSERT OR REPLACE INTO metadata(key,value) VALUES(?,?)").bind(key, String(value == null ? "" : value)).run();
  } catch { /* optional */ }
}

function absolutePermalink(path) {
  const v = String(path || "").trim();
  if (!v) return "";
  if (v.startsWith("http")) return v;
  return "https://www.azielcorpuslibrary.net" + (v.startsWith("/") ? v : "/" + v);
}

async function appendPermalinkSidecar(env, row, card) {
  const { persistRecordDiscoveryMetadata, packageMetadataKey, jsonTreeKey } = await import("./record-metadata.js");
  const { getObject, readObjectBytes, putObject } = await import("./library.js");
  const { jsonRecordId, appendDocumentLedger } = await import("./ledger.js");
  const paper = recordIdOf(row);
  const slug = card && card.permalink_slug;
  const path = card && card.permalink;
  if (!paper || !slug || !path) return { ok: false, skipped: true };
  const lib = shelfOfPaper(row);
  const packageKey = packageMetadataKey(lib, paper);
  const treeKey = jsonTreeKey(paper);
  let previous = null;
  try {
    const obj = await getObject(env, packageKey);
    if (obj) {
      const bytes = await readObjectBytes(obj);
      const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []));
      previous = JSON.parse(text);
    }
  } catch { previous = null; }
  const permalink = absolutePermalink(path);
  if (previous && previous.permalink === permalink && previous.permalink_slug === slug) {
    return { ok: true, unchanged: true, record_id: paper };
  }
  if (!previous) {
    const written = await persistRecordDiscoveryMetadata(env, {
      ...row,
      record_id: paper,
      permalink,
      permalink_slug: slug,
      permalink_shelf: lib === "aziel" ? "aziellibrary" : "azielcorpus/usersubmitted",
    });
    return { ok: !!(written && written.ok), record_id: paper, created: true };
  }
  const next = { ...previous };
  if (next.permalink == null || next.permalink === "") next.permalink = permalink;
  if (next.permalink_slug == null || next.permalink_slug === "") next.permalink_slug = slug;
  if (next.permalink_shelf == null || next.permalink_shelf === "") {
    next.permalink_shelf = lib === "aziel" ? "aziellibrary" : "azielcorpus/usersubmitted";
  }
  if (!next.permalink_added_at) next.permalink_added_at = new Date().toISOString();
  if (Array.isArray(next.sameAs) && !next.sameAs.includes(permalink)) next.sameAs = next.sameAs.concat([permalink]);
  const body = JSON.stringify(next, null, 2) + "\n";
  const bytes = new TextEncoder().encode(body);
  try { await putObject(env, packageKey, bytes, "application/json; charset=utf-8"); } catch { /* package */ }
  try { await putObject(env, treeKey, bytes, "application/json; charset=utf-8"); } catch { /* tree */ }
  const jsonId = jsonRecordId(paper);
  let already = false;
  try {
    const hit = await env.DB.prepare("SELECT entry_hash FROM document_ledger WHERE record_id=? AND action=? LIMIT 1").bind(jsonId, "JSON_PAPER_UX").first();
    already = !!(hit && hit.entry_hash);
  } catch { already = false; }
  if (!already) {
    try {
      await appendDocumentLedger(env, jsonId, "JSON_PAPER_UX", {
        record_id: jsonId,
        paper_record_id: paper,
        permalink,
        permalink_slug: slug,
        content_sha256: row.content_sha256 || previous.content_sha256 || null,
        paper_chain_tip: row.chain_tip || previous.paper_chain_tip || null,
        note: "Appended permalink fields. Paper chain_tip is cited, not rewritten.",
      });
    } catch { /* ledger optional */ }
  }
  return { ok: true, record_id: paper, appended: true };
}

/**
 * Idempotent backfill. Stamps permalinks on library:index:v1, then appends
 * permalink fields onto discovery JSON. Does not invent counters or rows.
 */
export async function continuePaperBackfill(env, { ms = 8000, force = false, all = false, recordId = null } = {}) {
  const started = Date.now();
  const stats = { ok: true, spec: PAPER_UX_SPEC, stamped: 0, written: 0, skipped: 0, failed: 0, done: false, cursor: "", invented: false };
  if (!env || !env.DB) {
    stats.ok = false;
    stats.done = false;
    stats.error = "no database";
    return stats;
  }
  const { readPackedIndex, writePackedIndex, loadShelfCards } = await import("./library-index.js");
  let packed = await readPackedIndex(env);
  let indexDone = await metaGet(env, INDEX_DONE_KEY);
  if (force) {
    indexDone = "";
    await metaSet(env, DONE_KEY, "");
    await metaSet(env, CURSOR_KEY, "");
  }
  if (!indexDone || force || recordId) {
    const fresh = await loadShelfCards(env);
    const base = fresh.length ? fresh : (packed.records || []);
    const merged = mergeLockedPermalinks(base, packed.records || []);
    const stamped = stampPermalinks(merged.length ? merged : (packed.records || []));
    packed = await writePackedIndex(env, { ...packed, records: stamped });
    stats.stamped = stamped.length;
    await metaSet(env, INDEX_DONE_KEY, new Date().toISOString());
  }
  const cards = new Map(((packed && packed.records) || []).map((row) => [recordIdOf(row), row]));
  if (recordId) {
    let row = null;
    try {
      row = await env.DB.prepare("SELECT record_id, title, body, created_utc, library, filename, author, domain, subjects, keywords, content_sha256, chain_tip FROM records WHERE record_id=?").bind(recordId).first();
    } catch { row = null; }
    if (!row) {
      stats.failed = 1;
      stats.done = true;
      return stats;
    }
    const card = cards.get(recordId) || stampPermalinks([row])[0];
    const one = await appendPermalinkSidecar(env, row, card);
    if (one && one.unchanged) stats.skipped = 1;
    else if (one && one.ok) stats.written = 1;
    else stats.failed = 1;
    stats.done = true;
    return stats;
  }
  let cursor = await metaGet(env, CURSOR_KEY);
  const doneFlag = await metaGet(env, DONE_KEY);
  if (doneFlag && !force && !all) {
    stats.done = true;
    stats.cursor = cursor;
    stats.stamped = cards.size;
    return stats;
  }
  while (all || Date.now() - started < ms) {
    let batch = [];
    try {
      const sql = cursor
        ? "SELECT record_id, title, body, created_utc, library, filename, author, domain, subjects, keywords, content_sha256, chain_tip FROM records WHERE record_id>? ORDER BY record_id ASC LIMIT ?"
        : "SELECT record_id, title, body, created_utc, library, filename, author, domain, subjects, keywords, content_sha256, chain_tip FROM records ORDER BY record_id ASC LIMIT ?";
      batch = (await env.DB.prepare(sql).bind(...(cursor ? [cursor, CHUNK] : [CHUNK])).all()).results || [];
    } catch { batch = []; }
    if (!batch.length) {
      stats.done = true;
      await metaSet(env, DONE_KEY, new Date().toISOString());
      await metaSet(env, CURSOR_KEY, "");
      break;
    }
    for (const row of batch) {
      cursor = row.record_id;
      try {
        const card = cards.get(row.record_id) || stampPermalinks([row])[0];
        const one = await appendPermalinkSidecar(env, row, card);
        if (one && one.unchanged) stats.skipped += 1;
        else if (one && one.ok) stats.written += 1;
        else stats.failed += 1;
      } catch {
        stats.failed += 1;
      }
    }
    await metaSet(env, CURSOR_KEY, cursor);
    stats.cursor = cursor;
    if (!all && Date.now() - started >= ms) break;
  }
  await metaSet(env, STATS_KEY, JSON.stringify(stats));
  return stats;
}

export async function paperBackfillStatus(env) {
  return {
    ok: true,
    spec: PAPER_UX_SPEC,
    index_done: await metaGet(env, INDEX_DONE_KEY),
    done: await metaGet(env, DONE_KEY),
    cursor: await metaGet(env, CURSOR_KEY),
    stats: await metaGet(env, STATS_KEY),
    invented: false,
    author: AUTHOR,
  };
}
