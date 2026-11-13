/**
 * PDF page count for the library reader.
 * Walks the trailer /Root page tree. A number is returned only when every
 * visited node resolves and each /Count matches the leaves under it.
 * Encrypted files, unreadable object streams, and disagreements return
 * pages: null. This does not invent a count.
 * Author: Aziel Eliab.
 */

const MAX_NODES = 2000;
const MAX_DEPTH = 16;
const MAX_PAGES = 5000;

function asLatin1(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const dec = new TextDecoder("latin1");
  return dec.decode(u8);
}

function dictHead(body) {
  const stream = body.search(/\bstream\b/);
  return stream >= 0 ? body.slice(0, stream) : body;
}

function lastObject(text, num, gen) {
  const token = String(num) + " " + String(gen) + " obj";
  let from = text.length;
  while (from > 0) {
    const at = text.lastIndexOf(token, from);
    if (at < 0) return "";
    const prev = at === 0 ? "\n" : text[at - 1];
    if (prev === "\n" || prev === "\r" || at === 0) {
      const end = text.indexOf("endobj", at);
      if (end > at) return text.slice(at, end);
    }
    from = at - 1;
    if (from < 0) break;
  }
  return "";
}

function directInt(head, key) {
  const match = head.match(new RegExp("/" + key + "\\s+(\\d+)\\b"));
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isSafeInteger(n) ? n : null;
}

function kidsOf(head) {
  const match = head.match(/\/Kids\s*\[([^\]]*)\]/);
  if (!match) return null;
  const refs = [];
  const re = /(\d+)\s+(\d+)\s+R\b/g;
  let item;
  while ((item = re.exec(match[1]))) {
    refs.push({ n: Number(item[1]), g: Number(item[2]) });
  }
  return refs;
}

function trailerSlice(text) {
  const startxref = text.lastIndexOf("startxref");
  const head = startxref >= 0 ? text.slice(Math.max(0, startxref - 8000), startxref) : text.slice(-8000);
  const at = head.lastIndexOf("trailer");
  if (at < 0) return "";
  return head.slice(at);
}

function walk(text, num, gen, depth, seen, state) {
  if (depth > MAX_DEPTH) return { fail: "unresolved" };
  const id = num + " " + gen;
  if (seen.has(id)) return { fail: "unresolved" };
  seen.add(id);
  state.nodes += 1;
  if (state.nodes > MAX_NODES) return { fail: "unresolved" };
  const body = lastObject(text, num, gen);
  if (!body) return { fail: "unresolved" };
  const head = dictHead(body);
  if (/\/Type\s*\/Page(?!s)/.test(head)) return { n: 1 };
  if (!/\/Type\s*\/Pages\b/.test(head)) return { fail: "unresolved" };
  const declared = directInt(head, "Count");
  const kids = kidsOf(head);
  if (!kids || declared == null) return { fail: "unresolved" };
  let sum = 0;
  for (const kid of kids) {
    const part = walk(text, kid.n, kid.g, depth + 1, seen, state);
    if (part.fail) return part;
    sum += part.n;
    if (sum > MAX_PAGES) return { fail: "unresolved" };
  }
  if (sum !== declared) return { fail: "mismatch" };
  return { n: sum };
}

/**
 * @param {Uint8Array|ArrayBuffer|null} bytes
 * @returns {{pages:number|null, reason:string}}
 */
export function pdfPageCount(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : (bytes && bytes.byteLength != null ? new Uint8Array(bytes) : null);
  if (!u8 || u8.byteLength < 8) return { pages: null, reason: "not-pdf" };
  let text = "";
  try {
    text = asLatin1(u8);
  } catch {
    return { pages: null, reason: "unresolved" };
  }
  if (!text.startsWith("%PDF-")) return { pages: null, reason: "not-pdf" };
  const trailer = trailerSlice(text);
  if (!trailer) return { pages: null, reason: "unresolved" };
  if (/\/Encrypt\b/.test(trailer)) return { pages: null, reason: "encrypted" };
  const root = trailer.match(/\/Root\s+(\d+)\s+(\d+)\s+R\b/);
  if (!root) return { pages: null, reason: "unresolved" };
  const catalog = dictHead(lastObject(text, Number(root[1]), Number(root[2])));
  if (!catalog) return { pages: null, reason: "unresolved" };
  const pages = catalog.match(/\/Pages\s+(\d+)\s+(\d+)\s+R\b/);
  if (!pages) return { pages: null, reason: "unresolved" };
  const walked = walk(text, Number(pages[1]), Number(pages[2]), 0, new Set(), { nodes: 0 });
  if (walked.fail) return { pages: null, reason: walked.fail };
  if (!Number.isSafeInteger(walked.n) || walked.n < 0) return { pages: null, reason: "unresolved" };
  return { pages: walked.n, reason: "" };
}
