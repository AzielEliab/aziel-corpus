/**
 * CORPUS-INTAKE-SAFETY-1.0 (b) — media hard floor. Bypass matrix at every door.
 * All media here is synthetic header bytes from fixtures/synthetic-media.js.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { fileMediaReason, textMediaReason, sniffMagic, MEDIA_REASONS } from "./intake-media.js";
import { screenIntake } from "./intake-gate.js";
import { ingestRecord, operatorSession } from "./library.js";
import { jeevesUpload } from "./jeeves.js";
import { operatorLibraryIngest } from "./operator-ingest.js";
import { handleLibraryIngestApi } from "./library-mcp.js";
import { handleHosted } from "./hosted.js";
import { recordSpectralOverlayArtifact } from "./ocr.js";
import { intakeStubEnv, contentWritten, writesContain } from "./fixtures/intake-env.js";
import * as M from "./fixtures/synthetic-media.js";

const HOST = "https://www.azielcorpuslibrary.net";
const GUEST = { user_id: "u-synthetic", username: "synthetic-guest", role: "user" };
const OPERATOR = operatorSession();
const file = (bytes, name, type = "") => new File([bytes], name, { type });

const IMAGES = ["png", "jpeg", "jpegExif", "gif", "webp", "bmp", "tiff", "heic"];
const VIDEOS = ["mp4", "mov", "webm", "avi", "ogg"];
const AUDIO = ["wav", "mp3"];

function captureConsole() {
  const seen = [];
  const keep = {};
  for (const k of ["log", "info", "warn", "error", "debug"]) {
    keep[k] = console[k];
    console[k] = (...a) => seen.push(a.map(String).join(" "));
  }
  return { seen, restore() { Object.assign(console, keep); } };
}

function assertRefusedClean(env, err, { door, code } = {}) {
  assert.ok(err && err.intake_refused, "expected an intake refusal, got " + (err && err.message));
  if (code) assert.equal(err.code, code);
  if (door) assert.equal(err.receipt.door, door);
  assert.equal(contentWritten(env), false, "refused media must not be stored or chained");
  assert.equal(writesContain(env, M.MARK), false, "no synthetic bytes in any write");
  assert.ok(!JSON.stringify(err.receipt).includes(M.MARK));
  assert.ok(!String(err.message).includes(M.MARK));
}

// ---------- detection ----------

test("magic bytes: every synthetic image/video/audio is refused even when named .txt as text/plain", () => {
  for (const k of IMAGES) assert.equal(fileMediaReason({ name: "notes.txt", type: "text/plain", bytes: M[k]() }), MEDIA_REASONS.IMAGE, k);
  for (const k of VIDEOS) assert.equal(fileMediaReason({ name: "notes.txt", type: "text/plain", bytes: M[k]() }), MEDIA_REASONS.VIDEO, k);
  for (const k of AUDIO) assert.equal(fileMediaReason({ name: "notes.md", type: "text/markdown", bytes: M[k]() }), MEDIA_REASONS.AUDIO, k);
  for (const k of [...IMAGES, ...VIDEOS]) assert.equal(fileMediaReason({ name: "paper.pdf", type: "application/pdf", bytes: M[k]() }) != null, true, k + " as .pdf");
});

test("declared MIME or media extension refuses even when the bytes are text", () => {
  const t = new TextEncoder().encode("plain words");
  assert.equal(fileMediaReason({ name: "a.txt", type: "image/png", bytes: t }), MEDIA_REASONS.DECLARED);
  assert.equal(fileMediaReason({ name: "a.txt", type: "video/mp4", bytes: t }), MEDIA_REASONS.DECLARED);
  assert.equal(fileMediaReason({ name: "clip.MP4", type: "", bytes: t }), MEDIA_REASONS.DECLARED);
  assert.equal(fileMediaReason({ name: "pic.jpeg", type: "application/octet-stream", bytes: t }), MEDIA_REASONS.DECLARED);
});

test("polyglots: media appended to text, HTML or a clean PDF is refused", () => {
  const txt = M.cat("Synthetic notes\n", M.png());
  assert.equal(fileMediaReason({ name: "a.txt", type: "text/plain", bytes: txt }), MEDIA_REASONS.POLYGLOT);
  const html = M.cat("<html><body>hi</body></html>", M.jpeg());
  assert.equal(fileMediaReason({ name: "a.html", type: "text/html", bytes: html }), MEDIA_REASONS.POLYGLOT);
  const pdf = M.cat(M.pdfText(), M.mp4());
  assert.equal(fileMediaReason({ name: "a.pdf", type: "application/pdf", bytes: pdf }), MEDIA_REASONS.POLYGLOT);
  const gifar = M.cat(M.gif(), "PK synthetic tail");
  assert.equal(fileMediaReason({ name: "a.txt", bytes: gifar }), MEDIA_REASONS.IMAGE);
});

test("archives: zip/tar/gz (and nested) containing media are refused; other archives refused outright", () => {
  const cases = {
    zip: M.zip({ "a.png": M.png() }),
    zipStore: M.zip({ "readme.txt": "x", "b.bin": M.mp4() }, { deflate: false }),
    tar: M.tar({ "frame.jpg": M.jpeg() }),
    tarRenamed: M.tar({ "notes.txt": M.webm() }),
    gz: M.gz(M.png()),
    tgz: M.gz(M.tar({ "a.gif": M.gif() })),
    zipInZip: M.zip({ "inner.zip": M.zip({ "a.png": M.png() }) }),
    sevenZ: M.cat([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0, 4], M.MARK),
    rar: M.cat("Rar!\x1a\x07\x01\x00", M.MARK),
  };
  for (const [k, bytes] of Object.entries(cases)) {
    assert.equal(fileMediaReason({ name: "upload.txt", type: "text/plain", bytes }), MEDIA_REASONS.ARCHIVE, k);
    assert.equal(fileMediaReason({ name: "upload.zip", type: "application/zip", bytes }), MEDIA_REASONS.ARCHIVE, k + " .zip");
  }
});

test("PDF: image XObject, DCT stream, image in compressed object stream, inline image, embedded file are refused; clean text PDF passes", () => {
  const f = (bytes) => fileMediaReason({ name: "p.pdf", type: "application/pdf", bytes });
  assert.equal(f(M.pdfText()), null);
  assert.equal(f(M.pdfImageXObject()), MEDIA_REASONS.EMBEDDED);
  assert.ok([MEDIA_REASONS.EMBEDDED, MEDIA_REASONS.POLYGLOT].includes(f(M.pdfDct())));
  assert.equal(f(M.pdfObjStmImage()), MEDIA_REASONS.EMBEDDED);
  assert.equal(f(M.pdfInlineImage()), MEDIA_REASONS.EMBEDDED);
  assert.ok([MEDIA_REASONS.EMBEDDED, MEDIA_REASONS.POLYGLOT].includes(f(M.pdfEmbeddedFile())));
  assert.equal(f(M.pdfBrokenStream()), MEDIA_REASONS.UNREADABLE_DOC, "a stream we cannot read refuses (fail closed)");
  // Same PDF, wrong name and MIME: still opened by magic.
  assert.equal(fileMediaReason({ name: "x.txt", type: "text/plain", bytes: M.pdfImageXObject() }), MEDIA_REASONS.EMBEDDED);
});

test("Office/ODF: embedded media refuses the whole document (no stripping); clean docx passes", () => {
  const f = (bytes, name = "d.docx") => fileMediaReason({ name, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes });
  assert.equal(f(M.docx(false)), null);
  assert.equal(f(M.docx(true)), MEDIA_REASONS.EMBEDDED);
  assert.equal(f(M.docxRenamedMedia()), MEDIA_REASONS.EMBEDDED, "media renamed to .dat inside the container");
  const blip = M.zip({ "word/document.xml": '<w:document><a:blip r:embed="rId5"/></w:document>' });
  assert.equal(f(blip), MEDIA_REASONS.EMBEDDED);
  const odt = M.zip({ "content.xml": "<office:document/>", "Pictures/1.png": M.png() });
  assert.equal(f(odt, "d.odt"), MEDIA_REASONS.EMBEDDED);
});

test("SVG is an image: refused as a file and inline in text", () => {
  const svg = new TextEncoder().encode(M.svgText());
  assert.equal(fileMediaReason({ name: "a.xml", type: "text/xml", bytes: svg }), MEDIA_REASONS.SVG);
  assert.equal(fileMediaReason({ name: "a.txt", type: "text/plain", bytes: svg }), MEDIA_REASONS.SVG);
  assert.equal(textMediaReason("intro <svg viewBox='0 0 1 1'><circle r='1'/></svg>"), MEDIA_REASONS.MARKUP);
});

test("text bypasses: data: URIs, base64 (raw / wrapped / url-safe / offset), hex, percent-encoding, HTML and CSS", () => {
  const p = M.png();
  const cases = {
    dataUri: "see data:image/png;base64," + M.b64(p),
    dataUriSpaced: "data: image/jpeg ; base64 ," + M.b64(M.jpeg()),
    dataUriOctet: "data:application/octet-stream;base64," + M.b64(M.mp4()),
    b64raw: "payload " + M.b64(p) + " end",
    b64wrapped: "payload\n" + M.b64(M.mp4(), 76) + "\nend",
    b64urlsafe: "x " + M.b64(M.jpeg()).replace(/\+/g, "-").replace(/\//g, "_"),
    b64offset: "x Q" + M.b64(M.webm()),
    hex: "bytes " + M.hex(p),
    hexEscaped: "bytes " + Array.from(M.jpeg().subarray(0, 40), (b) => "\\x" + b.toString(16).padStart(2, "0")).join(""),
    percent: "u=%89%50%4E%47%0D%0A",
    img: 'hello <img src="https://example.invalid/x.png">',
    imgUpper: "hello <IMG SRC=x>",
    video: "<video src=x></video>",
    picture: "<picture><source srcset=x></picture>",
    iframe: "<iframe src=x></iframe>",
    object: "<object data=x></object>",
    embed: "<embed src=x>",
    entity: "&lt;img src=x&gt;",
    css: '<div style="background-image:url(https://example.invalid/a)">t</div>',
    markdown: "text ![alt](https://example.invalid/a.png) more",
  };
  for (const [k, v] of Object.entries(cases)) assert.ok(textMediaReason(v), k + " should refuse");
});

test("plain text, hashes, base64 of text and math with '<' pass the media floor", () => {
  const ok = [
    "A plain paragraph about the history of printing and the GIF format.",
    "sha256 " + "ab".repeat(32) + " and " + "0f".repeat(32),
    "base64 of words: " + Buffer.from("just some synthetic plain words, nothing binary here at all, really").toString("base64"),
    "if a < image_count then b > 2",
    "AZDOC-1234 content_sha256=" + "c".repeat(64),
  ];
  for (const v of ok) assert.equal(textMediaReason(v), null, v.slice(0, 40));
  assert.equal(fileMediaReason({ name: "n.md", type: "text/markdown", bytes: new TextEncoder().encode(ok.join("\n")) }), null);
});

test("sniffMagic ignores extension and MIME entirely", () => {
  assert.equal(sniffMagic(M.png()).kind, "image");
  assert.equal(sniffMagic(M.mp4()).kind, "video");
  assert.equal(sniffMagic(new TextEncoder().encode("hello")), null);
});

// ---------- gate + doors ----------

test("screenIntake: operator gets no exemption from the media floor", async () => {
  const env = intakeStubEnv();
  let err;
  try { await screenIntake(env, { door: "upload", operator: true, signed: OPERATOR, title: "t", file: file(M.png(), "x.txt", "text/plain") }); } catch (e) { err = e; }
  assertRefusedClean(env, err, { door: "upload", code: MEDIA_REASONS.IMAGE });
  assert.equal(err.status, 415);
});

test("screenIntake: media hidden in title / metadata text is refused", async () => {
  const env = intakeStubEnv();
  let err;
  try { await screenIntake(env, { door: "ingest", signed: GUEST, title: "t", body: "ok", texts: ["kw", "data:image/png;base64," + M.b64(M.png())] }); } catch (e) { err = e; }
  assertRefusedClean(env, err, { code: MEDIA_REASONS.DATA_URI });
});

test("screenIntake: clean text PDF and clean docx pass", async () => {
  const env = intakeStubEnv();
  await screenIntake(env, { door: "upload", signed: GUEST, title: "t", file: file(M.pdfText(), "p.pdf", "application/pdf") });
  await screenIntake(env, { door: "upload", signed: GUEST, title: "t", file: file(M.docx(false), "d.docx") });
  assert.equal(env.writes.sql.some((q) => /intake_refusals/.test(q)), false, "no refusal receipt");
});

const DOORS = ["upload", "ingest", "aziel-library", "v1-ingest", "jeeves-upload", "operator-library-ingest", "transcribe", "ocr"];
for (const door of DOORS) {
  test("door " + door + ": ingestRecord refuses image, video, archive and PDF-with-image before any write", async () => {
    const payloads = [
      [M.png(), "a.txt", "text/plain"],
      [M.mp4(), "a.pdf", "application/pdf"],
      [M.zip({ "a.png": M.png() }), "a.docx", ""],
      [M.pdfInlineImage(), "a.pdf", "application/pdf"],
      [M.gz(M.tar({ "x.jpg": M.jpeg() })), "a.md", "text/markdown"],
    ];
    for (const [bytes, name, type] of payloads) {
      for (const signed of [GUEST, OPERATOR]) {
        const env = intakeStubEnv();
        let err;
        try { await ingestRecord(env, { signed, title: "Synthetic", body: "notes", file: file(bytes, name, type), intake: { door, ip: "203.0.113.9" } }); } catch (e) { err = e; }
        assertRefusedClean(env, err, { door });
        assert.ok(!JSON.stringify(err.receipt).includes("203.0.113.9"));
      }
    }
  });
}

test("jeevesUpload (AI-agent import) refuses media in file and in body", async () => {
  const env = intakeStubEnv();
  let err;
  try { await jeevesUpload(env, { signed: GUEST, title: "Synthetic", body: "x", file: file(M.webm(), "clip.txt", "text/plain"), intake: { door: "jeeves-upload" } }); } catch (e) { err = e; }
  assertRefusedClean(env, err, { door: "jeeves-upload", code: MEDIA_REASONS.VIDEO });
  const env2 = intakeStubEnv();
  let err2;
  try { await jeevesUpload(env2, { signed: GUEST, title: "Synthetic", body: '<img src="data:image/gif;base64,' + M.b64(M.gif()) + '">' }); } catch (e) { err2 = e; }
  assertRefusedClean(env2, err2);
});

test("operatorLibraryIngest refuses media for the operator too", async () => {
  const env = intakeStubEnv();
  let err;
  try { await operatorLibraryIngest(env, { signed: OPERATOR, request: new Request(HOST + "/v1/operator/library-ingest", { method: "POST" }), title: "Synthetic", file: file(M.heic(), "scan.pdf", "application/pdf") }); } catch (e) { err = e; }
  assertRefusedClean(env, err, { door: "operator-library-ingest", code: MEDIA_REASONS.IMAGE });
});

test("POST /v1/ingest (agent import door): JSON data URI and multipart image both refused with a receipt", async () => {
  const cap = captureConsole();
  try {
    const env = intakeStubEnv();
    const req = new Request(HOST + "/v1/ingest", { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": "203.0.113.7" }, body: JSON.stringify({ title: "Synthetic", markdown: "x ![a](data:image/png;base64," + M.b64(M.png()) + ")" }) });
    const res = await handleLibraryIngestApi(req, new URL(req.url), env, GUEST);
    const body = await res.json();
    assert.equal(res.status, 415);
    assert.equal(body.refused, true);
    assert.equal(body.stored, false);
    assert.equal(body.chained, false);
    assert.equal(contentWritten(env), false);
    const fd = new FormData();
    fd.set("title", "Synthetic");
    fd.set("file", file(M.jpeg(), "notes.txt", "text/plain"));
    const env2 = intakeStubEnv();
    const req2 = new Request(HOST + "/v1/ingest", { method: "POST", body: fd });
    const res2 = await handleLibraryIngestApi(req2, new URL(req2.url), env2, GUEST);
    assert.equal(res2.status, 415);
    assert.equal((await res2.json()).reason_code, MEDIA_REASONS.IMAGE);
    assert.equal(contentWritten(env2), false);
  } finally { cap.restore(); }
  assert.ok(!cap.seen.join("\n").includes(M.MARK), "no refused bytes in logs");
});

function aiSpyEnv() {
  const calls = [];
  const env = intakeStubEnv({ AI: { async run(model) { calls.push(model); return { text: "synthetic" }; } } });
  return { env, calls };
}

test("POST /transcribe: video and audio refused before Whisper, R2 or the lattice ledger", async () => {
  for (const [bytes, name, type] of [[M.mp4(), "a.mp4", "video/mp4"], [M.webm(), "a.txt", "text/plain"], [M.wav(), "a.wav", "audio/wav"]]) {
    const { env, calls } = aiSpyEnv();
    const fd = new FormData();
    fd.set("file", file(bytes, name, type));
    fd.set("upload", "1");
    const req = new Request(HOST + "/transcribe", { method: "POST", body: fd });
    const res = await handleHosted(req, new URL(req.url), env, { waitUntil() {} }, GUEST, null);
    assert.equal(res.status, 415, name);
    const body = await res.json();
    assert.equal(body.refused, true);
    assert.equal(calls.length, 0, "Whisper must never see refused media");
    assert.equal(contentWritten(env), false);
    assert.equal(writesContain(env, M.MARK), false);
  }
});

test("POST /ocr: images and PDFs with images refused before OCR or storage", async () => {
  for (const [bytes, name, type] of [[M.png(), "scan.png", "image/png"], [M.jpeg(), "scan.pdf", "application/pdf"], [M.pdfDct(), "scan.pdf", "application/pdf"]]) {
    const { env, calls } = aiSpyEnv();
    const fd = new FormData();
    fd.set("file", file(bytes, name, type));
    fd.set("save", "1");
    const req = new Request(HOST + "/ocr", { method: "POST", body: fd, headers: { accept: "application/json" } });
    const res = await handleHosted(req, new URL(req.url), env, { waitUntil() {} }, GUEST, null);
    assert.equal(res.status, 415, name);
    assert.equal(calls.length, 0, "OCR model must never see refused media");
    assert.equal(contentWritten(env), false);
  }
});

test("POST /install-package and /historical-import: packages are opened and media inside refuses", async () => {
  for (const [path, field, bytes, name] of [
    ["/install-package", "package", M.zip({ "manifest.json": "{}", "assets/a.png": M.png() }), "kit.azm"],
    ["/install-package", "package", M.zip({ "manifest.json": "{}", "notes.txt": M.mp4() }), "kit.azk"],
    ["/historical-import", "layer", M.zip({ "manifest.json": "{}", "layer.geojson": "{}", "x.bin": M.jpeg() }), "layer.azh"],
    ["/historical-import", "layer", new TextEncoder().encode('{"type":"FeatureCollection","p":"data:image/png;base64,' + M.b64(M.png()) + '"}'), "layer.geojson"],
  ]) {
    const env = intakeStubEnv();
    const fd = new FormData();
    fd.set(field, file(bytes, name));
    const req = new Request(HOST + path, { method: "POST", body: fd });
    const res = await handleHosted(req, new URL(req.url), env, { waitUntil() {} }, OPERATOR, null);
    assert.ok(res.status >= 400, path + " " + name + " should refuse");
    assert.equal(contentWritten(env), false, path + " " + name);
    assert.equal(writesContain(env, M.MARK), false);
    assert.ok(env.writes.sql.some((s) => /intake_refusals/.test(s)), "receipt written");
  }
});

test("derived spectral overlay PNGs are never stored or chained under the floor", async () => {
  const env = intakeStubEnv();
  const out = await recordSpectralOverlayArtifact(env, "AZDOC-SYNTH", M.png(), { lenses: ["ir"] });
  assert.equal(out, null);
  assert.equal(contentWritten(env), false);
});
