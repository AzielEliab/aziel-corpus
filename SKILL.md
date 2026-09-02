---
name: Aziel Corpus Library
description: Use when an assistant should look up Aziel Eliab software in the public library index, list works, search works, or fetch the counted corpus PDF / package via hosted /v1 or aziel-runtime.
---

# Aziel Corpus Library

Public library of Aziel Eliab software. Counted views and downloads. Author: **Aziel Eliab**.

**THIS IS:** a public library index of Aziel Eliab software plus a counted download of the printed 468-page corpus PDF and the library package.

**THIS IS NOT:** a search engine of private files. Not Zenodo. Not a new Lock engine. GodLock is a product name in the corpus, not identity.

Always send `User-Agent: Mozilla/5.0`. Cloudflare Workers may 403 an empty agent.

## Call these URLs

- Library: https://www.azielcorpuslibrary.net/
- Fallback Worker: https://aziel-corpus-download-tracker.vibelock.workers.dev/
- Worker OpenAPI: https://www.azielcorpuslibrary.net/openapi.json
- Catalog OpenAPI: https://aziel-runtime.vibelock.workers.dev/openapi.json
- MCP: `POST https://aziel-runtime.vibelock.workers.dev/mcp`
- Live skill (this markdown): `GET https://www.azielcorpuslibrary.net/v1/skill`

Ops (do **not** increment downloads or views):

- `GET /v1/health`
- `GET /v1/works` — JSON list of indexed works
- `GET /v1/search?q=` — search works
- `GET /v1/example` — sample search payload
- `GET /v1/skill` — this file

Catalog aliases: `GET /p/aziel-corpus/health`, `GET /p/aziel-corpus/works`, `GET /p/aziel-corpus/search`, `GET /p/aziel-corpus/skill`.

MCP tools: `aziel-corpus_health`, `aziel-corpus_works`, `aziel-corpus_search`, `aziel-corpus_skill`.

Grok: import OpenAPI as a custom tool. ChatGPT: GPT Actions. Venice: HTTP tools.

## Example

```bash
curl -s -A 'Mozilla/5.0' https://www.azielcorpuslibrary.net/v1/health
curl -s -A 'Mozilla/5.0' https://www.azielcorpuslibrary.net/v1/works
curl -s -A 'Mozilla/5.0' 'https://www.azielcorpuslibrary.net/v1/search?q=lock'
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/p/aziel-corpus/skill
```

## Local (after one-click install)

```bash
curl -fsSL https://www.azielcorpuslibrary.net/install.sh | bash
aziel-corpus ui
aziel-corpus doctor
aziel-corpus search lock
```

Local UI: Import JSON file and Export JSON of the works list. Loopback http://127.0.0.1:8890. Apache-2.0. Forks welcome.
