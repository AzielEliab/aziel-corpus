/**
 * Dual-surface AI upload/download + Cap-7 semantic bridge cite.
 * Cap-7 mesh sites inherit design_of the four hubs only.
 * resolves_to_hub: false — not aliases, not “ARE the hubs”, not CNAME/redirect.
 * name_may_change: true. public_icann: false. No fifth product.
 * Plane A UI: azcorpus + azlibrary are designs inside this Worker (/corpus, /aziel-library).
 * Upload token writes live hub azlibrary only. Anyone may download.
 * Author: Aziel Eliab only. No visible 15:20 chrome.
 */
import { createHash } from "node:crypto";
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
export const MIRAGEGRID_APP = "https://miragegrid.vibelock.workers.dev";
export const MIRAGEGRID_AZ_GENERATOR = MIRAGEGRID_WORKER + "v1/mesh/az-generator";
export const MIRAGEGRID_BRIDGE = MIRAGEGRID_APP + "/bridge";
export const MIRAGEGRID_SHUFFLE = MIRAGEGRID_APP + "/v1/shuffle";
export const MIRAGEGRID_BRIDGE_FUTURE = MIRAGEGRID_WORKER + "bridge.json";
export const LIBRARY_HUB = HOST + "/";
export const HUB_AZELIELIAB = "https://www.azieleliab.com/";
export const HUB_GODLOCK = "https://godlock.uk/";
export const HUB_HEDIDNTJUMP = "https://www.hedidntjump.com/";
/** Plane A Worker origin. Cap-7 names do not resolve to this hostname. */
export const CANONICAL_TIP = LIBRARY_HUB;

export const CAP7_INHERIT = "designs";
export const CAP7_RESOLVES_TO_HUB = false;
export const CAP7_NAME_MAY_CHANGE = true;
export const CAP7_FIFTH_PRODUCT = false;

export function cap7PackCiteHash(slug, designOf) {
  return createHash("sha256").update(JSON.stringify({
    slug,
    design_of: designOf,
    resolves_to_hub: false,
    tip: LOCKSET_TIP,
    lockset_id: LOCKSET_ID,
  })).digest("hex");
}

/** Cap-7 mesh site: inherits design_of a hub. Does not resolve to that hostname. */
export function cap7SiteEntry(slug, designOf, extra) {
  return Object.freeze({
    name: slug,
    slug,
    design_of: designOf,
    resolves_to_hub: CAP7_RESOLVES_TO_HUB,
    name_may_change: CAP7_NAME_MAY_CHANGE,
    public_icann: false,
    fifth_product: CAP7_FIFTH_PRODUCT,
    inherit: CAP7_INHERIT,
    alias: false,
    cname: false,
    redirect: false,
    tip: LOCKSET_TIP,
    lockset_id: LOCKSET_ID,
    pack: HOST + "/v1/design-pack/" + slug,
    pack_sha256: cap7PackCiteHash(slug, designOf),
    ...(extra || {}),
  });
}

export const CAP7_SITES = Object.freeze({
  azcorpus: cap7SiteEntry("azcorpus", LIBRARY_HUB, { plane_a_ui: "/corpus" }),
  azlibrary: cap7SiteEntry("azlibrary", LIBRARY_HUB, { plane_a_ui: "/aziel-library" }),
  azeliab: cap7SiteEntry("azeliab", HUB_AZELIELIAB),
  godlock: cap7SiteEntry("godlock", HUB_GODLOCK),
  hedidntjump: cap7SiteEntry("hedidntjump", HUB_HEDIDNTJUMP),
});

/** Compact Cap-7 cite matching /cite.json + sister-hub /shelves honesty. */
export function cap7SitesCompact() {
  const out = {};
  for (const [slug, site] of Object.entries(CAP7_SITES)) {
    out[slug] = Object.freeze({
      design_of: site.design_of,
      resolves_to_hub: false,
      name_may_change: true,
      public_icann: false,
    });
  }
  return Object.freeze(out);
}

/**
 * /shelves Cap-7 block. Matches sister-hub honesty + this hub's /bridge.json.
 * This library hub hosts /bridge.json; Cap-7 names still do not resolve to hubs.
 */
