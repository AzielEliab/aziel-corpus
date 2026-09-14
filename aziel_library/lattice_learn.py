"""Adaptive learning via the hashchain lattice.

Author: Aziel Eliab only.

Recollection and reasoning walk document_ledger (tip + prev-hash).
They do not use an opaque memory store or LLM-as-memory.

Law: HASHCHAIN-LATTICE-LEARN-1.0
- LEARN / POSSIBILITY / POISON_LEARN / MAP_PIN append; never mutate prior stamps.
- Posterior ≠ truth. Possibility ≠ probability ≠ triad ≠ ZionPattern.
- Scores are not guilt verdicts / courtroom proof.
- Poison-learn stores hash + feature receipt only (no poison body).
"""
from __future__ import annotations
import hashlib, json, math, re
from pathlib import Path
from .review import clamp01, tokenize

HASHCHAIN_LEARN_LAW = "adaptive learning via hashchain lattice for recollection and reasoning"
LEARN_SCHEMA = "aziel.learn.v1"
POSSIBILITY_SCHEMA = "aziel.possibility.v1"
POISON_LEARN_SCHEMA = "aziel.poison-learn.v1"
MAP_PIN_SCHEMA = "aziel.map-pin.v1"
POISON_LEARN_RECORD_ID = "AZDOC-POISONLEARN"
POSSIBILITY_KIND = "HEURISTIC"
POSSIBILITY_NOTE = (
    "possibility ≠ probability ≠ triad ≠ ZionPattern. HEURISTIC density over lattice pin receipts. "
    "Not Beta-Bernoulli. Not a guilt verdict. Not courtroom proof. Posterior ≠ truth."
)
LEARN_LIMITATION = (
    "Adaptive learning appends LEARN stamps to the hashchain lattice. Recollection is tip + depth / "
    "prev-hash verify (fail closed on break). Reasoning walks lattice receipts + time×geo anchors. "
    "History is never rewritten. Author Aziel Eliab."
)
MAP4D_CITE = {
    "spec": "4DM-WP-1.0",
    "cite": "https://github.com/AzielEliab/4dmap",
    "home": "https://4dmap-download-tracker.vibelock.workers.dev/",
    "axes": {
        "T": "clock / paper event_date",
        "Delta": "interval between pins",
        "Gamma": "trajectory across pins",
        "Pi": "pattern support / contradiction density",
    },
    "note": "Inspection frame after AZPIPE, not an extra door. Not a live ICANN mesh DNS. Not GIS 4D. Receipts are not truth.",
}
LEARN_ACTIONS = {
    "LEARN", "POISON_LEARN", "MAP_PIN", "MAP_PIN_REFUSED", "POSSIBILITY_SCORE",
    "LATTICE_ANCHOR", "REVIEW_SCORE", "POISON_QUARANTINE", "PEER_REVIEW", "INGEST", "STRUCTURE_VERIFY",
}
TRIGGER_RE = re.compile(
    r"\b(officials?|authorities|narrative|disinformation|misinformation|debunked|sheeple|hoax|fraud|fake|scam|cover-?up|shill|liar|lies?|wake|trust|settled|conspiracy)\b",
    re.I,
)

def round4(n):
    return round(clamp01(n), 4)

def sha256hex(value):
    if isinstance(value, (bytes, bytearray)):
        return hashlib.sha256(value).hexdigest()
    return hashlib.sha256(str(value).encode("utf-8")).hexdigest()

def feature_hash(parts):
    return sha256hex(json.dumps(parts, sort_keys=True, separators=(",", ":")))

def poison_feature_receipt(*, title="", body="", filename="", sha256="", markers=None):
    markers = list(markers or [])
    tokens = tokenize(title + " " + filename)
    triggers = [m.group(0).lower() for m in TRIGGER_RE.finditer((title or "") + "\n" + (filename or ""))]
    token_hashes = []
    seen = set()
    for t in triggers + [x for x in tokens if len(x) >= 4]:
        if t in seen:
            continue
        seen.add(t)
        token_hashes.append(sha256hex(t))
        if len(token_hashes) >= 24:
            break
    feature_id = feature_hash({"schema": POISON_LEARN_SCHEMA, "markers": sorted(markers), "token_hashes": sorted(token_hashes)})
    return {
        "schema": POISON_LEARN_SCHEMA,
        "feature_id": feature_id,
        "content_sha256": sha256 or None,
        "markers": markers,
        "token_hashes": token_hashes,
        "body_retained": False,
        "note": "Hash + feature receipt only. Poison payload/body is not stored on this stamp.",
        "author": "Aziel Eliab",
    }

