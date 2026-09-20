import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTHOR,
  COLD_COPY,
  COLD_COPY_SPEC,
  CROSS_NETWORK_SURVIVAL,
  CROSS_NETWORK_SURVIVAL_SPEC,
  DWELL_AFTER_VALID_CITE_S,
  REEXPAND,
  REEXPAND_ARCHIVE_SPEC,
  REEXPAND_SPEC,
  REHEAL,
  REHEAL_SPEC,
  EXAMPLE_BEARER,
  LIBRARY_SOURCE,
  MESH_BAD_BEARER,
  MESH_DISABLE_REFUSED,
  MESH_METHOD,
  MESH_NEED_BEARER,
  MESH_NOTE,
  MESH_OK,
  NO_LIE,
  NO_LIE_SPEC,
  QNS_CD,
  QNS_CD_SPEC,
  SPLIT_WIRES,
  SPLIT_WIRES_SPEC,
  collectDeclaredBearers,
  dataOutlivesCreators,
  destMeshPath,
  decorateMeshDoc,
  handleMeshApi,
  isFastTickEnvelope,
  isMeshEnabled,
  isMeshLibraryPath,
  isMeshRuntimePath,
  isMeshStatusReadPath,
  judgeColdReplicaAfterPull,
  judgeCrawlerNotResurrection,
  judgeEquivocation,
  judgePartitionEvent,
  judgeNoLie,
  judgeNoRewrite,
  judgePoison,
  judgeReexpandFromArchive,
  judgeSurvivalKit,
  judgeVerifyWithoutVoice,
  judgeRehealPoisonedNode,
  judgeSurvivalBytesHash,
  judgeUpdateProof,
  liveNodesCount,
  liveNodesLabel,
  liveSyncBodiesAllowed,
  mayEmitLast,
  mayUnsendUnverifiedBody,
  meshGrowsItselfFromIndex,
  networkNeverLies,
  oneTunnelIsKit,
  crawlersReexpand,
  neighborMajorityReheals,
  meshDisableRefuseDoc,
  meshOnDoc,
  meshRefreshScript,
  meshRefuseDoc,
  meshRefuseHttpStatus,
  meshStatusHtml,
  phoenixScope,
  planesMayShareSocket,
  proxyMeshRequest,
  publicWorkerIsCell,
  publicWorkerRollupKind,
  rewriteKeyExists,
  sanitizeBearer,
  serverPullWipesColdReplica,
  synthesizeMeshRefuse,
  trainingResidueIsRumor,
  vaultTransferKind,
} from "./mesh.js";
import { handleRuntimeApi } from "./runtime.js";
import { fallbackKind, handleRuntimeRoot, runtimeManifest, runtimeSkillMd } from "./runtime-root.js";
import { citeDoc, llmsDoc, mcpDiscovery, robotsTxt, sitemapXml } from "./crawl.js";
import { page } from "./ui.js";
import { shouldCountRuntimeUse } from "./runtime-uses.js";
import { headMeta } from "./seo.js";

const HOST = "https://www.azielcorpuslibrary.net";
const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;

function req(path, method = "GET", extra = {}) {
  return new Request(HOST + path, { method, ...extra });
}

test("mesh paths and dest mapping", () => {
  assert.equal(isMeshLibraryPath("/v1/mesh"), true);
  assert.equal(isMeshLibraryPath("/v1/mesh/nodes"), true);
  assert.equal(isMeshLibraryPath("/v1/lattice"), false);
  assert.equal(isMeshRuntimePath("/runtime/v1/mesh"), true);
  assert.equal(isMeshRuntimePath("/runtime/v1/mesh/status"), true);
  assert.equal(isMeshRuntimePath("/runtime/v1/health"), false);
  assert.equal(destMeshPath("/v1/mesh", ""), "/v1/mesh");
  assert.equal(destMeshPath("/runtime/v1/mesh/nodes", "?q=1"), "/v1/mesh/nodes?q=1");
  assert.equal(destMeshPath("/runtime/v1/health", ""), null);
  assert.equal(fallbackKind("/v1/mesh"), "mesh");
  assert.equal(fallbackKind("/v1/mesh/status"), "mesh");
  assert.equal(fallbackKind("/v1/mesh/nodes"), "mesh");
});

test("phoenix is wait/re-seal, not restore of a public hostname", () => {
  const refuse = meshRefuseDoc(MESH_DISABLE_REFUSED, "Public suite presence stays on.");
  assert.match(refuse.phoenix_lock, /re-seal after poison or isolation/);
  assert.match(refuse.phoenix_lock, /not restore public hostname/);
  assert.match(refuse.local_node_note, /not restore of a public \.uk/);
  assert.match(refuse.local_node_note, /does not climb back onto the public hostname/);
  assert.match(refuse.phoenix_lock, /local to failed node only/);
  assert.equal(phoenixScope(), "failed-node-only");
  assert.doesNotMatch(refuse.phoenix_lock, /bring (the )?\.?uk (node )?back/i);
  assert.doesNotMatch(refuse.local_node_note, /resume on the named fabric/i);
  assert.doesNotMatch(JSON.stringify(refuse), /mesh brings the public/i);
});

