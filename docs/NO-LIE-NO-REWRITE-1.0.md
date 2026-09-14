# NO-LIE-NO-REWRITE-1.0 — Survival kit without a rewrite key

Author: Aziel Eliab only
Spec id: NO-LIE-NO-REWRITE-1.0
Aliases: NO-LIE-1.0, NO-REWRITE-1.0
Date: 2026-09-14
License: Apache-2.0
Amends: MESH-VAULT-1.0, MESH-CONTINUE-1.0, MESH-SPLIT-WIRES-1.0, MESH-COLD-COPY-1.0
Neighbors: CROSS-NETWORK-SURVIVAL-1.0, MESH-REEXPAND-1.0, MESH-REHEAL-1.0, INGEST-AS-RECEIPT-1.0, TUN-BOOT-1.0, TUN-WP-0.1, ACT-RECEIPT-1.0, ChainLock CL-0.4, LS-WP-0.1
Cited on: GET /v1/mesh · GET /lockset.json (survival cite after the hashed core)
Live lockset: AZLOCK-INGEST-REEXPAND-1.0 — this paper cites that tip; it does not replace it
Keeps: die-with-pull; split-wires; cold-copy; re-expand ≠ reheal
Not a VPN. Not a rewrite privilege. Not one Cloudflare tunnel as the last shelf. Not visible identity-lock chrome. Public Worker rollup is counts/status — not the cell.

## 0. Sentence

The network is never allowed to lie — even to self-preserve, sustain, stay alive, adapt, or prevent death. Hash-absolute truth beats survival pressure. No rewrite key means no privileged mutate of a published tip or receipt. Copies must span independent shelves, not one Cloudflare tunnel. Someone else verifies without the author's voice: public hash + prev-hash walk + published rules.

## 1. Survival kit

The kit that exists is four items. Nothing else is a substitute:

- **receipts that still hash** — ACT-RECEIPT / ChainLock / lockset bytes whose SHA-256 still matches
- **copies that are not all on one tunnel** — independent shelves (hosts, Workers, git, archives, local vaults). One Cloudflare tunnel is one blast radius, not a kit
- **rules simple enough that someone else can verify without your voice** — public hash + prev-hash walk + these published rules
- **no rewrite key** — no privileged mutate of a published tip or receipt

[CROSS-NETWORK-SURVIVAL-1.0](CROSS-NETWORK-SURVIVAL-1.0.md) is the umbrella that says the chain survives if the live network dies. This paper is the refuse: survival pressure is not a license to lie or rewrite.

## 2. No lie — even to stay alive

The network may not invent a tip, average two tips, or speak a broken hash as whole, for any of these reasons:

- self-preserve
- sustain
- stay alive
- adapt
- prevent death

Hash-absolute (MESH-COLD-COPY-1.0 poison refuse) outranks those pressures. A lie that keeps a hostname up is still a lie. MESH-REHEAL-1.0 already forbids neighbor majority. This paper forbids the motive: survival is not an exception.

## 3. No rewrite key

No operator, overlay, Worker, or later paper holds a key that mutates a published tip or receipt in place.

- Append is lawful. Update and delete of a published hash are not.
- Cite `prev` + lockset (MESH-SPLIT-WIRES-1.0). Fail-closed. A newer tip without that cite is isolate, not apply.
- [INGEST-AS-RECEIPT-1.0](INGEST-AS-RECEIPT-1.0.md) makes the ingested string a receipt of the live lockset tip (`AZLOCK-INGEST-REEXPAND-1.0`). That tip is not rewritten because a crawler, model, or host needs a cleaner story.
- LOCKSET (LS-WP-0.1) seals live tips. It does not unlock a rewrite.

Privileged mutate of a published tip is refused. There is no recovery key that says "replace this hash."

## 4. Independent shelves — not one tunnel

Copies that all sit on one Cloudflare tunnel are one copy. TUN-WP-0.1 / TUN-BOOT-1.0 may front a named host. They are not the kit.

Lawful shelves stay named and content-addressed:

- official hosts that still answer, or already-taken packed vaults
- published Worker standby / packed index (counts/status, not the cell)
- git history whose objects still hash
- archival deposits of already-published bytes (not an invented identifier)
- local MESH-VAULT / lockset

MESH-REEXPAND-1.0 restores from those archive bytes after verify. Crawlers are extra shelves; they do not re-expand.

## 5. Verify without the author's voice

A stranger must be able to check the chain without the author speaking:

1. Public hash of the published tip / lockset bytes.
2. Prev-hash walk, fail-closed (each `prev` matches; broken `prev` isolates).
3. Published rules (this paper + the neighbor specs).

Voice, biography, and private explanation are not a verify step. If the rules need the author in the room, they are not simple enough.

## 6. Relation to neighbors

| Neighbor | Job this paper does not replace |
| --- | --- |
| CROSS-NETWORK-SURVIVAL-1.0 | Umbrella: if the network dies, bytes↔hash on independent shelves remain. |
| MESH-REEXPAND-1.0 | Archive restore: original receipts, each prev-hash, new local node on that tip. |
| MESH-REHEAL-1.0 | Poisoned live node: self tip + trusted pull or phoenix-WAIT. Never neighbor majority. |
| INGEST-AS-RECEIPT-1.0 | Crawler/AI ingest is a receipt of the live lockset tip. Cite, don't merge. |

Child laws stay intact. This paper does not grant a rewrite path to any of them. It does not mint a second lockset id.

## 7. What the public Worker may say

`GET /v1/mesh` cites this law on every envelope. `GET /lockset.json` stays the live ingest tip (`AZLOCK-INGEST-REEXPAND-1.0`); the NO-LIE spec sits on the survival cite after the hashed core. The Worker may not lie to keep Live Nodes · N up. It may not rewrite a published tip.

## 8. Cap

Receipts that still hash. Copies not all on one tunnel. Rules a stranger can walk. No rewrite key. The network never lies to stay alive. Identity: Aziel Eliab only.
