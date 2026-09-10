/**
 * Counted Softwares /download + /v1/download.
 * Stream the hosted zip. Never block TTFB on D1 review or structure walk.
 * Honest 2xx when the asset is missing or slow. Author: Aziel Eliab only.
 */
import { LIBRARY_DOWNLOAD, LIBRARY_V1_DOWNLOAD, HOST } from "./runtime-copy.js";

const UA = "Mozilla/5.0 AzielDigitalLibrary";

export const DEFAULT_ASSET = "aziel-digital-library-2.7.0.zip";
export const LEGACY_ASSET = "aziel-digital-library-2.6.2.zip";
export const ALLOWED_ASSETS = [DEFAULT_ASSET, LEGACY_ASSET];
export const ASSET_FETCH_TIMEOUT_MS = 4000;
export const LIBRARY_INSTALL = HOST + "/install.sh";
export const LIBRARY_GITHUB = "https://github.com/AzielEliab/aziel-corpus";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id, Authorization, X-Aziel-Operator-Token",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  };
}

function json(body, status = 200, extraHeaders) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=3600",
      ...corsHeaders(),
      ...(extraHeaders || {}),
    },
  });
}

export function softwareDownloadDoc({
  available = false,
  asset = DEFAULT_ASSET,
  served = "",
  status = null,
  note = "",
} = {}) {
  const ready = Boolean(available);
  return {
    ok: true,
    available: ready,
    slug: "aziel-corpus",
    name: "Aziel Digital Library",
    version: "2.7.0",
    download_url: LIBRARY_DOWNLOAD,
    v1_download: LIBRARY_V1_DOWNLOAD,
    install: LIBRARY_INSTALL,
    github: LIBRARY_GITHUB,
    asset: served || asset,
    fallback_asset: LEGACY_ASSET,
    allowed: ALLOWED_ASSETS.slice(),
    status,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    note: note || (ready
      ? "Counted Softwares zip. Prefer GET /download (HTTP 200, streamed). /v1/download is the catalog descriptor. Author Aziel Eliab."
      : "Softwares zip is not hosted on this Worker right now. Catalog download_url stays "
        + LIBRARY_DOWNLOAD
        + ". Use GitHub until the asset returns. Author Aziel Eliab."),
  };
}

export function safeAssetName(raw) {
  const name = String(raw || "").split("/").pop().split("\\").pop();
  if (ALLOWED_ASSETS.includes(name)) return name;
  return "";
}

export function contentTypeFor(asset) {
  const a = String(asset || "").toLowerCase();
  if (a.endsWith(".zip")) return "application/zip";
  if (a.endsWith(".tar.gz") || a.endsWith(".tgz") || a.endsWith(".gz")) return "application/gzip";
  return "application/octet-stream";
}

function withTimeout(promise, ms) {
  const limit = Number(ms) || 0;
  if (limit <= 0) return promise;
  let timer;
  return Promise.race([
    Promise.resolve(promise).finally(() => { if (timer) clearTimeout(timer); }),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("asset-timeout")), limit);
    }),
  ]);
}

export async function fetchHostedAsset(request, env, name, { timeoutMs = ASSET_FETCH_TIMEOUT_MS } = {}) {
  if (!env || !env.ASSETS || typeof env.ASSETS.fetch !== "function") {
    return { ok: false, status: 503, reason: "assets-binding-missing" };
  }
  const want = safeAssetName(name) || DEFAULT_ASSET;
  const order = want === DEFAULT_ASSET ? [DEFAULT_ASSET, LEGACY_ASSET] : [want, DEFAULT_ASSET, LEGACY_ASSET];
  const seen = new Set();
  for (const asset of order) {
    if (seen.has(asset)) continue;
    seen.add(asset);
    try {
      const assetUrl = new URL("/" + asset, request.url);
      const res = await withTimeout(
        env.ASSETS.fetch(new Request(assetUrl.toString(), {
          method: "GET",
          headers: { "User-Agent": UA, Accept: "application/zip, application/octet-stream" },
        })),
        timeoutMs
      );
      if (res && res.ok) return { ok: true, asset, response: res, status: res.status };
      if (res) {
        try {
          if (res.body && typeof res.body.cancel === "function") await res.body.cancel();
        } catch { /* ignore */ }
      }
    } catch {
      return { ok: false, status: 504, reason: "asset-timeout", asset };
    }
  }
  return { ok: false, status: 404, reason: "asset-not-hosted", asset: want };
}

function unavailableResponse(request, extra) {
  const doc = softwareDownloadDoc(Object.assign({ available: false }, extra));
  if (request.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
        "X-Aziel-Download": "unavailable",
        ...corsHeaders(),
      },
    });
  }
  return json(doc, 200, { "X-Aziel-Download": "unavailable" });
}

export async function serveSoftwareAsset(request, env, asset, { head = false, onCounted } = {}) {
  const hit = await fetchHostedAsset(request, env, asset);
  if (!hit.ok) {
    return unavailableResponse(request, {
      asset: safeAssetName(asset) || DEFAULT_ASSET,
      status: hit.status,
      note: hit.reason === "asset-timeout"
        ? "Softwares zip timed out on this Worker. Honest 200 — asset not streamed. Try again or use GitHub. Author Aziel Eliab."
        : undefined,
    });
  }
  if (typeof onCounted === "function") {
    try { await onCounted(hit.asset); } catch { /* counter optional */ }
  }
  const headers = new Headers();
  headers.set("Content-Type", contentTypeFor(hit.asset));
  headers.set("Content-Disposition", 'attachment; filename="' + hit.asset.replaceAll('"', "") + '"');
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Aziel-Download", "stream");
  headers.set("X-Aziel-Asset", hit.asset);
  const len = hit.response.headers.get("Content-Length");
  if (len) headers.set("Content-Length", len);
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  if (head || request.method === "HEAD") {
    try {
      if (hit.response.body && typeof hit.response.body.cancel === "function") await hit.response.body.cancel();
    } catch { /* ignore */ }
    return new Response(null, { status: 200, headers });
  }
  return new Response(hit.response.body, { status: 200, headers });
}

export function handleV1Download(request, url) {
  const method = request.method;
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  if (method !== "GET" && method !== "HEAD") {
    return json({ error: "GET only", author: "Aziel Eliab" }, 405);
  }
  const wantZip = url.searchParams.get("raw") === "1"
    || /application\/(zip|octet-stream)/i.test(request.headers.get("Accept") || "");
  if (wantZip) return null;
  const doc = softwareDownloadDoc({ available: true, asset: DEFAULT_ASSET });
  if (method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=3600",
        ...corsHeaders(),
      },
    });
  }
  return json(doc);
}