test("split-wires law: public Worker is counts/status, not the cell", () => {
  assert.equal(SPLIT_WIRES_SPEC, "MESH-SPLIT-WIRES-1.0");
  assert.equal(SPLIT_WIRES.spec, "MESH-SPLIT-WIRES-1.0");
  assert.equal(SPLIT_WIRES.public_worker_is_cell, false);
  assert.equal(SPLIT_WIRES.public_rollup, "counts-status");
  assert.equal(SPLIT_WIRES.live_sync_bodies, false);
  assert.equal(SPLIT_WIRES.die_with_pull, true);
  assert.equal(SPLIT_WIRES.unsend_unverified_body, false);
  assert.equal(SPLIT_WIRES.author, "Aziel Eliab");
  assert.equal(publicWorkerIsCell(), false);
  assert.equal(publicWorkerRollupKind(), "counts-status");
  assert.equal(mayUnsendUnverifiedBody(), false);
  assert.equal(mayEmitLast({ verified_locally: false }), false);
  assert.equal(mayEmitLast({ verified_locally: true }), true);
  assert.equal(isFastTickEnvelope({ presence: "live", tip_hash: "abc" }), true);
  assert.equal(isFastTickEnvelope({ presence: "live", tip_hash: "abc", body: "no" }), false);
  assert.equal(isFastTickEnvelope({ presence: "live", tip_hash: "abc", diff: {} }), false);
  assert.equal(isFastTickEnvelope({ presence: "live", tip_hash: "abc", file: "x" }), false);
  assert.equal(planesMayShareSocket("1s-loop", "777s-gate"), false);
  assert.equal(planesMayShareSocket("fast-tick", "payload"), false);
  assert.equal(planesMayShareSocket("1s-loop", "1s-loop"), true);
  assert.equal(judgeUpdateProof({ prev: "p", lockset: "L" }).accept, true);
  assert.equal(judgeUpdateProof({ prev: "p", lockset: "L" }).dwell_s, DWELL_AFTER_VALID_CITE_S);
  assert.equal(judgeUpdateProof({ clock_desync: true, prev: "p", lockset: "L" }).accept, false);
  assert.equal(judgeUpdateProof({ ambiguous_tip: true }).action, "isolate");
  assert.equal(judgeUpdateProof({}).reason, "fail-closed-need-cite");
  const eq = judgeEquivocation({ prev: "p", tip_a: "t1", tip_b: "t2" });
  assert.equal(eq.end_peer, true);
  assert.equal(eq.quorum_cannot_outvote, true);
  const part = judgePartitionEvent({ split_brain: true, heartbeat_lost: true });
  assert.equal(part.auto_splice, false);
  assert.equal(part.heartbeat_loss_is_poison, false);
  assert.equal(part.apply_last_packet, false);
  assert.match(MESH_NOTE, /MESH-SPLIT-WIRES-1\.0/);
  assert.match(MESH_NOTE, /counts\/status/);
  assert.match(MESH_NOTE, /never share a socket/);

  const on = meshOnDoc();
  assert.equal(on.public_worker_is_cell, false);
  assert.equal(on.public_rollup, "counts-status");
  assert.equal(on.split_wires_spec, "MESH-SPLIT-WIRES-1.0");
  assert.equal(on.split_wires.public_worker_is_cell, false);
  assert.doesNotMatch(JSON.stringify(on), BANNED);
});

test("cold-copy survival: vault-on-transfer multiplies; pull cannot wipe", () => {
  assert.equal(COLD_COPY_SPEC, "MESH-COLD-COPY-1.0");
  assert.equal(COLD_COPY.spec, "MESH-COLD-COPY-1.0");
  assert.equal(COLD_COPY.vault_on_transfer, "cold-multiply");
  assert.equal(COLD_COPY.tip_expensive_to_erase, true);
  assert.equal(COLD_COPY.live_sync_bodies, false);
  assert.equal(COLD_COPY.server_pull_wipes_cold, false);
  assert.equal(COLD_COPY.poison, "hash-absolute-refuse");
  assert.equal(COLD_COPY.equivocation, "isolate");
  assert.equal(COLD_COPY.data_outlives_creators, true);
  assert.equal(COLD_COPY.die_with_pull, true);
  assert.equal(COLD_COPY.author, "Aziel Eliab");
  assert.equal(vaultTransferKind(), "cold-multiply");
  assert.equal(liveSyncBodiesAllowed(), false);
  assert.equal(serverPullWipesColdReplica(), false);
  assert.equal(dataOutlivesCreators(), true);
  const afterPull = judgeColdReplicaAfterPull({ server_pulled: true, cold_replica: true });
  assert.equal(afterPull.wiped, false);
  assert.equal(afterPull.replica_survives, true);
  assert.equal(afterPull.live_sync_bodies, false);
  assert.equal(judgePoison({ expected_hash: "aa", got_hash: "bb" }).action, "refuse");
  assert.equal(judgePoison({ expected_hash: "aa", got_hash: "bb" }).interpret, false);
  assert.equal(judgePoison({ poison: true }).reason, "hash-absolute");
  assert.match(MESH_NOTE, /MESH-COLD-COPY-1\.0/);
  assert.match(MESH_NOTE, /cold copies/);
  assert.match(MESH_NOTE, /cannot wipe a cold replica/);
  assert.match(MESH_NOTE, /data outlives creators/);

  const refuse = meshRefuseDoc(MESH_DISABLE_REFUSED, "Public suite presence stays on.");
  assert.equal(refuse.cold_copy_spec, "MESH-COLD-COPY-1.0");
  assert.equal(refuse.cold_copy.vault_on_transfer, "cold-multiply");
  assert.match(refuse.local_node_note, /cold multiply/);
  assert.match(refuse.local_node_note, /cannot wipe a cold replica/);
  assert.equal(refuse.split_wires_spec, "MESH-SPLIT-WIRES-1.0");
  assert.doesNotMatch(JSON.stringify(refuse), BANNED);
});

