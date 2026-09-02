from __future__ import annotations
import csv, hashlib, html, io, json, math, re, struct, wave, zipfile, zlib
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET
from .formats import AzielPackage, AZK_MAGIC, AZM_MAGIC

from .external import ExternalRuntime
TOKEN_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9_\-']{2,}")
DATE_RE = re.compile(r"\b(?:[0-9]{4})(?:-[01][0-9](?:-[0-3][0-9])?)?\b")

PERSON_RE = re.compile(r"\b([A-Z][a-z]{1,}(?:\s+[A-Z][a-z]{1,}){1,3})\b")
_MONTHS = {'january':1,'jan':1,'february':2,'feb':2,'march':3,'mar':3,'april':4,'apr':4,'may':5,'june':6,'jun':6,'july':7,'jul':7,'august':8,'aug':8,'september':9,'sep':9,'sept':9,'october':10,'oct':10,'november':11,'nov':11,'december':12,'dec':12,}
_MONTH_PATTERN = r"(?:January|Jan\.?|February|Feb\.?|March|Mar\.?|April|Apr\.?|May|June|Jun\.?|July|Jul\.?|August|Aug\.?|September|Sept?\.?|October|Oct\.?|November|Nov\.?|December|Dec\.?)"
_MONTH_FIRST_RE = re.compile(rf"\b(?P<month>{_MONTH_PATTERN})\s+(?P<day>[0-3]?\d)(?:st|nd|rd|th)?(?:,)?\s+(?P<year>\d{{3,4}})\b", re.I)
_DAY_FIRST_RE = re.compile(rf"\b(?P<day>[0-3]?\d)(?:st|nd|rd|th)?\s+(?P<month>{_MONTH_PATTERN})(?:,)?\s+(?P<year>\d{{3,4}})\b", re.I)

_MONTH_YEAR_RE = re.compile(rf"\b(?P<month>{_MONTH_PATTERN})\s+(?P<year>\d{{3,4}})\b", re.I)
def _month_number(value: str) -> int:

    return _MONTHS.get(value.lower().rstrip('.'), 0)
def _valid_ymd(year: int, month: int = 0, day: int = 0) -> bool:
    if not (1 <= year <= 9999): return False
    if not month: return True
    if not (1 <= month <= 12): return False
    if not day: return True
    try:
        from datetime import date
        date(year, month, day)
        return True
    except ValueError:

        return False
def extract_date_mentions(text: str) -> list[dict]:

    """
    Return normalized CE date mentions with source spans.
    Supported forms include YYYY, YYYY-MM, YYYY-MM-DD, September 10, 2025,10 September 2025, and September 2025. Ambiguous slash dates are intentionally
    not guessed. Years before 1000 are normalized to zero-padded ISO years."""
    found=[]
    def add(start,end,raw,year,month=0,day=0):
        try: year=int(year); month=int(month or 0); day=int(day or 0)
        except (TypeError,ValueError): return
        if not _valid_ymd(year,month,day): return
        if day: norm=f'{year:04d}-{month:02d}-{day:02d}'; precision='DAY'
        elif month: norm=f'{year:04d}-{month:02d}'; precision='MONTH'
        else: norm=f'{year:04d}'; precision='YEAR'
        found.append({'start':start,'end':end,'raw':raw,'date':norm,'precision':precision})
    for m in DATE_RE.finditer(text):
        raw=m.group(0); parts=raw.split('-')
        add(m.start(),m.end(),raw,parts[0],parts[1] if len(parts)>1 else 0,parts[2] if len(parts)>2 else 0)
    for rx in (_MONTH_FIRST_RE,_DAY_FIRST_RE):
        for m in rx.finditer(text):
            add(m.start(),m.end(),m.group(0),m.group('year'),_month_number(m.group('month')),m.group('day'))
    for m in _MONTH_YEAR_RE.finditer(text):
        # Do not add a lower-precision duplicate inside a full month/day/year match.
        if any(x['start'] <= m.start() and x['end'] >= m.end() for x in found): continue
        add(m.start(),m.end(),m.group(0),m.group('year'),_month_number(m.group('month')),0)
    # Prefer the most precise/longest parse when spans overlap.
    rank={'YEAR':1,'MONTH':2,'DAY':3}
    chosen=[]
    for item in sorted(found,key=lambda x:(x['start'],-rank[x['precision']],-(x['end']-x['start']))):
        if any(not (item['end']<=x['start'] or item['start']>=x['end']) for x in chosen): continue
        chosen.append(item)

    return sorted(chosen,key=lambda x:x['start'])
