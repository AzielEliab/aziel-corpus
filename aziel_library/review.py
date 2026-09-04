"""Aziel Digital Library review engines. Author: Aziel Eliab only.

SPRE  — Source Provenance Reliability Engine. Does not assert criminal guilt.
CLCE  — Cross-Layer Consistency Engine port (Jaccard R/D/P). Detects inconsistency, not intent.
PLR   — PhysLing Review (physics × linguistics third review).
Poison — quarantine-or-flag. Never silently deletes. Hardest on public Corpus.
Bayesian — unranked Beta-Bernoulli posterior. Never used to sort the shelf.
"""
from __future__ import annotations
import hashlib, re, zipfile
from pathlib import Path

REVIEW_SCHEMA = "aziel.review.v1"
LATTICE_SCHEMA = "aziel.lattice.anchor.v1"
SPRE_LIMITATION = "SPRE scores provenance completeness. It does not assert criminal guilt. Advisory only. Author Aziel Eliab."
CLCE_LIMITATION = "CLCE detects inconsistency, not intent. Type D is a label, not a finding of malice. Advisory. Threshold 0.7 is not a truth verdict."
PLR_LIMITATION = "PhysLing Review (PLR) flags physics-impossible or linguistically manipulative framing. It is a third review beside SPRE and CLCE. Not a court finding."
POISON_LIMITATION = "Poison immunity quarantines suspected shells. Status is hash-chained. Records are never silently deleted. Official narrative is not merged into evidence."
LATTICE_NOTE = "Public HTTPS site is not a mesh. AzielTether carries this tip. Survival interdependence with GodLock and other Aziel software is via downloadable tether + Worker bootstrap APIs."

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

def clce_score(r="",d="",p="",n=""):
    R,D,P,N=token_set(r),token_set(d),token_set(p),token_set(n)
    triple=jaccard_triple(r,d,p)
    rd,dp,rp=jaccard(R,D),jaccard(D,P),jaccard(R,P)
    pairwise_avg=(rd+dp+rp)/3
    union=R|D|P
    n_ratio=(len(N&union)/len(union)) if union else 0.0
    plus=clamp01(triple*(1-0.5*n_ratio))
    types=[]; primary="OK"
    if triple<0.7 and pairwise_avg<0.7:
        types.append("C"); primary="C"
    if rd<0.4 and dp>=rd and rp>=rd:
        types.append("A")
        if primary=="OK": primary="A"
    if n_ratio>0.35:
        if "C" not in types: types.append("C")
        primary="C"
    band="consistent" if triple>=0.7 else "partial" if pairwise_avg>=0.45 else "structural_inconsistency"
    kid="The picture, the writing, and the file agree enough." if triple>=0.7 else "These stories do not fully match. The title, the notes, and the real file are talking about different stuff."
    return {"engine":"CLCE","schema":"az-clce.report.v0.2.port","triple":round4(triple),"pairwise":{"rd":round4(rd),"dp":round4(dp),"rp":round4(rp)},"pairwise_avg":round4(pairwise_avg),"plus":round4(plus),"n_ratio":round4(n_ratio),"band":band,"primary":primary,"types":types,"kid_plain":kid,"advisory":True,"limitation":CLCE_LIMITATION,"threshold":0.7}

def _has(rx,text):
    return bool(rx.search(str(text or "")))

def spre_score(title="",body="",filename="",sha256="",structure_ok=False,author=""):
    text="\n".join([title,body,filename])
    pc=0.0; factors=[]
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
    add(_has(INDEPENDENT_RE,text),0.10,"independent_source_language")
    add(_has(PHYSICS_RE,text),0.07,"physics_language")
    penalty=0.0
    if _has(OFFICIAL_RE,text) and not _has(EVIDENCE_RE,text) and not _has(PHYSICS_RE,text):
        penalty+=0.25; factors.append("official_narrative_without_evidence")
    if _has(ADVOCACY_RE,text) and not _has(EVIDENCE_RE,text) and not _has(PHYSICS_RE,text):
        penalty+=0.20; factors.append("advocacy_without_evidence")
    pc=clamp01(pc-penalty)
    band="strong" if pc>=0.7 else "partial" if pc>=0.4 else "weak"
    kid="Green: we can see where this file came from and what it is." if pc>=0.7 else "Yellow: some proof is here, but pieces are missing." if pc>=0.4 else "Red: we cannot tell if this is a real source yet."
    return {"engine":"SPRE","name":"Source Provenance Reliability Engine","pc":round4(pc),"band":band,"kid_plain":kid,"factors":factors,"guilt_language":_has(GUILT_RE,text),"limitation":SPRE_LIMITATION}

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
    ling=0.86 if lights["framing"]=="PASS" else 0.55 if lights["framing"]=="REVIEW" else 0.22
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

