/**
 * Dual-surface AI upload/download + Cap-7 semantic bridge cite.
 * Plane A hubs stay themselves. Mesh Cap-7 names are designs, not ICANN.
 * Upload token writes live hub azlibrary only. Mesh copies are design+content packs.
 * Author: Aziel Eliab only. No visible 15:20 identity-lock chrome.
 */
import { AI_CLIENTS, HOST } from "./runtime-copy.js";
import {
  CROSS_NETWORK_SURVIVAL,
  CROSS_NETWORK_SURVIVAL_RULE,
  CITE_RULE,
  LOCKSET_ID,
  LOCKSET_TIP,
  NO_LIE_NO_REWRITE,
  NO_LIE_NO_REWRITE_RULE,
  SURVIVE_RULE,
  survivalCiteFields,
} from "./ingest-receipt.js";
import { AZCOHERENCE_DUAL_SURFACE } from "./azcoherence.js";

export const AUTHOR = "Aziel Eliab";
export const PERSON_ID = "https://www.azieleliab.com/#aziel";
export const CAP7_BRIDGE_SPEC = "CAP-7-BRIDGE-CITE-1.0";
export const NO_FAN_SPEC = "NO-FAN-1.0";
export const NO_FAN_PHRASE = "No falsification. No ambiguity. No misleading.";
export const PLANE_A = "A";
export const MIRAGEGRID_WORKER = "https://miragegrid-download-tracker.vibelock.workers.dev/";
export const MIRAGEGRID_AZ_GENERATOR = MIRAGEGRID_WORKER + "v1/mesh/az-generator";
export const MIRAGEGRID_BRIDGE_FUTURE = MIRAGEGRID_WORKER + "bridge.json";

export const DUAL_SURFACE =
  "Dual surface: agents run software with outputs shown in the AI and inputs run back "
  + "(no technical MCP UI required); software side keeps complete human UI "
  + "(Worker + mobile + download).";

export const AI_PATH_NOTE =
  "AI clients call OpenAPI / MCP. Session cookie or X-Aziel-Operator-Token writes the live hub. "
  + "Anonymous JSON ingest is refused (not an anonymous write hole). "
  + "Human homepage POST /ingest may still file Corpus as a guest. "
  + "Operator token writes live Aziel Library on the hub only — never a Cap-7 mesh name.";

export const HONESTY = Object.freeze({
  author: AUTHOR,
  identity: AUTHOR,
  person_id: PERSON_ID,
  plane_a_hubs_are_themselves: true,
  mesh_names_are_not_icann: true,
  cap7_live_public_dns: false,
  unbounded_public_dns: false,
  public_icann: false,
  az_generator_callable: false,
  az_generator_publish_cadence_claimed: false,
  upload_token_hub_azlibrary_only: true,
  mesh_copies_are_design_content_packs: true,
  visible_1520_chrome: false,
  no_fan: NO_FAN_SPEC,
  no_fan_phrase: NO_FAN_PHRASE,
  no_lie: true,
  no_rewrite: true,
});

/** Plane A — public ICANN / Worker hubs. These names stay themselves. */
export const PLANE_A_HUBS = Object.freeze([
  Object.freeze({
    id: "aziel-corpus-library",
    url: HOST + "/",
    label: "Aziel Corpus Library",
    shelves: Object.freeze(["corpus", "aziel"]),
  }),
  Object.freeze({
    id: "azieleliab",
    url: "https://www.azieleliab.com/",
    label: "Official site",
  }),
  Object.freeze({
    id: "godlock",
    url: "https://godlock.uk/",
    label: "GodLock.uk",
  }),
  Object.freeze({
    id: "hedidntjump",
    url: "https://www.hedidntjump.com/",
    label: "He Didn't Jump",
  }),
]);

/**
 * Cap-7 mesh site designs. Names are NOT ICANN and do not resolve to Plane A hubs.
 * Nodes pull design+content packs; they do not become the hub hostname.
 */
