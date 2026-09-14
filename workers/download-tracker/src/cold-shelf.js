/**
 * COLD-MULTI-SHELF-1.0 — executable cold copies on independent shelves.
 * Author: Aziel Eliab only. No visible 15:20 identity-lock chrome.
 * Cites AZLOCK-INGEST-REEXPAND-1.0; does not replace that tip.
 * AZ Generator / MirageGrid Cap-7 is not this repo. No live ICANN publish.
 */
import {
  AUTHOR,
  CITE_RULE,
  CROSS_NETWORK_SURVIVAL,
  CROSS_NETWORK_SURVIVAL_RULE,
  INGEST_SPEC,
  LOCKSET,
  LOCKSET_ID,
  LOCKSET_TIP,
  NO_LIE_NO_REWRITE,
  NO_LIE_NO_REWRITE_RULE,
  PUBLISHED_TIP,
  REEXPAND_SPEC,
  SURVIVE_RULE,
  ingestReceiptCite,
  locksetDoc,
  locksetFile,
  matchPublishedTip,
  normalizeTipHash,
  survivalCiteFields,
} from "./ingest-receipt.js";
import { sha256hex } from "./ledger.js";
import { judgeRehealPoisonedNode } from "./mesh.js";

export { AUTHOR, LOCKSET_ID, LOCKSET_TIP, PUBLISHED_TIP } from "./ingest-receipt.js";

export const COLD_MULTI_SHELF_SPEC = "COLD-MULTI-SHELF-1.0";
export const COLD_MULTI_SHELF_RULE =
  "≥3 independent shelves; survival = bytes↔hash; crawlers are extra shelves not re-expand; training residue is rumor; never claim live unless verify passes.";

const HOST = "https://www.azielcorpuslibrary.net";

export const SHELF_KINDS = Object.freeze([
  "zenodo_doi",
  "git_mirror",
  "ipfs_cid",
  "archive_org",
  "usb_airgap",
  "other",
]);

export const SHELF_STATUSES = Object.freeze(["live", "slot", "refused"]);

export const REFUSE = Object.freeze({
  NO_CID: "CNS-NO-CID",
  NO_WARC: "CNS-NO-WARC",
  OPERATOR_ATTEST: "CNS-OPERATOR-ATTEST",
  INVENTED_PHY: "CNS-INVENTED-PHY",
  INVENTED_DNS: "CNS-INVENTED-DNS",
  INVENTED_ICANN: "CNS-INVENTED-ICANN",
  AZ_GEN: "CNS-AZ-GEN-NOT-THIS-REPO",
  CAP7: "CNS-CAP7-NOT-CORPUS",
  NEIGHBOR_VOTE: "CNS-NEVER-NEIGHBOR-VOTE",
  TRAINING_RUMOR: "CNS-TRAINING-RESIDUE-RUMOR",
  SHELF_NOT_LIVE: "CNS-SHELF-NOT-LIVE",
  FAKE_DEPOSIT: "CNS-NO-FAN-FAKE-DEPOSIT",
  UNKNOWN_KIND: "CNS-UNKNOWN-KIND",
});

/** Identity / core law docs hashed by the CLI export. Paths are repo-root relative. */
export const CORE_DOC_PATHS = Object.freeze([
  "docs/CROSS-NETWORK-SURVIVAL-1.0.md",
  "docs/NO-LIE-NO-REWRITE-1.0.md",
  "docs/COLD-MULTI-SHELF-1.0.md",
  "docs/MESH-COLD-COPY-1.0.md",
  "docs/INGEST-AS-RECEIPT-1.0.md",
  "docs/RE-EXPAND-FROM-ARCHIVE-1.0.md",
  "docs/MESH-REEXPAND-1.0.md",
  "docs/MESH-REHEAL-1.0.md",
  "docs/MESH-SPLIT-WIRES-1.0.md",
  "docs/ACT-RECEIPT-1.0.md",
  "docs/lockset.json",
]);

/**
 * Honest registry. Paper DOIs are in-repo cites + doi.org 302 (2026-09-14).
 * They are not a lockset DOI. IPFS / archive.org / USB stay slots until real bytes exist.
 */
