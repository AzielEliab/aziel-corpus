import test from "node:test";
import assert from "node:assert/strict";
import { citeDoc, llmsDoc, humansTxt, aiTxt } from "./crawl.js";
import { SOFTWARE_EXTRAS } from "./software-catalog.js";
import {
  PEACELOCK,
  PEACELOCK_SLUG,
  PEACELOCK_NAME,
  PEACELOCK_ONE_LINE,
  PEACELOCK_NOTE,
  PEACELOCK_CITE,
  PEACELOCK_WORKER_HOME,
  PEACELOCK_GITHUB,
  PEACELOCK_DOWNLOAD,
  PEACELOCK_DIGEST,
  PEACELOCK_LIVE_OPS,
  PEACELOCK_STUB_OPS,
  PEACELOCK_PRODUCT_VERSION,
  peacelockLlmsBlock,
  peacelockCiteFields,
} from "./peacelock.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;
const HOST = "https://www.azielcorpuslibrary.net";

test("PeaceLock cite is public GitHub + local-only runtime, live on FragGate", () => {
  assert.equal(PEACELOCK.slug, PEACELOCK_SLUG);
  assert.equal(PEACELOCK.name, PEACELOCK_NAME);
  assert.equal(PEACELOCK.author, "Aziel Eliab");
  assert.equal(PEACELOCK.identity, "Aziel Eliab");
  assert.equal(PEACELOCK.product_version, PEACELOCK_PRODUCT_VERSION);
  assert.equal(PEACELOCK_PRODUCT_VERSION, "0.1.0");
  assert.equal(PEACELOCK.one_line, PEACELOCK_ONE_LINE);
  assert.equal(PEACELOCK_ONE_LINE, "Record chosen silence or chosen inaction as a hash-chained receipt.");
  assert.equal(PEACELOCK.public, true);
  assert.equal(PEACELOCK.public_github, true);
  assert.equal(PEACELOCK.private, false);
  assert.equal(PEACELOCK.runtime, "local-only");
  assert.equal(PEACELOCK.hosted_api, "stateless");
  assert.equal(PEACELOCK.fraggate_status, "live");
  assert.equal(PEACELOCK.fraggate_local_only, false);
  assert.equal(PEACELOCK.extra_card, false);
  assert.equal(PEACELOCK.github, PEACELOCK_GITHUB);
  assert.equal(PEACELOCK.worker_home, PEACELOCK_WORKER_HOME);
  assert.equal(PEACELOCK.download, PEACELOCK_DOWNLOAD);
  assert.equal(PEACELOCK.digest, PEACELOCK_DIGEST);
  assert.equal(PEACELOCK.doi, null);
  assert.deepEqual(PEACELOCK_LIVE_OPS, [
    "health", "open", "seal", "break", "show", "verify", "stamp", "upload_envelope", "doctor", "skill",
  ]);
  assert.ok(PEACELOCK_STUB_OPS.includes("transcript"));
  assert.ok(PEACELOCK_STUB_OPS.includes("invent"));
  assert.equal(PEACELOCK_NOTE, "PeaceLock (Softwares): " + PEACELOCK_ONE_LINE);
  assert.doesNotMatch(PEACELOCK_NOTE, /THIS IS NOT|does not|not a /i);
  assert.doesNotMatch(PEACELOCK_NOTE, /private doctrine/i);
  assert.doesNotMatch(PEACELOCK_NOTE, /VeilLock/);
  assert.equal(PEACELOCK_CITE.extra_card, false);
  assert.equal(PEACELOCK_CITE.public, true);
  assert.equal(PEACELOCK_CITE.private, false);
  assert.equal(PEACELOCK_CITE.fraggate_status, "live");
  assert.equal(PEACELOCK_CITE.fraggate_local_only, false);
  assert.ok(!SOFTWARE_EXTRAS.some((p) => p.slug === PEACELOCK_SLUG));
  assert.doesNotMatch(JSON.stringify(PEACELOCK), BANNED);
});

test("cite.json / llms.txt / humans.txt / ai.txt cite PeaceLock as public + local-only runtime", () => {
  const cite = citeDoc();
  assert.ok(cite.keywords.includes("PeaceLock"));
  assert.ok(cite.keywords.includes("peacelock"));
  assert.ok(cite.keywords.includes("PL-WP-0.1"));
  assert.equal(cite.peacelock.slug, PEACELOCK_SLUG);
  assert.equal(cite.peacelock_slug, "peacelock");
  assert.equal(cite.github_peacelock, PEACELOCK_GITHUB);
  assert.equal(cite.peacelock.public, true);
  assert.equal(cite.peacelock.private, false);
  assert.equal(cite.peacelock.runtime, "local-only");
  assert.equal(cite.peacelock.hosted_api, "stateless");
  assert.equal(cite.peacelock.fraggate_status, "live");
  assert.equal(cite.peacelock.fraggate_local_only, false);
  assert.equal(cite.peacelock.extra_card, false);
  assert.equal(cite.peacelock_cite.note, PEACELOCK_NOTE);
  assert.equal(cite.peacelock_cite.extra_card, false);
  assert.equal(cite.softwares_ssot_version, "2.0.0-rc1");
  assert.equal(cite.public_version, "2.0.0-rc1");
  assert.equal(cite.public_version_source, "GET /v1/software catalog.version");
  assert.equal(cite.runtime_version, cite.softwares_ssot_version);

  const fields = peacelockCiteFields(HOST);
  assert.equal(fields.github_peacelock, PEACELOCK_GITHUB);
  assert.equal(fields.peacelock_cite.runtime, "local-only");

  const llms = llmsDoc("LIMIT");
  assert.match(llms, /PeaceLock/);
  assert.match(llms, /peacelock/);
  assert.match(llms, /github\.com\/AzielEliab\/peacelock/);
  assert.match(llms, /peacelock-download-tracker\.vibelock\.workers\.dev/);
  assert.match(llms, /public GitHub \+ local-only runtime/);
  assert.match(llms, /Softwares list: PeaceLock \(Softwares\): Record chosen silence or chosen inaction as a hash-chained receipt/);
  assert.match(llms, /Public version: Aziel Runtime \/ Softwares SSoT 2\.0\.0-rc1/);
  assert.doesNotMatch(llms, /private doctrine/i);
  assert.doesNotMatch(llms, BANNED);

  const humans = humansTxt();
  assert.match(humans, /PeaceLock/);
  assert.match(humans, /github\.com\/AzielEliab\/peacelock/);

  const ai = aiTxt("LIMIT");
  assert.match(ai, /PeaceLock/);
  assert.match(ai, /peacelock-download-tracker\.vibelock\.workers\.dev/);

  const block = peacelockLlmsBlock();
  assert.match(block, /POST https:\/\/www\.azielcorpuslibrary\.net\/runtime\/v1\/fraggate\/call/);
  assert.match(block, /operator-local receipts/);
});
