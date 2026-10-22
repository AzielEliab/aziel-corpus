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
- No usable `INTAKE_SALT` secret refuses every item, operator included (`INTAKE-NOT-READY`, 503). See §8.
- A check that throws refuses (`INTAKE-CHECK-ERROR`).
- Unreadable bytes refuse (`INTAKE-UNREADABLE`, `INTAKE-DOC-UNREADABLE`). File bytes that cannot be decoded as text with confidence refuse (`INTAKE-UNDECODABLE`).
- An unavailable flood store refuses non-operators (`INTAKE-FLOOD-STORE-UNAVAILABLE`, 503).
- An item too large to screen inside the Worker CPU and memory limits refuses (`INTAKE-TOO-LARGE`, 413), operator included, before the text checks run. It is never passed unscreened and never cut down to a prefix. See §8.

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
- `submitter_key` / `ip_key`: salted hashes keyed by the `INTAKE_SALT` secret, never the raw id or IP. The IP key is per IPv4 address, or per IPv6 /64 (see §5)

It never holds the content, the filename, an excerpt, or the matched term. Refused bytes are dropped in memory before the error leaves the gate. Nothing refused is logged (`console.*` is asserted clean in tests). The receipt is **not** a ledger entry and is not chained.

`intake_seen` (PR D) keeps only `content_sha256`, a MinHash signature, and the submitter and IP keys. It exists for duplicate and rate checks.

## 3. Media: refused by default, at every door (PR B, #185)

Image, video and audio are refused 415 for **every caller, operator included**. This is a floor, not a setting. Detection never trusts the filename or MIME:
- magic bytes at offset 0
- media signatures anywhere (polyglots, appended blobs)
- declared media MIME or extension
- PDFs opened: image XObjects, inline images, embedded files and rich media. Streams are decoded through `/FlateDecode`, `/ASCII85Decode` and `/ASCIIHexDecode` (short names `/Fl`, `/A85`, `/AHx`; chained filters too). Any other filter (LZW, RunLength, Crypt, image codecs, …) cannot be read here, so the stream refuses as unreadable. A stream's dictionary is read from its own object only; if its `/Filter` is ambiguous the document refuses
- Office/ODF/EPUB zips opened, and any media part refuses
- other archives refused outright
- text scanned for `data:` URIs, `<img>`/`<video>`/`<svg>`, CSS `url()`, markdown image embeds, and base64 / hex / Ascii85 runs (whole run, zlib/gzip-wrapped included) that decode to media
- file bytes decoded as text only with confidence (UTF-8, UTF-16 with or without BOM, control-free single-byte); otherwise `INTAKE-UNDECODABLE`

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

What text is read:
- text files decoded as UTF-8, UTF-16 LE/BE (with or without BOM) or Latin-1; otherwise `INTAKE-UNDECODABLE`
- every part of docx/odt/xlsx/pptx zips, with Word runs joined as a reader sees them (package XML is not scored as spam or hidden HTML)
- PDF literal and hex strings (octal escapes, UTF-16 BOMs), `TJ` arrays, and CID fonts through their `ToUnicode` CMaps, after Flate / ASCII85 / ASCIIHex decoding (other filters refuse at the media floor)

What is **not** read: PDF text in a font with no `ToUnicode` and a custom encoding, text drawn as vector paths or images, encrypted PDFs, and encodings outside those listed. Text that is not read is not checked. No scanner is perfect; this is a floor, not a guarantee.

## 5. Floods and rate limits (PR D, #187)