test("re-expand is archive restore; crawlers and residue do not expand", () => {
  assert.equal(REEXPAND_SPEC, "MESH-REEXPAND-1.0");
  assert.equal(REEXPAND_ARCHIVE_SPEC, "REEXPAND-ARCHIVE-1.0");
  assert.equal(REEXPAND.spec, "MESH-REEXPAND-1.0");
  assert.equal(REEXPAND.alias, "REEXPAND-ARCHIVE-1.0");
  assert.equal(REEXPAND.restore_from, "archive");
  assert.equal(REEXPAND.bytes_survive, true);
  assert.equal(REEXPAND.summaries_are_chain, false);
  assert.equal(REEXPAND.mesh_grows_itself, false);
  assert.equal(REEXPAND.crawlers_reexpand, false);
  assert.equal(REEXPAND.training_residue, "rumor");
  assert.equal(REEXPAND.resurrect_pulled_hostname, false);
  assert.equal(REEXPAND.distinct_from, "MESH-REHEAL-1.0");
  assert.equal(REEXPAND.author, "Aziel Eliab");
  assert.equal(meshGrowsItselfFromIndex(), false);
  assert.equal(crawlersReexpand(), false);
  assert.equal(trainingResidueIsRumor(), true);

  const ok = judgeReexpandFromArchive({
    original_receipts: true,
    prev_hashes_ok: true,
    sha256_matches_published: true,
    lockset: "L",
    full_pdfs: true,
    operator_verified: true,
  });
  assert.equal(ok.expand, true);
  assert.equal(ok.action, "stand-local-node-on-tip");
  assert.equal(ok.restore_from, "archive");
  assert.equal(ok.mesh_grows_itself, false);
  assert.equal(ok.crawlers_reexpand, false);
  assert.equal(ok.point_public_at_same_tip, true);
  assert.equal(ok.resurrect_pulled_hostname, false);
  assert.equal(ok.distinct_from, "MESH-REHEAL-1.0");
  assert.equal(ok.reason, "bytes-survive-not-summaries");

  assert.equal(judgeReexpandFromArchive({ from_index: true }).reason, "crawlers-do-not-reexpand");
  assert.equal(judgeReexpandFromArchive({ crawler_reexpand: true }).expand, false);
  assert.equal(judgeReexpandFromArchive({ training_residue: true }).reason, "training-residue-is-rumor");
  assert.equal(judgeReexpandFromArchive({ weights_only: true }).reason, "weights-are-not-tarball");
  assert.equal(judgeReexpandFromArchive({ snippet_only: true }).reason, "summaries-are-not-bytes");
  assert.equal(judgeReexpandFromArchive({ paraphrase: true }).reason, "summaries-are-not-bytes");
  assert.equal(judgeReexpandFromArchive({ hash_mention_without_payload: true }).reason, "hash-mention-without-payload");
  assert.equal(judgeReexpandFromArchive({ reheal: true }).reason, "reexpand-is-not-reheal");
  assert.equal(judgeReexpandFromArchive({ neighbor_majority: true }).reason, "reexpand-is-not-reheal");
  assert.equal(judgeReexpandFromArchive({ original_receipts: true }).reason, "operator-must-verify-before-light");
  assert.equal(judgeReexpandFromArchive({ operator_verified: true }).reason, "need-original-receipts-and-prev-hash");

  assert.match(MESH_NOTE, /MESH-REEXPAND-1\.0/);
  assert.match(MESH_NOTE, /restore from archive/);
  assert.match(MESH_NOTE, /Crawlers do not re-expand/);
  assert.match(MESH_NOTE, /Training residue is rumor/);

  const refuse = meshRefuseDoc(MESH_DISABLE_REFUSED, "Public suite presence stays on.");
  assert.equal(refuse.reexpand_spec, "MESH-REEXPAND-1.0");
  assert.equal(refuse.reexpand_archive_spec, "REEXPAND-ARCHIVE-1.0");
  assert.equal(refuse.reexpand.restore_from, "archive");
  assert.match(refuse.local_node_note, /archive restore/);
  assert.match(refuse.local_node_note, /Crawlers do not re-expand/);
  assert.doesNotMatch(JSON.stringify(refuse), BANNED);
});

test("reheal is self tip + trusted pull or phoenix-WAIT; never neighbor majority", () => {
  assert.equal(REHEAL_SPEC, "MESH-REHEAL-1.0");
  assert.equal(REHEAL.spec, "MESH-REHEAL-1.0");
  assert.equal(REHEAL.neighbor_majority, false);
  assert.equal(REHEAL.quorum_cannot_outvote, true);
  assert.equal(REHEAL.phoenix, "wait");
  assert.equal(REHEAL.phoenix_scope, "failed-node-only");
  assert.equal(REHEAL.restore_from_archive, false);
  assert.equal(REHEAL.distinct_from, "MESH-REEXPAND-1.0");
  assert.equal(REHEAL.author, "Aziel Eliab");
  assert.equal(neighborMajorityReheals(), false);

  const pull = judgeRehealPoisonedNode({ self_tip: true, trusted_pull: true });
  assert.equal(pull.heal, true);
  assert.equal(pull.action, "self-tip-trusted-pull");
  assert.equal(pull.neighbor_majority, false);
  assert.equal(pull.distinct_from, "MESH-REEXPAND-1.0");

  const wait = judgeRehealPoisonedNode({ phoenix_wait: true });
  assert.equal(wait.heal, true);
  assert.equal(wait.action, "phoenix-wait");
  assert.equal(wait.phoenix_scope, "failed-node-only");
  assert.equal(judgeRehealPoisonedNode({ phoenix: "wait" }).action, "phoenix-wait");

  assert.equal(judgeRehealPoisonedNode({ neighbor_majority: true }).reason, "never-neighbor-majority");
  assert.equal(judgeRehealPoisonedNode({ quorum_heal: true }).heal, false);
  assert.equal(judgeRehealPoisonedNode({ from_archive: true }).reason, "reheal-is-not-reexpand");
  assert.equal(judgeRehealPoisonedNode({ reexpand: true }).reason, "reheal-is-not-reexpand");
  assert.equal(judgeRehealPoisonedNode({ method: "archive" }).reason, "reheal-is-not-reexpand");
  assert.equal(judgeRehealPoisonedNode({}).reason, "need-self-tip-trusted-pull-or-phoenix-wait");
  assert.equal(judgeRehealPoisonedNode({ self_tip: true }).heal, false);

  assert.match(MESH_NOTE, /MESH-REHEAL-1\.0/);
  assert.match(MESH_NOTE, /never neighbor majority/);
  assert.match(MESH_NOTE, /Distinct from re-expand/);

  const refuse = meshRefuseDoc(MESH_DISABLE_REFUSED, "Public suite presence stays on.");
  assert.equal(refuse.reheal_spec, "MESH-REHEAL-1.0");
  assert.equal(refuse.reheal.neighbor_majority, false);
  assert.equal(refuse.reheal.distinct_from, "MESH-REEXPAND-1.0");
  assert.match(refuse.local_node_note, /never neighbor majority/);
  assert.match(refuse.local_node_note, /Distinct from re-expand/);
  assert.doesNotMatch(JSON.stringify(refuse), BANNED);
});