export const CAP7_DESIGNS = Object.freeze([
  Object.freeze({
    slug: "azcorpus",
    kind: "mesh-design",
    shelf: "corpus",
    plane_a_hub: HOST + "/",
    plane_a_path: "/corpus",
    does_not_resolve_to: HOST,
    note: "Corpus Lamb Lens design for a mesh node. Not www.azielcorpuslibrary.net.",
  }),
  Object.freeze({
    slug: "azlibrary",
    kind: "mesh-design",
    shelf: "aziel",
    plane_a_hub: HOST + "/",
    plane_a_path: "/aziel-library",
    does_not_resolve_to: HOST,
    note: "Aziel Library design for a mesh node. Live write stays on the hub with operator token.",
  }),
  Object.freeze({
    slug: "azeliab",
    kind: "mesh-design",
    shelf: null,
    plane_a_hub: "https://www.azieleliab.com/",
    plane_a_path: "/",
    does_not_resolve_to: "https://www.azieleliab.com",
    note: "Sister-hub design pack. Plane A hub stays https://www.azieleliab.com/.",
  }),
  Object.freeze({
    slug: "godlock",
    kind: "mesh-design",
    shelf: null,
    plane_a_hub: "https://godlock.uk/",
    plane_a_path: "/",
    does_not_resolve_to: "https://godlock.uk",
    note: "Sister-hub design pack. Plane A hub stays https://godlock.uk/.",
  }),
  Object.freeze({
    slug: "hedidntjump",
    kind: "mesh-design",
    shelf: null,
    plane_a_hub: "https://www.hedidntjump.com/",
    plane_a_path: "/",
    does_not_resolve_to: "https://www.hedidntjump.com",
    note: "Sister-hub design pack. Plane A hub stays https://www.hedidntjump.com/.",
  }),
]);

export const UPLOAD_OPS = Object.freeze([
  Object.freeze({
    op: "ingestRecord",
    mcp: "aziel-corpus_ingest",
    method: "POST",
    path: "/v1/ingest",
    auth: "session cookie or X-Aziel-Operator-Token",
    writes: "hub only — signed public → Corpus; operator token → live azlibrary",
    mesh_write: false,
    receipt: true,
  }),
  Object.freeze({
    op: "jeevesUpload",
    mcp: "aziel-corpus_ingest",
    method: "POST",
    path: "/v1/jeeves/upload",
    auth: "signed-in session (public → Corpus; operator session → Aziel Library)",
    writes: "hub only",
    mesh_write: false,
    receipt: true,
  }),
  Object.freeze({
    op: "operatorLibraryIngest",
    mcp: "aziel-corpus_ingest",
    method: "POST",
    path: "/v1/operator/library-ingest",
    auth: "X-Aziel-Operator-Token or operator session",
    writes: "live hub azlibrary only",
    mesh_write: false,
    receipt: true,
  }),
]);

export const DOWNLOAD_OPS = Object.freeze([
  Object.freeze({
    op: "downloadByHash",
    mcp: "aziel-corpus_download",
    method: "GET",
    path: "/v1/docs/{hash}/download",
    auth: "none",
    increments: false,
  }),
  Object.freeze({
    op: "download",
    mcp: "aziel-corpus_download",
    method: "GET",
    path: "/download?hash= | /download?record=",
    auth: "none",
    increments: true,
  }),
  Object.freeze({
    op: "file",
    mcp: "aziel-corpus_download",
    method: "GET",
    path: "/file/{record_id}",
    auth: "none",
    increments: false,
  }),
  Object.freeze({
    op: "designPack",
    mcp: "aziel-corpus_design_pack",
    method: "GET",
    path: "/v1/design-pack/{slug}",
    auth: "none",
    increments: false,
    note: "Cap-7 design+content pack for mesh nodes. Not a live hub alias.",
  }),
]);

export const MCP_TOOLS = Object.freeze([
  "aziel-corpus_health",
  "aziel-corpus_search",
  "aziel-corpus_skill",
  "aziel-corpus_download",
  "aziel-corpus_ingest",
  "aziel-corpus_design_pack",
  "aziel-corpus_receipt",
]);

