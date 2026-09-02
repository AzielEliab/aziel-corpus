# Aziel Digital Library v2.5.0 — Portable Application Release

This release turns the certified v2.4.3 corpus engine into a hardened portable application distribution.

## Launcher changes

- New `START_AZIEL_WINDOWS.bat` one-click launcher.- New `START_AZIEL_MAC_LINUX.sh` launcher.- Windows launcher detects Python 3.11+ and can attempt a WinGet Python 3.12 installation when Python is missing.- Explicit default vault path: `./aziel_library_data`.- Explicit runtime cache path: `./runtime_assets`.- Distribution SHA-256 verification occurs before the library starts.- Optional OCR/media/speech bootstrap is attempted once on first run and logged locally.- Existing Aziel server detection opens the already-running instance instead of failing with a port collision.- If port 8765 is occupied by another service, the launcher selects the next free port through 8785.- Launch receipts are written to `runtime_assets/last_launch.json`.- `--repair-runtime`, `--skip-bootstrap`, `--no-browser`, `--vault`, `--host`, and `--port` are available through `aziel_launcher.py`.

## Data behavior
The launcher never stores the corpus inside the source-code package accidentally. Unless `AZIEL_LIBRARY_PATH` or `--vault` is supplied, all mutable library data goes under `aziel_library_data/`.
