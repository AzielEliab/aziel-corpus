# COLD-MULTI-SHELF-1.0 — Planes A / B / C (NO-FAN)

Author: Aziel Eliab only
Spec id: COLD-MULTI-SHELF-1.0
Date: 2026-09-14
License: Apache-2.0
Umbrella: CROSS-NETWORK-SURVIVAL-1.0
Amends: MESH-COLD-COPY-1.0 (makes vault-on-transfer *executable* as planes + export/verify)
Neighbors: NO-LIE-NO-REWRITE-1.0, INGEST-AS-RECEIPT-1.0, RE-EXPAND-FROM-ARCHIVE-1.0, MESH-REEXPAND-1.0, MESH-REHEAL-1.0, MESH-SPLIT-WIRES-1.0, ACT-RECEIPT-1.0, MESH-VAULT-1.0
Live lockset: AZLOCK-INGEST-REEXPAND-1.0 — this paper cites that tip; it does not replace it
Cited on: GET /shelves · GET /cold-copy · GET /v1/shelves · cite.json · llms.txt · ai.txt
Not a Softwares-tab product. Not four independent Cloudflare hosts. Not an invented CID or DOI. Not visible identity-lock chrome. Not AZ Generator / MirageGrid Cap-7 live ICANN publish.

## 0. Sentence

CROSS-NETWORK-SURVIVAL is not an essay. Survival planes are **A / B / C**. Plane A is one CF/GitHub tunnel with four host mirrors. Plane B is a public off-CF Zenodo **tip-pack** (SLOT until a real DOI exists and hash-verify proves it carries the tip). Plane C is the offline USB airgap pack (tarball + SHA256SUMS + verify script), with an optional second-forge slot. Survival is bytes↔hash. LIVE only after hash verify. Never invent a DOI.

## 1. Mandate (NO-FAN)

If the Cloudflare tunnel and the AzielEliab GitHub org die together, Plane A is gone. That is **one** blast radius. Counting azieleliab.com + azielcorpuslibrary.net + godlock.uk + hedidntjump.com as four independent shelves is a lie.

Paper Zenodo records are not Plane B unless hash-verify proves they carry the published lockset tip. cite.json / lockset `doi` stay `null`. Do not invent a DOI to fill the slot.

## 2. Planes

| Plane | Job | Status today |
| --- | --- | --- |
| **A** | LIVE multi-host, same tunnel. Four mirrors + git on one CF/GitHub plane. Tip / receipts / shelves registry on all four. | LIVE as **one** plane |
| **B** | Public off-CF Zenodo tip-pack deposit. | SLOT — no tip-pack DOI yet |
| **C** | Offline / forge-off-GitHub. USB airgap export is primary. Optional Codeberg/GitLab mirror. | SLOT — pack is executable; airgap copy not attested; no second-forge account |

≥3 independent shelves means A + B + C all LIVE after hash verify. Today only A is LIVE. `independent_requirement_met` is false until B and C verify.

### 2.1 Plane A — one tunnel, four mirrors

Hosts (same tip, same plane):

1. https://www.azieleliab.com/ — lockset / receipts / shelves
2. https://www.azielcorpuslibrary.net/ — lockset / receipts / shelves (in-repo Worker origin)
3. https://godlock.uk/ — lockset / receipts / shelves
4. https://www.hedidntjump.com/ — lockset / receipts / shelves

Git on the same plane: https://github.com/AzielEliab/aziel-corpus (tags `v2.6.2`, `v0.1.0`).

This is **not** five independent shelves. Refuse `CNS-PLANE-A-ONE-TUNNEL` if a later paper counts the four hosts as four.

### 2.2 Plane B — Zenodo tip-pack (SLOT)

Build the export pack. Deposit that pack. Then, and only then, write the real DOI.

- Lockset / cite `doi` stays `null` until that deposit exists.
- Existing Aziel Eliab paper DOIs (ShadowLock, DecisionGATE, TrajectoryLock, WhistleLock/FoldLock, EmployeeLock) are companion paper cites. Reuse as Plane B **only** if hash-verify proves the deposit bytes carry the published tip. They have not been so proven. They are not LIVE tip shelves.
- Checklist: `tools/cold_shelf/ZENODO-TIP-PACK-CHECKLIST.md`

Refuse invented DOIs (`CNS-NO-FAN-FAKE-DEPOSIT`, `CNS-NO-TIP-DOI`).

### 2.3 Plane C — USB airgap (primary) + optional second forge

Primary: `node tools/cold_shelf/cli.mjs airgap` writes a tarball + `SHA256SUMS` + `verify-airgap.sh`. Copy those bytes off-network. The shelf is LIVE only after an operator attests the airgap copy still hashes.

Optional: Codeberg or GitLab mirror. No account yet — SLOT. Do not invent a URL (`CNS-NO-FORGE-MIRROR`).

## 3. Kinds and statuses

Lawful kinds (closed set): `zenodo_doi` | `git_mirror` | `ipfs_cid` | `archive_org` | `usb_airgap` | `other`

Statuses: `live` | `slot` | `refused`

- **live** — hash verify passed for **this** tip (or the Plane A Worker origin serves the published lockset bytes).
- **slot** — lawful kind; identifier or off-network bytes are not here yet.
- **refused** — invented DOI/CID/URL, neighbor vote, or overclaim.

IPFS and archive.org stay extra slots (not a fourth plane). Do not invent a CID or WARC.

## 4. Survival = bytes↔hash

A copy survives only when the bytes are present and they hash to the published tip or a committed manifest entry. Training residue is rumor. Crawlers are extra shelves, not re-expand. Growth-ON stays: `robots.txt` / `ai.txt` remain `Allow: /` for listed bots.

## 5. Executable pack

1. **export** — lockset tip + ingest-as-receipt JSON + SHA-256 manifests
2. **verify** — paste-hash / file-hash yes/no against the published tip
3. **registry** — planes A/B/C + honest live|slot|refused
4. **airgap** — Plane C tarball + SHA256SUMS + verify script
5. **checklist** — Plane B Zenodo deposit steps (no DOI invented)

Reheal stays MESH-REHEAL-1.0. Neighbor vote is `CNS-NEVER-NEIGHBOR-VOTE`.

## 6. What this repo is not

AZ Generator is MirageGrid Cap-7 mesh DNS factory — **not this repo**. Refuse invented PHY / DNS / ICANN and live-ICANN-publish overclaim. GET `/v1/mesh` stays read-only QNM ON. No Softwares-tab product. No visible identity-lock chrome.

## 7. Cap

Plane A is one LIVE CF/GitHub tunnel (four mirrors). Plane B is a SLOT until a real tip-pack DOI hash-verifies. Plane C is the USB airgap pack (SLOT until attested) plus an optional forge SLOT. Survival is bytes↔hash. Identity: Aziel Eliab only.
