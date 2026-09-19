/**
 * SpectralLock — Softwares cite only (not a SOFTWARE_EXTRAS card).
 * Honest leftover-bytes unredact + revision graph after spectrallock#13 (4af8fcb).
 * /v1/unredact: leftover + 14-cap history + revision_graph + tip-cut copies.
 * /v1/recover: universal NO-LIE LIVE/SLOT (present bytes only; SLOT never advertised as LIVE).
 * /v1/handwriting: ink heuristics, not ESDA / lab / court / writer identity.
 * Unredact / recover / handwriting are product Worker paths — not FragGate door ops.
 * Corpus OCR does not unredact by guessing. Handwriting is not ESDA.
 * Catalog LIVE_OPS stay health, modes, targets, overlay, verify, doctor, skill.
 * Softwares tab refreshes from Worker SSoT (GET /v1/software).
 * FragGate is THE single door. Author: Aziel Eliab only.
 * Lamb Lens: Service → Clarity → Peace.
 */
import { HOST, RUNTIME_ORIGIN, AI_CLIENTS } from "./runtime-copy.js";

export const AUTHOR = "Aziel Eliab";
export const SPECTRALLOCK_SLUG = "spectrallock";
export const SPECTRALLOCK_NAME = "SpectralLock";
export const SPECTRALLOCK_PRODUCT_VERSION = "0.3.0";
export const SPECTRALLOCK_GITHUB = "https://github.com/AzielEliab/spectrallock";
export const SPECTRALLOCK_WORKER = "spectrallock-download-tracker";
export const SPECTRALLOCK_WORKER_HOME = "https://spectrallock-download-tracker.vibelock.workers.dev/";
export const SPECTRALLOCK_DOWNLOAD = SPECTRALLOCK_WORKER_HOME + "download";
export const SPECTRALLOCK_COUNT = SPECTRALLOCK_WORKER_HOME + "count";
export const SPECTRALLOCK_UNREDACT = SPECTRALLOCK_WORKER_HOME + "v1/unredact";
export const SPECTRALLOCK_RECOVER = SPECTRALLOCK_WORKER_HOME + "v1/recover";
export const SPECTRALLOCK_HANDWRITING = SPECTRALLOCK_WORKER_HOME + "v1/handwriting";
export const SPECTRALLOCK_CITE_JSON = SPECTRALLOCK_WORKER_HOME + "cite.json";
export const SPECTRALLOCK_LLMS = SPECTRALLOCK_WORKER_HOME + "llms.txt";
export const SPECTRALLOCK_SITEMAP = SPECTRALLOCK_WORKER_HOME + "sitemap.xml";
export const SPECTRALLOCK_SKILL = SPECTRALLOCK_WORKER_HOME + "v1/skill";
/** Hasher digest from aziel-runtime#137. Do not invent. Overlay digest was not rehashed in spectrallock#13. */
export const SPECTRALLOCK_DIGEST = "3427dbcf2932b6bf4c6cf80735efd171b75519066e013db6d0df275c65989fb4";
export const SPECTRALLOCK_DOMAIN = "Media";
export const SPECTRALLOCK_RUNTIME_PR = "https://github.com/AzielEliab/aziel-runtime/pull/137";
export const SPECTRALLOCK_PRODUCT_PR = "https://github.com/AzielEliab/spectrallock/pull/13";
export const SPECTRALLOCK_PRODUCT_COMMIT = "4af8fcb";

/** Catalog LIVE_OPS only. Do not invent unredact / recover / handwriting / locate / lift as door ops. */
export const SPECTRALLOCK_LIVE_OPS = Object.freeze([
  "health",
  "modes",
  "targets",
  "overlay",
  "verify",
  "doctor",
  "skill",
]);

export const SPECTRALLOCK_STUB_OPS = Object.freeze([
  "spectrometer",
  "forensic",
  "invent_mark",
]);

/** Worker SSoT one_line after aziel-runtime#137. Softwares tab refreshes from GET /v1/software. */
export const SPECTRALLOCK_ONE_LINE =
  "Preview a small overlay on an image; leftover container bytes recover honestly, opaque rewrite refuses.";

