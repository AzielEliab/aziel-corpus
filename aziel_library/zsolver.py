"""ZionPattern Solver secondary score. Author: Aziel Eliab only."""
import json
import os
import urllib.error
import urllib.request

ZSOLVER_HOST = "https://zsolver-download-tracker.vibelock.workers.dev"
ZSOLVER_DISCLAIMER = "Provisional and assistive only. Does not solve Zioncheck or any case. Hard cap 75% / uncertainty floor 25%."
ZSOLVER_CAP = 0.75
ZSOLVER_FLOOR = 0.25
PATTERN_IDS = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9"]
SIGNALS = {
    "P1": {"yes": ["unexplained gap", "timeline contradiction", "clocks cannot", "kinematic impossibility"], "no": ["timeline consistent", "clocks agree"]},
    "P2": {"yes": ["incomplete custody", "provenance gap", "overwrite marks", "custody chain missing"], "no": ["custody complete", "provenance verified"]},
    "P3": {"yes": ["unnamed witness", "missing blotter", "archival void", "second-hand summaries only"], "no": ["named witness list"]},
    "P4": {"yes": ["location mismatch", "route inconsistency", "floor disagreement"], "no": ["location corroborated"]},
    "P5": {"yes": ["pre-event discredit", "psychiatric framing before exam", "official narrative locked"], "no": []},
    "P6": {"yes": ["political conflict omitted", "motive context omitted"], "no": []},
    "P7": {"yes": ["encoded testimony", "rubye"], "require": ["zioncheck", "rubye", "marion a. zioncheck"]},
    "P8": {"yes": ["same-day suicide conclusion", "narrative lock", "wire-service locked"], "no": []},
    "P9": {"yes": ["missing measurements", "no coroner file", "forensic gap", "no independent examiner"], "no": ["independent measurements"]},
}

def _hay(doc):
    return "\n".join(str(doc.get(k) or "") for k in ("title", "body", "filename", "subjects", "keywords", "original_name", "extracted_text", "primary_subject", "search_terms")).lower()

def _has_any(text, needles):
    return any(n and n.lower() in text for n in (needles or []))

def derive_zsolver_answers(doc=None):
    text = _hay(doc or {})
    out = []
    for pid in PATTERN_IDS:
        sig = SIGNALS.get(pid) or {}
        if sig.get("require") and not _has_any(text, sig["require"]):
            out.append({"pattern_id": pid, "value": "unknown"}); continue
        if _has_any(text, sig.get("yes")):
            out.append({"pattern_id": pid, "value": "yes"}); continue
        if _has_any(text, sig.get("no")):
            out.append({"pattern_id": pid, "value": "no"}); continue
        out.append({"pattern_id": pid, "value": "unknown"})
    return out

def _round4(n):
    try: return round(float(n), 4)
    except (TypeError, ValueError): return 0.0

def local_zsolver_score(answers):
    yes = no = unknown = 0
    for a in answers or []:
        v = str((a or {}).get("value") or "").lower()
        if v == "yes": yes += 1
        elif v == "no": no += 1
        else: unknown += 1
    decided = yes + no
    official = (yes / decided) if decided else 0.0
    raw = official
    capped = min(ZSOLVER_CAP, raw)
    uncertainty = max(ZSOLVER_FLOOR, 1 - capped) if capped > 0 else 1.0
    return {
        "engine": "zsolver",
        "product": "zsolver",
        "author": "Aziel Eliab",
        "official_contradiction": _round4(official),
        "alternative_coherence": _round4(official),
        "raw_confidence": _round4(raw),
        "capped_confidence": _round4(capped),
        "uncertainty": _round4(uncertainty),
        "confidence_cap": ZSOLVER_CAP,
        "uncertainty_floor": ZSOLVER_FLOOR,
        "answered": len(answers or []),
        "unknown_answers": unknown,
        "answers": list(answers or []),
        "display": int(round(capped * 100)),
        "disclaimer": ZSOLVER_DISCLAIMER,
        "provisional": True,
        "assistive": True,
        "solves_cases": False,
        "primary_visible": True,
        "separate_from_triad": True,
        "source": "local-port",
        "status": "local",
    }

def _normalize_live(json, answers, source="zsolver-live"):
    if not isinstance(json, dict) or json.get("capped_confidence") is None:
        return None
    try: capped = min(ZSOLVER_CAP, max(0.0, float(json["capped_confidence"])))
    except (TypeError, ValueError): return None
    raw = json.get("raw_confidence", capped)
    try: raw = float(raw)
    except (TypeError, ValueError): raw = capped
    try: unc = float(json["uncertainty"]) if json.get("uncertainty") is not None else (max(ZSOLVER_FLOOR, 1 - capped) if capped > 0 else 1.0)
    except (TypeError, ValueError): unc = max(ZSOLVER_FLOOR, 1 - capped) if capped > 0 else 1.0
    return {
        "engine": "zsolver",
        "product": "zsolver",
        "author": "Aziel Eliab",
        "official_contradiction": _round4(json.get("official_contradiction")),
        "alternative_coherence": _round4(json.get("alternative_coherence")),
        "raw_confidence": _round4(raw),
        "capped_confidence": _round4(capped),
        "uncertainty": _round4(unc),
        "confidence_cap": ZSOLVER_CAP,
        "uncertainty_floor": ZSOLVER_FLOOR,
        "answered": json.get("answered", len(answers or [])),
        "unknown_answers": json.get("unknown_answers", 0),
        "answers": json.get("answers") or list(answers or []),
        "display": int(round(capped * 100)),
        "disclaimer": json.get("disclaimer") or ZSOLVER_DISCLAIMER,
        "provisional": True,
        "assistive": True,
        "solves_cases": False,
        "primary_visible": True,
        "separate_from_triad": True,
        "source": source,
        "status": "scored",
    }

def request_zsolver_score(answers, timeout=4):
    body = json.dumps({"answers": list(answers or [])}).encode()
    req = urllib.request.Request(
        ZSOLVER_HOST + "/v1/score",
        data=body,
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0 AzielDigitalLibrary"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            raw = res.read().decode("utf-8", "replace")
        return _normalize_live(json.loads(raw), answers, "zsolver-live")
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, OSError):
        return None

def score_document(doc=None, prefer_live=True):
    answers = derive_zsolver_answers(doc or {})
    want_live = bool(prefer_live) and str(os.environ.get("AZIEL_ZSOLVER_LIVE") or "1").lower() not in {"0", "false", "no"}
    if want_live:
        live = request_zsolver_score(answers)
        if live:
            return live
    report = local_zsolver_score(answers)
    if want_live:
        report["status"] = "queued"
        report["queued"] = True
        report["source"] = "queued"
    return report

def zsolver_is_live(report):
    return str((report or {}).get("source") or "") in {"zsolver-live", "zsolver-binding"}
