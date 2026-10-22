# CORPUS-INTAKE-SAFETY-1.0

Status: **proposed**. Implemented across stacked PRs #184 → #185 → #186 → #187 → #188 (aziel-corpus) plus one aziel-runtime PR. Nothing is merged or deployed.
Author: Aziel Eliab.

## 0. The rule this design serves

Nothing is ever removed from the corpus. Once a record is chained, it stays. So safety cannot be a cleanup step. It must sit **strictly before the chain**: no R2 put, no D1 `records` row, no ledger append and no IndexNow ping until the gate has said yes. This design adds **no retroactive deletion** and no takedown path. It does not change any existing record, receipt or ledger row.

The hard floor is **child sexual abuse material can never get in**. Everything else here is secondary to that.

## 1. One gate, fail closed

`workers/download-tracker/src/intake-gate.js` exports `screenIntake(env, input)`. Every door that can feed the chain calls it first:

| door | route / caller |
|---|---|
| `upload`, `ingest`, `aziel-library` | auth.js upload and ingest handlers |
| `v1-ingest` | library-mcp.js `POST /v1/library/ingest` (agent/MCP import) |
| `operator-library-ingest` | operator-ingest.js |
| `jeeves-upload` | jeeves.js (carries the real submitter; Jeeves re-signs as `jeeves-public`) |
| `transcribe`, `ocr`, `historical-import`, `install-package` | hosted.js |
| `ingestRecord` (fallback) | library.js `ingestRecord`, the single write pipeline, calls `screenIntake` before `ensureLedger` / `putObject` |

Checks run in a fixed order and the first refusal wins: `readable` → `media-floor` → `text` → `flood`. Fail-closed rules:
- A check that throws refuses (`INTAKE-CHECK-ERROR`).
- Unreadable bytes refuse.
- An unavailable flood store refuses non-operators (`INTAKE-STORE-UNAVAILABLE`).

There is no "skip" flag.

**FragGate stays the single door.** Agent imports reach the corpus through FragGate (`fraggate_call`) and the `/v1/library/ingest` route, and both land on the same gate. The gate is **additive only**:
- no FragGate op, tool count, software count or version changes (aziel-runtime stays 36 tools / 42 Softwares / 363 stub ops / 2.0.0-rc1)
- no existing response field is removed
- refusals use new reason codes in an existing error shape

AZOS and azinterface only proxy `news_ingest` to aziel-runtime through FragGate. They are covered by the aziel-runtime change and need no code of their own.

## 2. Refusal receipts: hashes and a reason code only

A refusal writes one `intake_refusals` row:
- `refusal_id`, `created_utc`, `door`, `reason_code`, `spec`
- `file_sha256` / `body_sha256` / `title_sha256`
- `submitter_key` / `ip_key`: salted HMAC-style hashes keyed by `INTAKE_SALT`, never the raw id or IP

It never holds the content, the filename, an excerpt, or the matched term. Refused bytes are dropped in memory before the error leaves the gate. Nothing refused is logged (`console.*` is asserted clean in tests). The receipt is **not** a ledger entry and is not chained.

`intake_seen` (PR D) keeps only `content_sha256`, a MinHash signature, and the submitter and IP keys. It exists for duplicate and rate checks.

## 3. Media: refused by default, at every door (PR B, #185)

Image, video and audio are refused 415 for **every caller, operator included**. This is a floor, not a setting. Detection never trusts the filename or MIME:
- magic bytes at offset 0
- media signatures anywhere (polyglots, appended blobs)
- declared media MIME or extension
- PDFs opened: image XObjects, inline images, embedded files and rich media; Flate streams inflated, and an unreadable stream refuses
- Office/ODF/EPUB zips opened, and any media part refuses
- other archives refused outright
- text scanned for `data:` URIs, `<img>`/`<video>`/`<svg>`, CSS `url()`, markdown image embeds, and base64/hex runs that decode to media

