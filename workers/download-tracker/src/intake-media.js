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
 *     media tags, CSS url(), markdown image embeds, and base64/hex runs whose decoded
 *     bytes are media or archives.
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
  if ((at(u8, 0, ascii("ID3")) && u8[3] < 0x10) || (u8[0] === 0xff && (u8[1] & 0xe0) === 0xe0)) return { kind: "audio", format: "mpeg-audio" };
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

function decodeBase64Prefix(run, bytes = 96) {
  const clean = run.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const take = clean.slice(0, Math.ceil(bytes / 3) * 4);
  try {
    return new Uint8Array(Buffer.from(take, "base64"));
  } catch {
    return null;
  }
}
function decodeHexPrefix(run, bytes = 96) {
  const clean = run.replace(/[^0-9a-fA-F]/g, "").slice(0, bytes * 2);
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}
// Short / weak magics (2-3 bytes, or byte patterns common in random data) are not
// trusted on decoded text runs; only multi-byte signatures count there.
const WEAK_FORMATS = new Set(["mpeg-audio", "ico", "mpeg-ts", "jxl", "bmp"]);
function decodedIsBinaryMedia(u8) {
  if (!u8 || u8.length < 4) return null;
  const m = sniffMagic(u8);
  if (m && m.kind !== "ole" && !WEAK_FORMATS.has(m.format)) return m;
  const e = findEmbeddedMedia(u8);
  return e || null;
}

/** Screen one piece of text for media. Returns a reason code or null. */
export function textMediaReason(text) {
  const s = String(text || "");
  if (!s) return null;
  const folded = s.normalize("NFKC");
  if (DATA_URI.test(folded) || DATA_URI_ANY_B64.test(folded)) return MEDIA_REASONS.DATA_URI;
  if (MEDIA_TAGS.test(folded) || ENTITY_TAG.test(folded)) return MEDIA_REASONS.MARKUP;
  if (/<\s*style\b|style\s*=/i.test(folded) && CSS_MEDIA.test(folded)) return MEDIA_REASONS.MARKUP;
  if (MD_IMAGE.test(folded)) return MEDIA_REASONS.MARKUP;
  // base64 runs (also wrapped at 76 chars) and url-safe base64
  const b64 = /(?:[A-Za-z0-9+/_-]{4}(?:\r?\n)?){10,}[A-Za-z0-9+/_=-]{0,4}/g;
  let m;
  let n = 0;
  while ((m = b64.exec(folded)) && n++ < 2000) {
    const hit = decodedIsBinaryMedia(decodeBase64Prefix(m[0]));
    if (hit) return MEDIA_REASONS.ENCODED;
    // Every 4-char alignment, so a run that starts mid-quad still decodes.
    for (let shift = 1; shift < 4; shift++) {
      const h2 = decodedIsBinaryMedia(decodeBase64Prefix(m[0].slice(shift)));
      if (h2) return MEDIA_REASONS.ENCODED;
    }
  }
  const hex = /(?:(?:0x|\\x)?[0-9a-fA-F]{2}[\s,:]?){24,}/g;
  n = 0;
  while ((m = hex.exec(folded)) && n++ < 2000) {
    const hit = decodedIsBinaryMedia(decodeHexPrefix(m[0].replace(/0x|\\x/g, "")));
    if (hit) return MEDIA_REASONS.ENCODED;
  }
  // percent-encoded magic, e.g. %89PNG
  if (/%89%50%4e%47|%ff%d8%ff|%1a%45%df%a3|ftyp(?:isom|mp4|qt)%/i.test(folded)) return MEDIA_REASONS.ENCODED;
  return null;
}

// ---------- PDF ----------
const PDF_MEDIA = /\/Subtype\s*\/Image\b|\/(?:DCTDecode|JPXDecode|JBIG2Decode|CCITTFaxDecode|DCT|CCF)\b|\/(?:RichMedia|Movie|Sound|Screen|3D|EmbeddedFile|EmbeddedFiles|FileAttachment)\b|\/Type\s*\/XObject[\s\S]{0,200}\/Subtype\s*\/Image/;
const PDF_INLINE_IMAGE = /(?:^|[\s\]>)])BI\s+[\s\S]{0,4000}?\sID[\s\r\n]/m;

function pdfStreams(u8) {
  const s = latin1(u8);
  const out = [];
  const re = /<<([\s\S]{0,4000}?)>>\s*stream\r?\n/g;
  let m;
  while ((m = re.exec(s))) {
    const dict = m[1];
    const start = re.lastIndex;
    const end = s.indexOf("endstream", start);
    if (end < 0) { out.push({ dict, bytes: null }); break; }
    out.push({ dict, bytes: u8.subarray(start, end) });
    re.lastIndex = end + 9;
    if (out.length > 5000) break;
  }
  return { text: s, streams: out };
}

