# Plane C — USB airgap operator attest

Author: Aziel Eliab only
Spec: COLD-MULTI-SHELF-1.0
Umbrella: CROSS-NETWORK-SURVIVAL-1.0 · NO-LIE-NO-REWRITE-1.0
Lockset: AZLOCK-INGEST-REEXPAND-1.0
Published tip: `c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245`
Refuse: `CNS-OPERATOR-ATTEST`

Plane C USB airgap stays **SLOT** until an operator attests an off-network copy still hashes. LIVE only after that attest. The pack is executable today; the airgap copy is not yet attested.

## Attest path (USB offline-verify before LIVE)

1. Build the pack: `node tools/cold_shelf/cli.mjs airgap --out tools/cold_shelf/out/airgap`
2. Copy the tarball + `SHA256SUMS` + `verify-airgap.sh` (or the whole airgap directory) onto USB / offline media.
3. On a machine off the live tunnel, run `sha256sum -c SHA256SUMS` or `./verify-airgap.sh`.
4. Confirm `verify --hash` against the published tip is **yes**.
5. Operator attest that the USB bytes still hash. Then, and only then, set `plane-c-usb-airgap` to `live`.

Do not mark LIVE from a network-only run. Do not skip the off-network copy. Do not invent a second-forge URL to stand in for USB.

Refuse codes: `CNS-OPERATOR-ATTEST` · `CNS-NO-FORGE-MIRROR`
