import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  COLD_MULTI_SHELF_SPEC,
  CORE_DOC_PATHS,
  LOCKSET_TIP,
  MIN_INDEPENDENT_SHELVES,
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
  judgeTrainingResidueShelf,
  liveShelves,
  shelfRegistryDoc,
  shelvesCiteFields,
  shelvesDoc,
  shelvesLlmsBlock,
  slotShelves,
  verifyBytesHash,
  verifyManifestEntry,
  verifyPasteHash,
} from "./cold-shelf.js";
import { LOCKSET, locksetBytes, locksetFile, matchPublishedTip } from "./ingest-receipt.js";
import { citeDoc, llmsDoc, aiTxt, robotsTxt, sitemapXml } from "./crawl.js";
import { hashPayload } from "./ledger.js";
import { buildExport, sha256File, verifyFileAgainstPack } from "../../../tools/cold_shelf/index.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const VISIBLE_1520 = /15:20/;
const BANNED_IDENTITY = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)/i;

test("COLD-MULTI-SHELF registry is honest: kinds, live vs slot, no invented CID", () => {
  assert.equal(COLD_MULTI_SHELF_SPEC, "COLD-MULTI-SHELF-1.0");
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
    assert.equal(s.author || "Aziel Eliab", "Aziel Eliab");
  }
  const git = SHELF_REGISTRY.find((s) => s.id === "git-aziel-corpus");
  assert.equal(git.status, "live");
  assert.equal(git.kind, "git_mirror");
  assert.ok(git.tags.some((t) => t.name === "v2.6.2"));

  const zenodo = SHELF_REGISTRY.filter((s) => s.kind === "zenodo_doi");
  assert.ok(zenodo.length >= 4);
  for (const z of zenodo) {
    assert.equal(z.status, "live");
    assert.equal(z.lockset_doi, false);
    assert.match(z.doi, /^10\.5281\/zenodo\.\d+$/);
    assert.match(z.verify, /doi\.org 302/);
  }

  const ipfs = SHELF_REGISTRY.find((s) => s.kind === "ipfs_cid");
  assert.equal(ipfs.status, "slot");
  assert.equal(ipfs.cid, null);
  assert.equal(ipfs.refuse, REFUSE.NO_CID);
  assert.equal(claimShelfLive(ipfs).live, false);

  const warc = SHELF_REGISTRY.find((s) => s.kind === "archive_org");
  assert.equal(warc.status, "slot");
  assert.equal(warc.refuse, REFUSE.NO_WARC);

  const usb = SHELF_REGISTRY.find((s) => s.kind === "usb_airgap");
  assert.equal(usb.status, "slot");
  assert.equal(usb.refuse, REFUSE.OPERATOR_ATTEST);

  const cf = SHELF_REGISTRY.find((s) => s.id === "cf-azielcorpuslibrary");
  assert.equal(cf.status, "live");
  assert.equal(cf.independent, false);
  assert.equal(cf.blast_radius, "cloudflare");

  const radii = independentLiveBlastRadii();
  assert.ok(radii.includes("github-org-AzielEliab"));
  assert.ok(radii.includes("zenodo-cern"));
  assert.ok(!radii.includes("cloudflare"));
  assert.equal(independentRequirementMet(), radii.length >= MIN_INDEPENDENT_SHELVES);
  assert.equal(LOCKSET.zenodo, null);
  assert.equal(LOCKSET.doi, null);
  assert.ok(liveShelves().length >= 2);
  assert.ok(slotShelves().length >= 3);
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
  assert.match(doc.registry.note, /CROSS-NETWORK-SURVIVAL/);
  assert.match(doc.registry.note, /NO-LIE/);
  assert.doesNotMatch(JSON.stringify(doc.verify), VISIBLE_1520);
  assert.doesNotMatch(JSON.stringify(doc.verify) + shelvesLlmsBlock(), VISIBLE_1520);
  assert.doesNotMatch(JSON.stringify(doc.verify), BANNED_IDENTITY);

  const cite = citeDoc();
  assert.equal(cite.cold_multi_shelf, COLD_MULTI_SHELF_SPEC);
  assert.match(cite.shelves, /\/shelves$/);
  assert.match(cite.cold_copy, /\/cold-copy$/);
  assert.equal(cite.cross_network_survival, "CROSS-NETWORK-SURVIVAL");
  assert.equal(cite.no_lie_spec, "NO-LIE-NO-REWRITE-1.0");

  const llms = llmsDoc("LIMIT");
  assert.match(llms, /COLD-MULTI-SHELF-1\.0/);
  assert.match(llms, /\/shelves/);
  assert.match(llms, /CROSS-NETWORK-SURVIVAL/);
  assert.match(llms, /NO-LIE \/ NO-REWRITE/);
  assert.doesNotMatch(shelvesLlmsBlock(), VISIBLE_1520);

  const ai = aiTxt("LIMIT");
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
  assert.doesNotMatch(law, VISIBLE_1520);
  assert.doesNotMatch(JSON.stringify(doc), VISIBLE_1520);
  assert.doesNotMatch(law, /live ICANN publish claimed/i);
  const reg = shelfRegistryDoc();
  assert.equal(reg.mesh_radio, false);
});
