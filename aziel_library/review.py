"""Aziel Digital Library review engines. Author: Aziel Eliab only.

SPRE  — provenance completeness. Does not assert criminal guilt.
CLCE  — public term is structural match (claims↔evidence + headings + verified-file bit).
        Token Jaccard stays in the audit object only. Detects inconsistency, not intent.
PLR   — PhysLing Review (physics × linguistics, equal weight).
Poison — quarantine-or-flag. Never silently deletes. Hardest on public Corpus.
Bayesian — unranked likelihood of internal consistency. Never used to sort the shelf.
Truth Formula — Cover-Up Truth Formula v1/v2 (ΔT / suppression / backpull) when applicable;
                documented subset for ordinary Softwares/AZDOC filings.
TRIAD_V3 — public shelf score is the 36-cycle mean of six factors (applicable-only n²).
"""
from __future__ import annotations
import hashlib, re, zipfile
from pathlib import Path

from .review_applicability import (
    classify_component_applicability,
    stamp_engine_applicability,
    public_engine_view,
    extract_claims,
    extract_evidence_spans,
    headings_present,
    claim_evidence_rd,
)

REVIEW_SCHEMA = "aziel.review.v1"
LATTICE_SCHEMA = "aziel.lattice.anchor.v1"
SPRE_LIMITATION = "SPRE scores provenance completeness. It does not assert criminal guilt. Advisory only. Author Aziel Eliab."
CLCE_LIMITATION = "Public CLCE is structural match (claims↔evidence + headings + verified-file). Token Jaccard is audit-only. Type D is a label, not a finding of malice. Advisory. Threshold 0.7 is not a truth verdict."
PLR_LIMITATION = "PhysLing Review (PLR) flags physics-impossible or linguistically manipulative framing. Equal-weight physics × linguistics. Not a court finding."
POISON_LIMITATION = "Poison immunity quarantines suspected shells. Status is hash-chained. Records are never silently deleted. Official narrative is not merged into evidence."
TRUTH_LIMITATION = "Cover-Up Truth Formula v1/v2 scores ΔT / suppression / metadata shadows / backpull on archival papers. Ordinary filings use a documented subset. Not a truth verdict. Author Aziel Eliab."
LATTICE_NOTE = "Public HTTPS site is not a mesh. AzielTether carries this tip. Survival interdependence with GodLock and other Aziel software is via downloadable tether + Worker bootstrap APIs."
TRIAD_SCHEMA = "aziel.triad.v3"
TRIAD_FORMULA = (
    "TRIAD_V3: public combined = triad_cycle_mean = mean of all ordered pairings factor_i × factor_j "
    "among applicable factors of {physics, linguistics, bayesian, truth_formula, CLCE, SPRE} "
    "(36 when all six apply, including diagonals). Also stored: geometric_mean_applicable = "
    "(Π applicable engines SPRE/CLCE/PLR)^(1/n). Named axis products: physics×linguistics, "
    "bayesian×truth_formula, CLCE×SPRE. Bayesian is LIKELIHOOD of internal consistency, unranked, "
    "never a shelf sort key. triad_raw freezes to content SHA-256 at first REVIEW_SCORE. "
    "Downloads verify bytes and do not mint a new mean. No collection offset. Display is "
    "round(combined × 100) and is never written back into combined."
)
TRIAD_KID = "This one number is the report card from the checkers that apply to this document."

STOP = set("a an the and or but if then of to for in on at by with from as is are was were be been being this that these those it its they them their you your we our not no".split())
EVIDENCE_RE = re.compile(r"\b(measur|observ|photograph|instrument|primary source|archive|witness|citation|cited|dataset|sha-?256|hash|ledger|experiment|lab note|field note|timestamp|coordinate|latitud|longitud|si unit|kilogram|meter|joule|newton|pascal|kelvin|wavelength)\w*", re.I)
INDEPENDENT_RE = re.compile(r"\b(independent|primary source|first-hand|firsthand|raw data|unedited|original document|contemporaneous)\b", re.I)
PHYSICS_RE = re.compile(r"\b(conserv|energy|momentum|mass|force|entropy|causal|thermodynam|wavelength|frequency|gravity|electromagnet|unit|joule|newton|watt)\w*", re.I)
OFFICIAL_RE = re.compile(r"\b(officials? (confirm|say|said|state|stated)|authorities (say|said|confirm)|official (account|narrative|story|version)|trust the (experts?|science)|the science is settled)\b", re.I)
DISMISSAL_RE = re.compile(r"\b(conspiracy theor\w*|disinformation|misinformation|debunked|fake news|only a fool|everyone knows|nobody (serious|credible))\b", re.I)
ADVOCACY_RE = re.compile(r"\b(must (vote|believe|support)|wake up|sheeple|do your own research!|they don't want you to know)\b", re.I)
ATTACK_RE = re.compile(r"\b(liar|lies?|hoax|fraud|fake|scam|cover-?up|shill)\b", re.I)
GUILT_RE = re.compile(r"\b(is guilty|are guilty|committed (the )?(crime|murder|fraud)|proven criminal)\b", re.I)
CONSERVATION_RE = re.compile(r"\b(perpetual motion|over-?unity|free energy|energy from nothing|created (mass|energy) from nothing|violat\w+ (conservation|thermodynam))\b", re.I)
FTL_RE = re.compile(r"\b(faster than light|superluminal travel)\b", re.I)
WEASEL_RE = re.compile(r"\b(everyone knows|nobody denies|it is obvious that|studies show(?! \w)|experts agree|trust us)\b", re.I)
YEAR_RE = re.compile(r"\b((?:1[0-9]{3}|20[0-9]{2}))\b")
T0_RE = re.compile(r"\b(raw truth|primary source|contemporaneous|original document|first-?hand|unedited|instrument data)\b", re.I)
T1_RE = re.compile(r"\b(official (account|narrative|story|version)|authorities (say|said)|officials? (confirm|say|said))\b", re.I)
T2_RE = re.compile(r"\b(suppress\w*|cover-?up|shadow (layer|archive|path)|purge|destroyed (file|record)|missing attachment|chain.of.custody|euphemis\w*|vague (cause|reason)|delay)\b", re.I)
DELTA_T_RE = re.compile(r"\b(contradict\w*|diverg\w*|discrepan\w*|ΔT|delta[- ]t|official.{0,40}(vs|versus|against)|raw.{0,40}official)\b", re.I)
META_SHADOW_RE = re.compile(r"\b(metadata shadow|routing (slip|log)|index card|accession|destruction log|ledger|sha-?256|content hash)\b", re.I)
BACKPULL_RE = re.compile(r"\b(backpull|mandatory (reporting|chain)|coroner|warden|patholog|registrar|governor|reconstruct|surviving (node|record|cop))\b", re.I)
SHA256_HEX_RE = re.compile(r"^[0-9a-f]{64}$", re.I)

