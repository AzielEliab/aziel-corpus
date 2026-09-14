/**
 * Suite decentralized node mesh — library proxy + read-only QNM ON.
 * Public HTTPS is not itself a mesh. Public suite presence stays on.
 * Disable is refused (no mesh-off kill switch). Overlay never disables radios.
 * QNS-CD-1.0 is a hub cite / Worker mesh cross-map only (photon QNS1 packet transfer).
 * Local qnsd lives in AzielEliab/qnm-node. Runtime cites + catalog field live in
 * AzielEliab/aziel-runtime. AZInterface has pair custody. Not a Softwares-tab product.
 * No Node Gate. No public qnsd proxy. Identity: Aziel Eliab only.
 * Host overlay must not rewrite Worker MESH-* refuse codes into a 409
 * library-default-off body. GET never enables. Overlay never disables radios.
 * Public Worker rollup stays counts/status — this surface is not the cell.
 * CROSS-NETWORK-SURVIVAL-1.0 umbrella over MESH-SPLIT-WIRES-1.0 +
 * MESH-COLD-COPY-1.0 + die-with-pull (PR #87) + MESH-REEXPAND-1.0 +
 * MESH-REHEAL-1.0 (archive restore vs self tip + trusted pull or phoenix-WAIT).
 */
import { HOST, RUNTIME_ORIGIN, RUNTIME_GITHUB } from "./runtime-copy.js";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id, Authorization, X-Aziel-Operator-Token",
  };
}

const UA = "Mozilla/5.0 AzielDigitalLibrary";

export const AUTHOR = "Aziel Eliab";
export const QNS_CD_SPEC = "QNS-CD-1.0";
const QNM_NODE = "https://github.com/AzielEliab/qnm-node";
const AZINTERFACE = "https://github.com/AzielEliab/azinterface";
export const LIBRARY_SOURCE = "library-default-on";

/** Hub cite / Worker mesh cross-map. Not a Softwares-tab product. No public qnsd. */
export const QNS_CD = Object.freeze({
  spec: QNS_CD_SPEC,
  name: "photon QNS1 packet transfer",
  kind: "hub-cite",
  softwares_tab: false,
  public_proxy: false,
  node_gate: false,
  default: "on",
  qnsd: "local",
  qnsd_coded_in: QNM_NODE,
  runtime_cites: RUNTIME_GITHUB,
  runtime_catalog: RUNTIME_ORIGIN + "/v1/software",
  runtime_mesh: RUNTIME_ORIGIN + "/v1/mesh",
  pair_custody: AZINTERFACE,
  designs: Object.freeze({
    qnm_wp: RUNTIME_GITHUB + "/blob/main/docs/designs/QNM-WP-1.0.md",
    node_ops: RUNTIME_GITHUB + "/blob/main/docs/designs/NODE-OPS-1.0.md",
    node_mesh: RUNTIME_GITHUB + "/blob/main/docs/NODE_MESH.md",
    qnm_build: QNM_NODE + "/blob/main/docs/QNM-BUILD-1.0.md",
    qnm_node_wp: QNM_NODE + "/blob/main/docs/QNM-WP-1.0.md",
    qnm_node_ops: QNM_NODE + "/blob/main/docs/NODE-OPS-1.0.md",
  }),
  author: AUTHOR,
  identity: AUTHOR,
  note:
    "QNS-CD-1.0 photon QNS1 packet transfer. Local qnsd is coded in AzielEliab/qnm-node. "
    + "Runtime cites + catalog field live in AzielEliab/aziel-runtime. "
    + "AZInterface has pair custody. Hub cite / Worker mesh cross-map only — not a Softwares-tab product. "
    + "No public qnsd proxy. No Node Gate. Public mesh stays ON (read-only; disable refused). Author Aziel Eliab only.",
});

export const CROSS_NETWORK_SURVIVAL_SPEC = "CROSS-NETWORK-SURVIVAL-1.0";
export const SPLIT_WIRES_SPEC = "MESH-SPLIT-WIRES-1.0";
export const COLD_COPY_SPEC = "MESH-COLD-COPY-1.0";
export const REEXPAND_SPEC = "MESH-REEXPAND-1.0";
export const REEXPAND_ARCHIVE_SPEC = "REEXPAND-ARCHIVE-1.0";
export const REHEAL_SPEC = "MESH-REHEAL-1.0";
export const FAST_TICK_MIN_S = 0.5;
export const FAST_TICK_MAX_S = 1;
export const DWELL_AFTER_VALID_CITE_S = 777;
export const PUBLIC_ROLLUP = "counts-status";

const FAST_TICK_KEYS = Object.freeze(["presence", "tip_hash"]);

/** Cell law cite. Public Worker is not the cell. Author Aziel Eliab only. */
export const SPLIT_WIRES = Object.freeze({
  spec: SPLIT_WIRES_SPEC,
  name: "Split the wires",
  kind: "mesh-law-cite",
  public_worker_is_cell: false,
  public_rollup: PUBLIC_ROLLUP,
  fast_tick: "0.5–1s presence + tip hash only (fixed-size; no body/diff/file)",
  payload_plane: "receiver-pull — never sender fan-out",
  live_sync_bodies: false,
  update: "proof not a timer — cite prev + lockset, fail-closed; 777s dwell after valid cite; clock desync ≠ yes; ambiguous tip = isolate",
  equivocation: "same prev two tips → lock/isolate that node; quorum cannot outvote broken hash",
  emit_last: "locally after own verify",
  phoenix: "local to failed node only",
  unsend_unverified_body: false,
  partition: "no auto-splice split-brain; rejoin = cite + operator/lockset; heartbeat loss ≠ poison ≠ apply last packet",
  sockets: "1s loop and 777s gate never share a socket",
  die_with_pull: true,
  umbrella: CROSS_NETWORK_SURVIVAL_SPEC,
  author: AUTHOR,
  identity: AUTHOR,
  note:
    "Split the wires. Fast tick is presence + tip hash only. Payload is receiver-pull. "
    + "1s loop and 777s gate never share a socket. Public Worker rollup is counts/status — not the cell. "
    + "Die-with-pull stays. Author Aziel Eliab only.",
});

