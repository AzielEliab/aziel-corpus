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

/** Header name only. Never a token value. Never commit a secret. */
export const OPERATOR_TOKEN_HEADER = "X-Aziel-Operator-Token";
/** Worker/env names only. Never a token value. */
export const OPERATOR_TOKEN_ENV = Object.freeze(["OPERATOR_TOKEN", "GATE_TOKEN", "LIBRARY_OPERATOR_TOKEN"]);

export const AI_PATH_NOTE =
  "AI clients call OpenAPI / MCP. Anyone may DOWNLOAD azcorpus and azlibrary records and design packs. "
  + "Anonymous JSON ingest is refused. azcorpus JSON ingest uses a signed-in session (Corpus / Lamb Lens). "
  + "Human homepage POST /ingest may still file Corpus as a guest. "
  + "azlibrary upload requires " + OPERATOR_TOKEN_HEADER + " (or operator session) on the live hub — "
  + "env names " + OPERATOR_TOKEN_ENV.join(" / ") + ". Never put the token in git, docs, or PRs. "
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
  operator_token_header: OPERATOR_TOKEN_HEADER,
  operator_token_in_git: false,
  anyone_may_download_azcorpus: true,
  anyone_may_download_azlibrary: true,
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
 * First-class website products. azcorpus = public Corpus / Lamb Lens.
 * azlibrary = royal-purple operator collection. Anyone downloads both.
 * Cap-7 mesh names are designs, not ICANN, and do not resolve to Plane A hubs.
 */
export const AZCORPUS = Object.freeze({
  slug: "azcorpus",
  product: "azcorpus",
  first_class: true,
  kind: "website",
  title: "azcorpus — Corpus / Lamb Lens",
  shelf: "corpus",
  chrome: Object.freeze({
    nav: "Corpus",
    h1: "Corpus library",
    accent: "default",
    royal_purple: false,
    plane_a_path: "/corpus",
  }),
  website: Object.freeze({
    routes: Object.freeze(["/", "/search", "/corpus", "/#upload-anonymous"]),
    browse: "/corpus",
    search: "/",
    upload_html: "/#upload-anonymous",
    upload_json: "/v1/ingest",
    upload_jeeves: "/v1/jeeves/upload",
  }),
  download: Object.freeze({
    anyone: true,
    auth: "none",
    record: "/file/{record_id}",
    hash: "/v1/docs/{hash}/download",
    counted_hash: "/download?hash=",
    counted_pack: "/download?product=azcorpus",
    pack: "/v1/design-pack/azcorpus",
    pack_download: "/v1/design-pack/azcorpus/download",
  }),
  upload: Object.freeze({
    shelf: "corpus",
    lamb_lens: true,
    html_guest: true,
    json_session: true,
    operator_token: false,
    token_required: false,
    token_header: null,
    header: null,
    env_names: Object.freeze([]),
    token_in_git: false,
    note: "Public/anonymous writes stay Corpus-only (Lamb Lens). JSON ingest needs a session; homepage POST /ingest may file as guest.",
  }),
  plane_a_hub: HOST + "/",
  plane_a_path: "/corpus",
  does_not_resolve_to: HOST,
  mesh_name: "azcorpus",
  icann: false,
  note: "Public Corpus / Lamb Lens website. Cap-7 name azcorpus is a design — not www.azielcorpuslibrary.net.",
});

export const AZLIBRARY = Object.freeze({
  slug: "azlibrary",
  product: "azlibrary",
  first_class: true,
  kind: "website",
  title: "azlibrary — Aziel Library",
  shelf: "aziel",
  chrome: Object.freeze({
    nav: "Aziel Library",
    h1: "Aziel Library",
    accent: "royal purple",
    royal_purple: true,
    css: "--royal:#6b3fa0;--royal-deep:#4a2870;--aziel:#6b3fa0",
    class_name: "aziel-name",
    plane_a_path: "/aziel-library",
  }),
  website: Object.freeze({
    routes: Object.freeze(["/aziel-library"]),
    browse: "/aziel-library",
    upload_html: "/aziel-library",
    upload_json: "/v1/operator/library-ingest",
    upload_alias: "/v1/ingest",
  }),
  download: Object.freeze({
    anyone: true,
    auth: "none",
    record: "/file/{record_id}",
    hash: "/v1/docs/{hash}/download",
    counted_hash: "/download?hash=",
    counted_pack: "/download?product=azlibrary",
    pack: "/v1/design-pack/azlibrary",
    pack_download: "/v1/design-pack/azlibrary/download",
  }),
  upload: Object.freeze({
    shelf: "aziel",
    lamb_lens: false,
    html_guest: false,
    json_session: false,
    operator_token: true,
    token_required: true,
    token_header: OPERATOR_TOKEN_HEADER,
    header: OPERATOR_TOKEN_HEADER,
    token_env: OPERATOR_TOKEN_ENV,
    env_names: OPERATOR_TOKEN_ENV,
    token_in_git: false,
    path: "/v1/operator/library-ingest",
    note: "Upload requires " + OPERATOR_TOKEN_HEADER + " or operator session on the live hub. Header/env names only — never the token value.",
  }),
  plane_a_hub: HOST + "/",
  plane_a_path: "/aziel-library",
  does_not_resolve_to: HOST,
  mesh_name: "azlibrary",
  icann: false,
  note: "Royal-purple operator collection. Anyone may download. Cap-7 name azlibrary is a design — not the hub hostname.",
});

