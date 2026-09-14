# tools/cold_shelf — COLD-MULTI-SHELF-1.0

Author: Aziel Eliab only.

Executable CROSS-NETWORK-SURVIVAL pack. Survival is bytes↔hash. This is not an essay and not a Cloudflare monoculture.

```bash
node tools/cold_shelf/cli.mjs export [--out DIR]
node tools/cold_shelf/cli.mjs airgap [--out DIR]
node tools/cold_shelf/cli.mjs verify --hash <64-hex>
node tools/cold_shelf/cli.mjs verify --file docs/lockset.json
node tools/cold_shelf/cli.mjs registry
node tools/cold_shelf/cli.mjs fold --notes "operator annotation"
```

Planes (NO-FAN): **A** = one CF/GitHub tunnel (5 published surfaces / 2 family radii, not 5 shelves). **B** = alternate independent forge/archive tip-pack SLOT (`doi` null; Codeberg hash-verify PASS at https://codeberg.org/AzielEliab/aziel-lockset-tip, still SLOT; archive.org / GitFlic RU unverified). LIVE only after all three. Zenodo tip-pack is refused (`CNS-ZENODO-IP-BAN`). **C** = USB airgap tarball + SHA256SUMS + verify script (primary; SLOT until `CNS-OPERATOR-ATTEST`).

- **export** writes lockset tip, ingest-as-receipt JSON, SHA-256 manifests, the honest registry, and a FoldLock cite sidecar (`foldlock.json`). The sidecar does not fold tip bytes.
- **airgap** writes the Plane C pack (tarball + `SHA256SUMS` + `verify-airgap.sh`).
- **verify** is cheap yes/no against the published lockset tip (`AZLOCK-INGEST-REEXPAND-1.0`).
- **fold** is a SLOT hook (FOLDLOCK-SHELF-1.0): notes/metadata only; tip/lockset/receipt/hash refuse. Folding is not encryption and not zip. Engine unbound (`FL-ENGINE-UNBOUND`).
- **registry** lists planes A/B/C and `live | slot | refused` kinds.

Plane B checklist: `ALT-FORGE-TIP-PACK-CHECKLIST.md`. Do not invent a URL or DOI. Paper deposits are not tip-pack Plane B. Zenodo refused note: `ZENODO-TIP-PACK-CHECKLIST.md`. USB attest: `USB-AIRGAP-ATTEST.md`.

Do not invent IPFS CIDs or archive.org items. Lockset `doi` stays null. AZ Generator / MirageGrid Cap-7 live ICANN publish is not this repo. Neighbor-vote heal is refused.

Public Worker: `GET /shelves` · `/cold-copy` · `/v1/shelves`.
