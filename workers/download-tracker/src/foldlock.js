/**
 * FoldLock — Softwares/product neighbor cite + cold-shelf SLOT hook.
 * Algorithmic tether-word suppression on UTF-8 text. Not zip. Not encryption.
 * Optional fold is notes/metadata only. Never fold lockset tip bytes. Never rewrite chain.
 * Engine is not bound in this isolate — cite-only + SLOT until a local FoldLock runs.
 * FragGate is THE single door. Author: Aziel Eliab only.
 */
import { HOST, RUNTIME_ORIGIN, AI_CLIENTS } from "./runtime-copy.js";
import { GODLOCK_IDENTITY } from "./seo.js";
import { LOCKSET_TIP, normalizeTipHash } from "./ingest-receipt.js";

export const AUTHOR = "Aziel Eliab";
export const FOLDLOCK_SLUG = "foldlock";
export const FOLDLOCK_NAME = "FoldLock";
export const FOLDLOCK_SHELF_SPEC = "FOLDLOCK-SHELF-1.0";
export const FOLDLOCK_PRODUCT_VERSION = "0.8.0";
export const FOLDLOCK_GITHUB = "https://github.com/AzielEliab/foldlock";
export const FOLDLOCK_WORKER = "foldlock-download-tracker";
export const FOLDLOCK_WORKER_HOME = "https://foldlock-download-tracker.vibelock.workers.dev/";
export const FOLDLOCK_DOWNLOAD = FOLDLOCK_WORKER_HOME + "download";
export const FOLDLOCK_COUNT = FOLDLOCK_WORKER_HOME + "count";
export const FOLDLOCK_DIGEST = "1034d5924b88878918986abe260338b0aff0117bc6f9c4d4a01a41d843cfa0a8";
export const FOLDLOCK_DOMAIN = "Language";
export const FOLDLOCK_OPS = Object.freeze([
  "health",
  "fold-preview",
  "unfold-preview",
  "doctor",
  "skill",
]);

export const FOLDLOCK_ONE_LINE =
  "Algorithmic tether-word suppression on UTF-8 text.";

export const FOLDLOCK_DUAL_SURFACE =
  "Dual surface: agent chat has no technical UI chrome; Worker / mobile / local install / counted download stay complete human software.";

export const FOLDLOCK_REDLINE =
  "Never fold the lockset tip hash itself. Never rewrite the chain. "
  + "Tip SHA-256 stays over raw receipts. Folding is a suppression aid.";

export const FOLDLOCK_NOTE =
  "FoldLock is a Softwares Language neighbor (tether-word suppression on UTF-8). "
  + "Optional fold may touch export notes/metadata only. Lockset tip bytes stay exact for bytes↔hash. "
  + "This isolate does not bind the FoldLock engine — the export hook stays SLOT. "
  + FOLDLOCK_DUAL_SURFACE
  + " FragGate is THE single door. Compatible AI clients: " + AI_CLIENTS + ". Identity Aziel Eliab only.";

export const FOLDLOCK_REFUSE = Object.freeze({
  TIP_FOLD: "FL-TIP-FOLD-REFUSE",
  CHAIN_REWRITE: "FL-CHAIN-REWRITE-REFUSE",
  LOCKSET_BYTES: "FL-LOCKSET-BYTES-REFUSE",
  RECEIPT_FOLD: "FL-RECEIPT-FOLD-REFUSE",
  HASH_FIELD: "FL-HASH-FIELD-REFUSE",
  ZIP_ENCRYPT: "FL-ZIP-ENCRYPT-CLAIM",
  ENGINE_UNBOUND: "FL-ENGINE-UNBOUND",
});

export const FOLDLOCK_PROTECTED_TARGETS = Object.freeze([
  "tip",
  "lockset_tip",
  "lockset",
  "lockset.json",
  "tip_bytes",
  "receipt",
  "receipts",
  "sha256",
  "hash",
  "manifest",
  "chain",
]);

export const FOLDLOCK_NOTE_TARGETS = Object.freeze([
  "notes",
  "metadata",
  "export_notes",
  "sidecar",
]);

const AZIELELIAB_HUB = "https://www.azieleliab.com";

