# RECEIPT-PORT-1.0 — Shared sister-site receipt ingest

Author: Aziel Eliab  
Spec id: RECEIPT-PORT-1.0  
Origin: https://www.azielcorpuslibrary.net/  
Neighbors: ACT-RECEIPT-1.0, INGEST-AS-RECEIPT-1.0, AZRT-DUAL-LATTICE-1.0  
Not a Softwares-tab product. Not a library document. Not `/v1/ingest`.

Not LIVE. This document describes the route in the worker source. It does not claim a production deploy. Cap-7 is not an ICANN registration. Paid satellite stays HELD. Mesh tracking stays off. `decryption_complete` stays false. Tie-break stays refused.

## What it is

One ingest for receipts from godlock.uk, furnaceisntfree.com, TimeToUnsealTheBook (timetounsealthebook / the unseal sister site), and later sister sites.

The port stores the receipt in the corpus `DOWNLOADS` KV binding. It does not write the library ledger, `records`, or `/v1/ingest`. A receipt is not a library document.

When the corpus D1 binding is present, an accepted receipt is wrapped onto the existing secondary lattice. The wrap is an online write: `offline` is false, so the primary hash chain is `hashPayload({ document, prev })` and the secondary hash is `hashPayload({ offline: false, prev, primary })`. The row sits on the `sites` plane and the hash is filed under `/receipts/sites/{site}`. The public `POST /v1/lattice/wrap` door stays fail-closed until `LATTICE_REMOTE` is on. This port does not flip that flag.

Public reads omit comments, usernames, and snapshots. An aggregate list requires the corpus operator token. Image bytes are refused. An image is stored only as sha256, byte size, and pixel size.

## Routes

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/v1/port/receipts` | `Authorization: Bearer` site token |
| GET | `/v1/port/sites` | none |
| GET | `/v1/port/receipts?site=&id=` | none; public fields only |
| GET | `/v1/port/receipts` | operator token; hash list, still no comments |

Furnace should set:

```text
CORPUS_INGEST_URL=https://www.azielcorpuslibrary.net/v1/port/receipts
CORPUS_INGEST_TOKEN=<same value as PORT_TOKEN_FURNACE>
```

Leave `CORPUS_FORWARD_IMAGES` unset. The port rejects image bytes (`jpeg_base64`) with HTTP 422.

## Registry

One site is one entry in `PORT_SITES` (`workers/download-tracker/src/receipt-port.js`) and one Wrangler secret. The slug is also a row in `AGGREGATE_SITES` so the lattice can file the hash.

| Site id | Canonical origin | Secret on the corpus worker |
| --- | --- | --- |
| `furnace` | `https://furnaceisntfree.com` | `PORT_TOKEN_FURNACE` |
| `godlock` | `https://godlock.uk` | `PORT_TOKEN_GODLOCK` |
| `unseal` | `https://www.timetounsealthebook.net` | `PORT_TOKEN_UNSEAL` |

`www.furnaceisntfree.com`, `www.godlock.uk`, and `https://timetounsealthebook.net` are aliases for host matching. The secret value is never written to git, logs, or the sites list. Comparison is constant-time. An unknown site, a missing token, or a token for a different site is HTTP 401. The body does not echo the token.

Set the three secrets on the corpus worker. Do not put them in `wrangler.toml`.

## Furnace payload

Accepted as sent by furnaceisntfree.com (`the-furnace-isnt-free.receipt.v1`). Furnace does not add a `site` field. The port derives `furnace` from the schema, `source`, and `ingest_as_receipt.canonical_url`, then checks `PORT_TOKEN_FURNACE`.

```json
{
  "schema": "the-furnace-isnt-free.receipt.v1",
  "ingest_as_receipt": {
    "id": "tfi_0123456789abcdef0123456789abcdef",
    "canonical_url": "https://furnaceisntfree.com/the-numbers/",
    "content_sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "created_at": "2026-10-31T00:00:00.000Z"
  },
  "kind": "tool-usefulness",
  "tool": "free-meaning",
  "useful": true,
  "comment": "",
  "snapshot": {},
  "image": { "present": false },
  "publish_consent": false,
  "source": "https://furnaceisntfree.com"
}
```

`comment` and `snapshot` are stored in the private KV row. They are not returned and they are not copied onto the lattice.

```bash
curl -sS -D - \
  -X POST "https://www.azielcorpuslibrary.net/v1/port/receipts" \
  -H "authorization: Bearer $PORT_TOKEN_FURNACE" \
  -H "content-type: application/json" \
  -H "user-agent: the-furnace-isnt-free/1.0" \
  --data @furnace-receipt.json
```

## Generic envelope

godlock and unseal use this shape. `schema` should be `aziel.receipt-port.v1`. `body` is the site's own object. `content_sha256` is the sender's hash of that body. The port chains its own `receipt_hash` over the declared fields. It does not re-hash the furnace preimage, because furnace already did that and only sends the digest.

```json
{
  "site": "godlock",
  "schema": "aziel.receipt-port.v1",
  "id": "gl_example_1",
  "created_at": "2026-11-13T00:00:00.000Z",
  "content_sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "kind": "tool-usefulness",
  "body": {}
}
```

```bash
curl -sS -D - \
  -X POST "https://www.azielcorpuslibrary.net/v1/port/receipts" \
  -H "authorization: Bearer $PORT_TOKEN_GODLOCK" \
  -H "content-type: application/json" \
  --data @godlock-receipt.json
```

```bash
curl -sS -D - \
  -X POST "https://www.azielcorpuslibrary.net/v1/port/receipts" \
  -H "authorization: Bearer $PORT_TOKEN_UNSEAL" \
  -H "content-type: application/json" \
  --data '{"site":"unseal","schema":"aziel.receipt-port.v1","id":"unseal_example_1","created_at":"2026-11-13T00:00:00.000Z","content_sha256":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","kind":"page-receipt","body":{}}'
```

```bash
curl -sS "https://www.azielcorpuslibrary.net/v1/port/sites"
```

## Storage and responses

- Durable key: `(site, id)` in KV `DOWNLOADS`.
- Same `content_sha256` for that pair returns HTTP 200 and the original `receipt_hash` and `stored_at`.
- A different `content_sha256` for the same id is HTTP 409. The port does not rewrite a receipt.
- JSON larger than 64KB is HTTP 413.
- Image bytes are HTTP 422. Hash, byte count, width, and height are accepted.
- Each site is limited to 60 authenticated POSTs a minute in the isolate (`PORT_RATE_PER_MINUTE` overrides the cap). Failed tokens use a separate auth bucket and do not consume that site cap. The existing fan-out bucket also applies to the POST.
- HTTP 201 body: `{ ok, site, id, receipt_hash, stored_at }` plus policy flags (`live` false, `cap7_is_icann` false, `paid_sat` `HELD`, `mesh_tracking` false, `library_document` false).
- `receipt_hash` is the port chain hash. It includes the previous port hash for that site, starting from 64 zeroes.

## Public read

`GET /v1/port/receipts?site=furnace&id=tfi_…` returns the public row only.

`GET /v1/lattice/pull?entry_hash=` reads the hash block. Unauthenticated pull omits username. Aggregate lattice reads stay operator-gated. The filed `/receipts/sites/{site}` row is the hash, not the comment.
