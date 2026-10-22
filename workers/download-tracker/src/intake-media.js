/**
 * CORPUS-INTAKE-SAFETY-1.0 — media hard floor (the top requirement).
 *
 * The corpus is text-first. Image, video and audio uploads and imports are REFUSED
 * at every door that feeds the chain, by default, for every caller (operator
 * included). This is a floor, not a setting: there is no flag in this module that
 * lets media through. A future scan gate (intake-scan-gate.js, OFF) is the only path
 * that could ever admit media, and only after lawful hash matching + classifier +
 * OCR all pass.
 *
 * Detection does not trust the filename or the declared MIME:
 *   - magic bytes at offset 0 (images, video, audio, archives);
 *   - distinctive media signatures anywhere in the bytes (polyglots, appended blobs);
 *   - a declared image/video/audio MIME or a media extension refuses on its own;
 *   - documents are opened: PDFs are checked for image XObjects, inline images,
 *     embedded files and rich media (compressed object and content streams are
 *     inflated; a stream we cannot read refuses); Office/ODF/EPUB zips are
 *     opened and any media part refuses the whole document;
 *   - other archives (zip/tar/gz/7z/rar/bz2/xz/zstd) are refused outright;
 *   - text (title, body, metadata, text files) is checked for data: URIs, HTML/SVG
 *     media tags, CSS url(), markdown image embeds, and base64 / hex / Ascii85 runs
 *     (whole run decoded, whitespace and padding tolerated, zlib/gzip inflated) whose
 *     bytes are media or archives;
 *   - PDF names are checked raw and with #xx escapes decoded and %-comments removed;
 *     JPEG (every FFD8FF variant), TIFF, BMP and ICO are found at any offset when the
 *     header that follows is structurally valid;
 *   - file bytes are decoded as text confidently (UTF-8, UTF-16 with or without BOM,
 *     control-free single-byte) or refused INTAKE-UNDECODABLE;
 *   - Office zips must be exactly entries + central directory + end record: appended,
 *     leading or in-between bytes refuse; every part is checked as text, and a binary
 *     part that is not a font refuses.
 * Limits, stated honestly: no scanner is perfect. Encodings beyond these (custom
 * alphabets, encryption, steganography, raw deflate without a header, media split
 * across fields) are not guaranteed to be caught; the floor fails closed where it can
 * see it cannot decode, and is one layer, not a guarantee.
 * Embedded images are never stripped: stripping is not reliable, so the document
 * is refused instead. Author: Aziel Eliab.
 */
import { inflateSync, inflateRawSync, gunzipSync } from "node:zlib";
import { listZipEntries, readZipFiles } from "./zip.js";

export const MEDIA_REASONS = Object.freeze({
  IMAGE: "INTAKE-MEDIA-IMAGE",
  VIDEO: "INTAKE-MEDIA-VIDEO",
  AUDIO: "INTAKE-MEDIA-AUDIO",
  SVG: "INTAKE-MEDIA-SVG",
  DECLARED: "INTAKE-MEDIA-DECLARED",
  POLYGLOT: "INTAKE-MEDIA-POLYGLOT",
  EMBEDDED: "INTAKE-MEDIA-EMBEDDED",
  ENCODED: "INTAKE-MEDIA-ENCODED",
  DATA_URI: "INTAKE-MEDIA-DATA-URI",
  MARKUP: "INTAKE-MEDIA-MARKUP",
  ARCHIVE: "INTAKE-ARCHIVE-REFUSED",
  UNREADABLE_DOC: "INTAKE-DOC-UNREADABLE",
  // Bytes that do not decode confidently as text (UTF-8, UTF-16 or plain single-byte
  // text without control bytes) and are not a recognised document: refused.
  UNDECODABLE: "INTAKE-UNDECODABLE",
});

const MEDIA_EXT = /\.(png|apng|jpe?g|jfif|pjpeg|pjp|gif|webp|bmp|dib|tiff?|ico|cur|heic|heif|avif|jxl|jp2|j2k|jpx|psd|svgz?|raw|cr2|nef|arw|dng|orf|rw2|mp4|m4v|mov|qt|avi|wmv|asf|flv|f4v|mkv|webm|mpe?g|mpg|m2ts|mts|ts|3gp|3g2|ogv|vob|mp3|m4a|aac|wav|flac|ogg|oga|opus|wma|aiff?|amr|mid|midi)$/i;
const ARCHIVE_EXT = /\.(zip|tar|tgz|gz|gzip|bz2|tbz2?|xz|txz|7z|rar|zst|lz|lzma|cab|iso|dmg|jar|apk|azm|azk|azh)$/i;
const OFFICE_EXT = /\.(docx|docm|dotx|xlsx|xlsm|pptx|pptm|odt|ods|odp|epub)$/i;

function u8of(b) {
  if (!b) return new Uint8Array(0);
  return b instanceof Uint8Array ? b : new Uint8Array(b);
}
function at(u8, off, sig) {
  if (off < 0 || off + sig.length > u8.length) return false;
  for (let i = 0; i < sig.length; i++) if (u8[off + i] !== sig[i]) return false;
  return true;
}
function ascii(s) { return Array.from(s, (c) => c.charCodeAt(0)); }
function latin1(u8, start = 0, end = u8.length) {
  let s = "";
  const stop = Math.min(end, u8.length);
  for (let i = start; i < stop; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, Math.min(stop, i + 8192)));
  return s;
}

