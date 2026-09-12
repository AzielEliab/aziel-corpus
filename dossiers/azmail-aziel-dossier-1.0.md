---
schema: aziel.software-site-dossier.v1
spec: SOFTWARE-SITE-DOSSIER-1.0
slug: azmail
kind: software
title: AZMail — Aziel dossier
author: Aziel Eliab
version: "1.0"
product_version: 0.1.0
date: 2026-09-12
license: Apache-2.0
library: aziel
domain: "software, research"
subjects: azmail aziel dossier
keywords: "aziel-dossier-1.0, Apache-2.0, azmail, software, zion:not_applicable"
zion_pattern: not_applicable
identity: Aziel Eliab
person_id: https://www.azieleliab.com/#aziel
runtime_id: https://www.azieleliab.com/runtime#runtime
filename: azmail-aziel-dossier-1.0.md
---
# AZMail — Aziel dossier

**Author:** Aziel Eliab
**Version:** 1.0 (product 0.1.0)
**Date:** 2026-09-12
**Slug:** `azmail`

## License

**Apache-2.0**. Forks welcome and always allowed. Public identity is **Aziel Eliab** only (Aziel Elroi Eliab is `alternateName` / aka only).

## Identity

AZMail (APP 1.0): advisory airlock + local isolate mailbox + anonymous mesh (default off). Not a full internet MTA. FragGate only.

### What it is

AZMail (APP 1.0): advisory airlock + local isolate mailbox + anonymous mesh (default off). Not a full internet MTA. FragGate only.

Catalog domain label: **Comms**.
engine_digest: `830f4a545b6ef223ec943de8ab0bbba5a5b9667630de6b552567c3f7253f1207`.

### What it is not

- Not a full internet MTA.
- Not a ~100-file library unpack of the source tree.
- Not a Zenodo DOI mint (deposit_needed is a separate catalog track).

ZionPattern: **not_applicable**. Software / hardware / designs do not qualify for Zion cards.

## Purpose

AZMail (APP 1.0): advisory airlock + local isolate mailbox + anonymous mesh (default off). Not a full internet MTA. FragGate only.

## Concept

AZMail (APP 1.0): advisory airlock + local isolate mailbox + anonymous mesh (default off). Not a full internet MTA. FragGate only.

## Use cases

- Call via FragGate (list → describe → call) when the slug is live
- Download the counted Worker zip when a /download surface exists
- Cite GitHub + Apache-2.0; forks welcome

## Coding / architecture notes

FragGate is THE single public executable door (fraggate_list → fraggate_describe → fraggate_call). This dossier summarizes identity and surfaces only — it does not paste the repository.

This is a **single** library dossier. Do not unpack the GitHub tree, release tarball, or Worker zip into many shelf files.

README lead (truncated, source only):

> # AZMail
>
> Open-source **anti-phishing Mail Airlock** — APP 1.0. No message is
> trusted until verified across identity, origin, structure, and behavior.
>
> **Author:** Aziel Eliab only
> **Date:** September 2026 · APP 1.0 / product v0.1.0
> **License:** [Apache-2.0](LICENSE)
>
> > Standalone software. Optional cross-links only. No hard dependency on
> > AZ-OS, Lumen, or a separate “interface” product.
>
> See the spec: [docs/whitepaper.md](docs/whitepaper.md).
> Mesh contract: [docs/mesh.md](docs/mesh.md).
> How to contribute: [CONTRIBUTING.md](CONTRIBUTING.md).
>
> **Forks are welcome and always allowed.**
>
> ## Honest scope (read this)
>
> v0.1 is a **local airlock + compose + mesh client helpers**. It is **not**
> a public MTA. It does **not** send internet email. Hosted
> `/v1/airlock_classify` (leftover alias `/v1/classify`) and `/v1/scrub`
> are advisory demos and are not stored. `/v1/fraggate/*` and `/v1/mesh/*` PROXY to
> aziel-runtime via the `AZIEL_RUNTIME` service binding. Suite QNM is
> default OFF (live|locked|isolated). Product-local leftover ring is
> `POST /v1/mesh_disable`, not `/v1/mesh/*`.
> **QNS-CD-1.0** (photon QNS1 packet transfer) is a hub cite / Worker mesh
> cross-map on `workers/download-tracker/src/mesh.js` — not a
> Softwares-tab product and not a public `qnsd` proxy. Local `qnsd` is
> coded in [qnm-node](https://github.com/AzielEliab/qnm-node). Runtime
> cites + catalog field live in
> [aziel-runtime](https://github.com/AzielEliab/aziel-runtime). Pair
> custody is [AZInterface](https://github.com/AzielEliab/azinterface).
> Anonymous mesh chat and mail ops run via
> [aziel-runtime](https://github.com/AzielEliab/aziel-runtime) FragGate

## Surfaces

- **Home:** https://azmail-download-tracker.vibelock.workers.dev/
- **GitHub:** https://github.com/AzielEliab/azmail
- **Counted /download:** https://azmail-download-tracker.vibelock.workers.dev/download
- **MCP:** https://aziel-runtime.vibelock.workers.dev/mcp
- **fraggate/describe:** https://aziel-runtime.vibelock.workers.dev/v1/fraggate/describe?slug=azmail

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
