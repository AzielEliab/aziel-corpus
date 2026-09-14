#!/usr/bin/env node
/**
 * COLD-MULTI-SHELF-1.0 CLI helpers.
 * Author: Aziel Eliab only.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  COLD_MULTI_SHELF_SPEC,
  CORE_DOC_PATHS,
  LOCKSET_TIP,
  REFUSE,
  exportPack,
  hashManifestFromMap,
  shelfRegistryDoc,
  shelvesDoc,
  verifyManifestEntry,
  verifyPasteHash,
  judgeAzGenOverclaim,
  judgeInventedDeposit,
  judgeInventedPhyDnsIcann,
  judgeNeighborVoteHeal,
  judgeTrainingResidueShelf,
} from "../../workers/download-tracker/src/cold-shelf.js";

export {
  COLD_MULTI_SHELF_SPEC,
  CORE_DOC_PATHS,
  LOCKSET_TIP,
  REFUSE,
  exportPack,
  hashManifestFromMap,
  shelfRegistryDoc,
  shelvesDoc,
  verifyManifestEntry,
  verifyPasteHash,
  judgeAzGenOverclaim,
  judgeInventedDeposit,
  judgeInventedPhyDnsIcann,
  judgeNeighborVoteHeal,
  judgeTrainingResidueShelf,
};

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, "../..");

export function sha256File(absPath) {
  return createHash("sha256").update(readFileSync(absPath)).digest("hex");
}

export function hashCoreDocs(root = REPO_ROOT) {
  const files = {};
  for (const rel of CORE_DOC_PATHS) {
    files[rel] = sha256File(join(root, rel));
  }
  return files;
}

export function buildExport(root = REPO_ROOT) {
  const fileHashes = hashCoreDocs(root);
  return exportPack({ fileHashes });
}

export function writeExport(outDir, pack) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "lockset.json"), pack.lockset_file);
  writeFileSync(join(outDir, "ingest-as-receipt.json"), JSON.stringify(pack.ingest_as_receipt, null, 2) + "\n");
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(pack.manifest, null, 2) + "\n");
  writeFileSync(join(outDir, "registry.json"), JSON.stringify(pack.registry, null, 2) + "\n");
  writeFileSync(join(outDir, "export.json"), JSON.stringify({
    spec: pack.spec,
    lockset_id: pack.lockset_id,
    lockset_tip: pack.lockset_tip,
    cold_multi_shelf: pack.cold_multi_shelf,
    manifest: pack.manifest,
  }, null, 2) + "\n");
  return outDir;
}

export function verifyFileAgainstPack(absPath, pack, relPath) {
  const got = sha256File(absPath);
  const tip = verifyPasteHash(got);
  if (tip.yes) return { ...tip, path: relPath || absPath, via: "lockset-tip" };
  return { ...verifyManifestEntry(relPath, got, pack.manifest), via: "manifest", file_sha256: got };
}
