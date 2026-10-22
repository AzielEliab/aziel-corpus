/**
 * CORPUS-INTAKE-SAFETY-1.0 — the screening budget (AZBot review, intake-gate.js:57:
 * 15-21 MiB of text took ~13-18 s of CPU to screen, with no explicit budget).
 * An item too large to screen inside the Worker CPU and memory limits is REFUSED
 * INTAKE-TOO-LARGE (413) before the text checks run: never passed unscreened, never
 * truncated to a screenable prefix. A normal 6 MiB paper still passes.
 * Benign filler and reserved synthetic tokens only. Author: Aziel Eliab.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { screenIntake, INTAKE_REASONS, IntakeRefusal, MAX_SCREEN_BYTES as GATE_BYTES, MAX_SCREEN_CHARS as GATE_CHARS } from "./intake-gate.js";
import { TOO_LARGE_CODE, MAX_SCREEN_BYTES, MAX_SCREEN_CHARS, utf8Length, overScreenBytes } from "./intake-budget.js";
import { textChecks, SYNTHETIC, TEXT_REASONS } from "./intake-text.js";
import { intakeStubEnv, contentWritten } from "./fixtures/intake-env.js";
import * as M from "./fixtures/synthetic-media.js";

const KiB = 1024;
const MiB = 1024 * KiB;
const enc = new TextEncoder();
const WORDS = "The river rose two metres in the spring of that year and the survey team recorded the change. ";
const prose = (n) => WORDS.repeat(Math.ceil(n / WORDS.length)).slice(0, n);
// Benign font-program bytes, 0x80-0xFE only (no ASCII: no PDF name or media magic by chance).
function fontBytes(n, seed = 11) {
  const u8 = new Uint8Array(n);
  for (let i = 0; i < n; i++) { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; u8[i] = 0x80 + ((seed >>> 24) % 0x7f); }
  return u8;
}
/** A text-only PDF of exactly `size` bytes holding `text`. */
function paperPdf(size, text) {
  let f = size - M.pdfPaper(text, new Uint8Array(0)).length;
  while (M.pdfPaper(text, new Uint8Array(f)).length > size) f--;
  const u8 = M.pdfPaper(text, fontBytes(f));
  assert.equal(u8.length, size);
  return u8;
}
const cpu = async (fn) => { const t = process.cpuUsage(); const r = await fn(); const u = process.cpuUsage(t); return [r, (u.user + u.system) / 1000]; };
const refusedTooLarge = (env, extra = {}) => (e) => {
  assert.ok(e instanceof IntakeRefusal);
  assert.equal(e.code, INTAKE_REASONS.TOO_LARGE);
  assert.equal(e.status, 413);
  assert.equal(e.receipt.reason_code, "INTAKE-TOO-LARGE");
  assert.equal(e.receipt.stored, false);
  assert.equal(e.receipt.chained, false);
  assert.ok(!JSON.stringify(e.receipt).includes(SYNTHETIC.MINOR), "receipt holds no content");
  assert.equal(contentWritten(env), false, "nothing written");
  for (const [k, v] of Object.entries(extra)) assert.equal(e.receipt[k], v, k);
  return true;
};

test("budget: the code and the limits", () => {
  assert.equal(INTAKE_REASONS.TOO_LARGE, "INTAKE-TOO-LARGE");
  assert.equal(TOO_LARGE_CODE, "INTAKE-TOO-LARGE");
  assert.equal(MAX_SCREEN_BYTES, 6 * MiB);
  assert.equal(MAX_SCREEN_CHARS, 2 * MiB);
  assert.equal(GATE_BYTES, MAX_SCREEN_BYTES);
  assert.equal(GATE_CHARS, MAX_SCREEN_CHARS);
});

test("budget: a normal 6 MiB text-only paper (PDF, exactly 6 MiB) passes the upload door", async () => {
  const env = intakeStubEnv();
  const file = new File([paperPdf(6 * MiB, prose(1 * MiB))], "paper.pdf", { type: "application/pdf" });
  const ctx = await screenIntake(env, { door: "upload", title: "Spring survey", body: "River levels, 2019-2024.", signed: { user_id: "u-budget1" }, ip: "198.51.100.60", file });
  assert.ok(ctx && ctx.file, "passed the gate");
  // The operator door too.
  const ctx2 = await screenIntake(intakeStubEnv(), { door: "operator-library-ingest", operator: true, title: "Spring survey", file });
  assert.ok(ctx2 && ctx2.file, "operator passed");
});

test("budget: 6 MiB + 1 byte is refused INTAKE-TOO-LARGE (413), fast, public and operator, nothing written", async () => {
  for (const operator of [false, true]) {
    const env = intakeStubEnv();
    const body = prose(6 * MiB) + ".";
    const [, ms] = await cpu(() => screenIntake(env, { door: "upload", operator, title: "Notes", signed: { user_id: "u-budget2" }, ip: "198.51.100.61", file: new File([body], "paper.txt", { type: "text/plain" }) }).then(
      () => assert.fail("must refuse"),
      (e) => refusedTooLarge(env)(e),
    ));
    assert.ok(ms < 1500, "refused before the text checks run (" + ms.toFixed(0) + " ms CPU)");
  }
});

