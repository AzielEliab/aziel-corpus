# ACT-RECEIPT-1.0 — Public action receipts

Author: Aziel Eliab  
Origin: https://www.azielcorpuslibrary.net/receipts  
Spec id: ACT-RECEIPT-1.0  
Neighbors: INGEST-AS-RECEIPT-1.0, RE-EXPAND-FROM-ARCHIVE-1.0, MESH-COLD-COPY-1.0, MESH-SPLIT-WIRES-1.0, NO-LIE-NO-REWRITE-1.0  
Not a Softwares-tab product. Not GodLock. Not TemporalLock. Not local ChainLock.
Neighbors: NO-LIE-NO-REWRITE-1.0, CROSS-NETWORK-SURVIVAL-1.0, MESH-REEXPAND-1.0, MESH-REHEAL-1.0, INGEST-AS-RECEIPT-1.0
No rewrite key. A published receipt is not mutated in place.

## What already existed

Aziel Runtime already stamps internally:

- ChainLock CL-0.4 `interact` / `append` on local chains (`session`, `acts`, `learn`). Fail-closed verify. Not a public ledger.
- Provenance Input Packets (IP-1.0) before ChainLock-IN.
- Library D1 `ledger` + `document_ledger` for ingest/review/lattice on AZDOC records.
- Public `/receipt/AZDOC-*` JSON + HTML for **documents**.
- ForgeReceipts (local mint/verify) and TemporalLock (timeslate receipts).

Those are document or local-vault receipts. They do not publish every runtime/site **action** as a four-field public record.

## What this adds

A new library tab `/receipts` plus machine endpoints:

- `GET /receipts` — human tab
- `GET /receipts.jsonl` — crawl/index stream
- `GET /v1/receipts` — JSON + JSON-LD Dataset
- `GET /receipts/{hash|AZACT-…}`
- `GET /receipts/verify` — fail-closed chain check; paste `?hash=` for yes/no against the published lockset tip (INGEST-AS-RECEIPT-1.0)
- `GET /v1/receipts/verify` — machine yes/no + chain
- `GET /lockset.json` — lockset core + CROSS-NETWORK-SURVIVAL + NO-LIE / NO-REWRITE (SHA-256 of the core is the published tip)
- `POST /v1/receipts/append` — gated (`x-aziel-receipt` = `RECEIPT_APPEND_TOKEN`)

Each receipt stores exactly four public things:

1. hash (`entry_hash`, SHA-256 of canonical payload including `previous_hash`)
2. one sentence of the requested action
3. one sentence of the output given
4. event metadata: surface, path, method, status, tool, spec, runtime version — never user, email, IP, geo, location, cookies, tokens

Immutable: insert only. No update route. No delete route. Broken `prev` isolates.

## Scope of auto-mint

Not every HTML page view. Significant actions only:

- `POST /v1/*`, `POST /runtime/*`, `POST /event`
- `GET /v1/search`
- FragGate list/call and `POST /runtime/mcp`
- `GET /download`

Runtime nodes push the same four-field body to `/v1/receipts/append` after a local ChainLock stamp if the operator set the token.

## Mesh / crawlers

`robots.txt`, `llms.txt`, `ai.txt`, and `sitemap.xml` allow `/receipts` and `/lockset.json`. JSON-LD `@type: Dataset` is on the tab. Humans and crawlers stay uncapped on HTML/search/SEO. Ingest is a receipt (INGEST-AS-RECEIPT-1.0). Re-expand is from archive bytes, not crawler memory (RE-EXPAND-FROM-ARCHIVE-1.0). Die-with-pull / split-wires / cold-copy mesh refuse stay.

## Identity lock

Public identity is Aziel Eliab only. No legal name. No home or county. No custody-case copy on this surface.
