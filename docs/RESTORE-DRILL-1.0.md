# RESTORE-DRILL-1.0 — Airgap re-expand attest schema

Author: Aziel Eliab only
Spec id: RESTORE-DRILL-1.0
Date: 2026-09-14
License: Apache-2.0
Umbrella: CROSS-NETWORK-SURVIVAL-1.0
Neighbors: COLD-MULTI-SHELF-1.0, RE-EXPAND-FROM-ARCHIVE-1.0, MESH-REEXPAND-1.0, NO-LIE-NO-REWRITE-1.0, ACT-RECEIPT-1.0, INGEST-AS-RECEIPT-1.0
Live lockset: AZLOCK-INGEST-REEXPAND-1.0 — this paper cites that tip; it does not replace it
Cited on: GET /shelves · CLI `restore-drill` · Plane C USB pack
Not a Softwares-tab product. Not an index resurrection. Not a completed operator attest. Not .

## 0. Sentence

The airgap restore drill proves re-expand from **Plane C bytes + previous_hash**, not from an index. The public surface emits an **attest receipt schema**. NO-FAN: do not invent that the drill ran, and do not mark Plane C LIVE from a schema print.

## 1. What the drill proves

Operator later:

1. Holds the Plane C airgap pack (tarball + `SHA256SUMS` + `verify-airgap.sh`).
2. Verifies those bytes against pack SHA-256 `b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37` and lockset tip `c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245`.
3. Walks each receipt `previous_hash` fail-closed (RE-EXPAND-FROM-ARCHIVE-1.0 / MESH-REEXPAND-1.0).
4. Only then may attest (`CNS-OPERATOR-ATTEST`). LIVE is still refused until that attest.

An index, crawl roster, Lamb Lens search hit, or training residue is **not** enough. Corpus is the public Lamb Lens shelf; this drill cites that shelf. It does not re-expand from Lamb Lens memory.

## 2. Receipt schema (ACT-RECEIPT four fields)

Emit only. Do not fill a fake attest.

1. `hash` — SHA-256 of the canonical payload including `previous_hash`
2. `action` — one sentence of the requested drill
3. `output` — one sentence of the verify result
4. `metadata` — surface, path, method, status, tool, spec — never user, email, IP, geo, cookies, tokens

`previous_hash` is the chain link (prior receipt or the published lockset tip). Broken `prev` isolates. No rewrite key.

CLI: `node tools/cold_shelf/cli.mjs restore-drill` prints the schema. Operator checklist: `tools/cold_shelf/RESTORE-DRILL.md`.

## 3. NO-FAN

Refuse invented attests, index-as-source, and LIVE-from-schema (`CNS-NO-FAN-FAKE-DEPOSIT`, `CNS-OPERATOR-ATTEST`, `CNS-TRAINING-RESIDUE-RUMOR`). Growth-ON stays. Operator . Never publish .

## 4. Cap

Bytes + prev-hash walk. Not an index. Schema is not an attest. Identity: Aziel Eliab only.
