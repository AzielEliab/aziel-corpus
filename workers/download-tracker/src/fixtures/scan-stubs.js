/**
 * Stub scanners for the OFF media scan gate. They are NOT PhotoDNA, NOT the
 * Cloudflare CSAM tool and NOT any classifier. They return a fixed verdict.
 * Synthetic media only (fixtures/synthetic-media.js). Author: Aziel Eliab.
 */
import { crc32 } from "node:zlib";

/** verdict: "pass" | "flag" | "uncertain" | "timeout" | "throw" | "garbage" */
function reply(verdict, extra = {}) {
  if (verdict === "timeout") return new Promise(() => {});
  if (verdict === "throw") return Promise.reject(new Error("stub scanner down"));
  if (verdict === "garbage") return Promise.resolve({ verdict: "maybe" });
  return Promise.resolve({ verdict, ...extra });
}
export function stubHashMatcher(verdict = "pass", calls = []) {
  return { match: (bytes, meta) => { calls.push(["hash", meta && meta.format]); return reply(verdict); } };
}
export function stubClassifier(verdict = "pass", { score = null, model = "stub-classifier", calls = [] } = {}) {
  return { classify: (bytes, meta) => { calls.push(["classify", model]); return reply(verdict, score == null ? { model } : { model, score }); } };
}
export function stubOcr(verdict = "pass", text = "", calls = []) {
  return { read: () => { calls.push(["ocr"]); return reply(verdict, { text }); } };
}
/** Frame extractor stub. flagAt: index of a frame that the classifier stub should flag (see flaggingClassifier). */
export function stubFrameExtractor(frames, { complete = true, keyframes = 1, verdict = "ok" } = {}) {
  return {
    extract() {
      if (verdict === "timeout") return new Promise(() => {});
      if (verdict === "throw") return Promise.reject(new Error("extractor down"));
      return Promise.resolve({ complete, keyframes: frames.slice(0, keyframes), sampled: frames.slice(keyframes) });
    },
  };
}
/** Flags exactly the frames whose bytes contain the given marker byte string. */
export function markerClassifier(marker, calls = []) {
  const m = new TextEncoder().encode(marker);
  return {
    classify(bytes) {
      calls.push(["classify-marker"]);
      for (let i = 0; i + m.length <= bytes.length; i++) {
        let ok = true;
        for (let k = 0; k < m.length; k++) if (bytes[i + k] !== m[k]) { ok = false; break; }
        if (ok) return Promise.resolve({ verdict: "flag", model: "stub-marker" });
      }
      return Promise.resolve({ verdict: "pass", model: "stub-marker", score: 0.01 });
    },
  };
}

// ---- well-formed synthetic stills with metadata to strip ----
const enc = new TextEncoder();
const asBytes = (t) => (t instanceof Uint8Array ? t : enc.encode(String(t)));
function chunk(type, data) {
  const t = enc.encode(type);
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, data.length);
  const body = new Uint8Array(t.length + data.length);
  body.set(t); body.set(data, t.length);
  const crc = new Uint8Array(4);
  new DataView(crc.buffer).setUint32(0, crc32(body) >>> 0);
  return [len, body, crc];
}
function cat(parts) {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const o = new Uint8Array(n);
  let off = 0;
  for (const p of parts) { o.set(p, off); off += p.length; }
  return o;
}
/** 1x1 PNG with a tEXt and eXIf chunk carrying `meta` (to be stripped). */
export function pngWithMeta(meta = "__AZ_SYNTHETIC_EXIF__", tag = "") {
  const ihdr = Uint8Array.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 0, 0, 0, 0]);
  return cat([
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ...chunk("IHDR", ihdr),
    ...chunk("tEXt", enc.encode("Comment\0" + meta)),
    ...chunk("eXIf", enc.encode("MM\0*" + meta)),
    ...chunk("IDAT", cat([Uint8Array.from([0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01]), asBytes(tag)])),
    ...chunk("IEND", new Uint8Array(0)),
  ]);
}
/** Minimal JPEG: SOI, APP0 JFIF, APP1 Exif(meta), COM(meta), DQT, SOS + data(tag), EOI. */
export function jpegWithMeta(meta = "__AZ_SYNTHETIC_EXIF__", tag = "") {
  const seg = (m, data) => cat([Uint8Array.from([0xff, m, (data.length + 2) >> 8, (data.length + 2) & 255]), data]);
  return cat([
    Uint8Array.from([0xff, 0xd8]),
    seg(0xe0, cat([enc.encode("JFIF\0"), Uint8Array.from([1, 1, 0, 0, 1, 0, 1, 0, 0])])),
    seg(0xe1, cat([enc.encode("Exif\0\0MM\0*"), enc.encode(meta)])),
    seg(0xfe, enc.encode(meta)),
    seg(0xdb, new Uint8Array(65)),
    seg(0xda, Uint8Array.from([1, 1, 0, 0, 0x3f, 0])),
    cat([Uint8Array.from([0x12, 0xff, 0x00, 0x34]), asBytes(tag)]),
    Uint8Array.from([0xff, 0xd9]),
  ]);
}
