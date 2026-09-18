# content_sha256 = SHA-256 of served file bytes

`content_sha256` is SHA-256 of the **exact bytes** `GET /file/{AZDOC}` returns.

- File upload: SHA-256 of the attachment bytes stored in `FILES`.
- Text-only: SHA-256 of `TextEncoder` of the **final** `records.body` string that is inserted and served (after author/domain/subjects/keywords are appended). Never `sha256(title)` when the served body differs.

Root cause (fixed): `ingestRecord` hashed `notes || title` first, then appended `metaBits` to `searchBody`, stored that as `body`, and `/file` served `body` while the index/header echoed the pre-meta hash.

`GET /file` sets `X-Aziel-SHA256` from a live hash of the buffer about to be sent. Legacy mismatches also send `X-Aziel-Hash-Mismatch` with the old stored value.

## Repair the 9 live AZDOCs

Do **not** rewrite file bytes. After this Worker is deployed, an operator token updates `records.content_sha256`, packed `library:index:v1`, and an append-only `JSON_HASH_REPAIR` tip.

```bash
# After merge+deploy — POST the 9 IDs (operator token required)
curl -sS -X POST \
  -H "X-Aziel-Operator-Token: $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"record_ids":["AZDOC-00908C2A2E0A","AZDOC-697F4E1D8C34","AZDOC-C2B6A81A5A0B","AZDOC-3673C06729C4","AZDOC-B3A18F2CB097","AZDOC-C6D76CC9D65C","AZDOC-498664EBE53C","AZDOC-57CA385CE98A","AZDOC-213C0E8052F3"]}' \
  "https://www.azielcorpuslibrary.net/v1/operator/hash-resync"

# Same 9 via known:true, or POST tools/nine_fix_plan.json (uses updates[])
curl -sS -X POST \
  -H "X-Aziel-Operator-Token: $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"known":true}' \
  "https://www.azielcorpuslibrary.net/v1/operator/hash-resync"
```

GET dry-run (no write):

```bash
curl -sS "https://www.azielcorpuslibrary.net/v1/content-hash-repair?known=1"
```

One-at-a-time (same effect):

```bash
for id in \
  AZDOC-00908C2A2E0A \
  AZDOC-697F4E1D8C34 \
  AZDOC-C2B6A81A5A0B \
  AZDOC-3673C06729C4 \
  AZDOC-B3A18F2CB097 \
  AZDOC-C6D76CC9D65C \
  AZDOC-498664EBE53C \
  AZDOC-57CA385CE98A \
  AZDOC-213C0E8052F3
do
  curl -sS -H "X-Aziel-Operator-Token: $OPERATOR_TOKEN" \
    "https://www.azielcorpuslibrary.net/v1/content-hash-repair?apply=1&record_id=$id"
done
```

Verify one record:

```bash
id=AZDOC-498664EBE53C
curl -sS -D - -o /tmp/body "https://www.azielcorpuslibrary.net/file/$id" | grep -i x-aziel-sha256
sha256sum /tmp/body
curl -sS "https://www.azielcorpuslibrary.net/v1/search?q=$id" | grep content_sha256
```

Success: `sha256(/file/{id}) === library-index content_sha256 === X-Aziel-SHA256`.

This cloud agent cannot apply production repair (no operator secret). Cron dry-runs and `?sample=1` stay read-only.

```
GET /v1/content-hash-repair?status=1
GET /v1/content-hash-repair?sample=1
GET /v1/content-hash-repair?apply=1&all=1   # operator; remaining rows
```

Or: `OPERATOR_TOKEN=… node tools/repair_content_sha256.mjs --apply --known`

Author: Aziel Eliab