export const SHELF_REGISTRY = Object.freeze([
  Object.freeze({
    id: "git-aziel-corpus",
    kind: "git_mirror",
    status: "live",
    url: "https://github.com/AzielEliab/aziel-corpus",
    blast_radius: "github-org-AzielEliab",
    independent: true,
    lockset_shelf: true,
    tags: Object.freeze([
      Object.freeze({ name: "v2.6.2", commit: "8ba6d9331da4854858e8e4c94319d402c36508e5" }),
      Object.freeze({ name: "v0.1.0", commit: "176172847f828ec4f20bfbb388c1edfcace64b8b" }),
    ]),
    verify: "git tag objects exist on origin; SHA of named commits published",
    note: "One GitHub org is one blast radius. A second forge would be a second git shelf.",
  }),
  Object.freeze({
    id: "zenodo-shadowlock",
    kind: "zenodo_doi",
    status: "live",
    doi: "10.5281/zenodo.21435707",
    url: "https://doi.org/10.5281/zenodo.21435707",
    record: "https://zenodo.org/records/21435707",
    payload: "ShadowLock paper (not lockset)",
    in_repo_cite: "dossiers/shadowlock-aziel-dossier-1.0.md",
    blast_radius: "zenodo-cern",
    independent: true,
    lockset_doi: false,
    verify: "doi.org 302 → zenodo.org/doi/10.5281/zenodo.21435707",
  }),
  Object.freeze({
    id: "zenodo-decisiongate",
    kind: "zenodo_doi",
    status: "live",
    doi: "10.5281/zenodo.21435730",
    url: "https://doi.org/10.5281/zenodo.21435730",
    record: "https://zenodo.org/records/21435730",
    payload: "DecisionGATE paper (not lockset)",
    in_repo_cite: "dossiers/decisiongate-aziel-dossier-1.0.md",
    blast_radius: "zenodo-cern",
    independent: true,
    lockset_doi: false,
    verify: "doi.org 302 → zenodo.org/doi/10.5281/zenodo.21435730",
  }),
  Object.freeze({
    id: "zenodo-trajectorylock",
    kind: "zenodo_doi",
    status: "live",
    doi: "10.5281/zenodo.22258015",
    url: "https://doi.org/10.5281/zenodo.22258015",
    record: "https://zenodo.org/records/22258015",
    payload: "TrajectoryLock TL-WP-0.1 (not lockset)",
    in_repo_cite: "dossiers/trajectorylock-aziel-dossier-1.0.md",
    blast_radius: "zenodo-cern",
    independent: true,
    lockset_doi: false,
    verify: "doi.org 302 → zenodo.org/doi/10.5281/zenodo.22258015",
  }),
  Object.freeze({
    id: "zenodo-whistlelock-foldlock",
    kind: "zenodo_doi",
    status: "live",
    doi: "10.5281/zenodo.22257762",
    url: "https://doi.org/10.5281/zenodo.22257762",
    record: "https://zenodo.org/records/22257762",
    payload: "WhistleLock WL-WP-0.1 / FoldLock FL-WP-0.3 (same in-repo DOI; not lockset)",
    in_repo_cite: Object.freeze([
      "dossiers/whistlelock-aziel-dossier-1.0.md",
      "dossiers/foldlock-aziel-dossier-1.0.md",
    ]),
    blast_radius: "zenodo-cern",
    independent: true,
    lockset_doi: false,
    verify: "doi.org 302 → zenodo.org/doi/10.5281/zenodo.22257762",
  }),
  Object.freeze({
    id: "zenodo-employeelock",
    kind: "zenodo_doi",
    status: "live",
    doi: "10.5281/zenodo.22257493",
    url: "https://doi.org/10.5281/zenodo.22257493",
    record: "https://zenodo.org/records/22257493",
    payload: "EmployeeLock EL-WP-0.1 (not lockset)",
    in_repo_cite: "dossiers/employeelock-aziel-dossier-1.0.md",
    blast_radius: "zenodo-cern",
    independent: true,
    lockset_doi: false,
    verify: "doi.org 302 → zenodo.org/doi/10.5281/zenodo.22257493",
  }),
  Object.freeze({
    id: "ipfs-lockset",
    kind: "ipfs_cid",
    status: "slot",
    cid: null,
    url: null,
    independent: true,
    lockset_shelf: true,
    refuse: REFUSE.NO_CID,
    reason: "No published CID. Do not invent one. Slot until a real CID of already-published bytes exists.",
  }),
  Object.freeze({
    id: "archive-org-lockset",
    kind: "archive_org",
    status: "slot",
    url: null,
    item: null,
    independent: true,
    lockset_shelf: true,
    refuse: REFUSE.NO_WARC,
    reason: "No published archive.org item. Do not invent a capture URL. Slot until a real item exists.",
  }),
  Object.freeze({
    id: "usb-airgap-operator",
    kind: "usb_airgap",
    status: "slot",
    independent: true,
    lockset_shelf: true,
    refuse: REFUSE.OPERATOR_ATTEST,
    reason: "Operator airgap replica is not attested on this public surface. Slot until bytes exist off-network and hash.",
  }),
  Object.freeze({
    id: "cf-azielcorpuslibrary",
    kind: "other",
    status: "live",
    url: HOST + "/lockset.json",
    blast_radius: "cloudflare",
    independent: false,
    lockset_shelf: true,
    verify: "serves lockset.json whose core SHA-256 is the published tip",
    note: "Cloudflare Worker host. Live for the tip. Does not count toward independent-3.",
  }),
]);

