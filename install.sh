#!/usr/bin/env bash
# Aziel Digital Library v2.7.0 counted zip install.
set -euo pipefail
HOST="${AZIEL_LIBRARY_HOST:-https://www.azielcorpuslibrary.net}"
FALLBACK="https://aziel-corpus-download-tracker.vibelock.workers.dev"
ASSET="aziel-digital-library-2.6.2.zip"
WORKDIR="${AZIEL_LIBRARY_HOME:-$HOME/aziel-digital-library}"
mkdir -p "$WORKDIR"
cd "$WORKDIR"
echo "Downloading counted zip from ${HOST}/download (User-Agent Mozilla/5.0)…"
if ! curl -fsSL -A 'Mozilla/5.0' "${HOST}/download?asset=${ASSET}" -o "${ASSET}"; then
  echo "Canonical host failed; trying workers.dev fallback…"
  HOST="$FALLBACK"
  curl -fsSL -A 'Mozilla/5.0' "${HOST}/download?asset=${ASSET}" -o "${ASSET}"
fi
python3 -m zipfile -e "${ASSET}" .
DIR="$(find . -maxdepth 1 -type d -name 'aziel-digital-library-*' | head -n 1)"
if [ -n "${DIR}" ]; then
  cd "${DIR}"
fi
echo "Installed Aziel Digital Library v2.7.0."
echo "Run:  python3 aziel_launcher.py"
echo "Then open http://127.0.0.1:8765  (local MASTER)"
echo "Aziel Digital Library. Author Aziel Eliab. Not a 26-card index."
