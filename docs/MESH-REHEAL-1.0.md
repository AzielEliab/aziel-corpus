# MESH-REHEAL-1.0 — Reheal a poisoned live node

Author: Aziel Eliab only
Spec id: MESH-REHEAL-1.0
Alias: REHEAL-1.0
Date: 2026-09-14
License: Apache-2.0
Amends: MESH-SPLIT-WIRES-1.0, MESH-COLD-COPY-1.0, MESH-VAULT-1.0, MESH-CONTINUE-1.0
Neighbors: MESH-REEXPAND-1.0, TUN-BOOT-1.0, TUN-WP-0.1, QNM-WP-1.0, NODE-OPS-1.0, ACT-RECEIPT-1.0, ChainLock CL-0.4
Keeps: die-with-pull (PR #87); split-wires + cold-copy (PR #88)
Distinct from: MESH-REEXPAND-1.0 — re-expand is archive restore (original receipts, each prev-hash, new local node on that tip). Not this law.
Not a VPN. Not neighbor-majority heal. Not quorum over a broken hash. Public Worker rollup is counts/status — not the cell.

## 0. Sentence

Reheal of a poisoned live node is self tip + trusted pull, or phoenix-WAIT. Never neighbor majority. Quorum cannot outvote a broken hash (MESH-SPLIT-WIRES-1.0). This is not archive restore. Archive restore is MESH-REEXPAND-1.0.

## 1. What reheal is

The node is still a live cell participant. Poison arrived (hash miss, equivocation, broken body). Reheal stays on that node:

1. **Self tip + trusted pull.** Keep the local tip you already verified. Pull payload only from a receiver-asked trusted plane (MESH-SPLIT-WIRES payload plane). Match hash-absolute (MESH-COLD-COPY poison refuse). Or:
2. **phoenix-WAIT.** Wait / re-seal after poison or isolation. Local to the failed node only. Does not hunt a controller. Does not restore a public hostname. Does not climb the mesh back onto a pulled site.

No third path. Neighbor count, Live Nodes · N, and majority vote are not a heal.

## 2. Never neighbor majority

Same `prev`, two tips → isolate that node. The cell does not average a lie. A room of peers saying "apply theirs" is refused. Trusted pull is a named, already-verified source the operator or lockset already accepted — not "most neighbors agree."

Public Worker rollup stays counts/status. `GET /v1/mesh` is not a reheal signal and not a vote.

## 3. Distinct from re-expand

| | MESH-REHEAL-1.0 | MESH-REEXPAND-1.0 |
| --- | --- | --- |
| Starts from | poisoned *live* node | archive / cold copy |
| Act | self tip + trusted pull, or phoenix-WAIT | get original receipts, check each prev-hash, stand a *new* local node on that tip |
| Majority | never | never (also not an index) |
| Phoenix | wait / re-seal on the failed node | not this door |
| Public hostname | die-with-pull stays | may point a *new* surface at the same tip after verify; does not resurrect a pulled name |

Do not collapse the two. A node that still has a self tip reheals. A plane that only has archive bytes re-expands. Training residue reheals nothing and expands nothing.

## 4. Relation to neighbors

- MESH-SPLIT-WIRES-1.0 already set Phoenix as local wait / re-seal and equivocation as isolate. This spec names that pair as reheal and forbids neighbor majority as a third path.
- MESH-COLD-COPY-1.0: poison is hash-absolute. Reheal does not interpret a broken body.
- MESH-REEXPAND-1.0: later restore from those cold copies. Different door, different start.
- mesh.js refuse: public suite presence stays on; disable is not a heal; overlay does not vote.

## 5. Cap

Self tip + trusted pull, or phoenix-WAIT. Never neighbor majority. Re-expand is archive restore — keep it distinct. Identity: Aziel Eliab only.
