# Plane B — Zenodo tip-pack deposit checklist

Author: Aziel Eliab only
Spec: COLD-MULTI-SHELF-1.0
Umbrella: CROSS-NETWORK-SURVIVAL-1.0 · NO-LIE-NO-REWRITE-1.0
Lockset: AZLOCK-INGEST-REEXPAND-1.0
Published tip: `c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245`
cite.json / lockset `doi`: **null** (do not invent)

This is a checklist, not a deposit. Plane B stays **SLOT** until a real DOI exists **and** hash-verify proves the uploaded bytes carry the published tip.

## Pack to deposit

```bash
node tools/cold_shelf/cli.mjs export --out tools/cold_shelf/out
node tools/cold_shelf/cli.mjs airgap --out tools/cold_shelf/out/airgap
```

Deposit the airgap directory or its `.tar` + `SHA256SUMS` + `verify-airgap.sh`. Do not deposit a paraphrase.

## Steps (operator)

1. Confirm `verify --hash` against the published tip is **yes**.
2. Confirm `SHA256SUMS` matches every file in the pack.
3. Create a **new** Zenodo deposit titled as a tip-pack / lockset cold copy (not a product paper).
4. Upload the tarball + SHA256SUMS + verify script + `lockset.json`.
5. Publish. Copy the real DataCite DOI the deposit assigns. Do not invent one.
6. Hash-verify the downloaded deposit against the published tip.
7. Only then set registry `zenodo-tip-pack` to `live` and write that DOI. Lockset hashed core stays `doi: null` until a later companion cite is added **outside** the hashed payload.

## Do not

- Invent a DOI to fill Plane B.
- Reuse ShadowLock / DecisionGATE / TrajectoryLock / WhistleLock / FoldLock / EmployeeLock paper DOIs as the tip-pack unless step 6 proves those bytes carry this tip. They are companion papers; tip-carry is **not** verified.
- Claim Plane B is LIVE because doi.org 302s a paper record.
- Count Plane A hosts as a substitute for this deposit.

Refuse codes: `CNS-NO-TIP-DOI` · `CNS-TIP-NOT-ON-DEPOSIT` · `CNS-NO-FAN-FAKE-DEPOSIT`
