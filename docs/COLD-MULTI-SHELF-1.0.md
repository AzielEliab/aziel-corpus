# COLD-MULTI-SHELF-1.0 — Planes A / B / C (NO-FAN)

Author: Aziel Eliab only
Spec id: COLD-MULTI-SHELF-1.0
Date: 2026-09-14
License: Apache-2.0
Umbrella: CROSS-NETWORK-SURVIVAL-1.0
Amends: MESH-COLD-COPY-1.0 (makes vault-on-transfer *executable* as planes + export/verify)
Neighbors: NO-LIE-NO-REWRITE-1.0, INGEST-AS-RECEIPT-1.0, RE-EXPAND-FROM-ARCHIVE-1.0, MESH-REEXPAND-1.0, MESH-REHEAL-1.0, MESH-SPLIT-WIRES-1.0, ACT-RECEIPT-1.0, MESH-VAULT-1.0, RESTORE-DRILL-1.0, FOLDLOCK-SHELF-1.0 (Softwares neighbor cite + SLOT hook; not a shelf plane)
Live lockset: AZLOCK-INGEST-REEXPAND-1.0 — this paper cites that tip; it does not replace it
Cited on: GET /shelves · GET /cold-copy · GET /v1/shelves · cite.json · llms.txt · ai.txt
Not a Softwares-tab product. Not four independent Cloudflare hosts. Not five independent surfaces. Not an invented CID or DOI. Not visible identity-lock chrome. Not AZ Generator / MirageGrid Cap-7 live ICANN publish.

## 0. Sentence

CROSS-NETWORK-SURVIVAL is not an essay. Survival planes are **A / B / C**. Plane A is one CF/GitHub tunnel: four host mirrors + git = **5 published surfaces** and **2 family radii** (Cloudflare + GitHub), counted as **one** independent live (`cf-github`). Plane B is an alternate independent forge/archive **tip-pack** (Codeberg / archive.org / Framagit; SLOT until all three hash-verify). Zenodo is not the working path (`CNS-ZENODO-IP-BAN`). GitFlic is not a LIVE target (`CNS-GITFLIC-EMAIL`). GitLab is not a LIVE target (`CNS-GITLAB-CF-LOOP`). Plane C is the offline USB airgap pack (tarball + SHA256SUMS + verify script), SLOT until operator attest (`CNS-OPERATOR-ATTEST`). Survival is bytes↔hash. LIVE only after hash verify. Never invent a DOI.

## 1. Mandate (NO-FAN)

If the Cloudflare tunnel and the AzielEliab GitHub org die together, Plane A is gone. That is **one** independent live blast radius in a two-radius family. Counting azieleliab.com + azielcorpuslibrary.net + godlock.uk + hedidntjump.com + GitHub as five independent shelves is a lie (`CNS-SURFACES-NOT-INDEPENDENT`).

Paper archive records are not Plane B. cite.json / lockset `doi` stay `null`. Do not invent a DOI to fill the slot. Operator IP is banned at Zenodo — do not keep Zenodo as the Plane B working shelf.

## 2. Planes

| Plane | Job | Status today |
| --- | --- | --- |
| **A** | LIVE multi-host, same tunnel. Four mirrors + git on one CF/GitHub plane. Tip / receipts / shelves registry on all four. 5 published surfaces / 2 family radii. | LIVE as **one** independent plane |
| **B** | Public off-CF alternate independent forge/archive tip-pack (Codeberg / archive.org / Framagit). | SLOT — Codeberg + archive.org hash-verify PASS; Framagit awaiting tip-pack. Zenodo refused (`CNS-ZENODO-IP-BAN`). GitFlic refused (`CNS-GITFLIC-EMAIL`). LIVE only after all three (`CNS-PLANE-B-ALL-TARGETS`) |
| **C** | Offline / optional extra forge. USB airgap export is primary. RESTORE-DRILL schema from bytes + prev-hash. | SLOT — pack is executable; airgap copy not attested (`CNS-OPERATOR-ATTEST`). Schema emit is not an attest |
| **E / F / G** | Extra independent tip-pack SLOTs: Launchpad, AfricArXiv/OSF, GitLab. | SLOT — `url` null. GitLab `CNS-GITLAB-CF-LOOP`. Others `CNS-NO-FORGE-MIRROR` until real URL + hash. **Not** required for Plane B LIVE |

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

