# Aziel Gazetteer Database (AZGDB) v1
The world gazetteer is a local SQLite database at `vault/gazetteers/world_gazetteer.sqlite3`.It is deliberately separate from small `.azk` research kits because a worldwide place-name

index contains millions of aliases and should be queried on disk rather than loaded into RAM.

## Independence model
GeoNames is an acquisition source, not a runtime dependency. The installer downloads the
bulk dump files once, stores the exact raw archives under `vault/gazetteers/raw/`, records
SHA-256 receipts, and converts them into the Aziel schema. Normal lookup and temporal-map

pinning are then fully offline.

## Stable tables
- `places`: canonical feature records and WGS84 coordinates
- `aliases`: canonical, alternate, preferred, short, colloquial, and historic names
- `countries`: country metadata
- `admin1`: first-level administrative names
- `sources`: source URL, SHA-256, bytes, import time, license, attribution

- `metadata`: schema/build/profile state
Historic aliases retain GeoNames `from`/`to` validity periods where provided. The resolver

records both the canonical place and the exact matched alias used by the source document.

## Profiles
- `lite`: `cities1000.zip` + alternate names + country/admin metadata

- `full`: `allCountries.zip` + alternate names + country/admin metadata

Full mode includes all GeoNames feature classes: administrative regions, hydrography,parks/areas, populated places, roads/railroads, spots/buildings, terrain, undersea features,and vegetation features.

## Conservative resolution
The runtime does not guess coordinates. It extracts plausible proper-name phrases, performs
exact normalized alias lookups, ranks candidates using feature type, population, canonical/preferred status, and country/admin context, and only attaches coordinates when ambiguity is

low enough. Ambiguous place mentions remain unresolved for review.

## Attribution
GeoNames geographical data: https://www.geonames.org/ — Creative Commons Attribution 4.0.The source data is provided as-is by GeoNames. Attribution and raw-source hashes are retained

inside each built vault.

## v2.6.2 automatic baseline
The portable MASTER launcher now checks whether the disk-backed gazetteer is READY. If not, it attempts the `lite` GeoNames profile automatically and re-indexes existing records after a successful build. The `full` profile remains available for all GeoNames feature classes and can also be selected at launch with `--gazetteer-profile full` or `AZIEL_GAZETTEER_PROFILE=full`.