export function cap7ShelvesCite() {
  return Object.freeze({
    spec: CAP7_BRIDGE_SPEC,
    design_of_only: true,
    bridge: HOST + "/bridge.json",
    resolves_to_hub: false,
    name_may_change: true,
    public_icann: false,
    fifth_product: false,
    visible_1520_chrome: false,
    sites: Object.freeze({
      azeliab: Object.freeze({ design_of: HUB_AZELIELIAB, resolves_to_hub: false }),
      azcorpus: Object.freeze({ design_of: LIBRARY_HUB, resolves_to_hub: false }),
      azlibrary: Object.freeze({ design_of: LIBRARY_HUB, resolves_to_hub: false }),
      godlock: Object.freeze({ design_of: HUB_GODLOCK, resolves_to_hub: false }),
      hedidntjump: Object.freeze({ design_of: HUB_HEDIDNTJUMP, resolves_to_hub: false }),
    }),
    note:
      "Cap-7 names inherit design_of the four hubs only. If a bridge is present, resolves_to_hub stays false. "
      + "Not aliases, not CNAME/redirect, not hub hostnames. This library hub hosts /bridge.json as the Plane A cite.",
  });
}

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
  + "Operator token writes live Aziel Library (azlibrary) on this hub only.";

export const HONESTY = Object.freeze({
  author: AUTHOR,
  identity: AUTHOR,
  person_id: PERSON_ID,
  plane_a_hubs_are_themselves: true,
  mesh_names_are_not_icann: true,
  mesh_names_may_change: true,
  name_may_change: true,
  inherit: CAP7_INHERIT,
  design_of_hubs_only: true,
  resolves_to_hub: false,
  alias: false,
  cname: false,
  redirect: false,
  ultimately_are_original_sites: false,
  azcorpus_azlibrary_plane_a_ui: true,
  new_domains: false,
  fifth_product: false,
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
 * Plane A UI products on this Worker. azcorpus = Corpus / Lamb Lens.
 * azlibrary = royal-purple operator collection. Anyone downloads both.
 * Cap-7 mesh names inherit design_of this hub and do not resolve to it.
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
  plane_a_hub: LIBRARY_HUB,
  plane_a_path: "/corpus",
  plane_a_ui: true,
  design_of: LIBRARY_HUB,
  resolves_to_hub: false,
  name_may_change: true,
  public_icann: false,
  fifth_product: false,
  inherit: CAP7_INHERIT,
  alias: false,
  inside_corpus_hub: true,
  new_domain: false,
  mesh_name: "azcorpus",
  icann: false,
  live_public_dns: false,
  tip: LOCKSET_TIP,
  pack: HOST + "/v1/design-pack/azcorpus",
  pack_sha256: cap7PackCiteHash("azcorpus", LIBRARY_HUB),
  note: "Plane A UI: Corpus / Lamb Lens at /corpus on this Worker. Cap-7 name azcorpus inherits design_of the library hub. resolves_to_hub: false.",
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
  plane_a_hub: LIBRARY_HUB,
  plane_a_path: "/aziel-library",
  plane_a_ui: true,
  design_of: LIBRARY_HUB,
  resolves_to_hub: false,
  name_may_change: true,
  public_icann: false,
  fifth_product: false,
  inherit: CAP7_INHERIT,
  alias: false,
  inside_corpus_hub: true,
  new_domain: false,
  mesh_name: "azlibrary",
  icann: false,
  live_public_dns: false,
  tip: LOCKSET_TIP,
  pack: HOST + "/v1/design-pack/azlibrary",
  pack_sha256: cap7PackCiteHash("azlibrary", LIBRARY_HUB),
  note: "Plane A UI: royal-purple Aziel Library at /aziel-library on this Worker. Cap-7 name azlibrary inherits design_of the library hub. resolves_to_hub: false. Anyone may download. Upload token writes this shelf on the live hub.",
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
    design_of: hub,
    resolves_to_hub: false,
    name_may_change: true,
    public_icann: false,
    fifth_product: false,
    inherit: CAP7_INHERIT,
    alias: false,
    tip: LOCKSET_TIP,
    pack: HOST + "/v1/design-pack/" + slug,
    pack_sha256: cap7PackCiteHash(slug, hub),
    inside_corpus_hub: false,
    new_domain: false,
    mesh_name: slug,
    icann: false,
    live_public_dns: false,
    download: Object.freeze({ anyone: true, counted_pack: "/download?product=" + slug, pack: "/v1/design-pack/" + slug }),
    upload: Object.freeze({ operator_token: false, token_required: false, note: "Cite-only sister hub. Not a live write target on this corpus Worker." }),
    note,
  });
}

