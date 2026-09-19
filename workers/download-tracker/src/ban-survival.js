/**
 * BAN-SURVIVAL-1.0 hub pull.
 * Prefer live GET runtime /survival (short TTL) over hardcoded ban / platform / Cap-7 copy.
 * Hub map: GET /survival · GET /v1/survival pull the same SoT as /runtime/survival.
 * Not a second FragGate door. Machine-only cites stay consistent. No visible 15:20 chrome.
 * Softwares / runtime mirrors stay Worker SSoT where already wired.
 * Author: Aziel Eliab only. Person @id https://www.azieleliab.com/#aziel.
 */
import { HOST, RUNTIME_ORIGIN } from "./runtime-copy.js";
import { cacheMatchJson, cachePutJson } from "./library-index.js";

const UA = "Mozilla/5.0 AzielDigitalLibrary";

async function runtimeGet(env, destPath) {
  const dest = new URL(destPath, RUNTIME_ORIGIN + "/");
  const headers = { "User-Agent": UA, Accept: "application/json" };
  if (env && env.AZIEL_RUNTIME && typeof env.AZIEL_RUNTIME.fetch === "function") {
    try {
      const res = await env.AZIEL_RUNTIME.fetch(new Request(dest.toString(), { method: "GET", headers }));
      if (res) return { res, via: "service-binding" };
    } catch {
      /* fall through to origin */
    }
  }
  const res = await fetch(dest.toString(), { method: "GET", headers });
  return { res, via: "origin-fetch" };
}

async function fetchRuntimeJson(env, destPath) {
  try {
    const got = await runtimeGet(env, destPath);
    const res = got && got.res;
    if (!res || !res.ok) return null;
    const doc = await res.json();
    if (!doc || typeof doc !== "object" || doc.error) return null;
    return doc;
  } catch {
    return null;
  }
}

export const AUTHOR = "Aziel Eliab";
export const PERSON_ID = "https://www.azieleliab.com/#aziel";
export const BAN_SURVIVAL_SPEC = "BAN-SURVIVAL-1.0";
export const CALLING_NAME_ALERT_PREFIX = "*new name alert: ";
export const SURVIVAL_TTL_S = 60;
export const SURVIVAL_SEO_CACHE_CONTROL =
  "public, s-maxage=" + SURVIVAL_TTL_S + ", stale-while-revalidate=300";
export const SURVIVAL_CACHE_URL = "https://azielcorpuslibrary.net/__cache/ban-survival-v1";
export const SURVIVAL_ORIGIN = RUNTIME_ORIGIN + "/v1/survival";
export const SURVIVAL_ORIGIN_ALIAS = RUNTIME_ORIGIN + "/survival";
export const SURVIVAL_HUB = HOST + "/runtime/survival";
export const SURVIVAL_HUB_V1 = HOST + "/runtime/v1/survival";
export const SURVIVAL_LOCAL = HOST + "/survival";
export const SURVIVAL_LOCAL_V1 = HOST + "/v1/survival";
export const MIRAGEGRID_APP = "https://miragegrid.vibelock.workers.dev";
export const MIRAGEGRID_BRIDGE = MIRAGEGRID_APP + "/bridge";
export const MIRAGEGRID_SHUFFLE = MIRAGEGRID_APP + "/v1/shuffle";
export const MIRAGEGRID_DOWNLOAD = "https://miragegrid-download-tracker.vibelock.workers.dev/";

export const SURVIVAL_SEO_PATHS = Object.freeze([
  "/cite.json",
  "/llms.txt",
  "/ai.txt",
  "/who-is-aziel-eliab.txt",
  "/who-is",
]);

export function isSurvivalSeoPath(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  return SURVIVAL_SEO_PATHS.includes(path);
}

function withTimeout(promise, ms) {
  const limit = Number(ms) || 0;
  if (limit <= 0) return promise;
  let timer;
  return Promise.race([
    Promise.resolve(promise).finally(() => { if (timer) clearTimeout(timer); }),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), limit);
    }),
  ]);
}

