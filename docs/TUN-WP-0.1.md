# TUN-WP-0.1 — Library Tunnel Front

Author: **Aziel Eliab** only.

Status: library-scope implementation note (standby Worker path). Not a Softwares-tab product. Not a VPN. Not a Node Gate. Not an untraceable-origin claim.

Canonical design: [aziel-runtime `docs/designs/TUN-WP-0.1.md`](https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs/TUN-WP-0.1.md). Companion: [RL-WP-0.1](RL-WP-0.1.md).

## Sentence

Tunnel first. Cloudflare Worker only if the tunnel is down. Visitors never receive a home IP. “Untraceable” is not a claim this paper makes.

## Topology (document now; cloudflared frontend later)

```
visitor
  → Cloudflare edge (azielcorpuslibrary.net, orange-cloud)
       cache hit              → packed search / card
       tunnel healthy PRIMARY → named cloudflared frontend
       tunnel down / 5xx      → this Worker (standby)
```

Cloudflare edge is the always-on switch (TLS, DNS, cache, health). Do not swap A records. Do not point the apex at a VPS.

This repository implements the **Worker standby** path fully:

- Packed key `library:index:v1` (AZDOC id, title, author, library, `content_sha256`, `chain_tip`, href). No PDF bodies.
- Hot path does **not** call `KV.list()`.
- `GET /v1/health` reports `{ ok, role: "standby", topology: "tunnel-primary", failover_ready, index_sha256, ts }`.
- Optional `TUNNEL_ORIGIN`: GET/HEAD tries the tunnel for 800ms, then serves the Worker packed path.
- Worker remains the catalog of truth for public cards. A tunnel frontend would serve a replica.

## What it is not

- Not a public Node Gate / IP allowlist UI.
- Not a VPN that hides the operator from Cloudflare.
- Not a second catalog of truth.
- Not rate limits on godlock.uk or local ChainLock.

## Health

`GET /v1/health` and `GET /v1/library-index` on https://www.azielcorpuslibrary.net/

Timeout or non-ok on a future tunnel `/v1/health` (`role: "tunnel-front"`) means the tunnel is down; this Worker answers on the same hostname.
