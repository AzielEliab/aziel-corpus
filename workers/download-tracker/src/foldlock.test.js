import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { citeDoc, llmsDoc, humansTxt, aiTxt } from "./crawl.js";
import {
  SOFTWARE_EXTRAS,
  mergeSoftwareExtras,
  collectCatalogProducts,
  softwareKind,
  productLinks,
  countUrlForProduct,
  displayName,
} from "./software-catalog.js";
import {
  COLD_MULTI_SHELF_SPEC,
  CORE_DOC_PATHS,
  LOCKSET_TIP,
  exportPack,
  shelvesDoc,
  shelvesLlmsBlock,
} from "./cold-shelf.js";
import {
  FOLDLOCK,
  FOLDLOCK_SLUG,
  FOLDLOCK_SHELF_SPEC,
  FOLDLOCK_SOFTWARE_EXTRA,
  FOLDLOCK_WORKER_HOME,
  FOLDLOCK_DOWNLOAD,
  FOLDLOCK_COUNT,
  FOLDLOCK_GITHUB,
  FOLDLOCK_REFUSE,
  FOLDLOCK_DIGEST,
  foldShelfHook,
  foldlockExportCite,
  foldlockLlmsBlock,
  judgeFoldLockClaim,
  judgeFoldLockTarget,
} from "./foldlock.js";
import { LOCKSET_TIP as PUBLISHED } from "./ingest-receipt.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("FoldLock cite is Language neighbor, not zip, not encryption, FragGate only", () => {
  assert.equal(FOLDLOCK.slug, "foldlock");
  assert.equal(FOLDLOCK.name, "FoldLock");
  assert.equal(FOLDLOCK.spec, FOLDLOCK_SHELF_SPEC);
  assert.equal(FOLDLOCK.domain, "Language");
  assert.equal(FOLDLOCK.door, "fraggate");
  assert.equal(FOLDLOCK.fraggate_single_door, true);
  assert.equal(FOLDLOCK.not_zip, true);
  assert.equal(FOLDLOCK.not_encryption, true);
  assert.equal(FOLDLOCK.zip, false);
  assert.equal(FOLDLOCK.encryption, false);
  assert.equal(FOLDLOCK.engine_bound, false);
  assert.equal(FOLDLOCK.hook_status, "slot");
  assert.equal(FOLDLOCK.digest, FOLDLOCK_DIGEST);
  assert.equal(FOLDLOCK.github, FOLDLOCK_GITHUB);
  assert.equal(FOLDLOCK.identity, "Aziel Eliab");
  assert.equal(FOLDLOCK.doi, null);
  assert.match(FOLDLOCK.one_line, /Not zip/);
  assert.match(FOLDLOCK.redline, /Never fold the lockset tip hash/);
  assert.match(FOLDLOCK.redline, /not encryption/);
  assert.doesNotMatch(FOLDLOCK.one_line, /encrypt/i);
  assert.doesNotMatch(JSON.stringify(FOLDLOCK), BANNED);
  assert.doesNotMatch(FOLDLOCK.dual_surface, /Flutter/);
});

