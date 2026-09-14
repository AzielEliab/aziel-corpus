# HASHCHAIN-LATTICE-LEARN-1.0 — Adaptive learning via hashchain lattice

Author: Aziel Eliab only  
Spec id: HASHCHAIN-LATTICE-LEARN-1.0  
Origin: https://www.azielcorpuslibrary.net/  
Date: 2026-09-14  
License: Apache-2.0  
Neighbors: INGEST-AS-RECEIPT-1.0, NO-LIE-NO-REWRITE-1.0, CROSS-NETWORK-SURVIVAL-1.0, ACT-RECEIPT-1.0, 4DM-WP-1.0  
Not a Softwares-tab product. Not a mesh growth path. Not visible 15:20 identity-lock chrome.

## 0. Sentence

**Adaptive learning via hashchain lattice for recollection and reasoning.**

The system itself is adaptive-learning. Recollection and reasoning use the document-bound hashchain lattice (tip / prev-hash receipts), not an opaque external memory store and not LLM-as-memory.

## 1. Lattice is the memory

REAL in-repo:

- Per-document `document_ledger` (append-only, `previous_hash` → `entry_hash`)
- Site-wide `ledger` (same hash-chain law)
- AzielTether `lattice_tips` / `aziel.lattice.anchor.v1`

LEARN stamps, Bayesian updates, possibility-score pattern memory, and poison-learn features **append to** and **read from** this lattice. They do not rewrite prior stamps.

## 2. Recollection

`GET /v1/recollect?record_id=&depth=&tip=`

Walk the document chain from genesis to tip. Verify each `previous_hash`. Fail closed on sequence gap, hash break, or tip mismatch. Return LEARN-class stamps only when the walk is intact.

Recollection ≠ chat memory. Recollection = tip + depth / prev-hash verify.

## 3. Reasoning over time × geo

`GET /v1/pin?record_id=` · `GET /v1/possibility?record_id=` · Temporal Map `/map` · `GET /v1/verify-geo`

Upload→pin extracts paper date × place, pins the verify-geo lattice, receipts sha256. Fail closed if structure or poison blocks.

Possibility is a **HEURISTIC** derived view over those lattice pin receipts (support density, contradiction density, travel/plausibility) plus prior `LEARN` accept stamps already on the hashchain (pattern memory). Bayesian is a separate Beta-Bernoulli posterior appended on `REVIEW_SCORE` — a derived view, not a rewriteable weight.

**possibility ≠ probability ≠ triad ≠ ZionPattern.** Posterior ≠ truth. Scores are not guilt verdicts / courtroom proof.

Sister cite: [4DMap](https://github.com/AzielEliab/4dmap) **4DM-WP-1.0** (T / Δ / Γ / Π inspection frame after AZPIPE). Not an extra door. Not a live ICANN mesh DNS.

## 4. LEARN (accepted inputs)

On successful verified ingest + pin, append `LEARN` (`kind=accept`) with anchors and content sha256. Never mutate a prior LEARN.

## 5. Poison-learn

Reject poison (A/V hard block, structure fail-closed for pin, immunity quarantine). On refuse or quarantine, append `POISON_LEARN`: hash + feature receipt (markers + token hashes). **No poison payload/body** on that stamp.

`GET /v1/poison-learn` walks `AZDOC-POISONLEARN` (tip + prev-hash). Future similar inputs that match a learned feature refuse faster without storing the body. Memory is the lattice, not an opaque store.

Quarantine still never silently deletes a first-seen Corpus file (existing immunity). Learned repeats refuse closed.

## 6. NO-REWRITE / NO-LIE / NO-FAN

Learning appends. History is not rewritten. Receipts that still hash. Scores are not invented as truth when the lattice breaks — they refuse.

## 7. Growth-ON

AI crawlers stay Allowed (`robots.txt` / `ai.txt` `Allow: /` for listed bots). Humans and crawlers stay uncapped on HTML/search/SEO. Cite INGEST-AS-RECEIPT-1.0 Growth-ON.

## 8. Endpoints

- `GET /v1/pin?record_id=`
- `GET /v1/possibility?record_id=`
- `GET /v1/recollect?record_id=`
- `GET /v1/poison-learn`
- `GET /v1/review?record_id=` (Bayesian + possibility alongside triad)
- `GET /v1/verify-geo`
- `POST /v1/jeeves/upload` / `POST /v1/operator/library-ingest` (upload→pin on success)

Identity: Aziel Eliab only. Person `@id` https://www.azieleliab.com/#aziel.
