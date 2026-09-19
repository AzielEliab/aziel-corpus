import test from "node:test";
import assert from "node:assert/strict";
import { citeDoc, llmsDoc, humansTxt, aiTxt, sitemapIndexXml, sitemapXml } from "./crawl.js";
import {
  SOFTWARE_EXTRAS,
  mergeSoftwareExtras,
  softwareTabCatalog,
  mapSoftwareProduct,
  preferSpectralLockHonestyCopy,
  displayName,
} from "./software-catalog.js";
import { ocrPageBody, intelligenceBody, SPECTRAL_LENSES } from "./hosted-pages.js";
import { defaultDescription } from "./seo.js";
import {
  SPECTRALLOCK,
  SPECTRALLOCK_SLUG,
  SPECTRALLOCK_NAME,
  SPECTRALLOCK_ONE_LINE,
  SPECTRALLOCK_NOTE,
  SPECTRALLOCK_CITE,
  SPECTRALLOCK_OCR_NOTE,
  SPECTRALLOCK_UNREDACT,
  SPECTRALLOCK_WORKER_HOME,
  SPECTRALLOCK_GITHUB,
  SPECTRALLOCK_DIGEST,
  SPECTRALLOCK_LIVE_OPS,
  SPECTRALLOCK_STUB_OPS,
  spectralLockCopyLooksHonest,
  spectrallockLlmsBlock,
  spectrallockCiteFields,
} from "./spectrallock.js";

test("SpectralLock cite is leftover-bytes honest and not a FragGate invent", () => {
  assert.equal(SPECTRALLOCK.slug, SPECTRALLOCK_SLUG);
  assert.equal(SPECTRALLOCK.name, SPECTRALLOCK_NAME);
  assert.equal(SPECTRALLOCK.one_line, SPECTRALLOCK_ONE_LINE);
  assert.match(SPECTRALLOCK_ONE_LINE, /leftover container bytes recover honestly/);
  assert.match(SPECTRALLOCK_ONE_LINE, /opaque rewrite refuses/);
  assert.equal(SPECTRALLOCK.leftover_bytes, "honest recover");
  assert.equal(SPECTRALLOCK.opaque_empty, "SL-UNREDACT-OPAQUE");
  assert.equal(SPECTRALLOCK.heatmap_is_transcript, false);
  assert.equal(SPECTRALLOCK.never_invent_letters, true);
  assert.equal(SPECTRALLOCK.corpus_ocr_guesses, false);
  assert.equal(SPECTRALLOCK.unredact_is_door_op, false);
  assert.equal(SPECTRALLOCK.extra_card, false);
  assert.equal(SPECTRALLOCK.unredact, SPECTRALLOCK_UNREDACT);
  assert.equal(SPECTRALLOCK.digest, SPECTRALLOCK_DIGEST);
  assert.deepEqual(SPECTRALLOCK_LIVE_OPS, ["health", "modes", "targets", "overlay", "verify", "doctor", "skill"]);
  assert.deepEqual(SPECTRALLOCK_STUB_OPS, ["spectrometer", "forensic", "invent_mark"]);
  assert.ok(!SPECTRALLOCK_LIVE_OPS.includes("unredact"));
  assert.ok(!SPECTRALLOCK_LIVE_OPS.includes("locate"));
  assert.ok(!SPECTRALLOCK_LIVE_OPS.includes("lift"));
  assert.ok(!SPECTRALLOCK_LIVE_OPS.includes("recover"));
  assert.match(SPECTRALLOCK_NOTE, /SL-UNREDACT-OPAQUE/);
  assert.match(SPECTRALLOCK_NOTE, /not a FragGate door op/);
  assert.match(SPECTRALLOCK_NOTE, /does not unredact by guessing/);
  assert.match(SPECTRALLOCK_OCR_NOTE, /does not unredact by guessing/);
  assert.equal(SPECTRALLOCK_CITE.extra_card, false);
  assert.equal(SPECTRALLOCK_CITE.unredact_is_door_op, false);
  assert.equal(spectralLockCopyLooksHonest(SPECTRALLOCK_ONE_LINE), true);
  assert.equal(spectralLockCopyLooksHonest("256px overlay preview. Not a spectrometer."), false);
});

