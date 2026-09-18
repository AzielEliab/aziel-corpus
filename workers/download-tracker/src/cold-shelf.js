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
import {
  FOLDLOCK_SHELF_SPEC,
  foldlockExportCite,
  foldlockLlmsBlock,
} from "./foldlock.js";
import { cap7ShelvesCite, cap7SitesCompact } from "./ai-surface.js";
import { runtimeLaunchCite } from "./runtime-copy.js";

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
  PLANE_B_ALL_TARGETS: "CNS-PLANE-B-ALL-TARGETS",
  NO_CLAIM_COMPLETE: "CNS-NO-CLAIM-COMPLETE",
  GITFLIC_EMAIL: "CNS-GITFLIC-EMAIL",
  GITLAB_CF_LOOP: "CNS-GITLAB-CF-LOOP",
  FOLD_TIP: "FL-TIP-FOLD-REFUSE",
  FOLD_CHAIN: "FL-CHAIN-REWRITE-REFUSE",
  FOLD_LOCKSET: "FL-LOCKSET-BYTES-REFUSE",
  FOLD_RECEIPT: "FL-RECEIPT-FOLD-REFUSE",
  FOLD_HASH: "FL-HASH-FIELD-REFUSE",
  FOLD_ZIP: "FL-ZIP-ENCRYPT-CLAIM",
  FOLD_UNBOUND: "FL-ENGINE-UNBOUND",
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
  "docs/FOLDLOCK-SHELF-1.0.md",
  "docs/lockset.json",
  "tools/cold_shelf/ZENODO-TIP-PACK-CHECKLIST.md",
  "tools/cold_shelf/ALT-FORGE-TIP-PACK-CHECKLIST.md",
  "tools/cold_shelf/USB-AIRGAP-ATTEST.md",
  "tools/cold_shelf/RESTORE-DRILL.md",
  "docs/RESTORE-DRILL-1.0.md",
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

export const PLANE_B_WORKING_TARGETS = Object.freeze(["codeberg", "archive.org", "framagit"]);

export const CODEBERG_TIP_PACK = Object.freeze({
  url: "https://codeberg.org/AzielEliab/aziel-lockset-tip",
  branch: "main",
  files: Object.freeze(["aziel-tip-pack.tar", "SHA256SUMS", "lockset.json", "verify-airgap.sh"]),
  pack_sha256: "b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37",
  lockset_tip: "c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245",
});

/** Second IA item. Same blast_radius archive-org as the primary — not a new independent shelf. */
export const ARCHIVE_ORG_TIP_PACK_202609 = Object.freeze({
  url: "https://archive.org/details/aziel-lockset-tip_202609",
  identifier: "aziel-lockset-tip_202609",
  item: "aziel-lockset-tip_202609",
  download_base: "https://archive.org/download/aziel-lockset-tip_202609/",
  zip: "https://archive.org/download/aziel-lockset-tip_202609/aziel-lockset-tip.zip",
  zip_alt: "https://archive.org/download/aziel-lockset-tip_202609/aziel-lockset-tip%202.zip",
  wrap: "zip",
  ia_flat_sha256: null,
  sha256sums_flat_check: "incomplete",
  inner_pack: "aziel-tip-pack.tar",
  files: Object.freeze(["aziel-lockset-tip.zip"]),
  inner_files: Object.freeze(["aziel-tip-pack.tar", "SHA256SUMS", "lockset.json", "verify-airgap.sh"]),
  pack_sha256: "b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37",
  lockset_tip: "c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245",
});

