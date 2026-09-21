# TRIAD V3 — recalibrate existing papers

Author: **Aziel Eliab** only.

Public `combined` is the 36-cycle mean. Ingest always runs that path. This note is how the operator remints **already stored** papers after TRIAD V3 lands.

N/A factors omit (applicable-only). Softwares purpose blurbs, Live Nodes human mesh, and SPORE stay untouched.

## What the job does

For every stored Aziel Library + Corpus paper:

1. Load bytes (R2/object or extracted text).
2. Hash against stored content SHA-256.
3. Run TRIAD V3 (physics, linguistics, bayesian, truth_formula, CLCE, SPRE — applicable only).
4. Write `triad_cycle_mean` as public `combined`.
5. Freeze `triad_raw` to that content SHA-256 (`REVIEW_SCORE` event `recalibrate_v3`).
6. No collection +25. Display is never written back into combined.

Papers already frozen as `aziel.triad.v3` to the **current** hash skip unless `force=1`. Downloads verify bytes and do not remint.

A prior `full_backfill_done_utc` from TRIAD V2 **cannot** skip this walk. Recalibrate uses its own cursor (`recalibrate_v3_cursor` / `recalibrate_v3_done_utc`).

## Live Worker — trigger after merge

Cron and ordinary page-request walks continue the cursor automatically after deploy. If you want the shelf reminted now, or to watch progress:

```
GET https://www.azielcorpuslibrary.net/v1/recalibrate-all
GET https://www.azielcorpuslibrary.net/v1/recalibrate-all?all=1
```

Repeat `?all=1` until JSON `done: true`.

```
GET https://www.azielcorpuslibrary.net/v1/recalibrate-all?status=1
```

Alias (same job):

```
GET https://www.azielcorpuslibrary.net/v1/verify-backfill?recalibrate=1&all=1
```

Remint even papers already frozen as V3:

```
GET https://www.azielcorpuslibrary.net/v1/recalibrate-all?force=1&all=1
```

One record:

```
GET https://www.azielcorpuslibrary.net/v1/verify-backfill?recalibrate=1&force=1&record_id=AZDOC-…
```

After `done:true`, packed shelf numbers catch up with:

```
GET https://www.azielcorpuslibrary.net/v1/verify-backfill?rebuild=1
```

Repeat rebuild with `cursor=` or `all=1` until `done:true`.

## Local vault

```
python3 tools/recalibrate_all.py --vault ./aziel_library_data
aziel-library --vault ./aziel_library_data recalibrate-all
aziel-library --vault ./aziel_library_data recalibrate-all --force
```

## Future papers

`POST /ingest`, `POST /v1/ingest`, Jeeves Add, and operator library-ingest call `reviewAndStore` / `_apply_ingest_review`. Persist refuses any published score that is not TRIAD V3 cycle mean frozen to content SHA-256.
