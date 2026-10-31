/**
 * Corpus housing for Unseal test-lattice materials.
 * Slots stay empty until TimeToUnsealTheBook hands its tests.
 * Extension point: append a slot below. Keep payload null until that handoff.
 * Do not set decryption_complete true. Do not mark live. Cap-7 is not ICANN.
 * Paid sat stays HELD. Corpus does not tie-break; aziel-runtime owns that.
 * Author: Aziel Eliab.
 */

export const VOYNICH_SPEC = "aziel.corpus.voynich-housing.v0";
export const VOYNICH_LABEL = "voynich";
export const VOYNICH_PATH = "/voynich";
export const VOYNICH_JSON_PATH = "/voynich.json";
export const VOYNICH_V1_PATH = "/v1/voynich";
export const UNSEAL_SOURCE = "timetounsealthebook";
export const UNSEAL_PLANE = "unseal";
export const UNSEAL_KINDS = Object.freeze(["receipt", "test", "theory", "corpus"]);
export const PAID_SAT_HELD = "HELD";
export const UNSEAL_ORIGIN = "https://timetounsealthebook.net";
export const UNSEAL_INDEX_URL = UNSEAL_ORIGIN + "/receipts/index.json";
export const PRIMARY_LATTICE_WRAP = "https://aziel-runtime.vibelock.workers.dev/v1/lattice/wrap";
export const PRIMARY_LATTICE_PULL = "https://aziel-runtime.vibelock.workers.dev/v1/lattice/pull";
export const COUNTER_SNAPSHOT_KIND = "timetounsealthebook.counter_snapshot";
export const THEORY_KIND = "timetounsealthebook.theory";
export const METHOD_RUN_KIND = "timetounsealthebook.method_run";
export const KEYWORD_KIND = "timetounsealthebook.keyword";
export const UNSEAL_THEORIES_URL = UNSEAL_ORIGIN + "/data/theories.json";
export const UNSEAL_TESTS_URL = UNSEAL_ORIGIN + "/data/tests.json";
export const UNSEAL_KEYWORDS_URL = UNSEAL_ORIGIN + "/data/keywords.json";
export const TEST_ID_RE = /^[a-z0-9][a-z0-9._-]{0,119}$/;
export const SOURCE_BLOB_RE = /^receipts\/sources\/[A-Za-z0-9._-]{1,180}$/;
export const KEYWORD_RE = /^[A-Za-z0-9][A-Za-z0-9 .'_-]{0,80}$/;
export const THEME_RE = /^[A-Za-z0-9][A-Za-z0-9 .'_-]{0,40}$/;
const HEX64 = /^[a-f0-9]{64}$/;

const SOURCE_STATUS = "awaiting_unseal_pr";

function slot(kind, id, title, note, pointer = null) {
  return Object.freeze({
    id,
    title,
    kind,
    status: "slot",
    payload: null,
    pointer,
    source_repo: "TimeToUnsealTheBook",
    source_status: SOURCE_STATUS,
    note,
  });
}

/** Test batteries. Names are hooks. Procedures arrive with the Unseal PR. */
const TEST_SLOTS = Object.freeze([
  slot("test", "spacing-atoms", "spacing and atoms", "Slot for spacing and atom tests."),
  slot("test", "languages-structure", "languages, structure, handoffs", "Slot for language and structure tests."),
  slot("test", "ink-handwriting", "ink and handwriting", "Slot for ink and handwriting tests."),
  slot("test", "pages-order", "pages and page order", "Slot for page-order tests."),
  slot("test", "page-materials", "materials of pages", "Slot for page-material tests."),
  slot("test", "aggregates", "aggregates", "Slot for aggregate tests."),
  slot("test", "ocr-consistency", "OCR consistency", "Slot for OCR consistency tests."),
  slot("test", "domain-astrology", "astrology", "Slot for an astrology-domain battery."),
  slot("test", "domain-biology", "biology", "Slot for a biology-domain battery."),
  slot("test", "domain-mathematics", "mathematics", "Slot for a mathematics-domain battery."),
  slot("test", "domain-grids", "grids", "Slot for a grid-domain battery."),
  slot("test", "markov-ngram", "Markov and n-gram", "Slot for Markov and n-gram tests."),
  slot("test", "academic-battery", "academic battery", "Slot for a cited academic-style battery."),
  slot("test", "create-method", "create a testing method", "Slot for a user-authored method. The wizard is not housed yet."),
]);

/** Theories already named in Unseal receipt titles. Hypotheses under test, not conclusions. */
const THEORY_SLOTS = Object.freeze([
  slot("theory", "foldlock-decompression", "decompression / FoldLock-class fold", "Hypothesis slot. Not a conclusion."),
  slot("theory", "handoffs", "handoffs", "Hypothesis slot. Not a conclusion."),
  slot("theory", "mathematics", "mathematics", "Hypothesis slot. Not a conclusion."),
  slot("theory", "fusion", "fusions of decryption approaches", "Hypothesis slot. Not a conclusion."),
  slot("theory", "abad", "ABAD", "Hypothesis slot drawn from an existing receipt title. Not a conclusion."),
  slot("theory", "universal-harmonics", "Universal Harmonics", "Hypothesis slot. Not a conclusion."),
  slot("theory", "aziel-sequence", "Aziel Sequence", "Hypothesis slot. Not a conclusion."),
  slot("theory", "madhava-leibniz", "Madhava–Leibniz", "Hypothesis slot. Not a conclusion."),
  slot("theory", "zero-dark-thirty", "Zero Dark Thirty", "Hypothesis slot. Not a conclusion."),
  slot("theory", "cpua-recovery", "CPUA recovery", "Hypothesis slot. Not a conclusion."),
  slot("theory", "operational-alphabet", "operational alphabet", "Hypothesis slot. Not a conclusion."),
  slot("theory", "template-slot-grammar", "template and slot grammar", "Hypothesis slot. Not a conclusion."),
]);

/** Corpus surfaces. Public URLs only. No local manuscript dump. */
const CORPUS_SLOTS = Object.freeze([
  slot("corpus", "transcriptions", "transcriptions", "Slot for a machine-readable transcription pointer."),
  slot("corpus", "folio-images", "folio images", "Public catalog pointer. No image file is stored here.", "https://collections.library.yale.edu/catalog/2002046"),
  slot("corpus", "ocr", "OCR layers", "Slot for an OCR-layer pointer."),
  slot("corpus", "public-baselines", "public baselines", "Public research pointer (IVTFF and related notes). No dump is stored here.", "https://www.voynich.nu/"),
  slot("corpus", "materials", "materials", "Slot for a materials pointer."),
  slot("corpus", "aggregates", "aggregates", "Slot for an aggregate corpus pointer."),
]);

/** Receipt chain pointers. The tip stays open. This tab does not append. */
const RECEIPT_SLOTS = Object.freeze([
  slot("receipt", "receipt-index", "receipt index", "Pointer slot for the Unseal receipt index. Empty until handed."),
  slot("receipt", "receipt-tip", "receipt tip", "Pointer slot for the open tip. This housing does not close it."),
  slot("receipt", "receipt-entries", "receipt entries", "Pointer slot for receipt entries. Empty until handed."),
]);

const BY_KIND = Object.freeze({
  test: TEST_SLOTS,
  theory: THEORY_SLOTS,
  corpus: CORPUS_SLOTS,
  receipt: RECEIPT_SLOTS,
});

export function isUnsealSlot(kind, id) {
  const list = BY_KIND[kind];
  if (!list || typeof id !== "string") return false;
  return list.some((row) => row.id === id);
}

function copySlot(row) {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    status: row.status,
    payload: null,
    pointer: row.pointer,
    source_repo: row.source_repo,
    source_status: row.source_status,
    note: row.note,
  };
}

export function voynichCatalog() {
  return {
    spec: VOYNICH_SPEC,
    label: VOYNICH_LABEL,
    path: VOYNICH_PATH,
    json: VOYNICH_JSON_PATH,
    v1: VOYNICH_V1_PATH,
    live: false,
    decryption_complete: false,
    cap7_is_icann: false,
    public_icann: false,
    resolves_to_hub: false,
    paid_sat: PAID_SAT_HELD,
    sat: false,
    spend: false,
    tiebreak: "refused",
    tiebreak_owner: "aziel-runtime",
    source: {
      repo: "TimeToUnsealTheBook",
      status: SOURCE_STATUS,
      note: "Slots are empty until the Unseal test lattice is handed. This tab houses pointers. It does not decrypt.",
    },
    lattice: {
      wrap: "/v1/lattice/wrap",
      pull: "/v1/lattice/pull",
      pull_unseal: "/v1/lattice/pull?entry_hash={entry_hash}&unseal=1",
      primary_wrap: PRIMARY_LATTICE_WRAP,
      primary_pull: PRIMARY_LATTICE_PULL,
      primary_target: "aziel-runtime",
      role: "secondary",
      target: "aziel-corpus",
      plane: UNSEAL_PLANE,
      source: UNSEAL_SOURCE,
      tab: VOYNICH_LABEL,
      remote_default: "off",
      post: false,
      fail_closed: true,
      aggregate: "operator-only",
      auth: "operator session, X-Aziel-Operator-Token, Authorization Bearer, or X-Aziel-Runtime-Token",
      tiebreak: "LATTICE-TIEBREAK-CORPUS",
      tiebreak_owner: "aziel-runtime",
      counter_snapshot: { tab: VOYNICH_LABEL, kind: COUNTER_SNAPSHOT_KIND },
      note: "Primary wrap is aziel-runtime. This host is the secondary. The voynich tab reads the public index and does not post a wrap. LATTICE_REMOTE stays off until an operator turns it on. Corpus does not choose a winner.",
    },
    extension: {
      file: "workers/download-tracker/src/voynich-housing.js",
      add_slot: "Append a slot to the test, theory, corpus, or receipt list. Keep payload null until the Unseal PR is handed.",
      wrap: "POST /v1/lattice/wrap with the existing hash block (offline false) and unseal { source, kind, id, slot }.",
      pull: "GET /v1/lattice/pull?entry_hash=&unseal=1",
    },
    tests: TEST_SLOTS.map(copySlot),
    theories: THEORY_SLOTS.map(copySlot),
    corpus: CORPUS_SLOTS.map(copySlot),
    receipts: RECEIPT_SLOTS.map(copySlot),
  };
}

export function voynichSlots() {
  return [...TEST_SLOTS, ...THEORY_SLOTS, ...CORPUS_SLOTS, ...RECEIPT_SLOTS].map(copySlot);
}

export function housedTheoryIds() {
  return THEORY_SLOTS.map((row) => row.id);
}

/** Public index rows only. A decrypted claim is dropped. Text beyond the pointer is not copied. */
export function publicUnsealReceipts(doc) {
  const empty = { ok: false, decryption_complete: false, live: false, cap7_is_icann: false, paid_sat: PAID_SAT_HELD, sat: false, receipts: [] };
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return { ...empty, code: "VOYNICH-INDEX-SHAPE" };
  if (doc.decryption_complete === true) return { ...empty, code: "UNSEAL-DECRYPTION-HELD" };
  const receipts = [];
  const rows = Array.isArray(doc.receipts) ? doc.receipts : [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    if (row.decryption_complete === true) continue;
    const test_id = typeof row.test_id === "string" ? row.test_id : "";
    const ledger_entry_hash = typeof row.ledger_entry_hash === "string" ? row.ledger_entry_hash : "";
    const sha256 = typeof row.sha256 === "string" ? row.sha256 : "";
    const source_blob = typeof row.source_blob === "string" ? row.source_blob : "";
    if (!TEST_ID_RE.test(test_id) || !HEX64.test(ledger_entry_hash) || !HEX64.test(sha256) || !SOURCE_BLOB_RE.test(source_blob)) continue;
    receipts.push({
      test_id,
      ledger_entry_hash,
      sha256,
      source_blob,
      decryption_complete: false,
    });
  }
  const tip = typeof doc.tip === "string" && HEX64.test(doc.tip) ? doc.tip : null;
  return {
    ok: true,
    code: "VOYNICH-INDEX",
    source: UNSEAL_INDEX_URL,
    schema: typeof doc.schema === "string" ? doc.schema.slice(0, 80) : "",
    decryption_complete: false,
    live: false,
    cap7_is_icann: false,
    public_icann: false,
    resolves_to_hub: false,
    paid_sat: PAID_SAT_HELD,
    sat: false,
    tip,
    count: receipts.length,
    receipts,
  };
}

function closedSurface(code) {
  return {
    ok: false,
    code,
    decryption_complete: false,
    live: false,
    cap7_is_icann: false,
    paid_sat: PAID_SAT_HELD,
    sat: false,
  };
}

/** Theory cards from the Unseal registry. A decrypted claim is not housed. */
export function publicTheories(doc) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return { ...closedSurface("VOYNICH-THEORY-SHAPE"), theories: [] };
  if (doc.decryption_complete === true) return { ...closedSurface("UNSEAL-DECRYPTION-HELD"), theories: [] };
  const housed = new Set(housedTheoryIds());
  const theories = [];
  for (const row of Array.isArray(doc.theories) ? doc.theories : []) {
    if (!row || row.decryption_complete === true) continue;
    const theory_id = typeof row.theory_id === "string" ? row.theory_id : "";
    if (!TEST_ID_RE.test(theory_id)) continue;
    const related = Array.isArray(row.related_test_ids) ? row.related_test_ids.filter((id) => TEST_ID_RE.test(id)) : [];
    theories.push({
      theory_id,
      title: typeof row.title === "string" ? row.title.slice(0, 160) : theory_id,
      family: typeof row.family === "string" && THEME_RE.test(row.family) ? row.family : "",
      status: "hypothesis",
      related_test_ids: related,
      decryption_complete: false,
      housed_before: housed.has(theory_id),
    });
  }
  return {
    ...closedSurface("VOYNICH-THEORIES"),
    ok: true,
    source: UNSEAL_THEORIES_URL,
    count: theories.length,
    theories,
  };
}