def match_learned_poison(features, learned=None):
    incoming = features or {}
    rows = list(learned or [])
    if incoming.get("content_sha256") and any(x.get("content_sha256") == incoming["content_sha256"] for x in rows):
        return {"match": True, "reason": "content_sha256", "feature_id": incoming.get("feature_id")}
    if incoming.get("feature_id") and any(x.get("feature_id") == incoming["feature_id"] for x in rows):
        return {"match": True, "reason": "feature_id", "feature_id": incoming.get("feature_id")}
    A = set(incoming.get("token_hashes") or [])
    M = set(incoming.get("markers") or [])
    for row in rows:
        B = set(row.get("token_hashes") or [])
        if not A or not B:
            continue
        inter = len(A & B)
        union = len(A | B)
        jaccard = inter / union if union else 0.0
        shared = len(M & set(row.get("markers") or []))
        if jaccard >= 0.7 and shared >= 1:
            return {"match": True, "reason": "feature_jaccard", "feature_id": row.get("feature_id") or incoming.get("feature_id"), "jaccard": round4(jaccard)}
    return {"match": False}

def haversine_km(a, b):
    if not a or not b:
        return None
    try:
        lat1, lon1 = float(a["lat"]), float(a["lon"])
        lat2, lon2 = float(b["lat"]), float(b["lon"])
    except (KeyError, TypeError, ValueError):
        return None
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    s = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(min(1.0, math.sqrt(s)))

def _year(date):
    try:
        return int(str(date or "")[:4])
    except (TypeError, ValueError):
        return None

def _day_span(a, b):
    def expand(d):
        s = str(d)
        if len(s) == 4:
            return s + "-01-01"
        if len(s) == 7:
            return s + "-01"
        return s
    from datetime import date
    try:
        da = date.fromisoformat(expand(a)[:10])
        db = date.fromisoformat(expand(b)[:10])
    except Exception:
        return None
    return max(1, abs((db - da).days))

def possibility_refuse(reason, **extra):
    out = {
        "schema": POSSIBILITY_SCHEMA,
        "kind": POSSIBILITY_KIND,
        "possibility": None,
        "refuse": reason,
        "unranked": True,
        "sort_key": None,
        "note": POSSIBILITY_NOTE,
        "law": HASHCHAIN_LEARN_LAW,
        "map4d": MAP4D_CITE,
        "not_truth": True,
        "not_court": True,
        "bayesian_separate": True,
        "triad_separate": True,
        "zsolver_separate": True,
        "kid_plain": "This is not a yes-or-no verdict. The lattice did not have enough honest anchors, or it refused.",
    }
    out.update(extra)
    return out

def possibility_score(*, anchors=None, learn_stamps=None, lattice_ok=True, poison=False, structure_ok=True):
    if lattice_ok is False:
        return possibility_refuse("LATTICE_BREAK")
    if structure_ok is False:
        return possibility_refuse("STRUCTURE_FAIL")
    if poison:
        return possibility_refuse("POISON_BLOCK")
    pins = [a for a in (anchors or []) if a and a.get("lat") is not None and a.get("lon") is not None and a.get("date")]
    if not pins:
        return possibility_refuse("NO_ANCHORS")
    support_hits = 0
    contradiction_hits = 0
    accepts = [s for s in (learn_stamps or []) if s and s.get("kind") == "accept" and isinstance(s.get("anchors"), list)]
    for pin in pins:
        for stamp in accepts:
            for other in stamp.get("anchors") or []:
                if not other or other.get("lat") is None or other.get("lon") is None or not other.get("date"):
                    continue
                km = haversine_km(pin, other)
                years = abs((_year(pin.get("date")) or 0) - (_year(other.get("date")) or 0))
                if km is not None and km <= 50 and years <= 1:
                    support_hits += 1
                if km is not None and km > 800 and years == 0:
                    contradiction_hits += 1
    same = []
    ordered = sorted(pins, key=lambda x: str(x.get("date") or ""))
    for i in range(1, len(ordered)):
        km = haversine_km(ordered[i - 1], ordered[i])
        days = _day_span(ordered[i - 1].get("date"), ordered[i].get("date"))
        if km is None or days is None:
            continue
        same.append({"km": km, "days": days, "speed": km / days})
        if km > 400 and str(ordered[i - 1].get("date")) == str(ordered[i].get("date")):
            contradiction_hits += 1
    travel = 1.0
    if same:
        worst = max(p["speed"] for p in same)
        travel = clamp01(1 - max(0, worst - 2000) / 4000)
        if worst > 8000:
            travel = 0.0
    support_density = clamp01(support_hits / (len(pins) + len(accepts) + 1))
    contradiction_density = clamp01(contradiction_hits / (len(pins) + 1))
    possibility = clamp01(0.5 + 0.35 * support_density - 0.4 * contradiction_density - 0.25 * (1 - travel))
    return {
        "schema": POSSIBILITY_SCHEMA,
        "kind": POSSIBILITY_KIND,
        "math": "HEURISTIC: clamp01(0.5 + 0.35·support_density − 0.40·contradiction_density − 0.25·(1 − travel_plausibility)) over lattice pin receipts. Not Beta-Bernoulli (Bayesian). Not TRIAD_V1. Not ZionPattern.",
        "possibility": round4(possibility),
        "refuse": None,
        "components": {
            "support_density": round4(support_density),
            "contradiction_density": round4(contradiction_density),
            "travel_plausibility": round4(travel),
            "pin_count": len(pins),
            "support_hits": support_hits,
            "contradiction_hits": contradiction_hits,
        },
        "unranked": True,
        "sort_key": None,
        "note": POSSIBILITY_NOTE,
        "law": HASHCHAIN_LEARN_LAW,
        "map4d": MAP4D_CITE,
        "not_truth": True,
        "not_court": True,
        "bayesian_separate": True,
        "triad_separate": True,
        "zsolver_separate": True,
        "kid_plain": "This is a possibility guess from dates and places already on the chain. It is not the Bayesian number and it is not a court finding.",
    }