def extract_dates(text: str) -> list[str]:
    out=[]; seen=set()
    for m in extract_date_mentions(text):
        if m['date'] not in seen: seen.add(m['date']); out.append(m['date'])


    return out
def normalize_event_date(value: str) -> str:
    s=str(value or '').strip()
    mentions=extract_date_mentions(s)
    if len(mentions)==1 and s.strip(' ,.;') == mentions[0]['raw'].strip(' ,.;'):
        return mentions[0]['date']
    raise ValueError('date must be YYYY, YYYY-MM, YYYY-MM-DD, Month D YYYY, D Month YYYY, or Month YYYY')

STOP = set("the and for that with this from have was were are but not you your its into our their they them then than will would could should about after before also all any can may more most other some such when where which while who why how what there here been being over under between through document file page".split())
def clean_text(s: str, limit: int = 12_000_000) -> str:

    return re.sub(r"\s+", " ", s.replace("\x00", " ")[:limit]).strip()
def terms(s: str) -> list[str]:

    return [x.lower() for x in TOKEN_RE.findall(s) if x.lower() not in STOP and not x.isdigit()]
def hash_vector(text: str, dims: int = 512) -> list[float]:

    """
    Dependency-free semantic-ish feature vector using signed feature hashing.
    It is not a neural embedding. It is stable, local, reproducible and useful
    for lexical/concept clustering until an AZM neural model is installed."""
    vec = [0.0] * dims
    toks = terms(text)
    grams = toks + [toks[i] + "_" + toks[i+1] for i in range(len(toks)-1)]
    for t in grams:
        d = hashlib.blake2b(t.encode(), digest_size=8).digest()
        n = int.from_bytes(d, "big")
        idx = n % dims
        sign = -1.0 if (n >> 9) & 1 else 1.0
        vec[idx] += sign
    norm = math.sqrt(sum(v*v for v in vec)) or 1.0

    return [v / norm for v in vec]
def cosine(a: list[float], b: list[float]) -> float:

    return sum(x*y for x, y in zip(a, b))
def vector_bytes(vec: list[float]) -> bytes:

    return struct.pack("<" + "f" * len(vec), *vec)
