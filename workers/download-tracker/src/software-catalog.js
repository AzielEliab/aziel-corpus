/**
 * /software hub: live aziel-runtime catalog + door extras.
 * Per request: GET /v1/software, fallback GET /v1/fraggate/list
 * (then catalog.json only to enrich Worker/download metadata).
 * Prefer AZIEL_RUNTIME service binding. No fixed product cap.
 * Author: Aziel Eliab only.
 */
import {
  RUNTIME_ORIGIN,
  RUNTIME_VERSION,
  LIBRARY_DOWNLOAD,
  softwareChip,
  softwareHubBlurb,
  resolveRuntimeVersion,
  runtimeDistributionLinks,
} from "./runtime-copy.js";
import { runtimeUsesPayload } from "./runtime-uses.js";
import {
  AZCOHERENCE_SOFTWARE_EXTRA,
  AZCOHERENCE_SLUG,
  AZCOHERENCE_COUNT,
} from "./azcoherence.js";
import {
  SOFTWARE_CATALOG_CACHE_URL,
  SEO_CACHE_CONTROL,
  cacheMatchJson,
  cachePutJson,
} from "./library-index.js";

const UA = "Mozilla/5.0 AzielDigitalLibrary";

/** Separate FragGate app (not nested AZBrowser UI). Author: Aziel Eliab only. */
export const FRAGGATE_WORKER_HOME = "https://fraggate-download-tracker.vibelock.workers.dev/";
export const FRAGGATE_DOWNLOAD = FRAGGATE_WORKER_HOME + "download";
export const FRAGGATE_COUNT = FRAGGATE_WORKER_HOME + "count";

/** Separate AZNet app (not nested AZBrowser UI). Listed until runtime catalogs it. Author: Aziel Eliab only. */
export const AZNET_WORKER_HOME = "https://aznet-download-tracker.vibelock.workers.dev/";
export const AZNET_DOWNLOAD = AZNET_WORKER_HOME + "download";
export const AZNET_COUNT = AZNET_WORKER_HOME + "count";

export const SOFTWARE_EXTRAS = [
  {
    slug: "aznet",
    name: "AZNet",
    version: "0.1.0",
    github: "https://github.com/AzielEliab/aznet",
    download: AZNET_DOWNLOAD,
    worker: "aznet-download-tracker",
    worker_home: AZNET_WORKER_HOME,
    count: AZNET_COUNT,
    one_line: "AZNet (AZN-WP-0.1): silent verification side-net. Hash continuity without hosting. Separate software; functional-order pair with AZBrowser.",
  },
  {
    slug: "fraggate",
    name: "FragGate",
    version: "FG-0.1",
    door: true,
    github: "https://github.com/AzielEliab/fraggate",
    download: FRAGGATE_DOWNLOAD,
    worker: "fraggate-download-tracker",
    worker_home: FRAGGATE_WORKER_HOME,
    count: FRAGGATE_COUNT,
    one_line: "One door — discover, route, refuse. Separate FragGate app — not nested AZBrowser UI. Hashed registry kernel over the Aziel Eliab catalog.",
  },
  {
    slug: "embryolock",
    name: "EmbryoLock",
    version: "",
    catalog_only: true,
    github: "https://github.com/AzielEliab/embryolock",
    one_line: "Catalog-only door. Listed here even before a live engine Worker is published. Author Aziel Eliab.",
  },
  Object.assign({}, AZCOHERENCE_SOFTWARE_EXTRA),
];

function firstText(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim()) return v;
  }
  return "";
}

const KNOWN_NAMES = {
  ark: "The ARK",
  azai: "AZAI",
  azbot: "AZBot",
  azclce: "AZ-CLCE",
  azcoherence: "AZCoherence",
  "aziel-corpus": "Aziel Digital Library",
  azieltether: "AzielTether",
  azmail: "AZMail",
  aznet: "AZNet",
  azbrowser: "AZBrowser",
  azos: "AZ-OS",
  decisiongate: "DecisionGATE",
  embryolock: "EmbryoLock",
  forgereceipts: "ForgeReceipts",
  fraggate: "FragGate",
  glossafilter: "Glossa Filter",
  mialock: "M.I.A.Lock",
  miragegrid: "MirageGrid",
  peacelock: "PeaceLock",
  postking: "Post-King Chess",
  zsolver: "ZionPattern Solver",
};

