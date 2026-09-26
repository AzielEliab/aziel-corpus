/**
 * Trades-Runtime — Softwares extra + machine cite only.
 * Public Softwares extra / cite — BYO field OS
 * (HVAC / plumbing / electrical / sewer / cross-trades).
 * Operators bring their own ServiceTitan + ProBooks. Human authority wins.
 * Sister product; live_backends false. Public get = this product Worker download.
 * GitHub Pages stay off. Identity: Aziel Eliab only.
 */
import { HOST, RUNTIME_ORIGIN, AI_CLIENTS } from "./runtime-copy.js";
import { GODLOCK_IDENTITY } from "./seo.js";

export const AUTHOR = "Aziel Eliab";
export const TRADES_RUNTIME_SLUG = "trades-runtime";
export const TRADES_RUNTIME_NAME = "Trades-Runtime";
/**
 * Public Worker / giveaway version.
 * Matches GET https://trades-runtime.vibelock.workers.dev/v1/health `version`
 * (role public-giveaway). Softwares pill and machine cite use this string.
 * Not the Glama MCP listing Latest/Version — that public listing is still ~0.3.4
 * and Create Release there is blocked. Do not cite Glama as this version.
 */
export const TRADES_RUNTIME_VERSION = "0.4.6";
export const TRADES_RUNTIME_GITHUB = "https://github.com/AzielEliab/trades-runtime";
export const TRADES_RUNTIME_WORKER = "trades-runtime";
export const TRADES_RUNTIME_WORKER_HOME = "https://trades-runtime.vibelock.workers.dev/";
export const TRADES_RUNTIME_DOWNLOAD = "https://trades-runtime.vibelock.workers.dev/download";
/** Honest count URL. This Worker publishes /v1/stats, not /count. */
export const TRADES_RUNTIME_STATS = "https://trades-runtime.vibelock.workers.dev/v1/stats";
export const TRADES_RUNTIME_COUNT = TRADES_RUNTIME_STATS;
export const TRADES_RUNTIME_MCP = "https://trades-runtime.vibelock.workers.dev/mcp";
export const TRADES_RUNTIME_OPENAPI = "https://trades-runtime.vibelock.workers.dev/openapi.json";
export const TRADES_RUNTIME_CITE = "https://trades-runtime.vibelock.workers.dev/cite.json";
export const TRADES_RUNTIME_LLMS = "https://trades-runtime.vibelock.workers.dev/llms.txt";
export const TRADES_RUNTIME_SKILL = "https://trades-runtime.vibelock.workers.dev/v1/skill";
export const TRADES_RUNTIME_HEALTH = "https://trades-runtime.vibelock.workers.dev/v1/health";
export const TRADES_RUNTIME_ALIASES = Object.freeze(["trades-runtime", "tradesruntime", "trades_runtime"]);

export const AZIELELIAB_HUB = "https://www.azieleliab.com";

export const TRADES_RUNTIME_ONE_LINE =
  "Shadow-first local BYO field OS for HVAC, plumbing, electrical, sewer, and cross-trades. "
  + "Operators bring their own ServiceTitan + ProBooks. Human authority wins. "
  + "live_backends: false.";

export const TRADES_RUNTIME_DUAL_SURFACE =
  "Dual surface: agent chat has no technical UI chrome; Worker / local install / counted download stay complete human software.";

export const TRADES_RUNTIME_NOTE =
  "Trades-Runtime is a public Softwares extra / local-first BYO field OS. "
  + "Library MCP stays corpus-search; this product hosts its own read-only MCP (health, stats, cite, skill). "
  + "GitHub Pages stay off. Public get = Worker download. "
  + TRADES_RUNTIME_DUAL_SURFACE
  + " Compatible AI clients: " + AI_CLIENTS + ". Identity Aziel Eliab only.";