export const ARCHIVE_ORG_TIP_PACK = Object.freeze({
  url: "https://archive.org/details/aziel-lockset-tip",
  identifier: "aziel-lockset-tip",
  item: "aziel-lockset-tip",
  download_base: "https://archive.org/download/aziel-lockset-tip/",
  files: Object.freeze(["aziel-tip-pack.tar", "SHA256SUMS", "lockset.json", "verify-airgap.sh"]),
  pack_sha256: "b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37",
  lockset_tip: "c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245",
  secondary_items: Object.freeze([
    Object.freeze({
      id: "plane-b-archive-org-tip-pack-202609",
      url: ARCHIVE_ORG_TIP_PACK_202609.url,
      identifier: ARCHIVE_ORG_TIP_PACK_202609.identifier,
      item: ARCHIVE_ORG_TIP_PACK_202609.item,
      download_base: ARCHIVE_ORG_TIP_PACK_202609.download_base,
      zip: ARCHIVE_ORG_TIP_PACK_202609.zip,
      zip_alt: ARCHIVE_ORG_TIP_PACK_202609.zip_alt,
      wrap: ARCHIVE_ORG_TIP_PACK_202609.wrap,
      ia_flat_sha256: null,
      sha256sums_flat_check: "incomplete",
      inner_pack: ARCHIVE_ORG_TIP_PACK_202609.inner_pack,
      pack_sha256: ARCHIVE_ORG_TIP_PACK_202609.pack_sha256,
      lockset_tip: ARCHIVE_ORG_TIP_PACK_202609.lockset_tip,
      hash_verify: "pass",
      same_blast_radius: "archive-org",
      independent_shelf: false,
    }),
  ]),
});

export const USB_ATTEST_PATH =
  "USB offline-verify before LIVE: copy the airgap pack off-network, run verify-airgap.sh / sha256sum -c SHA256SUMS against the published tip, then operator attest (CNS-OPERATOR-ATTEST).";

export const RESTORE_DRILL_SPEC = "RESTORE-DRILL-1.0";
export const RESTORE_DRILL_PATH = "tools/cold_shelf/RESTORE-DRILL.md";
export const LAMB_LENS_CITE =
  "Corpus is the public Lamb Lens shelf. This registry is the cold-copy cite on that shelf; it does not re-expand from Lamb Lens index.";

/** Expected pack + tip for extra E/F/G SLOTs until a real URL hash-verifies. */
export const TIP_PACK_EXPECT = Object.freeze({
  pack_sha256: CODEBERG_TIP_PACK.pack_sha256,
  lockset_tip: CODEBERG_TIP_PACK.lockset_tip,
});

/** Extra independent tip-pack planes. Not required for Plane B LIVE. Framagit left extras (now Plane B third target). GitLab stays extra (CNS-GITLAB-CF-LOOP). */
export const EXTRA_PLANES = Object.freeze(["E", "F", "G"]);

export const EXTRA_TIP_PACK_TARGETS = Object.freeze([
  Object.freeze({
    plane: "E",
    id: "plane-e-launchpad-tip-pack",
    forge: "launchpad",
    kind: "git_mirror",
    blast_radius: "launchpad",
    name: "Launchpad",
  }),
  Object.freeze({
    plane: "F",
    id: "plane-f-osf-africarxiv-tip-pack",
    forge: "osf-africarxiv",
    kind: "other",
    blast_radius: "osf-africarxiv",
    name: "AfricArXiv/OSF",
  }),
  Object.freeze({
    plane: "G",
    id: "plane-g-gitlab-tip-pack",
    forge: "gitlab",
    kind: "git_mirror",
    blast_radius: "gitlab",
    name: "GitLab",
    refuse: REFUSE.GITLAB_CF_LOOP,
    reason: "GitLab is Cloudflare-loop blocked (CNS-GITLAB-CF-LOOP). Extra SLOT, url null. Not a Plane B LIVE-promotion target. Do not invent a URL.",
  }),
]);

export function extraTipPackShelf(target) {
  const t = target && typeof target === "object" ? target : {};
  const refuse = t.refuse || REFUSE.NO_FORGE;
  return Object.freeze({
    id: t.id,
    plane: t.plane,
    kind: t.kind,
    status: t.status || "slot",
    forge: t.forge,
    url: null,
    expect_pack_sha256: TIP_PACK_EXPECT.pack_sha256,
    expect_lockset_tip: TIP_PACK_EXPECT.lockset_tip,
    hash_verify: null,
    tip_verified: false,
    live_ready: false,
    required_for_plane_b_live: false,
    extra_slot: true,
    doi: null,
    blast_radius: t.blast_radius,
    independent: true,
    lockset_shelf: true,
    refuse,
    reason: t.reason
      || ("Extra independent tip-pack SLOT (" + t.plane + "/" + t.name + "). url null. Refuse " + refuse
        + " until a real URL + hash-verify against pack "
        + TIP_PACK_EXPECT.pack_sha256 + " and tip " + TIP_PACK_EXPECT.lockset_tip
        + ". Extra SLOT; not required for Plane B LIVE (CNS-PLANE-B-ALL-TARGETS is Codeberg + archive.org + Framagit)."),
  });
}