- Working targets for LIVE promotion (AZindex-FAIL pivot 2026-09-14): Codeberg, archive.org, Framagit. Plane B stays `slot` until **all three** hash-verify. Do not invent a URL. Do not mark Plane B LIVE yet. Extra E/F/G SLOTs do not expand this rule.
- Codeberg tip-pack is uploaded at https://codeberg.org/AzielEliab/aziel-lockset-tip (`main`). Pack SHA-256 `b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37`. Hash-verify PASS against the published lockset tip. Status remains `slot` (`CNS-PLANE-B-ALL-TARGETS`).
- archive.org tip-pack is uploaded at https://archive.org/details/aziel-lockset-tip. Same pack SHA-256. Hash-verify PASS. Status remains `slot` (`CNS-PLANE-B-ALL-TARGETS`).
- A second archive.org item is at https://archive.org/details/aziel-lockset-tip_202609 (download zip `aziel-lockset-tip.zip`, also `aziel-lockset-tip%202.zip`). Same inner `aziel-tip-pack.tar` SHA-256. Hash-verify PASS (AZBot). Same blast_radius `archive-org` — **not** a new independent shelf. Zip wraps the tip files; flat IA metadata sha256 on the zip may be null. SHA256SUMS flat-check incomplete at the IA file list is OK because the inner tar hash-verifies. `working_targets` still lists `archive.org` once.
- Framagit is the third LIVE-promotion target. No verified URL in-repo. `url` stays `null`. SLOT. Awaiting tip-pack. Do not invent a URL.
- GitFlic is `refused` (`CNS-GITFLIC-EMAIL`). Confirmation mail never arrived. Not a LIVE-promotion target. Do not invent a GitFlic URL.
- GitLab is an extra SLOT (`CNS-GITLAB-CF-LOOP`). Cloudflare-loop blocked. Not a LIVE-promotion target. `url` null. Do not invent a GitLab URL.
- Zenodo tip-pack is `refused` (`CNS-ZENODO-IP-BAN`, and `CNS-NO-TIP-DOI` remains accurate). Not the working shelf.
- Lockset / cite `doi` stays `null`.
- Existing Aziel Eliab paper deposits are companion paper cites. `reuse_as_plane_b: false`. They are not LIVE tip shelves.
- Checklist: `tools/cold_shelf/ALT-FORGE-TIP-PACK-CHECKLIST.md`

Refuse invented DOIs and invented forge URLs (`CNS-NO-FAN-FAKE-DEPOSIT`, `CNS-NO-TIP-DOI`, `CNS-NO-FORGE-MIRROR`, `CNS-NO-WARC`).

### 2.3 Plane C — USB airgap (primary) + optional extra forge

Primary: `node tools/cold_shelf/cli.mjs airgap` writes a tarball + `SHA256SUMS` + `verify-airgap.sh`. Copy those bytes off-network. USB offline-verify (`verify-airgap.sh` / `sha256sum -c SHA256SUMS` against the published tip), then operator attest. The shelf is LIVE only after `CNS-OPERATOR-ATTEST`. Checklist: `tools/cold_shelf/USB-AIRGAP-ATTEST.md`.

RESTORE-DRILL ([RESTORE-DRILL-1.0](RESTORE-DRILL-1.0.md)): prove re-expand from those Plane C bytes + each `previous_hash`, not from an index. `node tools/cold_shelf/cli.mjs restore-drill` emits the ACT-RECEIPT attest schema. Schema emit is not an attest (NO-FAN). Operator drill: `tools/cold_shelf/RESTORE-DRILL.md`.

