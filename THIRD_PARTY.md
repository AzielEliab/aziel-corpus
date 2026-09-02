# Third-party acquisition boundary

Aziel Digital Library v2.1 does **not** require third-party Python packages for its archival core. Optional OCR/media/speech executables and data may be acquired by the bootstrapper into a local runtime cache or installed through the operating system package manager.

The bootstrapper currently knows how to work with:

- Tesseract OCR + a locally cached English `traineddata` file.- Poppler `pdftoppm` for rendering scanned PDF pages before OCR.- FFmpeg for normalizing audio/video before speech inference.- whisper.cpp v1.9.2 for local speech inference; compatible official Windows/Linux release archives are pinned to their release-published SHA-256 digests, with source-build fallback for other platforms.- A locally cached GGML Whisper model for speech inference.

These components remain third-party works governed by their own licenses. Aziel records download/install receipts and hashes but does not claim ownership of upstream code or model weights. Repackaging or freezing an asset into `.azm` does not erase its upstream license.

The archival originals, Aziel IDs, SQLite corpus, hash ledger, native extraction, deterministic vector index, `.azm`/`.azk` formats, and PDF/XLSX exporters continue to work without those optional processors.

## Natural Earth low-resolution world boundaries
Aziel Digital Library v2.2 bundles a compact low-resolution world boundary GeoJSON derived from Natural Earth data 

for the offline temporal-geospatial viewer.Natural Earth describes its map data as public domain and free for use in any type of project. The bundled file is used only as visual geographic context; corpus event coordinates and assertions remain separate provenance-bearing records.Source project: Natural Earth (naturalearthdata.com), 1:110m administrative country boundaries / low-resolution world dataset.

## OCR runtime note (v2.6.1)
Tesseract is used as the local OCR executor and Poppler `pdftoppm` as the scanned-PDF rasterizer when installed. The portable distribution does not claim these executables as Aziel-authored components. Runtime setup records versions and a functional self-test receipt.
