/**
 * Worker-side text extraction for the paper reader.
 * Office packages are ZIP XML or RTF. Nothing is sent to a third-party viewer.
 * Extracted text is data for the reader to escape. Scripts are never kept.
 * Archive entries are named and sized from the central directory only.
 * Author: Aziel Eliab.
 */
import { listZipEntries, readZipFiles } from "./zip.js";

export const READER_FILE_CAP = 12 * 1024 * 1024;
const EXTRACT_TEXT_CAP = 200000;
const LIST_CAP = 2000;
const MAX_ROWS = 200;
const MAX_COLS = 32;
const MAX_SHEETS = 20;
const MAX_SLIDES = 80;

const OFFICE_EXT = new Set(["docx", "odt", "rtf"]);
const SHEET_EXT = new Set(["xlsx", "ods"]);
const SLIDE_EXT = new Set(["pptx", "odp"]);
const ARCHIVE_EXT = new Set(["zip", "azm", "azk", "azh"]);

const SPECIFIC_MIME = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "office",
  "application/vnd.oasis.opendocument.text": "office",
  "application/rtf": "office",
  "text/rtf": "office",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "sheet",
  "application/vnd.oasis.opendocument.spreadsheet": "sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "slides",
  "application/vnd.oasis.opendocument.presentation": "slides",
  "application/msword": "legacy-doc",
  "application/vnd.ms-excel": "legacy-xls",
  "application/vnd.ms-powerpoint": "legacy-ppt",
};

function mimeOf(contentType) {
  return String(contentType || "").toLowerCase().split(";")[0].trim();
}

function extOf(filename) {
  const base = String(filename || "").split(/[/\\]/).pop() || "";
  const i = base.lastIndexOf(".");
  if (i <= 0 || i === base.length - 1) return "";
  return base.slice(i + 1).toLowerCase();
}

/** Office, sheet, slide, archive, or legacy binary office. Empty when this module does not claim the file. */
export function packagedKind(contentType, filename) {
  const ct = mimeOf(contentType);
  const ext = extOf(filename);
  if (SPECIFIC_MIME[ct]) return SPECIFIC_MIME[ct];
  if (OFFICE_EXT.has(ext)) return "office";
  if (SHEET_EXT.has(ext)) return "sheet";
  if (SLIDE_EXT.has(ext)) return "slides";
  if (ext === "doc") return "legacy-doc";
  if (ext === "xls") return "legacy-xls";
  if (ext === "ppt") return "legacy-ppt";
  if (ARCHIVE_EXT.has(ext)) return "archive";
  if (ct === "application/zip" || ct === "application/x-zip-compressed") return "archive";
  return "";
}

export function readerWantsBytes(kind) {
  return kind === "office" || kind === "sheet" || kind === "slides" || kind === "archive"
    || kind === "legacy-doc" || kind === "legacy-xls" || kind === "legacy-ppt";
}

export function oversizeReaderReason(byteLength) {
  const n = Number(byteLength) || 0;
  return "This file is " + n.toLocaleString("en-US") + " bytes. The reader opens Word, spreadsheet, slide, and ZIP files up to "
    + READER_FILE_CAP.toLocaleString("en-US") + " bytes. Download stays below.";
}

function fail(reason) {
  return { painted: false, mode: "opaque", note: "", blocks: [], entries: [], truncated: false, reason };
}

function okView(mode, note, extra) {
  return {
    painted: true,
    mode,
    note,
    blocks: (extra && extra.blocks) || [],
    entries: (extra && extra.entries) || [],
    truncated: !!(extra && extra.truncated),
    reason: "",
  };
}

function asU8(input) {
  if (input instanceof Uint8Array) return input;
  if (!input) return new Uint8Array();
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array();
}

function headText(u8, n) {
  return new TextDecoder("utf-8", { fatal: false }).decode(u8.subarray(0, Math.min(u8.length, n || 800)));
}

