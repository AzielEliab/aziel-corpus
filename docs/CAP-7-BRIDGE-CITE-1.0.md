# CAP-7-BRIDGE-CITE-1.0 — Plane A semantic bridge (designs, not hub DNS)

Author: Aziel Eliab only  
Spec id: CAP-7-BRIDGE-CITE-1.0  
Origin: https://www.azielcorpuslibrary.net/bridge.json  
Date: 2026-09-14  
License: Apache-2.0  
Neighbors: CROSS-NETWORK-SURVIVAL-1.0, NO-LIE-NO-REWRITE-1.0, NO-FAN-1.0, INGEST-AS-RECEIPT-1.0, MESH-COLD-COPY-1.0, MESH-VAULT-1.0, CAP-7-MESH-PULL-1.0  
Not a Softwares-tab product. Not visible 15:20 identity-lock chrome.

## 0. Sentence

Cite MirageGrid Cap-7 from Plane A. Mesh names are designs. Plane A hubs stay themselves. **azcorpus** and **azlibrary** are first-class website products.

## 1. Two planes

**Plane A** (this cite): public hubs and Workers.

- https://www.azielcorpuslibrary.net/
- https://www.azieleliab.com/
- https://godlock.uk/
- https://www.hedidntjump.com/

These hostnames stay themselves. They are ICANN / Worker names.

**Cap-7 mesh sites** use **azcorpus**, **azlibrary**, and sister-hub **designs** only. They do **not** resolve to azielcorpuslibrary.net or the other hubs. Pull via public hubs + the MirageGrid Worker bridge. Mesh-side access is AZNet / AZBrowser. Names are not ICANN. No fake `.az` DNS.

## 2. First-class website products

Machine surfaces (`/llms.txt`, `/ai.txt`, `/cite.json`, `/openapi.json`, `/bridge.json`, `/v1/products`) name these two products clearly.

### azcorpus — Corpus / Lamb Lens

- Plane A browse: https://www.azielcorpuslibrary.net/corpus
- Anyone may **DOWNLOAD** records and the website design pack. Auth: none.
- Public/anonymous writes stay Corpus-only (Lamb Lens). JSON ingest needs a signed-in session. Human homepage `POST /ingest` may file Corpus as a guest. That is not an anonymous JSON write hole.
- Counted pack: `GET /download?product=azcorpus`
- API pack: `GET /v1/design-pack/azcorpus` · `GET /v1/design-pack/azcorpus/download`

### azlibrary — Aziel Library (royal purple)

- Plane A browse: https://www.azielcorpuslibrary.net/aziel-library
- Chrome: royal purple (`--royal:#6b3fa0`)
- Anyone may **DOWNLOAD** records and the website design pack. Auth: none.
- **Upload requires the operator token** on the live hub. Do not weaken auth. Do not put the token in git, docs, or PRs.
- Header name only: `X-Aziel-Operator-Token`
- Env names only: `OPERATOR_TOKEN` / `GATE_TOKEN` / `LIBRARY_OPERATOR_TOKEN`
- Path: `POST /v1/operator/library-ingest` (alias `POST /v1/ingest` with the same header)
- Token writes **live hub azlibrary only** — never the Cap-7 mesh name
- Counted pack: `GET /download?product=azlibrary`
- API pack: `GET /v1/design-pack/azlibrary` · `GET /v1/design-pack/azlibrary/download`

Sister-hub designs (`azeliab`, `godlock`, `hedidntjump`) are cite-only packs. They are not live write targets on this hub.

## 3. Design packs (exist in the mesh)

`GET /v1/products` lists first-class websites. `GET /v1/design-pack` and `GET /v1/design-pack/{slug}` export design+content packs (website routes, chrome, tip hashes, record hashes+titles; no PDF bodies). `pack_sha256` is on the JSON and on `X-Aziel-Pack-Sha256`.

- Slugs: `azcorpus`, `azlibrary`, `azeliab`, `godlock`, `hedidntjump`
- Counted download-to-node: `GET /download?product={slug}` (increments). Uncounted attachment: `GET /v1/design-pack/{slug}/download`
- Content is a packed-index cold copy (hashes + titles; no live body sync)
- CROSS-NETWORK-SURVIVAL: survival = bytes↔hash on independent shelves
- A pack is not a live hub alias and not public DNS

## 4. Mesh pull (qnm / MirageGrid → local cold shelf)

A node **pulls**. It does not become the hub hostname. Sender fan-out is off.

1. `GET https://www.azielcorpuslibrary.net/bridge.json` — Plane A cite. Mesh names are not ICANN.
2. `GET https://www.azielcorpuslibrary.net/v1/design-pack/azcorpus` or `/azlibrary` — copy `pack_sha256` + `lockset_tip` + website design.
3. `GET https://www.azielcorpuslibrary.net/download?product=azcorpus` or `azlibrary` — counted bytes.
4. **Hash-verify** `pack_sha256` and `lockset_tip` fail-closed (bytes↔hash; CROSS-NETWORK-SURVIVAL). Refuse on mismatch.
5. Land on the node's **local cold shelf**. Do not alias Plane A DNS. Do not write the live hub.
6. Optional: `GET /v1/docs/{hash}/download` for each `content_sha256` (receiver-pull bodies). Still pull-only.

Local `qnsd`: https://github.com/AzielEliab/qnm-node — no public qnsd proxy, no Node Gate. Mesh-side: AZNet / AZBrowser. MirageGrid cite: https://miragegrid-download-tracker.vibelock.workers.dev/v1/mesh/az-generator

## 5. Upload honesty

`X-Aziel-Operator-Token` / operator session writes **live azlibrary on the hub**. It does not write Cap-7 mesh names. Mesh copies are packs, not hub writes.

AI/JSON ingest without a session is refused. Human homepage `POST /ingest` may still file Corpus as a guest.

## 6. Honesty

- Do not invent Cap-7 live public DNS
- Do not claim AZ-GEN publish cadence
- Do not claim MirageGrid `/bridge.json` is live (cite the future URL; this corpus `/bridge.json` is the Plane A cite)
- Cite https://miragegrid-download-tracker.vibelock.workers.dev/v1/mesh/az-generator
- NO-FAN: no falsification, no ambiguity, no misleading; no fake `.az` DNS
- NO-LIE / NO-REWRITE: receipts that still hash; no rewrite key
- Growth-ON: robots Allow AI crawlers (including GPTBot)
- No visible 15:20 identity-lock chrome on these surfaces

## 7. Dual surface

Agents run software with outputs shown in the AI and inputs run back (no technical MCP UI required). The software side keeps complete human UI (Worker + mobile + download).

Compatible AI clients: ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants.

Library MCP: `POST /mcp` — `aziel-corpus_health`, `aziel-corpus_search`, `aziel-corpus_skill`, `aziel-corpus_download`, `aziel-corpus_ingest`, `aziel-corpus_design_pack`, `aziel-corpus_receipt`.