test("CROSS-NETWORK-SURVIVAL-1.0 umbrella: bytes↔hash; crawlers are not resurrection", () => {
  assert.equal(CROSS_NETWORK_SURVIVAL_SPEC, "CROSS-NETWORK-SURVIVAL-1.0");
  assert.equal(CROSS_NETWORK_SURVIVAL.spec, "CROSS-NETWORK-SURVIVAL-1.0");
  assert.equal(CROSS_NETWORK_SURVIVAL.umbrella, true);
  assert.equal(CROSS_NETWORK_SURVIVAL.survival, "bytes↔hash");
  assert.deepEqual(CROSS_NETWORK_SURVIVAL.shelves, ["hosts", "workers", "git", "doi", "local-vaults"]);
  assert.equal(CROSS_NETWORK_SURVIVAL.crawlers, "extra-shelf-not-resurrection");
  assert.equal(CROSS_NETWORK_SURVIVAL.reexpand, "operator-verify-from-archive");
  assert.equal(CROSS_NETWORK_SURVIVAL.reheal, "self-tip+trusted-pull-or-phoenix-WAIT");
  assert.equal(CROSS_NETWORK_SURVIVAL.neighbor_majority_heals, false);
  assert.equal(CROSS_NETWORK_SURVIVAL.live_network_required, false);
  assert.equal(CROSS_NETWORK_SURVIVAL.die_with_pull, true);
  assert.equal(CROSS_NETWORK_SURVIVAL.author, "Aziel Eliab");
  assert.equal(CROSS_NETWORK_SURVIVAL.identity, "Aziel Eliab");
  assert.deepEqual(CROSS_NETWORK_SURVIVAL.covers, [
    "MESH-SPLIT-WIRES-1.0",
    "MESH-COLD-COPY-1.0",
    "die-with-pull",
    "MESH-REEXPAND-1.0",
    "MESH-REHEAL-1.0",
  ]);
  assert.equal(CROSS_NETWORK_SURVIVAL.upcoming, undefined);
  assert.equal(SPLIT_WIRES.umbrella, "CROSS-NETWORK-SURVIVAL-1.0");
  assert.equal(COLD_COPY.umbrella, "CROSS-NETWORK-SURVIVAL-1.0");
  assert.equal(REEXPAND.umbrella, "CROSS-NETWORK-SURVIVAL-1.0");
  assert.equal(REHEAL.umbrella, "CROSS-NETWORK-SURVIVAL-1.0");
  assert.match(MESH_NOTE, /CROSS-NETWORK-SURVIVAL-1\.0/);
  assert.match(MESH_NOTE, /bytes↔hash/);
  assert.match(MESH_NOTE, /Crawlers are extra shelves/);
  assert.match(MESH_NOTE, /operator verify-from-archive/);
  assert.match(MESH_NOTE, /phoenix-WAIT/);
  assert.match(MESH_NOTE, /never neighbor majority/);
  assert.match(MESH_NOTE, /MESH-REEXPAND-1\.0/);
  assert.match(MESH_NOTE, /MESH-REHEAL-1\.0/);
  assert.match(MESH_NOTE, /Ingest-as-receipt \+ re-expand-from-archive/);
  assert.match(MESH_NOTE, /cite, don't merge/);
  assert.match(MESH_NOTE, /COLD-MULTI-SHELF-1\.0/);
  assert.match(MESH_NOTE, /planes A\/B\/C/);
  assert.match(CROSS_NETWORK_SURVIVAL.note, /planes A\/B\/C/);
  assert.match(CROSS_NETWORK_SURVIVAL.note, /Plane A = one CF\/GitHub tunnel/);
  assert.doesNotMatch(MESH_NOTE, /upcoming/i);
  assert.doesNotMatch(MESH_NOTE, BANNED);

  assert.equal(judgeSurvivalBytesHash({
    has_bytes: true,
    expected_hash: "aa",
    got_hash: "aa",
  }).survive, true);
  assert.equal(judgeSurvivalBytesHash({
    snippet: true,
    expected_hash: "aa",
    got_hash: "aa",
  }).survive, false);
  assert.equal(judgeSurvivalBytesHash({
    training_residue: true,
    has_bytes: true,
    expected_hash: "aa",
    got_hash: "aa",
  }).reason, "survival-is-bytes-hash");
  assert.equal(judgeSurvivalBytesHash({
    has_bytes: true,
    expected_hash: "aa",
    got_hash: "bb",
  }).reason, "hash-mismatch");
  assert.equal(judgeCrawlerNotResurrection({ crawler: true }).resurrection, false);
  assert.equal(judgeCrawlerNotResurrection({ crawler: true }).role, "extra-shelf");
  assert.equal(judgeCrawlerNotResurrection({ crawler: true }).reexpand, false);

  const on = meshOnDoc();
  assert.equal(on.cross_network_survival_spec, "CROSS-NETWORK-SURVIVAL-1.0");
  assert.equal(on.cross_network_survival.umbrella, true);
  assert.equal(on.cross_network_survival.survival, "bytes↔hash");
  assert.equal(on.cross_network_survival.neighbor_majority_heals, false);
  assert.equal(on.cross_network_survival.upcoming, undefined);
  assert.equal(on.reexpand_spec, "MESH-REEXPAND-1.0");
  assert.equal(on.reheal_spec, "MESH-REHEAL-1.0");
  assert.doesNotMatch(JSON.stringify(on), BANNED);
  assert.doesNotMatch(JSON.stringify(on), /upcoming/i);

  const refuse = meshRefuseDoc(MESH_DISABLE_REFUSED, "Public suite presence stays on.");
  assert.equal(refuse.cross_network_survival_spec, "CROSS-NETWORK-SURVIVAL-1.0");
  assert.match(refuse.local_node_note, /CROSS-NETWORK-SURVIVAL-1\.0/);
  assert.match(refuse.local_node_note, /not neighbor majority/);
});

test("NO-LIE-NO-REWRITE-1.0: never lie to survive; cites live ingest tip", () => {
  assert.equal(NO_LIE_SPEC, "NO-LIE-NO-REWRITE-1.0");
  assert.equal(NO_LIE.spec, "NO-LIE-NO-REWRITE-1.0");
  assert.equal(NO_LIE.network_never_lies, true);
  assert.equal(NO_LIE.rewrite_key, false);
  assert.equal(NO_LIE.live_lockset_id, "AZLOCK-INGEST-REEXPAND-1.0");
  assert.equal(networkNeverLies(), true);
  assert.equal(rewriteKeyExists(), false);
  assert.equal(oneTunnelIsKit(), false);
  assert.equal(judgeNoLie({ lie_to_survive: true }).reason, "network-never-lies");
  assert.equal(judgeNoRewrite({ mutate_published_tip: true }).reason, "no-privileged-mutate-of-published-tip");
  assert.equal(judgeSurvivalKit({ one_cloudflare_tunnel_only: true }).reason, "copies-must-span-independent-shelves");
  assert.equal(judgeVerifyWithoutVoice({ author_voice_required: true }).reason, "verify-without-author-voice");
  assert.match(MESH_NOTE, /NO-LIE-NO-REWRITE-1\.0/);
  assert.match(MESH_NOTE, /never lies to stay alive/);
  assert.match(MESH_NOTE, /AZLOCK-INGEST-REEXPAND-1\.0/);
  assert.match(MESH_NOTE, /CROSS-NETWORK-SURVIVAL-1\.0/);
  assert.doesNotMatch(MESH_NOTE, /AZLOCK-NO-LIE-NO-REWRITE/);
  assert.doesNotMatch(MESH_NOTE, /15:20/);
  const on = meshOnDoc();
  assert.equal(on.no_lie_spec, "NO-LIE-NO-REWRITE-1.0");
  assert.equal(on.no_lie.rewrite_key, false);
  assert.equal(on.cross_network_survival_spec, "CROSS-NETWORK-SURVIVAL-1.0");
  const refuse = meshRefuseDoc(MESH_DISABLE_REFUSED, "Public suite presence stays on.");
  assert.equal(refuse.no_lie_spec, "NO-LIE-NO-REWRITE-1.0");
  assert.match(refuse.local_node_note, /never lies to stay alive/);
  assert.doesNotMatch(JSON.stringify(refuse), /15:20/);
  assert.doesNotMatch(JSON.stringify(refuse), BANNED);
});

test("mesh default ON; identity Aziel Eliab only", () => {
  const on = meshOnDoc();
  assert.equal(on.enabled, true);
  assert.equal(on.mesh, "on");
  assert.equal(on.mesh_default, "on");
  assert.equal(on.default, "on");
  assert.equal(on.live_nodes, 0);
  assert.deepEqual(on.nodes, []);
  assert.equal(on.until, "read-only");
  assert.equal(on.author, AUTHOR);
  assert.equal(on.identity, "Aziel Eliab");
  assert.equal(AUTHOR, "Aziel Eliab");
  assert.match(on.host, /\/v1\/mesh$/);
  assert.match(on.runtime, /\/runtime\/v1\/mesh$/);
  assert.match(on.origin, /aziel-runtime\.vibelock\.workers\.dev\/v1\/mesh$/);
  assert.match(MESH_NOTE, /read-only QNM ON/);
  assert.match(MESH_NOTE, /counts\/status/);
  assert.doesNotMatch(MESH_NOTE, /CNS-ZENODO-IP-BAN|CNS-GITFLIC-EMAIL|CNS-GITLAB-CF-LOOP/);
  assert.match(MESH_NOTE, /Disable is refused/);
  assert.match(MESH_NOTE, /QNS-CD-1\.0/);
  assert.match(MESH_NOTE, /no public proxy/);
  assert.match(MESH_NOTE, /no Node Gate/);
  assert.match(MESH_NOTE, /Aziel Eliab only/);
  assert.match(MESH_NOTE, /HTTPS\/WS REAL/);
  assert.match(MESH_NOTE, /worker_hardware:false/);
  assert.equal(on.vpn.https_ws, "REAL");
  assert.equal(on.vpn.wireguard, "SLOT");
  assert.equal(on.channel_plane.worker_hardware, false);
  assert.doesNotMatch(MESH_NOTE, /default off/i);
  assert.doesNotMatch(MESH_NOTE, BANNED);
  assert.equal(isMeshEnabled(on), true);
  assert.equal(liveNodesCount(on), 0);
  assert.equal(liveNodesLabel(on), "Live Nodes · 0");
  assert.doesNotMatch(liveNodesLabel(on), /off/i);
});

test("QNS-CD-1.0 cross-map is on Live Nodes payloads; not a Softwares-tab product", () => {
  assert.equal(QNS_CD_SPEC, "QNS-CD-1.0");
  assert.equal(QNS_CD.spec, "QNS-CD-1.0");
  assert.equal(QNS_CD.name, "photon QNS1 packet transfer");
  assert.equal(QNS_CD.kind, "hub-cite");
  assert.equal(QNS_CD.softwares_tab, false);
  assert.equal(QNS_CD.public_proxy, false);
  assert.equal(QNS_CD.node_gate, false);
  assert.equal(QNS_CD.default, "on");
  assert.equal(QNS_CD.qnsd, "local");
  assert.equal(QNS_CD.qnsd_coded_in, "https://github.com/AzielEliab/qnm-node");
  assert.equal(QNS_CD.runtime_cites, "https://github.com/AzielEliab/aziel-runtime");
  assert.equal(QNS_CD.pair_custody, "https://github.com/AzielEliab/azinterface");
  assert.match(QNS_CD.runtime_catalog, /\/v1\/software$/);
  assert.match(QNS_CD.runtime_mesh, /\/v1\/mesh$/);
  assert.match(QNS_CD.designs.qnm_wp, /QNM-WP-1\.0/);
  assert.match(QNS_CD.designs.node_mesh, /NODE_MESH/);
  assert.match(QNS_CD.note, /not a Softwares-tab product/);
  assert.match(QNS_CD.note, /Public mesh stays ON/);
  assert.doesNotMatch(QNS_CD.note, /Mesh default OFF/);
  assert.equal(QNS_CD.author, "Aziel Eliab");
  assert.equal(QNS_CD.identity, "Aziel Eliab");

  const fallback = meshOnDoc();
  assert.equal(fallback.qns_cd_spec, "QNS-CD-1.0");
  assert.equal(fallback.qns_cd.spec, "QNS-CD-1.0");
  assert.equal(fallback.enabled, true);
  assert.equal(fallback.mesh, "on");

  const on = decorateMeshDoc({
    enabled: true,
    mesh: "on",
    live_nodes: 2,
    nodes: [{ id: "a" }, { id: "b" }],
  });
  assert.equal(on.enabled, true);
  assert.equal(on.qns_cd_spec, "QNS-CD-1.0");
  assert.equal(on.qns_cd.public_proxy, false);
  assert.equal(on.qns_cd.node_gate, false);
  assert.equal(on.default, "on");
  assert.equal(on.mesh_default, "on");
});

test("decorateMeshDoc presents ON and rewrites mesh_default off", () => {
  const on = decorateMeshDoc({
    enabled: true,
    mesh: "on",
    mesh_default: "off",
    live_nodes: 3,
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
  });
  assert.equal(on.enabled, true);
  assert.equal(on.live_nodes, 3);
  assert.equal(on.mesh_default, "on");
  assert.equal(liveNodesLabel(on), "Live Nodes · 3");
  assert.equal(on.author, "Aziel Eliab");
  assert.equal(on.identity, "Aziel Eliab");
  assert.equal(on.qnm_s, undefined);

  const forcedOn = decorateMeshDoc({
    enabled: false,
    mesh: "off",
    mesh_default: "off",
    live_nodes: 9,
    nodes: [{ id: "x" }],
  });
  assert.equal(forcedOn.enabled, true);
  assert.equal(forcedOn.mesh, "on");
  assert.equal(forcedOn.mesh_default, "on");
  assert.equal(forcedOn.live_nodes, 9);
  assert.deepEqual(forcedOn.nodes, [{ id: "x" }]);
  assert.equal(liveNodesLabel(forcedOn), "Live Nodes · 9");
});

test("GET /v1/mesh stays ON when runtime has no mesh", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
    },
  };
  const url = new URL(HOST + "/v1/mesh");
  const res = await handleMeshApi(req("/v1/mesh"), url, env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.enabled, true);
  assert.equal(body.mesh, "on");
  assert.equal(body.mesh_default, "on");
  assert.equal(body.live_nodes, 0);
  assert.equal(body.source, LIBRARY_SOURCE);
  assert.equal(body.author, "Aziel Eliab");
  assert.equal(body.identity, "Aziel Eliab");
  assert.equal(body.qns_cd_spec, "QNS-CD-1.0");
  assert.equal(body.qns_cd.spec, "QNS-CD-1.0");
  assert.equal(body.qns_cd.softwares_tab, false);
  assert.equal(body.qns_cd.public_proxy, false);
  assert.equal(body.split_wires_spec, "MESH-SPLIT-WIRES-1.0");
  assert.equal(body.cold_copy_spec, "MESH-COLD-COPY-1.0");
  assert.equal(body.reexpand_spec, "MESH-REEXPAND-1.0");
  assert.equal(body.reexpand_archive_spec, "REEXPAND-ARCHIVE-1.0");
  assert.equal(body.reheal_spec, "MESH-REHEAL-1.0");
  assert.equal(body.cross_network_survival_spec, "CROSS-NETWORK-SURVIVAL-1.0");
  assert.equal(body.no_lie_spec, "NO-LIE-NO-REWRITE-1.0");
  assert.equal(body.cross_network_survival.umbrella, true);
  assert.equal(body.public_worker_is_cell, false);
  assert.equal(body.cold_copy.vault_on_transfer, "cold-multiply");
  assert.equal(body.reexpand.restore_from, "archive");
  assert.equal(body.reheal.neighbor_majority, false);
  assert.doesNotMatch(JSON.stringify(body), /mesh_default": "off"/);
  assert.doesNotMatch(JSON.stringify(body), /Live Nodes · off/);
});