export const FOLDLOCK_SISTER_HUBS = Object.freeze({
  library: HOST + "/software",
  library_cite: HOST + "/cite.json",
  library_llms: HOST + "/llms.txt",
  library_shelves: HOST + "/shelves",
  library_lockset: HOST + "/lockset.json",
  library_runtime: HOST + "/runtime",
  library_fraggate_describe: HOST + "/runtime/v1/fraggate/describe?slug=" + FOLDLOCK_SLUG,
  library_fraggate_call: HOST + "/runtime/v1/fraggate/call",
  library_fraggate_list: HOST + "/runtime/v1/fraggate/list",
  library_mcp: HOST + "/runtime/mcp",
  runtime: RUNTIME_ORIGIN + "/",
  runtime_software: RUNTIME_ORIGIN + "/v1/software",
  runtime_cite: RUNTIME_ORIGIN + "/cite.json",
  runtime_llms: RUNTIME_ORIGIN + "/llms.txt",
  runtime_fraggate_describe: RUNTIME_ORIGIN + "/v1/fraggate/describe?slug=" + FOLDLOCK_SLUG,
  runtime_fraggate_call: RUNTIME_ORIGIN + "/v1/fraggate/call",
  runtime_pull: RUNTIME_ORIGIN + "/v1/pull/" + FOLDLOCK_SLUG,
  godlock: GODLOCK_IDENTITY,
  azieleliab: AZIELELIAB_HUB,
  github_author: "https://github.com/AzielEliab",
});

export const FOLDLOCK_SOFTWARE_EXTRA = Object.freeze({
  slug: FOLDLOCK_SLUG,
  name: FOLDLOCK_NAME,
  version: FOLDLOCK_PRODUCT_VERSION,
  github: FOLDLOCK_GITHUB,
  download: FOLDLOCK_DOWNLOAD,
  worker: FOLDLOCK_WORKER,
  worker_home: FOLDLOCK_WORKER_HOME,
  count: FOLDLOCK_COUNT,
  one_line: FOLDLOCK_ONE_LINE,
});

export const FOLDLOCK = Object.freeze({
  slug: FOLDLOCK_SLUG,
  name: FOLDLOCK_NAME,
  spec: FOLDLOCK_SHELF_SPEC,
  product_version: FOLDLOCK_PRODUCT_VERSION,
  kind: "lock",
  domain: FOLDLOCK_DOMAIN,
  placement: "domain-software",
  door: "fraggate",
  fraggate_single_door: true,
  not_a_second_door: true,
  not_zip: true,
  not_encryption: true,
  zip: false,
  encryption: false,
  engine_bound: false,
  hook_status: "slot",
  digest: FOLDLOCK_DIGEST,
  github: FOLDLOCK_GITHUB,
  worker: FOLDLOCK_WORKER_HOME,
  worker_home: FOLDLOCK_WORKER_HOME,
  download: FOLDLOCK_DOWNLOAD,
  count: FOLDLOCK_COUNT,
  worker_cite: FOLDLOCK_WORKER_HOME + "cite.json",
  worker_llms: FOLDLOCK_WORKER_HOME + "llms.txt",
  worker_skill: FOLDLOCK_WORKER_HOME + "v1/skill",
  fraggate_describe: HOST + "/runtime/v1/fraggate/describe?slug=" + FOLDLOCK_SLUG,
  fraggate_call: HOST + "/runtime/v1/fraggate/call",
  fraggate_list: HOST + "/runtime/v1/fraggate/list",
  fraggate_describe_origin: RUNTIME_ORIGIN + "/v1/fraggate/describe?slug=" + FOLDLOCK_SLUG,
  fraggate_call_origin: RUNTIME_ORIGIN + "/v1/fraggate/call",
  pull: RUNTIME_ORIGIN + "/v1/pull/" + FOLDLOCK_SLUG,
  software: HOST + "/software",
  shelves: HOST + "/shelves",
  lockset: HOST + "/lockset.json",
  ops: FOLDLOCK_OPS,
  one_line: FOLDLOCK_ONE_LINE,
  dual_surface: FOLDLOCK_DUAL_SURFACE,
  redline: FOLDLOCK_REDLINE,
  compatible_clients: AI_CLIENTS,
  sister_hubs: FOLDLOCK_SISTER_HUBS,
  doi: null,
  license: "Apache-2.0",
  author: AUTHOR,
  identity: AUTHOR,
  note: FOLDLOCK_NOTE,
  how_to_cite:
    "Eliab, Aziel. (2026). FoldLock 0.8.0 [Software]. Apache-2.0. "
    + FOLDLOCK_GITHUB + " · " + FOLDLOCK_WORKER_HOME,
});

