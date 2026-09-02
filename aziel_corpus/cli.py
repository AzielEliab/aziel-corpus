"""Command-line interface for Aziel Corpus Library.

    aziel-corpus ui
    aziel-corpus doctor
    aziel-corpus search QUERY
    aziel-corpus works
    aziel-corpus export FILE.json
    aziel-corpus version
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Sequence

from aziel_corpus import __version__
from aziel_corpus.catalog import LIMITATION, export_works, load_works, search_works


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="aziel-corpus",
        description=(
            "Aziel Corpus Library — public library of Aziel Eliab software (2026). "
            "Local UI: `aziel-corpus ui` at http://127.0.0.1:8890. "
            "Not Zenodo. Not a new Lock engine."
        ),
        epilog=LIMITATION,
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_ui = sub.add_parser("ui", help="Serve the local UI on 127.0.0.1:8890 (loopback only).")
    p_ui.add_argument("--host", default="127.0.0.1", help="Loopback host (default 127.0.0.1).")
    p_ui.add_argument("--port", type=int, default=8890, help="Port (default 8890).")

    p_doc = sub.add_parser("doctor", help="Self-check: catalog, search, loopback, identity.")
    p_doc.add_argument("--json", action="store_true", dest="as_json", help="Print doctor results as JSON.")

    p_search = sub.add_parser("search", help="Search the public works index.")
    p_search.add_argument("query", nargs="?", default="", help="Case-insensitive substring.")

    sub.add_parser("works", help="Print the full works document as JSON.")

    p_export = sub.add_parser("export", help="Write the works list JSON to a file (or stdout).")
    p_export.add_argument("path", nargs="?", default="-", help="Output path, or - for stdout.")

    sub.add_parser("version", help="Print package version.")
    return parser


def _print_json(obj: object) -> None:
    sys.stdout.write(json.dumps(obj, indent=2, ensure_ascii=False) + "\n")


def main(argv: Sequence[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.cmd == "version":
        print(f"aziel-corpus {__version__}")
        return 0

    if args.cmd == "doctor":
        from aziel_corpus.doctor import run_doctor

        return run_doctor(as_json=args.as_json)

    if args.cmd == "ui":
        from aziel_corpus.ui import serve

        serve(host=args.host, port=args.port)
        return 0

    if args.cmd == "works":
        _print_json(load_works())
        return 0

    if args.cmd == "search":
        hits = search_works(args.query)
        _print_json({"ok": True, "q": args.query, "count": len(hits), "works": hits, "limitation": LIMITATION})
        return 0

    if args.cmd == "export":
        doc = export_works()
        text = json.dumps(doc, indent=2, ensure_ascii=False) + "\n"
        if args.path in {"", "-"}:
            sys.stdout.write(text)
        else:
            from pathlib import Path

            Path(args.path).write_text(text, encoding="utf-8")
            print(f"wrote {args.path}")
        return 0

    parser.error(f"unknown command {args.cmd}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