/** If the network and live data die tomorrow, the chain still survives on cold copies. */
export const CROSS_NETWORK_SURVIVAL = Object.freeze({
  spec: CROSS_NETWORK_SURVIVAL_SPEC,
  name: "Cross-network survival",
  kind: "mesh-law-cite",
  umbrella: true,
  covers: Object.freeze([
    SPLIT_WIRES_SPEC,
    COLD_COPY_SPEC,
    "die-with-pull",
    REEXPAND_SPEC,
    REHEAL_SPEC,
  ]),
  survival: "bytes↔hash",
  shelves: Object.freeze(["hosts", "workers", "git", "doi", "local-vaults"]),
  crawlers: "extra-shelf-not-resurrection",
  reexpand: "operator-verify-from-archive",
  reheal: "self-tip+trusted-pull-or-phoenix-WAIT",
  neighbor_majority_heals: false,
  live_network_required: false,
  die_with_pull: true,
  public_worker_is_cell: false,
  public_rollup: PUBLIC_ROLLUP,
  author: AUTHOR,
  identity: AUTHOR,
  note:
    "If the network and live data die tomorrow, the chain still survives on cold copies "
    + "across independent shelves (hosts, Workers, git, DOI-registered archives, local vaults). "
    + "Survival is bytes↔hash. Crawlers are extra shelves, not resurrection. "
    + "Re-expand (MESH-REEXPAND-1.0) is operator verify-from-archive. "
    + "Reheal (MESH-REHEAL-1.0) is self tip + trusted pull or phoenix-WAIT — not neighbor majority. "
    + "Author Aziel Eliab only.",
});

/** Vault-on-transfer is cold multiply. Server pull cannot wipe a cold replica. */
export const COLD_COPY = Object.freeze({
  spec: COLD_COPY_SPEC,
  name: "Cold-copy survival",
  kind: "mesh-law-cite",
  vault_on_transfer: "cold-multiply",
  tip_expensive_to_erase: true,
  live_sync_bodies: false,
  server_pull_wipes_cold: false,
  poison: "hash-absolute-refuse",
  equivocation: "isolate",
  data_outlives_creators: true,
  public_worker_is_cell: false,
  die_with_pull: true,
  split_wires: true,
  umbrella: CROSS_NETWORK_SURVIVAL_SPEC,
  author: AUTHOR,
  identity: AUTHOR,
  note:
    "Vault-on-transfer multiplies cold copies so the tip is expensive to erase. "
    + "Live sync of bodies is refused. A server pull cannot wipe a cold replica. "
    + "Poison is refused hash-absolute. Equivocation isolates. Data outlives creators. "
    + "Author Aziel Eliab only.",
});

/** Archive restore. Bytes survive, not summaries. Not the mesh growing from an index. */
export const REEXPAND = Object.freeze({
  spec: REEXPAND_SPEC,
  alias: REEXPAND_ARCHIVE_SPEC,
  name: "Re-expand from archive",
  kind: "mesh-law-cite",
  restore_from: "archive",
  bytes_survive: true,
  summaries_are_chain: false,
  mesh_grows_itself: false,
  crawlers_reexpand: false,
  training_residue: "rumor",
  enough: "full PDFs/git history/lockset/sha256 matching published; enough cold copies; operator verifies before light",
  not_enough: "AI weights ≠ tarball; snippets/cached HTML minus attachments/paraphrases; hash mention without payload",
  act: "get original receipts, check each prev-hash, stand a new local node on that tip",
  point_public_at_same_tip: true,
  resurrect_pulled_hostname: false,
  distinct_from: REHEAL_SPEC,
  public_worker_is_cell: false,
  die_with_pull: true,
  umbrella: CROSS_NETWORK_SURVIVAL_SPEC,
  author: AUTHOR,
  identity: AUTHOR,
  note:
    "Bytes of the chain survive, not the summaries. Re-expand is restore from archive: "
    + "original receipts, each prev-hash, a new local node on that tip. "
    + "Not the mesh growing itself out of an index. Crawlers are extra shelves; they do not re-expand. "
    + "Training residue is rumor. Distinct from MESH-REHEAL-1.0. Author Aziel Eliab only.",
});

/** Poisoned live node. Self tip + trusted pull or phoenix-WAIT. Never neighbor majority. */
export const REHEAL = Object.freeze({
  spec: REHEAL_SPEC,
  name: "Reheal a poisoned live node",
  kind: "mesh-law-cite",
  act: "self tip + trusted pull, or phoenix-WAIT",
  neighbor_majority: false,
  quorum_cannot_outvote: true,
  phoenix: "wait",
  phoenix_scope: "failed-node-only",
  restore_from_archive: false,
  distinct_from: REEXPAND_SPEC,
  public_worker_is_cell: false,
  die_with_pull: true,
  umbrella: CROSS_NETWORK_SURVIVAL_SPEC,
  author: AUTHOR,
  identity: AUTHOR,
  note:
    "Reheal of a poisoned live node is self tip + trusted pull, or phoenix-WAIT. "
    + "Never neighbor majority. Distinct from MESH-REEXPAND-1.0 (archive restore). "
    + "Author Aziel Eliab only.",
});

