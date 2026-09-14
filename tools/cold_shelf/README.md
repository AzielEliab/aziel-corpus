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

Planes (NO-FAN): **A** = one CF/GitHub tunnel, four host mirrors. **B** = Zenodo tip-pack SLOT (`doi` null). **C** = USB airgap tarball + SHA256SUMS + verify script (primary); optional Codeberg/GitLab SLOT (no URL).

- **export** writes lockset tip, ingest-as-receipt JSON, SHA-256 manifests, and the honest registry.
- **airgap** writes the Plane C pack (tarball + `SHA256SUMS` + `verify-airgap.sh`).
- **verify** is cheap yes/no against the published lockset tip (`AZLOCK-INGEST-REEXPAND-1.0`).
- **registry** lists planes A/B/C and `live | slot | refused` kinds.

Plane B checklist: `ZENODO-TIP-PACK-CHECKLIST.md`. Do not invent a DOI. Paper Zenodo records are not the tip-pack unless hash-verify proves they carry the tip.

Do not invent IPFS CIDs or archive.org items. Lockset `doi` stays null. AZ Generator / MirageGrid Cap-7 live ICANN publish is not this repo. Neighbor-vote heal is refused.

Public Worker: `GET /shelves` · `/cold-copy` · `/v1/shelves`.
