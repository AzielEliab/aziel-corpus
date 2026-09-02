"""Local UI: loopback only, no CDN, search + import/export."""

from __future__ import annotations

import json
import threading
import urllib.request

import pytest

from aziel_corpus.ui import LOOPBACK, make_server


def test_ui_rejects_non_loopback() -> None:
    with pytest.raises(ValueError, match="loopback"):
        make_server("0.0.0.0", 9)
    assert "127.0.0.1" in LOOPBACK


def _serve():
    httpd = make_server("127.0.0.1", 0)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


def test_ui_get_root_honest_scope() -> None:
    httpd = _serve()
    port = httpd.server_address[1]
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=5) as resp:
            html = resp.read().decode("utf-8")
        assert "Aziel Corpus Library" in html
        assert "THIS IS" in html
        assert "THIS IS NOT" in html
        assert "Zenodo" in html
        assert "cdnjs" not in html.lower()
        assert "unpkg" not in html.lower()
        assert "jsdelivr" not in html.lower()
        assert "GodLock.AZ" not in html
        assert "Collin Horton" not in html
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/style.css", timeout=3) as resp:
            css = resp.read().decode("utf-8")
        assert "c9a227" in css
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=3) as resp:
            health = json.loads(resp.read().decode("utf-8"))
        assert health["ok"] is True
        assert health["loopback"] is True
        assert health["telemetry"] is False
        assert health["author"] == "Aziel Eliab"
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/works?q=vibelock", timeout=3) as resp:
            works = json.loads(resp.read().decode("utf-8"))
        assert works["count"] >= 1
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/api/import",
            data=json.dumps([{"slug": "demo", "name": "Demo", "one_line": "proof"}]).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            imported = json.loads(resp.read().decode("utf-8"))
        assert imported["count"] == 1
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/export", timeout=3) as resp:
            exported = json.loads(resp.read().decode("utf-8"))
        assert exported["document"]["count"] == 1
    finally:
        httpd.shutdown()
        httpd.server_close()
