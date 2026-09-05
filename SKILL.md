---
name: Aziel Digital Library
description: Use when an assistant should search the Aziel Digital Library master corpus, check health, review scores, or fetch the counted software zip via hosted /v1 or aziel-runtime.
---

# Aziel Digital Library v2.7.0

Self-contained immutable local digital library and intelligence runtime. Public site is MASTER. Anonymous GET is read-only. Signed-in accounts may ingest. Author: **Aziel Eliab**.

**THIS IS:** Aziel Digital Library v2.7.0 (search, records, map, gazetteer, counted zip, poison immunity, PhysLing Review, unranked Bayesian scores, exact-same-subject succession cites).

**THIS IS NOT:** a 26-card software index. Not Zenodo. Not Horton.

Always send `User-Agent: Mozilla/5.0`.

## Call these URLs

- Library: https://www.azielcorpuslibrary.net/
- Runtime root: https://www.azielcorpuslibrary.net/runtime (aziel-runtime 1.3.0 engine-runtime; prefer /runtime/*)
- Fallback Worker: https://aziel-corpus-download-tracker.vibelock.workers.dev/
- Worker OpenAPI: https://www.azielcorpuslibrary.net/openapi.json
- Runtime OpenAPI: https://www.azielcorpuslibrary.net/runtime/openapi.json
- Catalog OpenAPI: https://aziel-runtime.vibelock.workers.dev/openapi.json
- MCP: `POST https://www.azielcorpuslibrary.net/runtime/mcp` (origin `POST https://aziel-runtime.vibelock.workers.dev/mcp`)
- Runtime skill: `GET https://www.azielcorpuslibrary.net/runtime/v1/skill`
- Runtime manifest: `GET https://www.azielcorpuslibrary.net/runtime/v1/runtime.json`
- Runtime health: `GET https://www.azielcorpuslibrary.net/runtime/v1/health`
- Session: `POST https://www.azielcorpuslibrary.net/runtime/v1/session/open` then `POST .../session/{id}/exec` (proxy is not exec)
- Pull: `GET https://www.azielcorpuslibrary.net/runtime/v1/pull/{slug}`
- Library skill: `GET https://www.azielcorpuslibrary.net/v1/skill`

Ops (do **not** increment downloads):

- `GET /v1/health`
- `GET /v1/search?q=`
- `GET /v1/example`
- `GET /v1/skill`
- `GET /v1/review?record_id=` (triad + ZionPattern Solver secondary score + succession cites)
- `GET /v1/lattice?record_id=`
- `GET /v1/runtime`
- `GET /v1/runtime.json` (aziel-runtime 1.3.0 engine-runtime manifest; distinct from `/v1/runtime`)
- `GET /runtime` (AI runtime root page; HEAD + GET return 200)
- `GET /runtime/v1/health`
- `GET /runtime/v1/skill`
- `GET /runtime/v1/runtime.json`
- `POST /runtime/v1/session/open` and `POST /runtime/v1/session/{id}/exec`
- `GET /runtime/v1/pull/{slug}`
- `GET /v1/verify-backfill?all=1` (walk every stored Aziel Library + Corpus record)
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