export function isSurvivalDoc(doc) {
  if (!doc || typeof doc !== "object") return false;
  const spec = String(doc.spec || "");
  if (spec.includes("BAN-SURVIVAL")) return true;
  return Boolean(doc.mutual_backup != null || (doc.platforms && typeof doc.platforms === "object"));
}

/** Cite-the-pull fallback. Does not invent a LIVE door, ban, or rotated calling name. */
export function survivalFallbackCite() {
  return Object.freeze({
    spec: BAN_SURVIVAL_SPEC,
    author: AUTHOR,
    identity: AUTHOR,
    person_id: PERSON_ID,
    prefer_pull: true,
    pulled: false,
    source: "cite-pull",
    ttl_s: SURVIVAL_TTL_S,
    origin: SURVIVAL_ORIGIN,
    origin_alias: SURVIVAL_ORIGIN_ALIAS,
    hub: SURVIVAL_HUB,
    hub_v1: SURVIVAL_HUB_V1,
    local: SURVIVAL_LOCAL,
    local_v1: SURVIVAL_LOCAL_V1,
    mutual_backup: true,
    shelves_are_not_a_live_door: true,
    shelves_backup_for: "live-front-loss",
    live_doors_backup_for: "cold-shelf-death",
    live_doors: null,
    platforms: Object.freeze({
      spec: "BAN-PLATFORMS-1.0",
      all_live: null,
      prefer_pull: true,
      note: "Prefer pulled /survival platforms.all_live. Do not hardcode OS status.",
    }),
    calling_name: Object.freeze({
      spec: "BAN-CALLING-NAME-1.0",
      prefer_pull: true,
      alert_prefix: CALLING_NAME_ALERT_PREFIX,
      alert: null,
      identity: AUTHOR,
      identity_unchanged: true,
      note: "Mesh nodes pull `" + CALLING_NAME_ALERT_PREFIX + "` from /survival calling_name.alert. Identity Aziel Eliab unchanged.",
    }),
    cap7_aznet: Object.freeze({
      prefer_pull: true,
      factory: "miragegrid",
      resolves_to_hub: false,
      name_may_change: true,
      public_icann: false,
      app_worker: MIRAGEGRID_APP,
      bridge: MIRAGEGRID_BRIDGE,
      shuffle: MIRAGEGRID_SHUFFLE,
      download_plane: MIRAGEGRID_DOWNLOAD,
      note:
        "Cap-7 MirageGrid shuffle: ping the app Worker until one site lands. "
        + "/bridge · /v1/shuffle. resolves_to_hub: false. Prefer pulled /survival cap7_aznet for hosted/SLOT honesty.",
    }),
    shelf_backup: Object.freeze({
      prefer_pull: true,
      shelves: HOST + "/shelves",
      is_live_door: false,
      role: "cold-shelf-backup",
    }),
    visible_1520: false,
    visible_1520_chrome: false,
    lamb_lens: true,
    no_lie: true,
    software_runtime_ssot: true,
    note:
      "Prefer GET " + SURVIVAL_ORIGIN + " (short TTL) for live doors and platform status. "
      + "Same FragGate door: " + SURVIVAL_HUB + ". Hub map: " + SURVIVAL_LOCAL + " · " + SURVIVAL_LOCAL_V1
      + " pull the same SoT. Softwares/runtime mirrors stay Worker SSoT.",
  });
}

function compactDoor(door) {
  if (!door || typeof door !== "object") return null;
  return Object.freeze({
    id: door.id || "",
    origin: door.origin || "",
    via: door.via || "",
    status: door.status || "",
  });
}

function compactPlatforms(platforms) {
  const src = platforms && typeof platforms === "object" ? platforms : {};
  const rows = Array.isArray(src.platforms) ? src.platforms : [];
  return Object.freeze({
    spec: src.spec || "BAN-PLATFORMS-1.0",
    all_live: src.all_live === true ? true : src.all_live === false ? false : null,
    native_app_store: src.native_app_store === true,
    calling_name: src.calling_name || "",
    ids: Object.freeze(rows.map((p) => p && p.id).filter(Boolean)),
    labels: Object.freeze(rows.filter((p) => p && p.live).map((p) => p.label || p.id).filter(Boolean)),
    prefer_pull: false,
    note: src.note || "Windows, Mac, Linux, Android, and iPhone via browser / PWA / Worker / MCP.",
  });
}

