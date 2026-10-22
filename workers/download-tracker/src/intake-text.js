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
 * Tests use reserved synthetic tokens only (see SYNTHETIC below). Author: Aziel Eliab.
 */
import { inflateSync } from "node:zlib";
import { sniffMagic, pdfStreams } from "./intake-media.js";
import { listZipEntries, readZipFiles } from "./zip.js";

export const TEXT_REASONS = Object.freeze({
  INVISIBLE: "INTAKE-TEXT-INVISIBLE",
  HIDDEN_MARKUP: "INTAKE-TEXT-HIDDEN-MARKUP",
  INJECTION: "INTAKE-TEXT-INJECTION",
  ENCODED_INJECTION: "INTAKE-TEXT-ENCODED-INJECTION",
  CSAM_INDICATOR: "INTAKE-TEXT-CSAM-INDICATOR",
  EXPLICIT: "INTAKE-TEXT-EXPLICIT",
  SPAM: "INTAKE-TEXT-SPAM",
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
const HIDDEN_CSS = /(display\s*:\s*none|visibility\s*:\s*(hidden|collapse)|font-size\s*:\s*0*(\.0+)?(px|pt|em|rem|%)?\s*(;|"|'|\}|$)|opacity\s*:\s*0*(\.0+)?\s*(;|"|'|\}|$)|text-indent\s*:\s*-\d{3,}|(left|top|right)\s*:\s*-\d{4,}|clip\s*:\s*rect\(\s*0|clip-path\s*:\s*inset\(\s*(50|100)%|(max-)?height\s*:\s*0[^.\d][^;"']*;?[^"']*overflow\s*:\s*hidden|color\s*:\s*transparent)/i;
const HIDDEN_HTML = /<[a-z][^>]*\s(hidden|aria-hidden\s*=\s*["']?true)(\s|=|>|\/)|<(template|noscript|noembed|noframes)\b|<!--[\s\S]{40,}?-->/i;
const HIDDEN_WORD = /<w:(vanish|webHidden|specVanish)\b|<w:sz\s+w:val="[01]"|<w:color\s+w:val="(FFFFFF|auto)"[^>]*\/>\s*<w:shd[^>]*w:fill="FFFFFF"/i;
export function hiddenMarkupHit(text) {
  const s = String(text || "");
  if (!/[<{:]/.test(s)) return false;
  return HIDDEN_CSS.test(s) && /<[a-z!]|style\s*=|\{/i.test(s) || HIDDEN_HTML.test(s) || HIDDEN_WORD.test(s);
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
function decodedCandidates(text) {
  const s = String(text || "");
  const out = [];
  const td = new TextDecoder("utf-8", { fatal: false });
  let m;
  const b64 = /(?:[A-Za-z0-9+/_-]{4}(?:\r?\n)?){6,}(?:[A-Za-z0-9+/_-]{2,3}={0,2})?/g;
  let n = 0;
  while ((m = b64.exec(s)) && n++ < 500) {
    try {
      const d = td.decode(Buffer.from(m[0].replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/"), "base64"));
      if (printableRatio(d) > 0.9) out.push(d);
    } catch { /* not base64 */ }
  }
  const hex = /(?:(?:0x|\\x)?[0-9a-fA-F]{2}[\s,:]?){12,}/g;
  n = 0;
  while ((m = hex.exec(s)) && n++ < 500) {
    const h = m[0].replace(/0x|\\x/g, "").replace(/[^0-9a-fA-F]/g, "");
    const d = td.decode(Buffer.from(h.slice(0, h.length - (h.length % 2)), "hex"));
    if (printableRatio(d) > 0.9) out.push(d);
  }
  if (/(%[0-9a-fA-F]{2}){6,}/.test(s)) { try { out.push(decodeURIComponent(s.replace(/%(?![0-9a-fA-F]{2})/g, "%25"))); } catch { /* bad */ } }
  if (/&#x?[0-9a-fA-F]+;/.test(s)) out.push(s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16) || 32)).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d) || 32)));
  if (/\\u[0-9a-fA-F]{4}/.test(s)) out.push(s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
  out.push(s.replace(/[a-zA-Z]/g, (c) => String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26)));
  return out;
}
export function encodedInjectionHit(text) {
  for (const d of decodedCandidates(text)) {
    if (injectionHit(d) || csamIndicator(d) || explicitHit(d)) return true;
  }
  return false;
}

// ---------- spam / poisoning ----------
const STOP = new Set(["the", "and", "for", "that", "with", "this", "are", "was", "from", "have", "not", "but", "his", "her", "they", "you", "all", "which", "their", "its", "has", "were", "been", "one", "our", "out", "who"]);
export function spamScore(text) {
  const raw = String(text || "");
  const n = normalizeForMatch(raw);
  const words = tokens(n);
  let score = 0;
  const urls = (raw.match(/\bhttps?:\/\/|\bwww\./gi) || []).length;
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
async function fileTexts(file) {
  if (!file || !(file.bytes instanceof Uint8Array)) return [];
  const u8 = file.bytes;
  const head = sniffMagic(u8);
  const td = new TextDecoder("utf-8", { fatal: false });
  if (!head) return [td.decode(u8.subarray(0, 8 * 1024 * 1024))];
  if (head.kind === "pdf") return pdfTexts(u8);
  if (head.kind === "zip") {
    const listed = listZipEntries(u8);
    if (!listed.ok) return [];
    const names = listed.entries.filter((e) => !e.directory && /\.(xml|rels|html?|xhtml|txt|md|csv|json|opf|ncx)$/i.test(e.name)).map((e) => e.name);
    const read = readZipFiles(u8, names);
    return Object.values(read.files).map((b) => td.decode(b));
  }
  return [];
}

/** PDF strings from raw objects and inflated content streams (literal and hex strings). */
function pdfStringsOf(latin) {
  const out = [];
  const lit = /\((?:\\.|[^\\)]){1,}\)/g;
  let m;
  while ((m = lit.exec(latin)) && out.length < 20000) out.push(m[0].slice(1, -1).replace(/\\([nrtbf])/g, " ").replace(/\\([()\\])/g, "$1"));
  const hx = /<([0-9a-fA-F\s]{4,})>/g;
  while ((m = hx.exec(latin)) && out.length < 40000) {
    const h = m[1].replace(/\s+/g, "");
    const b = Buffer.from(h.slice(0, h.length - (h.length % 2)), "hex");
    out.push(b[0] === 0xfe && b[1] === 0xff ? new TextDecoder("utf-16be").decode(b.subarray(2)) : b.toString("latin1"));
  }
  return out.join(" ");
}
function pdfTexts(u8) {
  const { text, streams } = pdfStreams(u8);
  const parts = [pdfStringsOf(text)];
  let budget = 32 * 1024 * 1024;
  for (const st of streams) {
    if (!st.bytes || !/FlateDecode/.test(st.dict) || budget <= 0) continue;
    try {
      const out = inflateSync(st.bytes, { maxOutputLength: budget });
      budget -= out.length;
      parts.push(pdfStringsOf(out.toString("latin1")));
    } catch { /* the media floor already refuses unreadable streams */ }
  }
  return parts;
}

function stripTags(s) { return String(s || "").replace(/<[^>]*>/g, " "); }

/** Gate check (registered in intake-gate.js after the media floor). */
export const textChecks = {
  name: "text",
  async run(ctx) {
    const parts = [ctx.title, ctx.body, ...(ctx.texts || []), ...(await fileTexts(ctx.file))].filter((t) => t && String(t).length);
    const all = parts.join("\n");
    // HARD — everyone, operator included.
    if (parts.some(invisibleHit)) return { code: TEXT_REASONS.INVISIBLE };
    if (parts.some(hiddenMarkupHit)) return { code: TEXT_REASONS.HIDDEN_MARKUP };
    const visible = parts.map(stripTags).join("\n");
    if (csamIndicator(all) || csamIndicator(visible)) return { code: TEXT_REASONS.CSAM_INDICATOR };
    if (explicitHit(all)) return { code: TEXT_REASONS.EXPLICIT };
    if (parts.some(encodedInjectionHit)) return { code: TEXT_REASONS.ENCODED_INJECTION };
    // HEURISTIC — operator exempt (Aziel's own filings discuss agents and prompts).
    if (!ctx.operator) {
      if (injectionHit(all)) return { code: TEXT_REASONS.INJECTION };
      if (spamScore(all) >= SPAM_THRESHOLD) return { code: TEXT_REASONS.SPAM };
    }
    return null;
  },
};