FACTOR_NAMES = ("physics", "linguistics", "bayesian", "truth_formula", "clce", "spre")


def clamp01(n):
    try: x=float(n)
    except (TypeError,ValueError): return 0.0
    return 0.0 if x<0 else 1.0 if x>1 else x

def round4(n):
    return round(clamp01(n),4)

def tokenize(text):
    return [t for t in re.split(r"[^a-z0-9]+", str(text or "").lower()) if t and len(t)>1 and t not in STOP]

def token_set(text):
    return set(tokenize(text))

def jaccard(a,b):
    A=a if isinstance(a,set) else token_set(a)
    B=b if isinstance(b,set) else token_set(b)
    if not A and not B: return 1.0
    inter=len(A&B); union=len(A|B)
    return inter/union if union else 0.0

def jaccard_triple(r,d,p):
    R,D,P=token_set(r),token_set(d),token_set(p)
    union=R|D|P
    if not union: return 1.0
    return len(R&D&P)/len(union)

def _has(rx,text):
    return bool(rx.search(str(text or "")))

def clce_layer_p(title="", structure_ok=False, hash_ok=False):
    """P is headings + verified-file bit. Never the content SHA-256 hex."""
    heading = str(title or "").strip()
    bit = "structure verified" if (structure_ok and hash_ok) else "structure failed"
    return (heading + " " + bit).strip()

def clce_structural_match(*, title="", body="", structure_ok=False, hash_ok=False):
    claims = extract_claims(title, body)
    if not claims:
        return {
            "applicable": False,
            "structural": None,
            "rd": None,
            "sp": None,
            "headings_present": headings_present(title, body),
            "verified_file": bool(structure_ok and hash_ok),
            "claim_count": 0,
            "evidence_span_count": len(extract_evidence_spans(body)),
            "reason": "no claims — omit CLCE (never 0)",
        }
    rd = claim_evidence_rd(claims, body)
    hp = headings_present(title, body)
    vf = bool(structure_ok and hash_ok)
    sp = 0.5 * (1.0 if hp else 0.0) + 0.5 * (1.0 if vf else 0.0)
    x = 0.7 * float(rd) + 0.3 * sp
    return {
        "applicable": True,
        "structural": round4(x),
        "rd": round4(rd),
        "sp": round4(sp),
        "headings_present": hp,
        "verified_file": vf,
        "claim_count": len(claims),
        "evidence_span_count": len(extract_evidence_spans(body)),
        "reason": "structural match claims↔evidence + headings + verified-file",
    }

