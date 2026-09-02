#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"
PY=""
for candidate in python3.14 python3.13 python3.12 python3.11 python3; do if command -v "$candidate" >/dev/null 2>&1; then
    if "$candidate" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)' >/dev/null 2>&1; then
      PY="$candidate"
      break
    fi fi

done
if [ -z "$PY" ]; then echo "Python 3.11+ was not found." if command -v brew >/dev/null 2>&1; then
    echo "Attempting Python installation with Homebrew..."
    brew install python@3.12 || true elif command -v apt-get >/dev/null 2>&1; then
    echo "Attempting Python installation with apt..."
    sudo apt-get update && sudo apt-get install -y python3 || true fi for candidate in python3.12 python3.11 python3; do
    if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)' >/dev/null 2>&1; then
      PY="$candidate"; break
    fi done

fi
if [ -z "$PY" ]; then echo "Install Python 3.11 or newer and run this launcher again." exit 2

fi
export AZIEL_LIBRARY_PATH="${AZIEL_LIBRARY_PATH:-$(pwd)/aziel_library_data}"
export AZIEL_RUNTIME_HOME="${AZIEL_RUNTIME_HOME:-$(pwd)/runtime_assets}"
exec "$PY" aziel_launcher.py
