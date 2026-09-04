# v2.1 Redline Audit

## Release blockers found in v2.0

1. `python -m unittest discover` found zero tests because the distributed smoke file was a standalone function rather than a unittest test case.2. Running `python tests/test_smoke.py` from the project directory failed to import `aziel_library` because Python placed the tests directory, not the project root, on `sys.path`.3. Optional OCR/speech tools were described as adapter-ready but ingestion never invoked them.4. Launchers did not acquire optional processors or model/data assets.5. Derived artifact provenance always identified `AZIEL_TEXT_ENGINE`, even when a future external processor would have produced the text.

## v2.1 corrections

- Discoverable executable test suite.- Clean-directory import path validation.- Local Tesseract image OCR adapter.- Poppler + Tesseract scanned-PDF OCR adapter.- FFmpeg + whisper.cpp speech adapter.- OS-aware bootstrap manager and install scripts.- Local model/data cache with per-download SHA-256 receipts.- Processor/model hashes recorded in derived-artifact provenance.- Startup bootstrap is best-effort and cannot prevent the core library from opening.

## Remaining practical constraints


- Package-manager installation can require administrator/sudo approval.- Windows/macOS/Linux package repositories can rename package identifiers in the future; bootstrap failure is non-destructive and `runtime-status` shows what is missing.- First-download authenticity is bounded by HTTPS/upstream trust unless the operator supplies/preserves an independently verified expected hash.- Neural model quality is not guaranteed by successful installation; machine-generated text remains a derived artifact and never alters the original object.
## v2.4.1 UI / upload redline
Release-blocking findings discovered during adversarial browser QA:

1. Missing record IDs closed the connection due to an uncaught KeyError. Fixed with a clean 404.2. Unknown export suffixes were treated as PDF. Fixed with strict format routing.3. Multipart uploads buffered complete media files in memory. Replaced with bounded streaming-to-disk parsing.4. Uploaded originals were indexed under temporary filenames. Fixed by preserving sanitized original basenames.5. Multipart parsing used the policy module rather than policy.default under Python 3.13. Fixed.6. FTS search snippets could render corpus-supplied HTML. Fixed by sentinel highlighting + HTML escaping.7. Temporal-map rendered JavaScript contained an invalid literal newline inside a quoted expression, which could dead-stop the map script. Fixed and Node syntax-checked.8. Historical upload cleanup had inconsistent error/temporary-directory handling during the redline patch. Normalized and retested.

## v2.4.2 UI contract redline
Second-pass findings and fixes:


- Error responses were functionally correct but visually fell through to the generic Python HTTP server error page. Replaced with the application error surface.- Empty search/package tables could appear blank. Added explicit empty states.- Optional OCR/speech bootstrap existed in CLI/install scripts but was not exposed in the Intelligence UI. Added readiness/status cards and a real install/repair form wired to BootstrapManager.- Added route/action contract tests to prevent dead form buttons or JavaScript-only controls from entering a release unnoticed.

## v2.4.3 Final Reliability Pass
A second adversarial pass found and corrected: lack of direct original retrieval in the UI; filename mutation for duplicate multipart names; imprecise multipart delimiter recognition; successful-upload temp batch leakage; large original-download RAM buffering; and a stray empty temporary test file in the package. Regression tests were expanded 

from 13 to 15.

## v2.6.1 OCR completion hotfix
User-reported release blocker: image OCR and scanned-PDF OCR could remain unavailable after the first-run dependency 

workflow reported/recorded an attempt.
Root causes and fixes:

- Windows installs could complete while the running process still saw the pre-install PATH. Processor discovery now checks managed assets, standard install locations, WinGet Links, and WinGet package trees directly.- The first-run marker previously represented an attempted bootstrap, not verified capability. It now records completion only after raster-image and image-only-PDF OCR fixtures both pass end to end.- A failed English tessdata download could leave an empty local tessdata directory that overrode Tesseract's working installation data. Local tessdata is used only when a valid traineddata payload exists, and the runner retries with Tesseract's installed data when needed.- Failed downloads now remove partial files/empty poison directories and the English traineddata path has two official-repository URL forms.- Weak incidental PDF text no longer prevents scanned-PDF OCR; rasterized pages are sorted numerically.- Previously preserved OCR-pending records can be reprocessed from immutable object storage without re-uploading or changing original hashes.- Intelligence UI now exposes OCR self-test, pending count, repair, and reprocess controls.

Certification adds real raster OCR tests for both image and image-only PDF paths, poisoned-local-tessdata fallback, bootstrap completion semantics, and pending-record recovery.

## v2.7.0 review / poison / lattice
Hosted and local ingest now structurally verify every file, score SPRE + CLCE + PhysLing Review, store an unranked Bayesian posterior, and hash-chain quarantine instead of deleting suspected poison. Lattice tips are for AzielTether; the public site is not a mesh. SPRE does not assert criminal guilt.

## v2.6.2 geospatial completion hotfix
The v2.6.1 OCR repair correctly fed extracted text back into entity/event processing, but QA reproduced a separate geography readiness failure: a fresh MASTER did not automatically install a world gazetteer, gazetteer installation did not automatically re-index earlier documents, and the date grammar only recognized ISO-like numeric dates. The launcher baseline, automatic re-index, natural-language date normalization, span-based event pairing, metadata upgrade logic, and OCR-to-map regression tests were added in v2.6.2.
