/**
 * PeaceLock — Softwares cite only (not a SOFTWARE_EXTRAS card).
 * Coordinator lock: public GitHub + local-only runtime (not private).
 * FragGate status stays live (GET /v1/software + fraggate_describe). Do not invent
 * VeilLock-class local_only. Do not invent private doctrine.
 * Hosted API is stateless; receipts stay on the operator machine.
 * Catalog card is Worker SSoT (GET /v1/software). Product version stays on the card.
 * Public suite version is Softwares SSoT catalog.version.
 * FragGate is THE single door. Author: Aziel Eliab only.
 * Lamb Lens: Service → Clarity → Peace.
 */
import { HOST, RUNTIME_ORIGIN, AI_CLIENTS } from "./runtime-copy.js";

export const AUTHOR = "Aziel Eliab";
export const PEACELOCK_SLUG = "peacelock";
export const PEACELOCK_NAME = "PeaceLock";
export const PEACELOCK_PRODUCT_VERSION = "0.1.0";
export const PEACELOCK_SPEC = "PL-WP-0.1";
export const PEACELOCK_GITHUB = "https://github.com/AzielEliab/peacelock";
export const PEACELOCK_WORKER = "peacelock-download-tracker";
export const PEACELOCK_WORKER_HOME = "https://peacelock-download-tracker.vibelock.workers.dev/";
export const PEACELOCK_DOWNLOAD = PEACELOCK_WORKER_HOME + "download";
export const PEACELOCK_COUNT = PEACELOCK_WORKER_HOME + "count";
export const PEACELOCK_CITE_JSON = PEACELOCK_WORKER_HOME + "cite.json";
export const PEACELOCK_LLMS = PEACELOCK_WORKER_HOME + "llms.txt";
export const PEACELOCK_SITEMAP = PEACELOCK_WORKER_HOME + "sitemap.xml";
export const PEACELOCK_SKILL = PEACELOCK_WORKER_HOME + "v1/skill";
export const PEACELOCK_HEALTH = PEACELOCK_WORKER_HOME + "v1/health";
export const PEACELOCK_INSTALL = PEACELOCK_WORKER_HOME + "install.sh";
export const PEACELOCK_MCP = PEACELOCK_WORKER_HOME + "mcp";
export const PEACELOCK_OPENAPI = PEACELOCK_WORKER_HOME + "openapi.json";
/** Hasher digest from live fraggate_describe. Do not invent. */
export const PEACELOCK_DIGEST = "291437f64ba15338d6358e6d2e657870619b19133430be3574d458b8db469a66";
export const PEACELOCK_DOMAIN = "Evidence";

/** Catalog LIVE_OPS from Softwares SSoT / fraggate_describe. */
export const PEACELOCK_LIVE_OPS = Object.freeze([
  "health",
  "open",
  "seal",
  "break",
  "show",
  "verify",
  "stamp",
  "upload_envelope",
  "doctor",
  "skill",
]);

export const PEACELOCK_STUB_OPS = Object.freeze([
  "transcript",
  "transcribe",
  "motive",
  "counterfactual",
  "invent",
  "waive-duty",
  "bypass-duty",
]);

/** Worker SSoT one_line. Softwares tab refreshes from GET /v1/software. */
export const PEACELOCK_ONE_LINE =
  "Record chosen silence or chosen inaction as a hash-chained receipt.";

export const PEACELOCK_NOTE =
  "PeaceLock (Softwares): record chosen silence or chosen inaction as a hash-chained receipt (PL-WP-0.1). "
  + "Public GitHub " + PEACELOCK_GITHUB + ". "
  + "Local-only runtime: operator-local receipts; hosted API is stateless. "
  + "Download " + PEACELOCK_DOWNLOAD + ". "
  + "Catalog entry ships on aziel-runtime GET /v1/software (Worker SSoT); this library Softwares tab refreshes from that Worker SSoT.";

/** Cite-only Softwares mention. Not a SOFTWARE_EXTRAS card. Catalog is Worker SSoT. */
export const PEACELOCK_CITE = Object.freeze({
  name: PEACELOCK_NAME,
  slug: PEACELOCK_SLUG,
  one_line: PEACELOCK_ONE_LINE,
  note: PEACELOCK_NOTE,
  spec: PEACELOCK_SPEC,
  product_version: PEACELOCK_PRODUCT_VERSION,
  domain: PEACELOCK_DOMAIN,
  digest: PEACELOCK_DIGEST,
  github: PEACELOCK_GITHUB,
  worker_home: PEACELOCK_WORKER_HOME,
  download: PEACELOCK_DOWNLOAD,
  count: PEACELOCK_COUNT,
  install: PEACELOCK_INSTALL,
  cite: PEACELOCK_CITE_JSON,
  llms: PEACELOCK_LLMS,
  sitemap: PEACELOCK_SITEMAP,
  skill: PEACELOCK_SKILL,
  health: PEACELOCK_HEALTH,
  mcp: PEACELOCK_MCP,
  openapi: PEACELOCK_OPENAPI,
  public: true,
  public_github: true,
  private: false,
  runtime: "local-only",
  hosted_api: "stateless",
  fraggate_status: "live",
  fraggate_local_only: false,
  extra_card: false,
  live_ops: PEACELOCK_LIVE_OPS.slice(),
  stub_ops: PEACELOCK_STUB_OPS.slice(),
});