test("FoldLock judges refuse tip/chain/zip; notes stay SLOT unbound", () => {
  assert.equal(judgeFoldLockClaim({ zip: true }).reason, FOLDLOCK_REFUSE.ZIP_ENCRYPT);
  assert.equal(judgeFoldLockClaim({ encryption: true }).reason, FOLDLOCK_REFUSE.ZIP_ENCRYPT);
  assert.equal(judgeFoldLockClaim({ fold_is_encryption: true }).accept, false);
  assert.equal(judgeFoldLockClaim({}).zip, false);

  assert.equal(judgeFoldLockTarget({ target: "tip" }).reason, FOLDLOCK_REFUSE.TIP_FOLD);
  assert.equal(judgeFoldLockTarget({ target: "lockset.json" }).reason, FOLDLOCK_REFUSE.LOCKSET_BYTES);
  assert.equal(judgeFoldLockTarget({ target: "receipt" }).reason, FOLDLOCK_REFUSE.RECEIPT_FOLD);
  assert.equal(judgeFoldLockTarget({ target: "sha256" }).reason, FOLDLOCK_REFUSE.HASH_FIELD);
  assert.equal(judgeFoldLockTarget({ rewrite_chain: true }).reason, FOLDLOCK_REFUSE.CHAIN_REWRITE);
  assert.equal(judgeFoldLockTarget({ notes: PUBLISHED }).reason, FOLDLOCK_REFUSE.TIP_FOLD);
  assert.equal(judgeFoldLockTarget({ notes: "a".repeat(64) }).reason, FOLDLOCK_REFUSE.HASH_FIELD);

  const notes = judgeFoldLockTarget({ target: "notes", notes: "operator shelf annotation" });
  assert.equal(notes.accept, true);
  assert.equal(notes.action, "slot");
  assert.equal(notes.reason, FOLDLOCK_REFUSE.ENGINE_UNBOUND);
  assert.equal(notes.fold_applied, false);
  assert.equal(notes.fold_eligible, true);

  const hook = foldShelfHook({ target: "notes", notes: "sensitive export note", fold: true });
  assert.equal(hook.status, "slot");
  assert.equal(hook.fold_applied, false);
  assert.equal(hook.fold_requested, true);
  assert.equal(hook.notes, "sensitive export note");
  assert.equal(hook.notes_unchanged, true);
  assert.equal(hook.encryption, false);
  assert.equal(hook.zip, false);
  assert.equal(hook.reason, FOLDLOCK_REFUSE.ENGINE_UNBOUND);

  const tipHook = foldShelfHook({ target: "tip", fold: true });
  assert.equal(tipHook.accept, false);
  assert.equal(tipHook.fold_applied, false);
  assert.equal(tipHook.reason, FOLDLOCK_REFUSE.TIP_FOLD);
});

test("export pack cites FoldLock sidecar without touching the lockset tip", () => {
  const pack = exportPack({ fileHashes: { "docs/lockset.json": PUBLISHED } });
  assert.equal(pack.lockset_tip, LOCKSET_TIP);
  assert.equal(pack.foldlock.slug, FOLDLOCK_SLUG);
  assert.equal(pack.foldlock.zip, false);
  assert.equal(pack.foldlock.encryption, false);
  assert.equal(pack.foldlock.hook_status, "slot");
  assert.equal(pack.foldlock.hook.fold_applied, false);
  assert.equal(pack.foldlock.hook.engine_bound, false);
  assert.match(pack.foldlock.redline, /Never fold the lockset tip hash/);
  assert.equal(pack.foldlock.refuse.TIP_FOLD, "FL-TIP-FOLD-REFUSE");
  assert.ok(CORE_DOC_PATHS.includes("docs/FOLDLOCK-SHELF-1.0.md"));

  const cite = foldlockExportCite();
  assert.equal(cite.spec, FOLDLOCK_SHELF_SPEC);
  assert.equal(cite.hook.fold_applied, false);
  assert.match(cite.fraggate_describe, /slug=foldlock/);
});

