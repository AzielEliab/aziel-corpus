#!/usr/bin/env node
/**
 * Build one {slug}-aziel-dossier-1.0.md per live Softwares card, FragGate kernel, and listed site.
 * Author: Aziel Eliab only. Apache-2.0.
 *
 *   node scripts/generate-software-site-dossiers.mjs --out dossiers
 *   node scripts/generate-software-site-dossiers.mjs --catalog tests/fixtures/software-catalog-dossier.json --offline --out /tmp/dossiers
 */
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUTHOR,
  CATALOG_URL,
  UA,
  assertOneFilePerSlug,
  collectTargets,
  dossierFilename,
  enrichTarget,
  refuseUnpackArgs,
  renderDossier,
  validateDossierMarkdown,
} from "./lib/software-site-dossiers.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

function argValue(argv, name, fallback = "") {
  const i = argv.indexOf(name);
  if (i < 0 || !argv[i + 1]) return fallback;
  return argv[i + 1];
}

function hasFlag(argv, name) {
  return argv.includes(name);
}

async function loadCatalog(argv) {
  const catalogPath = argValue(argv, "--catalog", "");
  if (catalogPath) {
    const raw = await readFile(resolve(root, catalogPath), "utf8");
    return JSON.parse(raw);
  }
  const url = argValue(argv, "--catalog-url", CATALOG_URL);
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error("catalog fetch failed: " + res.status + " " + url);
  return res.json();
}

async function main(argv = process.argv.slice(2)) {
  refuseUnpackArgs(["node", "generate", ...argv]);
  const outDir = resolve(root, argValue(argv, "--out", "dossiers"));
  const offline = hasFlag(argv, "--offline");
  const date = argValue(argv, "--date", new Date().toISOString().slice(0, 10));
  const catalog = await loadCatalog(argv);
  const targets = collectTargets(catalog);
  if (!targets.length) throw new Error("no dossier targets");
  await mkdir(outDir, { recursive: true });
  const written = [];
  for (const target of targets) {
    const extras = await enrichTarget(target, { offline });
    extras.date = date;
    const md = renderDossier(target, extras);
    const check = validateDossierMarkdown(md, target.slug);
    if (!check.ok) throw new Error(target.slug + " failed validation: " + check.errors.join("; "));
    const name = dossierFilename(target.slug);
    const dest = join(outDir, name);
    await writeFile(dest, md, "utf8");
    written.push(name);
  }
  const names = (await readdir(outDir)).filter((n) => n.endsWith("-aziel-dossier-1.0.md"));
  assertOneFilePerSlug(names);
  const extra = names.filter((n) => !written.includes(n));
  if (extra.length && !hasFlag(argv, "--keep-stale")) {
    // Re-run must not leave a second file per slug; stale slugs from an older catalog stay unless --prune.
    if (hasFlag(argv, "--prune")) {
      const { unlink } = await import("node:fs/promises");
      for (const n of extra) await unlink(join(outDir, n));
    }
  }
  const summary = {
    ok: true,
    author: AUTHOR,
    out: outDir,
    count: written.length,
    slugs: targets.map((t) => t.slug),
    files: written,
    note: "One solid markdown file per software or website. Apache-2.0. Shelf aziel.",
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  return summary;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err && err.message ? err.message : err);
    process.exit(err && err.code === "DOSSIER_UNPACK" ? 2 : 1);
  });
}

export { main };
