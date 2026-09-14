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
Not a Softwares-tab product. Not four independent Cloudflare hosts. Not five independent surfaces. Not an invented CID or DOI. Not visible identity-lock chrome. Not AZ Generator / MirageGrid Cap-7 live ICANN publish.

## 0. Sentence

CROSS-NETWORK-SURVIVAL is not an essay. Survival planes are **A / B / C**. Plane A is one CF/GitHub tunnel: four host mirrors + git = **5 published surfaces** and **2 family radii** (Cloudflare + GitHub), counted as **one** independent live (`cf-github`). Plane B is an alternate independent forge/archive **tip-pack** (Codeberg / archive.org / GitFlic RU; SLOT until a real upload hash-verifies). Zenodo is not the working path (`CNS-ZENODO-IP-BAN`). Plane C is the offline USB airgap pack (tarball + SHA256SUMS + verify script), SLOT until operator attest (`CNS-OPERATOR-ATTEST`). Survival is bytes↔hash. LIVE only after hash verify. Never invent a DOI.

## 1. Mandate (NO-FAN)

If the Cloudflare tunnel and the AzielEliab GitHub org die together, Plane A is gone. That is **one** independent live blast radius in a two-radius family. Counting azieleliab.com + azielcorpuslibrary.net + godlock.uk + hedidntjump.com + GitHub as five independent shelves is a lie (`CNS-SURFACES-NOT-INDEPENDENT`).

Paper archive records are not Plane B. cite.json / lockset `doi` stay `null`. Do not invent a DOI to fill the slot. Operator IP is banned at Zenodo — do not keep Zenodo as the Plane B working shelf.

## 2. Planes

| Plane | Job | Status today |
| --- | --- | --- |
| **A** | LIVE multi-host, same tunnel. Four mirrors + git on one CF/GitHub plane. Tip / receipts / shelves registry on all four. 5 published surfaces / 2 family radii. | LIVE as **one** independent plane |
| **B** | Public off-CF alternate independent forge/archive tip-pack (Codeberg / archive.org / GitFlic RU). | SLOT — no verified URL yet. Zenodo refused (`CNS-ZENODO-IP-BAN`) |
| **C** | Offline / optional extra forge. USB airgap export is primary. | SLOT — pack is executable; airgap copy not attested (`CNS-OPERATOR-ATTEST`) |

≥3 independent shelves means A + B + C all LIVE after hash verify. Today only A is LIVE. `independent_live_count` is 1. `independent_requirement_met` is false until B and C verify.

### 2.1 Plane A — one tunnel, five published surfaces, two family radii

Hosts (same tip, same plane):

1. https://www.azieleliab.com/ — lockset / receipts / shelves
2. https://www.azielcorpuslibrary.net/ — lockset / receipts / shelves (in-repo Worker origin)
3. https://godlock.uk/ — lockset / receipts / shelves
4. https://www.hedidntjump.com/ — lockset / receipts / shelves

Git on the same plane: https://github.com/AzielEliab/aziel-corpus (tags `v2.6.2`, `v0.1.0`).

`published_surfaces: 5`. `family_blast_radii: cloudflare, github`. `independent_live_blast_radii` stays `cf-github`. This is **not** five independent shelves. Refuse `CNS-PLANE-A-ONE-TUNNEL` / `CNS-SURFACES-NOT-INDEPENDENT` if a later paper counts the five surfaces as five.

### 2.2 Plane B — alternate independent forge/archive tip-pack (SLOT)

Build the export pack. Upload that pack to an independent forge or archive. Then, and only then, write the real URL after hash-verify.

- Working targets for LIVE promotion: Codeberg, archive.org, GitFlic (RU). Status `slot` until hash-verify. Do not invent a URL.
- Zenodo tip-pack is `refused` (`CNS-ZENODO-IP-BAN`, and `CNS-NO-TIP-DOI` remains accurate). Not the working shelf.
- Lockset / cite `doi` stays `null`.
- Existing Aziel Eliab paper deposits are companion paper cites. `reuse_as_plane_b: false`. They are not LIVE tip shelves.
- Checklist: `tools/cold_shelf/ALT-FORGE-TIP-PACK-CHECKLIST.md`

Refuse invented DOIs and invented forge URLs (`CNS-NO-FAN-FAKE-DEPOSIT`, `CNS-NO-TIP-DOI`, `CNS-NO-FORGE-MIRROR`, `CNS-NO-WARC`).

### 2.3 Plane C — USB airgap (primary) + optional extra forge

Primary: `node tools/cold_shelf/cli.mjs airgap` writes a tarball + `SHA256SUMS` + `verify-airgap.sh`. Copy those bytes off-network. USB offline-verify (`verify-airgap.sh` / `sha256sum -c SHA256SUMS` against the published tip), then operator attest. The shelf is LIVE only after `CNS-OPERATOR-ATTEST`. Checklist: `tools/cold_shelf/USB-AIRGAP-ATTEST.md`.

Optional extra forge slot remains empty. Codeberg / GitFlic are Plane B working targets, not a substitute for USB attest. Do not invent a URL (`CNS-NO-FORGE-MIRROR`).

## 3. Kinds and statuses

Lawful kinds (closed set): `zenodo_doi` | `git_mirror` | `ipfs_cid` | `archive_org` | `usb_airgap` | `other`

Statuses: `live` | `slot` | `refused`

- **live** — hash verify passed for **this** tip (or the Plane A Worker origin serves the published lockset bytes).
- **slot** — lawful kind; identifier or off-network bytes are not here yet.
- **refused** — invented DOI/CID/URL, neighbor vote, overclaim, or a banned working path (Zenodo IP ban).

IPFS stays an extra slot (not a fourth plane). Do not invent a CID.

## 4. Survival = bytes↔hash

A copy survives only when the bytes are present and they hash to the published tip or a committed manifest entry. Training residue is rumor. Crawlers are extra shelves, not re-expand. Growth-ON stays: `robots.txt` / `ai.txt` remain `Allow: /` for listed bots.

## 5. Executable pack

1. **export** — lockset tip + ingest-as-receipt JSON + SHA-256 manifests
2. **verify** — paste-hash / file-hash yes/no against the published tip
3. **registry** — planes A/B/C + honest live|slot|refused
4. **airgap** — Plane C tarball + SHA256SUMS + verify script
5. **checklist** — Plane B alt-forge deposit steps (no URL invented); Zenodo refused note; USB attest path

Reheal stays MESH-REHEAL-1.0. Neighbor vote is `CNS-NEVER-NEIGHBOR-VOTE`.

## 6. What this repo is not

AZ Generator is MirageGrid Cap-7 mesh DNS factory — **not this repo**. Refuse invented PHY / DNS / ICANN and live-ICANN-publish overclaim. GET `/v1/mesh` stays read-only QNM ON. No Softwares-tab product. No visible identity-lock chrome.

## 7. Cap

Plane A is one LIVE CF/GitHub tunnel (5 published surfaces / 2 family radii / 1 independent live). Plane B is an alt independent forge/archive SLOT until a real tip-pack hash-verifies. Zenodo is refused (`CNS-ZENODO-IP-BAN`). Plane C is the USB airgap pack (SLOT until attested). Survival is bytes↔hash. Identity: Aziel Eliab only.
