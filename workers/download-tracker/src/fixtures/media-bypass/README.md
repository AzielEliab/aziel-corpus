# media-bypass fixtures (CORPUS-INTAKE-SAFETY-1.0 (b), AZBot review #185)

Benign, synthetic inputs only. Every image here is a 2x2 plain white image made with
PIL (or a header-only stub); there is no real photograph or depiction of anything.
Each file reproduces one way media could slip past the floor: PDF `#xx` names and
comments, image magic after a text prefix (TIFF, BMP, ICO, JPEG DHT-first), padded or
spaced base64, hex, Ascii85, base64 of zlib, UTF-16 SVG, and DOCX with appended data,
base64 in customXml, or a PNG in a `.dat` part. `clean2.docx` and `nclean2.docx` are
plain-text controls that must keep passing.