function compactCallingName(calling) {
  const src = calling && typeof calling === "object" ? calling : {};
  const alert = src.alert == null || src.alert === "" ? null : String(src.alert);
  return Object.freeze({
    spec: src.spec || "BAN-CALLING-NAME-1.0",
    prefer_pull: false,
    calling_name: src.calling_name || "",
    calling_slug: src.calling_slug || "",
    rotated: src.rotated === true,
    alert,
    alert_prefix: CALLING_NAME_ALERT_PREFIX,
    identity: src.identity || AUTHOR,
    identity_unchanged: src.identity_unchanged !== false,
    note: src.note || "Mesh nodes pull `" + CALLING_NAME_ALERT_PREFIX + "` from /survival. Identity Aziel Eliab unchanged.",
  });
}

function compactCap7(cap7) {
  const src = cap7 && typeof cap7 === "object" ? cap7 : {};
  const shuffle = src.shuffle && typeof src.shuffle === "object" ? src.shuffle : {};
  const hosted = src.hosted_endpoints && typeof src.hosted_endpoints === "object" ? src.hosted_endpoints : {};
  const cite = src.cite && typeof src.cite === "object" ? src.cite : {};
  return Object.freeze({
    prefer_pull: false,
    factory: src.factory || "miragegrid",
    factory_only: src.factory_only !== false,
    resolves_to_hub: src.resolves_to_hub === true ? true : false,
    name_may_change: src.name_may_change !== false,
    public_icann: src.public_icann === true,
    radio_phy: src.radio_phy === true,
    cite_status: cite.status || "",
    hosted_status: hosted.status || "",
    shuffle_spec: shuffle.spec || "CAP7-SHUFFLE-1.0",
    shuffle_layout: shuffle.layout || "",
    public_worker_shuffle: shuffle.public_worker_shuffle || "",
    hardcoded_single_host: shuffle.hardcoded_single_host === true,
    app_worker: MIRAGEGRID_APP,
    bridge: MIRAGEGRID_BRIDGE,
    shuffle: MIRAGEGRID_SHUFFLE,
    download_plane: MIRAGEGRID_DOWNLOAD,
    note:
      "Cap-7 MirageGrid shuffle: ping " + MIRAGEGRID_APP + " until one site lands. "
      + "resolves_to_hub: false. Prefer this pulled cap7_aznet for hosted/SLOT honesty.",
  });
}

function compactShelf(shelf) {
  const src = shelf && typeof shelf === "object" ? shelf : {};
  return Object.freeze({
    prefer_pull: false,
    role: src.role || "cold-shelf-backup",
    is_live_door: src.is_live_door === true,
    shelves: src.shelves || HOST + "/shelves",
    lockset_tip: src.lockset_tip || "",
    note: src.note || "Cold shelves and live fronts back each other up.",
  });
}

export function projectSurvival(doc, extra) {
  const fallback = survivalFallbackCite();
  if (!isSurvivalDoc(doc)) return fallback;
  const doors = Array.isArray(doc.live_doors) ? doc.live_doors.map(compactDoor).filter(Boolean) : null;
  return Object.freeze({
    spec: String(doc.spec || BAN_SURVIVAL_SPEC),
    author: doc.author || AUTHOR,
    identity: doc.identity || AUTHOR,
    person_id: doc.person_id || PERSON_ID,
    prefer_pull: true,
    pulled: extra && extra.pulled === false ? false : true,
    source: (extra && extra.source) || "/v1/survival",
    ttl_s: SURVIVAL_TTL_S,
    origin: SURVIVAL_ORIGIN,
    origin_alias: SURVIVAL_ORIGIN_ALIAS,
    hub: SURVIVAL_HUB,
    hub_v1: SURVIVAL_HUB_V1,
    local: SURVIVAL_LOCAL,
    local_v1: SURVIVAL_LOCAL_V1,
    mode: doc.mode || "",
    mutual_backup: doc.mutual_backup !== false,
    shelves_are_not_a_live_door: doc.shelves_are_not_a_live_door !== false,
    shelves_backup_for: doc.shelves_backup_for || "live-front-loss",
    live_doors_backup_for: doc.live_doors_backup_for || "cold-shelf-death",
    live_doors: doors ? Object.freeze(doors) : null,
    platforms: compactPlatforms(doc.platforms),
    calling_name: compactCallingName(doc.calling_name),
    cap7_aznet: compactCap7(doc.cap7_aznet),
    shelf_backup: compactShelf(doc.shelf_backup),
    visible_1520: doc.visible_1520 === true,
    visible_1520_chrome: false,
    lamb_lens: true,
    no_lie: doc.lie_to_survive === true ? false : true,
    software_runtime_ssot: true,
    tip: doc.tip || "",
    note: doc.note || fallback.note,
  });
}

