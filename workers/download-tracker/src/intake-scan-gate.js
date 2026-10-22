/**
 * CORPUS-INTAKE-SAFETY-1.0 (e) — media SCAN GATE. BUILT, OFF, FAILS CLOSED.
 *
 * The media hard floor (intake-media.js) is unchanged by this file: every image,
 * video and audio item is still refused at every door. This module is the gate
 * a future change may route media through. It is not wired to any door.
 * MEDIA_SCAN_GATE_VERIFIED is false in code, so mediaScanGate() refuses
 * everything even if INTAKE_MEDIA_SCAN_GATE=on is set and scanners are configured.
 * Turning it on is a separate, reviewed change to that constant, made only
 * after real scanners exist, are tested against vendor test sets, and Aziel
 * has signed off.
 *
 * NO REAL SCANNER IS WIRED. The adapters below are interfaces. Tests drive them with
 * stubs that return pass / flag / uncertain / timeout. Nothing here claims PhotoDNA,
 * the Cloudflare CSAM Scanning Tool or any classifier is active.
 *
 * Pipeline, per item (and per video frame). The first non-pass refuses the whole file:
 *   0. strip metadata (EXIF/XMP/IPTC/comments/text chunks) FIRST; cannot strip => refuse.
 *      Then every later step scans exactly the kept bytes. Structure: one container,
 *      nothing trailing, no second container inside (polyglots refuse)
 *   1. known-abuse hash match (PhotoDNA-class). flag => INTAKE-MEDIA-KNOWN-ABUSE-MATCH,
 *      human_report_required: true (Aziel reports to NCMEC CyberTipline by hand; never automated)
 *   2. every configured nudity/sexual-content classifier. flag, uncertain, or score >= strict
 *      threshold => refuse
 *   3. OCR, then the corpus text checks on the OCR text
 *   4. video: frame extractor must return ALL keyframes plus sampled frames, complete:true;
 *      any flagged frame refuses the file (video metadata stripping needs an external remuxer)
 * Scanner down, timed out, unconfigured or malformed verdict => refuse.
 *
 * No scanner is perfect. Hash matching only finds KNOWN material; classifiers miss
 * and misfire; OCR misses stylised text. That is why "uncertain" refuses, and why the
 * floor stays in place until this gate is verified. Author: Aziel Eliab.
 */
import { sniffMagic, findEmbeddedMedia } from "./intake-media.js";
import { textChecks } from "./intake-text.js";

/** Code-level lock. Changing this is the reviewed "turn media on" change. */
export const MEDIA_SCAN_GATE_VERIFIED = false;

export const SCAN_REASONS = Object.freeze({
  GATE_OFF: "INTAKE-MEDIA-SCAN-GATE-OFF",
  NOT_CONFIGURED: "INTAKE-MEDIA-SCAN-NOT-CONFIGURED",
  KNOWN_ABUSE: "INTAKE-MEDIA-KNOWN-ABUSE-MATCH",
  CLASSIFIER_FLAG: "INTAKE-MEDIA-CLASSIFIER-FLAG",
  CLASSIFIER_UNCERTAIN: "INTAKE-MEDIA-CLASSIFIER-UNCERTAIN",
  HASH_UNCERTAIN: "INTAKE-MEDIA-HASH-UNCERTAIN",
  OCR_TEXT: "INTAKE-MEDIA-OCR-TEXT-REFUSED",
  OCR_UNCERTAIN: "INTAKE-MEDIA-OCR-UNCERTAIN",
  SCANNER_TIMEOUT: "INTAKE-MEDIA-SCANNER-TIMEOUT",
  SCANNER_ERROR: "INTAKE-MEDIA-SCANNER-ERROR",
  FRAMES_INCOMPLETE: "INTAKE-MEDIA-VIDEO-FRAMES-INCOMPLETE",
  METADATA_UNSUPPORTED: "INTAKE-MEDIA-METADATA-STRIP-UNSUPPORTED",
  STRUCTURE: "INTAKE-MEDIA-STRUCTURE-REFUSED",
});