export const FIRST_CLASS_PRODUCTS = Object.freeze([AZCORPUS, AZLIBRARY]);
export const FIRST_CLASS_SLUGS = Object.freeze(["azcorpus", "azlibrary"]);

function sisterDesign(slug, hub, path, note) {
  return Object.freeze({
    slug,
    product: slug,
    first_class: false,
    kind: "mesh-design",
    title: slug + " — sister-hub design",
    shelf: null,
    plane_a_hub: hub,
    plane_a_path: path,
    does_not_resolve_to: hub.replace(/\/$/, ""),
    mesh_name: slug,
    icann: false,
    download: Object.freeze({ anyone: true, counted_pack: "/download?product=" + slug, pack: "/v1/design-pack/" + slug }),
    upload: Object.freeze({ operator_token: false, token_required: false, note: "Cite-only sister design. Not a live write target on this hub." }),
    note,
  });
}

/**
 * Cap-7 mesh site designs. Names are NOT ICANN and do not resolve to Plane A hubs.
 * Nodes pull design+content packs; they do not become the hub hostname.
 */
export const CAP7_DESIGNS = Object.freeze([
  AZCORPUS,
  AZLIBRARY,
  sisterDesign("azeliab", "https://www.azieleliab.com/", "/", "Sister-hub design pack. Plane A hub stays https://www.azieleliab.com/."),
  sisterDesign("godlock", "https://godlock.uk/", "/", "Sister-hub design pack. Plane A hub stays https://godlock.uk/."),
  sisterDesign("hedidntjump", "https://www.hedidntjump.com/", "/", "Sister-hub design pack. Plane A hub stays https://www.hedidntjump.com/."),
]);

export function productBySlug(raw) {
  const slug = String(raw || "").trim().toLowerCase();
  return CAP7_DESIGNS.find((d) => d.slug === slug) || null;
}

/** How a qnm / MirageGrid node pulls a design pack onto a local cold shelf. */
export function meshPullRecipe(slug) {
  const product = productBySlug(slug) || { slug: String(slug || "").trim() };
  const name = product.slug;
  return Object.freeze({
    spec: "CAP-7-MESH-PULL-1.0",
    product: name,
    first_class: FIRST_CLASS_SLUGS.includes(name),
    plane: "receiver-pull",
    receiver_pull: true,
    sender_fanout: false,
    live_hub_write: false,
    icann: false,
    hash_verify: true,
    fail_closed_on_mismatch: true,
    land_on: "local cold shelf",
    counted_download: HOST + "/download?product=" + name,
    describe: HOST + "/v1/design-pack/" + name,
    steps: Object.freeze([
      Object.freeze({ n: 1, op: "cite", url: HOST + "/bridge.json", note: "Plane A cite. Mesh names are not ICANN." }),
      Object.freeze({ n: 2, op: "describe", url: HOST + "/v1/design-pack/" + name, note: "Read pack_sha256 + lockset_tip + website design." }),
      Object.freeze({ n: 3, op: "counted-pull", url: HOST + "/download?product=" + name, note: "Counted bytes of the design+content pack. Anyone may download." }),
      Object.freeze({ n: 4, op: "hash-verify", check: Object.freeze(["pack_sha256", "lockset_tip"]), fail: "closed", note: "bytes↔hash. CROSS-NETWORK-SURVIVAL. Refuse on mismatch." }),
      Object.freeze({ n: 5, op: "land", shelf: "local cold shelf", note: "MESH-COLD-COPY. qnm/MirageGrid node keeps the pack. Do not alias Plane A DNS. Do not write the live hub." }),
      Object.freeze({ n: 6, op: "optional-bodies", url: HOST + "/v1/docs/{hash}/download", note: "Receiver-pull each content_sha256 if the node wants bodies. Still pull-only." }),
    ]),
    qnm: "Local qnsd in https://github.com/AzielEliab/qnm-node. No public qnsd proxy. No Node Gate.",
    miragegrid: MIRAGEGRID_AZ_GENERATOR,
    aznet: true,
    azbrowser: true,
    cross_network_survival: true,
  });
}

