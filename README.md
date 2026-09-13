# Aziel Digital Library v2.7.0 - Poison immunity, PhysLing Review, unranked Bayesian scores

This release makes the library's **core runtime independent of third-party Python packages and live services**. It uses Python's standard library for archival storage, hashing, SQLite/FTS search, ZIP-office extraction, baseline PDF text recovery, deterministic similarity vectors, entity indexing, `.azm` model packages, `.azk` knowledge kits, XLSX export and PDF reporting.

## Websites

Live HTTPS surfaces for this library and the sister engines. Public identity is **Aziel Eliab** only — publisher of **Aziel Digital Library** on this site, plus Aziel Runtime, FragGate, GodLock, and related software. Also known as Aziel Elroi Eliab (`alternateName` / aka only). Not scripture concordance entries named Aziel or Eliab. No DOIs. Forks welcome. Apache-2.0.

One-file Softwares/site dossiers (SOFTWARE-SITE-DOSSIER-1.0): `docs/SOFTWARE-SITE-DOSSIER-1.0.md`, generated under `dossiers/`. Operator ingest: `POST /v1/operator/library-ingest` (Aziel Library shelf). Not a tarball unpack.

**Part of the Aziel Eliab ecosystem**

- **Official site:** [https://www.azieleliab.com/](https://www.azieleliab.com/) — Person `@id` [https://www.azieleliab.com/#aziel](https://www.azieleliab.com/#aziel)
- **Aziel Corpus Library (this site):** [https://www.azielcorpuslibrary.net/](https://www.azielcorpuslibrary.net/) — WebSite `@id` [https://www.azielcorpuslibrary.net/#website](https://www.azielcorpuslibrary.net/#website) · name Aziel Corpus Library
- **Aziel Eliab (library):** [https://www.azielcorpuslibrary.net/AzielEliab](https://www.azielcorpuslibrary.net/AzielEliab)
- **Softwares:** [https://www.azielcorpuslibrary.net/software](https://www.azielcorpuslibrary.net/software) — library Softwares catalog for aziel-runtime (`GET /v1/software`, fallback `GET /runtime/v1/fraggate/list`). Heading then list. No fixed product cap. Do not mash version + FragGate into Softwares copy.
- **Donate:** [https://www.azielcorpuslibrary.net/donate](https://www.azielcorpuslibrary.net/donate) — AZL-DONATE-1.0 static door + chrome strip. Same rails [https://www.azieleliab.com/donate](https://www.azieleliab.com/donate). Exodus rails. Does not touch KV. Not a catalog item.
- **Packed index / tunnel standby:** `GET /v1/search` filters one packed key (`library:index:v1`). Cost savings from packing + cache, not from rationing readers. Humans and crawlers stay uncapped on HTML/search/SEO. `GET /v1/library-index` and `GET /v1/health` (`role=standby`). Design notes: `docs/TUN-WP-0.1.md`, `docs/RL-WP-0.1-library.md`. Worker is standby catalog of truth; cloudflared may be primary later. Not a VPN. Library-scope only — not aziel-runtime, not godlock.uk.
- **Aziel Runtime (this domain):** [https://www.azielcorpuslibrary.net/runtime](https://www.azielcorpuslibrary.net/runtime) — Aziel Runtime **2.0.0-rc1**. FragGate is the single door (`fraggate_list` → `fraggate_describe` → `fraggate_call`). Prefer `/runtime/*`. Runtime `@id` [https://www.azieleliab.com/runtime#runtime](https://www.azieleliab.com/runtime#runtime)
- **How it’s scored:** [https://www.azielcorpuslibrary.net/how-its-scored](https://www.azielcorpuslibrary.net/how-its-scored)
- **GodLock.uk (sister engine):** [https://godlock.uk](https://godlock.uk) — Aziel Eliab tab [https://godlock.uk/AzielEliab](https://godlock.uk/AzielEliab). Softwares on GodLock is GodLock’s own catalog. This repo’s Softwares stays the Digital Library catalog. Do not claim GodLock Softwares mirrors Digital Library completeness.
- **He Didn't Jump (sister archive):** [https://www.hedidntjump.com/](https://www.hedidntjump.com/) — An Aziel Eliab Project. Not a Softwares-tab product.
- **Aziel Runtime Worker (muted / sameAs):** [https://aziel-runtime.vibelock.workers.dev/](https://aziel-runtime.vibelock.workers.dev/)
- **Aziel Runtime on GitHub:** [https://github.com/AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime)
- **Try on Glama:** [https://glama.ai/mcp/servers/AzielEliab/aziel-runtime](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime) — primary Runtime CTA (owner/repo listing; no invented server id)
- **FragGate kernel:** [https://github.com/AzielEliab/fraggate](https://github.com/AzielEliab/fraggate) (FG-0.1)
- **Documentation (2.0 pack):** [https://github.com/AzielEliab/aziel-runtime/tree/main/docs/2.0](https://github.com/AzielEliab/aziel-runtime/tree/main/docs/2.0)

### Compatible AI clients

ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants.

### GitHub crawl aids

Repo-root [`llms.txt`](llms.txt), [`ai.txt`](ai.txt), and [`docs/cite.example.json`](docs/cite.example.json). Live Worker copies: [llms.txt](https://www.azielcorpuslibrary.net/llms.txt) · [ai.txt](https://www.azielcorpuslibrary.net/ai.txt) · [cite.json](https://www.azielcorpuslibrary.net/cite.json).

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

## Review, poison immunity, and lattice (v2.7.0)
Every upload and download hashes and structurally verifies every file in the record or package, then re-scores with SPRE, a CLCE port (or live AZ-CLCE `/v1/score`), and **PhysLing Review (PLR)**. Suspected poison (official narrative without independent evidence, non-evidence advocacy, contradictory-only shells) is quarantined on the hash-chain — never silently deleted. A Bayesian posterior is stored as **unranked** metadata for manual peer-to-peer review and is never used to sort the shelf. Verified ingest emits an AzielTether lattice tip. The live HTTPS site is not a mesh. Suite Live Nodes (`GET /v1/mesh`, `GET /runtime/v1/mesh`) are read-only QNM ON. Disable is refused. Those payloads cite **QNS-CD-1.0** (photon QNS1 packet transfer) as a hub / Worker mesh cross-map only — local `qnsd` is coded in [qnm-node](https://github.com/AzielEliab/qnm-node); runtime cites + catalog field live in [aziel-runtime](https://github.com/AzielEliab/aziel-runtime); [AZInterface](https://github.com/AzielEliab/azinterface) has pair custody. Not a Softwares-tab product. No public `qnsd` proxy. No Node Gate. See `REVIEW.md`.

## Geospatial event reliability (v2.6.2)
The private MASTER launcher now verifies that a disk-backed world gazetteer is usable. If none is READY, it automatically attempts the `lite` baseline and, after a successful build, re-indexes all existing records 

incrementally. Document event extraction accepts ISO dates and ordinary prose dates such as `September 10, 2025`, `10 September 2025`, and `September 2025`. OCR-derived text follows the same event pipeline. Same-sentence date/place pairs are high-confidence events; nearby pairs caused by OCR/layout line breaks are retained as REVIEW events instead of being silently lost.

Use `--gazetteer-profile full` or `AZIEL_GAZETTEER_PROFILE=full` if you want the first-run launcher to build the full-feature gazetteer instead of the default Lite city baseline.

## OCR reliability (v2.6.1)
Image and scanned-PDF OCR are not considered ready merely because executables exist. On first master launch, Aziel verifies Tesseract against a bundled raster image and verifies Poppler + Tesseract against a bundled image-only PDF. If either test fails, setup remains incomplete and can be repaired from **Intelligence**. Files already preserved 
while OCR was unavailable appear under **Pending OCR** and can be reprocessed from their immutable originals without re-uploading them.
