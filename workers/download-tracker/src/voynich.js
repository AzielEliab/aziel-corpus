/**
 * Front-door tab /voynich. Label is exactly voynich.
 * Houses Unseal test-lattice slots and documents the lattice wrap/pull hooks.
 * Not live. decryption_complete stays false.
 * Author: Aziel Eliab.
 */

import { page } from "./ui.js";
import { exploreRowHtml } from "./explore-nav.js";
import {
  COUNTER_SNAPSHOT_KIND,
  KEYWORD_KIND,
  METHOD_RUN_KIND,
  PRIMARY_LATTICE_PULL,
  PRIMARY_LATTICE_WRAP,
  THEORY_KIND,
  UNSEAL_INDEX_URL,
  UNSEAL_KEYWORDS_URL,
  UNSEAL_ORIGIN,
  UNSEAL_TESTS_URL,
  UNSEAL_THEORIES_URL,
  VOYNICH_JSON_PATH,
  VOYNICH_LABEL,
  VOYNICH_PATH,
  VOYNICH_V1_PATH,
  publicKeywords,
  publicMethods,
  publicTheories,
  publicUnsealReceipts,
  voynichCatalog,
} from "./voynich-housing.js";

const INDEX_MAX_BYTES = 1000000;

export function isVoynichPath(path) {
  const p = String(path || "").replace(/\/+$/, "") || "/";
  return p === VOYNICH_PATH || p === VOYNICH_JSON_PATH || p === VOYNICH_V1_PATH;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function slotRows(rows) {
  return rows.map((row) => {
    const pointer = row.pointer
      ? `<a href="${esc(row.pointer)}">${esc(row.pointer)}</a>`
      : "none";
    return `<tr><td><code>${esc(row.id)}</code></td><td>${esc(row.title)}</td><td>${esc(row.status)}</td><td>${pointer}</td><td>${esc(row.note)}</td></tr>`;
  }).join("");
}

function slotTable(heading, rows) {
  return `<div class="card"><h2>${esc(heading)}</h2><table class="plain"><tr><th>Slot</th><th>Title</th><th>Status</th><th>Pointer</th><th>Note</th></tr>${slotRows(rows)}</table></div>`;
}

function receiptRows(receipts) {
  return (receipts || []).map((row) => {
    const blob = UNSEAL_ORIGIN + "/" + row.source_blob;
    return `<tr><td><code>${esc(row.test_id)}</code></td><td><code>${esc(row.ledger_entry_hash)}</code></td><td><code>${esc(row.sha256)}</code></td><td><a href="${esc(blob)}">${esc(row.source_blob)}</a></td><td>false</td></tr>`;
  }).join("");
}

function theoryRows(theories) {
  return (theories || []).map((row) => {
    const tests = (row.related_test_ids || []).join(", ") || "none yet";
    const housed = row.housed_before ? "stub id" : "new on this surface";
    return `<tr><td><code>${esc(row.theory_id)}</code></td><td>${esc(row.title)}</td><td>${esc(row.family)}</td><td>${esc(housed)}</td><td>${esc(tests)}</td><td>false</td></tr>`;
  }).join("");
}

function methodRows(methods) {
  return (methods || []).map((row) => {
    const tests = (row.related_test_ids || []).join(", ") || "none yet";
    return `<tr><td><code>${esc(row.method_id)}</code></td><td>${esc(row.title)}</td><td>${esc(row.status)}</td><td>${esc(tests)}</td><td>false</td></tr>`;
  }).join("");
}

function keywordBlocks(keywords) {
  const byTest = new Map();
  for (const row of keywords || []) {
    for (const test_id of row.test_ids || []) {
      if (!byTest.has(test_id)) byTest.set(test_id, []);
      byTest.get(test_id).push(row);
    }
  }
  return [...byTest.entries()].map(([test_id, rows]) => {
    const items = rows.map((row) => `<li><code>${esc(row.keyword)}</code> <span class="muted">theme ${esc(row.theme)}</span></li>`).join("");
    return `<h3><code>${esc(test_id)}</code></h3><ul>${items}</ul>`;
  }).join("");
}

function surfaceMiss(title, code) {
  return `<div class="card"><h2>${esc(title)}</h2><p><strong>This surface could not be read, so nothing is listed.</strong> ${esc(code)}.</p></div>`;
}

export function voynichBody(catalog = voynichCatalog(), surfaces = {}) {
  const index = surfaces.index || null;
  const theories = surfaces.theories || null;
  const methods = surfaces.methods || null;
  const keywords = surfaces.keywords || null;
  const listed = index && index.ok ? index : null;
  const receiptTable = listed
    ? `<div class="card"><h2>Unseal receipts</h2><p class="muted">Read from <a href="${esc(UNSEAL_INDEX_URL)}">${esc(UNSEAL_INDEX_URL)}</a>. Tip <code>${esc(listed.tip || "")}</code>. ${esc(listed.count)} rows. Each row keeps decryption_complete false. This page does not post a wrap.</p><table class="plain"><tr><th>test_id</th><th>ledger_entry_hash</th><th>sha256</th><th>source_blob</th><th>decryption_complete</th></tr>${receiptRows(listed.receipts)}</table></div>`
    : surfaceMiss("Unseal receipts", index && index.code || "VOYNICH-INDEX-UNREADABLE");
  const theoryTable = theories && theories.ok
    ? `<div class="card"><h2>Theories</h2><p class="muted">Read from <a href="${esc(UNSEAL_THEORIES_URL)}">${esc(UNSEAL_THEORIES_URL)}</a>. A theory id that was not in the earlier stub list is housed here as new. Each card stays a hypothesis. Related tests are the filing. decryption_complete stays false.</p><table class="plain"><tr><th>theory_id</th><th>Title</th><th>Theme</th><th>Housing</th><th>Filed tests</th><th>decryption_complete</th></tr>${theoryRows(theories.theories)}</table></div>`
    : surfaceMiss("Theories", theories && theories.code || "VOYNICH-THEORY-SHAPE");
  const methodTable = methods && methods.ok
    ? `<div class="card"><h2>Tests</h2><p class="muted">Read from <a href="${esc(UNSEAL_TESTS_URL)}">${esc(UNSEAL_TESTS_URL)}</a>. These are the method cards from the Unseal Tests tab. A method-input run can be wrapped later as <code>${esc(METHOD_RUN_KIND)}</code>. This page does not run the procedure.</p><table class="plain"><tr><th>method_id</th><th>Title</th><th>Status</th><th>Filed tests</th><th>decryption_complete</th></tr>${methodRows(methods.methods)}</table></div>`
    : surfaceMiss("Tests", methods && methods.code || "VOYNICH-TEST-SHAPE");
  const keywordTable = keywords && keywords.ok
    ? `<div class="card"><h2>Keywords</h2><p class="muted">Read from <a href="${esc(UNSEAL_KEYWORDS_URL)}">${esc(UNSEAL_KEYWORDS_URL)}</a>. Each keyword is filed against the test ids it names. A lattice row uses <code>${esc(KEYWORD_KIND)}</code> and one test_id. ${esc(keywords.count)} keywords.</p>${keywordBlocks(keywords.keywords) || "<p>The log was readable and held no keyword rows.</p>"}</div>`
    : `<div class="card"><h2>Keywords</h2><p><strong>The keywords log is not listed, so no keywords are invented.</strong> ${esc(keywords && keywords.code || "VOYNICH-KEYWORDS-UNREADABLE")}.</p></div>`;
  return `<section class="hero"><h1>${esc(VOYNICH_LABEL)}</h1><p class="muted">Corpus housing for the Unseal test lattice. The machine name is ${esc(VOYNICH_LABEL)}. This page reads the public registry. It does not decrypt, and it does not post.</p>${exploreRowHtml(VOYNICH_PATH)}</section>
<div class="card"><h2>Status</h2><ul>
<li>Label: <code>${esc(catalog.label)}</code></li>
<li>live: false</li>
<li>decryption_complete: false</li>
<li>Cap-7 is not ICANN. <code>cap7_is_icann</code> is false. <code>resolves_to_hub</code> is false.</li>
<li>Paid sat is HELD. <code>sat</code> is false. Nothing here spends it.</li>
<li>Tie-break is refused. aziel-runtime owns tie-break. Corpus stores a hash and pulls that hash back.</li>
<li>post: false. <code>wrap_sent</code> stays false until Aziel says post.</li>
</ul>
<p>Machine index: <a href="${esc(VOYNICH_JSON_PATH)}">${esc(VOYNICH_JSON_PATH)}</a> · <a href="${esc(VOYNICH_V1_PATH)}">${esc(VOYNICH_V1_PATH)}</a></p></div>
<div class="card"><h2>Lattice hooks</h2>
<p>Two wraps, one pull. <code>LATTICE_REMOTE</code> stays off on this page. An operator turns it on before a secondary write. Aggregate pull stays operator-only. A <code>tiebreak</code> field is refused.</p>
<ul>
<li>Primary: <code>POST ${esc(PRIMARY_LATTICE_WRAP)}</code>. Target <code>aziel-runtime</code>.</li>
<li>Secondary: <code>POST /v1/lattice/wrap</code>. Role <code>secondary</code>. Target <code>aziel-corpus</code>. <code>primary_target</code> <code>aziel-runtime</code>.</li>
<li>Pull: <code>GET /v1/lattice/pull?entry_hash=</code> and <code>GET ${esc(PRIMARY_LATTICE_PULL)}?entry_hash=</code>.</li>
<li>Counter snapshot: <code>lattice.tab</code> is <code>voynich</code> and <code>kind</code> is <code>${esc(COUNTER_SNAPSHOT_KIND)}</code>.</li>
<li>Theory: <code>${esc(THEORY_KIND)}</code> with <code>theory_id</code>. A new id does not need a stub slot.</li>
<li>Method run: <code>${esc(METHOD_RUN_KIND)}</code> with <code>method_id</code>.</li>
<li>Keyword: <code>${esc(KEYWORD_KIND)}</code> with one <code>test_id</code> and a theme.</li>
<li><code>decryption_complete: true</code> is refused.</li>
</ul>
<p class="muted">${esc(catalog.lattice.note)}</p></div>
${theoryTable}
${methodTable}
${keywordTable}
${receiptTable}
${slotTable("Local theory slots", catalog.theories)}
${slotTable("Local test slots", catalog.tests)}
${slotTable("Corpus slots", catalog.corpus)}
${slotTable("Receipt slots", catalog.receipts)}`;
}

async function readPublicJson(url, { fetchImpl = fetch } = {}) {
  let res;
  try {
    res = await fetchImpl(url, {
      headers: { accept: "application/json", "user-agent": "aziel-corpus-voynich" },
      redirect: "manual",
    });
  } catch {
    return { ok: false, status: 0, doc: null };
  }
  if (!res || res.status !== 200) return { ok: false, status: res ? res.status : 0, doc: null };
  const len = Number(res.headers && res.headers.get ? res.headers.get("content-length") || 0 : 0);
  if (len > INDEX_MAX_BYTES) return { ok: false, status: res.status, doc: null };
  let text = "";
  try { text = await res.text(); } catch { return { ok: false, status: res.status, doc: null }; }
  if (text.length > INDEX_MAX_BYTES) return { ok: false, status: res.status, doc: null };
  try { return { ok: true, status: 200, doc: JSON.parse(text) }; } catch { return { ok: false, status: 200, doc: null }; }
}

function unread(code) {
  return { ok: false, code, decryption_complete: false, live: false, cap7_is_icann: false, paid_sat: "HELD", sat: false };
}

export async function loadUnsealIndex({ fetchImpl = fetch } = {}) {
  const read = await readPublicJson(UNSEAL_INDEX_URL, { fetchImpl });
  if (!read.ok) return { ...unread("VOYNICH-INDEX-UNREADABLE"), receipts: [] };
  if (!read.doc) return { ...unread("VOYNICH-INDEX-SHAPE"), receipts: [] };
  return publicUnsealReceipts(read.doc);
}

export async function loadVoynichSurfaces({ fetchImpl = fetch } = {}) {
  const [indexRead, theoryRead, methodRead, keywordRead] = await Promise.all([
    readPublicJson(UNSEAL_INDEX_URL, { fetchImpl }),
    readPublicJson(UNSEAL_THEORIES_URL, { fetchImpl }),
    readPublicJson(UNSEAL_TESTS_URL, { fetchImpl }),
    readPublicJson(UNSEAL_KEYWORDS_URL, { fetchImpl }),
  ]);
  return {
    index: indexRead.ok && indexRead.doc ? publicUnsealReceipts(indexRead.doc) : { ...unread("VOYNICH-INDEX-UNREADABLE"), receipts: [] },
    theories: theoryRead.ok && theoryRead.doc ? publicTheories(theoryRead.doc) : { ...unread("VOYNICH-THEORY-UNREADABLE"), theories: [] },
    methods: methodRead.ok && methodRead.doc ? publicMethods(methodRead.doc) : { ...unread("VOYNICH-TEST-UNREADABLE"), methods: [] },
    keywords: keywordRead.ok && keywordRead.doc ? publicKeywords(keywordRead.doc) : { ...unread(keywordRead.status === 404 ? "VOYNICH-KEYWORDS-UNREADABLE" : "VOYNICH-KEYWORDS-UNREADABLE"), keywords: [] },
  };
}

export async function handleVoynich(request, deps = {}) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const catalog = voynichCatalog();
  const surfaces = await loadVoynichSurfaces(deps);
  const machine = {
    ...catalog,
    index_url: UNSEAL_INDEX_URL,
    theories_url: UNSEAL_THEORIES_URL,
    tests_url: UNSEAL_TESTS_URL,
    keywords_url: UNSEAL_KEYWORDS_URL,
    index_ok: surfaces.index.ok === true,
    index_code: surfaces.index.code || "",
    tip: surfaces.index.tip || null,
    unseal_receipts: surfaces.index.receipts || [],
    theories_public: surfaces.theories.theories || [],
    methods_public: surfaces.methods.methods || [],
    keywords_public: surfaces.keywords.keywords || [],
    post: false,
    wrap_sent: false,
    decryption_complete: false,
    live: false,
    paid_sat: "HELD",
  };
  const headers = {
    "Cache-Control": "public, max-age=60",
    "X-Robots-Tag": "index, follow",
    "Access-Control-Allow-Origin": "*",
  };
  if (path === VOYNICH_JSON_PATH || path === VOYNICH_V1_PATH) {
    headers["Content-Type"] = "application/json; charset=utf-8";
    const body = request.method === "HEAD" ? null : JSON.stringify(machine, null, 2);
    return new Response(body, { status: 200, headers });
  }
  headers["Content-Type"] = "text/html; charset=utf-8";
  const html = page(VOYNICH_LABEL, voynichBody(catalog, surfaces), {
    path: VOYNICH_PATH,
    kind: "article",
    description: "voynich tab. Corpus housing for Unseal test-lattice slots. Not live. decryption_complete is false. Cap-7 is not ICANN. Paid sat is HELD.",
  });
  return new Response(request.method === "HEAD" ? null : html, { status: 200, headers });
}