test("public cite.json / shelves / llms mention FoldLock honestly", () => {
  const cite = citeDoc();
  assert.equal(cite.foldlock.slug, FOLDLOCK_SLUG);
  assert.equal(cite.foldlock_slug, "foldlock");
  assert.equal(cite.foldlock_shelf, FOLDLOCK_SHELF_SPEC);
  assert.ok(cite.keywords.includes("FoldLock"));
  assert.ok(cite.keywords.includes("foldlock"));
  assert.equal(cite.foldlock.zip, false);
  assert.equal(cite.foldlock.encryption, false);
  assert.match(cite.foldlock.github, /foldlock/);
  assert.match(cite.foldlock.fraggate_describe, /slug=foldlock/);
  assert.match(cite.foldlock.redline, /not encryption/);
  assert.doesNotMatch(JSON.stringify(cite.foldlock), BANNED);
  assert.doesNotMatch(JSON.stringify(cite.foldlock), /zip encryption/i);

  const shelves = shelvesDoc();
  assert.equal(shelves.spec, COLD_MULTI_SHELF_SPEC);
  assert.equal(shelves.foldlock.slug, "foldlock");
  assert.equal(shelves.foldlock.hook_status, "slot");
  assert.equal(shelves.registry.foldlock.slug, "foldlock");

  const llms = llmsDoc("LIMIT");
  assert.match(llms, /FoldLock/);
  assert.match(llms, /foldlock/);
  assert.match(llms, /Not zip/);
  assert.match(llms, /Not encryption/);
  assert.match(llms, /FL-TIP-FOLD-REFUSE/);
  assert.match(llms, /FL-ENGINE-UNBOUND/);
  assert.match(llms, /foldlock-download-tracker\.vibelock\.workers\.dev/);
  assert.match(llms, /github\.com\/AzielEliab\/foldlock/);
  assert.match(shelvesLlmsBlock(), /FoldLock/);
  assert.match(foldlockLlmsBlock(), /SLOT/);

  const humans = humansTxt();
  assert.match(humans, /FoldLock/);
  const ai = aiTxt("LIMIT");
  assert.match(ai, /FoldLock/);
  assert.match(ai, /foldlock/);
});

test("SOFTWARE_EXTRAS lists FoldLock fallback without claiming zip", () => {
  assert.ok(SOFTWARE_EXTRAS.some((p) => p.slug === "foldlock"));
  assert.equal(SOFTWARE_EXTRAS.length, 6);
  assert.equal(softwareKind(FOLDLOCK_SOFTWARE_EXTRA), "lock");
  assert.equal(displayName({ slug: "foldlock" }), "FoldLock");
  const merged = mergeSoftwareExtras(collectCatalogProducts({
    products: [{ slug: "peacelock", name: "PeaceLock" }],
  }));
  const fl = merged.find((p) => p.slug === "foldlock");
  assert.ok(fl);
  assert.equal(fl.worker_home, FOLDLOCK_WORKER_HOME);
  assert.equal(fl.download, FOLDLOCK_DOWNLOAD);
  assert.equal(fl.github, FOLDLOCK_GITHUB);
  assert.equal(countUrlForProduct(fl), FOLDLOCK_COUNT);
  assert.equal(countUrlForProduct({ slug: "foldlock", count: null }), FOLDLOCK_COUNT);
  assert.match(fl.one_line, /Not zip/);
  const links = productLinks(SOFTWARE_EXTRAS.find((p) => p.slug === "foldlock"));
  assert.ok(links.some((l) => l.primary && l.href === FOLDLOCK_DOWNLOAD));
  assert.ok(links.some((l) => l.label === "GitHub" && l.href === FOLDLOCK_GITHUB));
  assert.ok(links.some((l) => /fraggate\/describe\?slug=foldlock/.test(l.href)));
});

test("CLI fold notes is SLOT; tip target refuses; lockset tip verify still yes", () => {
  const notes = spawnSync("node", ["tools/cold_shelf/cli.mjs", "fold", "--notes", "operator annotation"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(notes.status, 0, notes.stderr);
  assert.match(notes.stdout, /FL-ENGINE-UNBOUND/);
  assert.match(notes.stdout, /"fold_applied": false/);
  assert.match(notes.stdout, /"status": "slot"/);

  const tip = spawnSync("node", ["tools/cold_shelf/cli.mjs", "fold", "--target", "tip"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(tip.status, 2);
  assert.match(tip.stdout, /FL-TIP-FOLD-REFUSE/);

  const zip = spawnSync("node", ["tools/cold_shelf/cli.mjs", "fold", "--notes", "x", "--zip"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(zip.status, 2);
  assert.match(zip.stdout, /FL-ZIP-ENCRYPT-CLAIM/);

  const verify = spawnSync("node", ["tools/cold_shelf/cli.mjs", "verify", "--hash", PUBLISHED], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(verify.status, 0, verify.stderr);
  assert.match(verify.stdout, /"yes": true/);
});