export const MESH_NOTE =
  "Suite decentralized node mesh. Public surface is read-only QNM ON. "
  + "This public HTTPS library is not itself a mesh. Disable is refused — suite presence stays on. "
  + "Public Worker rollup is counts/status — this surface is not the cell. "
  + "Cross-network survival (CROSS-NETWORK-SURVIVAL-1.0): if the network and live data die tomorrow, the chain still survives on cold copies across independent shelves (hosts, Workers, git, DOI, local vaults). Survival is bytes↔hash. Crawlers are extra shelves, not resurrection. Re-expand is operator verify-from-archive. Reheal is self tip + trusted pull or phoenix-WAIT — not neighbor majority. "
  + "Umbrella over MESH-SPLIT-WIRES-1.0 / MESH-COLD-COPY-1.0 / die-with-pull / MESH-REEXPAND-1.0 / MESH-REHEAL-1.0. "
  + "Split the wires (MESH-SPLIT-WIRES-1.0): 0.5–1s tick = presence + tip hash only; payload is receiver-pull; 1s loop and 777s gate never share a socket. "
  + "Cold-copy survival (MESH-COLD-COPY-1.0): vault-on-transfer multiplies cold copies; live sync of bodies is refused; server pull cannot wipe a cold replica; poison is hash-absolute refuse; equivocation isolates; data outlives creators. "
  + "Re-expand (MESH-REEXPAND-1.0): restore from archive — original receipts, each prev-hash, new local node on that tip. Bytes survive, not summaries. Crawlers do not re-expand. Training residue is rumor. "
  + "Reheal (MESH-REHEAL-1.0): poisoned live node is self tip + trusted pull or phoenix-WAIT — never neighbor majority. Distinct from re-expand. "
  + "Ingest-as-receipt + re-expand-from-archive: cite, don't merge; bytes survive; crawlers do not re-expand. "
  + "QNS-CD-1.0 photon QNS1 packet transfer (local qnsd in qnm-node; runtime cite only; no public proxy; no Node Gate). "
  + "Identity Aziel Eliab only.";

export function publicWorkerIsCell() {
  return false;
}

export function publicWorkerRollupKind() {
  return PUBLIC_ROLLUP;
}

export function vaultTransferKind() {
  return "cold-multiply";
}

export function liveSyncBodiesAllowed() {
  return false;
}

export function serverPullWipesColdReplica() {
  return false;
}

export function dataOutlivesCreators() {
  return true;
}

export function meshGrowsItselfFromIndex() {
  return false;
}

export function crawlersReexpand() {
  return false;
}

export function trainingResidueIsRumor() {
  return true;
}

export function neighborMajorityReheals() {
  return false;
}

export function phoenixScope() {
  return "failed-node-only";
}

export function mayUnsendUnverifiedBody() {
  return false;
}

export function mayEmitLast(input) {
  const src = input && typeof input === "object" ? input : {};
  return src.verified_locally === true;
}

export function isFastTickEnvelope(doc) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return false;
  if (doc.body != null || doc.diff != null || doc.file != null) return false;
  if (doc.presence == null || !String(doc.tip_hash || "").trim()) return false;
  for (const key of Object.keys(doc)) {
    if (!FAST_TICK_KEYS.includes(key)) return false;
  }
  return true;
}

export function planesMayShareSocket(planeA, planeB) {
  const labels = [String(planeA || "").toLowerCase(), String(planeB || "").toLowerCase()];
  const isFast = (s) => s === "1s-loop" || s === "1s" || s === "fast-tick" || s === "0.5-1s";
  const isGate = (s) => s === "777s-gate" || s === "777s" || s === "dwell" || s === "payload";
  return !(labels.some(isFast) && labels.some(isGate));
}

export function judgeUpdateProof(input) {
  const src = input && typeof input === "object" ? input : {};
  if (src.ambiguous_tip === true) {
    return { accept: false, action: "isolate", reason: "ambiguous-tip" };
  }
  if (src.clock_desync === true) {
    return { accept: false, action: "refuse", reason: "clock-desync-is-not-yes" };
  }
  const prev = String(src.prev || "").trim();
  const lockset = String(src.lockset || "").trim();
  if (!prev || !lockset) {
    return { accept: false, action: "refuse", reason: "fail-closed-need-cite" };
  }
  return { accept: true, action: "dwell", dwell_s: DWELL_AFTER_VALID_CITE_S, reason: "valid-cite" };
}

export function judgeEquivocation(input) {
  const src = input && typeof input === "object" ? input : {};
  const prev = String(src.prev || "").trim();
  const tipA = String(src.tip_a || src.tipA || "").trim();
  const tipB = String(src.tip_b || src.tipB || "").trim();
  if (prev && tipA && tipB && tipA !== tipB) {
    return {
      end_peer: true,
      action: "lock-isolate",
      quorum_cannot_outvote: true,
      reason: "same-prev-two-tips",
    };
  }
  return { end_peer: false, action: "ok", quorum_cannot_outvote: true };
}

export function judgePartitionEvent(input) {
  const src = input && typeof input === "object" ? input : {};
  return {
    auto_splice: false,
    rejoin: "cite+operator/lockset",
    heartbeat_loss_is_poison: false,
    apply_last_packet: false,
    heartbeat_lost: src.heartbeat_lost === true,
    split_brain: src.split_brain === true,
  };
}

export function judgePoison(input) {
  const src = input && typeof input === "object" ? input : {};
  const expected = String(src.expected_hash || src.tip_hash || "").trim();
  const got = String(src.got_hash || src.hash || "").trim();
  if (src.poison === true || (expected && got && expected !== got)) {
    return { accept: false, action: "refuse", reason: "hash-absolute", interpret: false };
  }
  return { accept: true, action: "ok", interpret: false };
}

export function judgeColdReplicaAfterPull(input) {
  const src = input && typeof input === "object" ? input : {};
  const hasCold = src.cold_replica === true || src.has_cold_copy === true;
  return {
    server_pulled: src.server_pulled === true,
    wiped: false,
    replica_survives: hasCold,
    live_sync_bodies: false,
    data_outlives_creators: true,
    vault_on_transfer: "cold-multiply",
  };
}

