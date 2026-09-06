"""Installer update check against live aziel-runtime /v1/update/check.

Author: Aziel Eliab only.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request

RUNTIME_ORIGIN = os.environ.get(
    "AZIEL_RUNTIME_HOST", "https://aziel-runtime.vibelock.workers.dev"
).rstrip("/")
LIBRARY_HOST = os.environ.get(
    "AZIEL_LIBRARY_HOST", "https://www.azielcorpuslibrary.net"
).rstrip("/")
UA = "Mozilla/5.0 AzielDigitalLibrary"
DEFAULT_SLUG = "aziel-corpus"


def _get_json(url: str, timeout: float = 4.0) -> dict | None:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": UA, "Accept": "application/json"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            if getattr(res, "status", 200) >= 400:
                return None
            raw = res.read(65536)
        doc = json.loads(raw.decode("utf-8", "replace"))
        if not isinstance(doc, dict) or doc.get("error"):
            return None
        return doc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError, ValueError):
        return None


def check_update(slug: str = DEFAULT_SLUG, version: str = "2.7.0") -> dict:
    """Prefer runtime /v1/update/check. Fall back to the library Worker, then local."""
    qs = urllib.parse.urlencode({"slug": slug, "version": version})
    runtime_url = f"{RUNTIME_ORIGIN}/v1/update/check?{qs}"
    library_url = f"{LIBRARY_HOST}/v1/update/check?{qs}"
    doc = _get_json(runtime_url) or _get_json(library_url)
    if doc:
        if "source" not in doc:
            doc = dict(doc)
            doc["source"] = "runtime:/v1/update/check"
        return doc
    return {
        "ok": True,
        "slug": slug,
        "name": "Aziel Digital Library",
        "current": version,
        "latest": version,
        "update_available": False,
        "source": "local",
        "runtime": runtime_url,
        "author": "Aziel Eliab",
    }


def report_update(version: str, slug: str = DEFAULT_SLUG) -> str:
    doc = check_update(slug=slug, version=version)
    latest = str(doc.get("latest") or version)
    if doc.get("update_available"):
        return (
            f"Update available: Aziel Digital Library {latest} "
            f"(this copy is {version}). See {LIBRARY_HOST}/download"
        )
    return f"Update check ({doc.get('source') or 'local'}): current {version}, latest {latest}."