function extraPlaneDoc(letter) {
  const t = EXTRA_TIP_PACK_TARGETS.find((row) => row.plane === letter);
  const refuse = (t && t.refuse) || REFUSE.NO_FORGE;
  return {
    name: "extra independent tip-pack (" + (t && t.name ? t.name : letter) + ")",
    status: (t && t.status) || "slot",
    extra_slot: true,
    required_for_plane_b_live: false,
    url: null,
    refuse,
    expect_pack_sha256: TIP_PACK_EXPECT.pack_sha256,
    expect_lockset_tip: TIP_PACK_EXPECT.lockset_tip,
    note: t && t.reason
      ? t.reason
      : "Extra SLOT. url null. " + refuse + " until real URL + hash-verify vs pack and tip. Not required for Plane B LIVE.",
  };
}

/**
 * Honest registry. Planes A/B/C (NO-FAN) plus extra E/F/G SLOTs.
 * Plane A = one CF/GitHub tunnel, four host mirrors + git = 5 published surfaces / 2 family radii. Not five shelves.
 * Plane B = alternate independent forge/archive tip-pack SLOT (Codeberg / archive.org / Framagit). GitFlic refused (CNS-GITFLIC-EMAIL). GitLab extra (CNS-GITLAB-CF-LOOP). Zenodo is refused (CNS-ZENODO-IP-BAN). doi null.
 * Plane C = USB airgap pack + optional second-forge SLOT + RESTORE-DRILL schema.
 * Planes E/F/G = extra independent tip-pack SLOTs (Launchpad, AfricArXiv/OSF, GitLab). Not required for Plane B LIVE.
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
    reason: "Plane B working shelf is an alternate independent forge/archive tip-pack (Codeberg / archive.org / Framagit). Codeberg + archive.org hash-verify PASS; Framagit awaiting tip-pack. archive.org lists two items (primary aziel-lockset-tip + secondary aziel-lockset-tip_202609) under one working_targets kind. SLOT until all three pass. cite.json / lockset doi stay null.",
    note: "Not Zenodo. Zenodo is not the Plane B working path (CNS-ZENODO-IP-BAN). GitFlic refused (CNS-GITFLIC-EMAIL). GitLab is not a LIVE target (CNS-GITLAB-CF-LOOP).",
  }),
  Object.freeze({
    id: "plane-b-codeberg-tip-pack",
    plane: "B",
    kind: "git_mirror",
    status: "slot",
    forge: "codeberg",
    url: CODEBERG_TIP_PACK.url,
    branch: CODEBERG_TIP_PACK.branch,
    files: CODEBERG_TIP_PACK.files,
    pack_sha256: CODEBERG_TIP_PACK.pack_sha256,
    lockset_tip: CODEBERG_TIP_PACK.lockset_tip,
    hash_verify: "pass",
    tip_verified: true,
    live_ready: false,
    doi: null,
    blast_radius: "codeberg",
    independent: true,
    lockset_shelf: true,
    refuse: REFUSE.PLANE_B_ALL_TARGETS,
    reason: "Codeberg tip-pack uploaded and hash-verify PASS. SLOT until Framagit also hash-verify (archive.org already PASS). Plane B LIVE only when Codeberg + archive.org + Framagit pass (CNS-PLANE-B-ALL-TARGETS). Extra E/F/G SLOTs are not required. doi null.",
  }),
  Object.freeze({
    id: "plane-b-archive-org-tip-pack",
    plane: "B",
    kind: "archive_org",
    status: "slot",
    url: ARCHIVE_ORG_TIP_PACK.url,
    identifier: ARCHIVE_ORG_TIP_PACK.identifier,
    item: ARCHIVE_ORG_TIP_PACK.item,
    download_base: ARCHIVE_ORG_TIP_PACK.download_base,
    files: ARCHIVE_ORG_TIP_PACK.files,
    pack_sha256: ARCHIVE_ORG_TIP_PACK.pack_sha256,
    lockset_tip: ARCHIVE_ORG_TIP_PACK.lockset_tip,
    hash_verify: "pass",
    tip_verified: true,
    live_ready: false,
    doi: null,
    blast_radius: "archive-org",
    independent: true,
    lockset_shelf: true,
    secondary_items: ARCHIVE_ORG_TIP_PACK.secondary_items,
    refuse: REFUSE.PLANE_B_ALL_TARGETS,
    reason: "archive.org tip-pack uploaded and hash-verify PASS (primary item aziel-lockset-tip). A second IA item (aziel-lockset-tip_202609) is the same blast_radius archive-org, listed under secondary_items — not a new independent shelf. SLOT until Framagit also hash-verify. Plane B LIVE only when Codeberg + archive.org + Framagit pass (CNS-PLANE-B-ALL-TARGETS). doi null.",
  }),
  Object.freeze({
    id: "plane-b-archive-org-tip-pack-202609",
    plane: "B",
    kind: "archive_org",
    status: "slot",
    url: ARCHIVE_ORG_TIP_PACK_202609.url,
    identifier: ARCHIVE_ORG_TIP_PACK_202609.identifier,
    item: ARCHIVE_ORG_TIP_PACK_202609.item,
    download_base: ARCHIVE_ORG_TIP_PACK_202609.download_base,
    zip: ARCHIVE_ORG_TIP_PACK_202609.zip,
    zip_alt: ARCHIVE_ORG_TIP_PACK_202609.zip_alt,
    wrap: ARCHIVE_ORG_TIP_PACK_202609.wrap,
    ia_flat_sha256: null,
    sha256sums_flat_check: "incomplete",
    inner_pack: ARCHIVE_ORG_TIP_PACK_202609.inner_pack,
    files: ARCHIVE_ORG_TIP_PACK_202609.files,
    inner_files: ARCHIVE_ORG_TIP_PACK_202609.inner_files,
    pack_sha256: ARCHIVE_ORG_TIP_PACK_202609.pack_sha256,
    lockset_tip: ARCHIVE_ORG_TIP_PACK_202609.lockset_tip,
    hash_verify: "pass",
    tip_verified: true,
    live_ready: false,
    doi: null,
    blast_radius: "archive-org",
    independent: false,
    lockset_shelf: true,
    same_pack_as: "plane-b-archive-org-tip-pack",
    required_for_plane_b_live: false,
    refuse: REFUSE.PLANE_B_ALL_TARGETS,
    reason: "Second archive.org tip-pack item (aziel-lockset-tip_202609). Same blast_radius archive-org as the primary item — not a new independent shelf. Zip wraps the tip files; flat IA metadata sha256 on the zip may be null. SHA256SUMS flat-check incomplete at IA file list is OK because inner aziel-tip-pack.tar SHA-256 b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37 hash-verifies (AZBot PASS; same pack as Codeberg + primary archive.org). SLOT until Framagit also hash-verify. Plane B LIVE only when Codeberg + archive.org + Framagit pass (CNS-PLANE-B-ALL-TARGETS). doi null.",
  }),
  Object.freeze({
    id: "plane-b-framagit-tip-pack",
    plane: "B",
    kind: "git_mirror",
    status: "slot",
    forge: "framagit",
    url: null,
    blast_radius: "framagit",
    independent: true,
    lockset_shelf: true,
    live_ready: false,
    doi: null,
    required_for_plane_b_live: true,
    refuse: REFUSE.NO_FORGE,
    reason: "Framagit tip-pack is a Plane B LIVE-promotion target (AZindex-FAIL pivot 2026-09-14; GitLab CF-loop blocked). No verified URL in-repo. SLOT. Awaiting tip-pack. Do not invent a URL. LIVE only after tip hash-verify.",
  }),
  Object.freeze({
    id: "plane-b-gitflic-ru-tip-pack",
    plane: "B",
    kind: "git_mirror",
    status: "refused",
    forge: "gitflic-ru",
    url: null,
    blast_radius: "gitflic-ru",
    independent: true,
    lockset_shelf: false,
    refuse: REFUSE.GITFLIC_EMAIL,
    reason: "GitFlic confirmation mail never arrived (CNS-GITFLIC-EMAIL). Not a Plane B LIVE-promotion target. Framagit replaced it. No verified URL. Do not invent a URL.",
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
    restore_drill: RESTORE_DRILL_PATH,
    restore_drill_spec: RESTORE_DRILL_SPEC,
    attest: USB_ATTEST_PATH,
    reason: "USB airgap export is the Plane C primary pack (tarball + SHA256SUMS + verify script). RESTORE-DRILL proves re-expand from those bytes + prev-hash, not an index. Shelf stays SLOT until an operator attests an off-network copy still hashes (CNS-OPERATOR-ATTEST). USB offline-verify before LIVE. Schema emit is not an attest (NO-FAN).",
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
    reason: "Optional Plane C second-forge slot. Codeberg / archive.org / Framagit are Plane B working targets, not this slot. Launchpad / OSF / GitLab are extra E/F/G SLOTs, not this slot. No account URL here. SLOT. Do not invent a URL.",
  }),
  ...EXTRA_TIP_PACK_TARGETS.map(extraTipPackShelf),
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

export const PLANE_B_TARGET_IDS = Object.freeze([
  "plane-b-codeberg-tip-pack",
  "plane-b-archive-org-tip-pack",
  "plane-b-framagit-tip-pack",
]);

/** Plane B LIVE only after Codeberg + archive.org + Framagit all hash-verify. Extra E/F/G SLOTs do not count. GitLab and GitFlic are not LIVE-gate targets. */
export function planeBLiveReady(rows = SHELF_REGISTRY) {
  return PLANE_B_TARGET_IDS.every((id) => {
    const s = rows.find((row) => row && row.id === id);
    return s && s.hash_verify === "pass" && s.tip_verified === true && s.url;
  });
}