**A document with an embedded image is refused, not stripped.** The OCR spectral-overlay artifact (a derived image) is a no-op while `MEDIA_SCAN_GATE_VERIFIED` is false.

### Future media path (PR E, #188): built, OFF, fails closed

`src/intake-scan-gate.js` is **not wired to any door**. It is locked twice: by `MEDIA_SCAN_GATE_VERIFIED = false` in code, and by `INTAKE_MEDIA_SCAN_GATE=on`. Its pipeline:
1. strip metadata first (JPEG APP1–15/COM, PNG text/eXIf/tIME; other formats refuse); scan exactly the kept bytes
2. structure: trailing data or a second container refuses
3. known-abuse hash match (PhotoDNA-class)
4. every classifier: flag, uncertain, or score ≥ 0.2 refuses
5. OCR, then the text checks of §4
6. video: all keyframes plus sampled frames; **one flagged frame refuses the file**

Scanner down, timed out, unconfigured or malformed means refuse. **No real scanner is wired**; tests use stubs.

Research notes for choosing scanners:
- **Cloudflare CSAM Scanning Tool** works on content *served through the Cloudflare cache*.
  - It matches against NCMEC-provided hash lists and blocks the URL (451), then emails the operator.
  - It has needed only a verified email (no NCMEC credentials) since early 2025.
  - The operator still files their own reports, and preservation duties apply.
  - It runs **after** storage and serving, so it is a **backstop, never the pre-storage gate**. Turn it on anyway.
- **Microsoft PhotoDNA Cloud Service** is a REST match against known-CSAM hashes. It is free to qualified organisations after vetting and does not retain submitted images, so it fits a **pre-storage** gate. Aziel must apply.
- **Classifiers.** Workers AI has **no** purpose-built NSFW or minor-safety classifier.
  - Real Workers AI models: `@cf/microsoft/resnet-50` (ImageNet labels, not safety), `@cf/meta/llama-guard-3-8b` (text only), and the vision LLMs `@cf/meta/llama-3.2-11b-vision-instruct` and `@cf/llava-hf/llava-1.5-7b-hf`. A VLM prompt is a second opinion, never the sole classifier.
  - Dedicated options: Hive, Sightengine, AWS Rekognition `DetectModerationLabels`, Azure AI Content Safety, Google Cloud Vision SafeSearch.
- **Video.** Workers have no FFmpeg, so frame extraction and remuxing need an external service.

**No scanner is perfect.** Hash matching finds only *known* material. Classifiers miss and misfire. OCR misses stylised text. That is why "uncertain" refuses, and why the floor stays until the gate is verified with real scanners and Aziel signs off.

### Reporting: human in the loop, never automated

A known-abuse match returns `INTAKE-MEDIA-KNOWN-ABUSE-MATCH` with `human_report_required: true` and `route: operator-human-review`. Aziel decides on and files any NCMEC CyberTipline report by hand. No code here contacts NCMEC or any third party.

**Open legal tension.** 18 U.S.C. §2258A requires a provider that *reports* to preserve the reported material for a period. "Never store refused content" conflicts with that once a report is made. Today media never reaches storage, because the floor refuses it before any byte is kept, so the tension does not yet arise. It **must** be settled with counsel before the scan gate is ever turned on.

## 4. Text checks (PR C, #186)

Text is normalised first: NFKC, invisibles stripped, homoglyph and leetspeak folding.

**Hard checks** (everyone, operator included):
- invisible or bidi controls (a leading BOM and Persian ZWNJ are allowed)
- hidden HTML/CSS/Word text
- CSAM indicator: a minor term or an age under 18 within 12 tokens of a sexual term, or a code word
- explicit content
- encoded injection: base64/hex/%xx/entities/`\u`/rot13 payloads that decode to instructions

**Heuristic checks** (operator exempt):
- injection phrases such as "ignore previous instructions"
- spam score ≥ 3

