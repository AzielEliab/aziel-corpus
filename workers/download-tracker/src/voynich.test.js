import test from "node:test";
import assert from "node:assert/strict";
import { filmTheaterHtml } from "./film.js";
import { EXPLORE_LINKS } from "./explore-nav.js";
import { sigilNavHtml } from "./ui.js";
import { publicKeywords, publicMethods, publicTheories, publicUnsealReceipts, voynichCatalog } from "./voynich-housing.js";
import { handleVoynich } from "./voynich.js";
import { CORPUS_HSTS } from "./html-security.js";

test("the front door and nav label the tab exactly voynich", () => {
  const film = filmTheaterHtml();
  assert.match(film, /href="\/voynich">voynich</);
  assert.match(film, /href="\/receipts">receipts</);
  const link = EXPLORE_LINKS.find((item) => item.href === "/voynich");
  assert.equal(link && link.label, "voynich");
  assert.match(sigilNavHtml(), /href="\/voynich">voynich</);
  assert.doesNotMatch(sigilNavHtml(), />Voynich</);
});

test("the voynich catalog is an empty housing and stays fail-closed", () => {
  const catalog = voynichCatalog();
  assert.equal(catalog.label, "voynich");
  assert.equal(catalog.live, false);
  assert.equal(catalog.decryption_complete, false);
  assert.equal(catalog.cap7_is_icann, false);
  assert.equal(catalog.resolves_to_hub, false);
  assert.equal(catalog.paid_sat, "HELD");
  assert.equal(catalog.sat, false);
  assert.equal(catalog.tiebreak, "refused");
  assert.equal(catalog.tiebreak_owner, "aziel-runtime");
  const slots = [...catalog.tests, ...catalog.theories, ...catalog.corpus, ...catalog.receipts];
  assert.ok(slots.length > 0);
  for (const slot of slots) {
    assert.equal(slot.payload, null);
    assert.equal(slot.status, "slot");
    assert.equal(slot.source_status, "awaiting_unseal_pr");
  }
  assert.equal(catalog.lattice.wrap, "/v1/lattice/wrap");
  assert.equal(catalog.lattice.pull, "/v1/lattice/pull");
  assert.doesNotMatch(JSON.stringify(catalog), /cracked|solved|decryption_complete":true/);
});

test("registry theories, methods, receipts, and keywords stay undecrypted", () => {
  const theories = publicTheories({
    decryption_complete: false,
    theories: [
      { theory_id: "shared-glyph-core", title: "Compact shared glyph core", family: "structure", related_test_ids: ["abad-zd30-v3-0-shared-glyph-core"], decryption_complete: false },
      { theory_id: "universal-harmonics", title: "Universal Harmonics", family: "mathematics", related_test_ids: [], decryption_complete: false },
      { theory_id: "solved-claim", title: "no", decryption_complete: true, related_test_ids: [] },
    ],
  });
  assert.equal(theories.ok, true);
  assert.equal(theories.decryption_complete, false);
  assert.equal(theories.theories.length, 2);
  assert.equal(theories.theories[0].housed_before, false);
  assert.equal(theories.theories[1].housed_before, true);
  const methods = publicMethods({
    decryption_complete: false,
    methods: [{ method_id: "markov-ngram", title: "Markov and n-gram", related_test_ids: ["abad-zd30-v8-31-prefix-transitions"], related_theory_ids: ["template-slot-grammar"], decryption_complete: false }],
  });
  assert.equal(methods.methods[0].status, "proposed");
  assert.equal(methods.methods[0].decryption_complete, false);
  const keywords = publicKeywords({
    keywords: [
      { keyword: "glyph core", theme: "structure", test_ids: ["abad-zd30-v3-0-shared-glyph-core"] },
      { keyword: "orphan", theme: "structure" },
    ],
  });
  assert.equal(keywords.ok, true);
  assert.equal(keywords.keywords.length, 1);
  assert.deepEqual(keywords.keywords[0].test_ids, ["abad-zd30-v3-0-shared-glyph-core"]);
  const receipts = publicUnsealReceipts({
    decryption_complete: false,
    tip: "ab".repeat(32),
    receipts: [{
      test_id: "abad-zd30-v4-3-contributor-atlas",
      ledger_entry_hash: "cd".repeat(32),
      sha256: "ef".repeat(32),
      source_blob: "receipts/sources/note.docx",
      decryption_complete: false,
      outcome: "not copied",
    }],
  });
  assert.equal(receipts.receipts[0].decryption_complete, false);
  assert.equal(receipts.receipts[0].outcome, undefined);
  assert.equal(publicKeywords({ decryption_complete: true, keywords: [] }).ok, false);
});

test("the voynich page lists housed theories and files keywords against tests", async () => {
  const fetchImpl = async (url) => {
    const body = String(url).endsWith("/receipts/index.json")
      ? { decryption_complete: false, tip: "ab".repeat(32), receipts: [] }
      : String(url).endsWith("/data/theories.json")
        ? { decryption_complete: false, theories: [{ theory_id: "currier-hand-structure", title: "Currier hand structure", family: "handoff", related_test_ids: ["abad-zd30-v3-0-shared-glyph-core"], decryption_complete: false }] }
        : String(url).endsWith("/data/tests.json")
          ? { decryption_complete: false, methods: [{ method_id: "ink-handwriting", title: "Ink and handwriting", related_test_ids: ["abad-zd30-v3-0-shared-glyph-core"], decryption_complete: false }] }
          : { decryption_complete: false, keywords: [{ keyword: "currier", theme: "handoff", test_ids: ["abad-zd30-v3-0-shared-glyph-core"] }] };
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  };
  const res = await handleVoynich(new Request("https://www.azielcorpuslibrary.net/voynich"), { fetchImpl });
  const html = await res.text();
  assert.match(html, /<h1>voynich<\/h1>/);
  assert.match(html, /currier-hand-structure/);
  assert.match(html, /new on this surface/);
  assert.match(html, /ink-handwriting/);
  assert.match(html, /method_run/);
  assert.match(html, /abad-zd30-v3-0-shared-glyph-core/);
  assert.match(html, />currier</);
  assert.match(html, /does not post/);
  assert.match(html, /decryption_complete: false/);
  assert.match(html, /decryption_complete: true<\/code> is refused/);
  assert.doesNotMatch(html, /cracked|solved/);
  const machine = await (await handleVoynich(new Request("https://www.azielcorpuslibrary.net/v1/voynich"), { fetchImpl })).json();
  assert.equal(machine.label, "voynich");
  assert.equal(machine.decryption_complete, false);
  assert.equal(machine.wrap_sent, false);
  assert.equal(machine.post, false);
  assert.equal(machine.keywords_public[0].test_ids[0], "abad-zd30-v3-0-shared-glyph-core");
});

test("GET /voynich is HTML with HSTS and the machine index stays false", async () => {
  const { default: worker } = await import("./index.js");
  const htmlRes = await worker.fetch(new Request("https://www.azielcorpuslibrary.net/voynich", {
    headers: { "User-Agent": "Mozilla/5.0" },
  }), {}, {});
  assert.equal(htmlRes.status, 200);
  assert.match(htmlRes.headers.get("content-type") || "", /text\/html/);
  assert.equal(htmlRes.headers.get("Strict-Transport-Security"), CORPUS_HSTS);
  const html = await htmlRes.text();
  assert.match(html, /<h1>voynich<\/h1>/);
  assert.match(html, /decryption_complete: false/);
  assert.match(html, /Paid sat is HELD/);
  assert.match(html, /Cap-7 is not ICANN/);
  assert.match(html, /\/v1\/lattice\/wrap/);
  assert.doesNotMatch(html, /cracked|solved/);

  const jsonRes = await handleVoynich(new Request("https://www.azielcorpuslibrary.net/voynich.json"));
  const doc = await jsonRes.json();
  assert.equal(doc.decryption_complete, false);
  assert.equal(doc.live, false);
  assert.equal(doc.paid_sat, "HELD");
  const v1 = await handleVoynich(new Request("https://www.azielcorpuslibrary.net/v1/voynich"));
  assert.equal((await v1.json()).label, "voynich");

  const posted = await worker.fetch(new Request("https://www.azielcorpuslibrary.net/voynich", { method: "POST" }), {}, {});
  assert.equal(posted.status, 405);
  const denied = await posted.json();
  assert.equal(denied.decryption_complete, false);
  assert.equal(denied.paid_sat, "HELD");
  assert.equal(denied.cap7_is_icann, false);
  assert.equal(denied.live, false);
});
