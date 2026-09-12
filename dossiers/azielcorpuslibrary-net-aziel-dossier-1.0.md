---
schema: aziel.software-site-dossier.v1
spec: SOFTWARE-SITE-DOSSIER-1.0
slug: azielcorpuslibrary-net
kind: website
title: Aziel Corpus Library — Aziel dossier
author: Aziel Eliab
version: "1.0"
product_version: 1.0
date: 2026-09-12
license: Apache-2.0
library: aziel
domain: "software, research"
subjects: azielcorpuslibrary-net aziel dossier
keywords: "aziel-dossier-1.0, Apache-2.0, azielcorpuslibrary-net, website, zion:not_applicable"
zion_pattern: not_applicable
identity: Aziel Eliab
person_id: https://www.azieleliab.com/#aziel
runtime_id: https://www.azieleliab.com/runtime#runtime
filename: azielcorpuslibrary-net-aziel-dossier-1.0.md
---
# Aziel Corpus Library — Aziel dossier

**Author:** Aziel Eliab
**Version:** 1.0 (product 1.0)
**Date:** 2026-09-12
**Slug:** `azielcorpuslibrary-net`

## License

**Apache-2.0**. Forks welcome and always allowed. Public identity is **Aziel Eliab** only (Aziel Elroi Eliab is `alternateName` / aka only).

## Identity

Public MASTER digital library. Aziel Library is the operator collection; Corpus is the public Lamb Lens shelf.

### What it is

Aziel Digital Library public MASTER (www.azielcorpuslibrary.net). WebSite @id https://www.azielcorpuslibrary.net/#website.

### What it is not

- Not a 26-card software index. Not Zenodo. Not a mesh. Not godlock.uk’s Softwares catalog. Anonymous GET is read-only.
- Not a ~100-file library unpack of the source tree.
- Not a Zenodo DOI mint (deposit_needed is a separate catalog track).

ZionPattern: **not_applicable**. Software / hardware / designs do not qualify for Zion cards.

## Purpose

Search, map, gazetteer, triad scoring, hosted OCR, Ask Jeeves, and counted software zip on one Worker. Operator docs file here (shelf aziel).

Cite / abstract: Public MASTER digital library and intelligence runtime by Aziel Eliab. Aziel Library holds the operator collection; Corpus is the public Lamb Lens shelf. Search, map, gazetteer, triad scoring, and hosted OCR live on this Worker.

## Concept

Immutable originals, append-only ledgers, exact-same-subject succession. Signed-in public writes Corpus; operator writes Aziel Library. Packed library:index:v1 — no KV.list() on the hot path.

## Use cases

- Search and open AZDOC records
- Operator ingest of software/site dossiers (this spec)
- Hosted OCR / transcribe / how-it’s-scored
- Softwares hub for the runtime catalog

## Coding / architecture notes

