# CAP-7-BRIDGE-CITE-1.0 — design_of hubs, resolves_to_hub: false

Author: Aziel Eliab only  
Spec id: CAP-7-BRIDGE-CITE-1.0  
Origin: https://www.azielcorpuslibrary.net/bridge.json  
Date: 2026-09-14  
License: Apache-2.0  
Neighbors: CROSS-NETWORK-SURVIVAL-1.0, NO-LIE-NO-REWRITE-1.0, NO-FAN-1.0, INGEST-AS-RECEIPT-1.0, MESH-COLD-COPY-1.0, MESH-VAULT-1.0, CAP-7-MESH-PULL-1.0  
Not a Softwares-tab product. Not visible 15:20 identity-lock chrome.

## 0. Sentence

Cap-7 mesh sites inherit **design_of** the four hubs only. `resolves_to_hub: false`. They are not aliases, not “ARE the hubs”, and not CNAME/redirect onto hub hostnames. `name_may_change: true`. `public_icann: false`. No fifth product.

## 1. Four hubs (Plane A ICANN) + Cap-7 inherit

These hostnames stay themselves. Cap-7 names do **not** resolve to them.

| Cap-7 name | `design_of` | `resolves_to_hub` | Plane A UI |
|---|---|---|---|
| `azcorpus` | https://www.azielcorpuslibrary.net/ | false | `/corpus` on this Worker |
| `azlibrary` | https://www.azielcorpuslibrary.net/ | false | `/aziel-library` on this Worker |
| `azeliab` | https://www.azieleliab.com/ | false | — |
| `godlock` | https://godlock.uk/ | false | — |
| `hedidntjump` | https://www.hedidntjump.com/ | false | — |

`azcorpus` + `azlibrary` remain designs **inside** the library Worker for Plane A UI. That is not hostname aliasing. The Cap-7 mesh names still have `resolves_to_hub: false`.

Each `/bridge.json` `cap7_sites` entry carries `design_of`, `resolves_to_hub: false`, `name_may_change: true`, `public_icann: false`, `tip` / `lockset_id`, `pack`, and `pack_sha256`.

No fake `.az` DNS. No Cap-7 live public DNS claim. No AZ-GEN publish cadence.

## 2. First-class Plane A UI on this Worker

Machine surfaces (`/llms.txt`, `/ai.txt`, `/cite.json`, `/openapi.json`, `/bridge.json`, `/v1/products`) name these two products clearly.

### azcorpus — Corpus / Lamb Lens

- Plane A browse: https://www.azielcorpuslibrary.net/corpus
- Anyone may **DOWNLOAD** records and the website design pack. Auth: none.
- Public/anonymous writes stay Corpus-only (Lamb Lens). JSON ingest needs a signed-in session. Human homepage `POST /ingest` may file Corpus as a guest. That is not an anonymous JSON write hole.
- Counted pack: `GET /download?product=azcorpus`

### azlibrary — Aziel Library (royal purple)

- Plane A browse: https://www.azielcorpuslibrary.net/aziel-library
- Chrome: royal purple (`--royal:#6b3fa0`)
- Anyone may **DOWNLOAD**. Auth: none.
- **Upload requires the operator token**. Header name only: `X-Aziel-Operator-Token`. Env names only: `OPERATOR_TOKEN` / `GATE_TOKEN` / `LIBRARY_OPERATOR_TOKEN`. Never put the token in git, docs, or PRs.
- Path: `POST /v1/operator/library-ingest` (alias `POST /v1/ingest` with the same header)
- Token writes **live hub azlibrary only** — never a Cap-7 mesh write
- Counted pack: `GET /download?product=azlibrary`
- API pack: `GET /v1/design-pack/azlibrary` · `GET /v1/design-pack/azlibrary/download`

Sister-hub designs (`azeliab`, `godlock`, `hedidntjump`) are cite-only packs. They are not live write targets on this hub.

## 3. Design packs

`GET /v1/products` lists first-class websites. `GET /v1/design-pack` and `GET /v1/design-pack/{slug}` export design+content packs. Each pack repeats `design_of`, `resolves_to_hub: false`, `tip`, and `pack_sha256`. `pack_sha256` is on the JSON and on `X-Aziel-Pack-Sha256`.

- Slugs: `azcorpus`, `azlibrary`, `azeliab`, `godlock`, `hedidntjump`
- Counted: `GET /download?product={slug}` (increments)
- Uncounted attachment: `GET /v1/design-pack/{slug}/download`
- CROSS-NETWORK-SURVIVAL: survival = bytes↔hash on independent shelves
- A pack is not a live hub alias and not public DNS

## 4. Mesh pull

A node **pulls**. It does not become the hub hostname. Sender fan-out is off.

1. `GET /bridge.json` — Cap-7 sites: `design_of` + `resolves_to_hub: false` + tip/pack hashes
2. `GET /v1/design-pack/azcorpus` or `/azlibrary`
3. Counted pull `GET /download?product=`
4. hash-verify `pack_sha256` + `lockset_tip` fail-closed
5. Land on the node's local cold shelf. Do not CNAME a mesh name onto a hub hostname.
6. Optional bodies: `GET /v1/docs/{hash}/download`

Local `qnsd`: https://github.com/AzielEliab/qnm-node — no public qnsd proxy, no Node Gate. Mesh-side: AZNet / AZBrowser. MirageGrid cite: https://miragegrid-download-tracker.vibelock.workers.dev/v1/mesh/az-generator

## 5. Honesty

- inherit: designs only
- `resolves_to_hub: false`
- `name_may_change: true`
- `public_icann: false`
- `fifth_product: false`
- Do not invent Cap-7 live public DNS
- Do not claim AZ-GEN publish cadence
- Do not claim MirageGrid `/bridge.json` is live (cite the future URL; this corpus `/bridge.json` is the Plane A cite)
- Cite https://miragegrid-download-tracker.vibelock.workers.dev/v1/mesh/az-generator
- NO-FAN: no falsification, no ambiguity, no misleading; no fake `.az` DNS
- NO-LIE / NO-REWRITE: receipts that still hash; no rewrite key
- Growth-ON: robots Allow AI crawlers (including GPTBot)
- Dual-surface MCP/OpenAPI upload + download unchanged