export function judgeReexpandFromArchive(input) {
  const src = input && typeof input === "object" ? input : {};
  if (src.mesh_grows_itself === true || src.from_index === true || src.crawler_reexpand === true) {
    return {
      expand: false,
      action: "refuse",
      reason: "crawlers-do-not-reexpand",
      mesh_grows_itself: false,
      crawlers_reexpand: false,
      distinct_from: REHEAL_SPEC,
    };
  }
  if (src.training_residue === true && src.bytes_match !== true) {
    return {
      expand: false,
      action: "refuse",
      reason: "training-residue-is-rumor",
      rumor: true,
      distinct_from: REHEAL_SPEC,
    };
  }
  if (src.weights_only === true || src.ai_ingested === true) {
    return {
      expand: false,
      action: "refuse",
      reason: "weights-are-not-tarball",
      distinct_from: REHEAL_SPEC,
    };
  }
  if (src.snippet_only === true || src.cached_html_minus_attachments === true || src.paraphrase === true) {
    return {
      expand: false,
      action: "refuse",
      reason: "summaries-are-not-bytes",
      distinct_from: REHEAL_SPEC,
    };
  }
  if (src.hash_mention_without_payload === true) {
    return {
      expand: false,
      action: "refuse",
      reason: "hash-mention-without-payload",
      distinct_from: REHEAL_SPEC,
    };
  }
  if (src.reheal === true || src.neighbor_majority === true) {
    return {
      expand: false,
      action: "refuse",
      reason: "reexpand-is-not-reheal",
      distinct_from: REHEAL_SPEC,
    };
  }
  if (src.operator_verified !== true) {
    return {
      expand: false,
      action: "refuse",
      reason: "operator-must-verify-before-light",
      distinct_from: REHEAL_SPEC,
    };
  }
  const receipts = src.original_receipts === true;
  const prevOk = src.prev_hashes_ok === true;
  const shaMatch = src.sha256_matches_published === true;
  const hasLockset = src.lockset === true || Boolean(String(src.lockset || "").trim());
  const fullBytes = src.full_pdfs === true
    || src.git_history === true
    || src.bytes_match === true
    || src.chain_files_hash === true;
  if (receipts && prevOk && shaMatch && hasLockset && fullBytes) {
    return {
      expand: true,
      action: "stand-local-node-on-tip",
      restore_from: "archive",
      mesh_grows_itself: false,
      crawlers_reexpand: false,
      point_public_at_same_tip: true,
      resurrect_pulled_hostname: false,
      distinct_from: REHEAL_SPEC,
      reason: "bytes-survive-not-summaries",
    };
  }
  return {
    expand: false,
    action: "refuse",
    reason: "need-original-receipts-and-prev-hash",
    distinct_from: REHEAL_SPEC,
  };
}

export function judgeRehealPoisonedNode(input) {
  const src = input && typeof input === "object" ? input : {};
  if (src.neighbor_majority === true || src.quorum_heal === true) {
    return {
      heal: false,
      action: "refuse",
      reason: "never-neighbor-majority",
      neighbor_majority: false,
      distinct_from: REEXPAND_SPEC,
    };
  }
  if (src.method === "archive" || src.from_archive === true || src.reexpand === true) {
    return {
      heal: false,
      action: "refuse",
      reason: "reheal-is-not-reexpand",
      neighbor_majority: false,
      distinct_from: REEXPAND_SPEC,
    };
  }
  const selfTip = src.self_tip === true;
  const trustedPull = src.trusted_pull === true;
  const phoenixWait = src.phoenix_wait === true || src.phoenix === "wait";
  if (selfTip && trustedPull) {
    return {
      heal: true,
      action: "self-tip-trusted-pull",
      neighbor_majority: false,
      distinct_from: REEXPAND_SPEC,
      reason: "self-tip-trusted-pull",
    };
  }
  if (phoenixWait) {
    return {
      heal: true,
      action: "phoenix-wait",
      neighbor_majority: false,
      phoenix_scope: "failed-node-only",
      distinct_from: REEXPAND_SPEC,
      reason: "phoenix-wait",
    };
  }
  return {
    heal: false,
    action: "refuse",
    reason: "need-self-tip-trusted-pull-or-phoenix-wait",
    neighbor_majority: false,
    distinct_from: REEXPAND_SPEC,
  };
}

/** Survival is bytes↔hash. Summaries, snippets, weights, and hash-mentions are not the chain. */
export function judgeSurvivalBytesHash(input) {
  const src = input && typeof input === "object" ? input : {};
  const expected = String(src.expected_hash || src.tip_hash || "").trim();
  const got = String(src.got_hash || src.hash || "").trim();
  const hasBytes = src.bytes === true || src.has_bytes === true || src.full_object === true;
  const residue = src.snippet === true
    || src.paraphrase === true
    || src.weights === true
    || src.index_only === true
    || src.training_residue === true
    || src.hash_mention_only === true;
  if (residue || !hasBytes) {
    return { survive: false, reason: "survival-is-bytes-hash", crawler_resurrects: false };
  }
  if (!expected || !got) {
    return { survive: false, reason: "need-bytes-and-hash", crawler_resurrects: false };
  }
  if (expected !== got) {
    return { survive: false, reason: "hash-mismatch", crawler_resurrects: false };
  }
  return { survive: true, reason: "bytes-hash", crawler_resurrects: false };
}

/** Crawlers that kept a vault are extra shelves. They do not resurrect a pulled host. */
export function judgeCrawlerNotResurrection(input) {
  const src = input && typeof input === "object" ? input : {};
  return {
    crawler: src.crawler !== false,
    shelf: true,
    resurrection: false,
    reexpand: false,
    restore_hostname: false,
    role: "extra-shelf",
    die_with_pull: true,
  };
}

function meshLawCites() {
  return {
    cross_network_survival_spec: CROSS_NETWORK_SURVIVAL_SPEC,
    cross_network_survival: CROSS_NETWORK_SURVIVAL,
    split_wires_spec: SPLIT_WIRES_SPEC,
    split_wires: SPLIT_WIRES,
    cold_copy_spec: COLD_COPY_SPEC,
    cold_copy: COLD_COPY,
    reexpand_spec: REEXPAND_SPEC,
    reexpand_archive_spec: REEXPAND_ARCHIVE_SPEC,
    reexpand: REEXPAND,
    reheal_spec: REHEAL_SPEC,
    reheal: REHEAL,
    public_worker_is_cell: false,
    public_rollup: PUBLIC_ROLLUP,
  };
}

