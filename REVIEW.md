# Aziel Digital Library — Review, poison immunity, and lattice tips

Author: **Aziel Eliab** only.

v2.7.0 adds a third review beside SPRE and CLCE, poison quarantine that never silently deletes, an unranked Bayesian peer score, full-structure verify on every upload and download, and an AzielTether lattice hook.

## Hard rules

- Operator writes → Aziel Library only. Public / anonymous writes → Corpus only (Lamb Lens).
- The live HTTPS site is **not** a mesh. Mesh / tether is downloadable software plus Worker APIs for bootstrap.
- Official narrative is not merged into evidence.
- SPRE does not assert criminal guilt.
- This site is not a Tor / VPN.

## Status lights (6th-grade reading)

| Color | Meaning |
| ----- | ------- |
| Green | Go. The check passed. |
| Yellow | Read again. A grown-up should look. |
| Red | Stop and check. Quarantine keeps the file; it is not deleted. |

Lights on every record: Structure, SPRE, CLCE, PhysLing Review (PLR), Poison.

## Engines

### Structure verify

Every file in a record or package is hashed (SHA-256). Zip / `.azm` / `.azk` containers are opened and **each inner file** is hashed. Unsafe zip paths fail. Receipts append to the hash-chain on upload **and** download (`STRUCTURE_VERIFY`).

### SPRE — Source Provenance Reliability Engine

Worker-side lightweight port. Scores **provenance completeness (PC)** from title, text, hash, structure, author, evidence language, independent-source language, and physics language. Penalizes official-narrative or advocacy language that has no evidence or physics basis.

Limitation: SPRE scores provenance completeness. It does not assert criminal guilt.

### CLCE — Cross-Layer Consistency Engine

Lightweight Jaccard port of [AZ-CLCE](https://azclce-download-tracker.vibelock.workers.dev/v1/score) (`r` = title, `d` = notes/body, `p` = filename + hash + structure). Live `/v1/score` is tried on ingest when reachable; the local port always runs. CLCE detects inconsistency, not intent. Type D is a label only. Threshold 0.7 is advisory.

### PLR — PhysLing Review

Third review. Cross-checks linguistic claims against physics-plausible constraints:

- units
- conservation language
- causal ordering
- temporal consistency
- manipulative framing

Physics-impossible or linguistically manipulative framing is poison-suspect.

### Poison immunity

Reject **display as trusted** (quarantine), never silent delete:

- Official narrative without independent evidence / physics basis
- Non-neutral advocacy that is not evidence-based or physics-based
- Known poison markers / contradictory-only propaganda shells

Quarantine status is hash-chained (`POISON_QUARANTINE`). Operator Aziel Library files are flagged so evidence can still be filed. The filter is hardest on public Corpus.

### Bayesian peer score

Beta-Bernoulli posterior from five priors: evidence completeness, physics coherence, linguistic neutrality, SPRE PC, CLCE consistency.

Stored as **unranked** metadata. Never used to sort the shelf. Shown on the record page for manual peer-to-peer review (continuity if the operator is gone one day).

### Peer review

`endorse` / `challenge` / `note` append to the hash-chain (`PEER_REVIEW`). History is not rewritten.

## Lattice tip (AzielTether)

On successful verified ingest, the Worker / local package emits:

```json
{
  "schema": "aziel.lattice.anchor.v1",
  "kind": "aziel-corpus.verified_ingest",
  "carrier": "AzielTether",
  "author": "Aziel Eliab",
  "record_id": "AZDOC-…",
  "library": "corpus",
  "content_sha256": "…",
  "structure": { "ok": true, "file_count": 1 },
  "spre": { "pc": 0.71, "band": "strong" },
  "clce": { "triple": 0.4, "pairwise_avg": 0.5, "advisory": true },
  "plr": { "status": "PASS", "lights": { "units": "PASS" } },
  "bayesian": { "posterior": 0.62, "unranked": true },
  "quarantine": null,
  "ledger_entry_hash": "…",
  "verified_utc": "2026-09-04T00:00:00Z",
  "note": "Public HTTPS site is not a mesh. AzielTether carries this tip. Survival interdependence with GodLock and other Aziel software is via downloadable tether + Worker bootstrap APIs."
}
```

GET `/v1/lattice?record_id=` returns the latest tip. Survival interdependence with GodLock is via tether, not by turning the public site into a mesh.

## API

- `GET /v1/review?record_id=`
- `GET /v1/lattice?record_id=`
- `POST /v1/score` — preview only, no write
- `POST /record/{id}/peer` — signed-in append
- Download headers: `X-Aziel-SHA256`, `X-Aziel-Structure`