/** Leading-magic sniff. Returns { kind, format } or null for "not a known binary". */
export function sniffMagic(input) {
  const u8 = u8of(input);
  if (u8.length < 2) return null;
  // images
  if (at(u8, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { kind: "image", format: "png" };
  if (at(u8, 0, [0xff, 0xd8, 0xff])) return { kind: "image", format: "jpeg" };
  if (at(u8, 0, ascii("GIF87a")) || at(u8, 0, ascii("GIF89a"))) return { kind: "image", format: "gif" };
  if (at(u8, 0, ascii("RIFF")) && at(u8, 8, ascii("WEBP"))) return { kind: "image", format: "webp" };
  if (at(u8, 0, ascii("BM")) && u8.length >= 26 && at(u8, 6, [0, 0, 0, 0])) return { kind: "image", format: "bmp" };
  if (at(u8, 0, [0x49, 0x49, 0x2a, 0x00]) || at(u8, 0, [0x4d, 0x4d, 0x00, 0x2a])) return { kind: "image", format: "tiff" };
  if (at(u8, 0, [0x00, 0x00, 0x01, 0x00]) || at(u8, 0, [0x00, 0x00, 0x02, 0x00])) return { kind: "image", format: "ico" };
  if (at(u8, 0, ascii("8BPS")) && u8[4] === 0 && u8[5] === 1) return { kind: "image", format: "psd" };
  if (at(u8, 0, [0xff, 0x0a]) || at(u8, 0, [0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20])) return { kind: "image", format: "jxl" };
  if (at(u8, 0, [0x00, 0x00, 0x00, 0x0c, 0x6a, 0x50, 0x20, 0x20])) return { kind: "image", format: "jp2" };
  if (at(u8, 4, ascii("ftyp"))) {
    const brand = latin1(u8, 8, 12).toLowerCase();
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1|avif|avis)/.test(brand)) return { kind: "image", format: brand.trim() };
    if (/^(m4a |m4b |m4p )/.test(brand)) return { kind: "audio", format: brand.trim() };
    return { kind: "video", format: "iso-bmff:" + brand.trim() };
  }
  // video / audio containers
  if (at(u8, 0, [0x1a, 0x45, 0xdf, 0xa3])) return { kind: "video", format: "matroska/webm" };
  if (at(u8, 0, ascii("RIFF")) && at(u8, 8, ascii("AVI "))) return { kind: "video", format: "avi" };
  if (at(u8, 0, ascii("RIFF")) && at(u8, 8, ascii("WAVE"))) return { kind: "audio", format: "wav" };
  if (at(u8, 0, ascii("FLV")) && u8[3] === 0x01) return { kind: "video", format: "flv" };
  if (at(u8, 0, [0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11])) return { kind: "video", format: "asf/wmv" };
  if (at(u8, 0, [0x00, 0x00, 0x01, 0xba]) || at(u8, 0, [0x00, 0x00, 0x01, 0xb3])) return { kind: "video", format: "mpeg-ps" };
  if (u8.length >= 565 && u8[0] === 0x47 && u8[188] === 0x47 && u8[376] === 0x47 && u8[564] === 0x47 && !looksText(u8)) return { kind: "video", format: "mpeg-ts" };
  if (at(u8, 0, ascii("OggS"))) return { kind: "video", format: "ogg" };
  if (at(u8, 0, ascii("fLaC"))) return { kind: "audio", format: "flac" };
  if ((at(u8, 0, ascii("ID3")) && u8[3] < 0x10) || (u8[0] === 0xff && (u8[1] & 0xe0) === 0xe0 && !(u8[1] === 0xfe && decodeTextBytes(u8).ok))) return { kind: "audio", format: "mpeg-audio" }; // FF FE + clean UTF-16 text is a BOM, not an MPEG frame
  if (at(u8, 0, ascii("FORM")) && (at(u8, 8, ascii("AIFF")) || at(u8, 8, ascii("AIFC")))) return { kind: "audio", format: "aiff" };
  // documents and archives
  if (at(u8, 0, ascii("%PDF-"))) return { kind: "pdf", format: "pdf" };
  if (at(u8, 0, [0x50, 0x4b, 0x03, 0x04]) || at(u8, 0, [0x50, 0x4b, 0x05, 0x06]) || at(u8, 0, [0x50, 0x4b, 0x07, 0x08])) return { kind: "zip", format: "zip" };
  if (at(u8, 0, [0x1f, 0x8b, 0x08])) return { kind: "archive", format: "gzip" };
  if (at(u8, 257, ascii("ustar"))) return { kind: "archive", format: "tar" };
  if (at(u8, 0, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return { kind: "archive", format: "7z" };
  if (at(u8, 0, ascii("Rar!\x1a\x07"))) return { kind: "archive", format: "rar" };
  if (at(u8, 0, ascii("BZh")) && u8[3] >= 0x31 && u8[3] <= 0x39) return { kind: "archive", format: "bzip2" };
  if (at(u8, 0, [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00])) return { kind: "archive", format: "xz" };
  if (at(u8, 0, [0x28, 0xb5, 0x2f, 0xfd])) return { kind: "archive", format: "zstd" };
  if (at(u8, 0, [0x4d, 0x53, 0x43, 0x46])) return { kind: "archive", format: "cab" };
  if (at(u8, 0, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return { kind: "ole", format: "ole2" };
  return null;
}

// Distinctive signatures searched ANYWHERE (polyglots / appended media).
const ANYWHERE = [
  { sig: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], kind: "image", format: "png" },
  { sig: [0xff, 0xd8, 0xff, 0xe0], kind: "image", format: "jpeg" },
  { sig: [0xff, 0xd8, 0xff, 0xe1], kind: "image", format: "jpeg" },
  { sig: [0xff, 0xd8, 0xff, 0xdb], kind: "image", format: "jpeg" },
  { sig: [0xff, 0xd8, 0xff, 0xee], kind: "image", format: "jpeg" },
  // Every other FFD8FF variant (DHT, SOF, DQT-first, APPn, COM ...), TIFF, BMP and
  // ICO/CUR are found at any offset by the structural validators below.
  { sig: ascii("JFIF\0"), kind: "image", format: "jpeg" },
  { sig: ascii("Exif\0\0"), kind: "image", format: "jpeg" },
  { sig: ascii("WEBPVP8"), kind: "image", format: "webp" },
  { sig: [0x1a, 0x45, 0xdf, 0xa3], kind: "video", format: "matroska/webm" },
  { sig: ascii("ftypisom"), kind: "video", format: "mp4" },
  { sig: ascii("ftypmp4"), kind: "video", format: "mp4" },
  { sig: ascii("ftypqt  "), kind: "video", format: "mov" },
  { sig: ascii("ftyp3gp"), kind: "video", format: "3gp" },
  { sig: ascii("ftypM4V"), kind: "video", format: "m4v" },
  { sig: ascii("ftypheic"), kind: "image", format: "heic" },
  { sig: ascii("ftypavif"), kind: "image", format: "avif" },
  { sig: ascii("ftypmif1"), kind: "image", format: "heif" },
  { sig: ascii("AVI LIST"), kind: "video", format: "avi" },
  { sig: ascii("OggS\0"), kind: "video", format: "ogg" },
];

function indexOfSig(u8, sig, from = 0) {
  const first = sig[0];
  for (let i = u8.indexOf(first, from); i >= 0 && i + sig.length <= u8.length; i = u8.indexOf(first, i + 1)) {
    if (at(u8, i, sig)) return i;
  }
  return -1;
}

/** Search for any media signature anywhere in the bytes. */
export function findEmbeddedMedia(input) {
  const u8 = u8of(input);
  // GIF header is plain ASCII, so require binary logical-screen bytes after it.
  for (const g of [ascii("GIF89a"), ascii("GIF87a")]) {
    for (let i = indexOfSig(u8, g); i >= 0; i = indexOfSig(u8, g, i + 1)) {
      const tail = u8.subarray(i + 6, i + 10);
      if (tail.length === 4 && Array.from(tail).some((b) => b < 0x20 || b >= 0x80)) return { kind: "image", format: "gif", offset: i };
    }
  }
  for (const row of ANYWHERE) {
    const i = indexOfSig(u8, row.sig);
    if (i >= 0) return { kind: row.kind, format: row.format, offset: i };
  }
  return findStructuredImage(u8);
}

// ---------- structural validators (image headers at ANY offset) ----------
// Short magics (JPEG FFD8FF, TIFF II*\0 / MM\0*, BMP "BM", ICO 00000100) occur by
// chance in compressed data, so at a non-zero offset a hit only counts when the
// header that follows is internally consistent. This keeps clean PDFs/DOCX passing
// while text-prefixed or mid-part images are refused.
const u16le = (u8, o) => u8[o] | (u8[o + 1] << 8);
const u16be = (u8, o) => (u8[o] << 8) | u8[o + 1];
const u32le = (u8, o) => (u8[o] | (u8[o + 1] << 8) | (u8[o + 2] << 16) | (u8[o + 3] << 24)) >>> 0;
const u32be = (u8, o) => ((u8[o] << 24) | (u8[o + 1] << 16) | (u8[o + 2] << 8) | u8[o + 3]) >>> 0;

function jpegMarker(m) {
  return m >= 0xc0 && m <= 0xfe && m !== 0xd8 && m !== 0xd9 && !(m >= 0xd0 && m <= 0xd7);
}
/** FFD8FF + any segment marker, with a well-formed first segment followed by another marker. */
function validJpegAt(u8, i) {
  if (u8[i] !== 0xff || u8[i + 1] !== 0xd8 || u8[i + 2] !== 0xff) return false;
  let p = i + 2;
  while (u8[p + 1] === 0xff) p += 1; // fill bytes
  if (!jpegMarker(u8[p + 1])) return false;
  if (p + 4 > u8.length) return false;
  const len = u16be(u8, p + 2);
  if (len < 2) return false;
  const next = p + 2 + len;
  if (next === u8.length) return true; // header-only tail still counts
  if (next + 1 >= u8.length) return false;
  return u8[next] === 0xff && (jpegMarker(u8[next + 1]) || u8[next + 1] === 0xd9 || u8[next + 1] === 0xff);
}
function validTiffAt(u8, i) {
  const le = u8[i] === 0x49 && u8[i + 1] === 0x49 && u8[i + 2] === 0x2a && u8[i + 3] === 0x00;
  const be = u8[i] === 0x4d && u8[i + 1] === 0x4d && u8[i + 2] === 0x00 && u8[i + 3] === 0x2a;
  if (!le && !be) return false;
  if (i + 8 > u8.length) return false;
  const ifd = le ? u32le(u8, i + 4) : u32be(u8, i + 4);
  if (ifd < 8 || i + ifd + 2 + 12 > u8.length) return false;
  const count = le ? u16le(u8, i + ifd) : u16be(u8, i + ifd);
  if (count < 1 || count > 512) return false;
  const tag = le ? u16le(u8, i + ifd + 2) : u16be(u8, i + ifd + 2);
  const type = le ? u16le(u8, i + ifd + 4) : u16be(u8, i + ifd + 4);
  return tag >= 0xfe && type >= 1 && type <= 18;
}
const BMP_DIB = new Set([12, 16, 40, 52, 56, 64, 108, 124]);
function validBmpAt(u8, i) {
  if (u8[i] !== 0x42 || u8[i + 1] !== 0x4d || i + 30 > u8.length) return false;
  if (u32le(u8, i + 6) !== 0) return false; // reserved
  const off = u32le(u8, i + 10);
  const dib = u32le(u8, i + 14);
  if (!BMP_DIB.has(dib) || off < 14 + dib || off > (1 << 26)) return false;
  if (dib === 12) return u16le(u8, i + 22) === 1;
  const planes = u16le(u8, i + 26);
  const bpp = u16le(u8, i + 28);
  return planes === 1 && [1, 2, 4, 8, 16, 24, 32, 48, 64].includes(bpp) && u32le(u8, i + 18) !== 0;
}
function validIcoAt(u8, i) {
  if (u8[i] !== 0 || u8[i + 1] !== 0 || (u8[i + 2] !== 1 && u8[i + 2] !== 2) || u8[i + 3] !== 0) return false;
  const count = u16le(u8, i + 4);
  if (count < 1 || count > 256 || i + 6 + 16 * count > u8.length) return false;
  const e = i + 6;
  if (u8[e + 3] !== 0) return false; // reserved
  const size = u32le(u8, e + 8);
  const off = u32le(u8, e + 12);
  if (size < 8 || size > (1 << 26) || off < 6 + 16 * count) return false;
  // The first image's data must be there and be a DIB (BITMAPINFOHEADER, 40) or PNG.
  const d = i + off;
  if (d + 8 > u8.length) return false;
  const dibOrPng = u32le(u8, d) === 40 || (u8[d] === 0x89 && u8[d + 1] === 0x50 && u8[d + 2] === 0x4e && u8[d + 3] === 0x47);
  if (!dibOrPng) return false;
  if (u8[i + 2] === 1) {
    const planes = u16le(u8, e + 4);
    const bpp = u16le(u8, e + 6);
    if (planes > 1 || ![0, 1, 2, 4, 8, 16, 24, 32].includes(bpp)) return false;
  }
  return true;
}
/** Structural image search at any offset (JPEG all variants, TIFF, BMP, ICO/CUR). */
export function findStructuredImage(input) {
  const u8 = u8of(input);
  for (let i = u8.indexOf(0xff); i >= 0; i = u8.indexOf(0xff, i + 1)) {
    if (u8[i + 1] === 0xd8 && u8[i + 2] === 0xff && validJpegAt(u8, i)) return { kind: "image", format: "jpeg", offset: i };
  }
  for (const first of [0x49, 0x4d]) {
    for (let i = u8.indexOf(first); i >= 0; i = u8.indexOf(first, i + 1)) {
      if (validTiffAt(u8, i)) return { kind: "image", format: "tiff", offset: i };
    }
  }
  for (let i = u8.indexOf(0x42); i >= 0; i = u8.indexOf(0x42, i + 1)) {
    if (u8[i + 1] === 0x4d && validBmpAt(u8, i)) return { kind: "image", format: "bmp", offset: i };
  }
  for (let i = u8.indexOf(0); i >= 0 && i + 22 <= u8.length; i = u8.indexOf(0, i + 1)) {
    if (u8[i + 1] === 0 && validIcoAt(u8, i)) return { kind: "image", format: "ico", offset: i };
  }
  return null;
}

// ---------- text decoding (fail closed) ----------
const C0_BAD = /[\u0000-\u0008\u000e-\u001a\u001c-\u001f\u007f]/;
function nullShare(u8, parity) {
  const n = Math.min(u8.length, 4096);
  let pairs = 0;
  let hits = 0;
  for (let i = parity; i < n; i += 2) { pairs += 1; if (u8[i] === 0) hits += 1; }
  return pairs ? hits / pairs : 0;
}
function decodeUtf16(u8, bigEndian) {
  const even = u8.length - (u8.length % 2);
  const b = new Uint8Array(even);
  if (bigEndian) for (let i = 0; i < even; i += 2) { b[i] = u8[i + 1]; b[i + 1] = u8[i]; }
  else b.set(u8.subarray(0, even));
  return new TextDecoder("utf-16le", { fatal: true }).decode(b);
}
/**
 * Decode bytes as text, confidently or not at all.
 * UTF-8 (BOM optional), UTF-16 LE/BE (BOM, or interleaved NULs without one), or
 * single-byte text with no control bytes. Anything else -> { ok:false }.
 * A decoded text that still holds NUL or C0 control bytes is binary -> { ok:false }.
 */
export function decodeTextBytes(input) {
  const u8 = u8of(input);
  if (!u8.length) return { ok: true, text: "", encoding: "empty" };
  let text = null;
  let encoding = null;
  try {
    if (u8[0] === 0xff && u8[1] === 0xfe) { text = decodeUtf16(u8.subarray(2), false); encoding = "utf-16le"; }
    else if (u8[0] === 0xfe && u8[1] === 0xff) { text = decodeUtf16(u8.subarray(2), true); encoding = "utf-16be"; }
    else if (u8.length >= 4 && nullShare(u8, 1) >= 0.3 && nullShare(u8, 0) < 0.1) { text = decodeUtf16(u8, false); encoding = "utf-16le"; }
    else if (u8.length >= 4 && nullShare(u8, 0) >= 0.3 && nullShare(u8, 1) < 0.1) { text = decodeUtf16(u8, true); encoding = "utf-16be"; }
  } catch {
    return { ok: false, text: "", encoding: "utf-16-undecodable" };
  }
  if (text == null) {
    try {
      const start = u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf ? 3 : 0;
      text = new TextDecoder("utf-8", { fatal: true }).decode(u8.subarray(start));
      encoding = "utf-8";
    } catch {
      // Not UTF-8. Accept legacy single-byte text only when it carries no control bytes.
      text = latin1(u8);
      encoding = "latin1";
    }
  }
  if (C0_BAD.test(text)) return { ok: false, text: "", encoding: encoding + "-binary" };
  return { ok: true, text, encoding };
}

// ---------- encoded payloads ----------
const ZLIB_SECOND = new Set([0x01, 0x5e, 0x9c, 0xda]);
/** Decoded bytes: media at offset 0 or anywhere, or zlib/gzip that inflates to media. */
function decodedIsBinaryMedia(u8, depth = 0) {
  if (!u8 || u8.length < 4) return null;
  const m = sniffMagic(u8);
  if (m && m.kind !== "ole" && !WEAK_FORMATS.has(m.format)) return m;
  const e = findEmbeddedMedia(u8);
  if (e) return e;
  if (depth >= 2) return null;
  let tries = 0;
  for (let i = 0; i + 2 < u8.length && tries < 64; i++) {
    const zlib = u8[i] === 0x78 && ZLIB_SECOND.has(u8[i + 1]);
    const gz = u8[i] === 0x1f && u8[i + 1] === 0x8b && u8[i + 2] === 0x08;
    if (!zlib && !gz) continue;
    tries += 1;
    let out = null;
    try {
      out = zlib ? inflateSync(u8.subarray(i), { maxOutputLength: 16 * 1024 * 1024, finishFlush: 2 }) : gunzipSync(u8.subarray(i), { maxOutputLength: 16 * 1024 * 1024, finishFlush: 2 });
    } catch { out = null; }
    if (out && out.length) {
      const hit = decodedIsBinaryMedia(new Uint8Array(out), depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

const B64_VALUE = (() => {
  const t = new Int16Array(128).fill(-1);
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < a.length; i++) t[a.charCodeAt(i)] = i;
  t[43] = 62; t[45] = 62; t[47] = 63; t[95] = 63; // + - / _
  return t;
})();
function base64Bytes(chars) {
  const n = chars.length - (chars.length % 4);
  const out = new Uint8Array((n / 4) * 3);
  let o = 0;
  for (let i = 0; i < n; i += 4) {
    const a = B64_VALUE[chars.charCodeAt(i)], b = B64_VALUE[chars.charCodeAt(i + 1)];
    const c = B64_VALUE[chars.charCodeAt(i + 2)], d = B64_VALUE[chars.charCodeAt(i + 3)];
    const v = (a << 18) | (b << 12) | (c << 6) | d;
    out[o++] = (v >> 16) & 255; out[o++] = (v >> 8) & 255; out[o++] = v & 255;
  }
  return out;
}
function hexBytes(chars) {
  const out = new Uint8Array(Math.floor(chars.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(chars.substr(i * 2, 2), 16);
  return out;
}
/** Ascii85 (btoa / Adobe). strict: any invalid char or misplaced 'z' -> null. */
function ascii85Bytes(chars, strict) {
  const out = [];
  let group = [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars.charCodeAt(i);
    if (c === 0x7a && group.length === 0) { out.push(0, 0, 0, 0); continue; }
    if (c < 33 || c > 117) { if (strict) return null; group = []; continue; }
    group.push(c - 33);
    if (group.length === 5) {
      let v = 0;
      for (const g of group) v = v * 85 + g;
      if (v > 0xffffffff) { if (strict) return null; group = []; continue; }
      out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
      group = [];
    }
  }
  if (group.length === 1) { if (strict) return null; }
  else if (group.length > 1) {
    const k = group.length;
    while (group.length < 5) group.push(84);
    let v = 0;
    for (const g of group) v = v * 85 + g;
    for (let j = 0; j < k - 1; j++) out.push((v >>> (24 - 8 * j)) & 255);
  }
  return new Uint8Array(out);
}
// Encoded-run scanners for encodedMediaReason. Each returns the same matches, in the
// same order, as the regex in its comment, but walks the text in a loop: the counted
// regex overflows the engine's backtracking stack on a multi-MiB run (a long line of
// one letter, a digits table), which refused large legitimate text with
// INTAKE-CHECK-ERROR (AZBot review, intake-text.js:169). Nothing is skipped or capped.
const M_HEX = new Uint8Array(128);
for (const ch of "0123456789abcdefABCDEF") M_HEX[ch.charCodeAt(0)] = 1;
const mHexAt = (s, i) => { const c = s.charCodeAt(i); return c < 128 && M_HEX[c] === 1; };
const M_HEX_SEP = /[\s,:;-]/;

/** /(?:(?:0x|\\x)?[0-9A-Fa-f]{2}[\s,:;-]*){16,}/g — each group is matched in exactly one way. */
export function mediaHexRuns(s) {
  const out = [];
  const L = s.length;
  let p = 0;
  while (p < L) {
    const c0 = s.charCodeAt(p);
    if (c0 !== 92 && !mHexAt(s, p)) { p++; continue; }
    let q = p;
    let groups = 0;
    for (;;) {
      let g = q;
      const c = s.charCodeAt(g);
      if ((c === 48 || c === 92) && s.charCodeAt(g + 1) === 120 && mHexAt(s, g + 2) && mHexAt(s, g + 3)) g += 4;
      else if (g + 2 <= L && mHexAt(s, g) && mHexAt(s, g + 1)) g += 2;
      else break;
      while (g < L && M_HEX_SEP.test(s[g])) g++;
      q = g;
      groups++;
    }
    if (groups < 16) { p++; continue; }
    out.push(s.slice(p, q));
    p = q;
  }
  return out;
}

const isA85At = (s, i) => { const c = s.charCodeAt(i); return (c >= 33 && c <= 117) || c === 122; };
/**
 * /(?:[!-uz]{20,}\r?\n?){2,}|[!-uz]{40,}/g. A match is a chain of maximal alphabet
 * runs of 20+ joined by \r\n, \r or \n (a run of 40+ splits into two groups on its
 * own), plus the separator after the last run. A start that fails fails for every
 * later start in the same run, so the scan resumes after that run.
 */
export function ascii85Runs(s) {
  const out = [];
  const L = s.length;
  let p = 0;
  const sepEnd = (i) => {
    if (s.charCodeAt(i) === 13) return s.charCodeAt(i + 1) === 10 ? i + 2 : i + 1;
    if (s.charCodeAt(i) === 10) return i + 1;
    return i;
  };
  while (p < L) {
    if (!isA85At(s, p)) { p++; continue; }
    let e = p;
    while (e < L && isA85At(s, e)) e++;
    if (e - p < 20) { p = e; continue; }
    let groups = e - p >= 40 ? 2 : 1;
    let q = sepEnd(e);
    for (;;) {
      if (q === e) break;
      let f = q;
      while (f < L && isA85At(s, f)) f++;
      if (f - q < 20) break;
      groups++;
      e = f;
      q = sepEnd(f);
    }
    if (groups < 2) { p = e; continue; }
    out.push(s.slice(p, q));
    p = q;
  }
  return out;
}

const ENCODED_BUDGET = 64 * 1024 * 1024; // chars; above MAX_INTAKE_BYTES, so a real upload never hits it
/**
 * Encoded media in text: base64 / url-safe base64 (any whitespace or line breaks
 * inside, any amount of padding before the payload), hex (with or without 0x / \x /
 * separators), Ascii85 (<~ ~> delimited, or bare). The WHOLE run is decoded (not a
 * prefix) and searched at every offset, including zlib/gzip-compressed payloads.
 * A delimited Ascii85 block that does not decode is refused (cannot be checked).
 */
export function encodedMediaReason(text) {
  const s = String(text || "");
  let budget = ENCODED_BUDGET;
  // base64: alphabet + whitespace; '=' ends one payload (padding).
  for (const seg of s.split(/=+/)) {
    // Same runs as /[A-Za-z0-9+/_\-\s]{32,}/g (a maximal single-class run), filtered by
    // length: the counted form overflows the regex stack on a multi-MiB run.
    const re = /[A-Za-z0-9+/_\-\s]+/g;
    let m;
    while ((m = re.exec(seg))) {
      if (m[0].length < 32) continue;
      const chars = m[0].replace(/\s+/g, "");
      if (chars.length < 24) continue;
      budget -= chars.length;
      if (budget < 0) return MEDIA_REASONS.ENCODED; // too much to check: refuse, do not skip
      for (let shift = 0; shift < 4; shift++) {
        if (decodedIsBinaryMedia(base64Bytes(chars.slice(shift)))) return MEDIA_REASONS.ENCODED;
      }
    }
  }
  // hex: digits with optional 0x / \x prefixes and whitespace , : ; - separators.
  for (const run of mediaHexRuns(s)) {
    const chars = run.replace(/0x|\\x/gi, "").replace(/[^0-9A-Fa-f]/g, "");
    budget -= chars.length;
    if (budget < 0) return MEDIA_REASONS.ENCODED;
    for (let shift = 0; shift < 2; shift++) {
      if (decodedIsBinaryMedia(hexBytes(chars.slice(shift)))) return MEDIA_REASONS.ENCODED;
    }
  }
  // Ascii85, delimited: must decode strictly or the text is refused.
  const are = /<~([\s\S]*?)~>/g;
  let a;
  while ((a = are.exec(s))) {
    const body = a[1].replace(/\s+/g, "");
    if (body.length < 20) continue;
    const inAlpha = (body.match(/[!-uz]/g) || []).length;
    if (inAlpha / body.length < 0.9) continue; // prose/code using "<~" and "~>" as operators
    const bytes = ascii85Bytes(body, true);
    if (!bytes) return MEDIA_REASONS.ENCODED;
    if (decodedIsBinaryMedia(bytes)) return MEDIA_REASONS.ENCODED;
  }
  // Ascii85, bare: long runs of the alphabet with no spaces.
  for (const run of ascii85Runs(s)) {
    const chars = run.replace(/\s+/g, "");
    budget -= chars.length;
    if (budget < 0) return MEDIA_REASONS.ENCODED;
    for (let shift = 0; shift < 5; shift++) {
      if (decodedIsBinaryMedia(ascii85Bytes(chars.slice(shift), false))) return MEDIA_REASONS.ENCODED;
    }
  }
  return null;
}

function looksText(u8) {
  const head = u8.subarray(0, 1024);
  if (head.includes(0)) return false;
  try { new TextDecoder("utf-8", { fatal: true }).decode(head.subarray(0, Math.max(0, head.length - 4))); return true; } catch { return false; }
}

function codeForKind(kind) {
  if (kind === "image") return MEDIA_REASONS.IMAGE;
  if (kind === "video") return MEDIA_REASONS.VIDEO;
  if (kind === "audio") return MEDIA_REASONS.AUDIO;
  return MEDIA_REASONS.EMBEDDED;
}

// ---------- text ----------
const DATA_URI = /data:\s*(?:image|video|audio|application\/(?:octet-stream|zip|x-[a-z0-9.+-]+|pdf))[^,]{0,120},/i;
const DATA_URI_ANY_B64 = /data:[^,;\s]{0,80};\s*base64\s*,/i;
const MEDIA_TAGS = /<(?:img|image|svg|video|audio|picture|source|track|object|embed|iframe|frame|canvas|applet|bgsound|input\s[^>]*type\s*=\s*["']?image)\b/i;
const CSS_MEDIA = /(?:url\s*\(|image-set\s*\(|-webkit-image-set\s*\(|background(?:-image)?\s*:[^;"'>]*url)/i;
const MD_IMAGE = /!\[[^\]]{0,500}\]\s*\(|!\[[^\]]{0,500}\]\s*\[[^\]]*\]|^\s*\[[^\]]+\]:\s*\S+\.(?:png|jpe?g|gif|webp|svg|mp4|webm|mov)\b/im;
const ENTITY_TAG = /&(?:lt|#0*60|#x0*3c);(?:img|svg|video|iframe|object|embed)\b/i;

// Short / weak magics (2-3 bytes, or byte patterns common in random data) are not
// trusted on decoded text runs; only multi-byte signatures count there.
const WEAK_FORMATS = new Set(["mpeg-audio", "ico", "mpeg-ts", "jxl", "bmp"]);

/** Screen one piece of text for media. Returns a reason code or null. */
export function textMediaReason(text) {
  const s = String(text || "");
  if (!s) return null;
  // UTF-16 that arrived as a string with interleaved NULs (or any NUL padding):
  // check the de-NULed form as well as the original.
  if (s.includes("\u0000")) {
    const r = textMediaReason1(s.replace(/\u0000/g, ""));
    if (r) return r;
  }
  return textMediaReason1(s);
}

function textMediaReason1(s) {
  const folded = s.normalize("NFKC");
  if (DATA_URI.test(folded) || DATA_URI_ANY_B64.test(folded)) return MEDIA_REASONS.DATA_URI;
  if (MEDIA_TAGS.test(folded) || ENTITY_TAG.test(folded)) return MEDIA_REASONS.MARKUP;
  if (/<\s*style\b|style\s*=/i.test(folded) && CSS_MEDIA.test(folded)) return MEDIA_REASONS.MARKUP;
  if (MD_IMAGE.test(folded)) return MEDIA_REASONS.MARKUP;
  // base64 / hex / Ascii85 runs, whole-run decode at every offset (see encodedMediaReason).
  const enc = encodedMediaReason(folded);
  if (enc) return enc;
  if (folded !== s) {
    const raw = encodedMediaReason(s);
    if (raw) return raw;
  }
  // percent-encoded magic, e.g. %89PNG
  if (/%89%50%4e%47|%ff%d8%ff|%1a%45%df%a3|ftyp(?:isom|mp4|qt)%/i.test(folded)) return MEDIA_REASONS.ENCODED;
  return null;
}

// ---------- PDF ----------
const PDF_MEDIA = /\/Subtype\s*\/Image\b|\/(?:DCTDecode|JPXDecode|JBIG2Decode|CCITTFaxDecode|DCT|CCF)\b|\/(?:RichMedia|Movie|Sound|Screen|3D|EmbeddedFile|EmbeddedFiles|FileAttachment)\b|\/Type\s*\/XObject[\s\S]{0,200}\/Subtype\s*\/Image/;
const PDF_INLINE_IMAGE = /(?:^|[\s\]>)])BI\s+[\s\S]{0,4000}?\sID[\s\r\n]/m;

// PDF names may hide letters as #xx ("/Im#61ge") and a comment may sit between
// tokens ("/Subtype %c\n/Image"); NUL and form feed are PDF whitespace. Every check
// runs on the raw text AND on each normalised view; a hit on any view refuses.
function pdfDecodeNames(t) { return t.replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); }
function pdfStripComments(t) { return t.replace(/%[^\r\n]*/g, " "); }
function pdfViews(t) {
  const ws = (x) => x.replace(/[\0\f]/g, " ");
  const d = pdfDecodeNames(t);
  const c = pdfStripComments(t);
  return [ws(t), ws(d), ws(c), ws(pdfDecodeNames(c)), ws(pdfStripComments(d))];
}
function pdfHasMedia(t) {
  return pdfViews(t).some((v) => PDF_MEDIA.test(v) || PDF_INLINE_IMAGE.test(v));
}
function pdfDictHasMedia(t) {
  return pdfViews(t).some((v) => PDF_MEDIA.test(v));
}

const PDF_STREAM_KW = /stream(?:\r\n|\r|\n)/g;
function pdfStreams(u8) {
  const s = latin1(u8);
  const out = [];
  const covered = [];
  const re = /<<([\s\S]{0,8000}?)>>[\s\0]*stream(?:\r\n|\r|\n)/g;
  let m;
  while ((m = re.exec(s))) {
    // The lazy match starts at the first "<<" after the previous stream, which can be an
    // earlier object: keep only this stream's own object (after its last "N G obj").
    let dict = m[1];
    const objs = dict.match(/\d+[\s\0]+\d+[\s\0]+obj\b/g);
    if (objs) {
      const cut = dict.lastIndexOf(objs[objs.length - 1]) + objs[objs.length - 1].length;
      const own = dict.indexOf("<<", cut);
      dict = own >= 0 ? dict.slice(own + 2) : dict.slice(cut);
    }
    const start = re.lastIndex;
    const end = s.indexOf("endstream", start);
    if (end < 0) { out.push({ dict, span: m[1], bytes: null }); break; }
    out.push({ dict, span: m[1], bytes: u8.subarray(start, end) });
    covered.push([m.index, end + 9]);
    re.lastIndex = end + 9;
    if (out.length > 5000) { out.push({ dict: "", bytes: null }); break; }
  }
  // A "stream" keyword we did not parse (outside every parsed stream) is a stream we
  // could not read: report it so the caller refuses rather than skipping it.
  let orphan = false;
  PDF_STREAM_KW.lastIndex = 0;
  let k;
  while ((k = PDF_STREAM_KW.exec(s))) {
    const pos = k.index;
    if (pos > 2 && s.slice(pos - 3, pos) === "end") continue;
    if (!covered.some(([a, b]) => pos >= a && pos < b)) { orphan = true; break; }
  }
  return { text: s, streams: out, orphan };
}

/**
 * Decoded bytes of one parsed PDF stream (Flate / ASCII85 / ASCIIHex, names normalised, chained
 * filters applied), or null when it cannot be read. Shared with the text checks so
 * both layers read the same bytes.
 */
const PDF_FILTERS = new Set(["/FlateDecode", "/Fl", "/ASCII85Decode", "/A85", "/ASCIIHexDecode", "/AHx"]);
export function pdfDecodeStream(st, maxInflate = 32 * 1024 * 1024, info = null) {
  if (!st || !st.bytes) return null;
  const filterOf = (d) => (pdfStripComments(pdfDecodeNames(d)).match(/\/Filter[\s\0]*(\[[^\]]*\]|\/[^\s\0/\[\]<>()%]+)/) || [])[1] || "";
  const filters = filterOf(st.dict);
  // The object cut in pdfStreams must not change which filter applies: if the raw span
  // reads differently (say an "N 0 obj" inside a string hid the real /Filter), the
  // stream is ambiguous and cannot be read (null: the caller refuses).
  if (st.span !== undefined && st.span !== st.dict && filterOf(st.span) !== filters) return null;
  const names = filters.match(/\/[^\s\0/\[\]<>()%]+/g) || [];
  let data = st.bytes;
  if (!names.length) return data;
  // Flate, plus the two lossless text filters (ReportLab writes [/ASCII85Decode
  // /FlateDecode]). Any other filter cannot be read here: null, the caller refuses.
  if (names.some((n) => !PDF_FILTERS.has(n))) return null;
  try {
    for (const n of names) {
      let raw = data;
      // PDF: an EOL may precede endstream. Prefer inflate/decode as-is; only peel one
      // trailing EOL on failure. Blind CRLF trim ate a real trailing 0x0d when the
      // extractor had already left the structural LF (B193 LOW / EOL class).
      const peelEol = (b) => {
        if (b.length >= 2 && b[b.length - 2] === 0x0d && b[b.length - 1] === 0x0a) return b.subarray(0, b.length - 2);
        if (b.length && (b[b.length - 1] === 0x0a || b[b.length - 1] === 0x0d)) return b.subarray(0, b.length - 1);
        return b;
      };
      if (n === "/ASCII85Decode" || n === "/A85") {
        let t = latin1(raw).replace(/[\0\t\n\f\r ]+/g, "");
        if (t.startsWith("<~")) t = t.slice(2);
        let end = t.indexOf("~>");
        if (end < 0) { t = latin1(peelEol(raw)).replace(/[\0\t\n\f\r ]+/g, ""); if (t.startsWith("<~")) t = t.slice(2); end = t.indexOf("~>"); }
        if (end < 0) return null;
        data = ascii85Bytes(t.slice(0, end), true);
        if (!data) return null;
      } else if (n === "/ASCIIHexDecode" || n === "/AHx") {
        let t = latin1(raw).replace(/[\0\t\n\f\r ]+/g, "");
        let end = t.indexOf(">");
        if (end < 0) { t = latin1(peelEol(raw)).replace(/[\0\t\n\f\r ]+/g, ""); end = t.indexOf(">"); }
        if (end < 0) return null;
        t = t.slice(0, end);
        if (/[^0-9a-fA-F]/.test(t)) return null;
        if (t.length % 2) t += "0";
        data = new Uint8Array(t.length / 2);
        for (let i = 0; i < data.length; i++) data[i] = parseInt(t.substr(i * 2, 2), 16);
      } else {
        let out;
        try {
          out = inflateSync(raw, { maxOutputLength: maxInflate });
        } catch {
          const peeled = peelEol(raw);
          if (peeled === raw) throw new Error("inflate");
          out = inflateSync(peeled, { maxOutputLength: maxInflate });
        }
        data = out instanceof Uint8Array ? out : new Uint8Array(out);
      }
      if (data.length > maxInflate) { if (info) info.tooLarge = true; return null; }
    }
  } catch (e) {
    // info.tooLarge: the stream inflates past maxInflate (the caller may refuse as too large).
    if (info && e && e.code === "ERR_BUFFER_TOO_LARGE") info.tooLarge = true;
    return null;
  }
  return data;
}

/** PDF: refuse any image, inline image, embedded file or rich media; refuse what we cannot read. */
export function pdfMediaReason(input, { maxInflate = 32 * 1024 * 1024 } = {}) {
  const u8 = u8of(input);
  // Media appended after %%EOF or hidden between objects (polyglot) refuses too.
  if (findEmbeddedMedia(u8)) return MEDIA_REASONS.POLYGLOT;
  const { text, streams, orphan } = pdfStreams(u8);
  if (pdfViews(text).some((v) => /\/Encrypt\b/.test(v))) return MEDIA_REASONS.UNREADABLE_DOC;
  if (pdfDictHasMedia(text)) return MEDIA_REASONS.EMBEDDED;
  if (orphan) return MEDIA_REASONS.UNREADABLE_DOC;
  let total = 0;
  for (const st of streams) {
    const data = pdfDecodeStream(st, maxInflate);
    if (!data) return MEDIA_REASONS.UNREADABLE_DOC;
    total += data.length;
    if (total > maxInflate) return MEDIA_REASONS.UNREADABLE_DOC;
    const body = latin1(data);
    if (pdfHasMedia(body)) return MEDIA_REASONS.EMBEDDED;
    const hit = sniffMagic(data);
    if (hit && (hit.kind === "image" || hit.kind === "video" || hit.kind === "audio")) return MEDIA_REASONS.EMBEDDED;
    if (findEmbeddedMedia(data)) return MEDIA_REASONS.EMBEDDED;
  }
  return null;
}

// ---------- ZIP-based documents ----------
const OFFICE_MEDIA_PART = /(^|\/)(media|Pictures|embeddings|ObjectReplacements|Thumbnails|images?)\//i;

// Every byte of an Office zip must belong to a local entry, its data descriptor, the
// central directory or the end record. Bytes appended after the end record, before
// the first entry, or between entries are where polyglot payloads hide: refuse.
function zipLayoutReason(u8, entries) {
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 22 - 65535); i--) {
    if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) { eocd = i; break; }
  }
  if (eocd < 0) return MEDIA_REASONS.UNREADABLE_DOC;
  const commentLen = u16le(u8, eocd + 20);
  const end = eocd + 22 + commentLen;
  if (end !== u8.length) return MEDIA_REASONS.POLYGLOT; // trailing bytes after the zip
  if (commentLen) {
    const comment = u8.subarray(eocd + 22, end);
    const dec = decodeTextBytes(comment);
    if (!dec.ok || findEmbeddedMedia(comment) || textMediaReason(dec.text)) return MEDIA_REASONS.POLYGLOT;
  }
  const cdSize = u32le(u8, eocd + 12);
  const cdOff = u32le(u8, eocd + 16);
  if (cdOff === 0xffffffff || cdSize === 0xffffffff) return MEDIA_REASONS.UNREADABLE_DOC; // zip64: not opened
  if (cdOff + cdSize !== eocd) return MEDIA_REASONS.POLYGLOT;
  const spans = [];
  for (const e of entries) {
    const lo = e.localOff;
    if (lo == null || lo + 30 > u8.length || u32le(u8, lo) !== 0x04034b50) return MEDIA_REASONS.UNREADABLE_DOC;
    const flags = u16le(u8, lo + 6);
    let stop = lo + 30 + u16le(u8, lo + 26) + u16le(u8, lo + 28) + (e.compressed || 0);
    if (flags & 0x08) {
      if (u32le(u8, stop) === 0x08074b50) stop += 4;
      stop += 12;
    }
    spans.push([lo, stop]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  let pos = 0;
  for (const [a, b] of spans) {
    if (a !== pos) return MEDIA_REASONS.POLYGLOT; // gap or overlap
    pos = b;
  }
  if (pos !== cdOff) return MEDIA_REASONS.POLYGLOT;
  return null;
}

const OFFICE_TEXT_PART = /\.(xml|rels|html?|xhtml|svg|css|opf|ncx|txt|json|vml|md)$|(^|\/)mimetype$|(^|\/)\[Content_Types\]\.xml$/i;
const OFFICE_FONT_PART = /\.(odttf|ttf|otf|fntdata|woff2?)$/i;

/** Office/ODF/EPUB: open the container; any media part, embedding, macro or nested archive refuses. */
export function officeMediaReason(input, { depth = 0 } = {}) {
  const u8 = u8of(input);
  const listed = listZipEntries(u8);
  if (!listed.ok) return MEDIA_REASONS.UNREADABLE_DOC;
  const names = [];
  for (const e of listed.entries) {
    if (e.directory) continue;
    if (e.encrypted) return MEDIA_REASONS.UNREADABLE_DOC;
    if (OFFICE_MEDIA_PART.test(e.name) || MEDIA_EXT.test(e.name) || ARCHIVE_EXT.test(e.name) || /\.(bin|emf|wmf|ole)$/i.test(e.name)) return MEDIA_REASONS.EMBEDDED;
    names.push(e.name);
  }
  if (names.length > 4000) return MEDIA_REASONS.UNREADABLE_DOC;
  const layout = zipLayoutReason(u8, listed.entries);
  if (layout) return layout;
  // Stored (uncompressed) media anywhere in the raw container.
  if (findEmbeddedMedia(u8)) return MEDIA_REASONS.POLYGLOT;
  const read = readZipFiles(u8, names);
  if (!read.ok) return MEDIA_REASONS.UNREADABLE_DOC;
  for (const [name, bytes] of Object.entries(read.files)) {
    const m = sniffMagic(bytes);
    if (m && m.kind !== "ole") return MEDIA_REASONS.EMBEDDED;
    if (findEmbeddedMedia(bytes)) return MEDIA_REASONS.EMBEDDED;
    // Every part is checked as text, whatever its extension (customXml/item1.dat,
    // UTF-16 xml, ...). A part that is not text is only allowed when it is a font;
    // any other binary part cannot be checked and refuses.
    const dec = decodeTextBytes(bytes);
    if (!dec.ok) {
      if (OFFICE_FONT_PART.test(name)) continue;
      return OFFICE_TEXT_PART.test(name) ? MEDIA_REASONS.UNREADABLE_DOC : MEDIA_REASONS.EMBEDDED;
    }
    const t = dec.text;
    if (/<\s*(?:svg|img|image|video|audio|object|embed)\b|<(?:a:)?blip\b|<v:imagedata\b|<pic:pic\b|<draw:image\b|r:embed\s*=/.test(t)) return MEDIA_REASONS.EMBEDDED;
    if (textMediaReason(t)) return MEDIA_REASONS.EMBEDDED;
  }
  return null;
}

/** Recursive archive scan (used for operator packages, which are zips by design). */
export function archiveMediaReason(input, { depth = 0, maxDepth = 2 } = {}) {
  const u8 = u8of(input);
  const head = sniffMagic(u8);
  if (!head) {
    if (findEmbeddedMedia(u8)) return MEDIA_REASONS.POLYGLOT;
    const dec = decodeTextBytes(u8);
    if (!dec.ok) return MEDIA_REASONS.UNDECODABLE;
    if (/<svg[\s>]/i.test(dec.text)) return MEDIA_REASONS.SVG;
    return textMediaReason(dec.text);
  }
  if (head.kind === "image" || head.kind === "video" || head.kind === "audio") return codeForKind(head.kind);
  if (head.kind === "pdf") return pdfMediaReason(u8);
  if (head.kind === "archive") {
    if (head.format !== "gzip" || depth >= maxDepth) return MEDIA_REASONS.ARCHIVE;
    let out;
    try { out = gunzipSync(u8, { maxOutputLength: 32 * 1024 * 1024 }); } catch { return MEDIA_REASONS.ARCHIVE; }
    return archiveMediaReason(out, { depth: depth + 1, maxDepth }) || null;
  }
  if (head.kind === "zip") {
    if (depth >= maxDepth) return MEDIA_REASONS.ARCHIVE;
    const listed = listZipEntries(u8);
    if (!listed.ok) return MEDIA_REASONS.ARCHIVE;
    const names = [];
    for (const e of listed.entries) {
      if (e.directory) continue;
      if (e.encrypted) return MEDIA_REASONS.ARCHIVE;
      if (MEDIA_EXT.test(e.name)) return MEDIA_REASONS.EMBEDDED;
      names.push(e.name);
    }
    const read = readZipFiles(u8, names);
    if (!read.ok) return MEDIA_REASONS.ARCHIVE;
    for (const bytes of Object.values(read.files)) {
      const r = archiveMediaReason(bytes, { depth: depth + 1, maxDepth });
      if (r) return r === MEDIA_REASONS.IMAGE || r === MEDIA_REASONS.VIDEO || r === MEDIA_REASONS.AUDIO ? MEDIA_REASONS.EMBEDDED : r;
      const dec = decodeTextBytes(bytes);
      if (dec.ok && textMediaReason(dec.text)) return MEDIA_REASONS.EMBEDDED;
    }
    return null;
  }
  return MEDIA_REASONS.ARCHIVE;
}

/**
 * Screen one file for the corpus (ingestRecord doors).
 * Returns a reason code or null (text or a clean document).
 */
export function fileMediaReason({ name = "", type = "", bytes } = {}) {
  const u8 = u8of(bytes);
  const ct = String(type || "").toLowerCase().split(";")[0].trim();
  const fname = String(name || "");
  if (/^(image|video|audio)\//.test(ct) || ct === "application/x-shockwave-flash" || ct === "application/vnd.rn-realmedia") return MEDIA_REASONS.DECLARED;
  if (MEDIA_EXT.test(fname)) return MEDIA_REASONS.DECLARED;
  const head = sniffMagic(u8);
  if (head) {
    if (head.kind === "image" || head.kind === "video" || head.kind === "audio") return codeForKind(head.kind);
    if (head.kind === "pdf") return pdfMediaReason(u8);
    if (head.kind === "zip") {
      if (OFFICE_EXT.test(fname) || /officedocument|opendocument|epub/.test(ct)) return officeMediaReason(u8);
      return MEDIA_REASONS.ARCHIVE;
    }
    if (head.kind === "archive") return MEDIA_REASONS.ARCHIVE;
    if (head.kind === "ole") return MEDIA_REASONS.UNREADABLE_DOC; // legacy .doc/.xls/.ppt can embed media we cannot open
  }
  if (ARCHIVE_EXT.test(fname) || /zip|x-tar|gzip|x-7z|x-rar|x-bzip|x-xz|zstd/.test(ct)) return MEDIA_REASONS.ARCHIVE;
  const anywhere = findEmbeddedMedia(u8);
  if (anywhere) return MEDIA_REASONS.POLYGLOT;
  // Treat the rest as text, decoded confidently (UTF-8, UTF-16 with or without BOM,
  // or control-free single-byte text) or refused. SVG is an image even as text/xml.
  if (/\.svgz?$/i.test(fname) || ct === "image/svg+xml") return MEDIA_REASONS.SVG;
  const dec = decodeTextBytes(u8);
  if (!dec.ok) return MEDIA_REASONS.UNDECODABLE;
  const t = dec.text;
  if (/<svg[\s>]/i.test(t) || /<svg[\s>]/i.test(t.normalize("NFKC")) || /\.svgz?$/i.test(fname) || ct === "image/svg+xml") return MEDIA_REASONS.SVG;
  return textMediaReason(t);
}

/** Gate check (registered in intake-gate.js). No exemptions, operator included. */
export const mediaFloorCheck = {
  name: "media-floor",
  run(ctx) {
    if (ctx.file) {
      const r = ctx.expect === "package"
        ? (MEDIA_EXT.test(ctx.file.name) || /^(image|video|audio)\//i.test(ctx.file.type) ? MEDIA_REASONS.DECLARED : archiveMediaReason(ctx.file.bytes))
        : fileMediaReason(ctx.file);
      if (r) return { code: r, status: 415 };
    }
    for (const t of [ctx.title, ctx.body, ...(ctx.texts || [])]) {
      const r = textMediaReason(t);
      if (r) return { code: r, status: 415 };
    }
    return null;
  },
};

export { MEDIA_EXT, ARCHIVE_EXT, OFFICE_EXT, inflateRawSync, pdfStreams };