export const UPLOAD_OPS = Object.freeze([
  Object.freeze({
    op: "ingestRecord",
    mcp: "aziel-corpus_ingest",
    method: "POST",
    path: "/v1/ingest",
    auth: "session cookie (azcorpus / Corpus) or " + OPERATOR_TOKEN_HEADER + " (azlibrary)",
    writes: "hub only — signed public → azcorpus; operator token → live azlibrary",
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
    auth: OPERATOR_TOKEN_HEADER + " or operator session",
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
  Object.freeze({
    op: "countedDesignPack",
    mcp: "aziel-corpus_design_pack",
    method: "GET",
    path: "/download?product=azcorpus|azlibrary",
    auth: "none",
    increments: true,
    note: "Anyone may download. Counted website design+content pack.",
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
    products: Object.freeze({
      azcorpus: AZCORPUS,
      azlibrary: AZLIBRARY,
    }),
    first_class: FIRST_CLASS_SLUGS.slice(),
    cap7_designs: CAP7_DESIGNS,
    mesh_pull: Object.freeze({
      azcorpus: meshPullRecipe("azcorpus"),
      azlibrary: meshPullRecipe("azlibrary"),
    }),
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
      azcorpus: AZCORPUS.upload,
      azlibrary: AZLIBRARY.upload,
      token_writes: "live hub azlibrary only",
      token_header: OPERATOR_TOKEN_HEADER,
      token_env: OPERATOR_TOKEN_ENV,
      token_in_git: false,
      mesh_write: false,
      anonymous_json: false,
      lamb_lens_corpus: true,
      ai_path: AI_PATH_NOTE,
    },
    download: {
      azcorpus: AZCORPUS.download,
      azlibrary: AZLIBRARY.download,
      anyone: true,
    },
    mesh_copies: {
      kind: "design+content-pack",
      law: "Cap-7",
      download: HOST + "/v1/design-pack",
      counted: HOST + "/download?product=azcorpus|azlibrary",
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
    "",
    "## azcorpus (first-class website — Corpus / Lamb Lens)",
    "",
    "- Plane A browse: " + HOST + "/corpus",
    "- Anyone may DOWNLOAD records and the design pack. Auth: none.",
    "- Counted pack: " + HOST + "/download?product=azcorpus",
    "- API pack: " + HOST + "/v1/design-pack/azcorpus  ·  " + HOST + "/v1/design-pack/azcorpus/download",
    "- Upload (session → Corpus): POST " + HOST + "/v1/ingest  ·  POST " + HOST + "/v1/jeeves/upload",
    "- Human guest HTML: POST /ingest from " + HOST + "/#upload-anonymous (Corpus-only / Lamb Lens).",
    "- Cap-7 mesh name azcorpus is a design — does NOT resolve to azielcorpuslibrary.net.",
    "",
    "## azlibrary (first-class website — Aziel Library, royal purple)",
    "",
    "- Plane A browse: " + HOST + "/aziel-library",
    "- Anyone may DOWNLOAD records and the design pack. Auth: none.",
    "- Counted pack: " + HOST + "/download?product=azlibrary",
    "- API pack: " + HOST + "/v1/design-pack/azlibrary  ·  " + HOST + "/v1/design-pack/azlibrary/download",
    "- Upload requires header " + OPERATOR_TOKEN_HEADER + " (env " + OPERATOR_TOKEN_ENV.join(" / ") + "). Never put the token in git/docs/PRs.",
    "- Upload path: POST " + HOST + "/v1/operator/library-ingest  (alias POST " + HOST + "/v1/ingest with the same header)",
    "- Token writes live hub azlibrary only — not the Cap-7 mesh name.",
    "",
    "## Mesh pull (qnm / MirageGrid → local cold shelf)",
    "",
    "1. GET " + HOST + "/bridge.json",
    "2. GET " + HOST + "/v1/design-pack/azcorpus or /azlibrary — copy pack_sha256 + lockset_tip",
    "3. GET " + HOST + "/download?product=azcorpus|azlibrary — counted bytes",
    "4. hash-verify pack_sha256 and lockset_tip fail-closed (bytes↔hash; CROSS-NETWORK-SURVIVAL)",
    "5. Land on the node's local cold shelf. Do not alias Plane A DNS. Do not write the live hub.",
    "6. Optional: GET " + HOST + "/v1/docs/{hash}/download for each content_sha256 (receiver-pull bodies)",
    "Local qnsd: https://github.com/AzielEliab/qnm-node. Mesh-side: AZNet / AZBrowser. MirageGrid cite: " + MIRAGEGRID_AZ_GENERATOR,
    "",
    "- Download by hash: GET " + HOST + "/v1/docs/{hash}/download · " + HOST + "/download?hash=",
    "- Download by record: GET " + HOST + "/file/{record_id} · " + HOST + "/download?record=",
    "- Products index: GET " + HOST + "/v1/products",
    "- Library MCP: POST " + HOST + "/mcp  tools: " + MCP_TOOLS.join(", "),
    "- Runtime MCP (FragGate door): POST " + HOST + "/runtime/mcp",
    "- Cap-7 bridge cite (Plane A): " + HOST + "/bridge.json",
    "- Future MirageGrid /bridge.json (not claimed live): " + MIRAGEGRID_BRIDGE_FUTURE,
    "Honesty: mesh names are NOT ICANN; azcorpus/azlibrary are first-class website designs; Plane A hubs stay themselves; "
      + "no Cap-7 live public DNS; no AZ-GEN publish cadence; " + OPERATOR_TOKEN_HEADER + " = live hub azlibrary only; "
      + "mesh copies = design+content packs. " + CROSS_NETWORK_SURVIVAL + ": " + CROSS_NETWORK_SURVIVAL_RULE,
    "",
  ].join("\n");
}
