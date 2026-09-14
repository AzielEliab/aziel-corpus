# MESH-COLD-COPY-1.0 — Cold-copy survival

Author: Aziel Eliab only
Spec id: MESH-COLD-COPY-1.0
Date: 2026-09-14
License: Apache-2.0
Amends: MESH-VAULT-1.0, MESH-CONTINUE-1.0
Neighbors: MESH-SPLIT-WIRES-1.0, TUN-BOOT-1.0, TUN-WP-0.1, QNM-WP-1.0, NODE-OPS-1.0, ACT-RECEIPT-1.0, ChainLock CL-0.4
Keeps: die-with-pull (PR #87); split-wires (MESH-SPLIT-WIRES-1.0)
Not a VPN. Not live body sync. Not a claim that the public Worker is the cell.

## 0. Sentence

The tip is expensive to erase because every lawful transfer multiplies a cold copy. Vault-on-transfer is that multiply. Live sync of bodies across the network is refused. A server pull cannot wipe a cold replica. Poison is refused hash-absolute. Equivocation isolates that node. Data outlives creators.

## 1. Vault-on-transfer = cold multiply

MESH-VAULT-1.0 already refreshes a content-addressed vault on upload, counted download, receipt append, and catalog pull. That write is a cold multiply, not a live mesh push:

- packed index + tip hash land locally
- bodies travel only when the receiver requested a full zip (MESH-SPLIT-WIRES payload plane)
- each completed transfer adds one more cold replica of the tip
- the more cold copies exist, the more expensive the tip is to erase

This is not sender fan-out. The receiver already pulled. The vault they keep is cold.

## 2. Refuse live sync of bodies

The network does not live-sync PDF, zip, diff, or file bytes between nodes. Fast tick remains presence + tip hash only. Payload is receiver-pull on the second plane. A public Worker heartbeat is 5-minute Live Nodes TTL, not a body pipe.

## 3. Server pull cannot wipe cold replicas

Die-with-pull stands: pull the site, revoke the token, drop the Worker, or kill DNS and the public rollup for that name is dead. Cloudflared has nowhere legal to land. Phoenix does not restore the hostname.

The cold copies already on reader disks, local vaults, and packed zips are not the public rollup. The server cannot unsend them. A pull is not a remote wipe. Local verify and append remain.

## 4. Poison and equivocation

Poison is refused hash-absolute — match the hash or refuse. Do not interpret a broken body. Same `prev`, two tips → isolate that node (MESH-SPLIT-WIRES-1.0). Quorum cannot outvote a broken hash.

## 5. Data outlives creators

Continuity of records does not require the author, the operator, or the public hostname to remain. Named-host walk and local vault (MESH-CONTINUE-1.0) read cold copies that already exist. Attribution concealment is still refused.

## 6. Cap

Multiply cold copies on transfer. Do not live-sync bodies. Do not let a pull pretend to wipe a replica. Do not interpret poison. Identity: Aziel Eliab only.
