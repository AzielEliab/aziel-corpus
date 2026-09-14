/**
 * COLD-MULTI-SHELF-1.0 — executable cold copies on independent shelves.
 * Author: Aziel Eliab only. No visible 15:20 identity-lock chrome.
 * Cites AZLOCK-INGEST-REEXPAND-1.0; does not replace that tip.
 * AZ Generator / MirageGrid Cap-7 is not this repo. No live ICANN publish.
 */
import {
  AUTHOR,
  CITE_RULE,
  COLD_MULTI_SHELF_RULE,
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

export { AUTHOR, COLD_MULTI_SHELF_RULE, LOCKSET_ID, LOCKSET_TIP, PUBLISHED_TIP } from "./ingest-receipt.js";

export const COLD_MULTI_SHELF_SPEC = "COLD-MULTI-SHELF-1.0";

const HOST = "https://www.azielcorpuslibrary.net";

export const PLANES = Object.freeze(["A", "B", "C"]);

export const PLANE_A_MIRRORS = Object.freeze([
  Object.freeze({
    id: "azieleliab-com",
    origin: "https://www.azieleliab.com",
    lockset: "https://www.azieleliab.com/lockset.json",
    receipts: "https://www.azieleliab.com/receipts",
    shelves: "https://www.azieleliab.com/shelves",
    verified_in_this_repo: false,
  }),
  Object.freeze({
    id: "azielcorpuslibrary-net",
    origin: HOST,
    lockset: HOST + "/lockset.json",
    receipts: HOST + "/receipts",
    shelves: HOST + "/shelves",
    verified_in_this_repo: true,
  }),
  Object.freeze({
    id: "godlock-uk",
    origin: "https://godlock.uk",
    lockset: "https://godlock.uk/lockset.json",
    receipts: "https://godlock.uk/receipts",
    shelves: "https://godlock.uk/shelves",
    verified_in_this_repo: false,
  }),
  Object.freeze({
    id: "hedidntjump-com",
    origin: "https://www.hedidntjump.com",
    lockset: "https://www.hedidntjump.com/lockset.json",
    receipts: "https://www.hedidntjump.com/receipts",
    shelves: "https://www.hedidntjump.com/shelves",
    verified_in_this_repo: false,
  }),
]);

/** Paper DOIs cited in-repo. Not Plane B unless hash-verify proves they carry the tip. */
export const PAPER_DEPOSITS = Object.freeze([
  Object.freeze({
    doi: "10.5281/zenodo.21435707",
    payload: "ShadowLock paper",
    in_repo_cite: "dossiers/shadowlock-aziel-dossier-1.0.md",
    tip_verified: false,
    reuse_as_plane_b: false,
  }),
  Object.freeze({
    doi: "10.5281/zenodo.21435730",
    payload: "DecisionGATE paper",
    in_repo_cite: "dossiers/decisiongate-aziel-dossier-1.0.md",
    tip_verified: false,
    reuse_as_plane_b: false,
  }),
  Object.freeze({
    doi: "10.5281/zenodo.22258015",
    payload: "TrajectoryLock TL-WP-0.1",
    in_repo_cite: "dossiers/trajectorylock-aziel-dossier-1.0.md",
    tip_verified: false,
    reuse_as_plane_b: false,
  }),
  Object.freeze({
    doi: "10.5281/zenodo.22257762",
    payload: "WhistleLock WL-WP-0.1 / FoldLock FL-WP-0.3",
    in_repo_cite: Object.freeze([
      "dossiers/whistlelock-aziel-dossier-1.0.md",
      "dossiers/foldlock-aziel-dossier-1.0.md",
    ]),
    tip_verified: false,
    reuse_as_plane_b: false,
  }),
  Object.freeze({
    doi: "10.5281/zenodo.22257493",
    payload: "EmployeeLock EL-WP-0.1",
    in_repo_cite: "dossiers/employeelock-aziel-dossier-1.0.md",
    tip_verified: false,
    reuse_as_plane_b: false,
  }),
]);

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
  NO_TIP_DOI: "CNS-NO-TIP-DOI",
  TIP_NOT_ON_DEPOSIT: "CNS-TIP-NOT-ON-DEPOSIT",
  ZENODO_IP_BAN: "CNS-ZENODO-IP-BAN",
  NO_FORGE: "CNS-NO-FORGE-MIRROR",
  PLANE_A_ONE_TUNNEL: "CNS-PLANE-A-ONE-TUNNEL",
  SURFACES_NOT_INDEPENDENT: "CNS-SURFACES-NOT-INDEPENDENT",
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
  "tools/cold_shelf/ZENODO-TIP-PACK-CHECKLIST.md",
  "tools/cold_shelf/ALT-FORGE-TIP-PACK-CHECKLIST.md",
  "tools/cold_shelf/USB-AIRGAP-ATTEST.md",
]);

