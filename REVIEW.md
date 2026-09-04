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

The shelf and record page **lead with one triad composite score** after all three verifiers have run. Bayesian stays a separate unranked field.

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

## Triad composite (one visible score)

When **SPRE**, **CLCE**, and **PhysLing** have all verified a record, one combined score is computed and shown first.

**TRIAD_V1 (auditable geometric mean):**

`combined = (spre_pc × clce_consistency × plr_coherence)^(1/3)`

- `clce_consistency` = CLCE.triple if triple ≥ 0.7, else pairwise_avg
- `plr_coherence` = 0.6×physics_coherence + 0.4×linguistic_neutrality
- Equal 1/3 engine weight. Epsilon 0.0001 avoids a zero product.
- Display is `round(combined × 100)`.
- Components stay stored for audit. Bayesian is **not** in this mean.

## Backfill

`GET /v1/verify-backfill?all=1` walks **every stored Aziel Library and Corpus record** and writes triad, ZionPattern Solver secondary score, and exact-same-subject succession cites. Reports `total`, `scored`, `skipped`, `failed`. Auto-continues on first request after ship and on a minute cron until the cursor is exhausted. Local: `aziel-library backfill-review --all`. Safe to re-run. Skip already fully scored live zsolver + matching triad unless `force=1`. If the live zsolver API is down, the secondary score is queued and retried (not silently omitted).

## ZionPattern Solver (secondary public score)

Every upload — Aziel Library and public Corpus — gets a **ZionPattern Solver** score. It is stored on the record, shown on the shelf and detail page, and returned by `GET /v1/review`. It is **not** merged into the triad. Hard 75% confidence cap / 25% uncertainty floor. Provisional and assistive. Does not solve Zioncheck or any case. Author Aziel Eliab.

Live path: HTTPS `POST https://zsolver-download-tracker.vibelock.workers.dev/v1/score` (or optional Worker service binding `ZSOLVER`). Document-derived yes/no/unknown answers are sent. If the API is unavailable, a queued status is persisted and retried on backfill/cron.

## Paper succession cites

When a later paper is the exact same subject/concept as an earlier one — same canonical subject key plus title lineage, or explicit `supersedes` metadata — both public record pages list the cite:

- **Supersedes** → earlier papers in the chain
- **Superseded by** → later papers in the chain
- Full chain oldest → newest

Uncertain or merely related papers are not chained. Same-file SHA duplicates are not succession. Links are append-only. `GET /v1/review?record_id=` includes the cite list when a chain exists.

## Document-bound hash chains

Every `AZDOC-…` record has its own `document_ledger` sequence. Upload, download, rescore, quarantine, and peer notes append to **that document**. Zip-asset verifies use `ASSET-…` ids and do not create orphan document chains. `GET /v1/document-chain?record_id=` returns the tip.

## Downloads

Every stored document (Aziel Library + Corpus, including text-only and quarantined) is downloadable:

- `GET /file/{record_id}` — HTTP 200, ledger-linked
- `GET /download?record=AZDOC-…` — counted + ledger-linked, HTTP 200 (no silent 302)
- `GET /download?hash=` and `GET /v1/docs/{hash}/download` — download by content SHA-256 when a kept record matches. Duplicates are not deleted.

Quarantined poison docs stay downloadable with a quarantine banner and `X-Aziel-Quarantine`.

## Hosted transcription and media lattice

`POST /transcribe` runs Cloudflare Workers AI Whisper on uploaded audio (and container bytes for video; this Worker has no FFmpeg). **VibeLock determination is mandatory** on every run (live `/v1/analyze`, fallback `/v1/detect`). That authenticity score is **not courtroom proof**.

Hard blocks: porn, nudity, and child-sexual content. Blocked media is **never stored** and **never playable** (HTTP 451). Allowed media is stored at `av/{sha256}` and served inline at `GET /media/{sha256}`. Anonymous `POST /transcribe` is allowed; save-to-library still requires sign-in.

Every OCR run and every transcript run appends an immutable D1 `media_runs` + global ledger entry:

- success: `LATTICE_TRANSCRIPT_VIBELOCK`
- blocked: `LATTICE_AV_BLOCKED`
- OCR: `ocr`

Receipts: `/receipt/{id}` and `/ledger/{id}` (AZDOC- or AZRUN-). Optional library upload uses the same ingest as the shelf (signed-in → Corpus; operator → Aziel Library) and still runs SPRE × CLCE × PhysLing + unranked Bayesian. No score shortcuts.

## Ask Jeeves

Fixed bottom-right research assistant. Drawer, not a full-page takeover. Answers from public records, map events, and gazetteer places. Learns topic frequencies and FAQ hints in D1/KV (never secrets). Add inside the panel files **Corpus only** (Lamb Lens) through the same ingest — even if the operator is signed in. Cannot change scores or reveal operator secrets.

## API

- `GET /v1/review?record_id=` — leads with triad combined score; includes succession cites when present
- `GET /v1/lattice?record_id=`
- `GET /v1/verify-backfill`
- `GET /v1/document-chain?record_id=`
- `POST /v1/score` — preview only, no write
- `POST /v1/jeeves/chat`
- `POST /v1/jeeves/upload` — Corpus only
- `POST /transcribe` — hosted Whisper; **mandatory** VibeLock determination; hard A/V blocks
- `GET /media/{sha256}` — allowed A/V playback only
- `POST /ocr` — lattice receipt on every run
- `GET /receipt/{id}` and `GET /ledger/{id}` — AZDOC- or AZRUN-
- `GET /v1/media-run?run_id=`
- `POST /record/{id}/peer` — signed-in append
- `GET /file/{record_id}` and `GET /download?record=`
- Download headers: `X-Aziel-SHA256`, `X-Aziel-Structure`, `X-Aziel-Quarantine`, `X-Aziel-Triad`
