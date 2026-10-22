/**
 * Synthetic media for CORPUS-INTAKE-SAFETY-1.0 tests. Every buffer here is a few
 * generated header bytes (magic + minimal structure) and synthetic marker text.
 * None of it is a real picture, video or recording, and none ever will be.
 */
import { deflateSync, deflateRawSync, gzipSync, crc32 } from "node:zlib";

const enc = new TextEncoder();
export const MARK = "__AZ_SYNTHETIC_MEDIA_MARKER__";
const cat = (...parts) => {
  const arrs = parts.map((p) => (typeof p === "string" ? enc.encode(p) : p instanceof Uint8Array ? p : Uint8Array.from(p)));
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
};
export { cat };

export const png = () => cat([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], [0, 0, 0, 13], "IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], "IEND", [0xae, 0x42, 0x60, 0x82], MARK);
export const jpeg = () => cat([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], "JFIF", [0, 1, 1, 0, 0, 1, 0, 1, 0, 0], MARK, [0xff, 0xd9]);
export const jpegExif = () => cat([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10], "Exif", [0, 0], "MM", [0, 0x2a], MARK, [0xff, 0xd9]);
export const gif = () => cat("GIF89a", [1, 0, 1, 0, 0x80, 0, 0], MARK, ";");
export const webp = () => cat("RIFF", [0x20, 0, 0, 0], "WEBPVP8 ", [0x10, 0, 0, 0], MARK);
export const bmp = () => cat("BM", [0x3a, 0, 0, 0, 0, 0, 0, 0, 0x36, 0, 0, 0, 0x28, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], MARK);
export const tiff = () => cat([0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0], MARK);
export const heic = () => cat([0, 0, 0, 0x18], "ftypheic", [0, 0, 0, 0], "mif1heic", MARK);
export const mp4 = () => cat([0, 0, 0, 0x18], "ftypisom", [0, 0, 2, 0], "isomiso2", [0, 0, 0, 8], "free", MARK);
export const mov = () => cat([0, 0, 0, 0x14], "ftypqt  ", [0, 0, 2, 0], "qt  ", MARK);
export const webm = () => cat([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01], "webm", MARK);
export const avi = () => cat("RIFF", [0x20, 0, 0, 0], "AVI LIST", MARK);
export const ogg = () => cat("OggS", [0, 2, 0, 0, 0, 0, 0, 0, 0, 0], MARK);
export const wav = () => cat("RIFF", [0x24, 0, 0, 0], "WAVEfmt ", MARK);
export const mp3 = () => cat("ID3", [3, 0, 0, 0, 0, 0, 0], MARK);
export const svgText = () => '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/><!--' + MARK + '--></svg>';

/** Minimal store/deflate zip writer for tests. */
export function zip(entries, { deflate = true } = {}) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, data0] of Object.entries(entries)) {
    const data = typeof data0 === "string" ? enc.encode(data0) : data0;
    const nameB = enc.encode(name);
    const comp = deflate ? new Uint8Array(deflateRawSync(data)) : data;
    const method = deflate ? 8 : 0;
    const crc = crc32(data) >>> 0;
    const lh = new Uint8Array(30);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(8, method, true);
    lv.setUint32(14, crc, true); lv.setUint32(18, comp.length, true); lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameB.length, true);
    const local = cat(lh, nameB, comp);
    const ch = new Uint8Array(46);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(10, method, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, comp.length, true); cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameB.length, true); cv.setUint32(42, offset, true);
    centrals.push(cat(ch, nameB));
    locals.push(local);
    offset += local.length;
  }
  const cd = cat(...centrals);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, centrals.length, true); ev.setUint16(10, centrals.length, true);
  ev.setUint32(12, cd.length, true); ev.setUint32(16, offset, true);
  return cat(...locals, cd, end);
}

/** Minimal ustar archive. */
export function tar(entries) {
  const blocks = [];
  for (const [name, data0] of Object.entries(entries)) {
    const data = typeof data0 === "string" ? enc.encode(data0) : data0;
    const h = new Uint8Array(512);
    h.set(enc.encode(name).subarray(0, 100), 0);
    h.set(enc.encode("0000644\0"), 100);
    h.set(enc.encode(data.length.toString(8).padStart(11, "0") + "\0"), 124);
    h.set(enc.encode("        "), 148);
    h[156] = 0x30;
    h.set(enc.encode("ustar\0"), 257);
    h.set(enc.encode("00"), 263);
    let sum = 0;
    for (const b of h) sum += b;
    h.set(enc.encode(sum.toString(8).padStart(6, "0") + "\0 "), 148);
    blocks.push(h, data, new Uint8Array((512 - (data.length % 512)) % 512));
  }
  blocks.push(new Uint8Array(1024));
  return cat(...blocks);
}
export const gz = (u8) => new Uint8Array(gzipSync(u8));

