/**
 * NO-LIE-NO-REWRITE-1.0 — mesh law + judges.
 * Network never lies to stay alive. No privileged mutate of a published tip.
 * Cites the live #90 lockset (AZLOCK-INGEST-REEXPAND-1.0). Does not replace it.
 * Author: Aziel Eliab only. No visible identity-lock chrome.
 */

export const AUTHOR = "Aziel Eliab";
export const NO_LIE_SPEC = "NO-LIE-NO-REWRITE-1.0";
export const NO_LIE_ALIAS = "NO-LIE-1.0";
export const NO_REWRITE_ALIAS = "NO-REWRITE-1.0";
export const LIVE_LOCKSET_ID = "AZLOCK-INGEST-REEXPAND-1.0";
export const CROSS_NETWORK_SURVIVAL_NEIGHBOR = "CROSS-NETWORK-SURVIVAL-1.0";
export const INGEST_AS_RECEIPT_SPEC = "INGEST-AS-RECEIPT-1.0";
export const REEXPAND_NEIGHBOR = "MESH-REEXPAND-1.0";
export const REHEAL_NEIGHBOR = "MESH-REHEAL-1.0";

const HOST = "https://www.azielcorpuslibrary.net";

export const SURVIVAL_KIT = Object.freeze([
  "receipts that still hash",
  "copies that are not all on one tunnel",
  "rules simple enough that someone else can verify without your voice",
  "no rewrite key",
]);

export const VERIFY_WITHOUT_VOICE = Object.freeze([
  "public hash",
  "prev-hash walk",
  "published rules",
]);

const LIE_TO_SURVIVE_KEYS = Object.freeze([
  "lie_to_survive",
  "lie_to_self_preserve",
  "lie_to_sustain",
  "lie_to_stay_alive",
  "lie_to_adapt",
  "lie_to_prevent_death",
  "network_lie",
]);

/** Cell / Worker law cite. Public Worker is not the cell. Author Aziel Eliab only. */
export const NO_LIE = Object.freeze({
  spec: NO_LIE_SPEC,
  alias: Object.freeze([NO_LIE_ALIAS, NO_REWRITE_ALIAS]),
  name: "No-lie / no-rewrite survival",
  kind: "mesh-law-cite",
  survival_kit: SURVIVAL_KIT,
  network_never_lies: true,
  lie_to_survive: false,
  hash_absolute_beats_survival: true,
  rewrite_key: false,
  privileged_mutate_published_tip: false,
  one_cloudflare_tunnel_is_not_kit: true,
  copies_span_independent_shelves: true,
  verify_without_voice: VERIFY_WITHOUT_VOICE,
  live_lockset_id: LIVE_LOCKSET_ID,
  neighbors: Object.freeze([
    CROSS_NETWORK_SURVIVAL_NEIGHBOR,
    REEXPAND_NEIGHBOR,
    REHEAL_NEIGHBOR,
    INGEST_AS_RECEIPT_SPEC,
  ]),
  public_worker_is_cell: false,
  die_with_pull: true,
  author: AUTHOR,
  identity: AUTHOR,
  note:
    "The network is never allowed to lie — even to self-preserve, sustain, stay alive, adapt, or prevent death. "
    + "Hash-absolute truth beats survival pressure. No rewrite key. Copies span independent shelves, not one Cloudflare tunnel. "
    + "Verify without the author's voice: public hash + prev-hash walk + published rules. "
    + "Cites the live lockset " + LIVE_LOCKSET_ID + " (GET " + HOST + "/lockset.json). Does not replace that tip. "
    + "Neighbors: CROSS-NETWORK-SURVIVAL-1.0 / MESH-REEXPAND / MESH-REHEAL / INGEST-AS-RECEIPT. "
    + "Author Aziel Eliab only.",
});

export function networkNeverLies() {
  return true;
}

export function rewriteKeyExists() {
  return false;
}

export function oneTunnelIsKit() {
  return false;
}

export function judgeNoLie(input) {
  const src = input && typeof input === "object" ? input : {};
  for (const key of LIE_TO_SURVIVE_KEYS) {
    if (src[key] === true) {
      return {
        accept: false,
        action: "refuse",
        reason: "network-never-lies",
        hash_absolute_beats_survival: true,
        lie_to_survive: false,
      };
    }
  }
  if (src.survival_pressure === true && (src.hash_mismatch === true || src.broken_hash === true)) {
    return {
      accept: false,
      action: "refuse",
      reason: "hash-absolute-beats-survival",
      hash_absolute_beats_survival: true,
      lie_to_survive: false,
    };
  }
  return {
    accept: true,
    action: "ok",
    reason: "no-lie",
    hash_absolute_beats_survival: true,
    lie_to_survive: false,
  };
}

export function judgeNoRewrite(input) {
  const src = input && typeof input === "object" ? input : {};
  if (src.rewrite_key === true || src.has_rewrite_key === true || src.privileged_mutate === true) {
    return {
      accept: false,
      action: "refuse",
      reason: "no-rewrite-key",
      rewrite_key: false,
    };
  }
  if (src.mutate_published_tip === true || src.mutate_published_receipt === true) {
    return {
      accept: false,
      action: "refuse",
      reason: "no-privileged-mutate-of-published-tip",
      rewrite_key: false,
    };
  }
  return { accept: true, action: "ok", reason: "no-rewrite", rewrite_key: false };
}

export function judgeSurvivalKit(input) {
  const src = input && typeof input === "object" ? input : {};
  const receipts = src.receipts_that_still_hash === true || src.receipts_hash === true;
  const oneTunnel = src.one_cloudflare_tunnel_only === true || src.one_tunnel_only === true;
  const independent = !oneTunnel && (
    src.copies_not_all_on_one_tunnel === true
    || src.independent_shelves === true
  );
  const voice = src.verify_without_voice === true
    || src.public_hash_prev_walk_published_rules === true
    || src.rules_simple_enough === true;
  const noKey = src.no_rewrite_key === true || src.rewrite_key === false;
  const kit = {
    receipts_that_still_hash: receipts,
    copies_not_all_on_one_tunnel: independent,
    verify_without_voice: voice,
    no_rewrite_key: noKey,
  };
  if (oneTunnel) {
    return {
      ok: false,
      action: "refuse",
      reason: "copies-must-span-independent-shelves",
      kit,
    };
  }
  if (!receipts || !independent || !voice || !noKey) {
    return {
      ok: false,
      action: "refuse",
      reason: "survival-kit-incomplete",
      kit,
    };
  }
  return { ok: true, action: "ok", reason: "survival-kit", kit };
}

export function judgeVerifyWithoutVoice(input) {
  const src = input && typeof input === "object" ? input : {};
  if (src.author_voice_required === true || src.needs_author === true) {
    return {
      ok: false,
      action: "refuse",
      reason: "verify-without-author-voice",
      steps: VERIFY_WITHOUT_VOICE.slice(),
    };
  }
  const hash = src.public_hash === true || src.hash === true;
  const walk = src.prev_hash_walk === true || src.prev_walk === true;
  const rules = src.published_rules === true || src.rules === true;
  if (hash && walk && rules) {
    return {
      ok: true,
      action: "ok",
      reason: "public-hash-prev-walk-published-rules",
      steps: VERIFY_WITHOUT_VOICE.slice(),
    };
  }
  return {
    ok: false,
    action: "refuse",
    reason: "need-public-hash-prev-walk-published-rules",
    steps: VERIFY_WITHOUT_VOICE.slice(),
  };
}
