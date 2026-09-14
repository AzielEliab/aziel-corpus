# FOLDLOCK-SHELF-1.0 — FoldLock neighbor cite + SLOT export hook

Author: Aziel Eliab only
Spec id: FOLDLOCK-SHELF-1.0
Date: 2026-09-14
License: Apache-2.0
Product: FoldLock (https://github.com/AzielEliab/foldlock) — Softwares Language neighbor
Live lockset: AZLOCK-INGEST-REEXPAND-1.0 — this paper cites that tip; it does not replace it
Neighbors: COLD-MULTI-SHELF-1.0, NO-LIE-NO-REWRITE-1.0, INGEST-AS-RECEIPT-1.0
Cited on: GET /shelves · GET /cite.json · llms.txt · ai.txt · Softwares extra fallback
Not a second door. Not zip. Not encryption. Not a rewrite key. Not a Softwares-tab chrome change.

## 0. Sentence

FoldLock is algorithmic tether-word suppression on UTF-8 text. It is a Softwares / product neighbor. It is not the ZIP file format and it is not encryption. Optional fold on the aziel-corpus cold-shelf / tip-pack path may touch **export notes or metadata only**. Hash tip bytes stay exact. Survival is still bytes↔hash.

## 1. Honest cite

- **THIS IS:** tether-word suppression on UTF-8 (FoldLock product 0.8.0; FragGate ops `health` / `fold-preview` / `unfold-preview` / `doctor` / `skill`).
- **THIS IS NOT:** zip, zlib, gzip, DEFLATE, zstd, or any claim that FoldLock encrypts a tip-pack.
- GitHub: https://github.com/AzielEliab/foldlock
- Worker: https://foldlock-download-tracker.vibelock.workers.dev/
- FragGate describe: `/runtime/v1/fraggate/describe?slug=foldlock`
- engine_digest: `1034d5924b88878918986abe260338b0aff0117bc6f9c4d4a01a41d843cfa0a8`

FragGate remains THE single public executable door. This repo cites FoldLock. It does not become FoldLock.

## 2. Why a SLOT hook (tip integrity)

Folding lockset tip bytes, `lockset.json`, receipt bodies, or SHA-256 hex fields would break bytes↔hash. That is a lie even if it hid tether-words.

The FoldLock engine is **not bound** in this isolate. In-process fold would either vendor a second product or call the network during airgap export. Both are unsafe for Plane C. The hook therefore stays **SLOT**.

Default export writes an honest `foldlock.json` sidecar (cite + hook). It does not fold. `fold_applied` is always false here.

## 3. What may be folded later

When a local FoldLock engine is bound (not this PR):

| Surface | Fold? |
| --- | --- |
| Export notes / metadata sidecar (UTF-8 prose) | Optional |
| `lockset.json` / lockset tip hash | Never |
| Receipt bodies (tip SHA-256 is over raw receipts) | Never |
| Manifest SHA-256 hex fields | Never |
| Chain / prev-hash | Never |

Folding is a **suppression aid**. It is not encryption. Tip SHA-256 still covers raw receipts.

## 4. REDLINE

1. Never fold the lockset tip hash itself.
2. Never rewrite the chain.
3. Never claim zip encryption.
4. Never treat a SLOT hook as a live fold.

## 5. Refuse codes

| Code | When |
| --- | --- |
| `FL-TIP-FOLD-REFUSE` | Fold requested on the published tip hash or notes that embed it |
| `FL-CHAIN-REWRITE-REFUSE` | Fold would mutate / rewrite the chain |
| `FL-LOCKSET-BYTES-REFUSE` | Fold requested on `lockset.json` / tip bytes |
| `FL-RECEIPT-FOLD-REFUSE` | Fold requested on receipt bodies |
| `FL-HASH-FIELD-REFUSE` | Fold requested on a SHA-256 hex field |
| `FL-ZIP-ENCRYPT-CLAIM` | Caller claims zip or encryption |
| `FL-ENGINE-UNBOUND` | Notes/metadata fold is eligible but the engine is not bound (SLOT) |

CLI: `node tools/cold_shelf/cli.mjs fold --notes "…"`. Target `tip` / `lockset` / `receipt` refuses. Target `notes` returns SLOT.

## 6. Cap

Cite FoldLock honestly. Do not fold the tip. Do not rewrite the chain. Folding is not encryption. Identity: Aziel Eliab only.
