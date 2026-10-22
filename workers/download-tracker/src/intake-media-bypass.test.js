/**
 * CORPUS-INTAKE-SAFETY-1.0 (b) — AZBot review #185: media-floor bypasses.
 * Inputs are benign synthetic files in fixtures/media-bypass (2x2 white images or
 * header stubs) plus bytes built here. No real imagery.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { deflateSync } from "node:zlib";
import { fileMediaReason, textMediaReason, decodeTextBytes, findEmbeddedMedia, MEDIA_REASONS } from "./intake-media.js";
import { screenIntake, isIntakeRefusal } from "./intake-gate.js";
import { addPeerReview } from "./review-store.js";
import { readZipFiles, listZipEntries } from "./zip.js";
import { intakeStubEnv, contentWritten } from "./fixtures/intake-env.js";
import * as M from "./fixtures/synthetic-media.js";

const DIR = new URL("./fixtures/media-bypass/", import.meta.url);
const load = (n) => new Uint8Array(fs.readFileSync(new URL(n, DIR)));
const text = (n) => Buffer.from(load(n)).toString("utf8");
const asTxt = (bytes) => fileMediaReason({ name: "notes.txt", type: "text/plain", bytes });
const own = (name) => fileMediaReason({ name, type: "", bytes: load(name) });
const enc = new TextEncoder();
const cat = (...parts) => {
  const arr = parts.map((p) => (typeof p === "string" ? enc.encode(p) : p));
  const out = new Uint8Array(arr.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arr) { out.set(a, o); o += a.length; }
  return out;
};
const PNG = load("png.bin");
const TIF = load("tif.bin");
const guest = { user_id: "u-synthetic", username: "synthetic-guest", role: "user" };

function rezip(base, extra = {}) {
  const listed = listZipEntries(base);
  const names = listed.entries.filter((e) => !e.directory).map((e) => e.name);
  const read = readZipFiles(base, names);
  assert.ok(read.ok);
  return M.zip({ ...read.files, ...extra });
}

// ---------- PDF ----------

test("#185 PDF: /Im#61ge name escapes and %-comments between tokens are refused (raw and Flate)", () => {
  for (const f of ["pdf_raw_plain.pdf", "pdf_raw_hexname.pdf", "pdf_raw_comment.pdf", "pdf_flate_hexname.pdf"]) {
    assert.equal(own(f), MEDIA_REASONS.EMBEDDED, f);
    assert.notEqual(asTxt(load(f)), null, f + " renamed .txt");
  }
});

test("#185 PDF: hex-escaped filter names and CR-only stream keywords are still parsed", () => {
  const body = deflateSync(Buffer.from("q /Im0 Do Q 0 0 1 rg /Type /XObject /Subtype /Im#61ge"));
  const a = cat("%PDF-1.7\n1 0 obj\n<< /Filter /Fl#61teDecode /Length ", String(body.length), " >>\nstream\r", body, "\nendstream\nendobj\ntrailer\n<< >>\n%%EOF\n");
  assert.equal(fileMediaReason({ name: "a.pdf", bytes: a }), MEDIA_REASONS.EMBEDDED);
});

test("#185 PDF: a stream keyword we could not parse refuses (fail closed)", () => {
  const orphan = cat("%PDF-1.7\n1 0 obj\n<< /Length 5 ", "x".repeat(9000), " >>\nstream\nhello\nendstream\nendobj\n%%EOF\n");
  assert.equal(fileMediaReason({ name: "a.pdf", bytes: orphan }), MEDIA_REASONS.UNREADABLE_DOC);
});

test("#185 PDF: a text-only PDF still passes", () => {
  const body = deflateSync(Buffer.from("BT /F1 12 Tf 72 712 Td (Plain words, 100% text) Tj ET"));
  const ok = cat("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Filter /FlateDecode /Length ", String(body.length), " >>\nstream\n", body, "\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
  assert.equal(fileMediaReason({ name: "a.pdf", bytes: ok }), null);
});

// ReportLab writes content streams as [/ASCII85Decode /FlateDecode]; these lossless
// text filters are decoded and checked, never skipped.
function a85(u8) {
  let out = "";
  for (let i = 0; i < u8.length; i += 4) {
    const chunk = [u8[i], u8[i + 1] ?? 0, u8[i + 2] ?? 0, u8[i + 3] ?? 0];
    const n = Math.min(4, u8.length - i);
    let v = ((chunk[0] << 24) >>> 0) + (chunk[1] << 16) + (chunk[2] << 8) + chunk[3];
    if (v === 0 && n === 4) { out += "z"; continue; }
    const d = [];
    for (let j = 0; j < 5; j++) { d.unshift(String.fromCharCode((v % 85) + 33)); v = Math.floor(v / 85); }
    out += d.join("").slice(0, n + 1);
  }
  return out + "~>";
}
const pdfWith = (filter, body) => cat("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Filter ", filter, " /Length ", String(body.length), " >>\nstream\n", body, "\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");

test("#185 PDF: ReportLab-style [/ASCII85Decode /FlateDecode] text passes; the same filters around an image refuse", () => {
  const txt = a85(new Uint8Array(deflateSync(Buffer.from("BT /F1 12 Tf 72 712 Td (Plain words) Tj ET"))));
  assert.equal(fileMediaReason({ name: "a.pdf", bytes: pdfWith("[ /ASCII85Decode /FlateDecode ]", txt) }), null);
  const hidden = a85(new Uint8Array(deflateSync(cat("q ", PNG, " Q"))));
  assert.equal(fileMediaReason({ name: "a.pdf", bytes: pdfWith("[ /ASCII85Decode /FlateDecode ]", hidden) }), MEDIA_REASONS.EMBEDDED);
  assert.equal(fileMediaReason({ name: "a.pdf", bytes: pdfWith("/AHx", Buffer.from(cat("q ", TIF, " Q")).toString("hex") + ">") }), MEDIA_REASONS.EMBEDDED);
  assert.equal(fileMediaReason({ name: "a.pdf", bytes: pdfWith("/ASCII85Decode", "not{valid|a85~>") }), MEDIA_REASONS.UNREADABLE_DOC);
  assert.equal(fileMediaReason({ name: "a.pdf", bytes: pdfWith("/LZWDecode", "anything") }), MEDIA_REASONS.UNREADABLE_DOC);
});

// ---------- magic at any offset ----------

test("#185 magic anywhere: TIFF, BMP, ICO and JPEG (DHT-first and other variants) after a text prefix are refused", () => {
  for (const k of ["tif", "bmp", "ico", "jpg", "jpg_dht", "png", "gif", "webp"]) {
    const r = asTxt(load(`txt_prefix_${k}.txt`));
    assert.ok(r === MEDIA_REASONS.POLYGLOT || r === MEDIA_REASONS.UNDECODABLE, k + " -> " + r);
  }
  for (const k of ["tif", "bmp", "jpg_dht"]) assert.equal(findEmbeddedMedia(cat("xyz", load(k + ".bin"))).format, { tif: "tiff", bmp: "bmp", jpg_dht: "jpeg" }[k]);
  // every FFD8FF variant: SOF0, DQT, DHT, APP2, COM
  for (const m of [0xc0, 0xdb, 0xc4, 0xe2, 0xfe]) {
    const j = cat("lead", new Uint8Array([0xff, 0xd8, 0xff, m, 0x00, 0x04, 0x00, 0x00, 0xff, 0xda, 0x00, 0x02]));
    assert.equal(findEmbeddedMedia(j)?.format, "jpeg", "marker " + m.toString(16));
  }
  // an ICO with a real directory entry and DIB data inside binary
  const ico = new Uint8Array(6 + 16 + 40);
  ico.set([0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 32, 0, 48, 0, 0, 0, 22, 0, 0, 0, 40, 0, 0, 0]);
  assert.equal(findEmbeddedMedia(cat(new Uint8Array([7, 7, 7]), ico))?.format, "ico");
});

test("#185 magic anywhere: chance short magics in clean binary (font tables, deflate) do not refuse", () => {
  const fontish = new Uint8Array([0, 0, 1, 0, 0x0f, 0, 0x56, 0, 1, 0, 0, 0, 0, 0, 2, 0, 7, 0, 0x65, 0, 1, 0, 0, 0]);
  assert.equal(findEmbeddedMedia(fontish), null);
  const bm = cat("BM is a monogram", new Uint8Array(40));
  assert.equal(findEmbeddedMedia(bm), null);
  assert.equal(findEmbeddedMedia(new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x11])), null);
});

// ---------- encodings ----------

test("#185 encodings: base64 behind padding, with spaces, of zlib PNG; hex behind padding; Ascii85 — all refused", () => {
  for (const f of ["b64_plain.txt", "b64_padded.txt", "b64_spaced.txt", "b64_zlib.txt", "b64_jpgdht.txt", "b64_tif.txt", "hex_padded.txt", "a85.txt"]) {
    assert.equal(textMediaReason(text(f)), MEDIA_REASONS.ENCODED, f + " as body");
    assert.equal(asTxt(load(f)), MEDIA_REASONS.ENCODED, f + " as file");
  }
  const b = Buffer.from(PNG).toString("base64");
  assert.equal(textMediaReason("x " + b.split("").join("\n")), MEDIA_REASONS.ENCODED, "one char per line");
  assert.equal(textMediaReason("x " + "A".repeat(4001) + b), MEDIA_REASONS.ENCODED, "misaligned padding");
  assert.equal(textMediaReason("x " + Buffer.from(PNG).toString("hex").match(/../g).map((h) => "0x" + h).join(", ")), MEDIA_REASONS.ENCODED, "0x, separated hex");
  assert.equal(textMediaReason("x " + Buffer.from(deflateSync(TIF)).toString("hex")), MEDIA_REASONS.ENCODED, "hex of zlib TIFF");
});

test("#185 encodings: a delimited Ascii85 block that does not decode is refused (cannot be checked)", () => {
  assert.equal(textMediaReason("notes <~" + "87cURD]i,\"Ebo80".repeat(4) + "{~>"), MEDIA_REASONS.ENCODED);
});

test("#185 encodings: prose, code operators and hashes still pass", () => {
  assert.equal(textMediaReason("The survey notes list depths at each marker along the river bend. ".repeat(500)), null);
  assert.equal(textMediaReason("ops = ['~>>', '<~>', '|~>', '<|>'] and x <~ y ~> z"), null);
  assert.equal(textMediaReason("sha256 " + "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"), null);
});

// ---------- text decoding ----------

test("#185 UTF-16: SVG with script, data: URI and base64 in UTF-16 (BOM or none) is refused", () => {
  for (const f of ["svg_plain.txt", "svg_u16le_nobom.txt", "svg_u16be_bom.txt"]) assert.equal(asTxt(load(f)), MEDIA_REASONS.SVG, f);
  assert.equal(asTxt(load("b64_u16le_nobom.txt")), MEDIA_REASONS.ENCODED);
  assert.equal(textMediaReason(text("b64_u16le_nobom.txt")), MEDIA_REASONS.ENCODED, "NUL-interleaved string body");
});

test("#185 undecodable: bytes that are not confidently text are refused; UTF-16/latin1 text passes", () => {
  assert.equal(asTxt(new Uint8Array([0x10, 0x02, 0x03, 0x41, 0x42, 0x00, 0x7f, 0x05])), MEDIA_REASONS.UNDECODABLE);
  assert.equal(asTxt(cat("plain words\n", new Uint8Array([0, 0, 1, 0, 1, 0]))), MEDIA_REASONS.UNDECODABLE);
  const u16 = Buffer.from("\ufeffplain notes in UTF-16", "utf16le");
  assert.equal(asTxt(new Uint8Array(u16)), null);
  assert.equal(decodeTextBytes(new Uint8Array(u16)).text, "plain notes in UTF-16");
  assert.equal(asTxt(new Uint8Array(Buffer.from("caf\xe9 cr\xe8me", "latin1"))), null);
  assert.equal(decodeTextBytes(new Uint8Array([0xff, 0xfe, 0x41])).ok, true, "odd trailing byte is dropped, not misread");
  assert.equal(decodeTextBytes(new Uint8Array([0xff, 0xfe, 0x00, 0xd8, 0x41, 0x00])).ok, false, "lone surrogate fails closed");
});

// ---------- DOCX ----------

test("#185 DOCX: image appended after the zip, base64 in customXml, PNG in a .dat part — refused", () => {
  for (const f of ["docx2_append_png.docx", "docx2_append_tif.docx"]) assert.equal(own(f), MEDIA_REASONS.POLYGLOT, f);
  for (const f of ["docx2_b64_custom.docx", "docx2_b64_plain_custom.docx", "docx2_png_in_dat.docx", "pic.docx"]) assert.equal(own(f), MEDIA_REASONS.EMBEDDED, f);
});

test("#185 DOCX: TIFF mid-part, trailing text, UTF-16 part, unknown binary part, gap between entries — refused", () => {
  const base = load("nclean2.docx");
  assert.equal(fileMediaReason({ name: "a.docx", bytes: rezip(base, { "customXml/item9.xml": cat("<x>notes ", TIF, " more</x>") }) }), MEDIA_REASONS.EMBEDDED, "TIFF mid-part");
  assert.equal(fileMediaReason({ name: "a.docx", bytes: cat(base, "trailing plain words") }), MEDIA_REASONS.POLYGLOT, "bytes after end record");
  const u16 = new Uint8Array(Buffer.from('<x><img src="data:image/png;base64,' + Buffer.from(PNG).toString("base64") + '"/></x>', "utf16le"));
  assert.equal(fileMediaReason({ name: "a.docx", bytes: rezip(base, { "customXml/item9.xml": u16 }) }), MEDIA_REASONS.EMBEDDED, "UTF-16 part");
  assert.equal(fileMediaReason({ name: "a.docx", bytes: rezip(base, { "customXml/item9.dat": new Uint8Array([1, 2, 3, 0, 250, 251, 7, 8]) }) }), MEDIA_REASONS.EMBEDDED, "unknown binary part");
  // a gap: insert junk between the last local entry and the central directory
  const z = rezip(base);
  const eocd = z.length - 22;
  const cdOff = new DataView(z.buffer, z.byteOffset).getUint32(eocd + 16, true);
  const junk = enc.encode("hidden bytes here");
  const gap = cat(z.subarray(0, cdOff), junk, z.subarray(cdOff));
  new DataView(gap.buffer).setUint32(gap.length - 22 + 16, cdOff + junk.length, true);
  assert.equal(fileMediaReason({ name: "a.docx", bytes: gap }), MEDIA_REASONS.POLYGLOT, "gap before central directory");
});

test("#185 DOCX: plain Word-style documents still pass (controls)", () => {
  assert.equal(own("clean2.docx"), null);
  assert.equal(own("nclean2.docx"), null);
  assert.equal(fileMediaReason({ name: "a.docx", bytes: rezip(load("nclean2.docx")) }), null);
});

// ---------- doors ----------

test("#185 door: every harness bypass is refused at screenIntake with nothing stored", async () => {
  const files = fs.readdirSync(DIR).filter((f) => !/^(n?clean2\.docx|README\.md)$/.test(f));
  let i = 0;
  for (const f of files) {
    const env = intakeStubEnv();
    const bytes = load(f);
    await assert.rejects(
      () => screenIntake(env, { door: "upload", title: "t", signed: { user_id: "u" + i }, ip: "198.51.100." + (++i % 250), file: new File([bytes], "notes.txt", { type: "text/plain" }) }),
      (err) => isIntakeRefusal(err),
      f
    );
    assert.equal(contentWritten(env), false, f);
  }
  for (const f of ["clean2.docx", "nclean2.docx"]) {
    const env = intakeStubEnv();
    await screenIntake(env, { door: "upload", title: "t", file: new File([load(f)], f, { type: "" }) });
  }
});

test("#185 door: a peer review carrying a data: image URI is refused before any row or ledger write", async () => {
  const env = intakeStubEnv();
  await assert.rejects(
    () => addPeerReview(env, { recordId: "AZDOC-TEST-1", stance: "note", body: "see ![x](data:image/png;base64," + Buffer.from(PNG).toString("base64") + ")", signed: guest, intake: { door: "peer-review", ip: "203.0.113.9" } }),
    (err) => isIntakeRefusal(err) && err.status === 415
  );
  assert.ok(env.writes.sql.every((s) => /intake_refusals/.test(s)), "only the refusal receipt");
});