const KIND_RANK = { plain: 0, gate: 1, lock: 2 };

/** Kernel / suite rollup — never Softwares-tab products[]. extras[] only. */
export const KERNEL_EXTRA_SLUGS = new Set(["fraggate", "mesh"]);

export function isKernelExtraSlug(slug) {
  return KERNEL_EXTRA_SLUGS.has(String(slug || "").toLowerCase());
}

export function softwareKind(product) {
  const slug = String((product && (product.slug || product.name)) || "").toLowerCase();
  const name = String((product && product.name) || "").toLowerCase();
  const raw = slug + " " + name;
  if (raw.includes("gate")) return "gate";
  const stripped = raw.replace(/clock/g, "");
  if (stripped.includes("lock")) return "lock";
  return "plain";
}

export function compareSoftware(a, b) {
  const ka = softwareKind(a);
  const kb = softwareKind(b);
  if (KIND_RANK[ka] !== KIND_RANK[kb]) return KIND_RANK[ka] - KIND_RANK[kb];
  return String((a && (a.name || a.slug)) || "").localeCompare(String((b && (b.name || b.slug)) || ""), "en", { sensitivity: "base" });
}

export function displayName(product) {
  if (product && product.name) return product.name;
  const slug = String((product && product.slug) || "").toLowerCase();
  if (KNOWN_NAMES[slug]) return KNOWN_NAMES[slug];
  if (!slug) return "";
  return slug
    .replace(/(lock|gate|clock)$/i, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
    .replace(/(^|-)([a-z])/g, (_, _d, c) => c.toUpperCase());
}

export function collectCatalogProducts(catalog) {
  const bySlug = new Map();
  function add(raw) {
    if (!raw) return;
    const slug = String(raw.slug || "").toLowerCase();
    if (!slug) return;
    const prev = bySlug.get(slug) || {};
    bySlug.set(slug, mapSoftwareProduct(Object.assign({}, prev, raw, { slug })));
  }
  const products = catalog && Array.isArray(catalog.products) ? catalog.products : [];
  for (const p of products) add(p);
  const engines = catalog && catalog.engines && typeof catalog.engines === "object" ? catalog.engines : {};
  for (const [slug, eng] of Object.entries(engines)) {
    const prev = bySlug.get(String(slug).toLowerCase()) || {};
    const rec = eng && typeof eng === "object" ? eng : {};
    add({
      slug,
      name: prev.name || rec.name || "",
      one_line: prev.one_line || rec.description || rec.source || "",
      banner: prev.banner || rec.banner || "",
      github: prev.github || rec.github || "",
      download: prev.download || rec.download || "",
      worker: prev.worker || rec.worker || "",
      count: prev.count || rec.count || "",
      version: prev.version || rec.version || "",
    });
  }
  const slugLists = []
    .concat((catalog && catalog.engine_slugs) || [])
    .concat((catalog && catalog.true_engine_slugs) || []);
  for (const slug of slugLists) {
    if (slug == null) continue;
    add({ slug: String(slug) });
  }
  return [...bySlug.values()].filter((p) => !isKernelExtraSlug(p.slug));
}

function addExtraItem(bySlug, raw, extraBits) {
  if (raw == null) return;
  if (typeof raw === "string") {
    const slug = raw.toLowerCase();
    if (!slug) return;
    const prev = bySlug.get(slug) || { slug, extra: true };
    bySlug.set(slug, Object.assign({}, prev, extraBits || {}, { slug, extra: true }));
    return;
  }
  if (typeof raw !== "object") return;
  const slug = String(raw.slug || raw.name || "").toLowerCase();
  if (!slug) return;
  const prev = bySlug.get(slug) || {};
  bySlug.set(slug, Object.assign({}, prev, raw, extraBits || {}, { slug, extra: true }));
}

/** extras[] + top-level fraggate/mesh. Never fold these into Softwares-tab products[]. */
export function collectCatalogExtras(catalog) {
  const bySlug = new Map();
  const extras = catalog && (catalog.extras || catalog.doors || catalog.catalog_only);
  if (Array.isArray(extras)) {
    for (const item of extras) addExtraItem(bySlug, item);
  }
  if (catalog && catalog.fraggate != null) {
    if (typeof catalog.fraggate === "string") {
      addExtraItem(bySlug, {
        slug: "fraggate",
        name: "FragGate",
        kind: "kernel",
        status: null,
        path: catalog.fraggate,
      });
    } else {
      addExtraItem(bySlug, Object.assign({ slug: "fraggate", name: "FragGate", kind: "kernel" }, catalog.fraggate));
    }
  }
  if (catalog && catalog.mesh != null) {
    if (typeof catalog.mesh === "string") {
      addExtraItem(bySlug, {
        slug: "mesh",
        name: "Quantum Node Mesh",
        kind: "kernel",
        status: catalog.mesh,
      });
    } else {
      addExtraItem(bySlug, Object.assign({ slug: "mesh", name: "Quantum Node Mesh", kind: "kernel" }, catalog.mesh));
    }
  }
  return [...bySlug.values()];
}

export function mapSoftwareProduct(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const slug = String(raw.slug || "").toLowerCase();
  const download = firstText(raw.download, raw.download_url);
  let downloadUrl = firstText(raw.download_url, raw.download);
  if (slug === "aziel-corpus") {
    downloadUrl = firstText(raw.download_url, raw.download, LIBRARY_DOWNLOAD);
  }
  return Object.assign({}, raw, {
    slug,
    download: slug === "aziel-corpus" ? firstText(download, LIBRARY_DOWNLOAD) : download,
    download_url: downloadUrl,
  });
}

/** Softwares-tab products[] plus kernel extras[] only. */
export function softwareTabCatalog(catalog) {
  const norm = normalizeSoftwareDoc(catalog);
  const products = collectCatalogProducts(norm).map(mapSoftwareProduct);
  const extras = collectCatalogExtras(norm);
  return {
    version: firstText(norm.version, catalog && catalog.version),
    products,
    extras,
    software: products,
    engines: norm.engines,
    engine_slugs: norm.engine_slugs,
    true_engine_slugs: norm.true_engine_slugs,
    live_count: Number(norm.live_count || products.length) || products.length,
    framing: norm.framing || "",
    sort_law: norm.sort_law || "",
  };
}

export function mergeSoftwareExtras(products) {
  const list = Array.isArray(products) ? products.slice() : [];
  const index = new Map();
  list.forEach((p, i) => index.set(String(p.slug || "").toLowerCase(), i));
  for (const door of SOFTWARE_EXTRAS) {
    const i = index.get(door.slug);
    if (i == null) {
      list.push(Object.assign({ extra: true }, door, { one_line: hubSoftwareCopy(door.one_line) }));
      index.set(door.slug, list.length - 1);
      continue;
    }
    const prev = list[i] || {};
    list[i] = Object.assign({}, door, prev, {
      extra: true,
      door: prev.door || door.door,
      github: firstText(prev.github, door.github),
      download: firstText(prev.download, door.download),
      worker: firstText(prev.worker, door.worker),
      worker_home: firstText(prev.worker_home, door.worker_home),
      count: firstText(prev.count, door.count),
      one_line: hubSoftwareCopy(aznetBrowserCatalogLine(door.slug, prev, door)),
      name: prev.name || door.name,
      version: prev.version || door.version,
    });
  }
  return list;
}

/** Hub cards say "separate software" + the same FragGate door. Never nest products. */
export function hubSoftwareCopy(text) {
  return String(text || "")
    .replace(/\ba separate engine\b/gi, "separate software")
    .replace(/\bseparate engine\b/gi, (m) => (m[0] === "S" ? "Separate software" : "separate software"));
}

function aznetBrowserCatalogLine(slug, prev, door) {
  const want = String(slug || "").toLowerCase();
  if (want === "aznet" || want === "azbrowser") {
    return firstText(prev && prev.one_line, prev && prev.banner, door && door.one_line);
  }
  return firstText(door && door.one_line, prev && prev.one_line, prev && prev.banner);
}

function extraWorkerHome(product) {
  const slug = String((product && product.slug) || "").toLowerCase();
  if (!(slug === "fraggate" || slug === "aznet" || slug === "azhub" || slug === "azinterface" || slug === AZCOHERENCE_SLUG || (product && product.extra))) {
    return "";
  }
  const listed = firstText(product && product.worker_home);
  if (listed) return listed.endsWith("/") ? listed : listed + "/";
  const download = firstText(product && product.download);
  if (download) {
    try {
      const u = new URL(download);
      if (/\.workers\.dev$/i.test(u.hostname)) return u.origin + "/";
    } catch {
      /* ignore */
    }
  }
  const worker = firstText(product && product.worker);
  if (/^https?:\/\//i.test(worker)) {
    try {
      return new URL(worker).origin + "/";
    } catch {
      /* ignore */
    }
  }
  if (/^[a-z0-9-]+$/i.test(worker)) return "https://" + worker + ".vibelock.workers.dev/";
  return "";
}

export function productLinks(product) {
  const slug = String((product && product.slug) || "").toLowerCase();
  const links = [];
  const workerSet = Boolean(product && (product.worker || product.download));
  const extraHome = extraWorkerHome(product);
  if (workerSet && product.download) {
    links.push({ href: product.download, label: "Download", primary: true });
  } else if (extraHome) {
    links.push({ href: extraHome, label: "Worker", primary: true });
  }
  if (extraHome && !links.some((l) => l.href === extraHome)) {
    links.push({ href: extraHome, label: "Worker" });
  }
  if (product && product.github) links.push({ href: product.github, label: "GitHub" });
  links.push({ href: "/runtime", label: "Runtime" });
  links.push({ href: "/runtime/v1/fraggate/list", label: "fraggate/list" });
  links.push({ href: "/runtime/mcp", label: "MCP" });
  if (slug === "fraggate") {
    links.push({ href: "/runtime/v1/fraggate", label: "Call fraggate" });
  } else if (slug) {
    links.push({ href: "/runtime/v1/fraggate/describe?slug=" + encodeURIComponent(slug), label: "Call " + slug });
  }
  if (slug === "azieltether") links.push({ href: "/v1/lattice", label: "Lattice API" });
  return links;
}

export function parseCountPayload(j) {
  if (!j || typeof j !== "object") return { downloads: null, views: null, uploads: null };
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    downloads: num(j.downloads != null ? j.downloads : j.total != null ? j.total : j.count),
    views: num(j.views != null ? j.views : j.view_count),
    uploads: num(j.uploads != null ? j.uploads : j.upload_count),
  };
}

