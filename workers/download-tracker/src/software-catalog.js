/**
 * /software hub: live aziel-runtime catalog + door extras.
 * Mirrors GET /v1/catalog.json (prefer AZIEL_RUNTIME). No fixed product cap.
 * Author: Aziel Eliab only.
 */
import {
  RUNTIME_ORIGIN,
  RUNTIME_VERSION,
  RUNTIME_GITHUB,
  runtimeChip,
  runtimeNote,
} from "./runtime-copy.js";
import { runtimeUsesPayload } from "./runtime-uses.js";

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
    one_line: "AZNet (AZN-WP-0.1): silent verification side-net. Hashes only. Separate app from AZBrowser and FragGate — pairing is order/token only, not a shared Phase-1 UI. AZNet + AZBrowser required. FragGate unlocks access. StaticClock stamps time. Author Aziel Eliab.",
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
    bySlug.set(slug, Object.assign({}, prev, raw, { slug }));
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
  const extras = catalog && (catalog.extras || catalog.doors || catalog.catalog_only);
  if (Array.isArray(extras)) {
    for (const item of extras) {
      if (typeof item === "string") add({ slug: item, extra: true });
      else if (item && typeof item === "object") add(Object.assign({}, item, { extra: true }));
    }
  }
  return [...bySlug.values()];
}

export function mergeSoftwareExtras(products) {
  const list = Array.isArray(products) ? products.slice() : [];
  const index = new Map();
  list.forEach((p, i) => index.set(String(p.slug || "").toLowerCase(), i));
  for (const door of SOFTWARE_EXTRAS) {
    const i = index.get(door.slug);
    if (i == null) {
      list.push(Object.assign({ extra: true }, door));
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
      one_line: door.one_line || prev.one_line || prev.banner || "",
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
    .replace(/\bseparate engine\b/gi, "separate software");
}

function extraWorkerHome(product) {
  const slug = String((product && product.slug) || "").toLowerCase();
  if (!(slug === "fraggate" || slug === "aznet" || slug === "azhub" || slug === "azinterface" || (product && product.extra))) {
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

export async function runtimeGet(env, destPath) {
  const dest = new URL(destPath, RUNTIME_ORIGIN + "/");
  const headers = { "User-Agent": UA, Accept: "application/json" };
  if (env && env.AZIEL_RUNTIME && typeof env.AZIEL_RUNTIME.fetch === "function") {
    try {
      const res = await env.AZIEL_RUNTIME.fetch(new Request(dest.toString(), { method: "GET", headers }));
      if (res && res.ok) return res;
    } catch {
      /* fall through to origin */
    }
  }
  return fetch(dest.toString(), { method: "GET", headers });
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

export async function loadSoftwareCatalog(env, stats) {
  let catalog = null;
  try {
    const res = await runtimeGet(env, "/v1/catalog.json");
    if (res && res.ok) catalog = await res.json();
  } catch {
    catalog = null;
  }

  const collected = collectCatalogProducts(catalog || {});
  const merged = mergeSoftwareExtras(collected);
  let usesDoc = null;
  try {
    usesDoc = env ? await runtimeUsesPayload(env) : null;
  } catch {
    usesDoc = null;
  }

  const counts = await Promise.all(merged.map((p) => fetchCountDoc(countUrlForProduct(p))));
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
    blurb: runtimeNote(catalogVersion) + " Software hub mirrors this live catalog. Author Aziel Eliab.",
    links: [
      { href: "/runtime", label: runtimeChip(catalogVersion), primary: true },
      { href: "/runtime/v1/fraggate/list", label: "fraggate/list" },
      { href: "/runtime/mcp", label: "MCP" },
      { href: "/runtime/v1/uses", label: "uses" },
      { href: "/runtime/v1/catalog.json", label: "catalog.json" },
      { href: "/runtime/openapi.json", label: "OpenAPI" },
      { href: RUNTIME_GITHUB, label: "GitHub" },
    ],
  };

  return {
    hub,
    products: cards,
    fetched,
    downloadable: collected.length,
    extras: cards.filter((c) => c.extra).length,
    catalogVersion,
    usesTotal: localUses,
    originUses: originUses != null && Number.isFinite(originUses) ? originUses : null,
    siteViews: stats && stats.views != null ? Number(stats.views) : null,
    siteDownloads: stats && stats.downloads != null ? Number(stats.downloads) : null,
  };
}
