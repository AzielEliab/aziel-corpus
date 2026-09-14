# Plane B — alternate independent forge/archive tip-pack checklist

Author: Aziel Eliab only
Spec: COLD-MULTI-SHELF-1.0
Umbrella: CROSS-NETWORK-SURVIVAL-1.0 · NO-LIE-NO-REWRITE-1.0
Lockset: AZLOCK-INGEST-REEXPAND-1.0
Published tip: `c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245`
cite.json / lockset `doi`: **null** (do not invent)

This is a checklist, not a deposit. Plane B is an **alternate independent forge/archive** tip-pack shelf (not Zenodo). Status stays **SLOT** until a real upload exists **and** hash-verify proves the uploaded bytes carry the published tip.

Working shelf targets for later LIVE promotion (do not mark Plane B LIVE until **all three** URL + hash-verify):

- Codeberg tip-pack — uploaded https://codeberg.org/AzielEliab/aziel-lockset-tip (`main`). Pack SHA-256 `b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37`. Hash-verify PASS. Shelf stays **SLOT**.
- archive.org tip-pack — uploaded https://archive.org/details/aziel-lockset-tip. Same pack SHA-256. Hash-verify PASS. Shelf stays **SLOT**.
- GitFlic (RU) tip-pack — no verified URL yet

Extra D/E/F-style SLOTs (Framagit, Launchpad, AfricArXiv/OSF, GitLab) stay `url` null and refuse `CNS-NO-FORGE-MIRROR` until a real URL + hash-verify against that pack and tip. They are **not** required for Plane B LIVE.

Zenodo is **not** the working path. Operator IP banned (`CNS-ZENODO-IP-BAN`). See `ZENODO-TIP-PACK-CHECKLIST.md`.

## Pack to deposit

```bash
node tools/cold_shelf/cli.mjs export --out tools/cold_shelf/out
node tools/cold_shelf/cli.mjs airgap --out tools/cold_shelf/out/airgap
```

Deposit the airgap directory or its `.tar` + `SHA256SUMS` + `verify-airgap.sh`. Do not deposit a paraphrase. Do not invent a Codeberg / archive.org / GitFlic URL.

## Steps (operator)

1. Confirm `verify --hash` against the published tip is **yes**.
2. Confirm `SHA256SUMS` matches every file in the pack.
3. Upload the pack to one independent forge/archive (Codeberg, archive.org, or GitFlic RU).
4. Copy the real public URL the host assigns. Do not invent one.
5. Hash-verify the downloaded bytes against the published tip.
6. Record the real URL + hashes on that target shelf. Status stays **SLOT** until Codeberg + archive.org + GitFlic all hash-verify. Then, and only then, mark Plane B `live`. Lockset hashed core stays `doi: null`.

## Do not

- Invent a URL or DOI to fill Plane B.
- Mark Plane B LIVE because Codeberg and archive.org hash-verified. Need all three (`CNS-PLANE-B-ALL-TARGETS`).
- Count Framagit / Launchpad / OSF / GitLab extras as Plane B LIVE substitutes.
- Reuse paper Zenodo records as the tip-pack. They are companion papers (`reuse_as_plane_b: false`).
- Treat Zenodo as the Plane B working shelf (`CNS-ZENODO-IP-BAN`).
- Count Plane A hosts as a substitute for this deposit.

Refuse codes: `CNS-ZENODO-IP-BAN` · `CNS-NO-TIP-DOI` · `CNS-NO-FORGE-MIRROR` · `CNS-NO-WARC` · `CNS-NO-FAN-FAKE-DEPOSIT` · `CNS-PLANE-B-ALL-TARGETS`