export function pathMentionsSlug(path, slug) {
  const parts = String(path || "").split("?")[0].split("/").filter(Boolean);
  return parts.includes(String(slug || "").toLowerCase());
}

export function usesForSlug(usesDoc, slug) {
  if (!usesDoc || !slug) return null;
  const want = String(slug).toLowerCase();
  let n = 0;
  let hit = false;
  const paths = usesDoc.by_path || {};
  for (const [path, c] of Object.entries(paths)) {
    if (pathMentionsSlug(path, want)) {
      hit = true;
      n += Number(c) || 0;
    }
  }
  if (hit) return n;
  const ops = usesDoc.by_op || {};
  for (const [op, c] of Object.entries(ops)) {
    if (op === want || String(op).startsWith(want + ".")) {
      hit = true;
      n += Number(c) || 0;
    }
  }
  if (hit) return n;
  if (usesDoc.origin) return usesForSlug(usesDoc.origin, slug);
  return null;
}

export function countUrlForProduct(product) {
  const slug = String((product && product.slug) || "").toLowerCase();
  const listed = firstText(product && product.count);
  if (slug === "fraggate") return firstText(listed, FRAGGATE_COUNT);
  if (slug === "aznet") return firstText(listed, AZNET_COUNT);
  if (slug === AZCOHERENCE_SLUG) return firstText(listed, AZCOHERENCE_COUNT);
  return listed;
}

