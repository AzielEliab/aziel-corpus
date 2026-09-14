#!/usr/bin/env node
/**
 * COLD-MULTI-SHELF-1.0 executable pack.
 *   node tools/cold_shelf/cli.mjs export [--out DIR]
 *   node tools/cold_shelf/cli.mjs verify --hash HEX | --file PATH
 *   node tools/cold_shelf/cli.mjs registry
 * Author: Aziel Eliab only. No invented CIDs. No AZ-GEN live ICANN publish.
 */
import { resolve } from "node:path";
import {
  REPO_ROOT,
  REFUSE,
  buildExport,
  writeExport,
  verifyFileAgainstPack,
  verifyPasteHash,
  shelfRegistryDoc,
  judgeAzGenOverclaim,
  judgeInventedDeposit,
  judgeInventedPhyDnsIcann,
  judgeNeighborVoteHeal,
} from "./index.mjs";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0) return "";
  return String(process.argv[i + 1] || "").trim();
}

function has(flag) {
  return process.argv.includes(flag);
}

const cmd = String(process.argv[2] || "help").trim();

if (cmd === "export") {
  const out = arg("--out") || resolve(REPO_ROOT, "tools/cold_shelf/out");
  const pack = buildExport();
  writeExport(out, pack);
  console.log(JSON.stringify({
    ok: true,
    spec: pack.spec,
    lockset_tip: pack.lockset_tip,
    out,
    files: Object.keys(pack.manifest.files),
    independent_live_count: pack.registry.independent_live_count,
    independent_requirement_met: pack.registry.independent_requirement_met,
  }, null, 2));
  process.exit(0);
}

if (cmd === "verify") {
  const hash = arg("--hash");
  const file = arg("--file");
  if (hash) {
    const r = verifyPasteHash(hash);
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.yes ? 0 : 2);
  }
  if (file) {
    const pack = buildExport();
    const rel = file.startsWith("/") ? "" : file;
    const r = verifyFileAgainstPack(resolve(REPO_ROOT, file), pack, rel || undefined);
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.yes ? 0 : 2);
  }
  console.error("verify needs --hash <64-hex> or --file <path>");
  process.exit(1);
}

if (cmd === "registry") {
  console.log(JSON.stringify(shelfRegistryDoc(), null, 2));
  process.exit(0);
}

if (cmd === "refuse") {
  const r = {
    neighbor_vote: judgeNeighborVoteHeal({ neighbor_vote: true }),
    invented_phy: judgeInventedPhyDnsIcann({ invent_phy: true }),
    invented_dns: judgeInventedPhyDnsIcann({ invent_dns: true }),
    invented_icann: judgeInventedPhyDnsIcann({ invent_icann: true }),
    az_gen: judgeAzGenOverclaim({ live_icann_publish: true }),
    invented_cid: judgeInventedDeposit({ kind: "ipfs_cid", cid: "QmFake" }),
    codes: REFUSE,
  };
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}

console.log(`COLD-MULTI-SHELF-1.0
  export [--out DIR]     lockset + ingest-as-receipt + SHA-256 manifest + registry
  verify --hash HEX      yes/no vs published lockset tip
  verify --file PATH     file SHA-256 vs tip or core-doc manifest
  registry               honest live|slot|refused shelves
  refuse                 print PHY/DNS/ICANN / neighbor-vote / AZ-GEN refuse codes
`);
process.exit(has("--help") || cmd === "help" ? 0 : 1);
