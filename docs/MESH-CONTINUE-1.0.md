# MESH-CONTINUE-1.0 — Expected-outage continuity

Author: Aziel Eliab
Spec id: MESH-CONTINUE-1.0
Date: 2026-09-13
License: Apache-2.0
Amends: MESH-VAULT-1.0
Neighbors: TUN-WP-0.1, QNM-WP-1.0, NODE-OPS-1.0 phoenix loop, ACT-RECEIPT-1.0, GodLock
Not a VPN. Not an IP-mask product. Not an untraceable-origin path. Not a hydra of anonymous hosts.

## 0. Sentence

A primary hostname going dark is an expected system event. Continuity is the vault tip plus the other official origins plus Worker standby on the named sites. Content moves by hash. Hosts stay named.

## 1. Two different problems

Outlive the file: solved by SHA-256, packed index, receipt chain, optional public IPFS pin of objects already published.

Outlive a hostname: solved by four official origins, Cloudflare anycast Worker, operator cloudflared to those same names.

Outlive attribution: not a goal of this spec. Fresh-IP spin-up, encrypted P2P bootstrap used as hidden hosting, and unmarked tunnel hydras are refused.

## 2. Discovery walk (named only)

When a probe to an official origin fails (timeout, non-2xx, health miss):

1. Read local MESH-VAULT tip.
2. Probe the remaining official origins in order: corpus → landing → godlock.uk → hedidntjump.com.
3. Accept a replica only if the packed index hash or vault tip matches a previously stamped tip, or the origin presents a newer stamped tip.
4. Serve Worker standby on the same official hostname if that Worker is still reachable.
5. If every official origin misses, stay on the local vault. Do not invent a host.

No raw A-record hunting. No unmarked IP as a public origin.

## 3. What new instance means here

Cloudflare already anycasts the Worker. A replacement Worker the operator publishes still answers on the official name. QNM / NODE-OPS phoenix is isolate, wait, resume on the named fabric.

## 4. Optional public pin

The operator may pin already-public vault_tip.json and receipt JSONL to a content store. The CID points at a hash already published. It is not a hidden tunnel and not a bootstrap roster of unmarked peers.

## 5. Receipt

Each failover walk mints ACT-RECEIPT-1.0: which official origin missed, which official origin or local vault answered, event metadata only.

## 6. Cap

Decentralized continuity of records is in scope. Decentralized concealment of hosts is not.