Optional extra forge slot remains empty. Codeberg / archive.org / Framagit are Plane B working targets, not a substitute for USB attest. Do not invent a URL (`CNS-NO-FORGE-MIRROR`).

### 2.4 Extra E / F / G tip-pack SLOTs (not Plane B LIVE)

Independent tip-pack shelves beyond the three Plane B working targets. `url` stays `null`. Framagit left extras and is now the Plane B third working target. GitLab stays extra with `CNS-GITLAB-CF-LOOP`. Launchpad / OSF refuse `CNS-NO-FORGE-MIRROR` until a real URL + hash-verify against pack `b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37` and tip `c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245`.

| Plane | Host family | Kind | Refuse |
| --- | --- | --- | --- |
| **E** | Launchpad | `git_mirror` | `CNS-NO-FORGE-MIRROR` |
| **F** | AfricArXiv / OSF project | `other` | `CNS-NO-FORGE-MIRROR` |
| **G** | GitLab | `git_mirror` | `CNS-GITLAB-CF-LOOP` |

These SLOTs raise operator coverage toward 80→95. They are **not** required for Plane B LIVE. Do not expand `CNS-PLANE-B-ALL-TARGETS`. Never publish fielded 100. Corpus is the public Lamb Lens shelf; this registry cites that shelf and does not re-expand from its index.

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
3. **registry** — planes A/B/C + extra E/F/G SLOTs + honest live|slot|refused
4. **airgap** — Plane C tarball + SHA256SUMS + verify script
5. **checklist** — Plane B alt-forge deposit steps (no URL invented); Zenodo refused note; USB attest path
6. **restore-drill** — emit Plane C attest receipt schema (bytes + prev-hash; NO-FAN)

Reheal stays MESH-REHEAL-1.0. Neighbor vote is `CNS-NEVER-NEIGHBOR-VOTE`.

### 5.1 FoldLock neighbor (cite + SLOT hook)

FoldLock (https://github.com/AzielEliab/foldlock) is a Softwares Language neighbor: algorithmic tether-word suppression on UTF-8 text. **Not zip. Not encryption.** Spec: [FOLDLOCK-SHELF-1.0](FOLDLOCK-SHELF-1.0.md).

Optional fold applies only to export notes/metadata. Never to lockset tip bytes, `lockset.json`, receipt bodies, or SHA-256 hex fields. Tip SHA-256 stays over raw receipts. The FoldLock engine is not bound in this isolate — the hook is **SLOT** (`FL-ENGINE-UNBOUND`). Attempts to fold the tip or rewrite the chain refuse (`FL-TIP-FOLD-REFUSE`, `FL-CHAIN-REWRITE-REFUSE`, `FL-LOCKSET-BYTES-REFUSE`, `FL-RECEIPT-FOLD-REFUSE`, `FL-HASH-FIELD-REFUSE`, `FL-ZIP-ENCRYPT-CLAIM`). Export writes `foldlock.json` as a cite sidecar. It does not fold the tip.

## 6. What this repo is not

AZ Generator is MirageGrid Cap-7 mesh DNS factory — **not this repo**. Refuse invented PHY / DNS / ICANN and live-ICANN-publish overclaim. GET `/v1/mesh` stays read-only QNM ON. No Softwares-tab product. No visible identity-lock chrome.

## 7. Cap

Plane A is one LIVE CF/GitHub tunnel (5 published surfaces / 2 family radii / 1 independent live). Plane B is an alt independent forge/archive SLOT until Codeberg + archive.org + Framagit all hash-verify. Zenodo is refused (`CNS-ZENODO-IP-BAN`). GitFlic is refused (`CNS-GITFLIC-EMAIL`). GitLab extra is `CNS-GITLAB-CF-LOOP`. Plane C is the USB airgap pack (SLOT until attested). Extra E/F/G tip-pack SLOTs stay url-null. Survival is bytes↔hash. Operator PREEMPT toward 80→95. Never publish fielded 100. Identity: Aziel Eliab only.