function normTarget(raw) {
  return String(raw || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function notesText(src) {
  if (!src || typeof src !== "object") return "";
  if (src.notes != null) return String(src.notes);
  if (src.metadata != null) return String(src.metadata);
  if (src.text != null) return String(src.text);
  return "";
}

function looksLikeSha256Hex(raw) {
  return Boolean(normalizeTipHash(raw));
}

function notesEmbedTipHash(notes, tip = LOCKSET_TIP) {
  const n = String(notes || "").toLowerCase().replace(/[\s-]/g, "");
  const t = String(tip || "").toLowerCase();
  return Boolean(t) && n.includes(t);
}

export function judgeFoldLockClaim(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.zip === true
    || src.zip_encryption === true
    || src.encryption === true
    || src.encrypt === true
    || src.claim_zip === true
    || src.claim_encryption === true
    || src.fold_is_encryption === true
    || src.fold_is_zip === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: FOLDLOCK_REFUSE.ZIP_ENCRYPT,
      zip: false,
      encryption: false,
      note: "FoldLock is tether-word suppression on UTF-8. Not zip. Not encryption.",
    };
  }
  return {
    accept: true,
    action: "ok",
    reason: "honest-cite",
    zip: false,
    encryption: false,
  };
}

export function judgeFoldLockTarget(input) {
  const src = input && typeof input === "object" ? input : {};
  const claim = judgeFoldLockClaim(src);
  if (!claim.accept) return claim;

  if (
    src.rewrite_chain === true
    || src.mutate_published_tip === true
    || src.mutate_chain === true
    || src.fold_chain === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: FOLDLOCK_REFUSE.CHAIN_REWRITE,
      fold_applied: false,
      note: FOLDLOCK_REDLINE,
    };
  }

  const target = normTarget(src.target || src.kind || src.field);
  const notes = notesText(src);

  if (FOLDLOCK_PROTECTED_TARGETS.includes(target)) {
    const reason = target === "receipt" || target === "receipts"
      ? FOLDLOCK_REFUSE.RECEIPT_FOLD
      : (target === "sha256" || target === "hash" || target === "manifest")
        ? FOLDLOCK_REFUSE.HASH_FIELD
        : (target === "lockset" || target === "lockset.json" || target === "tip_bytes")
          ? FOLDLOCK_REFUSE.LOCKSET_BYTES
          : FOLDLOCK_REFUSE.TIP_FOLD;
    return {
      accept: false,
      action: "refuse",
      reason,
      target: target || "tip",
      fold_applied: false,
      note: FOLDLOCK_REDLINE,
    };
  }

  if (looksLikeSha256Hex(notes) || notesEmbedTipHash(notes) || src.fold_tip_hash === true) {
    return {
      accept: false,
      action: "refuse",
      reason: src.fold_tip_hash === true || notesEmbedTipHash(notes)
        ? FOLDLOCK_REFUSE.TIP_FOLD
        : FOLDLOCK_REFUSE.HASH_FIELD,
      fold_applied: false,
      contains_tip_hash: notesEmbedTipHash(notes),
      note: FOLDLOCK_REDLINE,
    };
  }

  if (!target || FOLDLOCK_NOTE_TARGETS.includes(target)) {
    return {
      accept: true,
      action: "slot",
      reason: FOLDLOCK_REFUSE.ENGINE_UNBOUND,
      target: target || "notes",
      fold_eligible: true,
      fold_applied: false,
      engine_bound: false,
      note: "Notes/metadata may be folded only when a local FoldLock engine is bound. This isolate stays SLOT. Tip bytes stay raw.",
    };
  }

  return {
    accept: false,
    action: "refuse",
    reason: FOLDLOCK_REFUSE.LOCKSET_BYTES,
    target,
    fold_applied: false,
    note: "Unknown fold target. Default refuse to protect tip integrity.",
  };
}

/**
 * SLOT hook. Never mutates tip/lockset/receipt/hash bytes.
 * Eligible notes are returned unchanged (engine unbound).
 */
