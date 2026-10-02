/**
 * Four public historical boundary sheets.
 * Copied byte-for-byte from AzielEliab/4dmap fourdmap/static/geo
 * at bd7295bafe03ac8bcb09f51d543f0a569fccef29.
 * Upstream: aourednik/historical-basemaps (GPL-3.0).
 * Years are sheet years, not invented validity spans.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const LAYER_CAP_BYTES = 1024 * 1024;
export const BUNDLED_YEARS = Object.freeze([1914, 1945, 1994, 2010]);
export const SOURCE_NAME = "aourednik/historical-basemaps";
export const SOURCE_URL = "https://github.com/aourednik/historical-basemaps";
export const SOURCE_LICENSE = "GPL-3.0";
export const COPIED_FROM = "AzielEliab/4dmap fourdmap/static/geo @ bd7295bafe03ac8bcb09f51d543f0a569fccef29";
export const BUNDLED_NOTE = "Bundled sheets are 1914, 1945, 1994, and 2010 only. Another year uses the nearest of those sheets and says when it is not that sheet. Not topography. Not a survey.";
export const BUNDLED_COVERAGE_NOTE = "Four public sheet years only: 1914, 1945, 1994, 2010. Not every year between them. Not topography.";
export const ATTRIBUTION = SOURCE_NAME + " (" + SOURCE_LICENSE + ") " + SOURCE_URL
  + " — simplified offline subset copied from " + COPIED_FROM
  + ". Coordinates were already rounded in that copy. Not a survey. Not topography.";

/** Measured from the copied files. Tests recompute sha256, bytes, and feature counts. */
export const BUNDLED_ERAS = Object.freeze([
  Object.freeze({ year: 1914, file: "era-1914.geojson", name: "world_1914", feature_count: 177, bytes: 519651, sha256: "2670886f3454a501a599623cd90442912c36949128aa0e2fec5727b694450550" }),
  Object.freeze({ year: 1945, file: "era-1945.geojson", name: "world_1945", feature_count: 227, bytes: 547582, sha256: "1f9762590de1503001d5eafd6049bbaa82d8bbe42eaeec9d10c5fc35638e4c7c" }),
  Object.freeze({ year: 1994, file: "era-1994.geojson", name: "world_1994", feature_count: 240, bytes: 640336, sha256: "df5e3413d5cb225642aaa858a72f7b27c11c21d256a0c71043f8d01ed17b1fd4" }),
  Object.freeze({ year: 2010, file: "era-2010.geojson", name: "world_2010", feature_count: 240, bytes: 641027, sha256: "48c955b683d1a0d242e79e691d3ff29d7b466536d0d7968c6d7d35ab84451be2" }),
]);

const ERA_DIR = join(dirname(fileURLToPath(import.meta.url)), "../public/historical");
const eraByYear = new Map(BUNDLED_ERAS.map((era) => [era.year, era]));
const collectionCache = new Map();

export function bundledFeatureTotal() {
  return BUNDLED_ERAS.reduce((sum, era) => sum + era.feature_count, 0);
}

export function bundledLayerRows() {
  return BUNDLED_ERAS.map((era) => ({
    layer_id: "AZHGLYR-ERA-" + era.year,
    name: era.name,
    valid_from: String(era.year),
    valid_to: String(era.year),
    feature_count: era.feature_count,
    confidence: null,
    confidence_label: "estimate — not a survey",
    source_name: SOURCE_NAME,
    license: SOURCE_LICENSE,
    attribution: ATTRIBUTION,
    source_url: SOURCE_URL,
    source_sha256: era.sha256,
    sheet_year: era.year,
    bundled: true,
    created_utc: "",
  }));
}

export function parseSheetYear(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(-?\d{1,6})(?:-\d{2}(?:-\d{2})?)?$/);
  if (m) return Number(m[1]);
  m = s.match(/\b(\d{1,6})\s*(BCE|BC)\b/i);
  if (m) return -Number(m[1]);
  m = s.match(/\b(\d{3,4})\b/);
  if (m) return Number(m[1]);
  return null;
}

/** Same nearest-sheet rule as 4dmap globe.js nearestEra. Equal distance keeps the earlier sheet. */
export function nearestBundledEra(year) {
  const y = Number(year);
  return BUNDLED_YEARS.reduce((best, item) => (Math.abs(item - y) < Math.abs(best - y) ? item : best), BUNDLED_YEARS[0]);
}

export function eraHonesty(requestedYear, sheetYear) {
  const requested = Number(requestedYear);
  const sheet = Number(sheetYear);
  const match = requested === sheet;
  const source = "Source: aourednik/historical-basemaps, simplified offline subset.";
  const estimate = "estimated borders; source year " + sheet + ".";
  const coarse = "These lines are a coarse public estimate, not a surveyed boundary. Not topography.";
  const honesty = match
    ? estimate + " " + coarse + " " + source
    : "No bundled borders for " + requested + ". nearest public borders: " + sheet + ". " + estimate + " " + coarse + " " + source;
  return {
    requested_year: requested,
    sheet_year: sheet,
    nearest_era: sheet,
    year_matches_sheet: match,
    honesty,
  };
}

function eraPath(file) {
  return join(ERA_DIR, file);
}

async function readEraText(env, file) {
  if (env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
    try {
      const res = await env.ASSETS.fetch(new Request("https://azielcorpuslibrary.net/historical/" + file));
      if (res && res.ok) return await res.text();
    } catch { /* tests and local runs use the file copy */ }
  }
  return readFile(eraPath(file), "utf8");
}

export async function loadBundledEraCollection(env, year) {
  const sheet = Number(year);
  const era = eraByYear.get(sheet);
  if (!era) {
    const err = new Error("no bundled sheet for " + year);
    err.status = 404;
    throw err;
  }
  if (collectionCache.has(sheet)) return { era, collection: collectionCache.get(sheet) };
  const text = await readEraText(env, era.file);
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > LAYER_CAP_BYTES) {
    const err = new Error("historical layer exceeds 1MB cap");
    err.status = 400;
    throw err;
  }
  const collection = JSON.parse(text);
  if (Number(collection.year) !== sheet) {
    const err = new Error("bundled era file year does not match the sheet catalog");
    err.status = 500;
    throw err;
  }
  collectionCache.set(sheet, collection);
  return { era, collection };
}

export function mapBundledFeature(feature, honesty) {
  const props = (feature && feature.properties) || {};
  const sourceName = typeof props.NAME === "string" ? props.NAME.trim() : "";
  const sheet = honesty.sheet_year;
  return {
    type: "Feature",
    properties: {
      NAME: sourceName,
      name: sourceName || "unnamed in source",
      name_in_source: !!sourceName,
      sheet_year: sheet,
      requested_year: honesty.requested_year,
      year_matches_sheet: honesty.year_matches_sheet,
      honesty: honesty.year_matches_sheet ? "" : honesty.honesty,
      aziel_layer_id: "AZHGLYR-ERA-" + sheet,
      source_name: SOURCE_NAME,
      source_url: SOURCE_URL,
      license: SOURCE_LICENSE,
      attribution: ATTRIBUTION,
      valid_from: String(sheet),
      valid_to: String(sheet),
      bundled: true,
    },
    geometry: feature.geometry,
  };
}

export function fileSha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

export function eraFilePath(file) {
  return eraPath(file);
}
