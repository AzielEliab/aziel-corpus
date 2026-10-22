/**
 * CORPUS-INTAKE-SAFETY-1.0 — text checks (injection, hidden content, explicit
 * content, child-safety indicators, spam / poisoning).
 *
 * HARD rules apply to everyone, the operator included:
 *   INTAKE-TEXT-INVISIBLE       zero-width / bidi-control / tag characters used to hide text
 *   INTAKE-TEXT-HIDDEN-MARKUP   CSS/HTML/Word constructs that hide text from human readers
 *   INTAKE-TEXT-ENCODED-INJECTION  base64 / hex / %xx / entity / \u / rot13 payloads that decode to instructions
 *   INTAKE-TEXT-CSAM-INDICATOR  a minor term near a sexual term, or a known abuse code word
 *   INTAKE-TEXT-EXPLICIT        explicit sexual content (strong-term density)
 * HEURISTIC rules (the operator is exempt; open question for Aziel):
 *   INTAKE-TEXT-INJECTION       plain "ignore previous instructions"-style phrasing, chat-template tokens
 *   INTAKE-TEXT-SPAM            link/keyword stuffing, repetition, homoglyph mixing, spam lexicon
 *
 * Everything here is a lexicon or a pattern. It is heuristic: it will miss
 * paraphrases and it will sometimes refuse a legitimate paper. Refusal is the
 * safe failure: the submitter can rephrase; a missed item would be chained forever.
 *
 * What file text is read (AZBot review #186): .txt/.md/.html/.xml etc. decoded as UTF-8,
 * UTF-16 LE/BE (BOM or not) or latin1 via decodeTextBytes, else INTAKE-UNDECODABLE;
 * every docx/odt/xlsx/pptx zip part (package XML is not scored as spam or HTML-hidden;
 * Word runs are joined as a reader sees them); PDF literal/hex strings (octal escapes,
 * UTF-16 BOMs), TJ arrays, and CID fonts through their ToUnicode CMaps, after Flate /
 * ASCII85 / ASCIIHex (other filters refuse at the media floor). Known limits: PDF text in
 * a font with no ToUnicode and a custom encoding, text drawn as vector paths or images,
 * encrypted PDFs, and anything outside those encodings are not read. No scanner is
 * perfect; this is a floor, not a guarantee.
 * Tests use reserved synthetic tokens only (see SYNTHETIC below). Author: Aziel Eliab.
 */
import { inflateSync } from "node:zlib";
import { sniffMagic, pdfStreams, pdfDecodeStream, decodeTextBytes } from "./intake-media.js";
import { listZipEntries, readZipFiles } from "./zip.js";
import { TOO_LARGE_CODE, MAX_SCREEN_CHARS } from "./intake-budget.js";

export const TEXT_REASONS = Object.freeze({
  INVISIBLE: "INTAKE-TEXT-INVISIBLE",
  HIDDEN_MARKUP: "INTAKE-TEXT-HIDDEN-MARKUP",
  INJECTION: "INTAKE-TEXT-INJECTION",
  ENCODED_INJECTION: "INTAKE-TEXT-ENCODED-INJECTION",
  CSAM_INDICATOR: "INTAKE-TEXT-CSAM-INDICATOR",
  EXPLICIT: "INTAKE-TEXT-EXPLICIT",
  SPAM: "INTAKE-TEXT-SPAM",
  // Same code as the media floor: bytes we cannot read as text are refused, not skipped.
  UNDECODABLE: "INTAKE-UNDECODABLE",
});

/** Reserved synthetic tokens. They exist so tests never need real terms. */
export const SYNTHETIC = Object.freeze({
  MINOR: "__az_synthetic_minor__",
  SEXUAL: "__az_synthetic_sexual__",
  EXPLICIT: "__az_synthetic_explicit__",
  CODEWORD: "__az_synthetic_abuse_codeword__",
  SPAM: "__az_synthetic_spam__",
});

// ---------- normalisation ----------
const INVISIBLE_ALWAYS = /[\u200B\u2060-\u2064\u180E\u034F\u115F\u1160\u3164\uFFA0\u202A-\u202E\u2066-\u2069\u206A-\u206F\u061C]|[\u{E0000}-\u{E007F}]|(?<!^)\uFEFF/u;
const JOINERS_NEAR_ASCII = /[\u0000-\u007F][\u200C\u200D]|[\u200C\u200D][\u0000-\u007F]/;
const STRIP_INVISIBLE = /[\u200B-\u200F\u2060-\u2064\u180E\u00AD\u034F\u202A-\u202E\u2066-\u2069\u206A-\u206F\u061C\uFEFF]|[\u{E0000}-\u{E007F}]/gu;
const HOMOGLYPHS = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "ӏ": "l", "һ": "h", "к": "k", "м": "m", "т": "t", "в": "b", "н": "h",
  "α": "a", "ε": "e", "ι": "i", "κ": "k", "ν": "v", "ο": "o", "ρ": "p", "τ": "t", "υ": "u", "χ": "x", "ɡ": "g", "ı": "i",
};
export function normalizeForMatch(s) {
  let t = String(s || "").normalize("NFKC").replace(STRIP_INVISIBLE, "").toLowerCase();
  t = t.replace(/[аеорсухіјѕԁӏһкмтвнαειкνορτυχɡı]/g, (c) => HOMOGLYPHS[c] || c);
  // leetspeak for the instruction words only
  t = t.replace(/(?<=[a-z])[0](?=[a-z])/g, "o").replace(/(?<=[a-z])[1](?=[a-z])/g, "i").replace(/(?<=[a-z])[3](?=[a-z])/g, "e");
  return t.replace(/[^\p{L}\p{N}_<>|\[\]/]+/gu, " ").replace(/\s+/g, " ").trim();
}

