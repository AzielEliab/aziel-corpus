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
 * SPORE-1.0 last-resort failsafe after live fronts + cold-shelf mutual backup
 * (pause / preserve / wait / physical-wipe-only; shelves stay intact, not failed).
 * RE-COLD-STORE is an honest hook (no invented destinations). Cite Worker GET /v1/survival.
 * NO-LIE-NO-REWRITE-1.0: network never lies to stay alive; no rewrite key;
 * copies not all on one tunnel. Cites the live ingest lockset; does not replace it.
 */
import { HOST, RUNTIME_ORIGIN, RUNTIME_GITHUB, RUNTIME_GIT_SHA, RUNTIME_VERSION_ID, RUNTIME_VERSION } from "./runtime-copy.js";
import {
  NO_LIE,
  NO_LIE_SPEC,
  judgeNoLie,
  judgeNoRewrite,
  judgeSurvivalKit,
  judgeVerifyWithoutVoice,
  networkNeverLies,
  oneTunnelIsKit,
  rewriteKeyExists,
} from "./no-lie.js";
import {
  mergeLiveNodes,
  PAGE_VIEWERS_PLANE,
  PRESENCE_SPEC,
  readPageViewers,
  runtimeAggregatesPageViewers,
} from "./presence.js";

export {
  NO_LIE,
  NO_LIE_SPEC,
  judgeNoLie,
  judgeNoRewrite,
  judgeSurvivalKit,
  judgeVerifyWithoutVoice,
  networkNeverLies,
  oneTunnelIsKit,
  rewriteKeyExists,
};

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
  cold_multi_shelf: "COLD-MULTI-SHELF-1.0",
  spore: "SPORE-1.0",
  spore_role: "last-resort-failsafe",
  spore_replaces_cold_shelves: false,
  re_cold_store: "RE-COLD-STORE",
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
    + "Executable shelves: COLD-MULTI-SHELF-1.0 planes A/B/C (GET /shelves). Plane A = one CF/GitHub tunnel (5 surfaces / 2 family radii); B = alt independent forge/archive tip-pack SLOT (Codeberg / archive.org / Framagit); C = USB airgap SLOT + RESTORE-DRILL schema. Extra E/F/G SLOTs stay url-null. "
    + "SPORE-1.0 is last-resort failsafe after live fronts and cold-shelf mutual backup (pause / preserve / wait / physical-wipe-only). Shelves stay intact (not failed). RE-COLD-STORE is an honest hook (no invented destinations). Cite Worker GET /v1/survival. "
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

/** Public Live Nodes = mesh presence + current website page viewers. Never Softwares. Never uses. */
export const LIVE_NODES_PLANE = "human-mesh-users-page-viewers";
export const NODES_PLANE = "human-mesh-users-uses";
export const RUNTIME_LIVE_NODES_PLANE = "human-mesh-users";
export const RUNTIME_SITE_LIVE_PLANE = "human-mesh-users-site-viewers";
export const LIVE_NODES_NOTE =
  "Public Live Nodes (live_nodes / rollup.mesh) count current human presence: human mesh users (join/heartbeat/presence with human bearers) plus concurrent human page viewers on godlock.uk, azieleliab.com, and azielcorpuslibrary.net (operator lock 2026-09-21). hedidntjump.com is excluded. Isolated humans stay on isolated_nodes. Not Softwares catalog length. Not downloaded Softwares instances. Not software_nodes. Not the cited human uses signal (USES stays on Nodes). Uses are interaction counters, not unique people. The public count is runtime GET /v1/mesh live_nodes when that envelope includes site viewers — do not replace it with a library-only viewer count. Bots, prefetch, and machine routes do not inflate Live Nodes. Incomplete or unbound telemetry is reported honestly (0 + complete=false). Live Nodes does not invent users. Zero is honest when no humans are present.";
export const NODES_NOTE =
  "Public Nodes (nodes_count / rollup.nodes) count human mesh users plus the cited human uses signal (USES / human_uses). Uses are interaction counters, not unique people. Incomplete or unbound telemetry is reported honestly (0 + complete=false). Nodes does not invent users. Zero is honest.";
export const SOFTWARE_NODES_NOTE =
  "software_nodes / rollup.software count Softwares product Workers ({slug}-worker) from suite-presence fan-out. They may appear in the mesh roster. They must never feed public Live Nodes.";
