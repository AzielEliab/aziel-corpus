# CAP-7-BRIDGE-CITE-1.0 — Plane A semantic bridge (designs, not hub DNS)

Author: Aziel Eliab only  
Spec id: CAP-7-BRIDGE-CITE-1.0  
Origin: https://www.azielcorpuslibrary.net/bridge.json  
Date: 2026-09-14  
License: Apache-2.0  
Neighbors: CROSS-NETWORK-SURVIVAL-1.0, NO-LIE-NO-REWRITE-1.0, NO-FAN-1.0, INGEST-AS-RECEIPT-1.0, MESH-COLD-COPY-1.0, MESH-VAULT-1.0  
Not a Softwares-tab product. Not visible 15:20 identity-lock chrome.

## 0. Sentence

Cite MirageGrid Cap-7 from Plane A. Mesh names are designs. Plane A hubs stay themselves.

## 1. Two planes

**Plane A** (this cite): public hubs and Workers.

- https://www.azielcorpuslibrary.net/
- https://www.azieleliab.com/
- https://godlock.uk/
- https://www.hedidntjump.com/

These hostnames stay themselves. They are ICANN / Worker names.

**Cap-7 mesh sites** use **azcorpus**, **azlibrary**, and sister-hub **designs** only. They do **not** resolve to azielcorpuslibrary.net or the other hubs. Pull via public hubs + the MirageGrid Worker bridge. Mesh-side access is AZNet / AZBrowser. Names are not ICANN.

## 2. Design packs

`GET /v1/design-pack` and `GET /v1/design-pack/{slug}` export design+content packs for download-to-mesh-nodes.

- Slugs: `azcorpus`, `azlibrary`, `azeliab`, `godlock`, `hedidntjump`
- Content is a packed-index cold copy (hashes + titles; no live body sync)
- CROSS-NETWORK-SURVIVAL: survival = bytes↔hash on independent shelves
- A pack is not a live hub alias and not public DNS

## 3. Upload token

`X-Aziel-Operator-Token` / operator session writes **live azlibrary on the hub** (`POST /v1/operator/library-ingest`, `POST /v1/ingest`). It does not write Cap-7 mesh names. Mesh copies are packs, not hub writes.

AI/JSON ingest without a session is refused. Human homepage `POST /ingest` may still file Corpus as a guest. That is not an anonymous JSON write hole.

## 4. Honesty

- Do not invent Cap-7 live public DNS
- Do not claim AZ-GEN publish cadence
- Do not claim MirageGrid `/bridge.json` is live (cite the future URL; this corpus `/bridge.json` is the Plane A cite)
- Cite https://miragegrid-download-tracker.vibelock.workers.dev/v1/mesh/az-generator
- NO-FAN: no falsification, no ambiguity, no misleading
- NO-LIE / NO-REWRITE: receipts that still hash; no rewrite key

## 5. Dual surface

Agents run software with outputs shown in the AI and inputs run back (no technical MCP UI required). The software side keeps complete human UI (Worker + mobile + download).

Compatible AI clients: ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants.
