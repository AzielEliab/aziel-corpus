# Aziel Digital Library v2.6.2 - Historical Geographic State + Self-Contained Intelligence Runtime

This release makes the library's **core runtime independent of third-party Python packages and live services**. It uses Python's standard library for archival storage, hashing, SQLite/FTS search, ZIP-office extraction, baseline PDF text recovery, deterministic similarity vectors, entity indexing, `.azm` model packages, `.azk` knowledge kits, XLSX export and PDF reporting.

## What “self-contained” means

Once Python 3.11+ and this folder are present, the core library does not need GitHub, Hugging Face, cloud APIs, package registries, or a network connection. Original files are always preserved byte-for-byte in content-addressed object storage.

Advanced OCR, speech recognition, handwriting recognition and neural vision **still require trained weights**. v2 defines the permanent Aziel package/runtime boundary for those weights so they can be stored locally as `.azm` packages and later executed by native Aziel executors. The architecture no longer depends on an upstream model registry.

## Start

Windows: double-click `START_AZIEL_WINDOWS.bat` (the legacy `run_windows.bat` delegates to it).

macOS/Linux:
```bash
chmod +x START_AZIEL_MAC_LINUX.sh
./START_AZIEL_MAC_LINUX.sh

```
The launcher opens the local browser automatically. It prefers http://127.0.0.1:8765 and selects another local port 

if needed.

## Core guarantees

- SHA-256 content-addressed original object store.- Append-only hash-chained activity ledger.- Permanent AZDOC and AZWORK identifiers.- Never-overwrite work/version model.- Derived artifacts separately hashed and tied to processor/model metadata.- Search across title + extracted in-document text + subjects + entities.- Evidence-based tree; weakly connected material stays standalone.- Deterministic `AZIEL_HASH_VECTOR_V1` relationship engine.- Local `.azm` model and `.azk` knowledge-kit installers with manifest/payload verification.- Dependency-free XLSX and PDF exporters.

## Native package formats

See `FORMAT_SPEC.md`. In short:
- `.azm` = Aziel Model Package

- `.azk` = Aziel Knowledge Kit

Both are ordinary ZIP containers with canonical `manifest.json`, `integrity.json`, and hashed payloads. The format is deliberately simple enough to reimplement decades from now.

## Build your own local kit/model
Run:
```bash
python build_examples.py

```

This creates a working entity/gazetteer `.azk` kit and a small locally-trained subject-classifier `.azm` model. Install them through the Intelligence page or CLI:
```bash

python -m aziel_library.cli --vault ./my_library install ./examples/generated/aziel_demo_entities.azk python -m aziel_library.cli --vault ./my_library install ./examples/generated/aziel_demo_subjects.azm```

## Important limitation

The core archive/index remains dependency-free, but image and scanned-PDF OCR use locally installed Tesseract and Poppler when available. The master launcher attempts to install/verify those processors and does not declare OCR complete until bundled raster fixtures pass. If OCR is unavailable, originals are still preserved and marked `OCR_NOT_READY_IMAGE` or `OCR_NOT_READY_SCANNED_PDF`; they can later be reprocessed from immutable storage. Audio/video transcription remains an optional FFmpeg + whisper.cpp processor.

## Freeze an external/local model into our format

If you have a legally usable trained model folder, preserve the entire folder in one verifiable Aziel package:
```bash

python freeze_model_folder.py ./my_model ./my_model.azm --id my.ocr.v1 --type OCR_TENSOR_BUNDLE --version 1.0.0```


Every source file becomes a separately hashed payload. This removes dependence on the original download location. It does **not** magically make an unsupported architecture executable; the corresponding Aziel executor must exist, and the original asset license must still be honored.

## Automatic optional-engine bootstrap

Run `python -m aziel_library.bootstrap --profile recommended --auto`, or use the supplied install scripts. The bootstrapper detects and installs/caches optional OCR/media/speech necessities when possible, hashes downloaded assets, and records receipts under `runtime_assets/receipts`. Run `python -m aziel_library.cli --vault ./aziel_library_data runtime-status` to inspect readiness.

Ingestion now automatically uses locally available processors in this order: native extraction first; Tesseract for images; Poppler + Tesseract for scanned PDFs; FFmpeg + whisper.cpp for audio/video. Machine outputs are derived artifacts and never replace originals. See `DEPENDENCY_POLICY.md` and `REDLINE_AUDIT.md`.

## Temporal–Geospatial map (v2.2)

Open **Temporal Map** in the browser UI. The viewer is local/offline, uses a bundled low-resolution Natural Earth basemap, supports pan/zoom and temporal/confidence filtering, and auto-pins conservative `date × place` events when the recognized place has archived coordinates. Unresolved place names remain visible for review rather than being guessed. Manual events can also be added and linked to an AZDOC source ID.


See `TEMPORAL_MAP.md` for event provenance rules.

## World Gazetteer and temporal map

Open **Gazetteer** in the browser or run:
```bash
python -m aziel_library.cli --vault ./aziel_library_data gazetteer-install --profile full
python -m aziel_library.cli --vault ./aziel_library_data gazetteer-reindex

```


The full profile downloads GeoNames bulk dumps once, preserves the raw downloads and their SHA-256 receipts, converts them to the disk-backed Aziel Gazetteer Database, and thereafter resolves place names entirely offline. `lite` uses the cities1000 subset. AlternateNamesV2 is imported by default, including historic-name and from/to fields where present. See `GAZETTEER_FORMAT.md`.

## Historical geographic state (v2.4)


Open **Historical Geography** to install source-aware temporal boundary layers, then use the **Historical context year** slider on Temporal Map. The map redraws Polygon/MultiPolygon features valid at the selected date and preserves competing source layers rather than merging disagreements. Event pins can be contextualized against all active historical jurisdictions at their own event date. Portable historical layers use the hashed `.azh` format. See `HISTORICAL_GEOGRAPHY.md`.

## Master / public mirror
The same application has two explicit modes. `master` is writable and contains all administrative/ingestion controls. `mirror` is read-only at both HTTP and SQLite layers and is the mode intended for a public domain. Publish snapshots 

from the master with the built-in Publish Mirror page or the `publish-mirror` CLI command.

## Massive ingestion


Use the Mass Ingest browser page for thousands of remote files/folders. For extremely large local trees use `bulk-ingest`, which walks directories incrementally and rebuilds the relationship graph once at completion.

## Geospatial event reliability (v2.6.2)
The private MASTER launcher now verifies that a disk-backed world gazetteer is usable. If none is READY, it automatically attempts the `lite` baseline and, after a successful build, re-indexes all existing records 

incrementally. Document event extraction accepts ISO dates and ordinary prose dates such as `September 10, 2025`, `10 September 2025`, and `September 2025`. OCR-derived text follows the same event pipeline. Same-sentence date/place pairs are high-confidence events; nearby pairs caused by OCR/layout line breaks are retained as REVIEW events instead of being silently lost.

Use `--gazetteer-profile full` or `AZIEL_GAZETTEER_PROFILE=full` if you want the first-run launcher to build the full-feature gazetteer instead of the default Lite city baseline.

## OCR reliability (v2.6.1)
Image and scanned-PDF OCR are not considered ready merely because executables exist. On first master launch, Aziel verifies Tesseract against a bundled raster image and verifies Poppler + Tesseract against a bundled image-only PDF. If either test fails, setup remains incomplete and can be repaired from **Intelligence**. Files already preserved 
while OCR was unavailable appear under **Pending OCR** and can be reprocessed from their immutable originals without re-uploading them.
