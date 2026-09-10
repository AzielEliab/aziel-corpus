# TUN-WP-0.1 — Library Tunnel Front

Author: **Aziel Eliab** only.

Status: local specification (2026-09-09). Not a Softwares-tab product. Not a VPN. Not a Node Gate. Not an untraceable-origin claim.

Canonical design: [aziel-runtime `docs/designs/TUN-WP-0.1.md`](https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs/TUN-WP-0.1.md). Companion: [RL-WP-0.1-library](RL-WP-0.1-library.md).

Origin in scope: **https://www.azielcorpuslibrary.net** only.

---

## Library Tunnel Front

Rate-limit frontend for azielcorpuslibrary.net with Worker failover.

## 0. Sentence

Tunnel first. Cloudflare Worker only if the tunnel is down. Visitors never receive a home IP. “Untraceable” is not a claim this paper makes.

## 1. What is already true

The library already answers with `server: cloudflare` and a CF-Ray. Public clients hit Cloudflare, not a residential address.

The cost problem in RL-WP-0.1-library is KV reads on the Worker behind that edge (~191 KV ops per request). Hiding an IP does not by itself cut that bill. A cache that sits in front of KV does.

This plan reuses Cloudflare Tunnel as a **read frontend**, not as a new public identity surface.

## 2. Claim

Priority:

1. **Tunnel (primary).** Named cloudflared frontend. Packed disk index. Rate bucket. Outbound only.
2. **Cloudflare Worker (standby).** Same hostname. Packed `library:index:v1`. No `KV.list()` on the hot path. Takes traffic only when the tunnel is down or 5xx.

Cloudflare edge is not a third origin. It is the always-on switch: TLS, orange-cloud DNS, cache, health check. It forwards to (1), and if (1) fails it forwards to (2).

This repository implements the **Worker standby** path fully. Tunnel-primary topology is documented; cloudflared frontend is later.

## 3. What it is not

- Not a public Node Gate panel or IP allow/block UI.
- Not an untraceable-origin path.
- Not a promise that Cloudflare, the registrar, or a payment processor cannot see an account.
- Not a VPN that hides the operator from Cloudflare. The tunnel connector IP is visible to Cloudflare. It is not visible to library visitors.
- Not rate limits on godlock.uk or on local ChainLock.
- Not a second catalog of truth. The Worker remains the record of public AZDOC cards. The tunnel serves a replica.

## 4. Target topology

```
visitor
  → Cloudflare edge (azielcorpuslibrary.net, proxy ON)
       cache hit              → packed search / card
       tunnel healthy PRIMARY → named tunnel → local frontend
       tunnel down / timeout / 5xx STANDBY → this Worker
```

Local frontend reads AZDOC id, title, `content_sha256`, `chain_tip`. No PDF bodies in the index.

## 5. Failover — tunnel first

Two ways. Both keep the apex orange-cloud. Neither publishes a raw IP.

**A. Edge steer** (preferred when Zero Trust public hostname + health check exist). Public hostname azielcorpuslibrary.net → tunnel service. Health check `GET /v1/health`. Unhealthy → Workers custom domain on the same hostname takes the zone.

**B. Thin switch on the Worker** (no Load Balancing add-on). Worker is bound to the hostname but is not the app while the tunnel lives:

```
on request:
  if cache hit: return
  if operator token: skip bucket
  if visitor over bucket: 429 + last cached page
  try fetch(TUNNEL_ORIGIN + path) 800ms
  if 2xx: cache and return          # tunnel first
  else: serve Worker packed index   # Cloudflare takes over
```

Do not swap A records. Do not point the apex at a VPS.

Health: `GET /v1/health` → `{ ok, role: "standby" | "tunnel-front", topology: "tunnel-primary", index_sha256, ts }`. Timeout or non-ok on a future tunnel `/v1/health` (`role: "tunnel-front"`) means the tunnel is down; this Worker answers on the same hostname.

