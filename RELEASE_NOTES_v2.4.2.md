# Release Notes — v2.4.2 Full UI Contract Redline

This release is a second adversarial UI/functionality redline of v2.4.1.
## Changes

- Added a consistent in-app HTML error surface for 4xx/5xx failures.- Added explicit empty-state messaging for corpus search and intelligence packages.- Added optional processor readiness cards to the Intelligence page.- Added a wired browser action to install/repair OCR and speech processors through the existing bootstrap manager.- Hardened displayed package fields with HTML escaping.- Added automated UI contract tests that enumerate rendered form actions and JavaScript-only map buttons.- Added a mocked browser bootstrap integration test so the control is continuously verified without network access.- Bumped browser/runtime package version to 2.4.2.
## Certification
The release is certified only after fresh extraction, checksum verification, 13 executable tests with ResourceWarning promoted to error, Python compilation, launcher syntax checks, CLI startup checks, and rendered map JavaScript syntax validation.
