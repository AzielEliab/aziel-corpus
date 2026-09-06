#!/usr/bin/env bash
# Aziel Digital Library v2.7.0 counted zip install.
set -euo pipefail
HOST="${AZIEL_LIBRARY_HOST:-https://www.azielcorpuslibrary.net}"
RUNTIME="${AZIEL_RUNTIME_HOST:-https://aziel-runtime.vibelock.workers.dev}"
FALLBACK="https://aziel-corpus-download-tracker.vibelock.workers.dev"
ASSET="aziel-digital-library-2.7.0.zip"
LEGACY="aziel-digital-library-2.6.2.zip"
WORKDIR="${AZIEL_LIBRARY_HOME:-$HOME/aziel-digital-library}"
mkdir -p "$WORKDIR"
cd "$WORKDIR"
echo "Checking updates via ${RUNTIME}/v1/update/check (User-Agent Mozilla/5.0)…"
UPDATE_JSON="$(curl -fsSL -A 'Mozilla/5.0' "${RUNTIME}/v1/update/check?slug=aziel-corpus&version=2.7.0" || true)"
if [ -z "${UPDATE_JSON}" ]; then
  UPDATE_JSON="$(curl -fsSL -A 'Mozilla/5.0' "${HOST}/v1/update/check?slug=aziel-corpus&version=2.7.0" || true)"
fi
if [ -n "${UPDATE_JSON}" ]; then
  echo "${UPDATE_JSON}"
fi
echo "Downloading counted zip from ${HOST}/download (User-Agent Mozilla/5.0)…"
if ! curl -fsSL -A 'Mozilla/5.0' "${HOST}/download?asset=${ASSET}" -o "${ASSET}"; then
  echo "Canonical host failed; trying workers.dev fallback…"
  HOST="$FALLBACK"
  if ! curl -fsSL -A 'Mozilla/5.0' "${HOST}/download?asset=${ASSET}" -o "${ASSET}"; then
    ASSET="$LEGACY"
    curl -fsSL -A 'Mozilla/5.0' "${HOST}/download?asset=${ASSET}" -o "${ASSET}"
  fi
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