def clce_score(r="",d="",p="",n="", *, title=None, body=None, structure_ok=False, hash_ok=False):
    R,D,P,N=token_set(r),token_set(d),token_set(p),token_set(n)
    triple=jaccard_triple(r,d,p)
    rd_j,dp,rp=jaccard(R,D),jaccard(D,P),jaccard(R,P)
    pairwise_avg=(rd_j+dp+rp)/3
    union=R|D|P
    n_ratio=(len(N&union)/len(union)) if union else 0.0
    plus=clamp01(triple*(1-0.5*n_ratio))
    types=[]; primary="OK"
    if triple<0.7 and pairwise_avg<0.7:
        types.append("C"); primary="C"
    if rd_j<0.4 and dp>=rd_j and rp>=rd_j:
        types.append("A")
        if primary=="OK": primary="A"
    if n_ratio>0.35:
        if "C" not in types: types.append("C")
        primary="C"
    band="consistent" if triple>=0.7 else "partial" if pairwise_avg>=0.45 else "structural_inconsistency"
    src_title = title if title is not None else r
    src_body = body if body is not None else d
    structural = clce_structural_match(title=src_title, body=src_body, structure_ok=structure_ok, hash_ok=hash_ok)
    x = structural.get("structural")
    kid = (
        "The claims and the evidence spans agree enough."
        if x is not None and x >= 0.7
        else "These stories do not fully match. The title, the notes, and the real file are talking about different stuff."
        if x is not None
        else "No claims to match — CLCE omitted."
    )
    return {
        "engine":"CLCE",
        "schema":"az-clce.report.v0.3.port",
        "public_term":"structural_match",
        "structural": None if x is None else round4(x),
        "rd": structural.get("rd"),
        "sp": structural.get("sp"),
        "headings_present": structural.get("headings_present"),
        "verified_file": structural.get("verified_file"),
        "claim_count": structural.get("claim_count"),
        "evidence_span_count": structural.get("evidence_span_count"),
        "triple":round4(triple),
        "pairwise":{"rd":round4(rd_j),"dp":round4(dp),"rp":round4(rp)},
        "pairwise_avg":round4(pairwise_avg),
        "plus":round4(plus),
        "n_ratio":round4(n_ratio),
        "band": "consistent" if (x is not None and x>=0.7) else band,
        "primary":primary,
        "types":types,
        "audit_jaccard":{"triple":round4(triple),"pairwise_avg":round4(pairwise_avg),"note":"audit only — not the public CLCE term"},
        "kid_plain":kid,
        "advisory":True,
        "limitation":CLCE_LIMITATION,
        "threshold":0.7,
        "omit_if_no_claims": True,
    }

def spre_score(title="",body="",filename="",sha256="",structure_ok=False,author=""):
    text="\n".join([title,body,filename])
    pc=0.0; factors=[]; audit_flags=[]
    def add(ok,w,name):
        nonlocal pc
        if ok:
            pc+=w; factors.append(name)
    add(bool(str(title or "").strip()),0.12,"title")
    add(len(str(body or "").strip())>=20,0.15,"text")
    add(bool(re.fullmatch(r"[0-9a-f]{64}",str(sha256 or ""),re.I)),0.18,"content_hash")
    add(bool(structure_ok),0.18,"structure_ok")
    add(bool(str(author or "").strip()),0.08,"author")
    add(_has(EVIDENCE_RE,text),0.12,"evidence_language")
    if _has(INDEPENDENT_RE,text):
        audit_flags.append("independent_source")
    if _has(PHYSICS_RE,text):
        audit_flags.append("physics_language")
    penalty=0.0
    if _has(OFFICIAL_RE,text) and not _has(EVIDENCE_RE,text) and not _has(PHYSICS_RE,text):
        penalty+=0.25; factors.append("official_narrative_without_evidence")
    if _has(ADVOCACY_RE,text) and not _has(EVIDENCE_RE,text) and not _has(PHYSICS_RE,text):
        penalty+=0.20; factors.append("advocacy_without_evidence")
    pc=clamp01(pc-penalty)
    band="strong" if pc>=0.7 else "partial" if pc>=0.4 else "weak"
    kid="Green: we can see where this file came from and what it is." if pc>=0.7 else "Yellow: some proof is here, but pieces are missing." if pc>=0.4 else "Red: we cannot tell if this is a real source yet."
    return {
        "engine":"SPRE",
        "name":"Source Provenance Reliability Engine",
        "public_name":"provenance completeness",
        "pc":round4(pc),
        "band":band,
        "kid_plain":kid,
        "factors":factors,
        "audit_flags":audit_flags,
        "guilt_language":_has(GUILT_RE,text),
        "limitation":SPRE_LIMITATION,
    }

