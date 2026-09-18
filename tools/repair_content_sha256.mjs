#!/usr/bin/env node
/**
 * Documented operator walk for content_sha256 repair.
 * Recomputes hashes from served /file bytes. Does not rewrite those bytes.
 *
 *   node tools/repair_content_sha256.mjs
 *   node tools/repair_content_sha256.mjs --record AZDOC-498664EBE53C
 *   OPERATOR_TOKEN=… node tools/repair_content_sha256.mjs --apply --record AZDOC-498664EBE53C
 *
 * Author: Aziel Eliab.
 */
const HOST = process.env.LIBRARY_HOST || "https://www.azielcorpuslibrary.net";
const token = String(process.env.OPERATOR_TOKEN || process.env.GATE_TOKEN || "").trim();
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const all = args.includes("--all");
const known = args.includes("--known");
const sample = args.includes("--sample");
const status = args.includes("--status");
const recIdx = args.indexOf("--record");
const recordId = recIdx >= 0 ? args[recIdx + 1] : "";

const url = new URL("/v1/content-hash-repair", HOST);
if (status) url.searchParams.set("status", "1");
else if (sample) url.searchParams.set("sample", "1");
else {
  if (apply) url.searchParams.set("apply", "1");
  if (known) url.searchParams.set("known", "1");
  if (all) url.searchParams.set("all", "1");
  if (recordId) url.searchParams.set("record_id", recordId);
}

const headers = { Accept: "application/json", "User-Agent": "Mozilla/5.0 AzielCorpus-content-hash-repair" };
if (apply && token) headers["X-Aziel-Operator-Token"] = token;

const res = await fetch(url, { headers });
const text = await res.text();
console.log(res.status, url.toString());
console.log(text);
if (!res.ok) process.exit(1);
