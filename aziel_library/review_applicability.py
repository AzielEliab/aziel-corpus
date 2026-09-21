"""Component applicability gates for SPRE / CLCE / PhysLing / Truth Formula.

Mirrors workers/download-tracker/src/review-applicability.js.
Author: Aziel Eliab.
"""
from __future__ import annotations
import re

COMPONENT_APPLICABILITY_SCHEMA = "aziel.component_applicability.v1"
PHYSLING_QUALIFY_MAINS = ("energy", "engineering")
PHYSLING_OMIT_MAINS = ("philosophy", "software", "design", "designs")
CLCE_BODY_MIN = 20

# Bare energy / force / forensic must not qualify a non-physics filing.
# Require a unit span OR (conservation/causal verb + a quantity).
UNIT_HINT_RE = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?|lb|pounds?|m|meters?|km|kilometers?|s|seconds?|j|joules?|n|newtons?|w|watts?|k|kelvin|hz|hertz|celsius|°c|°f)\b",
    re.I,
)
PHYS_QTY_VERB_RE = re.compile(
    r"\b(conserv\w*|thermodynam\w*|perpetual motion|faster than light|superluminal|created (?:mass|energy)|causal(?:ly)?)\b",
    re.I,
)
COVERUP_RE = re.compile(
    r"\b(cover-?up|suppression|official narrative|metadata shadow|backpull|mandatory reporting|shadow (?:layer|archive|path)|destroyed (?:file|record)|chain.of.custody|ΔT|delta[- ]t)\b",
    re.I,
)
ARCHIVAL_RE = re.compile(
    r"\b(archive|coroner|warden|patholog|death certificate|accession|destruction log|registrar|governor.?s? office)\b",
    re.I,
)
EVIDENCE_SPAN_RE = re.compile(
    r"(\((?:[A-Za-z][^)]{0,80},\s*)?(?:1[0-9]{3}|20[0-9]{2})\)|\[\d+\]|doi:\s*\S+|https?://\S+"
    r"|\b\d+(?:\.\d+)?\s*(?:kg|kilograms?|g|grams?|lb|pounds?|m|meters?|km|kilometers?|s|seconds?|ms|milliseconds?|j|joules?|n|newtons?|w|watts?|k|kelvin|celsius|°c|°f|hz|hertz)\b"
    r"|\bbecause\b|\bas evidenced\b|\bcited\b|\baccording to\b|\bprimary source\b|\barchive\b|\bphotograph\b|\bledger\b|\bsha-?256\b|\bhash recorded\b|\bmeasurement\b)",
    re.I,
)
HEADING_RE = re.compile(r"(?m)^#{1,6}\s+\S")


def extract_claims(title="", body=""):
    """Assertive sentences in the body. Title is a heading, not a claim."""
    text = str(body or "").strip()
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+", text)
    claims = []
    for s in parts:
        s = s.strip()
        if len(s) < 12:
            continue
        if s.endswith("?"):
            continue
        claims.append(s)
    if not claims and len(text) >= 12 and not text.endswith("?"):
        claims.append(text)
    return claims


def extract_evidence_spans(text):
    return [m.group(0) for m in EVIDENCE_SPAN_RE.finditer(str(text or ""))]


def headings_present(title="", body=""):
    return bool(str(title or "").strip()) or bool(HEADING_RE.search(str(body or "")))


def claim_evidence_rd(claims, body=""):
    if not claims:
        return None
    hits = 0
    for c in claims:
        if EVIDENCE_SPAN_RE.search(c):
            hits += 1
    return hits / len(claims)


def _token_list(value):
    return [p.strip() for p in re.split(r"[,;|/]+", str(value or "").lower()) if p.strip()]


def _add_main(mains, raw):
    x = str(raw or "").strip().lower()
    if not x:
        return
    head = re.split(r"[/:]+", x)[0].strip()
    if head == "historical":
        mains.add("history")
    elif head == "designs":
        mains.add("design")
    elif head:
        mains.add(head)


def classification_mains(input_doc=None):
    input_doc = input_doc or {}
    mains = set()
    for t in _token_list(input_doc.get("domain")):
        _add_main(mains, t)
    for t in _token_list(input_doc.get("subjects")):
        _add_main(mains, t)
    return mains


def has_provenance(input_doc=None):
    input_doc = input_doc or {}
    title = str(input_doc.get("title") or "").strip()
    author = str(input_doc.get("author") or "").strip()
    filename = str(input_doc.get("filename") or "").strip()
    body = str(input_doc.get("body") or input_doc.get("content") or "").strip()
    sha = str(input_doc.get("sha256") or input_doc.get("content_sha256") or "").strip()
    return bool(title or author or filename or body or re.fullmatch(r"[0-9a-f]{64}", sha, re.I))


