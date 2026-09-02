# Aziel Corpus Library

Public library of Aziel Eliab software. Search the shelf. Download the printed
468-page corpus PDF and the library package. Counted views and downloads.

**Author:** Aziel Eliab
**Date:** 2 September 2026
**License:** [Apache-2.0](LICENSE)
**Version:** 0.1.0
**Spec:** `aziel-corpus-v0`
**Library:** [https://www.azielcorpuslibrary.net](https://www.azielcorpuslibrary.net)

**Forks are welcome and always allowed.**

## Honest scope

**THIS IS:** a public library index of Aziel Eliab software plus a counted download of the printed 468-page corpus PDF and the library package.

**THIS IS NOT:** a search engine of private files; Zenodo; a new Lock engine. GodLock is a product name in the corpus, not identity. Author Aziel Eliab only.

## One-click install

```bash
curl -fsSL https://www.azielcorpuslibrary.net/install.sh | bash
```

The script curls the **counted** tarball from this project's Worker
(`/download`, User-Agent `Mozilla/5.0`), extracts, makes a venv, and
`pip install -e .`. Then run `aziel-corpus ui`.

## Quick start

```bash
python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"
aziel-corpus ui
aziel-corpus doctor
aziel-corpus search lock
```

Open http://127.0.0.1:8890 (loopback only). No CDN, no telemetry.

Self-check: `aziel-corpus doctor`.

## Counted download (Cloudflare Worker)

**This is the counted download.** GitHub releases exist as a mirror.
The Worker serves the file itself (HTTP 200, no 302 to GitHub).

# → [https://www.azielcorpuslibrary.net](https://www.azielcorpuslibrary.net) ←

Fallback: [https://aziel-corpus-download-tracker.vibelock.workers.dev/](https://aziel-corpus-download-tracker.vibelock.workers.dev/)

- PDF (468 pages): [AZIEL_Corpus_Library_software.pdf](https://www.azielcorpuslibrary.net/download?asset=AZIEL_Corpus_Library_software.pdf)
- Package: [aziel-corpus-0.1.0.tar.gz](https://www.azielcorpuslibrary.net/download?asset=aziel-corpus-0.1.0.tar.gz)
- Live count JSON: [/stats](https://www.azielcorpuslibrary.net/stats)
- OpenAPI: [/openapi.json](https://www.azielcorpuslibrary.net/openapi.json)
- GitHub: [https://github.com/AzielEliab/aziel-corpus](https://github.com/AzielEliab/aziel-corpus)

Isolated counter: Worker `aziel-corpus-download-tracker`, KV `AZIELCORPUS_DOWNLOADS` (`8f512faee6964e4b8a2bdf8e90deec0e`). Not mixed with any other product. `/v1` does not increment downloads.

## CLI

```bash
aziel-corpus ui          # local shelf at http://127.0.0.1:8890
aziel-corpus doctor      # self-check (no network)
aziel-corpus search TEXT
aziel-corpus works
aziel-corpus export FILE.json
aziel-corpus version
```

Local UI: search works, cards, Import JSON file, Export JSON of the works list, doctor. Simple for a sixth grader. Robust for a government desk.

## AI / catalog

Assistants should import the combined catalog OpenAPI, not only this Worker:

- Catalog: https://aziel-runtime.vibelock.workers.dev/
- Combined OpenAPI: https://aziel-runtime.vibelock.workers.dev/openapi.json
- MCP: `POST https://aziel-runtime.vibelock.workers.dev/mcp`
- This product: `GET /p/aziel-corpus/works`, `GET /p/aziel-corpus/search`, `GET /p/aziel-corpus/skill`

Always send `User-Agent: Mozilla/5.0`.

## iPhone & Android

Flutter sources: [`mobile/`](mobile/). Application id `com.azieeliab.azielcorpus`.
Offline library cards. No analytics. Dark matte / gold.
Not a store listing. Not a separate repo.

```bash
cd mobile
flutter create --org com.azieeliab --project-name azielcorpus .
flutter pub get
flutter run
```

## How to cite

Eliab, Aziel. (2026). Aziel Corpus Library [Software]. Apache-2.0. https://www.azielcorpuslibrary.net/

## License

Apache License 2.0. Copyright 2026 Aziel Eliab.
