# Aziel Digital Library public MASTER Worker

Worker name: aziel-corpus-download-tracker

Custom domains: www.azielcorpuslibrary.net and azielcorpuslibrary.net

- Anonymous GET: search both libraries, records, map, gazetteer, originals, health, counted zip
- Operator files always go to Aziel Library (`library=aziel`)
- Signed-in non-operator files always go to corpus (`library=corpus`)
- POST /aziel-library: operator multipart file upload
- POST /ingest: signed-in users (not operator); optional file + title/notes
- GET /file/{record_id}: public file
- GET /v1/search?q=&lib=all|aziel|corpus
- Counted zip: GET /download HTTP 200, not a 302
- /v1 never increments KV
- Hidden operator account is not listed in HTML or user directories

Author: Aziel Eliab
