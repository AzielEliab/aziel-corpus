/**
 * Library installer update check. Prefers live runtime /v1/update/check.
 * Author: Aziel Eliab only.
 */
import { RUNTIME_ORIGIN } from "./runtime-copy.js";
import { fetchRuntimeJson, CATALOG_JSON_PATH, SOFTWARE_LIVE_PATH } from "./software-catalog.js";

export const LIBRARY_SLUG = "aziel-corpus";
export const LIBRARY_VERSION = "2.7.0";
export const LIBRARY_NAME = "Aziel Digital Library";
export const LIBRARY_DOWNLOAD = "https://www.azielcorpuslibrary.net/download";
export const LIBRARY_INSTALL = "https://www.azielcorpuslibrary.net/install.sh";
export const RUNTIME_UPDATE_PATH = "/v1/update/check";

function firstText(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

export function parseVersionParts(raw) {
  return String(raw || "")
    .replace(/^[vV]/, "")
    .split(/[.+-]/)
    .map((part) => {
      const n = parseInt(part, 10);
      return Number.isFinite(n) ? n : 0;
    });
}

export function compareVersions(a, b) {
  const pa = parseVersionParts(a);
  const pb = parseVersionParts(b);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

function productFromCatalog(catalog, slug) {
  const want = String(slug || "").toLowerCase();
  const products = catalog && Array.isArray(catalog.products) ? catalog.products : [];
  return products.find((p) => String((p && p.slug) || "").toLowerCase() === want) || null;
}

export function updatePayload({
  slug = LIBRARY_SLUG,
  current = LIBRARY_VERSION,
  latest = "",
  source = "local",
  download = LIBRARY_DOWNLOAD,
  install = LIBRARY_INSTALL,
  name = LIBRARY_NAME,
} = {}) {
  const have = firstText(current, LIBRARY_VERSION);
  const want = firstText(latest, have);
  return {
    ok: true,
    slug,
    name,
    current: have,
    latest: want,
    update_available: Boolean(want) && compareVersions(want, have) > 0,
    source,
    download: firstText(download, LIBRARY_DOWNLOAD),
    install: firstText(install, LIBRARY_INSTALL),
    runtime: RUNTIME_ORIGIN + RUNTIME_UPDATE_PATH,
    author: "Aziel Eliab",
  };
}

function fromRuntimeUpdate(doc, slug, current) {
  if (!doc || typeof doc !== "object" || doc.error) return null;
  const latest = firstText(doc.latest, doc.version, doc.package, doc.current);
  if (!latest && doc.update_available == null) return null;
  return updatePayload({
    slug,
    current,
    latest: latest || current,
    source: firstText(doc.source, "runtime:/v1/update/check"),
    download: firstText(doc.download, doc.url),
    install: firstText(doc.install, doc.install_sh),
    name: firstText(doc.name, LIBRARY_NAME),
  });
}

export async function checkLibraryUpdate(env, { slug, version } = {}) {
  const wantSlug = firstText(slug, LIBRARY_SLUG);
  const current = firstText(version, LIBRARY_VERSION);

  const live = await fetchRuntimeJson(env, RUNTIME_UPDATE_PATH + "?slug=" + encodeURIComponent(wantSlug) + "&version=" + encodeURIComponent(current));
  const fromLive = fromRuntimeUpdate(live, wantSlug, current);
  if (fromLive) return fromLive;

  const software = await fetchRuntimeJson(env, SOFTWARE_LIVE_PATH);
  const catalog = software && Array.isArray(software.products)
    ? software
    : await fetchRuntimeJson(env, CATALOG_JSON_PATH);
  const product = productFromCatalog(catalog, wantSlug);
  if (product) {
    return updatePayload({
      slug: wantSlug,
      current,
      latest: firstText(product.version, product.package, current),
      source: software && Array.isArray(software.products) ? "runtime:/v1/software" : "runtime:/v1/catalog.json",
      download: firstText(product.download, LIBRARY_DOWNLOAD),
      install: firstText(product.install, LIBRARY_INSTALL),
      name: firstText(product.name, LIBRARY_NAME),
    });
  }

  return updatePayload({ slug: wantSlug, current, latest: current, source: "local" });
}
