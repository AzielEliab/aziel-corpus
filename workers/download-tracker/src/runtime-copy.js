/**
 * Public aziel-runtime copy hosted on the Digital Library.
 * Prefer same-origin /runtime/*. workers.dev is alternate / sameAs.
 * Author: Aziel Eliab only.
 */

export const HOST = "https://www.azielcorpuslibrary.net";
export const RUNTIME_ORIGIN = "https://aziel-runtime.vibelock.workers.dev";
export const RUNTIME_VERSION = "2.0.0-rc1";
export const RUNTIME_DOOR = "fraggate";
export const RUNTIME_KERNEL = "https://github.com/AzielEliab/fraggate";
export const RUNTIME_GITHUB = "https://github.com/AzielEliab/aziel-runtime";
/** Official 2.0 certification pack. Coordinator deploys; hub cites only. */
export const RUNTIME_DOCS = RUNTIME_GITHUB + "/tree/main/docs/2.0";
/**
 * Published Glama listing uses the GitHub owner/repo path.
 * Do not invent a Glama server UUID.
 */
export const RUNTIME_GLAMA = "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime";
export const RUNTIME_GLAMA_LABEL = "Try on Glama";
export const RUNTIME_WORKER_LABEL = "Official Runtime";
export const RUNTIME_LIVE_COUNT = 37;
export const RUNTIME_PRODUCT_COUNT = 37;
export const RUNTIME_LOCAL_ONLY = "VeilLock";
export const LIBRARY_DOWNLOAD = HOST + "/download";
export const LIBRARY_V1_DOWNLOAD = HOST + "/v1/download";
export const LIBRARY_COUNT = HOST + "/count";

