# Aziel Digital Library v2.7.0 — Poison immunity, PhysLing Review, unranked Bayesian scores

Author: **Aziel Eliab**.

## Added

- Full-structure verify on every upload and download: SHA-256 every file in a record or zip/package; receipts append to the hash-chain (`STRUCTURE_VERIFY`).
- Worker-side SPRE (Source Provenance Reliability Engine) and CLCE Jaccard port (live AZ-CLCE `/v1/score` when reachable). SPRE does not assert criminal guilt.
- PhysLing Review (PLR) — physics × linguistics third review. Units, conservation, causal order, temporal consistency, manipulative framing. Status lights on the record page.
- Poison immunity: official narrative without independent evidence, non-evidence advocacy, and contradictory-only propaganda shells are quarantined or flagged. Status is hash-chained. Files are never silently deleted. Hardest on public Corpus; operator Aziel Library can still file evidence.
- Unranked Bayesian posterior (evidence completeness, physics coherence, linguistic neutrality, SPRE PC, CLCE consistency). Stored as metadata only — never used to sort the shelf. Shown for manual peer-to-peer review.
- Peer endorse / challenge / note appends to the hash-chain without rewriting history.
- AzielTether lattice anchor tip (`aziel.lattice.anchor.v1`) on verified ingest. The live HTTPS site is not a mesh.
- Record UI: quarantine badge, PhysLing lights, Bayesian score with unranked note, SPRE/CLCE summaries, peer-review panel. Mobile-clean status lights (green / yellow / red).
- `/v1/review`, `/v1/lattice`, `POST /v1/score`. OpenAPI, llms.txt, and cite.json updated.
- **Triad composite:** when SPRE, CLCE, and PhysLing have all run, one TRIAD_V1 geometric mean is the primary visible score. Components stay stored. Bayesian remains a separate unranked peer field.
- **Backfill:** `GET /v1/verify-backfill` and `aziel-library backfill-review` score older unscored records (structure + three engines + triad + document chain). Idempotent unless `force`.
- **Document-bound hash chains:** each `AZDOC-` record owns its chain tip. Upload, download, rescore, quarantine, and peer notes append there. No orphan chains for zip `ASSET-` ids.
- **All documents downloadable:** `/file/{id}` and `/download?record=` return HTTP 200. Text-only and quarantined records included (quarantine banner + `X-Aziel-Quarantine`).
- **Ask Jeeves:** fixed bottom-right FAB, mobile-safe drawer. Research assistant over public records. Add files to Corpus only. Cannot change scores or reveal operator secrets. `POST /v1/jeeves/chat`, `POST /v1/jeeves/upload`.

## Rules kept

- Operator writes → Aziel Library only; public/anonymous → Corpus only (Lamb Lens).
- Official narrative is not merged into evidence.
- No Tor/VPN on the site.
- Author Aziel Eliab only.
