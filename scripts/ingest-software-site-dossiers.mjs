#!/usr/bin/env node
/**
 * Operator ingest of SOFTWARE-SITE-DOSSIER-1.0 files onto Aziel Library.
 * Uses POST /v1/operator/library-ingest (operator token or session). No public write hole.
 * Author: Aziel Eliab only.
 *
 *   AZIEL_OPERATOR_TOKEN=… node scripts/ingest-software-site-dossiers.mjs --dir dossiers
 *   node scripts/ingest-software-site-dossiers.mjs --dir dossiers --dry-run
 */
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  AUTHOR,
  UA,
  parseFrontMatter,
  refuseUnpackArgs,
  validateDossierMarkdown,
} from "./lib/software-site-dossiers.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const DEFAULT_HOST = "https://www.azielcorpuslibrary.net";

function argValue(argv, name, fallback = "") {
  const i = argv.indexOf(name);
  if (i < 0 || !argv[i + 1]) return fallback;
  return argv[i + 1];
}

function operatorToken(argv) {
  const fromArg = argValue(argv, "--token", "");
  return fromArg || process.env.AZIEL_OPERATOR_TOKEN || process.env.OPERATOR_TOKEN || "";
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

async function searchPredecessor(host, subject) {
  const url = new URL("/v1/search", host);
  url.searchParams.set("q", subject);
  url.searchParams.set("lib", "aziel");
  url.searchParams.set("subject", subject);
  url.searchParams.set("sort", "newest");
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) return "";
  let doc;
  try { doc = await res.json(); } catch { return ""; }
  const rows = Array.isArray(doc.records) ? doc.records : Array.isArray(doc.results) ? doc.results : [];
  const want = String(subject || "").toLowerCase();
  const hit = rows.find((r) => String(r.subjects || "").toLowerCase().includes(want) || String(r.title || "").toLowerCase().includes(want));
  return hit && hit.record_id ? String(hit.record_id) : "";
}

async function ingestOne(host, token, filePath, { dryRun = false } = {}) {
  const md = await readFile(filePath, "utf8");
  const name = filePath.split("/").pop();
  const slug = String(name || "").replace(/-aziel-dossier-1\.0\.md$/i, "");
  const check = validateDossierMarkdown(md, slug);
  if (!check.ok) throw new Error(name + " invalid: " + check.errors.join("; "));
  const { meta } = parseFrontMatter(md);
  const subject = meta.subjects || slug + " aziel dossier";
  const title = meta.title || slug + " — Aziel dossier";
  const bytes = Buffer.from(md, "utf8");
  const digest = sha256(bytes);
  let supersedes = "";
  try { supersedes = await searchPredecessor(host, subject); } catch { supersedes = ""; }
  const payload = {
    title,
    author: meta.author || AUTHOR,
    domain: meta.domain || "software, research",
    subjects: subject,
    keywords: meta.keywords || "aziel-dossier-1.0, Apache-2.0",
    filename: name,
    content_sha256: digest,
    supersedes: supersedes || undefined,
  };
  if (dryRun) {
    return { ok: true, dry_run: true, slug, file: name, ...payload };
  }
  if (!token) {
    const err = new Error("AZIEL_OPERATOR_TOKEN / OPERATOR_TOKEN required for live ingest");
    err.code = "NO_OPERATOR_TOKEN";
    throw err;
  }
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: "text/markdown" }), name);
  form.set("title", title);
  form.set("author", payload.author);
  form.set("domain", payload.domain);
  form.set("subjects", payload.subjects);
  form.set("keywords", payload.keywords);
  if (supersedes) form.set("supersedes", supersedes);
  const res = await fetch(new URL("/v1/operator/library-ingest", host), {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      "X-Aziel-Operator-Token": token,
      Authorization: "Bearer " + token,
    },
    body: form,
  });
  let body = null;
  try { body = await res.json(); } catch { body = { error: await res.text() }; }
  if (!res.ok) {
    const err = new Error((body && body.error) || ("ingest failed HTTP " + res.status));
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return { ok: true, slug, file: name, content_sha256: digest, supersedes: supersedes || null, ...body };
}

async function main(argv = process.argv.slice(2)) {
  refuseUnpackArgs(["node", "ingest", ...argv]);
  const dir = resolve(root, argValue(argv, "--dir", "dossiers"));
  const host = argValue(argv, "--host", DEFAULT_HOST).replace(/\/+$/, "");
  const dryRun = argv.includes("--dry-run");
  const token = operatorToken(argv);
  const names = (await readdir(dir)).filter((n) => n.endsWith("-aziel-dossier-1.0.md")).sort();
  if (!names.length) throw new Error("no dossiers in " + dir);
  const results = [];
  const pending = [];
  for (const name of names) {
    try {
      results.push(await ingestOne(host, token, join(dir, name), { dryRun }));
    } catch (err) {
      const rec = { ok: false, file: name, error: err.message, status: err.status || 0 };
      results.push(rec);
      if (err.code === "NO_OPERATOR_TOKEN") pending.push(name);
    }
  }
  const summary = {
    ok: results.every((r) => r.ok),
    author: AUTHOR,
    host,
    dry_run: dryRun,
    count: results.length,
    landed: results.filter((r) => r.ok && !r.dry_run && r.record_id).map((r) => ({ slug: r.slug, record_id: r.record_id, href: r.href, unchanged: !!r.unchanged })),
    pending_operator: pending.length ? "Set AZIEL_OPERATOR_TOKEN to the Wrangler OPERATOR_TOKEN secret, then re-run this command." : "",
    results,
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  if (!summary.ok && !dryRun) process.exitCode = pending.length === names.length ? 0 : 1;
  return summary;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err && err.message ? err.message : err);
    process.exit(err && err.code === "DOSSIER_UNPACK" ? 2 : 1);
  });
}

export { main, ingestOne };
