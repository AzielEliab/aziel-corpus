/**
 * Hosted Whisper transcription, VibeLock advisory, and media lattice ledger.
 * Author: Aziel Eliab.
 *
 * Every OCR run and every transcript run appends an immutable hash-chained
 * lattice entry (even when the user does not upload to the library).
 * VibeLock is advisory only — not courtroom proof.
 */
import { randomBytes } from "node:crypto";
import { appendLedger, appendDocumentLedger, ensureLedger, isDocumentId, sha256hex, canonicalJson } from "./ledger.js";
import { latticeAnchorTip } from "./lattice.js";
import { isOperator, libraryFor } from "./library.js";

export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const VIBELOCK_HOST = "https://vibelock-download-tracker.vibelock.workers.dev";
export const VIBELOCK_ANALYZE = VIBELOCK_HOST + "/v1/analyze";
export const VIBELOCK_DETECT = VIBELOCK_HOST + "/v1/detect";
export const VIBELOCK_DOWNLOAD = VIBELOCK_HOST + "/download?asset=vibelock-0.3.0.tar.gz";
export const VIBELOCK_GITHUB = "https://github.com/AzielEliab/vibelock";
export const VIBELOCK_LIMITATION =
  "VibeLock determination is mandatory on every transcript. Hard blocks: porn, nudity, child-sexual content (never stored, never playable). Not courtroom proof. Hosted /v1 is not a live microphone. Full local engine is the counted catalog download.";

export const WHISPER_MODELS = [
  "@cf/openai/whisper",
  "@cf/openai/whisper-large-v3-turbo",
  "@cf/openai/whisper-tiny-en",
];

const AUDIO_EXT = /\.(wav|wave|mp3|mpeg|flac|ogg|oga|m4a|aac|webm|opus)$/i;
const VIDEO_EXT = /\.(mp4|m4v|mov|qt|webm|mkv|avi|ogv)$/i;
const AUDIO_MIME = /^(audio\/|application\/ogg)/i;
const VIDEO_MIME = /^video\//i;

function utcNow() {
  return new Date().toISOString();
}

function toU8(bytes) {
  if (!bytes) return new Uint8Array(0);
  if (bytes instanceof Uint8Array) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  return new Uint8Array(bytes);
}

export function isMediaRunId(id) {
  return /^AZRUN-[A-Z0-9]+$/i.test(String(id || "").trim());
}

export function mediaKind(base, wantVibe) {
  const root = String(base || "").toLowerCase() === "ocr" ? "ocr" : "transcript";
  return wantVibe ? root + "+vibelock" : root;
}

export function guessMediaMime(filename, mime) {
  const given = String(mime || "").trim().toLowerCase();
  if (given && given !== "application/octet-stream") return given;
  const name = String(filename || "").toLowerCase();
  if (/\.wav$/i.test(name)) return "audio/wav";
  if (/\.mp3$/i.test(name)) return "audio/mpeg";
  if (/\.flac$/i.test(name)) return "audio/flac";
  if (/\.ogg$/i.test(name)) return "audio/ogg";
  if (/\.m4a$/i.test(name)) return "audio/mp4";
  if (/\.webm$/i.test(name)) return "audio/webm";
  if (/\.mp4$/i.test(name)) return "video/mp4";
  if (/\.mov$/i.test(name)) return "video/quicktime";
  if (/\.mkv$/i.test(name)) return "video/x-matroska";
  return given || "application/octet-stream";
}

export function isAudioOrVideo(mime, filename) {
  const m = String(mime || "");
  const name = String(filename || "");
  return AUDIO_MIME.test(m) || VIDEO_MIME.test(m) || AUDIO_EXT.test(name) || VIDEO_EXT.test(name);
}

export function isVideoMedia(mime, filename) {
  return VIDEO_MIME.test(String(mime || "")) || VIDEO_EXT.test(String(filename || ""));
}

export function truthy(value) {
  const s = String(value == null ? "" : value).trim().toLowerCase();
  return s === "1" || s === "true" || s === "on" || s === "yes";
}

export function bytesAsFile(bytes, name, type) {
  const u8 = toU8(bytes);
  const copy = u8.slice();
  return {
    name: String(name || "file"),
    type: String(type || "application/octet-stream"),
    size: copy.byteLength,
    arrayBuffer: async () => copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength),
  };
}

