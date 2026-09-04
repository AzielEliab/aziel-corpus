import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveLensPlan, normalizeLenses, LIVE, enhancePngBytes } from "../workers/download-tracker/src/spectral.js";
import { ocrBody, ocrFormHtml, SPECTRAL_LENSES, intelligenceBody } from "../workers/download-tracker/src/hosted-pages.js";
import { CSS, page } from "../workers/download-tracker/src/ui.js";

const OPERATOR = { user_id: "master", role: "superadmin", username: "operator" };
const USER = { user_id: "u1", role: "user", username: "reader" };
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLE_DIR = join(ROOT, "workers/download-tracker/public/spectral-samples");

test("normalize and mix plans follow SpectralLock rules", () => {
  assert.deepEqual(normalizeLenses(["Zero", "tazel", "nope", "tazel"]), ["zero", "tazel"]);
  assert.equal(resolveLensPlan(["tazel"]).kind, "single");
  assert.equal(resolveLensPlan(["tazel"]).mode, "tazel");
  const mixed = resolveLensPlan(["tazel", "vyrn", "zero"]);
  assert.equal(mixed.kind, "weights");
  assert.ok(Math.abs(mixed.weights.zero - 0.4) < 1e-9);
  assert.ok(Math.abs(mixed.weights.tazel - 0.35) < 1e-9);
  assert.ok(Math.abs(mixed.weights.vyrn - 0.25) < 1e-9);
  const eq = resolveLensPlan(["tazel", "uv"]);
  assert.equal(eq.kind, "weights");
  assert.ok(Math.abs(eq.weights.tazel - 0.5) < 1e-9);
  assert.ok(Math.abs(eq.weights.uv - 0.5) < 1e-9);
  const named = resolveLensPlan(["tazel", "rosetta"]);
  assert.equal(named.kind, "composites");
  assert.deepEqual(named.composites, ["rosetta"]);
  const both = resolveLensPlan(["rosetta", "zen"]);
  assert.equal(both.kind, "composites");
  assert.deepEqual(both.composites, ["rosetta", "zen"]);
  assert.equal(LIVE.length, 8);
});

function assertOcrChrome(html, { saveText, saveDisabled }) {
  for (const id of ["zero", "tazel", "vyrn", "uv", "rosetta", "zen", "chaos", "balance"]) {
    assert.match(html, new RegExp('name="lens" value="' + id + '"'));
    assert.match(html, new RegExp('src="/spectral-samples/' + id + '\\.png"'));
  }
  assert.match(html, /class="checkrow lens-option"/);
  assert.match(html, /class="lens-grid"/);
  assert.match(html, /class="lens-sample"/);
  assert.doesNotMatch(html, /class="showpw"/);
  assert.match(html, new RegExp(saveText));
  if (saveDisabled) assert.match(html, /name="save"[^>]*disabled/);
  else assert.doesNotMatch(html, /name="save"[^>]*disabled/);
}

test("operator OCR page always shows Aziel Library save + all lenses", () => {
  const html = page("OCR", ocrBody({ signed: OPERATOR, operator: true }), { signed: OPERATOR, path: "/ocr" });
  assertOcrChrome(html, { saveText: "Save extracted text into Aziel Library", saveDisabled: false });
  assert.match(html, /signed in as operator/);
  assert.match(CSS, /white-space:normal/);
  assert.match(CSS, /\.checkrow\{/);
  assert.match(CSS, /input\[type=checkbox\].*width:auto/);
  assert.match(CSS, /\.lens-sample\{/);
  assert.doesNotMatch(html, /Collin/i);
  assert.doesNotMatch(html, /Jack Altman/i);
  assert.doesNotMatch(html, /ever.?blooming/i);
});

test("signed-in user save goes to corpus copy; anonymous save is disabled", () => {
  assertOcrChrome(ocrFormHtml({ signed: USER, operator: false }), { saveText: "Save extracted text into the corpus", saveDisabled: false });
  const anon = ocrFormHtml({ signed: null, operator: false });
  assertOcrChrome(anon, { saveText: "Sign in to save", saveDisabled: true });
  const intelOp = intelligenceBody({ signed: OPERATOR, operator: true, packages: [] });
  assertOcrChrome(intelOp, { saveText: "Save extracted text into Aziel Library", saveDisabled: false });
  assert.equal(SPECTRAL_LENSES.length, 8);
});

test("hosted spectral sample PNGs exist for every live lens", () => {
  for (const id of LIVE) {
    const path = join(SAMPLE_DIR, id + ".png");
    assert.equal(existsSync(path), true, "missing " + path);
    const bytes = readFileSync(path);
    assert.ok(bytes.length > 32, id + " sample too small");
    assert.deepEqual(Array.from(bytes.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  }
});

test("enhancePngBytes produces a PNG overlay from the OCR fixture", async () => {
  const fixture = readFileSync(join(ROOT, "workers/download-tracker/public/ocr_selftest.png"));
  const out = await enhancePngBytes(fixture, ["tazel", "vyrn", "zero"], { maxSide: 80 });
  assert.equal(out.ok, true);
  assert.equal(out.plan.kind, "weights");
  assert.ok(out.png && out.png[0] === 137 && out.png[1] === 80);
});
