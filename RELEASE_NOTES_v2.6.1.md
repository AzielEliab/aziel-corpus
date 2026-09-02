# Aziel Digital Library v2.6.1 — OCR Completion Hotfix

This release fixes the image/scanned-PDF OCR setup path discovered in v2.6.0.

## Release-blocking fixes

- Tesseract no longer receives an empty `TESSDATA_PREFIX` after a failed language-data download.- The English tessdata download now uses the official repository's raw-content endpoint first and has a second official-repository fallback URL.- Failed downloads remove `.partial` files and empty poison directories.- Windows processor discovery now checks standard Tesseract install locations, WinGet Links, and WinGet package directories, so a newly installed Tesseract/Poppler can be used without restarting Aziel.- First-run OCR setup is marked complete only after a real image OCR and real scanned-PDF OCR self-test pass.- A failed bootstrap is no longer permanently skipped on later launches.- PDF OCR pages use numeric page ordering rather than lexicographic filename ordering.- Weak/basic PDF text no longer suppresses OCR of an otherwise scanned PDF.- Previously preserved images/scanned PDFs can be reprocessed without re-uploading originals.

## Intelligence UI

The Intelligence page now provides:
- end-to-end OCR verification status;
- pending OCR record count;
- **Run OCR self-test**;
- **Reprocess pending scans**;

- **Install / repair selected processors**, with OCR as the default repair profile.
The bundled OCR test assets are raster-only fixtures and are included in the signed distribution manifest.