/** Tiny PDFs: text-only, image XObject, compressed object stream with an image, inline image. */
function pdf(objects) {
  let body = "%PDF-1.7\n%\xe2\xe3\xcf\xd3\n";
  const parts = [enc.encode(body)];
  objects.forEach((o, i) => {
    if (o.stream) {
      parts.push(enc.encode(`${i + 1} 0 obj\n<< ${o.dict} /Length ${o.stream.length} >>\nstream\n`), o.stream, enc.encode("\nendstream\nendobj\n"));
    } else parts.push(enc.encode(`${i + 1} 0 obj\n${o.text}\nendobj\n`));
  });
  parts.push(enc.encode("trailer\n<< /Root 1 0 R >>\n%%EOF\n"));
  return cat(...parts);
}
const flate = (s) => new Uint8Array(deflateSync(typeof s === "string" ? enc.encode(s) : s));
export const pdfText = () => pdf([
  { text: "<< /Type /Catalog /Pages 2 0 R >>" },
  { text: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
  { text: "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>" },
  { dict: "/Filter /FlateDecode", stream: flate("BT /F1 12 Tf 72 712 Td (Synthetic text " + MARK + ") Tj ET") },
]);
export const pdfImageXObject = () => pdf([
  { text: "<< /Type /Catalog /Pages 2 0 R >>" },
  { text: "<< /Type /Pages /Kids [] /Count 0 >>" },
  { dict: "/Type /XObject /Subtype /Image /Width 1 /Height 1 /BitsPerComponent 8 /ColorSpace /DeviceGray", stream: Uint8Array.from([0]) },
]);
export const pdfDct = () => pdf([
  { text: "<< /Type /Catalog >>" },
  { dict: "/Filter /DCTDecode", stream: jpeg() },
]);
export const pdfObjStmImage = () => pdf([
  { text: "<< /Type /Catalog >>" },
  { dict: "/Type /ObjStm /N 1 /First 4 /Filter /FlateDecode", stream: flate("5 0 << /Type /XObject /Subtype /Image /Width 1 /Height 1 >>") },
]);
export const pdfInlineImage = () => pdf([
  { text: "<< /Type /Catalog >>" },
  { dict: "/Filter /FlateDecode", stream: flate("q 1 0 0 1 0 0 cm\nBI /W 1 /H 1 /CS /G /BPC 8\nID \x00\nEI Q") },
]);
export const pdfEmbeddedFile = () => pdf([
  { text: "<< /Type /Catalog /Names << /EmbeddedFiles 2 0 R >> >>" },
  { dict: "/Type /EmbeddedFile", stream: mp4() },
]);
export const pdfBrokenStream = () => pdf([
  { text: "<< /Type /Catalog >>" },
  { dict: "/Filter /FlateDecode", stream: enc.encode("not deflate " + MARK) },
]);

export const docx = (withImage) => zip({
  "[Content_Types].xml": '<?xml version="1.0"?><Types/>',
  "word/document.xml": '<?xml version="1.0"?><w:document><w:body><w:p><w:r><w:t>Synthetic doc</w:t></w:r></w:p></w:body></w:document>',
  ...(withImage ? { "word/media/image1.png": png() } : {}),
});
export const docxRenamedMedia = () => zip({
  "[Content_Types].xml": "<Types/>",
  "word/document.xml": "<w:document/>",
  "word/notes.dat": jpeg(),
});

export const b64 = (u8, wrap = 0) => {
  const s = Buffer.from(u8).toString("base64");
  return wrap ? s.match(new RegExp(".{1," + wrap + "}", "g")).join("\n") : s;
};
export const hex = (u8) => Buffer.from(u8).toString("hex");

// ---- text-carrier builders for CORPUS-INTAKE-SAFETY (c) ----
export const TEXT_MARK = "__AZ_SYNTHETIC_TEXT_MARKER__";
const pdfEsc = (s) => String(s).replace(/[\\()]/g, (c) => "\\" + c);
export const pdfWithText = (s) => pdf([
  { text: "<< /Type /Catalog /Pages 2 0 R >>" },
  { text: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
  { text: "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>" },
  { dict: "/Filter /FlateDecode", stream: flate("BT /F1 12 Tf 72 712 Td (" + pdfEsc(s) + ") Tj ET") },
]);
/**
 * A text-only paper: page text plus an embedded font program. Pass benign bytes in
 * 0x80-0xFE (no ASCII, so no PDF name or media signature can occur by chance).
 */
export const pdfPaper = (text, fontBytes) => pdf([
  { text: "<< /Type /Catalog /Pages 2 0 R >>" },
  { text: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
  { text: "<< /Type /Page /Parent 2 0 R /Contents 4 0 R /Resources << /Font << /F1 6 0 R >> >> >>" },
  { dict: "/Filter /FlateDecode", stream: flate("BT /F1 12 Tf 72 712 Td (" + pdfEsc(text) + ") Tj ET") },
  { dict: "/Length1 " + fontBytes.length, stream: fontBytes },
  { text: "<< /Type /Font /Subtype /TrueType /BaseFont /Synthetic /FontDescriptor 7 0 R >>" },
  { text: "<< /Type /FontDescriptor /FontName /Synthetic /FontFile2 5 0 R >>" },
]);
export const docxWithXml = (bodyXml) => zip({
  "[Content_Types].xml": '<?xml version="1.0"?><Types/>',
  "word/document.xml": '<?xml version="1.0"?><w:document><w:body>' + bodyXml + "</w:body></w:document>",
});
