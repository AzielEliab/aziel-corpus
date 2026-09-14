import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  AUTHOR,
  CITE_RULE,
  INGEST_SPEC,
  LOCKSET,
  LOCKSET_ID,
  LOCKSET_INDEXES,
  LOCKSET_TIP,
  REEXPAND_SPEC,
  SURVIVE_RULE,
  TRAINING_NOTE,
  ingestReceiptCite,
  ingestReceiptHead,
  ingestReceiptLlmsBlock,
  ingestReceiptStrip,
  ingestVerifyForm,
  ingestVerifyJson,
  locksetBytes,
  matchPublishedTip,
  normalizeTipHash,
} from "./ingest-receipt.js";
import { canonicalJson, hashPayload } from "./ledger.js";
import { page, homeBody } from "./ui.js";
import { handleReceipts } from "./action-receipts.js";
import { citeDoc, llmsDoc, aiTxt, robotsTxt, sitemapXml } from "./crawl.js";

const BOTH_MUSICIANS_P = /<p>Aziel Eliab is a living researcher and software designer\. Not the two Levitical musicians Aziel and Eliab named together in 1 Chronicles 15:20\.<\/p>/;
const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;

test("published lockset tip is SHA-256 of the lockset bytes", () => {
  assert.equal(AUTHOR, "Aziel Eliab");
  assert.equal(INGEST_SPEC, "INGEST-AS-RECEIPT-1.0");
  assert.equal(REEXPAND_SPEC, "RE-EXPAND-FROM-ARCHIVE-1.0");
  assert.equal(LOCKSET_ID, "AZLOCK-INGEST-REEXPAND-1.0");
  assert.equal(CITE_RULE, "cite, don't merge");
  assert.equal(SURVIVE_RULE, "bytes survive; crawlers do not re-expand");
  assert.equal(LOCKSET.author, "Aziel Eliab");
  assert.equal(LOCKSET.identity, "Aziel Eliab");
  assert.equal(LOCKSET.zenodo, null);
  assert.equal(LOCKSET.doi, null);
  assert.equal(LOCKSET_TIP, hashPayload(LOCKSET));
  assert.match(LOCKSET_TIP, /^[0-9a-f]{64}$/);
  assert.equal(createHash("sha256").update(canonicalJson(LOCKSET), "utf8").digest("hex"), LOCKSET_TIP);
  assert.ok(LOCKSET_INDEXES.includes("https://www.azielcorpuslibrary.net/"));
  assert.ok(LOCKSET_INDEXES.includes("https://github.com/AzielEliab/aziel-corpus"));
  assert.match(TRAINING_NOTE, /Weights will not store the chain/);
  assert.equal(locksetBytes(), canonicalJson(LOCKSET));
  const githubBytes = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../docs/lockset.json"), "utf8");
  assert.equal(githubBytes, locksetBytes());
});

test("paste hash is yes/no against the published tip", () => {
  assert.equal(normalizeTipHash("SHA-256:" + LOCKSET_TIP.toUpperCase()), LOCKSET_TIP);
  const yes = matchPublishedTip(LOCKSET_TIP);
  assert.equal(yes.yes, true);
  assert.equal(yes.match, "lockset");
  assert.equal(yes.published_tip, LOCKSET_TIP);
  const no = matchPublishedTip("a".repeat(64));
  assert.equal(no.ok, true);
  assert.equal(no.yes, false);
  assert.equal(no.match, null);
  const chain = matchPublishedTip("b".repeat(64), [{ hash: "b".repeat(64), kind: "act-receipt" }]);
  assert.equal(chain.yes, true);
  assert.equal(chain.match, "act-receipt");
  const bad = matchPublishedTip("not-a-hash");
  assert.equal(bad.ok, false);
  assert.equal(bad.yes, false);
});

