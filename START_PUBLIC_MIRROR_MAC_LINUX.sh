#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
MIRROR="${1:-$(pwd)/aziel_public_mirror}"
PYTHON="${PYTHON:-python3}"
exec "$PYTHON" aziel_launcher.py --mode mirror --vault "$MIRROR" --host 0.0.0.0 --no-browser