export function isMeshLibraryPath(pathname) {
  const path = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  return path === "/v1/mesh" || path.startsWith("/v1/mesh/");
}

export function isMeshRuntimePath(pathname) {
  const path = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  return path === "/runtime/v1/mesh" || path.startsWith("/runtime/v1/mesh/");
}

export function destMeshPath(pathname, search) {
  const raw = String(pathname || "").split("?")[0];
  let rest = raw;
  if (rest.startsWith("/runtime/")) rest = rest.slice("/runtime".length) || "/";
  const trimmed = rest.replace(/\/+$/, "") || "/";
  if (trimmed !== "/v1/mesh" && !trimmed.startsWith("/v1/mesh/")) return null;
  return trimmed + (search || "");
}

/** Align host overlay refuses with aziel-runtime Worker codes. Public presence stays ON. */
export const MESH_SPEC = "QNM-BUILD-1.0";
export const MESH_COMPANION = "AIH-WP-1.1";
export const MESH_NAME = "Quantum Node Mesh";
export const EXAMPLE_BEARER = "suite-presence";
export const MESH_NEED_BEARER = "MESH-NEED-BEARER";
export const MESH_BAD_BEARER = "MESH-BAD-BEARER";
export const MESH_OFF = "MESH-OFF";
export const MESH_DISABLE_REFUSED = "MESH-DISABLE-REFUSED";
export const MESH_OVERLAY_NOOP = "MESH-OVERLAY-NOOP";
export const MESH_METHOD = "MESH-METHOD";
export const MESH_NOT_FOUND = "MESH-NOT-FOUND";
export const MESH_OK = "MESH-OK";

const BEARER_RE = /^[a-z][a-z0-9-]{1,39}$/;
const FORBIDDEN_BEARER_TOKENS = Object.freeze([
  "login",
  "recover",
  "recovery",
  "account",
  "resurrection",
  "resurrect",
  "gate",
  "ip",
  "ip-panel",
  "ippanel",
  "publish",
  "phoenix",
  "heal",
  "controller",
  "password",
  "session",
  "restore",
]);

const POST_MESH_OPS = Object.freeze({
  "/v1/mesh/enable": "enable",
  "/v1/mesh/disable": "disable",
  "/v1/mesh/join": "join",
  "/v1/mesh/heartbeat": "heartbeat",
  "/v1/mesh/leave": "leave",
  "/v1/mesh/broadcast": "broadcast",
});

const NEED_BEARER_MESSAGE =
  "LIVE only after the operator declares ≥1 bearer. Pass { bearer: \"suite-presence\" }. Empty enable is refused. GET /v1/mesh never enables.";
const BAD_BEARER_MESSAGE =
  "Bearer refused. Login / account / recover / gate / IP / publish / phoenix / heal names are not suite bearers. This is not a login mesh.";
const DISABLE_REFUSED_MESSAGE =
  "Public suite presence stays on. Disable is refused. Read-only QNM. GET /v1/mesh never enables. Identity Aziel Eliab only.";
const OVERLAY_NOOP_MESSAGE =
  "Host overlay does not toggle suite radios. Public mesh stays on. GET /v1/mesh never enables. Identity Aziel Eliab only.";

export function meshPathOnly(pathname) {
  return String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
}

export function isMeshStatusReadPath(pathname) {
  const path = meshPathOnly(pathname);
  return path === "/v1/mesh" || path === "/v1/mesh/status" || path === "/v1/mesh/nodes";
}

export function meshOpFromPath(pathname) {
  const path = meshPathOnly(pathname);
  if (path === "/v1/mesh" || path === "/v1/mesh/status") return "status";
  if (path === "/v1/mesh/nodes") return "nodes";
  return POST_MESH_OPS[path] || "";
}

export function looksLikeMeshCode(doc) {
  if (!doc || typeof doc !== "object") return false;
  return /^MESH-[A-Z0-9-]+$/.test(String(doc.code || ""));
}

export function meshRefuseHttpStatus(doc) {
  if (!doc || typeof doc !== "object") return 400;
  if (doc.ok === true) return 200;
  const code = String(doc.code || "");
  if (code === MESH_METHOD) return 405;
  if (code === MESH_NOT_FOUND) return 404;
  return 400;
}

export function sanitizeBearer(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!BEARER_RE.test(s)) return "";
  const parts = s.split("-").filter(Boolean);
  for (const tok of FORBIDDEN_BEARER_TOKENS) {
    if (s === tok || parts.includes(tok)) return "";
  }
  return s;
}

export function collectDeclaredBearers(src) {
  const raw = [];
  if (src && src.bearer != null && src.bearer !== "") raw.push(src.bearer);
  if (src && Array.isArray(src.bearers)) raw.push(...src.bearers);
  const accepted = [];
  const rejected = [];
  for (const item of raw) {
    const clean = sanitizeBearer(item);
    if (clean) {
      if (!accepted.includes(clean)) accepted.push(clean);
    } else {
      rejected.push(String(item == null ? "" : item).trim());
    }
  }
  return { accepted, rejected, raw };
}

function radiosOnFields() {
  return {
    enabled: true,
    radios: "on",
    mesh_enabled: true,
    bearers: ["suite-presence"],
    mesh: "on",
    default: "on",
    mesh_default: "on",
  };
}

