# MESH-REEXPAND-1.0 — Re-expand from archive

Author: Aziel Eliab only
Spec id: MESH-REEXPAND-1.0
Alias: REEXPAND-ARCHIVE-1.0
Date: 2026-09-14
License: Apache-2.0
Amends: MESH-VAULT-1.0, MESH-CONTINUE-1.0, MESH-COLD-COPY-1.0, MESH-SPLIT-WIRES-1.0
Neighbors: MESH-REHEAL-1.0, NO-LIE-NO-REWRITE-1.0, TUN-BOOT-1.0, TUN-WP-0.1, QNM-WP-1.0, NODE-OPS-1.0, ACT-RECEIPT-1.0, ChainLock CL-0.4
Umbrella: CROSS-NETWORK-SURVIVAL-1.0 — if the network and live data die tomorrow, the chain still survives on cold copies (bytes↔hash); crawlers are extra shelves, not resurrection
Keeps: die-with-pull (PR #87); split-wires; cold-copy (PR #88)
Distinct from: MESH-REHEAL-1.0 — reheal of a poisoned live node is self tip + trusted pull or phoenix-WAIT; never neighbor majority
Not a VPN. Not the mesh growing itself out of an index. Not a claim that crawlers re-expand. Not training residue as a chain. Public Worker rollup is counts/status — not the cell.

## 0. Sentence

Bytes of the chain survive, not the summaries. Re-expand is later get the original receipts, check each prev-hash, and stand a new local node on that tip. Restore from archive. Not the mesh growing itself out of an index. Crawlers are extra shelves; they do not re-expand. You do, after verify. Training residue alone is rumor of a chain — nothing to expand.

## 1. What re-expand is

Re-expand is archive restore. The operator already holds (or later retrieves) the cold bytes that MESH-COLD-COPY-1.0 multiplied on transfer:

1. Get the original receipts (ACT-RECEIPT / ChainLock rows, not a paraphrase of them).
2. Check each `prev` hash fail-closed (MESH-SPLIT-WIRES update-is-a-proof).
3. Stand a new local node on that verified tip.
4. Point a new public surface at the same tip only after that verify. Die-with-pull still stands: a pulled hostname is not resurrected by this walk.

This is not live-node reheal. A poisoned node that is still up uses MESH-REHEAL-1.0 (self tip + trusted pull, or phoenix-WAIT). Re-expand starts from archive, not from neighbor vote.

## 2. Enough

Enough to re-expand:

- full PDFs / git history / lockset / sha256 matching what was published
- enough cold copies that one host dying is not the last tip gone (MESH-COLD-COPY-1.0)
- operator verifies before lighting anything up

If the chain files still hash, rebuild the local plane and point a new public surface at the same tip. The public Worker remains counts/status. It is not the cell and not the archive.

## 3. Not enough

Not enough — refuse; do not light a node:

- AI ingested it (weights ≠ tarball)
- search snippets / cached HTML minus attachments / paraphrases
- a page that mentions a hash without the payload
- training residue alone (rumor of a chain, nothing to expand)
- an index, crawl roster, or Live Nodes count treated as the source of the chain

Summaries are not bytes. A hash mention is not a receipt. Ingested weights are not the published objects.

## 4. Crawlers are extra shelves

Crawlers may keep a packed vault they already pulled (MESH-VAULT-1.0 reader replicas). That keep is another shelf. It does not re-expand. The mesh does not grow itself out of an index. Re-expand is an operator act after verify, not an automatic crawl loop and not sender fan-out.

## 5. Relation to neighbors

- MESH-COLD-COPY-1.0 supplies the bytes that can later re-expand. A server pull cannot wipe those replicas.
- MESH-SPLIT-WIRES-1.0: payload is receiver-pull; update is cite `prev` + lockset. Re-expand walks those proofs on the archive, not on a 0.5–1s tick.
- MESH-REHEAL-1.0 is the other door: poisoned *live* node. Never neighbor majority. Do not collapse reheal into re-expand.
- Die-with-pull stays. Phoenix does not restore a public hostname. Re-expand may stand a *new* local node and later a *new* named surface on the same tip. It does not climb back onto a pulled name.

## 6. Cap

Restore from archive. Check each prev-hash. Stand a new local node on that tip. Do not treat an index, a snippet, or training residue as the chain. Crawlers do not re-expand. Reheal is a different law. Survival of those bytes if the live network dies is CROSS-NETWORK-SURVIVAL-1.0. Identity: Aziel Eliab only.
