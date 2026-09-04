# Aziel Temporal–Geospatial Map

The Temporal Map is a corpus-native offline view over `event_date × latitude × longitude`.

## Invariants

- An original document is never changed by map extraction.- A pin never acquires coordinates by guessing.- Automatic `AUTO_SENTENCE` events require both a recognized date and a coordinate-bearing PLACE in the same sentence.- A document containing exactly one date and one coordinate-bearing place may create a lower-confidence `REVIEW` event.- Unresolved places remain unpinned and visible in the review list.- Manual events are ledgered as `EVENT_ADD` and can be tied to a source AZDOC plus a locator.- Each event has a stable AZEVT identifier, date precision, coordinates, confidence, source method, status, and creation timestamp.

## Offline basemap

The application ships a low-resolution Natural Earth world boundary dataset. It requires no map tile service and no network connection. Pan and zoom operate entirely in the browser against the local server.

## Time navigation

The built-in viewer filters by start/end year and minimum confidence. Event records are also exported to the `Temporal Map` XLSX worksheet and the preservation PDF.

## Place resolution

Coordinates can come from installed `.azk` knowledge kits. This keeps geocoding reproducible: the exact kit that supplied a place can be archived with the library. Large gazetteers may be compiled into an AZK separately rather than requiring a live geocoding API.

## v2.6.2 document event extraction
MASTER first run now attempts to build a baseline local world gazetteer automatically. Ingested text (including OCR text) can create a map event only when a place resolves to retained coordinates. Supported date text includes `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `Month D, YYYY`, `D Month YYYY`, and `Month YYYY`. Ambiguous slash dates are intentionally not guessed. Same-sentence date/place pairs are automatic high-confidence events; nearby pairs caused by line wrapping/OCR layout become REVIEW events. Installing a gazetteer automatically re-indexes existing records.

## Hosted Map pins (Worker)

`GET /v1/verify-geo?force=1` / `?status=1` walks stored records in chunks. The extraction bag is title + subjects + keywords + author + domain + filename + readable body prefix + OCR/derived/transcript text. Pins use paper month/year (year-only dates are marked estimated) — never `created_utc`. Place names resolve only through gazetteer `resolveUnique`. Explicit lat/lon pairs in the text pin when a paper date is also present; unlabeled `40.0000,0.0000` noise is not invented into a coordinate. Ambiguous places stay unpinned. Zioncheck Visual Archive titles may seed Seattle × 1936-08 after `resolveUnique("Seattle")`.
