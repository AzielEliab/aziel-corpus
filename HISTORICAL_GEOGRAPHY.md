# Aziel Historical Geographic State — v2.4

The historical geography engine adds source-aware **time × geometry** context to the Temporal Map.

## Design rule

Historical boundaries are interpretations from sources, not silently asserted truth. Multiple layers may overlap for the same date. The runtime preserves each layer's source name, source URL, license, attribution, SHA-256, confidence, and validity period.

## Hosted sheets (azielcorpuslibrary.net)

The public Worker serves four simplified boundary sheets and no others:

| Sheet | File |
| --- | --- |
| 1914 | `workers/download-tracker/public/historical/era-1914.geojson` |
| 1945 | `workers/download-tracker/public/historical/era-1945.geojson` |
| 1994 | `workers/download-tracker/public/historical/era-1994.geojson` |
| 2010 | `workers/download-tracker/public/historical/era-2010.geojson` |

Source: [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps) (GPL-3.0), via the simplified copy in [AzielEliab/4dmap](https://github.com/AzielEliab/4dmap) `fourdmap/static/geo` at `bd7295bafe03ac8bcb09f51d543f0a569fccef29`. Each file is under the 1MB layer cap. Attribution is on `/historical` and on `GET /api/historical`. See `THIRD_PARTY.md`.

`GET /api/historical?date=YYYY` returns the **nearest** of those four sheets. The JSON includes `sheet_year`, `requested_year`, `year_matches_sheet`, and `honesty`. When the requested year is not the sheet year, `honesty` says so. The sheet year is not stretched into a from–to span, and years that were not published are not filled in. Topography is not part of this cut.

`/historical` lists these four sheets with feature counts taken from the files. An empty imported-kit table is not an empty map.

Undated corpus events stay undated. The historical slider does not assign them a year.

`GET /map` does not scan unresolved place phrases before the response. The basemap and event pins are in the first HTML. `/api/historical` and `/api/unresolved` load in the browser after that paint.

## `.azh` — Aziel Historical Geography Kit

`.azh` is a ZIP container with:
- `manifest.json`

- `layer.geojson`

The manifest uses `magic = AZIEL_HISTORICAL_GEOGRAPHY_KIT` and includes the payload SHA-256, layer name, validity period, source metadata, license, attribution, confidence, and description. The payload hash is verified before import.

## GeoJSON properties

Polygon and MultiPolygon features are accepted. The importer recognizes these time aliases:
- start: `valid_from`, `start_date`, `start`, `from`, `year_start`, `begin`

- end: `valid_to`, `end_date`, `end`, `to`, `year_end`, `finish`

Useful feature properties:
- `name`
- `jurisdiction`
- `affiliation`
- `feature_type`

- `confidence`

If feature-level dates are absent, layer-level dates from the `.azh` manifest or CLI are used.

## CLI
```bash
python -m aziel_library.cli --vault ./aziel_library_data historical-status
python -m aziel_library.cli --vault ./aziel_library_data historical-layers
python -m aziel_library.cli --vault ./aziel_library_data historical-import ./layer.azh
python -m aziel_library.cli --vault ./aziel_library_data historical-active 1502
python -m aziel_library.cli --vault ./aziel_library_data historical-context 1502 43.7696 11.2558

```

Build a portable kit from GeoJSON:
```bash
python -m aziel_library.cli --vault ./aziel_library_data historical-build-kit \./renaissance_states.geojson ./renaissance_states.azh \--name "Renaissance States" \--source-name "Source publication or archive" \--source-url "https://example.invalid/source" \--license "SOURCE-LICENSE" \--attribution "Required attribution"

```

## Map behavior

The Temporal Map has a historical-context year slider. On the hosted Worker, moving it requests `GET /api/historical?date=YYYY` after the basemap paints and redraws the nearest bundled sheet. A year that is not 1914, 1945, 1994, or 2010 is labeled as the nearest sheet, not as its own atlas. Imported kits still use their own validity fields. The slider does not change event records, and it does not date an undated event.

Corpus events are separately dated and pinned. For each event, the engine can perform point-in-polygon resolution against every active historical layer and display all matching jurisdictions. Competing layers are kept side by side.

## Preservation
Imported source GeoJSON is copied into `historical_geography/raw/` using a hash-prefixed filename. `.azh` packages are retained under `historical_geography/kits/`. Verification recomputes preserved source SHA-256 hashes.