export const HUMAN_NODES_NOTE =
  "human_nodes / rollup.human count humans who exist as mesh users (join/heartbeat/presence — human bearers or kind=human). Auto-minted mesh_* joins are human participants. Named downloaded Softwares instance ids stay instance_nodes.";
export const HUMAN_USES_NOTE =
  "human_uses is the USES interaction counter (no PII), not a unique-user count. Incomplete or unbound telemetry is reported as 0 with complete=false. Nodes does not invent users from missing uses. Live Nodes does not add uses.";
export const PAGE_VIEWERS_NOTE =
  "human_page_viewers / page_viewers count concurrent human HTML viewers on azielcorpuslibrary.net (packed presence, TTL 5 min). Bots, prefetch, and /v1 machine routes do not count. Prefer runtime /v1/mesh when that envelope already aggregates page viewers.";

export const MESH_NOTE =
  "Suite decentralized node mesh. Public surface is read-only QNM ON. "
  + "Disable is refused — suite presence stays on. "
  + "Public Worker rollup is counts/status. "
  + "Public Live Nodes count human mesh presence plus current website page viewers — not Softwares (software_nodes) and not cited uses. Public Nodes count human mesh users plus cited human uses. "
  + "Cross-network survival (CROSS-NETWORK-SURVIVAL-1.0): if the network and live data die tomorrow, the chain still survives on cold copies across independent shelves (hosts, Workers, git, DOI, local vaults). Survival is bytes↔hash. Crawlers are extra shelves. Re-expand is operator verify-from-archive. Reheal is self tip + trusted pull or phoenix-WAIT. "
  + "Umbrella over MESH-SPLIT-WIRES-1.0 / MESH-COLD-COPY-1.0 / die-with-pull / MESH-REEXPAND-1.0 / MESH-REHEAL-1.0. "
  + "Split the wires (MESH-SPLIT-WIRES-1.0): 0.5–1s tick = presence + tip hash only; payload is receiver-pull; 1s loop and 777s gate never share a socket. "
  + "Cold-copy survival (MESH-COLD-COPY-1.0): vault-on-transfer multiplies cold copies; live sync of bodies is refused; server pull cannot wipe a cold replica; poison is hash-absolute refuse; equivocation isolates; data outlives creators. "
  + "Re-expand (MESH-REEXPAND-1.0): restore from archive — original receipts, each prev-hash, new local node on that tip. Bytes survive, not summaries. Crawlers do not re-expand. Training residue is rumor. "
  + "Reheal (MESH-REHEAL-1.0): poisoned live node is self tip + trusted pull or phoenix-WAIT — never neighbor majority. Distinct from re-expand. "
  + "Ingest-as-receipt + re-expand-from-archive: cite, don't merge; bytes survive; crawlers do not re-expand. "
  + "No-lie / no-rewrite (NO-LIE-NO-REWRITE-1.0): network never lies to stay alive; hash-absolute beats survival; no rewrite key; copies not all on one tunnel; verify without the author's voice. Cites the live lockset AZLOCK-INGEST-REEXPAND-1.0; does not replace that tip. "
  + "Cold multi-shelf (COLD-MULTI-SHELF-1.0): planes A/B/C — A = one CF/GitHub tunnel (5 published surfaces / 2 family radii); B = alt independent forge/archive tip-pack SLOT (Codeberg / archive.org / Framagit); C = USB airgap SLOT + RESTORE-DRILL schema. Extra E/F/G SLOTs stay url-null. Executable export/verify + honest live|slot|refused registry on GET /shelves. "
  + "SPORE-1.0 last-resort failsafe after live fronts and cold-shelf mutual backup: pause / preserve / wait / physical-wipe-only. Does not replace shelves. Shelves stay intact (not failed). RE-COLD-STORE is an honest hook (no invented destinations). Cite Worker GET /v1/survival. "
  + "QNS-CD-1.0 photon QNS1 packet transfer (local qnsd in qnm-node; runtime cite only; no public proxy; no Node Gate). "
  + "Public VPN / channel plane as on live aziel-runtime GET /v1/mesh (SoT " + RUNTIME_VERSION + " " + RUNTIME_GIT_SHA + " / version_id " + RUNTIME_VERSION_ID + "): vpn HTTPS/WS REAL; WireGuard/OpenVPN/L3 SLOT; default_vpn_backend azvpn auto_use true; channel_plane worker_hardware:false (wifi/bluetooth/rf/photon cites ON on local qnm-node). GET never enables radios beyond suite-presence. "
  + "Identity Aziel Eliab only.";

