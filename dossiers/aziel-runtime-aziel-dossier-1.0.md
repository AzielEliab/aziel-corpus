---
schema: aziel.software-site-dossier.v1
spec: SOFTWARE-SITE-DOSSIER-1.0
slug: aziel-runtime
kind: website
title: Aziel Runtime — Aziel dossier
author: Aziel Eliab
version: "1.0"
product_version: 1.0
date: 2026-09-12
license: Apache-2.0
library: aziel
domain: "software, research"
subjects: aziel-runtime aziel dossier
keywords: "aziel-dossier-1.0, Apache-2.0, aziel-runtime, website, zion:not_applicable"
zion_pattern: not_applicable
identity: Aziel Eliab
person_id: https://www.azieleliab.com/#aziel
runtime_id: https://www.azieleliab.com/runtime#runtime
filename: aziel-runtime-aziel-dossier-1.0.md
---
# Aziel Runtime — Aziel dossier

**Author:** Aziel Eliab
**Version:** 1.0 (product 1.0)
**Date:** 2026-09-12
**Slug:** `aziel-runtime`

## License

**Apache-2.0**. Forks welcome and always allowed. Public identity is **Aziel Eliab** only (Aziel Elroi Eliab is `alternateName` / aka only).

## Identity

Node-meshed orchestration suite of MCP-connected software. FragGate is THE single public executable door.

### What it is

Aziel Runtime 2.0.0-rc1 Worker door: OpenAPI, MCP, GET /v1/software, FragGate list/describe/call. Certification-point freeze under docs/2.0/.

### What it is not

- Not merely an API orchestrator or software aggregator. Not a login mesh or VPN. GET /v1/mesh never enables. Worker origin is relatedLink / endpoint — identity hub is azieleliab.com/runtime#runtime.
- Not a ~100-file library unpack of the source tree.
- Not a Zenodo DOI mint (deposit_needed is a separate catalog track).

ZionPattern: **not_applicable**. Software / hardware / designs do not qualify for Zion cards.

## Purpose

Coordinate specialized tools through a shared, security-gated runtime while preserving provenance, chain-of-custody, temporal integrity, and auditable execution.

## Concept

fraggate_list → fraggate_describe → fraggate_call. Softwares catalog Plain → Gate → Lock (Clock ≠ Lock). Dual surface: agents via MCP/OpenAPI; humans via Worker UI + counted /download.

## Use cases

- Discover catalog slugs (fraggate_list / GET /v1/software)
- Describe one card, then fraggate_call
- Try on Glama (primary MCP CTA)
- Hub Softwares tabs refresh from this origin

## Coding / architecture notes

FragGate single door. Cloudflare Worker isolate is the jail. engine_digest required. Hubs (azieleliab.com, azielcorpuslibrary.net, godlock.uk) fetch GET /v1/software. This dossier is the runtime site/door, not a per-engine source dump.

This is a **single** library dossier. Do not unpack the GitHub tree, release tarball, or Worker zip into many shelf files.

README lead (truncated, source only):

