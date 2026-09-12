# SOFTWARE-SITE-DOSSIER-1.0 — one solid file per software or website

Author: **Aziel Eliab** only.

Status: locked library ingest spec (2026-09-12). Not a Softwares-tab chrome change. Not Zenodo.

License: **Apache-2.0**. Forks welcome.

---

## Sentence

Every live Softwares card and every listed website imports coding, concept, usecase, and purpose into **Aziel Library** as **exactly one** dossier file — not a tarball unpack, not ~100 source files per product.

## Why

Operator-intended docs belong on the Aziel Library shelf (`library=aziel`), not only the anonymous Corpus. The live runtime catalog already carries `one_line`, Worker/GitHub surfaces, and `cite.json`. Those facts should land on the shelf as a reviewable, hashable, succession-safe markdown document.

`software_deposit_needed` / Zenodo DOI minting is a **separate** catalog note (`deposit_needed` on product cards when present). This spec does **not** mint DOIs. A 2026-09-12 live `GET /v1/software` payload had **no** `deposit*` field; dossiers still file here.

## Targets

**Websites / hubs (fixed slugs)**

| Slug | URL |
|------|-----|
| `azieleliab-com` | https://www.azieleliab.com/ |
| `azielcorpuslibrary-net` | https://www.azielcorpuslibrary.net/ |
| `godlock-uk` | https://godlock.uk/ |
| `hedidntjump-com` | https://hedidntjump.com/ |
| `aziel-runtime` | https://aziel-runtime.vibelock.workers.dev/ |

**Softwares:** every live card from `GET https://aziel-runtime.vibelock.workers.dev/v1/software` (`software[]`).

**Kernel:** FragGate (`https://github.com/AzielEliab/fraggate`) if it is not already a catalog `software[]` slug. Mesh / memory fabric rollups are not Softwares-tab products and are out of scope.

`godlock` (engine card) ≠ `godlock-uk` (website). `aziel-corpus` (library software) ≠ `azielcorpuslibrary-net` (website).

## File shape (locked)

Prefer Markdown `.md` (the Worker ingest path already treats markdown as text and indexes it). PDF only if a future Worker ingest required binary — it does not.

Filename: `{slug}-aziel-dossier-1.0.md`

YAML front matter (ingest metadata) plus these sections **inside that single file**:

1. Title + Author **Aziel Eliab** + Version/date
2. **License:** Apache-2.0 (state clearly; forks welcome)
3. Identity / what it is / what it is not
4. Purpose
5. Concept
6. Use cases
7. Coding / architecture notes (summary only — FragGate single door if applicable; do **not** paste the whole repo)
8. Surfaces (Worker UI, GitHub, Try on Glama / MCP when relevant, counted `/download`)
9. Related ecosystem links (Person `@id` https://www.azieleliab.com/#aziel ; Runtime `@id` https://www.azieleliab.com/runtime#runtime when relevant)

Source material: live `one_line` + `cite.json` + README lead + a single docs abstract URL when obvious. **Do not** unpack tarballs. **Do not** upload per-source-file.

## Library placement

| Field | Value |
|-------|--------|
| Shelf | `aziel` (Aziel Library) |
| Author | Aziel Eliab only |
| Domain | `software` and/or `research` (websites may be both; He Didn't Jump is research/history) |
| Subjects | `{slug} aziel dossier` (stable; exact-same-subject succession) |
| ZionPattern | software / hardware / designs **do not qualify** — `zion_pattern: not_applicable` (omit Zion on those cards). A historical investigation site is not a software card. |

## Generator

```bash
node scripts/generate-software-site-dossiers.mjs --out dossiers
node scripts/generate-software-site-dossiers.mjs --catalog tests/fixtures/software-catalog-dossier.json --offline --out /tmp/dossiers
```

`--unpack` / `--tarball` are refused. Re-run overwrites the same filename (same subject), never a second file per slug.

## Operator ingest (no public write hole)

Same pipeline as Jeeves / shelf ingest (`ingestRecord`: structure, SPRE × CLCE × PhysLing, Bayesian, document hash-chain).

Authenticated paths only:

1. `POST /v1/operator/library-ingest` — requires `X-Aziel-Operator-Token` / `Authorization: Bearer` matching Wrangler secret `OPERATOR_TOKEN` **or** an operator session cookie (`user_id=master` / `role=superadmin`).
2. `POST /v1/jeeves/upload` — same when the caller is the operator (session or operator token). Public signed-in Add still writes **Corpus only**.

Anonymous POST is rejected (401). A public account cannot write Aziel Library (403).

```bash
export AZIEL_OPERATOR_TOKEN='…'   # Wrangler secret OPERATOR_TOKEN; never commit
node scripts/ingest-software-site-dossiers.mjs --dir dossiers --host https://www.azielcorpuslibrary.net
```

Idempotent: identical SHA on the Aziel shelf is returned unchanged. A changed dossier with the same subject **supersedes** the previous AZDOC (exact-same-subject succession), rather than spawning an unlinked duplicate.

## Out of scope

- Zenodo DOI minting
- Softwares-tab chrome / “Library dossier” link
- Triad / Zion shelf scoring bugs (separate work)
- Unpacking product source trees into the library
