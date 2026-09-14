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
  independentLiveBlastRadii,
  independentRequirementMet,
  isShelvesPath,
  isShelfKind,
  judgeAzGenOverclaim,
  judgeInventedDeposit,
  judgeInventedPhyDnsIcann,
  judgeNeighborVoteHeal,
  judgePlaneAMirrors,
  judgeTrainingResidueShelf,
  judgeZenodoTipReuse,
  liveShelves,
  planeRows,
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

test("COLD-MULTI-SHELF planes A/B/C: one LIVE tunnel, Zenodo SLOT, no invented tip DOI", () => {
  assert.equal(COLD_MULTI_SHELF_SPEC, "COLD-MULTI-SHELF-1.0");
  assert.equal(COLD_MULTI_SHELF_RULE, INGEST_COLD_RULE);
  assert.match(COLD_MULTI_SHELF_RULE, /Planes A\/B\/C/);
  assert.match(COLD_MULTI_SHELF_RULE, /LIVE only after hash verify/);
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

  const tipPack = SHELF_REGISTRY.find((s) => s.id === "plane-b-zenodo-tip-pack");
  assert.equal(tipPack.plane, "B");
  assert.equal(tipPack.kind, "zenodo_doi");
  assert.equal(tipPack.status, "slot");
  assert.equal(tipPack.doi, null);
  assert.equal(tipPack.refuse, REFUSE.NO_TIP_DOI);
  assert.equal(claimShelfLive(tipPack).live, false);

  for (const p of PAPER_DEPOSITS) {
    assert.equal(p.tip_verified, false);
    assert.equal(p.reuse_as_plane_b, false);
    assert.equal(judgeZenodoTipReuse({ doi: p.doi }).reason, REFUSE.TIP_NOT_ON_DEPOSIT);
  }
  assert.equal(judgeZenodoTipReuse({}).status, "slot");

  const usb = SHELF_REGISTRY.find((s) => s.id === "plane-c-usb-airgap");
  assert.equal(usb.plane, "C");
  assert.equal(usb.status, "slot");
  assert.equal(usb.primary, true);
  assert.equal(usb.refuse, REFUSE.OPERATOR_ATTEST);

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

  const reg = shelfRegistryDoc();
  assert.equal(reg.planes.A.status, "live");
  assert.equal(reg.planes.B.status, "slot");
  assert.equal(reg.planes.B.doi, null);
  assert.equal(reg.planes.C.status, "slot");
  assert.equal(reg.lockset_doi, null);
  assert.equal(reg.independent_live_count, 1);
  assert.equal(reg.independent_requirement_met, false);
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
  assert.ok(live.manifest.files["docs/lockset.json"]);
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
  assert.equal(judgeInventedDeposit({ kind: "zenodo_doi", doi: "10.5281/zenodo.99999999" }).reason, REFUSE.FAKE_DEPOSIT);
  assert.equal(judgeInventedDeposit({ kind: "zenodo_doi", doi: "10.5281/zenodo.21435707" }).reason, REFUSE.TIP_NOT_ON_DEPOSIT);
  assert.equal(judgeInventedDeposit({ kind: "zenodo_doi" }).status, "slot");
  assert.equal(judgeInventedDeposit({ kind: "git_mirror", plane: "C", url: "https://codeberg.org/fake/aziel" }).reason, REFUSE.NO_FORGE);
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
  assert.equal(doc.registry.lockset_doi, null);
  assert.equal(doc.planes.A.status, "live");
  assert.equal(doc.planes.B.status, "slot");
  assert.equal(doc.planes.B.doi, null);
  assert.equal(doc.planes.C.status, "slot");
  assert.match(doc.registry.note, /CROSS-NETWORK-SURVIVAL/);
  assert.match(doc.registry.note, /NO-LIE/);
  assert.doesNotMatch(JSON.stringify(doc.verify), VISIBLE_1520);
  assert.doesNotMatch(JSON.stringify(doc.verify) + shelvesLlmsBlock(), VISIBLE_1520);
  assert.doesNotMatch(JSON.stringify(doc.verify), BANNED_IDENTITY);

  const cite = citeDoc();
  assert.equal(cite.cold_multi_shelf, COLD_MULTI_SHELF_SPEC);
  assert.doesNotMatch(JSON.stringify(cite), CRAWL_NO_TIP_DOI);
  assert.match(cite.shelves, /\/shelves$/);
  assert.match(cite.cold_copy, /\/cold-copy$/);
  assert.equal(cite.cross_network_survival, "CROSS-NETWORK-SURVIVAL");
  assert.equal(cite.no_lie_spec, "NO-LIE-NO-REWRITE-1.0");

  const llms = llmsDoc("LIMIT");
  assert.doesNotMatch(llms, CRAWL_NO_TIP_DOI);
  assert.match(llms, /COLD-MULTI-SHELF-1\.0/);
  assert.match(llms, /Plane A/);
  assert.match(llms, /\/shelves/);
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
  assert.equal(matchPublishedTip(LOCKSET_TIP).yes, true);
  assert.deepEqual(hashManifestFromMap({ "docs/lockset.json": LOCKSET_TIP }).files["docs/lockset.json"], LOCKSET_TIP);

  const law = readFileSync(join(repoRoot, "docs/COLD-MULTI-SHELF-1.0.md"), "utf8");
  assert.match(law, /CROSS-NETWORK-SURVIVAL/);
  assert.match(law, /NO-LIE-NO-REWRITE/);
  assert.match(law, /Plane A/);
  assert.match(law, /Plane B/);
  assert.match(law, /Plane C/);
  assert.doesNotMatch(law, VISIBLE_1520);
  assert.doesNotMatch(JSON.stringify(doc), VISIBLE_1520);
  assert.doesNotMatch(law, /live ICANN publish claimed/i);
  assert.doesNotMatch(locksetFile(), CRAWL_NO_TIP_DOI);
  for (const rel of CORE_DOC_PATHS) {
    const text = readFileSync(join(repoRoot, rel), "utf8");
    assert.doesNotMatch(text, CRAWL_NO_TIP_DOI, rel);
    assert.doesNotMatch(text, VISIBLE_1520, rel);
  }
  const reg = shelfRegistryDoc();
  assert.equal(reg.mesh_radio, false);
  assert.ok(reg.paper_deposits.every((p) => p.tip_verified === false));
  assert.ok(JSON.stringify(doc.registry.paper_deposits).includes("10.5281/zenodo"));
});