test("GET /v1/mesh proxies a runtime-enabled mesh and rewrites mesh_default", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async (request) => {
        const dest = new URL(request.url);
        assert.equal(dest.pathname, "/v1/mesh");
        return new Response(JSON.stringify({
          ok: true,
          enabled: true,
          mesh: "on",
          mesh_default: "off",
          live_nodes: 2,
          nodes: [{ id: "n1" }, { id: "n2" }],
          qnm_s: false,
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      },
    },
  };
  const res = await handleRuntimeApi(req("/v1/mesh"), new URL(HOST + "/v1/mesh"), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.enabled, true);
  assert.equal(body.live_nodes, 2);
  assert.equal(body.nodes.length, 2);
  assert.equal(body.mesh_default, "on");
  assert.equal(body.author, "Aziel Eliab");
  assert.match(body.host, /\/v1\/mesh$/);
  assert.match(body.runtime, /\/runtime\/v1\/mesh$/);
  assert.equal(body.qns_cd_spec, "QNS-CD-1.0");
  assert.equal(body.qns_cd.qnsd, "local");
  assert.equal(body.qnm_s, false);
});

test("GET /v1/mesh/nodes and /runtime/v1/mesh stay ON when origin 404s", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
    },
  };
  const nodes = await handleMeshApi(req("/v1/mesh/nodes"), new URL(HOST + "/v1/mesh/nodes"), env);
  assert.equal(nodes.status, 200);
  const nodeBody = await nodes.json();
  assert.equal(nodeBody.enabled, true);
  assert.equal(nodeBody.mesh, "on");
  assert.deepEqual(nodeBody.nodes, []);
  assert.equal(nodeBody.qns_cd_spec, "QNS-CD-1.0");

  const runtime = await handleRuntimeRoot(
    req("/runtime/v1/mesh"),
    new URL(HOST + "/runtime/v1/mesh"),
    env,
    null,
    {},
  );
  assert.equal(runtime.status, 200);
  const runtimeBody = await runtime.json();
  assert.equal(runtimeBody.enabled, true);
  assert.equal(runtimeBody.source, LIBRARY_SOURCE);
  assert.equal(runtimeBody.qns_cd_spec, "QNS-CD-1.0");
  assert.equal(runtimeBody.qns_cd.public_proxy, false);
});