Cloudflare Worker aziel-corpus-download-tracker. Jeeves and shelf share ingestRecord. FragGate is not this Worker’s exec door; /runtime/* proxies the runtime.

This is a **single** library dossier. Do not unpack the GitHub tree, release tarball, or Worker zip into many shelf files.

README lead (truncated, source only):

> # Aziel Digital Library v2.7.0 - Poison immunity, PhysLing Review, unranked Bayesian scores
>
> This release makes the library's **core runtime independent of third-party Python packages and live services**. It uses Python's standard library for archival storage, hashing, SQLite/FTS search, ZIP-office extraction, baseline PDF text recovery, deterministic similarity vectors, entity indexing, `.azm` model packages, `.azk` knowledge kits, XLSX export and PDF reporting.
>
> ## Websites
>
> Live HTTPS surfaces for this library and the sister engines. Public identity is **Aziel Eliab** only. Also known as Aziel Elroi Eliab (`alternateName` / aka only). No DOIs. Forks welcome. Apache-2.0.
>
> **Part of the Aziel Eliab ecosystem**
>
> - **Official site:** [https://www.azieleliab.com/](https://www.azieleliab.com/) — Person `@id` [https://www.azieleliab.com/#aziel](https://www.azieleliab.com/#aziel)
> - **Aziel Corpus Library (this site):** [https://www.azielcorpuslibrary.net/](https://www.azielcorpuslibrary.net/) — WebSite `@id` [https://www.azielcorpuslibrary.net/#website](https://www.azielcorpuslibrary.net/#website) · name Aziel Corpus Library
> - **Aziel Eliab (library):** [https://www.azielcorpuslibrary.net/AzielEliab](https://www.azielcorpuslibrary.net/AzielEliab)
> - **Softwares:** [https://www.azielcorpuslibrary.net/software](https://www.azielcorpuslibrary.net/software) — library Softwares catalog for aziel-runtime (`GET /v1/software`, fallback `GET /runtime/v1/fraggate/list`). Heading then list. No fixed product cap. Do not mash version + FragGate into Softwares copy.
> - **Donate:** [https://www.azielcorpuslibrary.net/donate](https://www.azielcorpuslibrary.net/donate) — AZL-DONATE-1.0 static door + chrome strip. Same rails [https://www.azieleliab.com/donate](https://www.azieleliab.com/donate). Exodus rails. Does not touch KV. Not a catalog item.
> - **Packed index / tunnel standby:** `GET /v1/search` filters one packed key (`library:index:v1`). Cost savings from packing + cache, not from rationing readers. Humans and crawlers stay uncapped on HTML/search/SEO. `GET /v1/library-index` and `GET /v1/health` (`role=standby`). Design notes: `docs/TUN-WP-0.1.md`, `docs/RL-WP-0.1-library.md`. Worker is standby catalog of truth; cloudflared may be primary later. Not a VPN. Library-scope only — not aziel-runtime, not godlock.uk.
> - **Aziel Runtime (this domain):** [https://www.azielcorpuslibrary.net/runtime](https://www.azielcorpuslibrary.net/runtime) — Aziel Runtime **2.0.0-rc1**. FragGate is the single door (`fraggate_list` → `fraggate_describe` → `fraggate_call`). Prefer `/runtime/*`. Runtime `@id` [https://www.azieleliab.com/runtime#runtime](https://www.azieleliab.com/runtime#runtime)
> - **How it’s scored:** [https://www.azielcorpuslibrary.net/how-its-scored](https://www.azielcorpuslibrary.net/how-its-scored)
> - **GodLock.uk (sister engine):** [https://godlock.uk](https://godlock.uk) — Aziel Eliab tab [https://godlock.uk/AzielEliab](https://godlock.uk/AzielEliab). Softwares on GodLock is GodLock’s own catalog. This repo’s Softwares stays the Digital Library catalog. Do not claim GodLock Softwares mirrors Digital Library completeness.
> - **Aziel Runtime Worker (muted / sameAs):** [https://aziel-runtime.vibelock.workers.dev/](https://aziel-runtime.vibelock.workers.dev/)
> - **Aziel Runtime on GitHub:** [https://github.com/AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime)
> - **Try on Glama:** [https://glama.ai/mcp/servers/AzielEliab/aziel-runtime](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime) — primary Runtime CTA (owner/repo listing; no invented server id)
> - **FragGate kernel:** [https://github.com/AzielEliab/fraggate](https://github.com/AzielEliab/fraggate) (FG-0.1)
> - **Documentation (2.0 pack):** [https://github.com/AzielEliab/aziel-runtime/tree/main/docs/2.0](https://github.com/AzielEliab/aziel-runtime/tree/main/docs/2.0)
>
> ### Compatible AI clients
>
> ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants.
>
> ### GitHub crawl aids
>
> Repo-root [`llms.txt`](llms.txt), [`ai.txt`](ai.txt), and [`docs/cite.example.json`](docs/cite.example.json). Live Worker copies: [llms.txt](https://www.azielcorpuslibrary.net/llms.txt) · [ai.txt](https://www.azielcorpuslibrary.net/ai.txt) · [cite.json](https://www.azielcorpuslibrary.net/cite.json).
>
> ## What “self-contained” means
>
> Once Python 3.11+ and this folder are present, the core library does not need GitHub, Hugging Face, cloud APIs, package registries, or a network connection. Original files are always preserved byte-for-byte in content-addressed object storage.

## Surfaces

- **Home:** https://www.azielcorpuslibrary.net/
- **GitHub:** https://github.com/AzielEliab/aziel-corpus
- **Try on Glama:** https://glama.ai/mcp/servers/AzielEliab/aziel-runtime
- **cite / llms:** https://www.azielcorpuslibrary.net/cite.json

## Related ecosystem links

- Person `@id` https://www.azieleliab.com/#aziel
- Runtime `@id` https://www.azieleliab.com/runtime#runtime
- Official site https://www.azieleliab.com/
- Aziel Corpus Library https://www.azielcorpuslibrary.net/
- GodLock.uk https://godlock.uk/
- He Didn't Jump https://hedidntjump.com/
- Aziel Runtime https://aziel-runtime.vibelock.workers.dev/
- FragGate kernel https://github.com/AzielEliab/fraggate
- Try on Glama https://glama.ai/mcp/servers/AzielEliab/aziel-runtime

Part of the Aziel Eliab ecosystem. Apache-2.0.
