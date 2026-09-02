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
