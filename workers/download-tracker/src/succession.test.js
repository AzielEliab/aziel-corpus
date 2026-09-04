import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyEvidenceClass,
  detectFirstHandPatternBreak,
  requestZsolverScore,
} from "./zsolver.js";
import { citeFromChain, maybeRescoreZsolverOnFirstHandPatternBreak } from "./succession.js";

const OLD = "AZDOC-OLD";
const NEW = "AZDOC-NEW";

const FIRST_HAND_BREAK = {
  record_id: NEW,
  title: "King County Coroner File (Revised)",
  filename: "death-certificate-autopsy.pdf",
  subjects: "Forensics",
  keywords: "supersedes:" + OLD,
  body:
    "Contemporaneous primary coroner file and autopsy. Original measurements and sworn affidavit. " +
    "This first-hand material contradicts the same-day suicide conclusion and proves a break in the pattern. " +
    "supersedes:" + OLD,
};

const NARRATIVE_ONLY = {
  record_id: NEW,
  title: "Wire service wrap-up (Revised)",
  filename: "reuters-news-coverage.txt",
  subjects: "Forensics",
  keywords: "supersedes:" + OLD,
  body:
    "News coverage and Reuters wire-service commentary. Second-hand summary of reports. " +
    "Opinion piece and editorial say the official narrative is wrong and that this breaks the pattern. " +
    "supersedes:" + OLD,
};

function chainCite(sourceId) {
  return citeFromChain(sourceId, [
    { record_id: OLD, title: "Prior paper", created_utc: "2026-01-01" },
    { record_id: NEW, title: "Successor paper", created_utc: "2026-02-01" },
  ]);
}

test("first-hand forensic materials classify as first_hand", () => {
  assert.equal(classifyEvidenceClass(FIRST_HAND_BREAK), "first_hand");
  assert.equal(classifyEvidenceClass({ filename: "death-certificate.pdf", body: "original photograph with provenance" }), "first_hand");
  assert.equal(detectFirstHandPatternBreak(FIRST_HAND_BREAK).proven, true);
  assert.equal(detectFirstHandPatternBreak(FIRST_HAND_BREAK).evidence_class, "first_hand");
});

test("narrative and second-source materials do not prove a pattern break", () => {
  assert.equal(classifyEvidenceClass(NARRATIVE_ONLY), "second_hand");
  const proof = detectFirstHandPatternBreak(NARRATIVE_ONLY);
  assert.equal(proof.proven, false);
  assert.equal(proof.evidence_class, "second_hand");
  assert.match(proof.reason, /second-source|narrative/i);
});

test("first-hand pattern break force-rescored every succession chain member via zsolver", async () => {
  const calls = [];
  const result = await maybeRescoreZsolverOnFirstHandPatternBreak({}, FIRST_HAND_BREAK, chainCite(NEW), {
    scoreFn: async (env, rec, opts) => {
      calls.push({ record_id: rec.record_id, force: opts.force, pattern_break: opts.pattern_break });
      return { record_id: rec.record_id };
    },
  });
  assert.equal(result.skipped, false);
  assert.equal(result.rescored, 2);
  assert.deepEqual(result.record_ids, [OLD, NEW]);
  assert.equal(calls.length, 2);
  assert.equal(calls.every((c) => c.force === true), true);
  for (const c of calls) {
    assert.equal(c.pattern_break.proven, true);
    assert.equal(c.pattern_break.evidence_class, "first_hand");
    assert.equal(c.pattern_break.source_record_id, NEW);
    assert.deepEqual(c.pattern_break.superseded_ids, [OLD]);
  }
});

test("narrative-only supersession does not chain-rescore zsolver", async () => {
  const calls = [];
  const result = await maybeRescoreZsolverOnFirstHandPatternBreak({}, NARRATIVE_ONLY, chainCite(NEW), {
    scoreFn: async (env, rec, opts) => {
      calls.push({ record_id: rec.record_id, opts });
      return rec;
    },
  });
  assert.equal(result.skipped, true);
  assert.equal(result.rescored, 0);
  assert.equal(calls.length, 0);
});

test("first-hand proof without a succession link does not rescore", async () => {
  const calls = [];
  const result = await maybeRescoreZsolverOnFirstHandPatternBreak({}, FIRST_HAND_BREAK, null, {
    scoreFn: async () => { calls.push(1); },
  });
  assert.equal(result.skipped, true);
  assert.equal(result.rescored, 0);
  assert.match(result.reason, /succession/);
  assert.equal(calls.length, 0);
});

test("requestZsolverScore forwards pattern_break so live layers can recalibrate", async () => {
  let posted = null;
  const env = {
    ZSOLVER: {
      async fetch(req) {
        posted = JSON.parse(await req.text());
        return {
          ok: true,
          async json() {
            return {
              capped_confidence: 0.4,
              raw_confidence: 0.4,
              uncertainty: 0.6,
              official_contradiction: 0.4,
              alternative_coherence: 0.4,
            };
          },
        };
      },
    },
  };
  const live = await requestZsolverScore(env, [{ pattern_id: "P1", value: "yes" }], {
    pattern_break: { proven: true, evidence_class: "first_hand", source_record_id: NEW, superseded_ids: [OLD] },
  });
  assert.equal(live.source, "zsolver-binding");
  assert.equal(posted.answers[0].pattern_id, "P1");
  assert.equal(posted.pattern_break.proven, true);
  assert.equal(posted.pattern_break.evidence_class, "first_hand");
  assert.equal(posted.pattern_break.source_record_id, NEW);
  assert.deepEqual(posted.pattern_break.superseded_ids, [OLD]);
});
