// The screening char budget is enforced while a PDF is read (AZBot review of #192):
// inflate output is capped at the budget, a literal or <hex> string bigger than what is
// left refuses before it is decoded or tokenized, and every screened view is charged.
// Synthetic, benign inputs only.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { fileTexts, textChecks } from "./intake-text.js";
import { pdfStreams, pdfDecodeStream } from "./intake-media.js";
import { MAX_SCREEN_CHARS } from "./intake-budget.js";

const MiB = 1024 * 1024;
const TOO_LARGE = { code: "INTAKE-TOO-LARGE", status: 413 };
const rep = (u, n) => u.repeat(Math.ceil(n / u.length)).slice(0, n);
/** Minimal PDF: catalog, pages, page, then the given streams ({ data, flate, dict }). */
function pdf(streams) {
  const parts = [Buffer.from("%PDF-1.7\n")];
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"];
  objs.forEach((o, i) => parts.push(Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`)));
  streams.forEach((s, i) => {
    const body = s.flate === false ? Buffer.from(s.data, "latin1") : deflateSync(Buffer.from(s.data, "latin1"));
    const dict = (s.flate === false ? "" : "/Filter /FlateDecode ") + (s.dict || "");
    parts.push(Buffer.from(`${i + 4} 0 obj\n<< ${dict}/Length ${body.length} >>\nstream\n`), body, Buffer.from("\nendstream\nendobj\n"));
  });
  parts.push(Buffer.from("trailer\n<< /Root 1 0 R >>\n%%EOF\n"));
  return new Uint8Array(Buffer.concat(parts));
}
const run = (bytes) => textChecks.run({ operator: false, file: { name: "a.pdf", bytes } });

test("screen budget: a 32 KB PDF that inflates to 31 MiB refuses INTAKE-TOO-LARGE with no OOM at a 128 MB heap", () => {
  const dir = fileURLToPath(new URL(".", import.meta.url));
  const script = `
    import { deflateSync } from "node:zlib";
    import { screenIntake } from "./intake-gate.js";
    import { intakeStubEnv, contentWritten } from "./fixtures/intake-env.js";
    const Mi = 1048576, rep = (u, n) => u.repeat(Math.ceil(n / u.length)).slice(0, n);
    const pdf = (bodies) => { const p = [Buffer.from("%PDF-1.7\\n1 0 obj\\n<< /Type /Catalog /Pages 2 0 R >>\\nendobj\\n2 0 obj\\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\\nendobj\\n3 0 obj\\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\\nendobj\\n")];
      bodies.forEach((b, i) => { const z = deflateSync(Buffer.from(b)); p.push(Buffer.from((i + 4) + " 0 obj\\n<< /Filter /FlateDecode /Length " + z.length + " >>\\nstream\\n"), z, Buffer.from("\\nendstream\\nendobj\\n")); });
      p.push(Buffer.from("trailer\\n<< /Root 1 0 R >>\\n%%EOF\\n")); return Buffer.concat(p); };
    const shapes = {
      one: pdf(["BT /F1 12 Tf 72 712 Td (" + rep("ab ", 31 * Mi) + ") Tj ET"]),
      many: pdf(Array.from({ length: 31 }, () => "BT /F1 12 Tf (" + rep("ab ", Mi - 40) + ") Tj ET")),
      tj: pdf(["BT /F1 12 Tf " + rep("(a) Tj ", 31 * Mi) + " ET"]),
    };
    for (const [k, b] of Object.entries(shapes)) {
      const env = intakeStubEnv(); let r;
      try { await screenIntake(env, { door: "upload", title: "Notes", signed: { user_id: "u" }, file: new File([b], "a.pdf") }); r = "PASS"; }
      catch (e) { r = e.code + " " + e.status; }
      console.log(k, b.length, r, contentWritten(env));
    }`;
  const p = spawnSync(process.execPath, ["--max-old-space-size=128", "--input-type=module", "-e", script], { cwd: dir, encoding: "utf8", timeout: 120000 });
  assert.equal(p.status, 0, "no crash / OOM: " + (p.stderr || "").slice(-400));
  const lines = p.stdout.trim().split("\n").map((l) => l.split(" "));
  assert.equal(lines.length, 3);
  for (const [k, size, code, status, written] of lines) {
    assert.ok(Number(size) < 128 * 1024, k + ": a small file");
    assert.equal(code + " " + status, "INTAKE-TOO-LARGE 413", k);
    assert.equal(written, "false", k + ": nothing written");
  }
});

test("screen budget: inflate is capped at the budget and an overflow is told apart from a bad stream", () => {
  const { streams } = pdfStreams(pdf([{ data: "BT (" + rep("ab ", 5000) + ") Tj ET" }]));
  const info = {};
  assert.equal(pdfDecodeStream(streams[0], 1000, info), null);
  assert.equal(info.tooLarge, true, "overflow flagged");
  const ok = {};
  assert.ok(pdfDecodeStream(streams[0], 100000, ok));
  assert.equal(ok.tooLarge, undefined);
  const bad = {};
  const { streams: bs } = pdfStreams(pdf([{ data: "x", dict: "" }]));
  bs[0].bytes = new Uint8Array([1, 2, 3, 4]); // not zlib
  assert.equal(pdfDecodeStream(bs[0], 100000, bad), null);
  assert.equal(bad.tooLarge, undefined, "a bad stream is not 'too large'");
});

test("screen budget: a literal or <hex> string bigger than what is left refuses before it is decoded", async () => {
  const lit = (n) => pdf([{ data: "BT (" + rep("ab ", n) + ") Tj ET", flate: false }]);
  assert.equal((await fileTexts({ name: "a.pdf", bytes: lit(1001) }, { maxChars: 1000 })).tooLarge, true);
  const under = await fileTexts({ name: "a.pdf", bytes: lit(900) }, { maxChars: 1000 });
  assert.notEqual(under.tooLarge, true);
  assert.ok(under.parts.some((p) => p.text.includes("ab ab")));
  const hex = (n) => pdf([{ data: "BT <" + "61".repeat(n) + "> Tj ET", flate: false }]);
  assert.equal((await fileTexts({ name: "a.pdf", bytes: hex(1001) }, { maxChars: 1000 })).tooLarge, true);
  assert.notEqual((await fileTexts({ name: "a.pdf", bytes: hex(900) }, { maxChars: 1000 })).tooLarge, true);
});

test("screen budget: text streams share the budget (refused at the stream that crosses it)", async () => {
  const s = { data: "BT (" + rep("ab ", 380) + ") Tj ET" };
  assert.notEqual((await fileTexts({ name: "a.pdf", bytes: pdf([s, s]) }, { maxChars: 1000 })).tooLarge, true);
  assert.equal((await fileTexts({ name: "a.pdf", bytes: pdf([s, s, s]) }, { maxChars: 1000 })).tooLarge, true);
});

test("screen budget: the glued TJ view is charged too (every screened view counts)", async () => {
  let tj = "BT ["; for (let i = 0; i < 60; i++) tj += "(" + rep("ab ", 9) + ")-9"; tj += "] TJ ET"; // spaced ~600, glued ~540
  const bytes = pdf([{ data: tj, flate: false }]);
  const roomy = await fileTexts({ name: "a.pdf", bytes }, { maxChars: 4000 });
  assert.notEqual(roomy.tooLarge, true);
  assert.ok(roomy.screenedChars > 1000, "spaced + glued charged: " + roomy.screenedChars);
  assert.equal((await fileTexts({ name: "a.pdf", bytes }, { maxChars: 1000 })).tooLarge, true);
});

test("screen budget: the gate uses MAX_SCREEN_CHARS minus the typed fields", async () => {
  const bytes = pdf([{ data: "BT (" + rep("ab ", 1000) + ") Tj ET" }]);
  assert.equal(await run(bytes), null, "benign, well under: passes");
  const res = await textChecks.run({ operator: false, body: rep("ab ", MAX_SCREEN_CHARS - 500), file: { name: "a.pdf", bytes } });
  assert.deepEqual(res, TOO_LARGE, "fields + PDF over the budget");
  assert.deepEqual(await textChecks.run({ operator: false, body: rep("ab ", MAX_SCREEN_CHARS + 1) }), TOO_LARGE, "fields alone");
  assert.ok(MAX_SCREEN_CHARS === 2 * MiB);
});