async function readCachedSurvival() {
  try {
    const hit = await cacheMatchJson(SURVIVAL_CACHE_URL);
    if (hit && hit.spec) return hit;
  } catch {
    /* node tests / empty cache */
  }
  return null;
}

async function writeCachedSurvival(doc) {
  if (!doc || !doc.spec) return;
  try {
    await cachePutJson(SURVIVAL_CACHE_URL, doc, undefined, { cacheControl: SURVIVAL_SEO_CACHE_CONTROL });
  } catch {
    /* cache is optional */
  }
}

/** Pull runtime /survival. Short TTL. Fail-soft to cite-the-pull (never invent a live door). */
export async function fetchLiveSurvival(env, opts = {}) {
  const timeoutMs = opts.timeoutMs != null ? Number(opts.timeoutMs) : 800;
  if (opts.preferCache !== false) {
    const cached = await readCachedSurvival();
    if (cached) return cached;
  }
  const run = async () => {
    for (const dest of ["/v1/survival", "/survival"]) {
      const doc = await fetchRuntimeJson(env, dest);
      if (isSurvivalDoc(doc)) {
        const projected = projectSurvival(doc, { source: dest, pulled: true });
        await writeCachedSurvival(projected);
        return projected;
      }
    }
    return survivalFallbackCite();
  };
  try {
    const live = await withTimeout(run(), timeoutMs);
    if (live && live.spec) return live;
  } catch {
    /* fail-soft */
  }
  return survivalFallbackCite();
}

export function callingNameAlertLine(survival) {
  const src = survival && survival.calling_name ? survival.calling_name : {};
  if (src.alert) return CALLING_NAME_ALERT_PREFIX + String(src.alert);
  return "Calling-name: mesh nodes pull `" + CALLING_NAME_ALERT_PREFIX + "` from /survival calling_name.alert. Identity Aziel Eliab unchanged.";
}

export function platformsLine(survival) {
  const plat = survival && survival.platforms ? survival.platforms : {};
  if (plat.all_live === true) {
    const labels = Array.isArray(plat.labels) && plat.labels.length
      ? plat.labels.join(", ")
      : "Windows, Mac, Linux, Android, iPhone";
    return "Platforms all LIVE: " + labels + " via browser + PWA + Worker fronts + Softwares /download + MCP/OpenAPI.";
  }
  return "Platforms: prefer pulled /survival platforms.all_live (Windows, Mac, Linux, Android, iPhone via browser/PWA/Worker/MCP).";
}

export function survivalCiteFields(survival) {
  const src = survival && survival.spec ? survival : survivalFallbackCite();
  return {
    ban_survival: BAN_SURVIVAL_SPEC,
    ban_survival_pull: true,
    ban_survival_ttl_s: SURVIVAL_TTL_S,
    survival: src.origin,
    survival_hub: src.hub,
    survival_hub_v1: src.hub_v1,
    survival_local: src.local || SURVIVAL_LOCAL,
    survival_local_v1: src.local_v1 || SURVIVAL_LOCAL_V1,
    mutual_backup: src.mutual_backup === true,
    shelves_backup_for: src.shelves_backup_for,
    live_doors_backup_for: src.live_doors_backup_for,
    live_doors: src.live_doors,
    platforms: src.platforms,
    calling_name: src.calling_name,
    calling_name_alert_prefix: CALLING_NAME_ALERT_PREFIX,
    cap7_aznet: src.cap7_aznet,
    shelf_backup: src.shelf_backup,
    miragegrid_app: MIRAGEGRID_APP,
    miragegrid_bridge: MIRAGEGRID_BRIDGE,
    miragegrid_shuffle: MIRAGEGRID_SHUFFLE,
    visible_1520_chrome: false,
    software_runtime_ssot: true,
  };
}