> # aziel-runtime
>
> **Aziel Runtime** (`aziel-runtime`) is not merely an API orchestrator or software aggregator; it is a node-meshed orchestration suite of MCP-connected software designed to coordinate specialized tools through a shared, security-gated runtime while preserving provenance, chain-of-custody, temporal integrity, and auditable execution. It functions as a digital forensic, investigative, verification, research, intelligence-support, and systems-auditing environment in which individual engines can analyze evidence, validate records, inspect trajectories and patterns, track lineage, enforce capability boundaries, generate receipts, and exchange structured results without collapsing into one opaque model or unrestricted control plane. Its architecture emphasizes compartmentalization, deterministic routing, explicit refusal states, append-only evidence handling, and machine-readable metadata, making it suitable for distributed analysis workflows where trust, reproducibility, attribution, and post-hoc auditability matter as much as the result itself.
>
> FragGate is THE single public executable door (`fraggate_list` → `fraggate_describe` → `fraggate_call`). Softwares catalog is Plain → Gate → Lock; hubs refresh from `GET /v1/software`. Dual-surface: agents via OpenAPI/MCP; humans via Worker UI + counted `/download`. NodeMesh / QNM suite-presence is operator-enabled; `GET /v1/mesh` never enables; not a login mesh / VPN / Node Gate.
>
> **Version 2.0.0-rc1** is the certification-point freeze (not a feature dump): public contract, clean-room reproducibility, and external adversarial pack under `docs/2.0/`. No intentional behavioral breaks from 1.9.3. Remain-OFF untouched. Crawler surfaces keep the abstract above; changelog stays below. **1.9.3** closed remaining AZRT-1.9-GAPS-CLOSE items (isolate AZ-OS ethics session VFS; isolate-safe Ask Jeeves; binding-gated media-run; published independent-validation attestation path — not a third-party lab). **1.9.2** bound Browser Rendering and live D1 MASTER. **1.9.1** closed AZRT-1.9-GAPS-CLOSE isolate-safe verify. **1.9.0** closed AZRT-1.9-CLOSE-1.0. **1.7.11** is the SEO-clarity heritage that locked that lead copy.
>
> Kernel: [AzielEliab/fraggate](https://github.com/AzielEliab/fraggate) (FG-0.1)
>
> **[Try on Glama](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime)** is the primary Install Server / MCP distribution door. Worker origin stays the execution / OpenAPI surface.
>
> **Entity graph (locked):** Person `@id` [`https://www.azieleliab.com/#aziel`](https://www.azieleliab.com/#aziel) · Runtime SoftwareApplication `@id` [`https://www.azieleliab.com/runtime#runtime`](https://www.azieleliab.com/runtime#runtime). Worker origin is the execution endpoint / `relatedLink`, not the identity hub. Identity **Aziel Eliab** only.
>
> `open → policy → exec(slug, op, payload) → receipt → close`
>
> Agents should not narrate that chain. Prefer `fraggate_list` → `fraggate_describe` → `fraggate_call { name, op, payload }`. Hubs/clients: `GET /v1/software`.
>
> **1.3.0** vendored portable engines (ark, azai Lamb check, azclce, decisiongate, foldlock, zsolver) and ran them in this isolate.
>
> **1.2.0** was a session/receipt runtime: exec still `upstreamFetch`ed product Workers. Those receipts were not “this process ran FoldLock.”
>
> **1.1.0** was catalog + pull + proxy that started calling itself a runtime. Those front doors stay. They are not exec.
>
> For **every catalog slug** `session exec` loads a vendored module, computes `engine_digest` = SHA-256 of that artifact’s bytes, runs the primary compute op **inside this Worker isolate** (the jail) or a local CLI jail, wipes scratch buffers, and the receipt includes `engine_digest`, `engine_slug`, `engine_op`, `ran_in`. `GET /v1/health` `engine_slugs` equals `true_engine_slugs`. Ops that literally cannot run without product-Worker bindings (KV / D1 / AI / live media) stay honest per-op `proxy_fallback` — the slug itself remains a true engine.
>
> Cloudflare’s Worker / Durable Object isolate **is** the jail. No extra guest isolate is claimed. `engine_digest` is still required.
>
> Hosted / in-process AZAI is still protocol mirror + Lamb check, **not** the local blend (`azai serve`).
>
> Any OpenAPI-, MCP-, or HTTP-tool-capable assistant imports **this** OpenAPI file — then use `fraggate_call`. Session tools and `runtime_run` are advanced/internal. `/p/{slug}/{op}` is proxy only and is not the agent default path.
>
> **Author:** Aziel Eliab  
> **Identity:** Aziel Eliab (primary). Also known as Aziel Elroi Eliab (`alternateName` / aka only).  
> **License:** [Apache-2.0](LICENSE)  
> **Version:** 2.0.0-rc1

## Surfaces

- **Home:** https://aziel-runtime.vibelock.workers.dev/
- **GitHub:** https://github.com/AzielEliab/aziel-runtime
- **Try on Glama:** https://glama.ai/mcp/servers/AzielEliab/aziel-runtime
- **cite / llms:** https://aziel-runtime.vibelock.workers.dev/cite.json

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