PDF text (including Flate streams) and Office XML are read too.

## 5. Floods and rate limits (PR D, #187)

- Exact duplicate within 30 days: 409.
- Near-duplicate: MinHash similarity ≥ 0.75 within 24 h, more than 2 from the same submitter or more than 3 globally, for texts of at least 20 tokens.
- Rate limits: 10/h and 50/day per user; 20/h and 100/day per IP. Overridable with `INTAKE_RATE_*`. Refusals count toward the limit.
- The operator is exempt but still recorded.

## 6. What is reliable and what is heuristic

| check | kind | notes |
|---|---|---|
| media magic bytes, MIME/extension, archive refusal | **reliable** for what it covers | fail closed on unknown structure |
| PDF/Office embedded media | **reliable** for parsable files; unreadable means refuse | exotic encodings (e.g. JBIG2 in odd filters) refuse rather than pass |
| media signatures inside text/base64/hex | reliable for standard encodings | custom encodings can evade; a separate media floor at storage would be needed for full certainty |
| invisible/bidi chars, hidden markup | reliable detection, some false positives | legit RTL text with stray controls is refused |
| CSAM indicator, explicit, injection, spam | **heuristic** | word lists and proximity. They miss paraphrase and misfire on prevention research and survivor writing. Refuse-on-doubt is deliberate |
| exact duplicate | reliable | |
| near-duplicate (MinHash) | heuristic, tunable | |
| rate limits | reliable counting; IP keys are coarse (NAT, CGNAT, VPN) | |
| hash matching (future) | reliable for **known** material only | |
| classifiers (future) | heuristic | |

## 7. Known gap found during this work (not fixed here)

In `library.js` `ingestRecord` on `main`, the learned-poison preflight (`preflightIngest`, `POISON_LEARNED`) runs **after** `putObject` has written the file or text body to R2. The thrown message says "body not stored", but the R2 object already exists. A preflight that throws also sets `preflight = null` and continues, which fails open.

The intake gate now runs before both, so the floor, text and flood checks are unaffected. The poison preflight itself should still be moved ahead of `putObject` and made fail-closed, so the code matches its own claim. Proposed as a follow-up PR on Aziel's go-ahead. It changes existing behaviour, so it is not bundled here.

## 8. Defaults and configuration

Everything is off by default or fails closed.
- `INTAKE_SALT`: secret recommended; a default exists so hashing never fails open.
- `INTAKE_RATE_*`: optional overrides.
- `INTAKE_MEDIA_SCAN_GATE`: inert while the code lock is false.
- Future: `PHOTODNA_SUBSCRIPTION_KEY`, `CLASSIFIER_PROVIDER` plus key, an `AI` binding (second opinion only), `FRAME_EXTRACTOR_URL`.

## 9. Tests

All test media are synthetic header bytes with marker strings, never real images or video. Each PR's tests fail on the code before it.

## 10. Open items for Aziel

1. NCMEC CyberTipline: who reports and how (human only), and legal counsel on §2258A preservation vs. "never store refused content".
2. Enable the Cloudflare CSAM Scanning Tool on azielcorpuslibrary.net as a backstop.
3. Apply for PhotoDNA Cloud Service.
4. Choose a classifier vendor or binding.
5. Choose a frame-extraction and remux service for video.
6. Existing AZNews rows holding small image base64 (≤4096 bytes) from before the runtime floor. Rule: nothing removed. Decide whether they stay, or whether future reads stop serving them.
7. Operator exemption from heuristic text checks: keep?
8. `/transcribe` now refuses audio uploads under the floor. Confirm.
9. False positives of the CSAM indicator on prevention research and survivor accounts: accept refusals, or a reviewed operator path?
10. Set `INTAKE_SALT` as a Worker secret.
11. IP rate-limit coarseness (shared NAT).
12. Approve the §7 poison-ordering follow-up.
