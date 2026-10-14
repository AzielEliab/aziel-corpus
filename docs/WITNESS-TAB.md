# Witness tab (/witness, /witness.json)

Reads `anchors/log.jsonl` from AzielEliab/aziel-anchors and re-checks every record: hash of the canonical statement, Ed25519 signature against the pinned key for that n (retired key for n 1-2), row key equals pinned key, prev link, n in order. Newest first, times in ET.

- Cost: one fetch per 60 s per Cloudflare colo (Cache API, 60 s TTL). No cron, no D1, no KV. New records appear within about a minute.
- Body is streamed and byte-counted; past 4 MB the read is cancelled and the page fails closed (503, try again later). 429/403 from the host: 503 + Retry-After.
- A failed record is labelled failed; its Sigstore link is not shown.
- Only one witness exists. Witness 2 is not configured.
- Limit: a truncated tail (newest records cut off the end) cannot be detected here without an outside record of the newest head.