export function survivalLlmsBlock(survival) {
  const src = survival && survival.spec ? survival : survivalFallbackCite();
  const doors = Array.isArray(src.live_doors) && src.live_doors.length
    ? src.live_doors.map((d) => d.origin).filter(Boolean).join(" · ")
    : "prefer pulled /survival live_doors (workers.dev + hub /runtime fronts)";
  return [
    "## Survival (BAN-SURVIVAL-1.0)",
    "",
    "Prefer GET " + SURVIVAL_ORIGIN + " (short TTL " + SURVIVAL_TTL_S + "s) for live doors and platform status. Same FragGate door: " + SURVIVAL_HUB + " · " + SURVIVAL_HUB_V1 + ". Hub map: " + SURVIVAL_LOCAL + " · " + SURVIVAL_LOCAL_V1 + " pull the same SoT (short TTL).",
    "Cold shelves and live fronts back each other up. Keep both.",
    "Person @id: " + PERSON_ID + ". Lamb Lens. NO-LIE. No visible identity-lock chrome.",
    "LIVE doors: " + doors + ".",
    platformsLine(src),
    "Cap-7 MirageGrid shuffle: ping " + MIRAGEGRID_APP + " until one site lands. That land is that-round update. " + MIRAGEGRID_BRIDGE + " · " + MIRAGEGRID_SHUFFLE + ". resolves_to_hub: false. Prefer pulled /survival cap7_aznet for hosted/SLOT honesty.",
    callingNameAlertLine(src),
    "Softwares / runtime mirrors stay Worker SSoT (GET /v1/software, fallback fraggate/list; /runtime/* proxy). Do not hardcode catalog cards.",
    "Never invent a live door. Never fake a Cap-7 hosted /mcp.",
    "",
  ].join("\n");
}

export function survivalWhoIsBlock(survival) {
  const lines = [
    "BAN-SURVIVAL-1.0: cold shelves and live fronts back each other up. Prefer GET " + SURVIVAL_ORIGIN + " (short TTL). Same door: " + SURVIVAL_HUB + " · hub map " + SURVIVAL_LOCAL + " · " + SURVIVAL_LOCAL_V1,
    "Cap-7 MirageGrid shuffle: ping " + MIRAGEGRID_APP + " until one site lands. /bridge · /v1/shuffle. resolves_to_hub: false.",
    "Platforms: prefer pulled /survival platforms.all_live. When the feed says all_live, Windows, Mac, Linux, Android, and iPhone are LIVE via browser + PWA + Worker fronts + Softwares /download + MCP/OpenAPI.",
    "Calling-name: mesh nodes pull `" + CALLING_NAME_ALERT_PREFIX + "` from /survival calling_name.alert. Identity Aziel Eliab unchanged. Person @id " + PERSON_ID + ". Lamb Lens. NO-LIE. No visible 15:20 chrome.",
  ];
  const alert = survival && survival.calling_name && survival.calling_name.alert;
  if (alert) lines.push(CALLING_NAME_ALERT_PREFIX + String(alert));
  return lines.join("\n");
}

export function isSurvivalHubPath(pathname) {
  const path = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  return path === "/survival" || path === "/v1/survival";
}

export function destSurvivalPath(pathname, search) {
  const path = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path === "/survival") return "/survival" + (search || "");
  if (path === "/v1/survival") return "/v1/survival" + (search || "");
  return null;
}

function survivalCors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id, Authorization, X-Aziel-Operator-Token",
  };
}

function survivalHeaders(via) {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": SURVIVAL_SEO_CACHE_CONTROL,
    "CDN-Cache-Control": SURVIVAL_SEO_CACHE_CONTROL,
    "X-Aziel-Survival-Via": via || "cite-pull",
    "X-Aziel-Runtime-Root": HOST + "/runtime",
    "X-Aziel-Survival-Local": SURVIVAL_LOCAL,
    ...survivalCors(),
  };
}