Optional `TUNNEL_ORIGIN`: GET/HEAD tries the tunnel for 800ms, then serves the Worker packed path. Unset → Worker is the full standby path today.

## 6. Rate limit — abuse only, not readers

Humans and SEO crawlers are **not** capped on browse, search, cards, or SEO documents. Cost cut is packed index + Cache-Control.

Soft 429 + last packed catalog is reserved for extreme write/walk API fan-out. Googlebot, GPTBot, Claude, bingbot, Perplexity, and the rest of the AI Allow list never receive 403/429 or thin pages.

Operator exclude: secret header or Access service token in `gate_config.json` only. Never a button.

See [RL-WP-0.1-library](RL-WP-0.1-library.md).

## 7. Origin-IP and operator safety

**What visitors see.** Cloudflare anycast. No A record to a home or VPS IP. Proxy status stays orange.

**What the tunnel does.** cloudflared makes only outbound connections to Cloudflare. No port-forward, no UPnP, no inbound 443 on the host. The host firewall default-denies inbound.

**What Cloudflare sees.** The connector IP of whatever machine runs cloudflared. That is the remaining origin leak toward the vendor, not toward the public.

Honest reductions: run cloudflared on a host that is not a daily phone or court-evidence laptop; prefer a small VPS over a residential IP in tunnel logs; do not place a home county, legal name, or LAN hostname in tunnel config or HTML; operator browsing uses a separate VPN/WARP session (hides the operator from other sites; does not hide the connector from Cloudflare); WHOIS privacy; scoped Cloudflare API token; no inbound management ports; Slingshot Prep on any exported frontend bundle.

What this does **not** do: erase the Cloudflare account, the domain payment, or historical CF-Ray logs; survive the operator logging into the dashboard from an identified session and then calling that “hidden”; create a second, unlinked identity.

If the threat model is “random visitor and scraper,” orange-cloud + outbound tunnel is enough. If the threat model is “vendor or payer can be compelled,” do not put privileged plaintext on the library Worker.

## 8. Build order

1. Stand up named tunnel `library-front`. Public hostname = azielcorpuslibrary.net (tunnel first).
2. Local frontend serves packed index from disk. No `KV.list`. `/v1/health` live.
3. Ship RL-WP-0.1-library on the Worker as standby only (packed index, `cacheTtl`, 8 KV cap).
4. Wire health check: tunnel 2xx stays primary; down/5xx/timeout → Worker.
5. Edge rate rules + cache on the zone (apply to both origins).
6. Donate strip static on both copies. No KV.
7. Measure: fraction of requests served by tunnel vs Worker, KV reads per request on standby only.

Do not flip the apex A record to a raw VPS. That publishes an IP.

## 9. When the tunnel goes down

Tunnel down → Cloudflare Worker answers on the same hostname. Search still works from the packed index. Some freshness lag. Soft rate limit still on. ChainLock library-sync still uses `/v1/search` on that hostname. When the tunnel returns, it becomes primary again without a DNS change.

Local ChainLock vault / `library.jsonl` is the site-fail shelf for the operator and for any client that already synced. That path does not need the tunnel.

## 10. Cap

This is a plan. It is not a cloudflared install script and not a new public panel. Connector IP is hidden from visitors, not from Cloudflare. Untraceable-origin hosting is refused.

This repository implements the Worker standby path:

- Packed key `library:index:v1` (AZDOC id, title, shelf, `content_sha256`, `chain_tip`, updated). No PDF bodies.
- Hot path does **not** call `KV.list()`.
- `GET /v1/health` reports `{ ok, role: "standby", topology: "tunnel-primary", failover_ready, index_sha256, ts }`.
- `GET /v1/search` filters the packed object in memory.

Identity: **Aziel Eliab** only.

Companion: [RL-WP-0.1-library](RL-WP-0.1-library.md), CL-WP-0.4 § library tether, SG-WP-0.1.