function aiBound(env) {
  return !!(env && env.AI && typeof env.AI.run === "function");
}

export function readAscii(u8, start, len) {
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(u8[start + i] || 0);
  return s;
}

/** RIFF/WAVE PCM16 (and PCM8) parser for real rms / zcr / f0_jump. */
export function parseWavPcm(bytes) {
  const u8 = toU8(bytes);
  if (u8.length < 44) return null;
  if (readAscii(u8, 0, 4) !== "RIFF" || readAscii(u8, 8, 4) !== "WAVE") return null;
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let off = 12;
  let channels = 1;
  let rate = 8000;
  let bits = 16;
  let audioFormat = 1;
  let dataOff = -1;
  let dataLen = 0;
  while (off + 8 <= u8.length) {
    const id = readAscii(u8, off, 4);
    const size = view.getUint32(off + 4, true);
    const body = off + 8;
    if (id === "fmt " && size >= 16) {
      audioFormat = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true) || 1;
      rate = view.getUint32(body + 4, true) || 8000;
      bits = view.getUint16(body + 14, true) || 16;
    } else if (id === "data") {
      dataOff = body;
      dataLen = size;
      break;
    }
    off = body + size + (size % 2);
  }
  if (dataOff < 0 || audioFormat !== 1) return null;
  const bytesPer = bits === 8 ? 1 : 2;
  const frame = bytesPer * channels;
  if (!frame) return null;
  const n = Math.floor(Math.min(dataLen, u8.length - dataOff) / frame);
  if (n < 8) return null;
  const samples = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const p = dataOff + i * frame;
    if (bits === 8) samples[i] = (u8[p] - 128) * 256;
    else samples[i] = view.getInt16(p, true);
  }
  return { samples, rate, channels, bits };
}

function estimateF0(samples, rate) {
  const minP = Math.max(8, Math.floor(rate / 400));
  const maxP = Math.min(Math.floor(rate / 60), samples.length - 2);
  if (maxP <= minP) return 0;
  let best = 0;
  let bestVal = Infinity;
  const limit = Math.min(samples.length, Math.floor(rate * 0.06));
  for (let p = minP; p <= maxP; p++) {
    let s = 0;
    const end = Math.min(limit, samples.length - p);
    for (let i = 0; i < end; i++) s += Math.abs(samples[i] - samples[i + p]);
    const norm = s / Math.max(1, end);
    if (norm < bestVal) {
      bestVal = norm;
      best = p;
    }
  }
  return best ? rate / best : 0;
}

export function waveformFeatures(samples, rate) {
  const n = samples && samples.length ? samples.length : 0;
  if (!n) return { rms: 0, zcr: 0, f0_jump: 0 };
  let energy = 0;
  let zc = 0;
  let prev = samples[0];
  for (let i = 0; i < n; i++) {
    const x = samples[i] / 32768;
    energy += x * x;
    if (i && ((prev >= 0) !== (samples[i] >= 0))) zc += 1;
    prev = samples[i];
  }
  const hops = 4;
  const win = Math.min(n, Math.max(64, Math.floor(rate * 0.05)));
  const hop = Math.max(1, Math.floor((n - win) / hops));
  const pitches = [];
  for (let h = 0; h < hops; h++) {
    const start = Math.min(h * hop, Math.max(0, n - win));
    pitches.push(estimateF0(samples.subarray(start, start + win), rate));
  }
  const valid = pitches.filter((p) => p > 0);
  let jump = 0;
  for (let i = 1; i < valid.length; i++) jump = Math.max(jump, Math.abs(valid[i] - valid[i - 1]));
  return {
    rms: Number(Math.sqrt(energy / n).toFixed(6)),
    zcr: Number((zc / n).toFixed(6)),
    f0_jump: Number(jump.toFixed(3)),
  };
}

export function parseWavFeatures(bytes) {
  const wav = parseWavPcm(bytes);
  if (!wav) return null;
  const feat = waveformFeatures(wav.samples, wav.rate);
  return { ...feat, rate: wav.rate, source: "wav_pcm", limited: false };
}

