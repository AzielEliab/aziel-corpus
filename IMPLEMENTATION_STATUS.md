# Implementation Status — v2.7.0
## Production paths implemented

- Private writable MASTER mode.- Public READ-ONLY MIRROR mode with server-side POST rejection and SQLite read-only connections.- Sanitized incremental mirror snapshot publication with SHA-256 manifest.- Published XLSX/PDF snapshot downloads without mirror writes.- Preserved-original download from mirror.- Resilient browser mass-ingest queue with folder selection, streaming per-file uploads, bounded concurrency, retry, and single batch finalization.- Streaming recursive CLI bulk ingestion for very large local folder trees.- Full-text search, corpus hierarchy, temporal map, historical geography, world gazetteer, immutable originals, provenance ledger, evidence/claims/notebook structures, integrity verification, and local intelligence adapters.- Full-structure verify on upload and download; SPRE + CLCE + PhysLing Review; poison quarantine (hash-chained, never silent delete); unranked Bayesian peer score; AzielTether lattice tip; peer endorse/challenge append-only.
- Hosted Whisper transcription with **mandatory VibeLock determination**. Hard blocks for porn, nudity, and child-sexual content (never stored, never playable, HTTP 451). Allowed A/V at `/media/{sha256}`.
## Deployment note

Use a real TLS/reverse proxy in front of the read-only mirror when attaching a public domain. The writable master should remain bound to localhost/private infrastructure.

## v2.6.1 OCR completion gate
Image OCR and scanned-PDF OCR now have an executable end-to-end self-test. Bootstrap completion is contingent on the OCR fixtures being read correctly, not merely on executable discovery. Previously pending scans can be reprocessed 

from immutable originals.

## v2.6.2 geospatial completion gate
- MASTER launcher automatically attempts a Lite world gazetteer when no READY resolver exists.- Successful gazetteer builds automatically re-index existing records incrementally.- Natural prose dates are normalized for temporal events.- OCR text is regression-tested through temporal-geospatial event creation.- Event pairing uses actual date/place spans with high-confidence same-sentence and REVIEW near-context modes.
