/**
 * Hosted gazetteer, temporal events, and historical geography.
 * Author: Aziel Eliab.
 */
import { createHash, randomBytes } from "node:crypto";
import CITIES from "./cities-lite.js";
import { unzipEntries, zipText } from "./zip.js";
import { isOperator } from "./library.js";
import { appendLedger, ensureLedger } from "./ledger.js";
import { ensureReviewSchema } from "./review-store.js";

const GEONAMES_ATTRIBUTION = "GeoNames geographical data — https://www.geonames.org/ — CC BY 4.0";
const LAYER_CAP = 1024 * 1024;
const MONTHS = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5,
  june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9,
  october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};
const MONTH_PAT = "(?:January|Jan\\.?|February|Feb\\.?|March|Mar\\.?|April|Apr\\.?|May|June|Jun\\.?|July|Jul\\.?|August|Aug\\.?|September|Sept?\\.?|October|Oct\\.?|November|Nov\\.?|December|Dec\\.?)";
const DATE_RE = /\b(?:[0-9]{4})(?:-[01][0-9](?:-[0-3][0-9])?)?\b/g;
const MONTH_FIRST_RE = new RegExp("\\b(?<month>" + MONTH_PAT + ")\\s+(?<day>[0-3]?\\d)(?:st|nd|rd|th)?(?:,)?\\s+(?<year>\\d{3,4})\\b", "gi");
const DAY_FIRST_RE = new RegExp("\\b(?<day>[0-3]?\\d)(?:st|nd|rd|th)?\\s+(?<month>" + MONTH_PAT + ")(?:,)?\\s+(?<year>\\d{3,4})\\b", "gi");
const MONTH_YEAR_RE = new RegExp("\\b(?<month>" + MONTH_PAT + ")\\s+(?<year>\\d{3,4})\\b", "gi");
const CAP_WORD = "[A-ZÀ-ÖØ-Þ][\\wÀ-ÖØ-öø-ÿ'’.-]*";
const CONNECTOR = "(?:of|the|de|del|da|di|do|dos|la|las|le|du|van|von|y|al)";
const CAP_PHRASE_RE = new RegExp("(?<![\\w])" + CAP_WORD + "(?:\\s+(?:(?:" + CONNECTOR + ")\\s+){0,2}" + CAP_WORD + "){0,4}", "g");
const PREP_PLACE_RE = /\b(?:in|at|near|from|to|within|outside|around|through|across)\s+([^\n.!?;:]{2,100})/gi;
const STOP = new Set("the this that these those a an and or but for with from into onto over under chapter figure table page section document report research analysis note notes appendix monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december".split(" "));

let schemaPromise = null;
let seedPromise = null;

function sha256hex(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function utcNow() {
  return new Date().toISOString();
}

export function normName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/’/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9' .-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[ .-]+|[ .-]+$/g, "");
}

function monthNumber(value) {
  return MONTHS[String(value || "").toLowerCase().replace(/\.$/, "")] || 0;
}

function validYmd(year, month = 0, day = 0) {
  if (!(year >= 1 && year <= 9999)) return false;
  if (!month) return true;
  if (!(month >= 1 && month <= 12)) return false;
  if (!day) return true;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return dt.getUTCFullYear() === year && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day;
}

