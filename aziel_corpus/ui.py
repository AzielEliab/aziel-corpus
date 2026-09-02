"""Local Aziel Corpus Library UI. Bind 127.0.0.1:8890 only.

Search works, cards, Import JSON file, Export JSON of works list, doctor.
No CDN, no telemetry. Loopback only.
"""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from importlib.resources import files
from urllib.parse import parse_qs, urlparse

from aziel_corpus import __version__
from aziel_corpus.catalog import LIMITATION, export_works, import_works, load_works, search_works

LOOPBACK = frozenset({"127.0.0.1", "localhost", "::1"})
WEB = files("aziel_corpus") / "web"
MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
}
MAX_BODY_BYTES = 8 * 1024 * 1024

_STATE: dict[str, object] = {"doc": None}


def _doc() -> dict:
    current = _STATE.get("doc")
    if not isinstance(current, dict):
        current = load_works()
        _STATE["doc"] = current
    return current


def _web_bytes(name: str) -> bytes:
    return (WEB / name).read_bytes()


class Handler(BaseHTTPRequestHandler):
    server_version = f"AzielCorpus/{__version__}"

    def log_message(self, fmt: str, *args: object) -> None:
        return

    def _send(self, status: int, body: bytes, content_type: str, filename: str | None = None) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if filename:
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status: int, obj: object) -> None:
        body = json.dumps(obj, indent=2, ensure_ascii=False).encode("utf-8")
        self._send(status, body, "application/json; charset=utf-8")

    def _read_body(self) -> bytes | None:
        try:
            length = int(self.headers.get("Content-Length") or "0")
        except ValueError:
            self._json(400, {"error": "invalid Content-Length"})
            return None
        if length < 0:
            self._json(400, {"error": "invalid Content-Length"})
            return None
        if length > MAX_BODY_BYTES:
            self._json(413, {"error": "payload too large", "limit": MAX_BODY_BYTES, "limitation": LIMITATION})
            return None
        return self.rfile.read(length) if length else b"{}"

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        if path in {"/", "/index.html"}:
            self._send(200, _web_bytes("index.html"), MIME[".html"])
            return
        if path == "/style.css":
            self._send(200, _web_bytes("style.css"), MIME[".css"])
            return
        if path == "/app.js":
            self._send(200, _web_bytes("app.js"), MIME[".js"])
            return
        if path == "/api/health":
            doc = _doc()
            self._json(
                200,
                {
                    "ok": True,
                    "version": __version__,
                    "loopback": True,
                    "telemetry": False,
                    "author": "Aziel Eliab",
                    "works": doc.get("count"),
                    "limitation": LIMITATION,
                },
            )
            return
        if path == "/api/works":
            qs = parse_qs(parsed.query)
            q = (qs.get("q") or [""])[0]
            doc = _doc()
            hits = search_works(q, doc)
            self._json(
                200,
                {
                    "ok": True,
                    "q": q,
                    "count": len(hits),
                    "total": doc.get("count"),
                    "works": hits,
                    "limitation": LIMITATION,
                    "author": "Aziel Eliab",
                },
            )
            return
        if path == "/api/export":
            self._json(
                200,
                {
                    "filename": "aziel-corpus-works.json",
                    "document": export_works(_doc()),
                    "limitation": LIMITATION,
                },
            )
            return
        if path == "/api/doctor":
            from aziel_corpus.doctor import run_doctor
            import io
            from contextlib import redirect_stdout

            buf = io.StringIO()
            with redirect_stdout(buf):
                code = run_doctor(as_json=True)
            text = buf.getvalue()
            try:
                payload = json.loads(text)
            except json.JSONDecodeError:
                payload = {"ok": code == 0, "raw": text}
            payload["exit"] = code
            self._json(200, payload)
            return
        self._json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path not in {"/api/import", "/api/doctor", "/api/reset"}:
            self._json(404, {"error": "not found"})
            return
        raw = self._read_body()
        if raw is None:
            return
        if path == "/api/doctor":
            from aziel_corpus.doctor import run_doctor
            import io
            from contextlib import redirect_stdout

            buf = io.StringIO()
            with redirect_stdout(buf):
                code = run_doctor(as_json=True)
            text = buf.getvalue()
            try:
                payload = json.loads(text)
            except json.JSONDecodeError:
                payload = {"ok": code == 0, "raw": text}
            payload["exit"] = code
            self._json(200, payload)
            return
        if path == "/api/reset":
            _STATE["doc"] = load_works()
            doc = _doc()
            self._json(200, {"ok": True, "count": doc.get("count"), "works": doc.get("works"), "limitation": LIMITATION})
            return
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._json(400, {"error": "JSON body required"})
            return
        try:
            doc = import_works(payload)
        except (ValueError, TypeError) as exc:
            self._json(400, {"error": str(exc), "limitation": LIMITATION})
            return
        _STATE["doc"] = doc
        self._json(
            200,
            {
                "ok": True,
                "count": doc.get("count"),
                "works": doc.get("works"),
                "limitation": LIMITATION,
                "author": "Aziel Eliab",
            },
        )


def make_server(host: str = "127.0.0.1", port: int = 8890) -> ThreadingHTTPServer:
    if host not in LOOPBACK:
        raise ValueError("Aziel Corpus Library UI binds loopback only (127.0.0.1)")
    return ThreadingHTTPServer((host, port), Handler)


def serve(host: str = "127.0.0.1", port: int = 8890) -> None:
    httpd = make_server(host, port)
    bound_host, bound_port = httpd.server_address[:2]
    print(
        f"Aziel Corpus Library UI http://{bound_host}:{bound_port} "
        "(loopback only; not Zenodo; not a new Lock engine; author Aziel Eliab)"
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
    finally:
        httpd.server_close()
