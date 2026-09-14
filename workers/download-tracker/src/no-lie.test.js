import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  AUTHOR,
  CROSS_NETWORK_SURVIVAL_NEIGHBOR,
  INGEST_AS_RECEIPT_SPEC,
  LIVE_LOCKSET_ID,
  NO_LIE,
  NO_LIE_SPEC,
  REEXPAND_NEIGHBOR,
  REHEAL_NEIGHBOR,
  SURVIVAL_KIT,
  judgeNoLie,
  judgeNoRewrite,
  judgeSurvivalKit,
  judgeVerifyWithoutVoice,
  networkNeverLies,
  oneTunnelIsKit,
  rewriteKeyExists,
} from "./no-lie.js";
import { LOCKSET_ID, LOCKSET_TIP, PUBLISHED_TIP, locksetFile } from "./ingest-receipt.js";

const VISIBLE_1520 = /15:20/;

test("NO-LIE law cites the live #90 lockset; no second tip", () => {
  assert.equal(AUTHOR, "Aziel Eliab");
  assert.equal(NO_LIE_SPEC, "NO-LIE-NO-REWRITE-1.0");
  assert.equal(LIVE_LOCKSET_ID, "AZLOCK-INGEST-REEXPAND-1.0");
  assert.equal(LIVE_LOCKSET_ID, LOCKSET_ID);
  assert.equal(LOCKSET_TIP, PUBLISHED_TIP);
  assert.equal(NO_LIE.live_lockset_id, LOCKSET_ID);
  assert.equal(NO_LIE.spec, NO_LIE_SPEC);
  assert.equal(NO_LIE.network_never_lies, true);
  assert.equal(NO_LIE.rewrite_key, false);
  assert.equal(NO_LIE.privileged_mutate_published_tip, false);
  assert.equal(NO_LIE.one_cloudflare_tunnel_is_not_kit, true);
  assert.deepEqual(NO_LIE.neighbors, [
    CROSS_NETWORK_SURVIVAL_NEIGHBOR,
    REEXPAND_NEIGHBOR,
    REHEAL_NEIGHBOR,
    INGEST_AS_RECEIPT_SPEC,
  ]);
  assert.equal(networkNeverLies(), true);
  assert.equal(rewriteKeyExists(), false);
  assert.equal(oneTunnelIsKit(), false);
  assert.equal(SURVIVAL_KIT.length, 4);
  assert.match(NO_LIE.note, /AZLOCK-INGEST-REEXPAND-1\.0/);
  assert.match(NO_LIE.note, /CROSS-NETWORK-SURVIVAL-1\.0/);
  assert.doesNotMatch(NO_LIE.note, /AZLOCK-NO-LIE-NO-REWRITE/);
  assert.doesNotMatch(JSON.stringify(NO_LIE), VISIBLE_1520);
});

test("published lockset tip is unchanged; law spec sits after the hashed core", () => {
  const file = locksetFile();
  assert.match(file, /AZLOCK-INGEST-REEXPAND-1\.0/);
  assert.match(file, /c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245/);
  assert.match(file, /NO-LIE-NO-REWRITE-1\.0/);
  assert.match(file, /CROSS-NETWORK-SURVIVAL/);
  assert.match(file, /COLD-MULTI-SHELF-1\.0/);
  assert.doesNotMatch(file, /AZLOCK-NO-LIE-NO-REWRITE/);
  const here = dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(join(here, "../../../docs/lockset.json"), "utf8");
  assert.equal(raw, file);
  const doc = JSON.parse(raw);
  assert.equal(doc.id, "AZLOCK-INGEST-REEXPAND-1.0");
  assert.equal(doc.sha256, PUBLISHED_TIP);
  assert.equal(doc.spec, "INGEST-AS-RECEIPT-1.0");
  assert.equal(doc.no_lie_spec, "NO-LIE-NO-REWRITE-1.0");
  assert.equal(doc.no_lie, "NO-LIE");
  assert.equal(doc.no_rewrite, "NO-REWRITE");
  assert.doesNotMatch(raw, VISIBLE_1520);
});

test("judges refuse lie-to-survive and rewrite key", () => {
  assert.equal(judgeNoLie({ lie_to_stay_alive: true }).reason, "network-never-lies");
  assert.equal(judgeNoLie({ lie_to_self_preserve: true }).accept, false);
  assert.equal(judgeNoLie({ lie_to_adapt: true }).action, "refuse");
  assert.equal(judgeNoLie({ survival_pressure: true, hash_mismatch: true }).reason, "hash-absolute-beats-survival");
  assert.equal(judgeNoLie({}).accept, true);
  assert.equal(judgeNoRewrite({ rewrite_key: true }).reason, "no-rewrite-key");
  assert.equal(judgeNoRewrite({ mutate_published_receipt: true }).reason, "no-privileged-mutate-of-published-tip");
  assert.equal(judgeNoRewrite({}).rewrite_key, false);
  assert.equal(judgeSurvivalKit({ one_tunnel_only: true }).ok, false);
  assert.equal(judgeSurvivalKit({
    receipts_that_still_hash: true,
    independent_shelves: true,
    verify_without_voice: true,
    no_rewrite_key: true,
  }).ok, true);
  assert.equal(judgeVerifyWithoutVoice({ needs_author: true }).ok, false);
  assert.equal(judgeVerifyWithoutVoice({ public_hash: true, prev_hash_walk: true, published_rules: true }).ok, true);
});
