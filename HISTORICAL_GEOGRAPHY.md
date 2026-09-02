# Aziel Historical Geographic State — v2.4

The historical geography engine adds source-aware **time × geometry** context to the Temporal Map.

## Design rule

Historical boundaries are interpretations from sources, not silently asserted truth. Multiple layers may overlap for the same date. The runtime preserves each layer's source name, source URL, license, attribution, SHA-256, confidence, and validity period.

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

The Temporal Map has a historical-context year slider. Moving it requests only the historical features active at that year from the local `/api/historical` endpoint and redraws those polygons without changing event records.

Corpus events are separately dated and pinned. For each event, the engine can perform point-in-polygon resolution against every active historical layer and display all matching jurisdictions. Competing layers are kept side by side.

## Preservation
Imported source GeoJSON is copied into `historical_geography/raw/` using a hash-prefixed filename. `.azh` packages are retained under `historical_geography/kits/`. Verification recomputes preserved source SHA-256 hashes.
