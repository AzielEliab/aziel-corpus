/**
 * Multi-site receipt subtree filed on the corpus.
 * A site folder is a catalog pointer. A row is stored only when an operator
 * lattice wrap names that site and a receipt hash. This module does not
 * fetch sister sites and does not invent receipt sentences.
 * live stays false. decryption_complete stays false. Cap-7 is not ICANN.
 * Paid sat stays HELD. Corpus does not tie-break.
 * Author: Aziel Eliab.
 */

import { PAID_SAT_HELD } from "./voynich-housing.js";

export const RECEIPTS_TAB_LABEL = "receipts";
export const RECEIPTS_TAB_PATH = "/receipts";
export const RECEIPTS_SITES_PATH = "/receipts/sites";
export const RECEIPTS_SITES_V1 = "/v1/receipts/sites";

const INDEX_PREFIX = "act_receipt:aggregate:";
const ROW_PREFIX = "act_receipt:aggregate:row:";

/**
 * Extension point: append a hub that emits receipts.
 * origin null means the source is not a public receipts URL yet.
 */
export const AGGREGATE_SITES = Object.freeze([
  Object.freeze({
    slug: "godlock",
    label: "godlock.uk",
    origin: "https://godlock.uk",
    receipts: "https://godlock.uk/receipts",
    note: "Sister receipts tab. Rows appear here only after a lattice wrap files the hash.",
  }),
  Object.freeze({
    slug: "aziel-runtime",
    label: "aziel-runtime",
    origin: "https://aziel-runtime.vibelock.workers.dev",
    receipts: "https://aziel-runtime.vibelock.workers.dev/v1/receipts",
    note: "Softwares / runtime receipts. Hash pointer only.",
  }),
  Object.freeze({
    slug: "unseal",
    label: "TimeToUnsealTheBook",
    origin: null,
    receipts: "/voynich",
    note: "Unseal handoff is not here yet. The voynich tab holds the empty slots.",
  }),
  Object.freeze({
    slug: "ae",
    label: "azieleliab.com",
    origin: "https://www.azieleliab.com",
    receipts: "https://www.azieleliab.com/receipts",
    note: "ae receipts tab. Hash pointer only.",
  }),
  Object.freeze({
    slug: "hdj",
    label: "hedidntjump.com",
    origin: "https://www.hedidntjump.com",
    receipts: "https://www.hedidntjump.com/receipts",
    note: "HDJ receipts tab. Hash pointer only.",
  }),
  Object.freeze({
    slug: "corpus",
    label: "azielcorpuslibrary.net",
    origin: "https://www.azielcorpuslibrary.net",
    receipts: "https://www.azielcorpuslibrary.net/receipts",
    note: "Receipts already on this origin. Aggregate filing is still hash-only.",
  }),
]);

export function aggregateSite(slug) {
  return AGGREGATE_SITES.find((site) => site.slug === slug) || null;
}

export function isAggregateSite(slug) {
  return !!aggregateSite(slug);
}

function kv(env) {
  const store = env && env.DOWNLOADS;
  if (!store || typeof store.get !== "function" || typeof store.put !== "function") return null;
  return store;
}

function policyFields() {
  return {
    live: false,
    decryption_complete: false,
    cap7_is_icann: false,
    public_icann: false,
    resolves_to_hub: false,
    paid_sat: PAID_SAT_HELD,
    sat: false,
    lattice: "secondary",
  };
}

