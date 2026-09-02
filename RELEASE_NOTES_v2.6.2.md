# Aziel Digital Library v2.6.2 — Geospatial Event Completion Hotfix

This release closes the document-to-map gap found after v2.6.1.
## Fixed

- MASTER first-run launcher now verifies a usable world gazetteer and automatically builds the `lite` baseline when none is ready. Set `AZIEL_GAZETTEER_PROFILE=full` or use `--gazetteer-profile full` for full-feature geography.- Installing/rebuilding a gazetteer automatically re-indexes already-ingested records; a second manual re-index click is no longer required.- Date extraction now recognizes ISO dates plus normal prose forms such as `September 10, 2025`, `10 September 2025`, and `September 2025`.- OCR-derived text is explicitly regression-tested through the full date + place -> coordinates -> AZEVT map-pin path.- Event pairing now uses actual date/place character spans. Same-sentence pairs remain high confidence; nearby OCR/layout-wrap pairs are retained as REVIEW events rather than discarded.- Place metadata can be upgraded during re-index when a later gazetteer pass resolves coordinates that were not available during original ingest.- Fresh-run geography bootstrap creates its runtime log directory before writing receipts.
## Preservation behavior
Original documents and scans remain immutable. Geography re-indexing changes derived mentions/events only. Existing manual events are preserved.