export const TRADES_RUNTIME_SISTER_HUBS = Object.freeze({
  library: HOST + "/software",
  library_cite: HOST + "/cite.json",
  library_llms: HOST + "/llms.txt",
  library_software: HOST + "/v1/software",
  library_mcp: HOST + "/mcp",
  library_mcp_discovery: HOST + "/.well-known/mcp.json",
  runtime: RUNTIME_ORIGIN + "/",
  runtime_software: RUNTIME_ORIGIN + "/v1/software",
  runtime_cite: RUNTIME_ORIGIN + "/cite.json",
  runtime_llms: RUNTIME_ORIGIN + "/llms.txt",
  godlock: GODLOCK_IDENTITY,
  azieleliab: AZIELELIAB_HUB,
  github_author: "https://github.com/AzielEliab",
});

export const TRADES_RUNTIME_SAME_AS = Object.freeze([
  TRADES_RUNTIME_GITHUB,
  TRADES_RUNTIME_WORKER_HOME,
  TRADES_RUNTIME_DOWNLOAD,
  TRADES_RUNTIME_MCP,
  TRADES_RUNTIME_CITE,
  HOST + "/software",
]);

export function isTradesRuntimeSlug(slug) {
  const s = String(slug || "").toLowerCase().trim();
  return TRADES_RUNTIME_ALIASES.includes(s);
}

export const TRADES_RUNTIME_SOFTWARE_EXTRA = Object.freeze({
  slug: TRADES_RUNTIME_SLUG,
  name: TRADES_RUNTIME_NAME,
  version: TRADES_RUNTIME_VERSION,
  github: TRADES_RUNTIME_GITHUB,
  download: TRADES_RUNTIME_DOWNLOAD,
  worker: TRADES_RUNTIME_WORKER,
  worker_home: TRADES_RUNTIME_WORKER_HOME,
  count: TRADES_RUNTIME_STATS,
  mcp: TRADES_RUNTIME_MCP,
  fraggate_engine: false,
  live_backends: false,
  hosted_company_os: false,
  byo_field_os: true,
  pages: "off",
  one_line: TRADES_RUNTIME_ONE_LINE,
});

export const TRADES_RUNTIME = Object.freeze({
  slug: TRADES_RUNTIME_SLUG,
  name: TRADES_RUNTIME_NAME,
  aliases: TRADES_RUNTIME_ALIASES.slice(),
  version: TRADES_RUNTIME_VERSION,
  kind: "plain",
  placement: "softwares-extra",
  door: null,
  fraggate_engine: false,
  fraggate_single_door: false,
  not_aziel_runtime: true,
  not_a_second_door: true,
  live_backends: false,
  hosted_company_os: false,
  byo_field_os: true,
  tenant_data: false,
  servicetitan_write: false,
  probooks_write: false,
  pages: "off",
  github: TRADES_RUNTIME_GITHUB,
  worker: TRADES_RUNTIME_WORKER_HOME,
  worker_home: TRADES_RUNTIME_WORKER_HOME,
  download: TRADES_RUNTIME_DOWNLOAD,
  count: TRADES_RUNTIME_STATS,
  stats: TRADES_RUNTIME_STATS,
  mcp: TRADES_RUNTIME_MCP,
  openapi: TRADES_RUNTIME_OPENAPI,
  worker_cite: TRADES_RUNTIME_CITE,
  worker_llms: TRADES_RUNTIME_LLMS,
  worker_skill: TRADES_RUNTIME_SKILL,
  health: TRADES_RUNTIME_HEALTH,
  software: HOST + "/software",
  software_live: HOST + "/v1/software",
  one_line: TRADES_RUNTIME_ONE_LINE,
  dual_surface: TRADES_RUNTIME_DUAL_SURFACE,
  compatible_clients: AI_CLIENTS,
  sister_hubs: TRADES_RUNTIME_SISTER_HUBS,
  sameAs: TRADES_RUNTIME_SAME_AS.slice(),
  doi: null,
  license: "Apache-2.0",
  author: AUTHOR,
  identity: AUTHOR,
  note: TRADES_RUNTIME_NOTE,
  how_to_cite:
    "Eliab, Aziel. (2026). Trades-Runtime " + TRADES_RUNTIME_VERSION + " [Software]. Apache-2.0. "
    + TRADES_RUNTIME_GITHUB + " · " + TRADES_RUNTIME_WORKER_HOME,
});

