import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { pdfPageCount } from "./pdf-pages.js";
import { paperJumpTarget, renderPaperReader } from "./paper-ux.js";
import { recordBody } from "./hosted-pages.js";
import { page, readerZoomScript } from "./ui.js";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name);
    const raw = new TextEncoder().encode(String(entry.data));
    const data = deflateRawSync(raw);
    const crc = crc32(raw);
    const local = new Uint8Array(30 + name.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x800, true);
    lv.setUint16(8, 8, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, raw.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    locals.push(local);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x800, true);
    cv.setUint16(10, 8, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, raw.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length;
  }
  const cdSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + cdSize + 22);
  let p = 0;
  for (const part of locals) { out.set(part, p); p += part.length; }
  for (const part of centrals) { out.set(part, p); p += part.length; }
  out.set(eocd, p);
  return out;
}

function pdfDoc(pages, { encrypt = false, mismatch = false, decoy = false, nested = false } = {}) {
  const objs = [];
  if (nested) {
    objs.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    objs.push("2 0 obj\n<< /Type /Pages /Count 3 /Kids [3 0 R 4 0 R] >>\nendobj\n");
    objs.push("3 0 obj\n<< /Type /Pages /Count 2 /Kids [5 0 R 6 0 R] >>\nendobj\n");
    objs.push("4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\n");
    objs.push("5 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 200 200] >>\nendobj\n");
    objs.push("6 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 200 200] >>\nendobj\n");
  } else {
    const count = mismatch ? pages + 5 : pages;
    const kids = [];
    for (let i = 0; i < pages; i++) kids.push((3 + i) + " 0 R");
    objs.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    objs.push("2 0 obj\n<< /Type /Pages /Count " + count + " /Kids [" + kids.join(" ") + "] >>\nendobj\n");
    for (let i = 0; i < pages; i++) {
      objs.push((3 + i) + " 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\n");
    }
    if (decoy) objs.push("90 0 obj\n<< /Length 20 >>\nstream\n/Type /Page /Type /Page\nendstream\nendobj\n");
  }
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objs) {
    offsets.push(body.length);
    body += obj;
  }
  const xrefAt = body.length;
  let xref = "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n";
  for (let i = 1; i <= objs.length; i++) xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  const encryptRef = encrypt ? " /Encrypt 9 0 R" : "";
  const trailer = "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R" + encryptRef + " >>\nstartxref\n" + xrefAt + "\n%%EOF\n";
  return new TextEncoder().encode(body + xref + trailer);
}

function reader(extra) {
  return renderPaperReader(Object.assign({
    row: { record_id: "AZDOC-TURN", title: "Labelled Example — Page Turner", library: "aziel", author: "Aziel Eliab" },
    counts: { views: 4, downloads: 1, available: true },
    permalink: "/aziellibrary/labelled-example",
    catalog: [],
  }, extra));
}

test("pdf page tree counts leaves and refuses a disagreeing or encrypted file", () => {
  assert.equal(pdfPageCount(pdfDoc(3)).pages, 3);
  assert.equal(pdfPageCount(pdfDoc(1)).pages, 1);
  assert.equal(pdfPageCount(pdfDoc(3, { nested: true })).pages, 3);
  assert.equal(pdfPageCount(pdfDoc(1, { decoy: true })).pages, 1);
  assert.equal(pdfPageCount(pdfDoc(2, { mismatch: true })).pages, null);
  assert.equal(pdfPageCount(pdfDoc(2, { mismatch: true })).reason, "mismatch");
  assert.equal(pdfPageCount(pdfDoc(1, { encrypt: true })).reason, "encrypted");
  assert.equal(pdfPageCount(new TextEncoder().encode("not a pdf")).reason, "not-pdf");
  const fixture = new Uint8Array(readFileSync(new URL("./fixtures/media-bypass/pdf_raw_plain.pdf", import.meta.url)));
  assert.equal(pdfPageCount(fixture).pages, 1);
});

