# tools/cold_shelf — COLD-MULTI-SHELF-1.0

Author: Aziel Eliab only.

Executable CROSS-NETWORK-SURVIVAL pack. Survival is bytes↔hash. This is not an essay and not a Cloudflare monoculture.

```bash
node tools/cold_shelf/cli.mjs export [--out DIR]
node tools/cold_shelf/cli.mjs airgap [--out DIR]
node tools/cold_shelf/cli.mjs verify --hash <64-hex>
node tools/cold_shelf/cli.mjs verify --file docs/lockset.json
node tools/cold_shelf/cli.mjs registry
```

Planes (NO-FAN): **A** = one CF/GitHub tunnel (5 published surfaces / 2 family radii, not 5 shelves). **B** = alternate independent forge/archive tip-pack SLOT (`doi` null; Codeberg PASS at https://codeberg.org/AzielEliab/aziel-lockset-tip; archive.org PASS at https://archive.org/details/aziel-lockset-tip; GitFlic RU unverified). LIVE only after all three (`CNS-PLANE-B-ALL-TARGETS`). Zenodo tip-pack is refused (`CNS-ZENODO-IP-BAN`). **C** = USB airgap tarball + SHA256SUMS + verify script (primary; SLOT until `CNS-OPERATOR-ATTEST`). Extra **D/E/F/G** SLOTs = Framagit, Launchpad, AfricArXiv/OSF, GitLab (`url` null; not required for Plane B LIVE).

- **export** writes lockset tip, ingest-as-receipt JSON, SHA-256 manifests, and the honest registry.
- **airgap** writes the Plane C pack (tarball + `SHA256SUMS` + `verify-airgap.sh`).
- **verify** is cheap yes/no against the published lockset tip (`AZLOCK-INGEST-REEXPAND-1.0`).
- **registry** lists planes A/B/C, extra D/E/F/G SLOTs, and `live | slot | refused` kinds.
- **restore-drill** emits the Plane C attest receipt schema (bytes + prev-hash; NO-FAN).

Plane B checklist: `ALT-FORGE-TIP-PACK-CHECKLIST.md`. Do not invent a URL or DOI. Paper deposits are not tip-pack Plane B. Zenodo refused note: `ZENODO-TIP-PACK-CHECKLIST.md`. USB attest: `USB-AIRGAP-ATTEST.md`. Restore drill: `RESTORE-DRILL.md`.

Do not invent IPFS CIDs or archive.org items. Lockset `doi` stays null. AZ Generator / MirageGrid Cap-7 live ICANN publish is not this repo. Neighbor-vote heal is refused.

Public Worker: `GET /shelves` · `/cold-copy` · `/v1/shelves`.
