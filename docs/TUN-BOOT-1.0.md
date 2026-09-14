# TUN-BOOT-1.0 — Named tunnel bootstrap on primary miss

Author: Aziel Eliab only
Spec id: TUN-BOOT-1.0
Date: 2026-09-14
License: Apache-2.0
Amends: MESH-CONTINUE-1.0, TUN-WP-0.1, MESH-SPLIT-WIRES-1.0, MESH-COLD-COPY-1.0, MESH-REEXPAND-1.0, MESH-REHEAL-1.0
Not a VPN. Not an unmarked host. Not a fresh-IP factory. Public Worker rollup is counts/status — not the cell. Not live body sync.

## 0. Sentence

If the primary official site fails a health probe, bootstrap the next named path that is still up: published Worker standby, then the other official origins, then the local vault.

This client walk finds named answers still up. It does not resurrect pulled hosts and does not auto-reattach cloudflared to a dead hostname. It is not the cell 0.5–1s tick, not payload fan-out, and not auto-splice of a split-brain. Cell rejoin is cite + operator/lockset (MESH-SPLIT-WIRES-1.0). The 1s loop and the 777s gate never share a socket.

Named origin for an epoch is the first published roster node that is on, or that this walker successfully touches. Unmarked machines do not become origins by touching the wire.

## 1. Walk

1. https://www.azielcorpuslibrary.net/v1/health
2. https://aziel-corpus-download-tracker.vibelock.workers.dev/v1/health — published Worker name, same catalog
3. https://www.azieleliab.com/
4. https://godlock.uk/
5. https://hedidntjump.com/
6. local MESH-VAULT

Stop at the first named answer. Do not invent a host. Do not probe raw IPs. A pulled, revoked, dropped, or DNS-killed name is not an answer.

## 2. Epoch origin

First published roster node that answers this touch becomes named origin for the epoch. It holds while it stays up. If it misses, the first published node up on the next touch takes the name. All-miss clears the epoch and stays on the local vault. Epoch-origin is a named-host HTTP hold, not cell rejoin and not apply-last-packet after heartbeat loss.

## 3. Tunnel

Operator cloudflared remains outbound-only to the official hostname (TUN-WP-0.1) only while that hostname, token, DNS, and account are still legal. This bootstrap is the client walk that finds a named answer still up when that hostname misses. It does not provision hidden tunnel accounts, does not resurrect a pulled host, and does not auto-reattach cloudflared to a dead hostname.

A process supervisor on the box can restart cloudflared. That is operator kit. It is not in the public contract, and it fails if the credential or hostname is gone. Pull the site, revoke the token, drop the Worker, or kill DNS and cloudflared has nowhere legal to land.

## 4. Receipt

Each walk mints ACT-RECEIPT-1.0: first-touch or hold or failover-first-up, named origin id, event metadata only.

## 5. Cap

Named hosts only. No VPN. No unmarked tunnel hydra. Sites pulled → public rollup is down → local node can keep verifying and appending from cold copies. A server pull cannot wipe those replicas. The mesh does not climb back onto the public hostname by itself. Phoenix is local to the failed node only. Public Worker answers on this walk are counts/status — not the cell. Live sync of bodies is refused. This walk is not MESH-REEXPAND-1.0 (archive restore) and not MESH-REHEAL-1.0 (self tip + trusted pull or phoenix-WAIT; never neighbor majority).