/** 4 CF hubs + GitHub. Published surfaces, not independent shelves. */
export const PUBLISHED_SURFACE_IDS = Object.freeze([
  "azieleliab-com",
  "azielcorpuslibrary-net",
  "godlock-uk",
  "hedidntjump-com",
  "github-aziel-corpus",
]);

/** CF + GitHub are two radii in one family. Not two independent live shelves. */
export const FAMILY_BLAST_RADII = Object.freeze(["cloudflare", "github"]);

export const PLANE_B_WORKING_TARGETS = Object.freeze(["codeberg", "archive.org", "gitflic-ru"]);

export const USB_ATTEST_PATH =
  "USB offline-verify before LIVE: copy the airgap pack off-network, run verify-airgap.sh / sha256sum -c SHA256SUMS against the published tip, then operator attest (CNS-OPERATOR-ATTEST).";

/**
 * Honest registry. Planes A/B/C (NO-FAN).
 * Plane A = one CF/GitHub tunnel, four host mirrors + git = 5 published surfaces / 2 family radii. Not five shelves.
 * Plane B = alternate independent forge/archive tip-pack SLOT (Codeberg / archive.org / GitFlic RU). Zenodo is refused (CNS-ZENODO-IP-BAN). doi null.
 * Plane C = USB airgap pack + optional second-forge SLOT.
 */
