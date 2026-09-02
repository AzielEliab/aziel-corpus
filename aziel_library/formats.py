from __future__ import annotations
import hashlib, hmac, json, os, zipfile
from dataclasses import dataclass
from pathlib import Path

from typing import Any
AZM_MAGIC = "AZIEL_MODEL_PACKAGE_V1"

AZK_MAGIC = "AZIEL_KNOWLEDGE_KIT_V1"
def canonical(obj: Any) -> bytes:

    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
def sha256_bytes(data: bytes) -> str:

    return hashlib.sha256(data).hexdigest()
def sha256_file(path: str | Path) -> str:
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)

    return h.hexdigest()
@dataclass
class PackageVerification:
    ok: bool
    kind: str
    package_id: str
    errors: list[str]

    manifest: dict
class AzielPackage:

    """
    Stable ZIP container with canonical manifest and payload hashes.
    The format is intentionally tiny so future runtimes can reimplement it
    without depending on this Python package."""


    @staticmethod
    def build(path: str | Path, *, magic: str, package_id: str, package_type: str,version: str, payloads: dict[str, bytes], metadata: dict | None = None,hmac_key: bytes | None = None) -> Path:
        path = Path(path)
        payload_meta = {name: {"sha256": sha256_bytes(data), "bytes": len(data)}
                        for name, data in sorted(payloads.items())}
        manifest = {"magic": magic,"format_version": 1,"package_id": package_id,"package_type": package_type,"version": version,"payloads": payload_meta,"metadata": metadata or {},}
        manifest_bytes = canonical(manifest)
        envelope = {"manifest_sha256": sha256_bytes(manifest_bytes),"hmac_sha256": hmac.new(hmac_key, manifest_bytes, hashlib.sha256).hexdigest() if hmac_key else None,}
        path.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr("manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False))
            z.writestr("integrity.json", json.dumps(envelope, indent=2))
            for name, data in sorted(payloads.items()):
                z.writestr("payload/" + name, data)

        return path
    @staticmethod
    def verify(path: str | Path, hmac_key: bytes | None = None) -> PackageVerification:
        errors: list[str] = []
        manifest: dict = {}
        kind = "UNKNOWN"
        package_id = ""
        try:
            with zipfile.ZipFile(path) as z:
                manifest = json.loads(z.read("manifest.json"))
                env = json.loads(z.read("integrity.json"))
                kind = manifest.get("magic", "UNKNOWN")
                package_id = manifest.get("package_id", "")
                mb = canonical(manifest)
                if sha256_bytes(mb) != env.get("manifest_sha256"):
                    errors.append("manifest hash mismatch")
                if hmac_key and hmac.new(hmac_key, mb, hashlib.sha256).hexdigest() != env.get("hmac_sha256"):
                    errors.append("manifest HMAC mismatch")
                for name, meta in manifest.get("payloads", {}).items():
                    try:

                        data = z.read("payload/" + name)
                    except KeyError:
                        errors.append(f"missing payload: {name}")
                        continue
                    if sha256_bytes(data) != meta.get("sha256"):
                        errors.append(f"payload hash mismatch: {name}")
                    if len(data) != meta.get("bytes"):
                        errors.append(f"payload size mismatch: {name}")
        except Exception as e:
            errors.append(f"package read error: {type(e).__name__}: {e}")

        return PackageVerification(not errors, kind, package_id, errors, manifest)
    @staticmethod
    def read_json_payload(path: str | Path, name: str) -> dict | list:
        with zipfile.ZipFile(path) as z:

            return json.loads(z.read("payload/" + name))
class ModelPackage:
    @staticmethod
    def build(path: str | Path, model_id: str, model_type: str, version: str,model_data: dict, metadata: dict | None = None, hmac_key: bytes | None = None) -> Path:
        return AzielPackage.build(path, magic=AZM_MAGIC, package_id=model_id,
                                  package_type=model_type, version=version,
                                  payloads={"model.json": canonical(model_data)},

                                  metadata=metadata, hmac_key=hmac_key)
class KnowledgeKit:
    @staticmethod
    def build(path: str | Path, kit_id: str, kit_type: str, version: str,data: dict, metadata: dict | None = None, hmac_key: bytes | None = None) -> Path:
        return AzielPackage.build(path, magic=AZK_MAGIC, package_id=kit_id,
                                  package_type=kit_type, version=version,
                                  payloads={"kit.json": canonical(data)},
                                  metadata=metadata, hmac_key=hmac_key)