export function bridgeDoc() {
  return {
    spec: CAP7_BRIDGE_SPEC,
    kind: "semantic-bridge-cite",
    author: AUTHOR,
    identity: AUTHOR,
    person_id: PERSON_ID,
    plane: PLANE_A,
    plane_note:
      "Plane A is the public hub / Worker cite plane. Hubs stay themselves. "
      + "Cap-7 mesh names (azcorpus, azlibrary, sister-hub designs) are not ICANN "
      + "and do not resolve to azielcorpuslibrary.net or the other hubs.",
    dual_surface: DUAL_SURFACE,
    dual_surface_azcoherence: AZCOHERENCE_DUAL_SURFACE,
    compatible_clients: AI_CLIENTS,
    cap: 7,
    mesh_dns: {
      icann: false,
      public_icann: false,
      live_public_dns: false,
      unbounded_public_dns: false,
      names_are_not_icann: true,
      designs: CAP7_DESIGNS.map((d) => d.slug),
    },
    plane_a_hubs: PLANE_A_HUBS,
    cap7_designs: CAP7_DESIGNS,
    pull: {
      public_hubs: true,
      miragegrid_worker_bridge: true,
      aznet: true,
      azbrowser: true,
      naked_public_dns: false,
      mesh_side: "AZNet / AZBrowser — not a public ICANN lookup",
    },
    az_generator: {
      cite: MIRAGEGRID_AZ_GENERATOR,
      callable: false,
      lives: "deep-node",
      softwares_tab: false,
      publish_cadence_claimed: false,
      public_icann: false,
      note: "AZ-GENERATOR-1.0 cite only. Cap-7 mesh DNS factory. Not callable. Not public ICANN. No publish cadence claimed here.",
    },
    miragegrid: {
      worker: MIRAGEGRID_WORKER,
      az_generator: MIRAGEGRID_AZ_GENERATOR,
      bridge_future: MIRAGEGRID_BRIDGE_FUTURE,
      bridge_live: false,
      note: "Future MirageGrid /bridge.json is cited, not claimed live. This corpus /bridge.json is the Plane A cite.",
    },
    upload: {
      token_writes: "live hub azlibrary only",
      mesh_write: false,
      anonymous_json: false,
      lamb_lens_corpus: true,
      ai_path: AI_PATH_NOTE,
    },
    mesh_copies: {
      kind: "design+content-pack",
      law: "Cap-7",
      download: HOST + "/v1/design-pack",
      live_hub_alias: false,
    },
    ops: {
      upload: UPLOAD_OPS,
      download: DOWNLOAD_OPS,
      mcp_tools: MCP_TOOLS,
    },
    lockset_id: LOCKSET_ID,
    lockset_tip: LOCKSET_TIP,
    cite_rule: CITE_RULE,
    survive_rule: SURVIVE_RULE,
    cross_network_survival: CROSS_NETWORK_SURVIVAL,
    cross_network_survival_rule: CROSS_NETWORK_SURVIVAL_RULE,
    no_lie_no_rewrite: NO_LIE_NO_REWRITE,
    no_lie_no_rewrite_rule: NO_LIE_NO_REWRITE_RULE,
    ...survivalCiteFields(),
    no_fan: NO_FAN_SPEC,
    no_fan_phrase: NO_FAN_PHRASE,
    honesty: HONESTY,
    doi: null,
    license: "Apache-2.0",
  };
}

export function aiSurfaceLlmsBlock() {
  return [
    "## Dual-surface upload + download (AI clients)",
    "",
    DUAL_SURFACE,
    "Compatible AI clients: " + AI_CLIENTS + ".",
    AI_PATH_NOTE,
    "- Upload (session/MCP, hub only): POST " + HOST + "/v1/ingest",
    "- Upload alias: POST " + HOST + "/v1/jeeves/upload",
    "- Operator live azlibrary (hub token only): POST " + HOST + "/v1/operator/library-ingest",
    "- Download by hash: GET " + HOST + "/v1/docs/{hash}/download · " + HOST + "/download?hash=",
    "- Download by record: GET " + HOST + "/file/{record_id} · " + HOST + "/download?record=",
    "- Library MCP: POST " + HOST + "/mcp  tools: " + MCP_TOOLS.join(", "),
    "- Runtime MCP (FragGate door): POST " + HOST + "/runtime/mcp",
    "- Cap-7 bridge cite (Plane A): " + HOST + "/bridge.json",
    "- Design packs (mesh nodes, not hub DNS): " + HOST + "/v1/design-pack",
    "- MirageGrid Cap-7 cite: " + MIRAGEGRID_AZ_GENERATOR,
    "- Future MirageGrid /bridge.json (not claimed live): " + MIRAGEGRID_BRIDGE_FUTURE,
    "Honesty: mesh names are NOT ICANN; azcorpus/azlibrary are designs; Plane A hubs stay themselves; "
      + "no Cap-7 live public DNS; no AZ-GEN publish cadence; upload token = live hub azlibrary only; "
      + "mesh copies = design+content packs. " + CROSS_NETWORK_SURVIVAL + ": " + CROSS_NETWORK_SURVIVAL_RULE,
    "",
  ].join("\n");
}
