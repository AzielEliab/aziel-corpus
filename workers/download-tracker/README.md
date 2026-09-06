# Aziel Digital Library public MASTER Worker

Worker name: aziel-corpus-download-tracker

Custom domains: www.azielcorpuslibrary.net and azielcorpuslibrary.net

- Anonymous GET: search both libraries, records, map, gazetteer, originals, health, counted zip
- Operator files always go to Aziel Library (`library=aziel`)
- Signed-in non-operator files always go to corpus (`library=corpus`)
- POST /aziel-library: operator multipart file upload
- POST /ingest: signed-in users (not operator); optional file + title/notes
- GET /file/{record_id}: every record downloadable (text or file), HTTP 200, including quarantined
- GET /download?record=AZDOC-…: counted + ledger-linked document download
- GET /download?hash=SHA-256 and GET /v1/docs/{hash}/download: serve the kept file for that content hash (duplicates are not deleted)
- GET /v1/runtime: package/runtime version 2.7.0 for catalog discovery
- GET/HEAD /runtime: aziel-runtime 1.6.2 FragGate door (not a second software index). 26 live advisory engines; VeilLock local_only; stubs refuse. Prefer /runtime/*.
- GET/HEAD /runtime/*: same-origin proxy to aziel-runtime (service binding AZIEL_RUNTIME, else workers.dev alternate). Fallbacks for /v1/skill, /v1/runtime.json, /v1/pull/{slug}
- GET /runtime/v1/health: proxied origin health (version 1.6.2, door=fraggate)
- GET /runtime/v1/uses: local API use log for this /runtime door (DOWNLOADS KV prefix runtime_uses|; does not increment)
- GET /runtime/v1/fraggate and /runtime/v1/fraggate/list; POST /runtime/v1/fraggate/call
- POST /runtime/mcp: thin FragGate MCP door
- POST /runtime/v1/session/open and /runtime/v1/session/{id}/exec: advanced/internal (prefer fraggate_call)
- GET /v1/runtime.json: aziel-runtime manifest alias (distinct from /v1/runtime)
- GET /v1/search?q=&lib=all|aziel|corpus
- GET /v1/review?record_id=  triad composite + SPRE + CLCE + PhysLing + Bayesian (unranked)
- GET /v1/lattice?record_id=  AzielTether tip (site is not a mesh)
- GET /v1/verify-backfill  score unscored records (skip unless force=1)
- GET /v1/verify-geo?force=1 / ?status=1  chunked paper-date × event × geolocation pins (never upload time)
- GET /v1/document-chain?record_id=  per-document hash-chain
- POST /v1/score  preview review, no write
- POST /v1/jeeves/chat  Ask Jeeves (research assistant)
- POST /v1/jeeves/upload  same ingest/score path as the shelf (public → Corpus; operator → Aziel Library)
- POST /transcribe  hosted Whisper + mandatory VibeLock determination; hard A/V blocks (HTTP 451)
- GET /media/{sha256}  inline playback of allowed A/V only (blocked media is never stored)
- POST /ocr  hosted OCR; lattice receipt always
- GET /receipt/{id} and /ledger/{id}  AZDOC- or AZRUN-
- GET /v1/media-run?run_id=
- POST /record/{id}/peer  signed-in endorse / challenge / note
- Counted zip: GET /download HTTP 200, not a 302; structure-verified
- /v1 never increments KV
- Hidden operator account is not listed in HTML or user directories

Author: Aziel Eliab
