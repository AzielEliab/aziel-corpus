import { inflateRawSync } from "node:zlib";

/** Minimal ZIP reader (store + deflate). Author: Aziel Eliab. */
export function unzipEntries(input) {
  const u8 = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eocd = -1;
  const start = Math.max(0, u8.length - 65557);
  for (let i = u8.length - 22; i >= start; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip archive");
  const n = view.getUint16(eocd + 10, true);
  let cd = view.getUint32(eocd + 16, true);
  const files = {};
  for (let i = 0; i < n; i++) {
    if (view.getUint32(cd, true) !== 0x02014b50) throw new Error("bad zip central directory");
    const method = view.getUint16(cd + 10, true);
    const comp = view.getUint32(cd + 20, true);
    const nameLen = view.getUint16(cd + 28, true);
    const extraLen = view.getUint16(cd + 30, true);
    const commentLen = view.getUint16(cd + 32, true);
    const localOff = view.getUint32(cd + 42, true);
    const name = new TextDecoder("utf-8").decode(u8.subarray(cd + 46, cd + 46 + nameLen));
    const localNameLen = view.getUint16(localOff + 26, true);
    const localExtra = view.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + localNameLen + localExtra;
    const data = u8.subarray(dataStart, dataStart + comp);
    let out;
    if (method === 0) out = data;
    else if (method === 8) {
      const inflated = inflateRawSync(data);
      out = inflated instanceof Uint8Array ? inflated : new Uint8Array(inflated);
    } else throw new Error("unsupported zip method " + method + " for " + name);
    files[name] = out;
    cd += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

export function zipText(files, name) {
  const buf = files[name] || files[name.replace(/^\.\//, "")] || null;
  if (!buf) return null;
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

const MAX_ENTRY_OUT = 8 * 1024 * 1024;
const MAX_TOTAL_OUT = 12 * 1024 * 1024;

function asZipBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (!input) return new Uint8Array();
  return new Uint8Array(input);
}

function normZipName(name) {
  return String(name || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

/** Central directory only. Does not inflate entry bytes. */
function locateZipCentral(u8) {
  if (!u8 || u8.length < 22) return { ok: false, error: "not a zip archive" };
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eocd = -1;
  const start = Math.max(0, u8.length - 65557);
  for (let i = u8.length - 22; i >= start; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return { ok: false, error: "not a zip archive" };
  const total = view.getUint16(eocd + 10, true);
  const cdOff = view.getUint32(eocd + 16, true);
  if (total === 0xffff || cdOff === 0xffffffff) return { ok: false, error: "zip64" };
  if (cdOff > u8.length) return { ok: false, error: "central directory is outside the file" };
  return { ok: true, view, total, cdOff, error: "" };
}

/**
 * Names and sizes from the ZIP central directory.
 * Entries are not inflated and not executed.
 */
export function listZipEntries(input) {
  const u8 = asZipBytes(input);
  const loc = locateZipCentral(u8);
  if (!loc.ok) return { ok: false, entries: [], error: loc.error };
  const { view, total, cdOff } = loc;
  const entries = [];
  let cd = cdOff;
  for (let i = 0; i < total; i++) {
    if (cd + 46 > u8.length || view.getUint32(cd, true) !== 0x02014b50) {
      return { ok: false, entries: [], error: "bad zip central directory" };
    }
    const flags = view.getUint16(cd + 8, true);
    const method = view.getUint16(cd + 10, true);
    const comp = view.getUint32(cd + 20, true);
    const uncomp = view.getUint32(cd + 24, true);
    const nameLen = view.getUint16(cd + 28, true);
    const extraLen = view.getUint16(cd + 30, true);
    const commentLen = view.getUint16(cd + 32, true);
    const localOff = view.getUint32(cd + 42, true);
    const nameStart = cd + 46;
    const nameEnd = nameStart + nameLen;
    if (nameEnd > u8.length) return { ok: false, entries: [], error: "bad zip central directory" };
    const name = normZipName(new TextDecoder("utf-8", { fatal: false }).decode(u8.subarray(nameStart, nameEnd)));
    entries.push({
      name,
      bytes: uncomp === 0xffffffff ? null : uncomp,
      compressed: comp === 0xffffffff ? null : comp,
      method,
      encrypted: (flags & 1) === 1,
      directory: name.endsWith("/"),
      localOff,
    });
    cd = nameEnd + extraLen + commentLen;
  }
  return { ok: true, entries, error: "" };
}

function readableZipName(name) {
  if (!name || name.endsWith("/")) return false;
  if (name.startsWith("/") || name.includes("\0")) return false;
  if (name.split("/").some((part) => !part || part === "..")) return false;
  return true;
}

/** Inflate only the named entries. Unsafe paths are skipped, never joined. */
export function readZipFiles(input, names, { maxEntry = MAX_ENTRY_OUT, maxTotal = MAX_TOTAL_OUT } = {}) {
  const wanted = new Set((names || []).map(normZipName));
  const listed = listZipEntries(input);
  if (!listed.ok) return { ok: false, files: {}, errors: [listed.error || "not a zip archive"] };
  const u8 = asZipBytes(input);
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const files = {};
  const errors = [];
  let total = 0;
  for (const entry of listed.entries) {
    if (!wanted.has(entry.name)) continue;
    if (!readableZipName(entry.name)) {
      errors.push("skipped unsafe path: " + entry.name);
      continue;
    }
    if (entry.encrypted) {
      errors.push("encrypted: " + entry.name);
      continue;
    }
    if (entry.bytes != null && entry.bytes > maxEntry) {
      errors.push("entry too large: " + entry.name);
      continue;
    }
    const localOff = entry.localOff;
    if (localOff + 30 > u8.length || view.getUint32(localOff, true) !== 0x04034b50) {
      errors.push("bad local header: " + entry.name);
      continue;
    }
    const localNameLen = view.getUint16(localOff + 26, true);
    const localExtra = view.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + localNameLen + localExtra;
    const compLen = entry.compressed == null ? 0 : entry.compressed;
    if (dataStart + compLen > u8.length) {
      errors.push("entry data out of range: " + entry.name);
      continue;
    }
    const data = u8.subarray(dataStart, dataStart + compLen);
    try {
      let out;
      if (entry.method === 0) {
        if (data.length > maxEntry) throw new Error("entry too large");
        out = data;
      } else if (entry.method === 8) {
        const cap = Math.min(maxEntry, entry.bytes > 0 ? entry.bytes : maxEntry);
        const inflated = inflateRawSync(data, { maxOutputLength: cap });
        out = inflated instanceof Uint8Array ? inflated : new Uint8Array(inflated);
      } else throw new Error("unsupported zip method " + entry.method);
      if (out.length > maxEntry) throw new Error("entry too large");
      total += out.length;
      if (total > maxTotal) throw new Error("extracted bytes are over the reader cap");
      files[entry.name] = out;
    } catch (err) {
      errors.push(entry.name + ": " + String(err && err.message ? err.message : err));
    }
  }
  return { ok: errors.length === 0, files, errors };
}