export const PEACELOCK = Object.freeze({
  slug: PEACELOCK_SLUG,
  name: PEACELOCK_NAME,
  product_version: PEACELOCK_PRODUCT_VERSION,
  spec: PEACELOCK_SPEC,
  kind: "lock",
  domain: PEACELOCK_DOMAIN,
  placement: "domain-software",
  door: "fraggate",
  fraggate_single_door: true,
  fraggate_status: "live",
  fraggate_local_only: false,
  extra_card: false,
  public: true,
  public_github: true,
  private: false,
  runtime: "local-only",
  hosted_api: "stateless",
  digest: PEACELOCK_DIGEST,
  github: PEACELOCK_GITHUB,
  worker: PEACELOCK_WORKER_HOME,
  worker_home: PEACELOCK_WORKER_HOME,
  download: PEACELOCK_DOWNLOAD,
  count: PEACELOCK_COUNT,
  install: PEACELOCK_INSTALL,
  worker_cite: PEACELOCK_CITE_JSON,
  worker_llms: PEACELOCK_LLMS,
  worker_sitemap: PEACELOCK_SITEMAP,
  worker_skill: PEACELOCK_SKILL,
  health: PEACELOCK_HEALTH,
  mcp: PEACELOCK_MCP,
  openapi: PEACELOCK_OPENAPI,
  fraggate_describe: HOST + "/runtime/v1/fraggate/describe?slug=" + PEACELOCK_SLUG,
  fraggate_call: HOST + "/runtime/v1/fraggate/call",
  fraggate_list: HOST + "/runtime/v1/fraggate/list",
  fraggate_describe_origin: RUNTIME_ORIGIN + "/v1/fraggate/describe?slug=" + PEACELOCK_SLUG,
  fraggate_call_origin: RUNTIME_ORIGIN + "/v1/fraggate/call",
  pull: RUNTIME_ORIGIN + "/v1/pull/" + PEACELOCK_SLUG,
  software: HOST + "/software",
  software_live: HOST + "/v1/software",
  ops: PEACELOCK_LIVE_OPS,
  stub_ops: PEACELOCK_STUB_OPS,
  one_line: PEACELOCK_ONE_LINE,
  compatible_clients: AI_CLIENTS,
  doi: null,
  license: "Apache-2.0",
  author: AUTHOR,
  identity: AUTHOR,
  note: PEACELOCK_NOTE,
  how_to_cite:
    "Eliab, Aziel. (2026). PeaceLock 0.1.0 [Software]. Apache-2.0. "
    + PEACELOCK_GITHUB + " · " + PEACELOCK_WORKER_HOME
    + " public GitHub; local-only runtime receipts; hosted API stateless.",
});

export function peacelockLlmsBlock(host = HOST) {
  const h = String(host || HOST).replace(/\/+$/, "");
  return [
    "PeaceLock (peacelock) is a Softwares Evidence neighbor: public GitHub + local-only runtime.",
    PEACELOCK_ONE_LINE,
    "Public GitHub " + PEACELOCK_GITHUB + ". Local-only runtime: operator-local receipts; hosted API is stateless.",
    "Catalog LIVE_OPS: health, open, seal, break, show, verify, stamp, upload_envelope, doctor, skill.",
    "Catalog card is Worker SSoT (GET /v1/software). Product version stays on the card.",
    "Compatible AI clients: " + AI_CLIENTS + ".",
    "- PeaceLock Worker: " + PEACELOCK_WORKER_HOME,
    "- PeaceLock GitHub: " + PEACELOCK_GITHUB,
    "- PeaceLock download: " + PEACELOCK_DOWNLOAD,
    "- PeaceLock install: " + PEACELOCK_INSTALL,
    "- PeaceLock Worker cite: " + PEACELOCK_CITE_JSON,
    "- PeaceLock Worker llms: " + PEACELOCK_LLMS,
    "- PeaceLock Worker sitemap: " + PEACELOCK_SITEMAP,
    "- FragGate describe (this domain): " + h + "/runtime/v1/fraggate/describe?slug=" + PEACELOCK_SLUG,
    "- FragGate call (this domain): POST " + h + "/runtime/v1/fraggate/call",
    "- FragGate describe (runtime origin): " + RUNTIME_ORIGIN + "/v1/fraggate/describe?slug=" + PEACELOCK_SLUG,
    "- Runtime pull: " + RUNTIME_ORIGIN + "/v1/pull/" + PEACELOCK_SLUG,
    "- Sister hub Software: " + h + "/software",
  ].join("\n");
}

export function peacelockCiteFields(host = HOST) {
  const h = String(host || HOST).replace(/\/+$/, "");
  return {
    peacelock: Object.assign({}, PEACELOCK, { software: h + "/software" }),
    peacelock_slug: PEACELOCK_SLUG,
    github_peacelock: PEACELOCK_GITHUB,
    peacelock_cite: { ...PEACELOCK_CITE },
  };
}