def verify_chain_walk(entries, *, tip=None, depth=32):
    zero = "0" * 64
    rows = list(entries or [])
    errors = []
    expected_prev = zero
    expected_seq = 1
    walked_tip = zero
    for row in rows:
        seq = int(row.get("sequence") or 0)
        if seq != expected_seq:
            errors.append("sequence gap at " + str(seq))
        prev = str(row.get("previous_hash") or row.get("prev_hash") or "")
        if prev != expected_prev:
            errors.append("previous_hash mismatch at " + str(seq))
        expected_prev = row.get("entry_hash")
        expected_seq = seq + 1
        walked_tip = row.get("entry_hash")
    if tip and walked_tip and tip != walked_tip:
        errors.append("tip mismatch")
    ok = not errors
    take = max(1, int(depth or 32))
    stamps = [e for e in rows if str(e.get("action")) in LEARN_ACTIONS][-take:] if ok else []
    return {"ok": ok, "refuse": None if ok else "LATTICE_BREAK", "errors": errors, "tip": walked_tip, "stamps": stamps, "law": HASHCHAIN_LEARN_LAW}

class PoisonLearnedRefuse(ValueError):
    """Repeat poison matched a lattice feature receipt. Body is not stored."""
    def __init__(self, feature_id=None, sha256=None, reason="feature"):
        super().__init__("poison refused — learned feature match; body not stored")
        self.refuse = "POISON_LEARNED"
        self.feature_id = feature_id
        self.sha256 = sha256
        self.reason = reason

def compact_possibility(p):
    if not p:
        return None
    return {
        "schema": POSSIBILITY_SCHEMA,
        "kind": p.get("kind") or POSSIBILITY_KIND,
        "possibility": p.get("possibility"),
        "refuse": p.get("refuse"),
        "unranked": True,
        "not_truth": True,
        "note": POSSIBILITY_NOTE,
    }

def load_learn_stamps(library, *, exclude_record_id=None, limit=64):
    """Pattern memory: LEARN accept stamps already on the global hashchain."""
    stamps = []
    path = getattr(library, "ledger_path", None)
    if not path:
        return stamps
    p = Path(path)
    if not p.exists():
        return stamps
    for line in reversed(p.read_text("utf-8").splitlines()):
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
        except Exception:
            continue
        if entry.get("action") != "LEARN":
            continue
        payload = entry.get("payload") or {}
        if exclude_record_id and payload.get("record_id") == exclude_record_id:
            continue
        if (payload.get("kind") or "accept") != "accept":
            continue
        stamps.append({"kind": "accept", "anchors": payload.get("anchors") or []})
        if len(stamps) >= int(limit or 64):
            break
    return stamps

def load_poison_features(library):
    """Recollect AZDOC-POISONLEARN. Fail closed on lattice break."""
    chain = library.document_chain(POISON_LEARN_RECORD_ID)
    walk = verify_chain_walk(chain.get("entries") or [], tip=chain.get("tip"), depth=256)
    if not chain.get("ok") or not walk.get("ok"):
        empty_ok = not (chain.get("entries") or [])
        if empty_ok:
            return {"ok": True, "features": [], "tip": chain.get("tip"), "law": HASHCHAIN_LEARN_LAW}
        return {"ok": False, "features": [], "refuse": "LATTICE_BREAK", "tip": chain.get("tip"), "law": HASHCHAIN_LEARN_LAW}
    features = []
    for e in walk.get("stamps") or []:
        payload = e.get("payload") or {}
        if e.get("action") == "POISON_LEARN" and payload.get("feature_id"):
            features.append({
                "feature_id": payload.get("feature_id"),
                "content_sha256": payload.get("content_sha256"),
                "markers": payload.get("markers") or [],
                "token_hashes": payload.get("token_hashes") or [],
            })
    return {"ok": True, "features": features, "tip": chain.get("tip"), "law": HASHCHAIN_LEARN_LAW}