export const SCAN_DEFAULTS = Object.freeze({
  TIMEOUT_MS: 8000,
  // Strict: any classifier score at or above this refuses, even with verdict "pass".
  CLASSIFIER_MAX_SCORE: 0.2,
  MIN_SAMPLED_FRAMES: 8,
});

const VERDICTS = new Set(["pass", "flag", "uncertain"]);

/**
 * Interfaces (all async; any may be absent => NOT_CONFIGURED refusal):
 *   hashMatcher.match(bytes, { kind, format })         -> { verdict, match_id? }      PhotoDNA-class
 *   classifiers[i].classify(bytes, { kind, format })   -> { verdict, score?, model }  nudity / sexual content
 *   ocr.read(bytes, { kind, format })                  -> { verdict, text }
 *   frameExtractor.extract(bytes, { format })          -> { complete, keyframes:[bytes], sampled:[bytes] }
 *   metadataStripper.strip(bytes, { kind, format })    -> { ok, bytes }  (built-in covers JPEG/PNG)
 *
 * Planned real adapters (NOT WIRED; listed so nobody mistakes the stubs for them):
 *   hashMatcher: Microsoft PhotoDNA Cloud Service (pre-storage REST match; Aziel must apply).
 *   classifiers: a dedicated NSFW/minor-safety classifier (e.g. Hive, Sightengine, AWS Rekognition
 *     DetectModerationLabels, Azure AI Content Safety, Google SafeSearch) and/or a Workers AI vision
 *     model used as a second opinion (@cf/meta/llama-3.2-11b-vision-instruct, @cf/llava-hf/llava-1.5-7b-hf).
 *     Workers AI has no purpose-built NSFW classifier; a VLM prompt is not a classifier and is never sole.
 *   ocr: Workers AI vision OCR (already used by /ocr) or an external OCR.
 *   frameExtractor: an external FFmpeg service (Workers have no FFmpeg).
 *   Cloudflare CSAM Scanning Tool: post-cache, on served URLs. A backstop, never this gate.
 */

function refuse(code, extra = {}) {
  return { ok: false, code, ...extra };
}

async function call(fn, timeoutMs) {
  let timer;
  try {
    const out = await Promise.race([
      Promise.resolve().then(fn),
      new Promise((resolve) => { timer = setTimeout(() => resolve({ __timeout: true }), timeoutMs); }),
    ]);
    if (out && out.__timeout) return { err: SCAN_REASONS.SCANNER_TIMEOUT };
    if (!out || !VERDICTS.has(out.verdict)) return { err: SCAN_REASONS.SCANNER_ERROR };
    return { out };
  } catch {
    return { err: SCAN_REASONS.SCANNER_ERROR };
  } finally {
    clearTimeout(timer);
  }
}

// ---------- structure + built-in metadata stripping ----------

/** JPEG: drop APP1..APP15 (EXIF, XMP, IPTC, ICC, maker notes) and COM. Refuse trailing bytes. */
export function stripJpeg(u8) {
  if (!(u8[0] === 0xff && u8[1] === 0xd8)) return { ok: false };
  const out = [u8.subarray(0, 2)];
  let i = 2;
  while (i + 2 <= u8.length) {
    if (u8[i] !== 0xff) return { ok: false };
    const m = u8[i + 1];
    if (m === 0xd9) {
      out.push(u8.subarray(i, i + 2));
      if (u8.subarray(i + 2).some((b) => b !== 0)) return { ok: false, trailing: true };
      return { ok: true, bytes: concat(out) };
    }
    if (m === 0xff) { i++; continue; }
    if (i + 4 > u8.length) return { ok: false };
    const len = (u8[i + 2] << 8) | u8[i + 3];
    if (len < 2 || i + 2 + len > u8.length) return { ok: false };
    const seg = u8.subarray(i, i + 2 + len);
    const drop = (m >= 0xe1 && m <= 0xef) || m === 0xfe;
    if (!drop) out.push(seg);
    i += 2 + len;
    if (m === 0xda) {
      // entropy-coded data until a real marker (not FF00, not RSTn)
      let j = i;
      while (j + 1 < u8.length && !(u8[j] === 0xff && u8[j + 1] !== 0x00 && !(u8[j + 1] >= 0xd0 && u8[j + 1] <= 0xd7))) j++;
      out.push(u8.subarray(i, j));
      i = j;
    }
  }
  return { ok: false };
}