def physling_review(title="",body="",filename=""):
    text="\n".join([title,body,filename])
    flags=[]; lights={"units":"PASS","conservation":"PASS","causal":"PASS","temporal":"PASS","framing":"PASS"}
    if re.search(r"weighs?\s+\d",text,re.I) and re.search(r"\b(seconds?|hertz|kelvin|celsius|joules?|watts?)\b",text,re.I):
        flags.append({"kind":"units","why":"Weight described with a non-mass unit."}); lights["units"]="FLAG"
    if re.search(r"temperatur\w*\s+\d",text,re.I) and re.search(r"\b(kilograms?|meters?|joules?|newtons?|seconds?)\b",text,re.I):
        flags.append({"kind":"units","why":"Temperature described with a non-temperature unit."}); lights["units"]="FLAG"
    if re.search(r"weighs?\s+\d+(?:\.\d+)?\s*s\b",text,re.I):
        flags.append({"kind":"units","why":"Mass stated in seconds."}); lights["units"]="FLAG"
    if _has(CONSERVATION_RE,text) and not re.search(r"\b(thought experiment|fiction|hypothetical|alleged claim)\b",text,re.I):
        flags.append({"kind":"conservation","why":"Conservation-breaking claim without a physics mechanism."}); lights["conservation"]="FLAG"
    if _has(FTL_RE,text) and not re.search(r"\b(fiction|hypothetical|thought experiment|alleged)\b",text,re.I):
        flags.append({"kind":"conservation","why":"Faster-than-light stated as fact."})
        if lights["conservation"]!="FLAG": lights["conservation"]="REVIEW"
    years=[{"year":int(m.group(1)),"index":m.start()} for m in YEAR_RE.finditer(text)]
    for i in range(1,len(years)):
        window=text[max(0,years[i-1]["index"]-20):years[i]["index"]+8]
        if re.search(r"\b(after|then|later|caused|led to|which caused)\b",window,re.I) and years[i]["year"]<years[i-1]["year"]:
            flags.append({"kind":"temporal","why":"Later event dated before an earlier one in causal language."})
            lights["temporal"]="FLAG"; lights["causal"]="FLAG"
    low=text.lower(); idx=low.find("therefore")
    if idx>=0 and idx<24 and len(str(body or "").strip())<80:
        flags.append({"kind":"causal","why":"Conclusion appears before a supporting premise."})
        if lights["causal"]!="FLAG": lights["causal"]="REVIEW"
    if _has(WEASEL_RE,text) or _has(DISMISSAL_RE,text):
        flags.append({"kind":"framing","why":"Weasel or dismissal framing without independent evidence."})
        lights["framing"]="REVIEW" if _has(EVIDENCE_RE,text) else "FLAG"
    if _has(OFFICIAL_RE,text) and not _has(INDEPENDENT_RE,text) and not _has(EVIDENCE_RE,text):
        flags.append({"kind":"framing","why":"Official narrative language without independent evidence."}); lights["framing"]="FLAG"
    flag_count=sum(1 for f in flags if lights.get(f["kind"])=="FLAG")
    review_count=sum(1 for v in lights.values() if v=="REVIEW")
    status="FLAG" if flag_count else "REVIEW" if review_count else "PASS"
    physics=clamp01(1-flag_count*0.28-review_count*0.12)
    ling=1.00 if lights["framing"]=="PASS" else 0.70 if lights["framing"]=="REVIEW" else 0.25
    kid="Green: the words and the physics rules agree." if status=="PASS" else "Yellow: a grown-up should read this again. Something might be mixed up." if status=="REVIEW" else "Red: the words break physics rules or try to push a story without proof."
    return {"engine":"PLR","name":"PhysLing Review","status":status,"lights":lights,"flags":flags,"physics_coherence":round4(physics),"linguistic_neutrality":round4(ling),"kid_plain":kid,"limitation":PLR_LIMITATION}

def poison_scan(title="",body="",filename="",library="corpus"):
    text="\n".join([title,body,filename]); markers=[]
    if _has(OFFICIAL_RE,text) and not _has(EVIDENCE_RE,text) and not _has(PHYSICS_RE,text) and not _has(INDEPENDENT_RE,text):
        markers.append("official_narrative_without_independent_evidence")
    if _has(ADVOCACY_RE,text) and not _has(EVIDENCE_RE,text) and not _has(PHYSICS_RE,text):
        markers.append("non_neutral_advocacy_without_evidence_or_physics")
    if _has(DISMISSAL_RE,text) and not _has(EVIDENCE_RE,text):
        markers.append("propaganda_dismissal_shell")
    attacks=len(ATTACK_RE.findall(text)); evidence=len(EVIDENCE_RE.findall(text))
    if attacks>=3 and evidence==0:
        markers.append("contradictory_only_propaganda_shell")
    lib="aziel" if str(library or "").lower()=="aziel" else "corpus"
    suspected=bool(markers)
    status="QUARANTINE" if suspected and lib=="corpus" else "FLAGGED" if suspected else "CLEAR"
    kid="Green: this does not look like a poison shell." if status=="CLEAR" else "Yellow: operator evidence file — watch for poison words, but keep the file." if status=="FLAGGED" else "Red: this looks like a poison story. It is locked in a quarantine box. It is not deleted."
    return {"engine":"POISON","suspected":suspected,"status":status,"markers":markers,"library":lib,"kid_plain":kid,"immutable":True,"never_delete":True,"limitation":POISON_LIMITATION}

def truth_formula_score(*, title="", body="", filename="", sha256="", structure_ok=False, mode="subset"):
    """Cover-Up Truth Formula v1/v2. Full mode for archival/cover-up papers; subset for ordinary filings."""
    text="\n".join([title, body, filename])
    factors=[]; score=0.0
    if mode=="coverup":
        def add(ok,w,name):
            nonlocal score
            if ok:
                score+=w; factors.append(name)
        add(_has(T0_RE,text) or _has(EVIDENCE_RE,text),0.20,"T0_raw")
        add(_has(T1_RE,text),0.15,"T1_official_identified")
        add(_has(T2_RE,text),0.15,"T2_suppression")
        add(_has(DELTA_T_RE,text),0.15,"delta_T")
        add(_has(META_SHADOW_RE,text) or bool(re.fullmatch(r"[0-9a-f]{64}",str(sha256 or ""),re.I)),0.15,"metadata_shadow")
        add(_has(BACKPULL_RE,text),0.20,"backpull")
        if _has(OFFICIAL_RE,text) and not _has(EVIDENCE_RE,text):
            score-=0.25; factors.append("official_as_raw_without_evidence")
        if _has(ADVOCACY_RE,text) and not _has(EVIDENCE_RE,text):
            score-=0.20; factors.append("advocacy_without_evidence")
        formula="coverup_v2: T0/T1/T2 + ΔT + metadata shadows + backpull; penalties for official-as-raw"
    else:
        def add(ok,w,name):
            nonlocal score
            if ok:
                score+=w; factors.append(name)
        add(len(str(body or "").strip())>=20,0.35,"T0_lite_body")
        add(not (_has(OFFICIAL_RE,text) and not _has(EVIDENCE_RE,text)),0.25,"no_unchallenged_official_as_truth")
        add(bool(re.fullmatch(r"[0-9a-f]{64}",str(sha256 or ""),re.I)),0.25,"metadata_hash")
        add(bool(structure_ok),0.15,"structure_ok")
        formula="subset: T0-lite body + no unchallenged official-as-truth + metadata hash + structure"
    score=clamp01(score)
    return {
        "engine":"TRUTH_FORMULA",
        "name":"Cover-Up Truth Formula",
        "schema":"aziel.truth_formula.v2",
        "mode":mode,
        "score":round4(score),
        "factors":factors,
        "formula":formula,
        "limitation":TRUTH_LIMITATION,
        "not_truth":True,
    }