export const MIN_INDEPENDENT_SHELVES = 3;

export function isShelfKind(kind) {
  return SHELF_KINDS.includes(String(kind || ""));
}

export function isShelfStatus(status) {
  return SHELF_STATUSES.includes(String(status || ""));
}

export function liveShelves(rows = SHELF_REGISTRY) {
  return rows.filter((s) => s && s.status === "live");
}

export function slotShelves(rows = SHELF_REGISTRY) {
  return rows.filter((s) => s && s.status === "slot");
}

export function independentLiveShelves(rows = SHELF_REGISTRY) {
  return rows.filter((s) => s && s.status === "live" && s.independent === true);
}

export function independentLiveBlastRadii(rows = SHELF_REGISTRY) {
  const set = new Set();
  for (const s of independentLiveShelves(rows)) {
    if (s.blast_radius) set.add(s.blast_radius);
  }
  return [...set];
}

export function independentRequirementMet(rows = SHELF_REGISTRY) {
  return independentLiveBlastRadii(rows).length >= MIN_INDEPENDENT_SHELVES;
}

export function claimShelfLive(shelf) {
  if (!shelf || typeof shelf !== "object") {
    return { live: false, action: "refuse", reason: REFUSE.SHELF_NOT_LIVE };
  }
  if (shelf.status !== "live") {
    return {
      live: false,
      action: "refuse",
      reason: shelf.refuse || REFUSE.SHELF_NOT_LIVE,
      status: shelf.status,
    };
  }
  return { live: true, action: "ok", id: shelf.id, kind: shelf.kind };
}

export function judgeInventedPhyDnsIcann(input) {
  const src = input && typeof input === "object" ? input : {};
  if (src.invent_phy === true || src.phy === true || src.invented_phy === true) {
    return { accept: false, action: "refuse", reason: REFUSE.INVENTED_PHY };
  }
  if (src.invent_dns === true || src.invented_dns === true || src.mesh_dns_factory === true) {
    return { accept: false, action: "refuse", reason: REFUSE.INVENTED_DNS };
  }
  if (src.invent_icann === true || src.invented_icann === true || src.claim_live_icann === true) {
    return { accept: false, action: "refuse", reason: REFUSE.INVENTED_ICANN };
  }
  return { accept: true, action: "ok" };
}

export function judgeAzGenOverclaim(input) {
  const src = input && typeof input === "object" ? input : {};
  const over =
    src.az_gen_live === true
    || src.az_generator_live === true
    || src.live_icann_publish === true
    || src.cap7_publish === true
    || src.miragegrid_live_publish === true
    || src.this_repo_is_az_gen === true;
  if (over) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.AZ_GEN,
      cap7: REFUSE.CAP7,
      note: "AZ Generator is MirageGrid Cap-7 mesh DNS factory — not this repo. No live ICANN publish claimed.",
    };
  }
  return {
    accept: true,
    action: "ok",
    this_repo_is_az_gen: false,
    live_icann_publish: false,
  };
}

export function judgeNeighborVoteHeal(input) {
  const src = input && typeof input === "object" ? input : {};
  if (src.neighbor_vote === true || src.neighbor_majority === true || src.quorum_heal === true) {
    const mesh = judgeRehealPoisonedNode({
      neighbor_majority: src.neighbor_majority === true || src.neighbor_vote === true,
      quorum_heal: src.quorum_heal === true,
    });
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NEIGHBOR_VOTE,
      heal: false,
      mesh_reason: mesh.reason,
    };
  }
  return judgeRehealPoisonedNode(src);
}

export function judgeTrainingResidueShelf(input) {
  const src = input && typeof input === "object" ? input : {};
  if (src.training_residue === true || src.weights === true || src.ai_ingested === true) {
    return {
      live: false,
      action: "refuse",
      reason: REFUSE.TRAINING_RUMOR,
      rumor: true,
    };
  }
  return { live: false, action: "ok", rumor: false };
}

