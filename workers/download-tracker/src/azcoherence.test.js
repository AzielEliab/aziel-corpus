import test from "node:test";
import assert from "node:assert/strict";
import { citeDoc, llmsDoc, humansTxt, aiTxt } from "./crawl.js";
import { howItsScoredBody } from "./ui.js";
import {
  SOFTWARE_EXTRAS,
  mergeSoftwareExtras,
  collectCatalogProducts,
  softwareKind,
  compareSoftware,
  productLinks,
  countUrlForProduct,
  displayName,
} from "./software-catalog.js";
import {
  AZCOHERENCE,
  AZCOHERENCE_SLUG,
  AZCOHERENCE_SOFTWARE_EXTRA,
  AZCOHERENCE_WORKER_HOME,
  AZCOHERENCE_DOWNLOAD,
  AZCOHERENCE_COUNT,
  AZCOHERENCE_GITHUB,
  AZCOHERENCE_PEER_MAP,
  azcoherenceLlmsBlock,
} from "./azcoherence.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;
const HOST = "https://www.azielcorpuslibrary.net";

test("AZCoherence cite object is Plain scoring-review, peer AZ-CLCE, not AKM-TRIAD, FragGate only", () => {
  assert.equal(AZCOHERENCE.slug, "azcoherence");
  assert.equal(AZCOHERENCE.name, "AZCoherence");
  assert.equal(AZCOHERENCE.spec, "AZC-0.1");
  assert.equal(AZCOHERENCE.kind, "plain");
  assert.equal(AZCOHERENCE.placement, "scoring-review");
  assert.equal(AZCOHERENCE.door, "fraggate");
  assert.equal(AZCOHERENCE.fraggate_single_door, true);
  assert.equal(AZCOHERENCE.not_a_second_door, true);
  assert.equal(AZCOHERENCE.not_akm_triad, true);
  assert.equal(AZCOHERENCE.peer, "azclce");
  assert.equal(AZCOHERENCE.peer_name, "AZ-CLCE");
  assert.equal(AZCOHERENCE.github, AZCOHERENCE_GITHUB);
  assert.equal(AZCOHERENCE.worker, AZCOHERENCE_WORKER_HOME);
  assert.equal(AZCOHERENCE.identity, "Aziel Eliab");
  assert.equal(AZCOHERENCE.doi, null);
  assert.match(AZCOHERENCE.compatible_clients, /ChatGPT, Grok, Venice, Claude, Cursor, Glama/);
  assert.match(AZCOHERENCE.dual_surface, /Worker \/ mobile \/ local install/);
  assert.doesNotMatch(AZCOHERENCE.dual_surface, /Flutter/);
  assert.equal(AZCOHERENCE.sister_hubs.library, HOST + "/software");
  assert.equal(AZCOHERENCE.sister_hubs.azieleliab, "https://www.azieleliab.com");
  assert.match(AZCOHERENCE.sister_hubs.godlock, /godlock\.uk\/AzielEliab/);
  assert.equal(AZCOHERENCE.sister_hubs.runtime_fraggate_describe, "https://aziel-runtime.vibelock.workers.dev/v1/fraggate/describe?slug=azcoherence");
  assert.equal(AZCOHERENCE_PEER_MAP.azcoherence.peer, "azclce");
  assert.equal(AZCOHERENCE_PEER_MAP.azclce.peer, "azcoherence");
  assert.equal(AZCOHERENCE_PEER_MAP.akm_triad.peer, false);
  assert.match(AZCOHERENCE_PEER_MAP.akm_triad.note, /not AKM-TRIAD/);
  assert.doesNotMatch(JSON.stringify(AZCOHERENCE), BANNED);
});