export function tradesRuntimeLlmsBlock(host = HOST) {
  const h = String(host || HOST).replace(/\/+$/, "");
  return [
    "Trades-Runtime (trades-runtime) is a public Softwares extra / BYO field OS.",
    TRADES_RUNTIME_ONE_LINE,
    TRADES_RUNTIME_DUAL_SURFACE,
    "GitHub Pages off. Public get = Worker download. Counters live at /v1/stats.",
    "Product MCP is read-only (health, stats, cite, skill). Library MCP stays corpus-search and does not write ServiceTitan or ProBooks.",
    "Compatible AI clients: " + AI_CLIENTS + ".",
    "- Trades-Runtime Softwares card: " + h + "/software",
    "- Trades-Runtime live catalog: " + h + "/v1/software",
    "- Trades-Runtime Worker: " + TRADES_RUNTIME_WORKER_HOME,
    "- Trades-Runtime GitHub: " + TRADES_RUNTIME_GITHUB,
    "- Trades-Runtime download: " + TRADES_RUNTIME_DOWNLOAD,
    "- Trades-Runtime stats: " + TRADES_RUNTIME_STATS,
    "- Trades-Runtime MCP: POST " + TRADES_RUNTIME_MCP,
    "- Trades-Runtime OpenAPI: " + TRADES_RUNTIME_OPENAPI,
    "- Trades-Runtime Worker cite: " + TRADES_RUNTIME_CITE,
    "- Trades-Runtime Worker llms: " + TRADES_RUNTIME_LLMS,
    "- Sister hub azieleliab.com: " + AZIELELIAB_HUB,
    "- Sister hub GodLock identity: " + GODLOCK_IDENTITY,
  ].join("\n");
}

export function tradesRuntimeCiteFields(host = HOST) {
  const h = String(host || HOST).replace(/\/+$/, "");
  return {
    trades_runtime: TRADES_RUNTIME,
    trades_runtime_slug: TRADES_RUNTIME_SLUG,
    github_trades_runtime: TRADES_RUNTIME_GITHUB,
    trades_runtime_mcp: TRADES_RUNTIME_MCP,
    products_trades_runtime: {
      slug: TRADES_RUNTIME_SLUG,
      name: TRADES_RUNTIME_NAME,
      version: TRADES_RUNTIME_VERSION,
      description: TRADES_RUNTIME_ONE_LINE,
      github: TRADES_RUNTIME_GITHUB,
      download: TRADES_RUNTIME_DOWNLOAD,
      mcp: TRADES_RUNTIME_MCP,
      stats: TRADES_RUNTIME_STATS,
      software: h + "/software",
      live_backends: false,
      pages: "off",
      how_to_cite: TRADES_RUNTIME.how_to_cite,
      sameAs: TRADES_RUNTIME_SAME_AS.slice(),
    },
  };
}

export function tradesRuntimeMcpDiscovery() {
  return {
    name: TRADES_RUNTIME_SLUG,
    title: TRADES_RUNTIME_NAME,
    url: TRADES_RUNTIME_MCP,
    transport: "http",
    type: "http",
    openapi: TRADES_RUNTIME_OPENAPI,
    cite: TRADES_RUNTIME_CITE,
    skill: TRADES_RUNTIME_SKILL,
    note: "Read-only product MCP (health, stats, cite, skill). Not FragGate. No ServiceTitan or ProBooks write.",
    author: AUTHOR,
    identity: AUTHOR,
    version: TRADES_RUNTIME_VERSION,
    live_backends: false,
  };
}