export const SPECTRALLOCK_HONESTY =
  "Leftover container bytes recover honestly (object id / offset / stream). "
  + "/v1/unredact cites revision_graph + tip-cut copies. "
  + "Opaque empty refuses SL-UNREDACT-OPAQUE. Never invent letters. "
  + "/v1/recover is universal NO-LIE LIVE/SLOT (present bytes only; SLOT never advertised as LIVE). "
  + "/v1/handwriting is ink heuristics, not ESDA, not a lab, not a court finding. "
  + "locate / lift / recover / refuse. Heatmap ≠ transcript. Never OCR-from-black-box.";

export const SPECTRALLOCK_OCR_NOTE =
  "SpectralLock leftover-bytes recover is honest (object id / offset / stream). "
  + "/v1/unredact cites revision_graph. /v1/recover is universal (NO-LIE LIVE/SLOT). "
  + "/v1/handwriting is ink heuristics, not a lab and not ESDA. "
  + "Opaque empty refuses SL-UNREDACT-OPAQUE. Heatmaps are not transcripts. "
  + "Corpus OCR does not unredact by guessing. Handwriting is not ESDA. "
  + "Workers: " + SPECTRALLOCK_UNREDACT + " · " + SPECTRALLOCK_RECOVER + " · " + SPECTRALLOCK_HANDWRITING
  + ". Unredact is not a FragGate door op. Recover is not a FragGate door op. Handwriting is not a FragGate door op.";

export const SPECTRALLOCK_NOTE =
  "SpectralLock (Softwares): leftover container bytes recover honestly; opaque empty refuses SL-UNREDACT-OPAQUE. "
  + "Never invent letters. /v1/unredact revision graph. /v1/recover universal (NO-LIE LIVE/SLOT). "
  + "/v1/handwriting ink heuristics, not a lab. Heatmap ≠ transcript. "
  + "Workers " + SPECTRALLOCK_UNREDACT + " · " + SPECTRALLOCK_RECOVER + " · " + SPECTRALLOCK_HANDWRITING + ". "
  + "Unredact is not a FragGate door op. Recover is not a FragGate door op. Handwriting is not a FragGate door op. "
  + "Catalog entry ships on aziel-runtime GET /v1/software (Worker SSoT); this library Softwares tab refreshes from that Worker SSoT. "
  + "Corpus OCR does not unredact by guessing. Handwriting is not ESDA.";

export function spectrallockWorkerLinksHtml() {
  return [
    SPECTRALLOCK_UNREDACT,
    SPECTRALLOCK_RECOVER,
    SPECTRALLOCK_HANDWRITING,
  ].map((href) => "<a href=\"" + href + "\">" + href + "</a>").join(" · ");
}

/** Cite-only Softwares mention. Not a SOFTWARE_EXTRAS card. */
export const SPECTRALLOCK_CITE = Object.freeze({
  name: SPECTRALLOCK_NAME,
  slug: SPECTRALLOCK_SLUG,
  one_line: SPECTRALLOCK_ONE_LINE,
  note: SPECTRALLOCK_NOTE,
  honesty: SPECTRALLOCK_HONESTY,
  leftover_bytes: "honest recover",
  opaque_empty: "SL-UNREDACT-OPAQUE",
  revision_graph: true,
  recover_universal: true,
  recover_no_lie: true,
  recover_live_slot: true,
  handwriting_is_lab: false,
  handwriting_is_esda: false,
  heatmap_is_transcript: false,
  never_invent_letters: true,
  corpus_ocr_guesses: false,
  unredact_is_door_op: false,
  recover_is_door_op: false,
  handwriting_is_door_op: false,
  live_ops: SPECTRALLOCK_LIVE_OPS.slice(),
  stub_ops: SPECTRALLOCK_STUB_OPS.slice(),
  unredact: SPECTRALLOCK_UNREDACT,
  recover: SPECTRALLOCK_RECOVER,
  handwriting: SPECTRALLOCK_HANDWRITING,
  download: SPECTRALLOCK_DOWNLOAD,
  count: SPECTRALLOCK_COUNT,
  worker_home: SPECTRALLOCK_WORKER_HOME,
  github: SPECTRALLOCK_GITHUB,
  cite: SPECTRALLOCK_CITE_JSON,
  llms: SPECTRALLOCK_LLMS,
  sitemap: SPECTRALLOCK_SITEMAP,
  skill: SPECTRALLOCK_SKILL,
  digest: SPECTRALLOCK_DIGEST,
  product_pr: SPECTRALLOCK_PRODUCT_PR,
  product_commit: SPECTRALLOCK_PRODUCT_COMMIT,
  runtime_pr: SPECTRALLOCK_RUNTIME_PR,
  extra_card: false,
});

