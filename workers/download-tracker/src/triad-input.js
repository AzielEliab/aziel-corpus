/**
 * TRIAD input gate. A published number is the cycle mean of document text.
 * Filename, author, domain, subjects, and keywords are a filing stub.
 * Scoring that stub is how display 45 (cycle mean ~0.4478) covered the shelf.
 * Author: Aziel Eliab.
 */

const WORD_RE = /[A-Za-z]{3,}/g;

export function wordsOf(text) {
  return String(text || "").match(WORD_RE) || [];
}

export function hasExtractableWords(text) {
  return wordsOf(text).length > 0;
}

export function isPdfDocument({ filename, contentType, bytes } = {}) {
  const name = String(filename || "").toLowerCase();
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("pdf") || name.endsWith(".pdf")) return true;
  let u8 = null;
  if (bytes instanceof Uint8Array) u8 = bytes;
  else if (bytes instanceof ArrayBuffer) u8 = new Uint8Array(bytes);
  if (u8 && u8.length >= 5) {
    let head = "";
    for (let i = 0; i < 5; i++) head += String.fromCharCode(u8[i]);
    if (head === "%PDF-") return true;
  }
  return false;
}

function fieldWordSet(input = {}) {
  const bag = [input.filename, input.author, input.domain, input.subjects, input.keywords, input.title]
    .filter(Boolean)
    .join(" ");
  const set = new Set();
  for (const w of wordsOf(bag)) set.add(w.toLowerCase());
  return set;
}

/**
 * Document text has words that are not the filing fields.
 * Three extra words is enough prose. A stub has none.
 */
export function bodyIsDocumentText(input = {}) {
  const bodyWords = wordsOf(input.body || input.content || "");
  if (bodyWords.length < 3) return false;
  const fields = fieldWordSet(input);
  let extra = 0;
  for (const w of bodyWords) {
    if (!fields.has(w.toLowerCase())) extra += 1;
    if (extra >= 3) return true;
  }
  return false;
}

/**
 * pdf + bytesLoaded + extractedText describe a file read.
 * When those are omitted, a PDF whose body is only a filing stub is unread
 * (cron may still load the file). A loaded PDF with no words is settled unavailable.
 */
export function classifyTriadInput(input = {}) {
  const pdf = input.pdf != null ? !!input.pdf : isPdfDocument(input);
  if (pdf) {
    const loaded = input.bytesLoaded != null
      ? !!input.bytesLoaded
      : !!(input.bytes && ((input.bytes.byteLength || input.bytes.length || 0) > 0));
    const extracted = input.extractedText != null ? input.extractedText : (input.extracted_text || "");
    if (loaded) {
      if (hasExtractableWords(extracted)) {
        return { triad_input: "document_text", text: String(extracted), settled: true };
      }
      return { triad_input: "no_extractable_text", text: "", settled: true };
    }
    if (bodyIsDocumentText(input)) {
      return { triad_input: "document_text", text: String(input.body || input.content || ""), settled: true };
    }
    return { triad_input: "unread", text: "", settled: false };
  }
  if (bodyIsDocumentText(input)) {
    return { triad_input: "document_text", text: String(input.body || input.content || ""), settled: true };
  }
  return { triad_input: "filing_stub", text: "", settled: true };
}

export function triadInputFromRow(row) {
  if (!row || typeof row !== "object") return "";
  if (row.triad_input) return String(row.triad_input);
  let review = row.review && typeof row.review === "object" ? row.review : null;
  if (!review && row.review_json) {
    try {
      review = typeof row.review_json === "string" ? JSON.parse(row.review_json) : row.review_json;
    } catch {
      review = null;
    }
  }
  const input = review && review.triad && review.triad.triad_input;
  return input ? String(input) : "";
}
