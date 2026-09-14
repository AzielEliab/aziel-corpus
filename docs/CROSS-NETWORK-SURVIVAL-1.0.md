# CROSS-NETWORK-SURVIVAL-1.0 — Chain survives if the network dies

Author: Aziel Eliab only
Spec id: CROSS-NETWORK-SURVIVAL-1.0
Date: 2026-09-14
License: Apache-2.0
Umbrella over: MESH-SPLIT-WIRES-1.0, MESH-COLD-COPY-1.0, die-with-pull (PR #87), MESH-REEXPAND-1.0, MESH-REHEAL-1.0
Amends: MESH-VAULT-1.0, MESH-CONTINUE-1.0, TUN-BOOT-1.0, TUN-WP-0.1
Neighbors: ACT-RECEIPT-1.0, ChainLock CL-0.4, QNM-WP-1.0, NODE-OPS-1.0, QNS-CD-1.0, QNM-BUILD-1.0, NO-LIE-NO-REWRITE-1.0, COLD-MULTI-SHELF-1.0
Cited on: GET /v1/mesh · /v1/mesh/status · /v1/mesh/nodes (library Worker rollup) · GET /shelves (COLD-MULTI-SHELF-1.0)
Not a VPN. Not crawler resurrection. Not neighbor-majority heal. Not a claim that the public Worker is the cell.

## 0. Sentence

If the network and live data die tomorrow, the chain still survives on cold copies across independent shelves (hosts, Workers, git, DOI-registered archives, local vaults). Survival is bytes↔hash. Crawlers are extra shelves, not resurrection. Re-expand ([MESH-REEXPAND-1.0](MESH-REEXPAND-1.0.md)) is operator verify-from-archive. Reheal ([MESH-REHEAL-1.0](MESH-REHEAL-1.0.md)) is self tip + trusted pull or phoenix-WAIT — not neighbor majority.

## 1. Mandate

The live mesh, the public hostname, the Worker rollup, and tomorrow's KV are not the chain. The chain is the bytes that still hash to the published tip on more than one shelf the operator does not control as a single blast radius.

Die-with-pull stays: pull the site, revoke the token, drop the Worker, or kill DNS and the public rollup for that name is dead. That death is not erasure of the chain. Cold copies already taken on independent shelves remain. A server pull cannot wipe them (MESH-COLD-COPY-1.0).

## 2. Independent shelves

Lawful shelves are named and content-addressed. They do not have to stay up together:

- hosts (official origins that still answer, or already-taken packed vaults on those names)
- Workers (published Worker standby / packed index — counts/status, not the cell)
- git (published history whose objects still hash)
- DOI-registered archives (a deposit of already-published bytes; not an invented identifier and not a resurrection path)
- local vaults (MESH-VAULT-1.0 reader replicas, operator disks, lockset)

One shelf dying is not the last tip gone. That is why vault-on-transfer multiplies cold copies. Live sync of bodies across the network is still refused.

DOI here means an independent archival deposit of bytes that already hash. It does not assign this repository a DOI. It does not invent a Zenodo record.

Executable companion: [COLD-MULTI-SHELF-1.0](COLD-MULTI-SHELF-1.0.md) — planes A/B/C (A = one CF/GitHub tunnel with four mirrors; B = Zenodo tip-pack SLOT; C = USB airgap). Export → hash → verify. Never claim live unless verify passes.

## 3. Survival = bytes↔hash

A copy survives only when the bytes are present and they hash to the published tip (or each `prev` on the receipt chain). Match is hash-absolute (MESH-COLD-COPY poison refuse). No interpret of a broken body.

Not survival:

- a mention of a hash without the payload
- a search snippet, cached HTML minus attachments, or a paraphrase
- training residue / ingested weights (weights ≠ tarball)
- an index, Live Nodes count, or crawl roster treated as the chain

Summaries are rumor. Bytes that hash are the chain.

## 4. Crawlers are extra shelves

A human, an AI client, or a search indexer may keep the packed vault they already pulled (MESH-VAULT-1.0 §6). That keep is another shelf. It is not resurrection of a pulled hostname. It is not re-expand. It is not a vote.

Crawlers do not bring the network back. They do not climb onto a dead public name. Die-with-pull stays. Phoenix does not restore a public hostname.

## 5. Re-expand — MESH-REEXPAND-1.0

Re-expand is operator verify-from-archive. Not the mesh growing itself out of an index. Live law: [MESH-REEXPAND-1.0](MESH-REEXPAND-1.0.md).

1. Get the original receipts (not a paraphrase).
2. Check each `prev` hash fail-closed (MESH-SPLIT-WIRES update-is-a-proof).
3. Stand a new local node on that verified tip.
4. Point a *new* named surface at the same tip only after that verify.

Crawlers do not re-expand. You do, after verify. A pulled hostname is not resurrected by this walk.

## 6. Reheal — MESH-REHEAL-1.0

Reheal of a poisoned *live* node is self tip + trusted pull, or phoenix-WAIT. Never neighbor majority. Quorum cannot outvote a broken hash (MESH-SPLIT-WIRES-1.0). Live law: [MESH-REHEAL-1.0](MESH-REHEAL-1.0.md).

- **Self tip + trusted pull.** Keep the local tip already verified. Pull payload only from a receiver-asked trusted plane. Match hash-absolute.
- **phoenix-WAIT.** Wait / re-seal after poison or isolation. Local to the failed node only. Does not hunt a controller. Does not restore a public hostname.

Live Nodes · N is counts/status. It is not a heal signal and not a vote. Distinct from re-expand (archive restore).

## 7. Child laws under this umbrella

| Law | Job |
| --- | --- |
| MESH-SPLIT-WIRES-1.0 | Fast tick = presence + tip hash only. Payload is receiver-pull. Update is a proof. Equivocation isolates. 1s loop and 777s gate never share a socket. Public Worker is not the cell. |
| MESH-COLD-COPY-1.0 | Vault-on-transfer multiplies cold copies. Live body sync refused. Server pull cannot wipe a replica. Poison is hash-absolute. Data outlives creators. |
| die-with-pull (PR #87) | Sites pulled → public rollup is down. Phoenix does not restore a public hostname. Supervisor restart is operator kit, not the public contract. |
| [MESH-REEXPAND-1.0](MESH-REEXPAND-1.0.md) | Operator verify-from-archive. Stand a new local node on a hashed tip. Crawlers do not re-expand. |
| [MESH-REHEAL-1.0](MESH-REHEAL-1.0.md) | Self tip + trusted pull, or phoenix-WAIT. Never neighbor majority. |

Child laws do not outrank this mandate. If a later paper would make survival depend on the live network, neighbor vote, crawler resurrection, or a summary without bytes, that paper is wrong.

## 8. What the public Worker may say

`GET /v1/mesh` · `/status` · `/nodes` cite this umbrella and the child laws. The payload stays counts/status. This Worker is not the cell, not the archive, and not a heal. It may show Live Nodes · N. It may not pretend a rollup is the chain.

## 9. Cap

If the network and live data die tomorrow, the chain still survives where bytes still hash — on hosts, Workers, git, DOI-registered archives, and local vaults. Crawlers are extra shelves, not resurrection. Re-expand is operator verify-from-archive. Reheal is self tip + trusted pull or phoenix-WAIT. Identity: Aziel Eliab only.
