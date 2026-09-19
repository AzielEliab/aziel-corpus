import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  COLD_MULTI_SHELF_RULE,
  COLD_MULTI_SHELF_SPEC,
  CORE_DOC_PATHS,
  LOCKSET_TIP,
  MIN_INDEPENDENT_SHELVES,
  PAPER_DEPOSITS,
  PLANE_A_MIRRORS,
  PUBLISHED_TIP,
  REFUSE,
  SHELF_KINDS,
  SHELF_REGISTRY,
  claimShelfLive,
  exportPack,
  hashManifestFromMap,
  ARCHIVE_ORG_TIP_PACK,
  ARCHIVE_ORG_TIP_PACK_202609,
  CODEBERG_TIP_PACK,
  EXTRA_PLANES,
  EXTRA_TIP_PACK_TARGETS,
  FAMILY_BLAST_RADII,
  LAMB_LENS_CITE,
  PLANE_B_WORKING_TARGETS,
  PUBLISHED_SURFACE_IDS,
  RESTORE_DRILL_SPEC,
  TIP_PACK_EXPECT,
  independentLiveBlastRadii,
  independentRequirementMet,
  isShelvesPath,
  isShelfKind,
  emitRestoreDrillReceipt,
  extraTipPackRows,
  listedArchiveOrgRefs,
  judgeAzGenOverclaim,
  judgeFielded100,
  judgeInventedDeposit,
  judgeInventedPhyDnsIcann,
  judgeNeighborVoteHeal,
  judgePlaneAMirrors,
  judgePlaneBFromExtras,
  judgePublishedSurfaces,
  judgeTrainingResidueShelf,
  judgeZenodoTipReuse,
  restoreDrillReceiptSchema,
  liveShelves,
  planeBLiveReady,
  planeRows,
  refusedShelves,
  shelfRegistryDoc,
  shelvesCiteFields,
  shelvesDoc,
  shelvesLlmsBlock,
  slotShelves,
  verifyBytesHash,
  verifyManifestEntry,
  verifyPasteHash,
} from "./cold-shelf.js";
import { COLD_MULTI_SHELF_RULE as INGEST_COLD_RULE, LOCKSET, locksetBytes, locksetFile, matchPublishedTip } from "./ingest-receipt.js";
import { citeDoc, llmsDoc, aiTxt, robotsTxt, sitemapXml } from "./crawl.js";
import { hashPayload } from "./ledger.js";
import { buildExport, sha256File, verifyFileAgainstPack, verifySha256Sums, writeAirgap } from "../../../tools/cold_shelf/index.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const VISIBLE_1520 = /15:20/;
const BANNED_IDENTITY = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)/i;
const CRAWL_NO_TIP_DOI = /10\.5281\/zenodo/i;