export function judgeInventedDeposit(input) {
  const src = input && typeof input === "object" ? input : {};
  const kind = String(src.kind || "");
  if (kind && !isShelfKind(kind)) {
    return { accept: false, action: "refuse", reason: REFUSE.UNKNOWN_KIND };
  }
  if (kind === "ipfs_cid") {
    const cid = src.cid == null ? "" : String(src.cid).trim();
    if (cid) {
      return { accept: false, action: "refuse", reason: REFUSE.NO_CID, note: "No published CID on this registry. Do not invent." };
    }
    return { accept: true, action: "slot", reason: REFUSE.NO_CID, status: "slot" };
  }
  if (kind === "archive_org") {
    const item = String(src.item || src.url || "").trim();
    if (item) {
      return { accept: false, action: "refuse", reason: REFUSE.NO_WARC, note: "No published archive.org item. Do not invent." };
    }
    return { accept: true, action: "slot", reason: REFUSE.NO_WARC, status: "slot" };
  }
  if (kind === "zenodo_doi") {
    const doi = String(src.doi || "").trim();
    const known = SHELF_REGISTRY.some((s) => s.kind === "zenodo_doi" && s.doi === doi);
    if (doi && !known) {
      return { accept: false, action: "refuse", reason: REFUSE.FAKE_DEPOSIT, note: "DOI not in the honest registry. Do not invent a deposit." };
    }
  }
  return { accept: true, action: "ok" };
}

export function verifyPasteHash(pasted, extras = []) {
  return matchPublishedTip(pasted, extras);
}

export function verifyBytesHash(bytes, extras = []) {
  const got = sha256hex(bytes);
  return { ...matchPublishedTip(got, extras), file_sha256: got };
}

export function verifyManifestEntry(relPath, gotHash, manifest) {
  const files = manifest && manifest.files && typeof manifest.files === "object" ? manifest.files : {};
  const want = normalizeTipHash(files[relPath]);
  const got = normalizeTipHash(gotHash);
  if (!got) {
    return { ok: false, yes: false, path: relPath, error: "need 64-hex SHA-256" };
  }
  if (!want) {
    return { ok: true, yes: false, path: relPath, error: "not-in-manifest", pasted: got };
  }
  return { ok: true, yes: want === got, path: relPath, published: want, pasted: got };
}

export function hashManifestFromMap(fileHashes) {
  const files = {};
  const keys = Object.keys(fileHashes || {}).sort();
  for (const k of keys) {
    const h = normalizeTipHash(fileHashes[k]);
    if (h) files[k] = h;
  }
  return {
    spec: COLD_MULTI_SHELF_SPEC,
    algo: "sha-256",
    lockset_id: LOCKSET_ID,
    lockset_tip: LOCKSET_TIP,
    files,
  };
}

export function exportPack({ fileHashes = {}, host = HOST } = {}) {
  const manifest = hashManifestFromMap(fileHashes);
  return {
    spec: COLD_MULTI_SHELF_SPEC,
    author: AUTHOR,
    identity: AUTHOR,
    lockset_id: LOCKSET_ID,
    lockset_tip: LOCKSET_TIP,
    published_tip: PUBLISHED_TIP,
    lockset_core: LOCKSET,
    lockset: locksetDoc(),
    lockset_file: locksetFile(),
    ingest_as_receipt: ingestReceiptCite(host),
    manifest,
    registry: shelfRegistryDoc(host),
    ...survivalCiteFields(),
    cold_multi_shelf: COLD_MULTI_SHELF_SPEC,
    cold_multi_shelf_rule: COLD_MULTI_SHELF_RULE,
  };
}

export function verifyHowTo(host = HOST) {
  const h = String(host || HOST).replace(/\/+$/, "");
  return {
    paste_hash: h + "/receipts/verify?hash=",
    machine: h + "/v1/receipts/verify?hash=",
    lockset: h + "/lockset.json",
    shelves: h + "/shelves",
    cli: "node tools/cold_shelf/cli.mjs verify --hash <64-hex> | --file <path>",
    rule: "yes/no against the published lockset tip " + LOCKSET_TIP + ". Cheap mismatch. " + CITE_RULE + ". " + SURVIVE_RULE + ".",
    reexpand: "original receipts + prev-hash; not index→mesh (" + REEXPAND_SPEC + ")",
    reheal: "self tip + trusted pull or phoenix-WAIT; never neighbor vote",
    crawlers: "extra shelves, not re-expand",
    training_residue: "rumor",
  };
}