def has_claim_structure(input_doc=None):
    input_doc = input_doc or {}
    title = str(input_doc.get("title") or "").strip()
    body = re.sub(r"\s+", " ", str(input_doc.get("body") or input_doc.get("content") or "")).strip()
    filename = str(input_doc.get("filename") or "").strip()
    sha = str(input_doc.get("sha256") or input_doc.get("content_sha256") or "").strip()
    claims = extract_claims(title, body)
    descriptive = len(body) >= CLCE_BODY_MIN and len(claims) > 0
    other = bool(title or filename or re.fullmatch(r"[0-9a-f]{64}", sha, re.I))
    return descriptive and other


def has_physics_evaluable_claim(input_doc=None):
    input_doc = input_doc or {}
    bag = "\n".join(str(input_doc.get(k) or "") for k in (
        "title", "body", "content", "filename", "subjects", "keywords", "domain",
    ))
    if UNIT_HINT_RE.search(bag):
        return True
    return bool(PHYS_QTY_VERB_RE.search(bag) and re.search(r"\d", bag))


def has_coverup_truth_inputs(input_doc=None):
    input_doc = input_doc or {}
    bag = "\n".join(str(input_doc.get(k) or "") for k in ("title", "body", "content", "filename", "subjects", "keywords", "domain"))
    return bool(COVERUP_RE.search(bag) or (ARCHIVAL_RE.search(bag) and COVERUP_RE.search(bag)))


def classify_spre_applicability(input_doc=None):
    if has_provenance(input_doc):
        return {"applicable": True, "reason": "filed object has provenance"}
    return {"applicable": False, "reason": "no provenance signals on this record"}


def classify_clce_applicability(input_doc=None):
    if has_claim_structure(input_doc):
        return {"applicable": True, "reason": "claim-structure: claims beside title or file"}
    return {"applicable": False, "reason": "no descriptive claim layer to compare"}


def classify_physling_applicability(input_doc=None):
    mains = classification_mains(input_doc)
    qualify = [m for m in mains if m in PHYSLING_QUALIFY_MAINS]
    if qualify:
        return {"applicable": True, "reason": "physics-evaluable domain " + ", ".join(qualify)}
    if has_physics_evaluable_claim(input_doc):
        return {"applicable": True, "reason": "physics or measurement claims in the document"}
    omit = [m for m in mains if m in PHYSLING_OMIT_MAINS]
    if omit:
        return {"applicable": False, "reason": "concept is " + ", ".join(omit) + " without physics-evaluable claims"}
    if "hardware" in mains and not has_physics_evaluable_claim(input_doc):
        return {"applicable": False, "reason": "hardware without physics-evaluable claims"}
    return {"applicable": False, "reason": "no physics-evaluable domain or measurement claims"}


def classify_truth_formula_applicability(input_doc=None):
    if has_coverup_truth_inputs(input_doc):
        return {"applicable": True, "mode": "coverup", "reason": "archival/cover-up Truth Formula inputs present"}
    if has_provenance(input_doc):
        return {"applicable": True, "mode": "subset", "reason": "ordinary filing — documented Truth Formula subset"}
    return {"applicable": False, "mode": None, "reason": "no filing to score"}


def classify_component_applicability(input_doc=None):
    spre = classify_spre_applicability(input_doc)
    clce = classify_clce_applicability(input_doc)
    plr = classify_physling_applicability(input_doc)
    truth = classify_truth_formula_applicability(input_doc)
    return {
        "schema": COMPONENT_APPLICABILITY_SCHEMA,
        "spre": spre,
        "clce": clce,
        "plr": plr,
        "truth_formula": truth,
        "flags": {
            "spre": spre["applicable"],
            "clce": clce["applicable"],
            "plr": plr["applicable"],
            "truth_formula": truth["applicable"],
            "bayesian": True,
            "physics": plr["applicable"],
            "linguistics": plr["applicable"],
        },
    }


def stamp_engine_applicability(engine, gate):
    if not engine or not isinstance(engine, dict):
        return engine
    applicable = bool(gate and gate.get("applicable"))
    out = dict(engine)
    out["applicable"] = applicable
    out["applicability_reason"] = str((gate or {}).get("reason") or ("applies" if applicable else "not_applicable"))
    out["not_applicable"] = (not applicable)
    if gate and gate.get("mode"):
        out["mode"] = gate["mode"]
    return out


def is_component_applicable(engine):
    if not engine or not isinstance(engine, dict):
        return False
    if engine.get("applicable") is False or engine.get("not_applicable") is True:
        return False
    if engine.get("status") == "not_applicable":
        return False
    return True


def public_engine_view(engine):
    if not engine or not isinstance(engine, dict):
        return None
    if not is_component_applicable(engine):
        return {
            "engine": engine.get("engine"),
            "applicable": False,
            "status": "not_applicable",
            "reason": engine.get("applicability_reason") or engine.get("reason") or "not_applicable",
        }
    return engine
