/**
 * AZCoherence (azcoherence, AZC-0.1) library cite + Softwares extra + peer map.
 * Second-pass triad coherence (primary vs alternate → PASS/FLAG/NEUTRALIZE/REFUSE).
 * Scoring-review placement. Peer AZ-CLCE. Not AKM-TRIAD fabric. FragGate is THE single door.
 * Dual surface: agent chat has no technical UI chrome; Worker / mobile / local install /
 * counted download stay complete human software.
 * Identity: Aziel Eliab only.
 */
import { HOST, RUNTIME_ORIGIN, AI_CLIENTS } from "./runtime-copy.js";
import { GODLOCK_IDENTITY } from "./seo.js";

export const AUTHOR = "Aziel Eliab";
export const AZCOHERENCE_SLUG = "azcoherence";
export const AZCOHERENCE_NAME = "AZCoherence";
export const AZCOHERENCE_SPEC = "AZC-0.1";
export const AZCOHERENCE_VERSION = "0.1.0";
export const AZCOHERENCE_GITHUB = "https://github.com/AzielEliab/AZCoherence";
export const AZCOHERENCE_WORKER = "azcoherence-download-tracker";
export const AZCOHERENCE_WORKER_HOME = "https://azcoherence-download-tracker.vibelock.workers.dev/";
export const AZCOHERENCE_DOWNLOAD = AZCOHERENCE_WORKER_HOME + "download";
export const AZCOHERENCE_COUNT = AZCOHERENCE_WORKER_HOME + "count";

export const AZCLCE_SLUG = "azclce";
export const AZCLCE_NAME = "AZ-CLCE";
export const AZCLCE_GITHUB = "https://github.com/AzielEliab/az-clce";
export const AZCLCE_WORKER_HOME = "https://azclce-download-tracker.vibelock.workers.dev/";

export const AZIELELIAB_HUB = "https://www.azieleliab.com";

export const AZCOHERENCE_OPS = Object.freeze([
  "health",
  "skill",
  "doctor",
  "verify",
  "review_triad",
  "alternate_score",
  "coherence_check",
  "neutralize_hallucination",
]);

export const AZCOHERENCE_ONE_LINE =
  "AZCoherence (AZC-0.1): second-pass triad coherence review (primary vs alternate → PASS/FLAG/NEUTRALIZE/REFUSE). "
  + "Never invents evidence. Confidence ≠ truth. Peer AZ-CLCE. Not AKM-TRIAD. FragGate only. Author Aziel Eliab.";

export const AZCOHERENCE_DUAL_SURFACE =
  "Dual surface: agent chat has no technical UI chrome; Worker / mobile / local install / counted download stay complete human software.";

export const AZCOHERENCE_NOTE =
  "AZCoherence is the second-pass coherence reviewer for triad scores. "
  + "Scoring-adjacent to AZ-CLCE (Language isolation). Catalog software / Softwares Plain. "
  + "Not an extra door. Not AKM-TRIAD fabric. FragGate is THE single door. "
  + AZCOHERENCE_DUAL_SURFACE
  + " Compatible AI clients: " + AI_CLIENTS + ". Identity Aziel Eliab only.";

/** Sister hubs for cite / llms / Software cards. Not a second door. */
export const AZCOHERENCE_SISTER_HUBS = Object.freeze({
  library: HOST + "/software",
  library_cite: HOST + "/cite.json",
  library_llms: HOST + "/llms.txt",
  library_runtime: HOST + "/runtime",
  library_how_its_scored: HOST + "/how-its-scored",
  library_fraggate_describe: HOST + "/runtime/v1/fraggate/describe?slug=" + AZCOHERENCE_SLUG,
  library_fraggate_call: HOST + "/runtime/v1/fraggate/call",
  library_fraggate_list: HOST + "/runtime/v1/fraggate/list",
  library_mcp: HOST + "/runtime/mcp",
  runtime: RUNTIME_ORIGIN + "/",
  runtime_software: RUNTIME_ORIGIN + "/v1/software",
  runtime_cite: RUNTIME_ORIGIN + "/cite.json",
  runtime_llms: RUNTIME_ORIGIN + "/llms.txt",
  runtime_fraggate_describe: RUNTIME_ORIGIN + "/v1/fraggate/describe?slug=" + AZCOHERENCE_SLUG,
  runtime_fraggate_call: RUNTIME_ORIGIN + "/v1/fraggate/call",
  runtime_pull: RUNTIME_ORIGIN + "/v1/pull/" + AZCOHERENCE_SLUG,
  godlock: GODLOCK_IDENTITY,
  azieleliab: AZIELELIAB_HUB,
  github_author: "https://github.com/AzielEliab",
});

/** Scoring-review peer map. AZCoherence ↔ AZ-CLCE. Not AKM-TRIAD. */
export const AZCOHERENCE_PEER_MAP = Object.freeze({
  azcoherence: Object.freeze({
    slug: AZCOHERENCE_SLUG,
    peer: AZCLCE_SLUG,
    peer_name: AZCLCE_NAME,
    relation: "scoring-adjacent",
    placement: "scoring-review",
    github: AZCOHERENCE_GITHUB,
    worker: AZCOHERENCE_WORKER_HOME,
  }),
  azclce: Object.freeze({
    slug: AZCLCE_SLUG,
    peer: AZCOHERENCE_SLUG,
    peer_name: AZCOHERENCE_NAME,
    relation: "scoring-adjacent",
    placement: "language-isolation",
    github: AZCLCE_GITHUB,
    worker: AZCLCE_WORKER_HOME,
  }),
  akm_triad: Object.freeze({
    spec: "AKM-TRIAD-1.0",
    peer: false,
    softwares_tab: false,
    note: "AKM-TRIAD-1.0 is LIVE fabric behind FragGate, not a Softwares-tab product. AZCoherence is not AKM-TRIAD.",
  }),
});