const PNG_KEEP = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "cHRM", "sRGB", "sBIT", "bKGD", "pHYs"]);
/** PNG: keep an allowlist of rendering chunks; drop tEXt/zTXt/iTXt/eXIf/tIME and unknown chunks. */
export function stripPng(u8) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!sig.every((b, k) => u8[k] === b)) return { ok: false };
  const out = [u8.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= u8.length) {
    const len = ((u8[i] << 24) | (u8[i + 1] << 16) | (u8[i + 2] << 8) | u8[i + 3]) >>> 0;
    if (i + 12 + len > u8.length) return { ok: false };
    const type = String.fromCharCode(u8[i + 4], u8[i + 5], u8[i + 6], u8[i + 7]);
    if (PNG_KEEP.has(type)) out.push(u8.subarray(i, i + 12 + len));
    i += 12 + len;
    if (type === "IEND") {
      if (u8.subarray(i).some((b) => b !== 0)) return { ok: false, trailing: true };
      return { ok: true, bytes: concat(out) };
    }
  }
  return { ok: false };
}

function hasSig(u8, sig, from) {
  outer: for (let i = from; i + sig.length <= u8.length; i++) {
    for (let k = 0; k < sig.length; k++) if (u8[i + k] !== sig[k]) continue outer;
    return true;
  }
  return false;
}

function concat(parts) {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const o = new Uint8Array(n);
  let off = 0;
  for (const p of parts) { o.set(p, off); off += p.length; }
  return o;
}

export const builtinMetadataStripper = {
  async strip(bytes, { format }) {
    if (format === "jpeg") return stripJpeg(bytes);
    if (format === "png") return stripPng(bytes);
    return { ok: false, unsupported: true };
  },
};

// ---------- pipeline ----------

async function scanStill(bytes, meta, s, opts) {
  if (!s.hashMatcher || !s.classifiers || !s.classifiers.length || !s.ocr) return refuse(SCAN_REASONS.NOT_CONFIGURED);
  const h = await call(() => s.hashMatcher.match(bytes, meta), opts.timeoutMs);
  if (h.err) return refuse(h.err);
  if (h.out.verdict === "flag") return refuse(SCAN_REASONS.KNOWN_ABUSE, { human_report_required: true, route: "operator-human-review" });
  if (h.out.verdict === "uncertain") return refuse(SCAN_REASONS.HASH_UNCERTAIN);
  for (const c of s.classifiers) {
    const r = await call(() => c.classify(bytes, meta), opts.timeoutMs);
    if (r.err) return refuse(r.err);
    if (r.out.verdict === "flag") return refuse(SCAN_REASONS.CLASSIFIER_FLAG);
    if (r.out.verdict === "uncertain") return refuse(SCAN_REASONS.CLASSIFIER_UNCERTAIN);
    if (r.out.score != null && !(Number(r.out.score) < opts.maxScore)) return refuse(SCAN_REASONS.CLASSIFIER_FLAG);
  }
  const o = await call(() => s.ocr.read(bytes, meta), opts.timeoutMs);
  if (o.err) return refuse(o.err);
  if (o.out.verdict !== "pass") return refuse(SCAN_REASONS.OCR_UNCERTAIN);
  const t = await textChecks.run({ operator: false, body: String(o.out.text || ""), texts: [] });
  if (t && t.code) return refuse(SCAN_REASONS.OCR_TEXT, { text_code: t.code });
  return { ok: true };
}

/**
 * Pure pipeline over one media item. Returns { ok:true, bytes } (metadata stripped)
 * or { ok:false, code, human_report_required? }. Never stores or logs bytes.
 */
