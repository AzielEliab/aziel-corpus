import { test } from "node:test";
import assert from "node:assert/strict";
import {
  safetyScanText,
  safetyFromVibe,
  combineSafety,
  whisperBound,
  LATTICE_AV_BLOCKED,
  LATTICE_TRANSCRIPT_VIBELOCK,
  AV_BLOCK_STATUS,
  BLOCKED_MESSAGE,
} from "./transcript.js";
import { intelligenceBody, ocrPageBody } from "./hosted-pages.js";

test("safetyScanText blocks child-sexual language", () => {
  const s = safetyScanText("this is child pornography");
  assert.equal(s.blocked, true);
  assert.ok(s.reasons.includes("child_sexual"));
});

test("safetyScanText blocks porn and nudity", () => {
  const s = safetyScanText("explicit nsfw porn video with nudity");
  assert.equal(s.blocked, true);
  assert.ok(s.reasons.includes("porn_nudity"));
});

test("safetyScanText allows ordinary research speech", () => {
  const s = safetyScanText("Independent primary source measurement of 12 joules in Florence.");
  assert.equal(s.blocked, false);
  assert.deepEqual(s.reasons, []);
});

test("safetyFromVibe reads nsfw flags from VibeLock result", () => {
  const s = safetyFromVibe({ ok: true, result: { nsfw: true, labels: ["porn"] } });
  assert.equal(s.blocked, true);
  assert.ok(s.reasons.includes("porn_nudity"));
});

test("combineSafety blocks if either scanner hits, even if VibeLock is down", () => {
  const text = safetyScanText("child sexual abuse material");
  const vibe = safetyFromVibe({ ok: false, reachable: false, error: "unreachable" });
  const c = combineSafety(text, vibe);
  assert.equal(c.blocked, true);
  assert.equal(c.policy, "child_sexual");
  assert.equal(LATTICE_AV_BLOCKED, "LATTICE_AV_BLOCKED");
  assert.equal(LATTICE_TRANSCRIPT_VIBELOCK, "LATTICE_TRANSCRIPT_VIBELOCK");
  assert.equal(AV_BLOCK_STATUS, 451);
  assert.match(BLOCKED_MESSAGE, /not stored/);
});

test("whisperBound is false without env.AI.run", () => {
  assert.equal(whisperBound({}), false);
  assert.equal(whisperBound({ AI: { run: async () => ({}) } }), true);
});

test("intelligence UI mandates VibeLock and has no optional checkbox", () => {
  const html = intelligenceBody({ aiReady: true, packages: [], signed: { username: "reader" }, operator: false });
  assert.match(html, /VibeLock determination is mandatory/);
  assert.match(html, /Transcribe \+ VibeLock determine/);
  assert.doesNotMatch(html, /Optional\s+VibeLock/);
  assert.doesNotMatch(html, /Review authenticity with VibeLock/);
  const ocr = ocrPageBody({ aiReady: true, signed: null, operator: false });
  assert.doesNotMatch(ocr, /Optional\s+VibeLock/);
  assert.doesNotMatch(ocr, /name="vibelock"/);
});
