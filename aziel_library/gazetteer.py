from __future__ import annotations
import csv
import hashlib
import io
import json
import math
import os
import re
import sqlite3
import urllib.request
import zipfile
from contextlib import contextmanager
from datetime import datetime, timezone

from pathlib import Path
GEONAMES_BASE = "https://download.geonames.org/export/dump/"
GEONAMES_LICENSE = "CC BY 4.0"
GEONAMES_ATTRIBUTION = "GeoNames geographical data — https://www.geonames.org/ — CC BY 4.0"

GAZETTEER_SCHEMA_VERSION = "1.0"
# Conservative candidate extractor. We intentionally do not map arbitrary lower-case
# dictionary words, because false geographic pins are worse than unresolved mentions.
_CAP_WORD = r"[A-ZÀ-ÖØ-Þ][\wÀ-ÖØ-öø-ÿ'’.-]*"
_CONNECTOR = r"(?:of|the|de|del|da|di|do|dos|la|las|le|du|van|von|y|al)"
CAP_PHRASE_RE = re.compile(rf"(?<![\w]){_CAP_WORD}(?:\s+(?:(?:{_CONNECTOR})\s+){{0,2}}{_CAP_WORD}){{0,4}}")
PREP_PLACE_RE = re.compile(r"\b(?:in|at|near|from|to|within|outside|around|through|across)\s+([^\n.!?;:]{2,100})", re.I)
TOKEN_RE = re.compile(r"[\wÀ-ÖØ-öø-ÿ'’.-]+", re.UNICODE)
STOP = {'the','this','that','these','those','a','an','and','or','but','for','with','from','into','onto','over','under','chapter','figure','table','page','section','document','report','research','analysis','note','notes','appendix','monday','tuesday','wednesday','thursday','friday','saturday','sunday','january','february','march','april','may','june','july','august','september','october','november','december'}


FEATURE_PRIOR = {'P': 1.0, 'A': .92, 'S': .78, 'T': .76, 'L': .72, 'H': .68, 'V': .62, 'R': .52, 'U': .45}
def utc_now():


    return datetime.now(timezone.utc).isoformat(timespec='seconds')
def sha256_file(path: str | Path) -> str:
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)


    return h.hexdigest()
def norm_name(value: str) -> str:
    value = value.casefold().replace('’', "'")
    value = re.sub(r"[^\wÀ-ÖØ-öø-ÿ' .-]+", ' ', value, flags=re.UNICODE)


    return re.sub(r'\s+', ' ', value).strip(' .-')
def candidate_phrases(text: str, max_candidates: int = 6000) -> list[str]:
    found = []
    seen = set()
    def add_variants(phrase):
        phrase = re.sub(r'\s+', ' ', phrase).strip(' .,:;!?()[]{}\"')
        toks = TOKEN_RE.findall(phrase)
        if not toks: return False
        variants=[phrase]
        if len(toks)>1:
            for n in range(min(5,len(toks)),0,-1):
                variants.append(' '.join(toks[-n:])); variants.append(' '.join(toks[:n]))
        for v in variants:
            nv=norm_name(v)
            if len(nv)<3 or nv in STOP or nv.isdigit() or nv in seen: continue
            seen.add(nv); found.append(v)
            if len(found)>=max_candidates: return True
        return False
    sample=text[:900000]
    for m in CAP_PHRASE_RE.finditer(sample):
        if add_variants(m.group(0)): return found
    # OCR and ordinary prose may lowercase a place. Geographic prepositions provide
    # enough context to try exact alias n-grams without fuzzy-geocoding arbitrary words.
    for m in PREP_PLACE_RE.finditer(sample):
        toks=TOKEN_RE.findall(m.group(1))[:7]
        for n in range(min(5,len(toks)),0,-1):
            if add_variants(' '.join(toks[:n])): return found


    return found