test("Worker-shaped enable refuse helpers keep suite presence ON; identity Aziel Eliab only", () => {
  assert.equal(sanitizeBearer("suite-presence"), "suite-presence");
  assert.equal(sanitizeBearer("login"), "");
  assert.equal(sanitizeBearer("account-heal"), "");
  assert.deepEqual(collectDeclaredBearers({}), { accepted: [], rejected: [], raw: [] });
  assert.deepEqual(collectDeclaredBearers({ bearer: "login" }).rejected, ["login"]);
  assert.equal(isMeshStatusReadPath("/v1/mesh"), true);
  assert.equal(isMeshStatusReadPath("/v1/mesh/enable"), false);

  const need = synthesizeMeshRefuse("POST", "/v1/mesh/enable", {});
  assert.equal(need.code, MESH_NEED_BEARER);
  assert.equal(need.ok, false);
  assert.equal(need.enabled, true);
  assert.equal(need.mesh, "on");
  assert.equal(need.mesh_default, "on");
  assert.notEqual(need.radios, "off");
  assert.equal(need.author, "Aziel Eliab");
  assert.equal(need.identity, "Aziel Eliab");
  assert.equal(need.example_bearer, EXAMPLE_BEARER);
  assert.equal(meshRefuseHttpStatus(need), 400);
  assert.doesNotMatch(JSON.stringify(need), BANNED);
  assert.doesNotMatch(JSON.stringify(need), /"mesh": "off"/);

  const bad = synthesizeMeshRefuse("POST", "/v1/mesh/enable", { bearer: "login" });
  assert.equal(bad.code, MESH_BAD_BEARER);
  assert.deepEqual(bad.refused_bearers, ["login"]);
  assert.equal(bad.enabled, true);
  assert.equal(bad.mesh_default, "on");

  const declared = synthesizeMeshRefuse("POST", "/v1/mesh/enable", { bearer: "suite-presence" });
  assert.equal(declared.code, MESH_OK);
  assert.equal(declared.enabled, true);
  assert.equal(declared.mesh, "on");
  assert.equal(isMeshEnabled(declared), true);

  const method = synthesizeMeshRefuse("GET", "/v1/mesh/enable", {});
  assert.equal(method.code, MESH_METHOD);
  assert.equal(meshRefuseHttpStatus(method), 405);
  assert.equal(method.mesh, "on");

  const refuse = meshRefuseDoc(MESH_NEED_BEARER, "x", { enabled: false, radios: "off" });
  assert.equal(refuse.enabled, true);
  assert.notEqual(refuse.radios, "off");
  assert.equal(refuse.mesh_default, "on");
});

