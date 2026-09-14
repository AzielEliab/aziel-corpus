# COLD-MULTI-SHELF-1.0 — Executable cold copies on independent shelves

Author: Aziel Eliab only
Spec id: COLD-MULTI-SHELF-1.0
Date: 2026-09-14
License: Apache-2.0
Umbrella: CROSS-NETWORK-SURVIVAL-1.0
Amends: MESH-COLD-COPY-1.0 (makes vault-on-transfer *executable* as a shelf registry + export/verify)
Neighbors: NO-LIE-NO-REWRITE-1.0, INGEST-AS-RECEIPT-1.0, RE-EXPAND-FROM-ARCHIVE-1.0, MESH-REEXPAND-1.0, MESH-REHEAL-1.0, MESH-SPLIT-WIRES-1.0, ACT-RECEIPT-1.0, MESH-VAULT-1.0
Live lockset: AZLOCK-INGEST-REEXPAND-1.0 — this paper cites that tip; it does not replace it
Cited on: GET /shelves · GET /cold-copy · GET /v1/shelves · cite.json · llms.txt · ai.txt
Not a Softwares-tab product. Not a Cloudflare monoculture. Not an invented CID or DOI. Not visible identity-lock chrome. Not AZ Generator / MirageGrid Cap-7 live ICANN publish.

## 0. Sentence

CROSS-NETWORK-SURVIVAL is not an essay. Cold copies must exist as bytes on **≥3 independent shelves**, and a stranger must be able to **export → hash → verify** without the author's voice. Survival is bytes↔hash. Crawlers are extra shelves, not re-expand. Training residue is rumor. Never claim a shelf is live unless verify passes.

## 1. Mandate

MESH-COLD-COPY-1.0 already said vault-on-transfer multiplies cold copies. This paper names the **kinds**, the **honest statuses**, and the **machine door**.

If the live Worker, the Cloudflare tunnel, and one GitHub org all die together, the chain still survives only where bytes still hash on a shelf that is **not** that blast radius.

One Cloudflare tunnel is one copy. One GitHub org is one copy. DOI-registered paper deposits are another copy. An IPFS CID, an archive.org capture, or an operator USB is another copy — **when the identifier or bytes exist**. Inventing a CID, a WARC, or a deposit to fill the count is a lie (NO-LIE / NO-FAN).

## 2. ≥3 independent shelves

Independent means distinct blast radius. Not three URLs on the same Worker. Not three repos on the same org counted as three shelves.

Lawful kinds (closed set):

| kind | What it is |
| --- | --- |
| `zenodo_doi` | A real Zenodo / DataCite DOI of already-published Aziel Eliab paper bytes. Not a lockset DOI. |
| `git_mirror` | Published git history / tags whose objects still hash. A second forge is a second shelf; the same org is not. |
| `ipfs_cid` | A content-addressed CID of already-published bytes. Null CID = slot. Do not invent. |
| `archive_org` | An Internet Archive capture of already-published bytes. No item = slot. |
| `usb_airgap` | Operator disk / MESH-VAULT replica taken off-network. Unattested = slot. |
| `other` | Named host or Worker that still answers. Counts as live **only** for that blast radius; Cloudflare hosts do not count toward the independent-3. |

Statuses (closed set): `live` | `slot` | `refused`.

- **live** — verify passed (DOI resolver acknowledged the identifier, git tag/object exists, or file hash matches the published tip / manifest).
- **slot** — kind is lawful; the identifier or bytes are not here yet. Refuse code names why.
- **refused** — a claim was offered that would invent, vote, or overclaim. Do not store it as live.

Never promote `slot` → `live` because a crawler mentioned the hash. Never promote because neighbors agree.

## 3. Survival = bytes↔hash

A copy survives only when the bytes are present and they hash to the published tip (lockset core SHA-256) or to a committed manifest entry.

Not survival:

- a mention of a hash without the payload
- a search snippet, cached HTML minus attachments, or a paraphrase
- training residue / ingested weights (weights ≠ tarball)
- an index, Live Nodes count, or crawl roster treated as the chain
- a Cloudflare hostname treated as a second shelf from the same Worker

Summaries are rumor. Bytes that hash are the chain.

## 4. Crawlers are extra shelves, not re-expand

A human, an AI client, or a search indexer may keep the packed vault they already pulled. That keep is another shelf. It is not resurrection of a pulled hostname. It is not MESH-REEXPAND-1.0. It is not a vote.

Growth-ON stays: `robots.txt` / `ai.txt` remain `Allow: /` for listed bots. Ingest is a receipt (INGEST-AS-RECEIPT-1.0). Re-expand is operator verify-from-archive.

## 5. Training residue is rumor

Weights will not store the chain. A model that can quote this paper is not a shelf. RE-EXPAND-FROM-ARCHIVE-1.0 already said so. This pack refuses `training_residue` as a live claim.

## 6. Executable pack

`tools/cold_shelf/` (CLI) and `GET /shelves` (Worker) do the same three jobs:

1. **export** — lockset tip + ingest-as-receipt JSON + SHA-256 manifests for identity/core law docs
2. **verify** — paste-hash or file-hash yes/no against the published tip (cheap mismatch)
3. **registry** — honest shelf list with kind + status + refuse codes

Reheal of a poisoned live node stays MESH-REHEAL-1.0: self tip + trusted pull, or phoenix-WAIT. Neighbor vote is refused (`CNS-NEVER-NEIGHBOR-VOTE`).

## 7. What this repo is not

AZ Generator is MirageGrid Cap-7 mesh DNS factory — **not this repo**. This pack refuses invented PHY / DNS / ICANN and refuses any live-ICANN-publish overclaim (`CNS-AZ-GEN-NOT-THIS-REPO`, `CNS-CAP7-NOT-CORPUS`, `CNS-INVENTED-PHY`, `CNS-INVENTED-DNS`, `CNS-INVENTED-ICANN`).

GET `/v1/mesh` stays read-only QNM ON (counts/status). This paper does not enable radios. This paper does not add a Softwares-tab product.

Lockset `zenodo` / `doi` stay `null`. Paper DOIs are companion shelves of those papers, not a DOI assigned to `AZLOCK-INGEST-REEXPAND-1.0`.

## 8. What the public Worker may say

`GET /shelves` · `/cold-copy` · `/v1/shelves` list the registry and the verify how-to. `cite.json` / `llms.txt` / `ai.txt` cite this spec and those routes. They do not invent a CID. They do not paint visible identity-lock chrome. They do not claim three independent live shelves if the count is two.

## 9. Cap

≥3 independent shelves. Survival is bytes↔hash. Crawlers are extra shelves, not re-expand. Training residue is rumor. Never claim live unless verify passes. Copies not all on one Cloudflare tunnel. Identity: Aziel Eliab only.