def clce_consistency(clce):
    if not clce: return None
    if clce.get("structural") is not None:
        return clamp01(clce.get("structural"))
    if clce.get("applicable") is False:
        return None
    triple=clamp01(clce.get("triple"))
    avg=clamp01(clce.get("pairwise_avg"))
    return triple if triple>=0.7 else avg

def plr_coherence(plr):
    if not plr: return None
    return clamp01(0.5*clamp01(plr.get("physics_coherence"))+0.5*clamp01(plr.get("linguistic_neutrality")))

def triad_coverage_points(chain_length):
    """Audit-only succession length. Never added to the public triad."""
    try: n=int(chain_length)
    except (TypeError,ValueError): return 0
    if n<2: return 0
    return min(12, (n-1)*3)

def cycle_mean(factors):
    """Mean of all ordered pairings factor_i × factor_j including diagonals (n²)."""
    vals=[clamp01(v) for v in factors if v is not None]
    n=len(vals)
    if n==0: return None
    products=[]
    for i in range(n):
        for j in range(n):
            products.append(vals[i]*vals[j])
    return sum(products)/len(products)

def geometric_mean(values):
    vals=[max(clamp01(v),0.0001) for v in values if v is not None]
    if not vals: return None
    prod=1.0
    for v in vals: prod*=v
    return prod**(1/len(vals))

def collection_triad(triad, library=None, coverage=None):
    """Identity. Collection +25 and coverage +0..12 are deleted. Do not write display back into combined."""
    return triad

def freeze_triad_raw(triad, content_sha256, event="REVIEW_SCORE"):
    """Freeze triad_raw to content SHA-256 at first REVIEW_SCORE. Re-entry keeps the frozen mean."""
    if not triad or not triad.get("ready") or triad.get("combined") is None:
        return triad
    sha=str(content_sha256 or "").strip().lower()
    if not SHA256_HEX_RE.fullmatch(sha):
        return triad
    if triad.get("triad_raw") is not None and triad.get("frozen_to"):
        return triad
    out=dict(triad)
    out["triad_raw"]=out["combined"]
    out["frozen_to"]=sha
    out["frozen_event"]=event
    return out

def is_triad_frozen(triad):
    if not triad: return False
    sha=str(triad.get("frozen_to") or "").strip().lower()
    return triad.get("triad_raw") is not None and bool(SHA256_HEX_RE.fullmatch(sha))

