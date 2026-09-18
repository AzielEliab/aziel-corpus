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
- GET /software: Softwares heading then list only (Software → Gate → Lock). Live product cards from packed/cached aziel-runtime `GET /v1/software` (prefer service binding AZIEL_RUNTIME; do not block SSR on a slow origin). SEO abstract leads. Distribution: Try on Glama is the primary Runtime CTA (owner/repo listing — no invented server id); Source on GitHub; Documentation (docs/2.0); Official Runtime Worker stays a muted text link at aziel-runtime.vibelock.workers.dev (online via AZIEL_RUNTIME binding — not the hero CTA). Mirrors the Softwares-tab catalog; no hard-coded 27 cap. Door extras AZNet, FragGate, and EmbryoLock stay on the HTML hub. FragGate and mesh are extras[] only on `GET /v1/software` (not products[]). Softwares extra AZCoherence (Plain, scoring-review; peer AZ-CLCE; not a second door). Softwares extra Trades-Runtime (Plain, local-first BYO field-trades; own MCP host; not a FragGate-exec engine; live_backends false; count URL is `/v1/stats`). Sort Software A–Z → Gate A–Z → Lock A–Z (Clock is not Lock). AZNet is Plain. Stats on this tab read packed `library:index:v1` (no `KV.list()`). Remain-OFF untouched.
- GET /download and GET /v1/download: counted Softwares zip (streamed HTTP 200) or honest 2xx descriptor when the asset is missing. Catalog `download_url` is `/download`.
- GET /donate: AZL-DONATE-1.0 static Donate door + chrome strip. Exodus rails (BTC/ETH/LTC/XRP/DOGE/SOL/TRX). Copy, open-in-wallet, solid black-on-white PNG payment-URI QR. Does not touch KV. Not a catalog item.
- GET /record/{record_id}/metadata.json and GET /record/{record_id}.json: public Schema.org discovery sidecar (no auth). Stored with the paper package as `{library}/{AZDOC}/JSONAZDOC-….json` and mirrored under `.Json/`. JSON-prefixed document_ledger receipts copy the paper lattice and never rewrite paper `chain_tip`.
- GET /sitemap-records.xml: record HTML + metadata.json + `.json` alias URLs (linked from sitemap-index.xml).
- GET /v1/metadata-backfill: idempotent sidecar backfill for every existing AZDOC. Repeat until `done:true`. `?all=1` walks remaining, `?force=1` restarts, `?status=1` progress. Cron and request walks also continue.
- GET /v1/library-index: packed shelf cards (`library:index:v1`). One KV get + Cache-Control. No PDF bodies. Cards include `metadata_url`.
- GET /v1/search: filters packed `library:index:v1` in memory (one KV get). AZDOC cards: id, title, shelf, content_sha256, chain_tip, triad_display, zsolver_display (omitted when ZionPattern is not_applicable). Also returns `records_packed` / `records_aziel` / `records_corpus`. ChainLock library-sync client. `Cache-Control: public, s-maxage=120, stale-while-revalidate=3600`.
- GET /v1/health: standby / tunnel-primary failover fields (`role=standby`, `index_sha256`, `records_packed`). File counts come from packed `library:index:v1` (same numbers the homepage / Aziel Library / Corpus chrome show). See `docs/TUN-WP-0.1.md` and `docs/RL-WP-0.1-library.md`.
- Public read paths: uncapped for normal humans and SEO crawlers. Cost cut is packed `library:index:v1` + Cache-Control (no `KV.list()`). Soft 429 only on extreme write/walk API fan-out. Operator token uncapped. Not a Node Gate. Not a VPN.
- GET/HEAD /runtime: Aziel Runtime 2.0.0-rc1 SEO shell (cite/pull live /v1/health version; fallback 2.0.0-rc1). Abstract leads. Changelog/version below. Distribution: Try on Glama is the primary Runtime CTA (owner/repo listing — no invented server id); Source on GitHub; Documentation (docs/2.0); Official Runtime Worker stays a muted text link (online via AZIEL_RUNTIME binding — not the hero CTA). 41 live advisory engines; VeilLock local_only; stubs refuse. SoT LIVE main 6a3798a / version_id 105fa1ee. Prefer /runtime/*. Remain-OFF untouched. GET /v1/mesh never enables.
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
- GET /v1/mesh and /runtime/v1/mesh  suite node mesh status (read-only QNM ON; Live Nodes · N while mesh on). Payload cites CROSS-NETWORK-SURVIVAL-1.0 (umbrella: bytes↔hash on independent shelves; crawlers are extra shelves, not resurrection) over MESH-SPLIT-WIRES-1.0 / MESH-COLD-COPY-1.0 / die-with-pull / MESH-REEXPAND-1.0 / MESH-REHEAL-1.0, plus NO-LIE-NO-REWRITE-1.0 (network never lies to stay alive; no rewrite key; cites live lockset AZLOCK-INGEST-REEXPAND-1.0) and QNS-CD-1.0 (photon QNS1 packet transfer) as a hub / Worker mesh cross-map: local qnsd in https://github.com/AzielEliab/qnm-node, runtime cites in https://github.com/AzielEliab/aziel-runtime, pair custody in AZInterface. Not a Softwares-tab product. No public qnsd proxy. No Node Gate. Disable is refused. GET /v1/mesh never enables radios.
- GET /shelves · /cold-copy · /v1/shelves  COLD-MULTI-SHELF-1.0 planes A/B/C (A = one CF/GitHub tunnel, 5 surfaces / 2 family radii; B = alt independent forge/archive tip-pack SLOT — Codeberg / archive.org / Framagit; archive.org items aziel-lockset-tip + aziel-lockset-tip_202609 same blast_radius, not two shelves; Zenodo refused CNS-ZENODO-IP-BAN; GitFlic refused CNS-GITFLIC-EMAIL; GitLab extra CNS-GITLAB-CF-LOOP; C = USB airgap SLOT + RESTORE-DRILL schema). Extra E/F/G SLOTs stay url-null. Honest live|slot|refused. FoldLock neighbor cite + SLOT hook (FOLDLOCK-SHELF-1.0): not zip, not encryption; never fold the lockset tip. No invented CIDs or tip DOI. Not AZ-GEN live ICANN publish.
- GET /v1/verify-backfill  score unscored records (skip unless force=1)
- GET /v1/verify-backfill?rebuild=1  chunked tip reconcile (default 25, max 50, ~4s budget). Returns JSON immediately with `done` + `next_cursor` + `packed_refresh`. Packed `library:index:v1` + homepage HTML cache refresh runs in `waitUntil` after the response. **After Worker deploy**, repeat until `done:true`. Resume with `?cursor=` or keep hitting `?rebuild=1`. `?all=1` stays time-bounded. `?force=1` restarts. `?status=1` reports shelf cursor progress. This path does not start the per-request background backfill walk.
- GET /v1/verify-geo?force=1 / ?status=1  chunked paper-date × event × geolocation pins (never upload time)
- GET /v1/document-chain?record_id=  per-document hash-chain
- POST /v1/score  preview review, no write
- POST /v1/jeeves/chat  Ask Jeeves (research assistant)
- POST /v1/jeeves/upload  same ingest/score path as the shelf (public → Corpus; operator → Aziel Library)
- POST /v1/operator/library-ingest  operator token/session only; Aziel Library; one-file software/site dossiers (SOFTWARE-SITE-DOSSIER-1.0)
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

## Deploy (operator box)

This Worker is `aziel-corpus-download-tracker` (`wrangler.toml`). Softwares extras, `/cite.json`, `/llms.txt`, `/ai.txt`, and `/.well-known/mcp.json` are generated in-process — deploy this Worker for the library host to show Trades-Runtime.

```bash
cd workers/download-tracker
npx wrangler whoami
npx wrangler deploy
```

Secrets stay in Wrangler (`OPERATOR_TOKEN` / `GATE_TOKEN` / `LIBRARY_OPERATOR_TOKEN`). Do not commit tokens. After deploy, confirm machine surfaces only:

- `GET https://www.azielcorpuslibrary.net/v1/software` includes `trades-runtime` with github + download + mcp
- `GET https://www.azielcorpuslibrary.net/cite.json` has `trades_runtime` / `github_trades_runtime`
- `GET https://www.azielcorpuslibrary.net/llms.txt` cites Trades-Runtime
- `GET https://www.azielcorpuslibrary.net/.well-known/mcp.json` lists `trades-runtime` MCP
- Homepage / About / who-is HTML stay unchanged (no new human chrome)

The product giveaway Worker (`trades-runtime.vibelock.workers.dev`) is a separate deploy. GitHub Pages for `AzielEliab/trades-runtime` stay off.