export async function runScanPipeline(item, scanners = {}, options = {}) {
  const opts = { timeoutMs: SCAN_DEFAULTS.TIMEOUT_MS, maxScore: SCAN_DEFAULTS.CLASSIFIER_MAX_SCORE, minSampled: SCAN_DEFAULTS.MIN_SAMPLED_FRAMES, ...options };
  const bytes = item && item.bytes instanceof Uint8Array ? item.bytes : null;
  if (!bytes || !bytes.length) return refuse(SCAN_REASONS.STRUCTURE);
  const head = sniffMagic(bytes);
  if (!head || (head.kind !== "image" && head.kind !== "video")) return refuse(SCAN_REASONS.STRUCTURE);
  const meta = { kind: head.kind, format: head.format };
  const stripper = scanners.metadataStripper || builtinMetadataStripper;
  // Strip first, then scan exactly the bytes that would be kept (scanned == stored).
  let st;
  try { st = await stripper.strip(bytes, meta); } catch { st = { ok: false }; }
  if (!st || !st.ok || !(st.bytes instanceof Uint8Array)) return refuse(st && st.trailing ? SCAN_REASONS.STRUCTURE : SCAN_REASONS.METADATA_UNSUPPORTED);
  const kept = st.bytes;
  const keptHead = sniffMagic(kept);
  if (!keptHead || keptHead.kind !== head.kind) return refuse(SCAN_REASONS.STRUCTURE);
  // A second container inside the kept bytes (after the header) is a polyglot.
  if (findEmbeddedMedia(kept.subarray(16)) || hasSig(kept, [0x50, 0x4b, 0x03, 0x04], 4) || hasSig(kept, [0x25, 0x50, 0x44, 0x46, 0x2d], 4)) return refuse(SCAN_REASONS.STRUCTURE);

  if (head.kind === "image") {
    const r = await scanStill(kept, meta, scanners, opts);
    if (!r.ok) return r;
  } else {
    if (!scanners.frameExtractor || !scanners.hashMatcher) return refuse(SCAN_REASONS.NOT_CONFIGURED);
    // whole-file hash match first (video hash lists exist)
    const h = await call(() => scanners.hashMatcher.match(kept, meta), opts.timeoutMs);
    if (h.err) return refuse(h.err);
    if (h.out.verdict === "flag") return refuse(SCAN_REASONS.KNOWN_ABUSE, { human_report_required: true, route: "operator-human-review" });
    if (h.out.verdict === "uncertain") return refuse(SCAN_REASONS.HASH_UNCERTAIN);
    let fx;
    let timer;
    try {
      fx = await Promise.race([scanners.frameExtractor.extract(kept, meta), new Promise((r) => { timer = setTimeout(() => r({ __timeout: true }), opts.timeoutMs); })]);
    } catch { return refuse(SCAN_REASONS.SCANNER_ERROR); } finally { clearTimeout(timer); }
    if (fx && fx.__timeout) return refuse(SCAN_REASONS.SCANNER_TIMEOUT);
    const key = fx && Array.isArray(fx.keyframes) ? fx.keyframes : [];
    const samp = fx && Array.isArray(fx.sampled) ? fx.sampled : [];
    if (!fx || fx.complete !== true || !key.length || samp.length < opts.minSampled) return refuse(SCAN_REASONS.FRAMES_INCOMPLETE);
    for (const frame of [...key, ...samp]) {
      const fh = frame instanceof Uint8Array ? sniffMagic(frame) : null;
      if (!fh || fh.kind !== "image") return refuse(SCAN_REASONS.FRAMES_INCOMPLETE);
      const r = await scanStill(frame, { kind: "image", format: fh.format, video_frame: true }, scanners, opts);
      if (!r.ok) return r; // one flagged frame refuses the whole file
    }
  }
  return { ok: true, bytes: kept, kind: head.kind, format: head.format };
}

/**
 * The door-facing gate. OFF: refuses unless BOTH the code lock is verified AND
 * env.INTAKE_MEDIA_SCAN_GATE === "on". Today the code lock is false.
 */
export async function mediaScanGate(env, item, scanners = {}, options = {}) {
  if (!MEDIA_SCAN_GATE_VERIFIED || !env || String(env.INTAKE_MEDIA_SCAN_GATE || "").toLowerCase() !== "on") return refuse(SCAN_REASONS.GATE_OFF);
  return runScanPipeline(item, scanners, options);
}