test("COLD-MULTI-SHELF planes A/B/C: one LIVE tunnel, alt-forge SLOT, Zenodo refused", () => {
  assert.equal(COLD_MULTI_SHELF_SPEC, "COLD-MULTI-SHELF-1.0");
  assert.equal(COLD_MULTI_SHELF_RULE, INGEST_COLD_RULE);
  assert.match(COLD_MULTI_SHELF_RULE, /Planes A\/B\/C/);
  assert.match(COLD_MULTI_SHELF_RULE, /LIVE only after hash verify/);
  assert.match(COLD_MULTI_SHELF_RULE, /alt independent forge\/archive/);
  assert.doesNotMatch(COLD_MULTI_SHELF_RULE, /B=Zenodo/);
  assert.deepEqual(SHELF_KINDS, [
    "zenodo_doi",
    "git_mirror",
    "ipfs_cid",
    "archive_org",
    "usb_airgap",
    "other",
  ]);
  for (const s of SHELF_REGISTRY) {
    assert.equal(isShelfKind(s.kind), true, s.id);
    assert.ok(["live", "slot", "refused"].includes(s.status), s.id);
  }
  assert.equal(PLANE_A_MIRRORS.length, 4);
  assert.deepEqual(PUBLISHED_SURFACE_IDS.length, 5);
  assert.deepEqual(FAMILY_BLAST_RADII, ["cloudflare", "github"]);
  assert.deepEqual(PLANE_B_WORKING_TARGETS, ["codeberg", "archive.org", "framagit"]);
  assert.ok(PLANE_A_MIRRORS.some((m) => m.origin === "https://www.azieleliab.com"));
  assert.ok(PLANE_A_MIRRORS.some((m) => m.origin === "https://www.azielcorpuslibrary.net"));
  assert.ok(PLANE_A_MIRRORS.some((m) => m.origin === "https://godlock.uk"));
  assert.ok(PLANE_A_MIRRORS.some((m) => m.origin === "https://www.hedidntjump.com"));

  const planeA = SHELF_REGISTRY.find((s) => s.id === "plane-a-cf-github");
  assert.equal(planeA.status, "live");
  assert.equal(planeA.plane, "A");
  assert.equal(planeA.independent, true);
  assert.equal(planeA.blast_radius, "cf-github");
  assert.equal(planeA.mirrors.length, 4);

  const hosts = planeRows("A").filter((s) => String(s.id).startsWith("plane-a-host-"));
  assert.equal(hosts.length, 4);
  for (const h of hosts) {
    assert.equal(h.independent, false);
    assert.equal(h.blast_radius, "cf-github");
  }
  const git = SHELF_REGISTRY.find((s) => s.id === "plane-a-git-aziel-corpus");
  assert.equal(git.status, "live");
  assert.equal(git.independent, false);

  const four = judgePlaneAMirrors({ count_four_hosts_as_four_shelves: true });
  assert.equal(four.accept, false);
  assert.equal(four.reason, REFUSE.PLANE_A_ONE_TUNNEL);
  assert.equal(four.independent_count, 1);

  const five = judgePublishedSurfaces({ count_five_surfaces_as_five_shelves: true });
  assert.equal(five.accept, false);
  assert.equal(five.reason, REFUSE.SURFACES_NOT_INDEPENDENT);
  assert.equal(five.published_surfaces, 5);
  assert.equal(five.independent_live_count, 1);

  const alt = SHELF_REGISTRY.find((s) => s.id === "plane-b-alt-forge-archive");
  assert.equal(alt.plane, "B");
  assert.equal(alt.status, "slot");
  assert.equal(alt.doi, null);
  assert.equal(alt.url, null);
  assert.equal(claimShelfLive(alt).live, false);
  assert.match(alt.note, /Not Zenodo/);

  const codeberg = SHELF_REGISTRY.find((s) => s.id === "plane-b-codeberg-tip-pack");
  assert.equal(codeberg.plane, "B");
  assert.equal(codeberg.status, "slot");
  assert.equal(codeberg.url, CODEBERG_TIP_PACK.url);
  assert.equal(codeberg.branch, "main");
  assert.equal(codeberg.hash_verify, "pass");
  assert.equal(codeberg.tip_verified, true);
  assert.equal(codeberg.live_ready, false);
  assert.equal(codeberg.doi, null);
  assert.equal(codeberg.pack_sha256, CODEBERG_TIP_PACK.pack_sha256);
  assert.equal(codeberg.lockset_tip, CODEBERG_TIP_PACK.lockset_tip);
  assert.deepEqual(codeberg.files, CODEBERG_TIP_PACK.files);
  assert.equal(codeberg.refuse, REFUSE.PLANE_B_ALL_TARGETS);
  assert.equal(claimShelfLive(codeberg).live, false);
  assert.equal(planeBLiveReady(), false);

  const archiveOrg = SHELF_REGISTRY.find((s) => s.id === "plane-b-archive-org-tip-pack");
  assert.equal(archiveOrg.plane, "B");
  assert.equal(archiveOrg.status, "slot");
  assert.equal(archiveOrg.url, ARCHIVE_ORG_TIP_PACK.url);
  assert.equal(archiveOrg.identifier, ARCHIVE_ORG_TIP_PACK.identifier);
  assert.equal(archiveOrg.item, ARCHIVE_ORG_TIP_PACK.item);
  assert.equal(archiveOrg.download_base, ARCHIVE_ORG_TIP_PACK.download_base);
  assert.equal(archiveOrg.hash_verify, "pass");
  assert.equal(archiveOrg.tip_verified, true);
  assert.equal(archiveOrg.live_ready, false);
  assert.equal(archiveOrg.doi, null);
  assert.equal(archiveOrg.pack_sha256, ARCHIVE_ORG_TIP_PACK.pack_sha256);
  assert.equal(archiveOrg.lockset_tip, ARCHIVE_ORG_TIP_PACK.lockset_tip);
  assert.deepEqual(archiveOrg.files, ARCHIVE_ORG_TIP_PACK.files);
  assert.equal(archiveOrg.refuse, REFUSE.PLANE_B_ALL_TARGETS);
  assert.equal(archiveOrg.blast_radius, "archive-org");
  assert.equal(claimShelfLive(archiveOrg).live, false);
  assert.equal(planeBLiveReady(), false);
  assert.equal(archiveOrg.secondary_items.length, 1);
  assert.equal(archiveOrg.secondary_items[0].url, ARCHIVE_ORG_TIP_PACK_202609.url);
  assert.equal(archiveOrg.secondary_items[0].independent_shelf, false);

  const archiveOrg202609 = SHELF_REGISTRY.find((s) => s.id === "plane-b-archive-org-tip-pack-202609");
  assert.equal(archiveOrg202609.plane, "B");
  assert.equal(archiveOrg202609.status, "slot");
  assert.equal(archiveOrg202609.kind, "archive_org");
  assert.equal(archiveOrg202609.url, "https://archive.org/details/aziel-lockset-tip_202609");
  assert.equal(archiveOrg202609.url, ARCHIVE_ORG_TIP_PACK_202609.url);
  assert.equal(archiveOrg202609.identifier, "aziel-lockset-tip_202609");
  assert.equal(archiveOrg202609.hash_verify, "pass");
  assert.equal(archiveOrg202609.tip_verified, true);
  assert.equal(archiveOrg202609.live_ready, false);
  assert.equal(archiveOrg202609.doi, null);
  assert.equal(archiveOrg202609.pack_sha256, "b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37");
  assert.equal(archiveOrg202609.pack_sha256, ARCHIVE_ORG_TIP_PACK.pack_sha256);
  assert.equal(archiveOrg202609.lockset_tip, "c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245");
  assert.equal(archiveOrg202609.blast_radius, "archive-org");
  assert.equal(archiveOrg202609.independent, false);
  assert.equal(archiveOrg202609.same_pack_as, "plane-b-archive-org-tip-pack");
  assert.equal(archiveOrg202609.required_for_plane_b_live, false);
  assert.equal(archiveOrg202609.wrap, "zip");
  assert.equal(archiveOrg202609.ia_flat_sha256, null);
  assert.equal(archiveOrg202609.sha256sums_flat_check, "incomplete");
  assert.equal(archiveOrg202609.inner_pack, "aziel-tip-pack.tar");
  assert.equal(archiveOrg202609.zip, ARCHIVE_ORG_TIP_PACK_202609.zip);
  assert.equal(archiveOrg202609.refuse, REFUSE.PLANE_B_ALL_TARGETS);
  assert.equal(claimShelfLive(archiveOrg202609).live, false);
  assert.equal(planeBLiveReady(), false);

  const framagit = SHELF_REGISTRY.find((s) => s.id === "plane-b-framagit-tip-pack");
  assert.equal(framagit.plane, "B");
  assert.equal(framagit.status, "slot");
  assert.equal(framagit.forge, "framagit");
  assert.equal(framagit.url, null);
  assert.equal(framagit.live_ready, false);
  assert.equal(framagit.doi, null);
  assert.equal(framagit.required_for_plane_b_live, true);
  assert.equal(framagit.refuse, REFUSE.NO_FORGE);
  assert.match(framagit.reason, /Awaiting tip-pack/);
  assert.equal(claimShelfLive(framagit).live, false);

  const gitflic = SHELF_REGISTRY.find((s) => s.id === "plane-b-gitflic-ru-tip-pack");
  assert.equal(gitflic.plane, "B");
  assert.equal(gitflic.status, "refused");
  assert.equal(gitflic.url, null);
  assert.equal(gitflic.refuse, REFUSE.GITFLIC_EMAIL);
  assert.equal(REFUSE.GITFLIC_EMAIL, "CNS-GITFLIC-EMAIL");
  assert.match(gitflic.reason, /mail never arrived/);
  assert.equal(claimShelfLive(gitflic).live, false);
  assert.equal(planeBLiveReady(), false);

  const tipPack = SHELF_REGISTRY.find((s) => s.id === "plane-b-zenodo-tip-pack");
  assert.equal(tipPack.plane, "B");
  assert.equal(tipPack.kind, "zenodo_doi");
  assert.equal(tipPack.status, "refused");
  assert.equal(tipPack.doi, null);
  assert.deepEqual(tipPack.refuse, [REFUSE.ZENODO_IP_BAN, REFUSE.NO_TIP_DOI]);
  assert.equal(claimShelfLive(tipPack).live, false);

  for (const p of PAPER_DEPOSITS) {
    assert.equal(p.tip_verified, false);
    assert.equal(p.reuse_as_plane_b, false);
    const judged = judgeZenodoTipReuse({ doi: p.doi });
    assert.equal(judged.reason, REFUSE.TIP_NOT_ON_DEPOSIT);
    assert.equal(judged.working_path, REFUSE.ZENODO_IP_BAN);
    assert.equal(judged.reuse_as_plane_b, false);
  }
  assert.equal(judgeZenodoTipReuse({}).status, "refused");
  assert.equal(judgeZenodoTipReuse({}).reason, REFUSE.ZENODO_IP_BAN);
  assert.equal(judgeZenodoTipReuse({}).also, REFUSE.NO_TIP_DOI);

  const usb = SHELF_REGISTRY.find((s) => s.id === "plane-c-usb-airgap");
  assert.equal(usb.plane, "C");
  assert.equal(usb.status, "slot");
  assert.equal(usb.primary, true);
  assert.equal(usb.refuse, REFUSE.OPERATOR_ATTEST);
  assert.match(usb.attest, /CNS-OPERATOR-ATTEST/);
  assert.match(usb.reason, /offline-verify/);
  assert.equal(usb.restore_drill_spec, RESTORE_DRILL_SPEC);
  assert.match(usb.restore_drill, /RESTORE-DRILL/);

  const forge = SHELF_REGISTRY.find((s) => s.id === "plane-c-forge-off-github");
  assert.equal(forge.status, "slot");
  assert.equal(forge.url, null);
  assert.equal(forge.refuse, REFUSE.NO_FORGE);

  const ipfs = SHELF_REGISTRY.find((s) => s.kind === "ipfs_cid");
  assert.equal(ipfs.status, "slot");
  assert.equal(ipfs.cid, null);

  const radii = independentLiveBlastRadii();
  assert.deepEqual(radii, ["cf-github"]);
  assert.equal(independentRequirementMet(), false);
  assert.ok(radii.length < MIN_INDEPENDENT_SHELVES);
  assert.equal(LOCKSET.zenodo, null);
  assert.equal(LOCKSET.doi, null);
  assert.ok(liveShelves().length >= 1);
  assert.ok(slotShelves().length >= 3);
  assert.ok(refusedShelves().some((s) => s.id === "plane-b-zenodo-tip-pack"));
  assert.ok(refusedShelves().some((s) => s.id === "plane-b-gitflic-ru-tip-pack"));
  assert.ok(slotShelves().some((s) => s.id === "plane-b-framagit-tip-pack"));
  assert.ok(!slotShelves().some((s) => s.id === "plane-b-gitflic-ru-tip-pack"));

  const reg = shelfRegistryDoc();
  assert.equal(reg.planes.A.status, "live");
  assert.equal(reg.planes.B.status, "slot");
  assert.equal(reg.planes.B.doi, null);
  assert.equal(reg.planes.B.name, "alternate independent forge/archive tip-pack");
  assert.equal(reg.planes.B.zenodo_working_path, false);
  assert.equal(reg.planes.B.live_ready, false);
  assert.equal(reg.planes.B.refuse, REFUSE.ZENODO_IP_BAN);
  assert.match(reg.planes.B.note, /Codeberg \+ archive\.org hash-verify PASS \(still SLOT\)/);
  assert.match(reg.planes.B.note, /Framagit/);
  assert.match(reg.planes.B.note, /CNS-GITFLIC-EMAIL/);
  assert.match(reg.planes.B.note, /CNS-GITLAB-CF-LOOP/);
  assert.match(reg.planes.B.note, /CNS-ZENODO-IP-BAN/);
  assert.deepEqual(reg.planes.B.working_targets, ["codeberg", "archive.org", "framagit"]);
  assert.equal(reg.planes.B.working_targets.filter((t) => t === "archive.org").length, 1);
  assert.equal(reg.planes.B.live_ready, false);
  assert.match(reg.planes.B.note, /aziel-lockset-tip_202609/);
  assert.match(reg.planes.B.note, /same blast_radius/);
  assert.ok(reg.slot.includes("plane-b-archive-org-tip-pack"));
  assert.ok(reg.slot.includes("plane-b-archive-org-tip-pack-202609"));
  assert.ok(!reg.live.includes("plane-b-archive-org-tip-pack-202609"));
  const iaUrls = JSON.stringify(reg.shelves);
  assert.match(iaUrls, /https:\/\/archive\.org\/details\/aziel-lockset-tip"/);
  assert.match(iaUrls, /https:\/\/archive\.org\/details\/aziel-lockset-tip_202609/);
  assert.ok(!reg.note.includes("3 independent LIVE"));
  assert.doesNotMatch(reg.note, /Plane B is LIVE/);
  assert.doesNotMatch(reg.planes.B.note, /GitFlic RU unverified/);
  assert.equal(reg.planes.C.status, "slot");
  assert.ok(reg.planes.C.refuse.includes(REFUSE.OPERATOR_ATTEST));
  assert.match(reg.planes.C.attest, /CNS-OPERATOR-ATTEST/);
  assert.equal(reg.planes.C.restore_drill_spec, RESTORE_DRILL_SPEC);
  assert.equal(reg.growth_on, true);
  assert.equal(reg.fielded_100, false);
  assert.equal(reg.operator_preempt, "80-95");
  assert.match(reg.lamb_lens, /Lamb Lens/);
  assert.match(reg.note, /Lamb Lens/);
  assert.equal(reg.lockset_doi, null);
  assert.equal(reg.published_surfaces, 5);
  assert.deepEqual(reg.family_blast_radii, ["cloudflare", "github"]);
  assert.deepEqual(reg.independent_live_blast_radii, ["cf-github"]);
  assert.equal(reg.independent_live_count, 1);
  assert.equal(reg.independent_requirement_met, false);
  assert.ok(reg.refused.includes("plane-b-zenodo-tip-pack"));
  assert.ok(reg.refused.includes("plane-b-gitflic-ru-tip-pack"));
  assert.ok(reg.slot.includes("plane-b-framagit-tip-pack"));
  assert.ok(!reg.slot.includes("plane-b-gitflic-ru-tip-pack"));
  assert.doesNotMatch(reg.note, /B=Zenodo tip-pack SLOT/);
});

test("export → hash → verify roundtrip against published lockset tip", () => {
  assert.equal(LOCKSET_TIP, PUBLISHED_TIP);
  assert.equal(LOCKSET_TIP, hashPayload(LOCKSET));
  const yes = verifyPasteHash(LOCKSET_TIP);
  assert.equal(yes.yes, true);
  assert.equal(yes.match, "lockset");
  const no = verifyPasteHash("a".repeat(64));
  assert.equal(no.ok, true);
  assert.equal(no.yes, false);

  const core = locksetBytes();
  const coreHash = createHash("sha256").update(core).digest("hex");
  assert.equal(coreHash, LOCKSET_TIP);
  const fromBytes = verifyBytesHash(core);
  assert.equal(fromBytes.yes, true);

  const pack = exportPack({
    fileHashes: { "docs/lockset.json": createHash("sha256").update(locksetFile()).digest("hex") },
  });
  assert.equal(pack.lockset_tip, LOCKSET_TIP);
  assert.equal(pack.ingest_as_receipt.lockset_tip, LOCKSET_TIP);
  assert.equal(pack.spec, COLD_MULTI_SHELF_SPEC);
  assert.match(pack.lockset_file, /CROSS-NETWORK-SURVIVAL/);
  assert.match(pack.lockset_file, /NO-LIE \/ NO-REWRITE/);

  const live = buildExport();
  assert.ok(live.manifest.files["docs/CROSS-NETWORK-SURVIVAL-1.0.md"]);
  assert.ok(live.manifest.files["docs/NO-LIE-NO-REWRITE-1.0.md"]);
  assert.ok(live.manifest.files["docs/COLD-MULTI-SHELF-1.0.md"]);
  assert.ok(live.manifest.files["docs/FOLDLOCK-SHELF-1.0.md"]);
  assert.ok(live.manifest.files["docs/lockset.json"]);
  assert.equal(live.foldlock.slug, "foldlock");
  assert.equal(live.foldlock.zip, false);
  assert.equal(live.foldlock.encryption, false);
  assert.equal(live.foldlock.hook.fold_applied, false);
  assert.equal(live.lockset_tip, LOCKSET_TIP);
  for (const rel of CORE_DOC_PATHS) {
    const got = sha256File(join(repoRoot, rel));
    const row = verifyManifestEntry(rel, got, live.manifest);
    assert.equal(row.yes, true, rel);
  }
  const locksetFileHash = sha256File(join(repoRoot, "docs/lockset.json"));
  const viaFile = verifyFileAgainstPack(join(repoRoot, "docs/lockset.json"), live, "docs/lockset.json");
  assert.equal(viaFile.yes, true);
  assert.match(locksetFileHash, /^[0-9a-f]{64}$/);
  const mismatch = verifyManifestEntry("docs/lockset.json", "b".repeat(64), live.manifest);
  assert.equal(mismatch.yes, false);

  const airDir = join(repoRoot, "tools/cold_shelf/out/airgap-test");
  const air = writeAirgap(airDir, live);
  assert.equal(air.lockset_tip, LOCKSET_TIP);
  const sums = verifySha256Sums(airDir);
  assert.equal(sums.ok, true);
  assert.ok(sums.rows.some((r) => r.file === "lockset.json" && r.yes));
  const locksetYes = verifyFileAgainstPack(join(airDir, "lockset.json"), live, "docs/lockset.json");
  assert.equal(locksetYes.yes, true);
  assert.equal(verifyBytesHash(locksetBytes()).yes, true);

  const sumsCheck = spawnSync("sha256sum", ["-c", "SHA256SUMS"], { cwd: airDir, encoding: "utf8" });
  if (sumsCheck.error && sumsCheck.error.code === "ENOENT") {
    assert.equal(verifySha256Sums(airDir).ok, true);
  } else {
    assert.equal(sumsCheck.status, 0, sumsCheck.stderr || sumsCheck.stdout);
    assert.match(sumsCheck.stdout, /lockset\.json: OK/);
  }

  const cliHash = spawnSync("node", ["tools/cold_shelf/cli.mjs", "verify", "--hash", LOCKSET_TIP], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(cliHash.status, 0, cliHash.stderr);
  assert.match(cliHash.stdout, /"yes": true/);

  const cliFile = spawnSync("node", ["tools/cold_shelf/cli.mjs", "verify", "--file", "docs/lockset.json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(cliFile.status, 0, cliFile.stderr);
  assert.match(cliFile.stdout, /"yes": true/);

  const cliBad = spawnSync("node", ["tools/cold_shelf/cli.mjs", "verify", "--hash", "a".repeat(64)], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(cliBad.status, 2);
  assert.match(cliBad.stdout, /"yes": false/);
});

test("refuse invented PHY/DNS/ICANN, neighbor-vote heal, Cap-7/AZ-GEN overclaim", () => {
  assert.equal(judgeInventedPhyDnsIcann({ invent_phy: true }).reason, REFUSE.INVENTED_PHY);
  assert.equal(judgeInventedPhyDnsIcann({ invent_dns: true }).reason, REFUSE.INVENTED_DNS);
  assert.equal(judgeInventedPhyDnsIcann({ invent_icann: true }).reason, REFUSE.INVENTED_ICANN);
  assert.equal(judgeInventedPhyDnsIcann({ claim_live_icann: true }).accept, false);
  assert.equal(judgeInventedPhyDnsIcann({}).accept, true);

  const vote = judgeNeighborVoteHeal({ neighbor_vote: true });
  assert.equal(vote.accept, false);
  assert.equal(vote.heal, false);
  assert.equal(vote.reason, REFUSE.NEIGHBOR_VOTE);
  const majority = judgeNeighborVoteHeal({ neighbor_majority: true });
  assert.equal(majority.reason, REFUSE.NEIGHBOR_VOTE);
  const quorum = judgeNeighborVoteHeal({ quorum_heal: true });
  assert.equal(quorum.reason, REFUSE.NEIGHBOR_VOTE);
  const lawful = judgeNeighborVoteHeal({ self_tip: true, trusted_pull: true });
  assert.equal(lawful.heal, true);
  assert.equal(lawful.action, "self-tip-trusted-pull");

  const az = judgeAzGenOverclaim({ live_icann_publish: true });
  assert.equal(az.accept, false);
  assert.equal(az.reason, REFUSE.AZ_GEN);
  assert.equal(az.cap7, REFUSE.CAP7);
  assert.match(az.note, /not this repo/);
  assert.equal(judgeAzGenOverclaim({ az_generator_live: true }).accept, false);
  assert.equal(judgeAzGenOverclaim({ cap7_publish: true }).accept, false);
  assert.equal(judgeAzGenOverclaim({}).this_repo_is_az_gen, false);
  assert.equal(judgeAzGenOverclaim({}).live_icann_publish, false);

  assert.equal(judgeInventedDeposit({ kind: "ipfs_cid", cid: "QmFakeNotReal" }).reason, REFUSE.NO_CID);
  assert.equal(judgeInventedDeposit({ kind: "ipfs_cid" }).status, "slot");
  assert.equal(judgeInventedDeposit({ kind: "archive_org", url: "https://archive.org/details/fake" }).reason, REFUSE.NO_WARC);
  assert.equal(judgeInventedDeposit({ kind: "archive_org", url: ARCHIVE_ORG_TIP_PACK.url }).accept, true);
  assert.equal(judgeInventedDeposit({ kind: "archive_org", identifier: ARCHIVE_ORG_TIP_PACK.identifier }).accept, true);
  assert.equal(judgeInventedDeposit({ kind: "archive_org", download_base: ARCHIVE_ORG_TIP_PACK.download_base }).accept, true);
  assert.equal(judgeInventedDeposit({ kind: "archive_org", url: ARCHIVE_ORG_TIP_PACK_202609.url }).accept, true);
  assert.equal(judgeInventedDeposit({ kind: "archive_org", identifier: ARCHIVE_ORG_TIP_PACK_202609.identifier }).accept, true);
  assert.equal(judgeInventedDeposit({ kind: "archive_org", zip: ARCHIVE_ORG_TIP_PACK_202609.zip }).accept, true);
  assert.equal(judgeInventedDeposit({ kind: "archive_org", invent_url: true, url: ARCHIVE_ORG_TIP_PACK.url }).reason, REFUSE.NO_WARC);
  assert.equal(judgeInventedDeposit({ kind: "archive_org", invent_url: true, url: ARCHIVE_ORG_TIP_PACK_202609.url }).reason, REFUSE.NO_WARC);
  const iaRefs = listedArchiveOrgRefs();
  assert.equal(iaRefs.has(ARCHIVE_ORG_TIP_PACK.url), true);
  assert.equal(iaRefs.has(ARCHIVE_ORG_TIP_PACK_202609.url), true);
  assert.equal(judgeInventedDeposit({ kind: "zenodo_doi", doi: "10.5281/zenodo.99999999" }).reason, REFUSE.FAKE_DEPOSIT);
  assert.equal(judgeInventedDeposit({ kind: "zenodo_doi", doi: "10.5281/zenodo.21435707" }).reason, REFUSE.TIP_NOT_ON_DEPOSIT);
  assert.equal(judgeInventedDeposit({ kind: "zenodo_doi" }).status, "refused");
  assert.equal(judgeInventedDeposit({ kind: "zenodo_doi" }).reason, REFUSE.ZENODO_IP_BAN);
  assert.equal(judgeInventedDeposit({ kind: "git_mirror", plane: "C", url: "https://codeberg.org/fake/aziel" }).reason, REFUSE.NO_FORGE);
  assert.equal(judgeInventedDeposit({ kind: "git_mirror", plane: "B", url: "https://codeberg.org/fake/aziel" }).reason, REFUSE.NO_FORGE);
  assert.equal(judgeInventedDeposit({ kind: "git_mirror", plane: "B", invent_url: true }).reason, REFUSE.NO_FORGE);
  assert.equal(judgeInventedDeposit({ kind: "git_mirror", plane: "B", url: CODEBERG_TIP_PACK.url }).accept, true);
  assert.equal(judgeInventedDeposit({ kind: "git_mirror", plane: "B", url: "https://framagit.org/fake/aziel" }).reason, REFUSE.NO_FORGE);
  assert.equal(judgeInventedDeposit({ kind: "git_mirror", plane: "G", invent_url: true }).reason, REFUSE.NO_FORGE);
  assert.equal(judgeInventedDeposit({ kind: "other", plane: "F", url: "https://osf.io/fake" }).reason, REFUSE.NO_FORGE);
  assert.equal(judgeInventedDeposit({ kind: "not-a-kind" }).reason, REFUSE.UNKNOWN_KIND);
  assert.equal(judgeTrainingResidueShelf({ training_residue: true }).reason, REFUSE.TRAINING_RUMOR);
  assert.equal(judgeTrainingResidueShelf({ weights: true }).rumor, true);
});

test("public /shelves JSON cites CNS + NO-LIE; no 15:20 chrome; Growth-ON intact", async () => {
  assert.equal(isShelvesPath("/shelves"), true);
  assert.equal(isShelvesPath("/cold-copy"), true);
  assert.equal(isShelvesPath("/v1/shelves"), true);
  assert.equal(isShelvesPath("/v1/cold-copy"), true);
  assert.equal(isShelvesPath("/v1/mesh"), false);

  const doc = shelvesDoc();
  assert.equal(doc.spec, COLD_MULTI_SHELF_SPEC);
  assert.equal(doc.author, "Aziel Eliab");
  assert.equal(doc.identity, "Aziel Eliab");
  assert.equal(doc.cross_network_survival, "CROSS-NETWORK-SURVIVAL");
  assert.equal(doc.no_lie_spec, "NO-LIE-NO-REWRITE-1.0");
  assert.equal(doc.lockset_tip, LOCKSET_TIP);
  assert.equal(doc.registry.growth_on, true);
  assert.equal(doc.registry.softwares_tab, false);
  assert.equal(doc.registry.mesh_radio, false);
  assert.equal(doc.registry.az_gen_live_icann_publish, false);
  assert.equal(doc.foldlock.slug, "foldlock");
  assert.equal(doc.foldlock.hook_status, "slot");
  assert.equal(doc.foldlock.zip, false);
  assert.equal(doc.foldlock.encryption, false);
  assert.equal(doc.cap7.spec, "CAP-7-BRIDGE-CITE-1.0");
  assert.equal(doc.cap7.design_of_only, true);
  assert.equal(doc.cap7.resolves_to_hub, false);
  assert.equal(doc.cap7.bridge, "https://www.azielcorpuslibrary.net/bridge.json");
  assert.equal(doc.cap7.sites.azcorpus.design_of, "https://www.azielcorpuslibrary.net/");
  assert.equal(doc.cap7.sites.azcorpus.resolves_to_hub, false);
  assert.equal(doc.cap7.sites.azeliab.design_of, "https://www.azieleliab.com/");
  assert.equal(doc.cap7.sites.godlock.design_of, "https://godlock.uk/");
  assert.equal(doc.cap7.sites.hedidntjump.design_of, "https://www.hedidntjump.com/");
  assert.equal(doc.cap7_sites.azlibrary.design_of, "https://www.azielcorpuslibrary.net/");
  assert.equal(doc.cap7_sites.azlibrary.resolves_to_hub, false);
  assert.equal(doc.resolves_to_hub, false);
  assert.equal(doc.fifth_product, false);
  assert.match(doc.cap7.note, /design_of the four hubs/);
  assert.match(shelvesLlmsBlock(), /resolves_to_hub: false/);
  assert.match(doc.registry.note, /FoldLock/);
  assert.equal(doc.registry.lockset_doi, null);
  assert.equal(doc.planes.A.status, "live");
  assert.equal(doc.planes.B.status, "slot");
  assert.equal(doc.planes.B.doi, null);
  assert.equal(doc.planes.B.zenodo_working_path, false);
  assert.equal(doc.planes.C.status, "slot");
  assert.equal(doc.runtime_launch.sot.git, "6a3798a");
  assert.equal(doc.runtime_launch.sot.version_id, "105fa1ee");
  assert.equal(doc.runtime_launch.shelves.plane_b_live, false);
  assert.equal(doc.runtime_launch.shelves.plane_b_refuse, "CNS-NO-FORGE-MIRROR");
  assert.equal(doc.runtime_launch.shelves.plane_c_refuse, "CNS-OPERATOR-ATTEST");
  assert.equal(doc.runtime_launch.fielded_100, false);
  assert.equal(doc.registry.runtime_launch.shelves.plane_b_live, false);
  assert.equal(doc.planes.B.status, "slot");
  assert.equal(doc.planes.C.status, "slot");
  assert.match(shelvesLlmsBlock(), /does not flip Plane B or Plane C/);
  assert.equal(doc.registry.published_surfaces, 5);
  assert.equal(doc.registry.independent_live_count, 1);
  assert.equal(doc.planes.B.status, "slot");
  assert.equal(doc.planes.B.live_ready, false);
  assert.match(doc.registry.note, /CNS-ZENODO-IP-BAN/);
  assert.match(doc.registry.note, /aziel-lockset-tip_202609/);
  assert.doesNotMatch(shelvesLlmsBlock(), /CNS-ZENODO-IP-BAN/);
  assert.doesNotMatch(shelvesLlmsBlock(), /CNS-GITFLIC-EMAIL/);
  assert.doesNotMatch(shelvesLlmsBlock(), /CNS-GITLAB-CF-LOOP/);
  assert.match(shelvesLlmsBlock(), /Codeberg \/ archive\.org \/ Framagit/);
  assert.match(shelvesLlmsBlock(), /aziel-lockset-tip_202609/);
  assert.match(shelvesLlmsBlock(), /same blast_radius/);
  assert.doesNotMatch(shelvesLlmsBlock(), /B = Zenodo tip-pack SLOT/);
  assert.match(doc.registry.note, /CROSS-NETWORK-SURVIVAL/);
  assert.match(doc.registry.note, /NO-LIE/);
  assert.match(doc.registry.note, /Lamb Lens/);
  assert.match(doc.registry.lamb_lens, /Lamb Lens/);
  assert.equal(doc.registry.growth_on, true);
  assert.equal(doc.registry.fielded_100, false);
  assert.equal(doc.registry.operator_preempt, "80-95");
  assert.match(shelvesLlmsBlock(), /RESTORE-DRILL/);
  assert.match(shelvesLlmsBlock(), /Lamb Lens/);
  assert.doesNotMatch(JSON.stringify(doc.verify), VISIBLE_1520);
  assert.doesNotMatch(JSON.stringify(doc.verify) + shelvesLlmsBlock(), VISIBLE_1520);
  assert.doesNotMatch(JSON.stringify(doc.verify), BANNED_IDENTITY);

  const cite = citeDoc();
  assert.equal(cite.cold_multi_shelf, COLD_MULTI_SHELF_SPEC);
  assert.doesNotMatch(JSON.stringify(cite), CRAWL_NO_TIP_DOI);
  assert.match(cite.shelves, /\/shelves$/);
  assert.match(cite.cold_copy, /\/cold-copy$/);
  assert.ok(cite.archive_org_tip_packs.includes("https://archive.org/details/aziel-lockset-tip"));
  assert.ok(cite.archive_org_tip_packs.includes("https://archive.org/details/aziel-lockset-tip_202609"));
  assert.equal(cite.cross_network_survival, "CROSS-NETWORK-SURVIVAL");
  assert.equal(cite.no_lie_spec, "NO-LIE-NO-REWRITE-1.0");

  const llms = llmsDoc("LIMIT");
  assert.doesNotMatch(llms, CRAWL_NO_TIP_DOI);
  assert.match(llms, /COLD-MULTI-SHELF-1\.0/);
  assert.match(llms, /Plane A/);
  assert.match(llms, /\/shelves/);
  assert.match(llms, /aziel-lockset-tip_202609/);
  assert.match(llms, /CROSS-NETWORK-SURVIVAL/);
  assert.match(llms, /NO-LIE \/ NO-REWRITE/);
  assert.doesNotMatch(shelvesLlmsBlock(), VISIBLE_1520);

  const ai = aiTxt("LIMIT");
  assert.doesNotMatch(ai, CRAWL_NO_TIP_DOI);
  assert.match(ai, /COLD-MULTI-SHELF-1\.0/);
  assert.match(ai, /User-agent: GPTBot\nAllow: \//);
  assert.match(ai, /Allow: \/shelves/);

  const robots = robotsTxt();
  assert.match(robots, /Allow: \/shelves/);
  assert.match(robots, /Allow: \/cold-copy/);
  assert.match(robots, /User-agent: GPTBot\nAllow: \//);
  assert.match(robots, /ai-input=yes, ai-train=yes/);

  const xml = await sitemapXml({});
  assert.match(xml, /\/shelves</);
  assert.match(xml, /\/cold-copy</);

  const fields = shelvesCiteFields();
  assert.equal(fields.cold_multi_shelf, COLD_MULTI_SHELF_SPEC);
  assert.deepEqual(fields.archive_org_tip_packs, [
    ARCHIVE_ORG_TIP_PACK.url,
    ARCHIVE_ORG_TIP_PACK_202609.url,
  ]);
  assert.equal(matchPublishedTip(LOCKSET_TIP).yes, true);
  assert.deepEqual(hashManifestFromMap({ "docs/lockset.json": LOCKSET_TIP }).files["docs/lockset.json"], LOCKSET_TIP);

  const law = readFileSync(join(repoRoot, "docs/COLD-MULTI-SHELF-1.0.md"), "utf8");
  assert.match(law, /CROSS-NETWORK-SURVIVAL/);
  assert.match(law, /NO-LIE-NO-REWRITE/);
  assert.match(law, /Plane A/);
  assert.match(law, /Plane B/);
  assert.match(law, /Plane C/);
  assert.match(law, /RESTORE-DRILL/);
  assert.match(law, /Framagit/);
  assert.match(law, /aziel-lockset-tip_202609/);
  assert.match(law, /Same blast_radius/);
  assert.doesNotMatch(law, VISIBLE_1520);
  assert.doesNotMatch(JSON.stringify(doc), VISIBLE_1520);
  assert.doesNotMatch(law, /live ICANN publish claimed/i);
  assert.doesNotMatch(locksetFile(), CRAWL_NO_TIP_DOI);
  for (const rel of CORE_DOC_PATHS) {
    const text = readFileSync(join(repoRoot, rel), "utf8");
    assert.doesNotMatch(text, CRAWL_NO_TIP_DOI, rel);
  }
  const reg = shelfRegistryDoc();
  assert.equal(reg.mesh_radio, false);
  assert.ok(reg.paper_deposits.every((p) => p.tip_verified === false));
  assert.ok(JSON.stringify(doc.registry.paper_deposits).includes("10.5281/zenodo"));
});

test("extra E/F/G tip-pack SLOTs stay url-null; not required for Plane B LIVE", () => {
  assert.deepEqual(EXTRA_PLANES, ["E", "F", "G"]);
  assert.equal(EXTRA_TIP_PACK_TARGETS.length, 3);
  assert.equal(TIP_PACK_EXPECT.pack_sha256, CODEBERG_TIP_PACK.pack_sha256);
  assert.equal(TIP_PACK_EXPECT.lockset_tip, CODEBERG_TIP_PACK.lockset_tip);
  assert.equal(TIP_PACK_EXPECT.pack_sha256, "b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37");
  assert.equal(TIP_PACK_EXPECT.lockset_tip, "c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245");

  const extras = extraTipPackRows();
  assert.equal(extras.length, 3);
  const byId = Object.fromEntries(extras.map((s) => [s.id, s]));
  assert.equal(byId["plane-d-framagit-tip-pack"], undefined);
  assert.ok(byId["plane-e-launchpad-tip-pack"]);
  assert.ok(byId["plane-f-osf-africarxiv-tip-pack"]);
  assert.ok(byId["plane-g-gitlab-tip-pack"]);
  for (const s of extras) {
    assert.equal(s.status, "slot", s.id);
    assert.equal(s.url, null, s.id);
    assert.equal(s.required_for_plane_b_live, false, s.id);
    assert.equal(s.extra_slot, true, s.id);
    assert.equal(s.expect_pack_sha256, TIP_PACK_EXPECT.pack_sha256, s.id);
    assert.equal(s.expect_lockset_tip, TIP_PACK_EXPECT.lockset_tip, s.id);
    assert.equal(s.hash_verify, null, s.id);
    assert.equal(claimShelfLive(s).live, false, s.id);
    assert.ok(EXTRA_PLANES.includes(s.plane), s.id);
  }
  assert.equal(byId["plane-e-launchpad-tip-pack"].refuse, REFUSE.NO_FORGE);
  assert.equal(byId["plane-f-osf-africarxiv-tip-pack"].kind, "other");
  assert.equal(byId["plane-f-osf-africarxiv-tip-pack"].refuse, REFUSE.NO_FORGE);
  assert.equal(byId["plane-g-gitlab-tip-pack"].kind, "git_mirror");
  assert.equal(byId["plane-g-gitlab-tip-pack"].refuse, REFUSE.GITLAB_CF_LOOP);
  assert.equal(REFUSE.GITLAB_CF_LOOP, "CNS-GITLAB-CF-LOOP");
  assert.match(byId["plane-g-gitlab-tip-pack"].reason, /Cloudflare-loop/);

  const framagit = SHELF_REGISTRY.find((s) => s.id === "plane-b-framagit-tip-pack");
  const codeberg = SHELF_REGISTRY.find((s) => s.id === "plane-b-codeberg-tip-pack");
  const archiveOrg = SHELF_REGISTRY.find((s) => s.id === "plane-b-archive-org-tip-pack");
  const archiveOrg202609 = SHELF_REGISTRY.find((s) => s.id === "plane-b-archive-org-tip-pack-202609");
  const gitflic = SHELF_REGISTRY.find((s) => s.id === "plane-b-gitflic-ru-tip-pack");
  assert.equal(codeberg.hash_verify, "pass");
  assert.equal(archiveOrg.hash_verify, "pass");
  assert.equal(archiveOrg202609.hash_verify, "pass");
  assert.equal(archiveOrg202609.independent, false);
  assert.equal(framagit.url, null);
  assert.equal(framagit.required_for_plane_b_live, true);
  assert.equal(gitflic.status, "refused");
  assert.equal(gitflic.refuse, REFUSE.GITFLIC_EMAIL);
  assert.equal(planeBLiveReady(), false);
  assert.equal(judgePlaneBFromExtras({ extras_make_plane_b_live: true }).reason, REFUSE.PLANE_B_ALL_TARGETS);
  assert.equal(judgePlaneBFromExtras({ expand_plane_b_live_rule: true }).accept, false);
  assert.equal(judgePlaneBFromExtras({}).extras_required, false);
  assert.equal(judgeFielded100({ claim_100: true }).reason, REFUSE.NO_FIELD_100);
  assert.equal(judgeFielded100({}).fielded_100, false);
  assert.equal(judgeFielded100({}).operator_preempt, "80-95");

  const reg = shelfRegistryDoc();
  assert.equal(reg.planes.D, undefined);
  assert.equal(reg.planes.E.url, null);
  assert.equal(reg.planes.F.required_for_plane_b_live, false);
  assert.equal(reg.planes.G.refuse, REFUSE.GITLAB_CF_LOOP);
  assert.deepEqual(reg.extra_tip_pack_slots, extras.map((s) => s.id));
  assert.ok(!reg.slot.includes("plane-d-framagit-tip-pack"));
  assert.ok(reg.slot.includes("plane-e-launchpad-tip-pack"));
  assert.ok(reg.slot.includes("plane-g-gitlab-tip-pack"));
  assert.ok(reg.slot.includes("plane-b-framagit-tip-pack"));
  assert.equal(reg.published_surfaces, 5);
  assert.deepEqual(reg.family_blast_radii, ["cloudflare", "github"]);
});

test("RESTORE-DRILL emits attest schema from Plane C bytes+prev-hash; NO-FAN", () => {
  assert.equal(RESTORE_DRILL_SPEC, "RESTORE-DRILL-1.0");
  assert.match(LAMB_LENS_CITE, /Lamb Lens/);
  const schema = restoreDrillReceiptSchema();
  assert.equal(schema.spec, RESTORE_DRILL_SPEC);
  assert.equal(schema.status, "slot");
  assert.equal(schema.no_fan, true);
  assert.equal(schema.live, false);
  assert.equal(schema.source, "plane-c-bytes-plus-prev-hash");
  assert.equal(schema.not_source, "index");
  assert.equal(schema.expect_pack_sha256, TIP_PACK_EXPECT.pack_sha256);
  assert.equal(schema.expect_lockset_tip, TIP_PACK_EXPECT.lockset_tip);
  assert.ok(schema.fields.hash);
  assert.ok(schema.fields.action);
  assert.ok(schema.fields.output);
  assert.ok(schema.fields.metadata);
  assert.ok(schema.fields.previous_hash);
  assert.match(schema.lamb_lens, /Lamb Lens/);
  assert.ok(schema.cites.includes("CROSS-NETWORK-SURVIVAL-1.0"));
  assert.ok(schema.cites.includes("NO-LIE-NO-REWRITE-1.0"));

  const emit = emitRestoreDrillReceipt();
  assert.equal(emit.accept, true);
  assert.equal(emit.action, "emit-schema");
  assert.equal(emit.live, false);
  assert.equal(emit.receipt.spec, RESTORE_DRILL_SPEC);

  assert.equal(emitRestoreDrillReceipt({ from_index: true }).reason, REFUSE.TRAINING_RUMOR);
  assert.equal(emitRestoreDrillReceipt({ invent_attest: true }).reason, REFUSE.FAKE_DEPOSIT);
  assert.equal(emitRestoreDrillReceipt({ mark_live: true }).also, REFUSE.OPERATOR_ATTEST);

  const cli = spawnSync("node", ["tools/cold_shelf/cli.mjs", "restore-drill"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /"spec": "RESTORE-DRILL-1.0"/);
  assert.match(cli.stdout, /"action": "emit-schema"/);
  assert.match(cli.stdout, /plane-c-bytes-plus-prev-hash/);

  const fan = spawnSync("node", ["tools/cold_shelf/cli.mjs", "restore-drill", "--invent-attest"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(fan.status, 2);
  assert.match(fan.stdout, /CNS-NO-FAN-FAKE-DEPOSIT/);

  const idx = spawnSync("node", ["tools/cold_shelf/cli.mjs", "restore-drill", "--from-index"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(idx.status, 2);
  assert.match(idx.stdout, /CNS-TRAINING-RESIDUE-RUMOR/);

  const drill = readFileSync(join(repoRoot, "tools/cold_shelf/RESTORE-DRILL.md"), "utf8");
  assert.match(drill, /previous_hash/);
  assert.match(drill, /NO-FAN/);
  assert.doesNotMatch(drill, CRAWL_NO_TIP_DOI);
  const spec = readFileSync(join(repoRoot, "docs/RESTORE-DRILL-1.0.md"), "utf8");
  assert.match(spec, /CROSS-NETWORK-SURVIVAL/);
  assert.match(spec, /NO-LIE-NO-REWRITE/);
  assert.match(spec, /Lamb Lens/);
  assert.doesNotMatch(spec, VISIBLE_1520);
});
