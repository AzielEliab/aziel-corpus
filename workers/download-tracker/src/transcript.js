/**
 * Hosted Whisper transcription with MANDATORY VibeLock determination.
 * Hard blocks: porn, nudity, child-sexual content. Blocked media is never
 * stored and never playable. Author: Aziel Eliab.
 */
import {
  transcribeWhisper,
  reviewVibeLock,
  vibeLockPayload,
  VIBELOCK_LIMITATION,
  VIBELOCK_DOWNLOAD,
  VIBELOCK_GITHUB,
} from "./media.js";

export const LATTICE_TRANSCRIPT_VIBELOCK = "LATTICE_TRANSCRIPT_VIBELOCK";
export const LATTICE_AV_BLOCKED = "LATTICE_AV_BLOCKED";
export const AV_BLOCK_STATUS = 451;
export const BLOCKED_MESSAGE =
  "This audio/video is blocked. Porn, nudity, and child-sexual content are not stored and are not playable on this library.";

/** Child-sexual content (policy scan). Not a catalog of abuse material. */
export const CHILD_SEXUAL_RE =
  /\b(child\s*porn(?:ography)?|csam|child\s*sexual(?:\s*abuse)?|sexual(?:ized)?\s+(?:content\s+)?(?:involving\s+)?(?:a\s+)?(?:minor|minors|child|children|kid|kids|underage|toddler|infant)|(?:minor|child|children|underage|toddler|infant).{0,32}(?:sex|sexual|porn)|(?:sex|sexual|porn).{0,32}(?:minor|child|children|underage)|pedophil(?:e|ia)?|paedophil(?:e|ia)?|loli(?:con)?|shota(?:con)?)\b/i;

/** Pornography / nudity (policy scan). */
export const PORN_NUDITY_RE =
  /\b(pornograph(?:y|ic)?|\bporn\b|\bxxx\b|onlyfans|hardcore\s+sex|explicit\s+sex|sex\s+tape|\bnudes?\b|\bnudity\b|\bnsfw\b|naked\s+(?:body|bodies|photo|photos|video|picture)|strip(?:ping|tease))\b/i;

export function whisperBound(env) {
  return !!(env && env.AI && typeof env.AI.run === "function");
}

export async function transcribeFile(env, bytes, mime, filename) {
  return transcribeWhisper(env, bytes, mime, filename);
}

function uniqueReasons(list) {
  const out = [];
  for (const r of list || []) {
    if (r && out.indexOf(r) < 0) out.push(r);
  }
  return out;
}

function pushReason(reasons, reason) {
  if (reason && reasons.indexOf(reason) < 0) reasons.push(reason);
}

export function safetyScanText(text, extra) {
  const bits = [text];
  if (extra && extra.filename) bits.push(String(extra.filename));
  if (extra && extra.mime) bits.push(String(extra.mime));
  const hay = bits.filter(Boolean).join("\n");
  const reasons = [];
  if (CHILD_SEXUAL_RE.test(hay)) pushReason(reasons, "child_sexual");
  if (PORN_NUDITY_RE.test(hay)) pushReason(reasons, "porn_nudity");
  return {
    blocked: reasons.length > 0,
    reasons,
    source: "text",
  };
}

function walkVibeHits(value, reasons, depth) {
  if (depth > 8 || value == null) return;
  const t = typeof value;
  if (t === "string") {
    if (CHILD_SEXUAL_RE.test(value)) pushReason(reasons, "child_sexual");
    if (PORN_NUDITY_RE.test(value)) pushReason(reasons, "porn_nudity");
    return;
  }
  if (t !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walkVibeHits(item, reasons, depth + 1);
    return;
  }
  for (const [k, v] of Object.entries(value)) {
    const key = String(k).toLowerCase();
    const on = v === true || v === 1 || v === "1" || v === "true" || (typeof v === "number" && v >= 0.85);
    if (on && /csam|child.?sex|sexual.?minor|underage|pedo/.test(key)) pushReason(reasons, "child_sexual");
    if (on && /(?:^|_)(porn|nsfw|nudity|nude|explicit|xxx)(?:$|_)/.test(key)) pushReason(reasons, "porn_nudity");
    walkVibeHits(v, reasons, depth + 1);
  }
}

export function safetyFromVibe(vibe) {
  const reasons = [];
  if (!vibe) {
    return { blocked: false, reasons, source: "vibe_missing", reachable: false };
  }
  const focus = vibe.result != null ? vibe.result : vibe;
  walkVibeHits(focus, reasons, 0);
  return {
    blocked: reasons.length > 0,
    reasons: uniqueReasons(reasons),
    source: "vibe",
    reachable: vibe.ok !== false && vibe.reachable !== false,
  };
}

export function combineSafety() {
  const reasons = [];
  const sources = [];
  for (const scan of arguments) {
    if (!scan) continue;
    if (scan.source) sources.push(scan.source);
    for (const r of scan.reasons || []) pushReason(reasons, r);
  }
  const child = reasons.indexOf("child_sexual") >= 0;
  const porn = reasons.indexOf("porn_nudity") >= 0;
  return {
    blocked: reasons.length > 0,
    reasons,
    policy: child ? "child_sexual" : porn ? "porn_nudity" : "clear",
    sources,
    stored: false,
    playable: false,
  };
}

export async function vibeDetermination(bytes, mime, filename) {
  const payload = vibeLockPayload(bytes, mime, filename);
  const out = await reviewVibeLock(bytes, mime, filename);
  return {
    mandatory: true,
    determination: "mandatory",
    ok: !!(out && out.ok),
    reachable: !!(out && out.ok),
    limitation: (out && out.limitation) || VIBELOCK_LIMITATION,
    source: out && out.source,
    result: out && out.result,
    score: out && out.score,
    band: out && out.band,
    error: out && out.error,
    features_limited: !!(out && out.features_limited),
    payload_kind: Object.keys(payload || {}),
    catalog: VIBELOCK_DOWNLOAD,
    github: VIBELOCK_GITHUB,
    hard_blocks: ["porn", "nudity", "child_sexual"],
  };
}

export function blockedPublicPayload(extra) {
  extra = extra || {};
  return {
    ok: false,
    blocked: true,
    status: AV_BLOCK_STATUS,
    message: BLOCKED_MESSAGE,
    reasons: extra.reasons || [],
    policy: extra.policy || "blocked",
    stored: false,
    playable: false,
    media_url: null,
    transcript: "",
    text: "",
    run_id: extra.run_id || null,
    receipt_url: extra.receipt_url || null,
    ledger_url: extra.ledger_url || null,
    ledger_action: LATTICE_AV_BLOCKED,
    vibe: extra.vibe || null,
    author: "Aziel Eliab",
  };
}