test("cite.json / llms.txt / ai.txt / humans.txt cite SpectralLock leftover-bytes honesty", () => {
  const cite = citeDoc();
  assert.ok(cite.keywords.includes("SpectralLock"));
  assert.ok(cite.keywords.includes("spectrallock"));
  assert.ok(cite.keywords.includes("SL-UNREDACT-OPAQUE"));
  assert.equal(cite.spectrallock.slug, SPECTRALLOCK_SLUG);
  assert.equal(cite.spectrallock.one_line, SPECTRALLOCK_ONE_LINE);
  assert.equal(cite.spectrallock.unredact, SPECTRALLOCK_UNREDACT);
  assert.equal(cite.spectrallock.unredact_is_door_op, false);
  assert.equal(cite.spectrallock.extra_card, false);
  assert.equal(cite.spectrallock.heatmap_is_transcript, false);
  assert.equal(cite.spectrallock.corpus_ocr_guesses, false);
  assert.equal(cite.spectrallock_slug, "spectrallock");
  assert.equal(cite.github_spectrallock, SPECTRALLOCK_GITHUB);
  assert.equal(cite.spectrallock_unredact, SPECTRALLOCK_UNREDACT);
  assert.equal(cite.spectrallock_cite.extra_card, false);
  assert.match(cite.spectrallock.note, /SL-UNREDACT-OPAQUE/);
  assert.doesNotMatch(JSON.stringify(cite.spectrallock), /unredact.*LIVE_OPS|LIVE_OPS.*unredact/i);

  const llms = llmsDoc("LIMIT");
  assert.match(llms, /Softwares list: SpectralLock \(Softwares\): leftover container bytes recover honestly/);
  assert.match(llms, /SL-UNREDACT-OPAQUE/);
  assert.match(llms, /spectrallock-download-tracker\.vibelock\.workers\.dev\/v1\/unredact/);
  assert.match(llms, /not a FragGate door op/);
  assert.match(llms, /does not unredact by guessing/);
  assert.match(llms, /Not a hardcoded extras card/);
  assert.match(spectrallockLlmsBlock(), /Catalog LIVE_OPS: health, modes, targets, overlay, verify, doctor, skill/);

  const ai = aiTxt("LIMIT");
  assert.match(ai, /SpectralLock \(spectrallock\)/);
  assert.match(ai, /SL-UNREDACT-OPAQUE/);
  assert.match(ai, /does not unredact by guessing/);
  assert.match(ai, /Softwares list: SpectralLock \(Softwares\)/);

  const humans = humansTxt();
  assert.match(humans, /SpectralLock \(spectrallock\) Softwares Media leftover-bytes honesty/);
  assert.match(humans, /SL-UNREDACT-OPAQUE/);
  assert.match(humans, SPECTRALLOCK_NOTE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
});

test("sitemap lists OCR / Softwares cites and SpectralLock worker sitemap", async () => {
  const index = sitemapIndexXml();
  assert.match(index, /spectrallock-download-tracker\.vibelock\.workers\.dev\/sitemap\.xml/);
  assert.match(index, /<lastmod>2026-09-19<\/lastmod>/);
  const xml = await sitemapXml({});
  assert.match(xml, /azielcorpuslibrary\.net\/ocr</);
  assert.match(xml, /azielcorpuslibrary\.net\/software</);
  assert.match(xml, /azielcorpuslibrary\.net\/cite\.json</);
  assert.match(xml, /azielcorpuslibrary\.net\/llms\.txt</);
  assert.match(xml, /azielcorpuslibrary\.net\/ai\.txt</);
  assert.match(xml, /azielcorpuslibrary\.net\/forensics</);
});

test("Softwares tab is cite-only and rewrites stale SpectralLock one_line to post-#137 copy", () => {
  assert.ok(!SOFTWARE_EXTRAS.some((p) => p.slug === SPECTRALLOCK_SLUG));
  assert.equal(displayName({ slug: "spectrallock" }), "SpectralLock");
  assert.equal(
    preferSpectralLockHonestyCopy(
      { one_line: "256px overlay preview (zero/tazel/vyrn/uv). Not a spectrometer." },
      { one_line: SPECTRALLOCK_ONE_LINE }
    ),
    SPECTRALLOCK_ONE_LINE
  );
  assert.equal(
    preferSpectralLockHonestyCopy(
      { one_line: SPECTRALLOCK_ONE_LINE },
      { one_line: "stale" }
    ),
    SPECTRALLOCK_ONE_LINE
  );
  const mapped = mapSoftwareProduct({
    slug: "spectrallock",
    name: "SpectralLock",
    one_line: "256px overlay preview. Not a spectrometer.",
  });
  assert.equal(mapped.one_line, SPECTRALLOCK_ONE_LINE);
  assert.equal(mapped.worker_home, SPECTRALLOCK_WORKER_HOME);

  const tab = softwareTabCatalog({
    version: "2.0.0-rc1",
    software: [
      { slug: "spectrallock", name: "SpectralLock", one_line: "THIS IS: old overlay blurb." },
    ],
  });
  const sl = tab.products.find((p) => p.slug === "spectrallock");
  assert.ok(sl);
  assert.equal(sl.one_line, SPECTRALLOCK_ONE_LINE);
  assert.equal(sl.extra, undefined);
  const merged = mergeSoftwareExtras([{ slug: "spectrallock", name: "SpectralLock", one_line: SPECTRALLOCK_ONE_LINE }]);
  assert.equal(merged.find((p) => p.slug === "spectrallock").one_line, SPECTRALLOCK_ONE_LINE);
});

test("OCR and Forensics pages name SpectralLock with honest unredact note", () => {
  assert.equal(SPECTRAL_LENSES.length, 8);
  const ocr = ocrPageBody({ signed: null, operator: false });
  assert.match(ocr, /SpectralLock lenses/);
  assert.match(ocr, /SL-UNREDACT-OPAQUE/);
  assert.match(ocr, /does not unredact by guessing/);
  assert.match(ocr, /Heatmaps are not transcripts|Heatmap ≠ transcript/);
  assert.match(ocr, /spectrallock-download-tracker\.vibelock\.workers\.dev\/v1\/unredact/);
  assert.match(ocr, /not a FragGate door op/);
  assert.doesNotMatch(ocr, /corpus OCR unredacts by guessing/i);
  assert.match(defaultDescription("ocr"), /leftover container bytes recover honestly/);
  assert.match(defaultDescription("ocr"), /does not unredact by guessing/);
  assert.match(defaultDescription("forensics"), /SL-UNREDACT-OPAQUE/);
  const forensics = intelligenceBody({ signed: null, operator: false, aiReady: false, packages: [] });
  assert.match(forensics, /SpectralLock lenses/);
  assert.match(forensics, /SL-UNREDACT-OPAQUE/);
  assert.match(forensics, /does not unredact by guessing/);
});

test("spectrallockCiteFields stay Worker SSoT and do not invent door ops", () => {
  const fields = spectrallockCiteFields();
  assert.equal(fields.spectrallock_slug, "spectrallock");
  assert.equal(fields.spectrallock.unredact_is_door_op, false);
  assert.ok(!fields.spectrallock.ops.includes("unredact"));
  assert.match(fields.spectrallock.how_to_cite, /SL-UNREDACT-OPAQUE/);
});
