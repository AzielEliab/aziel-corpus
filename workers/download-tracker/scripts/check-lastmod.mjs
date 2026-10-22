// Verify PATH_LASTMOD dates in src/crawl.js against git log (%cs) of each path's source files.
// Usage: node scripts/check-lastmod.mjs   (exit 1 on mismatch, 2 if git history unavailable)
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PATH_LASTMOD, PATH_LASTMOD_SOURCES } from "../src/crawl.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export function gitDay(file) {
  try {
    return execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch { return ""; }
}

export function checkLastmod() {
  const problems = [];
  for (const p of Object.keys(PATH_LASTMOD)) {
    const srcs = PATH_LASTMOD_SOURCES[p];
    if (!srcs || !srcs.length) { problems.push(p + ": no sources listed"); continue; }
    const days = srcs.map(gitDay);
    if (days.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) return { available: false, problems: [p + ": git date missing"] };
    const want = days.sort().at(-1);
    if (PATH_LASTMOD[p] !== want) problems.push(p + ": has " + PATH_LASTMOD[p] + ", git says " + want);
  }
  return { available: true, problems };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const r = checkLastmod();
  if (!r.available) { console.error("git history unavailable:", r.problems.join("; ")); process.exit(2); }
  if (r.problems.length) { console.error(r.problems.join("\n")); process.exit(1); }
  console.log("PATH_LASTMOD matches git for " + Object.keys(PATH_LASTMOD).length + " paths");
}
