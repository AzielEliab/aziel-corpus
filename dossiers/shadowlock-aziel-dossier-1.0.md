---
schema: aziel.software-site-dossier.v1
spec: SOFTWARE-SITE-DOSSIER-1.0
slug: shadowlock
kind: software
title: ShadowLock — Aziel dossier
author: Aziel Eliab
version: "1.0"
product_version: 0.2.0
date: 2026-09-12
license: Apache-2.0
library: aziel
domain: "software, research"
subjects: shadowlock aziel dossier
keywords: "aziel-dossier-1.0, Apache-2.0, shadowlock, software, zion:not_applicable"
zion_pattern: not_applicable
identity: Aziel Eliab
person_id: https://www.azieleliab.com/#aziel
runtime_id: https://www.azieleliab.com/runtime#runtime
filename: shadowlock-aziel-dossier-1.0.md
---
# ShadowLock — Aziel dossier

**Author:** Aziel Eliab
**Version:** 1.0 (product 0.2.0)
**Date:** 2026-09-12
**Slug:** `shadowlock`

## License

**Apache-2.0**. Forks welcome and always allowed. Public identity is **Aziel Eliab** only (Aziel Elroi Eliab is `alternateName` / aka only). Publisher of Aziel Digital Library and related software. Person `@id` https://www.azieleliab.com/#aziel. Not scripture concordance entries named Aziel or Eliab.

## Identity

Zero-retention observation of a job list you already have. No OS hook.

### What it is

Zero-retention observation of a job list you already have. No OS hook.

Catalog domain label: **Evidence**.
engine_digest: `0176d18d8517ef02b391821b1fd1ae428591543ea1c812c9785d832714281f61`.

### What it is not

- Not a ~100-file library unpack of the source tree.
- Not a Zenodo DOI mint (deposit_needed is a separate catalog track).

ZionPattern: **not_applicable**. Software / hardware / designs do not qualify for Zion cards.

## Purpose

Read-only zero-retention outcome mirror by Aziel Eliab. Compares a finished job to a class prior. Does not run jobs or store PII.

## Concept

Zero-retention observation of a job list you already have. No OS hook.

## Use cases

- Call via FragGate (list → describe → call) when the slug is live
- Download the counted Worker zip when a /download surface exists
- Cite GitHub + Apache-2.0; forks welcome

## Coding / architecture notes

FragGate is THE single public executable door (fraggate_list → fraggate_describe → fraggate_call). This dossier summarizes identity and surfaces only — it does not paste the repository.

This is a **single** library dossier. Do not unpack the GitHub tree, release tarball, or Worker zip into many shelf files.

README lead (truncated, source only):

> # ShadowLock
>
> Looks at jobs you already finished and compares them to a guess.
> It **OS-hooks into AZ-OS** for process/job observation under ethics policy.
> It does **not** run jobs, save people, or send anything to the internet.
>
> **Author:** Aziel Eliab
> **Date:** July 2026
> **License:** [Apache-2.0](LICENSE)
>
> > Change is optional. Truth is not.
>
> **THIS IS:** a read-only, zero-retention outcome mirror for jobs you already have.
>
> **THIS IS NOT:** a dispatcher, optimizer, scheduler, predictor, people profiler, or truth score.
>
> Paper: DOI [10.5281/zenodo.21435707](https://doi.org/10.5281/zenodo.21435707) · [Zenodo record](https://zenodo.org/records/21435707)
>
> See the spec: [docs/whitepaper.md](docs/whitepaper.md).
> How to contribute: [CONTRIBUTING.md](CONTRIBUTING.md).
>
> **Forks are welcome and always allowed.**
>
> ## Quick start (three steps)
>
> 1. Install: `python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"`
> 2. Open the local page: `shadowlock ui`
> 3. At http://127.0.0.1:8764, tap **Import JSON file** or **Attach via AZ-OS**, then **Show report**. Tap **Export JSON report** to save. Optional check: `shadowlock doctor --verify`.
>
> Loopback only (`127.0.0.1`). No CDN, no telemetry.
>
> ## One-click install

## Surfaces

- **Home:** https://shadowlock-download-tracker.vibelock.workers.dev/
- **GitHub:** https://github.com/AzielEliab/shadowlock
- **Counted /download:** https://shadowlock-download-tracker.vibelock.workers.dev/download
- **MCP:** https://aziel-runtime.vibelock.workers.dev/mcp
- **fraggate/describe:** https://aziel-runtime.vibelock.workers.dev/v1/fraggate/describe?slug=shadowlock

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
