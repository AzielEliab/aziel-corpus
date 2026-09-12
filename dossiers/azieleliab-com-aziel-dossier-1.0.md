---
schema: aziel.software-site-dossier.v1
spec: SOFTWARE-SITE-DOSSIER-1.0
slug: azieleliab-com
kind: website
title: Aziel Eliab — Aziel dossier
author: Aziel Eliab
version: "1.0"
product_version: 1.0
date: 2026-09-12
license: Apache-2.0
library: aziel
domain: "software, research"
subjects: azieleliab-com aziel dossier
keywords: "aziel-dossier-1.0, Apache-2.0, azieleliab-com, website, zion:not_applicable"
zion_pattern: not_applicable
identity: Aziel Eliab
person_id: https://www.azieleliab.com/#aziel
runtime_id: https://www.azieleliab.com/runtime#runtime
filename: azieleliab-com-aziel-dossier-1.0.md
---
# Aziel Eliab — Aziel dossier

**Author:** Aziel Eliab
**Version:** 1.0 (product 1.0)
**Date:** 2026-09-12
**Slug:** `azieleliab-com`

## License

**Apache-2.0**. Forks welcome and always allowed. Public identity is **Aziel Eliab** only (Aziel Elroi Eliab is `alternateName` / aka only).

## Identity

Official public landing for Aziel Eliab. You don’t get to know me. You get to understand the work.

### What it is

The official website of Aziel Eliab. Identity hub, Softwares door, donate strip, and runtime parent page.

### What it is not

- Not a second FragGate door. Not a login mesh. Not a biography dump. Apex azieleliab.com 301s to www; @id values never use apex and never #aziel-eliab.
- Not a ~100-file library unpack of the source tree.
- Not a Zenodo DOI mint (deposit_needed is a separate catalog track).

ZionPattern: **not_applicable**. Software / hardware / designs do not qualify for Zion cards.

## Purpose

Person and ecosystem hub. Locked Person @id and Runtime SoftwareApplication @id live on this host. Softwares section refreshes from aziel-runtime GET /v1/software.

## Concept

Public identity is Aziel Eliab only (Aziel Elroi Eliab is alternateName / aka only). Entity graph: Person #aziel, WebSite #website, Runtime #runtime. hasPart is named tools only — not MCP verbs.

## Use cases

- Cite the Person @id from any sister product or paper
- Open Softwares / donate / runtime from one host
- Crawler surfaces: cite.json, llms.txt, ai.txt, sitemap.xml

## Coding / architecture notes

Static / Worker landing. Softwares catalog is fetched live from aziel-runtime. FragGate remains THE single executable door on the runtime origin. This site does not exec catalog slugs.

This is a **single** library dossier. Do not unpack the GitHub tree, release tarball, or Worker zip into many shelf files.

README lead (truncated, source only):

> # azieleliab.com
>
> Public landing for **Aziel Eliab**.
>
> You don’t get to know me. You get to understand the work.
>
> Identity is **Aziel Eliab** only. Also known as Aziel Elroi Eliab (`alternateName` / aka only). Apache-2.0.
>
> Canonical: [https://www.azieleliab.com/](https://www.azieleliab.com/)  
> Apex `https://azieleliab.com/` 301s to www.
>
> GitHub About (Google + AI crawlers): homepage **https://www.azieleliab.com/** — apply description and topics from [docs/github-seo.md](docs/github-seo.md).
>
> ## Identity / entity graph
>
> Locked `@id`s on the www host (never apex; never `#aziel-eliab`):
>
> | Node | `@id` |
> |------|-------|
> | Person | [https://www.azieleliab.com/#aziel](https://www.azieleliab.com/#aziel) |
> | WebSite | [https://www.azieleliab.com/#website](https://www.azieleliab.com/#website) |
> | Runtime parent | [https://www.azieleliab.com/runtime#runtime](https://www.azieleliab.com/runtime#runtime) |
>
> Person `sameAs` only: [GitHub profile](https://github.com/AzielEliab), [Glama listing](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime) (owner/repo path — no invented UUIDs), [Corpus Library](https://www.azielcorpuslibrary.net/), [GodLock](https://godlock.uk/). Project URLs stay on `author` / `creator` / `sourceCode` / `isPartOf`.
>
> Runtime `SoftwareApplication` `sameAs`: [AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime) + [Try on Glama](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime). Worker origin is `relatedLink` / endpoint, not the identity page. Version cite **2.0.0-rc1**.
>
> `hasPart` is **named tools only** — not MCP ops/methods/verbs. Each child is `https://www.azieleliab.com/runtime#<slug>`:
>
> FragGate · ForgeReceipts · DecisionGate · TemporalLock · TrajectoryLock · PeaceLock · GodLock · AZ-OS · AZCoherence · 4DMap · Aziel Corpus · Ask Jeeves · AZBrowser · AZMail · AZHub · AZInterface · SpectralLock · ShadowLock · FoldLock · CodeLock · VibeLock
>
> ## Ecosystem
>
> Part of the Aziel Eliab ecosystem. Cross-links for humans, Google, and AI crawlers:
>
> | Surface | URL |

## Surfaces

- **Home:** https://www.azieleliab.com/
- **GitHub:** https://github.com/AzielEliab/azieleliab
- **Try on Glama:** https://glama.ai/mcp/servers/AzielEliab/aziel-runtime
- **cite / llms:** https://www.azieleliab.com/cite.json

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