def append_poison_learn(library, *, record_id=None, sha256="", title="", filename="", markers=None, extra=None):
    """Append hash + feature receipt. Never stores a poison body. NO-REWRITE."""
    features = poison_feature_receipt(title=title, filename=filename, sha256=sha256, markers=markers or [])
    payload = {**features, "law": HASHCHAIN_LEARN_LAW, "record_id": record_id or POISON_LEARN_RECORD_ID, "no_rewrite": True}
    if extra:
        payload.update(extra)
    library._ledger("POISON_LEARN", payload)
    library._document_ledger(POISON_LEARN_RECORD_ID, "POISON_LEARN", payload)
    if record_id and record_id != POISON_LEARN_RECORD_ID:
        library._document_ledger(record_id, "POISON_LEARN", payload)
    return features

def apply_pin_from_upload(library, record_id, *, structure, poison, sha256, lib="aziel"):
    """Local MASTER: fail-closed pin + LEARN / possibility stamps on the document chain."""
    q = bool(poison and poison.get("status") == "QUARANTINE")
    if not structure or not structure.get("ok"):
        payload = {"schema": MAP_PIN_SCHEMA, "ok": False, "refuse": "STRUCTURE_FAIL", "record_id": record_id, "content_sha256": sha256, "map4d": MAP4D_CITE, "law": HASHCHAIN_LEARN_LAW}
        library._ledger("MAP_PIN_REFUSED", payload)
        library._document_ledger(record_id, "MAP_PIN_REFUSED", payload)
        return {"ok": False, "refuse": "STRUCTURE_FAIL", "pinned": 0, "anchors": [], "possibility": possibility_refuse("STRUCTURE_FAIL"), "sha256": sha256}
    if q:
        payload = {"schema": MAP_PIN_SCHEMA, "ok": False, "refuse": "POISON_BLOCK", "record_id": record_id, "content_sha256": sha256, "map4d": MAP4D_CITE, "law": HASHCHAIN_LEARN_LAW}
        library._ledger("MAP_PIN_REFUSED", payload)
        library._document_ledger(record_id, "MAP_PIN_REFUSED", payload)
        return {"ok": False, "refuse": "POISON_BLOCK", "pinned": 0, "anchors": [], "possibility": possibility_refuse("POISON_BLOCK"), "sha256": sha256}
    rec = library.get_record(record_id)
    events = rec.get("events") or []
    anchors = [{"event_id": e.get("event_id"), "date": e.get("event_date"), "place": e.get("place_name"), "lat": e.get("lat"), "lon": e.get("lon")} for e in events]
    poss = possibility_score(anchors=anchors, learn_stamps=load_learn_stamps(library, exclude_record_id=record_id), lattice_ok=True, poison=False, structure_ok=True)
    pin_payload = {"schema": MAP_PIN_SCHEMA, "ok": True, "record_id": record_id, "content_sha256": sha256, "pinned": len(anchors), "anchors": anchors, "map4d": MAP4D_CITE, "law": HASHCHAIN_LEARN_LAW}
    library._ledger("MAP_PIN", pin_payload)
    library._document_ledger(record_id, "MAP_PIN", pin_payload)
    learn_payload = {"schema": LEARN_SCHEMA, "law": HASHCHAIN_LEARN_LAW, "kind": "accept", "record_id": record_id, "content_sha256": sha256, "anchors": anchors, "possibility": poss.get("possibility"), "possibility_kind": POSSIBILITY_KIND, "no_rewrite": True, "author": "Aziel Eliab"}
    library._ledger("LEARN", learn_payload)
    library._document_ledger(record_id, "LEARN", learn_payload)
    poss_payload = {"schema": POSSIBILITY_SCHEMA, "record_id": record_id, "content_sha256": sha256, "possibility": poss.get("possibility"), "refuse": poss.get("refuse"), "kind": POSSIBILITY_KIND, "components": poss.get("components"), "note": POSSIBILITY_NOTE, "law": HASHCHAIN_LEARN_LAW, "not_truth": True}
    library._ledger("POSSIBILITY_SCORE", poss_payload)
    library._document_ledger(record_id, "POSSIBILITY_SCORE", poss_payload)
    return {"ok": True, "refuse": None, "pinned": len(anchors), "anchors": anchors, "possibility": poss, "sha256": sha256, "map4d": MAP4D_CITE}
