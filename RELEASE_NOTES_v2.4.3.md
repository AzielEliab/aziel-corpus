# Release Notes — v2.4.3 Final Reliability Redline

This release is a second adversarial QA pass over v2.4.2 focused on flawless day-to-day corpus operation.
## Fixes
- Added a fully wired, streamed preserved-original download route from each record page.- Original downloads no longer buffer large audio/video files into RAM.- Duplicate filenames uploaded in the same browser request preserve their true original filenames instead of temporary suffixes.- Multipart uploads isolate each file in its own temporary directory and sanitize Windows/POSIX path components.- Multipart boundary detection now requires an exact MIME boundary line, preventing boundary-like binary/text content 

from being truncated.- Successful and failed uploads clean both per-file and outer batch temporary directories.- Relationship targets on record pages are navigable.- Removed an unused empty temporary test artifact from the distribution.- Removed the javascript: history-back error link; error UI now has a deterministic Home route only.
## Certification
- 15 executable tests pass with Python warnings promoted to errors.- Large upload, duplicate-name upload, exact original retrieval, malformed multipart, XSS-safe search, package upload,map controls, historical geography, gazetteer, exports, CLI, and bootstrap paths tested.- Rendered Temporal Map JavaScript passes `node --check`.- Primary browser routes return HTTP 200 on a fresh vault.- Shell launch scripts pass syntax validation.- Internal SHA-256 distribution manifest is regenerated after all edits.
