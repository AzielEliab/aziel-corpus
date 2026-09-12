---
name: Aziel Digital Library
description: Use when an assistant should search the Aziel Digital Library master corpus, check health, review scores, or fetch the counted software zip via hosted /v1 or aziel-runtime.
---

# Aziel Digital Library v2.7.0

Self-contained immutable local digital library and intelligence runtime. Public site is MASTER. Anonymous GET is read-only. Signed-in accounts may ingest. Author: **Aziel Eliab** (aka Aziel Elroi Eliab is `alternateName` only). Person `@id` https://www.azieleliab.com/#aziel. Runtime `@id` https://www.azieleliab.com/runtime#runtime.

**THIS IS:** Aziel Digital Library v2.7.0 (search, records, map, gazetteer, counted zip, poison immunity, PhysLing Review, unranked Bayesian scores, exact-same-subject succession cites). Library Softwares catalog lives at `/software`.

**THIS IS NOT:** a 26-card software index. Not Zenodo. Not Horton. Do not mash Aziel Runtime version + FragGate into Softwares blurbs.

Always send `User-Agent: Mozilla/5.0`.

Compatible AI clients: ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants.

## Call these URLs

- Official site: https://www.azieleliab.com/
- Library: https://www.azielcorpuslibrary.net/
- Softwares: https://www.azielcorpuslibrary.net/software
- Donate: https://www.azielcorpuslibrary.net/donate (same rails https://www.azieleliab.com/donate)
- Runtime root: https://www.azielcorpuslibrary.net/runtime (Aziel Runtime 2.0.0-rc1. FragGate is the single door. Prefer /runtime/*)
- Try on Glama: https://glama.ai/mcp/servers/AzielEliab/aziel-runtime
- FragGate kernel: https://github.com/AzielEliab/fraggate
- GodLock.uk: https://godlock.uk · https://godlock.uk/AzielEliab
- He Didn't Jump: https://www.hedidntjump.com/
- Runtime FragGate list: `GET https://www.azielcorpuslibrary.net/runtime/v1/fraggate/list`
- Runtime FragGate call: `POST https://www.azielcorpuslibrary.net/runtime/v1/fraggate/call`
- Fallback Worker: https://aziel-corpus-download-tracker.vibelock.workers.dev/
- Worker OpenAPI: https://www.azielcorpuslibrary.net/openapi.json
- Runtime OpenAPI: https://www.azielcorpuslibrary.net/runtime/openapi.json
- Alternate origin OpenAPI: https://aziel-runtime.vibelock.workers.dev/openapi.json
- MCP: `POST https://www.azielcorpuslibrary.net/runtime/mcp` (alternate `POST https://aziel-runtime.vibelock.workers.dev/mcp`)
- Runtime skill: `GET https://www.azielcorpuslibrary.net/runtime/v1/skill`
- Runtime manifest: `GET https://www.azielcorpuslibrary.net/runtime/v1/runtime.json`
- Runtime health: `GET https://www.azielcorpuslibrary.net/runtime/v1/health`
- Runtime uses (this door): `GET https://www.azielcorpuslibrary.net/runtime/v1/uses`
- Pull: `GET https://www.azielcorpuslibrary.net/runtime/v1/pull/{slug}`
- Session (advanced/internal): `POST https://www.azielcorpuslibrary.net/runtime/v1/session/open` then `POST .../session/{id}/exec`. Prefer fraggate_call.
- Library skill: `GET https://www.azielcorpuslibrary.net/v1/skill`
- Suite mesh (default off until runtime enable): `GET https://www.azielcorpuslibrary.net/v1/mesh` · `GET https://www.azielcorpuslibrary.net/runtime/v1/mesh` — Live Nodes payload includes the **QNS-CD-1.0** cross-map (photon QNS1 packet transfer). Local `qnsd` is coded in https://github.com/AzielEliab/qnm-node. Runtime cites + catalog field live in https://github.com/AzielEliab/aziel-runtime. AZInterface has pair custody. Hub cite only — not a Softwares-tab product. No public `qnsd` proxy. No Node Gate. Mesh stays default OFF.

Ops (do **not** increment downloads):

- `GET /v1/health`
- `GET /v1/search?q=`
- `GET /v1/example`
- `GET /v1/skill`
- `GET /v1/review?record_id=` (triad + ZionPattern Solver secondary score + succession cites)
- `GET /v1/lattice?record_id=`
- `GET /v1/runtime`
- `GET /v1/runtime.json` (Aziel Runtime 2.0.0-rc1 manifest; distinct from `/v1/runtime`)
- `GET /runtime` (Aziel Runtime page; FragGate is the single door; HEAD + GET return 200)
- `GET /runtime/v1/health`
- `GET /runtime/v1/uses` (this door's API use log; does not increment)
- `GET /runtime/v1/fraggate` and `GET /runtime/v1/fraggate/list`
- `POST /runtime/v1/fraggate/call`
- `GET /runtime/v1/skill`
- `GET /runtime/v1/runtime.json`
- `GET /runtime/v1/pull/{slug}`
- `GET /v1/verify-backfill?all=1` (walk every stored Aziel Library + Corpus record)
- `GET /v1/verify-backfill?rebuild=1` (write already-scored triad/ZionPattern onto packed shelf + tip; bust homepage HTML cache)
- `GET /v1/verify-geo?force=1` / `?status=1` (chunked map pins: paper date × event × geolocation)
- `GET /v1/docs/{hash}/download` (content SHA-256; does not increment)
- `GET /download?hash=` (counted content-hash download)

Catalog aliases: `GET /p/aziel-corpus/health`, `GET /p/aziel-corpus/search`, `GET /p/aziel-corpus/skill`.

MCP tools: `aziel-corpus_health`, `aziel-corpus_search`, `aziel-corpus_skill`.

## Example

```bash
curl -s -A 'Mozilla/5.0' https://www.azielcorpuslibrary.net/v1/health
curl -s -A 'Mozilla/5.0' 'https://www.azielcorpuslibrary.net/v1/search?q=Florence'
curl -s -A 'Mozilla/5.0' https://www.azielcorpuslibrary.net/v1/skill
```

## Local

```bash
curl -fsSL https://www.azielcorpuslibrary.net/install.sh | bash
python3 aziel_launcher.py
```

Local MASTER is writable on http://127.0.0.1:8765. Apache-2.0. Forks welcome.
