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
  SPECTRALLOCK_RECOVER,
  SPECTRALLOCK_HANDWRITING,
  SPECTRALLOCK_WORKER_HOME,
  SPECTRALLOCK_GITHUB,
  SPECTRALLOCK_DIGEST,
  SPECTRALLOCK_LIVE_OPS,
  SPECTRALLOCK_STUB_OPS,
  SPECTRALLOCK_PRODUCT_PR,
  SPECTRALLOCK_PRODUCT_COMMIT,
  spectralLockCopyLooksHonest,
  spectrallockLlmsBlock,
  spectrallockCiteFields,
} from "./spectrallock.js";

test("SpectralLock cite is leftover-bytes honest and not a FragGate invent", () => {
  assert.equal(SPECTRALLOCK.slug, SPECTRALLOCK_SLUG);
  assert.equal(SPECTRALLOCK.name, SPECTRALLOCK_NAME);
  assert.equal(SPECTRALLOCK.author, "Aziel Eliab");
  assert.equal(SPECTRALLOCK.identity, "Aziel Eliab");
  assert.equal(SPECTRALLOCK.one_line, SPECTRALLOCK_ONE_LINE);
  assert.match(SPECTRALLOCK_ONE_LINE, /leftover container bytes recover honestly/);
  assert.match(SPECTRALLOCK_ONE_LINE, /opaque rewrite refuses/);
  assert.equal(SPECTRALLOCK.leftover_bytes, "honest recover");
  assert.equal(SPECTRALLOCK.opaque_empty, "SL-UNREDACT-OPAQUE");
  assert.equal(SPECTRALLOCK.revision_graph, true);
  assert.equal(SPECTRALLOCK.recover_universal, true);
  assert.equal(SPECTRALLOCK.recover_no_lie, true);
  assert.equal(SPECTRALLOCK.recover_live_slot, true);
  assert.equal(SPECTRALLOCK.handwriting_is_lab, false);
  assert.equal(SPECTRALLOCK.handwriting_is_esda, false);
  assert.equal(SPECTRALLOCK.heatmap_is_transcript, false);
  assert.equal(SPECTRALLOCK.never_invent_letters, true);
  assert.equal(SPECTRALLOCK.corpus_ocr_guesses, false);
  assert.equal(SPECTRALLOCK.unredact_is_door_op, false);
  assert.equal(SPECTRALLOCK.recover_is_door_op, false);
  assert.equal(SPECTRALLOCK.handwriting_is_door_op, false);
  assert.equal(SPECTRALLOCK.extra_card, false);
  assert.equal(SPECTRALLOCK.unredact, SPECTRALLOCK_UNREDACT);
  assert.equal(SPECTRALLOCK.recover, SPECTRALLOCK_RECOVER);
  assert.equal(SPECTRALLOCK.handwriting, SPECTRALLOCK_HANDWRITING);
  assert.equal(SPECTRALLOCK.digest, SPECTRALLOCK_DIGEST);
  assert.equal(SPECTRALLOCK.product_pr, SPECTRALLOCK_PRODUCT_PR);
  assert.equal(SPECTRALLOCK.product_commit, SPECTRALLOCK_PRODUCT_COMMIT);
  assert.match(SPECTRALLOCK_PRODUCT_PR, /spectrallock\/pull\/13$/);
  assert.equal(SPECTRALLOCK_PRODUCT_COMMIT, "4af8fcb");
  assert.deepEqual(SPECTRALLOCK_LIVE_OPS, ["health", "modes", "targets", "overlay", "verify", "doctor", "skill"]);
  assert.deepEqual(SPECTRALLOCK_STUB_OPS, ["spectrometer", "forensic", "invent_mark"]);
  assert.ok(!SPECTRALLOCK_LIVE_OPS.includes("unredact"));
  assert.ok(!SPECTRALLOCK_LIVE_OPS.includes("locate"));
  assert.ok(!SPECTRALLOCK_LIVE_OPS.includes("lift"));
  assert.ok(!SPECTRALLOCK_LIVE_OPS.includes("recover"));
  assert.ok(!SPECTRALLOCK_LIVE_OPS.includes("handwriting"));
  assert.match(SPECTRALLOCK_NOTE, /SL-UNREDACT-OPAQUE/);
  assert.doesNotMatch(SPECTRALLOCK_NOTE, /not a FragGate door op/);
  assert.match(SPECTRALLOCK_NOTE, /recovers leftover bytes honestly/);
  assert.match(SPECTRALLOCK_NOTE, /revision graph/);
  assert.match(SPECTRALLOCK_NOTE, /NO-LIE LIVE\/SLOT/);
  assert.match(SPECTRALLOCK_NOTE, /ink heuristics/);
  assert.doesNotMatch(SPECTRALLOCK_NOTE, /not ESDA/);
  assert.match(SPECTRALLOCK_NOTE, /Worker SSoT/);
  assert.match(SPECTRALLOCK_OCR_NOTE, /recovers leftover bytes honestly/);
  assert.match(SPECTRALLOCK_OCR_NOTE, /revision_graph/);
  assert.match(SPECTRALLOCK_OCR_NOTE, /NO-LIE LIVE\/SLOT/);
  assert.doesNotMatch(SPECTRALLOCK_OCR_NOTE, /not ESDA/);
  assert.equal(SPECTRALLOCK_CITE.extra_card, false);
  assert.equal(SPECTRALLOCK_CITE.unredact_is_door_op, false);
  assert.equal(SPECTRALLOCK_CITE.recover_is_door_op, false);
  assert.equal(SPECTRALLOCK_CITE.handwriting_is_door_op, false);
  assert.equal(SPECTRALLOCK_CITE.revision_graph, true);
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
  assert.equal(cite.spectrallock.recover, SPECTRALLOCK_RECOVER);
  assert.equal(cite.spectrallock.handwriting, SPECTRALLOCK_HANDWRITING);
  assert.equal(cite.spectrallock.unredact_is_door_op, false);
  assert.equal(cite.spectrallock.recover_is_door_op, false);
  assert.equal(cite.spectrallock.handwriting_is_door_op, false);
  assert.equal(cite.spectrallock.revision_graph, true);
  assert.equal(cite.spectrallock.recover_universal, true);
  assert.equal(cite.spectrallock.handwriting_is_esda, false);
  assert.equal(cite.spectrallock.extra_card, false);
  assert.equal(cite.spectrallock.heatmap_is_transcript, false);
  assert.equal(cite.spectrallock.corpus_ocr_guesses, false);
  assert.equal(cite.spectrallock_slug, "spectrallock");
  assert.equal(cite.github_spectrallock, SPECTRALLOCK_GITHUB);
  assert.equal(cite.spectrallock_unredact, SPECTRALLOCK_UNREDACT);
  assert.equal(cite.spectrallock_recover, SPECTRALLOCK_RECOVER);
  assert.equal(cite.spectrallock_handwriting, SPECTRALLOCK_HANDWRITING);
  assert.equal(cite.spectrallock_cite.extra_card, false);
  assert.match(cite.spectrallock.note, /SL-UNREDACT-OPAQUE/);
  assert.match(cite.spectrallock.note, /revision graph/);
  assert.match(cite.spectrallock.note, /NO-LIE LIVE\/SLOT/);
  assert.doesNotMatch(JSON.stringify(cite.spectrallock), /unredact.*LIVE_OPS|LIVE_OPS.*unredact/i);

  const llms = llmsDoc("LIMIT");
  assert.match(llms, /Softwares list: SpectralLock \(Softwares\): leftover container bytes recover honestly/);
  assert.match(llms, /SL-UNREDACT-OPAQUE/);
  assert.match(llms, /spectrallock-download-tracker\.vibelock\.workers\.dev\/v1\/unredact/);
  assert.match(llms, /spectrallock-download-tracker\.vibelock\.workers\.dev\/v1\/recover/);
  assert.match(llms, /spectrallock-download-tracker\.vibelock\.workers\.dev\/v1\/handwriting/);
  assert.doesNotMatch(llms, /not a FragGate door op/);
  assert.match(llms, /recovers leftover bytes honestly/);
  assert.doesNotMatch(llms, /not ESDA/);
  assert.match(llms, /Catalog card is Worker SSoT/);
  assert.match(llms, /NO-LIE LIVE\/SLOT/);
  assert.match(spectrallockLlmsBlock(), /Catalog LIVE_OPS: health, modes, targets, overlay, verify, doctor, skill/);
  assert.match(spectrallockLlmsBlock(), /SpectralLock recover: /);
  assert.match(spectrallockLlmsBlock(), /SpectralLock handwriting: /);

  const ai = aiTxt("LIMIT");
  assert.match(ai, /SpectralLock \(spectrallock\)/);
  assert.match(ai, /SL-UNREDACT-OPAQUE/);
  assert.match(ai, /recovers leftover bytes honestly/);
  assert.match(ai, /Softwares list: SpectralLock \(Softwares\)/);
  assert.match(ai, /NO-LIE LIVE\/SLOT/);
  assert.match(ai, /v1\/recover/);
  assert.match(ai, /v1\/handwriting/);

  const humans = humansTxt();
  assert.match(humans, /SpectralLock \(spectrallock\) Softwares Media leftover-bytes honesty/);
  assert.match(humans, /SL-UNREDACT-OPAQUE/);
  assert.match(humans, /v1\/recover/);
  assert.match(humans, /v1\/handwriting/);
  assert.doesNotMatch(humans, /not ESDA/);
  assert.match(humans, new RegExp(SPECTRALLOCK_NOTE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
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
  assert.match(ocr, /recovers leftover bytes honestly/);
  assert.doesNotMatch(ocr, /Heatmap ≠/);
  assert.match(ocr, /spectrallock-download-tracker\.vibelock\.workers\.dev\/v1\/unredact/);
  assert.match(ocr, /spectrallock-download-tracker\.vibelock\.workers\.dev\/v1\/recover/);
  assert.match(ocr, /spectrallock-download-tracker\.vibelock\.workers\.dev\/v1\/handwriting/);
  assert.doesNotMatch(ocr, /not a FragGate door op/);
  assert.doesNotMatch(ocr, /not ESDA/);
  assert.doesNotMatch(ocr, /corpus OCR unredacts by guessing/i);
  assert.doesNotMatch(ocr, /ESDA lab|electrostatic detection/i);
  assert.match(defaultDescription("ocr"), /Leftover container bytes recover honestly/);
  assert.match(defaultDescription("ocr"), /recovers leftover bytes honestly/);
  assert.doesNotMatch(defaultDescription("ocr"), /not ESDA/);
  assert.match(defaultDescription("ocr"), /NO-LIE LIVE\/SLOT/);
  assert.match(defaultDescription("forensics"), /SL-UNREDACT-OPAQUE/);
  assert.doesNotMatch(defaultDescription("forensics"), /not ESDA/);
  const forensics = intelligenceBody({ signed: null, operator: false, aiReady: false, packages: [] });
  assert.match(forensics, /SpectralLock lenses/);
  assert.match(forensics, /SL-UNREDACT-OPAQUE/);
  assert.match(forensics, /recovers leftover bytes honestly/);
  assert.doesNotMatch(forensics, /not ESDA/);
});

test("spectrallockCiteFields stay Worker SSoT and do not invent door ops", () => {
  const fields = spectrallockCiteFields();
  assert.equal(fields.spectrallock_slug, "spectrallock");
  assert.equal(fields.spectrallock.unredact_is_door_op, false);
  assert.equal(fields.spectrallock.recover_is_door_op, false);
  assert.equal(fields.spectrallock.handwriting_is_door_op, false);
  assert.ok(!fields.spectrallock.ops.includes("unredact"));
  assert.ok(!fields.spectrallock.ops.includes("recover"));
  assert.ok(!fields.spectrallock.ops.includes("handwriting"));
  assert.equal(fields.spectrallock_recover, SPECTRALLOCK_RECOVER);
  assert.equal(fields.spectrallock_handwriting, SPECTRALLOCK_HANDWRITING);
  assert.match(fields.spectrallock.how_to_cite, /SL-UNREDACT-OPAQUE/);
  assert.match(fields.spectrallock.how_to_cite, /revision_graph/);
  assert.match(fields.spectrallock.how_to_cite, /NO-LIE LIVE\/SLOT/);
});