export function countPills({ downloads, views, uploads, uses } = {}) {
  const pills = [];
  if (downloads != null) pills.push(String(downloads) + " downloads");
  if (views != null) pills.push(String(views) + " views");
  if (uploads != null) pills.push(String(uploads) + " uploads");
  if (uses != null) pills.push(String(uses) + " uses");
  return pills;
}

export const SOFTWARE_LIVE_PATH = "/v1/software";
export const FRAGGATE_LIST_PATH = "/v1/fraggate/list";
export const CATALOG_JSON_PATH = "/v1/catalog.json";
export const SOFTWARE_CRAWL_TIMEOUT_MS = 4000;
/** Softwares HTML: fail fast. Packed catalog cache is the SSR source of truth. */
export const SOFTWARE_HTML_TIMEOUT_MS = 800;

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

async function readCachedSoftwareCatalog() {
  try {
    const hit = await cacheMatchJson(SOFTWARE_CATALOG_CACHE_URL);
    if (hit && catalogHasProducts(hit.catalog || hit)) {
      return hit.catalog ? hit : { catalog: hit, source: "cache" };
    }
  } catch {
    /* node tests / empty cache */
  }
  return null;
}

async function writeCachedSoftwareCatalog(live) {
  if (!live || !catalogHasProducts(live.catalog)) return;
  try {
    await cachePutJson(SOFTWARE_CATALOG_CACHE_URL, live, undefined, { cacheControl: SEO_CACHE_CONTROL });
  } catch {
    /* cache is optional */
  }
}