export function extraTipPackRows(rows = SHELF_REGISTRY) {
  return rows.filter((s) => s && s.extra_slot === true);
}

function collectArchiveOrgRefs(row, out) {
  if (!row || typeof row !== "object") return;
  for (const key of ["url", "item", "identifier", "download_base", "zip", "zip_alt"]) {
    const v = row[key];
    if (v == null || v === "") continue;
    const s = String(v);
    out.add(s);
    out.add(s.replace(/\/+$/, ""));
  }
  if (Array.isArray(row.secondary_items)) {
    for (const sec of row.secondary_items) collectArchiveOrgRefs(sec, out);
  }
}

/** Listed verified archive.org item URLs / identifiers (primary + secondary_items). */
export function listedArchiveOrgRefs(rows = SHELF_REGISTRY) {
  const out = new Set();
  for (const s of rows) {
    if (s && s.kind === "archive_org") collectArchiveOrgRefs(s, out);
  }
  return out;
}

export function judgePlaneBFromExtras(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.extras_make_plane_b_live === true
    || src.count_extra_as_plane_b === true
    || src.expand_plane_b_live_rule === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.PLANE_B_ALL_TARGETS,
      note: "Plane B LIVE stays Codeberg + archive.org + Framagit. Extra E/F/G SLOTs do not expand that rule. GitLab is CNS-GITLAB-CF-LOOP. GitFlic is CNS-GITFLIC-EMAIL.",
    };
  }
  return {
    accept: true,
    action: "ok",
    live_ready: planeBLiveReady(),
    extras_required: false,
    working_targets: PLANE_B_WORKING_TARGETS.slice(),
  };
}

