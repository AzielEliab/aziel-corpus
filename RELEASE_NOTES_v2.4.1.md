# Release Notes — v2.4.1 Full UI / Upload Redline

This maintenance release redlines v2.4.0 for browser reliability, large-media ingestion, display safety, and dead-control behavior.
## Fixed

- Record URLs for missing IDs now return HTTP 404 instead of crashing a request thread.- Unknown export formats now return HTTP 404 instead of silently returning a PDF.- Browser multipart ingestion is streamed to temporary files in bounded chunks rather than buffering the entire request in RAM. This is required for large audio/video corpora.- Browser uploads preserve the original user filename instead of indexing the temporary upload filename.- Invalid/malformed uploads and invalid AZM/AZK packages return clean 400 responses instead of dropped connections.- Multipart parsing now uses a real email policy object under Python 3.13.- Search snippets now escape corpus-supplied HTML before applying trusted hit highlighting.- Fixed a rendered JavaScript syntax error in Temporal Map tooltips that could prevent all map controls from initializing.- Historical-layer upload cleanup and error handling were normalized.
## QA additions
- New browser QA suite covers primary routes, exports, missing records, malformed uploads, invalid packages, large streaming uploads, unsafe document markup, filename escaping, manual-event validation, map control presence, and offline assets.- Rendered Temporal Map JavaScript is syntax-checked with Node during release certification.- Shell launch/install scripts are syntax checked and CLI/bootstrap startup is exercised.
