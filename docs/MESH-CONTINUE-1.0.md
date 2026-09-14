# MESH-CONTINUE-1.0 — Expected-outage continuity

Author: Aziel Eliab only
Spec id: MESH-CONTINUE-1.0
Date: 2026-09-14
License: Apache-2.0
Amends: MESH-VAULT-1.0, MESH-SPLIT-WIRES-1.0, MESH-COLD-COPY-1.0, MESH-REEXPAND-1.0, MESH-REHEAL-1.0
Neighbors: TUN-WP-0.1, QNM-WP-1.0, NODE-OPS-1.0 phoenix loop, ACT-RECEIPT-1.0, GodLock
Umbrella: CROSS-NETWORK-SURVIVAL-1.0 — if the network and live data die tomorrow, the chain still survives on cold copies (bytes↔hash)
Not a VPN. Not an IP-mask product. Not an untraceable-origin path. Not a hydra of anonymous hosts. Public Worker rollup is counts/status — not the cell. Not live body sync. Not crawler resurrection.

## 0. Sentence

A primary hostname going dark is an expected system event. Continuity of records is the vault tip plus any other official origins that are still up plus Worker standby on named sites that still exist plus the cold copies already multiplied on transfer (MESH-COLD-COPY-1.0). A pulled site, revoked token, dropped Worker, or killed DNS ends the public rollup for that name. It does not wipe those cold replicas. Content moves by hash. Hosts stay named. Live sync of bodies is refused. The mesh does not climb back onto a dead public hostname. Data outlives creators.

## 1. Two different problems

Outlive the file: solved by SHA-256, packed index, receipt chain, optional public IPFS pin of objects already published, and cold multiply on every lawful transfer. The tip is expensive to erase because copies are many. Live sync of bodies across the network is not how those copies move.

Outlive a hostname: two different events. Do not collapse them.

- Temporary tunnel-process miss (token, DNS name, Worker, and account still legal): other official origins that are still up, Cloudflare anycast Worker on those same names if still reachable, operator cloudflared to those same names. A process supervisor may restart cloudflared. That is operator kit. It is not in the public contract, and it fails if the credential or hostname is gone.
- Site / token / DNS / Worker pull: public rollup is dead. Cold replicas are not. A server pull cannot wipe a packed vault already taken. Local node can keep verifying and appending from the vault. The named-hosts-only walk finds answers that are still up. It does not resurrect the pulled host. Phoenix is a wait / re-seal after poison or isolation, not "bring the .uk node back." Poison is refused hash-absolute. Equivocation isolates that node.

Outlive attribution: not a goal of this spec. Fresh-IP spin-up, encrypted P2P bootstrap used as hidden hosting, and unmarked tunnel hydras are refused.

## 2. Discovery walk (named only)

When a probe to an official origin fails (timeout, non-2xx, health miss):

1. Read local MESH-VAULT tip.
2. Probe the remaining official origins in order: corpus → landing → godlock.uk → hedidntjump.com.
3. Accept a replica only as a proof: cite of prev + lockset, fail-closed. A matching previously stamped tip is a valid cite. A newer tip without that cite is isolate, not apply. Clock desync ≠ yes. Ambiguous tip = isolate. Health-probe miss is not poison and is not apply-last-packet (MESH-SPLIT-WIRES-1.0).
4. Serve Worker standby on the same official hostname if that Worker is still reachable. That answer is counts/status / packed index — not the cell.
5. If every official origin misses, stay on the local vault (the cold copy). Do not invent a host. Do not auto-splice a split-brain. Cell rejoin is cite + operator/lockset, not this walk. Do not live-sync bodies to fill the gap.

No raw A-record hunting. No unmarked IP as a public origin. Pulled hosts are not resurrected. The walk does not auto-reattach cloudflared to a dead hostname. This named-host walk is not the 0.5–1s cell tick and does not share a socket with the 777s dwell gate.

## 3. What new instance means here

Cloudflare already anycasts the Worker. A replacement Worker the operator publishes still answers on the official name only if that name, the Worker, and the account still exist. That Worker remains a counts/status rollup — not the cell. Phoenix is a wait / re-seal after poison or isolation, local to the failed node only, not "bring the .uk node back." QNM / NODE-OPS phoenix does not restore a public .uk or other official hostname and does not climb the mesh back onto the public name.

Sites pulled → public rollup is down → local node can keep verifying and appending from cold copies. A server pull cannot wipe those replicas. The mesh does not climb back onto the public hostname by itself. Data outlives creators. Re-expand from those archive bytes is MESH-REEXPAND-1.0. Reheal of a poisoned live node is MESH-REHEAL-1.0 (self tip + trusted pull or phoenix-WAIT; never neighbor majority). Do not collapse the two.

## 4. Optional public pin

The operator may pin already-public vault_tip.json and receipt JSONL to a content store. The CID points at a hash already published. It is not a hidden tunnel and not a bootstrap roster of unmarked peers.

## 5. Receipt

Each failover walk mints ACT-RECEIPT-1.0: which official origin missed, which official origin or local vault answered, event metadata only.

## 6. Cap

Decentralized continuity of records is in scope. Decentralized concealment of hosts is not. Named hosts only. No VPN. No unmarked tunnel hydra. No live body sync. Cold copies survive a pull. If the network and live data die tomorrow, those copies on independent shelves *are* the chain (CROSS-NETWORK-SURVIVAL-1.0). Survival is bytes↔hash. Crawlers are extra shelves, not resurrection. Re-expand is archive restore (MESH-REEXPAND-1.0). Reheal is self tip + trusted pull or phoenix-WAIT — not neighbor majority (MESH-REHEAL-1.0).
