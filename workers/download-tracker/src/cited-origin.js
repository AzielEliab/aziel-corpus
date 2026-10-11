/**
 * CITED-ORIGIN-1.0: a document's own cited origin / report location, read from the
 * document text only (never the uploader, created_by, or the upload IP).
 *
 * Statements recognised (in this order of strength):
 *   dateline        "KYIV, Ukraine, Oct. 9 -", "LONDON -", "Paris, 12 March 1871." at the start of the text or a line
 *   written-at      "written at|in X", "composed at X", "dated at X", "signed at X", "given at X", "done at X", "issued at X"
 *   author-location "I am writing from X", "writing from X", "filed from X", "reporting from X", "sent from X", "based in X",
 *                   "from my home in X", "the author lives in X"
 *   cited-origin    "place of origin: X", "place of publication: X", "origin: X", "published in|at X", "printed in|at X"
 * A candidate becomes a pin only when it resolves to exactly one gazetteer place (places table,
 * read-only) and the coordinates pass GEO-PIN-QUALITY-1.0. Otherwise it is listed as unresolved
 * with the reason. Nothing is guessed and nothing is written to D1.
 * Pink (library-aziel-report) = Aziel Library document; dark green (corpus-report) = other corpus document.
 * Author: Aziel Eliab.
 */
import { normName, coordinateLooksReal, PIN_QUALITY_SPEC } from "./geo.js";

export const ORIGIN_SPEC = "CITED-ORIGIN-1.0";
export const ORIGIN_SCAN_CHARS = 12000;
const MONTHS = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?";
const PLACE = "([A-Z][A-Za-z'\\u00C0-\\u017F.-]+(?:[ -][A-Z][A-Za-z'\\u00C0-\\u017F.-]+){0,3})";
const PLACE_CASED = "([A-Z][A-Za-z'\\u00C0-\\u017F.-]+(?:[ -](?:de |la |el |of |upon |on )?[A-Z][A-Za-z'\\u00C0-\\u017F.-]+){0,3})";

const RULES = [
  { method: "dateline", strength: 4, re: new RegExp("(?:^|\\n)\\s*" + PLACE + "(?:,\\s*" + PLACE + ")?(?:,?\\s+(?:" + MONTHS + "\\s+\\d{1,2}|\\d{1,2}\\s+" + MONTHS + ")(?:,?\\s*\\d{4})?)?\\s*(?:\\([^)]{1,30}\\))?\\s*(?:[\\u2014\\u2013]|--|-|:)\\s+\\S", "g") },
  { method: "written-at", strength: 3, re: new RegExp("\\b(?:[Ww]ritten|[Cc]omposed|[Dd]ated|[Ss]igned|[Gg]iven|[Dd]one|[Ii]ssued|[Pp]enned)\\s+(?:at|in)\\s+" + PLACE_CASED, "g") },
  { method: "author-location", strength: 3, re: new RegExp("\\b(?:I am writing from|I'm writing from|[Ww]riting from|[Ff]iled from|[Rr]eporting from|[Ss]ent from|[Bb]ased in|[Ff]rom my home in|[Tt]he author lives in|I live in)\\s+" + PLACE_CASED, "g") },
  { method: "cited-origin", strength: 2, re: new RegExp("\\b(?:[Pp]lace of (?:origin|publication)|[Oo]rigin|[Pp]ublished (?:in|at)|[Pp]rinted (?:in|at))\\s*:?\\s+" + PLACE_CASED, "g") },
];
const STOP = new Set(["the", "a", "an", "this", "that", "it", "he", "she", "they", "we", "i", "chapter", "section", "part", "note", "notes", "abstract", "summary", "introduction", "figure", "table", "page", "volume", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "author", "aziel", "eliab", "aziel eliab", "english", "god", "lord", "christ", "jesus", "full", "edition", "press", "university", "new", "first", "second", "third"]);