/** Softwares-tab engines. Must match live GET /runtime/v1/health count (37). */
export const ENGINE_SLUGS = [
  "4dmap",
  "ark",
  "azai",
  "azbot",
  "azbrowser",
  "azchat",
  "azclce",
  "azcoherence",
  "azhub",
  "aziel-corpus",
  "azieltether",
  "azinterface",
  "azmail",
  "aznet",
  "azos",
  "chronolock",
  "codelock",
  "decisiongate",
  "embryolock",
  "employeelock",
  "foldlock",
  "forgereceipts",
  "glossafilter",
  "godlock",
  "mialock",
  "miragegrid",
  "peacelock",
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

export const RUNTIME_TITLE =
  "Aziel Runtime — node-meshed MCP Softwares suite (not an API aggregator)";

/** Canonical Aziel Runtime abstract. Lead SEO + HTML with this. Version stays below. */
export const RUNTIME_ABSTRACT =
  "Aziel Runtime is not merely an API orchestrator or software aggregator; it is a "
  + "node-meshed orchestration suite of MCP-connected software designed to coordinate "
  + "specialized tools through a shared, security-gated runtime while preserving "
  + "provenance, chain-of-custody, temporal integrity, and auditable execution. "
  + "It functions as a digital forensic, investigative, verification, research, "
  + "intelligence-support, and systems-auditing environment in which individual engines "
  + "can analyze evidence, validate records, inspect trajectories and patterns, track "
  + "lineage, enforce capability boundaries, generate receipts, and exchange structured "
  + "results without collapsing into one opaque model or unrestricted control plane. "
  + "Its architecture emphasizes compartmentalization, deterministic routing, explicit "
  + "refusal states, append-only evidence handling, and machine-readable metadata, "
  + "making it suitable for distributed analysis workflows where trust, reproducibility, "
  + "attribution, and post-hoc auditability matter as much as the result itself.";

export const RUNTIME_CHANGELOG = [
  "2.0.0-rc1 — certification-point freeze (docs/2.0/). No intentional behavioral breaks from 1.9.3. Remain-OFF untouched. GET /v1/mesh never enables.",
  "1.9.3 — remaining AZRT-1.9-GAPS-CLOSE: isolate AZ-OS session VFS; isolate-safe jeeves; binding-gated media-run; published attestation path.",
  "1.9.0 — AZRT-1.9-CLOSE-1.0: AZMail isolate mailbox; AZChat LIVE+bound; isolate hash store; OpenAPI proxy-path parity; remain-OFF untouched.",
  "1.7.10 — Durable QNM Live Nodes. suite-presence is operator-enabled. GET /v1/mesh never enables.",
  "1.7.9 — AZCoherence cross-map (peers azclce / AZInterface / AKM-TRIAD fabric neighbor).",
  "1.7.8 — EmbryoLock true in-process engine (Vault/Custody with ARK; wipe/unlock stay FG-STUB on the public mesh).",
  "1.7.7 — AZCoherence (AZC-0.1) in-process FragGate Softwares engine.",
  "1.7.6 — 4DMap LIVE_OPS synced to product 0.2.0 (inspection frame after AZPIPE, not an extra door).",
  "1.7.0 — MASTER-33 lock. FragGate is THE single door.",
  "1.6.2 — Public door widened to sensible advisory engines; stubs still refuse.",
];

/** Prefer live catalog.version from AZIEL_RUNTIME; fall back to the baked constant. */
export function resolveRuntimeVersion(version) {
  const ver = String(version == null ? "" : version).trim();
  return ver || RUNTIME_VERSION;
}

export function runtimeChip(version) {
  return "Runtime " + resolveRuntimeVersion(version);
}

/** Software-tab chip. Do not mash version + FragGate into catalog copy. */
export function softwareChip() {
  return "aziel-runtime";
}

/** SEO / meta: canonical abstract. Version and changelog live below the HTML abstract. */
export function runtimeDescription(_version) {
  return RUNTIME_ABSTRACT + " " + RUNTIME_LIVE_COUNT
    + " live engines. FragGate is the single door. Author Aziel Eliab.";
}

/** Software-tab catalog blurb. Name the runtime; do not mash version + FragGate. */
export function softwareDescription(_version) {
  return RUNTIME_ABSTRACT
    + " Softwares catalog for aziel-runtime on this domain (heading then list). Author Aziel Eliab.";
}

/** Glama is the primary Runtime CTA. Worker stays online as a muted text link. */
export function runtimeDistributionLinks() {
  return [
    { href: RUNTIME_GLAMA, label: RUNTIME_GLAMA_LABEL, primary: true },
    { href: RUNTIME_GITHUB, label: "Source on GitHub" },
    { href: RUNTIME_DOCS, label: "Documentation" },
    { href: RUNTIME_ORIGIN + "/", label: RUNTIME_WORKER_LABEL, muted: true },
  ];
}

/** Hub card on /software. FragGate is the door product, not a version mash. */
export function softwareHubBlurb(_version) {
  return RUNTIME_ABSTRACT + " Softwares catalog for aziel-runtime on the Aziel Digital Library — heading then list. "
    + RUNTIME_LIVE_COUNT + " live advisory engines; " + RUNTIME_LOCAL_ONLY + " local_only; stubs refuse. "
    + "Discover with fraggate_list, execute with fraggate_call. Author Aziel Eliab.";
}

export function runtimeNote(version) {
  const ver = resolveRuntimeVersion(version);
  return "Aziel Runtime " + ver + ". Node-meshed MCP Softwares suite — not an API aggregator. Prefer /runtime/*. "
    + RUNTIME_LIVE_COUNT + " live advisory engines; " + RUNTIME_LOCAL_ONLY + " local_only; stubs refuse. "
    + "FragGate is the single door. fraggate_list / fraggate_call. HTTP /p/{slug}/{op} is a proxy and is not exec.";
}

export const RUNTIME_CHIP = runtimeChip();
export const RUNTIME_DESCRIPTION = runtimeDescription();

export const RUNTIME_LIMITATION =
  "THIS IS: Aziel Runtime " + RUNTIME_VERSION + " — a node-meshed MCP Softwares suite for digital forensics and auditing, hosted on this domain at /runtime. "
  + "Not an API aggregator. One door — discover, route, refuse. " + RUNTIME_LIVE_COUNT + " live advisory engines; " + RUNTIME_LOCAL_ONLY + " stays local_only; stub verbs refuse. "
  + "Prefer same-origin /runtime/*. " + RUNTIME_ORIGIN + " is the alternate origin (sameAs). "
  + "Catalog, pull, OpenAPI, MCP, skill, and FragGate remain. HTTP /p/{slug}/{op} is a proxy and is not exec. "
  + "Session tools are advanced/internal. Hosted AZAI is protocol mirror + Lamb check, not the blend. Suite mesh is read-only QNM ON. GET /v1/mesh never enables. Disable is refused. This public HTTPS surface is not itself a mesh. "
  + "THIS IS NOT: a second software index. The Software tab stays the product-card catalog. No invented Zenodo DOIs. Author Aziel Eliab only.";

export const RUNTIME_NOTE = runtimeNote();

export function runtimeHowTo(host) {
  const h = host || HOST;
  return [
    "# " + RUNTIME_TITLE,
    "",
    RUNTIME_ABSTRACT,
    "",
    "## Version " + RUNTIME_VERSION,
    "",
    RUNTIME_CHANGELOG.join("\n"),
    "",
    "Live count: " + RUNTIME_LIVE_COUNT + " advisory engines (must match /runtime/v1/health). "
      + RUNTIME_LOCAL_ONLY + " stays local_only. Stubs refuse. Suite mesh is read-only QNM ON. GET /v1/mesh never enables. Disable is refused.",
    "One door — discover, route, refuse. Kernel: " + RUNTIME_KERNEL + " (FG-0.1).",
    "Prefer these library URLs. Alternate origin: " + RUNTIME_ORIGIN + "/",
    "",
    "1. Discover. GET " + h + "/runtime/v1/fraggate/list  (MCP: fraggate_list). Describe one name with fraggate_describe.",
    "2. Route. POST " + h + "/runtime/v1/fraggate/call  (MCP: fraggate_call) with { name|slug, op, payload, claim? }. DecisionGATE runs before exec.",
    "3. Refuse. Unknown names return FG-HALLUC-TOOL. " + RUNTIME_LOCAL_ONLY + " is local_only. Stub verbs refuse.",
    "4. Show display.title and display.summary, then take the next input.",
    "",
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
    "- Suite mesh (read-only QNM ON): " + h + "/runtime/v1/mesh  (also " + h + "/v1/mesh). QNS-CD-1.0 photon QNS1 cross-map (hub cite only; local qnsd in qnm-node; no public proxy; no Node Gate). GET never enables. Disable is refused.",
    "- Manifest: " + h + "/runtime/v1/runtime.json",
    "- Skill: " + h + "/runtime/v1/skill",
    "- OpenAPI: " + h + "/runtime/openapi.json",
    "- MCP: POST " + h + "/runtime/mcp",
    "- Runtime llms.txt: " + h + "/runtime/llms.txt",
    "- Runtime cite.json: " + h + "/runtime/cite.json",
    "- Runtime robots.txt: " + h + "/runtime/robots.txt",
    "- Softwares download: " + h + "/download  ·  " + h + "/v1/download",
    "- " + RUNTIME_GLAMA_LABEL + ": " + RUNTIME_GLAMA,
    "- Source on GitHub: " + RUNTIME_GITHUB,
    "- Documentation: " + RUNTIME_DOCS,
    "- " + RUNTIME_WORKER_LABEL + " (Worker): " + RUNTIME_ORIGIN + "/",
  ].join("\n");
}