def vector_from_bytes(data: bytes) -> list[float]:

    return list(struct.unpack("<" + "f" * (len(data)//4), data))
class TextExtractor:
    """
    Standard-library first extraction with optional locally-installed processors."""
    def __init__(self, external: ExternalRuntime|None=None):

        self.external=external or ExternalRuntime()
    def extract(self, path: Path, media_class: str) -> tuple[str, str, dict]:
        s = path.suffix.lower()
        try:
            if media_class == "text":
                return clean_text(path.read_text("utf-8", errors="replace")), "EXTRACTED_NATIVE", {}
            if s in {".csv", ".tsv"}:
                delim = "\t" if s == ".tsv" else ","
                with path.open("r", encoding="utf-8", errors="replace", newline="") as f:
                    out = "\n".join(" | ".join(row) for row in csv.reader(f, delimiter=delim))
                return clean_text(out), "EXTRACTED_NATIVE", {}
            if s in {".docx", ".pptx", ".xlsx", ".odt", ".odp", ".ods"}:
                return self._zip_office(path, s)
            if s == ".pdf":
                basic = clean_text(self._pdf_basic(path))
                # The built-in parser is intentionally conservative. A few literal
                # PDF strings are not enough evidence that a page is text-native;
                # weak/basic output must still fall through to scanned-page OCR.
                alpha = sum(ch.isalpha() for ch in basic)
                toks = terms(basic)
                basic_strong = bool(len(basic) >= 800 and alpha >= 300 and len(toks) >= 45)
                if basic_strong:
                    return basic, "EXTRACTED_BASIC_PDF", {"processor":"AZIEL_BASIC_PDF","processor_version":"1.2.0","basic_chars":len(basic)}
                ocr,meta=self.external.ocr_pdf(path)
                if ocr.strip():
                    meta=dict(meta); meta["basic_chars_before_ocr"]=len(basic)
                    return clean_text(ocr), "EXTRACTED_EXTERNAL_PDF_OCR", meta
                if basic:
                    return basic, "EXTRACTED_BASIC_PDF_WEAK_OCR_PENDING", {"processor":"AZIEL_BASIC_PDF","processor_version":"1.2.0","basic_chars":len(basic),"ocr_pending":True}
                return "", "OCR_NOT_READY_SCANNED_PDF", {"ocr_pending":True}
            if media_class in {"audio", "video"}:
                txt,proc=self.external.transcribe(path)
                meta = self._wav_metadata(path) if s == ".wav" else {}
                meta.update(proc)
                if txt.strip(): return clean_text(txt), "EXTRACTED_EXTERNAL_SPEECH", meta
                return "", "AZSPEECH_MODEL_RECOMMENDED", meta
            if media_class == "image":
                meta=self._image_metadata(path)
                txt,proc=self.external.ocr_image(path); meta.update(proc)
                if txt.strip(): return clean_text(txt), "EXTRACTED_EXTERNAL_IMAGE_OCR", meta
                return "", "OCR_NOT_READY_IMAGE", {**meta, "ocr_pending":True}
            return "", "BINARY_PRESERVED", {}
        except Exception as e:


            return "", f"EXTRACTION_ERROR:{type(e).__name__}", {"error": str(e)[:500]}
    def _zip_office(self, path: Path, suffix: str) -> tuple[str, str, dict]:
        chunks: list[str] = []

        with zipfile.ZipFile(path) as z:
            names = set(z.namelist())
            if suffix == ".docx":
                targets = [n for n in names if n.startswith("word/") and n.endswith(".xml") and ("document" in n or "header" in n or "footer" in n or "footnotes" in n)]
            elif suffix == ".pptx":
                targets = sorted(n for n in names if n.startswith("ppt/slides/slide") and n.endswith(".xml"))
            elif suffix == ".xlsx":
                targets = [n for n in names if n == "xl/sharedStrings.xml"] + sorted(n for n in names if n.startswith("xl/worksheets/sheet") and n.endswith(".xml"))
            else:
                targets = ["content.xml"] if "content.xml" in names else []
            for name in targets:
                try:
                    root = ET.fromstring(z.read(name))
                    chunks.extend(x.strip() for x in root.itertext() if x.strip())
                except Exception:
                    pass

        return clean_text("\n".join(chunks)), "EXTRACTED_ZIP_OFFICE", {"parts_read": len(targets)}
    def _pdf_basic(self, path: Path) -> str:
        data = path.read_bytes()
        chunks: list[str] = []
        for m in re.finditer(rb"stream\r?\n(.*?)\r?\nendstream", data, re.S):
            raw = m.group(1)
            candidates = [raw]
            try:
                candidates.append(zlib.decompress(raw))
            except Exception:
                pass
            for blob in candidates:
                # literal PDF strings in text operators; intentionally conservative
                for sm in re.finditer(rb"\(([^()]*)\)\s*Tj", blob):
                    chunks.append(self._pdf_unescape(sm.group(1)))
                for arr in re.finditer(rb"\[(.*?)\]\s*TJ", blob, re.S):
                    for sm in re.finditer(rb"\(([^()]*)\)", arr.group(1)):
                        chunks.append(self._pdf_unescape(sm.group(1)))

        return " ".join(chunks)
    @staticmethod
    def _pdf_unescape(b: bytes) -> str:
        b = re.sub(rb"\\([()\\])", rb"\1", b)
        b = re.sub(rb"\\[nrtbf]", b" ", b)

        return b.decode("latin-1", errors="ignore")
    @staticmethod
    def _wav_metadata(path: Path) -> dict:
        try:
            with wave.open(str(path), "rb") as w:
                frames = w.getnframes(); rate = w.getframerate()
                return {"channels": w.getnchannels(), "sample_rate": rate, "frames": frames,"seconds": round(frames / rate, 3) if rate else 0,"sample_width": w.getsampwidth()}
        except Exception:

            return {}
    @staticmethod
    def _image_metadata(path: Path) -> dict:
        data = path.read_bytes()[:64]
        if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
            w, h = struct.unpack(">II", data[16:24]); return {"format": "PNG", "width": w, "height": h}
        if data.startswith((b"GIF87a", b"GIF89a")) and len(data) >= 10:
            w, h = struct.unpack("<HH", data[6:10]); return {"format": "GIF", "width": w, "height": h}

        return {}
class KitRuntime:
    def __init__(self):
        self.aliases: dict[str, dict] = {}
        self.places: dict[str, dict] = {}

        self.dictionary: set[str] = set()
    def load(self, path: Path) -> dict:
        v = AzielPackage.verify(path)
        if not v.ok or v.kind != AZK_MAGIC:
            raise ValueError("invalid AZK package: " + "; ".join(v.errors))
        data = AzielPackage.read_json_payload(path, "kit.json")
        for item in data.get("entities", []):
            canonical_name = item.get("name", "").strip()
            for alias in [canonical_name] + item.get("aliases", []):
                if alias:
                    self.aliases[alias.lower()] = item
        for item in data.get("places", []):
            for alias in [item.get("name", "")] + item.get("aliases", []):
                if alias:
                    self.places[alias.lower()] = item
        self.dictionary.update(x.lower() for x in data.get("dictionary", []))

        return v.manifest
    def entity_hits(self, text: str) -> list[dict]:
        lo = text.lower(); hits = []
        for alias, item in self.aliases.items():
            n = lo.count(alias)
            if n:
                hits.append({"type": item.get("type", "ENTITY"), "name": item.get("name", alias), "count": n, "source": "AZK"})
        for alias, item in self.places.items():
            n = lo.count(alias)
            if n:
                hits.append({"type": "PLACE", "name": item.get("name", alias), "count": n, "source": "AZK", "lat": item.get("lat"), "lon": item.get("lon")})

        return hits
class ModelRuntime:
    """
        Executes small native AZM model families. Neural tensor packages can be stored and verified now; new executors can be added without changing package format."""
    def __init__(self): self.models: dict[str, tuple[dict, dict]] = {}
    def load(self, path: Path) -> dict:
        v = AzielPackage.verify(path)
        if not v.ok or v.kind != AZM_MAGIC:
            raise ValueError("invalid AZM package: " + "; ".join(v.errors))
        data = AzielPackage.read_json_payload(path, "model.json")
        self.models[v.package_id] = (v.manifest, data)

        return v.manifest
    def classify_text(self, text: str) -> list[tuple[str, float]]:
        results = []
        toks = Counter(terms(text))
        for manifest, data in self.models.values():
            if manifest.get("package_type") != "HASHED_NAIVE_BAYES_TEXT":
                continue
            labels = data.get("labels", {})
            scored = []
            for label, spec in labels.items():
                score = float(spec.get("bias", 0.0))
                weights = spec.get("weights", {})
                for tok, count in toks.items(): score += count * float(weights.get(tok, 0.0))
                scored.append((label, score))
            if scored:
                m = max(s for _, s in scored); ex = [(l, math.exp(min(50, s-m))) for l, s in scored]; z=sum(x for _,x in ex) or 1
                results.extend((l, x/z) for l,x in ex)
        return sorted(results, key=lambda x:x[1], reverse=True)