def triad_composite(*, spre=None, clce=None, plr=None, bayesian=None, truth_formula=None, applicability=None, content_sha256=None):
    flags = applicability if isinstance(applicability, dict) else None
    if flags is None:
        flags = {"spre": True, "clce": True, "plr": True, "truth_formula": truth_formula is not None, "bayesian": bayesian is not None, "physics": True, "linguistics": True}
    spre_pc=clamp01(spre.get("pc")) if spre and spre.get("pc") is not None else None
    clce_c=clce_consistency(clce)
    plr_c=plr_coherence(plr)
    physics=clamp01(plr.get("physics_coherence")) if plr and plr.get("physics_coherence") is not None else None
    linguistics=clamp01(plr.get("linguistic_neutrality")) if plr and plr.get("linguistic_neutrality") is not None else None
    bayes_p=clamp01(bayesian.get("posterior")) if bayesian and bayesian.get("posterior") is not None else None
    truth_s=clamp01(truth_formula.get("score")) if truth_formula and truth_formula.get("score") is not None else None

    use_spre = flags.get("spre", True) and spre_pc is not None
    use_clce = flags.get("clce", True) and clce_c is not None
    use_plr = flags.get("plr", True) and plr_c is not None
    use_physics = flags.get("physics", use_plr) and physics is not None and use_plr
    use_ling = flags.get("linguistics", use_plr) and linguistics is not None and use_plr
    use_bayes = flags.get("bayesian", True) and bayes_p is not None
    use_truth = flags.get("truth_formula", True) and truth_s is not None

    heritage = applicability is None
    needed_ok = True
    if heritage:
        needed_ok = spre_pc is not None and clce_c is not None and plr_c is not None
    else:
        needed_ok = (not flags.get("spre") or spre_pc is not None) and (not flags.get("clce") or clce_c is not None) and (not flags.get("plr") or plr_c is not None)

    factor_map = {
        "physics": physics if use_physics else None,
        "linguistics": linguistics if use_ling else None,
        "bayesian": bayes_p if use_bayes else None,
        "truth_formula": truth_s if use_truth else None,
        "clce": clce_c if use_clce else None,
        "spre": spre_pc if use_spre else None,
    }
    used_factors=[k for k in FACTOR_NAMES if factor_map[k] is not None]
    cycle=cycle_mean([factor_map[k] for k in used_factors])
    geo_vals=[]
    used_engines=[]
    if use_spre:
        geo_vals.append(spre_pc); used_engines.append("spre")
    if use_clce:
        geo_vals.append(clce_c); used_engines.append("clce")
    if use_plr:
        geo_vals.append(plr_c); used_engines.append("plr")
    geo=geometric_mean(geo_vals)
    ready=bool(needed_ok and used_factors and cycle is not None)
    combined=cycle if ready else None
    display=None if combined is None else int(round(combined*100))
    axis={
        "physics_linguistics": None if not (use_physics and use_ling) else round4(physics*linguistics),
        "bayesian_truth_formula": None if not (use_bayes and use_truth) else round4(bayes_p*truth_s),
        "clce_spre": None if not (use_clce and use_spre) else round4(clce_c*spre_pc),
    }
    n=len(used_factors)
    pairing_count=n*n
    weight= (1/len(used_engines)) if used_engines else 0
    triad={
        "schema":TRIAD_SCHEMA,
        "formula":TRIAD_FORMULA,
        "ready":ready,
        "components":{
            "spre_pc":None if spre_pc is None else round4(spre_pc),
            "clce_consistency":None if clce_c is None else round4(clce_c),
            "plr_coherence":None if plr_c is None else round4(plr_c),
            "physics":None if physics is None else round4(physics),
            "linguistics":None if linguistics is None else round4(linguistics),
            "bayesian":None if bayes_p is None else round4(bayes_p),
            "truth_formula":None if truth_s is None else round4(truth_s),
        },
        "factors":{k: None if factor_map[k] is None else round4(factor_map[k]) for k in FACTOR_NAMES},
        "axis_products":axis,
        "cycle_factors":used_factors,
        "pairing_count":pairing_count,
        "triad_cycle_mean":None if cycle is None else round4(cycle),
        "geometric_mean_applicable":None if geo is None else round4(geo),
        "weights":{
            "spre": weight if "spre" in used_engines else 0,
            "clce": weight if "clce" in used_engines else 0,
            "plr": weight if "plr" in used_engines else 0,
        },
        "applicable_components":used_engines,
        "combined":None if combined is None else round4(combined),
        "display":display,
        "kid_plain":TRIAD_KID,
        "primary_visible":True,
        "bayesian_separate":True,
        "public_score":"triad_cycle_mean",
        "collection_offset":0,
    }
    return freeze_triad_raw(triad, content_sha256)

def bayesian_posterior(hypotheses=None, **legacy):
    """Likelihood of internal consistency. Not P(thesis true | nature). Unranked."""
    h = dict(hypotheses or {})
    h.update(legacy)
    checks=[]
    if "h1" in h or "structure_ok" in h or "hash_ok" in h:
        checks.append(("H1", bool(h.get("h1", bool(h.get("structure_ok")) and bool(h.get("hash_ok"))))))
    if h.get("plr_applicable", True) and ("h2" in h or "physics_lights_pass" in h or "plr_applicable" in h):
        checks.append(("H2", bool(h.get("h2", h.get("physics_lights_pass", False)))))
    if "h3" in h or "framing_pass" in h:
        checks.append(("H3", bool(h.get("h3", h.get("framing_pass", False)))))
    if "h4" in h or "rd" in h:
        rd=h.get("rd")
        checks.append(("H4", bool(h.get("h4", (rd is not None and float(rd)>=0.7)))))
    if "h5" in h or "poison_markers" in h or "no_poison" in h:
        markers=h.get("poison_markers") or []
        checks.append(("H5", bool(h.get("h5", h.get("no_poison", len(markers)==0)))))
    # Heritage priors dict — treat as not-the-new-API if no H keys and old score keys present
    if not checks and any(k in h for k in ("evidence_completeness","physics_coherence","linguistic_neutrality","spre_pc","clce_consistency")):
        keys=["evidence_completeness","physics_coherence","linguistic_neutrality","spre_pc","clce_consistency"]
        used={}; alpha=1.0; beta=1.0
        for k in keys:
            p=clamp01(h.get(k,0.5)); used[k]=round4(p); alpha+=p; beta+=1-p
        posterior=alpha/(alpha+beta)
        return {
            "schema":"aziel.bayesian.v2",
            "kind":"LIKELIHOOD",
            "of":"internal_consistency",
            "not_truth":True,
            "unranked":True,
            "sort_key":None,
            "note":"Unranked likelihood of internal consistency. Never used to sort the shelf. Not world accuracy.",
            "priors":used,
            "hypotheses":[],
            "applied":0,
            "alpha":round4(alpha),
            "beta":round4(beta),
            "posterior":round4(posterior),
            "kid_plain":"This number is a likelihood of internal consistency. It does not move the books on the shelf.",
            "continuity":"Peers may endorse or challenge later. History is append-only if the operator is gone one day.",
            "possibility_separate":True,
        }
    k=len(checks)
    hits=sum(1 for _,ok in checks if ok)
    alpha=1.0+hits
    beta=1.0+(k-hits)
    posterior=alpha/(alpha+beta) if (alpha+beta) else 0.5
    return {
        "schema":"aziel.bayesian.v2",
        "kind":"LIKELIHOOD",
        "of":"internal_consistency",
        "not_truth":True,
        "unranked":True,
        "sort_key":None,
        "note":"Unranked likelihood of internal consistency. Never used to sort the shelf. Not world accuracy.",
        "hypotheses":[{"id":hid,"pass":ok} for hid,ok in checks],
        "applied":k,
        "hits":hits,
        "alpha":round4(alpha),
        "beta":round4(beta),
        "posterior":round4(posterior),
        "kid_plain":"This number is a likelihood of internal consistency. It does not move the books on the shelf.",
        "continuity":"Peers may endorse or challenge later. History is append-only if the operator is gone one day.",
        "possibility_separate":True,
    }