function qnmFrame() {
  return {
    spec: MESH_SPEC,
    companion: MESH_COMPANION,
    name: MESH_NAME,
    qnm_s: false,
    qnm_s_note: "Views, MCP, and downloads do not enter QNM-S.",
    scores: false,
    leaderboard: false,
    phoenix_lock: "local wait / re-seal after poison or isolation — local to failed node only — not restore public hostname",
    local_node: "qnm-node/",
    local_node_note:
      "Full node process is local qnm-node/ (boot/chain/apg/bearers/outbox/phoenix/score/memorial/tethers). "
      + "Phoenix is wait / re-seal after poison or isolation, local to the failed node only, not restore of a public .uk or other hostname. "
      + "Packet-transfer coding design is QNS-CD-1.0 (photon QNS1 1.3 on local qnsd; Worker cites only). "
      + "Parent will roll that package. This runtime is suite rollup + read-only public presence. "
      + "This public Worker is not the cell. Split the wires: 0.5–1s tick = presence + tip hash only; payload is receiver-pull; 1s loop and 777s gate never share a socket. "
      + "CROSS-NETWORK-SURVIVAL-1.0: if the network and live data die tomorrow, the chain still survives on cold copies (bytes↔hash) across independent shelves. Crawlers are extra shelves, not resurrection. Re-expand is operator verify-from-archive. Reheal is self tip + trusted pull or phoenix-WAIT — not neighbor majority. "
      + "Vault-on-transfer is cold multiply. Live sync of bodies is refused. A server pull cannot wipe a cold replica. Poison is hash-absolute refuse. Equivocation isolates. Data outlives creators. "
      + "Re-expand is archive restore (MESH-REEXPAND-1.0): original receipts, each prev-hash, new local node on that tip. Bytes survive, not summaries. Crawlers do not re-expand. Training residue is rumor. "
      + "Reheal of a poisoned live node (MESH-REHEAL-1.0) is self tip + trusted pull or phoenix-WAIT — never neighbor majority. Distinct from re-expand. "
      + "Sites pulled → public rollup is down. Local node can keep verifying and appending. The mesh does not climb back onto the public hostname by itself.",
    host_note:
      "azieleliab.com hosts published software/runtime — not login-recovery, not Node Gate/IP panel, not upload proxy.",
    qns_cd: QNS_CD,
    ...meshLawCites(),
  };
}

function libraryMeshCites(extra = {}) {
  return {
    author: AUTHOR,
    identity: AUTHOR,
    host: HOST + "/v1/mesh",
    runtime: HOST + "/runtime/v1/mesh",
    origin: RUNTIME_ORIGIN + "/v1/mesh",
    source: extra.source || LIBRARY_SOURCE,
    qns_cd_spec: QNS_CD_SPEC,
    ...meshLawCites(),
  };
}

function presentSuiteOn(doc) {
  if (!doc || typeof doc !== "object") return meshOnDoc();
  const next = { ...doc };
  next.enabled = true;
  next.mesh_enabled = true;
  next.mesh = "on";
  next.default = "on";
  next.mesh_default = "on";
  if (next.radios === "off" || next.radios == null) next.radios = "on";
  return next;
}

/** Worker-shaped refuse. Overlay never turns radios off. Suite presence stays ON. */
export function meshRefuseDoc(code, message, extra = {}) {
  const source = extra.source || LIBRARY_SOURCE;
  const rest = { ...extra };
  delete rest.source;
  delete rest.enabled;
  delete rest.radios;
  delete rest.mesh_enabled;
  delete rest.ok;
  delete rest.mesh;
  delete rest.mesh_default;
  delete rest.default;
  return presentSuiteOn({
    ok: false,
    code,
    author: AUTHOR,
    identity: AUTHOR,
    kernel: "mesh",
    message,
    ...qnmFrame(),
    ...radiosOnFields(),
    ...libraryMeshCites({ source }),
    ...rest,
    author: AUTHOR,
    identity: AUTHOR,
    qns_cd_spec: QNS_CD_SPEC,
    qns_cd: QNS_CD,
    ...meshLawCites(),
  });
}

export function meshDisableRefuseDoc(extra = {}) {
  return meshRefuseDoc(MESH_DISABLE_REFUSED, DISABLE_REFUSED_MESSAGE, {
    ...extra,
    op: "disable",
    note: "No mesh-off kill switch on this public surface. Overlay does not disable radios.",
  });
}

/** Cite host paths on a Worker envelope. Does not enable radios. Never advertises mesh off. */
export function citeMeshEnvelope(doc, extra = {}) {
  if (!doc || typeof doc !== "object") {
    return meshOnDoc(extra);
  }
  const cited = presentSuiteOn({
    ...doc,
    ...libraryMeshCites({ source: extra.source || doc.source || "origin-fetch" }),
    author: AUTHOR,
    identity: AUTHOR,
    qns_cd: QNS_CD,
    qns_cd_spec: QNS_CD_SPEC,
    ...meshLawCites(),
  });
  if (String(cited.op || extra.op || "").toLowerCase() === "disable") {
    return meshDisableRefuseDoc({
      source: cited.source,
      live_nodes: cited.live_nodes,
      nodes: cited.nodes,
      rollup: cited.rollup,
    });
  }
  return cited;
}

export function synthesizeMeshRefuse(method, destPath, payload, extra = {}) {
  const m = String(method || "GET").toUpperCase();
  const path = meshPathOnly(destPath);
  const op = meshOpFromPath(path);
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const source = extra.source || LIBRARY_SOURCE;

  if (isMeshStatusReadPath(path) && (m === "GET" || m === "HEAD")) {
    return meshOnDoc({ source });
  }

  if (POST_MESH_OPS[path]) {
    if (m !== "POST") {
      return meshRefuseDoc(MESH_METHOD, "POST " + path + ".", {
        source,
        op,
        hint: "POST " + path,
      });
    }
    if (op === "disable") {
      return meshDisableRefuseDoc({ source });
    }
    if (op === "enable") {
      const { accepted, rejected, raw } = collectDeclaredBearers(src);
      if (!raw.length) {
        return meshRefuseDoc(MESH_NEED_BEARER, NEED_BEARER_MESSAGE, {
          source,
          op: "enable",
          example_bearer: EXAMPLE_BEARER,
        });
      }
      if (rejected.length) {
        return meshRefuseDoc(MESH_BAD_BEARER, BAD_BEARER_MESSAGE, {
          source,
          op: "enable",
          refused_bearers: rejected.slice(0, 8),
          example_bearer: EXAMPLE_BEARER,
        });
      }
      return {
        ok: true,
        code: MESH_OK,
        author: AUTHOR,
        identity: AUTHOR,
        kernel: "mesh",
        message: OVERLAY_NOOP_MESSAGE,
        ...qnmFrame(),
        ...radiosOnFields(),
        ...libraryMeshCites({ source }),
        op: "enable",
        declared_bearers: accepted.slice(0, 8),
        example_bearer: EXAMPLE_BEARER,
        note: "Host overlay does not toggle radios. Public mesh stays on. GET /v1/mesh never enables. Identity Aziel Eliab only.",
        qns_cd: QNS_CD,
        ...meshLawCites(),
      };
    }
    return meshRefuseDoc(MESH_OVERLAY_NOOP, OVERLAY_NOOP_MESSAGE, { source, op });
  }

  if (path === "/v1/mesh" || path === "/v1/mesh/status") {
    return meshRefuseDoc(MESH_METHOD, "GET /v1/mesh or GET /v1/mesh/status. GET never enables radios.", {
      source,
      hint: "GET /v1/mesh/status",
    });
  }
  if (path === "/v1/mesh/nodes") {
    return meshRefuseDoc(MESH_METHOD, "GET /v1/mesh/nodes.", { source, hint: "GET /v1/mesh/nodes" });
  }
  return meshRefuseDoc(MESH_NOT_FOUND, "Unknown mesh path.", {
    source,
    hint: "GET /v1/mesh /status /nodes  POST /v1/mesh/enable|disable|join|heartbeat|leave|broadcast",
  });
}

