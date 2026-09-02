#!/usr/bin/env bash
# Aziel Corpus Library one-click install. Counted download via the Worker.
set -euo pipefail
HOST="${AZIEL_CORPUS_HOST:-https://www.azielcorpuslibrary.net}"
FALLBACK="https://aziel-corpus-download-tracker.vibelock.workers.dev"
ASSET="aziel-corpus-0.1.0.tar.gz"
WORKDIR="${AZIEL_CORPUS_HOME:-$HOME/aziel-corpus}"
mkdir -p "$WORKDIR"
cd "$WORKDIR"
echo "Downloading counted tarball from ${HOST}/download (User-Agent Mozilla/5.0)…"
if ! curl -fsSL -A 'Mozilla/5.0' "${HOST}/download?asset=${ASSET}" -o "${ASSET}"; then
  echo "Canonical host failed; trying workers.dev fallback…"
  HOST="$FALLBACK"
  curl -fsSL -A 'Mozilla/5.0' "${HOST}/download?asset=${ASSET}" -o "${ASSET}"
fi
tar -xzf "${ASSET}"
DIR="$(find . -maxdepth 1 -type d \( -name 'aziel_corpus-*' -o -name 'aziel-corpus-*' \) | head -n 1)"
if [ -n "${DIR}" ]; then
  cd "${DIR}"
fi
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -U pip
python -m pip install -e .
echo
echo "Installed Aziel Corpus Library."
echo "Run:  aziel-corpus ui"
echo "Then open http://127.0.0.1:8890  (loopback only)"
echo "Public library of Aziel Eliab software. Not Zenodo. Not a new Lock engine."