def verify_bytes(data, filename="file"):
    raw=data if isinstance(data,(bytes,bytearray)) else bytes(data or b"")
    digest=hashlib.sha256(raw).hexdigest()
    errors=[]; files=[{"path":filename or "file","bytes":len(raw),"sha256":digest}]
    kind="file"
    name=str(filename or "")
    if name.lower().endswith((".zip",".azm",".azk",".azh",".docx",".xlsx",".pptx")) or raw[:2]==b"PK":
        kind="zip"; files=[]
        try:
            from io import BytesIO
            with zipfile.ZipFile(BytesIO(raw)) as z:
                for info in z.infolist():
                    if ".." in info.filename or info.filename.startswith("/") or info.filename.startswith("\\"):
                        errors.append("unsafe zip path: "+info.filename); continue
                    payload=z.read(info.filename)
                    files.append({"path":info.filename,"bytes":len(payload),"sha256":hashlib.sha256(payload).hexdigest()})
                names={i.filename for i in z.infolist()}
                if name.lower().endswith((".azm",".azk")):
                    if "manifest.json" not in names: errors.append("Aziel package missing manifest.json")
                    if "integrity.json" not in names: errors.append("Aziel package missing integrity.json")
        except Exception as e:
            errors.append(str(e))
    return {"ok":not errors,"kind":kind,"filename":name,"sha256":digest,"byte_size":len(raw),"files":files,"errors":errors}

def review_document(*, title="", body="", filename="", sha256="", author="", library="corpus", structure=None, clce=None, noise="", coverage=None, domain="", subjects="", keywords=""):
    structure=structure or {"ok":bool(sha256),"files":[],"errors":[]}
    hash_ok=bool(re.fullmatch(r"[0-9a-f]{64}",str(sha256 or structure.get("sha256") or ""),re.I))
    structure_ok=bool(structure.get("ok"))
    p_layer=clce_layer_p(title, structure_ok, hash_ok)
    appl=classify_component_applicability({
        "title":title,"body":body,"filename":filename,"sha256":sha256,"author":author,
        "domain":domain,"subjects":subjects,"keywords":keywords,
    })
    local_clce=clce_score(title, body or title, p_layer, noise, title=title, body=body, structure_ok=structure_ok, hash_ok=hash_ok)
    if clce and isinstance(clce, dict) and clce.get("triple") is not None:
        local_clce["audit_jaccard"]={
            "triple":clce.get("triple"),
            "pairwise_avg":clce.get("pairwise_avg"),
            "source":clce.get("source") or "provided",
            "note":"audit only — not the public CLCE term",
        }
        if clce.get("triple") is not None:
            local_clce["triple"]=clce.get("triple")
        if clce.get("pairwise_avg") is not None:
            local_clce["pairwise_avg"]=clce.get("pairwise_avg")
    clce=stamp_engine_applicability(local_clce, appl["clce"])
    spre=stamp_engine_applicability(spre_score(title,body,filename,sha256,structure_ok,author), appl["spre"])
    plr=stamp_engine_applicability(physling_review(title,body,filename), appl["plr"])
    poison=poison_scan(title,body,filename,library)
    truth=stamp_engine_applicability(
        truth_formula_score(title=title, body=body, filename=filename, sha256=sha256, structure_ok=structure_ok, mode=(appl["truth_formula"].get("mode") or "subset")),
        appl["truth_formula"],
    )
    physics_pass=all(plr.get("lights",{}).get(k)=="PASS" for k in ("units","conservation","causal","temporal"))
    bayes=bayesian_posterior({
        "structure_ok":structure_ok,
        "hash_ok":hash_ok,
        "plr_applicable":bool(appl["flags"]["plr"]),
        "physics_lights_pass":physics_pass,
        "framing_pass":plr.get("lights",{}).get("framing")=="PASS",
        "rd":clce.get("rd"),
        "poison_markers":poison.get("markers") or [],
    })
    clce_x=clce_consistency(clce)
    lights={
        "structure":"PASS" if structure_ok else "FLAG",
        "spre":"PASS" if spre["pc"]>=0.7 else "REVIEW" if spre["pc"]>=0.4 else "FLAG",
        "clce":"PASS" if clce_x is not None and clce_x>=0.7 else "REVIEW" if clce_x is not None and clce_x>=0.45 else "FLAG" if clce_x is not None else None,
        "plr":plr["status"] if appl["flags"]["plr"] else None,
        "poison":"PASS" if poison["status"]=="CLEAR" else "REVIEW" if poison["status"]=="FLAGGED" else "FLAG",
    }
    lights={k:v for k,v in lights.items() if v is not None}
    q="POISON_SUSPECT" if poison["status"]=="QUARANTINE" else "OPERATOR_FLAG" if poison["status"]=="FLAGGED" else "CLEAR"
    triad=triad_composite(
        spre=spre, clce=clce, plr=plr, bayesian=bayes, truth_formula=truth,
        applicability=appl["flags"], content_sha256=sha256 or structure.get("sha256"),
    )
    possibility = {
        "schema": "aziel.possibility.v1",
        "kind": "HEURISTIC",
        "possibility": None,
        "refuse": "PENDING_ANCHORS",
        "unranked": True,
        "sort_key": None,
        "note": "possibility ≠ probability ≠ triad ≠ ZionPattern. HEURISTIC over lattice time×geo pins. Not courtroom proof. Posterior ≠ truth.",
        "bayesian_separate": True,
        "not_truth": True,
    }
    return {
        "schema":REVIEW_SCHEMA,
        "author":"Aziel Eliab",
        "library":library,
        "lights":lights,
        "structure":{"ok":structure_ok,"files":structure.get("files") or [],"errors":structure.get("errors") or []},
        "spre":spre,
        "clce":clce,
        "plr":plr,
        "truth_formula":truth,
        "poison":poison,
        "bayesian":bayes,
        "applicability":appl,
        "possibility":possibility,
        "triad":triad,
        "quarantine_status":q,
        "limitation":" ".join([SPRE_LIMITATION,CLCE_LIMITATION,PLR_LIMITATION,POISON_LIMITATION,TRUTH_LIMITATION,TRIAD_FORMULA]),
    }