export function shelfRegistryDoc(host = HOST) {
  const h = String(host || HOST).replace(/\/+$/, "");
  const radii = independentLiveBlastRadii();
  return {
    spec: COLD_MULTI_SHELF_SPEC,
    author: AUTHOR,
    identity: AUTHOR,
    umbrella: "CROSS-NETWORK-SURVIVAL-1.0",
    no_lie_spec: "NO-LIE-NO-REWRITE-1.0",
    lockset_id: LOCKSET_ID,
    lockset_tip: LOCKSET_TIP,
    lockset_zenodo: LOCKSET.zenodo,
    lockset_doi: LOCKSET.doi,
    min_independent_shelves: MIN_INDEPENDENT_SHELVES,
    independent_live_blast_radii: radii,
    independent_live_count: radii.length,
    independent_requirement_met: radii.length >= MIN_INDEPENDENT_SHELVES,
    survival: "bytes↔hash",
    crawlers: "extra-shelf-not-reexpand",
    training_residue: "rumor",
    kinds: SHELF_KINDS.slice(),
    statuses: SHELF_STATUSES.slice(),
    live: liveShelves().map((s) => s.id),
    slot: slotShelves().map((s) => s.id),
    shelves: SHELF_REGISTRY.map((s) => ({ ...s })),
    verify: verifyHowTo(h),
    growth_on: true,
    softwares_tab: false,
    mesh_radio: false,
    az_gen_live_icann_publish: false,
    note:
      "CROSS-NETWORK-SURVIVAL: " + CROSS_NETWORK_SURVIVAL_RULE + " "
      + "NO-LIE / NO-REWRITE: " + NO_LIE_NO_REWRITE_RULE + " "
      + COLD_MULTI_SHELF_RULE
      + " Paper DOIs are not a lockset DOI. IPFS/archive/USB stay slots until real bytes exist.",
  };
}

export function shelvesDoc(host = HOST) {
  const h = String(host || HOST).replace(/\/+$/, "");
  return {
    spec: COLD_MULTI_SHELF_SPEC,
    rule: COLD_MULTI_SHELF_RULE,
    author: AUTHOR,
    identity: AUTHOR,
    ingest_as_receipt: INGEST_SPEC,
    ...survivalCiteFields(),
    cold_multi_shelf: COLD_MULTI_SHELF_SPEC,
    lockset_id: LOCKSET_ID,
    lockset_tip: LOCKSET_TIP,
    cite: h + "/cite.json",
    llms: h + "/llms.txt",
    ai: h + "/ai.txt",
    lockset: h + "/lockset.json",
    registry: shelfRegistryDoc(h),
    verify: verifyHowTo(h),
  };
}

export function shelvesCiteFields(host = HOST) {
  const h = String(host || HOST).replace(/\/+$/, "");
  return {
    cold_multi_shelf: COLD_MULTI_SHELF_SPEC,
    cold_multi_shelf_rule: COLD_MULTI_SHELF_RULE,
    shelves: h + "/shelves",
    cold_copy: h + "/cold-copy",
    shelves_json: h + "/v1/shelves",
  };
}

export function isShelvesPath(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  return path === "/shelves" || path === "/cold-copy" || path === "/v1/shelves" || path === "/v1/cold-copy";
}

export function shelvesLlmsBlock(host = HOST) {
  const h = String(host || HOST).replace(/\/+$/, "");
  return "## Cold multi-shelf (CROSS-NETWORK-SURVIVAL executable)\n\n"
    + "- Spec: " + COLD_MULTI_SHELF_SPEC + "\n"
    + "- " + COLD_MULTI_SHELF_RULE + "\n"
    + "- " + CROSS_NETWORK_SURVIVAL + ": " + CROSS_NETWORK_SURVIVAL_RULE + "\n"
    + "- " + NO_LIE_NO_REWRITE + ": " + NO_LIE_NO_REWRITE_RULE + "\n"
    + "- Registry (honest live|slot|refused): " + h + "/shelves\n"
    + "- Alias: " + h + "/cold-copy · " + h + "/v1/shelves\n"
    + "- Verify (paste hash, yes/no): " + h + "/receipts/verify\n"
    + "- CLI: node tools/cold_shelf/cli.mjs export | verify --hash <64-hex>\n"
    + "- Do not invent IPFS CIDs, archive.org items, or lockset DOIs.\n"
    + "- AZ Generator / Cap-7 / live ICANN publish is not this repo.\n"
    + "- Crawlers are extra shelves. They do not re-expand. Training residue is rumor.\n";
}