export const SPECTRALLOCK = Object.freeze({
  slug: SPECTRALLOCK_SLUG,
  name: SPECTRALLOCK_NAME,
  product_version: SPECTRALLOCK_PRODUCT_VERSION,
  kind: "lock",
  domain: SPECTRALLOCK_DOMAIN,
  placement: "domain-software",
  door: "fraggate",
  fraggate_single_door: true,
  not_a_second_door: true,
  extra_card: false,
  unredact_is_door_op: false,
  recover_is_door_op: false,
  handwriting_is_door_op: false,
  leftover_bytes: "honest recover",
  opaque_empty: "SL-UNREDACT-OPAQUE",
  revision_graph: true,
  recover_universal: true,
  recover_no_lie: true,
  recover_live_slot: true,
  handwriting_is_lab: false,
  handwriting_is_esda: false,
  heatmap_is_transcript: false,
  never_invent_letters: true,
  corpus_ocr_guesses: false,
  digest: SPECTRALLOCK_DIGEST,
  github: SPECTRALLOCK_GITHUB,
  worker: SPECTRALLOCK_WORKER_HOME,
  worker_home: SPECTRALLOCK_WORKER_HOME,
  download: SPECTRALLOCK_DOWNLOAD,
  count: SPECTRALLOCK_COUNT,
  unredact: SPECTRALLOCK_UNREDACT,
  recover: SPECTRALLOCK_RECOVER,
  handwriting: SPECTRALLOCK_HANDWRITING,
  worker_cite: SPECTRALLOCK_CITE_JSON,
  worker_llms: SPECTRALLOCK_LLMS,
  worker_sitemap: SPECTRALLOCK_SITEMAP,
  worker_skill: SPECTRALLOCK_SKILL,
  fraggate_describe: HOST + "/runtime/v1/fraggate/describe?slug=" + SPECTRALLOCK_SLUG,
  fraggate_call: HOST + "/runtime/v1/fraggate/call",
  fraggate_list: HOST + "/runtime/v1/fraggate/list",
  fraggate_describe_origin: RUNTIME_ORIGIN + "/v1/fraggate/describe?slug=" + SPECTRALLOCK_SLUG,
  fraggate_call_origin: RUNTIME_ORIGIN + "/v1/fraggate/call",
  pull: RUNTIME_ORIGIN + "/v1/pull/" + SPECTRALLOCK_SLUG,
  software: HOST + "/software",
  software_live: HOST + "/v1/software",
  ocr: HOST + "/ocr",
  forensics: HOST + "/forensics",
  ops: SPECTRALLOCK_LIVE_OPS,
  stub_ops: SPECTRALLOCK_STUB_OPS,
  one_line: SPECTRALLOCK_ONE_LINE,
  honesty: SPECTRALLOCK_HONESTY,
  ocr_note: SPECTRALLOCK_OCR_NOTE,
  compatible_clients: AI_CLIENTS,
  product_pr: SPECTRALLOCK_PRODUCT_PR,
  product_commit: SPECTRALLOCK_PRODUCT_COMMIT,
  runtime_pr: SPECTRALLOCK_RUNTIME_PR,
  doi: null,
  license: "Apache-2.0",
  author: AUTHOR,
  identity: AUTHOR,
  note: SPECTRALLOCK_NOTE,
  how_to_cite:
    "Eliab, Aziel. (2026). SpectralLock 0.3.0 [Software]. Apache-2.0. "
    + SPECTRALLOCK_GITHUB + " · " + SPECTRALLOCK_WORKER_HOME
    + " leftover-bytes recover honest; revision_graph on /v1/unredact; /v1/recover universal NO-LIE LIVE/SLOT; "
    + "/v1/handwriting ink heuristics not lab; opaque refuse SL-UNREDACT-OPAQUE.",
});