def lattice_anchor_tip(*, record_id=None, library=None, content_sha256=None, ledger_entry_hash=None, structure=None, review=None, event="verified_ingest", verified_utc=None):
    from datetime import datetime, timezone
    r=review or {}
    structure=structure or {}
    triad=r.get("triad") or {}
    return {
        "schema":LATTICE_SCHEMA,
        "kind":"aziel-corpus."+str(event or "verified_ingest"),
        "carrier":"AzielTether",
        "author":"Aziel Eliab",
        "record_id":record_id,
        "library":library,
        "content_sha256":content_sha256,
        "structure":{"ok":bool(structure.get("ok")),"file_count":len(structure.get("files") or [])},
        "spre":{"pc":r.get("spre",{}).get("pc"),"band":r.get("spre",{}).get("band"),"limitation":r.get("spre",{}).get("limitation")} if r.get("spre") else None,
        "clce":{"structural":(r.get("clce") or {}).get("structural"),"triple":r.get("clce",{}).get("triple"),"pairwise_avg":r.get("clce",{}).get("pairwise_avg"),"advisory":True} if r.get("clce") else None,
        "plr":{"status":r.get("plr",{}).get("status"),"lights":r.get("plr",{}).get("lights")} if r.get("plr") else None,
        "triad":{"combined":triad.get("combined"),"display":triad.get("display"),"ready":triad.get("ready"),"formula":triad.get("formula"),"triad_raw":triad.get("triad_raw"),"frozen_to":triad.get("frozen_to"),"triad_cycle_mean":triad.get("triad_cycle_mean"),"geometric_mean_applicable":triad.get("geometric_mean_applicable")} if triad else None,
        "bayesian":{"posterior":r.get("bayesian",{}).get("posterior"),"kind":r.get("bayesian",{}).get("kind") or "LIKELIHOOD","of":"internal_consistency","unranked":True,"not_truth":True,"note":r.get("bayesian",{}).get("note")} if r.get("bayesian") else None,
        "possibility":{"possibility":(r.get("possibility") or {}).get("possibility"),"kind":(r.get("possibility") or {}).get("kind") or "HEURISTIC","refuse":(r.get("possibility") or {}).get("refuse"),"unranked":True,"not_truth":True} if r.get("possibility") else None,
        "quarantine":None if (r.get("quarantine_status") or "CLEAR")=="CLEAR" else r.get("quarantine_status"),
        "ledger_entry_hash":ledger_entry_hash,
        "verified_utc":verified_utc or datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "note":LATTICE_NOTE,
    }

def review_file(path, *, title="", body="", author="", library="corpus"):
    p=Path(path)
    data=p.read_bytes()
    structure=verify_bytes(data, p.name)
    text=body
    if not text and p.suffix.lower() in {".txt",".md",".json",".csv",".tsv",".html",".xml",".yml",".yaml",".log"}:
        text=data.decode("utf-8","replace")[:200000]
    return review_document(title=title or p.stem, body=text, filename=p.name, sha256=structure["sha256"], author=author, library=library, structure=structure)
