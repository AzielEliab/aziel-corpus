# MESH-SPLIT-WIRES-1.0 — Split the wires

Author: Aziel Eliab only
Spec id: MESH-SPLIT-WIRES-1.0
Date: 2026-09-14
License: Apache-2.0
Amends: MESH-VAULT-1.0, MESH-CONTINUE-1.0, TUN-BOOT-1.0, TUN-WP-0.1
Neighbors: QNM-WP-1.0, NODE-OPS-1.0, QNM-BUILD-1.0, QNS-CD-1.0, ACT-RECEIPT-1.0, ChainLock CL-0.4, MESH-COLD-COPY-1.0, MESH-REEXPAND-1.0, MESH-REHEAL-1.0
Keeps: die-with-pull (PR #87) — sites pulled → public rollup is down; Phoenix does not restore a public hostname
Not a VPN. Not an IP-mask product. Not an untraceable-origin path. Not a claim that the public Worker is the cell.

## 0. Sentence

Split the wires. The fast 0.5–1s tick carries presence + tip hash only (fixed-size; no body, no diff, no file). Payload lives on a second plane the receiver pulls — never sender fan-out. An update is a proof, not a timer. The public Worker rollup stays counts/status. This public HTTPS surface is not the cell.

## 1. Two planes, two sockets

| Plane | Interval | Carries | Socket |
| --- | --- | --- | --- |
| Fast tick | 0.5–1s | presence + tip hash only (fixed-size) | own socket |
| Payload / 777s gate | receiver-pull after valid cite | body / diff / file the receiver asked for | other socket |

The 1s loop and the 777s gate never share a socket. Named-host HTTP failover (TUN-WP-0.1 / TUN-BOOT-1.0) is not this pair. Tunnel and Worker may share a public hostname. They are not the cell sockets.

Public `GET /v1/mesh` · `/status` · `/nodes` stay suite rollup: live / locked / isolated counts. `POST /v1/mesh/heartbeat` on this Worker is 5-minute Live Nodes TTL, not the 0.5–1s cell tick and not payload. Do not pretend the public Worker is the cell.

## 2. Fast tick

A lawful fast envelope is only:

- `presence`
- `tip_hash`

Fixed-size. No `body`. No `diff`. No `file`. Verify of the tip does not require a remote body pull (MESH-VAULT-1.0 §3).

## 3. Payload plane

Payload moves only when the receiver pulls it. Sender fan-out of bodies is refused. Live sync of bodies across the network is refused (MESH-COLD-COPY-1.0). No unsend of an unverified body. Emit last locally after own verify — not before, not as a broadcast of unverified bytes. Vault-on-transfer is cold multiply, not a live body pipe.

## 4. Update is a proof, not a timer

Accept an update only as a fail-closed proof:

1. Cite `prev` + lockset.
2. Valid cite → dwell 777s. That 777s is dwell after a valid cite, not a clock that says yes.
3. Clock desync ≠ yes.
4. Ambiguous tip = isolate.

A newer tip without a valid cite is isolate, not apply. Health-probe miss and heartbeat loss are not this proof.

## 5. Equivocation ends the peer

Same `prev`, two different tips → lock / isolate that node. Quorum cannot outvote a broken hash. The cell does not average a lie.

## 6. Phoenix (local to the failed node)

Phoenix is wait / re-seal after poison or isolation. It is local to the failed node only. It does not hunt a controller. It does not restore a public hostname. It does not climb the mesh back onto a pulled site (die-with-pull). Sites pulled → public rollup is down → local node can keep verifying and appending.

MESH-REHEAL-1.0 names that pair: reheal of a poisoned live node is self tip + trusted pull, or phoenix-WAIT. Never neighbor majority. Archive restore is MESH-REEXPAND-1.0 — a different door.

## 7. Partition

No auto-splice of a split-brain. Rejoin = cite + operator / lockset. Heartbeat loss ≠ poison ≠ apply last packet. Stay on the local vault when named origins miss (MESH-CONTINUE-1.0). Named-host walk finds answers that are still up. It is not cell rejoin and not resurrection of a pulled host.

## 8. What the public Worker may say

This library Worker may cite the law and show Live Nodes · N. It may not run the 0.5–1s cell tick, may not fan-out payload, may not share the 1s and 777s sockets, and may not draw a cell of peers it does not host.

## 9. Cap

Die-with-pull stays. Named hosts only. No VPN. No unmarked tunnel hydra. No sender fan-out of bodies. No timer-as-yes. No quorum over a broken hash. Reheal is not neighbor majority. Re-expand is archive restore. Identity: Aziel Eliab only.