/** Method cards. The corpus surface lists them. It does not run the procedure. */
export function publicMethods(doc) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return { ...closedSurface("VOYNICH-TEST-SHAPE"), methods: [] };
  if (doc.decryption_complete === true) return { ...closedSurface("UNSEAL-DECRYPTION-HELD"), methods: [] };
  const methods = [];
  for (const row of Array.isArray(doc.methods) ? doc.methods : []) {
    if (!row || row.decryption_complete === true) continue;
    const method_id = typeof row.method_id === "string" ? row.method_id : "";
    if (!TEST_ID_RE.test(method_id)) continue;
    const related_test_ids = Array.isArray(row.related_test_ids) ? row.related_test_ids.filter((id) => TEST_ID_RE.test(id)) : [];
    const related_theory_ids = Array.isArray(row.related_theory_ids) ? row.related_theory_ids.filter((id) => TEST_ID_RE.test(id)) : [];
    methods.push({
      method_id,
      title: typeof row.title === "string" ? row.title.slice(0, 160) : method_id,
      status: "proposed",
      related_test_ids,
      related_theory_ids,
      decryption_complete: false,
    });
  }
  return {
    ...closedSurface("VOYNICH-TESTS"),
    ok: true,
    source: UNSEAL_TESTS_URL,
    count: methods.length,
    methods,
  };
}

