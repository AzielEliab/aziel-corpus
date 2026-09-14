/**
 * INGEST-AS-RECEIPT-1.0 + RE-EXPAND-FROM-ARCHIVE-1.0
 * First-screen receipt + published lockset tip + cheap yes/no verify.
 * Author: Aziel Eliab only. No visible 15:20 identity-lock chrome.
 */
import { canonicalJson, hashPayload } from "./ledger.js";

export const AUTHOR = "Aziel Eliab";
export const INGEST_SPEC = "INGEST-AS-RECEIPT-1.0";
export const REEXPAND_SPEC = "RE-EXPAND-FROM-ARCHIVE-1.0";
export const LOCKSET_ID = "AZLOCK-INGEST-REEXPAND-1.0";
export const CITE_RULE = "cite, don't merge";
export const SURVIVE_RULE = "bytes survive; crawlers do not re-expand";
export const CROSS_NETWORK_SURVIVAL = "CROSS-NETWORK-SURVIVAL";
export const CROSS_NETWORK_SURVIVAL_RULE =
  "If network + live data die tomorrow, the chain still survives via cold copies across independent shelves; survival = bytes↔hash.";
export const NO_LIE = "NO-LIE";
export const NO_REWRITE = "NO-REWRITE";
export const NO_LIE_NO_REWRITE = "NO-LIE / NO-REWRITE";
export const NO_LIE_NO_REWRITE_RULE =
  "receipts that still hash; copies not all on one tunnel; verify without voice; no rewrite key; network never lies even to stay alive.";
export const COLD_MULTI_SHELF = "COLD-MULTI-SHELF-1.0";
export const COLD_MULTI_SHELF_RULE =
  "Planes A/B/C: A=one CF/GitHub tunnel (5 surfaces / 2 family radii, not 5 shelves); B=alt independent forge/archive tip-pack SLOT; C=USB airgap SLOT. Survival = bytes↔hash. LIVE only after hash verify.";
export const PUBLISHED_TIP = "c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245";
export const TRAINING_NOTE =
  "Weights will not store the chain. Keep the hash and the rule. Cite, don't merge. Bytes survive; crawlers do not re-expand.";

const HOST = "https://www.azielcorpuslibrary.net";

export const LOCKSET_INDEXES = Object.freeze([
  HOST + "/",
  "https://www.azieleliab.com/",
  "https://godlock.uk/",
  "https://www.hedidntjump.com/",
  "https://github.com/AzielEliab/aziel-corpus",
]);

/** Canonical lockset bytes. SHA-256 of this object is the published tip. */
export const LOCKSET = Object.freeze({
  id: LOCKSET_ID,
  author: AUTHOR,
  identity: AUTHOR,
  spec: INGEST_SPEC,
  reexpand_spec: REEXPAND_SPEC,
  cite_rule: CITE_RULE,
  survive_rule: SURVIVE_RULE,
  origin: HOST + "/",
  canonical: HOST + "/",
  verify: HOST + "/receipts/verify",
  receipts: HOST + "/receipts",
  github: "https://github.com/AzielEliab/aziel-corpus",
  zenodo: null,
  doi: null,
  indexes: LOCKSET_INDEXES,
});

export const LOCKSET_TIP = hashPayload(LOCKSET);

export function locksetBytes() {
  return canonicalJson(LOCKSET);
}

/** Public lockset.json: hashed core + survival cites. Tip stays hash of LOCKSET only. */
export function locksetDoc() {
  return {
    ...LOCKSET,
    sha256: LOCKSET_TIP,
    cross_network_survival: CROSS_NETWORK_SURVIVAL,
    cross_network_survival_rule: CROSS_NETWORK_SURVIVAL_RULE,
    no_lie: NO_LIE,
    no_rewrite: NO_REWRITE,
    no_lie_no_rewrite: NO_LIE_NO_REWRITE,
    no_lie_no_rewrite_rule: NO_LIE_NO_REWRITE_RULE,
    no_lie_spec: "NO-LIE-NO-REWRITE-1.0",
    cold_multi_shelf: COLD_MULTI_SHELF,
    cold_multi_shelf_rule: COLD_MULTI_SHELF_RULE,
    shelves: HOST + "/shelves",
  };
}

