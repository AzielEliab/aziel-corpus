# Aziel Library dossiers (SOFTWARE-SITE-DOSSIER-1.0)

One solid Apache-2.0 markdown file per live Softwares card, FragGate kernel, and listed website.

- Spec: [`docs/SOFTWARE-SITE-DOSSIER-1.0.md`](../docs/SOFTWARE-SITE-DOSSIER-1.0.md)
- Generate: `node scripts/generate-software-site-dossiers.mjs --out dossiers`
- Ingest (operator only): `AZIEL_OPERATOR_TOKEN=… node scripts/ingest-software-site-dossiers.mjs --dir dossiers`

Do not unpack product tarballs into this folder. Re-running the generator overwrites the same `{slug}-aziel-dossier-1.0.md` (exact-same-subject succession on ingest).