class WorldGazetteer:

    """
        Disk-backed, independently rebuildable world gazetteer.
    The runtime never calls GeoNames web services. An installation/update downloads
    bulk dump files, records their hashes and attribution, converts them to this

    stable SQLite schema, and normal operation is subsequently offline."""
    def __init__(self, root: str | Path, readonly: bool = False):
        self.root = Path(root); self.readonly = bool(readonly)
        self.db_path = self.root / 'world_gazetteer.sqlite3'
        self.raw_dir = self.root / 'raw'
        if self.readonly:
            if not self.db_path.exists(): raise FileNotFoundError(f'gazetteer database not found: {self.db_path}')
        else:

            self.root.mkdir(parents=True, exist_ok=True); self.raw_dir.mkdir(exist_ok=True); self._init_db()
    @contextmanager
    def connect(self):
        c = sqlite3.connect(self.db_path.resolve().as_uri()+'?mode=ro', uri=True, timeout=60) if self.readonly else sqlite3.connect(self.db_path, timeout=60)
        c.row_factory = sqlite3.Row; c.execute('PRAGMA busy_timeout=60000')
        try:
            yield c
            if not self.readonly: c.commit()
        except Exception:
            if not self.readonly: c.rollback()
            raise
        finally:

            c.close()
    def _init_db(self):
        with self.connect() as c:
            c.executescript('''
        PRAGMA journal_mode=WAL;CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE IF NOT EXISTS places(geonameid INTEGER PRIMARY KEY,name TEXT NOT NULL, asciiname TEXT, latitude REAL, longitude REAL,feature_class TEXT, feature_code TEXT, country_code TEXT, cc2 TEXT,admin1_code TEXT, admin2_code TEXT, admin3_code TEXT, admin4_code TEXT,population INTEGER, elevation INTEGER, dem INTEGER, timezone TEXT, modified TEXT);CREATE INDEX IF NOT EXISTS idx_places_country_admin ON places(country_code,admin1_code,admin2_code);CREATE INDEX IF NOT EXISTS idx_places_feature ON places(feature_class,feature_code);CREATE INDEX IF NOT EXISTS idx_places_population ON places(population DESC);CREATE TABLE IF NOT EXISTS aliases(alias_norm TEXT NOT NULL, alias TEXT NOT NULL, geonameid INTEGER NOT NULL,language TEXT DEFAULT '', preferred INTEGER DEFAULT 0, short INTEGER DEFAULT 0,colloquial INTEGER DEFAULT 0, historic INTEGER DEFAULT 0,valid_from TEXT DEFAULT '', valid_to TEXT DEFAULT '', source TEXT DEFAULT 'GEONAMES',PRIMARY KEY(alias_norm,geonameid,alias,language,source));CREATE INDEX IF NOT EXISTS idx_alias_norm ON aliases(alias_norm);CREATE INDEX IF NOT EXISTS idx_alias_geo ON aliases(geonameid);CREATE TABLE IF NOT EXISTS countries(country_code TEXT PRIMARY KEY, iso3 TEXT, iso_numeric TEXT, fips TEXT, country_name TEXT,capital TEXT, area REAL, population INTEGER, continent TEXT, tld TEXT, currency_code TEXT,currency_name TEXT, phone TEXT, postal_format TEXT, postal_regex TEXT, languages TEXT,geonameid INTEGER, neighbours TEXT, equivalent_fips TEXT);CREATE TABLE IF NOT EXISTS admin1(code TEXT PRIMARY KEY,name TEXT,asciiname TEXT,geonameid INTEGER);CREATE TABLE IF NOT EXISTS sources(filename TEXT PRIMARY KEY,url TEXT,sha256 TEXT,bytes INTEGER,downloaded_utc TEXT,imported_utc TEXT,license TEXT,attribution TEXT);''')
            c.execute("INSERT OR REPLACE INTO metadata VALUES('schema_version',?)", (GAZETTEER_SCHEMA_VERSION,))
            c.execute("INSERT OR IGNORE INTO metadata VALUES('state','EMPTY')")
            c.execute("INSERT OR IGNORE INTO metadata VALUES('license',?)", (GEONAMES_LICENSE,))

            c.execute("INSERT OR IGNORE INTO metadata VALUES('attribution',?)", (GEONAMES_ATTRIBUTION,))
    def status(self) -> dict:
        with self.connect() as c:
            meta = {r['key']: r['value'] for r in c.execute('SELECT key,value FROM metadata')}
            places = c.execute('SELECT COUNT(*) FROM places').fetchone()[0]
            aliases = c.execute('SELECT COUNT(*) FROM aliases').fetchone()[0]
            historical = c.execute('SELECT COUNT(*) FROM aliases WHERE historic=1').fetchone()[0]
            countries = c.execute('SELECT COUNT(*) FROM countries').fetchone()[0]

        return {'state': meta.get('state','EMPTY'), 'profile': meta.get('profile',''),'places': places, 'aliases': aliases, 'historical_aliases': historical,'countries': countries, 'db_path': str(self.db_path), 'db_bytes': self.db_path.stat().st_size if self.db_path.exists() else 0,'source_date': meta.get('source_date',''), 'built_utc': meta.get('built_utc',''),'license': meta.get('license', GEONAMES_LICENSE), 'attribution': meta.get('attribution', GEONAMES_ATTRIBUTION)}
    def _download(self, filename: str, force: bool = False) -> Path:
        dest = self.raw_dir / filename
        if dest.exists() and dest.stat().st_size and not force:
            return dest
        tmp = dest.with_suffix(dest.suffix + '.partial')
        req = urllib.request.Request(GEONAMES_BASE + filename, headers={'User-Agent':'AzielDigitalLibrary/2.3 (+offline-gazetteer-builder)'})
        with urllib.request.urlopen(req, timeout=120) as r, tmp.open('wb') as f:
            while True:
                b = r.read(1024 * 1024)
                if not b: break
                f.write(b)
        os.replace(tmp, dest)

        return dest
    def _source_receipt(self, path: Path, imported: bool = False):
        row=(path.name, GEONAMES_BASE+path.name, sha256_file(path), path.stat().st_size, utc_now(), utc_now() if imported else '', GEONAMES_LICENSE, GEONAMES_ATTRIBUTION)
        with self.connect() as c:

            c.execute('INSERT OR REPLACE INTO sources VALUES(?,?,?,?,?,?,?,?)',row)
    def install(self, profile: str = 'full', *, force_download: bool = False, include_alternate_names: bool = True,source_files: dict[str, str | Path] | None = None, progress=None) -> dict:

        """
        Build/update the local gazetteer.
        profile='lite' uses cities1000.zip and is intended for lower-storage systems.

        profile='full' uses allCountries.zip and covers every GeoNames feature class.alternateNamesV2 is included by default to retain language, historic, colloquial,preferred and validity-period metadata.
        source_files is primarily for reproducible/offline rebuilds and tests; keys are
        GeoNames filenames and values are already-downloaded files."""
        if profile not in {'lite','full'}: raise ValueError('profile must be lite or full')
        base_name = 'cities1000.zip' if profile == 'lite' else 'allCountries.zip'
        names = [base_name, 'countryInfo.txt', 'admin1CodesASCII.txt']
        if include_alternate_names: names.append('alternateNamesV2.zip')
        sources = {}
        for name in names:
            if source_files and name in source_files:
                original=Path(source_files[name]).resolve()
                if not original.exists(): raise FileNotFoundError(original)
                p=self.raw_dir/name
                if original != p.resolve():
                    import shutil
                    shutil.copy2(original,p)
            else:
                if progress: progress(f'download {name}')
                p=self._download(name, force_download)
            if not p.exists(): raise FileNotFoundError(p)
            self._source_receipt(p, False); sources[name]=p
        if progress: progress('initialize gazetteer database')
        with self.connect() as c:
            c.execute("UPDATE metadata SET value='BUILDING' WHERE key='state'")
            c.execute("INSERT OR REPLACE INTO metadata VALUES('profile',?)",(profile,))
            c.execute('DELETE FROM aliases'); c.execute('DELETE FROM places'); c.execute('DELETE FROM countries'); c.execute('DELETE FROM admin1')
        self._import_places(sources[base_name], progress)
        self._import_country_info(sources['countryInfo.txt'])
        self._import_admin1(sources['admin1CodesASCII.txt'])
        if include_alternate_names:
            self._import_alternate_names(sources['alternateNamesV2.zip'], progress)
        with self.connect() as c:
            c.execute('ANALYZE')
            c.execute("INSERT OR REPLACE INTO metadata VALUES('state','READY')")
            c.execute("INSERT OR REPLACE INTO metadata VALUES('built_utc',?)",(utc_now(),))
            c.execute("INSERT OR REPLACE INTO metadata VALUES('source_date',?)",(datetime.now(timezone.utc).date().isoformat(),))
        for p in sources.values(): self._source_receipt(p, True)

        return self.status()
    def _open_zip_text(self, path: Path):
        z=zipfile.ZipFile(path)
        candidates=[n for n in z.namelist() if n.lower().endswith('.txt')]
        if not candidates: z.close(); raise ValueError(f'no text file in {path.name}')
        raw=z.open(candidates[0],'r')

        return z, io.TextIOWrapper(raw,encoding='utf-8',errors='replace',newline='')
    def _import_places(self, path: Path, progress=None):
        z, f = self._open_zip_text(path)
        place_batch=[]; alias_batch=[]; count=0
        try:
            with self.connect() as c:
                for line in f:
                    cols=line.rstrip('\n\r').split('\t')
                    if len(cols)<19: continue
                    try:
                        gid=int(cols[0]); lat=float(cols[4]); lon=float(cols[5])

                    except ValueError: continue
                    pop=int(cols[14] or 0) if (cols[14] or '').lstrip('-').isdigit() else 0
                    elev=int(cols[15]) if (cols[15] or '').lstrip('-').isdigit() else None
                    dem=int(cols[16]) if (cols[16] or '').lstrip('-').isdigit() else None
                    place_batch.append((gid,cols[1],cols[2],lat,lon,cols[6],cols[7],cols[8],cols[9],cols[10],cols[11],cols[12],cols[13],pop,elev,dem,cols[17],cols[18]))
                    base_aliases=[cols[1],cols[2]] + ([x for x in cols[3].split(',') if x] if cols[3] else [])
                    seen=set()
                    for a in base_aliases:
                        na=norm_name(a)
                        if len(na)<2 or na in seen: continue
                        seen.add(na); alias_batch.append((na,a,gid,'',1 if a==cols[1] else 0,0,0,0,'','','GEONAMES_BASE'))
                    count += 1
                    if len(place_batch)>=5000:
                        c.executemany('INSERT OR REPLACE INTO places VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',place_batch)
                        c.executemany('INSERT OR IGNORE INTO aliases VALUES(?,?,?,?,?,?,?,?,?,?,?)',alias_batch)
                        place_batch.clear(); alias_batch.clear()
                        if progress and count % 100000 < 5000: progress(f'imported {count:,} places')
                if place_batch:
                    c.executemany('INSERT OR REPLACE INTO places VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',place_batch)
                    c.executemany('INSERT OR IGNORE INTO aliases VALUES(?,?,?,?,?,?,?,?,?,?,?)',alias_batch)
        finally:

            f.close(); z.close()
    def _import_alternate_names(self, path: Path, progress=None):
        z,f=self._open_zip_text(path); batch=[]; count=0
        try:
            with self.connect() as c:
                for line in f:
                    cols=line.rstrip('\n\r').split('\t')
                    if len(cols)<4: continue
                    try: gid=int(cols[1])
                    except ValueError: continue
                    alias=cols[3]; na=norm_name(alias)
                    if len(na)<2: continue
                    # Avoid website links / wikidata IDs as text-match aliases.
                    lang=cols[2]
                    if lang in {'link','wkdt'}: continue
                    pref=1 if len(cols)>4 and cols[4]=='1' else 0
                    short=1 if len(cols)>5 and cols[5]=='1' else 0
                    colloq=1 if len(cols)>6 and cols[6]=='1' else 0
                    hist=1 if len(cols)>7 and cols[7]=='1' else 0
                    vf=cols[8] if len(cols)>8 else ''; vt=cols[9] if len(cols)>9 else ''
                    batch.append((na,alias,gid,lang,pref,short,colloq,hist,vf,vt,'GEONAMES_ALT_V2')); count+=1
                    if len(batch)>=10000:
                        c.executemany('INSERT OR IGNORE INTO aliases VALUES(?,?,?,?,?,?,?,?,?,?,?)',batch); batch.clear()
                        if progress and count % 250000 < 10000: progress(f'imported {count:,} alternate names')
                if batch: c.executemany('INSERT OR IGNORE INTO aliases VALUES(?,?,?,?,?,?,?,?,?,?,?)',batch)
        finally:

            f.close(); z.close()
    def _import_country_info(self,path:Path):
        rows=[]
        for line in path.read_text('utf-8',errors='replace').splitlines():
            if not line or line.startswith('#'): continue
            c=line.split('\t')
            if len(c)<17: continue
            try: area=float(c[6] or 0); pop=int(c[7] or 0); gid=int(c[16] or 0)
            except ValueError: area=0; pop=0; gid=0
            vals=(c+[""]*19)[:19]
            rows.append((vals[0],vals[1],vals[2],vals[3],vals[4],vals[5],area,pop,vals[8],vals[9],vals[10],vals[11],vals[12],vals[13],vals[14],vals[15],gid,vals[17],vals[18]))

        with self.connect() as db: db.executemany('INSERT OR REPLACE INTO countries VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',rows)
    def _import_admin1(self,path:Path):
        rows=[]
        for line in path.read_text('utf-8',errors='replace').splitlines():
            c=line.split('\t')
            if len(c)>=4:
                try: gid=int(c[3])
                except ValueError: continue
                rows.append((c[0],c[1],c[2],gid))

        with self.connect() as db: db.executemany('INSERT OR REPLACE INTO admin1 VALUES(?,?,?,?)',rows)
    def _candidate_rows(self, names: list[str], max_per_name: int = 12) -> dict[str,list[dict]]:
        norms=[]; display={}
        for n in names:
            nn=norm_name(n)
            if nn and nn not in display: display[nn]=n; norms.append(nn)
        out={n:[] for n in norms}
        with self.connect() as c:
            for i in range(0,len(norms),500):
                chunk=norms[i:i+500]; q=','.join('?'*len(chunk))

                sql=f'''
        SELECT a.alias_norm,a.alias,a.language,a.preferred,a.short,a.colloquial,a.historic,a.valid_from,a.valid_to,p.*,co.country_name,ad.name admin1_name FROM aliases a JOIN places p ON p.geonameid=a.geonameid LEFT JOIN countries co ON co.country_code=p.country_code LEFT JOIN admin1 ad ON ad.code=(p.country_code||'.'||p.admin1_code)WHERE a.alias_norm IN ({q})'''
                for row in c.execute(sql,chunk):
                    d=dict(row); arr=out[row['alias_norm']]
                    if len(arr)<max_per_name*4: arr.append(d)

        return out
    @staticmethod
    def _rank(row:dict, mention_norm:str, context_norm:str='') -> float:
        score=FEATURE_PRIOR.get(row.get('feature_class') or '', .45)
        pop=max(0,int(row.get('population') or 0)); score += min(.35, math.log10(pop+1)/25)
        if row.get('preferred'): score += .08
        if row.get('short'): score += .02
        if row.get('historic'): score += .01
        # Nearby country/admin names are strong disambiguators.
        for k,bonus in [('country_name',.22),('admin1_name',.14)]:
            v=norm_name(str(row.get(k) or ''))
            if v and v in context_norm: score += bonus
        if norm_name(str(row.get('name') or '')) == mention_norm: score += .06

        return score
    def resolve_names(self,names:list[str],context:str='',accept_ambiguous:bool=False) -> list[dict]:
        if self.status()['state']!='READY': return []
        grouped=self._candidate_rows(names); ctx=norm_name(context); results=[]
        for nn,rows in grouped.items():
            if not rows: continue
            ranked=sorted(((self._rank(r,nn,ctx),r) for r in rows),key=lambda x:x[0],reverse=True)
            top_score,top=ranked[0]; second=ranked[1][0] if len(ranked)>1 else -9
            unique_ids=len({r['geonameid'] for _,r in ranked})
            margin=top_score-second
            resolved=(unique_ids==1) or margin>=.16 or (top_score>=1.25 and margin>=.08)
            item={'type':'PLACE','name':top['name'],'matched_name':top['alias'],'count':1,'source':'AZIEL_WORLD_GAZETTEER','geonameid':top['geonameid'],'feature_class':top['feature_class'],'feature_code':top['feature_code'],'country_code':top['country_code'],'country_name':top.get('country_name'),'admin1':top.get('admin1_name'),'population':top['population'],'language':top['language'],'historic_name':bool(top['historic']),'name_valid_from':top['valid_from'],'name_valid_to':top['valid_to'],'candidate_count':unique_ids,'resolution_score':round(top_score,4),'resolution_margin':round(margin,4),'resolution_status':'RESOLVED' if resolved else 'AMBIGUOUS'}
            if resolved or accept_ambiguous:
                if resolved: item.update({'lat':top['latitude'],'lon':top['longitude']})
                results.append(item)

        return results
    def entity_hits(self,text:str,max_hits:int=120) -> list[dict]:
        names=candidate_phrases(text)
        # Give each mention sentence-ish local context by resolving against whole text.
        hits=self.resolve_names(names,context=text,accept_ambiguous=True)
        # Collapse same resolved geonameid while counting distinct aliases.
        by={}
        for h in hits:
            key=(h.get('geonameid'),h.get('resolution_status'))
            if key in by:
                by[key]['count']+=1
            else: by[key]=h

        return sorted(by.values(),key=lambda x:(x.get('resolution_status')!='RESOLVED',-x.get('resolution_score',0)))[:max_hits]
    def search(self,query:str,limit:int=50) -> list[dict]:
        names=[query]
        rows=self._candidate_rows(names,max_per_name=max(20,limit))
        nn=norm_name(query); ranked=sorted(((self._rank(r,nn,''),r) for r in rows.get(nn,[])),key=lambda x:x[0],reverse=True)
        out=[]
        for score,r in ranked[:limit]:
            out.append({'geonameid':r['geonameid'],'name':r['name'],'matched_name':r['alias'],'lat':r['latitude'],'lon':r['longitude'],'feature_class':r['feature_class'],'feature_code':r['feature_code'],'country_code':r['country_code'],'country_name':r.get('country_name'),'admin1':r.get('admin1_name'),'population':r['population'],'historic_name':bool(r['historic']),'valid_from':r['valid_from'],'valid_to':r['valid_to'],'score':round(score,4)})

        return out
    def sources(self):
        with self.connect() as c: return [dict(x) for x in c.execute('SELECT * FROM sources ORDER BY filename')]