def bayesian_posterior(priors):
    keys=["evidence_completeness","physics_coherence","linguistic_neutrality","spre_pc","clce_consistency"]
    used={}; alpha=1.0; beta=1.0
    for k in keys:
        p=clamp01(priors.get(k,0.5)); used[k]=round4(p); alpha+=p; beta+=1-p
    posterior=alpha/(alpha+beta)
    return {"schema":"aziel.bayesian.v1","unranked":True,"sort_key":None,"note":"Unranked metadata for manual peer-to-peer review. Never used to sort the shelf.","priors":used,"alpha":round4(alpha),"beta":round4(beta),"posterior":round4(posterior),"kid_plain":"This number is a confidence guess. It does not move the books on the shelf.","continuity":"Peers may endorse or challenge later. History is append-only if the operator is gone one day."}

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

def review_document(*, title="", body="", filename="", sha256="", author="", library="corpus", structure=None, clce=None, noise=""):
    structure=structure or {"ok":bool(sha256),"files":[],"errors":[]}
    reality=" ".join(x for x in [filename, sha256 or structure.get("sha256",""), "structure verified" if structure.get("ok") else "structure failed"] if x)
    clce=clce or clce_score(title, body or title, reality, noise)
    spre=spre_score(title,body,filename,sha256,bool(structure.get("ok")),author)
    plr=physling_review(title,body,filename)
    poison=poison_scan(title,body,filename,library)
    evidence=clamp01((0.35 if "text" in spre["factors"] else 0.05)+(0.35 if "content_hash" in spre["factors"] else 0)+(0.3 if "evidence_language" in spre["factors"] else 0.1))
    bayes=bayesian_posterior({
        "evidence_completeness":evidence,
        "physics_coherence":plr["physics_coherence"],
        "linguistic_neutrality":plr["linguistic_neutrality"],
        "spre_pc":spre["pc"],
        "clce_consistency":clce["triple"] if clce["triple"]>=0.7 else clce["pairwise_avg"],
    })
    lights={
        "structure":"PASS" if structure.get("ok") else "FLAG",
        "spre":"PASS" if spre["pc"]>=0.7 else "REVIEW" if spre["pc"]>=0.4 else "FLAG",
        "clce":"PASS" if clce["triple"]>=0.7 else "REVIEW" if clce["pairwise_avg"]>=0.45 else "FLAG",
        "plr":plr["status"],
        "poison":"PASS" if poison["status"]=="CLEAR" else "REVIEW" if poison["status"]=="FLAGGED" else "FLAG",
    }
    q="POISON_SUSPECT" if poison["status"]=="QUARANTINE" else "OPERATOR_FLAG" if poison["status"]=="FLAGGED" else "CLEAR"
    return {"schema":REVIEW_SCHEMA,"author":"Aziel Eliab","library":library,"lights":lights,"structure":{"ok":bool(structure.get("ok")),"files":structure.get("files") or [],"errors":structure.get("errors") or []},"spre":spre,"clce":clce,"plr":plr,"poison":poison,"bayesian":bayes,"quarantine_status":q,"limitation":" ".join([SPRE_LIMITATION,CLCE_LIMITATION,PLR_LIMITATION,POISON_LIMITATION])}

def lattice_anchor_tip(*, record_id=None, library=None, content_sha256=None, ledger_entry_hash=None, structure=None, review=None, event="verified_ingest", verified_utc=None):
    from datetime import datetime, timezone
    r=review or {}
    structure=structure or {}
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
        "clce":{"triple":r.get("clce",{}).get("triple"),"pairwise_avg":r.get("clce",{}).get("pairwise_avg"),"advisory":True} if r.get("clce") else None,
        "plr":{"status":r.get("plr",{}).get("status"),"lights":r.get("plr",{}).get("lights")} if r.get("plr") else None,
        "bayesian":{"posterior":r.get("bayesian",{}).get("posterior"),"unranked":True,"note":r.get("bayesian",{}).get("note")} if r.get("bayesian") else None,
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