test("cite.json and llms.txt mention azcoherence with Worker, GitHub, FragGate, and sister hubs", () => {
  const cite = citeDoc();
  const blob = JSON.stringify(cite);
  assert.ok(blob.toLowerCase().includes("azcoherence"), "cite.json must mention azcoherence");
  assert.equal(cite.azcoherence.slug, AZCOHERENCE_SLUG);
  assert.equal(cite.azcoherence_slug, "azcoherence");
  assert.ok(cite.keywords.includes("AZCoherence"));
  assert.ok(cite.keywords.includes("azcoherence"));
  assert.ok(cite.keywords.includes("AZ-CLCE"));
  assert.match(cite.azcoherence.worker, /azcoherence-download-tracker/);
  assert.match(cite.azcoherence.github, /AZCoherence/);
  assert.match(cite.azcoherence.fraggate_describe, /fraggate\/describe\?slug=azcoherence/);
  assert.match(cite.azcoherence.fraggate_call, /fraggate\/call/);
  assert.match(cite.azcoherence.sister_hubs.library, /\/software$/);
  assert.equal(cite.azcoherence.peer, "azclce");
  assert.equal(cite.azclce.peer, "azcoherence");
  assert.match(cite.azcoherence.compatible_clients, /ChatGPT, Grok, Venice/);
  assert.doesNotMatch(blob, BANNED);

  const llms = llmsDoc("LIMIT");
  assert.match(llms, /azcoherence/);
  assert.match(llms, /AZCoherence/);
  assert.match(llms, /AZC-0\.1/);
  assert.match(llms, /azcoherence-download-tracker\.vibelock\.workers\.dev/);
  assert.match(llms, /github\.com\/AzielEliab\/AZCoherence/);
  assert.match(llms, /fraggate\/describe\?slug=azcoherence/);
  assert.match(llms, /fraggate\/call/);
  assert.match(llms, /azieleliab\.com/);
  assert.match(llms, /godlock\.uk\/AzielEliab/);
  assert.match(llms, /Peer AZ-CLCE/);
  assert.match(llms, /Not AKM-TRIAD/);
  assert.match(llms, /ChatGPT, Grok, Venice, Claude, Cursor, Glama/);
  assert.match(llms, /Dual surface/);
  assert.match(llms, /FragGate is the single door/);
  assert.doesNotMatch(llms, BANNED);

  const humans = humansTxt();
  assert.match(humans, /azcoherence/);
  assert.match(humans, /AZCoherence/);

  const ai = aiTxt("LIMIT");
  assert.match(ai, /azcoherence/);
  assert.match(ai, /AZCoherence/);

  const block = azcoherenceLlmsBlock();
  assert.match(block, /azcoherence/);
  assert.match(block, /PASS\/FLAG\/NEUTRALIZE\/REFUSE/);
});

test("SOFTWARE_EXTRAS lists AZCoherence as Plain extra without a second door", () => {
  assert.ok(SOFTWARE_EXTRAS.some((p) => p.slug === "azcoherence"));
  assert.equal(SOFTWARE_EXTRAS.length, 4);
  assert.equal(softwareKind(AZCOHERENCE_SOFTWARE_EXTRA), "plain");
  assert.equal(displayName({ slug: "azcoherence" }), "AZCoherence");
  const merged = mergeSoftwareExtras(collectCatalogProducts({
    products: [{ slug: "peacelock", name: "PeaceLock" }, { slug: "azclce", name: "AZ-CLCE" }],
  }));
  const azc = merged.find((p) => p.slug === "azcoherence");
  assert.ok(azc);
  assert.equal(azc.worker_home, AZCOHERENCE_WORKER_HOME);
  assert.equal(azc.download, AZCOHERENCE_DOWNLOAD);
  assert.equal(azc.github, AZCOHERENCE_GITHUB);
  assert.equal(countUrlForProduct(azc), AZCOHERENCE_COUNT);
  assert.equal(countUrlForProduct({ slug: "azcoherence", count: null }), AZCOHERENCE_COUNT);
  assert.match(azc.one_line, /Peer AZ-CLCE/);
  assert.match(azc.one_line, /Not AKM-TRIAD/);
  const ordered = merged.sort(compareSoftware);
  const idxAzc = ordered.findIndex((p) => p.slug === "azcoherence");
  const idxClce = ordered.findIndex((p) => p.slug === "azclce");
  const idxPeace = ordered.findIndex((p) => p.slug === "peacelock");
  const idxFg = ordered.findIndex((p) => p.slug === "fraggate");
  assert.ok(idxAzc < idxFg && idxClce < idxFg && idxFg < idxPeace, "Plain before Gate before Lock");
  const links = productLinks(SOFTWARE_EXTRAS.find((p) => p.slug === "azcoherence"));
  assert.ok(links.some((l) => l.primary && l.href === AZCOHERENCE_DOWNLOAD));
  assert.ok(links.some((l) => l.label === "Worker" && l.href === AZCOHERENCE_WORKER_HOME));
  assert.ok(links.some((l) => l.label === "GitHub" && l.href === AZCOHERENCE_GITHUB));
  assert.ok(links.some((l) => /fraggate\/describe\?slug=azcoherence/.test(l.href)));
  assert.ok(!links.some((l) => /fraggate-download-tracker/.test(l.href)));
});

test("how-its-scored cites AZCoherence as second-pass, not inside the triad mean", () => {
  const html = howItsScoredBody();
  assert.match(html, /AZCoherence/);
  assert.match(html, /azcoherence/);
  assert.match(html, /PASS \/ FLAG \/ NEUTRALIZE \/ REFUSE|PASS\/FLAG\/NEUTRALIZE\/REFUSE/);
  assert.match(html, /AZ-CLCE|azclce/);
  assert.match(html, /Not AKM-TRIAD|not AKM-TRIAD/);
  assert.match(html, /azcoherence-download-tracker\.vibelock\.workers\.dev/);
  assert.match(html, /github\.com\/AzielEliab\/AZCoherence/);
  assert.match(html, /fraggate\/describe\?slug=azcoherence/);
  assert.doesNotMatch(html, BANNED);
  assert.doesNotMatch(html, /collection score is the published triad/);
});
