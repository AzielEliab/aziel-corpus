# Third-party acquisition boundary

Aziel Digital Library v2.1 does **not** require third-party Python packages for its archival core. Optional OCR/media/speech executables and data may be acquired by the bootstrapper into a local runtime cache or installed through the operating system package manager.

The bootstrapper currently knows how to work with:

- Tesseract OCR + a locally cached English `traineddata` file.- Poppler `pdftoppm` for rendering scanned PDF pages before OCR.- FFmpeg for normalizing audio/video before speech inference.- whisper.cpp v1.9.2 for local speech inference; compatible official Windows/Linux release archives are pinned to their release-published SHA-256 digests, with source-build fallback for other platforms.- A locally cached GGML Whisper model for speech inference.

These components remain third-party works governed by their own licenses. Aziel records download/install receipts and hashes but does not claim ownership of upstream code or model weights. Repackaging or freezing an asset into `.azm` does not erase its upstream license.

The archival originals, Aziel IDs, SQLite corpus, hash ledger, native extraction, deterministic vector index, `.azm`/`.azk` formats, and PDF/XLSX exporters continue to work without those optional processors.

## Historical basemap sheets (1914, 1945, 1994, 2010)

The hosted map ships four simplified GeoJSON sheets, copied byte-for-byte from [AzielEliab/4dmap](https://github.com/AzielEliab/4dmap) `fourdmap/static/geo` at `bd7295bafe03ac8bcb09f51d543f0a569fccef29`:

- `era-1914.geojson`
- `era-1945.geojson`
- `era-1994.geojson`
- `era-2010.geojson`

Upstream is André Ourednik's [historical-basemaps](https://github.com/aourednik/historical-basemaps), **GPL-3.0**. These files stay under that license. They are not relicensed as Apache-2.0. Coordinates were already rounded in the 4dmap copy; this repository does not move them. See `workers/download-tracker/public/historical/SOURCE.txt`.

Only those four sheet years are bundled. A different year is answered with the nearest sheet, and the payload says when the requested year is not the sheet year. This cut does not add topography, satellite, ocean, street, or LiDAR layers, and it does not claim a boundary for every year between the sheets.

## Natural Earth low-resolution world boundaries
Aziel Digital Library v2.2 bundles a compact low-resolution world boundary GeoJSON derived from Natural Earth data 

for the offline temporal-geospatial viewer.Natural Earth describes its map data as public domain and free for use in any type of project. The bundled file is used only as visual geographic context; corpus event coordinates and assertions remain separate provenance-bearing records.Source project: Natural Earth (naturalearthdata.com), 1:110m administrative country boundaries / low-resolution world dataset.

## OCR runtime note (v2.6.1)
Tesseract is used as the local OCR executor and Poppler `pdftoppm` as the scanned-PDF rasterizer when installed. The portable distribution does not claim these executables as Aziel-authored components. Runtime setup records versions and a functional self-test receipt.