export function spectralLockCopyLooksHonest(text) {
  const t = String(text || "");
  return /leftover/i.test(t) && (/opaque|SL-UNREDACT|unredact/i.test(t));
}

export function spectrallockLlmsBlock(host = HOST) {
  const h = String(host || HOST).replace(/\/+$/, "");
  return [
    "SpectralLock (spectrallock) is a Softwares Media neighbor: leftover container bytes recover honestly; opaque empty refuses SL-UNREDACT-OPAQUE.",
    SPECTRALLOCK_HONESTY,
    "Unredact / recover / handwriting stay on the product Worker — not FragGate door ops. Do not invent door ops.",
    "Catalog LIVE_OPS: health, modes, targets, overlay, verify, doctor, skill. Stubs: spectrometer, forensic, invent_mark.",
    "Corpus OCR may mix advisory SpectralLock lenses. Corpus OCR does not unredact by guessing. Handwriting is not ESDA.",
    "Catalog card is Worker SSoT (GET /v1/software). Not a hardcoded extras card.",
    "Compatible AI clients: " + AI_CLIENTS + ".",
    "- SpectralLock Worker: " + SPECTRALLOCK_WORKER_HOME,
    "- SpectralLock unredact: " + SPECTRALLOCK_UNREDACT,
    "- SpectralLock recover: " + SPECTRALLOCK_RECOVER,
    "- SpectralLock handwriting: " + SPECTRALLOCK_HANDWRITING,
    "- SpectralLock GitHub: " + SPECTRALLOCK_GITHUB,
    "- SpectralLock download: " + SPECTRALLOCK_DOWNLOAD,
    "- SpectralLock Worker cite: " + SPECTRALLOCK_CITE_JSON,
    "- SpectralLock Worker llms: " + SPECTRALLOCK_LLMS,
    "- SpectralLock Worker sitemap: " + SPECTRALLOCK_SITEMAP,
    "- FragGate describe (this domain): " + h + "/runtime/v1/fraggate/describe?slug=" + SPECTRALLOCK_SLUG,
    "- FragGate call (this domain): POST " + h + "/runtime/v1/fraggate/call",
    "- FragGate describe (runtime origin): " + RUNTIME_ORIGIN + "/v1/fraggate/describe?slug=" + SPECTRALLOCK_SLUG,
    "- Runtime pull: " + RUNTIME_ORIGIN + "/v1/pull/" + SPECTRALLOCK_SLUG,
    "- Sister hub Software: " + h + "/software",
    "- Sister hub OCR: " + h + "/ocr",
    "- Sister hub Forensics: " + h + "/forensics",
    "- Product PR: " + SPECTRALLOCK_PRODUCT_PR + " (" + SPECTRALLOCK_PRODUCT_COMMIT + ")",
    "- Runtime vendor PR: " + SPECTRALLOCK_RUNTIME_PR,
  ].join("\n");
}

export function spectrallockCiteFields(host = HOST) {
  const h = String(host || HOST).replace(/\/+$/, "");
  return {
    spectrallock: Object.assign({}, SPECTRALLOCK, { software: h + "/software", ocr: h + "/ocr", forensics: h + "/forensics" }),
    spectrallock_slug: SPECTRALLOCK_SLUG,
    github_spectrallock: SPECTRALLOCK_GITHUB,
    spectrallock_unredact: SPECTRALLOCK_UNREDACT,
    spectrallock_recover: SPECTRALLOCK_RECOVER,
    spectrallock_handwriting: SPECTRALLOCK_HANDWRITING,
    spectrallock_cite: { ...SPECTRALLOCK_CITE },
  };
}