export const AZCOHERENCE_SOFTWARE_EXTRA = Object.freeze({
  slug: AZCOHERENCE_SLUG,
  name: AZCOHERENCE_NAME,
  version: AZCOHERENCE_VERSION,
  github: AZCOHERENCE_GITHUB,
  download: AZCOHERENCE_DOWNLOAD,
  worker: AZCOHERENCE_WORKER,
  worker_home: AZCOHERENCE_WORKER_HOME,
  count: AZCOHERENCE_COUNT,
  one_line: AZCOHERENCE_ONE_LINE,
});

export const AZCOHERENCE = Object.freeze({
  slug: AZCOHERENCE_SLUG,
  name: AZCOHERENCE_NAME,
  spec: AZCOHERENCE_SPEC,
  version: AZCOHERENCE_VERSION,
  placement: "scoring-review",
  kind: "plain",
  bucket: "plain",
  door: "fraggate",
  fraggate_single_door: true,
  not_a_second_door: true,
  not_akm_triad: true,
  peer: AZCLCE_SLUG,
  peer_name: AZCLCE_NAME,
  peer_github: AZCLCE_GITHUB,
  peer_worker: AZCLCE_WORKER_HOME,
  github: AZCOHERENCE_GITHUB,
  worker: AZCOHERENCE_WORKER_HOME,
  worker_home: AZCOHERENCE_WORKER_HOME,
  download: AZCOHERENCE_DOWNLOAD,
  count: AZCOHERENCE_COUNT,
  worker_cite: AZCOHERENCE_WORKER_HOME + "cite.json",
  worker_llms: AZCOHERENCE_WORKER_HOME + "llms.txt",
  worker_skill: AZCOHERENCE_WORKER_HOME + "v1/skill",
  install: AZCOHERENCE_WORKER_HOME + "install.sh",
  fraggate_describe: HOST + "/runtime/v1/fraggate/describe?slug=" + AZCOHERENCE_SLUG,
  fraggate_call: HOST + "/runtime/v1/fraggate/call",
  fraggate_list: HOST + "/runtime/v1/fraggate/list",
  fraggate_describe_origin: RUNTIME_ORIGIN + "/v1/fraggate/describe?slug=" + AZCOHERENCE_SLUG,
  fraggate_call_origin: RUNTIME_ORIGIN + "/v1/fraggate/call",
  pull: RUNTIME_ORIGIN + "/v1/pull/" + AZCOHERENCE_SLUG,
  software: HOST + "/software",
  how_its_scored: HOST + "/how-its-scored",
  ops: AZCOHERENCE_OPS,
  one_line: AZCOHERENCE_ONE_LINE,
  dual_surface: AZCOHERENCE_DUAL_SURFACE,
  compatible_clients: AI_CLIENTS,
  sister_hubs: AZCOHERENCE_SISTER_HUBS,
  peer_map: AZCOHERENCE_PEER_MAP,
  doi: null,
  license: "Apache-2.0",
  author: AUTHOR,
  identity: AUTHOR,
  note: AZCOHERENCE_NOTE,
  how_to_cite:
    "Eliab, Aziel. (2026). AZCoherence 0.1.0 [Software]. Apache-2.0. "
    + AZCOHERENCE_GITHUB + " · " + AZCOHERENCE_WORKER_HOME,
});

export function azcoherenceLlmsBlock() {
  return [
    "AZCoherence (azcoherence, AZC-0.1) is live Softwares Plain / scoring-review. "
      + "Second-pass triad coherence (primary vs alternate → PASS/FLAG/NEUTRALIZE/REFUSE). "
      + "Peer AZ-CLCE. Not AKM-TRIAD. FragGate is the single door. Author Aziel Eliab only.",
    AZCOHERENCE_DUAL_SURFACE,
    "Compatible AI clients: " + AI_CLIENTS + ".",
    "- AZCoherence Worker: " + AZCOHERENCE_WORKER_HOME,
    "- AZCoherence GitHub: " + AZCOHERENCE_GITHUB,
    "- AZCoherence download: " + AZCOHERENCE_DOWNLOAD,
    "- AZCoherence Worker cite: " + AZCOHERENCE_WORKER_HOME + "cite.json",
    "- AZCoherence Worker llms: " + AZCOHERENCE_WORKER_HOME + "llms.txt",
    "- FragGate describe (this domain): " + HOST + "/runtime/v1/fraggate/describe?slug=" + AZCOHERENCE_SLUG,
    "- FragGate call (this domain): POST " + HOST + "/runtime/v1/fraggate/call",
    "- FragGate describe (runtime origin): " + RUNTIME_ORIGIN + "/v1/fraggate/describe?slug=" + AZCOHERENCE_SLUG,
    "- FragGate call (runtime origin): POST " + RUNTIME_ORIGIN + "/v1/fraggate/call",
    "- Runtime pull: " + RUNTIME_ORIGIN + "/v1/pull/" + AZCOHERENCE_SLUG,
    "- Sister hub Software: " + HOST + "/software",
    "- Sister hub runtime: " + RUNTIME_ORIGIN + "/",
    "- Sister hub azieleliab.com: " + AZIELELIAB_HUB,
    "- Sister hub GodLock identity: " + GODLOCK_IDENTITY,
    "- Peer AZ-CLCE Worker: " + AZCLCE_WORKER_HOME,
    "- Peer AZ-CLCE GitHub: " + AZCLCE_GITHUB,
  ].join("\n");
}
