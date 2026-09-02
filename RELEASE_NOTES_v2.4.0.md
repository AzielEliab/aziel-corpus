# Release Notes — v2.4.0 Historical Geographic State

## Added

- Source-aware temporal Polygon/MultiPolygon database.- New `.azh` Aziel Historical Geography Kit format.- SHA-256 verified/preserved historical source layers.- Year-validity indexing for boundaries, jurisdictions, affiliations, and labels.- Point-in-polygon event context resolution by event date.- Multiple overlapping/competing historical layers without destructive merging.- Built-in Historical Geography browser page.- Temporal Map historical-context year slider.- Local `/api/historical?date=YYYY` map endpoint.- Historical Context and Historical Layers XLSX sheets.- Historical geography sections in PDF preservation reports.- CLI import, status, active-layer, point-context, and kit-builder commands.- Historical layer/source counts in corpus health.- Historical source verification in the master Verify operation.

## Validation
The automated suite includes a deterministic temporal-state fixture where the same coordinate resolves to one jurisdiction in 1502 and another in 1510. `.azh` export/import round-trip, event context, XLSX/PDF export, and source verification are included.