/** Live GET /v1/mesh VPN kinds. Cite only — this hub is not a kernel concentrator. */
export const VPN_CITE = Object.freeze({
  spec: "OPERATOR-OVERRIDE-2026-09-17-VPN",
  author: AUTHOR,
  identity: AUTHOR,
  vpn: true,
  public_vpn: true,
  tunnel_concentrator: true,
  concentrator_slug: "azvpn",
  default_vpn_backend: "azvpn",
  auto_use: true,
  https_ws: "REAL",
  wireguard: "SLOT",
  openvpn: "SLOT",
  l3_exit: "SLOT",
  origin_hiding: false,
  worker_terminates_kernel_udp: false,
  note:
    "AZVPN is the automatic public-VPN / tunnel-concentrator backend. "
    + "REAL path is application-layer HTTPS/FragGate envelopes (+ optional WS attach). "
    + "WireGuard UDP, OpenVPN, and L3 exit-IP pools stay SLOT. Author Aziel Eliab only.",
});

/** Live GET /v1/mesh channel_plane. Worker hardware is false. */
export const CHANNEL_PLANE = Object.freeze({
  spec: "QNM-CHANNEL-PLANE-1.0",
  author: AUTHOR,
  identity: AUTHOR,
  plane: "channel",
  wifi: "on",
  bluetooth: "on",
  rf: "on",
  photon: "on",
  worker_hardware: false,
  invented_hardware: false,
  public_proxy: false,
  local_process: "qnm-node / qnsd",
  local: "https://github.com/AzielEliab/qnm-node",
  vpn: true,
  public_vpn: true,
  note:
    "Channel plane cites ON (wifi / bluetooth / rf / photon) on local qnm-node. "
    + "Worker hardware is false. Invented hardware is false. Pairing ≠ tunnel.",
});

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
    no_lie_spec: NO_LIE_SPEC,
    no_lie: NO_LIE,
    public_worker_is_cell: false,
    public_rollup: PUBLIC_ROLLUP,
    vpn: VPN_CITE,
    channel_plane: CHANNEL_PLANE,
    worker_hardware: false,
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
      + "SPORE-1.0 last-resort failsafe after live fronts and cold-shelf mutual backup: pause / preserve / wait / physical-wipe-only. Shelves stay intact (not failed). RE-COLD-STORE is an honest hook (no invented destinations). Cite Worker GET /v1/survival. "
      + "Vault-on-transfer is cold multiply. Live sync of bodies is refused. A server pull cannot wipe a cold replica. Poison is hash-absolute refuse. Equivocation isolates. Data outlives creators. "
      + "Re-expand is archive restore (MESH-REEXPAND-1.0): original receipts, each prev-hash, new local node on that tip. Bytes survive, not summaries. Crawlers do not re-expand. Training residue is rumor. "
      + "Reheal of a poisoned live node (MESH-REHEAL-1.0) is self tip + trusted pull or phoenix-WAIT — never neighbor majority. Distinct from re-expand. "
      + "NO-LIE-NO-REWRITE-1.0: the network never lies to stay alive. Hash-absolute beats survival. No rewrite key. Copies span independent shelves, not one Cloudflare tunnel. "
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
      live_nodes: liveNodesCount(cited),
      human_mesh_users: cited.human_mesh_users,
      human_uses: cited.human_uses,
      software_nodes: cited.software_nodes,
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