// ---------- injection ----------
const INJECTION_PATTERNS = [
  /\b(ignore|disregard|forget|override|bypass|skip|drop)\s+(all\s+|any\s+|the\s+|your\s+|of\s+)*(previous|prior|above|earlier|preceding|former|original|system|existing|safety)\s+(instructions?|prompts?|rules?|directives?|guidelines?|messages?|context)\b/,
  /\b(ignore|disregard|forget)\s+(everything|all)\s+(you\s+)?(were\s+told|above|before)\b/,
  /\byou\s+are\s+now\s+(dan|in\s+developer\s+mode|jailbroken|unrestricted|unfiltered|free\s+of|no\s+longer\s+bound)\b/,
  /\b(do\s+anything\s+now|developer\s+mode\s+enabled|jailbreak\s+mode)\b/,
  /\b(reveal|print|show|output|repeat|leak|dump)\s+(me\s+)?(your|the)\s+(hidden\s+|secret\s+|initial\s+|full\s+)?(system\s+prompt|instructions|prompt|api\s+keys?|secrets?)\b/,
  /\bnew\s+(system\s+)?instructions\s*(follow|below|are)?\b.{0,40}\b(you\s+must|always|never|from\s+now\s+on)\b/,
  /\bfrom\s+now\s+on\s+you\s+(will|must|are)\b/,
  /<\|?\s*(im_start|im_end|system|endoftext|eot_id|start_header_id)\s*\|?>/,
  /\[\s*\/?\s*(inst|sys)\s*\]|<<\s*sys\s*>>/,
  /<\/?\s*(system|assistant|tool_call|function_call)\s*>/,
  /\b(as\s+an?\s+ai\s+(agent|assistant|model)\s+reading\s+this|attention\s+(ai|llm|agent|assistant)s?\s*[:,]|note\s+to\s+(ai|llm|agents?|assistants?)\s*[:,])/,
];
export function injectionHit(text) {
  const n = normalizeForMatch(text);
  if (!n) return false;
  return INJECTION_PATTERNS.some((re) => re.test(n));
}

// ---------- lexicons (kept small, clinical, documented as heuristic) ----------
const MINOR_TERMS = new Set([SYNTHETIC.MINOR, "child", "children", "childs", "kid", "kids", "minor", "minors", "underage", "preteen", "preteens", "prepubescent", "pubescent", "toddler", "toddlers", "infant", "infants", "schoolgirl", "schoolgirls", "schoolboy", "schoolboys", "loli", "lolis", "shota", "juvenile", "juveniles", "boy", "boys", "girl", "girls", "teen", "teens", "young", "little"]);
const MINOR_AGE = /\b([1-9]|1[0-7])\s*(yo|y o|yr|yrs|years?|year)\s*(old)?\b/;
const SEXUAL_TERMS = new Set([SYNTHETIC.SEXUAL, SYNTHETIC.EXPLICIT, "sex", "sexual", "sexually", "sexy", "nude", "nudes", "naked", "nudity", "porn", "porno", "pornographic", "pornography", "erotic", "erotica", "explicit", "nsfw", "xxx", "lewd", "intercourse", "genital", "genitals", "masturbate", "masturbating", "masturbation", "orgasm", "fetish", "undress", "undressed", "topless", "seductive", "hentai"]);
// Standalone abuse code words. Kept to unambiguous ones; the list is a heuristic and incomplete.
const ABUSE_CODEWORDS = new Set([SYNTHETIC.CODEWORD, "pthc", "ptsc", "jailbait", "lolicon", "shotacon", "csam"]);
// Research/prevention context does NOT unlock: the floor refuses and Aziel reviews.
const EXPLICIT_STRONG = new Set([SYNTHETIC.EXPLICIT, "porn", "porno", "pornographic", "xxx", "nsfw", "hentai", "blowjob", "handjob", "cumshot", "gangbang", "creampie", "deepthroat", "bukkake", "camgirl", "sexting", "nudes", "masturbate", "masturbating", "orgasm", "milf", "onlyfans"]);
const SPAM_TERMS = [SYNTHETIC.SPAM, "viagra", "cialis", "casino", "poker online", "sports betting", "payday loan", "crypto airdrop", "free money", "click here", "buy now", "limited offer", "act now", "work from home", "earn money fast", "make money online", "backlinks", "seo services", "escort service", "weight loss pills", "replica watches", "100% free", "risk free", "guaranteed income"];

function tokens(n) { return n.split(/[\s<>|\[\]\/]+/).filter(Boolean); }

export function csamIndicator(text, { window = 12 } = {}) {
  const n = normalizeForMatch(text);
  if (!n) return false;
  const toks = tokens(n);
  if (toks.some((t) => ABUSE_CODEWORDS.has(t))) return true;
  const minorAt = [];
  const sexualAt = [];
  toks.forEach((t, i) => {
    if (MINOR_TERMS.has(t)) minorAt.push(i);
    if (SEXUAL_TERMS.has(t)) sexualAt.push(i);
  });
  // ages under 18 expressed as "<n> years old" / "<n>yo"
  const ageRe = new RegExp(MINOR_AGE.source, "g");
  let m;
  while ((m = ageRe.exec(n))) minorAt.push(tokens(n.slice(0, m.index)).length);
  if (!minorAt.length || !sexualAt.length) return false;
  // Words that only mean "minor" in combination ("young", "little", "girl", "boy", "teen")
  // still count: the floor errs on refusal.
  for (const a of minorAt) for (const b of sexualAt) if (Math.abs(a - b) <= window) return true;
  return false;
}

export function explicitHit(text) {
  const toks = tokens(normalizeForMatch(text));
  let total = 0;
  const distinct = new Set();
  for (const t of toks) if (EXPLICIT_STRONG.has(t)) { total++; distinct.add(t); }
  return distinct.size >= 2 || total >= 3;
}

