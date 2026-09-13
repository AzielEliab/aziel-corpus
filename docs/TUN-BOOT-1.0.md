# TUN-BOOT-1.0 — Named tunnel bootstrap on primary miss

Author: Aziel Eliab
Spec id: TUN-BOOT-1.0
Date: 2026-09-13
License: Apache-2.0
Amends: MESH-CONTINUE-1.0, TUN-WP-0.1
Not a VPN. Not an unmarked host. Not a fresh-IP factory.

## 0. Sentence

If the primary official site fails a health probe, bootstrap the next named path: published Worker standby, then the other official origins, then the local vault.

## 1. Walk

1. https://www.azielcorpuslibrary.net/v1/health
2. https://aziel-corpus-download-tracker.vibelock.workers.dev/v1/health — published Worker name, same catalog
3. https://www.azieleliab.com/
4. https://godlock.uk/
5. https://hedidntjump.com/
6. local MESH-VAULT

Stop at the first named answer. Do not invent a host. Do not probe raw IPs.

## 2. Tunnel

Operator cloudflared remains outbound-only to the official hostname (TUN-WP-0.1). This bootstrap is the client walk that finds a named answer when that hostname misses. It does not provision hidden tunnel accounts.

## 3. Receipt

Each walk mints ACT-RECEIPT-1.0: which official origin missed, which named path answered, event metadata only.