function byteLevelAudioFeatures(bytes) {
  const u8 = toU8(bytes);
  const n = u8.length;
  if (!n) return { rms: 0, zcr: 0, f0_jump: 0, limited: true, source: "byte_proxy" };
  const step = Math.max(1, Math.floor(n / 8000));
  let energy = 0;
  let zc = 0;
  let prev = u8[0] - 128;
  let count = 0;
  for (let i = 0; i < n; i += step) {
    const s = u8[i] - 128;
    const x = s / 128;
    energy += x * x;
    if (count && ((prev >= 0) !== (s >= 0))) zc += 1;
    prev = s;
    count += 1;
  }
  return {
    rms: Number(Math.sqrt(energy / Math.max(1, count)).toFixed(6)),
    zcr: Number((zc / Math.max(1, count)).toFixed(6)),
    f0_jump: 0,
    limited: true,
    source: "byte_proxy",
    note: "Not a decoded waveform. WAV PCM is used when the file is RIFF/WAVE. Other containers stay byte-level proxies.",
  };
}

export function visualFeaturesFromBytes(bytes) {
  const u8 = toU8(bytes);
  const n = u8.length;
  if (!n) return { blockiness: 0, noise_cv: 0, limited: true, source: "empty" };
  let jpegMarkers = 0;
  const scan = Math.min(n - 1, 200000);
  for (let i = 0; i < scan; i++) {
    if (u8[i] === 0xff && u8[i + 1] >= 0xc0 && u8[i + 1] <= 0xcf) jpegMarkers += 1;
  }
  const hist = new Array(16).fill(0);
  const step = Math.max(1, Math.floor(n / 4096));
  let count = 0;
  for (let i = 0; i < n; i += step) {
    hist[u8[i] >> 4] += 1;
    count += 1;
  }
  const mean = count / 16;
  let varsum = 0;
  for (const h of hist) varsum += (h - mean) * (h - mean);
  const cv = mean ? Math.sqrt(varsum / 16) / mean : 0;
  return {
    blockiness: Number(Math.min(10, jpegMarkers / 4 + (n > 1000 ? 1 : 0.2)).toFixed(4)),
    noise_cv: Number(cv.toFixed(4)),
    limited: true,
    source: "byte_histogram",
    note: "Hosted visual metrics are byte-histogram proxies. Full pixel decode is the local VibeLock engine.",
  };
}

function wavPcmB64(bytes) {
  const wav = parseWavPcm(bytes);
  if (!wav) return null;
  const maxSamples = Math.min(wav.samples.length, wav.rate * 2);
  if (maxSamples < 32 || maxSamples * 2 > 80000) return null;
  const buf = new Uint8Array(maxSamples * 2);
  const view = new DataView(buf.buffer);
  for (let i = 0; i < maxSamples; i++) view.setInt16(i * 2, wav.samples[i], true);
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return { pcm_b64: btoa(bin), rate: wav.rate, pcm_dtype: "int16" };
}

export function vibeLockPayload(bytes, mime, filename, mode) {
  const m = guessMediaMime(filename, mime);
  const video = isVideoMedia(m, filename);
  const image = mode === "visual" || String(m).startsWith("image/") || /\.(png|jpe?g|gif|webp|pdf)$/i.test(String(filename || ""));
  const wav = parseWavFeatures(bytes);
  const audio = wav || (image ? null : byteLevelAudioFeatures(bytes));
  const body = {};
  if (audio) {
    body.features = { rms: audio.rms, zcr: audio.zcr, f0_jump: audio.f0_jump };
    body.pitch = { f0_jump: audio.f0_jump };
    if (audio.limited) body.features.limited = true;
    if (audio.note) body.features.note = audio.note;
    if (wav) {
      const pcm = wavPcmB64(bytes);
      if (pcm) Object.assign(body, pcm);
    }
  }
  if (image || video) {
    body.visual = visualFeaturesFromBytes(bytes);
  }
  if (video) {
    body.video = {
      limited: true,
      note: "This Worker has no FFmpeg. Temporal flicker/flow is not decoded from the container. Use the local VibeLock engine for full video physics.",
    };
  }
  return body;
}

export function vibeAdvisoryDigest(vibe) {
  if (!vibe || typeof vibe !== "object") return null;
  return {
    advisory: true,
    limitation: VIBELOCK_LIMITATION,
    source: vibe.source || null,
    score: vibe.score != null ? vibe.score : vibe.risk != null ? vibe.risk : null,
    band: vibe.band || vibe.level || null,
    ok: vibe.ok !== false,
  };
}

