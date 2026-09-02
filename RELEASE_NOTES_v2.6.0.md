# Aziel Digital Library v2.6.0 — Master / Public Mirror + Mass Ingest
## Master / mirror architecture

- `master` mode is private and writable.- `mirror` mode is public/read-only. Every POST mutation route is rejected with HTTP 403.- Mirror databases are opened through SQLite `mode=ro`; the restriction is below the UI layer.- Public UI removes ingestion, package installation, gazetteer rebuild, historical-layer install, event creation, and processor bootstrap controls.- Master workstation `original_path` values are removed from published mirror databases.- Preserved originals remain downloadable from the mirror by immutable AZDOC record.
## Snapshot publishing

Use the master UI **Publish Mirror** page or:

    python -m aziel_library.cli --vault /path/to/master publish-mirror /path/to/public-mirror

Publishing synchronizes immutable objects before atomically replacing the public database. This prevents a refreshed mirror database from referencing original files that have not arrived yet. A `mirror_manifest.json` receipt records publication time, corpus counts, source ledger head, database hash, and frozen public export hashes.
## Massive ingestion

The **Mass Ingest** page supports multi-file and whole-folder selection. Each file is sent as an independent streaming request, with bounded concurrency, per-file status, failure retry, and a single relationship-graph rebuild after the batch.

For very large local holdings, use streaming recursive traversal without materializing the entire file list:

    python -m aziel_library.cli --vault /path/to/master bulk-ingest /path/to/research
## Public exports
Mirror visitors can download the XLSX corpus index and PDF preservation report frozen at publication time. Requests do not write to the mirror.