export const SHELF_REGISTRY = Object.freeze([
  Object.freeze({
    id: "plane-a-cf-github",
    plane: "A",
    kind: "other",
    status: "live",
    blast_radius: "cf-github",
    independent: true,
    lockset_shelf: true,
    mirrors: PLANE_A_MIRRORS,
    git: "https://github.com/AzielEliab/aziel-corpus",
    tags: Object.freeze([
      Object.freeze({ name: "v2.6.2", commit: "8ba6d9331da4854858e8e4c94319d402c36508e5" }),
      Object.freeze({ name: "v0.1.0", commit: "176172847f828ec4f20bfbb388c1edfcace64b8b" }),
    ]),
    verify: "in-repo Worker serves lockset.json whose core SHA-256 is the published tip; four hosts are mirrors of that tip, not four shelves",
    note: "LIVE multi-host, same tunnel. Count as one CF/GitHub plane.",
  }),
  Object.freeze({
    id: "plane-a-git-aziel-corpus",
    plane: "A",
    kind: "git_mirror",
    status: "live",
    url: "https://github.com/AzielEliab/aziel-corpus",
    blast_radius: "cf-github",
    independent: false,
    lockset_shelf: true,
    tags: Object.freeze([
      Object.freeze({ name: "v2.6.2", commit: "8ba6d9331da4854858e8e4c94319d402c36508e5" }),
      Object.freeze({ name: "v0.1.0", commit: "176172847f828ec4f20bfbb388c1edfcace64b8b" }),
    ]),
    verify: "git tag objects exist on origin",
    note: "Same Plane A blast radius as the four CF hosts. Not a second independent shelf.",
  }),
  ...PLANE_A_MIRRORS.map((m) => Object.freeze({
    id: "plane-a-host-" + m.id,
    plane: "A",
    kind: "other",
    status: "live",
    origin: m.origin,
    lockset: m.lockset,
    receipts: m.receipts,
    shelves: m.shelves,
    blast_radius: "cf-github",
    independent: false,
    lockset_shelf: true,
    verified_in_this_repo: m.verified_in_this_repo,
    verify: m.verified_in_this_repo
      ? "Worker origin serves published lockset tip"
      : "Named Plane A mirror of the same tip; sister /shelves may still be operator-published",
    note: "One of four Plane A host mirrors. Not an independent shelf.",
  })),
  Object.freeze({
    id: "plane-b-alt-forge-archive",
    plane: "B",
    kind: "other",
    status: "slot",
    doi: null,
    url: null,
    blast_radius: "alt-forge-archive",
    independent: true,
    lockset_shelf: true,
    lockset_doi: false,
    working_targets: PLANE_B_WORKING_TARGETS,
    refuse: REFUSE.NO_FORGE,
    checklist: "tools/cold_shelf/ALT-FORGE-TIP-PACK-CHECKLIST.md",
    reason: "Plane B working shelf is an alternate independent forge/archive tip-pack (Codeberg / archive.org / GitFlic RU). SLOT until a real upload hash-verifies. Do not invent a URL. cite.json / lockset doi stay null.",
    note: "Not Zenodo. Zenodo is not the Plane B working path (CNS-ZENODO-IP-BAN).",
  }),
  Object.freeze({
    id: "plane-b-codeberg-tip-pack",
    plane: "B",
    kind: "git_mirror",
    status: "slot",
    forge: "codeberg",
    url: null,
    blast_radius: "codeberg",
    independent: true,
    lockset_shelf: true,
    refuse: REFUSE.NO_FORGE,
    reason: "Codeberg tip-pack is a Plane B LIVE-promotion target. No verified URL in-repo. SLOT. Do not invent a URL. LIVE only after tip hash-verify.",
  }),
  Object.freeze({
    id: "plane-b-archive-org-tip-pack",
    plane: "B",
    kind: "archive_org",
    status: "slot",
    url: null,
    item: null,
    blast_radius: "archive-org",
    independent: true,
    lockset_shelf: true,
    refuse: REFUSE.NO_WARC,
    reason: "archive.org tip-pack is a Plane B LIVE-promotion target. No published item in-repo. SLOT. Do not invent a URL. LIVE only after tip hash-verify.",
  }),
  Object.freeze({
    id: "plane-b-gitflic-ru-tip-pack",
    plane: "B",
    kind: "git_mirror",
    status: "slot",
    forge: "gitflic-ru",
    url: null,
    blast_radius: "gitflic-ru",
    independent: true,
    lockset_shelf: true,
    refuse: REFUSE.NO_FORGE,
    reason: "GitFlic (RU) tip-pack is a Plane B LIVE-promotion target. No verified URL in-repo. SLOT. Do not invent a URL. LIVE only after tip hash-verify.",
  }),
  Object.freeze({
    id: "plane-b-zenodo-tip-pack",
    plane: "B",
    kind: "zenodo_doi",
    status: "refused",
    doi: null,
    url: null,
    blast_radius: "zenodo-cern",
    independent: true,
    lockset_shelf: false,
    lockset_doi: false,
    refuse: Object.freeze([REFUSE.ZENODO_IP_BAN, REFUSE.NO_TIP_DOI]),
    checklist: "tools/cold_shelf/ZENODO-TIP-PACK-CHECKLIST.md",
    reason: "Operator IP banned at Zenodo (CNS-ZENODO-IP-BAN). Zenodo is not the Plane B working shelf. No tip-pack DOI (CNS-NO-TIP-DOI). cite.json / lockset doi stay null. Do not invent. Paper deposits are not this slot.",
  }),
  Object.freeze({
    id: "plane-c-usb-airgap",
    plane: "C",
    kind: "usb_airgap",
    status: "slot",
    blast_radius: "operator-airgap",
    independent: true,
    lockset_shelf: true,
    primary: true,
    refuse: REFUSE.OPERATOR_ATTEST,
    pack: "node tools/cold_shelf/cli.mjs airgap",
    checklist: "tools/cold_shelf/USB-AIRGAP-ATTEST.md",
    attest: USB_ATTEST_PATH,
    reason: "USB airgap export is the Plane C primary pack (tarball + SHA256SUMS + verify script). Shelf stays SLOT until an operator attests an off-network copy still hashes (CNS-OPERATOR-ATTEST). USB offline-verify before LIVE.",
  }),
  Object.freeze({
    id: "plane-c-forge-off-github",
    plane: "C",
    kind: "git_mirror",
    status: "slot",
    url: null,
    forge: null,
    blast_radius: "second-forge",
    independent: true,
    lockset_shelf: true,
    refuse: REFUSE.NO_FORGE,
    reason: "Optional Plane C second-forge slot. Codeberg / archive.org / GitFlic RU are Plane B working targets, not this slot. No account URL here. SLOT. Do not invent a URL.",
  }),
  Object.freeze({
    id: "ipfs-lockset",
    plane: null,
    kind: "ipfs_cid",
    status: "slot",
    cid: null,
    url: null,
    independent: true,
    lockset_shelf: true,
    refuse: REFUSE.NO_CID,
    reason: "Extra slot, not a named plane. No published CID. Do not invent one.",
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

export function refusedShelves(rows = SHELF_REGISTRY) {
  return rows.filter((s) => s && s.status === "refused");
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

export function planeRows(plane, rows = SHELF_REGISTRY) {
  return rows.filter((s) => s && s.plane === plane);
}

export function judgePlaneAMirrors(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.count_four_hosts_as_four_shelves === true
    || src.four_independent_cf_hosts === true
    || src.plane_a_is_four_shelves === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.PLANE_A_ONE_TUNNEL,
      independent_count: 1,
      mirrors: PLANE_A_MIRRORS.length,
      published_surfaces: PUBLISHED_SURFACE_IDS.length,
      note: "Plane A is one CF/GitHub tunnel with four host mirrors. Not four independent shelves.",
    };
  }
  return {
    accept: true,
    action: "ok",
    plane: "A",
    independent_count: 1,
    mirrors: PLANE_A_MIRRORS.length,
    published_surfaces: PUBLISHED_SURFACE_IDS.length,
    family_blast_radii: FAMILY_BLAST_RADII.slice(),
  };
}

export function judgePublishedSurfaces(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.count_five_surfaces_as_five_shelves === true
    || src.five_independent_surfaces === true
    || src.five_independent_shelves === true
    || src.claim_five_independent === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.SURFACES_NOT_INDEPENDENT,
      published_surfaces: PUBLISHED_SURFACE_IDS.length,
      family_blast_radii: FAMILY_BLAST_RADII.slice(),
      independent_live_count: 1,
      note: "4 CF hubs + GitHub = 5 published surfaces and 2 cf-github family radii. Only cf-github is live independent. Not 5 independent shelves.",
    };
  }
  return {
    accept: true,
    action: "ok",
    published_surfaces: PUBLISHED_SURFACE_IDS.length,
    family_blast_radii: FAMILY_BLAST_RADII.slice(),
    independent_live_blast_radii: independentLiveBlastRadii(),
    independent_live_count: independentLiveBlastRadii().length,
  };
}

export function judgeZenodoTipReuse(input) {
  const src = input && typeof input === "object" ? input : {};
  const doi = String(src.doi || "").trim();
  const paper = PAPER_DEPOSITS.find((p) => p.doi === doi);
  if (paper) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.TIP_NOT_ON_DEPOSIT,
      working_path: REFUSE.ZENODO_IP_BAN,
      reuse_as_plane_b: false,
      tip_verified: false,
      doi,
      payload: paper.payload,
      note: "Paper deposits stay paper deposits. Zenodo is not the Plane B working shelf (CNS-ZENODO-IP-BAN).",
    };
  }
  if (doi) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.FAKE_DEPOSIT,
      working_path: REFUSE.ZENODO_IP_BAN,
      note: "DOI is not a verified tip-pack and not a listed paper cite. Do not invent. Zenodo is not the Plane B working shelf.",
    };
  }
  return {
    accept: false,
    action: "refuse",
    reason: REFUSE.ZENODO_IP_BAN,
    also: REFUSE.NO_TIP_DOI,
    status: "refused",
    doi: null,
  };
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
    return judgeZenodoTipReuse(src);
  }
  if (kind === "git_mirror" && (src.invent_url === true || String(src.url || "").trim()) && (src.plane === "B" || src.plane === "C")) {
    const listed = SHELF_REGISTRY.some((s) => s.plane === src.plane && s.kind === "git_mirror" && s.url);
    if (!listed) {
      return {
        accept: false,
        action: "refuse",
        reason: REFUSE.NO_FORGE,
        note: src.plane === "B"
          ? "No verified Codeberg / GitFlic URL. Plane B stays SLOT. Do not invent a URL."
          : "No second-forge account. Do not invent a URL.",
      };
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
    planes: {
      A: {
        name: "CF/GitHub tunnel",
        status: "live",
        independent: true,
        mirrors: PLANE_A_MIRRORS.length,
        published_surfaces: PUBLISHED_SURFACE_IDS.length,
        family_blast_radii: FAMILY_BLAST_RADII.slice(),
        note: "4 CF hubs + GitHub = 5 published surfaces / 2 family radii (cloudflare + github). One cf-github plane, not five shelves.",
      },
      B: {
        name: "alternate independent forge/archive tip-pack",
        status: "slot",
        doi: null,
        working_targets: PLANE_B_WORKING_TARGETS.slice(),
        zenodo_working_path: false,
        refuse: REFUSE.ZENODO_IP_BAN,
        checklist: "tools/cold_shelf/ALT-FORGE-TIP-PACK-CHECKLIST.md",
        note: "Codeberg / archive.org / GitFlic RU are LIVE-promotion targets. SLOT until tip hash-verify. Do not invent URLs. Zenodo tip-pack is refused (CNS-ZENODO-IP-BAN).",
      },
      C: {
        name: "USB airgap + optional second forge",
        status: "slot",
        primary: "usb_airgap",
        refuse: [REFUSE.OPERATOR_ATTEST, REFUSE.NO_FORGE],
        checklist: "tools/cold_shelf/USB-AIRGAP-ATTEST.md",
        attest: USB_ATTEST_PATH,
      },
    },
    paper_deposits: PAPER_DEPOSITS.map((p) => ({ ...p })),
    published_surfaces: PUBLISHED_SURFACE_IDS.length,
    published_surface_ids: PUBLISHED_SURFACE_IDS.slice(),
    published_surfaces_note: "4 CF hubs + GitHub. Not 5 independent shelves.",
    family_blast_radii: FAMILY_BLAST_RADII.slice(),
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
    refused: refusedShelves().map((s) => s.id),
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
      + " Plane A is one CF/GitHub tunnel (5 published surfaces / 2 family radii; independent_live_count stays 1). "
      + "Plane B is alt independent forge/archive SLOT; Zenodo tip-pack is refused (CNS-ZENODO-IP-BAN). doi null. "
      + "Paper deposits are not tip-pack Plane B. Plane C USB stays SLOT until CNS-OPERATOR-ATTEST.",
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
    planes: shelfRegistryDoc(h).planes,
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
    + "- Planes: A = CF/GitHub (5 published surfaces / 2 family radii, 1 independent live). B = alt independent forge/archive tip-pack SLOT (Codeberg / archive.org / GitFlic RU). Zenodo tip-pack refused CNS-ZENODO-IP-BAN (doi null). C = USB airgap SLOT (CNS-OPERATOR-ATTEST).\n"
    + "- CLI: node tools/cold_shelf/cli.mjs export | verify --hash <64-hex> | airgap\n"
    + "- Do not invent IPFS CIDs, archive.org items, lockset DOIs, or forge URLs.\n"
    + "- Do not count 5 published surfaces as 5 independent shelves.\n"
    + "- AZ Generator / Cap-7 / live ICANN publish is not this repo.\n"
    + "- Crawlers are extra shelves. They do not re-expand. Training residue is rumor.\n";
}
