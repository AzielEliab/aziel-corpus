---
schema: aziel.software-site-dossier.v1
spec: SOFTWARE-SITE-DOSSIER-1.0
slug: embryolock
kind: software
title: EmbryoLock — Aziel dossier
author: Aziel Eliab
version: "1.0"
product_version: 1.2.0
date: 2026-09-12
license: Apache-2.0
library: aziel
domain: "software, research"
subjects: embryolock aziel dossier
keywords: "aziel-dossier-1.0, Apache-2.0, embryolock, software, zion:not_applicable"
zion_pattern: not_applicable
identity: Aziel Eliab
person_id: https://www.azieleliab.com/#aziel
runtime_id: https://www.azieleliab.com/runtime#runtime
filename: embryolock-aziel-dossier-1.0.md
---
# EmbryoLock — Aziel dossier

**Author:** Aziel Eliab
**Version:** 1.0 (product 1.2.0)
**Date:** 2026-09-12
**Slug:** `embryolock`

## License

**Apache-2.0**. Forks welcome and always allowed. Public identity is **Aziel Eliab** only (Aziel Elroi Eliab is `alternateName` / aka only).

## Identity

Offline destructive-over-recovery vault. Cite live on FragGate; wipe/unlock stay local-only. Never execute on the public mesh.

### What it is

Offline destructive-over-recovery vault. Cite live on FragGate; wipe/unlock stay local-only. Never execute on the public mesh.

Catalog domain label: **Vault/Custody**.
engine_digest: `bc7f6119a4bf6910b5be50cabe19bf4a2e35ac60408b5713e94878bd4e0074f3`.

### What it is not

- Not a ~100-file library unpack of the source tree.
- Not a Zenodo DOI mint (deposit_needed is a separate catalog track).

ZionPattern: **not_applicable**. Software / hardware / designs do not qualify for Zion cards.

## Purpose

EmbryoLock is Aziel Eliab software: a local destructive-by-design file vault in Vault/Custody. Hosted Worker is human UI + counted download. Wipe/scorch never execute on the public mesh.

## Concept

Offline destructive-over-recovery vault. Cite live on FragGate; wipe/unlock stay local-only. Never execute on the public mesh.

## Use cases

- Call via FragGate (list → describe → call) when the slug is live
- Download the counted Worker zip when a /download surface exists
- Cite GitHub + Apache-2.0; forks welcome

## Coding / architecture notes

FragGate is THE single public executable door (fraggate_list → fraggate_describe → fraggate_call). This dossier summarizes identity and surfaces only — it does not paste the repository.

This is a **single** library dossier. Do not unpack the GitHub tree, release tarball, or Worker zip into many shelf files.

README lead (truncated, source only):

> ## EmbryoLock
>
> EmbryoLock is a local file vault that intentionally prioritizes **data destruction over recovery** after failed authentication attempts.
>
> **v1.2.0** adds the GitBaby dual surface (Worker UI + counted `/download` + OpenAPI/MCP pointer to FragGate). Public identity is **Aziel Eliab** only. FragGate is THE single door — agents use aziel-runtime slug `embryolock`. This Worker is human UI + download tracker. Destructive vault ops (wipe / scorch) are local-only and refuse on the public Worker.
>
> ## Counted download (Cloudflare Worker)
>
> **This is the counted download.** The Worker serves the gzip itself (HTTP 200, no 302 to GitHub).

## Surfaces

- **Home:** https://embryolock-download-tracker.vibelock.workers.dev/
- **GitHub:** https://github.com/AzielEliab/EmbryoLock
- **Counted /download:** https://embryolock-download-tracker.vibelock.workers.dev/download
- **MCP:** https://aziel-runtime.vibelock.workers.dev/mcp
- **fraggate/describe:** https://aziel-runtime.vibelock.workers.dev/v1/fraggate/describe?slug=embryolock

## Related ecosystem links

- Person `@id` https://www.azieleliab.com/#aziel
- Runtime `@id` https://www.azieleliab.com/runtime#runtime
- Official site https://www.azieleliab.com/
- Aziel Corpus Library https://www.azielcorpuslibrary.net/
- GodLock.uk https://godlock.uk/
- He Didn't Jump https://www.hedidntjump.com/
- Aziel Runtime https://aziel-runtime.vibelock.workers.dev/
- FragGate kernel https://github.com/AzielEliab/fraggate
- Try on Glama https://glama.ai/mcp/servers/AzielEliab/aziel-runtime

Part of the Aziel Eliab ecosystem. Apache-2.0.
