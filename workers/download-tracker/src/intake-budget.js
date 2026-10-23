/**
 * CORPUS-INTAKE-SAFETY-1.0 — the screening budget.
 *
 * The text checks are linear, but their cost and memory still grow with the size
 * of what they screen. A Worker isolate has a CPU limit (30 s per request on the
 * paid plan by default; wrangler.toml sets no [limits] cpu_ms) and a 128 MB memory
 * limit. An item too large to screen safely inside both is REFUSED with
 * INTAKE-TOO-LARGE (HTTP 413) before the expensive checks run. It is never passed
 * unscreened and never cut down to a screenable prefix.
 *
 * The budget is a size budget, not a clock: Date.now() does not advance while
 * synchronous code runs in a Worker, so a wall-clock guard cannot stop a long scan.
 * Measurements and the reasons for these numbers are in
 * docs/designs/CORPUS-INTAKE-SAFETY-1.0.md §8. Author: Aziel Eliab.
 */

export const TOO_LARGE_CODE = "INTAKE-TOO-LARGE";

/**
 * Bytes of one item the gate will screen, checked before anything is parsed: the
 * file, and separately the typed fields (title, body, texts) as UTF-8. A 6 MiB
 * paper (exactly 6 MiB) passes this check.
 */
export const MAX_SCREEN_BYTES = 6 * 1024 * 1024;

/**
 * Characters of text the text checks will screen in one item: the typed fields
 * plus every text part taken out of the file (a PDF or a docx can hold more text
 * than its compressed size).
 */
export const MAX_SCREEN_CHARS = 2 * 1024 * 1024;

/** UTF-8 byte length without building a copy of the string. */
export function utf8Length(s) {
  const t = String(s == null ? "" : s);
  let n = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < t.length && (t.charCodeAt(i + 1) & 0xfc00) === 0xdc00) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

/** True when the file or the typed fields are over MAX_SCREEN_BYTES. */
export function overScreenBytes(ctx) {
  if (!ctx) return false;
  if (ctx.file && ctx.file.bytes instanceof Uint8Array && ctx.file.bytes.byteLength > MAX_SCREEN_BYTES) return true;
  let n = 0;
  for (const t of [ctx.title, ctx.body, ...(Array.isArray(ctx.texts) ? ctx.texts : [])]) {
    n += utf8Length(t);
    if (n > MAX_SCREEN_BYTES) return true;
  }
  return false;
}
