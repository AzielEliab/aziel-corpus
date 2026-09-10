# RL-WP-0.1-library — Rate Limit (library scope)

Author: **Aziel Eliab** only.

Status: local specification (2026-09-09) for this Worker. Not a Softwares-tab product. Not a Node Gate.

Canonical design: [aziel-runtime `docs/designs/RL-WP-0.1-library.md`](https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs/RL-WP-0.1-library.md). Companion: [TUN-WP-0.1](TUN-WP-0.1.md).

---

## Rate Limit and Donation Plan

For **azielcorpuslibrary.net only**.

Origin: https://www.azielcorpuslibrary.net

Evidence window (doctrine): Cloudflare billable usage, 2–9 September 2026 (8 of 30 cycle days).

## Priority (Aziel Eliab)

Cost savings come from **packing and caching**, not from rationing readers.

- Packed `library:index:v1` + no `KV.list()` on the hot path is the primary cut (non-negotiable).
- Public HTML, `/v1/search`, cards, sitemap, robots, llms, and cite stay **uncapped** for normal humans and SEO crawlers (Googlebot, GPTBot, Claude, bingbot, Perplexity, and the AI Allow list).
- Soft 429 + last packed catalog applies only to **extreme write/walk API fan-out**. Never thin/empty pages for SEO bots. Never a 30/120/800 content ceiling.
- Operator token remains uncapped. UI process and on-site info stay the same.

## 0. Sentence

This plan is for the library. Not godlock.uk. Not the software tabs. Not local ChainLock. Visitors can still search and open every card. KV.list walks leave the hot path. The operator is uncapped.

## 1. Scope

**In scope**

- https://www.azielcorpuslibrary.net
- `/v1/search`
- record cards (AZDOC id, title, `content_sha256`, `chain_tip`, shelf)
- the Worker KV that backs those cards
- a Donate strip on the library origin

**Out of scope**

- godlock.uk
- azieleliab.com / ae.com software tabs
- aziel-runtime Worker CPU as a separate product
- local `chainlock.py` vaults
- PDF bytes (those stay on the object shelf; sync already does not pull PDFs)

ChainLock library-sync is a client of `/v1/search`. After this plan it must hit **one packed index**, not ~191 keys.

## 2. What the bill said

Observed 2–9 September 2026 on the Cloudflare account that serves the library:

- Total cost: $142.26
- Projected cycle: $533.47 (2 September – 1 October)
- Average daily: $17.78
- KV Read Operations: 271.91M — $131.00
- KV List Operations: 1.33M — $5.00
- KV Write Operations: 1.37M — $5.00
- Workers CPU ms: 92.36M — $1.26
- Workers Standard Requests: 1.42M — inside the 10M included
- D1 rows read: 5.44B — inside the 25B included ($0)

First 10 million KV reads per month are included, then $0.50 per million. $131 is 262 million billable reads. That matches 271.91M minus the included 10M.

1.42 million requests / 271.91 million KV reads ≈ **191 KV operations per library request**. People are not opening 272 million pages. The library hot path is listing or getting too many keys per search or per record view.

## 3. Claim

One packed library index, edge cache on `/v1/search` and record cards, a per-visitor cap on the library Worker, and a server-side operator token cut billed KV reads without taking the shelf down.

## 4. What it is not

- Not a public Node Gate panel on the library.
- Not an IP allow/block UI.
- Not a deletion of AZDOC records.
- Not a change to ChainLock’s offline `library.jsonl` shelf.
- Not invented wallet addresses.
- Not rate limits on GodLock or on the operator’s local runtime.

## 5. Root cause on this origin

Likely hot-path habits on the library Worker:

- `KV.list()` of the AZDOC namespace on every search
- one `KV.get` per hit instead of one packed search result
- missing `cacheTtl` on card gets
- scrapers walking `/record/AZDOC-*` and `/v1/search?q=` across the catalog
- wrangler / dashboard list also bills

D1 already serves 5.44 billion row reads inside the free included band. If search can run on one cached JSON index, KV stops being the catalog walk.

## 6. Plan, library only

**Step 1 — Pack the library index.** One key `library:index:v1`: AZDOC id, title, shelf, `content_sha256`, `chain_tip`, updated ts. No PDF body. `/v1/search` filters that object **in memory**. `KV.list()` leaves the request path.

**Step 2 — Cache cards.** `KV.get(id, { cacheTtl: 3600 })` for a single record. Search responses: `Cache-Control: public, s-maxage=120, stale-while-revalidate=3600`. Repeat identical queries should not bill KV.

**Step 3 — Cap KV work per library request.** At most 8 KV operations per invocation (index + one card + receipts). Over that: return packed hits and truncated. Do not walk the namespace.

**Step 4 — No content rationing.** Browse, search, record HTML, and SEO documents are never visitor-bucketed. Soft 429 + last packed catalog applies only to extreme abuse on write/walk APIs (`POST /event`, verify-backfill, verify-geo, Jeeves/OCR/transcribe POSTs). SEO Allow-list User-Agents are never 403/429. Ceilings on that fan-out path are high (200/min, 2000/hour) so researchers are not mistaken for scrapers.

**Step 5 — Operator exclude.** Secret header (`X-Aziel-Operator-Token` / Bearer) or signed operator session. Token lives in server-side `gate_config.json` / Wrangler secrets. Operator sync, ingest, and verify skip the bucket. Same token must not appear in the library UI.

**Step 6 — Cycle alert.** Budget cap $80–$100 on this account so a catalog scrape cannot run to $533.

**Step 7 — Measure on this origin.** Success: KV reads per library request from ~191 toward 1–2. `/v1/search` stays up. `library-sync --query Q` still returns AZDOC cards. Offline `library.jsonl` unchanged.

## 7. What readers and crawlers get

- full HTML search, cards, and nav (same UI)
- `/v1/search` over one packed index (no per-key walk)
- sitemap, robots, llms, cite — 200, long public cache
- PDF links as they exist today (no new PDF pull into KV)
- ChainLock local shelf if they synced earlier

They lose the Worker paying ~191 KV ops per catalog request. They do **not** lose how much library content they may read.

## 8. Donation strip on the library

Static island on `azielcorpuslibrary.net` only for this paper.

- No KV. No D1. No Durable Objects.
- Networks the operator already controls. Paste addresses at publish. This paper does not invent them.
- Copy plus optional public-plane tx note.
- No legal name. No home. No case narrative.

The strip / `/donate` tab funds the cycle cap. It does not replace Steps 1–4.

## 9. Wire on the library Worker

```
frag → sweep → [library-bucket] → fold → static → packed index / card → emit
```

Refuse: `sweep-isolate` | `rate-soft` | `rate-hard` | `kv-cap`. ChainLock clients treat `rate-soft` as “use local shelf.” Site-fail was already the point of `library.jsonl`.

## 10. Cap

Library plan only. Do not copy these buckets onto GodLock or onto local ChainLock. Operator token stays off the page.

Identity: **Aziel Eliab** only.

Companion papers: [TUN-WP-0.1](TUN-WP-0.1.md), CL-WP-0.4 (library tether), AP-WP-0.2, SG-WP-0.1, LS-WP-0.1.
