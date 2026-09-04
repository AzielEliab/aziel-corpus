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
- GET /v1/search?q=&lib=all|aziel|corpus
- GET /v1/review?record_id=  triad composite + SPRE + CLCE + PhysLing + Bayesian (unranked)
- GET /v1/lattice?record_id=  AzielTether tip (site is not a mesh)
- GET /v1/verify-backfill  score unscored records (skip unless force=1)
- GET /v1/document-chain?record_id=  per-document hash-chain
- POST /v1/score  preview review, no write
- POST /v1/jeeves/chat  Ask Jeeves (research assistant)
- POST /v1/jeeves/upload  Corpus only (Lamb Lens)
- POST /transcribe  hosted Whisper; optional VibeLock advisory; lattice receipt always
- POST /ocr  hosted OCR; lattice receipt always
- GET /receipt/{id} and /ledger/{id}  AZDOC- or AZRUN-
- GET /v1/media-run?run_id=
- POST /record/{id}/peer  signed-in endorse / challenge / note
- Counted zip: GET /download HTTP 200, not a 302; structure-verified
- /v1 never increments KV
- Hidden operator account is not listed in HTML or user directories

Author: Aziel Eliab