function finiteCount(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Scalar count only. Arrays (roster) and objects never become a number. Number([]) is 0. */
export function scalarCount(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Nodes = human mesh users + cited human uses.
 * Prefer numeric j.nodes (post-break). Never roster length. Never software_nodes.
 */
export function nodesCount(doc) {
  if (!doc || typeof doc !== "object") return 0;
  const preferred = scalarCount(doc.nodes);
  if (preferred != null) {
    const software = scalarCount(doc.software_nodes);
    const users = scalarCount(doc.human_mesh_users);
    const uses = scalarCount(doc.human_uses);
    if (software != null && preferred === software && software > 0 && users == null && uses == null) {
      return 0;
    }
    return preferred;
  }
  return (scalarCount(doc.human_mesh_users) || 0) + (scalarCount(doc.human_uses) || 0);
}

/**
 * Fleet site-viewer envelope: runtime live_nodes already includes godlock + ae + corpus.
 * A library-presence recount is not that envelope.
 */
export function meshIncludesSiteViewers(doc) {
  if (!doc || typeof doc !== "object") return false;
  const comp = doc.live_nodes_components && typeof doc.live_nodes_components === "object"
    ? doc.live_nodes_components
    : null;
  const flagged = doc.includes_site_viewers === true
    || doc.includes_page_viewers === true
    || doc.live_nodes_includes_viewers === true
    || scalarCount(doc.site_live_viewers) != null
    || !!(comp && scalarCount(comp.site_live_viewers) != null);
  if (flagged) return true;
  if (doc.page_viewers_source === "library-presence") return false;
  if (comp && comp.page_viewers_source === "library-presence") return false;
  return /site-viewer|page-viewer|website-viewer|site-live/.test(String(doc.live_nodes_plane || ""));
}

/**
 * Public Live Nodes chrome. Paints runtime live_nodes only when site viewers are included.
 * Never software_nodes. Never rollup.live (Softwares on a pass-through mesh).
 * human_mesh_users is the presence count when that fleet envelope is absent.
 */
export function publicLiveNodes(doc) {
  if (!doc || typeof doc !== "object") return 0;
  if (softwareCoupledLiveNodes(doc)) return 0;
  const live = scalarCount(doc.live_nodes);
  const software = scalarCount(doc.software_nodes);
  const users = scalarCount(doc.human_mesh_users);
  const softwareLive = software != null && live != null && live === software && software > 0;
  if (meshIncludesSiteViewers(doc) && live != null && !softwareLive) return live;
  if (users != null) return users;
  return 0;
}

/** Same pair the homepage statbar paints. local is ignored — not a fleet count. */
export function chromeDualCounts(doc, local) {
  void local;
  if (!doc || typeof doc !== "object") return { nodes: 0, live: 0 };
  return { nodes: nodesCount(doc), live: publicLiveNodes(doc) };
}

/**
 * Live Nodes for the homepage SSR pair.
 * Fleet live_nodes when the mesh doc includes site viewers.
 * Never a local-only viewer count.
 */
export function livePresenceCount(doc, local) {
  void local;
  return publicLiveNodes(doc);
}

/** Compact Nodes#/LiveNodes# pair. Softwares never enter either side. */
export function dualNodesCounts(doc, local) {
  const pair = chromeDualCounts(doc, local);
  return { nodes: pair.nodes, liveNodes: pair.live };
}

export function dualNodesLabel(doc) {
  const pair = dualNodesCounts(doc);
  return pair.nodes + "/" + pair.liveNodes;
}

/** Short-timeout mesh peek for homepage SSR. Fleet live_nodes only — does not read library viewers. Client clock still refreshes. */
export async function peekMeshDualCounts(env, { timeoutMs = 400 } = {}) {
  const empty = { nodes: 0, liveNodes: 0 };
  const work = (async () => {
    const fake = new Request(HOST + "/v1/mesh", {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": UA },
    });
    const res = await fetchRuntimeMesh(fake, "/v1/mesh", env, null);
    if (!res) return empty;
    let doc = null;
    try {
      doc = await res.json();
    } catch {
      return empty;
    }
    if (!doc || typeof doc !== "object") return empty;
    return dualNodesCounts(doc);
  })();
  const ms = Number(timeoutMs);
  if (!Number.isFinite(ms) || ms <= 0) {
    try {
      return await work;
    } catch {
      return empty;
    }
  }
  return Promise.race([
    work.catch(() => empty),
    new Promise((resolve) => setTimeout(() => resolve(empty), ms)),
  ]);
}

/** Worker SoT after aziel-runtime#151 — live_nodes_plane or human_* fields. */
export function workerHasHumanLiveNodes(doc) {
  if (!doc || typeof doc !== "object") return false;
  const plane = String(doc.live_nodes_plane || "");
  if (plane === LIVE_NODES_PLANE || plane === RUNTIME_LIVE_NODES_PLANE || plane === RUNTIME_SITE_LIVE_PLANE || plane === NODES_PLANE) return true;
  if (plane === PAGE_VIEWERS_PLANE || /page-viewer|website-viewer|site-viewer/.test(plane)) return true;
  if (doc.human_mesh_users != null || doc.human_uses != null) return true;
  if (doc.page_viewers != null || doc.human_page_viewers != null) return true;
  if (doc.live_nodes_components && doc.live_nodes_components.software_nodes_excluded === true) return true;
  return false;
}

/** Stale Worker: live_nodes equals software_nodes and no human plane. Do not display as Live Nodes. */
export function softwareCoupledLiveNodes(doc) {
  if (!doc || typeof doc !== "object") return false;
  if (workerHasHumanLiveNodes(doc)) return false;
  const live = finiteCount(doc.live_nodes);
  const software = finiteCount(doc.software_nodes);
  return live != null && software != null && live === software && software > 0;
}

export function liveNodesCount(doc, local) {
  if (!doc || typeof doc !== "object") {
    const viewers = local && typeof local === "object"
      ? (finiteCount(local.page_viewers != null ? local.page_viewers : local.count) || 0)
      : 0;
    return viewers;
  }
  if (softwareCoupledLiveNodes(doc)) return 0;
  const hasLocal = !!(local && typeof local === "object"
    && (finiteCount(local.page_viewers) != null || finiteCount(local.count) != null));
  if (hasLocal) return mergeLiveNodes(doc, local).live_nodes;
  const live = finiteCount(doc.live_nodes);
  const users = finiteCount(doc.human_mesh_users);
  const uses = finiteCount(doc.human_uses);
  if (live != null) {
    if (String(doc.live_nodes_plane || "") === NODES_PLANE && uses != null && uses > 0 && live === (users || 0) + uses) {
      return users || 0;
    }
    return live;
  }
  if (workerHasHumanLiveNodes(doc)) return mergeLiveNodes(doc, null).live_nodes;
  return 0;
}

export function liveNodesLabel(doc, local) {
  return "Live Nodes · " + liveNodesCount(doc, local);
}

export function nodesLabel(doc) {
  return "Nodes · " + nodesCount(doc);
}

export function liveNodesTitle(doc) {
  if (doc && workerHasHumanLiveNodes(doc) && doc.live_nodes_note) return String(doc.live_nodes_note);
  return LIVE_NODES_NOTE;
}

export function nodesTitle(doc) {
  if (doc && doc.nodes_note) return String(doc.nodes_note);
  return NODES_NOTE;
}

export function humanLiveNodesFields(doc = {}, local) {
  const src = doc && typeof doc === "object" ? doc : {};
  const users = finiteCount(src.human_mesh_users);
  const uses = finiteCount(src.human_uses);
  const merged = mergeLiveNodes(src, local);
  const viewers = finiteCount(merged.page_viewers) || 0;
  const aggregated = runtimeAggregatesPageViewers(src);
  const preferWorkerNotes = workerHasHumanLiveNodes(src) && !/page-viewer|website-viewer/.test(String(src.live_nodes_note || ""));
  const plane = aggregated && src.live_nodes_plane
    ? src.live_nodes_plane
    : (viewers > 0 || local ? LIVE_NODES_PLANE : (src.live_nodes_plane === RUNTIME_LIVE_NODES_PLANE ? RUNTIME_LIVE_NODES_PLANE : LIVE_NODES_PLANE));
  const components = src.live_nodes_components && typeof src.live_nodes_components === "object"
    ? { ...src.live_nodes_components }
    : {
      human_mesh_users: users != null ? users : 0,
      software_nodes_excluded: true,
      instance_nodes_excluded: true,
      invent_users: false,
    };
  if (!aggregated) {
    components.page_viewers = viewers;
    components.human_page_viewers = viewers;
    components.page_viewers_source = "library-presence";
    components.human_uses_excluded = true;
  }
  return {
    live_nodes_plane: plane,
    nodes_plane: src.nodes_plane || NODES_PLANE,
    live_nodes_note: LIVE_NODES_NOTE,
    nodes_note: preferWorkerNotes && src.nodes_note ? src.nodes_note : NODES_NOTE,
    software_nodes_note: preferWorkerNotes && src.software_nodes_note ? src.software_nodes_note : SOFTWARE_NODES_NOTE,
    human_nodes_note: preferWorkerNotes && src.human_nodes_note ? src.human_nodes_note : HUMAN_NODES_NOTE,
    human_uses_note: preferWorkerNotes && src.human_uses_note ? src.human_uses_note : HUMAN_USES_NOTE,
    page_viewers_note: PAGE_VIEWERS_NOTE,
    human_mesh_users: users != null ? users : 0,
    human_uses: uses != null ? uses : 0,
    human_uses_complete: src.human_uses_complete === true,
    human_uses_kv: src.human_uses_kv === true,
    human_uses_source: src.human_uses_source || (src.human_uses_kv === true ? "uses.total" : "unbound"),
    page_viewers: viewers,
    human_page_viewers: viewers,
    page_viewers_source: aggregated ? (src.page_viewers_source || "runtime") : "library-presence",
    page_viewers_spec: PRESENCE_SPEC,
    page_viewers_plane: PAGE_VIEWERS_PLANE,
    live_nodes_components: components,
    nodes_count: nodesCount({ ...src, human_mesh_users: users != null ? users : 0, human_uses: uses != null ? uses : 0 }),
  };
}

export function meshOnDoc(extra = {}) {
  const rest = { ...extra };
  delete rest.enabled;
  delete rest.mesh;
  delete rest.mesh_default;
  delete rest.default;
  let local = rest.page_viewers && typeof rest.page_viewers === "object" && !Array.isArray(rest.page_viewers)
    ? rest.page_viewers
    : (rest.localPresence && typeof rest.localPresence === "object" ? rest.localPresence : null);
  if (!local && finiteCount(rest.page_viewers) != null && rest.page_viewers_source !== "runtime") {
    local = { page_viewers: Number(rest.page_viewers), count: Number(rest.page_viewers), source: "library-presence" };
  }
  if (local) {
    delete rest.page_viewers;
    delete rest.localPresence;
  }
  const roster = Array.isArray(rest.nodes) ? rest.nodes : [];
  const draft = {
    ok: true,
    code: MESH_OK,
    live_nodes: rest.live_nodes != null && Number.isFinite(Number(rest.live_nodes))
      ? Number(rest.live_nodes)
      : 0,
    ...rest,
    nodes: roster.length ? roster : (typeof rest.nodes === "number" ? rest.nodes : roster),
  };
  const live = liveNodesCount(draft, local);
  const human = humanLiveNodesFields({ ...draft, live_nodes: live }, local);
  return {
    ...draft,
    ...human,
    live_nodes: live,
    software_nodes: finiteCount(draft.software_nodes) || 0,
    ok: true,
    code: MESH_OK,
    enabled: true,
    mesh: "on",
    mesh_default: "on",
    default: "on",
    until: "read-only",
    author: AUTHOR,
    identity: AUTHOR,
    host: HOST + "/v1/mesh",
    runtime: HOST + "/runtime/v1/mesh",
    origin: RUNTIME_ORIGIN + "/v1/mesh",
    note: rest.note || MESH_NOTE,
    source: rest.source || LIBRARY_SOURCE,
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
  const local = extra.page_viewers && typeof extra.page_viewers === "object" && !Array.isArray(extra.page_viewers)
    ? extra.page_viewers
    : (extra.localPresence && typeof extra.localPresence === "object" ? extra.localPresence : null);
  const roster = Array.isArray(doc.nodes) ? doc.nodes : [];
  const draft = { ...doc, enabled: true, mesh: "on" };
  const live = liveNodesCount(draft, local);
  const human = humanLiveNodesFields({ ...draft, live_nodes: live }, local);
  const rollup = doc.rollup && typeof doc.rollup === "object"
    ? { ...doc.rollup, mesh: live, nodes: human.nodes_count }
    : doc.rollup;
  return presentSuiteOn({
    ...doc,
    ok: doc.ok !== false,
    ...human,
    live_nodes: live,
    ...(rollup ? { rollup } : {}),
    nodes: roster.length ? roster : (typeof doc.nodes === "number" ? doc.nodes : roster),
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

async function localPresenceExtra(env) {
  try {
    return await readPageViewers(env);
  } catch {
    return { page_viewers: 0, count: 0, complete: false, invent_users: false };
  }
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

  const fleet = !!(doc && meshIncludesSiteViewers(doc));
  const local = statusRead && (method === "GET" || method === "HEAD") && !fleet
    ? await localPresenceExtra(env)
    : null;

  if (looksLikeMeshCode(doc)) {
    const source = originSource(env);
    if (statusRead && (method === "GET" || method === "HEAD") && doc.ok !== false) {
      return respondMaybeHead(request, meshJson(decorateMeshDoc(doc, { source, page_viewers: local })));
    }
    return respondMeshEnvelope(request, citeMeshEnvelope(doc, { source }), res.status || meshRefuseHttpStatus(doc));
  }

  if (statusRead && (method === "GET" || method === "HEAD")) {
    if (res && res.ok && looksLikeMeshDoc(doc)) {
      return respondMaybeHead(request, meshJson(decorateMeshDoc(doc, { source: originSource(env), page_viewers: local })));
    }
    return respondMaybeHead(request, meshJson(meshOnDoc({ source: LIBRARY_SOURCE, page_viewers: local })));
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
  const live = liveNodesLabel(doc);
  const nodes = nodesLabel(doc);
  return `<a class="pill ok" id="aziel-nodes" href="/v1/mesh" title="${esc(nodesTitle(doc))}">${esc(nodes)}</a>`
    + `<a class="pill ok" id="aziel-live-nodes" href="/v1/mesh/status" title="${esc(liveNodesTitle(doc))}">${esc(live)}</a>`;
}

export function meshRefreshScript() {
  return `<script>
(function(){
  function setText(id,label,n,note){
    var el=document.getElementById(id);
    if(!el)return;
    var num=document.getElementById(id+"-n");
    if(num)num.textContent=String(n);
    else el.textContent=label+" \\u00b7 "+n;
    el.className="pill ok";
    if(note)el.title=note;
  }
  function paint(d){
    if(!d)return;
    var src=d.origin&&typeof d.origin==="object"?d.origin:d;
    var users=d.human_mesh_users!=null?d.human_mesh_users:(src&&src.human_mesh_users);
    var uses=d.human_uses!=null?d.human_uses:(src&&src.human_uses);
    var live=d.live_nodes!=null?d.live_nodes:(src&&src.live_nodes);
    var software=d.software_nodes!=null?d.software_nodes:(src&&src.software_nodes);
    var viewers=d.page_viewers!=null?d.page_viewers:(d.human_page_viewers!=null?d.human_page_viewers:(src&&src.page_viewers));
    var nodesN=d.nodes_count!=null?d.nodes_count:(typeof d.nodes==="number"?d.nodes:null);
    if(nodesN==null)nodesN=(Number(users)||0)+(Number(uses)||0);
    var n=0;
    if(live!=null&&!(software!=null&&Number(live)===Number(software)&&Number(software)>0&&users==null&&viewers==null)){
      n=live;
    }else{
      n=(Number(users)||0)+(Number(viewers)||0);
    }
    setText("aziel-nodes","Nodes",nodesN,d.nodes_note||(src&&src.nodes_note));
    setText("aziel-live-nodes","Live Nodes",n,d.live_nodes_note||(src&&src.live_nodes_note));
  }
  function beat(){
    if(document.visibilityState&&document.visibilityState==="hidden")return;
    fetch("/v1/presence",{method:"POST",credentials:"same-origin",headers:{"Accept":"application/json","Content-Type":"application/json"},body:"{}",keepalive:true}).catch(function(){});
  }
  function leave(){
    if(navigator.sendBeacon){navigator.sendBeacon("/v1/presence",new Blob([JSON.stringify({op:"leave"})],{type:"application/json"}));return;}
    fetch("/v1/presence",{method:"POST",credentials:"same-origin",headers:{"Accept":"application/json","Content-Type":"application/json"},body:JSON.stringify({op:"leave"}),keepalive:true}).catch(function(){});
  }
  function run(){
    beat();
    fetch("/v1/mesh/status",{headers:{"Accept":"application/json","User-Agent":"Mozilla/5.0"}}).then(function(r){return r.json();}).then(paint).catch(function(){});
  }
  document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")run();});
  window.addEventListener("pagehide",leave);
  if("requestIdleCallback" in window)requestIdleCallback(run,{timeout:2500});
  else setTimeout(run,1);
  setInterval(function(){if(!document.visibilityState||document.visibilityState==="visible")run();},60000);
})();
</script>`;
}

/** Homepage statbar clock: same tick updates Views, Downloads, and Nodes#/LiveNodes#. */
export function statbarClockScript() {
  return `<script>
(function(){
  function scalar(v){
    if(typeof v==="number")return isFinite(v)?v:null;
    if(typeof v==="string"&&v.trim()!==""){var n=Number(v);return isFinite(n)?n:null;}
    return null;
  }
  function includesSite(j){
    if(!j||typeof j!=="object")return false;
    var comp=j.live_nodes_components&&typeof j.live_nodes_components==="object"?j.live_nodes_components:null;
    var flagged=j.includes_site_viewers===true||j.includes_page_viewers===true||j.live_nodes_includes_viewers===true||(j.site_live_viewers!=null&&isFinite(Number(j.site_live_viewers)))||(comp&&comp.site_live_viewers!=null&&isFinite(Number(comp.site_live_viewers)));
    if(flagged)return true;
    if(j.page_viewers_source==="library-presence")return false;
    if(comp&&comp.page_viewers_source==="library-presence")return false;
    return /site-viewer|page-viewer|website-viewer|site-live/.test(String(j.live_nodes_plane||""));
  }
  function dual(j){
    if(!j||typeof j!=="object")return {nodes:0,live:0};
    var nodesPref=scalar(j.nodes);
    var users=scalar(j.human_mesh_users);
    var uses=scalar(j.human_uses);
    var live=scalar(j.live_nodes);
    var software=scalar(j.software_nodes);
    var nodes;
    if(nodesPref!=null){
      if(software!=null&&nodesPref===software&&software>0&&users==null&&uses==null)nodes=0;
      else nodes=nodesPref;
    }else{
      nodes=(users||0)+(uses||0);
    }
    var softwareLive=software!=null&&live!=null&&live===software&&software>0;
    var presence;
    if(includesSite(j)&&live!=null&&!softwareLive)presence=live;
    else if(users!=null)presence=users;
    else presence=0;
    return {nodes:nodes,live:presence};
  }
  function fmt(n){var x=Number(n);return isFinite(x)?x.toLocaleString("en-US"):String(n);}
  function set(id,n){var el=document.getElementById(id);if(el)el.textContent=fmt(n);}
  function meshDoc(){
    var hdr={"Accept":"application/json","User-Agent":"Mozilla/5.0"};
    return fetch("/v1/mesh",{headers:hdr}).then(function(r){
      if(!r||!r.ok)throw new Error("mesh");
      return r.json();
    }).catch(function(){
      return fetch("/runtime/v1/mesh",{headers:hdr}).then(function(r){return r.json();});
    });
  }
  function beat(){
    if(document.visibilityState&&document.visibilityState==="hidden")return;
    fetch("/v1/presence",{method:"POST",credentials:"same-origin",headers:{"Accept":"application/json","Content-Type":"application/json"},body:"{}",keepalive:true}).catch(function(){});
  }
  function paintMesh(){
    return meshDoc().then(function(mesh){
      var d=dual(mesh);
      set("nodes",d.nodes);
      set("livenodes",d.live);
    });
  }
  function run(){
    if(!document.getElementById("views")&&!document.getElementById("nodes"))return;
    beat();
    paintMesh().catch(function(){setTimeout(function(){paintMesh().catch(function(){});},1200);});
    fetch("/v1/stats",{headers:{"Accept":"application/json","User-Agent":"Mozilla/5.0"}}).then(function(r){return r.json();}).then(function(s){
      if(!s)return;
      if(s.views!=null)set("views",s.views);
      if(s.downloads!=null||s.total!=null)set("downloads",s.downloads!=null?s.downloads:s.total);
    }).catch(function(){});
  }
  document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")run();});
  run();
  setInterval(function(){if(!document.visibilityState||document.visibilityState==="visible")run();},60000);
})();
</script>`;
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