/** PDF: refuse any image, inline image, embedded file or rich media; refuse what we cannot read. */
export function pdfMediaReason(input, { maxInflate = 32 * 1024 * 1024 } = {}) {
  const u8 = u8of(input);
  // Media appended after %%EOF or hidden between objects (polyglot) refuses too.
  if (findEmbeddedMedia(u8)) return MEDIA_REASONS.POLYGLOT;
  const { text, streams } = pdfStreams(u8);
  if (/\/Encrypt\b/.test(text)) return MEDIA_REASONS.UNREADABLE_DOC;
  if (PDF_MEDIA.test(text)) return MEDIA_REASONS.EMBEDDED;
  let total = 0;
  for (const st of streams) {
    if (!st.bytes) return MEDIA_REASONS.UNREADABLE_DOC;
    const filters = (st.dict.match(/\/Filter\s*(\[[^\]]*\]|\/\w+)/) || [])[1] || "";
    const names = filters.match(/\/\w+/g) || [];
    let data = st.bytes;
    if (names.length) {
      if (names.some((n) => n !== "/FlateDecode" && n !== "/Fl")) return MEDIA_REASONS.UNREADABLE_DOC;
      try {
        for (let i = 0; i < names.length; i++) {
          let raw = data;
          // trim trailing EOL before endstream
          while (raw.length && (raw[raw.length - 1] === 0x0a || raw[raw.length - 1] === 0x0d)) raw = raw.subarray(0, raw.length - 1);
          const out = inflateSync(raw, { maxOutputLength: maxInflate });
          data = out instanceof Uint8Array ? out : new Uint8Array(out);
        }
      } catch {
        return MEDIA_REASONS.UNREADABLE_DOC;
      }
    }
    total += data.length;
    if (total > maxInflate) return MEDIA_REASONS.UNREADABLE_DOC;
    const body = latin1(data);
    if (PDF_MEDIA.test(body) || PDF_INLINE_IMAGE.test(body)) return MEDIA_REASONS.EMBEDDED;
    const hit = sniffMagic(data);
    if (hit && (hit.kind === "image" || hit.kind === "video" || hit.kind === "audio")) return MEDIA_REASONS.EMBEDDED;
    if (findEmbeddedMedia(data)) return MEDIA_REASONS.EMBEDDED;
  }
  return null;
}

// ---------- ZIP-based documents ----------
const OFFICE_MEDIA_PART = /(^|\/)(media|Pictures|embeddings|ObjectReplacements|Thumbnails|images?)\//i;

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
  const read = readZipFiles(u8, names);
  if (!read.ok) return MEDIA_REASONS.UNREADABLE_DOC;
  for (const [name, bytes] of Object.entries(read.files)) {
    const m = sniffMagic(bytes);
    if (m && m.kind !== "ole") {
      if (m.kind === "zip" || m.kind === "archive" || m.kind === "pdf") return MEDIA_REASONS.EMBEDDED;
      return MEDIA_REASONS.EMBEDDED;
    }
    if (findEmbeddedMedia(bytes)) return MEDIA_REASONS.EMBEDDED;
    if (/\.(xml|rels|html?|xhtml|svg|css|opf|ncx|txt)$/i.test(name)) {
      const t = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      if (/<\s*(?:svg|img|image|video|audio|object|embed)\b|<(?:a:)?blip\b|<v:imagedata\b|<pic:pic\b|<draw:image\b|r:embed\s*=/.test(t)) return MEDIA_REASONS.EMBEDDED;
      const tr = textMediaReason(t);
      if (tr) return MEDIA_REASONS.EMBEDDED;
    }
  }
  return null;
}

/** Recursive archive scan (used for operator packages, which are zips by design). */
export function archiveMediaReason(input, { depth = 0, maxDepth = 2 } = {}) {
  const u8 = u8of(input);
  const head = sniffMagic(u8);
  if (!head) {
    if (findEmbeddedMedia(u8)) return MEDIA_REASONS.POLYGLOT;
    const t = new TextDecoder("utf-8", { fatal: false }).decode(u8.subarray(0, 8 * 1024 * 1024));
    if (/<svg[\s>]/i.test(t)) return MEDIA_REASONS.SVG;
    return textMediaReason(t);
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
      const t = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 2 * 1024 * 1024));
      if (textMediaReason(t)) return MEDIA_REASONS.EMBEDDED;
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
  // Treat the rest as text; SVG is an image even when it arrives as text/xml.
  const t = new TextDecoder("utf-8", { fatal: false }).decode(u8.subarray(0, 8 * 1024 * 1024));
  if (/<svg[\s>]/i.test(t) || /\.svgz?$/i.test(fname) || ct === "image/svg+xml") return MEDIA_REASONS.SVG;
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

export { MEDIA_EXT, ARCHIVE_EXT, OFFICE_EXT, inflateRawSync };