export async function runtimeGet(env, destPath) {
  const dest = new URL(destPath, RUNTIME_ORIGIN + "/");
  const headers = { "User-Agent": UA, Accept: "application/json" };
  if (env && env.AZIEL_RUNTIME && typeof env.AZIEL_RUNTIME.fetch === "function") {
    try {
      const res = await env.AZIEL_RUNTIME.fetch(new Request(dest.toString(), { method: "GET", headers }));
      if (res) return res;
    } catch {
      /* fall through to origin */
    }
  }
  return fetch(dest.toString(), { method: "GET", headers });
}

export async function fetchRuntimeJson(env, destPath) {
  try {
    const res = await runtimeGet(env, destPath);
    if (!res || !res.ok) return null;
    const doc = await res.json();
    if (!doc || typeof doc !== "object" || doc.error) return null;
    return doc;
  } catch {
    return null;
  }
}

/** Cite live health/catalog.version; bake 2.0.0-rc1 when origin is quiet. */
export async function fetchLiveRuntimeVersion(env, opts = {}) {
  const timeoutMs = opts.timeoutMs != null ? Number(opts.timeoutMs) : 800;
  const run = async () => {
    for (const dest of ["/v1/health", "/v1/runtime.json", "/v1/software"]) {
      const doc = await fetchRuntimeJson(env, dest);
      const ver = firstText(doc && doc.version);
      if (ver) return ver;
    }
    return "";
  };
  const live = await withTimeout(run(), timeoutMs);
  return resolveRuntimeVersion(live);
}

/** Normalize /v1/software, fraggate/list, or catalog.json into a products catalog. */
export function normalizeSoftwareDoc(doc) {
  if (!doc || typeof doc !== "object") return { products: [], extras: [] };
  let products = [];
  if (Array.isArray(doc.software) && doc.software.length) {
    products = doc.software.map(mapSoftwareProduct);
  } else if (Array.isArray(doc.products) && doc.products.length) {
    products = doc.products.map(mapSoftwareProduct);
  } else if (Array.isArray(doc.entries)) {
    products = doc.entries.map((e) => mapSoftwareProduct({
      slug: e && e.slug,
      name: e && e.name,
      one_line: firstText(e && e.one_line, e && e.description, e && e.banner),
      version: (e && e.version) || "",
      github: (e && e.github) || "",
      download: firstText(e && e.download, e && e.download_url),
      download_url: firstText(e && e.download_url, e && e.download),
      worker: (e && e.worker) || "",
      worker_home: (e && e.worker_home) || "",
      count: (e && e.count) || "",
      catalog_only: Boolean((e && e.local_not_hosted) || (e && e.status === "stub") || (e && e.catalog_only)),
      status: (e && e.status) || "",
    }));
  }
  products = products.filter((p) => p && p.slug && !isKernelExtraSlug(p.slug));
  const extras = collectCatalogExtras(doc);
  return Object.assign({}, doc, {
    products,
    extras,
    version: firstText(doc.version, doc.catalog_version),
  });
}

export function catalogHasProducts(doc) {
  return collectCatalogProducts(normalizeSoftwareDoc(doc)).length > 0;
}