export function judgeCompletenessClaim(input) {
  const src = input && typeof input === "object" ? input : {};
  if (src. === true || src.claim_100 === true || src.publish_100 === true) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_CLAIM_COMPLETE,
      : "",
      : false,
    };
  }
  return {
    accept: true,
    action: "ok",
    : "",
    : false,
  };
}

export function restoreDrillReceiptSchema() {
  return {
    spec: RESTORE_DRILL_SPEC,
    status: "slot",
    no_fan: true,
    live: false,
    source: "plane-c-bytes-plus-prev-hash",
    not_source: "index",
    cites: Object.freeze([
      "CROSS-NETWORK-SURVIVAL-1.0",
      "NO-LIE-NO-REWRITE-1.0",
      "RE-EXPAND-FROM-ARCHIVE-1.0",
      "MESH-REEXPAND-1.0",
      "ACT-RECEIPT-1.0",
      "COLD-MULTI-SHELF-1.0",
    ]),
    lamb_lens: LAMB_LENS_CITE,
    fields: {
      hash: { type: "sha-256-64hex", of: "canonical payload including previous_hash" },
      action: {
        type: "one-sentence",
        example: "Operator re-expanded from Plane C airgap bytes and walked each previous_hash.",
      },
      output: {
        type: "one-sentence",
        example:
          "Pack SHA-256 matched " + TIP_PACK_EXPECT.pack_sha256
          + " and lockset tip " + TIP_PACK_EXPECT.lockset_tip
          + "; LIVE refused until CNS-OPERATOR-ATTEST.",
      },
      metadata: {
        surface: "cold-shelf",
        path: RESTORE_DRILL_PATH,
        method: "OPERATOR",
        status: "slot",
        tool: "restore-drill",
        spec: RESTORE_DRILL_SPEC,
      },
      previous_hash: {
        type: "sha-256-64hex",
        note: "prior receipt or published lockset tip; fail-closed walk",
      },
    },
    expect_pack_sha256: TIP_PACK_EXPECT.pack_sha256,
    expect_lockset_tip: TIP_PACK_EXPECT.lockset_tip,
    plane: "C",
    checklist: RESTORE_DRILL_PATH,
    refuse: Object.freeze([REFUSE.OPERATOR_ATTEST, REFUSE.FAKE_DEPOSIT, REFUSE.TRAINING_RUMOR]),
    note: "NO-FAN. Schema only until an operator runs the drill off-network. Do not invent an attest. Do not re-expand from an index.",
  };
}