export function extractDateMentions(text) {
  const found = [];
  const add = (start, end, raw, year, month = 0, day = 0) => {
    year = Number(year); month = Number(month || 0); day = Number(day || 0);
    if (!validYmd(year, month, day)) return;
    let norm, precision;
    if (day) { norm = String(year).padStart(4, "0") + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0"); precision = "DAY"; }
    else if (month) { norm = String(year).padStart(4, "0") + "-" + String(month).padStart(2, "0"); precision = "MONTH"; }
    else { norm = String(year).padStart(4, "0"); precision = "YEAR"; }
    found.push({ start, end, raw, date: norm, precision });
  };
  const src = String(text || "");
  for (const m of src.matchAll(DATE_RE)) add(m.index, m.index + m[0].length, m[0], ...(m[0].split("-")));
  for (const rx of [MONTH_FIRST_RE, DAY_FIRST_RE]) {
    rx.lastIndex = 0;
    for (const m of src.matchAll(rx)) add(m.index, m.index + m[0].length, m[0], m.groups.year, monthNumber(m.groups.month), m.groups.day);
  }
  MONTH_YEAR_RE.lastIndex = 0;
  for (const m of src.matchAll(MONTH_YEAR_RE)) {
    if (found.some((x) => x.start <= m.index && x.end >= m.index + m[0].length)) continue;
    add(m.index, m.index + m[0].length, m[0], m.groups.year, monthNumber(m.groups.month), 0);
  }
  const rank = { YEAR: 1, MONTH: 2, DAY: 3 };
  const chosen = [];
  for (const item of found.sort((a, b) => a.start - b.start || rank[b.precision] - rank[a.precision] || (b.end - b.start) - (a.end - a.start))) {
    if (chosen.some((x) => !(item.end <= x.start || item.start >= x.end))) continue;
    chosen.push(item);
  }
  return chosen.sort((a, b) => a.start - b.start);
}

export function normalizeEventDate(value) {
  const s = String(value || "").trim();
  const mentions = extractDateMentions(s);
  if (mentions.length === 1 && s.replace(/[ ,.;]+$/g, "") === mentions[0].raw.replace(/[ ,.;]+$/g, "")) return mentions[0].date;
  throw new Error("date must be YYYY, YYYY-MM, YYYY-MM-DD, Month D YYYY, D Month YYYY, or Month YYYY");
}

export function candidatePhrases(text, maxCandidates = 400) {
  const found = [];
  const seen = new Set();
  const addVariants = (phrase) => {
    phrase = String(phrase || "").replace(/\s+/g, " ").replace(/^[ .,:;!?()[\]{}"']+|[ .,:;!?()[\]{}"']+$/g, "");
    const toks = phrase.match(/[\wÀ-ÖØ-öø-ÿ'’.-]+/g) || [];
    if (!toks.length) return false;
    const variants = [phrase];
    if (toks.length > 1) {
      for (let n = Math.min(5, toks.length); n >= 1; n--) {
        variants.push(toks.slice(-n).join(" "));
        variants.push(toks.slice(0, n).join(" "));
      }
    }
    for (const v of variants) {
      const nv = normName(v);
      if (nv.length < 3 || STOP.has(nv) || /^\d+$/.test(nv) || seen.has(nv)) continue;
      seen.add(nv);
      found.push(v);
      if (found.length >= maxCandidates) return true;
    }
    return false;
  };
  const sample = String(text || "").slice(0, 400000);
  CAP_PHRASE_RE.lastIndex = 0;
  for (const m of sample.matchAll(CAP_PHRASE_RE)) {
    if (addVariants(m[0])) return found;
  }
  PREP_PLACE_RE.lastIndex = 0;
  for (const m of sample.matchAll(PREP_PLACE_RE)) {
    const toks = (m[1].match(/[\wÀ-ÖØ-öø-ÿ'’.-]+/g) || []).slice(0, 7);
    for (let n = Math.min(5, toks.length); n >= 1; n--) {
      if (addVariants(toks.slice(0, n).join(" "))) return found;
    }
  }
  return found;
}

function dateFloor(value) {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s) return "";
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  if (s.length >= 7 && s[4] === "-") return s.slice(0, 7) + "-01";
  const y = parseInt(s.slice(0, 4), 10);
  if (Number.isFinite(y) && y >= 0) return String(y).padStart(4, "0") + "-01-01";
  return s;
}

function dateCeiling(value) {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s) return "";
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  if (s.length >= 7 && s[4] === "-") return s.slice(0, 7) + "-31";
  const y = parseInt(s.slice(0, 4), 10);
  if (Number.isFinite(y) && y >= 0) return String(y).padStart(4, "0") + "-12-31";
  return s;
}

function prop(props, names, fallback = "") {
  const low = {};
  for (const [k, v] of Object.entries(props || {})) low[String(k).toLowerCase()] = v;
  for (const n of names) {
    const v = low[String(n).toLowerCase()];
    if (v != null && v !== "") return v;
  }
  return fallback;
}

async function migrate(env) {
  if (!env || !env.DB) return;
  const tables = [
    `CREATE TABLE IF NOT EXISTS places (geonameid INTEGER PRIMARY KEY, name TEXT, asciiname TEXT, lat REAL, lon REAL, feature_class TEXT, feature_code TEXT, country_code TEXT, admin1 TEXT, population INTEGER, alias_norm TEXT)`,
    `CREATE INDEX IF NOT EXISTS idx_places_alias ON places(alias_norm)`,
    `CREATE INDEX IF NOT EXISTS idx_places_name ON places(name)`,
    `CREATE TABLE IF NOT EXISTS packages (package_id TEXT PRIMARY KEY, kind TEXT, package_type TEXT, version TEXT, sha256 TEXT, status TEXT, object_key TEXT, created_utc TEXT)`,
    `CREATE TABLE IF NOT EXISTS historical_layers (layer_id TEXT PRIMARY KEY, name TEXT, valid_from TEXT, valid_to TEXT, feature_count INTEGER, confidence REAL, source_name TEXT, license TEXT, attribution TEXT, source_sha256 TEXT, geojson TEXT, created_utc TEXT)`,
    `CREATE TABLE IF NOT EXISTS ocr_jobs (id TEXT PRIMARY KEY, record_id TEXT, status TEXT, result TEXT, created_utc TEXT)`,
    `CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT)`,
    `CREATE TABLE IF NOT EXISTS ledger (sequence INTEGER PRIMARY KEY, timestamp_utc TEXT NOT NULL, action TEXT NOT NULL, payload_json TEXT NOT NULL, previous_hash TEXT NOT NULL, entry_hash TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS derived_artifacts (derived_id TEXT PRIMARY KEY, record_id TEXT, artifact_type TEXT, processor TEXT, processor_version TEXT, content_sha256 TEXT, created_utc TEXT, status TEXT, object_key TEXT, note TEXT)`,
    `CREATE TABLE IF NOT EXISTS events (event_id TEXT PRIMARY KEY, event_date TEXT, place_name TEXT, lat REAL, lon REAL, title TEXT, record_id TEXT, created_by TEXT, created_utc TEXT NOT NULL)`,
  ];
  for (const sql of tables) {
    try { await env.DB.prepare(sql).run(); } catch { /* exists */ }
  }
  for (const col of ["confidence REAL", "source TEXT", "status TEXT", "historical_json TEXT"]) {
    try { await env.DB.prepare("ALTER TABLE events ADD COLUMN " + col).run(); } catch { /* duplicate column */ }
  }
  try { await env.DB.prepare("ALTER TABLE records ADD COLUMN content_sha256 TEXT").run(); } catch { /* exists */ }
  try { await env.DB.prepare("ALTER TABLE derived_artifacts ADD COLUMN object_key TEXT").run(); } catch { /* exists */ }
  try { await env.DB.prepare("ALTER TABLE derived_artifacts ADD COLUMN note TEXT").run(); } catch { /* exists */ }
  try { await ensureLedger(env); } catch { /* ledger */ }
  try { await ensureReviewSchema(env); } catch { /* review */ }
}

export function ensureSchema(env) {
  if (!schemaPromise) schemaPromise = migrate(env).catch((err) => { schemaPromise = null; throw err; });
  return schemaPromise;
}

async function countPlaces(env) {
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM places").first();
    return Number(row && row.n) || 0;
  } catch {
    return 0;
  }
}

async function insertCitySlice(env, slice) {
  const ROWS = 8;
  const stmts = [];
  for (let i = 0; i < slice.length; i += ROWS) {
    const chunk = slice.slice(i, i + ROWS);
    const placeholders = chunk.map(() => "(?,?,?,?,?,?,?,?,?,?,?)").join(",");
    const binds = [];
    for (const p of chunk) {
      const alias = normName(p.name) || normName(p.asciiname);
      binds.push(p.geonameid, p.name, p.asciiname || "", p.lat, p.lon, "P", "PPL", p.country_code || "", p.admin1 || "", p.population || 0, alias);
    }
    stmts.push(env.DB.prepare("INSERT OR IGNORE INTO places(geonameid,name,asciiname,lat,lon,feature_class,feature_code,country_code,admin1,population,alias_norm) VALUES " + placeholders).bind(...binds));
  }
  const BATCH = 40;
  for (let i = 0; i < stmts.length; i += BATCH) {
    await env.DB.batch(stmts.slice(i, i + BATCH));
  }
}

async function seedAll(env) {
  await ensureSchema(env);
  const n = await countPlaces(env);
  if (n >= CITIES.length) {
    await env.DB.prepare("INSERT OR REPLACE INTO metadata(key,value) VALUES(?,?)").bind("gazetteer_state", JSON.stringify({ state: "READY", places: n, profile: "lite", attribution: GEONAMES_ATTRIBUTION })).run();
    return { places: n, seeded: false };
  }
  const meta = await env.DB.prepare("SELECT value FROM metadata WHERE key=?").bind("gazetteer_seed_offset").first();
  let offset = Number(meta && meta.value) || 0;
  if (offset > CITIES.length) offset = 0;
  if (n === 0) offset = 0;
  const STEP = 400;
  while (offset < CITIES.length) {
    await insertCitySlice(env, CITIES.slice(offset, offset + STEP));
    offset += STEP;
    await env.DB.prepare("INSERT OR REPLACE INTO metadata(key,value) VALUES(?,?)").bind("gazetteer_seed_offset", String(offset)).run();
  }
  const places = await countPlaces(env);
  await env.DB.prepare("INSERT OR REPLACE INTO metadata(key,value) VALUES(?,?)").bind("gazetteer_state", JSON.stringify({ state: "READY", places, profile: "lite", attribution: GEONAMES_ATTRIBUTION })).run();
  return { places, seeded: true };
}

export async function ensurePlaces(env, ctx) {
  await ensureSchema(env);
  const n = await countPlaces(env);
  if (n >= CITIES.length) return { places: n, state: "READY", seeded: false };
  if (!seedPromise) seedPromise = seedAll(env).finally(() => { seedPromise = null; });
  if (ctx && typeof ctx.waitUntil === "function" && n > 0) {
    ctx.waitUntil(seedPromise.catch(() => {}));
    return { places: n, state: "READY", seeded: false };
  }
  if (n === 0) {
    // Seed a first slice so the page is useful, finish the rest in waitUntil.
    await insertCitySlice(env, CITIES.slice(0, 400));
    await env.DB.prepare("INSERT OR REPLACE INTO metadata(key,value) VALUES(?,?)").bind("gazetteer_seed_offset", "400").run();
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(seedPromise.catch(() => {}));
    else await seedPromise;
    const places = await countPlaces(env);
    return { places, state: "READY", seeded: true };
  }
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(seedPromise.catch(() => {}));
  else await seedPromise;
  return { places: await countPlaces(env), state: "READY", seeded: true };
}

export async function gazetteerStatus(env, ctx) {
  const seed = await ensurePlaces(env, ctx);
  return {
    state: seed.places > 0 ? "READY" : "EMPTY",
    profile: "lite",
    places: seed.places,
    aliases: seed.places,
    historical_aliases: 0,
    attribution: GEONAMES_ATTRIBUTION,
  };
}

export async function lookupPlaces(env, q, limit = 20) {
  await ensurePlaces(env);
  const n = normName(q);
  if (!n || !env.DB) return [];
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const exact = (await env.DB.prepare(
    "SELECT * FROM places WHERE alias_norm=? OR lower(name)=? OR lower(asciiname)=? ORDER BY population DESC LIMIT ?"
  ).bind(n, n, n, lim).all()).results || [];
  if (exact.length) return exact;
  const like = "%" + n.replace(/[%_]/g, "") + "%";
  return (await env.DB.prepare(
    "SELECT * FROM places WHERE alias_norm LIKE ? OR lower(name) LIKE ? OR lower(asciiname) LIKE ? ORDER BY population DESC LIMIT ?"
  ).bind(like, like, like, lim).all()).results || [];
}

export async function resolveUnique(env, name) {
  const n = normName(name);
  if (!n) return null;
  const rows = await lookupPlaces(env, name, 12);
  const exact = rows.filter((r) => normName(r.name) === n || normName(r.asciiname) === n || r.alias_norm === n);
  const pool = exact.length ? exact : [];
  const ids = new Set(pool.map((r) => r.geonameid));
  if (ids.size === 1) return pool[0];
  return null;
}

export async function gazetteerSearch(env, q, limit = 50) {
  const rows = await lookupPlaces(env, q, limit);
  return rows.map((x) => ({
    geonameid: x.geonameid,
    name: x.name,
    matched_name: x.name,
    lat: x.lat,
    lon: x.lon,
    feature_code: x.feature_code,
    country_code: x.country_code,
    admin1: x.admin1,
    population: x.population,
  }));
}

function sentenceBounds(text) {
  const bounds = [0];
  const rx = /[!?\n]+|\.(?=\s+[A-Z0-9])/g;
  let m;
  while ((m = rx.exec(text))) bounds.push(m.index + m[0].length);
  bounds.push(text.length + 1);
  return bounds;
}

function segmentId(bounds, pos) {
  let lo = 0, hi = bounds.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (bounds[mid] <= pos) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function mentionSpans(text, names) {
  const spans = [];
  const seen = new Set();
  const uniq = [...new Set(names.map((n) => String(n || "").trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  for (const name of uniq) {
    const rx = new RegExp("(?<!\\w)" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?!\\w)", "gi");
    let m;
    while ((m = rx.exec(text))) {
      const key = m.index + ":" + (m.index + m[0].length);
      if (seen.has(key)) continue;
      seen.add(key);
      spans.push({ start: m.index, end: m.index + m[0].length, raw: m[0], name });
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}

export async function extractEventsForText(env, { recordId, title, body, createdBy = "auto" }) {
  await ensurePlaces(env);
  const raw = String((body || "") + "\n" + (title || "")).slice(0, 400000);
  if (!raw.trim()) return 0;
  const dates = extractDateMentions(raw);
  if (!dates.length) return 0;
  const phrases = candidatePhrases(raw);
  const resolved = [];
  const tried = new Set();
  for (const p of phrases) {
    const n = normName(p);
    if (!n || tried.has(n)) continue;
    tried.add(n);
    const hit = await resolveUnique(env, p);
    if (hit && hit.lat != null && hit.lon != null) resolved.push({ phrase: p, place: hit });
  }
  if (!resolved.length) return 0;
  const pmentions = [];
  for (const item of resolved) {
    for (const sp of mentionSpans(raw, [item.phrase, item.place.name, item.place.asciiname])) {
      pmentions.push({ ...sp, place: item.place });
    }
  }
  pmentions.sort((a, b) => a.start - b.start);
  const bounds = sentenceBounds(raw);
  const made = [];
  const pairKeys = new Set();
  for (const pm of pmentions) {
    const candidates = [];
    for (const dm of dates) {
      let gap;
      if (dm.end < pm.start) gap = pm.start - dm.end;
      else if (pm.end < dm.start) gap = dm.start - pm.end;
      else gap = 0;
      const same = segmentId(bounds, dm.start) === segmentId(bounds, pm.start);
      if (same) candidates.push({ gap: gap < 500 ? 0 : gap, dm, source: "AUTO_SENTENCE", conf: 0.9, status: "AUTO" });
      else if (gap <= 220) candidates.push({ gap, dm, source: "AUTO_CONTEXT", conf: 0.7, status: "REVIEW" });
    }
    candidates.sort((a, b) => a.gap - b.gap);
    for (const c of candidates.slice(0, 2)) {
      const key = [c.dm.date, pm.place.geonameid, pm.start, c.dm.start].join("|");
      if (pairKeys.has(key)) continue;
      pairKeys.add(key);
      const eid = "AZEVT-" + sha256hex([recordId, c.dm.date, String(pm.place.geonameid), String(pm.start), String(c.dm.start)].join("|")).slice(0, 12).toUpperCase();
      made.push({
        event_id: eid,
        event_date: c.dm.date,
        place_name: pm.place.name,
        lat: pm.place.lat,
        lon: pm.place.lon,
        title: c.dm.date + " — " + pm.place.name,
        record_id: recordId || "",
        created_by: createdBy,
        created_utc: utcNow(),
        confidence: c.conf,
        source: c.source,
        status: c.status,
      });
    }
  }
  if (!made.length && dates.length === 1 && resolved.length === 1) {
    const dm = dates[0];
    const pl = resolved[0].place;
    const eid = "AZEVT-" + sha256hex((recordId || "") + "|" + dm.date + "|" + pl.geonameid).slice(0, 12).toUpperCase();
    made.push({
      event_id: eid, event_date: dm.date, place_name: pl.name, lat: pl.lat, lon: pl.lon,
      title: dm.date + " — " + pl.name, record_id: recordId || "", created_by: createdBy, created_utc: utcNow(),
      confidence: 0.7, source: "AUTO_DOCUMENT", status: "REVIEW",
    });
  }
  if (!made.length) return 0;
  const stmts = made.map((e) =>
    env.DB.prepare(
      "INSERT OR IGNORE INTO events(event_id,event_date,place_name,lat,lon,title,record_id,created_by,created_utc,confidence,source,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(e.event_id, e.event_date, e.place_name, e.lat, e.lon, e.title, e.record_id, e.created_by, e.created_utc, e.confidence, e.source, e.status)
  );
  for (let i = 0; i < stmts.length; i += 40) await env.DB.batch(stmts.slice(i, i + 40));
  return made.length;
}

export async function extractEventsForRecord(env, recordId) {
  if (!env.DB || !recordId) return 0;
  const row = await env.DB.prepare("SELECT record_id,title,body FROM records WHERE record_id=?").bind(recordId).first();
  if (!row) return 0;
  return extractEventsForText(env, { recordId: row.record_id, title: row.title, body: row.body, createdBy: "auto" });
}

export async function reindexGeography(env) {
  await ensurePlaces(env);
  // Reindex is append-only; originals and existing events stay.
  const rows = (await env.DB.prepare("SELECT record_id,title,body FROM records ORDER BY created_utc DESC LIMIT 400").all()).results || [];
  let events = 0;
  for (const r of rows) {
    events += await extractEventsForText(env, { recordId: r.record_id, title: r.title, body: r.body, createdBy: "auto" });
  }
  await appendLedger(env, "GEOGRAPHY_REINDEX", { records: rows.length, events_created: events });
  return { records: rows.length, events_created: events };
}

export async function listEvents(env, { minConfidence = 0 } = {}) {
  await ensureSchema(env);
  try {
    const rows = (await env.DB.prepare(
      "SELECT event_id,event_date,place_name,lat,lon,title,record_id,created_by,created_utc,confidence,source,status,historical_json FROM events WHERE IFNULL(confidence,1) >= ? ORDER BY event_date,place_name LIMIT 800"
    ).bind(Number(minConfidence) || 0).all()).results || [];
    return rows.map((e) => {
      let historical_context = [];
      if (e.historical_json) {
        try { historical_context = JSON.parse(e.historical_json); } catch { historical_context = []; }
      }
      return { ...e, confidence: e.confidence == null ? 1 : Number(e.confidence), source: e.source || "", status: e.status || "", historical_context };
    });
  } catch {
    const rows = (await env.DB.prepare("SELECT event_id,event_date,place_name,lat,lon,title,record_id,created_by,created_utc FROM events ORDER BY event_date LIMIT 800").all()).results || [];
    return rows.map((e) => ({ ...e, confidence: 1, source: "", status: "", historical_context: [] }));
  }
}

export async function addManualEvent(env, { signed, date, place, lat, lon, title, record_id }) {
  await ensureSchema(env);
  lat = Number(lat); lon = Number(lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    const err = new Error("coordinates out of range");
    err.status = 400;
    throw err;
  }
  const eventDate = normalizeEventDate(date);
  const placeName = String(place || "").trim();
  if (!placeName) {
    const err = new Error("place required");
    err.status = 400;
    throw err;
  }
  const who = isOperator(signed) ? "operator" : (signed && signed.username) || "user";
  const key = [eventDate, placeName, String(lat), String(lon), title || "", record_id || "", who].join("|");
  const eid = "AZEVT-" + sha256hex(key).slice(0, 12).toUpperCase();
  try {
    await env.DB.prepare(
      "INSERT INTO events(event_id,event_date,place_name,lat,lon,title,record_id,created_by,created_utc,confidence,source,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(eid, eventDate, placeName, lat, lon, String(title || eventDate + " — " + placeName).slice(0, 240), String(record_id || "").slice(0, 80), who, utcNow(), 1, "MANUAL", "CONFIRMED").run();
  } catch { /* identical event already stored */ }
  try {
    await appendLedger(env, "EVENT_ADD", { event_id: eid, record_id: String(record_id || ""), place: placeName, date: eventDate });
  } catch { /* ledger */ }
  return eid;
}

export async function unresolvedPlaceMentions(env) {
  await ensurePlaces(env);
  const rows = (await env.DB.prepare("SELECT record_id,title,body FROM records ORDER BY created_utc DESC LIMIT 80").all()).results || [];
  const counts = new Map();
  for (const r of rows) {
    const phrases = candidatePhrases((r.title || "") + "\n" + (r.body || ""), 80);
    const seen = new Set();
    for (const p of phrases) {
      const n = normName(p);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      const hit = await resolveUnique(env, p);
      if (hit) continue;
      const cur = counts.get(n) || { name: p, documents: 0 };
      cur.documents += 1;
      counts.set(n, cur);
    }
  }
  return [...counts.values()].sort((a, b) => b.documents - a.documents).slice(0, 100);
}

export async function historicalStatus(env) {
  await ensureSchema(env);
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n, IFNULL(SUM(feature_count),0) AS f, MIN(NULLIF(valid_from,'')) AS mn, MAX(NULLIF(valid_to,'')) AS mx FROM historical_layers").first();
    const layers = Number(row && row.n) || 0;
    return {
      state: layers ? "READY" : "EMPTY",
      layers,
      features: Number(row && row.f) || 0,
      min_year: row && row.mn ? String(row.mn).slice(0, 4) : "",
      max_year: row && row.mx ? String(row.mx).slice(0, 4) : "",
    };
  } catch {
    return { state: "EMPTY", layers: 0, features: 0, min_year: "", max_year: "" };
  }
}

export async function historicalLayers(env) {
  await ensureSchema(env);
  return (await env.DB.prepare("SELECT layer_id,name,valid_from,valid_to,feature_count,confidence,source_name,license,attribution,source_sha256,created_utc FROM historical_layers ORDER BY created_utc DESC").all()).results || [];
}

function layerActiveOn(layer, dateStr) {
  const d = dateFloor(dateStr);
  if (!d) return false;
  if (layer.valid_from && dateFloor(layer.valid_from) > d) return false;
  if (layer.valid_to && dateCeiling(layer.valid_to) < d) return false;
  return true;
}

function featureActiveOn(props, dateStr, layer) {
  const vf = prop(props, ["valid_from", "start_date", "start", "from", "year_start", "begin"], layer.valid_from);
  const vt = prop(props, ["valid_to", "end_date", "end", "to", "year_end", "finish"], layer.valid_to);
  const d = dateFloor(dateStr);
  if (vf && dateFloor(vf) > d) return false;
  if (vt && dateCeiling(vt) < d) return false;
  return true;
}

export async function historicalGeojson(env, date) {
  await ensureSchema(env);
  const layers = (await env.DB.prepare("SELECT * FROM historical_layers").all()).results || [];
  const features = [];
  const d = String(date || "").trim();
  for (const layer of layers) {
    if (d && !layerActiveOn(layer, d)) continue;
    let fc;
    try { fc = JSON.parse(layer.geojson || "{}"); } catch { continue; }
    for (const f of fc.features || []) {
      if (!f || !f.geometry) continue;
      const p = f.properties || {};
      if (d && !featureActiveOn(p, d, layer)) continue;
      const props = {
        ...p,
        name: p.name || layer.name,
        aziel_layer_id: layer.layer_id,
        source_name: layer.source_name,
        license: layer.license,
        attribution: layer.attribution,
        valid_from: prop(p, ["valid_from", "start_date", "start", "from", "year_start", "begin"], layer.valid_from),
        valid_to: prop(p, ["valid_to", "end_date", "end", "to", "year_end", "finish"], layer.valid_to),
        confidence: p.confidence != null ? p.confidence : layer.confidence,
      };
      features.push({ type: "Feature", properties: props, geometry: f.geometry });
    }
  }
  return { type: "FeatureCollection", date: d, features };
}

export async function importHistorical(env, { filename, bytes }) {
  await ensureSchema(env);
  const name = String(filename || "layer.geojson").toLowerCase();
  let geojsonText = "";
  let manifest = {};
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (name.endsWith(".azh") || (u8.length >= 2 && u8[0] === 0x50 && u8[1] === 0x4b)) {
    const files = unzipEntries(u8);
    const man = zipText(files, "manifest.json");
    if (man) {
      manifest = JSON.parse(man);
      if (manifest.magic && manifest.magic !== "AZIEL_HISTORICAL_GEOGRAPHY_KIT") {
        throw Object.assign(new Error("not an Aziel Historical Geography Kit"), { status: 400 });
      }
    }
    const payloadName = manifest.payload || "layer.geojson";
    geojsonText = zipText(files, payloadName) || zipText(files, "layer.geojson") || zipText(files, "layer.json");
    if (!geojsonText) throw Object.assign(new Error("AZH missing layer.geojson"), { status: 400 });
    if (manifest.payload_sha256) {
      const raw = files[payloadName] || files["layer.geojson"];
      if (raw && sha256hex(raw) !== manifest.payload_sha256) throw Object.assign(new Error("AZH payload hash mismatch"), { status: 400 });
    }
  } else {
    geojsonText = new TextDecoder("utf-8", { fatal: false }).decode(u8);
  }
  if (geojsonText.length > LAYER_CAP) throw Object.assign(new Error("historical layer exceeds 1MB cap"), { status: 400 });
  const fc = JSON.parse(geojsonText);
  if (fc.type !== "FeatureCollection") throw Object.assign(new Error("historical geography import requires a GeoJSON FeatureCollection"), { status: 400 });
  const feats = (fc.features || []).filter((f) => f && f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"));
  if (!feats.length) throw Object.assign(new Error("no Polygon/MultiPolygon features were importable"), { status: 400 });
  let vf = manifest.valid_from || "";
  let vt = manifest.valid_to || "";
  if (!vf && feats[0]) vf = prop(feats[0].properties, ["valid_from", "start_date", "start", "from", "year_start", "begin"], "");
  if (!vt && feats[0]) vt = prop(feats[0].properties, ["valid_to", "end_date", "end", "to", "year_end", "finish"], "");
  const lname = manifest.layer_name || fc.name || String(filename || "layer").replace(/\.[^.]+$/, "");
  const digest = sha256hex(u8);
  let layerId = "AZHGLYR-" + sha256hex([digest, lname, String(vf), String(vt)].join("|")).slice(0, 12).toUpperCase();
  try {
    const hit = await env.DB.prepare("SELECT layer_id FROM historical_layers WHERE layer_id=?").bind(layerId).first();
    if (hit) layerId = layerId + "-" + Date.now().toString(36);
  } catch { /* schema */ }

  const slim = { type: "FeatureCollection", name: lname, features: feats };
  const stored = JSON.stringify(slim);
  if (stored.length > LAYER_CAP) throw Object.assign(new Error("historical layer exceeds 1MB cap"), { status: 400 });
  await env.DB.prepare(
    "INSERT INTO historical_layers(layer_id,name,valid_from,valid_to,feature_count,confidence,source_name,license,attribution,source_sha256,geojson,created_utc) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    layerId, String(lname).slice(0, 200), dateFloor(vf), dateCeiling(vt), feats.length,
    Number(manifest.confidence != null ? manifest.confidence : 1) || 1,
    String(manifest.source_name || lname).slice(0, 200),
    String(manifest.license || "UNSPECIFIED").slice(0, 120),
    String(manifest.attribution || manifest.source_name || lname).slice(0, 400),
    digest, stored, utcNow()
  ).run();
  await appendLedger(env, "HISTORICAL_GEOGRAPHY_IMPORT", { layer_id: layerId, name: lname, features: feats.length, sha256: digest });
  return { layer_id: layerId, name: lname, features: feats.length, source_sha256: digest };
}

export async function corpusTree(env) {
  const rows = (await env.DB.prepare(
    "SELECT record_id,title,library,domain,subjects,author,filename,created_utc FROM records ORDER BY library, IFNULL(domain,''), IFNULL(subjects,''), title LIMIT 800"
  ).all()).results || [];
  const libs = new Map();
  const standalone = [];
  for (const r of rows) {
    const domain = String(r.domain || "").trim();
    const subject = String(r.subjects || "").split(/[,;]/)[0].trim();
    if (!domain && !subject) {
      standalone.push(r);
      continue;
    }
    const lib = String(r.library || "corpus");
    if (!libs.has(lib)) libs.set(lib, new Map());
    const domains = libs.get(lib);
    const dkey = domain || "(no domain)";
    if (!domains.has(dkey)) domains.set(dkey, new Map());
    const subjects = domains.get(dkey);
    const skey = subject || "(no subject)";
    if (!subjects.has(skey)) subjects.set(skey, []);
    subjects.get(skey).push(r);
  }
  return { libraries: libs, standalone };
}

export async function getRecordRow(env, id) {
  if (!env.DB || !id) return null;
  try {
    return await env.DB.prepare(
      "SELECT record_id,title,substr(body,1,4000) AS body,created_by,created_utc,library,filename,content_type,object_key,byte_size,author,domain,subjects,keywords,content_sha256,quarantine_status,review_json,bayesian_posterior,lattice_tip_json,triad_combined,zsolver_json,zsolver_score,zsolver_status,chain_tip,chain_sequence FROM records WHERE record_id=?"
    ).bind(id).first();
  } catch {
    return env.DB.prepare(
      "SELECT record_id,title,substr(body,1,4000) AS body,created_by,created_utc,library,filename,content_type,object_key,byte_size,author,domain,subjects,keywords,content_sha256,quarantine_status,review_json,bayesian_posterior,lattice_tip_json FROM records WHERE record_id=?"
    ).bind(id).first();
  }
}

export async function recordEvents(env, id) {
  try {
    return (await env.DB.prepare("SELECT event_id,event_date,place_name,lat,lon,title,confidence,source,status FROM events WHERE record_id=? ORDER BY event_date").bind(id).all()).results || [];
  } catch {
    return [];
  }
}

export async function mergeKitPlaces(env, places) {
  if (!Array.isArray(places) || !places.length) return 0;
  await ensureSchema(env);
  let n = 0;
  for (const p of places) {
    const name = String(p.name || "").trim();
    if (!name) continue;
    const lat = Number(p.lat); const lon = Number(p.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const alias = normName(name);
    const exists = await env.DB.prepare("SELECT geonameid FROM places WHERE alias_norm=?").bind(alias).first();
    if (exists) continue;
    const gid = Number(p.geonameid) || (2000000000 + parseInt(sha256hex(alias).slice(0, 8), 16) % 1000000000);
    try {
      await env.DB.prepare(
        "INSERT OR IGNORE INTO places(geonameid,name,asciiname,lat,lon,feature_class,feature_code,country_code,admin1,population,alias_norm) VALUES(?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(gid, name, p.asciiname || name, lat, lon, "P", "PPL", p.country_code || "", p.admin1 || "", Number(p.population) || 0, alias).run();
      n += 1;
    } catch { /* ignore */ }
  }
  return n;
}

export function newId(prefix) {
  return prefix + randomBytes(6).toString("hex").toUpperCase();
}

export { GEONAMES_ATTRIBUTION, CITIES, sha256hex, utcNow, LAYER_CAP };