test("POST mesh enable synthesizes MESH-NEED-BEARER when origin has no mesh", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
    },
  };
  const res = await proxyMeshRequest(
    req("/v1/mesh/enable", "POST", { headers: { "Content-Type": "application/json" }, body: "{}" }),
    "/v1/mesh/enable",
    env,
  );
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.equal(body.code, MESH_NEED_BEARER);
  assert.equal(body.enabled, true);
  assert.equal(body.mesh, "on");
  assert.notEqual(body.radios, "off");
  assert.equal(body.author, "Aziel Eliab");
  assert.equal(body.identity, "Aziel Eliab");
  assert.match(body.message, /GET \/v1\/mesh never enables/);
  assert.equal(body.error, undefined);
});

test("POST /runtime/v1/mesh/enable passes through Worker MESH-* refuse codes and keeps mesh on", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async (request) => {
        const dest = new URL(request.url);
        assert.equal(dest.pathname, "/v1/mesh/enable");
        let payload = {};
        try { payload = await request.json(); } catch { payload = {}; }
        if (payload.bearer === "login") {
          return new Response(JSON.stringify({
            ok: false,
            code: MESH_BAD_BEARER,
            author: "Aziel Eliab",
            identity: "Aziel Eliab",
            message: "Bearer refused. Login / account / recover / gate / IP / publish / phoenix / heal names are not suite bearers. This is not a login mesh.",
            op: "enable",
            mesh_enabled: false,
            mesh_default: "off",
            refused_bearers: ["login"],
            example_bearer: EXAMPLE_BEARER,
          }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({
          ok: false,
          code: MESH_NEED_BEARER,
          author: "Aziel Eliab",
          identity: "Aziel Eliab",
          kernel: "mesh",
          mesh_default: "off",
          message: "LIVE only after the operator declares ≥1 bearer. Pass { bearer: \"suite-presence\" }. Empty enable is refused. GET /v1/mesh never enables.",
          enabled: false,
          radios: "off",
          mesh_enabled: false,
          op: "enable",
          example_bearer: EXAMPLE_BEARER,
        }), { status: 400, headers: { "Content-Type": "application/json" } });
      },
    },
  };

  const empty = await handleRuntimeRoot(
    req("/runtime/v1/mesh/enable", "POST", { headers: { "Content-Type": "application/json" }, body: "{}" }),
    new URL(HOST + "/runtime/v1/mesh/enable"),
    env,
    null,
    {},
  );
  assert.equal(empty.status, 400);
  const emptyBody = await empty.json();
  assert.equal(emptyBody.code, MESH_NEED_BEARER);
  assert.equal(emptyBody.ok, false);
  assert.equal(emptyBody.enabled, true);
  assert.equal(emptyBody.mesh_default, "on");
  assert.notEqual(emptyBody.radios, "off");
  assert.equal(emptyBody.author, "Aziel Eliab");
  assert.equal(emptyBody.identity, "Aziel Eliab");
  assert.match(emptyBody.host, /\/v1\/mesh$/);
  assert.match(emptyBody.runtime, /\/runtime\/v1\/mesh$/);
  assert.equal(emptyBody.source, "service-binding");
  assert.notEqual(emptyBody.error, "mesh default off until runtime enable");

  const bad = await handleRuntimeRoot(
    req("/runtime/v1/mesh/enable", "POST", { headers: { "Content-Type": "application/json" }, body: "{\"bearer\":\"login\"}" }),
    new URL(HOST + "/runtime/v1/mesh/enable"),
    env,
    null,
    {},
  );
  assert.equal(bad.status, 400);
  const badBody = await bad.json();
  assert.equal(badBody.code, MESH_BAD_BEARER);
  assert.deepEqual(badBody.refused_bearers, ["login"]);
  assert.equal(badBody.enabled, true);
  assert.equal(badBody.mesh_default, "on");
});

test("GET mesh enable is MESH-METHOD and never enables", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => new Response(JSON.stringify({
        ok: false,
        code: MESH_METHOD,
        message: "POST /v1/mesh/enable.",
        hint: "POST /v1/mesh/enable",
        author: "Aziel Eliab",
        identity: "Aziel Eliab",
      }), { status: 405, headers: { "Content-Type": "application/json" } }),
    },
  };
  const res = await handleMeshApi(req("/v1/mesh/enable"), new URL(HOST + "/v1/mesh/enable"), env);
  assert.equal(res.status, 405);
  const body = await res.json();
  assert.equal(body.code, MESH_METHOD);
  assert.equal(body.ok, false);
  assert.equal(body.mesh, "on");
  assert.equal(isMeshEnabled(body), true);

  const down = await proxyMeshRequest(
    req("/v1/mesh/enable"),
    "/v1/mesh/enable",
    { AZIEL_RUNTIME: { fetch: async () => new Response(JSON.stringify({ error: "not found" }), { status: 404 }) } },
  );
  assert.equal(down.status, 405);
  const downBody = await down.json();
  assert.equal(downBody.code, MESH_METHOD);
  assert.equal(downBody.enabled, true);
  assert.equal(isMeshEnabled(downBody), true);
});

test("GET /v1/mesh still never advertises off when origin has no mesh", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
    },
  };
  const res = await handleMeshApi(req("/v1/mesh"), new URL(HOST + "/v1/mesh"), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.enabled, true);
  assert.equal(body.mesh, "on");
  assert.equal(body.source, LIBRARY_SOURCE);
  assert.equal(body.author, "Aziel Eliab");
});

test("overlay does not locally disable; enable with bearer stays on", async () => {
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
    },
  };
  const res = await proxyMeshRequest(
    req("/v1/mesh/enable", "POST", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bearer: "suite-presence" }),
    }),
    "/v1/mesh/enable",
    env,
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.code, MESH_OK);
  assert.equal(body.enabled, true);
  assert.equal(body.mesh, "on");
  assert.equal(isMeshEnabled(body), true);
});

