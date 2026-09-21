#!/usr/bin/env python3
"""One-shot TRIAD V3 recalibrate for a local Aziel Library vault.

Walks every stored paper against content SHA-256, writes triad_raw / cycle mean,
freezes to hash, no collection offset. Skips already-V3 frozen papers unless --force.

Live Worker (post-merge) does not use this script. Trigger the hosted job:

  GET https://www.azielcorpuslibrary.net/v1/recalibrate-all
  GET https://www.azielcorpuslibrary.net/v1/recalibrate-all?all=1
  Repeat until JSON done:true.
  Progress: GET https://www.azielcorpuslibrary.net/v1/recalibrate-all?status=1
  Alias: GET https://www.azielcorpuslibrary.net/v1/verify-backfill?recalibrate=1&all=1
  Remint even already-V3: add force=1.

Cron and request-path walks continue the same cursor after deploy.

N/A factors omit (applicable-only). Softwares / Live Nodes / SPORE untouched.
Author: Aziel Eliab.
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from aziel_library.core import AzielLibrary


def main():
    p = argparse.ArgumentParser(prog="recalibrate_all", description="TRIAD V3 remint of every stored paper.")
    p.add_argument("--vault", default="./aziel_library_data")
    p.add_argument("--force", action="store_true", help="Remint even already-V3 frozen scores")
    p.add_argument("--record-id", default="", help="One AZDOC- id")
    a = p.parse_args()
    report = AzielLibrary(a.vault).recalibrate_all(force=a.force, record_id=a.record_id or None)
    print(json.dumps(report, indent=2, default=str))
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
