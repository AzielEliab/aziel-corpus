# RL-WP-0.1 — Rate Limit and Donation Plan (library scope)

Author: **Aziel Eliab** only.

Status: library-scope implementation note. Not a Softwares-tab product. Not a Node Gate. Not a shutdown of aziel-runtime.

Canonical design: [aziel-runtime `docs/designs/RL-WP-0.1.md`](https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs/RL-WP-0.1.md). Companion: [TUN-WP-0.1](TUN-WP-0.1.md).

## Sentence

Users are cheap. The catalog walk is not. Limit visitors on the Worker. Do not limit the operator. Do not hide the runtime.

## What shipped on this Worker

1. **Packed catalog** — `library:index:v1`. One KV get with `cacheTtl: 3600` plus Cache API. `list()` left the hot path (`/`, `/count`, `/stats`, `/software` stats, `/v1/health`, `/v1/library-index`, `/runtime/v1/uses`).
2. **Cache-Control** — public JSON uses `public, s-maxage=300, stale-while-revalidate=3600`.
3. **KV cap** — hot-path budget helper (`MAX_HOT_KV_OPS = 8`, TUN standby). Exceed → truncated packed response, no walk.
4. **Visitor bucket** — SHA-256 of `CF-Connecting-IP` + optional `aziel_vid` cookie.
   - 60 / minute, 600 / hour, 5,000 / day
   - Search: 30 / minute; record views: 120 / hour
   - Soft exceed: HTTP 429, `Retry-After: 30`, last cached catalog
5. **Operator exclude** — `X-Aziel-Operator-Token` or `Authorization: Bearer` matching the `OPERATOR_TOKEN` (or `GATE_TOKEN`) Wrangler secret, or a signed operator session. No public IP allowlist UI. See `workers/download-tracker/gate_config.example.json`.
6. **Donate tab** — `GET /donate`. Static island. Does not touch KV, D1, or Durable Objects. Addresses are operator paste at publish. This file does not invent wallets.

## What it is not

- Not a public Node Gate panel.
- Not an IP allow/block UI.
- Not invented wallet addresses.
- Not a GodLock ledger write.

## Measure

KV reads / request should fall from ~191 toward 1–3 on catalog pages. If it does not, the packed key is not on the hot path yet.