export function emitRestoreDrillReceipt(input) {
  const src = input && typeof input === "object" ? input : {};
  if (src.from_index === true || src.index === true || src.crawler_reexpand === true) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.TRAINING_RUMOR,
      note: "Re-expand is Plane C bytes + prev-hash, not index.",
    };
  }
  if (src.invent_attest === true || src.mark_live === true || src.fan === true) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.FAKE_DEPOSIT,
      also: REFUSE.OPERATOR_ATTEST,
      note: "NO-FAN. Do not invent a restore-drill attest.",
    };
  }
  return {
    accept: true,
    action: "emit-schema",
    status: "slot",
    live: false,
    receipt: restoreDrillReceiptSchema(),
  };
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
    const item = String(src.item || src.identifier || src.url || src.download_base || src.zip || src.zip_alt || "").trim();
    if (item) {
      const listed = listedArchiveOrgRefs();
      const norm = item.replace(/\/+$/, "");
      const hit = listed.has(item) || listed.has(norm);
      if (!hit || src.invent_url === true) {
        return { accept: false, action: "refuse", reason: REFUSE.NO_WARC, note: "Only the listed verified archive.org items are allowed. Do not invent a URL." };
      }
      return { accept: true, action: "ok" };
    }
    return { accept: true, action: "slot", reason: REFUSE.NO_WARC, status: "slot" };
  }
  if (kind === "zenodo_doi") {
    return judgeZenodoTipReuse(src);
  }
  if (EXTRA_PLANES.includes(src.plane) && (src.invent_url === true || String(src.url || "").trim())) {
    const url = String(src.url || "").trim();
    const listed = SHELF_REGISTRY.some((s) => s.plane === src.plane && s.url && s.url === url);
    if (!listed || src.invent_url === true) {
      return {
        accept: false,
        action: "refuse",
        reason: REFUSE.NO_FORGE,
        note: "Extra E/F/G tip-pack SLOT. url null until real URL + hash vs pack and tip. Not required for Plane B LIVE. GitLab is CNS-GITLAB-CF-LOOP.",
      };
    }
  }
  if (kind === "git_mirror" && (src.invent_url === true || String(src.url || "").trim()) && (src.plane === "B" || src.plane === "C")) {
    const url = String(src.url || "").trim();
    const listed = SHELF_REGISTRY.some((s) => s.plane === src.plane && s.kind === "git_mirror" && s.url && s.url === url);
    if (!listed || src.invent_url === true) {
      return {
        accept: false,
        action: "refuse",
        reason: REFUSE.NO_FORGE,
        note: src.plane === "B"
          ? "Only the listed verified forge URL is allowed. Do not invent a Codeberg / Framagit / GitLab URL. Plane B stays SLOT until Codeberg + archive.org + Framagit hash-verify."
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
    foldlock: foldlockExportCite(host),
    ...survivalCiteFields(),
    cold_multi_shelf: COLD_MULTI_SHELF_SPEC,
    cold_multi_shelf_rule: COLD_MULTI_SHELF_RULE,
    foldlock_shelf: FOLDLOCK_SHELF_SPEC,
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
    restore_drill: "Plane C bytes + prev-hash walk; emit schema only (" + RESTORE_DRILL_SPEC + "); NO-FAN",
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
        live_ready: planeBLiveReady(),
        refuse: REFUSE.ZENODO_IP_BAN,
        checklist: "tools/cold_shelf/ALT-FORGE-TIP-PACK-CHECKLIST.md",
        note: "AZindex-FAIL pivot 2026-09-14: LIVE targets are Codeberg + archive.org + Framagit. Codeberg + archive.org hash-verify PASS (still SLOT). archive.org has two items (aziel-lockset-tip + aziel-lockset-tip_202609), same blast_radius — not a second independent shelf. Zip wrap on the 202609 item: flat IA sha256 on the zip may be null; inner aziel-tip-pack.tar hash-verifies. Framagit awaiting tip-pack. GitFlic refused (CNS-GITFLIC-EMAIL). GitLab extra (CNS-GITLAB-CF-LOOP). LIVE only when all three pass (CNS-PLANE-B-ALL-TARGETS). Zenodo refused (CNS-ZENODO-IP-BAN).",
      },
      C: {
        name: "USB airgap + optional second forge",
        status: "slot",
        primary: "usb_airgap",
        refuse: [REFUSE.OPERATOR_ATTEST, REFUSE.NO_FORGE],
        checklist: "tools/cold_shelf/USB-AIRGAP-ATTEST.md",
        restore_drill: RESTORE_DRILL_PATH,
        restore_drill_spec: RESTORE_DRILL_SPEC,
        attest: USB_ATTEST_PATH,
      },
      E: extraPlaneDoc("E"),
      F: extraPlaneDoc("F"),
      G: extraPlaneDoc("G"),
    },
    extra_tip_pack_slots: EXTRA_TIP_PACK_TARGETS.map((t) => t.id),
    restore_drill: restoreDrillReceiptSchema(),
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
    foldlock: foldlockExportCite(h),
    foldlock_shelf: FOLDLOCK_SHELF_SPEC,
    lamb_lens: LAMB_LENS_CITE,
    runtime_launch: runtimeLaunchCite(),
    : "",
    : false,
    note:
      "CROSS-NETWORK-SURVIVAL: " + CROSS_NETWORK_SURVIVAL_RULE + " "
      + "NO-LIE / NO-REWRITE: " + NO_LIE_NO_REWRITE_RULE + " "
      + "Lamb Lens: " + LAMB_LENS_CITE + " "
      + COLD_MULTI_SHELF_RULE
      + " Plane A is one CF/GitHub tunnel (5 published surfaces / 2 family radii; independent_live_count stays 1). "
      + "Plane B is alt independent forge/archive SLOT; LIVE only after Codeberg + archive.org + Framagit (CNS-PLANE-B-ALL-TARGETS). archive.org items: https://archive.org/details/aziel-lockset-tip and https://archive.org/details/aziel-lockset-tip_202609 (same blast_radius; zip wrap on 202609 — flat IA sha256 may be null; inner tar hash-verifies). Not two independent shelves. Zenodo tip-pack is refused (CNS-ZENODO-IP-BAN). doi null. "
      + "GitFlic refused CNS-GITFLIC-EMAIL. GitLab extra CNS-GITLAB-CF-LOOP. Extra E/F/G SLOTs (Launchpad, AfricArXiv/OSF, GitLab) stay url-null; they are not required for Plane B LIVE. "
      + "Paper deposits are not tip-pack Plane B. Plane C USB stays SLOT until CNS-OPERATOR-ATTEST. RESTORE-DRILL emits attest schema from bytes+prev-hash, not index (NO-FAN). "
      + "FoldLock neighbor is cite + SLOT hook (FOLDLOCK-SHELF-1.0): not zip, not encryption; never fold the lockset tip. "
      + "Operator -95. Never publish .",
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
    foldlock: foldlockExportCite(h),
    foldlock_shelf: FOLDLOCK_SHELF_SPEC,
    runtime_launch: runtimeLaunchCite(),
    cap7: cap7ShelvesCite(),
    cap7_sites: cap7SitesCompact(),
    resolves_to_hub: false,
    name_may_change: true,
    public_icann: false,
    fifth_product: false,
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
    archive_org_tip_packs: Object.freeze([
      ARCHIVE_ORG_TIP_PACK.url,
      ARCHIVE_ORG_TIP_PACK_202609.url,
    ]),
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
    + "- Planes: A = CF/GitHub (5 published surfaces / 2 family radii, 1 independent live). B = alt independent forge/archive tip-pack SLOT (Codeberg / archive.org / Framagit). archive.org items: https://archive.org/details/aziel-lockset-tip and https://archive.org/details/aziel-lockset-tip_202609 (same blast_radius; zip wrap on 202609 — flat IA sha256 may be null; inner tar hash-verifies). Not two independent shelves. GitFlic refused CNS-GITFLIC-EMAIL. GitLab extra CNS-GITLAB-CF-LOOP. Zenodo tip-pack refused CNS-ZENODO-IP-BAN (doi null). C = USB airgap SLOT (CNS-OPERATOR-ATTEST). E/F/G = extra independent tip-pack SLOTs (Launchpad, AfricArXiv/OSF, GitLab; url null; not required for Plane B LIVE). RESTORE-DRILL kept.\n"
    + "- Lamb Lens: Corpus is the public Lamb Lens shelf. This registry cites that shelf; it does not re-expand from its index.\n"
    + "- RESTORE-DRILL: emit attest receipt schema from Plane C bytes + prev-hash (NO-FAN). CLI restore-drill.\n"
    + "- CLI: node tools/cold_shelf/cli.mjs export | verify --hash <64-hex> | airgap | restore-drill | fold\n"
    + "- Do not invent IPFS CIDs, archive.org items, lockset DOIs, or forge URLs.\n"
    + "- Do not count 5 published surfaces as 5 independent shelves.\n"
    + "- BAN-SURVIVAL-1.0 mutual shelves↔ban: cold shelves back up death-by-ban; live fronts back up shelf death. Prefer GET runtime /survival (short TTL).\n"
    + "- Cap-7 mesh names inherit design_of the four hubs; resolves_to_hub: false. This hub hosts /bridge.json. MirageGrid app Worker /bridge + /v1/shuffle are LIVE shuffle doors (resolves_to_hub: false).\n"
    + "- AZ Generator / Cap-7 live ICANN publish is not this repo.\n"
    + "- Crawlers are extra shelves. They do not re-expand. Training residue is rumor.\n"
    + "- Operator -95. Never publish . Growth-ON.\n"
    + "- Runtime launch cite does not flip Plane B or Plane C. Framagit stays SLOT CNS-NO-FORGE-MIRROR. USB stays SLOT CNS-OPERATOR-ATTEST.\n"
    + foldlockLlmsBlock(h) + "\n";
}
