#!/usr/bin/env node
/**
 * COLD-MULTI-SHELF-1.0 CLI helpers.
 * Author: Aziel Eliab only.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
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

export function writeSha256Sums(dir, names) {
  const lines = [];
  for (const name of names) {
    lines.push(sha256File(join(dir, name)) + "  " + name);
  }
  const body = lines.join("\n") + "\n";
  writeFileSync(join(dir, "SHA256SUMS"), body);
  return body;
}

export function verifySha256Sums(dir) {
  const raw = readFileSync(join(dir, "SHA256SUMS"), "utf8");
  const rows = [];
  for (const line of raw.split("\n")) {
    const m = line.match(/^([0-9a-f]{64})  (.+)$/);
    if (!m) continue;
    const got = sha256File(join(dir, m[2]));
    rows.push({ file: m[2], published: m[1], pasted: got, yes: got === m[1] });
  }
  return { ok: rows.length > 0 && rows.every((r) => r.yes), rows };
}

export function writeVerifyAirgapScript(dir) {
  const script = `#!/bin/sh
# COLD-MULTI-SHELF-1.0 Plane C verify — Aziel Eliab only
# Survival = bytes↔hash. No invented DOI. No AZ-GEN live ICANN publish.
set -e
DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
cd "$DIR"
TIP="${LOCKSET_TIP}"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum -c SHA256SUMS
else
  node --input-type=module -e "import { verifySha256Sums } from 'file://$DIR/../../index.mjs'; const r = verifySha256Sums('$DIR'); if (!r.ok) { console.error(r); process.exit(2); }"
fi
if [ -f lockset.json ]; then
  echo "lockset present; published tip $TIP"
fi
echo "yes — SHA256SUMS match (Plane C airgap verify)"
`;
  writeFileSync(join(dir, "verify-airgap.sh"), script, { mode: 0o755 });
  return join(dir, "verify-airgap.sh");
}

export function writeAirgap(outDir, pack = buildExport()) {
  mkdirSync(outDir, { recursive: true });
  writeExport(outDir, pack);
  copyFileSync(
    join(REPO_ROOT, "tools/cold_shelf/ZENODO-TIP-PACK-CHECKLIST.md"),
    join(outDir, "ZENODO-TIP-PACK-CHECKLIST.md"),
  );
  copyFileSync(
    join(REPO_ROOT, "tools/cold_shelf/ALT-FORGE-TIP-PACK-CHECKLIST.md"),
    join(outDir, "ALT-FORGE-TIP-PACK-CHECKLIST.md"),
  );
  copyFileSync(
    join(REPO_ROOT, "tools/cold_shelf/USB-AIRGAP-ATTEST.md"),
    join(outDir, "USB-AIRGAP-ATTEST.md"),
  );
  const content = [
    "lockset.json",
    "ingest-as-receipt.json",
    "manifest.json",
    "registry.json",
    "export.json",
    "ZENODO-TIP-PACK-CHECKLIST.md",
    "ALT-FORGE-TIP-PACK-CHECKLIST.md",
    "USB-AIRGAP-ATTEST.md",
  ];
  writeVerifyAirgapScript(outDir);
  content.push("verify-airgap.sh");
  writeSha256Sums(outDir, content);
  const tarName = "aziel-tip-pack.tar";
  const tar = spawnSync("tar", ["-cf", tarName, ...content, "SHA256SUMS"], { cwd: outDir, encoding: "utf8" });
  if (tar.status !== 0) {
    throw new Error(tar.stderr || "tar failed");
  }
  return {
    dir: outDir,
    tar: join(outDir, tarName),
    sums: join(outDir, "SHA256SUMS"),
    verify: join(outDir, "verify-airgap.sh"),
    lockset_tip: pack.lockset_tip,
    files: content.slice(),
  };
}
