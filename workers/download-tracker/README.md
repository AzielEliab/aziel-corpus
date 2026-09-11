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
- GET /software: Softwares heading then list only (Software → Gate → Lock). Live product cards from packed/cached aziel-runtime `GET /v1/software` (prefer service binding AZIEL_RUNTIME; do not block SSR on a slow origin). SEO abstract leads. Distribution buttons: Official Runtime, Source on GitHub, Try/Deploy on Glama (owner/repo listing — no invented server id), Documentation (docs/2.0). Mirrors the Softwares-tab catalog; no hard-coded 27 cap. Door extras AZNet, FragGate, and EmbryoLock stay on the HTML hub. FragGate and mesh are extras[] only on `GET /v1/software` (not products[]). Softwares extra AZCoherence (Plain, scoring-review; peer AZ-CLCE; not a second door). Sort Software A–Z → Gate A–Z → Lock A–Z (Clock is not Lock). AZNet is Plain. Stats on this tab read packed `library:index:v1` (no `KV.list()`). Remain-OFF untouched.
- GET /download and GET /v1/download: counted Softwares zip (streamed HTTP 200) or honest 2xx descriptor when the asset is missing. Catalog `download_url` is `/download`.
- GET /donate: AZL-DONATE-1.0 static Donate door + chrome strip. Exodus rails (BTC/ETH/LTC/XRP/DOGE/SOL/TRX). Copy, open-in-wallet, solid black-on-white PNG payment-URI QR. Does not touch KV. Not a catalog item.
- GET /v1/library-index: packed shelf cards (`library:index:v1`). One KV get + Cache-Control. No PDF bodies.
- GET /v1/search: filters packed `library:index:v1` in memory (one KV get). AZDOC cards: id, title, shelf, content_sha256, chain_tip. ChainLock library-sync client. `Cache-Control: public, s-maxage=120, stale-while-revalidate=3600`.
- GET /v1/health: standby / tunnel-primary failover fields (`role=standby`, `index_sha256`). See `docs/TUN-WP-0.1.md` and `docs/RL-WP-0.1-library.md`.
- Public read paths: uncapped for normal humans and SEO crawlers. Cost cut is packed `library:index:v1` + Cache-Control (no `KV.list()`). Soft 429 only on extreme write/walk API fan-out. Operator token uncapped. Not a Node Gate. Not a VPN.
- GET/HEAD /runtime: Aziel Runtime 2.0.0-rc1 SEO shell (cite/pull live /v1/health version; fallback 2.0.0-rc1). Abstract leads. Changelog/version below. Distribution: Official Runtime, Source on GitHub, Try/Deploy on Glama (owner/repo listing — no invented server id), Documentation (docs/2.0). 37 live advisory engines; VeilLock local_only; stubs refuse. Prefer /runtime/*. Remain-OFF untouched. GET /v1/mesh never enables.
- GET/HEAD /runtime/*: same-origin proxy to aziel-runtime (service binding AZIEL_RUNTIME, else workers.dev alternate). Fallbacks for /v1/skill, /v1/runtime.json, /v1/pull/{slug}
- GET /runtime/v1/health: proxied origin health (live version 2.0.0-rc1, door=fraggate, count=37)
- GET /runtime/v1/uses: local API use log for this /runtime door (DOWNLOADS KV prefix runtime_uses|; does not increment)
- GET /runtime/v1/fraggate and /runtime/v1/fraggate/list; POST /runtime/v1/fraggate/call
- POST /runtime/mcp: thin FragGate MCP door
- POST /runtime/v1/session/open and /runtime/v1/session/{id}/exec: advanced/internal (prefer fraggate_call)
- GET /v1/runtime.json: aziel-runtime manifest alias (distinct from /v1/runtime)
- GET /v1/search?q=&lib=all|aziel|corpus
- GET /v1/review?record_id=  triad composite + SPRE + CLCE + PhysLing + Bayesian (unranked)
- GET /v1/lattice?record_id=  AzielTether tip (site is not a mesh)
- GET /v1/mesh and /runtime/v1/mesh  suite node mesh status (default off until aziel-runtime enable; Live Nodes empty while off). Payload cites QNS-CD-1.0 (photon QNS1 packet transfer) as a hub / Worker mesh cross-map: local qnsd in https://github.com/AzielEliab/qnm-node, runtime cites in https://github.com/AzielEliab/aziel-runtime, pair custody in AZInterface. Not a Softwares-tab product. No public qnsd proxy. No Node Gate.
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
