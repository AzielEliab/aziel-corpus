# External Dependency / Acquisition Policy

Aziel Digital Library's archival core remains standard-library-only. Optional processors are acquired only to create derived text/media artifacts; originals, IDs, hashes, ledger verification, search database, and exports remain usable without them.

## Managed optional processors

- Tesseract: image OCR. The bootstrapper also caches `eng.traineddata` locally.- Poppler `pdftoppm`: renders scanned PDF pages for local OCR.- FFmpeg: normalizes audio/video into 16 kHz mono WAV.- whisper.cpp: local speech inference. A Whisper GGML model is cached under `runtime_assets/models/whisper`.

## Acquisition behavior

`python -m aziel_library.bootstrap --profile recommended --auto` detects the OS and uses an available OS package manager for binary executables. Downloadable model/data assets are stored under `runtime_assets`, SHA-256 hashed, and recorded in a timestamped JSON receipt. Existing assets are never silently replaced.

Network acquisition is a bootstrap convenience, not a runtime requirement. After assets are present, disconnecting the machine does not stop the archival core or locally available processors.

### Trust boundary

HTTPS download + recorded SHA-256 is **trust-on-first-use**, not a cryptographic proof of upstream authorship. For evidentiary/research deployments, review the first receipt and freeze the approved assets to independent storage. Future changes can then be compared against the approved hash.

## v2.6.1 OCR completion rule

OCR setup is not accepted based only on package-manager return codes or executable discovery. Aziel runs a bundled raster-image fixture through Tesseract and a bundled image-only PDF through Poppler + Tesseract. Only a passing end-to-end result is recorded as verified.
If the optional local `eng.traineddata` mirror cannot be downloaded, Aziel does **not** point Tesseract at an empty runtime tessdata directory. It falls back to the language data supplied by the installed Tesseract distribution and relies on the self-test as the final authority.
