import test from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { listZipEntries } from "./zip.js";
import { extractReaderView, READER_FILE_CAP } from "./office-extract.js";
import { BLACK_BAR, readerKind, renderPaperReader } from "./paper-ux.js";

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

function makeZip(entries, { method = 0 } = {}) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name);
    const raw = entry.data instanceof Uint8Array ? entry.data : new TextEncoder().encode(String(entry.data));
    const data = method === 8 ? deflateRawSync(raw) : raw;
    const crc = crc32(raw);
    const local = new Uint8Array(30 + name.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x800, true);
    lv.setUint16(8, method, true);
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
    cv.setUint16(10, method, true);
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

function paper(bytes, row) {
  return renderPaperReader({
    row: {
      record_id: "AZDOC-OFFICE",
      title: "Filed",
      library: "aziel",
      object_key: "aziel/AZDOC-OFFICE/file",
      ...row,
    },
    body: "",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/filed",
    fileBytes: bytes,
  });
}

test("reader kind follows office MIME and extension without stealing PDF, HTML, or text", () => {
  assert.equal(readerKind({
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    filename: "notes.bin",
  }), "office");
  assert.equal(readerKind({ contentType: "application/octet-stream", filename: "notes.docx" }), "office");
  assert.equal(readerKind({ contentType: "text/rtf", filename: "notes.rtf" }), "office");
  assert.equal(readerKind({ contentType: "application/vnd.oasis.opendocument.text", filename: "notes.odt" }), "office");
  assert.equal(readerKind({ contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename: "book.xlsx" }), "sheet");
  assert.equal(readerKind({ contentType: "application/vnd.oasis.opendocument.spreadsheet", filename: "book.ods" }), "sheet");
  assert.equal(readerKind({ contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", filename: "deck.pptx" }), "slides");
  assert.equal(readerKind({ contentType: "application/vnd.oasis.opendocument.presentation", filename: "deck.odp" }), "slides");
  assert.equal(readerKind({ contentType: "application/zip", filename: "bundle.bin" }), "archive");
  assert.equal(readerKind({ contentType: "application/x-zip-compressed", filename: "kit.azm" }), "archive");
  assert.equal(readerKind({ contentType: "application/msword", filename: "old.doc" }), "legacy-doc");
  assert.equal(readerKind({ contentType: "application/vnd.ms-excel", filename: "old.xls" }), "legacy-xls");
  assert.equal(readerKind({ contentType: "application/vnd.ms-powerpoint", filename: "old.ppt" }), "legacy-ppt");
  assert.equal(readerKind({ contentType: "application/pdf", filename: "scan.pdf" }), "pdf");
  assert.equal(readerKind({ contentType: "application/pdf", filename: "mislabeled.docx" }), "pdf");
  assert.equal(readerKind({ contentType: "text/html", filename: "page.html" }), "html");
  assert.equal(readerKind({ contentType: "text/markdown", filename: "note.md" }), "text");
  assert.equal(readerKind({ contentType: "application/octet-stream", filename: "blob.bin" }), "opaque");
});

test("docx text, heading, table, and header paint with scripts escaped", () => {
  const bytes = makeZip([
    {
      name: "word/document.xml",
      data: "<w:document><w:body>"
        + "<w:p><w:pPr><w:pStyle w:val=\"Heading1\"/></w:pPr><w:r><w:t>Title</w:t></w:r></w:p>"
        + "<w:p><w:r><w:t>Hello </w:t></w:r><w:r><w:t>&lt;script&gt;alert(1)&lt;/script&gt;</w:t></w:r></w:p>"
        + "<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl>"
        + "<w:p><w:r><w:t>Collin Horton</w:t></w:r></w:p>"
        + "</w:body></w:document>",
    },
    { name: "word/header1.xml", data: "<w:hdr><w:p><w:r><w:t>Running head</w:t></w:r></w:p></w:hdr>" },
  ], { method: 8 });
  const html = paper(bytes, {
    content_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    filename: "notes.bin",
  });
  assert.match(html, /data-reader="office"/);
  assert.match(html, /Word text is extracted/);
  assert.match(html, /<h2>Title<\/h2>/);
  assert.match(html, /<h3>Header<\/h3>/);
  assert.match(html, /Running head/);
  assert.match(html, /Hello &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /<td>Cell<\/td>/);
  assert.match(html, new RegExp(BLACK_BAR));
  assert.doesNotMatch(html, /Collin/);
  assert.doesNotMatch(html, /<script/i);
  assert.match(html, /class="button ghost" href="\/file\/AZDOC-OFFICE"/);
  assert.doesNotMatch(html, /<iframe/);
});

test("odt, rtf, and html-in-doc paint text; OLE doc stays download-only", () => {
  const odt = makeZip([{
    name: "content.xml",
    data: "<office:document-content><office:body><office:text>"
      + "<text:h text:outline-level=\"1\">Chapter</text:h>"
      + "<text:p>Hello <text:span>world</text:span></text:p>"
      + "<table:table><table:table-row><table:table-cell><text:p>A</text:p></table:table-cell>"
      + "<table:table-cell><text:p>B</text:p></table:table-cell></table:table-row></table:table>"
      + "</office:text></office:body></office:document-content>",
  }]);
  const odtHtml = paper(odt, { content_type: "application/vnd.oasis.opendocument.text", filename: "chapter.odt" });
  assert.match(odtHtml, /data-reader="office"/);
  assert.match(odtHtml, /OpenDocument text is extracted/);
  assert.match(odtHtml, /<h2>Chapter<\/h2>/);
  assert.match(odtHtml, /Hello world/);
  assert.match(odtHtml, /<td>A<\/td><td>B<\/td>/);

  const rtf = new TextEncoder().encode("{\\rtf1\\ansi{\\fonttbl\\f0 Times;}Hello\\par{\\*\\shppict ignore}\\u233?}");
  const rtfHtml = paper(rtf, { content_type: "application/msword", filename: "old.doc" });
  assert.match(rtfHtml, /data-reader="office"/);
  assert.match(rtfHtml, /Rich text is extracted/);
  assert.match(rtfHtml, /Hello/);
  assert.match(rtfHtml, /é/);
  assert.doesNotMatch(rtfHtml, /Times/);
  assert.doesNotMatch(rtfHtml, /ignore/);

  const htmlDoc = new TextEncoder().encode("<html><head><script>alert(1)</script></head><body><p>Visible line</p></body></html>");
  const htmlPaint = paper(htmlDoc, { content_type: "application/msword", filename: "saved.doc" });
  assert.match(htmlPaint, /data-reader="office"/);
  assert.match(htmlPaint, /Visible line/);
  assert.match(htmlPaint, /tags and scripts removed/);
  assert.doesNotMatch(htmlPaint, /alert\(1\)/);
  assert.doesNotMatch(htmlPaint, /<script/i);

  const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
  const oleHtml = paper(ole, { content_type: "application/msword", filename: "binary.doc" });
  assert.match(oleHtml, /data-reader="opaque"/);
  assert.match(oleHtml, /does not parse that container/);
  assert.doesNotMatch(oleHtml, /data-reader="office"/);
});

test("xlsx and ods paint cached cells; xls stays download-only", () => {
  const xlsx = makeZip([
    { name: "xl/workbook.xml", data: "<workbook><sheets><sheet name=\"Data\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>" },
    { name: "xl/_rels/workbook.xml.rels", data: "<Relationships><Relationship Id=\"rId1\" Type=\"worksheet\" Target=\"worksheets/sheet1.xml\"/></Relationships>" },
    { name: "xl/sharedStrings.xml", data: "<sst><si><t>Hello</t></si><si><r><t>Rich </t><t>text</t></r></si></sst>" },
    {
      name: "xl/worksheets/sheet1.xml",
      data: "<worksheet><sheetData>"
        + "<row r=\"1\"><c r=\"A1\" t=\"s\"><v>0</v></c><c r=\"B1\"><v>2</v></c><c r=\"C1\" t=\"inlineStr\"><is><t>Inline</t></is></c></row>"
        + "<row r=\"2\"><c r=\"A2\" t=\"s\"><v>1</v></c><c r=\"B2\"><f>SUM(B1)</f><v>2</v></c><c r=\"C2\"><f>SUM(A1)</f></c></row>"
        + "</sheetData></worksheet>",
    },
  ]);
  const html = paper(xlsx, {
    content_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: "book.xlsx",
  });
  assert.match(html, /data-reader="sheet"/);
  assert.match(html, /Cached values are shown/);
  assert.match(html, /<h2>Data<\/h2>/);
  assert.match(html, /<td>Hello<\/td><td>2<\/td><td>Inline<\/td>/);
  assert.match(html, /<td>Rich text<\/td><td>2<\/td><td>formula: SUM\(A1\)<\/td>/);
  assert.doesNotMatch(html, /<td>SUM\(B1\)<\/td>/);

  const ods = makeZip([{
    name: "content.xml",
    data: "<office:document-content><office:body><office:spreadsheet>"
      + "<table:table table:name=\"Data\"><table:table-row>"
      + "<table:table-cell office:value-type=\"string\"><text:p>Name</text:p></table:table-cell>"
      + "<table:table-cell office:value-type=\"float\" office:value=\"1.5\"><text:p>1.5</text:p></table:table-cell>"
      + "</table:table-row><table:table-row><table:table-cell table:number-columns-repeated=\"5\"/></table:table-row>"
      + "</table:table></office:spreadsheet></office:body></office:document-content>",
  }]);
  const odsHtml = paper(ods, { content_type: "application/vnd.oasis.opendocument.spreadsheet", filename: "book.ods" });
  assert.match(odsHtml, /data-reader="sheet"/);
  assert.match(odsHtml, /<td>Name<\/td><td>1\.5<\/td>/);
  assert.doesNotMatch(odsHtml, /<td><\/td><td><\/td><td><\/td><td><\/td><td><\/td>/);

  const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const xls = paper(ole, { content_type: "application/vnd.ms-excel", filename: "old.xls" });
  assert.match(xls, /data-reader="opaque"/);
  assert.match(xls, /does not parse that container/);
});

test("pptx and odp paint slide text only", () => {
  const pptx = makeZip([
    {
      name: "ppt/slides/slide1.xml",
      data: "<p:sld><p:cSld><p:spTree><p:sp><p:txBody>"
        + "<a:p><a:r><a:t>Hello slide</a:t></a:r></a:p>"
        + "<a:p><a:r><a:t>&lt;script&gt;</a:t></a:r></a:p>"
        + "</p:txBody></p:sp></p:spTree></p:cSld></p:sld>",
    },
    { name: "ppt/notesSlides/notesSlide1.xml", data: "<p:notes><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Speak this</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:notes>" },
  ]);
  const html = paper(pptx, {
    content_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    filename: "deck.pptx",
  });
  assert.match(html, /data-reader="slides"/);
  assert.match(html, /Visual layout, images, and animations are not painted/);
  assert.match(html, /<h2>Slide 1<\/h2>/);
  assert.match(html, /Hello slide/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Speaker notes/);
  assert.match(html, /Speak this/);
  assert.doesNotMatch(html, /<script/i);

  const odp = makeZip([{
    name: "content.xml",
    data: "<office:document-content><office:body><office:presentation>"
      + "<draw:page draw:name=\"Intro\"><draw:frame><draw:text-box><text:p>Slide hello</text:p></draw:text-box></draw:frame></draw:page>"
      + "</office:presentation></office:body></office:document-content>",
  }]);
  const odpHtml = paper(odp, { content_type: "application/vnd.oasis.opendocument.presentation", filename: "deck.odp" });
  assert.match(odpHtml, /data-reader="slides"/);
  assert.match(odpHtml, /<h2>Intro<\/h2>/);
  assert.match(odpHtml, /Slide hello/);

  const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const ppt = paper(ole, { content_type: "application/vnd.ms-powerpoint", filename: "old.ppt" });
  assert.match(ppt, /data-reader="opaque"/);
  assert.match(ppt, /does not parse that container/);
});

test("zip entries are listed and not executed, including odd methods and unsafe names", () => {
  const bytes = makeZip([
    { name: "notes/readme.txt", data: "hello notes" },
    { name: "bin/tool.exe", data: "MZ not executed" },
    { name: "<script>.txt", data: "nope" },
    { name: "../evil.exe", data: "nope" },
    { name: "dir/", data: "" },
  ]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < bytes.length - 4; i++) {
    if (view.getUint32(i, true) === 0x02014b50) view.setUint16(i + 10, 99, true);
  }
  const listed = listZipEntries(bytes);
  assert.equal(listed.ok, true);
  assert.equal(listed.entries.some((entry) => entry.name === "notes/readme.txt" && entry.bytes === 11), true);
  const html = paper(bytes, { content_type: "application/zip", filename: "bundle.zip" });
  assert.match(html, /data-reader="archive"/);
  assert.match(html, /listed, not opened or executed/);
  assert.match(html, /notes\/readme\.txt/);
  assert.match(html, /11 bytes/);
  assert.match(html, /bin\/tool\.exe/);
  assert.match(html, /listed only, not executed/);
  assert.match(html, /&lt;script&gt;\.txt/);
  assert.match(html, /\.\.\/evil\.exe/);
  assert.doesNotMatch(html, /hello notes/);
  assert.doesNotMatch(html, /MZ not executed/);
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /href="[^"]*tool\.exe/);
  assert.match(html, /<a class="button" href="\/file\/AZDOC-OFFICE" download="bundle.zip"/);
  assert.match(html, /class="button ghost" href="\/download\?record=AZDOC-OFFICE"/);
});

test("unreadable and oversized packages stay download-only", () => {
  const broken = paper(new TextEncoder().encode("PK\u0003\u0004not-a-zip"), {
    content_type: "application/zip",
    filename: "bundle.zip",
  });
  assert.match(broken, /data-reader="opaque"/);
  assert.match(broken, /central directory was not readable/);
  assert.match(broken, /Entries were not opened/);

  const skipped = renderPaperReader({
    row: {
      record_id: "AZDOC-BIG",
      title: "Big",
      library: "aziel",
      content_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      filename: "big.docx",
      object_key: "aziel/AZDOC-BIG/big.docx",
    },
    body: "",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/big",
    fileSkip: "This file is " + (READER_FILE_CAP + 1).toLocaleString("en-US") + " bytes. The reader opens Word, spreadsheet, slide, and ZIP files up to " + READER_FILE_CAP.toLocaleString("en-US") + " bytes. Download stays below.",
  });
  assert.match(skipped, /data-reader="opaque"/);
  assert.match(skipped, new RegExp("up to " + READER_FILE_CAP.toLocaleString("en-US") + " bytes"));
  assert.doesNotMatch(skipped, /data-reader="office"/);

  const seven = renderPaperReader({
    row: { record_id: "AZDOC-7Z", title: "Pack", library: "aziel", content_type: "application/x-7z-compressed", filename: "pack.7z", object_key: "aziel/AZDOC-7Z/pack.7z" },
    body: "",
    counts: { views: 0, downloads: 0, available: true },
    permalink: "/aziellibrary/pack",
  });
  assert.match(seven, /data-reader="opaque"/);
  assert.match(seven, /does not list 7z entries/);

  const direct = extractReaderView(new Uint8Array([1, 2, 3]), { kind: "office" });
  assert.equal(direct.painted, false);
  assert.match(direct.reason, /Nothing was painted/);

  const zip64 = makeZip([{ name: "a.txt", data: "a" }]);
  const zview = new DataView(zip64.buffer, zip64.byteOffset, zip64.byteLength);
  for (let i = zip64.length - 22; i >= 0; i--) {
    if (zview.getUint32(i, true) === 0x06054b50) {
      zview.setUint16(i + 10, 0xffff, true);
      break;
    }
  }
  const zip64Html = paper(zip64, { content_type: "application/zip", filename: "huge.zip" });
  assert.match(zip64Html, /data-reader="opaque"/);
  assert.match(zip64Html, /ZIP64/);
  assert.match(zip64Html, /Entries were not opened/);

  const enc = makeZip([
    { name: "EncryptionInfo", data: "locked" },
    { name: "EncryptedPackage", data: "locked" },
  ]);
  const encHtml = paper(enc, {
    content_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    filename: "secret.docx",
  });
  assert.match(encHtml, /data-reader="opaque"/);
  assert.match(encHtml, /encrypted package/);
  assert.match(encHtml, /does not decrypt/);
});