- Exact duplicate within 30 days: 409.
- Near-duplicate: MinHash similarity ≥ 0.75 within 24 h, for texts of at least 20 tokens. A third near-copy from the same submitter or IP is refused, and so is a fourth from anyone.
- Rate limits: 10/h and 50/day per user; 20/h and 100/day per IP. Overridable with `INTAKE_RATE_*`. Refusals count toward the limit.
- The IP key is the IPv4 address, or the IPv6 **/64** (one subscriber is usually given a whole /64, so rotating the low 64 bits does not mint new buckets). IPv4-mapped IPv6 counts as the IPv4 address.
- One request, one submission. A door that screens, does work (OCR, transcription) and then calls `ingestRecord` passes the earlier pass as `followup`. The follow-up screen runs every content check again, but it adds no rate count and no second `intake_seen` row, and the earlier pass's own row is not treated as its duplicate. Other copies still count. Only a pass returned by `screenIntake` in the same isolate is honoured; a plain object is ignored. Limit: if the follow-up text differs from the first pass (e.g. OCR output), only the first pass's hash is recorded.
- The operator is exempt but still recorded.

## 6. What is reliable and what is heuristic

No scanner is perfect, and this gate is no exception. Each check is one layer. Where the gate can see that it cannot read something, it refuses.

| check | kind | notes |
|---|---|---|
| media magic bytes, MIME/extension, archive refusal | **reliable** for what it covers | fail closed on unknown structure |
| PDF/Office embedded media | **reliable** for parsable files; unreadable means refuse | PDF streams are read through Flate, ASCII85 and ASCIIHex only; any other filter refuses rather than passes. Encrypted PDFs are not opened |
| media signatures inside text/base64/hex | reliable for base64, hex and Ascii85 runs (zlib/gzip-wrapped included) | Z85 and other base85 alphabets, raw deflate without a header, XOR or encryption, custom alphabets, steganography and media split across fields can evade. A separate media floor at storage would be needed for full certainty |
| text decoding (UTF-8/UTF-16/Latin-1) | reliable for those encodings | anything else refuses `INTAKE-UNDECODABLE` |
| PDF text extraction | reliable for strings and `ToUnicode` fonts | custom-encoded fonts without `ToUnicode`, vector or image text are not read, so not checked |
| invisible/bidi chars, hidden markup | reliable detection, some false positives | legit RTL text with stray controls is refused |
| CSAM indicator, explicit, injection, spam | **heuristic** | word lists and proximity. They miss paraphrase and misfire on prevention research and survivor writing. Refuse-on-doubt is deliberate |
| exact duplicate | reliable | |
| near-duplicate (MinHash) | heuristic, tunable | |
| rate limits | reliable counting; IP keys are coarse (NAT, CGNAT, VPN; IPv6 per /64) | |
| hash matching (future) | reliable for **known** material only | |
| classifiers (future) | heuristic | |

## 7. Known gap found during this work (fixed in PR A, #184)

In `library.js` `ingestRecord` on `main`, the learned-poison preflight (`preflightIngest`, `POISON_LEARNED`) runs **after** `putObject` has written the file or text body to R2. The thrown message says "body not stored", but the R2 object already exists. A preflight that throws also sets `preflight = null` and continues, which fails open.

