"""Catalog of Aziel Eliab works. Local index, not a private-file search engine."""

from __future__ import annotations

import json
from copy import deepcopy
from importlib.resources import files
from pathlib import Path
from typing import Any

ENGINE_VERSION = "0.1.0"
SPEC_STRING = "aziel-corpus-v0"
LIMITATION = (
    "THIS IS: a public library index of Aziel Eliab software plus a counted "
    "download of the printed 468-page corpus PDF and the library package. "
    "THIS IS NOT: a search engine of private files; Zenodo; a new Lock engine; "
    "Horton; Revealer. GodLock is a product name in the corpus. Author Aziel Eliab only."
)
BANNED_IDENTITY = (
    "Collin Horton",
    "Jack Altman",
    "Aziel the Revealer of the Sealed",
    "GodLock.AZ",
)

_DATA = files("aziel_corpus") / "data" / "works.json"


def _as_doc(obj: Any) -> dict[str, Any]:
    if isinstance(obj, dict) and "works" in obj:
        works = obj.get("works") or []
        if not isinstance(works, list):
            raise ValueError("works must be a list")
        doc = deepcopy(obj)
        doc["works"] = list(works)
        doc.setdefault("author", "Aziel Eliab")
        doc.setdefault("title", "Aziel Corpus Library")
        doc.setdefault("license", "Apache-2.0")
        doc.setdefault("limitation", LIMITATION)
        doc["count"] = len(doc["works"])
        return doc
    if isinstance(obj, list):
        return {
            "ok": True,
            "author": "Aziel Eliab",
            "title": "Aziel Corpus Library",
            "license": "Apache-2.0",
            "limitation": LIMITATION,
            "count": len(obj),
            "works": list(obj),
        }
    raise ValueError("JSON must be a works document or a list of works")


def load_works(path: str | Path | None = None) -> dict[str, Any]:
    if path is None:
        raw = _DATA.read_text(encoding="utf-8")
    else:
        raw = Path(path).read_text(encoding="utf-8")
    return _as_doc(json.loads(raw))


def search_works(q: str, doc: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    source = doc if doc is not None else load_works()
    works = list(source.get("works") or [])
    needle = (q or "").strip().lower()
    if not needle:
        return works
    hits: list[dict[str, Any]] = []
    fields = ("slug", "name", "one_line", "banner", "kind", "github", "worker")
    for work in works:
        hay = " ".join(str(work.get(k) or "") for k in fields).lower()
        if needle in hay:
            hits.append(work)
    return hits


def export_works(doc: dict[str, Any] | None = None) -> dict[str, Any]:
    source = deepcopy(doc) if doc is not None else load_works()
    source.setdefault("author", "Aziel Eliab")
    source.setdefault("limitation", LIMITATION)
    source["count"] = len(source.get("works") or [])
    return source


def import_works(payload: Any) -> dict[str, Any]:
    if isinstance(payload, (str, Path)):
        raw = Path(payload).read_text(encoding="utf-8")
        payload = json.loads(raw)
    return _as_doc(payload)


def identity_ok(text: str) -> bool:
    lower = text.lower()
    for banned in BANNED_IDENTITY:
        if banned.lower() in lower:
            return False
    return "aziel eliab" in lower