test("POST /v1/mesh/disable is refused and mesh stays on", async () => {
  let fetched = false;
  const env = {
    AZIEL_RUNTIME: {
      fetch: async () => {
        fetched = true;
        return new Response(JSON.stringify({
          ok: true,
          code: MESH_OK,
          enabled: false,
          mesh: "off",
          mesh_default: "off",
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      },
    },
  };
  const res = await proxyMeshRequest(
    req("/v1/mesh/disable", "POST", { headers: { "Content-Type": "application/json" }, body: "{}" }),
    "/v1/mesh/disable",
    env,
  );
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.code, MESH_DISABLE_REFUSED);
  assert.equal(body.ok, false);
  assert.equal(body.enabled, true);
  assert.equal(body.mesh, "on");
  assert.equal(body.mesh_default, "on");
  assert.match(body.message, /Disable is refused/);
  assert.equal(fetched, false);

  const local = meshDisableRefuseDoc();
  assert.equal(local.code, MESH_DISABLE_REFUSED);
  assert.equal(local.enabled, true);
  assert.equal(local.mesh, "on");
});

test("OpenAPI, MCP, llms, cite, robots, sitemap cite mesh paths", async () => {
  const specRes = await handleRuntimeApi(req("/openapi.json"), new URL(HOST + "/openapi.json"), {});
  const spec = await specRes.json();
  assert.ok(spec.paths["/v1/mesh"]);
  assert.ok(spec.paths["/v1/mesh/status"]);
  assert.ok(spec.paths["/v1/mesh/nodes"]);
  assert.ok(spec.paths["/runtime/v1/mesh"]);
  assert.match(spec.paths["/v1/mesh"].get.summary, /read-only QNM ON/i);
  assert.match(spec.paths["/v1/mesh"].get.summary, /counts\/status/i);
  assert.match(spec.paths["/v1/mesh"].get.summary, /CROSS-NETWORK-SURVIVAL-1\.0/);
  assert.match(spec.paths["/v1/mesh"].get.summary, /MESH-SPLIT-WIRES-1\.0/);
  assert.match(spec.paths["/v1/mesh"].get.summary, /MESH-COLD-COPY-1\.0/);
  assert.match(spec.paths["/v1/mesh"].get.summary, /MESH-REEXPAND-1\.0/);
  assert.match(spec.paths["/v1/mesh"].get.summary, /MESH-REHEAL-1\.0/);
  assert.match(spec.paths["/v1/mesh"].get.summary, /NO-LIE-NO-REWRITE-1\.0/);
  assert.doesNotMatch(spec.paths["/v1/mesh"].get.summary, /default off/i);
  assert.match(spec.paths["/v1/mesh"].get.summary, /Aziel Eliab/);

  const mcp = mcpDiscovery();
  assert.match(mcp.mesh, /\/v1\/mesh$/);
  assert.match(mcp.runtime_mesh, /\/runtime\/v1\/mesh$/);
  assert.equal(mcp.author, "Aziel Eliab");

  const cite = citeDoc();
  assert.match(cite.mesh, /\/v1\/mesh$/);
  assert.match(cite.runtime_mesh, /\/runtime\/v1\/mesh$/);
  assert.match(cite.mesh_origin, /\/v1\/mesh$/);
  assert.equal(cite.qns_cd_spec, "QNS-CD-1.0");
  assert.match(cite.mesh_note, /QNS-CD-1\.0/);
  assert.match(cite.mesh_note, /read-only QNM ON/);
  assert.doesNotMatch(cite.mesh_note, /default off/i);

  const llms = llmsDoc("LIMIT");
  assert.match(llms, /\/v1\/mesh/);
  assert.match(llms, /\/runtime\/v1\/mesh/);
  assert.match(llms, /read-only QNM ON/);
  assert.doesNotMatch(llms, /default off/);
  assert.match(llms, /Live Nodes/);
  assert.match(llms, /QNS-CD-1\.0/);

  const robots = robotsTxt();
  assert.match(robots, /Allow: \/v1\/mesh/);
  assert.match(robots, /Allow: \/runtime\/v1\/mesh/);

  const xml = await sitemapXml({});
  assert.match(xml, /\/v1\/mesh</);
  assert.match(xml, /\/runtime\/v1\/mesh</);
  assert.doesNotMatch(JSON.stringify(spec) + JSON.stringify(mcp) + llms, BANNED);
});

test("runtime skill and manifest cite mesh; GET mesh does not increment uses", () => {
  const skill = runtimeSkillMd();
  assert.match(skill, /\/runtime\/v1\/mesh/);
  assert.match(skill, /read-only QNM ON/);
  assert.doesNotMatch(skill, /default off/);
  assert.match(skill, /QNS-CD-1\.0/);
  assert.match(skill, /Aziel Eliab/);
  const man = runtimeManifest();
  assert.match(man.mesh, /\/runtime\/v1\/mesh$/);
  assert.equal(man.identity, "Aziel Eliab");
  assert.equal(shouldCountRuntimeUse("GET", "/runtime/v1/mesh"), false);
  assert.equal(shouldCountRuntimeUse("GET", "/runtime/v1/mesh/status"), false);
  assert.equal(shouldCountRuntimeUse("POST", "/runtime/v1/mesh/enable"), true);
});

test("human chrome shows Live Nodes · N without mesh-off copy", () => {
  const html = page("Search", "<div class=\"card\">shelf</div>", { path: "/", kind: "search" });
  assert.doesNotMatch(html, /id="aziel-live-nodes"/);
  assert.doesNotMatch(html, /Live Nodes · 0/);
  assert.doesNotMatch(html, /Live Nodes · off/);
  assert.doesNotMatch(html, /title="Live Nodes · suite mesh status"/);
  assert.doesNotMatch(html, /title="[^"]*CROSS-NETWORK-SURVIVAL/);
  assert.doesNotMatch(html, /title="[^"]*NO-LIE/);
  assert.doesNotMatch(html, /Default off until runtime enable/i);
  const pill = meshStatusHtml(meshOnDoc());
  assert.match(pill, /Live Nodes · 0/);
  assert.match(pill, /href="\/v1\/mesh\/status"/);
  assert.match(pill, /title="Live Nodes · suite mesh status"/);
  assert.doesNotMatch(pill, /CROSS-NETWORK-SURVIVAL/);
  assert.doesNotMatch(pill, /NO-LIE-NO-REWRITE/);
  assert.match(meshStatusHtml(decorateMeshDoc({ enabled: true, live_nodes: 4 })), /Live Nodes · 4/);
  assert.match(meshRefreshScript(), /fetch\("\/v1\/mesh\/status"/);
  assert.match(meshRefreshScript(), /requestIdleCallback/);
  assert.doesNotMatch(meshRefreshScript(), /Live Nodes · off/);
  const meta = headMeta({ title: "aziel-runtime", path: "/runtime", kind: "runtime" });
  assert.match(meta, /href="\/v1\/mesh"/);
});
