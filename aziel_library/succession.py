"""Exact-same-subject paper succession. Author: Aziel Eliab only."""
import json
import re
import uuid

SUCCESSION_SCHEMA = "aziel.succession.v1"
GENERIC_SUBJECTS = {
    "unclassified", "standalone", "general", "misc", "miscellaneous",
    "other", "unknown", "n a", "na", "none", "untitled",
}
DOC_ID = re.compile(r"AZDOC-[A-Z0-9]+", re.I)
LINEAGE_TAIL = re.compile(
    r"\s*[-–—:|]*\s*[([{]?\s*(?:v(?:er(?:sion)?)?|rev(?:ision)?|ed(?:ition)?|updated?|revised|supersedes?|superseded(?:\s+by)?|draft|final|addendum|corrigendum|errata)\b.*$",
    re.I,
)
EDITION_TAIL = re.compile(r"\s*[([{]\s*\d+(?:st|nd|rd|th)?\s*(?:ed(?:ition)?)?\s*[)\]}]\s*$", re.I)
VERSION_TAIL = re.compile(r"\s+v?\d+(?:\.\d+){0,3}\s*$", re.I)
EXT_TAIL = re.compile(r"\.(txt|md|markdown|pdf|docx?|rtf|html?)$", re.I)

def normalize_key(value):
    text = str(value or "")
    text = text.lower()
    text = re.sub(r"['’`]", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return text.strip()

def subject_key(value):
    first = str(value or "").split(",")[0].split(";")[0].split("|")[0].split("/")[0]
    key = normalize_key(first)
    if not key or key in GENERIC_SUBJECTS:
        return ""
    return key

def domain_key(value):
    return normalize_key(value)

def title_lineage_core(title):
    s = EXT_TAIL.sub("", str(title or ""))
    prev = None
    while s != prev:
        prev = s
        s = LINEAGE_TAIL.sub("", s)
        s = EDITION_TAIL.sub("", s)
        s = VERSION_TAIL.sub("", s)
    core = normalize_key(s)
    return core if len(core) >= 12 else ""

def _sha(row):
    h = str((row or {}).get("content_sha256") or (row or {}).get("sha256") or "").strip().lower()
    if h.startswith("0x"):
        h = h[2:]
    return h if re.fullmatch(r"[0-9a-f]{64}", h) else ""

def _time(row):
    raw = str((row or {}).get("created_utc") or (row or {}).get("ingested_utc") or "")
    return raw or ""

def _sort_oldest(rows):
    return sorted(rows, key=lambda r: (_time(r), str(r.get("record_id") or "")))

def _domains_conflict(a, b):
    da = domain_key((a or {}).get("domain"))
    db = domain_key((b or {}).get("domain"))
    return bool(da and db and da != db)

def _distinct_papers(rows):
    by_sha = {}
    no_sha = []
    for row in rows or []:
        sha = _sha(row)
        if not sha:
            no_sha.append(row)
            continue
        prev = by_sha.get(sha)
        if prev is None or _time(row) < _time(prev):
            by_sha[sha] = row
    return list(by_sha.values()) + no_sha

def _push_claim(out, kind, raw):
    text = str(raw or "").strip()
    if not text:
        return
    m = DOC_ID.search(text)
    if m:
        out.append({"kind": kind, "record_id": m.group(0).upper(), "title": ""})
        return
    title = normalize_key(text.strip("\"“”'`"))
    if len(title) >= 8:
        out.append({"kind": kind, "record_id": "", "title": title})

def extract_explicit_claims(record):
    out = []
    extras = (record or {}).get("extras") or {}
    meta = (record or {}).get("metadata") or {}
    _push_claim(out, "supersedes", extras.get("supersedes") or extras.get("supersedes_record_id") or meta.get("supersedes") or meta.get("supersedes_record_id"))
    _push_claim(out, "superseded_by", extras.get("superseded_by") or meta.get("superseded_by"))
    blob = "\n".join(str(x) for x in [
        (record or {}).get("keywords"),
        (record or {}).get("search_terms"),
        str((record or {}).get("body") or "")[:4000],
        extras.get("supersedes"), extras.get("superseded_by"), extras.get("supersedes_record_id"),
        meta.get("supersedes"), meta.get("superseded_by"), meta.get("supersedes_record_id"),
    ] if x)
    for m in re.finditer(r"\bsupersedes?\s*[:=]\s*(AZDOC-[A-Za-z0-9]+)", blob, re.I):
        _push_claim(out, "supersedes", m.group(1))
    for m in re.finditer(r"\bsuperseded[-_ ]?by\s*[:=]\s*(AZDOC-[A-Za-z0-9]+)", blob, re.I):
        _push_claim(out, "superseded_by", m.group(1))
    for m in re.finditer(r"\bsupersedes?\s*[:=]\s*[\"“]([^\"”]{8,240})[\"”]", blob, re.I):
        _push_claim(out, "supersedes", m.group(1))
    for m in re.finditer(r"\bsuperseded[-_ ]?by\s*[:=]\s*[\"“]([^\"”]{8,240})[\"”]", blob, re.I):
        _push_claim(out, "superseded_by", m.group(1))
    return out

def _resolve_claim(claim, catalog, claimant):
    if claim.get("record_id"):
        want = claim["record_id"]
        for row in catalog:
            if str(row.get("record_id") or "").upper() == want:
                return row
        return None
    want = normalize_key(claim.get("title"))
    want_core = title_lineage_core(claim.get("title"))
    exact = [r for r in catalog if r.get("record_id") != claimant.get("record_id") and normalize_key(r.get("title") or r.get("original_name")) == want]
    if len(exact) == 1:
        return exact[0]
    if len(exact) > 1:
        ck = subject_key(claimant.get("subjects") or claimant.get("primary_subject"))
        same = [r for r in exact if subject_key(r.get("subjects") or r.get("primary_subject")) and ck and subject_key(r.get("subjects") or r.get("primary_subject")) == ck]
        return same[0] if len(same) == 1 else None
    if not want_core:
        return None
    lined = [r for r in catalog if r.get("record_id") != claimant.get("record_id") and title_lineage_core(r.get("title") or r.get("original_name")) == want_core]
    if len(lined) == 1:
        sk = subject_key(lined[0].get("subjects") or lined[0].get("primary_subject"))
        ck = subject_key(claimant.get("subjects") or claimant.get("primary_subject"))
        if sk and ck and sk != ck:
            return None
        return lined[0]
    return None

def _add_pair(pairs, seen, pred, succ, reason, subject=""):
    if not pred or not succ or pred.get("record_id") == succ.get("record_id"):
        return
    if _sha(pred) and _sha(pred) == _sha(succ):
        return
    if _time(succ) and _time(pred) and _time(succ) < _time(pred):
        return
    key = f"{pred['record_id']}\n{succ['record_id']}"
    if key in seen:
        return
    seen.add(key)
    pairs.append({
        "predecessor_id": pred["record_id"],
        "successor_id": succ["record_id"],
        "subject_key": subject or subject_key(succ.get("subjects") or succ.get("primary_subject")) or subject_key(pred.get("subjects") or pred.get("primary_subject")) or "",
        "reason": reason,
    })

def propose_all_links(records, extra_pairs=None):
    catalog = [r for r in (records or []) if r and r.get("record_id")]
    pairs = []
    seen = set()
    groups = {}
    for row in catalog:
        sk = subject_key(row.get("subjects") or row.get("primary_subject"))
        tc = title_lineage_core(row.get("title") or row.get("original_name"))
        if not sk or not tc:
            continue
        groups.setdefault(sk + "\n" + tc, []).append(row)
    for key, group in groups.items():
        sk = key.split("\n", 1)[0]
        ordered = _sort_oldest(_distinct_papers(group))
        for i in range(len(ordered) - 1):
            if _domains_conflict(ordered[i], ordered[i + 1]):
                continue
            _add_pair(pairs, seen, ordered[i], ordered[i + 1], "subject_title_lineage", sk)
    for row in catalog:
        for claim in extract_explicit_claims(row):
            target = _resolve_claim(claim, catalog, row)
            if not target:
                continue
            older, newer = (row, target) if _time(row) <= _time(target) else (target, row)
            if claim["kind"] == "supersedes" and row.get("record_id") != newer.get("record_id"):
                continue
            if claim["kind"] == "superseded_by" and row.get("record_id") != older.get("record_id"):
                continue
            _add_pair(pairs, seen, older, newer, "explicit")
    for extra in extra_pairs or []:
        pred = next((r for r in catalog if r.get("record_id") == extra.get("predecessor_id")), None)
        succ = next((r for r in catalog if r.get("record_id") == extra.get("successor_id")), None)
        if pred and succ:
            _add_pair(pairs, seen, pred, succ, extra.get("reason") or "explicit", extra.get("subject_key") or "")
    return pairs

def cite_from_chain(record_id, chain):
    ids = [x["record_id"] for x in (chain or [])]
    try:
        idx = ids.index(record_id)
    except ValueError:
        return None
    if len(chain) < 2:
        return None
    return {
        "schema": SUCCESSION_SCHEMA,
        "chain": chain,
        "supersedes": chain[:idx],
        "superseded_by": chain[idx + 1:],
    }

def compact_record(row, extras=None):
    if not row:
        return None
    meta = row.get("metadata") or {}
    if not meta and row.get("metadata_json"):
        try:
            meta = json.loads(row.get("metadata_json") or "{}")
        except Exception:
            meta = {}
    return {
        "record_id": row.get("record_id"),
        "title": row.get("title") or row.get("original_name") or "",
        "original_name": row.get("original_name") or row.get("title") or "",
        "subjects": row.get("subjects") or row.get("primary_subject") or "",
        "primary_subject": row.get("primary_subject") or row.get("subjects") or "",
        "domain": row.get("domain") or "",
        "keywords": row.get("keywords") or row.get("search_terms") or "",
        "search_terms": row.get("search_terms") or "",
        "body": str(row.get("body") or row.get("extracted_text") or "")[:4000],
        "created_utc": row.get("created_utc") or row.get("ingested_utc") or "",
        "ingested_utc": row.get("ingested_utc") or row.get("created_utc") or "",
        "content_sha256": row.get("content_sha256") or row.get("sha256") or "",
        "sha256": row.get("sha256") or row.get("content_sha256") or "",
        "extras": extras or row.get("extras") or {},
        "metadata": meta,
    }

def work_version_pairs(rows):
    groups = {}
    for row in rows or []:
        wid = row.get("work_id")
        if not wid or not row.get("record_id"):
            continue
        groups.setdefault(wid, []).append(row)
    extra = []
    for items in groups.values():
        ordered = sorted(items, key=lambda r: (int(r.get("version_number") or 0), _time(r), str(r.get("record_id") or "")))
        for i in range(len(ordered) - 1):
            extra.append({
                "predecessor_id": ordered[i]["record_id"],
                "successor_id": ordered[i + 1]["record_id"],
                "reason": "work_version",
            })
    return extra

def new_link_id():
    return "AZSUC-" + uuid.uuid4().hex[:12].upper()