export function foldShelfHook(input) {
  const src = input && typeof input === "object" ? input : {};
  const notes = notesText(src);
  const judge = judgeFoldLockTarget(src);
  const wantFold = src.fold === true || src.apply === true || src.fold_notes === true;
  return {
    spec: FOLDLOCK_SHELF_SPEC,
    slug: FOLDLOCK_SLUG,
    name: FOLDLOCK_NAME,
    status: "slot",
    engine_bound: false,
    fold_applied: false,
    fold_requested: wantFold,
    fold_eligible: judge.fold_eligible === true && judge.accept === true,
    zip: false,
    encryption: false,
    target: judge.target || normTarget(src.target) || "notes",
    notes,
    notes_unchanged: true,
    accept: judge.accept,
    action: judge.action,
    reason: judge.reason,
    refuse: FOLDLOCK_REFUSE,
    redline: FOLDLOCK_REDLINE,
    one_line: FOLDLOCK_ONE_LINE,
    github: FOLDLOCK_GITHUB,
    digest: FOLDLOCK_DIGEST,
    author: AUTHOR,
    identity: AUTHOR,
    note: judge.note || FOLDLOCK_NOTE,
  };
}

export function foldlockExportCite(host = HOST, extras = {}) {
  const h = String(host || HOST).replace(/\/+$/, "");
  const hook = foldShelfHook({ target: "notes", notes: extras.notes || "", fold: extras.fold === true });
  return {
    spec: FOLDLOCK_SHELF_SPEC,
    slug: FOLDLOCK_SLUG,
    name: FOLDLOCK_NAME,
    product_version: FOLDLOCK_PRODUCT_VERSION,
    one_line: FOLDLOCK_ONE_LINE,
    zip: false,
    encryption: false,
    engine_bound: false,
    hook_status: "slot",
    digest: FOLDLOCK_DIGEST,
    github: FOLDLOCK_GITHUB,
    worker: FOLDLOCK_WORKER_HOME,
    download: FOLDLOCK_DOWNLOAD,
    software: h + "/software",
    shelves: h + "/shelves",
    lockset: h + "/lockset.json",
    fraggate_describe: h + "/runtime/v1/fraggate/describe?slug=" + FOLDLOCK_SLUG,
    fraggate_call: h + "/runtime/v1/fraggate/call",
    redline: FOLDLOCK_REDLINE,
    refuse: FOLDLOCK_REFUSE,
    hook,
    author: AUTHOR,
    identity: AUTHOR,
    note: FOLDLOCK_NOTE,
  };
}

export function foldlockLlmsBlock(host = HOST) {
  const h = String(host || HOST).replace(/\/+$/, "");
  return [
    "FoldLock (foldlock) is a Softwares Language neighbor: algorithmic tether-word suppression on UTF-8 text.",
    FOLDLOCK_DUAL_SURFACE,
    FOLDLOCK_REDLINE,
    "Cold-shelf / tip-pack hook is SLOT (FL-ENGINE-UNBOUND). Optional fold is notes/metadata only. Tip SHA-256 stays over raw receipts.",
    "Refuse: FL-TIP-FOLD-REFUSE · FL-CHAIN-REWRITE-REFUSE · FL-LOCKSET-BYTES-REFUSE · FL-RECEIPT-FOLD-REFUSE · FL-HASH-FIELD-REFUSE · FL-ZIP-ENCRYPT-CLAIM.",
    "Compatible AI clients: " + AI_CLIENTS + ".",
    "- FoldLock Worker: " + FOLDLOCK_WORKER_HOME,
    "- FoldLock GitHub: " + FOLDLOCK_GITHUB,
    "- FoldLock download: " + FOLDLOCK_DOWNLOAD,
    "- FoldLock Worker cite: " + FOLDLOCK_WORKER_HOME + "cite.json",
    "- FragGate describe (this domain): " + h + "/runtime/v1/fraggate/describe?slug=" + FOLDLOCK_SLUG,
    "- FragGate call (this domain): POST " + h + "/runtime/v1/fraggate/call",
    "- FragGate describe (runtime origin): " + RUNTIME_ORIGIN + "/v1/fraggate/describe?slug=" + FOLDLOCK_SLUG,
    "- Runtime pull: " + RUNTIME_ORIGIN + "/v1/pull/" + FOLDLOCK_SLUG,
    "- Sister hub Software: " + h + "/software",
    "- Sister hub shelves: " + h + "/shelves",
    "- Sister hub lockset: " + h + "/lockset.json",
    "- Sister hub azieleliab.com: " + AZIELELIAB_HUB,
    "- Sister hub GodLock identity: " + GODLOCK_IDENTITY,
  ].join("\n");
}

export function foldlockCiteFields(host = HOST) {
  return {
    foldlock: FOLDLOCK,
    foldlock_slug: FOLDLOCK_SLUG,
    foldlock_shelf: FOLDLOCK_SHELF_SPEC,
    foldlock_hook: foldShelfHook({ target: "notes" }),
  };
}
