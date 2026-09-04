/**
 * Full-structure verify for every file in a record or package.
 * Author: Aziel Eliab.
 */
import { createHash } from "node:crypto";
import { unzipEntries } from "./zip.js";

const ZIP_NAME_RE = /\.(zip|azm|azk|azh|docx|xlsx|pptx|odt|ods|odp)$/i;
const TEXT_NAME_RE = /\.(txt|md|markdown|json|csv|tsv|html|htm|xml|yml|yaml|log|py|js|css)$/i;
const MAX_ZIP_FILES = 4000;
const MAX_ZIP_ENTRY = 40 * 1024 * 1024;

export function sha256hex(buf) {
  return createHash("sha256").update(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).digest("hex");
}

function extOf(name) {
  const base = String(name || "").split("/").pop() || "";
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i).toLowerCase() : "";
}

function mimeFamily(contentType) {
  const ct = String(contentType || "").toLowerCase();
  if (!ct) return "";
  return ct.split(";")[0].trim();
}

export function extensionMatchesMime(filename, contentType) {
  const ext = extOf(filename);
  const mime = mimeFamily(contentType);
  if (!ext || !mime) return true;
  const map = {
    ".txt": ["text/plain"],
    ".md": ["text/markdown", "text/plain"],
    ".json": ["application/json", "text/json", "text/plain"],
    ".csv": ["text/csv", "text/plain"],
    ".pdf": ["application/pdf"],
    ".png": ["image/png"],
    ".jpg": ["image/jpeg"],
    ".jpeg": ["image/jpeg"],
    ".gif": ["image/gif"],
    ".webp": ["image/webp"],
    ".zip": ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
    ".azm": ["application/zip", "application/octet-stream"],
    ".azk": ["application/zip", "application/octet-stream"],
    ".azh": ["application/zip", "application/octet-stream"],
  };
  const allowed = map[ext];
  if (!allowed) return true;
  return allowed.includes(mime);
}

function looksZip(bytes, filename) {
  if (ZIP_NAME_RE.test(String(filename || ""))) return true;
  if (!bytes || bytes.length < 4) return false;
  return bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07);
}

export function verifyZipStructure(bytes, { filename = "archive.zip" } = {}) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const files = [];
  const errors = [];
  let entries;
  try {
    entries = unzipEntries(u8);
  } catch (err) {
    return { ok: false, kind: "zip", filename, files: [], errors: [String(err && err.message ? err.message : err)] };
  }
  const names = Object.keys(entries);
  if (names.length > MAX_ZIP_FILES) errors.push("too many zip entries (" + names.length + ")");
  for (const name of names) {
    if (name.includes("..") || name.startsWith("/") || name.startsWith("\\")) {
      errors.push("unsafe zip path: " + name);
      continue;
    }
    const buf = entries[name];
    const size = buf ? buf.length : 0;
    if (size > MAX_ZIP_ENTRY) errors.push("zip entry too large: " + name);
    files.push({
      path: name,
      bytes: size,
      sha256: buf ? sha256hex(buf) : null,
    });
  }
  if (/\.azm$/i.test(filename) || /\.azk$/i.test(filename)) {
    if (!entries["manifest.json"]) errors.push("Aziel package missing manifest.json");
    if (!entries["integrity.json"]) errors.push("Aziel package missing integrity.json");
  }
  return { ok: errors.length === 0, kind: "zip", filename, files, errors };
}

export function verifyBytes(bytes, { filename = "file", contentType = "" } = {}) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const errors = [];
  const digest = sha256hex(u8);
  if (filename && !extensionMatchesMime(filename, contentType)) {
    errors.push("filename extension does not match declared content-type");
  }
  if (TEXT_NAME_RE.test(filename) || String(contentType).toLowerCase().startsWith("text/")) {
    const sample = new TextDecoder("utf-8", { fatal: false }).decode(u8.subarray(0, Math.min(u8.length, 4096)));
    if (sample.includes("\u0000")) errors.push("text file contains NUL bytes");
  }
  if (looksZip(u8, filename)) {
    const zip = verifyZipStructure(u8, { filename });
    return {
      ok: zip.ok && errors.length === 0,
      kind: "zip",
      filename,
      content_type: contentType || null,
      sha256: digest,
      byte_size: u8.length,
      files: zip.files,
      errors: errors.concat(zip.errors),
    };
  }
  return {
    ok: errors.length === 0,
    kind: "file",
    filename,
    content_type: contentType || null,
    sha256: digest,
    byte_size: u8.length,
    files: [{ path: filename || "file", bytes: u8.length, sha256: digest }],
    errors,
  };
}

export function verifyTextRecord({ title = "", body = "" } = {}) {
  const text = String(body || title || "");
  const bytes = new TextEncoder().encode(text);
  return verifyBytes(bytes, { filename: "record.txt", contentType: "text/plain" });
}
