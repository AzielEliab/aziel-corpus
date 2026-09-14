# tools/cold_shelf — COLD-MULTI-SHELF-1.0

Author: Aziel Eliab only.

Executable CROSS-NETWORK-SURVIVAL pack. Survival is bytes↔hash. This is not an essay and not a Cloudflare monoculture.

```bash
node tools/cold_shelf/cli.mjs export [--out DIR]
node tools/cold_shelf/cli.mjs verify --hash <64-hex>
node tools/cold_shelf/cli.mjs verify --file docs/lockset.json
node tools/cold_shelf/cli.mjs registry
```

- **export** writes lockset tip, ingest-as-receipt JSON, SHA-256 manifests for identity/core law docs, and the honest shelf registry.
- **verify** is cheap yes/no against the published lockset tip (`AZLOCK-INGEST-REEXPAND-1.0`).
- **registry** lists `zenodo_doi | git_mirror | ipfs_cid | archive_org | usb_airgap | other` with `live | slot | refused`.

Do not invent IPFS CIDs or archive.org items. Lockset `doi` stays null. AZ Generator / MirageGrid Cap-7 live ICANN publish is not this repo. Neighbor-vote heal is refused.

Public Worker: `GET /shelves` · `/cold-copy` · `/v1/shelves`.