test("multi-page text moves next and previous and jumps without painting another page", () => {
  const body = "ALPHA labelled page one.\fBETA labelled page two.\fGAMMA labelled page three.";
  const mid = reader({ body, page: 2 });
  assert.match(mid, /data-reader="paged"/);
  assert.match(mid, /data-page="2"/);
  assert.match(mid, /data-pages="3"/);
  assert.match(mid, /class="page-turner page-turner-top"/);
  assert.match(mid, /class="page-turner page-turner-end"/);
  assert.match(mid, /Page 2 of 3/);
  assert.match(mid, /rel="prev" href="\/aziellibrary\/labelled-example"/);
  assert.match(mid, /rel="next" href="\/aziellibrary\/labelled-example\/p\/3"/);
  assert.match(mid, /class="page-jump" method="get" action="\/aziellibrary\/labelled-example"/);
  assert.match(mid, /name="page"/);
  assert.match(mid, /value="2"/);
  assert.match(mid, /BETA labelled page two/);
  assert.doesNotMatch(mid, /ALPHA labelled page one/);
  assert.doesNotMatch(mid, /GAMMA labelled page three/);
  assert.match(mid, /Lamb Lens: Service/);
  const first = reader({ body, page: 1 });
  assert.match(first, /aria-disabled="true">Previous</);
  assert.match(first, /rel="next" href="\/aziellibrary\/labelled-example\/p\/2"/);
  assert.match(first, /ALPHA labelled page one/);
  const last = reader({ body, page: 3 });
  assert.match(last, /aria-disabled="true">Next</);
  assert.match(last, /GAMMA labelled page three/);
  const missing = reader({ body, page: 9 });
  assert.match(missing, /data-page-state="missing"/);
  assert.match(missing, /Page 9 is not in this paper \(3 pages\)/);
  assert.match(missing, /Open page 1/);
  assert.doesNotMatch(missing, /class="page-turner"/);
  assert.doesNotMatch(missing, /ALPHA labelled page one/);
  assert.doesNotMatch(missing, /BETA labelled page two/);
  assert.doesNotMatch(missing, /GAMMA labelled page three/);
  const shell = page("Labelled Example — Page Turner", recordBody({
    row: {
      record_id: "AZDOC-TURN",
      title: "Labelled Example — Page Turner",
      library: "aziel",
      author: "Aziel Eliab",
      body,
      permalink: "/aziellibrary/labelled-example",
    },
    permalink: "/aziellibrary/labelled-example",
    page: 2,
    counts: { views: 4, downloads: 1, available: true },
  }), { path: "/aziellibrary/labelled-example/p/2", kind: "record" });
  assert.match(shell, /class="page-turner page-turner-top"/);
  assert.match(shell, /BETA labelled page two/);
  assert.match(shell, /ArrowLeft/);
  assert.match(shell, /aziel-reader-zoom:v1:/);
  assert.doesNotMatch(readerZoomScript(), /aziel-reader-zoom:v1:.*\/p\//);
});

test("a single text page does not invent a turner, and page 2 is an error", () => {
  const one = reader({ body: "A standalone labelled note.", page: 1 });
  assert.match(one, /data-reader="standalone"/);
  assert.match(one, /A standalone labelled note/);
  assert.doesNotMatch(one, /class="page-turner"/);
  const miss = reader({ body: "A standalone labelled note.", page: 2 });
  assert.match(miss, /data-page-state="missing"/);
  assert.match(miss, /Page 2 is not in this paper \(1 page\)/);
  assert.doesNotMatch(miss, /A standalone labelled note/);
  assert.doesNotMatch(miss, /class="page-turner"/);
});

test("counted PDF pages turn, and an unread or unknown file does not simulate a page", () => {
  const bytes = pdfDoc(3);
  const row = {
    record_id: "AZDOC-PDF",
    title: "Labelled Example — PDF",
    library: "aziel",
    content_type: "application/pdf",
    filename: "labelled.pdf",
    object_key: "aziel/AZDOC-PDF/labelled.pdf",
  };
  const mid = reader({ row, body: "", page: 2, pdfState: bytes });
  assert.match(mid, /data-reader="pdf"/);
  assert.match(mid, /data-pages="3"/);
  assert.match(mid, /Page 2 of 3/);
  assert.match(mid, /rel="prev" href="\/aziellibrary\/labelled-example"/);
  assert.match(mid, /rel="next" href="\/aziellibrary\/labelled-example\/p\/3"/);
  assert.match(mid, /src="\/file\/AZDOC-PDF#page=2&amp;view=FitH"/);
  assert.match(mid, /class="paper-embed paper-pdf"/);
  const late = reader({ row, body: "", page: 4, pdfState: bytes });
  assert.match(late, /data-page-state="missing"/);
  assert.match(late, /Page 4 is not in this PDF \(3 pages\)/);
  assert.doesNotMatch(late, /<iframe/);
  assert.doesNotMatch(late, /#page=4/);
  const single = reader({ row, body: "", page: 1, pdfState: pdfDoc(1) });
  assert.match(single, /1 page/);
  assert.match(single, /#page=1&amp;view=FitH/);
  assert.doesNotMatch(single, /class="page-turner"/);
  const pastSingle = reader({ row, body: "", page: 2, pdfState: pdfDoc(1) });
  assert.match(pastSingle, /data-page-state="missing"/);
  assert.doesNotMatch(pastSingle, /<iframe/);
  const unread = reader({ row, body: "", page: 1, pdfState: "unread" });
  assert.match(unread, /data-page-state="unreadable"/);
  assert.match(unread, /could not be read/);
  assert.doesNotMatch(unread, /<iframe/);
  assert.doesNotMatch(unread, /class="page-turner"/);
  const unknown = reader({ row, body: "", page: 1, pdfState: new TextEncoder().encode("%PDF-1.7\nnot a tree") });
  assert.match(unknown, /data-pages="unknown"/);
  assert.match(unknown, /page total was not read/);
  assert.match(unknown, /src="\/file\/AZDOC-PDF#view=FitH"/);
  assert.doesNotMatch(unknown, /class="page-turner"/);
  const unknownNext = reader({ row, body: "", page: 2, pdfState: new TextEncoder().encode("%PDF-1.7\nnot a tree") });
  assert.match(unknownNext, /data-page-state="missing"/);
  assert.match(unknownNext, /was not opened/);
  assert.doesNotMatch(unknownNext, /<iframe/);
  assert.doesNotMatch(unknownNext, /#page=2/);
  const oversize = reader({ row, body: "", page: 2, pdfState: "oversize" });
  assert.match(oversize, /data-page-state="missing"/);
  assert.match(oversize, /larger than the reader counts/);
  assert.doesNotMatch(oversize, /<iframe/);
});

test("slides and sheets turn one unit at a time; other files do not invent pages", () => {
  const pptx = makeZip([
    { name: "ppt/slides/slide1.xml", data: "<p:sld><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>HELLO-SLIDE-ONE</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>" },
    { name: "ppt/slides/slide2.xml", data: "<p:sld><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>HELLO-SLIDE-TWO</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>" },
  ]);
  const slideRow = {
    record_id: "AZDOC-SLIDE",
    title: "Labelled Deck",
    library: "aziel",
    content_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    filename: "deck.pptx",
    object_key: "aziel/AZDOC-SLIDE/deck.pptx",
  };
  const slide = reader({ row: slideRow, body: "", page: 2, fileBytes: pptx });
  assert.match(slide, /data-reader="slides"/);
  assert.match(slide, /Slide 2 of 2/);
  assert.match(slide, /HELLO-SLIDE-TWO/);
  assert.match(slide, /rel="prev"/);
  assert.doesNotMatch(slide, /HELLO-SLIDE-ONE/);
  assert.doesNotMatch(slide, /<script/i);
  const slideMiss = reader({ row: slideRow, body: "", page: 3, fileBytes: pptx });
  assert.match(slideMiss, /data-page-state="missing"/);
  assert.doesNotMatch(slideMiss, /HELLO-SLIDE-TWO/);
  const xlsx = makeZip([
    { name: "xl/worksheets/sheet1.xml", data: "<worksheet><sheetData><row r=\"1\"><c r=\"A1\" t=\"inlineStr\"><is><t>ALPHA-SHEET</t></is></c></row></sheetData></worksheet>" },
    { name: "xl/worksheets/sheet2.xml", data: "<worksheet><sheetData><row r=\"1\"><c r=\"A1\" t=\"inlineStr\"><is><t>BETA-SHEET</t></is></c></row></sheetData></worksheet>" },
  ]);
  const sheetRow = {
    record_id: "AZDOC-SHEET",
    title: "Labelled Book",
    library: "aziel",
    content_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: "book.xlsx",
    object_key: "aziel/AZDOC-SHEET/book.xlsx",
  };
  const sheet = reader({ row: sheetRow, body: "", page: 2, fileBytes: xlsx });
  assert.match(sheet, /data-reader="sheet"/);
  assert.match(sheet, /Sheet 2 of 2/);
  assert.match(sheet, /BETA-SHEET/);
  assert.doesNotMatch(sheet, /ALPHA-SHEET/);
  const image = reader({
    row: {
      record_id: "AZDOC-IMG",
      title: "Plate",
      library: "aziel",
      content_type: "image/png",
      filename: "plate.png",
      object_key: "aziel/AZDOC-IMG/plate.png",
    },
    body: "",
    page: 2,
  });
  assert.match(image, /data-page-state="missing"/);
  assert.match(image, /not divided into pages/);
  assert.doesNotMatch(image, /<img/);
  assert.doesNotMatch(image, /class="page-turner"/);
  const htmlFile = reader({
    row: {
      record_id: "AZDOC-HTM",
      title: "Page",
      library: "aziel",
      content_type: "text/html",
      filename: "page.html",
      object_key: "aziel/AZDOC-HTM/page.html",
    },
    body: "<script>alert(1)</script><p>Hello</p>",
    page: 1,
  });
  assert.match(htmlFile, /sandbox=""/);
  assert.doesNotMatch(htmlFile, /<script>alert/);
  assert.doesNotMatch(htmlFile, /class="page-turner"/);
});

test("page jump accepts a same-path page number and refuses anything else", () => {
  assert.deepEqual(paperJumpTarget("/aziellibrary/labelled-example", "2"), { redirect: "/aziellibrary/labelled-example/p/2" });
  assert.equal(paperJumpTarget("/aziellibrary/labelled-example", "1"), null);
  assert.equal(paperJumpTarget("/aziellibrary/labelled-example/p/2", "3"), null);
  assert.deepEqual(paperJumpTarget("/record/AZDOC-TURN", "4"), { redirect: "/record/AZDOC-TURN/p/4" });
  assert.deepEqual(paperJumpTarget("/aziellibrary/labelled-example", "0"), { invalid: true });
  assert.deepEqual(paperJumpTarget("/aziellibrary/labelled-example", "2.5"), { invalid: true });
  assert.deepEqual(paperJumpTarget("/aziellibrary/labelled-example", "-1"), { invalid: true });
  assert.deepEqual(paperJumpTarget("/aziellibrary/labelled-example", "9999999"), { invalid: true });
  assert.equal(paperJumpTarget("/software", "2"), null);
  assert.equal(paperJumpTarget("/aziellibrary/labelled-example", ""), null);
});