function textFromWhisper(res) {
  if (res == null) return "";
  if (typeof res === "string") return res;
  if (typeof res.text === "string") return res.text;
  if (typeof res.transcript === "string") return res.transcript;
  if (typeof res.response === "string") return res.response;
  if (Array.isArray(res.segments)) {
    return res.segments.map((s) => (s && s.text) || "").join(" ").trim();
  }
  try { return JSON.stringify(res); } catch { return ""; }
}

export async function transcribeWhisper(env, bytes, mime, filename) {
  if (!aiBound(env)) {
    return { ok: false, text: "", error: "Workers AI binding (env.AI) missing", missing: "Workers AI Whisper" };
  }
  const u8 = toU8(bytes);
  const audioArr = Array.from(u8);
  const video = isVideoMedia(mime, filename);
  let lastErr = "";
  for (const model of WHISPER_MODELS) {
    const payloads = [
      { audio: audioArr },
      { audio: [...audioArr] },
    ];
    for (const input of payloads) {
      try {
        const res = await env.AI.run(model, input);
        const text = String(textFromWhisper(res) || "").trim();
        if (text) return { ok: true, text, model, video };
        lastErr = "empty response from " + model;
      } catch (err) {
        lastErr = err && err.message ? err.message : String(err);
      }
    }
  }
  const limit = video
    ? "This Worker has no FFmpeg and does not demux video. Whisper was given the container bytes. Extract an audio track (wav, mp3, flac, ogg, m4a, or webm) and upload that."
    : "Whisper could not read this file. Try wav, mp3, flac, ogg, m4a, or webm under 10 MB.";
  return { ok: false, text: "", error: lastErr || "whisper failed", message: limit, video, missing: lastErr ? "Workers AI Whisper (" + lastErr + ")" : "Workers AI Whisper" };
}

export async function reviewVibeLock(bytes, mime, filename, opts) {
  const payload = vibeLockPayload(bytes, mime, filename, opts && opts.mode);
  const headers = { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "Mozilla/5.0" };
  const endpoints = [VIBELOCK_ANALYZE, VIBELOCK_DETECT];
  let lastErr = "";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
      const raw = await res.text();
      let data = null;
      try { data = JSON.parse(raw); } catch { data = { raw: String(raw).slice(0, 800) }; }
      if (!res.ok) {
        lastErr = "HTTP " + res.status;
        continue;
      }
      return {
        ok: true,
        advisory: true,
        limitation: VIBELOCK_LIMITATION,
        source: url,
        payload_kind: Object.keys(payload),
        features_limited: !!(payload.features && payload.features.limited) || !!(payload.visual && payload.visual.limited),
        result: data,
        score: data && (data.score != null ? data.score : data.risk != null ? data.risk : data.advisory_score),
        band: data && (data.band || data.level || data.risk_band),
        catalog: VIBELOCK_DOWNLOAD,
        github: VIBELOCK_GITHUB,
      };
    } catch (err) {
      lastErr = err && err.message ? err.message : String(err);
    }
  }
  return {
    ok: false,
    advisory: true,
    limitation: VIBELOCK_LIMITATION,
    error: lastErr || "VibeLock unreachable",
    catalog: VIBELOCK_DOWNLOAD,
    github: VIBELOCK_GITHUB,
  };
}