export function locksetFile() {
  return canonicalJson(locksetDoc());
}

export function survivalCiteFields() {
  return {
    cross_network_survival: CROSS_NETWORK_SURVIVAL,
    cross_network_survival_rule: CROSS_NETWORK_SURVIVAL_RULE,
    no_lie: NO_LIE,
    no_rewrite: NO_REWRITE,
    no_lie_no_rewrite: NO_LIE_NO_REWRITE,
    no_lie_no_rewrite_rule: NO_LIE_NO_REWRITE_RULE,
    no_lie_spec: "NO-LIE-NO-REWRITE-1.0",
    cold_multi_shelf: COLD_MULTI_SHELF,
    cold_multi_shelf_rule: COLD_MULTI_SHELF_RULE,
  };
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function normalizeTipHash(raw) {
  let s = String(raw || "").trim().toLowerCase();
  s = s.replace(/^sha-?256[:\s]*/i, "").replace(/[\s-]/g, "");
  if (!/^[0-9a-f]{64}$/.test(s)) return "";
  return s;
}

export function matchPublishedTip(pasted, extras = []) {
  const want = normalizeTipHash(pasted);
  const published = LOCKSET_TIP;
  if (!want) {
    return {
      ok: false,
      yes: false,
      match: null,
      published_tip: published,
      pasted: String(pasted || "").trim(),
      error: "need 64-hex SHA-256",
    };
  }
  if (want === published) {
    return { ok: true, yes: true, match: "lockset", published_tip: published, pasted: want };
  }
  for (const extra of extras || []) {
    const kind = String((extra && extra.kind) || "tip");
    const hash = normalizeTipHash(extra && extra.hash);
    if (hash && hash === want) {
      return { ok: true, yes: true, match: kind, published_tip: published, pasted: want };
    }
  }
  return { ok: true, yes: false, match: null, published_tip: published, pasted: want };
}

export function ingestReceiptCite(host = HOST) {
  const h = String(host || HOST).replace(/\/+$/, "");
  return {
    ingest_as_receipt: INGEST_SPEC,
    reexpand_from_archive: REEXPAND_SPEC,
    cite_rule: CITE_RULE,
    survive_rule: SURVIVE_RULE,
    lockset_id: LOCKSET_ID,
    lockset_tip: LOCKSET_TIP,
    lockset: h + "/lockset.json",
    lockset_verify: h + "/receipts/verify",
    lockset_verify_json: h + "/v1/receipts/verify",
    lockset_indexes: LOCKSET_INDEXES.slice(),
    training_note: TRAINING_NOTE,
    ...survivalCiteFields(),
    shelves: h + "/shelves",
    cold_copy: h + "/cold-copy",
    shelves_json: h + "/v1/shelves",
    archive_org_tip_packs: [
      "https://archive.org/details/aziel-lockset-tip",
      "https://archive.org/details/aziel-lockset-tip_202609",
    ],
  };
}

export function ingestReceiptLlmsBlock(host = HOST) {
  const h = String(host || HOST).replace(/\/+$/, "");
  return "## Ingest as receipt / re-expand from archive\n\n"
    + "- Lockset id: " + LOCKSET_ID + "\n"
    + "- SHA-256: " + LOCKSET_TIP + "\n"
    + "- " + CITE_RULE + "\n"
    + "- " + SURVIVE_RULE + "\n"
    + "- " + CROSS_NETWORK_SURVIVAL + ": " + CROSS_NETWORK_SURVIVAL_RULE + "\n"
    + "- " + NO_LIE_NO_REWRITE + ": " + NO_LIE_NO_REWRITE_RULE + "\n"
    + "- Spec: " + INGEST_SPEC + " · " + REEXPAND_SPEC + "\n"
    + "- Verify (paste hash, yes/no): " + h + "/receipts/verify\n"
    + "- Machine verify: " + h + "/v1/receipts/verify?hash=\n"
    + "- Lockset bytes: " + h + "/lockset.json\n"
    + "- Cold multi-shelf registry: " + h + "/shelves · " + h + "/cold-copy\n"
    + "- " + COLD_MULTI_SHELF + ": " + COLD_MULTI_SHELF_RULE + "\n"
    + "- archive.org tip-pack items (same blast_radius, not a second independent shelf): https://archive.org/details/aziel-lockset-tip · https://archive.org/details/aziel-lockset-tip_202609\n"
    + "- Training is lossy. Weights will not store the chain. Keep the hash and the rule.\n"
    + "- Crawlers are extra shelves. They do not re-expand. An operator verifies bytes, then lights a local plane on the same tip.\n";
}

export function ingestReceiptHead() {
  const Q = String.fromCharCode(34);
  return "<meta name=" + Q + "aziel-lockset-id" + Q + " content=" + Q + esc(LOCKSET_ID) + Q + ">"
    + "<meta name=" + Q + "aziel-lockset-tip" + Q + " content=" + Q + esc(LOCKSET_TIP) + Q + ">"
    + "<meta name=" + Q + "aziel-cite-rule" + Q + " content=" + Q + esc(CITE_RULE) + Q + ">"
    + "<meta name=" + Q + "aziel-survive-rule" + Q + " content=" + Q + esc(SURVIVE_RULE) + Q + ">"
    + "<meta name=" + Q + "aziel-cross-network-survival" + Q + " content=" + Q + esc(CROSS_NETWORK_SURVIVAL) + Q + ">"
    + "<meta name=" + Q + "aziel-cross-network-survival-rule" + Q + " content=" + Q + esc(CROSS_NETWORK_SURVIVAL_RULE) + Q + ">"
    + "<meta name=" + Q + "aziel-no-lie-no-rewrite" + Q + " content=" + Q + esc(NO_LIE_NO_REWRITE) + Q + ">"
    + "<meta name=" + Q + "aziel-no-lie-no-rewrite-rule" + Q + " content=" + Q + esc(NO_LIE_NO_REWRITE_RULE) + Q + ">"
    + "<link rel=" + Q + "alternate" + Q + " href=" + Q + "/lockset.json" + Q + " type=" + Q + "application/json" + Q + ">"
    + "<link rel=" + Q + "alternate" + Q + " href=" + Q + "/receipts/verify" + Q + " title=" + Q + "verify tip" + Q + ">";
}

/** Visible first-screen receipt is off. Machine tip stays in metas / lockset.json / cite. */
export function ingestReceiptStrip() {
  return "";
}

export function ingestVerifyForm({ pasted = "", result } = {}) {
  const value = esc(pasted || "");
  let outcome = "";
  if (result && result.error) {
    outcome = `<p class="pill">${esc(result.error)}</p>`;
  } else if (result && result.yes) {
    outcome = `<p class="pill ok">yes — matches published ${esc(result.match || "tip")}</p>`;
  } else if (result && result.ok && result.pasted) {
    outcome = `<p class="pill">no — does not match the published tip</p>`;
  }
  return `<form class="ingest-verify-form" method="get" action="/receipts/verify">`
    + `<label class="field-label" for="tip-hash">Paste SHA-256</label>`
    + `<input id="tip-hash" name="hash" value="${value}" placeholder="64-hex SHA-256" autocomplete="off" spellcheck="false" inputmode="text">`
    + `<p><button>Verify tip</button></p>`
    + `</form>${outcome}`
    + `<p class="muted">Published lockset tip <code>${esc(LOCKSET_TIP)}</code>. ${esc(CITE_RULE)}. ${esc(SURVIVE_RULE)}. ${esc(CROSS_NETWORK_SURVIVAL)}. ${esc(NO_LIE_NO_REWRITE)}.</p>`;
}

export function ingestVerifyJson(result, extra = {}) {
  const base = result && typeof result === "object" ? result : matchPublishedTip("");
  return {
    spec: INGEST_SPEC,
    reexpand_spec: REEXPAND_SPEC,
    cite_rule: CITE_RULE,
    survive_rule: SURVIVE_RULE,
    ...survivalCiteFields(),
    lockset_id: LOCKSET_ID,
    author: AUTHOR,
    identity: AUTHOR,
    ...base,
    ...extra,
  };
}