function mergeCatalogDocs(primary, enrich) {
  const aDoc = normalizeSoftwareDoc(primary);
  const bDoc = normalizeSoftwareDoc(enrich);
  const a = collectCatalogProducts(aDoc);
  const b = collectCatalogProducts(bDoc);
  const bySlug = new Map();
  for (const p of a) bySlug.set(String(p.slug || "").toLowerCase(), p);
  for (const p of b) {
    const slug = String(p.slug || "").toLowerCase();
    if (!slug || isKernelExtraSlug(slug)) continue;
    const prev = bySlug.get(slug) || {};
    bySlug.set(slug, mapSoftwareProduct(Object.assign({}, prev, p, {
      slug,
      name: firstText(prev.name, p.name),
      one_line: firstText(prev.one_line, p.one_line, prev.banner, p.banner),
      github: firstText(prev.github, p.github),
      download: firstText(prev.download, prev.download_url, p.download, p.download_url),
      download_url: firstText(prev.download_url, p.download_url, prev.download, p.download),
      worker: firstText(prev.worker, p.worker),
      worker_home: firstText(prev.worker_home, p.worker_home),
      count: firstText(prev.count, p.count),
      version: firstText(prev.version, p.version),
    })));
  }
  const extraBy = new Map();
  for (const item of [].concat(aDoc.extras || [], bDoc.extras || [])) {
    addExtraItem(extraBy, item);
  }
  return {
    version: firstText(aDoc.version, bDoc.version),
    products: [...bySlug.values()].filter((p) => !isKernelExtraSlug(p.slug)),
    extras: [...extraBy.values()],
    engines: Object.assign({}, (enrich && enrich.engines) || {}, (primary && primary.engines) || {}),
    engine_slugs: [].concat((primary && primary.engine_slugs) || [], (enrich && enrich.engine_slugs) || []),
    true_engine_slugs: [].concat((primary && primary.true_engine_slugs) || [], (enrich && enrich.true_engine_slugs) || []),
    framing: firstText(aDoc.framing, bDoc.framing),
    sort_law: firstText(aDoc.sort_law, bDoc.sort_law),
    live_count: aDoc.live_count || bDoc.live_count || bySlug.size,
  };
}

/** Live catalog: /v1/software first, then fraggate/list. catalog.json only enriches metadata. */
export async function fetchLiveSoftwareCatalog(env, opts = {}) {
  const skipEnrich = Boolean(opts.skipEnrich);
  const timeoutMs = Number(opts.timeoutMs) || 0;
  if (opts.preferCache) {
    const cached = await readCachedSoftwareCatalog();
    if (cached) return cached;
  }

  const run = async () => {
    const software = await fetchRuntimeJson(env, SOFTWARE_LIVE_PATH);
    if (catalogHasProducts(software)) {
      if (skipEnrich) return { catalog: normalizeSoftwareDoc(software), source: "software" };
      const enrich = await fetchRuntimeJson(env, CATALOG_JSON_PATH);
      const catalog = catalogHasProducts(enrich)
        ? mergeCatalogDocs(normalizeSoftwareDoc(software), enrich)
        : normalizeSoftwareDoc(software);
      return { catalog, source: "software" };
    }
    const list = await fetchRuntimeJson(env, FRAGGATE_LIST_PATH);
    if (catalogHasProducts(list)) {
      if (skipEnrich) return { catalog: normalizeSoftwareDoc(list), source: "fraggate/list" };
      const enrich = await fetchRuntimeJson(env, CATALOG_JSON_PATH);
      const catalog = catalogHasProducts(enrich)
        ? mergeCatalogDocs(normalizeSoftwareDoc(list), enrich)
        : normalizeSoftwareDoc(list);
      return { catalog, source: "fraggate/list" };
    }
    const fallback = await fetchRuntimeJson(env, CATALOG_JSON_PATH);
    if (catalogHasProducts(fallback)) {
      return { catalog: normalizeSoftwareDoc(fallback), source: "catalog.json" };
    }
    return { catalog: { products: [] }, source: "empty" };
  };

  const live = await withTimeout(run(), timeoutMs);
  if (live && catalogHasProducts(live.catalog)) {
    await writeCachedSoftwareCatalog(live);
    return live;
  }
  const stale = await readCachedSoftwareCatalog();
  if (stale) return Object.assign({}, stale, { source: String(stale.source || "cache") + "+stale" });
  return live || { catalog: { products: [] }, source: "empty" };
}

async function fetchCountDoc(url) {
  if (!url) return { downloads: null, views: null, uploads: null };
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) return { downloads: null, views: null, uploads: null };
    return parseCountPayload(await res.json());
  } catch {
    return { downloads: null, views: null, uploads: null };
  }
}