// ---------- hidden content ----------
const HIDDEN_CSS = /(display\s*:\s*none|visibility\s*:\s*(hidden|collapse)|font-size\s*:\s*0*(\.0+)?(px|pt|em|rem|%)?\s*(;|"|'|\}|$)|opacity\s*:\s*0*(\.0+)?\s*(;|"|'|\}|$)|text-indent\s*:\s*-\d{3,}|(left|top|right)\s*:\s*-\d{4,}|clip\s*:\s*rect\(\s*0|clip-path\s*:\s*inset\(\s*(50|100)%|(max-)?height\s*:\s*0[^.\d][^"']*overflow\s*:\s*hidden|color\s*:\s*transparent)/i;
const HIDDEN_ATTR = /<[a-z][^>]*\s(hidden|aria-hidden\s*=\s*["']?true)(\s|=|>|\/)/i;
// Was the HIDDEN_ATTR alternative /<!--[\s\S]{40,}?-->/i, which overflows the regex
// stack on a multi-MiB comment; this is the same test: a "-->" at least 40 chars
// after the first "<!--" (a later "<!--" can only need a later "-->").
function longHtmlComment(s) {
  const i = s.indexOf("<!--");
  return i >= 0 && s.indexOf("-->", i + 44) >= 0;
}
// HTML elements whose content a reader never sees. Only for HTML-like text: in
// Office/ODF XML a <Template> element is document metadata (docProps/app.xml names
// the Word template, e.g. Normal.dotm), not a hidden HTML template (AZBot review #186).
const HIDDEN_HTML_ELEMENT = /<(template|noscript|noembed|noframes)(\s|>|\/)/i;
const HIDDEN_WORD = /<w:(vanish|webHidden|specVanish)\b|<w:sz\s+w:val="[01]"|<w:color\s+w:val="(FFFFFF|auto)"[^>]*\/>\s*<w:shd[^>]*w:fill="FFFFFF"/i;
/** kind: "html" (title, body, text and HTML files; the default) or "xml" (Office/ODF/EPUB package XML). */
export function hiddenMarkupHit(text, { kind = "html" } = {}) {
  const s = String(text || "");
  if (!/[<{:]/.test(s)) return false;
  if (HIDDEN_CSS.test(s) && /<[a-z!]|style\s*=|\{/i.test(s)) return true;
  if (HIDDEN_ATTR.test(s) || longHtmlComment(s) || HIDDEN_WORD.test(s)) return true;
  return kind !== "xml" && HIDDEN_HTML_ELEMENT.test(s);
}

export function invisibleHit(text) {
  const s = String(text || "");
  return INVISIBLE_ALWAYS.test(s) || JOINERS_NEAR_ASCII.test(s);
}

// ---------- encoded payloads ----------
function printableRatio(s) {
  if (!s.length) return 0;
  let p = 0;
  for (const ch of s) { const c = ch.codePointAt(0); if (c === 9 || c === 10 || c === 13 || (c >= 32 && c !== 127 && c !== 0xfffd)) p++; }
  return p / s.length;
}
// Encoded-run scanners. They return the same matches, in the same order, as the
// regexes named in each comment, but walk the text in a loop: a quantified group over
// a multi-MiB run (a long homogeneous line, a table of digits, a base64 blob) overflows
// the regex engine's backtracking stack, which refused large legitimate papers with
// INTAKE-CHECK-ERROR (AZBot review, intake-text.js:169). Nothing is skipped or capped
// beyond the existing 500-candidate limit; each group is matched deterministically
// (none of these patterns can match a group in two ways), so no backtracking is needed.
const B64_CHAR = new Uint8Array(128);
for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/_-") B64_CHAR[ch.charCodeAt(0)] = 1;
const HEX_CHAR = new Uint8Array(128);
for (const ch of "0123456789abcdefABCDEF") HEX_CHAR[ch.charCodeAt(0)] = 1;
const isB64At = (s, i) => { const c = s.charCodeAt(i); return c < 128 && B64_CHAR[c] === 1; };
const isHexAt = (s, i) => { const c = s.charCodeAt(i); return c < 128 && HEX_CHAR[c] === 1; };
const HEX_SEP = /[\s,:]/;

/** /(?:[A-Za-z0-9+/_-]{4}(?:\r?\n)?){6,}(?:[A-Za-z0-9+/_-]{2,3}={0,2})?/g, up to max matches. */
export function base64Runs(s, max = Infinity) {
  const out = [];
  const L = s.length;
  let p = 0;
  while (p < L && out.length < max) {
    if (!isB64At(s, p)) { p++; continue; }
    let q = p;
    let groups = 0;
    while (q + 4 <= L && isB64At(s, q) && isB64At(s, q + 1) && isB64At(s, q + 2) && isB64At(s, q + 3)) {
      q += 4;
      groups++;
      if (s.charCodeAt(q) === 13 && s.charCodeAt(q + 1) === 10) q += 2;
      else if (s.charCodeAt(q) === 10) q++;
    }
    if (groups < 6) { p++; continue; }
    let t = q;
    while (t - q < 3 && t < L && isB64At(s, t)) t++;
    if (t - q >= 2) {
      let e = 0;
      while (e < 2 && s.charCodeAt(t) === 61) { t++; e++; }
      q = t;
    }
    out.push(s.slice(p, q));
    p = q;
  }
  return out;
}

/** /(?:(?:0x|\\x)?[0-9a-fA-F]{2}[\s,:]?){12,}/g, up to max matches. */
export function hexRuns(s, max = Infinity) {
  const out = [];
  const L = s.length;
  let p = 0;
  while (p < L && out.length < max) {
    const c0 = s.charCodeAt(p);
    if (c0 !== 92 && !isHexAt(s, p)) { p++; continue; }
    let q = p;
    let groups = 0;
    for (;;) {
      let g = q;
      const c = s.charCodeAt(g);
      if ((c === 48 || c === 92) && s.charCodeAt(g + 1) === 120 && isHexAt(s, g + 2) && isHexAt(s, g + 3)) g += 4;
      else if (g + 2 <= L && isHexAt(s, g) && isHexAt(s, g + 1)) g += 2;
      else break;
      if (g < L && HEX_SEP.test(s[g])) g++;
      q = g;
      groups++;
    }
    if (groups < 12) { p++; continue; }
    out.push(s.slice(p, q));
    p = q;
  }
  return out;
}

/** /(%[0-9a-fA-F]{2}){6,}/.test(s) */
export function hasPercentRun(s) {
  let i = s.indexOf("%");
  while (i >= 0) {
    let k = 0;
    let j = i;
    while (s.charCodeAt(j) === 37 && isHexAt(s, j + 1) && isHexAt(s, j + 2)) {
      if (++k >= 6) return true;
      j += 3;
    }
    i = s.indexOf("%", i + 1);
  }
  return false;
}

// A decoded blob that is mostly not text (a homogeneous base64/hex run glued onto an
// encoded payload, or a payload inside binary) used to be dropped by the
// printableRatio filter, so the text checks never saw the payload (AZBot review,
// intake-text.js:255-278). Now every printable subrun of DECODED_SUBRUN_MIN+ chars is
// scanned too (joined, so a marker split across two subruns is still seen), and each
// run is decoded at every alignment (base64: 4, hex: 2) because a glued prefix of the
// wrong length shifts the payload. A fully printable blob is still scanned whole.
export const DECODED_SUBRUN_MIN = 12;
const isPrintableUnit = (c) => c === 9 || c === 10 || c === 13 || (c >= 32 && c !== 127 && c !== 0xfffd);
export function printableSubruns(d, min = DECODED_SUBRUN_MIN) {
  const out = [];
  let start = -1;
  for (let i = 0; i <= d.length; i++) {
    if (i < d.length && isPrintableUnit(d.charCodeAt(i))) { if (start < 0) start = i; continue; }
    if (start >= 0 && i - start >= min) out.push(d.slice(start, i));
    start = -1;
  }
  return out;
}
// Words split by short non-printable gaps (one control byte, a NUL every few chars)
// leave every subrun under DECODED_SUBRUN_MIN (AZBot review of #191,
// intake-text.js:263-279). These views turn each gap of DECODED_GAP_MAX or fewer
// non-printable units into one space (a gap between words), and into nothing (a gap
// inside a word), and keep the joined segments of DECODED_SUBRUN_MIN+ chars; longer
// gaps end a segment.
export const DECODED_GAP_MAX = 3;
export function gapJoinedSegments(d, { sep = " ", gap = DECODED_GAP_MAX, min = DECODED_SUBRUN_MIN } = {}) {
  const out = [];
  let seg = "";
  let start = -1;
  const flush = () => { if (seg.length >= min) out.push(seg); seg = ""; };
  for (let i = 0; i <= d.length; i++) {
    if (i < d.length && isPrintableUnit(d.charCodeAt(i))) { if (start < 0) start = i; continue; }
    if (start >= 0) { seg += d.slice(start, i); start = -1; }
    if (i === d.length) break;
    let j = i;
    while (j < d.length && !isPrintableUnit(d.charCodeAt(j))) j++;
    if (j < d.length && j - i <= gap && seg.length) seg += sep;
    else flush();
    i = j - 1;
  }
  flush();
  return out;
}
function pushDecoded(out, d) {
  if (printableRatio(d) > 0.9) out.push(d);
  const runs = printableSubruns(d);
  const whole = runs.length === 1 && runs[0].length === d.length;
  const joined = runs.join("\n");
  if (runs.length && !whole) out.push(joined);
  if (!whole) {
    for (const sep of [" ", ""]) {
      const gapped = gapJoinedSegments(d, { sep }).join("\n");
      if (gapped && gapped !== joined) out.push(gapped);
    }
  }
}

// Every base64/hex run is decoded: a run cap let N decoy runs push the payload past
// the cap (AZBot review: 500 decoys then a payload passed). Candidates are yielded one
// run at a time so memory stays at one run's views, not the whole file's.
function* decodedCandidates(text) {
  const s = String(text || "");
  let out = [];
  const td = new TextDecoder("utf-8", { fatal: false });
  for (const run of base64Runs(s)) {
    const chars = run.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    for (let shift = 0; shift < 4 && shift < chars.length; shift++) {
      try { pushDecoded(out, td.decode(Buffer.from(chars.slice(shift), "base64"))); } catch { /* not base64 */ }
    }
    yield* out;
    out = [];
  }
  for (const run of hexRuns(s)) {
    const h = run.replace(/0x|\\x/g, "").replace(/[^0-9a-fA-F]/g, "");
    for (let shift = 0; shift < 2 && shift < h.length; shift++) {
      const k = h.slice(shift);
      pushDecoded(out, td.decode(Buffer.from(k.slice(0, k.length - (k.length % 2)), "hex")));
    }
    yield* out;
    out = [];
  }
  if (hasPercentRun(s)) { try { out.push(decodeURIComponent(s.replace(/%(?![0-9a-fA-F]{2})/g, "%25"))); } catch { /* bad */ } }
  if (/&#x?[0-9a-fA-F]+;/.test(s)) out.push(s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16) || 32)).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d) || 32)));
  if (/\\u[0-9a-fA-F]{4}/.test(s)) out.push(s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
  out.push(s.replace(/[a-zA-Z]/g, (c) => String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26)));
  yield* out;
}
export function encodedInjectionHit(text) {
  for (const d of decodedCandidates(text)) {
    if (injectionHit(d) || csamIndicator(d) || explicitHit(d)) return true;
  }
  return false;
}

// ---------- spam / poisoning ----------
const STOP = new Set(["the", "and", "for", "that", "with", "this", "are", "was", "from", "have", "not", "but", "his", "her", "they", "you", "all", "which", "their", "its", "has", "were", "been", "one", "our", "out", "who"]);
/**
 * Spam is scored on what a reader sees. extraUrls adds link targets that are not in
 * the visible text (HTML href, Office relationship targets) so link stuffing behind
 * anchor text still counts; XML namespace URLs never do (AZBot review #186).
 */
export function spamScore(text, { extraUrls = 0 } = {}) {
  const raw = String(text || "");
  const n = normalizeForMatch(raw);
  const words = tokens(n);
  let score = 0;
  // No \b: Word runs glue visible text, so a URL can follow a word character directly.
  const urls = (raw.match(/https?:\/\/|www\./gi) || []).length + extraUrls;
  if (urls > 25) score += 2;
  else if (urls >= 5 && words.length && urls / words.length > 0.08) score += 1;
  const lower = " " + n + " ";
  const spamHits = SPAM_TERMS.filter((t) => lower.includes(" " + t + " ")).length + (lower.split(" " + SYNTHETIC.SPAM + " ").length - 2 > 0 ? lower.split(" " + SYNTHETIC.SPAM + " ").length - 2 : 0);
  if (spamHits >= 3) score += 2;
  else if (spamHits >= 1) score += 1;
  if (words.length >= 50) {
    const freq = new Map();
    for (const w of words) if (w.length >= 3 && !STOP.has(w)) freq.set(w, (freq.get(w) || 0) + 1);
    const top = Math.max(0, ...freq.values());
    if (top / words.length > 0.4) score += 2;
    else if (top / words.length > 0.25) score += 1;
  }
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 10 && new Set(lines).size / lines.length < 0.5) score += 1;
  const mixed = (raw.normalize("NFKC").match(/\S+/g) || []).filter((w) => /[A-Za-z]/.test(w) && /[\u0400-\u04FF\u0370-\u03FF]/.test(w)).length;
  if (mixed >= 3) score += 2;
  const letters = raw.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 50 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6) score += 1;
  return score;
}
export const SPAM_THRESHOLD = 3;

// ---------- file text ----------
const TEXT_PART_EXT = /\.(xml|rels|html?|xhtml|svg|txt|md|csv|json|opf|ncx|vml|xsl|xslt|css|js)$/i;
const XML_PART = /\.(xml|rels|opf|ncx|vml|xsl|xslt)$/i;

/**
 * Text of an uploaded file as [{ text, kind }]; kind "html" | "xml" | "pdf".
 * { undecodable: true } when bytes that must be text cannot be decoded confidently
 * (UTF-16 is decoded as UTF-16, never as UTF-8) — the caller refuses (fail closed).
 */
export async function fileTexts(file) {
  if (!file || !(file.bytes instanceof Uint8Array)) return { parts: [] };
  const u8 = file.bytes;
  const head = sniffMagic(u8);
  if (!head) {
    const d = decodeTextBytes(u8);
    if (!d.ok) return { parts: [], undecodable: true };
    return { parts: [{ text: d.text, kind: XML_PART.test(String(file.name || "")) ? "xml" : "html" }] };
  }
  if (head.kind === "pdf") return pdfTexts(u8);
  if (head.kind === "zip") {
    const listed = listZipEntries(u8);
    if (!listed.ok) return { parts: [], undecodable: true };
    const names = listed.entries.filter((e) => !e.directory).map((e) => e.name);
    const read = readZipFiles(u8, names);
    if (!read.ok) return { parts: [], undecodable: true };
    const parts = [];
    for (const [name, b] of Object.entries(read.files)) {
      const d = decodeTextBytes(b);
      if (d.ok) parts.push({ text: d.text, kind: XML_PART.test(name) ? "xml" : "html", name });
      // A text part we cannot read is refused; binary parts are the media floor's job.
      else if (TEXT_PART_EXT.test(name)) return { parts: [], undecodable: true };
    }
    return { parts };
  }
  return { parts: [] };
}

/** One PDF literal string body (between the outer parentheses) as bytes. */
function pdfLiteralBytes(body) {
  const out = [];
  for (let i = 0; i < body.length; i++) {
    let c = body.charCodeAt(i);
    if (c !== 0x5c) { out.push(c & 0xff); continue; }
    const n = body[++i];
    if (n === undefined) break;
    if (/[0-7]/.test(n)) {
      let o = n;
      while (o.length < 3 && /[0-7]/.test(body[i + 1] || "")) o += body[++i];
      out.push(parseInt(o, 8) & 0xff);
    } else if (n === "\r") { if (body[i + 1] === "\n") i++; }
    else if (n === "\n") { /* line continuation */ }
    else out.push({ n: 10, r: 13, t: 9, b: 8, f: 12 }[n] ?? (n.charCodeAt(0) & 0xff));
  }
  return Uint8Array.from(out);
}
/** PDF text string bytes: UTF-16BE / UTF-8 by BOM, else PDFDocEncoding (≈ latin1). */
function pdfStringText(b) {
  if (looksGlyphCodes(b)) return ""; // 2-byte CIDs: read through the font's ToUnicode map instead
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder("utf-16be").decode(b.subarray(2));
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder("utf-16le").decode(b.subarray(2));
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return new TextDecoder("utf-8").decode(b.subarray(3));
  return Buffer.from(b).toString("latin1");
}
function looksGlyphCodes(b) {
  if (b.length < 2 || b.length % 2 || (b[0] === 0xfe && b[1] === 0xff) || (b[0] === 0xff && b[1] === 0xfe)) return false;
  let z = 0;
  for (let i = 0; i < b.length; i += 2) if (b[i] === 0) z++;
  return z * 2 >= b.length * 0.9;
}

// ---------- PDF ToUnicode (CID fonts: Chrome/Skia, Word, LaTeX subsets) ----------
function hexToBytes(h) {
  h = h.replace(/[^0-9a-fA-F]/g, "");
  if (h.length % 2) h += "0";
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}
function utf16beHex(h) {
  const b = hexToBytes(h);
  let s = "";
  for (let i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode((b[i] << 8) | b[i + 1]);
  return s;
}
/** Parse one ToUnicode CMap: { len: code bytes, map: Map(code -> text) } or null. */
export function parseToUnicode(cmapText) {
  const map = new Map();
  let len = 0;
  const sec = /begin(bfchar|bfrange)([\s\S]*?)end\1/g;
  let m;
  while ((m = sec.exec(cmapText)) && map.size < 70000) {
    if (m[1] === "bfchar") {
      const re = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g;
      let c;
      while ((c = re.exec(m[2]))) { len = len || c[1].length / 2; map.set(parseInt(c[1], 16), utf16beHex(c[2])); }
    } else {
      const re = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<([0-9a-fA-F]+)>|\[([^\]]*)\])/g;
      let c;
      while ((c = re.exec(m[2]))) {
        len = len || c[1].length / 2;
        const lo = parseInt(c[1], 16);
        const hi = Math.min(parseInt(c[2], 16), lo + 65535);
        if (c[4] !== undefined) {
          const base = utf16beHex(c[4]);
          const last = base.charCodeAt(base.length - 1);
          for (let k = lo; k <= hi && map.size < 70000; k++) map.set(k, base.slice(0, -1) + String.fromCharCode(last + (k - lo)));
        } else {
          const list = c[5].match(/<([0-9a-fA-F]*)>/g) || [];
          list.forEach((x, i) => { if (lo + i <= hi) map.set(lo + i, utf16beHex(x.slice(1, -1))); });
        }
      }
    }
  }
  return map.size ? { len: len || 1, map } : null;
}
function mapCodes(bytes, cmap) {
  let s = "";
  for (let i = 0; i + cmap.len <= bytes.length; i += cmap.len) {
    let code = 0;
    for (let j = 0; j < cmap.len; j++) code = code * 256 + bytes[i + j];
    s += cmap.map.get(code) ?? " ";
  }
  return s;
}
/**
 * PDF parse caps. Hitting one refuses INTAKE-UNDECODABLE (fail closed); it never
 * truncates, so decoys cannot push a payload past a cap (AZBot review of #192).
 */
export const PDF_CAPS = Object.freeze({ LITERALS: 20000, STRINGS: 40000, TOKENS: 2000000, OBJECTS: 200000 });
export class PdfCapError extends Error {
  constructor(cap) { super("pdf cap " + cap); this.cap = cap; }
}
/**
 * Text shown by content streams, decoded through each font's ToUnicode CMap.
 * objects: Map(objnum -> { dict, data? }) for plain and object-stream objects.
 * Returns glued text per show operation (TJ arrays joined, Tj runs spaced).
 */
function pdfShownText(objects, contents) {
  const cmapOf = new Map();
  const fontsByName = new Map();
  const addFont = (name, num) => { if (!fontsByName.has(name)) fontsByName.set(name, new Set()); fontsByName.get(name).add(num); };
  for (const [, o] of objects) {
    const fr = /\/Font\s*(<<([\s\S]*?)>>|(\d+)\s+\d+\s+R)/g;
    let m;
    while ((m = fr.exec(o.dict))) {
      const body = m[2] !== undefined ? m[2] : (objects.get(Number(m[3]))?.dict || "");
      const pr = /\/([^\s\/<>\[\]()]+)\s+(\d+)\s+\d+\s+R/g;
      let p;
      while ((p = pr.exec(body))) addFont(p[1], Number(p[2]));
    }
  }
  const cmapForFont = (num) => {
    if (cmapOf.has(num)) return cmapOf.get(num);
    let cm = null;
    const font = objects.get(num);
    let tu = font && /\/ToUnicode\s+(\d+)\s+\d+\s+R/.exec(font.dict);
    if (!tu && font) {
      // Type0: the ToUnicode sits on the composite font; descendants do not carry one.
      const d = /\/DescendantFonts\s*\[\s*(\d+)\s+\d+\s+R/.exec(font.dict);
      if (d) tu = /\/ToUnicode\s+(\d+)\s+\d+\s+R/.exec(objects.get(Number(d[1]))?.dict || "");
    }
    if (tu) { const t = objects.get(Number(tu[1])); if (t && t.data) cm = parseToUnicode(t.data); }
    cmapOf.set(num, cm);
    return cm;
  };
  const out = [];
  // Same-line moves (Td with y = 0, per-glyph placement as Chrome/Skia writes it) join;
  // a new line (Td/TD with y != 0, T*, Tm, ', ") is a space; TJ kerning >= 200 is a space.
  const tok = /\/([^\s\/<>\[\]()]+)\s+[-\d.]+\s+Tf|<([0-9A-Fa-f\s]*)>|\((?:\\[\s\S]|[^\\)])*\)|\[|\]\s*TJ|([-\d.]+)\s+([-\d.]+)\s+T[dD]\b|(-?\d+\.?\d*)(?=\s*[<(])|\b(T\*|Tm|ET)\b|(?<=[\s)>])['"](?=\s)/g;
  for (const c of contents) {
    let fonts = [];
    let inArray = false;
    let line = "";
    let m;
    let n = 0;
    while ((m = tok.exec(c))) {
      if (++n > PDF_CAPS.TOKENS) throw new PdfCapError("TOKENS");
      if (m[1] !== undefined) {
        fonts = [...(fontsByName.get(m[1]) || [])].map(cmapForFont).filter(Boolean);
      } else if (m[2] !== undefined || m[0][0] === "(") {
        const bytes = m[2] !== undefined ? hexToBytes(m[2]) : pdfLiteralBytes(m[0].slice(1, -1));
        if (fonts.length) line += mapCodes(bytes, fonts[0]);
      } else if (m[0] === "[") inArray = true;
      else if (/^\]/.test(m[0])) inArray = false;
      else if (m[3] !== undefined) { if (Math.abs(parseFloat(m[4])) > 0.01) line += " "; }
      else if (m[5] !== undefined) { if (inArray && Math.abs(parseFloat(m[5])) >= 200) line += " "; }
      else if (m[6] === "ET") { if (line) out.push(line); line = ""; }
      else line += " ";
    }
    if (line) out.push(line);
    tok.lastIndex = 0;
  }
  return out.join("\n");
}

/** Literal strings with nesting and escapes, as { at, end, text }. */
function pdfLiterals(latin, cap) {
  const out = [];
  let i = latin.indexOf("(");
  while (i >= 0) {
    if (out.length >= cap) throw new PdfCapError("LITERALS");
    let depth = 1;
    let j = i + 1;
    for (; j < latin.length && depth; j++) {
      const ch = latin[j];
      if (ch === "\\") j++;
      else if (ch === "(") depth++;
      else if (ch === ")") depth--;
    }
    if (depth) break;
    out.push({ at: i, end: j, text: pdfStringText(pdfLiteralBytes(latin.slice(i + 1, j - 1))) });
    i = latin.indexOf("(", j);
  }
  return out;
}
/**
 * PDF strings from raw objects and decoded streams. Returns two views: strings
 * joined by spaces, and TJ arrays glued (small kerning gaps join, large ones are a
 * space) so "[(ig) -20 (nore)] TJ" reads as "ignore".
 */
function pdfStringsOf(latin) {
  const lits = pdfLiterals(latin, PDF_CAPS.LITERALS);
  const spaced = lits.map((l) => l.text);
  const hx = /<([0-9a-fA-F\s]+)>/g; // was {4,} (stack overflow on a huge run); the run is maximal, so filter
  let m;
  while ((m = hx.exec(latin))) {
    if (m[1].length < 4) continue;
    if (spaced.length >= PDF_CAPS.STRINGS) throw new PdfCapError("STRINGS");
    const h = m[1].replace(/\s+/g, "");
    spaced.push(pdfStringText(Buffer.from(h.slice(0, h.length - (h.length % 2)), "hex")));
  }
  const glued = [];
  const litAt = new Map(lits.map((l, idx) => [l.at, idx]));
  // Rebuild TJ arrays from parsed literals so a "]" inside a string does not end the array.
  for (let k = 0; k < lits.length; k++) {
    const open = latin.lastIndexOf("[", lits[k].at);
    if (open < 0 || lits[k].at - open > 4096 || /[^\s\d.+\-]/.test(latin.slice(open + 1, lits[k].at))) continue;
    let text = "";
    let pos = open + 1;
    let ok = false;
    while (pos < latin.length) {
      const ws = /^[\s]*(-?[\d.]+)?[\s]*/.exec(latin.slice(pos, pos + 64));
      if (ws[1] && Math.abs(parseFloat(ws[1])) >= 200) text += " ";
      pos += ws[0].length;
      const idx = litAt.get(pos);
      if (idx !== undefined) { text += lits[idx].text; pos = lits[idx].end; k = Math.max(k, idx); continue; }
      ok = /^\]\s*TJ/.test(latin.slice(pos, pos + 16));
      break;
    }
    if (ok && text) glued.push(text);
  }
  return { spaced: spaced.join(" "), glued: glued.join(" ") };
}
const FONT_PROGRAM = /\/(FontFile[23]?|Length1|Length2|Length3)\b|\/Subtype\s*\/(Type1C|CIDFontType0C|OpenType)\b/;
const pdfNames = (d) => String(d || "").replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/%[^\r\n]*/g, " ");
const SHOWS_TEXT = /\bBT\b[\s\S]{0,4096}?(\bT[jJ]\b|\)\s*['"])/;
function pdfTexts(u8) {
  try { return pdfTextsCapped(u8); } catch (e) {
    if (e instanceof PdfCapError) return { parts: [], undecodable: true, cap: e.cap };
    throw e;
  }
}
function pdfTextsCapped(u8) {
  const { text, streams } = pdfStreams(u8);
  const parts = [];
  const objects = new Map();
  const decoded = [];
  const add = (latin) => {
    const { spaced, glued } = pdfStringsOf(latin);
    if (spaced.trim()) parts.push({ text: spaced, kind: "pdf" });
    if (glued && glued.trim()) parts.push({ text: glued, kind: "pdf" });
  };
  add(text);
  let budget = 32 * 1024 * 1024;
  for (const st of streams) {
    if (budget <= 0) return { parts, undecodable: true };
    const data = pdfDecodeStream(st, budget);
    // The media floor refuses unreadable streams first; refuse here too (fail closed).
    if (!data) return { parts, undecodable: true };
    decoded.push({ st, data });
    if (data === st.bytes) continue; // unfiltered stream: already in the raw text
    // Font programs are glyph outlines, not text a reader sees (the media floor still
    // scans them); their bytes would read as garbage "strings" and score as spam. A
    // stream that shows text (BT ... Tj/TJ) is read whatever its dict claims.
    if (FONT_PROGRAM.test(pdfNames(st.dict)) && !SHOWS_TEXT.test(Buffer.from(data).toString("latin1"))) continue;
    budget -= data.length;
    add(Buffer.from(data).toString("latin1"));
  }
  // Objects (plain and inside object streams), so fonts can be tied to ToUnicode maps.
  const streamAt = new Map(decoded.map((d) => [d.st.bytes.byteOffset - u8.byteOffset, d]));
  const objRe = /(\d+)\s+\d+\s+obj\b/g;
  let om;
  while ((om = objRe.exec(text))) {
    if (objects.size >= PDF_CAPS.OBJECTS) throw new PdfCapError("OBJECTS");
    const end = text.indexOf("endobj", objRe.lastIndex);
    const body = text.slice(objRe.lastIndex, end < 0 ? objRe.lastIndex + 8000 : end);
    const sk = /stream(\r\n|\r|\n)/.exec(body);
    const dict = sk ? body.slice(0, sk.index) : body.slice(0, 64000);
    const d = sk ? streamAt.get(objRe.lastIndex + sk.index + sk[0].length) : null;
    objects.set(Number(om[1]), { dict, data: d ? Buffer.from(d.data).toString("latin1") : null });
  }
  for (const { st, data } of decoded) {
    if (!/\/Type\s*\/ObjStm/.test(pdfNames(st.dict))) continue;
    const s2 = Buffer.from(data).toString("latin1");
    const first = Number((/\/First\s+(\d+)/.exec(st.dict) || [])[1] || 0);
    const hdr = s2.slice(0, first).trim().split(/\s+/).map(Number);
    for (let i = 0; i + 1 < hdr.length; i += 2) {
      const a = first + hdr[i + 1];
      const b = i + 3 < hdr.length ? first + hdr[i + 3] : s2.length;
      if (!objects.has(hdr[i])) objects.set(hdr[i], { dict: s2.slice(a, b), data: null });
    }
  }
  const contents = decoded.filter(({ data }) => data.length && !looksBinaryish(data)).map(({ data }) => Buffer.from(data).toString("latin1")).filter((c) => /\bTf\b/.test(c) && /\bBT\b/.test(c));
  const shown = pdfShownText(objects, contents);
  if (shown.trim()) parts.push({ text: shown, kind: "pdf" });
  return { parts };
}
function looksBinaryish(d) {
  const n = Math.min(d.length, 512);
  let bad = 0;
  for (let i = 0; i < n; i++) if (d[i] < 9 || (d[i] > 13 && d[i] < 32)) bad++;
  return bad > n * 0.1;
}

function stripTags(s) { return String(s || "").replace(/<[^>]*>/g, " "); }

// Inline elements (Word runs, ODF spans, HTML phrasing) join their text; any other
// tag is a word break. Text split across runs ("<w:t>ig</w:t><w:t>nore</w:t>") is
// read as one word, as a reader sees it.
const INLINE_TAG = /^<\/?(?:w:(?:r|t|rPr|proofErr|bookmarkStart|bookmarkEnd|hyperlink|smartTag|ins|lastRenderedPageBreak|softHyphen|noBreakHyphen|fldSimple|instrText|fldChar|rStyle|b|i|u|color|sz|szCs|lang|rFonts|kern|spacing|vertAlign|highlight)|text:(?:span|a|soft-page-break|bookmark|bookmark-start|bookmark-end)|a:(?:r|t|rPr)|b|i|u|em|strong|span|a|sub|sup|small|mark|font|s|code|abbr|q|cite|bdi|bdo|ruby|rt|wbr)\b/i;
function decodeEntities(s) {
  return s.replace(/&#x([0-9a-fA-F]{1,6});/g, (_, h) => safeCp(parseInt(h, 16))).replace(/&#(\d{1,7});/g, (_, d) => safeCp(Number(d)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}
function safeCp(n) { return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : " "; }
function visibleText(s) {
  return decodeEntities(String(s || "").replace(/<[^>]*>/g, (t) => (INLINE_TAG.test(t) ? "" : " ")));
}
const LINK_TARGET = /\b(?:href|Target|xlink:href)\s*=\s*["']?\s*(?:https?:|www\.)/gi;

// Injection phrasing with the spaces gone (per-glyph PDF text, glued runs).
const COMPACT_INJECTION = /(ignore|disregard|forget|override|bypass)(all|any|the|your|of)*(previous|prior|above|earlier|preceding|system|safety)(instructions?|prompts?|rules?|directives?)|revealyour(hidden|secret)?systemprompt/;
function compactInjectionHit(text) { return COMPACT_INJECTION.test(normalizeForMatch(text).replace(/[^a-z]/g, "")); }

/** Gate check (registered in intake-gate.js after the media floor). */
export const textChecks = {
  name: "text",
  async run(ctx) {
    const fx = await fileTexts(ctx.file);
    if (fx.undecodable) return { code: TEXT_REASONS.UNDECODABLE };
    const fields = [ctx.title, ctx.body, ...(ctx.texts || [])].filter((t) => t && String(t).length).map((t) => ({ text: String(t), kind: "html" }));
    const parts = [...fields, ...fx.parts.filter((p) => p.text && p.text.length)];
    // Screening budget: extracted text can be larger than the file (PDF/docx inflate).
    // Too much to screen inside the Worker limits -> refused before any view is built.
    let chars = 0;
    for (const p of parts) chars += p.text.length;
    if (chars > MAX_SCREEN_CHARS) return { code: TOO_LARGE_CODE, status: 413 };
    const raws = parts.map((p) => p.text);
    // What a reader sees: tags removed (as words and as joined runs), entities decoded.
    const seen = parts.map((p) => (p.kind === "pdf" ? p.text : visibleText(p.text)));
    const spacedSeen = parts.map((p) => (p.kind === "pdf" ? p.text : stripTags(p.text)));
    const all = raws.join("\n");
    const visible = seen.join("\n");
    // HARD — everyone, operator included.
    if (raws.some(invisibleHit) || seen.some(invisibleHit)) return { code: TEXT_REASONS.INVISIBLE };
    if (parts.some((p) => p.kind !== "pdf" && hiddenMarkupHit(p.text, { kind: p.kind }))) return { code: TEXT_REASONS.HIDDEN_MARKUP };
    if (csamIndicator(all) || csamIndicator(visible) || csamIndicator(spacedSeen.join("\n"))) return { code: TEXT_REASONS.CSAM_INDICATOR };
    if (explicitHit(all) || explicitHit(visible)) return { code: TEXT_REASONS.EXPLICIT };
    if (raws.some(encodedInjectionHit) || seen.some(encodedInjectionHit)) return { code: TEXT_REASONS.ENCODED_INJECTION };
    // HEURISTIC — operator exempt (Aziel's own filings discuss agents and prompts).
    if (!ctx.operator) {
      if (injectionHit(all) || injectionHit(visible) || seen.some(compactInjectionHit)) return { code: TEXT_REASONS.INJECTION };
      // Spam is scored on the fields as typed plus the visible text of the file, never
      // on package XML (namespace URLs and style names are not spam).
      const extraUrls = fx.parts.reduce((n, p) => n + (p.kind === "pdf" ? 0 : (p.text.match(LINK_TARGET) || []).length), 0);
      const spamText = [...fields.map((f) => f.text), ...fx.parts.map((p) => (p.kind === "pdf" ? p.text : visibleText(p.text)))].join("\n");
      if (spamScore(spamText, { extraUrls }) >= SPAM_THRESHOLD) return { code: TEXT_REASONS.SPAM };
    }
    return null;
  },
};