test("budget: over the budget is refused, never truncated (a marker far past the cap, or none at all)", async () => {
  const env = intakeStubEnv();
  // Benign over-budget content does not pass unscreened.
  await assert.rejects(screenIntake(env, { door: "upload", title: "Notes", file: new File([prose(7 * MiB)], "a.txt", { type: "text/plain" }) }), refusedTooLarge(env));
  // A marker at the very start: the item is refused (TOO_LARGE), not screened as a prefix and passed.
  const env2 = intakeStubEnv();
  const marked = SYNTHETIC.MINOR + " " + SYNTHETIC.SEXUAL + "\n" + prose(7 * MiB);
  await assert.rejects(screenIntake(env2, { door: "upload", title: "Notes", file: new File([marked], "a.txt", { type: "text/plain" }) }), refusedTooLarge(env2));
});

test("budget: typed fields over 6 MiB are refused too (no file)", async () => {
  const env = intakeStubEnv();
  await assert.rejects(screenIntake(env, { door: "upload", title: "Notes", body: prose(6 * MiB + 1) }), refusedTooLarge(env));
  const env2 = intakeStubEnv();
  await assert.rejects(screenIntake(env2, { door: "upload", title: "Notes", texts: [prose(3 * MiB), prose(3 * MiB + 1)] }), refusedTooLarge(env2));
  // Multi-byte text is counted in UTF-8 bytes.
  const env3 = intakeStubEnv();
  await assert.rejects(screenIntake(env3, { door: "upload", title: "Notes", body: "\u00e9".repeat(3 * MiB + 1) }), refusedTooLarge(env3));
});

test("budget: extracted text over 2 Mi chars is refused even when the file is small (PDF / docx inflate)", async () => {
  const big = prose(MAX_SCREEN_CHARS + 1);
  const pdf = M.pdfWithText(big);
  assert.ok(pdf.length < 1 * MiB, "compressed PDF is small");
  assert.deepEqual(await textChecks.run({ operator: false, file: { name: "p.pdf", bytes: pdf } }), { code: "INTAKE-TOO-LARGE", status: 413 });
  const env = intakeStubEnv();
  await assert.rejects(screenIntake(env, { door: "upload", title: "Notes", file: new File([pdf], "p.pdf", { type: "application/pdf" }) }), refusedTooLarge(env));
  const docx = M.docxWithXml("<w:p><w:r><w:t>" + big + "</w:t></w:r></w:p>");
  assert.deepEqual(await textChecks.run({ operator: true, file: { name: "p.docx", bytes: docx } }), { code: "INTAKE-TOO-LARGE", status: 413 }, "operator too");
  // Fields and file text add up.
  assert.deepEqual(await textChecks.run({ operator: false, body: prose(MiB + 1), file: { name: "p.txt", bytes: enc.encode(prose(MiB)) } }), { code: "INTAKE-TOO-LARGE", status: 413 });
});

test("budget: text right at the char budget is still screened (passes when benign, refused with its own code when not)", async () => {
  const filler = "a".repeat(MAX_SCREEN_CHARS - 64);
  assert.equal(await textChecks.run({ operator: false, file: { name: "p.txt", bytes: enc.encode(filler) } }), null);
  const res = await textChecks.run({ operator: true, file: { name: "p.txt", bytes: enc.encode(filler + "\n" + SYNTHETIC.MINOR + " " + SYNTHETIC.SEXUAL + "\n") } });
  assert.equal(res && res.code, TEXT_REASONS.CSAM_INDICATOR);
});

test("budget: over 25 MiB is still INTAKE-UNREADABLE (transport ceiling, unchanged)", async () => {
  const env = intakeStubEnv();
  await assert.rejects(
    screenIntake(env, { door: "upload", title: "Notes", file: new File([new Uint8Array(25 * MiB + 1)], "a.bin") }),
    (e) => e.code === INTAKE_REASONS.UNREADABLE && e.status === 413 && !contentWritten(env),
  );
});

test("budget: utf8Length and overScreenBytes", () => {
  for (const s of ["", "abc", "\u00e9\u20ac", "\ud83d\ude00x", "\ud800lonely", "x\udc00"]) assert.equal(utf8Length(s), Buffer.byteLength(s, "utf8"), JSON.stringify(s));
  assert.equal(overScreenBytes({ file: { bytes: new Uint8Array(MAX_SCREEN_BYTES) } }), false, "exactly 6 MiB passes");
  assert.equal(overScreenBytes({ file: { bytes: new Uint8Array(MAX_SCREEN_BYTES + 1) } }), true);
  assert.equal(overScreenBytes({ title: "t", body: "x".repeat(MAX_SCREEN_BYTES - 1) }), false);
  assert.equal(overScreenBytes({ title: "tt", body: "x".repeat(MAX_SCREEN_BYTES - 1) }), true);
});