function toCard(product, { pills, countHint } = {}) {
  const slug = String((product && product.slug) || "").toLowerCase();
  const kind = softwareKind(product);
  return {
    slug,
    name: displayName(product),
    version: (product && product.version) || "",
    kind,
    door: Boolean(product && product.door),
    catalog_only: Boolean(product && product.catalog_only),
    extra: Boolean(product && product.extra),
    pills: pills || [],
    countLabel: countHint || "",
    blurb: hubSoftwareCopy((product && (product.one_line || product.banner)) || ""),
    links: productLinks(product),
  };
}

export async function loadSoftwareCatalog(env, stats, opts = {}) {
  const light = Boolean(opts.light);
  const live = await fetchLiveSoftwareCatalog(env, {
    skipEnrich: light || Boolean(opts.skipEnrich),
    preferCache: light || Boolean(opts.preferCache),
    timeoutMs: opts.timeoutMs != null ? opts.timeoutMs : (light ? SOFTWARE_HTML_TIMEOUT_MS : 0),
  });
  const catalog = live.catalog || {};

  const collected = collectCatalogProducts(catalog);
  const merged = mergeSoftwareExtras(collected);
  let usesDoc = null;
  if (!light) {
    try {
      usesDoc = env ? await runtimeUsesPayload(env) : null;
    } catch {
      usesDoc = null;
    }
  }

  const counts = light
    ? merged.map(() => ({ downloads: null, views: null, uploads: null }))
    : await Promise.all(merged.map((p) => fetchCountDoc(countUrlForProduct(p))));
  let fetched = 0;
  const cards = merged.map((p, i) => {
    const slug = String(p.slug || "").toLowerCase();
    const count = counts[i] || { downloads: null, views: null, uploads: null };
    let downloads = count.downloads;
    let views = count.views;
    let uploads = count.uploads;
    if (slug === "aziel-corpus" && stats) {
      if (views == null && stats.views != null) views = Number(stats.views);
      if (downloads == null && stats.downloads != null) downloads = Number(stats.downloads);
    }
    if (downloads != null || views != null || uploads != null) fetched += 1;
    const uses = usesForSlug(usesDoc, slug);
    const pills = countPills({ downloads, views, uploads, uses });
    const countHint = pills.length ? "" : (p.count ? "downloads live on Worker" : "");
    return toCard(p, { pills, countHint });
  }).sort(compareSoftware);

  const originUses = usesDoc && usesDoc.origin && usesDoc.origin.uses != null ? Number(usesDoc.origin.uses) : null;
  const localUses = usesDoc && usesDoc.uses != null ? Number(usesDoc.uses) : null;
  const hubPills = countPills({
    downloads: counts.map((c) => c && c.downloads).filter((n) => n != null).reduce((a, b) => a + b, 0) || null,
    uses: localUses,
  });
  if (originUses != null && Number.isFinite(originUses)) {
    hubPills.push(String(originUses) + " origin uses");
  }

  const catalogVersion = (catalog && catalog.version) || RUNTIME_VERSION;
  const hub = {
    name: "aziel-runtime",
    version: catalogVersion,
    root: true,
    kind: "plain",
    pills: hubPills,
    blurb: softwareHubBlurb(catalogVersion),
    links: [
      { href: "/runtime", label: softwareChip(), primary: true },
      { href: "/runtime/v1/fraggate/list", label: "fraggate/list" },
      { href: "/runtime/mcp", label: "MCP" },
      { href: "/runtime/v1/uses", label: "uses" },
      { href: "/runtime/v1/software", label: "/v1/software" },
      { href: "/runtime/v1/catalog.json", label: "catalog.json" },
      { href: "/runtime/openapi.json", label: "OpenAPI" },
      ...runtimeDistributionLinks().map((l) => Object.assign({}, l, { primary: false })),
    ],
  };

  return {
    hub,
    products: cards,
    fetched,
    downloadable: collected.length,
    extras: cards.filter((c) => c.extra).length,
    catalogVersion,
    source: live.source,
    usesTotal: localUses,
    originUses: originUses != null && Number.isFinite(originUses) ? originUses : null,
    siteViews: stats && stats.views != null ? Number(stats.views) : null,
    siteDownloads: stats && stats.downloads != null ? Number(stats.downloads) : null,
  };
}