/** Pure: candidate origin statements in the text, strongest first, earliest first within a strength. */
export function originCandidates(text) {
  const hay = String(text || "").slice(0, ORIGIN_SCAN_CHARS);
  const out = [];
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(hay)) && out.length < 40) {
      const raw = String(m[1] || "").replace(/[.,;:]+$/, "").trim();
      const qualifier = m[2] ? String(m[2]).replace(/[.,;:]+$/, "").trim() : null;
      const norm = normName(raw);
      if (!norm || norm.length < 3 || STOP.has(norm) || raw.split(/\s+/).length > 4) continue;
      if (rule.method === "dateline" && raw === raw.toUpperCase() && raw.length <= 3) continue; // "AP", "UPI"
      out.push({ method: rule.method, strength: rule.strength, name: raw, qualifier, at: m.index, evidence: hay.slice(Math.max(0, m.index), m.index + 140).replace(/\s+/g, " ").trim() });
    }
  }
  out.sort((a, b) => b.strength - a.strength || a.at - b.at);
  const seen = new Set();
  return out.filter((c) => (seen.has(normName(c.name)) ? false : (seen.add(normName(c.name)), true)));
}

/** Read-only unique gazetteer resolution (no seeding, no writes). */
export async function resolvePlaceReadOnly(env, name, qualifier) {
  const n = normName(name);
  if (!n || !env || !env.DB) return { place: null, reason: "no gazetteer" };
  const rows = (await env.DB.prepare(
    "SELECT * FROM places WHERE alias_norm=? OR lower(name)=? OR lower(asciiname)=? ORDER BY population DESC LIMIT 12"
  ).bind(n, n, n).all()).results || [];
  let pool = rows;
  const ids = new Set(pool.map((r) => r.geonameid));
  if (ids.size > 1 && qualifier) {
    const q = normName(qualifier);
    const narrowed = pool.filter((r) => [r.country_code, r.country, r.admin1, r.country_name].some((v) => v && normName(v) === q));
    if (new Set(narrowed.map((r) => r.geonameid)).size === 1) pool = narrowed;
  }
  const uniq = new Set(pool.map((r) => r.geonameid));
  if (uniq.size === 0) return { place: null, reason: "not in the gazetteer" };
  if (uniq.size > 1) return { place: null, reason: "ambiguous (" + uniq.size + " places share the name)" };
  return { place: pool[0], reason: null };
}

/** Origins for one record: the strongest resolved candidate, plus unresolved reasons. */
export async function citedOriginForRecord(env, row, text) {
  const cands = originCandidates([row.title || "", text || ""].join("\n"));
  const tried = [];
  for (const c of cands.slice(0, 8)) {
    const r = await resolvePlaceReadOnly(env, c.name, c.qualifier);
    if (!r.place) { tried.push({ name: c.name, method: c.method, reason: r.reason }); continue; }
    const lat = Number(r.place.lat ?? r.place.latitude);
    const lon = Number(r.place.lon ?? r.place.longitude);
    if (!coordinateLooksReal(lat, lon)) { tried.push({ name: c.name, method: c.method, reason: "coordinates fail " + PIN_QUALITY_SPEC }); continue; }
    const aziel = String(row.library || "").toLowerCase() === "aziel";
    return {
      record_id: row.record_id,
      title: String(row.title || "").slice(0, 300),
      library: row.library || null,
      pin_type: aziel ? "library-aziel-report" : "corpus-report",
      pin_color: aziel ? "pink" : "darkgreen",
      place_name: r.place.name,
      country_code: r.place.country_code || null,
      geonameid: r.place.geonameid || null,
      lat, lon,
      method: c.method,
      evidence: c.evidence,
      basis: "document text",
      spec: ORIGIN_SPEC,
      quality_spec: PIN_QUALITY_SPEC,
      unresolved: tried,
    };
  }
  return { record_id: row.record_id, library: row.library || null, origin: null, reason: cands.length ? "No candidate resolved to one real gazetteer place." : "The document text states no origin, dateline, or place written.", unresolved: tried };
}
