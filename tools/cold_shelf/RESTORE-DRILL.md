# Plane C — airgap RESTORE-DRILL (operator)

Author: Aziel Eliab only
Spec: RESTORE-DRILL-1.0 · COLD-MULTI-SHELF-1.0
Umbrella: CROSS-NETWORK-SURVIVAL-1.0 · NO-LIE-NO-REWRITE-1.0
Lamb Lens: Corpus is the public Lamb Lens shelf; this drill cites that shelf and does not re-expand from its index
Lockset: AZLOCK-INGEST-REEXPAND-1.0
Published tip: `c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245`
Pack SHA-256: `b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37`
Refuse: `CNS-OPERATOR-ATTEST` · `CNS-NO-FAN-FAKE-DEPOSIT` · `CNS-TRAINING-RESIDUE-RUMOR`
NO-FAN. Schema emit is not an attest.

This drill proves re-expand from **Plane C bytes + previous_hash**, not from an index, crawl roster, or Lamb Lens search hit.

## Emit the attest receipt schema

```bash
node tools/cold_shelf/cli.mjs restore-drill
```

That print is the four-field ACT-RECEIPT schema (hash / action / output / metadata + `previous_hash`). It does **not** mark Plane C LIVE.

## Drill path (off-network)

1. Build the pack: `node tools/cold_shelf/cli.mjs airgap --out tools/cold_shelf/out/airgap`
2. Copy the tarball + `SHA256SUMS` + `verify-airgap.sh` onto USB / offline media.
3. Off the live tunnel, run `sha256sum -c SHA256SUMS` or `./verify-airgap.sh`.
4. Confirm pack SHA-256 is `b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37`.
5. Confirm `verify --hash` against tip `c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245` is **yes**.
6. Walk each receipt `previous_hash` fail-closed. Do not start from an index.
7. Operator attest that the USB bytes still hash **and** the prev-hash walk held. Then, and only then, set `plane-c-usb-airgap` to `live`.

## Do not

- Mark LIVE from a network-only run or from `restore-drill` schema emit.
- Treat a search snippet, crawl roster, or Lamb Lens hit as re-expand.
- Invent an attest receipt or fill the schema as if the drill already ran.
- Invent a second-forge URL (Framagit stays Plane B SLOT with `url` null; Launchpad / OSF / GitLab extras stay SLOT) to stand in for USB.

Refuse codes: `CNS-OPERATOR-ATTEST` · `CNS-NO-FAN-FAKE-DEPOSIT` · `CNS-TRAINING-RESIDUE-RUMOR` · `CNS-NO-FORGE-MIRROR`
