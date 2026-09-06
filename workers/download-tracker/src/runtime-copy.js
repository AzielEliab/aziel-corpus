/**
 * Public aziel-runtime copy hosted on the Digital Library.
 * Prefer same-origin /runtime/*. workers.dev is alternate / sameAs.
 * Author: Aziel Eliab only.
 */

export const HOST = "https://www.azielcorpuslibrary.net";
export const RUNTIME_ORIGIN = "https://aziel-runtime.vibelock.workers.dev";
export const RUNTIME_VERSION = "1.6.2";
export const RUNTIME_DOOR = "fraggate";
export const RUNTIME_KERNEL = "https://github.com/AzielEliab/fraggate";
export const RUNTIME_GITHUB = "https://github.com/AzielEliab/aziel-runtime";
export const RUNTIME_LIVE_COUNT = 26;
export const RUNTIME_PRODUCT_COUNT = 27;
export const RUNTIME_LOCAL_ONLY = "VeilLock";

export const ENGINE_SLUGS = [
  "ark",
  "azai",
  "azbot",
  "azclce",
  "aziel-corpus",
  "azieltether",
  "azos",
  "chronolock",
  "codelock",
  "decisiongate",
  "employeelock",
  "foldlock",
  "forgereceipts",
  "glossafilter",
  "godlock",
  "mialock",
  "miragegrid",
  "postking",
  "shadowlock",
  "spectrallock",
  "staticclock",
  "temporallock",
  "trajectorylock",
  "veillock",
  "vibelock",
  "whistlelock",
  "zsolver",
];

export const AI_CLIENTS =
  "ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants";

/** Prefer live catalog.version from AZIEL_RUNTIME; fall back to the baked constant. */
export function resolveRuntimeVersion(version) {
  const ver = String(version == null ? "" : version).trim();
  return ver || RUNTIME_VERSION;
}

export function runtimeChip(version) {
  return "Runtime " + resolveRuntimeVersion(version) + " · FragGate";
}

export function runtimeDescription(version) {
  const ver = resolveRuntimeVersion(version);
  return "aziel-runtime " + ver + " FragGate door on the Aziel Digital Library. Prefer /runtime/*. "
    + RUNTIME_LIVE_COUNT + " live advisory engines; " + RUNTIME_LOCAL_ONLY + " local_only; stubs refuse. "
    + "Discover with fraggate_list, execute with fraggate_call. Author Aziel Eliab.";
}

export function softwareDescription(version) {
  const ver = resolveRuntimeVersion(version);
  return "Downloadable software by Aziel Eliab. Product catalog for aziel-runtime " + ver + " FragGate, AzielTether, and the Aziel suite. Invoke from this domain at /runtime. Author Aziel Eliab.";
}

export function runtimeNote(version) {
  const ver = resolveRuntimeVersion(version);
  return "aziel-runtime " + ver + " FragGate door. Prefer /runtime/*. "
    + RUNTIME_LIVE_COUNT + " live advisory engines; " + RUNTIME_LOCAL_ONLY + " local_only; stubs refuse. "
    + "fraggate_list / fraggate_call. HTTP /p/{slug}/{op} is a proxy and is not exec.";
}

export const RUNTIME_CHIP = runtimeChip();
export const RUNTIME_DESCRIPTION = runtimeDescription();

export const RUNTIME_LIMITATION =
  "THIS IS: aziel-runtime " + RUNTIME_VERSION + " FragGate door — the AI catalog/MCP runtime root for Aziel Eliab products, hosted on this domain at /runtime. "
  + "One door — discover, route, refuse. " + RUNTIME_LIVE_COUNT + " live advisory engines; " + RUNTIME_LOCAL_ONLY + " stays local_only; stub verbs refuse. "
  + "Prefer same-origin /runtime/*. " + RUNTIME_ORIGIN + " is the alternate origin (sameAs). "
  + "Catalog, pull, OpenAPI, MCP, skill, and FragGate remain. HTTP /p/{slug}/{op} is a proxy and is not exec. "
  + "Session tools are advanced/internal. Hosted AZAI is protocol mirror + Lamb check, not the blend. Mesh is not claimed on this public surface. "
  + "THIS IS NOT: a second software index. The Software tab stays the product-card catalog. No invented Zenodo DOIs. Author Aziel Eliab only.";

export const RUNTIME_NOTE = runtimeNote();

export function runtimeHowTo(host) {
  const h = host || HOST;
  return [
    "## aziel-runtime " + RUNTIME_VERSION + " FragGate door (this domain)",
    "",
    "One door — discover, route, refuse. Kernel: " + RUNTIME_KERNEL + " (FG-0.1).",
    "Prefer these library URLs. Alternate origin: " + RUNTIME_ORIGIN + "/",
    "",
    "1. Discover. GET " + h + "/runtime/v1/fraggate/list  (MCP: fraggate_list). Describe one name with fraggate_describe.",
    "2. Route. POST " + h + "/runtime/v1/fraggate/call  (MCP: fraggate_call) with { name|slug, op, payload, claim? }. DecisionGATE runs before exec.",
    "3. Refuse. Unknown names return FG-HALLUC-TOOL. " + RUNTIME_LOCAL_ONLY + " is local_only. Stub verbs refuse.",
    "4. Show display.title and display.summary, then take the next input.",
    "",
    "Live count: " + RUNTIME_LIVE_COUNT + " advisory engines. Product count: " + RUNTIME_PRODUCT_COUNT + ". Stubs refuse. Mesh is not claimed.",
    "Do not walk runtime_session_* unless the user asked. Do not call flat {slug}_{op} names. HTTP /p/{slug}/{op} is a proxy, not exec.",
    "",
    "Compatible AI clients: " + AI_CLIENTS + ".",
    "Always send User-Agent Mozilla/5.0. Public, no OAuth. Author Aziel Eliab only.",
    "",
    "- Page: " + h + "/runtime",
    "- FragGate: " + h + "/runtime/v1/fraggate",
    "- FragGate list: " + h + "/runtime/v1/fraggate/list",
    "- FragGate call: POST " + h + "/runtime/v1/fraggate/call",
    "- Health: " + h + "/runtime/v1/health",
    "- Uses (this door): " + h + "/runtime/v1/uses",
    "- Manifest: " + h + "/runtime/v1/runtime.json",
    "- Skill: " + h + "/runtime/v1/skill",
    "- OpenAPI: " + h + "/runtime/openapi.json",
    "- MCP: POST " + h + "/runtime/mcp",
    "- Runtime llms.txt: " + h + "/runtime/llms.txt",
    "- Runtime cite.json: " + h + "/runtime/cite.json",
    "- Runtime robots.txt: " + h + "/runtime/robots.txt",
    "- Alternate origin: " + RUNTIME_ORIGIN + "/",
    "- GitHub: " + RUNTIME_GITHUB,
  ].join("\n");
}