test("first-screen strip carries hash + short rules and no 15:20 chrome", () => {
  const strip = ingestReceiptStrip();
  assert.match(strip, new RegExp(LOCKSET_TIP));
  assert.match(strip, /cite, don't merge/);
  assert.match(strip, /bytes survive; crawlers do not re-expand/);
  assert.match(strip, /AZLOCK-INGEST-REEXPAND-1\.0/);
  assert.match(strip, /href="\/receipts\/verify"/);
  assert.doesNotMatch(strip, BOTH_MUSICIANS_P);
  assert.doesNotMatch(strip, /1 Chronicles 15:20/);
  assert.doesNotMatch(strip, BANNED);
  const head = ingestReceiptHead();
  assert.match(head, new RegExp(LOCKSET_TIP));
  assert.match(head, /aziel-cite-rule/);
  assert.match(head, /cite, don't merge/);
  const home = page("Corpus Search", homeBody({ rows: [], host: "https://www.azielcorpuslibrary.net" }), { path: "/", kind: "search" });
  assert.match(home, new RegExp(LOCKSET_TIP));
  assert.match(home, /cite, don't merge/);
  assert.match(home, /bytes survive; crawlers do not re-expand/);
  assert.match(home, /id="az-ingest-receipt"/);
  assert.doesNotMatch(home, BOTH_MUSICIANS_P);
  const form = ingestVerifyForm({ pasted: LOCKSET_TIP, result: matchPublishedTip(LOCKSET_TIP) });
  assert.match(form, /yes — matches published lockset/);
});

test("GET /receipts/verify paste hash returns yes/no JSON", async () => {
  const yes = await handleReceipts(new Request(
    "https://www.azielcorpuslibrary.net/receipts/verify?hash=" + LOCKSET_TIP,
    { headers: { Accept: "application/json" } },
  ), {});
  assert.equal(yes.status, 200);
  const yesBody = await yes.json();
  assert.equal(yesBody.yes, true);
  assert.equal(yesBody.match, "lockset");
  assert.equal(yesBody.published_tip, LOCKSET_TIP);
  assert.equal(yesBody.cite_rule, CITE_RULE);
  assert.equal(yesBody.survive_rule, SURVIVE_RULE);
  assert.equal(yesBody.author, "Aziel Eliab");

  const no = await handleReceipts(new Request(
    "https://www.azielcorpuslibrary.net/v1/receipts/verify?hash=" + "c".repeat(64),
    { headers: { Accept: "application/json" } },
  ), {});
  assert.equal(no.status, 200);
  const noBody = await no.json();
  assert.equal(noBody.yes, false);
  assert.equal(noBody.published_tip, LOCKSET_TIP);

  const html = await handleReceipts(new Request(
    "https://www.azielcorpuslibrary.net/receipts/verify?hash=" + LOCKSET_TIP,
  ), {});
  assert.equal(html.status, 200);
  const text = await html.text();
  assert.match(text, /yes — matches published lockset/);
  assert.match(text, /cite, don't merge/);
  assert.match(text, /bytes survive; crawlers do not re-expand/);
  assert.doesNotMatch(text, BOTH_MUSICIANS_P);

  const bundle = ingestVerifyJson(matchPublishedTip(LOCKSET_TIP));
  assert.equal(bundle.spec, INGEST_SPEC);
  assert.equal(bundle.reexpand_spec, REEXPAND_SPEC);
});

test("cite.json, llms.txt, ai.txt, robots, sitemap carry the tip and keep crawlers Allowed", async () => {
  const cite = citeDoc();
  assert.equal(cite.ingest_as_receipt, INGEST_SPEC);
  assert.equal(cite.reexpand_from_archive, REEXPAND_SPEC);
  assert.equal(cite.cite_rule, CITE_RULE);
  assert.equal(cite.survive_rule, SURVIVE_RULE);
  assert.equal(cite.lockset_tip, LOCKSET_TIP);
  assert.equal(cite.lockset_id, LOCKSET_ID);
  assert.match(cite.lockset, /\/lockset\.json$/);
  assert.match(cite.lockset_verify, /\/receipts\/verify$/);
  assert.match(cite.training_note, /Weights will not store the chain/);
  assert.equal(cite.author, "Aziel Eliab");
  const fields = ingestReceiptCite();
  assert.equal(fields.lockset_tip, LOCKSET_TIP);

  const llms = llmsDoc("LIMIT");
  assert.match(llms, new RegExp(LOCKSET_TIP));
  assert.match(llms, /cite, don't merge/);
  assert.match(llms, /bytes survive; crawlers do not re-expand/);
  assert.match(llms, /INGEST-AS-RECEIPT-1\.0/);
  assert.match(llms, /RE-EXPAND-FROM-ARCHIVE-1\.0/);
  assert.match(ingestReceiptLlmsBlock(), /crawlers do not re-expand/);

  const ai = aiTxt("LIMIT");
  assert.match(ai, /cite, don't merge/);
  assert.match(ai, /bytes survive; crawlers do not re-expand/);
  assert.match(ai, /GPTBot/);
  assert.match(ai, /User-agent: GPTBot\nAllow: \//);

  const robots = robotsTxt();
  assert.match(robots, /User-agent: GPTBot\nAllow: \//);
  assert.match(robots, /Allow: \/lockset\.json/);
  assert.match(robots, /Allow: \/receipts\/verify/);
  assert.match(robots, /ai-input=yes, ai-train=yes/);

  const xml = await sitemapXml({});
  assert.match(xml, /\/lockset\.json</);
  assert.match(xml, /\/receipts\/verify</);
  assert.doesNotMatch(JSON.stringify(cite) + llms + ai, BANNED);
});
