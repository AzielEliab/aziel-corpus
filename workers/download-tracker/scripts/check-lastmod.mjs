// Verify PATH_LASTMOD dates in src/crawl.js against the git day of the commit that
// authored each source file's current content. A merge whose blob matches a parent
// does not move that day, so combining these branches on a later date stays equal
// to the content date. Usage: node scripts/check-lastmod.mjs
// (exit 1 on mismatch, 2 if git history unavailable)
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PATH_LASTMOD, PATH_LASTMOD_SOURCES } from "../src/crawl.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function gitOut(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function blobId(rev, file) {
  try {
    return gitOut(["rev-parse", "--verify", rev + ":" + file]);
  } catch {
    return "";
  }
}

function parentsOf(rev) {
  const line = gitOut(["rev-list", "--parents", "-n", "1", rev]);
  return line.split(/\s+/).slice(1).filter(Boolean);
}

function commitDay(rev) {
  return gitOut(["show", "-s", "--format=%cs", rev]);
}

/** Day of the commit that wrote the file's bytes at `rev`, not a later merge that only carried them. */
function contentCommitDay(rev, file, depth) {
  if (!rev || depth > 40) return "";
  const parents = parentsOf(rev);
  if (parents.length > 1) {
    const blob = blobId(rev, file);
    const carriers = parents.filter((parent) => blobId(parent, file) === blob);
    if (carriers.length) {
      const days = [];
      for (const parent of carriers) {
        let prior = "";
        try { prior = gitOut(["log", "-1", "--format=%H", parent, "--", file]); } catch { prior = ""; }
        const day = contentCommitDay(prior && prior !== rev ? prior : parent, file, depth + 1);
        if (day) days.push(day);
      }
      if (days.length) return days.sort().at(-1);
    }
  }
  return commitDay(rev);
}

export function gitDay(file) {
  try {
    const tip = gitOut(["log", "-1", "--format=%H", "--", file]);
    if (!tip) return "";
    return contentCommitDay(tip, file, 0);
  } catch {
    return "";
  }
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
