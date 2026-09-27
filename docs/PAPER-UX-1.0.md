# PAPER-UX-1.0 — In-library paper reader

Author: Aziel Eliab
Spec id: PAPER-UX-1.0
License: Apache-2.0
Neighbors: NO-LIE-NO-REWRITE-1.0, RL-WP-0.1-library, TUN-WP-0.1

## Permalinks

Share a paper with a path, not a search query.

| Shelf | Path |
| --- | --- |
| Aziel Library | `/aziellibrary/{slug}` |
| Corpus (user submitted) | `/azielcorpus/usersubmitted/{slug}` |

`/record/{AZDOC}` still opens the same reader. The slug path is the share URL. Page 2 of a multi-page text is `{permalink}/p/2`.

Slug comes from the title. A locked slug is not changed. When two unlocked papers share a title, the lowest record id keeps the bare slug and the other gets a record-id suffix. Undated papers stay labeled Undated. Upload time is "Filed", not a invented publication date.

## Counters

Each paper has its own views and downloads in KV (`aziel-corpus|paper|{AZDOC}|views` and `|downloads`). The paper page reads those keys. A missing key is 0. If KV is absent, the page says counters are unavailable and does not print a fake 0.

Homepage "Top 5 viewed" and "Top 5 downloaded" are collapsed dropdowns. Each lists at most 5 papers that exist in the packed index and have a stored count above 0. Unknown ids are not turned into rows. Both sections stay on the homepage when a list is empty.

A view increments on a human or other non-SEO GET of the reader. A download increments on `GET /download?record={AZDOC}`. A hash download increments only when exactly one packed card owns that `content_sha256`.

## Reader

Text papers open in a Zenodo-style record aside plus a Wikipedia-style body. Form-feed and page-break markers become a page turner with a page count. One block stays a standalone paper. Markdown stays that text view.

PDFs, images, audio, video, and HTML are painted in the reader from the stored file. HTML is shown with scripts off. Download stays under the view. A type the browser cannot paint (archives, office documents, and other binaries) says so in plain language. Stored text is shown when the upload stored readable text and that text is not the file bytes.

A title or AZDOC id becomes a link only when that paper is already in the library. Lamb Lens on the reader: Service, then Clarity, then Peace.

## Upload pipeline

New uploads still hash the served bytes (`content_sha256`) and append the title, concept (subject, else domain, else keyword), shelf, and permalink onto `library:index:v1`. The paper chain tip is cited. It is not rewritten to publish the permalink.

If an upload contains the identity cluster (a personal name together with the place and year tokens), those tokens are black-barred before the text is indexed. Unrelated mentions of a place or year are left alone. When the redacted bytes already match a stored object, the upload returns that record and does not insert a second row. Binary originals are not re-encoded.

## Backfill

`GET /v1/paper-backfill` stamps permalinks onto the packed index, then appends `permalink`, `permalink_slug`, and `permalink_shelf` onto existing discovery JSON. It does not delete fields. Repeat `?all=1` until `done` is true. `?status=1` reports progress. `?force=1` restarts the cursor. Cron continues the walk.

Discovery `metadata_sha256` on an already written sidecar stays the first discovery hash. The permalink add is an appended JSONAZDOC ledger action `JSON_PAPER_UX`.

This job does not invent view or download counts. Those stay 0 until a real request stores them.