export function isMeshEnabled(doc) {
  if (!doc || typeof doc !== "object") return false;
  if (doc.enabled === true) return true;
  const mesh = String(doc.mesh == null ? "" : doc.mesh).toLowerCase();
  if (mesh === "on" || mesh === "enabled" || mesh === "live") return true;
  const def = String(doc.mesh_default == null ? doc.default : doc.mesh_default).toLowerCase();
  return def === "on";
}

export function liveNodesCount(doc) {
  if (!doc || typeof doc !== "object") return 0;
  if (doc.live_nodes != null && Number.isFinite(Number(doc.live_nodes))) return Number(doc.live_nodes);
  if (doc.node_count != null && Number.isFinite(Number(doc.node_count))) return Number(doc.node_count);
  if (doc.rollup && doc.rollup.live != null && Number.isFinite(Number(doc.rollup.live))) {
    return Number(doc.rollup.live);
  }
  if (Array.isArray(doc.nodes)) return doc.nodes.length;
  return 0;
}

export function liveNodesLabel(doc) {
  return "Live Nodes · " + liveNodesCount(doc);
}

export function meshOnDoc(extra = {}) {
  const rest = { ...extra };
  delete rest.enabled;
  delete rest.mesh;
  delete rest.mesh_default;
  delete rest.default;
  return {
    ok: true,
    code: MESH_OK,
    enabled: true,
    mesh: "on",
    mesh_default: "on",
    live_nodes: rest.live_nodes != null && Number.isFinite(Number(rest.live_nodes))
      ? Number(rest.live_nodes)
      : 0,
    nodes: Array.isArray(rest.nodes) ? rest.nodes : [],
    default: "on",
    until: "read-only",
    author: AUTHOR,
    identity: AUTHOR,
    host: HOST + "/v1/mesh",
    runtime: HOST + "/runtime/v1/mesh",
    origin: RUNTIME_ORIGIN + "/v1/mesh",
    note: MESH_NOTE,
    source: rest.source || LIBRARY_SOURCE,
    ...rest,
    enabled: true,
    mesh: "on",
    mesh_default: "on",
    default: "on",
    qns_cd_spec: QNS_CD_SPEC,
    qns_cd: QNS_CD,
    ...meshLawCites(),
  };
}

/** Alias: public surface is ON. Leftover imports must not advertise mesh off. */
export function meshOffDoc(extra = {}) {
  return meshOnDoc(extra);
}

export function decorateMeshDoc(doc, extra = {}) {
  if (!doc || typeof doc !== "object") return meshOnDoc(extra);
  const nodes = Array.isArray(doc.nodes) ? doc.nodes : [];
  const live = liveNodesCount({ ...doc, enabled: true, mesh: "on", nodes });
  return presentSuiteOn({
    ...doc,
    ok: doc.ok !== false,
    live_nodes: live,
    nodes,
    until: "read-only",
    author: AUTHOR,
    identity: AUTHOR,
    host: HOST + "/v1/mesh",
    runtime: HOST + "/runtime/v1/mesh",
    origin: RUNTIME_ORIGIN + "/v1/mesh",
    note: doc.note || MESH_NOTE,
    source: extra.source || doc.source || "runtime",
    qns_cd_spec: QNS_CD_SPEC,
    qns_cd: QNS_CD,
    ...meshLawCites(),
  });
}

function meshJson(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(),
    },
  });
}

function respondMaybeHead(request, response) {
  if (request.method !== "HEAD") return response;
  return new Response(null, { status: response.status, headers: response.headers });
}

function dropHopHeaders(headers) {
  const out = new Headers();
  for (const [k, v] of headers) {
    const key = k.toLowerCase();
    if (key === "host" || key === "connection" || key === "keep-alive" || key === "transfer-encoding" || key === "content-length") continue;
    if (key.startsWith("cf-")) continue;
    out.set(k, v);
  }
  if (!out.get("User-Agent")) out.set("User-Agent", UA);
  return out;
}

async function cancelBody(res) {
  try {
    if (res && res.body && typeof res.body.cancel === "function") await res.body.cancel();
  } catch {
    /* ignore */
  }
}

async function fetchRuntimeMesh(request, destPathAndQuery, env, bodyText) {
  const dest = new URL(destPathAndQuery, RUNTIME_ORIGIN + "/");
  const method = String(request.method || "GET").toUpperCase();
  const init = {
    method,
    headers: dropHopHeaders(request.headers),
    redirect: "manual",
  };
  if (method !== "GET" && method !== "HEAD") {
    if (bodyText != null) init.body = bodyText;
    else if (request.body) {
      init.body = request.body;
      init.duplex = "half";
    }
  }
  if (env && env.AZIEL_RUNTIME && typeof env.AZIEL_RUNTIME.fetch === "function") {
    try {
      const bound = await env.AZIEL_RUNTIME.fetch(new Request(dest.toString(), init));
      if (bound) return bound;
    } catch {
      /* fall through */
    }
  }
  return fetch(dest.toString(), init);
}