After review this is fixed in PR A (#184) rather than left for later, so the code matches its own claim ("body not stored"):
- the preflight runs **before** any `putObject`, in strict mode
- if it throws or returns nothing, the item is refused 503 with receipt `refuse: "PREFLIGHT_UNAVAILABLE"` (`stored: false`, `chained: false`, `body_retained: false`), and nothing reaches R2
- `POISON_LEARNED` refusals are unchanged, except that the body is now truly not stored

This changes existing behaviour: an outage of the preflight now refuses instead of letting the item through. It ships only with Aziel's go-ahead on #184 (open item 12).

## 8. Defaults and configuration

Everything is off by default or fails closed.
- `INTAKE_SALT`: **required** Worker secret (`wrangler secret put INTAKE_SALT`), at least 16 random characters. There is no fallback. The old public default is rejected. Without a usable salt every intake is refused `INTAKE-NOT-READY` (503), because a public salt would make IP hashes reversible.
- `INTAKE_RATE_*`: optional overrides.
- `INTAKE_MEDIA_SCAN_GATE`: inert while the code lock is false.
- Screening budget (`src/intake-budget.js`, constants, no env override): a file over `MAX_SCREEN_BYTES` = **6 MiB**, or typed fields (title + body + texts, UTF-8) over 6 MiB, refuse in `readable`; more than `MAX_SCREEN_CHARS` = **2 Mi characters** of text to screen (fields plus all text taken out of the file) refuses in `text`. For a PDF the budget is enforced while the file is read, before the next view or regex is built (see "Screening budget" below). Both refuse `INTAKE-TOO-LARGE` (413). The 25 MiB transport ceiling (`INTAKE-UNREADABLE`, 413) is unchanged. See "Screening budget" below.
- Future: `PHOTODNA_SUBSCRIPTION_KEY`, `CLASSIFIER_PROVIDER` plus key, an `AI` binding (second opinion only), `FRAME_EXTRACTOR_URL`.

### Screening budget

The text checks are linear (no regex stack overflow), but cost and memory still grow with size. The Worker limits are 30 s CPU per request (paid default; `wrangler.toml` sets no `[limits] cpu_ms`) and 128 MB of memory per isolate. The budget is a size budget, not a clock: `Date.now()` does not advance while synchronous code runs in a Worker, so a time check cannot stop a long scan.

Measured with `screenIntake` at the `upload` door: process CPU on the review box (Node), plain-text files, before the budget. "Heap" is the largest size that finished under `--max-old-space-size`:

| shape | 1 MiB | 4 MiB | 6 MiB | 8 MiB | heap 100 MB | heap 128 MB |
|---|---|---|---|---|---|---|
| `a` × N (one homogeneous run) | 1.2 s | 3.3 s | 5.1 s | 6.9 s | 3 MiB | 4 MiB |
| English prose | 2.0 s | 8.9 s | 13.6 s | 19.1 s | 3 MiB | 4 MiB |
| `ab ` × N (many short hex-alphabet tokens; worst found) | 3.3 s | 14.3 s | 21.5 s | 28.3 s | 2 MiB | 2 MiB |

Memory binds first: no shape fit 128 MB of heap at 5 MiB of screened text, and the worst shape failed at 3 MiB. GC was 46-60% of the CPU profile. The work cannot be predicted from size alone: every shape sends the same ~15.7× its size through `normalizeForMatch`, but the cost per character depends on the content. So the budget caps the screened text at 2 Mi characters, the largest size every measured shape finished inside a 100 MB heap, and caps the bytes read at 6 MiB.

With the budget:

| item | result | CPU |
|---|---|---|
| 1.99 MiB plain text: `a` / prose / `ab ` | screened, pass | 2.3 s / 5.4 s / 7.5 s (all fit 100 MB) |
| 6 MiB text-only PDF (1.9 MiB of text, embedded font program) | screened, pass | 5.0 s (fits 100 MB) |
| file of 6 MiB + 1 byte, or 24 MiB | `INTAKE-TOO-LARGE` 413 (`readable`) | ≤ 60 ms |
| 3 MiB body field (under 6 MiB, over 2 Mi chars) | `INTAKE-TOO-LARGE` 413 (`text`) | 1.1 s (media floor runs first) |
| small PDF holding 3 Mi characters of text | `INTAKE-TOO-LARGE` 413 (`text`) | 0.4 s (inflate + extract only) |

How the char budget is counted and enforced:

- Typed fields are counted first; a PDF is then read with what is left (`fileTexts(file, { maxChars })`).
- PDF: each literal or `<hex>` string is charged as it is decoded; one bigger than what is left refuses before it is decoded or tokenized. The glued TJ view and the CID/ToUnicode "shown" view are charged too, because each is screened in full: counting the source once let a 2 Mi TJ-array PDF (spaced + glued about 4 Mi) run a 128 MB heap out of memory. Inflate output is capped at the char budget (it was 32 MiB): text-bearing streams share it, a font program may use the whole budget on its own, and an inflate overflow (`pdfDecodeStream(..., info)` sets `info.tooLarge`) refuses `INTAKE-TOO-LARGE`, not `INTAKE-UNDECODABLE`. Real papers checked here inflate at most 0.67 MiB of text-bearing streams.
- Text and Office/XML parts are counted as stored, markup included, because the raw XML is screened. So the effective docx limit is the XML size, not the visible text: a Word document.xml has several times its visible text in markup. Counting only visible text is not safe yet: a 6 MB document.xml (about 0.6 Mi visible chars) ran a 128 MB heap out of memory. That needs the memory work below.
- Fail-closed caps (PR "fail-closed caps"): no decoded-run cap (every base64/hex run is decoded), and the PDF parser caps (20,000 literals, 40,000 hex strings, 2,000,000 content tokens, 200,000 objects) refuse `INTAKE-UNDECODABLE` when reached, never truncate. A `ToUnicode` map past 70,000 entries refuses the same way (exactly 70,000 PASS; the 70,001st new key refuses; it was cut silently). An unterminated `(` literal, whose text used to be dropped unread, has the rest of its text screened (as a literal body, and raw when it reads as UTF-16/UTF-8 or glyph codes), alone and joined with already-closed literals so a CSAM/injection pair split across a closed `()` and the unterminated tail cannot pass (B193-1): a marker on either view refuses `INTAKE-UNDECODABLE`. A stray `(` with nothing after it still passes, because binary stream bytes in real PDFs (images, ICC profiles, xref, C2PA, fonts) hold them: refusing every one refused about 50 of 730 real files checked. That rest is not charged to the char budget; it is part of text the budget already bounds and is not kept.

Bombs (small PDFs that inflate to 31 MiB), full gate at a 128 MB heap: one 31 MiB `(ab ...) Tj`, 31 streams of 1 MiB, `(a) Tj` × 31 MiB and 31 MiB of prose all refuse `INTAKE-TOO-LARGE` in about 0.6 s, no OOM (before: a RangeError in the content tokenizer, or a pass after 96 s for the 31-stream file).

Worst case under the budget (AZBot, review box, full gate, just under 2 Mi chars): 7.8-8.8 s wall and 9.5-10.6 s CPU; runs out of memory at a 64 MB heap and passes at 96 MB. By shape, wall/CPU s: `ab` 8.2/9.9, `ab` in the body field 8.8/10.6, space-separated hex 8.4/10.3, percent-encoding 7.8/9.5. PDFs just under the budget measured here at 128 MB: one `(ab ...)` literal 8.3/9.9 (9.2/11.0 at 96 MB, OOM at 64 MB), unfiltered 8.2/9.7, prose 4.9/5.7. That is about a third of the CPU limit. A normal 6 MiB paper passes: in a text-first corpus most of a large PDF is fonts and structure, not text. A paper with more than 2 Mi characters of text (about 350,000 words) is refused, not screened in part. Raising the budget needs memory work in the text checks first (fewer whole-text copies), not just a larger `cpu_ms` (open item 13).

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
9. False positives of the CSAM indicator on prevention research and survivor accounts: accept refusals, or a reviewed operator path? Found in testing: a technical design document using "explicit" and "children" (tree nodes) a few words apart is refused. The proximity rule is unchanged here; whether "explicit" should count as a sexual term for it is Aziel's call.
10. Set `INTAKE_SALT` as a Worker secret **before** deploying #184. Without it, all intake refuses.
11. IP rate-limit coarseness (shared NAT and CGNAT; IPv6 grouped per /64).
12. Approve the §7 poison-ordering fix in #184 (fail-closed `PREFLIGHT_UNAVAILABLE`).
13. Screening budget (§8): 6 MiB per file and 2 Mi characters of screened text. Texts longer than about 350,000 words are refused `INTAKE-TOO-LARGE`. Raising it means cutting the text checks' memory use first. Setting `[limits] cpu_ms` alone does not help, because memory runs out first. The budget also applies to operator kits (`historical-import`, `install-package`, `expect: "package"`): a kit over 6 MiB is now refused. Confirm, or split large kits.
14. Found while measuring: the PDF media floor's `/3D` name test can match by chance inside an uncompressed binary stream (pseudo-random bytes in a font program refused `INTAKE-MEDIA-EMBEDDED`). This fails closed, so it is safe, but it is a possible false positive on real papers with embedded fonts. It is unchanged here.
