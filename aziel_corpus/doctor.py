"""Self-check for Aziel Corpus Library. No network, no telemetry."""

from __future__ import annotations

import json
from typing import Callable

from aziel_corpus import __version__
from aziel_corpus.catalog import (
    BANNED_IDENTITY,
    ENGINE_VERSION,
    LIMITATION,
    SPEC_STRING,
    export_works,
    identity_ok,
    import_works,
    load_works,
    search_works,
)
from aziel_corpus.ui import LOOPBACK, make_server

Check = tuple[str, bool, str]


def _ok(name: str, detail: str = "") -> Check:
    return name, True, detail


def _fail(name: str, detail: str) -> Check:
    return name, False, detail


def _check_version() -> Check:
    if __version__ == ENGINE_VERSION == "0.1.0":
        return _ok("version", __version__)
    return _fail("version", f"{__version__} vs engine {ENGINE_VERSION}")


def _check_spec() -> Check:
    if SPEC_STRING == "aziel-corpus-v0":
        return _ok("spec", SPEC_STRING)
    return _fail("spec", SPEC_STRING)


def _check_catalog_count() -> Check:
    doc = load_works()
    works = doc.get("works") or []
    if len(works) == 26 and doc.get("count") == 26:
        slugs = [w.get("slug") for w in works]
        if "aziel-corpus" in slugs and "aziel-corpus-pdf" in slugs:
            return _ok("catalog", "26 works")
        return _fail("catalog slugs", str(slugs[:4]))
    return _fail("catalog count", str(len(works)))


def _check_search() -> Check:
    hits = search_works("vibelock")
    if not hits:
        return _fail("search", "no vibelock")
    empty = search_works("")
    if len(empty) != 26:
        return _fail("search empty", str(len(empty)))
    return _ok("search", f"{len(hits)} hit(s) for vibelock")


def _check_import_export() -> Check:
    original = load_works()
    blob = export_works(original)
    roundtrip = import_works(blob)
    if roundtrip["count"] != original["count"]:
        return _fail("import/export count", str(roundtrip["count"]))
    extra = import_works([{"slug": "demo", "name": "Demo Work", "one_line": "format proof"}])
    if extra["count"] != 1:
        return _fail("import list", str(extra["count"]))
    return _ok("import/export", "roundtrip + list import")


def _check_loopback() -> Check:
    try:
        make_server("0.0.0.0", 9)
    except ValueError as exc:
        if "loopback" in str(exc).lower() and "127.0.0.1" in LOOPBACK:
            return _ok("loopback", "rejects 0.0.0.0")
        return _fail("loopback", str(exc))
    return _fail("loopback", "accepted 0.0.0.0")


def _check_identity() -> Check:
    if not identity_ok(LIMITATION):
        return _fail("identity limitation", "missing Aziel Eliab or banned name")
    for banned in BANNED_IDENTITY:
        if banned.lower() in LIMITATION.lower() and banned not in {"Horton", "Revealer"}:
            # LIMITATION mentions Horton/Revealer as THIS IS NOT — that is allowed.
            pass
    if "aziel eliab" not in LIMITATION.lower():
        return _fail("identity", "author missing")
    return _ok("identity", "Aziel Eliab only")


def _check_not_zenodo_engine() -> Check:
    low = LIMITATION.lower()
    if "not" in low and "zenodo" in low and "lock engine" in low:
        return _ok("honest-scope", "not Zenodo; not a new Lock engine")
    return _fail("honest-scope", LIMITATION[:80])


CHECKS: tuple[Callable[[], Check], ...] = (
    _check_version,
    _check_spec,
    _check_catalog_count,
    _check_search,
    _check_import_export,
    _check_loopback,
    _check_identity,
    _check_not_zenodo_engine,
)


def run_doctor(*, as_json: bool = False) -> int:
    results = []
    failed = 0
    for fn in CHECKS:
        name, ok, detail = fn()
        results.append({"name": name, "ok": ok, "detail": detail})
        if not ok:
            failed += 1
        mark = "ok" if ok else "FAIL"
        if not as_json:
            print(f"[{mark}] {name}" + (f" — {detail}" if detail else ""))
    payload = {
        "ok": failed == 0,
        "failed": failed,
        "checks": results,
        "version": __version__,
        "spec": SPEC_STRING,
        "limitation": LIMITATION,
        "network": False,
        "telemetry": False,
        "author": "Aziel Eliab",
    }
    if as_json:
        print(json.dumps(payload, indent=2))
    else:
        print("limitation:", LIMITATION)
        print("doctor", "passed" if failed == 0 else "failed")
    return 0 if failed == 0 else 1