function utf8(buf) {
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

function isZip(u8) {
  return u8.length >= 4 && u8[0] === 0x50 && u8[1] === 0x4b && (u8[2] === 0x03 || u8[2] === 0x05 || u8[2] === 0x07);
}

function isOle(u8) {
  return u8.length >= 8 && u8[0] === 0xd0 && u8[1] === 0xcf && u8[2] === 0x11 && u8[3] === 0xe0;
}

function isRtf(u8) {
  const h = headText(u8, 240).replace(/^\uFEFF/, "").trimStart();
  return h.startsWith("{\\rtf");
}

function looksHtml(u8) {
  const h = headText(u8, 1600).replace(/^\uFEFF/, "").trimStart().toLowerCase();
  return h.startsWith("<!doctype html") || h.startsWith("<html") || h.includes("urn:schemas-microsoft-com:office:word") || h.includes("<w:worddocument");
}

function safeCp(n) {
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return "";
  if (n >= 0xd800 && n <= 0xdfff) return "";
  if (n < 32 && n !== 9 && n !== 10 && n !== 13) return "";
  return String.fromCodePoint(n);
}

function decodeXml(s) {
  return String(s || "")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeCp(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCp(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function cleanup(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function localName(raw) {
  const m = /^<\/?\s*([^\s/>]+)/.exec(raw);
  if (!m) return "";
  const full = m[1];
  const i = full.indexOf(":");
  return (i >= 0 ? full.slice(i + 1) : full).toLowerCase();
}

function attr(raw, name) {
  const re = new RegExp("(?:^|[\\s])(?:[A-Za-z0-9_.-]+:)?" + name + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i");
  const m = re.exec(raw);
  return m ? decodeXml(m[2]) : "";
}

function scanXml(xml, onTag, onText) {
  const s = String(xml || "");
  let i = 0;
  const n = s.length;
  while (i < n) {
    if (s.charCodeAt(i) === 60) {
      if (s.startsWith("<!--", i)) {
        const end = s.indexOf("-->", i + 4);
        i = end < 0 ? n : end + 3;
        continue;
      }
      if (s.startsWith("<![CDATA[", i)) {
        const end = s.indexOf("]]>", i + 9);
        const raw = end < 0 ? s.slice(i + 9) : s.slice(i + 9, end);
        if (raw) onText(raw);
        i = end < 0 ? n : end + 3;
        continue;
      }
      if (s.startsWith("<?", i)) {
        const end = s.indexOf("?>", i + 2);
        i = end < 0 ? n : end + 2;
        continue;
      }
      const end = s.indexOf(">", i + 1);
      if (end < 0) break;
      const raw = s.slice(i, end + 1);
      onTag({ raw, name: localName(raw), closing: raw.startsWith("</"), self: /\/\s*>$/.test(raw) });
      i = end + 1;
      continue;
    }
    const next = s.indexOf("<", i);
    const chunk = next < 0 ? s.slice(i) : s.slice(i, next);
    if (chunk) onText(chunk);
    i = next < 0 ? n : next;
  }
}

function budget() {
  return { used: 0, truncated: false };
}

function takeText(state, text) {
  const clean = cleanup(text);
  if (!clean) return "";
  if (state.used >= EXTRACT_TEXT_CAP) {
    state.truncated = true;
    return "";
  }
  const room = EXTRACT_TEXT_CAP - state.used;
  const slice = clean.length > room ? clean.slice(0, room) : clean;
  state.used += slice.length;
  if (slice.length < clean.length) state.truncated = true;
  return slice;
}

function namesOf(u8) {
  const listed = listZipEntries(u8);
  if (!listed.ok) return { ok: false, error: listed.error, names: [] };
  return { ok: true, error: "", names: listed.entries.map((entry) => entry.name) };
}

function hasEncryptedPackage(names) {
  const set = new Set(names);
  return set.has("EncryptionInfo") || set.has("EncryptedPackage");
}

function readNamed(u8, names) {
  return readZipFiles(u8, names);
}

const DOCX_NOTE = "Word text is extracted from the document package. Images, fonts, and page layout are not painted. Links stay plain text. Download stays below.";
const ODT_NOTE = "OpenDocument text is extracted from content.xml. Images and page layout are not painted. Links stay plain text. Download stays below.";
const RTF_NOTE = "Rich text is extracted from RTF controls. Embedded objects are not painted. Download stays below.";
const HTML_DOC_NOTE = "This .doc is HTML. Visible text is shown with tags and scripts removed. It is not a layout preview. Download stays below.";
const XLSX_NOTE = "Spreadsheet cells are extracted from the workbook. Cached values are shown. Date cells stay serial numbers. Formulas are not recalculated. Charts and styling are not painted. Download stays below.";
const ODS_NOTE = "OpenDocument spreadsheet cells are extracted as tables. Stored cell text is shown when present, otherwise the raw office:value. Formulas are not recalculated. Charts and styling are not painted. Download stays below.";
const PPTX_NOTE = "Slide text is extracted in slide order. Visual layout, images, and animations are not painted. Download stays below.";
const ODP_NOTE = "OpenDocument slide text is extracted in page order. Visual layout and images are not painted. Download stays below.";
const OLE_DOC = "This is a binary Word .doc (OLE compound file). The reader does not parse that container. Download stays below.";
const BIFF_XLS = "This is a binary Excel .xls workbook (BIFF). The reader does not parse that container. Download stays below.";
const BIN_PPT = "This is a binary PowerPoint .ppt file. The reader does not parse that container. Download stays below.";
const ARCHIVE_NOTE = "Archive entries are listed, not opened or executed. Names and uncompressed sizes come from the ZIP central directory. Download stays the way to take the file.";

function parseDocxBlocks(xml, state) {
  const blocks = [];
  let buf = "";
  let pStyle = "";
  let inPPr = false;
  let capture = 0;
  let tblDepth = 0;
  let collectingCell = false;
  let cellParts = [];
  let row = null;
  let rows = [];

  function flushPara() {
    const text = takeText(state, buf);
    buf = "";
    const style = pStyle.toLowerCase();
    pStyle = "";
    if (collectingCell || tblDepth > 1) {
      if (text) cellParts.push(text);
      return;
    }
    if (!text) return;
    const type = style === "heading1" || style === "title" ? "h2" : (/^heading[2-9]$/.test(style) || style === "subtitle" ? "h3" : "p");
    blocks.push({ type, text });
  }

  scanXml(xml, (tag) => {
    if (tag.name === "ppr") {
      inPPr = !tag.closing && !tag.self;
      return;
    }
    if (tag.name === "pstyle" && inPPr) {
      pStyle = attr(tag.raw, "val");
      return;
    }
    if (tag.name === "p") {
      if (tag.closing || tag.self) flushPara();
      else {
        if (buf) flushPara();
        pStyle = "";
      }
      return;
    }
    if (tag.name === "tbl") {
      if (!tag.closing && !tag.self) {
        tblDepth += 1;
        if (tblDepth === 1) {
          rows = [];
          row = null;
          collectingCell = false;
        }
      } else if (tag.closing && tblDepth > 0) {
        if (tblDepth === 1 && rows.length) blocks.push({ type: "table", rows });
        tblDepth -= 1;
        collectingCell = false;
        row = null;
      }
      return;
    }
    if (tag.name === "tr" && tblDepth === 1) {
      if (!tag.closing && !tag.self) row = [];
      else if (tag.closing && row) {
        rows.push(row);
        row = null;
      }
      return;
    }
    if (tag.name === "tc" && tblDepth === 1) {
      if (!tag.closing && !tag.self) {
        collectingCell = true;
        cellParts = [];
      } else if (tag.closing) {
        if (buf) flushPara();
        if (row) row.push(cellParts.join("\n").trim());
        cellParts = [];
        collectingCell = false;
      }
      return;
    }
    if (tag.name === "tab" && (tag.self || !tag.closing)) {
      buf += "\t";
      return;
    }
    if (tag.name === "br" && (tag.self || !tag.closing)) {
      buf += "\n";
      return;
    }
    if (tag.name === "t") {
      if (tag.closing) capture = Math.max(0, capture - 1);
      else if (!tag.self) capture += 1;
    }
  }, (chunk) => {
    if (capture > 0) buf += decodeXml(chunk);
  });
  if (buf) flushPara();
  return blocks;
}

function labeled(title, blocks) {
  const kept = (blocks || []).filter((block) => block && (block.text || (block.rows && block.rows.length)));
  if (!kept.length) return [];
  return [{ type: "h3", text: title }].concat(kept);
}

function extractDocx(u8) {
  const listed = namesOf(u8);
  if (!listed.ok) return fail("This Word document is not a readable ZIP package (" + listed.error + "). Nothing was painted. Download stays below.");
  if (!listed.names.includes("word/document.xml")) {
    if (hasEncryptedPackage(listed.names)) return fail("This Word document is an encrypted package. The reader does not decrypt it. Download stays below.");
    return fail("This Word document has no word/document.xml. Nothing was painted. Download stays below.");
  }
  const headers = listed.names.filter((name) => /^word\/header\d+\.xml$/.test(name)).sort();
  const footers = listed.names.filter((name) => /^word\/footer\d+\.xml$/.test(name)).sort();
  const extras = ["word/footnotes.xml", "word/endnotes.xml"].filter((name) => listed.names.includes(name));
  const got = readNamed(u8, ["word/document.xml"].concat(headers, footers, extras));
  const doc = got.files["word/document.xml"];
  if (!doc) return fail("word/document.xml could not be read. Nothing was painted. Download stays below.");
  const state = budget();
  let blocks = [];
  headers.forEach((name, index) => {
    const buf = got.files[name];
    if (!buf) return;
    blocks = blocks.concat(labeled(headers.length > 1 ? "Header " + (index + 1) : "Header", parseDocxBlocks(utf8(buf), state)));
  });
  blocks = blocks.concat(parseDocxBlocks(utf8(doc), state));
  footers.forEach((name, index) => {
    const buf = got.files[name];
    if (!buf) return;
    blocks = blocks.concat(labeled(footers.length > 1 ? "Footer " + (index + 1) : "Footer", parseDocxBlocks(utf8(buf), state)));
  });
  if (got.files["word/footnotes.xml"]) blocks = blocks.concat(labeled("Footnotes", parseDocxBlocks(utf8(got.files["word/footnotes.xml"]), state)));
  if (got.files["word/endnotes.xml"]) blocks = blocks.concat(labeled("Endnotes", parseDocxBlocks(utf8(got.files["word/endnotes.xml"]), state)));
  return okView("office", DOCX_NOTE, { blocks, truncated: state.truncated });
}

function odfAppend(buf, tag) {
  if (tag.name === "tab" && (tag.self || !tag.closing)) return buf + "\t";
  if (tag.name === "line-break" && (tag.self || !tag.closing)) return buf + "\n";
  if (tag.name === "s") {
    const count = Math.min(parseInt(attr(tag.raw, "c") || "1", 10) || 1, 40);
    return buf + " ".repeat(count);
  }
  return buf;
}

function parseOdfText(xml, state) {
  const blocks = [];
  let buf = "";
  let capture = 0;
  let heading = false;
  let level = "1";
  let skip = 0;
  let tblDepth = 0;
  let collectingCell = false;
  let cellParts = [];
  let row = null;
  let rows = [];

  function flushPara() {
    const text = takeText(state, buf);
    buf = "";
    if (collectingCell || tblDepth > 1) {
      if (text) cellParts.push(text);
      return;
    }
    if (!text) return;
    if (heading) blocks.push({ type: level === "1" ? "h2" : "h3", text });
    else blocks.push({ type: "p", text });
  }

  scanXml(xml, (tag) => {
    if (tag.name === "tracked-changes" || tag.name === "annotation" || tag.name === "binary-data" || tag.name === "script") {
      if (tag.closing) skip = Math.max(0, skip - 1);
      else if (!tag.self) skip += 1;
      return;
    }
    if (skip) return;
    buf = odfAppend(buf, tag);
    if (tag.name === "h" || tag.name === "p") {
      if (!tag.closing && !tag.self) {
        heading = tag.name === "h";
        level = attr(tag.raw, "outline-level") || "1";
        capture += 1;
      } else if (tag.closing || tag.self) {
        flushPara();
        capture = Math.max(0, capture - 1);
        heading = false;
      }
      return;
    }
    if (tag.name === "table") {
      if (!tag.closing && !tag.self) {
        tblDepth += 1;
        if (tblDepth === 1) {
          rows = [];
          row = null;
        }
      } else if (tag.closing && tblDepth > 0) {
        if (tblDepth === 1 && rows.length) blocks.push({ type: "table", rows });
        tblDepth -= 1;
      }
      return;
    }
    if (tag.name === "table-row" && tblDepth === 1) {
      if (!tag.closing && !tag.self) row = [];
      else if (tag.closing && row) {
        rows.push(row);
        row = null;
      }
      return;
    }
    if ((tag.name === "table-cell" || tag.name === "covered-table-cell") && tblDepth === 1) {
      if (!tag.closing && !tag.self) {
        collectingCell = true;
        cellParts = [];
      } else if (tag.closing || tag.self) {
        if (buf) flushPara();
        if (row) row.push(cellParts.join("\n").trim());
        cellParts = [];
        collectingCell = false;
      }
    }
  }, (chunk) => {
    if (skip || capture <= 0) return;
    buf += decodeXml(chunk);
  });
  if (buf) flushPara();
  return blocks;
}

function parseOdfSheets(xml, state) {
  const sheets = [];
  let sheet = null;
  let row = null;
  let cell = null;
  let capture = 0;
  let skip = 0;

  function finishCell() {
    if (!row || !cell) return;
    let text = cleanup(cell.parts.join("\n"));
    if (!text && cell.value) text = cell.value;
    text = takeText(state, text);
    const filler = !text && cell.repeat > 1;
    if (filler) {
      cell = null;
      return;
    }
    const times = text && cell.repeat > 1 ? Math.min(cell.repeat, 8) : 1;
    for (let i = 0; i < times; i++) {
      if (row.length >= MAX_COLS) {
        state.truncated = true;
        break;
      }
      row.push(text);
    }
    cell = null;
  }

  scanXml(xml, (tag) => {
    if (tag.name === "tracked-changes" || tag.name === "annotation" || tag.name === "binary-data" || tag.name === "script") {
      if (tag.closing) skip = Math.max(0, skip - 1);
      else if (!tag.self) skip += 1;
      return;
    }
    if (skip) return;
    if (tag.name === "table" && !tag.closing && !tag.self) {
      if (sheets.length >= MAX_SHEETS) {
        state.truncated = true;
        sheet = null;
        return;
      }
      sheet = { title: attr(tag.raw, "name") || ("Sheet " + (sheets.length + 1)), rows: [] };
      return;
    }
    if (tag.name === "table" && tag.closing) {
      if (sheet) sheets.push(sheet);
      sheet = null;
      row = null;
      return;
    }
    if (!sheet) return;
    if (tag.name === "table-row") {
      if (!tag.closing && !tag.self) {
        if (sheet.rows.length >= MAX_ROWS) {
          state.truncated = true;
          row = null;
          return;
        }
        row = [];
      } else if (tag.closing && row) {
        if (row.some((value) => value)) sheet.rows.push(row);
        row = null;
      }
      return;
    }
    if (tag.name === "table-cell" || tag.name === "covered-table-cell") {
      if (!tag.closing && !tag.self) {
        const repeat = parseInt(attr(tag.raw, "number-columns-repeated") || "1", 10) || 1;
        cell = { parts: [], repeat: Math.max(repeat, 1), value: attr(tag.raw, "value") || attr(tag.raw, "string-value") || "" };
      } else finishCell();
      return;
    }
    if (tag.name === "p" || tag.name === "h") {
      if (!tag.closing && !tag.self) capture += 1;
      else capture = Math.max(0, capture - 1);
    }
  }, (chunk) => {
    if (skip || !cell || capture <= 0) return;
    cell.parts.push(decodeXml(chunk));
  });
  return sheets.map((item) => ({ type: "sheet", title: item.title, rows: item.rows }));
}

function parseOdfSlides(xml, state) {
  const slides = [];
  let slide = null;
  let buf = "";
  let capture = 0;
  let skip = 0;

  function flush() {
    const text = takeText(state, buf);
    buf = "";
    if (text && slide) slide.paragraphs.push(text);
  }

  scanXml(xml, (tag) => {
    if (tag.name === "script" || tag.name === "binary-data") {
      if (tag.closing) skip = Math.max(0, skip - 1);
      else if (!tag.self) skip += 1;
      return;
    }
    if (skip) return;
    if (tag.name === "page") {
      if (!tag.closing && !tag.self) {
        if (slides.length >= MAX_SLIDES) {
          state.truncated = true;
          slide = null;
          return;
        }
        slide = { title: attr(tag.raw, "name") || ("Slide " + (slides.length + 1)), paragraphs: [] };
      } else if (tag.closing && slide) {
        if (buf) flush();
        slides.push(slide);
        slide = null;
      }
      return;
    }
    if (!slide) return;
    buf = odfAppend(buf, tag);
    if (tag.name === "p" || tag.name === "h") {
      if (!tag.closing && !tag.self) capture += 1;
      else if (tag.closing || tag.self) {
        flush();
        capture = Math.max(0, capture - 1);
      }
    }
  }, (chunk) => {
    if (skip || !slide || capture <= 0) return;
    buf += decodeXml(chunk);
  });
  return slides.map((item, index) => ({
    type: "slide",
    title: item.title || ("Slide " + (index + 1)),
    paragraphs: item.paragraphs,
    notes: [],
  }));
}

function extractOdf(u8, mode) {
  const got = readNamed(u8, ["content.xml", "mimetype"]);
  const content = got.files["content.xml"];
  if (!content) return fail("OpenDocument content.xml could not be read. Nothing was painted. Download stays below.");
  const state = budget();
  const xml = utf8(content);
  if (mode === "sheet") return okView("sheet", ODS_NOTE, { blocks: parseOdfSheets(xml, state), truncated: state.truncated });
  if (mode === "slides") return okView("slides", ODP_NOTE, { blocks: parseOdfSlides(xml, state), truncated: state.truncated });
  return okView("office", ODT_NOTE, { blocks: parseOdfText(xml, state), truncated: state.truncated });
}

function extractRtf(u8) {
  let s = utf8(u8);
  let truncated = false;
  if (s.length > EXTRACT_TEXT_CAP * 4) {
    s = s.slice(0, EXTRACT_TEXT_CAP * 4);
    truncated = true;
  }
  const skipWords = new Set(["fonttbl", "colortbl", "stylesheet", "info", "pict", "object", "datastore", "xmlnstbl", "themedata", "colorschememapping", "latentstyles", "listtable", "listoverridetable", "rsidtbl", "generator", "nonshppict", "shpinst", "blipuid"]);
  let uc = 1;
  let out = "";
  let i = 0;

  function skipGroup(at) {
    let depth = 0;
    for (let k = at; k < s.length; k++) {
      if (s[k] === "\\" && (s[k + 1] === "{" || s[k + 1] === "}" || s[k + 1] === "\\")) {
        k += 1;
        continue;
      }
      if (s[k] === "{") depth += 1;
      else if (s[k] === "}") {
        depth -= 1;
        if (depth === 0) return k + 1;
      }
    }
    return s.length;
  }

  function destinationAt(at) {
    let j = at + 1;
    while (s[j] === "\r" || s[j] === "\n" || s[j] === " ") j += 1;
    if (s.startsWith("\\*", j)) return true;
    const m = /^\\([a-zA-Z]+)/.exec(s.slice(j));
    return !!(m && skipWords.has(m[1]));
  }

  function skipUc(at, count) {
    let left = count;
    let k = at;
    while (left > 0 && k < s.length) {
      if (s[k] === "\\" && s[k + 1] === "'") {
        k += 4;
        left -= 1;
        continue;
      }
      if (s[k] === "\\" && /[a-zA-Z]/.test(s[k + 1] || "")) {
        const m = /^\\[a-zA-Z]+-?\d* ?/.exec(s.slice(k));
        k += m ? m[0].length : 2;
        left -= 1;
        continue;
      }
      if (s[k] === "\\" && s[k + 1]) {
        k += 2;
        left -= 1;
        continue;
      }
      k += 1;
      left -= 1;
    }
    return k;
  }

  while (i < s.length && out.length < EXTRACT_TEXT_CAP) {
    const c = s[i];
    if (c === "{") {
      if (destinationAt(i)) {
        i = skipGroup(i);
        continue;
      }
      i += 1;
      continue;
    }
    if (c === "}") {
      i += 1;
      continue;
    }
    if (c === "\\") {
      if (s[i + 1] === "\\") { out += "\\"; i += 2; continue; }
      if (s[i + 1] === "{") { out += "{"; i += 2; continue; }
      if (s[i + 1] === "}") { out += "}"; i += 2; continue; }
      if (s[i + 1] === "'") {
        const hex = s.slice(i + 2, i + 4);
        if (/^[0-9a-fA-F]{2}$/.test(hex)) {
          out += safeCp(parseInt(hex, 16));
          i += 4;
          continue;
        }
      }
      const word = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(s.slice(i));
      if (word) {
        const name = word[1];
        const arg = word[2];
        if (name === "par" || name === "line") out += "\n";
        else if (name === "tab") out += "\t";
        else if (name === "uc") uc = Math.max(0, Math.min(parseInt(arg || "1", 10) || 0, 10));
        else if (name === "u") {
          let n = parseInt(arg || "0", 10);
          if (n < 0) n += 65536;
          out += safeCp(n);
          i = skipUc(i + word[0].length, uc);
          continue;
        } else if (name === "bin") {
          const count = Math.max(parseInt(arg || "0", 10) || 0, 0);
          i += word[0].length + count;
          continue;
        } else if (name === "emdash") out += "—";
        else if (name === "endash") out += "–";
        else if (name === "bullet") out += "•";
        else if (name === "lquote") out += "‘";
        else if (name === "rquote") out += "’";
        else if (name === "ldblquote") out += "“";
        else if (name === "rdblquote") out += "”";
        i += word[0].length;
        continue;
      }
      i += 2;
      continue;
    }
    if (c !== "\r") out += c;
    i += 1;
  }
  if (i < s.length) truncated = true;
  const text = cleanup(out);
  const blocks = text ? text.split(/\n{2,}/).map((part) => ({ type: "p", text: cleanup(part) })).filter((block) => block.text) : [];
  return okView("office", RTF_NOTE, { blocks, truncated });
}

function extractHtmlDoc(u8) {
  let s = utf8(u8);
  if (s.includes("\u0000")) s = new TextDecoder("utf-16le", { fatal: false }).decode(u8);
  let truncated = false;
  if (s.length > EXTRACT_TEXT_CAP * 4) {
    s = s.slice(0, EXTRACT_TEXT_CAP * 4);
    truncated = true;
  }
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, " ");
  s = s.replace(/<br\s*\/?\s*>/gi, "\n");
  s = s.replace(/<\/(p|div|h[1-6]|tr|li|blockquote|section)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeXml(s);
  const state = budget();
  const blocks = [];
  for (const part of s.split(/\n+/)) {
    const text = takeText(state, part);
    if (text) blocks.push({ type: "p", text });
    if (state.truncated) break;
  }
  return okView("office", HTML_DOC_NOTE, { blocks, truncated: truncated || state.truncated });
}

function sheetCol(ref) {
  const m = /^([A-Z]+)/.exec(String(ref || "").toUpperCase());
  if (!m) return 0;
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseSharedStrings(xml) {
  const strings = [];
  let cur = "";
  let inSi = false;
  let inT = false;
  scanXml(xml, (tag) => {
    if (tag.name === "si") {
      if (!tag.closing && !tag.self) {
        inSi = true;
        cur = "";
      } else if (tag.closing) {
        strings.push(cleanup(cur));
        inSi = false;
        inT = false;
      }
      return;
    }
    if (tag.name === "t" && inSi) inT = !tag.closing && !tag.self ? true : (tag.closing ? false : inT);
  }, (chunk) => {
    if (inSi && inT) cur += decodeXml(chunk);
  });
  return strings;
}

function parseSheetXml(xml, shared, state) {
  const rows = [];
  let row = null;
  let rowKept = false;
  let cell = null;
  let mode = "";
  scanXml(xml, (tag) => {
    if (tag.name === "row") {
      if (!tag.closing && !tag.self) {
        rowKept = rows.length < MAX_ROWS;
        if (!rowKept) state.truncated = true;
        row = rowKept ? [] : null;
      } else if (tag.closing && row) {
        if (row.some((value) => value)) rows.push(row);
        row = null;
      }
      return;
    }
    if (tag.name === "c" && rowKept) {
      if (!tag.closing && !tag.self) {
        const col = sheetCol(attr(tag.raw, "r"));
        if (col >= MAX_COLS) {
          state.truncated = true;
          cell = null;
          return;
        }
        cell = { col, type: (attr(tag.raw, "t") || "").toLowerCase(), v: "", inline: "", formula: "" };
      } else if (tag.closing && cell && row) {
        let text = "";
        if (cell.type === "s") {
          const index = parseInt(cell.v, 10);
          text = Number.isFinite(index) && shared[index] != null ? shared[index] : "";
        } else if (cell.type === "inlinestr") text = cell.inline;
        else if (cell.type === "b") text = cell.v === "1" ? "TRUE" : (cell.v === "0" ? "FALSE" : cell.v);
        else if (cell.v) text = cell.v;
        else if (cell.formula) text = "formula: " + cell.formula;
        while (row.length < cell.col) row.push("");
        if (row.length < MAX_COLS) row[cell.col] = takeText(state, text);
        cell = null;
        mode = "";
      }
      return;
    }
    if (!cell) return;
    if (tag.name === "v") mode = tag.closing ? "" : "v";
    else if (tag.name === "f") mode = tag.closing ? "" : "f";
    else if (tag.name === "t") mode = tag.closing ? "" : "t";
  }, (chunk) => {
    if (!cell || !mode) return;
    const text = decodeXml(chunk);
    if (mode === "v") cell.v += text;
    else if (mode === "f") cell.formula += text;
    else if (mode === "t") cell.inline += text;
  });
  return rows;
}

function relTarget(relsXml) {
  const map = new Map();
  scanXml(relsXml, (tag) => {
    if (tag.name !== "relationship" || tag.closing) return;
    const id = attr(tag.raw, "id");
    const target = attr(tag.raw, "target");
    if (id && target) map.set(id, target.replace(/\\/g, "/"));
  }, () => {});
  return map;
}

function safeSheetPath(target) {
  let raw = String(target || "").replace(/\\/g, "/").trim();
  if (!raw) return "";
  if (raw.startsWith("/")) raw = raw.replace(/^\/+/, "");
  else if (!/^xl\//i.test(raw)) raw = "xl/" + raw.replace(/^\.\//, "");
  const parts = [];
  for (const part of raw.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) return "";
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  const path = parts.join("/");
  return /^xl\/worksheets\/sheet\d+\.xml$/i.test(path) ? path : "";
}

function extractXlsx(u8) {
  const listed = namesOf(u8);
  if (!listed.ok) return fail("This spreadsheet is not a readable ZIP package (" + listed.error + "). Nothing was painted. Download stays below.");
  if (hasEncryptedPackage(listed.names) && !listed.names.includes("xl/workbook.xml")) {
    return fail("This spreadsheet is an encrypted package. The reader does not decrypt it. Download stays below.");
  }
  const preamble = ["xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/sharedStrings.xml"].filter((name) => listed.names.includes(name));
  const got = readNamed(u8, preamble);
  const workbook = got.files["xl/workbook.xml"] ? utf8(got.files["xl/workbook.xml"]) : "";
  const rels = got.files["xl/_rels/workbook.xml.rels"] ? relTarget(utf8(got.files["xl/_rels/workbook.xml.rels"])) : new Map();
  const shared = got.files["xl/sharedStrings.xml"] ? parseSharedStrings(utf8(got.files["xl/sharedStrings.xml"])) : [];
  const sheets = [];
  if (workbook) {
    scanXml(workbook, (tag) => {
      if (tag.name !== "sheet" || tag.closing) return;
      if (sheets.length >= MAX_SHEETS) return;
      const title = attr(tag.raw, "name") || ("Sheet " + (sheets.length + 1));
      const id = attr(tag.raw, "id");
      const target = safeSheetPath(rels.get(id) || "");
      sheets.push({ title, path: target });
    }, () => {});
  }
  if (!sheets.length) {
    listed.names.filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
      .sort((a, b) => (parseInt(a.replace(/\D/g, ""), 10) || 0) - (parseInt(b.replace(/\D/g, ""), 10) || 0))
      .slice(0, MAX_SHEETS)
      .forEach((path, index) => sheets.push({ title: "Sheet " + (index + 1), path }));
  }
  const paths = sheets.map((sheet) => sheet.path).filter(Boolean);
  if (!paths.length) return fail("This spreadsheet has no readable worksheet. Nothing was painted. Download stays below.");
  const bodies = readNamed(u8, paths);
  const state = budget();
  const blocks = [];
  for (const sheet of sheets) {
    if (!sheet.path || !bodies.files[sheet.path]) continue;
    const rows = parseSheetXml(utf8(bodies.files[sheet.path]), shared, state);
    blocks.push({ type: "sheet", title: sheet.title, rows });
  }
  if (!blocks.length) return fail("Worksheet XML could not be read. Nothing was painted. Download stays below.");
  return okView("sheet", XLSX_NOTE, { blocks, truncated: state.truncated });
}

function slideParagraphs(xml, state) {
  const paragraphs = [];
  let buf = "";
  let capture = 0;
  let inP = false;
  function flush() {
    const text = takeText(state, buf);
    buf = "";
    if (text) paragraphs.push(text);
  }
  scanXml(xml, (tag) => {
    if (tag.name === "p") {
      if (!tag.closing && !tag.self) inP = true;
      else if (inP) {
        flush();
        inP = false;
        capture = 0;
      }
      return;
    }
    if (!inP) return;
    if (tag.name === "br" && (tag.self || !tag.closing)) buf += "\n";
    if (tag.name === "t") {
      if (tag.closing) capture = Math.max(0, capture - 1);
      else if (!tag.self) capture += 1;
    }
  }, (chunk) => {
    if (capture > 0) buf += decodeXml(chunk);
  });
  if (buf) flush();
  return paragraphs;
}

function extractPptx(u8) {
  const listed = namesOf(u8);
  if (!listed.ok) return fail("This slide deck is not a readable ZIP package (" + listed.error + "). Nothing was painted. Download stays below.");
  const slides = listed.names.filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => (parseInt(a.replace(/\D/g, ""), 10) || 0) - (parseInt(b.replace(/\D/g, ""), 10) || 0));
  if (!slides.length) {
    if (hasEncryptedPackage(listed.names)) return fail("This slide deck is an encrypted package. The reader does not decrypt it. Download stays below.");
    return fail("This slide deck has no ppt/slides/slideN.xml. Nothing was painted. Download stays below.");
  }
  const shown = slides.slice(0, MAX_SLIDES);
  const notes = shown.map((name) => name.replace("ppt/slides/slide", "ppt/notesSlides/notesSlide")).filter((name) => listed.names.includes(name));
  const got = readNamed(u8, shown.concat(notes));
  const state = budget();
  if (slides.length > shown.length) state.truncated = true;
  const blocks = shown.map((name, index) => {
    const n = parseInt(name.replace(/\D/g, ""), 10) || (index + 1);
    const body = got.files[name] ? slideParagraphs(utf8(got.files[name]), state) : [];
    const noteName = name.replace("ppt/slides/slide", "ppt/notesSlides/notesSlide");
    const noteBody = got.files[noteName] ? slideParagraphs(utf8(got.files[noteName]), state) : [];
    return { type: "slide", title: "Slide " + n, paragraphs: body, notes: noteBody };
  });
  return okView("slides", PPTX_NOTE, { blocks, truncated: state.truncated });
}

function extractArchive(u8) {
  const listed = listZipEntries(u8);
  if (!listed.ok) {
    const reason = listed.error === "zip64"
      ? "This ZIP uses ZIP64. The reader does not list ZIP64 central directories. Entries were not opened. Download stays below."
      : "This file is labeled as a ZIP archive, but the central directory was not readable. Entries were not opened. Download stays below.";
    return fail(reason);
  }
  const truncated = listed.entries.length > LIST_CAP;
  const entries = listed.entries.slice(0, LIST_CAP).map((entry) => ({
    name: entry.name,
    bytes: entry.bytes,
    encrypted: entry.encrypted,
    directory: entry.directory,
  }));
  return okView("archive", ARCHIVE_NOTE, { entries, truncated });
}

function extractWord(u8) {
  if (isZip(u8)) {
    const listed = namesOf(u8);
    if (!listed.ok) return fail("This Word file is not a readable package (" + listed.error + "). Nothing was painted. Download stays below.");
    if (listed.names.includes("word/document.xml") || (hasEncryptedPackage(listed.names) && !listed.names.includes("content.xml"))) return extractDocx(u8);
    if (listed.names.includes("content.xml")) return extractOdf(u8, "office");
    return fail("This file is labeled as a Word document, but it has no word/document.xml or content.xml. Nothing was painted. Download stays below.");
  }
  if (isRtf(u8)) return extractRtf(u8);
  if (looksHtml(u8)) return extractHtmlDoc(u8);
  if (isOle(u8)) return fail(OLE_DOC);
  return fail("This Word file is not a DOCX package, OpenDocument text, RTF, or HTML. Nothing was painted. Download stays below.");
}

function extractSheet(u8, kind) {
  if (isZip(u8)) {
    const listed = namesOf(u8);
    if (!listed.ok) return fail("This spreadsheet is not a readable package (" + listed.error + "). Nothing was painted. Download stays below.");
    if (listed.names.includes("xl/workbook.xml") || listed.names.some((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))) return extractXlsx(u8);
    if (listed.names.includes("content.xml")) return extractOdf(u8, "sheet");
    if (hasEncryptedPackage(listed.names)) return fail("This spreadsheet is an encrypted package. The reader does not decrypt it. Download stays below.");
  }
  if (kind === "legacy-xls" || isOle(u8)) return fail(BIFF_XLS);
  return fail("This spreadsheet is not an .xlsx or .ods package. Nothing was painted. Download stays below.");
}

function extractSlides(u8, kind) {
  if (isZip(u8)) {
    const listed = namesOf(u8);
    if (!listed.ok) return fail("This slide deck is not a readable package (" + listed.error + "). Nothing was painted. Download stays below.");
    if (listed.names.some((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))) return extractPptx(u8);
    if (listed.names.includes("content.xml")) return extractOdf(u8, "slides");
    if (hasEncryptedPackage(listed.names)) return fail("This slide deck is an encrypted package. The reader does not decrypt it. Download stays below.");
  }
  if (kind === "legacy-ppt" || isOle(u8)) return fail(BIN_PPT);
  return fail("This slide deck is not a .pptx or .odp package. Nothing was painted. Download stays below.");
}

export function extractReaderView(bytes, { kind = "" } = {}) {
  const u8 = asU8(bytes);
  if (!u8.byteLength) return fail("The stored file had no bytes, so the reader did not paint it. Download stays below.");
  if (u8.byteLength > READER_FILE_CAP) return fail(oversizeReaderReason(u8.byteLength));
  if (kind === "archive") return extractArchive(u8);
  if (kind === "office" || kind === "legacy-doc") return extractWord(u8);
  if (kind === "sheet" || kind === "legacy-xls") return extractSheet(u8, kind);
  if (kind === "slides" || kind === "legacy-ppt") return extractSlides(u8, kind);
  return fail("This file type is not opened in the reader. Download stays below.");
}
