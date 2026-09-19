import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HELP_PATHS,
  HELP_INDEX,
  ADDENDUM,
  HELP_SCORES,
  HELP_CITE,
  isHelpPath,
  helpRouteBody,
  helpIndexTxt,
  addendumTxt,
  howToReadScoresTxt,
  howToCiteTxt,
} from "./help.js";
import { robotsTxt, sitemapXml, llmsDoc, citeDoc, aiTxt } from "./crawl.js";
import { handleRuntimeApi } from "./runtime.js";
import { HOST } from "./runtime-copy.js";

const SEO_NOT_X = /THIS IS NOT|He is not the two Levitical|Not euaziel\.site|not a lawyer|Heatmap ≠|possibility ≠|CNS-ZENODO-IP-BAN|CNS-GITFLIC-EMAIL|CNS-GITLAB-CF-LOOP|death-by-ban|Mutual shelves↔ban|blocked from|IP ban/;

test("help paths are the four additive human routes", () => {
  assert.deepEqual(HELP_PATHS.slice(), [
    "/help.txt",
    "/addendum.txt",
    "/help/how-to-read-scores.txt",
    "/help/how-to-cite.txt",
  ]);
  for (const path of HELP_PATHS) assert.equal(isHelpPath(path), true);
  assert.equal(isHelpPath("/llms.txt"), false);
  assert.equal(isHelpPath("/cite.json"), false);
});

test("help txt stays affirmative and points at scores, records, upload, Softwares", () => {
  const index = helpIndexTxt();
  const addendum = addendumTxt();
  const scores = howToReadScoresTxt();
  const cite = howToCiteTxt();
  for (const body of [index, addendum, scores, cite]) {
    assert.match(body, /Aziel Eliab/);
    assert.match(body, /#aziel/);
    assert.doesNotMatch(body, SEO_NOT_X);
    assert.doesNotMatch(body, /≠/);
  }
  assert.match(index, /how-its-scored/);
  assert.match(index, /\/software/);
  assert.match(index, /\/upload/);
  assert.match(index, /triad is always/);
  assert.match(index, /Component scores/);
  assert.match(addendum, /\/record\/\{AZDOC/);
  assert.match(addendum, /\/upload/);
  assert.match(addendum, /\/software/);
  assert.match(scores, /TRIAD_V1|triad/);
  assert.match(scores, /SPRE/);
  assert.match(scores, /when those verifiers have run/);
  assert.match(scores, /how-its-scored/);
  assert.match(cite, /cite\.json/);
  assert.match(cite, /\/record\/\{AZDOC/);
  assert.match(cite, /\/software/);
  assert.equal(helpRouteBody(HELP_INDEX), index);
  assert.equal(helpRouteBody(ADDENDUM), addendum);
  assert.equal(helpRouteBody(HELP_SCORES), scores);
  assert.equal(helpRouteBody(HELP_CITE), cite);
  assert.equal(helpRouteBody("/llms.txt"), null);
});

test("robots and sitemap list help routes; llms/cite stay unhooked", async () => {
  const robots = robotsTxt();
  const xml = await sitemapXml({});
  for (const path of HELP_PATHS) {
    assert.match(robots, new RegExp("Allow: " + path.replaceAll("/", "\\/")));
    assert.match(xml, new RegExp("<loc>https://www\\.azielcorpuslibrary\\.net" + path.replaceAll("/", "\\/") + "</loc>"));
  }
  const llms = llmsDoc("LIMIT");
  const cite = JSON.stringify(citeDoc());
  assert.doesNotMatch(llms, /\/help\.txt/);
  assert.doesNotMatch(cite, /\/help\/how-to-read-scores/);
  assert.match(aiTxt("LIMIT"), /Allow: \/help\.txt/);
});

test("OpenAPI documents help txt routes", async () => {
  const spec = await (await handleRuntimeApi(
    new Request(HOST + "/openapi.json"),
    new URL(HOST + "/openapi.json"),
    {}
  )).json();
  assert.ok(spec.paths["/help.txt"]);
  assert.ok(spec.paths["/addendum.txt"]);
  assert.ok(spec.paths["/help/how-to-read-scores.txt"]);
  assert.ok(spec.paths["/help/how-to-cite.txt"]);
});

test("GitHub crawl-aid snapshots match Worker help txt", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
  assert.equal(readFileSync(join(root, "help.txt"), "utf8"), helpIndexTxt());
  assert.equal(readFileSync(join(root, "addendum.txt"), "utf8"), addendumTxt());
  assert.equal(readFileSync(join(root, "help/how-to-read-scores.txt"), "utf8"), howToReadScoresTxt());
  assert.equal(readFileSync(join(root, "help/how-to-cite.txt"), "utf8"), howToCiteTxt());
});
