#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null 2>&1; then echo "Python 3.11+ is required. Attempting OS installation..." if command -v brew >/dev/null 2>&1; then brew install python; elif command -v apt-get >/dev/null 2>&1; then sudo apt-get update && sudo apt-get install -y python3; elif command -v dnf >/dev/null 2>&1; then sudo dnf install -y python3; elif command -v pacman >/dev/null 2>&1; then sudo pacman -S --needed --noconfirm python; else echo "No supported package manager found."; exit 2; fi
fi
export AZIEL_RUNTIME_HOME="${AZIEL_RUNTIME_HOME:-$(pwd)/runtime_assets}"
python3 -m aziel_library.bootstrap --profile ocr --auto
python3 -m unittest discover -s tests -v
