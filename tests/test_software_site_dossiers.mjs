import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import {
  AUTHOR,
  LICENSE,
  REQUIRED_HEADINGS,
  SITE_TARGETS,
  assertOneFilePerSlug,
  catalogSoftwareCards,
  collectTargets,
  dossierFilename,
  parseFrontMatter,
  refuseUnpackArgs,
  renderDossier,
  subjectFor,
  validateDossierMarkdown,
} from "../scripts/lib/software-site-dossiers.mjs";
import { main as generate } from "../scripts/generate-software-site-dossiers.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = JSON.parse(readFileSync(join(root, "tests/fixtures/software-catalog-dossier.json"), "utf8"));

test("collectTargets is one software card per slug plus sites plus FragGate kernel", () => {
  const targets = collectTargets(fixture);
  const slugs = targets.map((t) => t.slug);
  assert.ok(slugs.includes("4dmap"));
  assert.ok(slugs.includes("foldlock"));
  assert.ok(slugs.includes("fraggate"));
  for (const site of SITE_TARGETS) assert.ok(slugs.includes(site.slug), site.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(catalogSoftwareCards(fixture).length, 2);
  assert.equal(slugs.filter((s) => s === "4dmap").length, 1);
});

test("renderDossier has Apache-2.0, author, required sections, and aziel shelf metadata", () => {
  const md = renderDossier(collectTargets(fixture).find((t) => t.slug === "4dmap"), { date: "2026-09-12" });
  const check = validateDossierMarkdown(md, "4dmap");
  assert.equal(check.ok, true, check.errors.join("; "));
  assert.match(md, /Apache-2\.0/);
  assert.match(md, /Aziel Eliab/);
  assert.match(md, /Forks welcome/);
  assert.match(md, /https:\/\/www\.azieleliab\.com\/#aziel/);
  assert.match(md, /https:\/\/www\.azieleliab\.com\/runtime#runtime/);
  const { meta } = parseFrontMatter(md);
  assert.equal(meta.library, "aziel");
  assert.equal(meta.license, LICENSE);
  assert.equal(meta.author, AUTHOR);
  assert.equal(meta.subjects, subjectFor("4dmap"));
  assert.equal(meta.zion_pattern, "not_applicable");
  for (const h of REQUIRED_HEADINGS) assert.match(md, new RegExp("^## " + h, "m"));
});

test("assertOneFilePerSlug rejects a second file and odd names", () => {
  const map = assertOneFilePerSlug(["4dmap-aziel-dossier-1.0.md", "foldlock-aziel-dossier-1.0.md"]);
  assert.equal(map.size, 2);
  assert.throws(() => assertOneFilePerSlug(["4dmap-aziel-dossier-1.0.md", "4dmap-aziel-dossier-1.0.md"]), /duplicate/);
  assert.throws(() => assertOneFilePerSlug(["4dmap/src/index.js"]), /unexpected/);
  assert.throws(() => refuseUnpackArgs(["node", "gen", "--unpack"]), /Refuse/);
});

test("offline generator writes exactly one markdown file per slug and never unpacks a tree", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aziel-dossiers-"));
  try {
    const summary = await generate([
      "--catalog",
      "tests/fixtures/software-catalog-dossier.json",
      "--offline",
      "--out",
      dir,
      "--date",
      "2026-09-12",
    ]);
    const files = (await readdir(dir)).filter((n) => n.endsWith(".md")).sort();
    assert.equal(files.length, summary.count);
    assertOneFilePerSlug(files);
    assert.equal(files.length, 2 + 1 + SITE_TARGETS.length);
    for (const name of files) {
      const md = await readFile(join(dir, name), "utf8");
      const slug = name.replace(/-aziel-dossier-1\.0\.md$/i, "");
      assert.equal(name, dossierFilename(slug));
      const check = validateDossierMarkdown(md, slug);
      assert.equal(check.ok, true, name + ": " + check.errors.join("; "));
      assert.match(md, /Apache-2\.0/);
      assert.doesNotMatch(md, /unpack tarball|extract all source files INTO THE LIBRARY/i);
    }
    const names = files.join(" ");
    assert.match(names, /azieleliab-com-aziel-dossier-1\.0\.md/);
    assert.match(names, /fraggate-aziel-dossier-1\.0\.md/);
    assert.equal(files.filter((n) => n.includes("4dmap")).length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("generator refuses unpack flags", async () => {
  await assert.rejects(
    () => generate(["--unpack", "--catalog", "tests/fixtures/software-catalog-dossier.json", "--offline"]),
    /Refuse/
  );
});