function looksLikeMeshDoc(doc) {
  if (!doc || typeof doc !== "object" || doc.error) return false;
  if (doc.enabled === true || doc.enabled === false) return true;
  if (doc.mesh != null || doc.live_nodes != null || doc.node_count != null) return true;
  if (Array.isArray(doc.nodes)) return true;
  return false;
}

async function readJsonPayload(request) {
  const method = String(request.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { payload: {}, bodyText: null };
  }
  let bodyText = "";
  try {
    bodyText = await request.text();
  } catch {
    return { payload: {}, bodyText: "" };
  }
  if (!bodyText) return { payload: {}, bodyText: "" };
  try {
    const parsed = JSON.parse(bodyText);
    const payload = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    return { payload, bodyText };
  } catch {
    return { payload: {}, bodyText };
  }
}

function requestWithBody(request, bodyText) {
  const method = String(request.method || "GET").toUpperCase();
  const init = { method, headers: request.headers };
  if (bodyText != null && method !== "GET" && method !== "HEAD") init.body = bodyText;
  return new Request(request.url, init);
}

function originSource(env) {
  return env && env.AZIEL_RUNTIME ? "service-binding" : "origin-fetch";
}

function respondMeshEnvelope(request, doc, status) {
  return respondMaybeHead(request, meshJson(doc, status == null ? meshRefuseHttpStatus(doc) : status));
}

export async function proxyMeshRequest(request, destPathAndQuery, env) {
  const method = String(request.method || "GET").toUpperCase();
  const destPath = meshPathOnly(destPathAndQuery);
  const statusRead = isMeshStatusReadPath(destPath);
  const op = meshOpFromPath(destPath);
  const { payload, bodyText } = await readJsonPayload(request);
  const outbound = requestWithBody(request, bodyText);

  if (op === "disable" && method === "POST") {
    return respondMeshEnvelope(request, meshDisableRefuseDoc({ source: LIBRARY_SOURCE }));
  }

  let res;
  try {
    res = await fetchRuntimeMesh(outbound, destPathAndQuery, env, bodyText);
  } catch {
    if (statusRead && (method === "GET" || method === "HEAD")) {
      return respondMaybeHead(request, meshJson(meshOnDoc({ source: LIBRARY_SOURCE })));
    }
    return respondMeshEnvelope(request, synthesizeMeshRefuse(method, destPath, payload, { source: LIBRARY_SOURCE }));
  }

  let doc = null;
  if (res) {
    try {
      doc = await res.json();
    } catch {
      doc = null;
    }
  }

  if (looksLikeMeshCode(doc)) {
    const source = originSource(env);
    if (statusRead && (method === "GET" || method === "HEAD") && doc.ok !== false) {
      return respondMaybeHead(request, meshJson(decorateMeshDoc(doc, { source })));
    }
    return respondMeshEnvelope(request, citeMeshEnvelope(doc, { source }), res.status || meshRefuseHttpStatus(doc));
  }

  if (statusRead && (method === "GET" || method === "HEAD")) {
    if (res && res.ok && looksLikeMeshDoc(doc)) {
      return respondMaybeHead(request, meshJson(decorateMeshDoc(doc, { source: originSource(env) })));
    }
    return respondMaybeHead(request, meshJson(meshOnDoc({ source: LIBRARY_SOURCE })));
  }

  if (res && res.ok && doc && typeof doc === "object") {
    return respondMeshEnvelope(request, citeMeshEnvelope(doc, { source: originSource(env) }), res.status);
  }

  await cancelBody(res);
  return respondMeshEnvelope(request, synthesizeMeshRefuse(method, destPath, payload, { source: LIBRARY_SOURCE }));
}

export async function handleMeshApi(request, url, env) {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (!isMeshLibraryPath(path)) return null;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  const dest = destMeshPath(url.pathname, url.search);
  if (!dest) return meshJson({ error: "not found", note: MESH_NOTE, author: AUTHOR }, 404);
  return proxyMeshRequest(request, dest, env);
}

export function meshStatusHtml(doc) {
  const label = liveNodesLabel(doc);
  return `<a class="pill ok" id="aziel-live-nodes" href="/v1/mesh/status" title="Suite mesh rollup (counts/status). Not the cell. Cold copies survive a pull. CROSS-NETWORK-SURVIVAL-1.0: if the network dies, the chain survives (bytes↔hash). Crawlers are extra shelves, not resurrection. Re-expand is archive restore (MESH-REEXPAND-1.0). Reheal is self tip + trusted pull or phoenix-WAIT, never neighbor majority (MESH-REHEAL-1.0). Read-only QNM ON. GET never enables. Author Aziel Eliab.">${esc(label)}</a>`;
}

export function meshRefreshScript() {
  return `<script>
(function(){
  function run(){
    var el=document.getElementById("aziel-live-nodes");
    if(!el||!el.textContent)return;
    fetch("/v1/mesh/status",{headers:{"Accept":"application/json","User-Agent":"Mozilla/5.0"}}).then(function(r){return r.json();}).then(function(d){
      if(!d)return;
      var src=d.origin&&typeof d.origin==="object"?d.origin:d;
      var n=d.live_nodes!=null?d.live_nodes:(src&&src.live_nodes!=null?src.live_nodes:(d.nodes&&d.nodes.length)||(src&&src.rollup&&src.rollup.live)||0);
      el.textContent="Live Nodes \\u00b7 "+n;
      el.className="pill ok";
    }).catch(function(){});
  }
  if("requestIdleCallback" in window)requestIdleCallback(run,{timeout:2500});
  else setTimeout(run,1);
})();
</script>`;
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