function decorateSurvival(res, via) {
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", SURVIVAL_SEO_CACHE_CONTROL);
  headers.set("CDN-Cache-Control", SURVIVAL_SEO_CACHE_CONTROL);
  headers.set("X-Aziel-Survival-Via", via);
  headers.set("X-Aziel-Runtime-Root", HOST + "/runtime");
  headers.set("X-Aziel-Survival-Local", SURVIVAL_LOCAL);
  for (const [k, v] of Object.entries(survivalCors())) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

async function cancelBody(res) {
  try {
    if (res && res.body && typeof res.body.cancel === "function") await res.body.cancel();
  } catch {
    /* ignore */
  }
}

function hubFallbackBody(cite, extra) {
  const src = cite && cite.spec ? cite : survivalFallbackCite();
  return {
    ok: true,
    kind: "hub_cite",
    spec: BAN_SURVIVAL_SPEC,
    product: "aziel-corpus",
    host_kind: "library_hub",
    second_door: false,
    backdoor_exec: false,
    fraggate_is_the_door: true,
    software_tab: false,
    fraggate_slug: false,
    author: AUTHOR,
    identity: AUTHOR,
    person_id: PERSON_ID,
    sot: SURVIVAL_ORIGIN,
    sot_alias: SURVIVAL_ORIGIN_ALIAS,
    local: SURVIVAL_LOCAL,
    local_json: SURVIVAL_LOCAL_V1,
    runtime: SURVIVAL_HUB,
    runtime_json: SURVIVAL_HUB_V1,
    ttl_s: SURVIVAL_TTL_S,
    pulled: src.pulled === true,
    source: (extra && extra.source) || src.source || "cite-pull",
    via: (extra && extra.via) || src.source || "cite-pull",
    prefer_pull: true,
    mutual_backup: src.mutual_backup !== false,
    live_doors: src.live_doors || null,
    platforms: src.platforms,
    calling_name: src.calling_name,
    cap7_aznet: src.cap7_aznet,
    shelf_backup: src.shelf_backup,
    visible_1520: false,
    visible_1520_chrome: false,
    lamb_lens: true,
    no_lie: src.no_lie !== false,
    lie_to_survive: false,
    rewrite_key: false,
    note: src.note,
  };
}

/**
 * GET /survival · GET /v1/survival — BAN-SURVIVAL hub map.
 * Pulls runtime SoT the same way /runtime/survival does (service binding, else origin).
 * Short TTL. Fail-soft to cite-the-pull. Not a second FragGate door.
 */
export async function handleSurvivalHub(request, url, env) {
  const path = String((url && url.pathname) || "").replace(/\/+$/, "") || "/";
  if (!isSurvivalHubPath(path)) return null;
  const method = String((request && request.method) || "GET").toUpperCase();
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: survivalCors() });
  if (method !== "GET" && method !== "HEAD") {
    return new Response(JSON.stringify({
      error: "GET only",
      spec: BAN_SURVIVAL_SPEC,
      second_door: false,
      backdoor_exec: false,
      fraggate_is_the_door: true,
      hint: "GET /survival · GET /v1/survival pull runtime SoT. FragGate stays POST /runtime/v1/fraggate/call.",
    }, null, 2), { status: 405, headers: survivalHeaders("refuse") });
  }

  const dest = destSurvivalPath(path, url && url.search);
  let got = null;
  try {
    got = await runtimeGet(env, dest);
  } catch {
    got = null;
  }
  const res = got && got.res;
  const via = (got && got.via) || "origin-fetch";
  if (res && res.ok) {
    const out = decorateSurvival(res, via);
    if (method === "HEAD") return new Response(null, { status: out.status, headers: out.headers });
    return out;
  }
  if (res) await cancelBody(res);

  const cite = await fetchLiveSurvival(env, { preferCache: true, timeoutMs: 400 });
  const body = hubFallbackBody(cite, { source: cite && cite.pulled ? cite.source : "cite-pull", via: cite && cite.pulled ? via : "cite-pull" });
  const headers = survivalHeaders(body.via);
  if (method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(JSON.stringify(body, null, 2), { status: 200, headers });
}
