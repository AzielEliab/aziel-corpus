/**
 * Cite stamp for azielcorpuslibrary.net cite.json / llms.txt.
 * Prefer live GET /v1/software (same-origin /runtime/v1/software) at serve time.
 * The bake is the fallback. Cos restamps it when the deployed Softwares tip moves.
 * GET /v1/mesh never enables. Remain-OFF untouched.
 * Author: Aziel Eliab only.
 */
import { discardBody } from "./http-body.js";
import {
  RUNTIME_GIT_FULL,
  RUNTIME_GIT_SHA,
  RUNTIME_VERSION_ID,
} from "./runtime-copy.js";

/** Retired corpus bake. A stored outlet that still carries this pair is not the live tip. */
export const RETIRED_RUNTIME_GIT = "231b02f";
export const RETIRED_RUNTIME_VERSION_ID = "a8f7fdc9";

const SHORT_GIT = /^[0-9a-f]{7,8}$/;
const FULL_GIT = /^[0-9a-f]{40}$/;
const VERSION_ID = /^(?:[0-9a-f]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

export const COS_LIVE_RESTAMP_DUTY =
  "Cos LIVE restamp duty. Baked fallback is ce673365 / eaf0b54c "
  + "(git_full ce673365700d41fc604292ab2b92b1b1ca504016, version_id eaf0b54c-1e5b-4d54-a582-25c5cdc09f92). "
  + "Prefer live GET /runtime/v1/software git_sha and version_id at serve time. "
  + "When that read fails, this bake is the cite. Cos restamps the bake when the deployed Softwares tip moves. "
  + "GET /v1/mesh never enables. Remain-OFF untouched.";

/** Counts/status cite. Not an enable. */
export const MESH_POINTER_NOTE =
  "GET /v1/mesh never enables. Remain-OFF. The URL is a counts/status cite, not an enable.";

let liveCache = { at: 0, stamp: null };
const LIVE_CACHE_MS = 60_000;

export function bakedRuntimeStamp() {
  return {
    git: RUNTIME_GIT_SHA,
    git_full: RUNTIME_GIT_FULL,
    version_id: RUNTIME_VERSION_ID,
    source: "baked-fallback",
    duty: COS_LIVE_RESTAMP_DUTY,
  };
}

export function stampFromSoftwareText(text) {
  const raw = String(text || "");
  const gitM = raw.match(/"git_sha"\s*:\s*"([0-9a-fA-F]{7,40})"/);
  const vidM = raw.match(/"version_id"\s*:\s*"([0-9a-fA-F-]{8,36})"/);
  if (!gitM || !vidM) return null;
  const full = gitM[1].toLowerCase();
  const vid = vidM[1].toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(full) || !VERSION_ID.test(vid)) return null;
  return {
    git: full.length === 7 ? full : full.slice(0, 8),
    git_full: full.length === 40 ? full : "",
    version_id: vid,
    source: "live",
    duty: COS_LIVE_RESTAMP_DUTY,
  };
}

/**
 * Live software catalog wins. A non-retired outlet sot wins only when the live
 * read is absent. The retired 231b02f / a8f7fdc9 bake never wins over the restamp.
 */
export function pickRuntimeStamp(explicit, sot) {
  if (
    explicit
    && explicit.source === "live"
    && SHORT_GIT.test(String(explicit.git || ""))
    && VERSION_ID.test(String(explicit.version_id || ""))
  ) {
    const full = String(explicit.git_full || "").toLowerCase();
    return {
      git: String(explicit.git).toLowerCase(),
      git_full: FULL_GIT.test(full) ? full : "",
      version_id: String(explicit.version_id).toLowerCase(),
      source: "live",
      duty: COS_LIVE_RESTAMP_DUTY,
    };
  }
  const git = sot && SHORT_GIT.test(String(sot.git || "").toLowerCase())
    ? String(sot.git).toLowerCase()
    : "";
  if (git && git !== RETIRED_RUNTIME_GIT) {
    const full = sot && FULL_GIT.test(String(sot.git_full || "").toLowerCase())
      ? String(sot.git_full).toLowerCase()
      : "";
    let version_id = RUNTIME_VERSION_ID;
    if (sot && Object.prototype.hasOwnProperty.call(sot, "version_id")) {
      if (sot.version_id == null || sot.version_id === "") version_id = null;
      else {
        const vid = String(sot.version_id).toLowerCase();
        if (vid !== RETIRED_RUNTIME_VERSION_ID && VERSION_ID.test(vid)) version_id = vid;
      }
    }
    return {
      git,
      git_full: full,
      version_id,
      source: "outlet",
      duty: COS_LIVE_RESTAMP_DUTY,
    };
  }
  return bakedRuntimeStamp();
}

/** Read git_sha + version_id from the front of GET /v1/software. Do not buffer the catalog. */
export async function readSoftwareStamp(response) {
  if (!response) return null;
  const cap = 65536;
  try {
    if (response.body && typeof response.body.getReader === "function") {
      const reader = response.body.getReader();
      const dec = new TextDecoder();
      let text = "";
      try {
        while (text.length < cap) {
          const step = await reader.read();
          if (step.done) break;
          text += dec.decode(step.value, { stream: true });
          const parsed = stampFromSoftwareText(text);
          if (parsed) return parsed;
        }
      } finally {
        try { await reader.cancel(); } catch { /* already closed */ }
      }
      return stampFromSoftwareText(text);
    }
    if (typeof response.text === "function") {
      const text = await response.text();
      return stampFromSoftwareText(String(text).slice(0, cap));
    }
  } catch {
    return null;
  }
  return null;
}

/** Live GET /v1/software via the runtime binding, else the baked fallback. */
export async function resolveRuntimeCiteStamp(env, opts = {}) {
  const now = Date.now();
  if (liveCache.stamp && now - liveCache.at < LIVE_CACHE_MS) return liveCache.stamp;
  const timeoutMs = opts.timeoutMs != null ? Number(opts.timeoutMs) : 2000;
  try {
    const { runtimeGet } = await import("./software-catalog.js");
    const res = await runtimeGet(env, "/v1/software", { timeoutMs });
    if (!res || !res.ok) {
      await discardBody(res);
      return bakedRuntimeStamp();
    }
    const live = await readSoftwareStamp(res);
    if (live) {
      liveCache = { at: now, stamp: live };
      return live;
    }
    await discardBody(res);
  } catch {
    /* origin quiet — bake */
  }
  return bakedRuntimeStamp();
}