async function readJson(store, key, fallback) {
  try {
    const raw = await store.get(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

export async function fileAggregateReceipt(env, { site, entry_hash } = {}) {
  const store = kv(env);
  if (!store) return { ok: false, code: "AGGREGATE-STORE-UNAVAILABLE" };
  if (!isAggregateSite(site) || typeof entry_hash !== "string") return { ok: false, code: "AGGREGATE-SITE" };
  const rowKey = ROW_PREFIX + entry_hash;
  const existing = await readJson(store, rowKey, null);
  if (existing && typeof existing === "object") {
    if (existing.site !== site || existing.entry_hash !== entry_hash) {
      return { ok: false, code: "LATTICE-TIEBREAK-CORPUS" };
    }
    const indexKey = INDEX_PREFIX + site;
    const list = await readJson(store, indexKey, []);
    const hashes = Array.isArray(list) ? list.slice() : [];
    if (!hashes.includes(entry_hash)) {
      hashes.push(entry_hash);
      await store.put(indexKey, JSON.stringify(hashes));
    }
    return { ok: true, filed: false, already: true, record: existing };
  }
  const record = {
    site,
    entry_hash,
    filed_utc: new Date().toISOString(),
    ...policyFields(),
  };
  const indexKey = INDEX_PREFIX + site;
  const list = await readJson(store, indexKey, []);
  const hashes = Array.isArray(list) ? list.slice() : [];
  if (!hashes.includes(entry_hash)) hashes.push(entry_hash);
  await store.put(rowKey, JSON.stringify(record));
  await store.put(indexKey, JSON.stringify(hashes));
  return { ok: true, filed: true, already: false, record };
}

export async function listFiledReceipts(env, site) {
  const known = aggregateSite(site);
  if (!known) return { ok: false, code: "AGGREGATE-SITE", receipts: [] };
  const store = kv(env);
  if (!store) return { ok: false, code: "AGGREGATE-STORE-UNAVAILABLE", site: known, receipts: [] };
  const hashes = await readJson(store, INDEX_PREFIX + site, []);
  const receipts = [];
  for (const hash of Array.isArray(hashes) ? hashes : []) {
    const row = await readJson(store, ROW_PREFIX + hash, null);
    if (!row || row.site !== site || row.entry_hash !== hash) continue;
    receipts.push(row);
  }
  return { ok: true, code: "AGGREGATE-LIST", site: known, receipts };
}

export function aggregateCatalog() {
  return {
    label: RECEIPTS_TAB_LABEL,
    path: RECEIPTS_TAB_PATH,
    sites_path: RECEIPTS_SITES_PATH,
    live: false,
    decryption_complete: false,
    cap7_is_icann: false,
    public_icann: false,
    resolves_to_hub: false,
    paid_sat: PAID_SAT_HELD,
    sat: false,
    tiebreak: "refused",
    tiebreak_owner: "aziel-runtime",
    note: "Subtree folders are source hubs. A hash is filed only by POST /v1/lattice/wrap with aggregate.site. This catalog does not copy remote receipt text.",
    lattice: {
      wrap: "/v1/lattice/wrap",
      pull: "/v1/lattice/pull",
      plane: "sites",
      fail_closed: true,
      tiebreak: "LATTICE-TIEBREAK-CORPUS",
    },
    sites: AGGREGATE_SITES.map((site) => ({
      slug: site.slug,
      label: site.label,
      origin: site.origin,
      receipts: site.receipts,
      path: RECEIPTS_SITES_PATH + "/" + site.slug,
      note: site.note,
      payload: null,
    })),
  };
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function aggregateSubtreeHtml() {
  const items = AGGREGATE_SITES.map((site) => {
    const href = RECEIPTS_SITES_PATH + "/" + site.slug;
    return `<li><a href="${esc(href)}">${esc(site.label)}</a> <span class="muted">${esc(site.note)}</span></li>`;
  }).join("");
  return `<div class="card"><h2>Sites</h2>
<p class="muted">Nested folders for receipts aggregated onto this corpus. Each folder files hash pointers only. This page does not invent receipt text. A hash is stored only after an operator lattice wrap. Tie-break is refused. Paid sat is HELD. Cap-7 is not ICANN. live is false. decryption_complete is false.</p>
<ul>${items}</ul>
<p class="muted"><a href="${RECEIPTS_SITES_PATH}">${RECEIPTS_TAB_LABEL} / sites</a></p></div>`;
}

export function aggregateSiteHtml(site, filed) {
  const rows = (filed && filed.receipts) || [];
  const list = rows.length
    ? rows.map((row) => `<li><code>${esc(row.entry_hash)}</code></li>`).join("")
    : `<li>No receipts filed from this site. This page does not invent them.</li>`;
  const remote = site.receipts && /^https:\/\//.test(site.receipts)
    ? `<p>Source pointer <a href="${esc(site.receipts)}" rel="noopener noreferrer">${esc(site.receipts)}</a></p>`
    : `<p>Source pointer <a href="${esc(site.receipts)}">${esc(site.receipts)}</a></p>`;
  const storeNote = filed && filed.ok === false && filed.code === "AGGREGATE-STORE-UNAVAILABLE"
    ? `<p><strong>Filing store is unavailable, so no hashes are listed.</strong></p>`
    : "";
  return `<section class="hero"><h1>${esc(RECEIPTS_TAB_LABEL)}</h1>
<p class="muted">${esc(site.label)}. Hash pointers filed on this corpus. Not live.</p>
${remote}
${storeNote}
</section>
<div class="card"><h2>${esc(site.slug)}</h2><ul>${list}</ul>
<p class="muted"><a href="${RECEIPTS_SITES_PATH}">All sites</a> · <a href="${RECEIPTS_TAB_PATH}">${RECEIPTS_TAB_LABEL}</a></p></div>`;
}

export function aggregateIndexHtml() {
  return `<section class="hero"><h1>${esc(RECEIPTS_TAB_LABEL)}</h1>
<p class="muted">Source folders for aggregated receipts. Open a site to see hashes filed on this corpus.</p>
</section>
${aggregateSubtreeHtml()}`;
}