export async function ensureMediaSchema(env) {
  if (!env || !env.DB) return;
  await ensureLedger(env);
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS media_runs (run_id TEXT PRIMARY KEY, kind TEXT NOT NULL, filename TEXT, mime TEXT, content_sha256 TEXT NOT NULL, transcript TEXT, transcript_sha256 TEXT, vibe_json TEXT, vibe_digest TEXT, lattice_tip_json TEXT, prev_hash TEXT, entry_hash TEXT, record_id TEXT, error TEXT, created_utc TEXT NOT NULL)"
  ).run();
  try { await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_media_runs_sha ON media_runs(content_sha256)").run(); } catch { /* exists */ }
  try { await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_media_runs_created ON media_runs(created_utc)").run(); } catch { /* exists */ }
}

function newRunId() {
  return "AZRUN-" + randomBytes(6).toString("hex").toUpperCase();
}

export async function persistMediaRun(env, args) {
  await ensureMediaSchema(env);
  const kind = String((args && args.kind) || "transcript");
  const filename = String((args && args.filename) || "").slice(0, 180);
  const mime = String((args && args.mime) || "").slice(0, 120);
  const text = String((args && args.text) || "");
  const u8 = toU8(args && args.bytes);
  const contentSha = sha256hex(u8.length ? u8 : new TextEncoder().encode(text || kind));
  const textSha = text ? sha256hex(text) : null;
  const vibe = args && args.vibe ? args.vibe : null;
  const vibeDigest = vibe ? sha256hex(canonicalJson(vibeAdvisoryDigest(vibe))) : null;
  const runId = newRunId();
  const recordId = (args && args.recordId) || null;
  const payload = {
    run_id: runId,
    kind,
    content_sha256: contentSha,
    transcript_sha256: textSha,
    filename,
    mime,
    vibe_digest: vibeDigest,
    record_id: recordId,
    node: "aziel-corpus",
    product: "aziel-corpus",
    scope: "media-lattice",
    blocked: !!(args && args.blocked),
    stored: args && args.stored === false ? false : true,
  };
  const action = String((args && args.action) || kind);
  payload.ledger_action = action;
  const entry = await appendLedger(env, action, payload);
  const tip = latticeAnchorTip({
    record_id: recordId || runId,
    library: "media-run",
    content_sha256: contentSha,
    ledger_entry_hash: entry.entry_hash,
    event: "media." + String(action).replace(/\+/g, "_"),
    verified_utc: entry.timestamp_utc,
    run_id: runId,
    media_kind: kind,
    vibe_digest: vibeDigest,
  });
  await env.DB.prepare(
    "INSERT INTO media_runs(run_id,kind,filename,mime,content_sha256,transcript,transcript_sha256,vibe_json,vibe_digest,lattice_tip_json,prev_hash,entry_hash,record_id,error,created_utc) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    runId,
    kind,
    filename || null,
    mime || null,
    contentSha,
    text ? text.slice(0, 200000) : null,
    textSha,
    vibe ? JSON.stringify(vibe).slice(0, 200000) : null,
    vibeDigest,
    JSON.stringify(tip),
    entry.previous_hash,
    entry.entry_hash,
    recordId,
    args && args.error ? String(args.error).slice(0, 800) : null,
    entry.timestamp_utc || utcNow()
  ).run();
  if (recordId && isDocumentId(recordId)) {
    try {
      await appendDocumentLedger(env, recordId, kind, { run_id: runId, content_sha256: contentSha, transcript_sha256: textSha, vibe_digest: vibeDigest });
    } catch { /* document chain optional */ }
  }
  return {
    run_id: runId,
    kind,
    filename,
    mime,
    content_sha256: contentSha,
    transcript_sha256: textSha,
    transcript: text,
    vibe,
    vibe_digest: vibeDigest,
    lattice_tip: tip,
    prev_hash: entry.previous_hash,
    entry_hash: entry.entry_hash,
    record_id: recordId,
    error: args && args.error ? String(args.error) : null,
    created_utc: entry.timestamp_utc,
    receipt_url: "/receipt/" + runId,
    ledger_url: "/ledger/" + runId,
    ledger_action: action,
    blocked: !!(args && args.blocked),
  };
}

export async function linkRunToRecord(env, runId, recordId, kind, extra) {
  if (!env || !env.DB || !runId || !recordId) return;
  try {
    await env.DB.prepare("UPDATE media_runs SET record_id=? WHERE run_id=?").bind(recordId, runId).run();
  } catch { /* schema */ }
  if (isDocumentId(recordId)) {
    await appendDocumentLedger(env, recordId, kind || "transcript", { run_id: runId, ...(extra || {}) });
  }
}

export async function persistOcrRun(env, args) {
  const wantVibe = !!(args && args.wantVibe);
  let vibe = args && args.vibe ? args.vibe : null;
  if (wantVibe && !vibe) {
    vibe = await reviewVibeLock(args && args.bytes, args && args.mime, args && args.filename, { mode: "visual" });
  }
  return persistMediaRun(env, {
    kind: mediaKind("ocr", wantVibe || !!vibe),
    filename: args && args.filename,
    mime: args && args.mime,
    bytes: args && args.bytes,
    text: args && args.text,
    vibe,
    recordId: args && args.recordId,
    error: args && args.error,
  });
}

function libraryNotes(text, run, vibe) {
  const bits = [
    String(text || "").trim(),
    "Ledger: /receipt/" + run.run_id,
    "Kind: " + run.kind,
    "VibeLock determination is mandatory (not courtroom proof).",
  ];
  return bits.join("\n\n").slice(0, 200000);
}

export { libraryNotes };

export function publicRunPayload(run, extra) {
  extra = extra || {};
  return {
    ok: extra.ok != null ? extra.ok : !run.error,
    run_id: run.run_id,
    kind: run.kind,
    transcript: run.transcript || "",
    text: run.transcript || "",
    vibe: run.vibe || extra.vibe || null,
    vibe_limitation: VIBELOCK_LIMITATION,
    content_sha256: run.content_sha256,
    transcript_sha256: run.transcript_sha256,
    lattice_tip: run.lattice_tip,
    prev_hash: run.prev_hash,
    entry_hash: run.entry_hash,
    receipt_url: run.receipt_url,
    ledger_url: run.ledger_url,
    record_id: (extra.ingest && extra.ingest.id) || run.record_id || null,
    library: extra.ingest && extra.ingest.library,
    ingest: extra.ingest
      ? { record_id: extra.ingest.id, library: extra.ingest.library, title: extra.ingest.title, triad: extra.ingest.review && extra.ingest.review.triad }
      : null,
    ingest_error: extra.ingest_error || null,
    whisper: extra.whisper || null,
    error: run.error || (extra.whisper && extra.whisper.error) || null,
    message: extra.message || (extra.whisper && extra.whisper.message) || null,
    vibelock_catalog: VIBELOCK_DOWNLOAD,
    vibelock_github: VIBELOCK_GITHUB,
    author: "Aziel Eliab",
  };
}

export async function getMediaRun(env, runId) {
  await ensureMediaSchema(env);
  const id = String(runId || "").trim();
  if (!id || !env || !env.DB) return null;
  const row = await env.DB.prepare(
    "SELECT run_id, kind, filename, mime, content_sha256, transcript, transcript_sha256, vibe_json, vibe_digest, lattice_tip_json, prev_hash, entry_hash, record_id, error, created_utc FROM media_runs WHERE run_id=?"
  ).bind(id).first();
  return row || null;
}

export async function receiptForMediaRun(env, runId) {
  const row = await getMediaRun(env, runId);
  if (!row) return null;
  let vibe = null;
  let tip = null;
  try { vibe = row.vibe_json ? JSON.parse(row.vibe_json) : null; } catch { vibe = null; }
  try { tip = row.lattice_tip_json ? JSON.parse(row.lattice_tip_json) : null; } catch { tip = null; }
  return {
    run_id: row.run_id,
    kind: row.kind,
    filename: row.filename,
    mime: row.mime,
    content_sha256: row.content_sha256,
    transcript_sha256: row.transcript_sha256,
    transcript: row.transcript || "",
    vibe,
    vibe_digest: row.vibe_digest,
    vibe_limitation: VIBELOCK_LIMITATION,
    lattice_tip: tip,
    prev_hash: row.prev_hash,
    entry_hash: row.entry_hash,
    record_id: row.record_id,
    error: row.error,
    created_utc: row.created_utc,
    immutable: true,
    receipt_url: "/receipt/" + row.run_id,
    ledger_url: "/ledger/" + row.run_id,
    media_url: row.error === "AV_BLOCKED" ? null : (row.content_sha256 ? "/media/" + row.content_sha256 : null),
    blocked: row.error === "AV_BLOCKED",
    vibelock_catalog: VIBELOCK_DOWNLOAD,
    vibelock_github: VIBELOCK_GITHUB,
    author: "Aziel Eliab",
    node: "aziel-corpus",
    product: "aziel-corpus",
  };
}

export function libraryTargetLabel(signed) {
  if (!signed) return "sign-in required";
  return isOperator(signed) ? "Aziel Library" : "Corpus (Lamb Lens)";
}

export { libraryFor };