/**
 * Cap-7 mesh sites inherit design_of the four hubs. resolves_to_hub: false.
 * Plane A UI for azcorpus/azlibrary stays on this Worker. No fifth product.
 */
export const CAP7_DESIGNS = Object.freeze([
  AZCORPUS,
  AZLIBRARY,
  sisterDesign("azeliab", HUB_AZELIELIAB, "/", "Sister hub remains https://www.azieleliab.com/. Cap-7 name azeliab inherits that hub's design. resolves_to_hub: false."),
  sisterDesign("godlock", HUB_GODLOCK, "/", "Sister hub remains https://godlock.uk/. Cap-7 name godlock inherits that hub's design. resolves_to_hub: false."),
  sisterDesign("hedidntjump", HUB_HEDIDNTJUMP, "/", "Sister hub remains https://www.hedidntjump.com/. Cap-7 name hedidntjump inherits that hub's design. resolves_to_hub: false."),
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
    design_of: product.design_of || (CAP7_SITES[name] && CAP7_SITES[name].design_of) || LIBRARY_HUB,
    resolves_to_hub: false,
    name_may_change: true,
    public_icann: false,
    tip: LOCKSET_TIP,
    pack_sha256: product.pack_sha256 || cap7PackCiteHash(name, product.design_of || LIBRARY_HUB),
    hash_verify: true,
    fail_closed_on_mismatch: true,
    land_on: "local cold shelf",
    counted_download: HOST + "/download?product=" + name,
    describe: HOST + "/v1/design-pack/" + name,
    steps: Object.freeze([
      Object.freeze({ n: 1, op: "cite", url: HOST + "/bridge.json", note: "Cap-7 names inherit design_of the four hubs. resolves_to_hub: false. name_may_change: true." }),
      Object.freeze({ n: 2, op: "describe", url: HOST + "/v1/design-pack/" + name, note: "Read pack_sha256 + lockset_tip + design_of. Not a hostname alias." }),
      Object.freeze({ n: 3, op: "counted-pull", url: HOST + "/download?product=" + name, note: "Counted bytes of the design+content pack. Anyone may download." }),
      Object.freeze({ n: 4, op: "hash-verify", check: Object.freeze(["pack_sha256", "lockset_tip", "design_of"]), fail: "closed", note: "bytes↔hash. CROSS-NETWORK-SURVIVAL. Refuse on mismatch. Still resolves_to_hub: false." }),
      Object.freeze({ n: 5, op: "land", shelf: "local cold shelf", note: "MESH-COLD-COPY. Node keeps the pack. Do not invent a new public domain. Do not CNAME the mesh name onto a hub hostname." }),
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
    note: "Cap-7 design+content pack. inherit design_of a hub. resolves_to_hub: false.",
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
      "Cap-7 mesh sites inherit design_of the four hubs only. resolves_to_hub: false. "
      + "They are not aliases, not CNAME/redirect, and do not resolve to hub hostnames. "
      + "name_may_change: true. public_icann: false. No fifth product. "
      + "Plane A UI: azcorpus + azlibrary stay designs on this Worker (/corpus, /aziel-library). "
      + "Sister hubs remain azieleliab.com, godlock.uk, hedidntjump.com. No fake .az DNS.",
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
      names_may_change: true,
      name_may_change: true,
      resolves_to_hub: false,
      inherit: CAP7_INHERIT,
      fifth_product: false,
      designs: CAP7_DESIGNS.map((d) => d.slug),
    },
    cap7_sites: CAP7_SITES,
    resolves_to_hub: false,
    inherit: CAP7_INHERIT,
    name_may_change: true,
    fifth_product: false,
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
      app_worker: MIRAGEGRID_APP,
      az_generator: MIRAGEGRID_AZ_GENERATOR,
      bridge: MIRAGEGRID_BRIDGE,
      shuffle: MIRAGEGRID_SHUFFLE,
      bridge_future: MIRAGEGRID_BRIDGE_FUTURE,
      bridge_live: true,
      resolves_to_hub: false,
      prefer_pull: "GET runtime /survival cap7_aznet",
      note:
        "Named app Worker is LIVE Cap-7 shuffle ( /bridge · /v1/shuffle ). resolves_to_hub: false. "
        + "Download-tracker stays the counted download plane. Prefer pulled /survival cap7_aznet for hosted/SLOT honesty. "
        + "This corpus /bridge.json remains the Plane A design_of cite.",
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
      inherit: CAP7_INHERIT,
      resolves_to_hub: false,
      new_domain: false,
      fifth_product: false,
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
    "- Plane A UI on this Worker. Cap-7 name inherits design_of the library hub. resolves_to_hub: false.",
    "",
    "## azlibrary (first-class website — Aziel Library, royal purple)",
    "",
    "- Plane A browse: " + HOST + "/aziel-library",
    "- Anyone may DOWNLOAD records and the design pack. Auth: none.",
    "- Counted pack: " + HOST + "/download?product=azlibrary",
    "- API pack: " + HOST + "/v1/design-pack/azlibrary  ·  " + HOST + "/v1/design-pack/azlibrary/download",
    "- Upload requires header " + OPERATOR_TOKEN_HEADER + " (env " + OPERATOR_TOKEN_ENV.join(" / ") + "). Never put the token in git/docs/PRs.",
    "- Upload path: POST " + HOST + "/v1/operator/library-ingest  (alias POST " + HOST + "/v1/ingest with the same header)",
    "- Token writes live hub azlibrary (this site's Aziel Library shelf) only.",
    "",
    "## Mesh pull (qnm / MirageGrid → local cold shelf)",
    "",
    "1. GET " + HOST + "/bridge.json — Cap-7 sites: design_of + resolves_to_hub:false + tip/pack hashes",
    "2. GET " + HOST + "/v1/design-pack/azcorpus or /azlibrary — copy pack_sha256 + lockset_tip + design_of",
    "3. GET " + HOST + "/download?product=azcorpus|azlibrary — counted bytes",
    "4. hash-verify pack_sha256 and lockset_tip fail-closed (bytes↔hash; CROSS-NETWORK-SURVIVAL)",
    "5. Land on the node's local cold shelf. Do not invent a new public domain. Do not CNAME a mesh name onto a hub hostname.",
    "6. Optional: GET " + HOST + "/v1/docs/{hash}/download for each content_sha256 (receiver-pull bodies)",
    "Local qnsd: https://github.com/AzielEliab/qnm-node. Mesh-side: AZNet / AZBrowser. MirageGrid cite: " + MIRAGEGRID_AZ_GENERATOR,
    "",
    "- Download by hash: GET " + HOST + "/v1/docs/{hash}/download · " + HOST + "/download?hash=",
    "- Download by record: GET " + HOST + "/file/{record_id} · " + HOST + "/download?record=",
    "- Products index: GET " + HOST + "/v1/products",
    "- Library MCP: POST " + HOST + "/mcp  tools: " + MCP_TOOLS.join(", "),
    "- Runtime MCP (FragGate door): POST " + HOST + "/runtime/mcp",
    "- Cap-7 bridge cite (design_of hubs; resolves_to_hub: false): " + HOST + "/bridge.json",
    "- Cap-7 MirageGrid shuffle LIVE (app Worker; resolves_to_hub: false): " + MIRAGEGRID_BRIDGE + " · " + MIRAGEGRID_SHUFFLE,
    "- MirageGrid counted download plane: " + MIRAGEGRID_BRIDGE_FUTURE,
    "Honesty: Cap-7 names inherit design_of the four hubs; resolves_to_hub: false; name_may_change: true; public_icann: false; no fifth product; "
      + "Plane A UI azcorpus/azlibrary stay on this Worker; sister hubs remain azieleliab.com, godlock.uk, hedidntjump.com; "
      + "no Cap-7 live public DNS; no AZ-GEN publish cadence; "
      + OPERATOR_TOKEN_HEADER + " = live hub azlibrary only. "
      + CROSS_NETWORK_SURVIVAL + ": " + CROSS_NETWORK_SURVIVAL_RULE,
    "",
  ].join("\n");
}