/** Keywords are filed against test ids. A row with no test is not listed. */
export function publicKeywords(doc) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return { ...closedSurface("VOYNICH-KEYWORDS-SHAPE"), keywords: [] };
  if (doc.decryption_complete === true) return { ...closedSurface("UNSEAL-DECRYPTION-HELD"), keywords: [] };
  const rows = Array.isArray(doc.keywords) ? doc.keywords : (Array.isArray(doc.log) ? doc.log : null);
  if (!rows) return { ...closedSurface("VOYNICH-KEYWORDS-SHAPE"), keywords: [] };
  const keywords = [];
  for (const row of rows) {
    if (!row || row.decryption_complete === true) continue;
    const keyword = typeof row.keyword === "string" ? row.keyword.trim() : (typeof row.term === "string" ? row.term.trim() : "");
    const theme = typeof row.theme === "string" ? row.theme.trim() : (typeof row.family === "string" ? row.family.trim() : "");
    const named = Array.isArray(row.test_ids) ? row.test_ids : (row.test_id ? [row.test_id] : []);
    const test_ids = named.filter((id) => typeof id === "string" && TEST_ID_RE.test(id));
    if (!KEYWORD_RE.test(keyword) || !THEME_RE.test(theme) || !test_ids.length) continue;
    keywords.push({ keyword, theme, test_ids, decryption_complete: false });
  }
  return {
    ...closedSurface("VOYNICH-KEYWORDS"),
    ok: true,
    source: UNSEAL_KEYWORDS_URL,
    count: keywords.length,
    keywords,
  };
}
