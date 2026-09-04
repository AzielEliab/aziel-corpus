import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mediaKind,
  isMediaRunId,
  isAudioOrVideo,
  isVideoMedia,
  guessMediaMime,
  parseWavPcm,
  parseWavFeatures,
  waveformFeatures,
  visualFeaturesFromBytes,
  vibeLockPayload,
  vibeAdvisoryDigest,
  truthy,
  VIBELOCK_ANALYZE,
  VIBELOCK_LIMITATION,
} from "./media.js";
import { intelligenceBody, ocrPageBody } from "./hosted-pages.js";
import { latticeAnchorTip } from "./lattice.js";

function makeSineWav(freq = 200, rate = 8000, seconds = 0.35) {
  const n = Math.floor(rate * seconds);
  const dataSize = n * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const u8 = new Uint8Array(buf);
  const v = new DataView(buf);
  const str = (off, s) => {
    for (let i = 0; i < s.length; i++) u8[off + i] = s.charCodeAt(i);
  };
  str(0, "RIFF");
  v.setUint32(4, 36 + dataSize, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, dataSize, true);
  for (let i = 0; i < n; i++) {
    const s = Math.round(Math.sin((2 * Math.PI * freq * i) / rate) * 16000);
    v.setInt16(44 + i * 2, s, true);
  }
  return u8;
}

test("media kinds match the lattice contract", () => {
  assert.equal(mediaKind("ocr", false), "ocr");
  assert.equal(mediaKind("transcript", false), "transcript");
  assert.equal(mediaKind("ocr", true), "ocr+vibelock");
  assert.equal(mediaKind("transcript", true), "transcript+vibelock");
});

test("AZRUN ids are media runs; AZDOC is not", () => {
  assert.equal(isMediaRunId("AZRUN-ABCDEF"), true);
  assert.equal(isMediaRunId("AZDOC-ABCDEF"), false);
});

test("common audio and video types are accepted", () => {
  assert.equal(isAudioOrVideo("audio/wav", "clip.wav"), true);
  assert.equal(isAudioOrVideo("audio/mpeg", "talk.mp3"), true);
  assert.equal(isAudioOrVideo("video/mp4", "clip.mp4"), true);
  assert.equal(isAudioOrVideo("image/png", "scan.png"), false);
  assert.equal(isVideoMedia("video/quicktime", "a.mov"), true);
  assert.equal(guessMediaMime("note.m4a", ""), "audio/mp4");
});

test("WAV PCM yields real rms/zcr features", () => {
  const wav = makeSineWav();
  const parsed = parseWavPcm(wav);
  assert.ok(parsed);
  assert.equal(parsed.rate, 8000);
  const feat = parseWavFeatures(wav);
  assert.equal(feat.limited, false);
  assert.equal(feat.source, "wav_pcm");
  assert.ok(feat.rms > 0.1 && feat.rms < 0.9);
  assert.ok(feat.zcr > 0);
  const wf = waveformFeatures(parsed.samples, parsed.rate);
  assert.ok(wf.f0_jump >= 0);
});

test("VibeLock payload is documented features, not invented proof", () => {
  const wav = makeSineWav();
  const body = vibeLockPayload(wav, "audio/wav", "clip.wav");
  assert.ok(body.features);
  assert.equal(typeof body.features.rms, "number");
  assert.equal(typeof body.features.zcr, "number");
  assert.equal(typeof body.pitch.f0_jump, "number");
  assert.ok(!body.features.limited);
  const digest = vibeAdvisoryDigest({ ok: true, source: VIBELOCK_ANALYZE, score: 0.2, band: "low" });
  assert.equal(digest.advisory, true);
  assert.match(digest.limitation, /not courtroom proof/i);
  assert.match(VIBELOCK_LIMITATION, /not a live microphone/i);
});

test("video payload documents missing FFmpeg temporal decode", () => {
  const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const body = vibeLockPayload(bytes, "video/mp4", "clip.mp4");
  assert.equal(body.video.limited, true);
  assert.match(body.video.note, /no FFmpeg/);
  assert.equal(body.visual.limited, true);
});

test("image visual features are byte-histogram proxies", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 10, 20, 30, 40, 200, 10]);
  const vis = visualFeaturesFromBytes(png);
  assert.equal(vis.limited, true);
  assert.equal(typeof vis.blockiness, "number");
  assert.equal(typeof vis.noise_cv, "number");
});

test("media lattice tip is AzielTether, not a mesh", () => {
  const tip = latticeAnchorTip({
    record_id: "AZRUN-TEST",
    run_id: "AZRUN-TEST",
    media_kind: "transcript+vibelock",
    library: "media-run",
    content_sha256: "a".repeat(64),
    event: "media.transcript_vibelock",
    vibe_digest: "b".repeat(64),
  });
  assert.equal(tip.carrier, "AzielTether");
  assert.equal(tip.run_id, "AZRUN-TEST");
  assert.equal(tip.media_kind, "transcript+vibelock");
  assert.match(tip.note, /not a mesh/);
  assert.equal(tip.author, "Aziel Eliab");
});

test("truthy form flags", () => {
  assert.equal(truthy("1"), true);
  assert.equal(truthy("on"), true);
  assert.equal(truthy(""), false);
  assert.equal(truthy("0"), false);
});

test("intelligence page hosts Whisper and VibeLock options", () => {
  const html = intelligenceBody({ aiReady: true, packages: [], signed: { username: "reader" }, operator: false });
  assert.match(html, /HOSTED \(Workers AI Whisper\)/);
  assert.match(html, /Review authenticity with VibeLock/);
  assert.match(html, /Upload to library/);
  assert.match(html, /action="\/transcribe"/);
  assert.doesNotMatch(html, /NOT HOSTED YET/);
  const ocr = ocrPageBody({ aiReady: true, signed: null, operator: false });
  assert.match(ocr, /action="\/transcribe"/);
  assert.match(ocr, /action="\/ocr"/);
});
